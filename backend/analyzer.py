"""
DLP Chart Analyzer - Core Analysis Engine
==========================================
Provides statistical analysis, trend detection, insight generation,
and optional linear-regression predictions for pandas DataFrames.
"""

import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional


# ── Preprocessing ─────────────────────────────────────────────────────────────
def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the DataFrame:
      - Strip leading/trailing whitespace from column names
      - Drop fully-empty rows
      - Convert columns to numeric where possible
      - Fill remaining NaN values in numeric columns with the column median
    """
    df = df.copy()
    df.columns = df.columns.str.strip()
    # pandas 3.x: avoid inplace on slices — reassign directly
    df = df.dropna(how="all")

    for col in df.columns:
        # pandas 3.x removed errors="ignore"; replicate it with try/except:
        # try a strict conversion — if it fails, leave the column as-is.
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        df[col] = df[col].fillna(df[col].median())

    return df


# ── Statistical Analysis ──────────────────────────────────────────────────────
def compute_statistics(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    """
    Compute per-column statistics for all numeric columns.
    Returns a dict mapping statistic name → {column → value}.
    """
    numeric_df = df.select_dtypes(include=[np.number])

    def round_dict(d: Dict) -> Dict:
        return {k: round(float(v), 4) for k, v in d.items()}

    return {
        "mean":     round_dict(numeric_df.mean().to_dict()),
        "max":      round_dict(numeric_df.max().to_dict()),
        "min":      round_dict(numeric_df.min().to_dict()),
        "variance": round_dict(numeric_df.var().to_dict()),
        "std":      round_dict(numeric_df.std().to_dict()),
        "median":   round_dict(numeric_df.median().to_dict()),
    }


# ── Trend Detection ───────────────────────────────────────────────────────────
def detect_trends(df: pd.DataFrame, threshold: float = 0.05) -> Dict[str, str]:
    """
    Detect whether each numeric column is trending upward, downward, or is flat.

    Method: Fit a 1-D linear regression (via numpy.polyfit) over the row index.
    The slope relative to the column's mean determines the trend direction.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    trends: Dict[str, str] = {}
    x = np.arange(len(df))

    for col in numeric_cols:
        y = df[col].values.astype(float)
        if len(y) < 2 or np.all(y == y[0]):
            trends[col] = "flat"
            continue

        slope, _ = np.polyfit(x, y, 1)
        col_mean = np.mean(np.abs(y)) or 1.0
        relative_slope = slope / col_mean

        if relative_slope > threshold:
            trends[col] = "increasing"
        elif relative_slope < -threshold:
            trends[col] = "decreasing"
        else:
            trends[col] = "flat"

    return trends


# ── Linear Regression Prediction ─────────────────────────────────────────────
def predict_next_values(df: pd.DataFrame) -> Dict[str, float]:
    """
    Predict the *next* value for each numeric column using simple
    ordinary-least-squares linear regression over the row index.
    Returns {column → predicted_next_value}.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    predictions: Dict[str, float] = {}
    x = np.arange(len(df))
    next_x = len(df)  # index of the "next" row

    for col in numeric_cols:
        y = df[col].values.astype(float)
        if len(y) < 2:
            predictions[col] = float(y[-1]) if len(y) == 1 else 0.0
            continue
        slope, intercept = np.polyfit(x, y, 1)
        predictions[col] = round(float(slope * next_x + intercept), 4)

    return predictions


# ── Insight Generation ────────────────────────────────────────────────────────
def generate_insights(
    df: pd.DataFrame,
    stats: Dict[str, Any],
    trends: Dict[str, str],
) -> str:
    """
    Generate a human-readable summary paragraph from the analysis results.
    """
    lines: List[str] = []
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    n_rows, n_cols = df.shape

    lines.append(
        f"📊 Dataset Overview: {n_rows} rows × {n_cols} columns "
        f"({len(numeric_cols)} numeric column{'s' if len(numeric_cols) != 1 else ''})."
    )

    if not numeric_cols:
        lines.append("⚠️  No numeric columns were found for statistical analysis.")
        return " ".join(lines)

    # Highlight the column with the highest mean
    mean_vals = stats["mean"]
    if mean_vals:
        top_col = max(mean_vals, key=mean_vals.get)
        lines.append(
            f"📈 The column '{top_col}' has the highest average value "
            f"({mean_vals[top_col]:,.4f})."
        )

    # Trend summary
    increasing = [c for c, t in trends.items() if t == "increasing"]
    decreasing = [c for c, t in trends.items() if t == "decreasing"]
    flat       = [c for c, t in trends.items() if t == "flat"]

    if increasing:
        lines.append(f"📉➡📈 Upward trend detected in: {', '.join(increasing)}.")
    if decreasing:
        lines.append(f"📈➡📉 Downward trend detected in: {', '.join(decreasing)}.")
    if flat:
        lines.append(f"➡️  Stable / no clear trend in: {', '.join(flat)}.")

    # Variance insight
    var_vals = stats["variance"]
    if var_vals:
        high_var_col = max(var_vals, key=var_vals.get)
        lines.append(
            f"🔀 '{high_var_col}' shows the highest variability "
            f"(variance = {var_vals[high_var_col]:,.4f}), suggesting significant data spread."
        )

    # Value range
    for col in numeric_cols[:3]:  # limit to first 3 cols to keep summary concise
        mn  = stats["min"][col]
        mx  = stats["max"][col]
        avg = stats["mean"][col]
        lines.append(
            f"   • {col}: min={mn:,.4f}, mean={avg:,.4f}, max={mx:,.4f}"
        )

    lines.append("✅ Analysis complete. Use the charts above for visual insights.")
    return " ".join(lines)


# ── Public API ────────────────────────────────────────────────────────────────
def analyze_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Full analysis pipeline:
      1. Preprocess
      2. Statistics
      3. Trend detection
      4. Prediction
      5. Insight text

    Returns a JSON-serialisable dict.
    """
    df = preprocess(df)
    stats    = compute_statistics(df)
    trends   = detect_trends(df)
    preds    = predict_next_values(df)
    insights = generate_insights(df, stats, trends)

    # Build column-level details for the frontend chart renderer
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    column_data: Dict[str, List[float]] = {
        col: [round(float(v), 4) for v in df[col].tolist()]
        for col in numeric_cols
    }

    return {
        "mean":        stats["mean"],
        "max":         stats["max"],
        "min":         stats["min"],
        "variance":    stats["variance"],
        "std":         stats["std"],
        "median":      stats["median"],
        "trends":      trends,
        "predictions": preds,
        "insights":    insights,
        "columns":     numeric_cols,
        "column_data": column_data,
        "row_count":   len(df),
        "col_count":   df.shape[1],
    }
