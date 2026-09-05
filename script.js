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
  risk_pressure: "Verdichtet Spitzenrisiken bei Verfügbarkeit, Preis und kritischen Lieferketten.",
  nand: "Festere Preise, aber mittelfristig mehr Entlastungspotenzial als bei DRAM.",
  ai_infrastructure: "Power, Datacenter-Kapazität und Memory bestimmen das Ausbautempo."
};

const marketLabel = {
  server_dram: "Server DRAM / RDIMM",
  hbm: "HBM",
  enterprise_ssd: "Enterprise SSD",
  nand: "NAND",
  ai_infrastructure: "AI Infrastructure"
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

function renderMarketOutlook(outlookInput) {
  const grid = document.getElementById("outlook-grid");
  if (!grid) return;
  const outlooks = Array.isArray(outlookInput?.outlooks) ? outlookInput.outlooks : [];

  grid.innerHTML = outlooks.map((outlook) => {
    const scenarios = Array.isArray(outlook.scenarios) ? outlook.scenarios : [];
    const timeline = Array.isArray(outlook.timeline) ? outlook.timeline : [];
    const changeRules = Array.isArray(outlook.changeRules) ? outlook.changeRules : [];
    const watchSignals = Array.isArray(outlook.watchSignals) ? outlook.watchSignals : [];
    const status = ["red", "orange", "yellow", "green"].includes(outlook.currentStatus) ? outlook.currentStatus : "orange";

    return `
      <article class="outlook-card">
        <div class="outlook-header">
          <div>
            <div class="outlook-title-row">
              <span class="outlook-horizon">${escapeHtml(marketLabel[outlook.marketId] || outlook.marketId)} · ${escapeHtml(outlook.horizon || "")}</span>
              <h3>${escapeHtml(outlook.headline || "Market Outlook")}</h3>
            </div>
            <p class="outlook-view">${escapeHtml(outlook.view || "")}</p>
            <div class="outlook-meta">
              <span>Datenstand ${escapeHtml(formatDate(outlook.asOf))}</span>
              <span>Confidence ${Number.isFinite(Number(outlook.confidence)) ? Number(outlook.confidence) : "–"}/100</span>
              <span>Abdeckung ${Number.isFinite(Number(outlook.coverage)) ? Number(outlook.coverage) : "–"}%</span>
            </div>
          </div>
          <div class="outlook-score ${status}" aria-label="Aktueller Segmentindex">
            <strong>${Number.isFinite(Number(outlook.currentScore)) ? Number(outlook.currentScore) : "–"}</strong><span>heute /100</span>
          </div>
        </div>

        <div class="scenario-grid" aria-label="Szenariogewichte">
          ${scenarios.map((scenario) => `
            <div class="scenario-card ${escapeHtml(scenario.id || "")}">
              <div class="scenario-prob">${Number(scenario.probability) || 0}%</div>
              <strong>${escapeHtml(scenario.label)}</strong>
              <p>${escapeHtml(scenario.regime)}</p>
            </div>`).join("")}
        </div>

        <div class="outlook-subgrid">
          <div class="outlook-panel">
            <h4>Erwarteter Pfad</h4>
            <div class="timeline">
              ${timeline.map((item) => `
                <div class="timeline-item">
                  <time>${escapeHtml(item.year)}</time>
                  <strong>${escapeHtml(item.label)}</strong>
                  <p>${escapeHtml(item.detail)}</p>
                </div>`).join("")}
            </div>
          </div>
          <div class="outlook-panel">
            <h4>Was unsere Sicht ändern würde</h4>
            <div class="change-rules">
              ${changeRules.map((rule) => `
                <div class="change-rule ${escapeHtml(rule.direction || "")}">
                  <strong>${escapeHtml(rule.label)}</strong>
                  <span>${escapeHtml(rule.condition)}</span>
                </div>`).join("")}
            </div>
          </div>
        </div>

        ${watchSignals.length ? `<div class="watch-row" aria-label="Frühwarnsignale">${watchSignals.map((signal) => `<span class="watch-chip">${escapeHtml(signal)}</span>`).join("")}</div>` : ""}
        <p class="outlook-note">${escapeHtml(outlook.methodologyNote || "")}</p>
      </article>`;
  }).join("") || '<article class="loading-card outlook-empty">Noch kein öffentlicher Deep-Research-Outlook freigegeben.</article>';
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
  const riskPressure = Number(pulse.riskPressure);
  const pressureCards = Number.isFinite(riskPressure)
    ? [...indexMarkets, {
        id: "risk_pressure",
        label: "Risk Pressure",
        score: riskPressure,
        status: riskPressure >= 82 ? "red" : riskPressure >= 70 ? "orange" : riskPressure >= 55 ? "yellow" : "green"
      }]
    : indexMarkets;
  document.getElementById("mini-markets").innerHTML = indexMarkets.map((market) => `
    <div class="mini-market">
      <span>${escapeHtml(market.label)}</span><strong>${Number(market.score) || 0}</strong>
      <div><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
    </div>`).join("");

  document.getElementById("market-grid").innerHTML = pressureCards.map((market) => `
    <article class="market-card ${escapeHtml(market.status || "orange")}">
      <div class="market-head"><h3>${escapeHtml(market.label)}</h3><span class="market-score">${Number(market.score) || 0}</span></div>
      <div class="market-track"><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
      <p>${escapeHtml(marketExplanation[market.id] || `${market.signals || 0} relevante Signale im aktuellen Lagebild.`)}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Marktdaten verfügbar.</article>';

  renderMarketOutlook(snapshot.marketOutlook);

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
  const outlookGrid = document.getElementById("outlook-grid");
  if (outlookGrid) outlookGrid.innerHTML = '<article class="loading-card">Der Market Outlook ist vorübergehend nicht verfügbar.</article>';
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
