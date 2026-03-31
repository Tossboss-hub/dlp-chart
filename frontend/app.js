/**
 * DLP Chart Analyzer — Frontend Application
 * ==========================================
 * Handles: drag-drop upload, API communication, Chart.js rendering,
 * tab switching, statistics table, trend/prediction cards, PDF & TXT export.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE  = "http://127.0.0.1:5000";
const ANALYZE   = `${API_BASE}/analyze`;

// ── Chart.js colour palette ───────────────────────────────────────────────────
const PALETTE = [
  "#6366f1","#06b6d4","#8b5cf6","#10b981",
  "#f59e0b","#ef4444","#ec4899","#14b8a6",
  "#a855f7","#f97316","#22d3ee","#84cc16",
];

function color(i, alpha = 1) {
  const hex = PALETTE[i % PALETTE.length];
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── DOM References ────────────────────────────────────────────────────────────
const dropZone       = document.getElementById("dropZone");
const fileInput      = document.getElementById("fileInput");
const browseBtn      = document.getElementById("browseBtn");
const removeFileBtn  = document.getElementById("removeFile");
const fileChip       = document.getElementById("fileChip");
const fileNameSpan   = document.getElementById("fileName");
const analyzeBtn     = document.getElementById("analyzeBtn");
const btnLabel       = document.getElementById("btnLabel");
const errorBanner    = document.getElementById("errorBanner");
const errorText      = document.getElementById("errorText");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingStep    = document.getElementById("loadingStep");
const resultsSection = document.getElementById("results-section");
const insightsText   = document.getElementById("insightsText");
const kpiRow         = document.getElementById("kpiRow");
const statsBody      = document.getElementById("statsBody");
const trendGrid      = document.getElementById("trendGrid");
const predGrid       = document.getElementById("predGrid");
const jsonBlock      = document.getElementById("jsonBlock");
const columnSelect   = document.getElementById("columnSelect");
const chartTypeSelect= document.getElementById("chartTypeSelect");
const copyJsonBtn    = document.getElementById("copyJsonBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const downloadTxtBtn = document.getElementById("downloadTxtBtn");
const resetBtn       = document.getElementById("resetBtn");

// ── State ─────────────────────────────────────────────────────────────────────
let selectedFile  = null;
let analysisData  = null;
let chartInstances = {};   // keyed by canvas id

// ── File Selection ────────────────────────────────────────────────────────────
browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file.name.endsWith(".csv")) {
    showError("Only CSV files are supported. Please select a valid .csv file.");
    return;
  }
  selectedFile = file;
  fileNameSpan.textContent = file.name;
  fileChip.style.display   = "flex";
  analyzeBtn.disabled      = false;
  hideError();
}

removeFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  resetFileUI();
});

function resetFileUI() {
  selectedFile         = null;
  fileInput.value      = "";
  fileChip.style.display = "none";
  analyzeBtn.disabled  = true;
  btnLabel.textContent = "Analyze Data";
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
["dragenter","dragover"].forEach(evt =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  })
);

["dragleave","drop"].forEach(evt =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  })
);

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

dropZone.addEventListener("click", (e) => {
  if (e.target === browseBtn || e.target === removeFileBtn) return;
  if (!selectedFile) fileInput.click();
});

// ── Analyze ───────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  if (!selectedFile) return;
  hideError();
  showLoading("Uploading file…");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    setLoadingStep("Running statistical analysis…");
    const res = await fetch(ANALYZE, { method: "POST", body: formData });

    setLoadingStep("Generating insights & charts…");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }

    analysisData = data;
    hideLoading();
    renderResults(data);

  } catch (err) {
    hideLoading();
    showError(err.message || "Failed to connect to the backend. Is the Flask server running?");
  }
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data) {
  // Scroll to results
  resultsSection.style.display = "block";
  setTimeout(() => resultsSection.scrollIntoView({ behavior: "smooth" }), 50);

  renderInsights(data.insights);
  renderKPIs(data);
  renderStatsTable(data);
  renderTrends(data.trends);
  renderPredictions(data.predictions);
  renderJSON(data);
  populateColumnSelect(data.columns);
  renderAllCharts(data);
}

// Insights
function renderInsights(text) {
  insightsText.textContent = text;
}

// KPI cards
function renderKPIs(data) {
  const cols    = data.columns || [];
  const numCols = cols.length;
  const getFirst = (obj) => obj && cols.length ? obj[cols[0]] : "—";

  const kpis = [
    { icon: "📋", value: data.row_count, label: "Total Rows" },
    { icon: "📐", value: data.col_count,  label: "Total Columns" },
    { icon: "🔢", value: numCols,         label: "Numeric Columns" },
    { icon: "📊", value: fmt(getFirst(data.mean)),   label: `Mean (${cols[0] || "—"})` },
    { icon: "⬆️",  value: fmt(getFirst(data.max)),    label: `Max (${cols[0] || "—"})` },
    { icon: "⬇️",  value: fmt(getFirst(data.min)),    label: `Min (${cols[0] || "—"})` },
  ];

  kpiRow.innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join("");
}

// Stats table
function renderStatsTable(data) {
  const cols = data.columns || [];
  statsBody.innerHTML = cols.map(col => `
    <tr>
      <td>${col}</td>
      <td>${fmt(data.mean?.[col])}</td>
      <td>${fmt(data.median?.[col])}</td>
      <td>${fmt(data.min?.[col])}</td>
      <td>${fmt(data.max?.[col])}</td>
      <td>${fmt(data.std?.[col])}</td>
      <td>${fmt(data.variance?.[col])}</td>
    </tr>
  `).join("");
}

// Trends
function renderTrends(trends) {
  const icons = { increasing: "📈", decreasing: "📉", flat: "➡️" };
  trendGrid.innerHTML = Object.entries(trends || {}).map(([col, t]) => `
    <div class="trend-card">
      <span class="trend-icon">${icons[t] || "❓"}</span>
      <div class="trend-col">${col}</div>
      <span class="trend-badge ${t}">${t.toUpperCase()}</span>
    </div>
  `).join("");
}

// Predictions
function renderPredictions(preds) {
  predGrid.innerHTML = Object.entries(preds || {}).map(([col, val]) => `
    <div class="pred-card">
      <div class="pred-col">${col}</div>
      <div class="pred-value">${fmt(val)}</div>
      <div class="pred-label">Predicted next value</div>
    </div>
  `).join("");
}

// Raw JSON
function renderJSON(data) {
  jsonBlock.textContent = JSON.stringify(data, null, 2);
}

// ── Column Select ─────────────────────────────────────────────────────────────
function populateColumnSelect(cols) {
  columnSelect.innerHTML = (cols || []).map(c =>
    `<option value="${c}">${c}</option>`
  ).join("");
  columnSelect.addEventListener("change", () => renderTrendChart(analysisData));
  chartTypeSelect.addEventListener("change", () => renderTrendChart(analysisData));
}

// ── Charts ────────────────────────────────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function renderAllCharts(data) {
  renderTrendChart(data);
  renderMeanChart(data);
  renderRangeChart(data);
  renderVarChart(data);
}

/** Main trend chart — plots a single column's raw data over rows */
function renderTrendChart(data) {
  destroyChart("trendChart");
  const col = columnSelect.value;
  if (!col || !data.column_data?.[col]) return;

  const values = data.column_data[col];
  const labels  = values.map((_, i) => `Row ${i + 1}`);
  const type    = chartTypeSelect.value;

  chartInstances["trendChart"] = new Chart(
    document.getElementById("trendChart"),
    {
      type,
      data: {
        labels,
        datasets: [{
          label: col,
          data: values,
          borderColor: color(0),
          backgroundColor: type === "line" ? color(0, 0.08) : color(0, 0.45),
          borderWidth: 2,
          pointRadius: values.length < 50 ? 3 : 0,
          fill: type === "line",
          tension: 0.4,
        }],
      },
      options: chartOptions(`${col} over rows`),
    }
  );
}

