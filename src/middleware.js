// Små, rene middleware-byggere. Ligger utenfor server.js fordi den starter
// lytteren ved import og derfor ikke kan lastes i tester.

import crypto from 'node:crypto';

const IMMUTABLE = 'public, max-age=31536000, immutable';

// ---- Sikkerhetshoder (v1.8.3) ---------------------------------------------

/**
 * Content-Security-Policy. script-src er streng: kun egne filer + tema-
 * scriptet i layout.ejs via en nonce per forespørsel (ingen 'unsafe-inline').
 * style-src tillater inline fordi players.ejs (--andel) og league.ejs
 * (seriefarge) setter style-attributter; img-src data: er SVG-favicon-en.
 * worker-src/manifest-src arver default-src, så PWA-en trenger ingen unntak.
 */
export function buildCsp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

function randomNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Setter sikkerhetshodene på alle svar og legger noncen i res.locals, som
 * Express fletter inn i alle res.render-kall (renderPage, 404, feilsiden).
 * Monteres før static og rutene, så også assets får hodene.
 */
export function createSecurityHeaders({ nonce = randomNonce } = {}) {
  return (req, res, next) => {
    const n = nonce();
    res.locals.cspNonce = n;
    res.setHeader('Content-Security-Policy', buildCsp(n));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    next();
  };
}

// Fonten er uendret innhold og versjoneres for hånd i layout.ejs og style.css
// (`?v=1`). Bumpes den, bumpes denne — se DEPLOY.md.
export const FONT_VERSION = '1';

// Klubbgrafikken (public/img/clubs/) har stabile filnavn per klubbkode, men
// draktene byttes hver sesong. Versjonen er sesongen: bumpes i samme commit
// som `npm run fetch-clubs` kjøres, ellers serveres fjorårets drakter som
// immutable fra Cloudflare.
export const IMG_VERSION = '2627';

/**
 * Cache-Control for statiske filer. Kun versjonsstrenger vi selv serverer nå
 * får `immutable`: under en deploy-overlapp kan en gammel container bli spurt
 * om den NYE hashen, og svarer den immutable, låser Cloudflare gammelt
 * innhold under den nye URL-en til noen purger manuelt.
 */
export function cacheControlFor(v, assetVersion) {
  return typeof v === 'string' &&
    (v === assetVersion || v === FONT_VERSION || v === IMG_VERSION)
    ? IMMUTABLE
    : 'no-cache';
}

/**
 * API-JSON skal aldri caches av nettleseren: serverens TTL-cache styrer
 * ferskheten, og et nettleser-cachet /live.json ville vist gamle poeng
 * under polling. no-store på hele API-routeren.
 */
export function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** /api/* svarer JSON; klienten kaller res.json() og forventer {error}. */
function wantsJson(req) {
  return String(req.originalUrl ?? '').split('?')[0].startsWith('/api/');
}

/** Global feilhandler: JSON for API-ruter, HTML-feilside for sider. */
export function createErrorHandler({ version, assetVersion, startedAt }) {
  // eslint-disable-next-line no-unused-vars -- Express krever 4 argumenter for feil-middleware
  return (err, req, res, next) => {
    // FPLs oppdateringsvindu er en normal driftstilstand, ikke en feil hos
    // oss — den skal verken logge stacktrace eller vise den generiske siden.
    const updating = err?.status === 503;
    if (!updating) console.error('Uventet feil:', err);
    if (res.headersSent) return;

    if (wantsJson(req)) {
      res.status(updating ? 503 : 500).json({
        error: updating
          ? 'FPL-API-et oppdateres — prøv igjen om noen minutter.'
          : 'Noe gikk galt.',
      });
      return;
    }

    res.status(updating ? 503 : 500);
    const locals = updating
      ? {
          code: 503,
          heading: 'FPL oppdaterer spillet',
          message: 'Dataene er ikke tilgjengelige riktig ennå — prøv igjen om noen minutter.',
        }
      : { code: 500, heading: 'Noe gikk galt', message: null };
    res.render('error', locals, (renderErr, body) => {
      if (renderErr) return res.type('text/plain').send('Noe gikk galt.');
      res.render(
        'layout',
        {
          body,
          title: 'Feil',
          path: req.originalUrl.split('?')[0],
          gameUpdating: false,
          version,
          assetVersion,
          startedAt,
        },
        (layoutErr, html) => {
          if (layoutErr) return res.type('text/plain').send('Noe gikk galt.');
          res.send(html);
        },
      );
    });
  };
}

/**
 * Ryddig avslutning: lukker HTTP-serveren på SIGTERM/SIGINT slik at aktive
 * forespørsler fullføres og Docker slipper å SIGKILL-e etter stopp-timeouten
 * (målt 25. aug: PID 1 uten handler ignorerer signalet). Nødutgang etter
 * timeoutMs hvis åpne forbindelser henger igjen.
 */
export function createShutdown({
  server,
  exit = process.exit,
  log = console.log,
  timeoutMs = 10_000,
}) {
  let shuttingDown = false;
  return (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} mottatt — lukker serveren`);
    const force = setTimeout(() => {
      log('Åpne forbindelser henger igjen — tvinger avslutning');
      exit(1);
    }, timeoutMs);
    force.unref?.();
    server.close(() => {
      log('Serveren lukket ryddig');
      exit(0);
    });
  };
}
