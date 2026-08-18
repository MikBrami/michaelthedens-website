import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const inboxPath = path.join(dataDir, 'inbox.json');
const latestDailyPath = path.join(dataDir, 'daily-intelligence-latest.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const berlinDate = (value) => {
  const parsed = Date.parse(value || '');
  if (!Number.isFinite(parsed)) return String(value || '').slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(parsed));
};

const inbox = readJson(inboxPath, { items: [] });
const daily = readJson(latestDailyPath, {});
const snapshot = readJson(publicPath, null);
if (!snapshot) throw new Error('public-tail/data.json missing; run build-data first.');

const accepted = (daily.acceptedSignals || [])
  .filter((signal) => Number(signal.priorityScore || 0) > 0)
  .filter((signal) => signal.classification !== 'No Material Change');

function publisherQuality(name = '') {
  const source = String(name).toLowerCase();
  if (/reuters|associated press|ap news/.test(source)) return 20;
  if (/bloomberg|financial times|wall street journal|wsj|nikkei|cnbc/.test(source)) return 17;
  if (/micron|nvidia|samsung|sk hynix|tsmc|asml|amd|intel|microsoft|amazon|google|meta|openai|anthropic|trendforce/.test(source)) return 15;
  if (/digitimes|tom's hardware|blocks & files|the register|semianalysis/.test(source)) return 10;
  if (/ad hoc|kaohoon|chosun|market screener|seeking alpha/.test(source)) return 2;
  return 6;
}

function freshnessScore(item) {
  const time = Date.parse(item.published_at || item.ingested_at || '');
  if (!Number.isFinite(time)) return 0;
  const hours = Math.max(0, (Date.now() - time) / 3_600_000);
  if (hours <= 6) return 15;
  if (hours <= 12) return 12;
  if (hours <= 24) return 8;
  if (hours <= 36) return 4;
  return 0;
}

function publicScore(item) {
  const relevance = Number(item.relevance_score || 0);
  return Math.max(0, Math.min(100, Math.round(relevance * 0.72 + publisherQuality(item.source_name) + freshnessScore(item))));
}

function cleanSummary(item) {
  const summary = String(item.summary || '').replace(/\s+/g, ' ').trim();
  if (!summary || /&lt;|&gt;|href=|<a\b|<font\b/i.test(summary)) {
    return `Aktuelle Meldung von ${item.source_name || 'einer TAIL-Quelle'}: ${item.title}`;
  }
  return summary;
}

function textFor(item) {
  return `${item.title || ''} ${item.summary || ''} ${(item.categories || []).join(' ')}`.toLowerCase();
}

const storyStopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'as', 'in', 'on', 'of', 'for', 'to', 'from', 'with', 'by',
  'its', 'is', 'are', 'be', 'become', 'becomes', 'new', 'news', 'reportedly', 'dramatically',
  'structure', 'shifts'
]);

function storyTokens(item) {
  return new Set(String(item.title || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !storyStopWords.has(token)));
}

function isSameStory(left, right) {
  const leftTokens = storyTokens(left);
  const rightTokens = storyTokens(right);
  if (!leftTokens.size || !rightTokens.size) return false;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const containment = overlap / Math.min(leftTokens.size, rightTokens.size);
  return overlap >= 5 && containment >= 0.6;
}

function isPublicScope(item) {
  const text = textFor(item);
  const positive = /\bhbm\d*\b|dram|nand|enterprise[- ]?ssd|\bessd\b|rdimm|mrdimm|socamm|cxl|memory|storage|semiconductor|wafer|foundry|\bfab\b|cowos|advanced packaging|lithograph|asml|applied materials|lam research|kla|tokyo electron|tsmc|micron|sk hynix|samsung|kioxia|sandisk|cxmt|ymtc|gpu|accelerator|ai infrastructure|data ?cent(er|re)|hyperscaler|server|capex|gigawatt|power|cooling|grid|export control|supply chain|hormuz|shipping/.test(text);
  const genericConsumerAi = /your chats|chat history|privacy settings|how to stop|prompt privacy|consumer chatbot|learn(?:ing)? from your chats/.test(text);
  return positive && !genericConsumerAi;
}

