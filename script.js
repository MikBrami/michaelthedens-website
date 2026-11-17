const PUBLIC_DATA_URL = "/public-tail/data.json";

const EDITORIAL_SIGNALS = [
  {
    "date": "2026-11-17",
    "title": "SK hynix erzielt 62,5 % seines Umsatzes in den USA",
    "summary": "Laut DIGITIMES entfielen in den ersten neun Monaten 62,5 % des Umsatzes auf die USA. Der separat berichtete Nvidia-Anteil ist eine Branchenschätzung.",
    "analysis": "Die Zahlen zeigen geografische Konzentration. Sie belegen weder den Umsatzanteil von Nvidia noch verfügbare HBM- oder RDIMM-Mengen.",
    "url": "https://www.digitimes.com/news/a20261117VL211/sk-hynix-memory-nvidia-revenue-sales-2026.html"
  },
  {
    "date": "2026-11-10",
    "title": "Serverkäufer beschaffen Speicher teils separat",
    "summary": "Der Bauteiledistributor Smith beobachtet bei einzelnen Kunden, dass sie konventionelle Serversysteme ohne Speicher anfragen und DRAM separat beschaffen.",
    "analysis": "Bestellungen von Komplettsystemen bilden den Bedarf an Server-RAM nur teilweise ab.",
    "url": "https://www.digitimes.com/news/a20261110VL216/barebones-component-production-chairman-32gb.html"
  },
  {
    "date": "2026-11-09",
    "title": "Phison meldet frühe NAND-Absicherung für 2027",
    "summary": "Phison hat nach eigenen Angaben mehr als 70 Prozent seines NAND-Beschaffungsziels für 2027 bereits abgesichert.",
    "analysis": "Frühe Mengenbindung ist ein Signal für die Beschaffungsplanung. Die Angabe bezieht sich auf Phison.",
    "url": "https://www.digitimes.com/news/a20261109PD258/phison-demand-nand-2027-ceo.html"
  }
];
const WATCHPOINTS = [
  [
    "Server-DRAM",
    "Lieferzeiten und verbindliche RDIMM-Zuteilungen für vergleichbare Bestückungen."
  ],
  [
    "Enterprise-SSDs",
    "Zugesagte TLC- und QLC-Mengen für 2027 sowie Änderungen bei Lieferfenstern."
  ],
  [
    "HBM und AI-Infrastruktur",
    "Bestätigte Kundenabrufe, Serienauslieferungen und die Inbetriebnahme von Rechenzentren."
  ]
];
const MARKET_NOTES = [
  "Separate RAM-Beschaffung kann Nachfrage in andere Vertriebskanäle verlagern.",
  "Die US-Umsatzquote bei SK hynix liefert einen Hinweis auf Konzentration. Verfügbare HBM-Mengen gehen daraus nicht hervor.",
  "Frühe NAND-Mengenbindung bei Phison macht verbindliche Zuteilungen für Enterprise-TLC und -QLC zum Prüfpunkt."
];

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

const marketLabel = {
  server_dram: "Server DRAM / RDIMM",
  hbm: "HBM",
  enterprise_ssd: "Enterprise SSD",
  nand: "NAND",
  ai_infrastructure: "AI Infrastructure"
};

