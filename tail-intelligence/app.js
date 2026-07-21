const $ = id => document.getElementById(id);
const fmtDate = value => {
  if (!value) return '–';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: String(value).includes('T') ? 'short' : undefined }).format(date);
};
const statusLabel = s => ({ red:'Rot', orange:'Orange', yellow:'Gelb', green:'Grün', ok:'OK', warning:'Warnung', error:'Fehler', current:'Aktuell', stale:'Veraltet', invalid:'Ungültig', open:'Offen', changed:'Geändert', new:'Neu', endangered:'Gefährdet', confirmed:'Bestätigt', partially_confirmed:'Teilbestätigt', historical_closed:'Historisch geschlossen', active:'Aktiv', active_weakened:'Aktiv, geschwächt', active_strengthened:'Aktiv, verstärkt', long_term:'Langfristig', new_active:'Neu, aktiv', new_watch:'Neu, beobachten' })[s] ?? s;
const processIcon = s => ({ ok:'🟢', warning:'🟠', error:'🔴' })[s] ?? '⚪';
const directionLabel = d => ({ strong_up:'stark steigend', up:'steigend', watch:'beobachten', stable:'stabil', unknown:'unbekannt' })[d] ?? d;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const safeUrl = value => /^https:\/\//i.test(String(value || '')) ? String(value) : '#';
const delta = (current, previous, suffix='') => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return '';
  const diff = current - previous;
  return `${diff > 0 ? '+' : ''}${diff}${suffix}`;
};

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

function renderDaily(d) {
  const pulse = d.executivePulse || {};
  const conf = d.confidence || {};
  const risk = d.riskPressure || {};
  $('summary').textContent = pulse.interpretation || 'Keine Executive Summary verfügbar.';
  $('momentum').textContent = d.momentum || '';
  $('tail-index').textContent = pulse.current ?? '–';
  $('tail-index').className = pulse.status || 'orange';
  $('index-status').textContent = `vorher ${pulse.previous ?? '–'} · ${delta(pulse.current, pulse.previous)}`;
  $('daily-confidence').textContent = `${conf.current ?? '–'}%`;
  $('confidence-change').textContent = `${delta(conf.current, conf.previous, ' Punkte')} · vorher ${conf.previous ?? '–'}%`;
  $('risk-pressure').textContent = `${risk.current ?? '–'}/100`;
  $('risk-change').textContent = `${delta(risk.current, risk.previous, ' Punkte')} · vorher ${risk.previous ?? '–'}`;
  $('daily-updated').textContent = fmtDate(d.updatedAt);
  const firstCatalyst = d.nextCatalysts?.[0];
  $('next-review').textContent = fmtDate(firstCatalyst?.date);
  $('next-review-label').textContent = firstCatalyst?.event || '';
  $('history-policy').textContent = d.historyPolicy || '';

  $('daily-drivers').innerHTML = (d.driverScores || []).map(item => `<article><div class="row"><strong>${escapeHtml(item.name)}</strong><span>${item.score}</span></div><div class="bar"><i style="width:${item.score}%"></i></div><small class="${item.delta > 0 ? 'pressure' : item.delta < 0 ? 'relief' : ''}">${item.delta > 0 ? '+' : ''}${item.delta} seit gestern</small></article>`).join('');

  $('daily-signals').innerHTML = (d.acceptedSignals || []).map(s => {
    const gate = Object.entries(s.admissionGate || {}).map(([key,val]) => `${key}: ${val === true ? '✓' : val === false ? '✗' : val}`).join(' · ');
    const breakdown = Object.entries(s.scoreBreakdown || {}).map(([key,val]) => `${key} ${val}`).join(' · ');
    const links = (s.sources || []).map(src => `<a href="${safeUrl(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)} ↗</a>`).join(' ');
    const rp = s.redPencil || {};
    return `<article class="daily-signal">
      <div class="signal-head"><div><span class="rank">#${s.rank}</span><span class="class-tag">${escapeHtml(s.classification)}</span></div><strong>${s.priorityScore}<small>/100</small></strong></div>
      <h3>${escapeHtml(s.title)}</h3>
      <div class="triptych"><div><h4>Fakt</h4><p>${escapeHtml(s.fact)}</p></div><div><h4>Schätzung</h4><p>${escapeHtml(s.estimate)}</p></div><div><h4>TAIL-Inferenz</h4><p>${escapeHtml(s.tailInference)}</p></div></div>
      <details><summary>Patrick’s Red Pencil</summary><p><b>Source incentive:</b> ${escapeHtml(rp.sourceIncentive)}</p><p><b>Alternative/Base Rate:</b> ${escapeHtml(rp.alternative)}</p><p><b>Already priced:</b> ${escapeHtml(rp.alreadyPriced)}</p><p><b>Kill condition:</b> ${escapeHtml(rp.killCondition)}</p><p><b>Forecast change:</b> ${escapeHtml(rp.forecastChange)}</p></details>
      <div class="metadata"><b>Gate:</b> ${escapeHtml(gate)}<br><b>Score:</b> ${escapeHtml(breakdown)} = ${s.priorityScore}</div><div class="source-links">${links}</div>
    </article>`;
  }).join('');

  $('prediction-log').innerHTML = (d.predictionLog || []).map(p => `<tr><td><code>${escapeHtml(p.id)}</code><br><span class="status-chip ${escapeHtml(p.status)}">${escapeHtml(statusLabel(p.status))}</span></td><td><strong>${escapeHtml(p.forecast)}</strong><small>${escapeHtml(p.history)}</small></td><td><b class="confidence-value">${p.confidence}%</b><small>vorher ${p.previousConfidence ?? '—'}${p.previousConfidence !== null ? '%' : ''}</small></td><td>${fmtDate(p.nextReview)}</td><td><b>Red Pencil:</b> ${escapeHtml(p.redPencil)}<br><b>Kill:</b> ${escapeHtml(p.killCondition)}</td></tr>`).join('');

  $('falsifiers').innerHTML = (d.falsifiers || []).map(f => `<article><div class="row"><code>${escapeHtml(f.id)}</code><span class="status-chip ${escapeHtml(f.status)}">${escapeHtml(statusLabel(f.status))}</span></div><h3>${escapeHtml(f.claim)}</h3><p>${escapeHtml(f.update)}</p><small>Review: ${fmtDate(f.nextReview)}</small></article>`).join('');
  $('audit-trail').innerHTML = (d.auditTrail || []).map(a => `<article><div class="row"><strong>${fmtDate(a.date)}</strong><span>${escapeHtml(a.type)}</span></div><p>${escapeHtml(a.item)}</p><small>${escapeHtml(a.action)}</small></article>`).join('');
  $('catalysts').innerHTML = (d.nextCatalysts || []).map(c => `<article><strong>${fmtDate(c.date)}</strong><p>${escapeHtml(c.event)}</p></article>`).join('');
  $('run-history').innerHTML = (d.runHistory || []).map(r => `<article><span>${fmtDate(r.date)}</span><strong>${r.pulse}/100</strong><small>Confidence ${r.confidence}%</small><p>${escapeHtml(r.note)}</p></article>`).join('');
}

