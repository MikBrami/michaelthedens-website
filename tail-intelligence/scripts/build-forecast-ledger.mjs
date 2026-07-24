import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const methodology = JSON.parse(fs.readFileSync(path.join(root, 'config', 'methodology.json'), 'utf8'));
const outputPath = path.join(dataDir, 'forecast-ledger.json');
const isBootstrap = !fs.existsSync(outputPath);
const existingLedger = !isBootstrap
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : { forecasts: [] };

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const mergeById = (base = [], updates = []) => {
  const order = base.map((item) => item.id);
  const map = new Map(base.map((item) => [item.id, { ...item }]));
  for (const item of updates) {
    if (!map.has(item.id)) order.push(item.id);
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  }
  return order.map((id) => map.get(id));
};

const dailyIndex = readJson('daily-intelligence-index.json');
const baseDaily = readJson('daily-intelligence.json');
const chronologicalRecords = [
  { name: 'daily-intelligence.json', daily: baseDaily },
  ...(dailyIndex.files || []).map((name) => ({ name, daily: readJson(name) }))
].sort((a, b) => String(a.daily.updatedAt || a.name).localeCompare(String(b.daily.updatedAt || b.name)));

let merged = baseDaily;
for (const { daily } of chronologicalRecords.slice(1)) {
  merged = {
    ...merged,
    ...daily,
    predictionLog: mergeById(merged.predictionLog, daily.predictionLogUpdates || [])
  };
}

const existingById = new Map((existingLedger.forecasts || []).map((item) => [item.id, item]));
const clusterByForecast = new Map();
for (const [clusterId, cluster] of Object.entries(methodology.clusters || {})) {
  for (const forecastId of cluster.forecastIds || []) {
    if (clusterByForecast.has(forecastId)) throw new Error(`${forecastId} assigned to multiple clusters`);
    clusterByForecast.set(forecastId, { clusterId, ...cluster });
  }
}

const firstStructured = new Map();
for (const { name, daily } of chronologicalRecords) {
  const candidates = [
    ...(daily.predictionLog || []),
    ...(daily.predictionLogUpdates || [])
  ];
  for (const item of candidates) {
    if (!item?.id || firstStructured.has(item.id)) continue;
    firstStructured.set(item.id, { ...item, sourceFile: name, sourceTimestamp: daily.updatedAt || null });
  }
}

const activeStatuses = new Set(['open', 'new', 'changed', 'endangered', 'partially_confirmed']);
const resolvedStatuses = new Set(['hit', 'miss', 'partial', 'unresolved']);
const isProbability = (value) => Number.isFinite(value) && value >= 0 && value <= 100;