function readerImpact(item) {
  const text = textFor(item);
  if (/hbm4|\bhbm\b/.test(text) && /yield|ausbeute/.test(text)) {
    return 'Höhere HBM-Ausbeuten können den Ramp neuer AI-Beschleuniger beschleunigen und mittelfristig mehr HBM-Kapazität freisetzen. Entscheidend ist, ob der Yield auch in Serienvolumen und ausgelieferten Modulen sichtbar wird.';
  }
  if (/hbm4|\bhbm\b/.test(text)) {
    return 'HBM bleibt ein zentraler Engpass für AI-Beschleuniger. Änderungen bei Produktion, Qualifikation oder Nachfrage wirken direkt auf verfügbare GPU-Systeme und die Preisgestaltung im AI-Infrastrukturmarkt.';
  }
  if (/enterprise[- ]?ssd|\bessd\b|nand|storage|qlc|nvme/.test(text)) {
    return 'Die Meldung ist für Datacenter-Storage relevant: Sie kann Preise, verfügbare Kapazitäten oder die Beschaffungsstrategie für Enterprise-SSDs verändern.';
  }
  if (/server[- ]?dram|rdimm|mrdimm|socamm|ddr5|dram|memory/.test(text)) {
    return 'Die Entwicklung betrifft die Versorgung und Kosten von Server-Memory. Für Betreiber und Systemintegratoren ist relevant, ob daraus höhere Preise, längere Lieferzeiten oder frühere Allokationsentscheidungen entstehen.';
  }
  if (/asml|applied materials|lam research|kla|tokyo electron|equipment|lithograph|wafer|foundry|\bfab\b|yield/.test(text)) {
    return 'Das Signal liegt upstream in der Halbleiter-Lieferkette. Erst wenn Investitionen in installierte und qualifizierte Tools, stabile Yields und zusätzliche Wafer übergehen, entsteht echte Angebotsentlastung.';
  }
  if (/cowos|advanced packaging|packaging/.test(text)) {
    return 'Advanced Packaging bestimmt zunehmend, wie schnell AI-Chips und HBM als vollständige Module in den Markt kommen. Zusätzliche Packaging-Kapazität kann deshalb wichtiger sein als reine Wafer-Kapazität.';
  }
  if (/data ?cent(er|re)|hyperscaler|capex|gigawatt|power|cooling|grid|gpu|accelerator|server/.test(text)) {
    return 'Die Meldung verändert den Ausbaupfad von AI- und Datacenter-Infrastruktur. Mehr produktive Compute-Kapazität zieht Server-Memory, Enterprise-Storage, Netzwerk und Stromversorgung mit.';
  }
  if (/export control|sanction|china|taiwan|hormuz|shipping|supply chain/.test(text)) {
    return 'Das ist ein Lieferketten- und Geopolitiksignal. Es kann Verfügbarkeit, Transportkosten, Beschaffungswege oder die regionale Allokation von Halbleiter- und Memory-Produkten verändern.';
  }
  return 'Die Meldung ist relevant, weil sie einen messbaren Einfluss auf Halbleiterangebot, Datacenter-Nachfrage oder die Kosten und Verfügbarkeit von Memory- und Storage-Komponenten haben kann.';
}

function publicExecutiveInterpretation() {
  const index = Number(snapshot.executivePulse?.current ?? snapshot.platform?.tailIndex ?? 0);
  const markets = Array.isArray(snapshot.platform?.markets) ? snapshot.platform.markets : [];
  const topMarkets = markets.slice(0, 3).map((market) => market.label).filter(Boolean);
  const marketText = topMarkets.length ? `${topMarkets.join(', ')} zählen aktuell zu den angespanntesten Bereichen.` : 'Memory und AI-Infrastruktur bleiben die zentralen Beobachtungsfelder.';
  const checkDate = String(daily.dailyStatus?.date || daily.updatedAt || '').slice(0, 10);
  const reviewed = Number(daily.automatedDaily?.highRelevanceCandidates?.length || 0);
  const reviewText = daily.dailyStatus?.type === 'no-material-change'
    ? `Der Daily Check vom ${checkDate || 'heutigen Lauf'} hat ${reviewed ? `${reviewed} aktuelle relevante Meldungen` : 'die aktuelle Nachrichtenlage'} geprüft; daraus ergibt sich derzeit keine bestätigte materielle Richtungsänderung.`
    : `Der Daily Check vom ${checkDate || 'heutigen Lauf'} hat eine materielle Veränderung der Lage bestätigt.`;

  let lead;
  if (index >= 85) lead = 'Memory und AI-Infrastruktur bleiben unter hohem Druck.';
  else if (index >= 70) lead = 'Die Lage bei Memory und AI-Infrastruktur bleibt angespannt.';
  else if (index >= 55) lead = 'Die Lage bleibt gemischt und erfordert selektive Beobachtung.';
  else lead = 'Der Markt zeigt derzeit vergleichsweise moderate Spannungen.';

  return `${lead} ${marketText} ${reviewText} Neue Kapazitäten und bessere Yields können entlasten, erreichen den Markt aber erst mit Zeitverzug. Für Käufer bleiben Lieferabsicherung, Alternativ-BOMs und frühzeitige Beschaffung entscheidend.`;
}

