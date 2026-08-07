import { createClerkClient } from '@clerk/backend';
import { next } from '@vercel/functions';

const PRIVATE_HOST = 'tail-daily-intelligence.michaelthedens.de';
const PRIVATE_PATHS = [
  '/tail-daily-intelligence',
  '/tail-intelligence'
];

function isProtectedRequest(url) {
  if (url.hostname === PRIVATE_HOST) return true;
  return PRIVATE_PATHS.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
}

function htmlResponse(status, title, message) {
  return new Response(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07101f;color:#eaf0ff;font:16px/1.6 system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:32px;border:1px solid #243553;border-radius:18px;background:#0d192b}h1{margin-top:0;color:#fff}a{color:#78a7ff}</style></head>
<body><main class="card"><p>TAIL Intelligence</p><h1>${title}</h1><p>${message}</p><p><a href="/">Zur öffentlichen TAIL-Seite</a></p></main></body></html>`, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

function signInRedirect(url, requestState) {
  const configured = process.env.CLERK_SIGN_IN_URL || requestState?.signInUrl;
  if (!configured) {
    return htmlResponse(503, 'Login wird eingerichtet', 'Der geschützte Zugang ist vorbereitet, aber noch nicht mit dem Anmeldedienst verbunden.');
  }

  const signInUrl = new URL(configured, url.origin);
  signInUrl.searchParams.set('redirect_url', url.toString());
  const headers = new Headers(requestState?.headers);
  headers.set('location', signInUrl.toString());
  headers.set('cache-control', 'private, no-store, max-age=0');
  headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(null, { status: 302, headers });
}

function allowedEmails() {
  return new Set((process.env.TAIL_ALLOWED_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (!isProtectedRequest(url)) return next();

  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const allowlist = allowedEmails();

  if (!secretKey || !publishableKey || allowlist.size === 0) {
    return htmlResponse(503, 'Login wird eingerichtet', 'TAIL Intelligence ist vorsorglich geschlossen, bis die Zugangsdaten vollständig hinterlegt sind.');
  }

  try {
    const clerk = createClerkClient({ secretKey, publishableKey });
    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [url.origin]
    });

    if (!requestState.isAuthenticated) return signInRedirect(url, requestState);

    const auth = requestState.toAuth();
    const user = await clerk.users.getUser(auth.userId);
    const userEmails = user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase());
    if (!userEmails.some((email) => allowlist.has(email))) {
      return htmlResponse(403, 'Kein Zugriff', 'Dieses Konto ist nicht für TAIL Intelligence freigeschaltet.');
    }

    return next();
  } catch (error) {
    console.error('TAIL Intelligence authentication failed', error);
    return htmlResponse(503, 'Login vorübergehend nicht verfügbar', 'Die Anmeldung konnte nicht sicher geprüft werden. Bitte versuche es später erneut.');
  }
}

export const config = {
  matcher: '/:path*',
  runtime: 'nodejs'
};
