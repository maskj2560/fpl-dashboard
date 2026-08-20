// Små, rene middleware-byggere. Ligger utenfor server.js fordi den starter
// lytteren ved import og derfor ikke kan lastes i tester.

const IMMUTABLE = 'public, max-age=31536000, immutable';

// Fonten er uendret innhold og versjoneres for hånd i layout.ejs og style.css
// (`?v=1`). Bumpes den, bumpes denne — se DEPLOY.md.
export const FONT_VERSION = '1';

/**
 * Cache-Control for statiske filer. Kun versjonsstrenger vi selv serverer nå
 * får `immutable`: under en deploy-overlapp kan en gammel container bli spurt
 * om den NYE hashen, og svarer den immutable, låser Cloudflare gammelt
 * innhold under den nye URL-en til noen purger manuelt.
 */
export function cacheControlFor(v, assetVersion) {
  return typeof v === 'string' && (v === assetVersion || v === FONT_VERSION)
    ? IMMUTABLE
    : 'no-cache';
}

/** /api/* svarer JSON; klienten kaller res.json() og forventer {error}. */
function wantsJson(req) {
  return String(req.originalUrl ?? '').split('?')[0].startsWith('/api/');
}

/** Global feilhandler: JSON for API-ruter, HTML-feilside for sider. */
export function createErrorHandler({ version, assetVersion, startedAt }) {
  // eslint-disable-next-line no-unused-vars -- Express krever 4 argumenter for feil-middleware
  return (err, req, res, next) => {
    console.error('Uventet feil:', err);
    if (res.headersSent) return;

    if (wantsJson(req)) {
      res.status(500).json({ error: 'Noe gikk galt.' });
      return;
    }

    res.status(500);
    res.render('error', {}, (renderErr, body) => {
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
