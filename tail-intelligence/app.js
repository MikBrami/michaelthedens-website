const $ = id => document.getElementById(id);
const fmtDate = value => {
  if (!value) return '–';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: String(value).includes('T') ? 'short' : undefined }).format(date);
};
const statusLabel = s => ({ red:'Rot', orange:'Orange', yellow:'Gelb', green:'Grün', ok:'OK', warning:'Warnung', error:'Fehler', current:'Aktuell', stale:'Veraltet', invalid:'Ungültig', open:'Offen', changed:'Geändert', new:'Neu', endangered:'Gefährdet', confirmed:'Bestätigt', partially_confirmed:'Teilbestätigt', historical_closed:'Historisch geschlossen', active:'Aktiv', active_weakened:'Aktiv, geschwächt', active_strengthened:'Aktiv, verstärkt', long_term:'Langfristig', new_active:'Neu, aktiv', new_watch:'Neu, beobachten', data_validation_pending:'Datenprüfung läuft', validation_pending:'Datenprüfung läuft', quarantined:'Quarantäne', accepted:'Aufgenommen', watchlist:'Watchlist', rejected:'Abgelehnt' })[s] ?? s;
const processIcon = s => ({ ok:'🟢', warning:'🟠', error:'🔴' })[s] ?? '⚪';
const directionLabel = d => ({ strong_up:'stark steigend', up:'steigend', watch:'beobachten', stable:'stabil', unknown:'unbekannt' })[d] ?? d;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const safeUrl = value => /^https:\/\//i.test(String(value || '')) ? String(value) : '#';
const delta = (current, previous, suffix='') => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return '';
  const diff = current - previous;
  return `${diff > 0 ? '+' : ''}${diff}${suffix}`;
};
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const brier = records => {
  const scored = records.filter(item => Number.isFinite(item.probability) && [0, 1].includes(item.outcome));
  return scored.length ? { value: average(scored.map(item => ((item.probability / 100) - item.outcome) ** 2)), count: scored.length } : { value: null, count: 0 };
};
const fmtBrier = metric => metric.value === null ? '–' : metric.value.toFixed(3);
const scopeFor = prediction => prediction.scopeCategory || (
  /HBM|DRAM|Memory|NAND|SSD|CXMT|Nanya/i.test(prediction.forecast || '') ? 'memory_storage' :
  /Hormuz|Brent|Iran|Öl|tanker|Red Sea|Bab al-Mandeb/i.test(prediction.forecast || '') ? 'energy_geopolitics' :
  /Datacenter|AI|TSMC|NVIDIA|Compute|Capex|Intel|Amkor/i.test(prediction.forecast || '') ? 'ai_datacenter' :
  'second_order_falsifier'
);
const clusterFor = prediction => prediction.clusterId || (
  /Hormuz|Brent|Iran|Öl|tanker|Red Sea|Bab al-Mandeb/i.test(prediction.forecast || '') ? 'GEO-ENERGY-HORMUZ-2026' :
  /CXMT|China.*Memory/i.test(prediction.forecast || '') ? 'CHINA-MEMORY-CXMT-2026' :
  /HBM|DRAM|NAND|SSD|Memory/i.test(prediction.forecast || '') ? 'MEMORY-SUPERCYCLE-2026' :
  /TSMC|NVIDIA|Amkor|Intel|Datacenter|Compute|Capex/i.test(prediction.forecast || '') ? 'AI-INFRASTRUCTURE-2026' :
  'SECOND-ORDER-2026'
);
const creationConfidenceFor = prediction => {
  if (Number.isFinite(prediction.confidenceCreation)) return prediction.confidenceCreation;
  const arrowStart = String(prediction.history || '').match(/(?:^|\s)(\d{1,3})(?:\s*)[→>-]/);
  if (arrowStart) return Number(arrowStart[1]);
  if (prediction.previousConfidence !== null && Number.isFinite(prediction.previousConfidence)) return prediction.previousConfidence;
  return prediction.confidence;
};

