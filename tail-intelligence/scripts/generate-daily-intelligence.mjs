import fs from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DATA = new URL('data/', ROOT);
const INBOX = new URL('data/inbox.json', ROOT);
const STATUS = new URL('data/update-status.json', ROOT);
const DASHBOARD = new URL('data/dashboard.json', ROOT);
const DAILY_FILE_PATTERN = /^daily-intelligence-(\d{4}-\d{2}-\d{2})\.json$/;

const now = new Date();
const nowIso = now.toISOString();
const berlinDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(now);

async function readJson(url, fallback) {
  try { return JSON.parse(await fs.readFile(url, 'utf8')); } catch { return fallback; }
}

function dateFromName(name = '') {
  return name.match(DAILY_FILE_PATTERN)?.[1] ?? null;
}

async function main() {
  const targetName = `daily-intelligence-${berlinDate}.json`;
  const target = new URL(targetName, DATA);
  const existing = await readJson(target, null);

  // Human-curated snapshots always win. Auto-generated snapshots may be refreshed
  // during the same day so that a previously emitted heartbeat cannot mask news.
  if (existing && !existing.automatedDaily) {
    console.log(`Daily Analyst: ${targetName} is curated; keeping it unchanged.`);
    return;
  }

  const names = (await fs.readdir(DATA))
    .filter((name) => DAILY_FILE_PATTERN.test(name) && name !== targetName)
    .sort();
  const previousName = names.at(-1);
  if (!previousName) throw new Error('Daily Analyst cannot start without a previous daily-intelligence snapshot.');

  const previous = await readJson(new URL(previousName, DATA), null);
  if (!previous) throw new Error(`Unable to read ${previousName}`);

  const inbox = await readJson(INBOX, { updated_at: null, new_items: 0, items: [] });
  const dashboard = await readJson(DASHBOARD, {});
  const recentCutoff = Date.now() - 48 * 60 * 60 * 1000;
  const candidates = (inbox.items || [])
    .filter((item) => Number(item.relevance_score || 0) >= 65)
    .filter((item) => {
      const published = Date.parse(item.published_at || item.ingested_at || '');
      return Number.isFinite(published) && published >= recentCutoff;
    })
    .sort((a, b) => Number(b.relevance_score || 0) - Number(a.relevance_score || 0) || Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0))
    .slice(0, 8);

  // The automated generator is deliberately conservative. It creates a fresh daily
  // analytical state every day, but does not promote raw RSS items to accepted TAIL
  // signals without the full evidence/admission-gate review.
  // Executive Pulse, Confidence and Risk Pressure are canonical derived metrics from
  // the productive dashboard/index model. Never carry stale values forward from the
  // previous daily snapshot when the dashboard already has a newer calculation.
  const dashboardPulse = Number(dashboard.executivePulse?.current ?? dashboard.tailIndex);
  const dashboardConfidence = Number(dashboard.executivePulse?.confidence);
  const dashboardRisk = Number(dashboard.executivePulse?.riskPressure);
  const previousPulse = Number(previous.executivePulse?.current ?? 0);
  const previousConfidence = Number(previous.confidence?.current ?? 0);
  const previousRisk = Number(previous.riskPressure?.current ?? 0);
  const currentPulse = Number.isFinite(dashboardPulse) ? dashboardPulse : previousPulse;
  const currentConfidence = Number.isFinite(dashboardConfidence) ? dashboardConfidence : previousConfidence;
  const currentRisk = Number.isFinite(dashboardRisk) ? dashboardRisk : previousRisk;
  const candidateText = candidates.length
    ? `${candidates.length} aktuelle relevante Meldungen liegen im News-Layer; keine davon wird ohne vollständige Evidence-/Materiality-Prüfung automatisch als TAIL-Signal hochgestuft.`
    : 'Seit dem vorherigen Daily Snapshot wurde kein neues Signal gefunden, das die TAIL-Aufnahmeschwelle bereits belastbar überschreitet.';

  const daily = {
    ...previous,
    updatedAt: nowIso,
    previousRun: dateFromName(previousName) || String(previous.updatedAt || '').slice(0, 10),
    executivePulse: {
      ...(previous.executivePulse || {}),
      current: currentPulse,
      previous: currentPulse,
      interpretation: `Daily Check ${berlinDate}: Executive Pulse ${currentPulse}/100 aus dem produktiven MT·AI-Index. ${candidateText} Bestehende Thesen und Scores bleiben unverändert, bis neue Evidenz die Admission Gates erfüllt.`
    },
    confidence: {
      ...(previous.confidence || {}),
      current: currentConfidence,
      previous: currentConfidence,
      interpretation: `Datenvertrauen ${currentConfidence}/100 aus dem produktiven MT·AI-Index; Freshness ist bestätigt. ${candidateText}`
    },
    riskPressure: {
      ...(previous.riskPressure || {}),
      current: currentRisk,
      previous: currentRisk
    },
    momentum: candidates.length
      ? `Keine bestätigte Richtungsänderung · ${candidates.length} aktuelle Meldungen im News-Layer`
      : 'Keine bestätigte Richtungsänderung seit dem vorherigen Lauf',
    acceptedSignals: [],
    dailyStatus: {
      date: berlinDate,
      type: 'no-material-change',
      title: 'Keine bestätigte materielle Richtungsänderung',
      impactScore: 0,
      note: candidateText
    },
    automatedDaily: {
      generatedAt: nowIso,
      mode: 'freshness-safe-conservative',
      inboxUpdatedAt: inbox.updated_at || null,
      inboxNewItems: Number(inbox.new_items || 0),
      highRelevanceCandidates: candidates.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        source: item.source_name,
        summary: item.summary || '',
        relevanceScore: item.relevance_score,
        publishedAt: item.published_at
      })),
      canonicalMetricsSource: 'dashboard.json executivePulse',
      note: 'News candidates remain visible as news. They are not accepted as material TAIL signals without Evidence, Materiality, Causality and Falsifiability review.'
    }
  };

  await fs.writeFile(target, JSON.stringify(daily, null, 2) + '\n');

  const status = await readJson(STATUS, {});
  await fs.writeFile(STATUS, JSON.stringify({
    ...status,
    daily_analyst_generated_at: nowIso,
    daily_analyst_date: berlinDate,
    daily_analyst_file: targetName,
    daily_analyst_candidates: candidates.length
  }, null, 2) + '\n');

  console.log(`Daily Analyst: generated ${targetName}; Executive Pulse ${currentPulse}/100 from productive dashboard; ${candidates.length} relevant news candidates kept separate from accepted signals.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});