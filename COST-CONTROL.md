# TAIL cost pause — 2026-09-16

Owner authorized pausing paid automatic reviews/translations, auditing costs and a bounded pilot.

## Production

- Four daily RSS collection runs remain; no OpenAI secret is supplied to that job.
- Hourly catch-up removed. No automatic review, translation, index or public snapshot rebuild.
- Existing admissions, forecasts, public snapshots and their evidence dates are preserved.
- `review-inbox.mjs` exits without writes unless explicitly invoked with `TAIL_PAID_REVIEW=pilot`.
- OpenAI account auto-recharge is unchanged; this repository cannot manage billing settings.

## Findings

Prior review requested web_search with tool_choice required and no tool-call/output caps.
The full baseline was resent for each candidate. Requests could retry on timeouts.
The 600-second batch budget started requests even with too little time left.
DE editorial ran without content caching; EN has a source-hash cache.
The receipt/usage review showed $15.49 web tool charges out of $24.99 total.

## Isolated pilot

Two candidates, sequential; at most two API attempts total and two built-in tool calls per response.
Model fixed to gpt-5-mini, low reasoning, 4,000 output tokens per response, request payload <=200 KB.
No automatic HTTP or timeout retry. Full 180-second request window required before starting.
Exact-request responses are cached before parsing/admission; unresolved attempts block same-request retry.
Returned token usage and tool calls logged even for incomplete responses. Timeout cost is marked unknown.
Existing admission/primary-source/duplicate/measurement gates remain unchanged.
Pilot results and cache are artifacts, not production publications. Cross-run retrieval cache reuse is not enabled yet.
These are resource limits, not a verified account-wide dollar cap.

The authorized one-time pilot completed. Its entire workflow job/trigger was removed afterward.
Scheduled and manual-dispatch runs now contain only the RSS collection job.

## Next decision

Do not resume automatic paid processing until the pilot's quality and usage are reviewed.
Direct-source retrieval and durable source-level caching remain future optimization work;
this change does not claim these are already implemented or quantify recurring savings.

## Observed pilot result

GitHub run: https://github.com/MikBrami/michaelthedens-website/actions/runs/35132831383

- 22 local and runner tests passed.
- Two reviews completed in 103 seconds, zero accepted signals, no timeout/retry.
- Two web tool calls total. Input 75,254 tokens (7,168 cached); output 4,889 tokens.
- Estimated standard API cost $0.0469787 before tax; not a reconciled invoice amount.
- Calculation: uncached input * $0.25/M + cached input * $0.025/M + output * $2/M + web calls * $0.01.
- Pricing: https://developers.openai.com/api/docs/models/gpt-5-mini and https://developers.openai.com/api/docs/pricing
- Small sample does not establish equivalent review quality or recurring savings.
- No pilot results were merged into production. The stored artifacts preserve the results.
- A separate RSS-only run verifies the final production workflow.