// Public homepage news must be genuinely current and inside the TAIL infrastructure scope.
const cutoff = Date.now() - 36 * 60 * 60 * 1000;
const candidates = (inbox.items || [])
  .filter((item) => Number(item.relevance_score || 0) >= 45)
  .filter(isPublicScope)
  .filter((item) => {
    const time = Date.parse(item.published_at || item.ingested_at || '');
    return Number.isFinite(time) && time >= cutoff;
  })
  .map((item) => ({ ...item, public_score: publicScore(item) }))
  .sort((a, b) => {
    const scoreDelta = Number(b.public_score || 0) - Number(a.public_score || 0);
    if (scoreDelta) return scoreDelta;
    return Date.parse(b.published_at || b.ingested_at || 0) - Date.parse(a.published_at || a.ingested_at || 0);
  });

// Keep publisher/topic diversity: one weak duplicate storyline should not occupy all cards.
const selected = [];
const seenPublishers = new Set();
for (const item of candidates) {
  const publisher = String(item.source_name || '').toLowerCase();
  if (selected.some((selectedItem) => isSameStory(selectedItem, item))) continue;
  if (seenPublishers.has(publisher) && selected.length < 2) continue;
  selected.push(item);
  seenPublishers.add(publisher);
  if (selected.length === 3) break;
}

const news = selected.map((item) => ({
  date: berlinDate(item.published_at || item.ingested_at || daily.updatedAt),
  title: item.title,
  summary: cleanSummary(item),
  analysis: readerImpact(item),
  score: Number(item.public_score || 0),
  relevanceScore: Number(item.relevance_score || 0),
  sourceQuality: publisherQuality(item.source_name),
  source: item.source_name || item.source_id || 'TAIL News Layer',
  url: item.url || null,
  layer: 'news'
}));

if (accepted.length) {
  snapshot.signals = accepted.slice(0, 3).map((signal) => ({
    date: berlinDate(daily.updatedAt),
    title: signal.title,
    summary: signal.fact || signal.estimate || signal.title,
    analysis: signal.tailInference || signal.redPencil?.forecastChange || 'TAIL Daily Intelligence signal.',
    score: Number(signal.priorityScore || 0),
    source: (signal.sources || [])[0]?.label || 'TAIL Daily Intelligence',
    url: (signal.sources || [])[0]?.url || null,
    layer: 'accepted-signal'
  }));
} else {
  snapshot.signals = news;
}

snapshot.dailyStatus = daily.dailyStatus || {
  date: String(daily.updatedAt || '').slice(0, 10),
  type: accepted.length ? 'material-change' : 'no-material-change',
  title: accepted.length ? 'Neue bestätigte TAIL-Signale' : 'Keine bestätigte materielle Richtungsänderung',
  impactScore: accepted.length ? Math.max(...accepted.map((signal) => Number(signal.priorityScore || 0))) : 0
};

const analysisDate = String(snapshot.dailyStatus?.date || daily.updatedAt || '').slice(0, 10);
if (analysisDate) {
  snapshot.platform = {
    ...(snapshot.platform || {}),
    sourceDataAsOf: snapshot.platform?.sourceDataAsOf || snapshot.platform?.dataAsOf || null,
    dataAsOf: analysisDate,
    analysisAsOf: analysisDate,
    dataFreshness: analysisDate === berlinDate(new Date().toISOString()) ? 'current' : snapshot.platform?.dataFreshness,
    processStatus: analysisDate === berlinDate(new Date().toISOString()) ? 'ok' : snapshot.platform?.processStatus
  };
}

snapshot.executivePulse = {
  ...(snapshot.executivePulse || {}),
  interpretation: publicExecutiveInterpretation()
};

snapshot.news = news;
snapshot.newsLayer = {
  generatedAt: new Date().toISOString(),
  count: news.length,
  candidateCount: candidates.length,
  freshnessWindowHours: 36,
  ranking: 'TAIL scope + freshness + relevance + source quality',
  source: 'TAIL Inbox',
  admissionPolicy: 'Current public news is separated from internal TAIL admission and forecast logic.'
};

fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public News Layer: ${news.length} current in-scope news cards from ${candidates.length} candidates; ${accepted.length} accepted material signals.`);