const preliminary = (merged.predictionLog || []).map((prediction) => {
  const previous = existingById.get(prediction.id);
  const first = firstStructured.get(prediction.id);
  const legacy = methodology.legacyCreationConfidence?.[prediction.id];
  const override = methodology.forecastOverrides?.[prediction.id] || {};
  const resolution = methodology.resolutionOverrides?.[prediction.id] || {};
  const cluster = clusterByForecast.get(prediction.id);
  if (!cluster) throw new Error(`Forecast ${prediction.id} has no explicit cluster assignment`);

  let confidenceCreation = previous?.confidenceCreation;
  let creationSource = previous?.creationSource;
  if (!isProbability(confidenceCreation)) {
    if (isProbability(legacy)) {
      confidenceCreation = legacy;
      creationSource = 'documented_legacy_migration';
    } else if (isProbability(first?.confidenceCreation)) {
      confidenceCreation = first.confidenceCreation;
      creationSource = 'structured_creation_field';
    } else if (first?.previousConfidence === null && isProbability(first?.confidence)) {
      confidenceCreation = first.confidence;
      creationSource = 'first_structured_record';
    } else {
      confidenceCreation = null;
      creationSource = 'migration_review_required';
    }
  }

  const status = override.status || resolution.status || prediction.status;
  const excludedFromScoring = Boolean(override.excludedFromScoring);
  const active = activeStatuses.has(status) && !excludedFromScoring;
  const resolved = resolvedStatuses.has(status) || [0, 1].includes(resolution.outcome);
  const adversarialOverride = methodology.adversarialOverrides?.[prediction.id] || {};

  return {
    id: prediction.id,
    forecast: prediction.forecast,
    status,
    active,
    resolved,
    confidenceCreation,
    confidenceCurrent: prediction.confidence,
    confidenceFixedLead: previous?.confidenceFixedLead ?? null,
    confidenceResolution: resolution.confidenceResolution ?? previous?.confidenceResolution ?? null,
    outcome: resolution.outcome ?? previous?.outcome ?? null,
    creationTimestamp: previous?.creationTimestamp ?? first?.sourceTimestamp ?? null,
    admissionTimestamp: previous?.admissionTimestamp ?? first?.sourceTimestamp ?? null,
    admissionConfidence: previous?.admissionConfidence ?? confidenceCreation,
    fixedLeadTimestamp: previous?.fixedLeadTimestamp ?? null,
    resolutionTimestamp: resolution.resolutionTimestamp ?? previous?.resolutionTimestamp ?? null,
    creationSource,
    sourceRecord: first?.sourceFile ?? null,
    resolutionQuality: resolution.resolutionQuality ?? previous?.resolutionQuality ?? null,
    resolutionNote: resolution.resolutionNote ?? previous?.resolutionNote ?? null,
    clusterId: cluster.clusterId,
    clusterLabel: cluster.label,
    scopeCategory: cluster.scopeCategory,
    dependencyLevel: cluster.dependencyLevel,
    clusterBudget: cluster.budget,
    effectiveWeight: 0,
    scopeGateStatus: previous?.scopeGateStatus ?? 'grandfathered',
    watchlistEnteredAt: previous?.watchlistEnteredAt ?? null,
    watchlistConfidence: previous?.watchlistConfidence ?? null,
    promotionTimestamp: previous?.promotionTimestamp ?? null,
    promotionReason: previous?.promotionReason ?? null,
    confidenceFrozen: Boolean(override.confidenceFrozen),
    excludedFromScoring,
    validationNote: override.validationNote ?? null,
    adversarialCase: {
      hypothesis: adversarialOverride.hypothesis ?? prediction.redPencil ?? null,
      probability: isProbability(adversarialOverride.probability) ? adversarialOverride.probability : null,
      relation: adversarialOverride.relation ?? 'unassessed',
      evidence: adversarialOverride.evidence ?? null,
      trigger: adversarialOverride.trigger ?? prediction.killCondition ?? null,
      nextReview: adversarialOverride.nextReview ?? prediction.nextReview ?? null,
      assessmentStatus: isProbability(adversarialOverride.probability) ? 'independently_assessed' : 'probability_pending'
    }
  };
});

const existingIds = new Set((existingLedger.forecasts || []).map((item) => item.id));
const preGateCounts = preliminary.filter((item) => item.active).reduce((counts, item) => {
  counts[item.scopeCategory] = (counts[item.scopeCategory] || 0) + 1;
  return counts;
}, {});
const preGateTotal = Object.values(preGateCounts).reduce((sum, count) => sum + count, 0);
const preGateMemoryShare = preGateTotal ? (preGateCounts.memory_storage || 0) / preGateTotal * 100 : 0;

for (const item of preliminary) {
  const previous = existingById.get(item.id);
  const promotion = methodology.promotionOverrides?.[item.id];
  const wasScopeWatchlisted = previous?.scopeGateStatus === 'watchlist_scope';

  if (wasScopeWatchlisted && !promotion?.approved) {
    item.scopeGateStatus = 'watchlist_scope';
    item.active = false;
    item.effectiveWeight = 0;
    item.excludedFromScoring = true;
    item.watchlistEnteredAt = previous.watchlistEnteredAt ?? previous.admissionTimestamp ?? previous.creationTimestamp;
    item.watchlistConfidence = previous.watchlistConfidence ?? previous.admissionConfidence ?? previous.confidenceCreation;
    item.validationNote = previous.validationNote || 'Scope watchlist entry. Explicit promotion decision required.';
    continue;
  }

  if (wasScopeWatchlisted && promotion?.approved) {
    item.scopeGateStatus = 'promoted';
    item.active = activeStatuses.has(item.status);
    item.excludedFromScoring = !item.active;
    item.watchlistEnteredAt = previous.watchlistEnteredAt ?? previous.admissionTimestamp ?? previous.creationTimestamp;
    item.watchlistConfidence = previous.watchlistConfidence ?? previous.admissionConfidence ?? previous.confidenceCreation;
    item.promotionTimestamp = promotion.timestamp;
    item.promotionReason = promotion.reason;
    item.validationNote = null;
    continue;
  }

  if (!isBootstrap && !existingIds.has(item.id) && item.active && item.scopeCategory !== 'memory_storage' && preGateMemoryShare < methodology.scopeBudget.memory_storage.minimum) {
    item.scopeGateStatus = 'watchlist_scope';
    item.active = false;
    item.effectiveWeight = 0;
    item.excludedFromScoring = true;
    item.watchlistEnteredAt = item.admissionTimestamp;
    item.watchlistConfidence = item.admissionConfidence;
    item.validationNote = `Hard scope gate: active Memory & Storage share is ${preGateMemoryShare.toFixed(1)}%, below ${methodology.scopeBudget.memory_storage.minimum}%. Explicit promotion required.`;
  }
}

