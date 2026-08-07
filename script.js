const PLATFORM_URL = "/tail-intelligence/data/dashboard.json";
const DAILY_URL = "/tail-intelligence/data/daily-intelligence-latest.json";
const ARTICLES_URL = "/tail-intelligence/data/articles.json";

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

const driverExplanation = {
  "AI-Compute-Nachfrage": "Training, Inference und eigene Accelerator-Programme halten die Systemnachfrage auf Höchstniveau.",
  "Memory / SSD Export Demand": "Memory- und SSD-Nachfrage verbreitert sich über AI-Server, Storage und internationale Lieferketten.",
  "NAND Contracting / Capacity Lock": "Mehrjährige Verträge binden NAND-Kapazität und begrenzen frei verfügbare Mengen.",
  "NAND / Memory-Centric Architecture": "Neue Systemarchitekturen rücken NAND und Memory näher an den AI-Accelerator.",
  "Vertical Semiconductor Integration": "AI-Anbieter sichern sich zunehmend eigene Logik-, Memory- und Packaging-Kapazität.",
  "AI Infrastructure Financing / Lease Exposure": "Anleihen, Leasing und langfristige Abnahmen verlängern den AI-Ausbau – und erhöhen die Kapitalbindung."
};

const scoreStatus = (score) => score >= 90 ? "red" : score >= 75 ? "orange" : score >= 60 ? "yellow" : "green";

function buildPublicMarkets(daily, fallbackMarkets = []) {
  if (!Array.isArray(daily?.driverScores) || !daily.driverScores.length) return fallbackMarkets.slice(0, 6);
  return daily.driverScores.slice(0, 6).map((driver) => {
    const score = Number(driver.absoluteSeverity ?? driver.score) || 0;
    return {
      id: driver.name,
      label: driver.name,
      score,
      status: scoreStatus(score),
      explanation: driverExplanation[driver.name] || `Aktuelle Signalstärke ${score}/100${Number.isFinite(driver.delta) ? ` · Veränderung ${driver.delta > 0 ? "+" : ""}${driver.delta}` : ""}.`
    };
  });
}

function selectPublicSignals(daily, articles, fallbackSignals = []) {
  if (!Array.isArray(daily?.acceptedSignals) || !daily.acceptedSignals.length) return fallbackSignals.slice(0, 3);
  const articlesById = new Map((Array.isArray(articles) ? articles : []).map((article) => [article.id, article]));
  const dailyDate = String(daily.updatedAt || "").slice(0, 10);
  return daily.acceptedSignals.slice(0, 3).map((signal) => {
    const article = articlesById.get(signal.id) || {};
    return {
      date: article.date || dailyDate,
      title: signal.title,
      summary: article.summary || signal.fact,
      analysis: article.tail_analysis || signal.tailInference,
      score: signal.priorityScore
    };
  });
}

function renderDashboard(platform, daily, publicSignals) {
  const pulse = daily.executivePulse || {};
  document.getElementById("tail-index").textContent = pulse.current ?? "–";
  const indexLabel = document.getElementById("index-label");
  const indexStatus = String(pulse.status || "live").toLowerCase();
  indexLabel.textContent = indexStatus.toUpperCase();
  indexLabel.className = `state-chip ${["red", "orange", "yellow", "green"].includes(indexStatus) ? indexStatus : "green"}`;
  document.getElementById("index-summary").textContent = pulse.interpretation || "TAIL bewertet die aktuelle Marktlage.";

  const isCurrent = platform.dataFreshness === "current" && platform.processStatus === "ok";
  const dot = document.querySelector(".status-dot");
  if (!isCurrent) dot.classList.add("stale");
  document.getElementById("freshness-text").textContent = `${isCurrent ? "Aktuell" : "Prüfung läuft"} · Datenstand ${formatDate(daily.updatedAt || platform.dataAsOf)} · ${platform.articleCount ?? platform.totalArticles ?? "–"} Quellen im Lagebild`;

  const markets = buildPublicMarkets(daily, platform.markets);
  document.getElementById("mini-markets").innerHTML = markets.slice(0, 3).map((market) => `
    <div class="mini-market">
      <span>${escapeHtml(market.label)}</span><strong>${Number(market.score) || 0}</strong>
      <div><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
    </div>`).join("");

  document.getElementById("market-grid").innerHTML = markets.map((market) => `
    <article class="market-card ${escapeHtml(market.status || "orange")}">
      <div class="market-head"><h3>${escapeHtml(market.label)}</h3><span class="market-score">${Number(market.score) || 0}</span></div>
      <div class="market-track"><i style="width:${Math.min(100, Math.max(0, Number(market.score) || 0))}%"></i></div>
      <p>${escapeHtml(market.explanation || `${market.signals || 0} relevante Signale im aktuellen Lagebild.`)}</p>
    </article>`).join("") || '<article class="loading-card">Derzeit sind keine öffentlichen Marktdaten verfügbar.</article>';

  const signals = Array.isArray(publicSignals) ? publicSignals : [];
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
    const cacheBuster = Date.now();
    const [platformResponse, dailyResponse, articlesResponse] = await Promise.all([
      fetch(`${PLATFORM_URL}?v=${cacheBuster}`, { cache: "no-store" }),
      fetch(`${DAILY_URL}?v=${cacheBuster}`, { cache: "no-store" }),
      fetch(`${ARTICLES_URL}?v=${cacheBuster}`, { cache: "no-store" }).catch(() => null)
    ]);
    if (!platformResponse.ok || !dailyResponse.ok) throw new Error(`HTTP ${platformResponse.status}/${dailyResponse.status}`);
    const [platform, daily] = await Promise.all([platformResponse.json(), dailyResponse.json()]);
    const articles = articlesResponse?.ok ? await articlesResponse.json() : [];
    renderDashboard(platform, daily, selectPublicSignals(daily, articles, platform.topSignals));
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
