const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
export async function analystRequest(url, options, {deadline, fetchImpl=fetch, wait=sleep, onRetry=()=>{}}) {
  for(let attempt=0;attempt<3;attempt++) {
    const remaining=deadline-Date.now();
    if(remaining<=0) throw new Error('Analyst run budget exhausted');
    const response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(Math.min(180000,remaining))});
    if(response.ok)return response;
    const body=await response.json().catch(()=>({}));
    const code=body.error?.code || body.error?.type || 'unknown';
    const message=String(body.error?.message||'').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,400);
    const failure=new Error(`Analyst HTTP ${response.status} (${code}): ${message}`);
    const retryable=(response.status===429 && code!=='insufficient_quota') || response.status>=500;
    const retryHeader=response.headers?.get('retry-after');
    const retryAfter=retryHeader ? (Number.isFinite(Number(retryHeader))?Number(retryHeader)*1000:Date.parse(retryHeader)-Date.now()) : 0;
    const delay=Math.max(1000,retryAfter||15000*(attempt+1));
    if(!retryable || attempt===2 || Date.now()+delay>=deadline)throw failure;
    onRetry({status:response.status,code,delayMs:delay,attempt:attempt+1});
    await wait(delay);
  }
}
