const PUBLIC_DATA_URL = "/public-tail/data.json";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "unbekannt";
  const normalized = String(value).includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric"
  }).format(date);
};

const marketExplanation = {
  server_dram: "AI-Server und steigende Speicherkapazität treffen auf begrenzte Wafer-Allokation.",
  dram: "HBM-Verdrängung und Servernachfrage halten die Angebotslage angespannt.",
  hbm: "Plattformspezifische Qualifizierung bindet Frontend- und Packaging-Kapazität.",
  enterprise_ssd: "AI-Datenpipelines und High-Capacity-Systeme stützen die Nachfrage.",
  nand: "Festere Preise, aber mittelfristig mehr Entlastungspotenzial als bei DRAM.",
  ai_infrastructure: "Power, Datacenter-Kapazität und Memory bestimmen das Ausbautempo."
};

function renderCatalysts(catalystInput) {
  const grid = document.getElementById("catalyst-grid");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const catalysts = (Array.isArray(catalystInput) ? catalystInput : [])
    .map((catalyst) => ({ ...catalyst, timestamp: new Date(`${catalyst.date}T00:00:00`).getTime() }))
    .filter((catalyst) => Number.isFinite(catalyst.timestamp) && catalyst.timestamp >= startOfToday.getTime())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 4);

  grid.innerHTML = catalysts.map((catalyst, index) => {
    const daysUntil = Math.max(0, Math.ceil((catalyst.timestamp - startOfToday.getTime()) / 86_400_000));
    const timing = daysUntil === 0 ? "Heute" : daysUntil === 1 ? "Morgen" : `In ${daysUntil} Tagen`;
    return `
      <article class="catalyst-card${index === 0 ? " next" : ""}">
        <div class="catalyst-date"><time datetime="${escapeHtml(catalyst.date)}">${escapeHtml(formatDate(catalyst.date))}</time><span>${timing}</span></div>
        <h3>${escapeHtml(catalyst.event)}</h3>
        <p>${index === 0 ? "Nächster MT·AI-Prüfpunkt" : "Beobachtungstermin im aktuellen Lagebild"}</p>
      </article>`;
  }).join("") || '<article class="loading-card">Derzeit sind keine zukünftigen Katalysatoren eingetragen.</article>';
}

function renderDashboard(snapshot) {
  const platform = snapshot.platform || {};
  const pulse = snapshot.executivePulse || {};
  document.getElementById("tail-index").textContent = pulse.current ?? "–";
  const indexLabel = document.getElementById("index-label");
  const indexStatus = String(pulse.status || "live").toLowerCase();
  indexLabel.textContent = indexStatus.toUpperCase();
  indexLabel.className = `state-chip ${["red", "orange", "yellow", "green"].includes(indexStatus) ? indexStatus : "green"}`;
  document.getElementById("index-summary").textContent = pulse.interpretation || "MT·AI bewertet die aktuelle Marktlage.";

  const isCurrent = platform.dataFreshness === "current" && platform.processStatus === "ok";
  const dot = document.querySelector(".status-dot");
  if (!isCurrent) dot.classList.add("stale");
  document.getElementById("freshness-text").textContent = `${isCurrent ? "Aktuell" : "Prüfung läuft"} · Datenstand ${formatDate(platform.dataAsOf)} · ${platform.articleCount ?? "–"} Quellen im Lagebild`;

  const markets = Array.isArray(platform.markets) ? platform.markets.slice(0, 6) : [];
  const indexMarketIds = ["server_dram", "hbm", "enterprise_ssd"];
  const indexMarkets = indexMarketIds.map((id) => markets.find((market) => market.id === id)).filter(Boolean);
  document.getElementById("mini-markets").innerHTML = indexMarkets.map((market) => `
    <div class="mini-market">
      <span>${escapeHtml(market.label)}</span><strong>${Number(market.score) || 0}</strong>
      <div><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
    </div>`).join("");

  document.getElementById("market-grid").innerHTML = indexMarkets.map((market) => `
    <article class="market-card ${escapeHtml(market.status || "orange")}">
      <div class="market-head"><h3>${escapeHtml(market.label)}</h3><span class="market-score">${Number(market.score) || 0}</span></div>
      <div class="market-track"><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
      <p>${escapeHtml(marketExplanation[market.id] || `${market.signals || 0} relevante Signale im aktuellen Lagebild.`)}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Marktdaten verfügbar.</article>';

  const signals = Array.isArray(snapshot.signals) ? snapshot.signals : [];
  document.getElementById("signal-grid").innerHTML = signals.map((signal, index) => `
    <article class="signal-card">
      <div class="signal-meta"><span>Signal ${String(index + 1).padStart(2, "0")} · ${escapeHtml(formatDate(signal.date))}</span><span class="signal-score">${Number(signal.score) || "–"}/100</span></div>
      <h3>${escapeHtml(signal.title)}</h3>
      <p>${escapeHtml(signal.summary)}</p>
      <p class="signal-impact"><span>Warum es zählt</span>${escapeHtml(signal.analysis || "Die Marktwirkung wird im nächsten MT·AI-Lauf weiter geprüft.")}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Signale verfügbar.</article>';

  renderCatalysts(snapshot.catalysts);
}

function renderDataError() {
  document.getElementById("freshness-text").textContent = "MT·AI-Daten können gerade nicht geladen werden – die letzte Einschätzung wird nicht als aktuell ausgegeben.";
  document.querySelector(".status-dot").classList.add("stale");
  document.getElementById("market-grid").innerHTML = '<article class="loading-card">Das aktuelle Lagebild ist vorübergehend nicht verfügbar.</article>';
  document.getElementById("signal-grid").innerHTML = '<article class="loading-card">Die aktuellen Signale sind vorübergehend nicht verfügbar.</article>';
  document.getElementById("catalyst-grid").innerHTML = '<article class="loading-card">Die nächsten Katalysatoren sind vorübergehend nicht verfügbar.</article>';
}

async function loadDashboard() {
  try {
    const response = await fetch(`${PUBLIC_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderDashboard(await response.json());
  } catch (error) {
    console.error("MT·AI public dashboard failed:", error);
    renderDataError();
  }
}

loadDashboard();
