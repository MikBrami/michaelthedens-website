const PUBLIC_DATA_URL = "/public-tail/data-en.json";

const EDITORIAL_SIGNALS = [
  {
    "date": "2026-11-17",
    "title": "SK hynix generated 62.5% of its revenue in the US",
    "summary": "DIGITIMES reports that the US accounted for 62.5% of first-nine-month revenue. Nvidia's separately reported share is an industry estimate.",
    "analysis": "The figures show geographic concentration. They do not establish Nvidia's revenue share or available HBM or RDIMM volumes.",
    "url": "https://www.digitimes.com/news/a20261117VL211/sk-hynix-memory-nvidia-revenue-sales-2026.html"
  },
  {
    "date": "2026-11-10",
    "title": "Some server buyers source memory separately",
    "summary": "Component distributor Smith says some buyers request conventional servers without memory and source DRAM separately.",
    "analysis": "Complete-server orders capture only part of server memory demand.",
    "url": "https://www.digitimes.com/news/a20261110VL216/barebones-component-production-chairman-32gb.html"
  },
  {
    "date": "2026-11-09",
    "title": "Phison reports early NAND procurement for 2027",
    "summary": "Phison says it has already secured more than 70% of its own NAND procurement target for 2027.",
    "analysis": "Early volume commitments are a procurement signal, specific to Phison.",
    "url": "https://www.digitimes.com/news/a20261109PD258/phison-demand-nand-2027-ceo.html"
  }
];
const WATCHPOINTS = [
  [
    "Server DRAM",
    "Track lead times and firm RDIMM allocations for comparable configurations."
  ],
  [
    "Enterprise SSDs",
    "Track committed TLC and QLC volumes for 2027 and changes to delivery windows."
  ],
  [
    "HBM and AI infrastructure",
    "Track confirmed call-offs, volume shipments and data center commissioning."
  ]
];
const MARKET_NOTES = [
  "Separate memory sourcing can shift demand across sales channels.",
  "US revenue share at SK hynix signals concentration. It provides no measure of available HBM volumes.",
  "Phison’s early NAND commitments make firm TLC and QLC allocations a point to watch."
];

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "unknown";
  const normalized = String(value).includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
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
              <span>Research as of ${escapeHtml(formatDate(researchAsOf))}</span>
              ${outlook.indexAsOf ? `<span>Index as of ${escapeHtml(formatDate(outlook.indexAsOf))}</span>` : ""}
              <span>Confidence ${Number.isFinite(Number(outlook.confidence)) ? Number(outlook.confidence) : "–"}/100</span>
              <span>Coverage ${Number.isFinite(Number(outlook.coverage)) ? Number(outlook.coverage) : "–"}%</span>
            </div>
          </div>
        </div>

        <div class="scenario-grid" aria-label="Scenario weights">
          ${scenarios.map((scenario) => `
            <div class="scenario-card ${escapeHtml(scenario.id || "")}">
              <div class="scenario-prob">${Number(scenario.probability) || 0}%</div>
              <strong>${escapeHtml(scenario.label)}</strong>
              <p>${escapeHtml(scenario.regime)}</p>
            </div>`).join("")}
        </div>

        <div class="outlook-subgrid">
          <div class="outlook-panel">
            <h4>Expected path</h4>
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
            <h4>What would change our view</h4>
            <div class="change-rules">
              ${changeRules.map((rule) => `
                <div class="change-rule ${escapeHtml(rule.direction || "")}">
                  <strong>${escapeHtml(rule.label)}</strong>
                  <span>${escapeHtml(rule.condition)}</span>
                </div>`).join("")}
            </div>
          </div>
        </div>

        ${watchSignals.length ? `<div class="watch-row" aria-label="Early-warning signals">${watchSignals.map((signal) => `<span class="watch-chip">${escapeHtml(signal)}</span>`).join("")}</div>` : ""}
        <p class="outlook-note">${escapeHtml(outlook.methodologyNote || "")}</p>
      </article>`;
  }).join("") || '<article class="loading-card outlook-empty">No public deep-research outlook has been released yet.</article>';
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
  label.textContent = useDatedScore ? "DATED CALCULATION" : isCurrent ? "MT·AI" : "INDEX UNDER REVIEW";
  label.className = "state-chip";
  document.getElementById("index-summary").textContent = useDatedScore ? "Established model, updated with six selected market observations. The full review is still open." : isCurrent && pulse.interpretation
    ? pulse.interpretation : "Some server buyers source memory separately. Phison reports early NAND procurement for 2027. SK hynix reports a high concentration of US sales. These are procurement signals whose effect on the index is still under review.";
  document.querySelector(".status-dot").classList.toggle("stale", !isCurrent);
  document.getElementById("freshness-text").textContent = useDatedScore ? `Score evidence through ${formatDate(datedScore.asOf)}` : `Calculation run ${formatDate(platform.analysisAsOf || platform.dataAsOf)} · Index evidence through ${formatDate(evidence)}`;
  document.getElementById("signal-freshness").textContent = `Latest selected source ${formatDate(latest)}`;
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
    risk.innerHTML = `<div class="market-head"><h3>Risk Pressure</h3><span class="market-score">${riskPressure}</span></div><p>Combines peak pressure across critical markets with peak availability pressure.</p>`;
    document.getElementById("market-grid").append(risk);
  }

  renderMarketOutlook(snapshot.marketOutlook);

  document.getElementById("signal-grid").innerHTML = EDITORIAL_SIGNALS.map((signal) => `
    <article class="signal-card">
      <div class="signal-meta"><span>${escapeHtml(formatDate(signal.date))}</span><span>Editorial selection</span></div>
      <h3>${escapeHtml(signal.title)}</h3>
      <p>${escapeHtml(signal.summary)}</p>
      <p class="signal-impact"><span>Why it matters</span>${escapeHtml(signal.analysis)}</p>
      <p><a href="${escapeHtml(signal.url)}" rel="noopener noreferrer" target="_blank">DIGITIMES source</a></p>
    </article>`).join("");

  document.getElementById("market-evidence")?.remove();
  if (useDatedScore) {
    const [title, intro, strength, confidence, source, additional] = ["Market evidence and scoring assumptions","Evidence summaries are in German. Strength and confidence are scored out of 100.","Strength","Confidence","Source","Additional observations"];
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
  document.getElementById("freshness-text").textContent = "Current MT·AI data cannot be loaded right now; the previous view is not presented as current.";
  document.querySelector(".status-dot").classList.add("stale");
  document.getElementById("market-grid").innerHTML = '<article class="loading-card">The current market view is temporarily unavailable.</article>';
  const outlookGrid = document.getElementById("outlook-grid");
  if (outlookGrid) outlookGrid.innerHTML = '<article class="loading-card">The Market Outlook is temporarily unavailable.</article>';
  document.getElementById("signal-grid").innerHTML = '<article class="loading-card">Current signals are temporarily unavailable.</article>';
  document.getElementById("catalyst-grid").innerHTML = '<article class="loading-card">Upcoming catalysts are temporarily unavailable.</article>';
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
    console.error("MT·AI English public dashboard failed:", error);
    renderDataError();
  }
}

loadDashboard();
