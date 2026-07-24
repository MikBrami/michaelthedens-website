const $ = id => document.getElementById(id);
const fmtDate = value => {
  if (!value) return '–';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: String(value).includes('T') ? 'short' : undefined }).format(date);
};
const statusLabel = s => ({ red:'Rot', orange:'Orange', yellow:'Gelb', green:'Grün', ok:'OK', warning:'Warnung', error:'Fehler', current:'Aktuell', stale:'Veraltet', invalid:'Ungültig', open:'Offen', changed:'Geändert', new:'Neu', endangered:'Gefährdet', confirmed:'Bestätigt', hit:'Treffer', miss:'Fehlprognose', partial:'Teilauflösung', unresolved:'Nicht auflösbar', partially_confirmed:'Teilbestätigt', historical_closed:'Historisch geschlossen', active:'Aktiv', active_weakened:'Aktiv, geschwächt', active_strengthened:'Aktiv, verstärkt', long_term:'Langfristig', new_active:'Neu, aktiv', new_watch:'Neu, beobachten', data_validation_pending:'Datenprüfung läuft', validation_pending:'Datenprüfung läuft', quarantined:'Quarantäne', accepted:'Aufgenommen', watchlist:'Watchlist', watchlist_scope:'Scope-Watchlist', grandfathered:'Bestandsschutz', rejected:'Abgelehnt' })[s] ?? s;
const processIcon = s => ({ ok:'🟢', warning:'🟠', error:'🔴' })[s] ?? '⚪';
const directionLabel = d => ({ strong_up:'stark steigend', up:'steigend', watch:'beobachten', stable:'stabil', unknown:'unbekannt' })[d] ?? d;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const safeUrl = value => /^https:\/\//i.test(String(value || '')) ? String(value) : '#';
const creationSourceLabel = value => ({
  documented_legacy_migration: 'dokumentierte Legacy-Migration',
  structured_creation_field: 'strukturiertes Creation-Feld',
  first_structured_record: 'erster strukturierter Datensatz',
  migration_review_required: 'Migration ungeklärt'
})[value] ?? value;
const delta = (current, previous, suffix='') => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return '';
  const diff = current - previous;
  return `${diff > 0 ? '+' : ''}${diff}${suffix}`;
};
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const fmtBrier = metric => metric.value === null ? '–' : metric.value.toFixed(3);
const weightedBrier = (predictions, probabilityField) => {
  const eligible = predictions.filter(item => Number.isFinite(item[probabilityField]) && [0, 1].includes(item.outcome) && !item.excludedFromScoring);
  if (!eligible.length) return { value: null, unweighted: null, count: 0, clusters: 0 };
  const byCluster = new Map();
  for (const item of eligible) {
    const records = byCluster.get(item.clusterId) || [];
    records.push(((item[probabilityField] / 100) - item.outcome) ** 2);
    byCluster.set(item.clusterId, records);
  }
  let weightedSum = 0;
  let representedBudget = 0;
  for (const [clusterId, values] of byCluster) {
    const representative = eligible.find(item => item.clusterId === clusterId);
    const budget = representative?.clusterBudget || 0;
    weightedSum += average(values) * budget;
    representedBudget += budget;
  }
  return {
    value: representedBudget ? weightedSum / representedBudget : average(eligible.map(item => ((item[probabilityField] / 100) - item.outcome) ** 2)),
    unweighted: average(eligible.map(item => ((item[probabilityField] / 100) - item.outcome) ** 2)),
    count: eligible.length,
    clusters: byCluster.size
  };
};