function mergeById(base = [], updates = []) {
  const order = base.map(item => item.id);
  const map = new Map(base.map(item => [item.id, { ...item }]));
  updates.forEach(item => {
    if (!map.has(item.id)) order.push(item.id);
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  });
  return order.map(id => map.get(id));
}

function appendUnique(base = [], additions = [], keyFn) {
  const result = [...base];
  const seen = new Set(base.map(keyFn));
  additions.forEach(item => {
    const key = keyFn(item);
    if (!seen.has(key)) {
      result.push(item);
      seen.add(key);
    }
  });
  return result;
}

function mergeDaily(base, update) {
  if (!update) return base;
  const merged = { ...base, ...update };
  merged.predictionLog = mergeById(base.predictionLog, update.predictionLogUpdates || []);
  merged.falsifiers = mergeById(base.falsifiers, update.falsifierUpdates || []);
  merged.auditTrail = appendUnique(base.auditTrail, update.auditTrailAdditions, item => `${item.date}|${item.type}|${item.item}`);
  merged.runHistory = appendUnique(base.runHistory, update.runHistoryAdditions, item => item.date);
  delete merged.predictionLogUpdates;
  delete merged.falsifierUpdates;
  delete merged.auditTrailAdditions;
  delete merged.runHistoryAdditions;
  return merged;
}

async function fetchJson(url) {
  const response = await fetch(`${url}?ts=${Date.now()}`, { cache:'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function fetchOptionalJson(url) {
  try {
    return await fetchJson(url);
  } catch (error) {
    if (String(error.message).includes('HTTP 404')) return null;
    throw error;
  }
}

async function loadDashboard() {
  try {
    const [platform, daily, latest, day20, day21] = await Promise.all([
      fetchJson('data/dashboard.json'),
      fetchJson('data/daily-intelligence.json'),
      fetchOptionalJson('data/daily-intelligence-latest.json'),
      fetchOptionalJson('data/daily-intelligence-2026-07-20.json'),
      fetchOptionalJson('data/daily-intelligence-2026-07-21.json')
    ]);
    renderPlatform(platform);
    const mergedDaily = [latest, day20, day21].reduce((state, update) => mergeDaily(state, update), daily);
    renderDaily(mergedDaily);
  } catch (error) {
    showError(`Dashboard konnte nicht vollständig geladen werden: ${error.message}`);
  }
}

loadDashboard();