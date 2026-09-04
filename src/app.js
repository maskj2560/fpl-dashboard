import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { isGameUpdating, staleInfo } from './services/fplClient.js';
import { loadClubAssets } from './services/clubAssets.js';
import { formatDateTime, formatTime } from './services/format.js';
import {
  cacheControlFor,
  createErrorHandler,
  createSecurityHeaders,
  ICON_VERSION,
} from './middleware.js';
import indexRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import playersRouter from './routes/players.js';
import teamRouter from './routes/team.js';
import transfersRouter from './routes/transfers.js';
import leagueRouter from './routes/league.js';
import insightsRouter from './routes/insights.js';
import briefRouter from './routes/brief.js';
import apiRouter from './routes/api.js';
import liveRouter from './routes/live.js';
import newsRouter from './routes/news.js';
import { createCalendarHandler } from './routes/calendar.js';
import { createSwHandler, offlineHandler } from './routes/pwa.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Bygger den ferdig monterte Express-appen — og gjør ingenting annet.
 * Ren fabrikk: lytter aldri, starter ingen timere og registrerer ingen
 * signalhåndterere. Det er `src/server.js` sin jobb. Skillet gjør at hele
 * stacken kan startes på loopback i testene (test/app.test.js).
 */
export function createApp() {
  const app = express();

  // Versjon og oppstartstidspunkt vises i footeren. Oppstartstidspunktet er
  // deploy-tidspunktet i praksis: Coolify starter en ny container per push.
  const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const startedAt = formatDateTime(new Date().toISOString());

  // Innholdshash av CSS + JS. Endres en av filene, endres hashen — og dermed
  // `?v=`-en i layout.ejs. Da hentes en ny URL i stedet for at Cloudflare og
  // nettleseren serverer utdaterte assets etter deploy (QA-funn P0-1).
  const assetVersion = crypto
    .createHash('sha1')
    .update(fs.readFileSync(path.join(rootDir, 'public', 'style.css')))
    .update(fs.readFileSync(path.join(rootDir, 'public', 'app.js')))
    .digest('hex')
    .slice(0, 8);

  app.set('view engine', 'ejs');
  app.set('views', path.join(rootDir, 'views'));

  // Klubbgrafikk: mappa leses én gang; app.locals når alle views og partials
  // via res.render uten at rutene må sende det.
  app.locals.clubAssets = loadClubAssets(path.join(rootDir, 'public', 'img', 'clubs'));

  app.use(compression());
  // Sikkerhetshoder + CSP-nonce på alt, også assets. Må ligge før static.
  app.use(createSecurityHeaders());
  // POST-kroppene er små (/api/ai-rad tom, /api/scenarier < 1 kB) — taket
  // stopper bare misbruk. 413 svares som JSON av feilhandleren på /api.
  app.use(express.json({ limit: '32kb' }));
  app.use(
    express.static(path.join(rootDir, 'public'), {
      setHeaders(res) {
        // Versjonert URL → innholdet kan aldri endre seg, cache for alltid.
        // Uversjonert URL → må revalideres, ellers blir gamle filer liggende på
        // edge-cachen etter deploy.
        res.setHeader('Cache-Control', cacheControlFor(res.req?.query?.v, assetVersion));
      },
    }),
  );

  // res.renderPage(view, data): rendrer viewet og legger resultatet inn i
  // layout.ejs som `body` — vår layout-løsning uten ekstra avhengigheter.
  app.use((req, res, next) => {
    res.renderPage = (view, data = {}) => {
      res.render(view, data, (err, body) => {
        if (err) return next(err);
        // Alderstak (v1.4.0): alle sider måles mot bootstrap-taket; ruter med
        // strengere krav (live) sender sin egen staleSince i data.
        const stale = staleInfo();
        res.render('layout', {
          body,
          title: data.title ?? 'FPL-dashboard',
          // req.path er relativ til router-mounten (alltid '/' inne i f.eks.
          // /spillere), så nav-markeringen må bruke hele stien.
          path: req.originalUrl.split('?')[0],
          gameUpdating: isGameUpdating(),
          staleSince: data.staleSince !== undefined
            ? data.staleSince
            : stale?.tooOld ? formatTime(stale.fetchedIso) : null,
          version,
          assetVersion,
          iconVersion: ICON_VERSION,
          startedAt,
        });
      });
    };
    next();
  });

  app.use('/health', healthRouter);
  app.use('/', indexRouter);
  app.use('/spillere', playersRouter);
  app.use('/lag', teamRouter);
  app.use('/overganger', transfersRouter);
  app.use('/liga', leagueRouter);
  app.use('/innsikt', insightsRouter);
  app.use('/brief', briefRouter);
  app.use('/api', apiRouter);
  app.use('/live', liveRouter);
  app.use('/nyheter', newsRouter);
  // Kalenderabonnement (v1.9.0): webcal://<host>/kalender.ics — ren tekst, aldri cachet.
  app.get('/kalender.ics', createCalendarHandler({ version }));
  // PWA (v1.12.0): service worker med ekte asset-hash (no-store) + frakoblet-side.
  app.get('/sw.js', createSwHandler({ assetVersion }));
  app.get('/offline', offlineHandler);

  app.use((req, res) => {
    res.status(404).renderPage('404', { title: 'Ikke funnet' });
  });

  app.use(createErrorHandler({ version, assetVersion, startedAt }));

  return app;
}
