import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import config from './config.js';
import { isGameUpdating } from './services/fplClient.js';
import indexRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import playersRouter from './routes/players.js';
import teamRouter from './routes/team.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));

app.use(compression());
app.use(express.static(path.join(rootDir, 'public'), { maxAge: '1d' }));

// res.renderPage(view, data): rendrer viewet og legger resultatet inn i
// layout.ejs som `body` — vår layout-løsning uten ekstra avhengigheter.
app.use((req, res, next) => {
  res.renderPage = (view, data = {}) => {
    res.render(view, data, (err, body) => {
      if (err) return next(err);
      res.render('layout', {
        body,
        title: data.title ?? 'FPL-dashboard',
        path: req.path,
        gameUpdating: isGameUpdating(),
      });
    });
  };
  next();
});

app.use('/health', healthRouter);
app.use('/', indexRouter);
app.use('/spillere', playersRouter);
app.use('/lag', teamRouter);

app.use((req, res) => {
  res.status(404).renderPage('404', { title: 'Ikke funnet' });
});

// eslint-disable-next-line no-unused-vars -- Express krever 4 argumenter for feil-middleware
app.use((err, req, res, next) => {
  console.error('Uventet feil:', err);
  if (res.headersSent) return;
  res.status(500);
  res.render('error', {}, (renderErr, body) => {
    if (renderErr) return res.type('text/plain').send('Noe gikk galt.');
    res.render(
      'layout',
      { body, title: 'Feil', path: req.path, gameUpdating: false },
      (layoutErr, html) => {
        if (layoutErr) return res.type('text/plain').send('Noe gikk galt.');
        res.send(html);
      },
    );
  });
});

app.listen(config.port, () => {
  console.log(`FPL-dashboard lytter på http://localhost:${config.port}`);
});

export default app;