/** Bar chart — mean value per column */
function renderMeanChart(data) {
  destroyChart("meanChart");
  const cols   = data.columns || [];
  const values = cols.map(c => data.mean?.[c] ?? 0);

  chartInstances["meanChart"] = new Chart(
    document.getElementById("meanChart"),
    {
      type: "bar",
      data: {
        labels: cols,
        datasets: [{
          label: "Mean",
          data: values,
          backgroundColor: cols.map((_, i) => color(i, 0.55)),
          borderColor:     cols.map((_, i) => color(i)),
          borderWidth: 1.5,
          borderRadius: 6,
        }],
      },
      options: chartOptions("Mean per Column"),
    }
  );
}

/** Grouped bar — min & max per column */
function renderRangeChart(data) {
  destroyChart("rangeChart");
  const cols = data.columns || [];

  chartInstances["rangeChart"] = new Chart(
    document.getElementById("rangeChart"),
    {
      type: "bar",
      data: {
        labels: cols,
        datasets: [
          {
            label: "Min",
            data: cols.map(c => data.min?.[c] ?? 0),
            backgroundColor: cols.map(() => "rgba(239,68,68,0.45)"),
            borderColor:     cols.map(() => "#ef4444"),
            borderWidth: 1.5, borderRadius: 6,
          },
          {
            label: "Max",
            data: cols.map(c => data.max?.[c] ?? 0),
            backgroundColor: cols.map(() => "rgba(16,185,129,0.45)"),
            borderColor:     cols.map(() => "#10b981"),
            borderWidth: 1.5, borderRadius: 6,
          },
        ],
      },
      options: chartOptions("Min / Max per Column"),
    }
  );
}

