// Små, rene middleware-byggere. Ligger utenfor server.js fordi den starter
// lytteren ved import og derfor ikke kan lastes i tester.

const IMMUTABLE = 'public, max-age=31536000, immutable';

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
