import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const configPath = path.join(root, 'config', 'manual-signals.json');
const latestPath = path.join(root, 'data', 'daily-intelligence-latest.json');

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function mergeById(existing = [], incoming = []) {
  const map = new Map();
  for (const item of existing) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of incoming) {
    if (item?.id) map.set(item.id, item);
  }
  return [...map.values()];
}

const config = readJson(configPath, null);
if (!config) {
  console.log('No manual-signals.json found; skipping manual overlay.');
  process.exit(0);
}

const latest = readJson(latestPath, null);
if (!latest) throw new Error('daily-intelligence-latest.json missing or invalid');

const publicSignals = Array.isArray(config.publicSignals) ? config.publicSignals : [];
const privateIntelligence = Array.isArray(config.privateIntelligence) ? config.privateIntelligence : [];
const nextCatalysts = Array.isArray(config.nextCatalysts) ? config.nextCatalysts : [];

latest.acceptedSignals = mergeById(latest.acceptedSignals, publicSignals)
  .sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99) || Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0));
latest.privateIntelligence = mergeById(latest.privateIntelligence, privateIntelligence);
latest.strategicSynthesis = config.strategicSynthesis ?? latest.strategicSynthesis ?? null;
latest.nextCatalysts = mergeById(
  (latest.nextCatalysts || []).map((item, index) => ({ id: item.id || `${item.date || 'date'}-${item.title || index}`, ...item })),
  nextCatalysts.map((item, index) => ({ id: item.id || `${item.date || 'date'}-${item.title || index}`, ...item }))
).map(({ id, ...item }) => item);
latest.dataHygiene = {
  ...(latest.dataHygiene || {}),
  manualOverlayAppliedAt: config.updatedAt || new Date().toISOString(),
  manualOverlayPolicy: 'Public signals require evidence and admission-gate review. Private channel intelligence remains excluded from public Lighthouse output and from mechanical index changes until quantified.'
};
latest.dailyStatus = {
  ...(latest.dailyStatus || {}),
  type: publicSignals.length ? 'material-capability-update' : latest.dailyStatus?.type,
  title: publicSignals.length ? 'Neue bestätigte AI-Agenten- und Effizienzsignale' : latest.dailyStatus?.title,
  impactScore: publicSignals.length ? Math.max(Number(latest.dailyStatus?.impactScore || 0), 8) : latest.dailyStatus?.impactScore,
  note: publicSignals.length
    ? 'Astra sowie GLM-5.3-Flash/Qwen3.8-Flash-Next stärken die These skalierbarer digitaler Arbeit. Die Capability-Signale werden beobachtet, verändern den Stressindex aber nicht ohne separate Markt- und Preissignale.'
    : latest.dailyStatus?.note
};

const date = String(latest.dailyStatus?.date || latest.updatedAt || new Date().toISOString()).slice(0, 10);
const datedPath = path.join(root, 'data', `daily-intelligence-${date}.json`);
const serialized = JSON.stringify(latest, null, 2) + '\n';
fs.writeFileSync(latestPath, serialized);
if (fs.existsSync(datedPath)) fs.writeFileSync(datedPath, serialized);

console.log(`Applied manual intelligence overlay: ${publicSignals.length} public signals, ${privateIntelligence.length} private signals, ${nextCatalysts.length} catalysts.`);
