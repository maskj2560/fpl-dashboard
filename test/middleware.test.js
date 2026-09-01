import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheControlFor,
  createErrorHandler,
  createShutdown,
  FONT_VERSION,
  IMG_VERSION,
  noStore,
} from '../src/middleware.js';
import * as mw from '../src/middleware.js';
import fs from 'node:fs';

// ---- v1.8.3: sikkerhetshoder + CSP ---------------------------------------------

function fakeHeaderRes() {
  const headers = {};
  return {
    headers,
    locals: {},
    setHeader: (navn, verdi) => { headers[navn] = verdi; },
  };
}

test('securityHeaders setter CSP med per-forespørsel-nonce og speiler den i res.locals', () => {
  const handler = mw.createSecurityHeaders({ nonce: () => 'abc123' });
  const res = fakeHeaderRes();
  let nextCalled = false;
  handler({}, res, () => { nextCalled = true; });
  assert.ok(nextCalled, 'next() ble ikke kalt');
  assert.equal(res.locals.cspNonce, 'abc123');
  assert.match(res.headers['Content-Security-Policy'], /script-src 'self' 'nonce-abc123'/);
});

test('securityHeaders gir ny nonce for hver forespørsel', () => {
  const handler = mw.createSecurityHeaders();
  const a = fakeHeaderRes();
  const b = fakeHeaderRes();
  handler({}, a, () => {});
  handler({}, b, () => {});
  assert.notEqual(a.locals.cspNonce, b.locals.cspNonce);
  assert.ok(a.locals.cspNonce.length >= 16, 'noncen er for kort');
  assert.match(a.locals.cspNonce, /^[A-Za-z0-9+/=]+$/, 'noncen er ikke base64');
});

test('securityHeaders setter nosniff, DENY, Referrer-Policy og Permissions-Policy', () => {
  const res = fakeHeaderRes();
  mw.createSecurityHeaders()({}, res, () => {});
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.equal(res.headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(res.headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(res.headers['Permissions-Policy'], /geolocation=\(\)/);
});

test('CSP-en har aldri unsafe-inline for script og alltid frame-ancestors none', () => {
  const csp = mw.buildCsp('n0nce');
  const directives = Object.fromEntries(
    csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...rest] = d.split(/\s+/);
      return [name, rest.join(' ')];
    }),
  );
  assert.equal(directives['default-src'], "'self'");
  assert.equal(directives['script-src'], "'self' 'nonce-n0nce'");
  assert.ok(!directives['script-src'].includes('unsafe-inline'));
  assert.equal(directives['frame-ancestors'], "'none'");
  assert.equal(directives['object-src'], "'none'");
  assert.equal(directives['base-uri'], "'self'");
  assert.equal(directives['form-action'], "'self'");
  // Inline style-attributter finnes i players.ejs (--andel) og league.ejs
  // (seriefarge); SVG-favicon er en data:-URL.
  assert.equal(directives['style-src'], "'self' 'unsafe-inline'");
  assert.equal(directives['img-src'], "'self' data:");
  assert.equal(directives['connect-src'], "'self'");
  assert.equal(directives['font-src'], "'self'");
});

test('server.js monterer securityHeaders før rutene og begrenser JSON-kroppen til 32kb', () => {
  const src = fs.readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  const headersAt = src.indexOf('app.use(createSecurityHeaders())');
  const jsonAt = src.indexOf("app.use(express.json({ limit: '32kb' }))");
  const staticAt = src.indexOf('express.static(');
  assert.ok(headersAt > 0, 'createSecurityHeaders() monteres ikke');
  assert.ok(jsonAt > 0, 'express.json mangler 32kb-taket');
  assert.ok(headersAt < jsonAt && headersAt < staticAt, 'sikkerhetshodene må monteres før JSON-parser og static');
});

// ---- P1-10: bare kjente versjonsstrenger får immutable --------------------

const IMMUTABLE = 'public, max-age=31536000, immutable';

test('cacheControlFor gir immutable for gjeldende asset-hash og fontversjonen', () => {
  assert.equal(cacheControlFor('ead67020', 'ead67020'), IMMUTABLE);
  assert.equal(cacheControlFor(FONT_VERSION, 'ead67020'), IMMUTABLE);
});

test('cacheControlFor gir no-cache for en annen velformet hash', () => {
  // Deploy-overlapp: gammel container blir spurt om den nye hashen. Svarer den
  // immutable, cacher Cloudflare gammelt innhold under ny URL til manuell purge.
  assert.equal(cacheControlFor('deadbeef', 'ead67020'), 'no-cache');
  assert.equal(cacheControlFor('4711', 'ead67020'), 'no-cache');
});

test('cacheControlFor gir no-cache uten versjon og for søppelverdier', () => {
  assert.equal(cacheControlFor(undefined, 'ead67020'), 'no-cache');
  assert.equal(cacheControlFor(['ead67020'], 'ead67020'), 'no-cache');
  assert.equal(cacheControlFor('../../etc/passwd', 'ead67020'), 'no-cache');
});

