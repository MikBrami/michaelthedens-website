import { next } from '@vercel/functions';

const PRIVATE_ORIGIN = 'https://michaelthedens-website-git-agent-priv-e7b9d6-mikbramis-projects.vercel.app';
const PRIVATE_PATHS = [
  '/tail-daily-intelligence',
  '/tail-intelligence',
  '/mtai-dashboard'
];

function isProtectedRequest(url) {
  return PRIVATE_PATHS.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
}

function closedResponse() {
  return new Response(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>MT·AI Intelligence</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07101f;color:#eaf0ff;font:16px/1.6 system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:32px;border:1px solid #243553;border-radius:18px;background:#0d192b}h1{margin-top:0;color:#fff}a{color:#78a7ff}</style></head>
<body><main class="card"><p>MT·AI Intelligence</p><h1>Zugang vorübergehend geschlossen</h1><p>Der private Zugang wird gerade bereitgestellt.</p><p><a href="/">Zur öffentlichen Homepage</a></p></main></body></html>`, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (!isProtectedRequest(url)) return next();

  // Preview deployments are protected by Vercel Authentication. Production
  // never serves private files directly; it redirects into that protected gate.
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') return next();
  if (!PRIVATE_ORIGIN) return closedResponse();

  const target = new URL(`${url.pathname}${url.search}`, `${PRIVATE_ORIGIN}/`);
  return new Response(null, {
    status: 307,
    headers: {
      location: target.toString(),
      'cache-control': 'private, no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

export const config = {
  matcher: '/:path*',
  runtime: 'nodejs'
};
