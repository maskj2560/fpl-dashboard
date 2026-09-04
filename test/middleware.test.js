import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheControlFor,
  createErrorHandler,
  createShutdown,
  FONT_VERSION,
  IMG_VERSION,
  ICON_VERSION,
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

test('app.js monterer securityHeaders før rutene og begrenser JSON-kroppen til 32kb', () => {
  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const headersAt = src.indexOf('app.use(createSecurityHeaders())');
  const jsonAt = src.indexOf("app.use(express.json({ limit: '32kb' }))");
  const staticAt = src.indexOf('express.static(');
  assert.ok(headersAt > 0, 'createSecurityHeaders() monteres ikke');
  assert.ok(jsonAt > 0, 'express.json mangler 32kb-taket');
  assert.ok(headersAt < jsonAt && headersAt < staticAt, 'sikkerhetshodene må monteres før JSON-parser og static');
});

// ---- v1.8.3: takstbegrensning på skrivende API-kall -------------------------

function fakeLimitRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: (navn, verdi) => { res.headers[navn] = verdi; },
    status: (code) => { res.statusCode = code; return res; },
    json: (body) => { res.body = body; return res; },
  };
  return res;
}

function fakeReq(method, headers = {}, remoteAddress = '10.0.0.1') {
  return { method, headers, socket: { remoteAddress } };
}

test('rateLimiter slipper GET gjennom uansett', () => {
  const limiter = mw.createRateLimiter({ max: 2 });
  let passed = 0;
  for (let i = 0; i < 50; i++) limiter(fakeReq('GET'), fakeLimitRes(), () => { passed++; });
  assert.equal(passed, 50);
});

test('rateLimiter svarer 429 med Retry-After etter maks POST i vinduet', () => {
  const limiter = mw.createRateLimiter({ max: 3, windowMs: 60_000, now: () => 1_000_000 });
  let passed = 0;
  for (let i = 0; i < 3; i++) limiter(fakeReq('POST'), fakeLimitRes(), () => { passed++; });
  assert.equal(passed, 3);
  const res = fakeLimitRes();
  let nextCalled = false;
  limiter(fakeReq('DELETE'), res, () => { nextCalled = true; });
  assert.equal(nextCalled, false, 'fjerde kall skulle stoppes');
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '60');
  assert.match(res.body.error, /For mange forespørsler/);
});

test('rateLimiter nullstiller telleren når vinduet er over', () => {
  let t = 0;
  const limiter = mw.createRateLimiter({ max: 1, windowMs: 1_000, now: () => t });
  let passed = 0;
  limiter(fakeReq('POST'), fakeLimitRes(), () => { passed++; });
  limiter(fakeReq('POST'), fakeLimitRes(), () => { passed++; });
  assert.equal(passed, 1);
  t = 1_000;
  limiter(fakeReq('POST'), fakeLimitRes(), () => { passed++; });
  assert.equal(passed, 2, 'nytt vindu skulle slippe kallet gjennom');
});

test('rateLimiter teller per IP, ikke globalt', () => {
  const limiter = mw.createRateLimiter({ max: 1, now: () => 0 });
  let passed = 0;
  limiter(fakeReq('POST', {}, '10.0.0.1'), fakeLimitRes(), () => { passed++; });
  limiter(fakeReq('POST', {}, '10.0.0.2'), fakeLimitRes(), () => { passed++; });
  limiter(fakeReq('POST', {}, '10.0.0.1'), fakeLimitRes(), () => { passed++; });
  assert.equal(passed, 2);
});

test('clientIp foretrekker CF-Connecting-IP foran X-Forwarded-For og socket', () => {
  assert.equal(
    mw.clientIp(fakeReq('POST', { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8, 9.9.9.9' })),
    '1.2.3.4',
  );
  assert.equal(mw.clientIp(fakeReq('POST', { 'x-forwarded-for': '5.6.7.8, 9.9.9.9' })), '5.6.7.8');
  assert.equal(mw.clientIp(fakeReq('POST', {}, '10.0.0.7')), '10.0.0.7');
  assert.equal(mw.clientIp({ method: 'POST', headers: {} }), 'ukjent');
});

// ---- P1-10: bare kjente versjonsstrenger får immutable --------------------

const IMMUTABLE = 'public, max-age=31536000, immutable';

test('cacheControlFor gir immutable for gjeldende asset-hash og fontversjonen', () => {
  assert.equal(cacheControlFor('ead67020', 'ead67020'), IMMUTABLE);
  assert.equal(cacheControlFor(FONT_VERSION, 'ead67020'), IMMUTABLE);
});

test('cacheControlFor gir immutable for ikonversjonen (PWA, v1.12.0)', () => {
  assert.equal(typeof ICON_VERSION, 'string');
  assert.equal(cacheControlFor(ICON_VERSION, 'ead67020'), IMMUTABLE);
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

// v1.8.3 (røyktestfunn): body-parser kaster 413/400 med err.status. De er
// klientfeil, ikke krasj — riktig status, JSON-feil og ingen stacktrace.
test('for stor kropp (413 fra body-parser) svares med 413 JSON uten stacktrace', () => {
  const res = fakeRes();
  const err = Object.assign(new Error('request entity too large'), { status: 413, type: 'entity.too.large' });
  let logged = 0;
  const originalError = console.error;
  console.error = () => { logged += 1; };
  try {
    handler(err, { path: '/scenarier', originalUrl: '/api/scenarier' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 413);
  assert.deepEqual(res.body, { error: 'Forespørselen er for stor.' });
  assert.equal(logged, 0, 'klientfeil skal ikke logges som krasj');
});

test('ugyldig JSON (400 fra body-parser) svares med 400 JSON', () => {
  const res = fakeRes();
  const err = Object.assign(new Error('Unexpected token'), { status: 400, type: 'entity.parse.failed' });
  const originalError = console.error;
  console.error = quiet;
  try {
    handler(err, { path: '/scenarier', originalUrl: '/api/scenarier' }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Ugyldig forespørsel.' });
});

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
