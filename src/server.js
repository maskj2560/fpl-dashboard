import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import config from './config.js';
import { isGameUpdating } from './services/fplClient.js';
import { loadClubAssets } from './services/clubAssets.js';
import { formatDateTime } from './services/format.js';
import { cacheControlFor, createErrorHandler, createShutdown } from './middleware.js';
import indexRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import playersRouter from './routes/players.js';
import teamRouter from './routes/team.js';
import transfersRouter from './routes/transfers.js';
import leagueRouter from './routes/league.js';
import briefRouter from './routes/brief.js';
import apiRouter from './routes/api.js';
import liveRouter from './routes/live.js';
import newsRouter from './routes/news.js';
import { startScheduler } from './services/notify.js';
import { startAiRefresher } from './services/refresh.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
app.use(express.json());
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
      res.render('layout', {
        body,
        title: data.title ?? 'FPL-dashboard',
        // req.path er relativ til router-mounten (alltid '/' inne i f.eks.
        // /spillere), så nav-markeringen må bruke hele stien.
        path: req.originalUrl.split('?')[0],
        gameUpdating: isGameUpdating(),
        version,
        assetVersion,
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
app.use('/brief', briefRouter);
app.use('/api', apiRouter);
app.use('/live', liveRouter);
app.use('/nyheter', newsRouter);

app.use((req, res) => {
  res.status(404).renderPage('404', { title: 'Ikke funnet' });
});

app.use(createErrorHandler({ version, assetVersion, startedAt }));

const server = app.listen(config.port, () => {
  console.log(`FPL-dashboard lytter på http://localhost:${config.port}`);
});

// Ryddig avslutning ved deploy/omstart — uten dette må Docker SIGKILL-e.
const shutdown = createShutdown({ server });
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Inaktiv uten DISCORD_WEBHOOK_URL.
startScheduler();

// Inaktiv uten ANTHROPIC_API_KEY. Holder AI-tekstene varme på timer, slik at
// ingen sidevisning venter på en Claude-rundtur.
startAiRefresher();

export default app;
