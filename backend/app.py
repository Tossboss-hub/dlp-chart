"""
DLP Chart Analyzer - Flask Backend
====================================
Main application entry point. Handles file uploads and orchestrates
data analysis pipelines using pandas and scikit-learn.
"""
import sys, io
# Force UTF-8 output so Windows cp1252 console does not crash
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import os
import json
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from analyzer import analyze_dataframe
import pandas as pd

# ── App Configuration ────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)  # Enable cross-origin requests from the frontend

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {"csv"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB upload limit

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


# ── Helpers ──────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    """Check that the uploaded file has a .csv extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ── Routes ───────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the frontend SPA."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    POST /analyze
    Accepts a multipart/form-data request containing a CSV file.
    Returns a JSON object with statistical analysis, trends, insights,
    and optional linear-regression predictions.
    """
    # Validate that a file was included in the request
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only CSV files are supported"}), 400

    try:
        # Save the file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        # Read CSV into a pandas DataFrame
        df = pd.read_csv(filepath)

        # Run the analysis pipeline
        result = analyze_dataframe(df)

        # Remove the temporary file
        os.remove(filepath)

        return jsonify(result), 200

    except pd.errors.EmptyDataError:
        return jsonify({"error": "The uploaded CSV file is empty"}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "service": "DLP Chart Analyzer"}), 200


# ── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[DLP Chart Analyzer] Backend running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