function applyMethodology(daily, methodology, ledger) {
  const result = structuredClone(daily);
  const ledgerById = new Map((ledger.forecasts || []).map(item => [item.id, item]));
  result.predictionLog = (result.predictionLog || []).map(prediction => {
    const structured = ledgerById.get(prediction.id);
    if (!structured) return { ...prediction, ledgerError: 'Forecast ledger entry missing' };
    return { ...prediction, ...structured, confidenceCurrent: prediction.confidence };
  });
  const signalOverrides = methodology.signalOverrides || {};
  result.acceptedSignals = (result.acceptedSignals || []).map(signal => {
    const override = signalOverrides[signal.id] || {};
    const breakdown = override.scoreBreakdown || {
      sourceQuality: clamp(signal.scoreBreakdown?.Evidence ?? 0, 0, 20),
      novelty: clamp(signal.scoreBreakdown?.Novelty ?? 0, 0, 15),
      thesisRelevance: clamp(signal.scoreBreakdown?.Materiality ?? 0, 0, 20),
      forecastImpact: clamp(signal.scoreBreakdown?.ForecastImpact ?? 0, 0, 20),
      falsifiability: signal.admissionGate?.Falsifiability ? 15 : 0,
      timeSensitivity: clamp(signal.scoreBreakdown?.Urgency ?? 0, 0, 10)
    };
    const priorityScore = Object.values(breakdown).reduce((sum, value) => sum + Number(value || 0), 0);
    const gateStatus = priorityScore >= methodology.gates.accepted ? 'accepted' : priorityScore >= methodology.gates.watchlist ? 'watchlist' : 'rejected';
    return { ...signal, ...override, scoreBreakdown: breakdown, priorityScore, gateStatus };
  });
  result.auditTrail = appendUnique(result.auditTrail, methodology.auditAdditions, item => `${item.date}|${item.type}|${item.item}`);
  result.rejectionLog = methodology.rejectionLog || [];
  return result;
}

function methodologyMetrics(daily, methodology) {
  const predictions = (daily.predictionLog || []);
  const active = predictions.filter(item => item.active && !item.excludedFromScoring);
  const creation = weightedBrier(predictions, 'confidenceCreation');
  const fixedLead = weightedBrier(predictions, 'confidenceFixedLead');
  const resolution = weightedBrier(predictions, 'confidenceResolution');
  const updateGain = creation.value !== null && resolution.value !== null ? creation.value - resolution.value : null;
  const clusters = new Map();
  for (const item of active) {
    const cluster = clusters.get(item.clusterId) || { label: item.clusterLabel, count: 0, weight: 0 };
    cluster.count += 1;
    cluster.weight += item.effectiveWeight || 0;
    clusters.set(item.clusterId, cluster);
  }
  const largestCluster = [...clusters.entries()].sort((a, b) => b[1].weight - a[1].weight)[0] || ['–', { label: '–', count: 0, weight: 0 }];
  const rawScopes = active.reduce((map, item) => map.set(item.scopeCategory, (map.get(item.scopeCategory) || 0) + 1), new Map());
  const effectiveScopes = active.reduce((map, item) => map.set(item.scopeCategory, (map.get(item.scopeCategory) || 0) + (item.effectiveWeight || 0)), new Map());
  const rawTotal = active.length;
  const scopeMetrics = Object.fromEntries(Object.keys(methodology.scopeBudget || {}).map(key => [key, {
    count: rawScopes.get(key) || 0,
    rawPercent: rawTotal ? Math.round((rawScopes.get(key) || 0) / rawTotal * 100) : 0,
    effectivePercent: Math.round((effectiveScopes.get(key) || 0) * 100)
  }]));
  const memoryRaw = scopeMetrics.memory_storage?.rawPercent || 0;
  const hardScopeGate = memoryRaw < methodology.scopeBudget.memory_storage.minimum;
  const calibrationStatus = creation.count < 20 ? 'Frühe Stichprobe' : creation.value <= 0.1 ? 'Gut kalibriert' : creation.value <= 0.2 ? 'Beobachten' : 'Fehlkalibriert';
  return { creation, fixedLead, resolution, updateGain, largestCluster, clusters, scopeMetrics, calibrationStatus, hardScopeGate, activeCount: active.length };
}

function showError(message) {
  const box = $('error-banner');
  box.classList.remove('hidden');
  box.textContent = message;
}

