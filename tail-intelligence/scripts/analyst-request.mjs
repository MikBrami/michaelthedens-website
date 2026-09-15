const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
export async function analystRequest(url, options, {deadline, fetchImpl=fetch, wait=sleep, onRetry=()=>{}, parseJson=false, timeoutMs=180000}) {
  let timeoutRetries = 0;
  for(let attempt=0;attempt<3;attempt++) {
    const remaining=deadline-Date.now();
    if(remaining<=0) throw new Error('Analyst run budget exhausted');
    const signal=AbortSignal.timeout(Math.min(timeoutMs,remaining));
    let response;
    try {
      response=await fetchImpl(url,{...options,signal});
      // Read the complete response within the same timeout and retry boundary.
      if(response.ok) return parseJson ? await response.json() : response;
    } catch(cause) {
      const timedOut=cause?.name==='TimeoutError' || (signal.aborted && signal.reason?.name==='TimeoutError');
      if(!timedOut) throw cause;
      const failure=new Error(`Analyst request timed out after ${Math.min(timeoutMs,remaining)}ms`,{cause});
      const delay=1000;
      // One timeout retry, only when a full attempt still fits the run budget.
      if(timeoutRetries>=1 || attempt===2 || Date.now()+delay+timeoutMs>=deadline) throw failure;
      timeoutRetries++;
      onRetry({status:'timeout',code:'request_timeout',delayMs:delay,attempt:attempt+1});
      await wait(delay);
      continue;
    }
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