function renderWatchpoints() {
  document.getElementById("catalyst-grid").innerHTML = WATCHPOINTS.map(([title, detail]) => `
    <article class="catalyst-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></article>`
  ).join("");
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
    const researchAsOf = outlook.evidenceAsOf || outlook.asOf;

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
              <span>Research-Stand ${escapeHtml(formatDate(researchAsOf))}</span>
              ${outlook.indexAsOf ? `<span>Index-Stand ${escapeHtml(formatDate(outlook.indexAsOf))}</span>` : ""}
              <span>Confidence ${Number.isFinite(Number(outlook.confidence)) ? Number(outlook.confidence) : "–"}/100</span>
              <span>Abdeckung ${Number.isFinite(Number(outlook.coverage)) ? Number(outlook.coverage) : "–"}%</span>
            </div>
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

function renderDashboard(snapshot, datedScore) {
  const platform = snapshot.platform || {};
  const pulse = snapshot.executivePulse || {};
  const review = platform.admissionReview || {};
  const evidence = platform.indexEvidenceAsOf || platform.sourceDataAsOf;
  const latest = EDITORIAL_SIGNALS[0].date;
  const isCurrent = review.status === "complete" && platform.dataFreshness === "current" &&
    platform.processStatus === "ok" && Boolean(evidence && evidence >= latest) &&
    Number.isFinite(pulse.current);
  const index = document.getElementById("tail-index");
  const useDatedScore = Number.isFinite(datedScore?.score) && (!isCurrent || evidence <= datedScore.asOf);
  const showScore = useDatedScore || isCurrent;
  index.textContent = useDatedScore ? datedScore.score : isCurrent ? pulse.current : "–";
  if (index.nextElementSibling) index.nextElementSibling.hidden = !showScore;
  const label = document.getElementById("index-label");
  label.textContent = useDatedScore ? "DATIERTER RECHENSTAND" : isCurrent ? "MT·AI" : "INDEX IN PRÜFUNG";
  label.className = "state-chip";
  document.getElementById("index-summary").textContent = useDatedScore ? "Die Vertragspreise für Server-DRAM steigen, während der RDIMM-Spotmarkt ruhig bleibt. Bei HBM übersteigt die Nachfrage die verfügbaren Mengen. Bei Enterprise-SSDs gleichen gekürzte Bestellungen chinesischer Cloudanbieter für 2027 laut TrendForce die höheren Bestellungen in Nordamerika aus." : isCurrent && pulse.interpretation
    ? pulse.interpretation : "Einige Serverkäufer beschaffen RAM separat. Phison meldet frühe NAND-Mengenbindung für 2027. SK hynix berichtet eine hohe US-Umsatzkonzentration. Die Signale geben Hinweise für die Beschaffung. Ihre Wirkung auf den Index ist noch offen.";
  document.querySelector(".status-dot").classList.toggle("stale", !isCurrent);
  document.getElementById("freshness-text").textContent = useDatedScore ? `Score-Evidenz bis ${formatDate(datedScore.asOf)}` : `Rechenlauf ${formatDate(platform.analysisAsOf || platform.dataAsOf)} · Index-Evidenz bis ${formatDate(evidence)}`;
  document.getElementById("signal-freshness").textContent = `Neueste ausgewählte Quelle ${formatDate(latest)}`;
  document.getElementById("mini-markets").replaceChildren();
  const marketNames = ["Server DRAM / RDIMM", "HBM", "Enterprise SSD"];
  const marketIds = ["server_dram", "hbm", "enterprise_ssd"];
  document.getElementById("market-grid").innerHTML = MARKET_NOTES.map((note, i) => `
    <article class="market-card"><div class="market-head"><h3>${escapeHtml(marketNames[i])}</h3>${useDatedScore && Number.isFinite(datedScore.segments?.[marketIds[i]]) ? `<span class="market-score">${datedScore.segments[marketIds[i]]}</span>` : ""}</div><p>${escapeHtml(note)}</p></article>`
  ).join("");

  const riskPressure = useDatedScore ? datedScore.riskPressure : isCurrent ? pulse.riskPressure : null;
  if (Number.isFinite(riskPressure)) {
    const risk = document.createElement("article");
    risk.className = "market-card";
    risk.innerHTML = `<div class="market-head"><h3>Risk Pressure</h3><span class="market-score">${riskPressure}</span></div><p>Verbindet den höchsten Druck in den Kernmärkten mit dem höchsten Verfügbarkeitsdruck.</p>`;
    document.getElementById("market-grid").append(risk);
  }

  renderMarketOutlook(snapshot.marketOutlook);

  document.getElementById("signal-grid").innerHTML = EDITORIAL_SIGNALS.map((signal) => `
    <article class="signal-card">
      <div class="signal-meta"><span>${escapeHtml(formatDate(signal.date))}</span><span>Redaktionell ausgewählt</span></div>
      <h3>${escapeHtml(signal.title)}</h3>
      <p>${escapeHtml(signal.summary)}</p>
      <p class="signal-impact"><span>Warum es zählt</span>${escapeHtml(signal.analysis)}</p>
      <p><a href="${escapeHtml(signal.url)}" rel="noopener noreferrer" target="_blank">Quelle bei DIGITIMES</a></p>
    </article>`).join("");

  document.getElementById("market-evidence")?.remove();
  if (useDatedScore) {
    const [title, intro, strength, confidence, source, additional] = ["Marktbelege und Bewertungsannahmen","Stärke und Konfidenz der Belege sind jeweils auf einer Skala von 0 bis 100 bewertet.","Stärke","Konfidenz","Quelle","Ergänzende Beobachtungen"];
    const details = document.createElement("section");
    details.className = "market-card";
    details.id = "market-evidence";
    details.style.marginTop = "1rem";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const explanation = document.createElement("p");
    explanation.textContent = intro;
    details.append(heading, explanation);

    const addEvidence = (entries, describe) => {
      const list = document.createElement("ul");
      for (const entry of entries || []) {
        const item = document.createElement("li");
        item.textContent = `${formatDate(entry.date)} · ${describe(entry)} `;
        if (typeof entry.url === "string" && entry.url.startsWith("https://")) {
          const link = document.createElement("a");
          link.href = entry.url;
          link.textContent = source;
          link.rel = "noopener noreferrer";
          link.target = "_blank";
          item.append(link);
        }
        list.append(item);
      }
      details.append(list);
    };

    addEvidence(datedScore.evidence, (entry) =>
      `${entry.summary} ${strength} ${entry.severity}/100 · ${confidence} ${entry.confidence}/100.`);
    if (datedScore.contextReview?.observations?.length) {
      const subtitle = document.createElement("h3");
      subtitle.textContent = additional;
      details.append(subtitle);
      addEvidence(datedScore.contextReview.observations, (entry) =>
        `${entry.observation} ${entry.interpretation}`);
    }
    document.getElementById("market-grid").after(details);
  }
  renderWatchpoints();
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
    const score = await fetch("/public-tail/market-score-2026-11-17.json")
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null);
    renderDashboard(await response.json(), score);
  } catch (error) {
    console.error("MT·AI public dashboard failed:", error);
    renderDataError();
  }
}

loadDashboard();