function renderPlatform(d) {
  $('data-as-of').textContent = fmtDate(d.dataAsOf);
  $('last-update').textContent = fmtDate(d.lastSuccessfulUpdate);
  $('article-count').textContent = d.articleCount ?? d.totalArticles ?? '–';
  $('process-status').textContent = `${processIcon(d.processStatus)} ${statusLabel(d.processStatus)}`;
  $('inbox-status').textContent = `${processIcon(d.inbox?.status)} ${d.inbox?.totalItems ?? 0} Items`;
  $('duplicate-count').textContent = d.inbox?.duplicateItems ?? 0;
  $('last-forecast').textContent = fmtDate(d.lastForecastRun);
  $('data-freshness').textContent = `${statusLabel(d.dataFreshness)}${Number.isFinite(d.dataAgeDays) ? ` · ${d.dataAgeDays} Tage` : ''}`;
  if (d.processStatus !== 'ok') {
    const warningText = [d.error, ...(d.warnings || [])].filter(Boolean).join(' ');
    showError(warningText || 'TAIL meldet einen Warn- oder Fehlerstatus.');
  }
  $('pipeline').innerHTML = (d.pipeline?.steps || []).map(step => `<article><div class="row"><strong>${processIcon(step.status)} ${escapeHtml(step.label)}</strong><span>${statusLabel(step.status)}</span></div><small>${escapeHtml(step.detail)}</small></article>`).join('');
  $('markets').innerHTML = (d.markets || []).map(m => `<article><div class="metric"><div><div class="tag ${m.status}">${statusLabel(m.status)}</div><h3>${escapeHtml(m.label)}</h3></div><span class="lamp ${m.status}"></span></div><div class="score ${m.status}">${m.score}</div><small>${m.signals} Signale</small></article>`).join('');
  $('manufacturers').innerHTML = (d.manufacturers || []).map((m,i) => `<article><div class="row"><strong>${i+1}. ${escapeHtml(m.name)}</strong><span>${m.score}</span></div><div class="bar"><i style="width:${m.score}%"></i></div><small>${m.mentions} Nennungen</small></article>`).join('');
  $('forecasts').innerHTML = (d.forecasts || []).map(f => `<article><div class="row"><strong>${escapeHtml(f.market)}</strong><span>${escapeHtml(f.horizon)}</span></div><p>${escapeHtml(f.keyThesis || f.thesis)}</p><small>Score ${f.relevanceScore ?? '–'} · Konfidenz ${f.confidenceScore ?? f.confidence ?? '–'}% · Momentum ${f.momentum ?? '–'} · ${directionLabel(f.direction)}</small></article>`).join('');
  $('signals').innerHTML = (d.topSignals || []).map(s => `<article class="${s.status}"><div class="row"><span class="tag">${fmtDate(s.date)}</span><strong>${s.score}/100</strong></div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.summary)}</p><p><strong>TAIL:</strong> ${escapeHtml(s.analysis)}</p></article>`).join('');
}

