import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const latestPath = path.join(root, 'data', 'daily-intelligence-latest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function dateFromSignalId(id) {
  const match = String(id || '').match(/^S-(\d{4}-\d{2}-\d{2})-/);
  return match?.[1] || null;
}

const latest = readJson(latestPath);
const signals = Array.isArray(latest.acceptedSignals) ? latest.acceptedSignals : [];
let changed = 0;

latest.acceptedSignals = signals.map((signal) => {
  if (signal?.date) return signal;
  const inferredDate = dateFromSignalId(signal?.id);
  if (!inferredDate) return signal;
  changed += 1;
  return { ...signal, date: inferredDate };
});

const runDate = String(latest.dailyStatus?.date || latest.updatedAt || new Date().toISOString()).slice(0, 10);
const datedPath = path.join(root, 'data', `daily-intelligence-${runDate}.json`);
const serialized = JSON.stringify(latest, null, 2) + '\n';

fs.writeFileSync(latestPath, serialized);
if (fs.existsSync(datedPath)) fs.writeFileSync(datedPath, serialized);

console.log(`Normalized accepted-signal dates: ${changed} missing date field(s) restored from stable signal IDs.`);
