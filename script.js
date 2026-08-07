const DATA_URL = "/tail-intelligence/data/dashboard.json";

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "unbekannt";
  const date = new Date(`${value}T12:00:00`);
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
  ai_infrastructure: "Power, Datacenter-Kapazität und Memory bestimmen das Ausbautempo.",
  semiconductors: "Advanced Nodes und Packaging bleiben strategische Engpassfelder.",
  supply_chain: "LTAs und geopolitische Fragmentierung verändern die Verfügbarkeit."
};

function renderDashboard(data) {
  document.getElementById("tail-index").textContent = data.tailIndex ?? "–";
  const indexLabel = document.getElementById("index-label");
  const indexStatus = String(data.indexStatus || "live").toLowerCase();
  indexLabel.textContent = indexStatus.toUpperCase();
  indexLabel.className = `state-chip ${["red", "orange", "yellow", "green"].includes(indexStatus) ? indexStatus : "green"}`;
  document.getElementById("index-summary").textContent = data.executiveSummary || "TAIL bewertet die aktuelle Marktlage.";

  const isCurrent = data.dataFreshness === "current" && data.processStatus === "ok";
  const dot = document.querySelector(".status-dot");
  if (!isCurrent) dot.classList.add("stale");
  document.getElementById("freshness-text").textContent = `${isCurrent ? "Aktuell" : "Prüfung läuft"} · Datenstand ${formatDate(data.dataAsOf)} · ${data.articleCount ?? data.totalArticles ?? "–"} Quellen im Lagebild`;

  const markets = Array.isArray(data.markets) ? data.markets.slice(0, 6) : [];
  document.getElementById("mini-markets").innerHTML = markets.slice(0, 3).map((market) => `
    <div class="mini-market">
      <span>${escapeHtml(market.label)}</span><strong>${Number(market.score) || 0}</strong>
      <div><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
    </div>`).join("");

  document.getElementById("market-grid").innerHTML = markets.map((market) => `
    <article class="market-card ${escapeHtml(market.status || "orange")}">
      <div class="market-head"><h3>${escapeHtml(market.label)}</h3><span class="market-score">${Number(market.score) || 0}</span></div>
      <div class="market-track"><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
      <p>${escapeHtml(marketExplanation[market.id] || `${market.signals || 0} relevante Signale im aktuellen Lagebild.`)}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Marktdaten verfügbar.</article>';

  const signals = Array.isArray(data.topSignals) ? data.topSignals.slice(0, 3) : [];
  document.getElementById("signal-grid").innerHTML = signals.map((signal, index) => `
    <article class="signal-card">
      <div class="signal-meta"><span>Signal ${String(index + 1).padStart(2, "0")} · ${escapeHtml(formatDate(signal.date))}</span><span class="signal-score">${Number(signal.score) || "–"}/100</span></div>
      <h3>${escapeHtml(signal.title)}</h3>
      <p>${escapeHtml(signal.summary)}</p>
      <p class="signal-impact"><span>Warum es zählt</span>${escapeHtml(signal.analysis || "Die Marktwirkung wird im nächsten TAIL-Lauf weiter geprüft.")}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Signale verfügbar.</article>';
}

function renderDataError() {
  document.getElementById("freshness-text").textContent = "TAIL-Daten können gerade nicht geladen werden – die letzte Einschätzung wird nicht als aktuell ausgegeben.";
  document.querySelector(".status-dot").classList.add("stale");
  document.getElementById("market-grid").innerHTML = '<article class="loading-card">Das aktuelle Lagebild ist vorübergehend nicht verfügbar.</article>';
  document.getElementById("signal-grid").innerHTML = '<article class="loading-card">Die aktuellen Signale sind vorübergehend nicht verfügbar.</article>';
}

async function loadDashboard() {
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderDashboard(await response.json());
  } catch (error) {
    console.error("TAIL public dashboard failed:", error);
    renderDataError();
  }
}

const newsletterForm = document.getElementById("newsletter-form");
newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.getElementById("form-status");
  const button = newsletterForm.querySelector("button");
  const email = document.getElementById("email").value.trim();
  const consent = document.getElementById("consent").checked;
  status.className = "form-status";

  if (!newsletterForm.checkValidity() || !consent) {
    status.textContent = "Bitte E-Mail-Adresse und Einwilligung prüfen.";
    status.classList.add("error");
    newsletterForm.reportValidity();
    return;
  }

  button.disabled = true;
  button.textContent = "Wird angemeldet …";
  try {
    const response = await fetch("/api/newsletter-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, source: "michaelthedens.de" })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Anmeldung derzeit nicht möglich.");
    status.textContent = "Fast geschafft: Bitte jetzt den Bestätigungslink in deinem Postfach anklicken.";
    status.classList.add("success");
    newsletterForm.reset();
  } catch (error) {
    status.textContent = error.message || "Die Anmeldung ist gerade nicht möglich. Bitte später erneut versuchen.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = "Briefing abonnieren";
  }
});

loadDashboard();