/** Horizontal bar — variance per column */
function renderVarChart(data) {
  destroyChart("varChart");
  const cols = data.columns || [];
  const vals = cols.map(c => data.variance?.[c] ?? 0);

  chartInstances["varChart"] = new Chart(
    document.getElementById("varChart"),
    {
      type: "bar",
      data: {
        labels: cols,
        datasets: [{
          label: "Variance",
          data: vals,
          backgroundColor: cols.map((_, i) => color(i + 3, 0.5)),
          borderColor:     cols.map((_, i) => color(i + 3)),
          borderWidth: 1.5, borderRadius: 6,
        }],
      },
      options: {
        ...chartOptions("Variance per Column"),
        indexAxis: "y",
      },
    }
  );
}

/** Shared chart options (dark theme) */
function chartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: "#8892a8", font: { family: "Inter", size: 12 } } },
      title: {
        display: false,
        text: title,
        color: "#e2e8f0",
        font: { size: 13, weight: "600" },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#e2e8f0",
        bodyColor: "#8892a8",
        borderColor: "rgba(99,179,237,0.2)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: "#8892a8", font: { family: "Inter", size: 11 } },
        grid:  { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#8892a8", font: { family: "Inter", size: 11 } },
        grid:  { color: "rgba(255,255,255,0.04)" },
      },
    },
  };
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    // Re-render charts when switching to chart tab (fixes canvas sizing)
    if (btn.dataset.tab === "charts" && analysisData) {
      setTimeout(() => renderAllCharts(analysisData), 50);
    }
  });
});

// ── Copy JSON ─────────────────────────────────────────────────────────────────
copyJsonBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(jsonBlock.textContent).then(() => {
    copyJsonBtn.textContent = "✅ Copied!";
    setTimeout(() => (copyJsonBtn.textContent = "📋 Copy JSON"), 2000);
  });
});