test('cacheControlFor gir immutable for bildeversjonen (klubbgrafikk)', () => {
  assert.equal(IMG_VERSION, '2627');
  assert.equal(cacheControlFor(IMG_VERSION, 'ead67020'), IMMUTABLE);
  assert.equal(cacheControlFor('2526', 'ead67020'), 'no-cache');
});

// ---- P1-7: /api/*-feil skal svare JSON ------------------------------------

function fakeRes() {
  const res = {
    statusCode: null,
    headersSent: false,
    body: null,
    rendered: null,
    renderCalls: [],
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    type() {
      return res;
    },
    send(html) {
      res.body = html;
      return res;
    },
    render(view, locals, cb) {
      res.rendered = view;
      res.renderCalls.push({ view, locals });
      cb(null, `<${view}>`);
    },
  };
  return res;
}

const handler = createErrorHandler({ version: '9.9.9', assetVersion: 'abc12345', startedAt: 'nå' });
const quiet = () => {};

test('feil på /api-sti svarer JSON, ikke HTML', () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = quiet;
  try {
    handler(new Error('boom'), { path: '/live.json', originalUrl: '/api/live.json' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Noe gikk galt.' });
  assert.equal(res.rendered, null, 'ingen HTML-rendring for API-ruter');
});

test('feil på vanlig side rendrer fortsatt feilsiden', () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = quiet;
  try {
    handler(new Error('boom'), { path: '/', originalUrl: '/lag' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.equal(res.rendered, 'layout');
  assert.equal(res.body, '<layout>');
});

test('feilhandleren gjør ingenting når svaret alt er sendt', () => {
  const res = fakeRes();
  res.headersSent = true;
  const originalError = console.error;
  console.error = quiet;
  try {
    handler(new Error('boom'), { path: '/', originalUrl: '/api/brief.json' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, null);
  assert.equal(res.body, null);
});

// ---- v1.3.5: ryddig avslutning ------------------------------------------

function fakeServer() {
  return {
    closed: false,
    cb: null,
    close(cb) {
      this.closed = true;
      this.cb = cb;
    },
  };
}

test('createShutdown lukker serveren og avslutter med kode 0', () => {
  const server = fakeServer();
  const exits = [];
  const handler = createShutdown({ server, exit: (c) => exits.push(c), log: () => {} });
  handler('SIGTERM');
  assert.equal(server.closed, true);
  server.cb();
  assert.deepEqual(exits, [0]);
});

test('createShutdown ignorerer signal nummer to', () => {
  const server = fakeServer();
  let closeCalls = 0;
  server.close = (cb) => {
    closeCalls += 1;
    server.cb = cb;
  };
  const handler = createShutdown({ server, exit: () => {}, log: () => {} });
  handler('SIGTERM');
  handler('SIGINT');
  assert.equal(closeCalls, 1);
});

test('createShutdown tvinger avslutning når forbindelser henger', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const server = fakeServer(); // close-callbacken kalles aldri
  const exits = [];
  const handler = createShutdown({ server, exit: (c) => exits.push(c), log: () => {} });
  handler('SIGTERM');
  t.mock.timers.tick(10_000);
  assert.deepEqual(exits, [1]);
});

// ---- v1.3.6: FPLs oppdateringsvindu får sin egen 503-side ----------------

function updatingError() {
  const err = new Error('FPL-API-et oppdateres (503)');
  err.status = 503;
  return err;
}

test('503 fra FPL gir 503 og egen feilmelding på /api-sti', () => {
  const res = fakeRes();
  handler(updatingError(), { path: '/', originalUrl: '/api/brief.json' }, res, () => {});
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {
    error: 'FPL-API-et oppdateres — prøv igjen om noen minutter.',
  });
});

test('503 fra FPL gir 503 og forklarende side i nettleseren', () => {
  const res = fakeRes();
  handler(updatingError(), { path: '/', originalUrl: '/' }, res, () => {});
  assert.equal(res.statusCode, 503);
  const errorView = res.renderCalls.find((c) => c.view === 'error');
  assert.ok(errorView, 'error-viewet ble ikke rendret');
  assert.equal(errorView.locals.code, 503);
  assert.equal(errorView.locals.heading, 'FPL oppdaterer spillet');
  assert.match(errorView.locals.message, /prøv igjen om noen minutter/);
});

test('en vanlig feil gir fortsatt 500 og den generiske feilsiden', () => {
  const res = fakeRes();
  const originalError = console.error;
  console.error = quiet;
  try {
    handler(new Error('boom'), { path: '/', originalUrl: '/' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  const errorView = res.renderCalls.find((c) => c.view === 'error');
  assert.equal(errorView.locals.code, 500);
  assert.equal(errorView.locals.heading, 'Noe gikk galt');
  assert.equal(errorView.locals.message, null);
});

// ---- v1.7.1: API-svar skal aldri caches av nettleseren --------------------

test('noStore setter Cache-Control: no-store og slipper forespørselen videre', () => {
  const headers = {};
  const res = { setHeader: (navn, verdi) => { headers[navn] = verdi; } };
  let neste = false;
  noStore({}, res, () => { neste = true; });
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.equal(neste, true);
});