function renderDaily(d, methodology) {
  const pulse = d.executivePulse || {};
  const metrics = methodologyMetrics(d, methodology);
  $('summary').textContent = pulse.interpretation || 'Keine Executive Summary verfügbar.';
  $('momentum').textContent = d.momentum || '';
  $('tail-index').textContent = pulse.current ?? '–';
  $('tail-index').className = pulse.status || 'orange';
  $('index-status').textContent = `vorher ${pulse.previous ?? '–'} · ${delta(pulse.current, pulse.previous)}`;
  $('brier-creation').textContent = fmtBrier(metrics.creation);
  $('brier-creation-note').textContent = `${metrics.creation.count} Auflösungen · ${metrics.creation.clusters} unabhängige Cluster`;
  $('calibration-status').textContent = metrics.calibrationStatus;
  $('calibration-note').textContent = `Ungewichtet ${metrics.creation.unweighted?.toFixed(3) ?? '–'}`;
  const strongestFalsifier = (d.falsifiers || []).find(item => /strengthened|new_active/.test(item.status)) || (d.falsifiers || [])[0];
  $('strongest-falsifier').textContent = strongestFalsifier?.id || '–';
  $('strongest-falsifier-note').textContent = strongestFalsifier?.claim || 'Kein aktiver Falsifier';
  $('largest-cluster').textContent = metrics.largestCluster[1].label;
  $('largest-cluster-note').textContent = `${metrics.largestCluster[1].count} aktive Prognosen · ${Math.round(metrics.largestCluster[1].weight * 100)}% Gesamtgewicht`;
  $('scope-status').textContent = metrics.hardScopeGate ? '🟠 Gate aktiv' : '🟢 Im Korridor';
  $('scope-status-note').textContent = metrics.hardScopeGate
    ? `Memory-Rohanteil ${metrics.scopeMetrics.memory_storage.rawPercent}% · neue Non-Memory-Forecasts auf Watchlist`
    : `Memory-Rohanteil ${metrics.scopeMetrics.memory_storage.rawPercent}%`;
  const pending = (d.predictionLog || []).filter(item => item.status === 'data_validation_pending').length;
  $('methodology-status').textContent = pending ? '🟠 Prüfung' : '🟢 OK';
  $('methodology-status-note').textContent = pending ? `${pending} Prognose eingefroren` : 'Keine Datenquarantäne';
  $('daily-updated').textContent = fmtDate(d.updatedAt);
  const firstCatalyst = d.nextCatalysts?.[0];
  $('next-review').textContent = fmtDate(firstCatalyst?.date);
  $('next-review-label').textContent = firstCatalyst?.event || '';
  $('history-policy').textContent = d.historyPolicy || '';
  $('daily-drivers').innerHTML = (d.driverScores || []).map(item => {
    const severity = clamp(item.absoluteSeverity ?? item.score, 0, 100);
    const hasQualifiedHistory = Number(item.referenceWindowDays) >= 90 && Number.isFinite(item.historicalPercentile) && Number.isFinite(item.zScore90d);
    return `<article class="driver-withheld"><div class="row"><strong>${escapeHtml(item.name)}</strong><span>${severity}</span></div><small>Legacy-Intensität · nicht clusterübergreifend vergleichbar</small><div class="driver-meta"><b class="${item.delta > 0 ? 'pressure' : item.delta < 0 ? 'relief' : ''}">Momentum ${item.delta > 0 ? '+' : ''}${item.delta}</b><span>${item.rawMetric ? escapeHtml(item.rawMetric) : 'Rohmetrik nicht geliefert'}</span></div><div class="normalization-note">${hasQualifiedHistory ? `P${item.historicalPercentile} · Z90 ${item.zScore90d.toFixed(1)} · ${item.referenceWindowDays} Tage` : 'Perzentil und Z-Score ausgesetzt · Referenzhistorie < 90 Tage'}</div></article>`;
  }).join('');
  $('daily-signals').innerHTML = (d.acceptedSignals || []).map(s => {
    const gate = Object.entries(s.admissionGate || {}).map(([key,val]) => `${key}: ${val === true ? '✓' : val === false ? '✗' : val}`).join(' · ');
    const breakdown = Object.entries(s.scoreBreakdown || {}).map(([key,val]) => `${key} ${val}`).join(' · ');
    const links = (s.sources || []).map(src => `<a href="${safeUrl(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)} ↗</a>`).join(' ');
    const rp = s.redPencil || {};
    const quarantineBadge = s.dataStatus === 'validation_pending' ? `<span class="status-chip quarantined">⚠ Datenquarantäne</span>` : '';
    const quarantine = s.dataStatus === 'validation_pending' ? `<div class="quarantine">Dieser Datensatz gehört zu Signal #${s.rank}: ${escapeHtml(s.validationNote)}</div>` : '';
    return `<article class="daily-signal ${s.dataStatus === 'validation_pending' ? 'is-quarantined' : ''}"><div class="signal-head"><div><span class="rank">#${s.rank}</span><span class="class-tag">${escapeHtml(s.classification)}</span><span class="status-chip ${escapeHtml(s.gateStatus)}">${escapeHtml(statusLabel(s.gateStatus))}</span>${quarantineBadge}</div><strong>${s.priorityScore}<small>/100</small></strong></div><h3>${escapeHtml(s.title)}</h3>${quarantine}<div class="triptych"><div><h4>Fakt</h4><p>${escapeHtml(s.fact)}</p></div><div><h4>Schätzung</h4><p>${escapeHtml(s.estimate)}</p></div><div><h4>TAIL-Inferenz</h4><p>${escapeHtml(s.tailInference)}</p></div></div><details><summary>Adversarial Case</summary><p><b>Source incentive:</b> ${escapeHtml(rp.sourceIncentive)}</p><p><b>Gegenhypothese:</b> ${escapeHtml(rp.alternative)}</p><p><b>Already priced:</b> ${escapeHtml(rp.alreadyPriced)}</p><p><b>Messbarer Trigger:</b> ${escapeHtml(rp.killCondition)}</p><p><b>Forecast change:</b> ${escapeHtml(rp.forecastChange)}</p></details><div class="metadata"><b>Gate:</b> ${escapeHtml(gate)}<br><b>Rubrik:</b> ${escapeHtml(breakdown)} = ${s.priorityScore}</div><div class="source-links">${links}</div></article>`;
  }).join('');
  $('prediction-log').innerHTML = (d.predictionLog || []).map(p => {
    const adversarial = p.adversarialCase || {};
    const validation = p.validationNote ? `<small class="validation-note">${escapeHtml(p.validationNote)}</small>` : '';
    const probability = Number.isFinite(adversarial.probability) ? `${adversarial.probability}%` : 'nicht unabhängig bewertet';
    const resolution = p.resolved ? `<small class="resolution-note">Outcome ${p.outcome} · ${escapeHtml(p.resolutionQuality)} · ${escapeHtml(p.resolutionNote)}</small>` : '';
    return `<tr class="${p.confidenceFrozen ? 'frozen-row' : ''}"><td><code>${escapeHtml(p.id)}</code><br><span class="status-chip ${escapeHtml(p.status)}">${escapeHtml(statusLabel(p.status))}</span>${p.confidenceFrozen ? '<small>🔒 Confidence eingefroren</small>' : ''}</td><td><strong>${escapeHtml(p.forecast)}</strong><small>${escapeHtml(p.history)}</small>${validation}${resolution}</td><td><b class="confidence-value">${p.confidenceCreation ?? '–'}%</b> → <b>${p.confidenceCurrent ?? '–'}%</b><small>Quelle: ${escapeHtml(creationSourceLabel(p.creationSource))} · Fixed lead ${p.confidenceFixedLead ?? '–'} · Resolution ${p.confidenceResolution ?? '–'}</small></td><td><code>${escapeHtml(p.clusterId)}</code><small>${escapeHtml(p.scopeCategory)} · ${p.active ? `${(p.effectiveWeight * 100).toFixed(2)}% effektives Gewicht` : 'nicht im aktiven Gewicht'} · ${escapeHtml(statusLabel(p.scopeGateStatus))}</small></td><td><b>Gegenfall:</b> ${probability}<br>${escapeHtml(adversarial.hypothesis)}<small>Relation ${escapeHtml(adversarial.relation)} · ${escapeHtml(adversarial.assessmentStatus)} · Review ${fmtDate(adversarial.nextReview)}</small></td></tr>`;
  }).join('');
  $('falsifiers').innerHTML = (d.falsifiers || []).map(f => `<article><div class="row"><code>${escapeHtml(f.id)}</code><span class="status-chip ${escapeHtml(f.status)}">${escapeHtml(statusLabel(f.status))}</span></div><h3>${escapeHtml(f.claim)}</h3><p>${escapeHtml(f.update)}</p><small>Review: ${fmtDate(f.nextReview)}</small></article>`).join('');
  $('audit-trail').innerHTML = (d.auditTrail || []).map(a => `<article><div class="row"><strong>${fmtDate(a.date)}</strong><span>${escapeHtml(a.type)}</span></div><p>${escapeHtml(a.item)}</p><small>${escapeHtml(a.action)}</small></article>`).join('');
  $('catalysts').innerHTML = (d.nextCatalysts || []).map(c => `<article><strong>${fmtDate(c.date)}</strong><p>${escapeHtml(c.event)}</p></article>`).join('');
  $('run-history').innerHTML = (d.runHistory || []).map(r => `<article><span>${fmtDate(r.date)}</span><strong>${r.pulse}/100</strong><small>Legacy Confidence ${r.confidence}% · nicht mehr Executive KPI</small><p>${escapeHtml(r.note)}</p></article>`).join('');
  $('rejection-log').innerHTML = (d.rejectionLog || []).map(item => `<tr><td><code>${escapeHtml(item.id)}</code><small>${fmtDate(item.date)}</small></td><td>${escapeHtml(item.signal)}</td><td><span class="status-chip ${escapeHtml(item.decision)}">${escapeHtml(statusLabel(item.decision))}</span><small>Score ${item.score}</small></td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.reviewResult)}</td></tr>`).join('');
  $('calibration').innerHTML = `<div class="metric-grid"><article><span>Brier@Creation</span><strong>${fmtBrier(metrics.creation)}</strong><small>Cluster-adjustiert · ungewichtet ${metrics.creation.unweighted?.toFixed(3) ?? '–'}</small></article><article><span>Brier@30D</span><strong>${fmtBrier(metrics.fixedLead)}</strong><small>${metrics.fixedLead.count} Snapshots</small></article><article><span>Brier@Resolution</span><strong>${fmtBrier(metrics.resolution)}</strong><small>Nowcasting · ${metrics.resolution.count} Auflösungen</small></article><article><span>Update Gain</span><strong>${metrics.updateGain === null ? '–' : metrics.updateGain.toFixed(3)}</strong><small>Creation minus Resolution</small></article></div><p class="method-note">Creation-Werte stammen ausschließlich aus strukturierten Feldern oder der dokumentierten Legacy-Migration. Freitext wird nie geparst. Vier Auflösungen bleiben eine frühe Stichprobe.</p>`;
  const budget = methodology.scopeBudget || {};
  $('scope-control').innerHTML = Object.entries(budget).map(([key, rule]) => {
    const values = metrics.scopeMetrics[key] || { count: 0, rawPercent: 0, effectivePercent: 0 };
    const rawOk = values.rawPercent >= rule.minimum && values.rawPercent <= rule.maximum;
    return `<article class="scope-row"><div class="row"><strong>${escapeHtml(rule.label)}</strong><span class="${rawOk ? 'green' : 'orange'}">${values.rawPercent}% roh · ${values.effectivePercent}% gewichtet</span></div><div class="bar dual"><i style="width:${Math.min(values.effectivePercent, 100)}%"></i></div><small>${values.count} aktive Forecasts · Ziel ${rule.minimum}–${rule.maximum}% · effektives Ziel ${rule.target}%</small></article>`;
  }).join('') + `<div class="scope-gate ${metrics.hardScopeGate ? 'warning' : 'ok'}">${metrics.hardScopeGate ? 'Hard Scope Gate aktiv: Neue Non-Memory-Prognosen bleiben auf der Watchlist, bis der rohe Memory-Anteil mindestens 60% erreicht.' : 'Scope Gate offen.'}</div><p class="method-note">Clusterbudgets summieren sich auf 100%. Prognosen innerhalb eines Clusters teilen dessen Gewicht; sechs korrelierte Hormuz-Wetten bleiben zusammen auf 10% begrenzt.</p>`;
}