function applyMethodology(daily, methodology) {
  const result = structuredClone(daily);
  const forecastOverrides = methodology.forecastOverrides || {};
  result.predictionLog = (result.predictionLog || []).map(prediction => {
    const override = forecastOverrides[prediction.id] || {};
    const enriched = { ...prediction, ...override };
    enriched.confidenceCreation = creationConfidenceFor(enriched);
    enriched.confidenceCurrent = enriched.confidence;
    enriched.clusterId = clusterFor(enriched);
    enriched.scopeCategory = scopeFor(enriched);
    enriched.dependencyLevel ||= 'medium';
    enriched.clusterWeight = Number.isFinite(enriched.clusterWeight) ? enriched.clusterWeight : 1;
    enriched.adversarialCase ||= {
      hypothesis: enriched.redPencil,
      probability: clamp(100 - enriched.confidenceCurrent, 0, 100),
      evidence: enriched.redPencil,
      trigger: enriched.killCondition,
      nextReview: enriched.nextReview,
      trend: Number(enriched.confidenceCurrent) > Number(enriched.previousConfidence) ? 'schwächer' : Number(enriched.confidenceCurrent) < Number(enriched.previousConfidence) ? 'stärker' : 'stabil'
    };
    return enriched;
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
  const predictions = (daily.predictionLog || []).filter(item => !item.excludedFromScoring);
  const creation = brier(predictions.map(item => ({ probability: item.confidenceCreation, outcome: item.outcome })));
  const fixedLead = brier(predictions.map(item => ({ probability: item.confidenceFixedLead, outcome: item.outcome })));
  const resolution = brier(predictions.map(item => ({ probability: item.confidenceResolution, outcome: item.outcome })));
  const updateGain = creation.value !== null && resolution.value !== null ? creation.value - resolution.value : null;
  const clusterCounts = predictions.reduce((map, item) => map.set(item.clusterId, (map.get(item.clusterId) || 0) + (item.clusterWeight || 0)), new Map());
  const largestCluster = [...clusterCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ['–', 0];
  const totalWeight = [...clusterCounts.values()].reduce((sum, value) => sum + value, 0);
  const scopes = predictions.reduce((map, item) => map.set(item.scopeCategory, (map.get(item.scopeCategory) || 0) + (item.clusterWeight || 0)), new Map());
  const scopePercentages = Object.fromEntries([...scopes].map(([key, value]) => [key, totalWeight ? Math.round(value / totalWeight * 100) : 0]));
  const calibrationStatus = creation.count < 5 ? 'Zu wenig Auflösungen' : creation.value <= 0.1 ? 'Gut kalibriert' : creation.value <= 0.2 ? 'Beobachten' : 'Fehlkalibriert';
  return { creation, fixedLead, resolution, updateGain, largestCluster, totalWeight, scopePercentages, calibrationStatus };
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
  const pulse = d.executivePulse || {}, conf = d.confidence || {};
  const metrics = methodologyMetrics(d, methodology);
  $('summary').textContent = pulse.interpretation || 'Keine Executive Summary verfügbar.';
  $('momentum').textContent = d.momentum || '';
  $('tail-index').textContent = pulse.current ?? '–';
  $('tail-index').className = pulse.status || 'orange';
  $('index-status').textContent = `vorher ${pulse.previous ?? '–'} · ${delta(pulse.current, pulse.previous)}`;
  $('daily-confidence').textContent = `${conf.current ?? '–'}%`;
  $('confidence-change').textContent = `${delta(conf.current, conf.previous, ' Punkte')} · vorher ${conf.previous ?? '–'}%`;
  $('brier-creation').textContent = fmtBrier(metrics.creation);
  $('brier-creation-note').textContent = `${metrics.creation.count} sauber aufgelöste Prognose${metrics.creation.count === 1 ? '' : 'n'}`;
  $('calibration-status').textContent = metrics.calibrationStatus;
  $('calibration-note').textContent = 'Primärmetrik: Brier@Creation';
  const strongestFalsifier = (d.falsifiers || []).find(item => /strengthened|new_active/.test(item.status)) || (d.falsifiers || [])[0];
  $('strongest-falsifier').textContent = strongestFalsifier?.id || '–';
  $('strongest-falsifier-note').textContent = strongestFalsifier?.claim || 'Kein aktiver Falsifier';
  $('largest-cluster').textContent = metrics.largestCluster[0];
  $('largest-cluster-note').textContent = `${metrics.largestCluster[1]} gewichtete Prognosen`;
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
    const percentile = clamp(item.historicalPercentile ?? Math.round(50 + (severity - 70) * 1.5), 0, 99);
    const zScore = Number.isFinite(item.zScore90d) ? item.zScore90d : ((severity - 75) / 12);
    const regime = (methodology.driverRegimes || []).find(entry => severity >= entry.minimum)?.label || 'Normal / Tight';
    return `<article><div class="row"><strong>${escapeHtml(item.name)}</strong><span>${severity}</span></div><div class="bar"><i style="width:${severity}%"></i></div><div class="driver-meta"><b>${escapeHtml(regime)}</b><span>P${percentile} · Z90 ${zScore.toFixed(1)}</span></div><small class="${item.delta > 0 ? 'pressure' : item.delta < 0 ? 'relief' : ''}">Momentum ${item.delta > 0 ? '+' : ''}${item.delta}</small></article>`;
  }).join('');
  $('daily-signals').innerHTML = (d.acceptedSignals || []).map(s => {
    const gate = Object.entries(s.admissionGate || {}).map(([key,val]) => `${key}: ${val === true ? '✓' : val === false ? '✗' : val}`).join(' · ');
    const breakdown = Object.entries(s.scoreBreakdown || {}).map(([key,val]) => `${key} ${val}`).join(' · ');
    const links = (s.sources || []).map(src => `<a href="${safeUrl(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)} ↗</a>`).join(' ');
    const rp = s.redPencil || {};
    const quarantine = s.dataStatus === 'validation_pending' ? `<div class="quarantine">⚠ Datenquarantäne: ${escapeHtml(s.validationNote)}</div>` : '';
    return `<article class="daily-signal ${s.dataStatus === 'validation_pending' ? 'is-quarantined' : ''}">${quarantine}<div class="signal-head"><div><span class="rank">#${s.rank}</span><span class="class-tag">${escapeHtml(s.classification)}</span><span class="status-chip ${escapeHtml(s.gateStatus)}">${escapeHtml(statusLabel(s.gateStatus))}</span></div><strong>${s.priorityScore}<small>/100</small></strong></div><h3>${escapeHtml(s.title)}</h3><div class="triptych"><div><h4>Fakt</h4><p>${escapeHtml(s.fact)}</p></div><div><h4>Schätzung</h4><p>${escapeHtml(s.estimate)}</p></div><div><h4>TAIL-Inferenz</h4><p>${escapeHtml(s.tailInference)}</p></div></div><details><summary>Adversarial Case</summary><p><b>Source incentive:</b> ${escapeHtml(rp.sourceIncentive)}</p><p><b>Gegenhypothese:</b> ${escapeHtml(rp.alternative)}</p><p><b>Already priced:</b> ${escapeHtml(rp.alreadyPriced)}</p><p><b>Messbarer Trigger:</b> ${escapeHtml(rp.killCondition)}</p><p><b>Forecast change:</b> ${escapeHtml(rp.forecastChange)}</p></details><div class="metadata"><b>Gate:</b> ${escapeHtml(gate)}<br><b>Rubrik:</b> ${escapeHtml(breakdown)} = ${s.priorityScore}</div><div class="source-links">${links}</div></article>`;
  }).join('');
  $('prediction-log').innerHTML = (d.predictionLog || []).map(p => {
    const adversarial = p.adversarialCase || {};
    const validation = p.validationNote ? `<small class="validation-note">${escapeHtml(p.validationNote)}</small>` : '';
    return `<tr class="${p.confidenceFrozen ? 'frozen-row' : ''}"><td><code>${escapeHtml(p.id)}</code><br><span class="status-chip ${escapeHtml(p.status)}">${escapeHtml(statusLabel(p.status))}</span>${p.confidenceFrozen ? '<small>🔒 Confidence eingefroren</small>' : ''}</td><td><strong>${escapeHtml(p.forecast)}</strong><small>${escapeHtml(p.history)}</small>${validation}</td><td><b class="confidence-value">${p.confidenceCreation ?? '–'}%</b> → <b>${p.confidenceCurrent ?? '–'}%</b><small>Fixed lead ${p.confidenceFixedLead ?? '–'} · Resolution ${p.confidenceResolution ?? '–'} · Outcome ${p.outcome ?? '–'}</small></td><td><code>${escapeHtml(p.clusterId)}</code><small>${escapeHtml(p.scopeCategory)} · Abhängigkeit ${escapeHtml(p.dependencyLevel)} · Gewicht ${p.clusterWeight}</small></td><td><b>Gegenfall ${adversarial.probability ?? '–'}%:</b> ${escapeHtml(adversarial.hypothesis)}<br><b>Trigger:</b> ${escapeHtml(adversarial.trigger)}<small>Nächste Prüfung ${fmtDate(adversarial.nextReview)} · Gegenfall ${escapeHtml(adversarial.trend)}</small></td></tr>`;
  }).join('');
  $('falsifiers').innerHTML = (d.falsifiers || []).map(f => `<article><div class="row"><code>${escapeHtml(f.id)}</code><span class="status-chip ${escapeHtml(f.status)}">${escapeHtml(statusLabel(f.status))}</span></div><h3>${escapeHtml(f.claim)}</h3><p>${escapeHtml(f.update)}</p><small>Review: ${fmtDate(f.nextReview)}</small></article>`).join('');
  $('audit-trail').innerHTML = (d.auditTrail || []).map(a => `<article><div class="row"><strong>${fmtDate(a.date)}</strong><span>${escapeHtml(a.type)}</span></div><p>${escapeHtml(a.item)}</p><small>${escapeHtml(a.action)}</small></article>`).join('');
  $('catalysts').innerHTML = (d.nextCatalysts || []).map(c => `<article><strong>${fmtDate(c.date)}</strong><p>${escapeHtml(c.event)}</p></article>`).join('');
  $('run-history').innerHTML = (d.runHistory || []).map(r => `<article><span>${fmtDate(r.date)}</span><strong>${r.pulse}/100</strong><small>Confidence ${r.confidence}%</small><p>${escapeHtml(r.note)}</p></article>`).join('');
  $('rejection-log').innerHTML = (d.rejectionLog || []).map(item => `<tr><td><code>${escapeHtml(item.id)}</code><small>${fmtDate(item.date)}</small></td><td>${escapeHtml(item.signal)}</td><td><span class="status-chip ${escapeHtml(item.decision)}">${escapeHtml(statusLabel(item.decision))}</span><small>Score ${item.score}</small></td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.reviewResult)}</td></tr>`).join('');
  $('calibration').innerHTML = `<div class="metric-grid"><article><span>Brier@Creation</span><strong>${fmtBrier(metrics.creation)}</strong><small>${metrics.creation.count} Auflösungen</small></article><article><span>Brier@30D</span><strong>${fmtBrier(metrics.fixedLead)}</strong><small>${metrics.fixedLead.count} Snapshots</small></article><article><span>Brier@Resolution</span><strong>${fmtBrier(metrics.resolution)}</strong><small>Nowcasting · ${metrics.resolution.count} Auflösungen</small></article><article><span>Update Gain</span><strong>${metrics.updateGain === null ? '–' : metrics.updateGain.toFixed(3)}</strong><small>Creation minus Resolution</small></article></div><p class="method-note">Creation-Werte sind unveränderlich. Neue Evidenz aktualisiert nur Current-, Fixed-Lead- und Resolution-Snapshots.</p>`;
  const budget = methodology.scopeBudget || {};
  $('scope-control').innerHTML = Object.entries(budget).map(([key, rule]) => {
    const value = metrics.scopePercentages[key] || 0;
    const ok = value >= rule.minimum && value <= rule.maximum;
    return `<article class="scope-row"><div class="row"><strong>${escapeHtml(rule.label)}</strong><span class="${ok ? 'green' : 'orange'}">${value}%</span></div><div class="bar"><i style="width:${Math.min(value, 100)}%"></i></div><small>Ziel ${rule.minimum}–${rule.maximum}% · ${ok ? 'im Budget' : 'außerhalb Budget'}</small></article>`;
  }).join('') + `<p class="method-note">Clusterlimit verhindert, dass korrelierte Wetten den Gesamt-Brier wie unabhängige Prognosen dominieren.</p>`;
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
    const [platform, daily, index, methodology] = await Promise.all([
      fetchJson('data/dashboard.json'),
      fetchJson('data/daily-intelligence.json'),
      fetchOptionalJson('data/daily-intelligence-index.json'),
      fetchJson('config/methodology.json')
    ]);
    const files = Array.isArray(index?.files) && index.files.length
      ? index.files
      : ['daily-intelligence-latest.json'];
    const updates = await Promise.all(files.map((name) => fetchOptionalJson(`data/${name}`)));
    renderPlatform(platform);
    const mergedDaily = updates.reduce((state, update) => mergeDaily(state, update), daily);
    renderDaily(applyMethodology(mergedDaily, methodology), methodology);
  } catch (error) { showError(`Dashboard konnte nicht vollständig geladen werden: ${error.message}`); }
}
loadDashboard();
