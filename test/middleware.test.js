import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheControlFor, createErrorHandler, FONT_VERSION } from '../src/middleware.js';

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

// ---- P1-7: /api/*-feil skal svare JSON ------------------------------------

function fakeRes() {
  const res = {
    statusCode: null,
    headersSent: false,
    body: null,
    rendered: null,
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
