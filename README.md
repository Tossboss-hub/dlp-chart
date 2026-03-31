# DLP Chart Analyzer 📊

> **AI-powered CSV data analysis with real-time charts, trend detection & predictions.**  
> Built with Flask · Pandas · NumPy · Chart.js — Hackathon Edition 🚀

---

## ✨ Features

| Feature | Details |
|---|---|
| 📂 **Drag & Drop Upload** | Drop any CSV or use the file picker |
| 📊 **Statistical Analysis** | Mean, Median, Min, Max, Std Dev, Variance |
| 🔍 **Trend Detection** | Increasing / Decreasing / Flat via linear regression |
| 🤖 **AI Predictions** | OLS linear regression predicts next row per column |
| 📈 **Chart.js Visualizations** | Line, Bar, Radar charts — switchable in real time |
| 🧠 **Insight Summary** | Natural-language data summary generated automatically |
| ⬇️ **Export** | Download full report as **PDF** or **TXT** |
| 🌑 **Dark UI** | Glassmorphism dark theme with animated backgrounds |

---

## 🗂 Project Structure

```
dlp-chart-analyzer/
├── backend/
│   ├── app.py            ← Flask REST API  (/analyze, /health)
│   ├── analyzer.py       ← Pandas analysis engine
│   ├── requirements.txt  ← Python dependencies
│   └── uploads/          ← Temporary file storage (auto-created)
├── frontend/
│   ├── index.html        ← Single-page application shell
│   ├── style.css         ← Full design system (dark theme)
│   └── app.js            ← Chart.js rendering + API client + export
├── sample_data.csv       ← Ready-to-use demo dataset
├── run.py                ← One-command launcher
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ installed and available as `py` (Windows) or `python3` (Mac/Linux)
- `pip` available

### 1. Navigate to the project folder

The project is located at:
```
C:\Users\HP\.gemini\antigravity\scratch\dlp-chart-analyzer
```

Open **PowerShell** or **Command Prompt** and run:
```powershell
cd "C:\Users\HP\.gemini\antigravity\scratch\dlp-chart-analyzer"
```

### 2. Install dependencies
```powershell
py -m pip install -r backend\requirements.txt
```

### 3. Start the Flask backend
```powershell
cd backend
py app.py
```

Or use the one-command launcher from the project root:
```powershell
py run.py
```

### 4. Open in Browser
```
http://127.0.0.1:5000
```

### 5. Upload & Analyze
- Drag & drop `sample_data.csv` (included in the project root) onto the upload area
- Click **Analyze Data**
- Explore Charts → Statistics → Trends → AI Predictions tabs

---

## 🔧 Manual Setup (alternative)

```powershell
# From the project root
cd "C:\Users\HP\.gemini\antigravity\scratch\dlp-chart-analyzer"

# Install dependencies
py -m pip install -r backend\requirements.txt

# Start backend
cd backend
py app.py
```
Then open `http://127.0.0.1:5000` in your browser
*(Flask serves the frontend automatically from the `/frontend` folder).*

---

## 🌐 API Reference

### `POST /analyze`
Upload a CSV file for full analysis.

**Request:** `multipart/form-data` with field `file` (.csv)

**Response (200 OK):**
```json
{
  "mean":        { "column": 1234.56 },
  "max":         { "column": 9999.0  },
  "min":         { "column": 100.0   },
  "median":      { "column": 1150.0  },
  "std":         { "column": 450.2   },
  "variance":    { "column": 202680.0 },
  "trends":      { "column": "increasing" },
  "predictions": { "column": 10500.0 },
  "insights":    "📊 Dataset overview: 12 rows...",
  "columns":     ["Sales", "Profit"],
  "column_data": { "Sales": [12000, 13500, ...] },
  "row_count":   12,
  "col_count":   6
}
```

### `GET /health`
Returns `{"status": "ok"}` — useful for uptime checks.

---

## 📦 Tech Stack

**Backend**
- [Flask](https://flask.palletsprojects.com/) — REST API server
- [Pandas](https://pandas.pydata.org/) — Data processing
- [NumPy](https://numpy.org/) — Statistical computation & OLS regression
- [Flask-CORS](https://flask-cors.readthedocs.io/) — Cross-origin support

**Frontend**
- Vanilla HTML5 / CSS3 / JavaScript (ES2022)
- [Chart.js 4](https://www.chartjs.org/) — Interactive charts
- [jsPDF](https://artskydj.github.io/jsPDF/) — Client-side PDF export
- Google Fonts (Inter + JetBrains Mono)

---

## 🖼 UI Walkthrough

| Panel | Description |
|---|---|
| **Upload** | Drag-drop zone with file validation & preview chip |
| **Charts** | 4 live charts — trend, mean, min/max range, variance |
| **Statistics** | Full table: mean · median · min · max · std · variance |
| **Trends** | Color-coded cards per column (↑ increasing / ↓ decreasing / → flat) |
| **AI Predictions** | Highlighted next-value predictions via OLS regression |
| **Raw JSON** | Full API response with copy-to-clipboard button |

---

## 🏆 Hackathon Notes

- Zero external ML libraries required — regression is pure NumPy
- All analysis runs server-side; frontend is pure static files
- PDF export is fully client-side via jsPDF (no server involvement)
- CORS is pre-configured for seamless local development
- Swap `sample_data.csv` with any real CSV dataset to test instantly

---

*Made with ❤️ for hackathons · DLP Chart Analyzer*
