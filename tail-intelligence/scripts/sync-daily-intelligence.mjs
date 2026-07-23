import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const DATA = new URL('data/', ROOT);
const DAILY = new URL('data/daily-intelligence-latest.json', ROOT);
const DAILY_INDEX = new URL('data/daily-intelligence-index.json', ROOT);
const ARTICLES = new URL('data/articles.json', ROOT);
const STATUS = new URL('data/update-status.json', ROOT);
const DAILY_FILE_PATTERN = /^daily-intelligence-(\d{4}-\d{2}-\d{2})\.json$/;

const now = new Date().toISOString();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim();
const unique = (values) => [...new Set(values.filter(Boolean))];

async function readJson(url, fallback) {
  try {
    return JSON.parse(await fs.readFile(url, 'utf8'));
  } catch {
    return fallback;
  }
}

async function discoverDailyIntelligence() {
  const names = await fs.readdir(DATA);
  const datedNames = names
    .filter((name) => DAILY_FILE_PATTERN.test(name))
    .sort();
  const records = [];

  for (const name of datedNames) {
    const daily = await readJson(new URL(name, DATA), null);
    if (!daily || !Array.isArray(daily.acceptedSignals)) {
      throw new Error(`${name} has no acceptedSignals array`);
    }
    records.push({ name, daily });
  }

  const legacyLatest = await readJson(DAILY, null);
  if (legacyLatest?.acceptedSignals && !records.some(({ daily }) => daily.updatedAt === legacyLatest.updatedAt)) {
    records.push({ name: 'daily-intelligence-latest.json', daily: legacyLatest });
  }

  return records.sort((a, b) =>
    String(a.daily.updatedAt || a.name).localeCompare(String(b.daily.updatedAt || b.name))
  );
}

function textFor(signal) {
  return normalize([
    signal.title,
    signal.fact,
    signal.estimate,
    signal.tailInference,
    signal.classification,
    ...(signal.sources || []).map((source) => source.label)
  ].filter(Boolean).join(' ')).toLowerCase();
}

function inferMarkets(signal) {
  const text = textFor(signal);
  const markets = [];
  const rules = [
    ['hbm', /\bhbm\d*\b|high bandwidth memory/],
    ['server_dram', /server[- ]?dram|rdimm|socamm|ddr5|server memory/],
    ['dram', /\bdram\b|\bmemory\b|lpdram|ddr[45]|cxmt/],
    ['nand', /\bnand\b|flash memory/],
    ['enterprise_ssd', /enterprise[- ]?ssd|\bessd\b|nvme|high-capacity storage|qlc/],
    ['ai_infrastructure', /ai infrastructure|data ?cent(er|re)|hyperscaler|ai factory|gpu|compute|vera|rubin|blackwell|capex|power|optical|megawatt|gigawatt|\bmw\b|\bgw\b/],
    ['semiconductors', /semiconductor|\bchip\b|wafer|fab|packaging|cxmt|tsmc|foundry/],
    ['supply_chain', /supply chain|logistics|shipping|hormuz|export control|sanction|capacity|procurement|insurance/]
  ];
  for (const [market, pattern] of rules) {
    if (pattern.test(text)) markets.push(market);
  }
  return unique(markets.length ? markets : ['ai_infrastructure']);
}

function inferCompanies(signal) {
  const text = textFor(signal);
  const companies = [
    'Nvidia', 'Micron', 'Samsung', 'SK hynix', 'TSMC', 'CXMT', 'YMTC', 'Huawei',
    'Microsoft', 'Meta', 'Anthropic', 'Google', 'Amazon', 'AWS', 'Oracle', 'AMD',
    'Intel', 'Kioxia', 'Sandisk', 'ZTE', '3M', 'Noetra'
  ];
  return companies.filter((company) => text.includes(company.toLowerCase()));
}

function inferSignal(signal) {
  const text = textFor(signal);
  if (/export control|sanction|geopolit|china parallel|technology split|hormuz|war|conflict|attack/.test(text)) return 'geopolitical_split';
  if (/long[- ]term agreement|strategic agreement|\blta\b|supply agreement|capacity lock|allocation/.test(text)) return 'capacity_lock';
  if (/shortage|constraint|bottleneck|limited|protest|permitting|moratorium|power shortage|water risk|cost inflation|supply risk/.test(text)) return 'negative_supply';
  if (/price increase|pricing pressure|inflation|higher cost|cost increase/.test(text)) return 'price_up';
  if (/capacity expansion|new fab|investment|production ramp|scale production|capacity build/.test(text)) return 'capacity_relief';
  return 'demand_up';
}

