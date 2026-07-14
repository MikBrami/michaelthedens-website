const $ = id => document.getElementById(id);
const fmtDate = value => {
  if (!value) return '–';
  const date = new Date(value.includes?.('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: value.includes?.('T') ? 'short' : undefined }).format(date);
};
const statusLabel = s => ({ red: 'Rot', orange: 'Orange', yellow: 'Gelb', green: 'Grün', ok: 'OK', warning: 'Warnung', error: 'Fehler', current: 'Aktuell', stale: 'Veraltet', invalid: 'Ungültig' })[s] ?? s;
const processIcon = s => ({ ok: '🟢', warning: '🟠', error: '🔴' })[s] ?? '⚪';
const directionLabel = d => ({ strong_up: 'stark steigend', up: 'steigend', watch: 'beobachten', stable: 'stabil', unknown: 'unbekannt' })[d] ?? d;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function showError(message) {
  const box = $('error-banner');
  box.classList.remove('hidden');
  box.textContent = message;
}

async function loadDashboard() {
  try {
    const response = await fetch(`data/dashboard.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const d = await response.json();

    $('summary').textContent = d.executiveSummary || 'Keine Executive Summary verfügbar.';
    $('tail-index').textContent = d.tailIndex ?? '–';
    $('tail-index').className = d.indexStatus || '';
    $('index-status').textContent = `Ampel: ${statusLabel(d.indexStatus)}`;
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
      showError(warningText || 'TAIL meldet einen Warn- oder Fehlerstatus. Veraltete Daten werden nicht als aktuell ausgegeben.');
    }

    $('pipeline').innerHTML = (d.pipeline?.steps || []).map(step => `
      <article>
        <div class="row"><strong>${processIcon(step.status)} ${escapeHtml(step.label)}</strong><span>${statusLabel(step.status)}</span></div>
        <small>${escapeHtml(step.detail)}</small>
      </article>
    `).join('');

    $('markets').innerHTML = (d.markets || []).map(m => `
      <article>
        <div class="metric"><div><div class="tag ${m.status}">${statusLabel(m.status)}</div><h3>${escapeHtml(m.label)}</h3></div><span class="lamp ${m.status}"></span></div>
        <div class="score ${m.status}">${m.score}</div><small>${m.signals} Signale</small>
      </article>
    `).join('');

    $('manufacturers').innerHTML = (d.manufacturers || []).map((m, i) => `
      <article><div class="row"><strong>${i + 1}. ${escapeHtml(m.name)}</strong><span>${m.score}</span></div><div class="bar"><i style="width:${m.score}%"></i></div><small>${m.mentions} Nennungen</small></article>
    `).join('');

    $('forecasts').innerHTML = (d.forecasts || []).map(f => `
      <article>
        <div class="row"><strong>${escapeHtml(f.market)}</strong><span>${escapeHtml(f.horizon)}</span></div>
        <p>${escapeHtml(f.keyThesis || f.thesis)}</p>
        <small>Score ${f.relevanceScore ?? '–'} · Konfidenz ${f.confidenceScore ?? f.confidence ?? '–'}% · Momentum ${f.momentum ?? '–'} · ${directionLabel(f.direction)}</small>
      </article>
    `).join('');

    $('signals').innerHTML = (d.topSignals || []).map(s => `
      <article class="${s.status}"><div class="row"><span class="tag">${fmtDate(s.date)}</span><strong>${s.score}/100</strong></div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.summary)}</p><p><strong>TAIL:</strong> ${escapeHtml(s.analysis)}</p></article>
    `).join('');
  } catch (error) {
    $('process-status').textContent = '🔴 Fehler';
    showError(`Dashboard konnte nicht aktualisiert werden: ${error.message}. Veraltete Daten werden nicht als aktuell ausgegeben.`);
  }
}

loadDashboard();
