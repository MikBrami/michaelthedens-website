const $ = id => document.getElementById(id);
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const score = (item, field) => ((item[field] / 100) - item.outcome) ** 2;
const fmt = value => Number.isFinite(value) ? value.toFixed(3) : '–';

function eligible(predictions, field, scopeCategory = null) {
  return predictions.filter(item =>
    Number.isFinite(item[field]) &&
    [0, 1].includes(item.outcome) &&
    !item.excludedFromScoring &&
    (!scopeCategory || item.scopeCategory === scopeCategory)
  );
}

function correlationAdjustedBrier(predictions, field, scopeCategory = null) {
  const records = eligible(predictions, field, scopeCategory);
  if (!records.length) return { value: null, count: 0, clusters: 0, effectiveN: 0, hits: 0, misses: 0 };

  const byCluster = new Map();
  for (const item of records) {
    const list = byCluster.get(item.clusterId) || [];
    list.push(item);
    byCluster.set(item.clusterId, list);
  }

  const clusterScores = [...byCluster.values()].map(items => average(items.map(item => score(item, field))));
  const forecastWeights = [...byCluster.values()].flatMap(items => items.map(() => 1 / byCluster.size / items.length));
  const weightSquares = forecastWeights.reduce((sum, weight) => sum + weight ** 2, 0);

  return {
    value: average(clusterScores),
    count: records.length,
    clusters: byCluster.size,
    effectiveN: weightSquares ? 1 / weightSquares : 0,
    hits: records.filter(item => item.outcome === 1).length,
    misses: records.filter(item => item.outcome === 0).length
  };
}

function strategicScore(predictions, field) {
  const records = eligible(predictions, field);
  if (!records.length) return { value: null, count: 0 };

  const byCluster = new Map();
  for (const item of records) {
    const cluster = byCluster.get(item.clusterId) || { budget: item.clusterBudget || 0, items: [] };
    cluster.items.push(item);
    byCluster.set(item.clusterId, cluster);
  }

  let weighted = 0;
  let representedBudget = 0;
  for (const cluster of byCluster.values()) {
    weighted += average(cluster.items.map(item => score(item, field))) * cluster.budget;
    representedBudget += cluster.budget;
  }
  return { value: representedBudget ? weighted / representedBudget : null, count: records.length };
}

async function fetchJson(url) {
  const response = await fetch(`${url}?methodology=3.2&ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function mergeById(base = [], updates = []) {
  const order = base.map(item => item.id);
  const map = new Map(base.map(item => [item.id, { ...item }]));
  for (const item of updates) {
    if (!map.has(item.id)) order.push(item.id);
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  }
  return order.map(id => map.get(id));
}

function mergeDaily(base, update) {
  if (!update) return base;
  return { ...base, ...update, predictionLog: mergeById(base.predictionLog, update.predictionLogUpdates || []) };
}

async function loadMergedPredictions() {
  const [daily, index, ledger] = await Promise.all([
    fetchJson('data/daily-intelligence.json'),
    fetchJson('data/daily-intelligence-index.json'),
    fetchJson('data/forecast-ledger.json')
  ]);
  const updates = await Promise.all((index.files || []).map(name => fetchJson(`data/${name}`)));
  const merged = updates.reduce((state, update) => mergeDaily(state, update), daily);
  const ledgerById = new Map((ledger.forecasts || []).map(item => [item.id, item]));
  return (merged.predictionLog || []).map(item => ({ ...item, ...(ledgerById.get(item.id) || {}) }));
}

function renderCalibration(predictions) {
  const globalCreation = correlationAdjustedBrier(predictions, 'confidenceCreation');
  const global30d = correlationAdjustedBrier(predictions, 'confidenceFixedLead');
  const globalResolution = correlationAdjustedBrier(predictions, 'confidenceResolution');
  const memoryCreation = correlationAdjustedBrier(predictions, 'confidenceCreation', 'memory_storage');
  const strategicCreation = strategicScore(predictions, 'confidenceCreation');
  const updateGain = Number.isFinite(globalCreation.value) && Number.isFinite(globalResolution.value)
    ? globalCreation.value - globalResolution.value
    : null;
  const interpretable = globalCreation.effectiveN >= 30 && globalCreation.misses >= 5;

  $('brier-creation').textContent = fmt(globalCreation.value);
  $('brier-creation-note').textContent = `${globalCreation.count} Auflösungen · effektiv N=${globalCreation.effectiveN.toFixed(1)} · ${globalCreation.misses} Misses`;
  $('calibration-status').textContent = interpretable ? 'Interpretierbar' : 'Noch nicht interpretierbar';
  $('calibration-note').textContent = interpretable
    ? `${globalCreation.clusters} unabhängige Ereigniscluster`
    : `Schwelle: effektiv N≥30 und mindestens 5 Misses`;

  $('calibration').innerHTML = `<div class="metric-grid">
    <article><span>Global Brier@Creation</span><strong>${fmt(globalCreation.value)}</strong><small>Nur Korrelationsbereinigung · keine Scope-Priorität</small></article>
    <article><span>Memory/Storage Brier</span><strong>${fmt(memoryCreation.value)}</strong><small>${memoryCreation.count} Auflösungen · effektiv N=${memoryCreation.effectiveN.toFixed(1)}</small></article>
    <article><span>Strategic Weighted Score</span><strong>${fmt(strategicCreation.value)}</strong><small>65/20/10/5-Priorität · ausdrücklich kein reiner Brier</small></article>
    <article><span>Global Brier@30D</span><strong>${fmt(global30d.value)}</strong><small>${global30d.count} Fixed-Lead-Snapshots</small></article>
    <article><span>Global Brier@Resolution</span><strong>${fmt(globalResolution.value)}</strong><small>Nowcasting separat ausgewiesen</small></article>
    <article><span>Update Gain</span><strong>${fmt(updateGain)}</strong><small>Creation minus Resolution</small></article>
  </div>
  <p class="method-note"><strong>Interpretationssperre:</strong> ${globalCreation.hits} Treffer, ${globalCreation.misses} Fehlprognosen, ${globalCreation.count} rohe Auflösungen, effektiv N=${globalCreation.effectiveN.toFixed(1)}. Der globale Kalibrierungswert wird erst ab effektiv N≥30 und mindestens fünf Misses als belastbar bezeichnet.</p>`;
}

function renderWatchlistGovernance(predictions) {
  const watchlist = predictions.filter(item => item.scopeGateStatus === 'watchlist_scope' || item.status === 'watchlist');
  const panel = $('scope-control');
  if (!panel) return;
  panel.insertAdjacentHTML('beforeend', `<p class="method-note"><strong>Admission-Regel:</strong> Scope-Priorität entscheidet ausschließlich über Aufnahme und Watchlist. Sie verändert den Global Brier nicht. Watchlist-Confidence und ursprünglicher Zeitstempel bleiben beim Ersteingang eingefroren; Beförderungen benötigen einen protokollierten Grund.</p>
  <article class="scope-row"><div class="row"><strong>Scope-Watchlist</strong><span>${watchlist.length} Einträge</span></div><small>${watchlist.length ? watchlist.map(item => item.id).join(' · ') : 'Keine Einträge'}</small></article>`);
}

async function applyMethodology32() {
  try {
    const predictions = await loadMergedPredictions();
    renderCalibration(predictions);
    renderWatchlistGovernance(predictions);
  } catch (error) {
    console.error('TAIL Methodology 3.2 overlay failed', error);
  }
}

window.addEventListener('load', () => setTimeout(applyMethodology32, 0));
