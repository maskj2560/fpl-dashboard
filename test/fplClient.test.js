import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clear } from '../src/services/cache.js';
import { getBootstrap, getLive, isGameUpdating, FplError } from '../src/services/fplClient.js';

// Mocker global fetch — ingen nettverkskall i tester.
const originalFetch = globalThis.fetch;
let fetchCalls;

function mockFetch(handler) {
  globalThis.fetch = async (url, opts) => {
    fetchCalls.push({ url: String(url), opts });
    return handler(fetchCalls.length);
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  clear();
  fetchCalls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('vellykket kall returnerer data og sender nettleser-User-Agent', async () => {
  mockFetch(() => jsonResponse({ events: [] }));

  const data = await getBootstrap();

  assert.deepEqual(data, { events: [] });
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /bootstrap-static\/$/);
  assert.match(fetchCalls[0].opts.headers['User-Agent'], /Mozilla/);
});

test('andre kall innenfor TTL serveres fra cache uten nytt fetch', async () => {
  mockFetch(() => jsonResponse({ events: [] }));

  await getBootstrap();
  await getBootstrap();

  assert.equal(fetchCalls.length, 1);
});

test('503 kaster FplError uten retry og setter gameUpdating', async () => {
  mockFetch(() => jsonResponse('', 503));

  await assert.rejects(() => getLive(1), (err) => {
    assert.ok(err instanceof FplError);
    assert.equal(err.status, 503);
    assert.equal(err.retryable, false);
    return true;
  });
  assert.equal(fetchCalls.length, 1, '503 skal ikke retryes');
  assert.equal(isGameUpdating(), true);

  // Neste vellykkede kall nullstiller flagget.
  clear();
  mockFetch(() => jsonResponse({ elements: [] }));
  await getLive(1);
  assert.equal(isGameUpdating(), false);
});

test('404 kaster FplError uten retry', async () => {
  mockFetch(() => jsonResponse('', 404));

  await assert.rejects(() => getLive(2), (err) => {
    assert.equal(err.status, 404);
    assert.equal(err.retryable, false);
    return true;
  });
  assert.equal(fetchCalls.length, 1, '404 skal ikke retryes');
});

test('500 retryes og lykkes på andre forsøk', async () => {
  mockFetch((n) => (n === 1 ? jsonResponse('', 500) : jsonResponse({ ok: true })));

  const data = await getLive(3);

  assert.deepEqual(data, { ok: true });
  assert.equal(fetchCalls.length, 2);
});

test('vedvarende 500 gir feil etter tre forsøk', async () => {
  mockFetch(() => jsonResponse('', 500));

  await assert.rejects(() => getLive(4), (err) => {
    assert.ok(err instanceof FplError);
    assert.equal(err.status, 500);
    return true;
  });
  assert.equal(fetchCalls.length, 3, 'ett kall + to retries');
});