function confidenceFor(signal) {
  const evidence = signal.admissionGate?.Evidence;
  let confidence = evidence === true ? 88 : typeof evidence === 'string' ? 74 : 80;
  confidence += Math.min(4, Math.max(0, (signal.sources || []).length - 1) * 2);
  return Math.min(95, confidence);
}

function categoryFor(markets, signal) {
  const text = textFor(signal);
  if (/geopolit|hormuz|war|conflict|sanction|export control/.test(text)) return 'geopolitics';
  if (markets.includes('hbm') || markets.includes('dram') || markets.includes('server_dram')) return 'memory';
  if (markets.includes('nand') || markets.includes('enterprise_ssd')) return 'storage';
  if (markets.includes('ai_infrastructure')) return 'ai_datacenter';
  return 'semiconductors';
}

function toArticle(signal, dailyDate) {
  const markets = inferMarkets(signal);
  const primarySource = (signal.sources || [])[0];
  return {
    id: signal.id,
    date: dailyDate,
    title: normalize(signal.title),
    category: categoryFor(markets, signal),
    markets,
    companies: inferCompanies(signal),
    severity: Math.max(0, Math.min(100, Number(signal.priorityScore ?? 70))),
    confidence: confidenceFor(signal),
    signal: inferSignal(signal),
    summary: normalize(signal.fact || signal.estimate || signal.title),
    tail_analysis: normalize(signal.tailInference || signal.redPencil?.forecastChange || 'TAIL Daily Intelligence signal.'),
    source: primarySource?.label || 'TAIL Daily Intelligence',
    url: primarySource?.url || `tail://daily-intelligence/${signal.id}`,
    content_hash: hash(`${signal.id}|${signal.title}|${signal.fact}|${signal.tailInference}`),
    origin: 'daily-intelligence',
    classification: signal.classification || null,
    rank: signal.rank ?? null,
    estimate: signal.estimate || null,
    red_pencil: signal.redPencil || null,
    sources: signal.sources || []
  };
}

async function main() {
  const dailyRecords = await discoverDailyIntelligence();
  const articles = await readJson(ARTICLES, []);
  const updateStatus = await readJson(STATUS, {});

  if (!dailyRecords.length) {
    console.log('No daily intelligence signals found; Knowledge Base unchanged.');
    return;
  }
  if (!Array.isArray(articles)) throw new Error('articles.json must contain an array');

  const byId = new Map(articles.map((article) => [article.id, article]));
  let promoted = 0;

  for (const { daily } of dailyRecords) {
    const dailyDate = new Date(daily.updatedAt || now).toISOString().slice(0, 10);
    for (const signal of daily.acceptedSignals) {
      if (!signal?.id || !signal?.title) continue;
      const article = toArticle(signal, dailyDate);
      const previous = byId.get(article.id);
      if (JSON.stringify(previous) !== JSON.stringify(article)) promoted += 1;
      byId.set(article.id, article);
    }
  }

  const latestRecord = dailyRecords.at(-1);
  const datedFiles = dailyRecords
    .map(({ name }) => name)
    .filter((name) => DAILY_FILE_PATTERN.test(name));
  const merged = [...byId.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  await fs.writeFile(ARTICLES, JSON.stringify(merged, null, 2) + '\n');
  await fs.writeFile(DAILY, JSON.stringify(latestRecord.daily, null, 2) + '\n');
  await fs.writeFile(DAILY_INDEX, JSON.stringify({
    schemaVersion: 1,
    generatedAt: now,
    latest: latestRecord.name,
    files: datedFiles
  }, null, 2) + '\n');
  await fs.writeFile(STATUS, JSON.stringify({
    ...updateStatus,
    knowledge_base_sync_at: now,
    knowledge_base_signals_promoted: promoted,
    knowledge_base_total_articles: merged.length,
    knowledge_base_latest_daily_file: latestRecord.name,
    knowledge_base_latest_daily_at: latestRecord.daily.updatedAt,
    knowledge_base_daily_files_processed: dailyRecords.length
  }, null, 2) + '\n');

  console.log(`Knowledge Base sync: ${promoted} accepted signals added or updated from ${dailyRecords.length} daily files; ${merged.length} articles total; latest ${latestRecord.name}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
