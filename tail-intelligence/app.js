const $ = id => document.getElementById(id);
const fmtDate = value => value ? new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:value.includes('T')?'short':undefined}).format(new Date(value)) : '–';
const statusLabel = s => ({red:'Rot',orange:'Orange',yellow:'Gelb',green:'Grün'})[s] ?? s;

async function loadDashboard(){
  try{
    const response = await fetch(`data/dashboard.json?ts=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const d = await response.json();
    const ageDays = (Date.now()-new Date(d.lastSuccessfulUpdate).getTime())/86400000;
    const stale = ageDays>2;

    $('summary').textContent=d.executiveSummary;
    $('tail-index').textContent=d.tailIndex;
    $('tail-index').className=d.indexStatus;
    $('index-status').textContent=`Ampel: ${statusLabel(d.indexStatus)}`;
    $('data-as-of').textContent=fmtDate(d.dataAsOf);
    $('last-update').textContent=fmtDate(d.lastSuccessfulUpdate);
    $('new-articles').textContent=d.newlyProcessedArticles;
    $('process-status').textContent=d.processStatus==='ok'&&!stale?'🟢 Erfolgreich':stale?'🟠 Veraltet':'🔴 Fehler';

    if(d.processStatus!=='ok'||stale){
      const box=$('error-banner'); box.classList.remove('hidden');
      box.textContent=d.error||`Achtung: Die letzte erfolgreiche Aktualisierung liegt ${Math.floor(ageDays)} Tage zurück. Die angezeigten Daten können veraltet sein.`;
    }

    $('markets').innerHTML=d.markets.map(m=>`<article><div class="metric"><div><div class="tag ${m.status}">${statusLabel(m.status)}</div><h3>${m.label}</h3></div><span class="lamp ${m.status}"></span></div><div class="score ${m.status}">${m.score}</div><small>${m.signals} Signale</small></article>`).join('');
    $('manufacturers').innerHTML=d.manufacturers.map((m,i)=>`<article><div class="row"><strong>${i+1}. ${m.name}</strong><span>${m.score}</span></div><div class="bar"><i style="width:${m.score}%"></i></div><small>${m.mentions} Nennungen</small></article>`).join('');
    $('forecasts').innerHTML=d.forecasts.map(f=>`<article><div class="row"><strong>${f.market}</strong><span>${f.horizon}</span></div><p>${f.thesis}</p><small>Konfidenz ${f.confidence}% · ${f.direction==='strong_up'?'stark steigend':'steigend'}</small></article>`).join('');
    $('signals').innerHTML=d.topSignals.map(s=>`<article class="${s.status}"><div class="row"><span class="tag">${fmtDate(s.date)}</span><strong>${s.score}/100</strong></div><h3>${s.title}</h3><p>${s.summary}</p><p><strong>TAIL:</strong> ${s.analysis}</p></article>`).join('');
  }catch(error){
    $('process-status').textContent='🔴 Fehler';
    const box=$('error-banner'); box.classList.remove('hidden');
    box.textContent=`Dashboard konnte nicht aktualisiert werden: ${error.message}. Veraltete Daten werden nicht als aktuell ausgegeben.`;
  }
}
loadDashboard();