// ── Download TXT Report ───────────────────────────────────────────────────────
downloadTxtBtn.addEventListener("click", () => {
  if (!analysisData) return;
  const d  = analysisData;
  const ts = new Date().toLocaleString();
  const lines = [
    "════════════════════════════════════════════",
    "         DLP CHART ANALYZER — REPORT        ",
    "════════════════════════════════════════════",
    `Generated: ${ts}`,
    `File: ${selectedFile?.name || "unknown"}`,
    "",
    "── DATASET OVERVIEW ──",
    `  Rows:            ${d.row_count}`,
    `  Total Columns:   ${d.col_count}`,
    `  Numeric Columns: ${(d.columns || []).join(", ")}`,
    "",
    "── STATISTICAL SUMMARY ──",
    ...(d.columns || []).map(col => [
      `  ${col}:`,
      `    Mean     = ${fmt(d.mean?.[col])}`,
      `    Median   = ${fmt(d.median?.[col])}`,
      `    Min      = ${fmt(d.min?.[col])}`,
      `    Max      = ${fmt(d.max?.[col])}`,
      `    Std Dev  = ${fmt(d.std?.[col])}`,
      `    Variance = ${fmt(d.variance?.[col])}`,
    ].join("\n")),
    "",
    "── TREND ANALYSIS ──",
    ...Object.entries(d.trends || {}).map(([c, t]) => `  ${c}: ${t.toUpperCase()}`),
    "",
    "── AI PREDICTIONS (next value) ──",
    ...Object.entries(d.predictions || {}).map(([c, v]) => `  ${c}: ${fmt(v)}`),
    "",
    "── INSIGHTS ──",
    d.insights || "",
    "",
    "════════════════════════════════════════════",
    "              END OF REPORT                 ",
    "════════════════════════════════════════════",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  triggerDownload(blob, "dlp_analysis_report.txt");
});

// ── Download PDF Report ───────────────────────────────────────────────────────
downloadPdfBtn.addEventListener("click", () => {
  if (!analysisData) return;
  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ unit: "mm", format: "a4" });
  const d    = analysisData;
  const ts   = new Date().toLocaleString();
  const PAGE_W = 210, MARGIN = 18;
  const textW  = PAGE_W - MARGIN * 2;
  let y = 20;

  // Helper to add a line and auto-page-break
  function addLine(text, size = 10, style = "normal", hexColor = "#e2e8f0") {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(hexColor);
    const lines = doc.splitTextToSize(String(text), textW);
    lines.forEach(line => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, MARGIN, y);
      y += size * 0.45 + 1.5;
    });
  }

  function gap(mm = 4) { y += mm; }

  // Dark background
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, PAGE_W, 297, "F");

  // Title block
  doc.setFillColor(99, 102, 241, 0.6);
  doc.rect(0, 0, PAGE_W, 36, "F");
  doc.setFontSize(20); doc.setFont("helvetica","bold");
  doc.setTextColor("#ffffff");
  doc.text("DLP Chart Analyzer", MARGIN, 16);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.setTextColor("#a0aec0");
  doc.text(`Analysis Report  •  ${ts}  •  ${selectedFile?.name || ""}`, MARGIN, 26);
  y = 46;

  // Sections
  const section = (title) => {
    gap(2);
    doc.setFillColor(30, 40, 60);
    doc.rect(MARGIN - 2, y - 5, textW + 4, 8, "F");
    addLine(title, 11, "bold", "#06b6d4");
    gap(1);
  };

  section("Dataset Overview");
  addLine(`Rows: ${d.row_count}   |   Total Columns: ${d.col_count}   |   Numeric: ${(d.columns||[]).length}`);
  gap(3);

  section("Statistical Summary");
  (d.columns || []).forEach(col => {
    gap(2);
    addLine(`▸ ${col}`, 10, "bold", "#8b5cf6");
    addLine(`  Mean ${fmt(d.mean?.[col])}  |  Median ${fmt(d.median?.[col])}  |  Min ${fmt(d.min?.[col])}  |  Max ${fmt(d.max?.[col])}  |  Std Dev ${fmt(d.std?.[col])}  |  Variance ${fmt(d.variance?.[col])}`);
  });
  gap(3);

  section("Trend Analysis");
  const icons = { increasing: "↑", decreasing: "↓", flat: "→" };
  Object.entries(d.trends || {}).forEach(([col, t]) => {
    addLine(`${icons[t] || "?"} ${col}: ${t.toUpperCase()}`);
  });
  gap(3);

  section("AI Predictions (Next Row)");
  Object.entries(d.predictions || {}).forEach(([col, val]) => {
    addLine(`${col}: ${fmt(val)}`);
  });
  gap(3);

  section("Insights");
  addLine(d.insights || "");

  doc.save("dlp_analysis_report.pdf");
});

// ── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
  analysisData = null;
  Object.keys(chartInstances).forEach(destroyChart);
  kpiRow.innerHTML = "";
  statsBody.innerHTML = "";
  trendGrid.innerHTML = "";
  predGrid.innerHTML = "";
  jsonBlock.textContent = "";
  columnSelect.innerHTML = "";
  resultsSection.style.display = "none";
  resetFileUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Loading helpers ───────────────────────────────────────────────────────────
function showLoading(msg = "Processing…") {
  loadingStep.textContent  = msg;
  loadingOverlay.style.display = "flex";
}
function setLoadingStep(msg) { loadingStep.textContent = msg; }
function hideLoading()       { loadingOverlay.style.display = "none"; }

// ── Error helpers ─────────────────────────────────────────────────────────────
function showError(msg) {
  errorText.textContent       = msg;
  errorBanner.style.display   = "flex";
}
window.hideError = function () { errorBanner.style.display = "none"; };

// ── Number formatter ──────────────────────────────────────────────────────────
function fmt(val) {
  if (val === null || val === undefined || val === "—") return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  // Show integers as integers, floats with up to 4 significant decimals
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ── File download trigger ─────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