for (const item of preliminary) item.effectiveWeight = 0;
const activeByCluster = new Map();
for (const forecast of preliminary.filter((item) => item.active)) {
  const list = activeByCluster.get(forecast.clusterId) || [];
  list.push(forecast);
  activeByCluster.set(forecast.clusterId, list);
}
const activeClusterBudget = [...activeByCluster.values()].reduce((sum, items) => sum + items[0].clusterBudget, 0);
for (const items of activeByCluster.values()) {
  const clusterBudget = items[0].clusterBudget;
  for (const item of items) item.effectiveWeight = clusterBudget / activeClusterBudget / items.length;
}

const activeRawCounts = preliminary.filter((item) => item.active).reduce((counts, item) => {
  counts[item.scopeCategory] = (counts[item.scopeCategory] || 0) + 1;
  return counts;
}, {});
const activeRawTotal = Object.values(activeRawCounts).reduce((sum, count) => sum + count, 0);
const memoryRawShare = activeRawTotal ? (activeRawCounts.memory_storage || 0) / activeRawTotal * 100 : 0;

const output = {
  schemaVersion: 2,
  methodologyVersion: methodology.version,
  generatedAt: new Date().toISOString(),
  creationPolicy: 'Creation confidence is read only from structured fields or the documented legacy migration table. Free text is never parsed.',
  correctionPolicy: 'Objective input errors may be corrected only by preserving raw and corrected values plus reason, timestamp and audit entry. Judgment changes create a new update snapshot.',
  weightingPolicy: 'Strategic cluster budgets are used only for active-book prioritization and the separately labelled Strategic Weighted Score. Global calibration uses correlation adjustment without scope budgets.',
  scopeAdmissionPolicy: 'When the raw active Memory & Storage share is below 60%, new non-memory forecasts remain on the scope watchlist. Their original confidence and timestamp are frozen; promotion requires an explicit, audited override.',
  scopeStatus: {
    activeForecasts: activeRawTotal,
    memoryRawShare: Number(memoryRawShare.toFixed(1)),
    hardGateActive: memoryRawShare < methodology.scopeBudget.memory_storage.minimum,
    watchlistForecasts: preliminary.filter((item) => item.scopeGateStatus === 'watchlist_scope').length
  },
  forecasts: preliminary
};

for (const forecast of output.forecasts) {
  if (forecast.confidenceCreation !== null && !isProbability(forecast.confidenceCreation)) {
    throw new Error(`Forecast ${forecast.id} has invalid creation confidence ${forecast.confidenceCreation}`);
  }
  if (forecast.outcome !== null && ![0, 1].includes(forecast.outcome)) {
    throw new Error(`Forecast ${forecast.id} has invalid outcome ${forecast.outcome}`);
  }
  if (forecast.scopeGateStatus === 'promoted' && (!forecast.promotionTimestamp || !forecast.promotionReason)) {
    throw new Error(`Forecast ${forecast.id} was promoted without timestamp and reason`);
  }
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log(`Built forecast ledger: ${output.forecasts.length} forecasts, ${output.forecasts.filter((item) => item.active).length} active, ${output.forecasts.filter((item) => item.resolved).length} resolved, ${output.scopeStatus.watchlistForecasts} scope-watchlisted.`);
