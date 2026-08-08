import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dailyPath = path.join(root, 'data', 'daily-intelligence-latest.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeDate(value) {
  const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function humanizeKey(key) {
  const known = {
    Hormuz: 'Hormuz: Deal und physische Normalisierung prüfen',
    Astra: 'Astra: Safety-, Release- und Deployment-Review',
    TexasBatchZero: 'Texas/ERCOT: Batch Zero und Deposit-Risiko prüfen',
    NvidiaLancium: 'Nvidia/Lancium: Transaktion und Grid-Strategie prüfen',
    SwitchIPO: 'Switch IPO: Filing, Bewertung und Kapitalzugang prüfen',
    MemoryCapacity: 'Memory Capacity: Kapazitäts- und Supply-Review'
  };
  if (known[key]) return known[key];
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addCandidate(target, date, event, source) {
  const normalizedDate = normalizeDate(date);
  const normalizedEvent = String(event || '').replace(/\s+/g, ' ').trim();
  if (!normalizedDate || !normalizedEvent) return;
  target.push({ date: normalizedDate, event: normalizedEvent, source });
}

const daily = readJson(dailyPath, {});
const snapshot = readJson(publicPath, null);
if (!snapshot || typeof snapshot !== 'object') {
  throw new Error('public-tail/data.json is missing or invalid');
}

const candidates = [];
for (const catalyst of Array.isArray(daily.nextCatalysts) ? daily.nextCatalysts : []) {
  addCandidate(candidates, catalyst.date, catalyst.event || catalyst.title, 'nextCatalysts');
}

for (const [key, date] of Object.entries(daily.nextReviewDates || {})) {
  addCandidate(candidates, date, humanizeKey(key), 'nextReviewDates');
}

for (const item of Array.isArray(daily.predictionLogUpdates) ? daily.predictionLogUpdates : []) {
  addCandidate(candidates, item.nextReview, `Forecast-Review: ${item.forecast || item.id}`, 'predictionLogUpdates');
}

for (const item of Array.isArray(daily.falsifiers) ? daily.falsifiers : []) {
  addCandidate(candidates, item.nextReview, `Falsifier-Review: ${item.title || item.id}`, 'falsifiers');
}

for (const signal of Array.isArray(daily.acceptedSignals) ? daily.acceptedSignals : []) {
  const forecastChange = signal.redPencil?.forecastChange || '';
  const reviewDate = forecastChange.match(/nächster\s+review\s+(\d{4}-\d{2}-\d{2})/i)?.[1];
  addCandidate(candidates, reviewDate, `Signal-Review: ${signal.title}`, 'acceptedSignals');
}

for (const catalyst of Array.isArray(snapshot.catalysts) ? snapshot.catalysts : []) {
  addCandidate(candidates, catalyst.date, catalyst.event || catalyst.title, 'existingPublic');
}

const today = new Date().toISOString().slice(0, 10);
const seenDates = new Set();
const catalysts = candidates
  .filter((item) => item.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date) || a.event.localeCompare(b.event))
  .filter((item) => {
    if (seenDates.has(item.date)) return false;
    seenDates.add(item.date);
    return true;
  })
  .slice(0, 8)
  .map(({ date, event }) => ({ date, event }));

if (catalysts.length === 0) {
  throw new Error('No future public catalysts could be derived from Daily Intelligence');
}

snapshot.catalysts = catalysts;
fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public catalysts ensured: ${catalysts.length} future review points (${catalysts.map((item) => item.date).join(', ')})`);