function mergeById(base = [], updates = []) {
  const order = base.map(item => item.id), map = new Map(base.map(item => [item.id, { ...item }]));
  updates.forEach(item => { if (!map.has(item.id)) order.push(item.id); map.set(item.id, { ...(map.get(item.id) || {}), ...item }); });
  return order.map(id => map.get(id));
}
function appendUnique(base = [], additions = [], keyFn) {
  const result = [...base], seen = new Set(base.map(keyFn));
  additions.forEach(item => { const key = keyFn(item); if (!seen.has(key)) { result.push(item); seen.add(key); } });
  return result;
}
function mergeDaily(base, update) {
  if (!update) return base;
  const merged = { ...base, ...update };
  merged.predictionLog = mergeById(base.predictionLog, update.predictionLogUpdates || []);
  merged.falsifiers = mergeById(base.falsifiers, update.falsifierUpdates || []);
  merged.auditTrail = appendUnique(base.auditTrail, update.auditTrailAdditions, item => `${item.date}|${item.type}|${item.item}`);
  merged.runHistory = appendUnique(base.runHistory, update.runHistoryAdditions, item => item.date);
  delete merged.predictionLogUpdates; delete merged.falsifierUpdates; delete merged.auditTrailAdditions; delete merged.runHistoryAdditions;
  return merged;
}
async function fetchJson(url) {
  const response = await fetch(`${url}?ts=${Date.now()}`, { cache:'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
async function fetchOptionalJson(url) {
  try { return await fetchJson(url); }
  catch (error) { if (String(error.message).includes('HTTP 404')) return null; throw error; }
}
async function loadDashboard() {
  try {
    const [platform, daily, index, methodology, ledger] = await Promise.all([
      fetchJson('data/dashboard.json'),
      fetchJson('data/daily-intelligence.json'),
      fetchOptionalJson('data/daily-intelligence-index.json'),
      fetchJson('config/methodology.json'),
      fetchJson('data/forecast-ledger.json')
    ]);
    const files = Array.isArray(index?.files) && index.files.length
      ? index.files
      : ['daily-intelligence-latest.json'];
    const updates = await Promise.all(files.map((name) => fetchOptionalJson(`data/${name}`)));
    renderPlatform(platform);
    const mergedDaily = updates.reduce((state, update) => mergeDaily(state, update), daily);
    renderDaily(applyMethodology(mergedDaily, methodology, ledger), methodology);
  } catch (error) { showError(`Dashboard konnte nicht vollständig geladen werden: ${error.message}`); }
}
loadDashboard();
