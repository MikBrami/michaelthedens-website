import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const latestDailyPath = path.join(dataDir, 'daily-intelligence-latest.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const daily = readJson(latestDailyPath, {});
const snapshot = readJson(publicPath);
if (!snapshot?.platform) throw new Error('public-tail/data.json missing or invalid');

const analysisDate = String(snapshot.platform.analysisAsOf || daily.updatedAt || new Date().toISOString()).slice(0, 10);
const currentAccepted = (daily.acceptedSignals || [])
  .filter((signal) => signal.public !== false)
  .filter((signal) => Number(signal.priorityScore || 0) > 0)
  .filter((signal) => String(signal.date || '').slice(0, 10) === analysisDate)
  .filter((signal) => signal.classification !== 'No Material Change');

const news = Array.isArray(snapshot.news) ? snapshot.news : [];
snapshot.signals = news;

if (currentAccepted.length) {
  snapshot.dailyStatus = {
    date: analysisDate,
    type: 'material-market-update',
    title: 'Neue bestätigte MT·AI-Signale',
    impactScore: Math.max(...currentAccepted.map((signal) => Number(signal.priorityScore || 0))),
    note: 'Heute neu bestätigte Signale sind in das aktuelle Lagebild eingeflossen.'
  };
} else {
  snapshot.dailyStatus = {
    date: analysisDate,
    type: 'no-material-change',
    title: 'Keine bestätigte materielle Richtungsänderung',
    impactScore: 0,
    note: 'Der aktuelle News-Layer wurde geprüft; ältere Accepted Signals bleiben im Modell erhalten, werden aber nicht als heutige Meldungen erneut ausgegeben.'
  };
}

const index = Number(snapshot.executivePulse?.current || 0);
const markets = Array.isArray(snapshot.platform.markets) ? snapshot.platform.markets.slice(0, 3).map((market) => market.label).filter(Boolean) : [];
const lead = index >= 85
  ? 'Memory und AI-Infrastruktur bleiben unter hohem Druck.'
  : index >= 70
    ? 'Die Lage bei Memory und AI-Infrastruktur bleibt angespannt.'
    : index >= 55
      ? 'Die Lage bleibt gemischt und erfordert selektive Beobachtung.'
      : 'Der Markt zeigt derzeit vergleichsweise moderate Spannungen.';
const marketText = markets.length ? `${markets.join(', ')} zählen aktuell zu den angespanntesten Bereichen.` : '';
const reviewText = currentAccepted.length
  ? `Der Daily Check vom ${analysisDate} hat eine materielle Veränderung der Lage bestätigt.`
  : `Der Daily Check vom ${analysisDate} hat die aktuelle Nachrichtenlage geprüft; daraus ergibt sich derzeit keine neu bestätigte materielle Richtungsänderung.`;

snapshot.executivePulse = {
  ...(snapshot.executivePulse || {}),
  interpretation: `${lead} ${marketText} ${reviewText} Neue Kapazitäten und bessere Yields können entlasten, erreichen den Markt aber erst mit Zeitverzug. Für Käufer bleiben Lieferabsicherung, Alternativ-BOMs und frühzeitige Beschaffung entscheidend.`.replace(/\s+/g, ' ').trim()
};

fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public current-state finalized: ${news.length} current news cards, ${currentAccepted.length} newly accepted signal(s) for ${analysisDate}.`);
