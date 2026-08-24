import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generate, getCached, isEnabled, _flush, _setClient, _setNow, _reset } from '../src/services/ai.js';

// Ingen ekte Claude-kall: klienten injiseres, klokken styres.
function fakeClient(handler) {
  const calls = [];
  _setClient({
    messages: {
      create: async (args) => {
        calls.push(args);
        return handler(calls.length);
      },
    },
  });
  return calls;
}

function textResponse(text) {
  return { model: 'fake-model', content: [{ type: 'text', text }], usage: {} };
}

const quiet = { log: console.log, error: console.error };
let clock;

beforeEach(() => {
  _reset();
  clock = 1_000_000;
  _setNow(() => clock);
  console.log = () => {};
  console.error = () => {};
});

afterEach(() => {
  _reset();
  _setNow(null);
  _setClient(null);
  console.log = quiet.log;
  console.error = quiet.error;
});

const opts = { cacheKey: 'test', minIntervalMs: 60_000, system: 's', prompt: 'p' };

test('injisert klient slår på AI uten at en nøkkel er satt', () => {
  fakeClient(() => textResponse('hei'));
  assert.equal(isEnabled(), true);
});

test('feilet kall gir backoff: neste generate koster ingen nye tokens', async () => {
  const calls = fakeClient(() => {
    throw new Error('401 invalid api key');
  });

  assert.equal(await generate(opts), null);
  assert.equal(calls.length, 1);

  assert.equal(await generate(opts), null);
  assert.equal(calls.length, 1, 'ingen nytt API-kall innenfor backoff-vinduet');
});

test('backoff slipper opp etter fem minutter', async () => {
  const calls = fakeClient((n) => {
    if (n === 1) throw new Error('502');
    return textResponse('endelig');
  });

  await generate(opts);
  clock += 4 * 60_000;
  await generate(opts);
  assert.equal(calls.length, 1, 'fortsatt innenfor backoff');

  clock += 2 * 60_000; // til sammen 6 min etter feilen
  const result = await generate(opts);
  assert.equal(calls.length, 2);
  assert.equal(result.text, 'endelig');
});

test('tomt svar behandles som feil og gir backoff, men beholder forrige tekst', async () => {
  const calls = fakeClient((n) => textResponse(n === 1 ? 'første' : ''));

  const first = await generate(opts);
  assert.equal(first.text, 'første');

  clock += 2 * 60_000; // forbi minIntervalMs
  const second = await generate(opts);
  assert.equal(second.text, 'første', 'gammel tekst beholdes');
  assert.equal(calls.length, 2);

  const third = await generate(opts);
  assert.equal(calls.length, 2, 'tomt svar skal gi backoff');
  assert.equal(third.text, 'første');
});

test('vellykket kall nullstiller backoff', async () => {
  const calls = fakeClient((n) => {
    if (n === 1) throw new Error('502');
    return textResponse(`svar ${n}`);
  });

  await generate(opts);
  clock += 6 * 60_000;
  await generate(opts);
  assert.equal(calls.length, 2);

  clock += 2 * 60_000; // forbi minIntervalMs, ingen fersk feil å vente på
  await generate(opts);
  assert.equal(calls.length, 3);
});

test('cache og in-flight dedup er uendret', async () => {
  const calls = fakeClient(() => textResponse('delt svar'));

  const [a, b] = await Promise.all([generate(opts), generate(opts)]);
  assert.equal(calls.length, 1, 'to samtidige kall gir ett API-kall');
  assert.equal(a.text, 'delt svar');
  assert.equal(b.text, 'delt svar');

  clock += 30_000; // innenfor minIntervalMs
  await generate(opts);
  assert.equal(calls.length, 1, 'cache innenfor minimumsintervallet');
});

// --- v1.3.4: getCached + stale-while-revalidate ----------------------------

test('getCached gir null for en nøkkel som aldri er generert', async () => {
  const calls = fakeClient(() => textResponse('aldri'));
  assert.equal(getCached('test'), null);
  assert.equal(calls.length, 0, 'getCached skal aldri gjøre nettverkskall');
});

test('getCached gir teksten uansett alder, uten å generere på nytt', async () => {
  const calls = fakeClient(() => textResponse('gammel'));
  await generate(opts);
  clock += 24 * 60 * 60_000; // ett døgn: langt forbi minIntervalMs

  const entry = getCached('test');
  assert.equal(entry.text, 'gammel');
  assert.equal(calls.length, 1, 'ingen regenerering fra getCached');
});

test('swr med fersk cache genererer ikke', async () => {
  const calls = fakeClient(() => textResponse('fersk'));
  await generate(opts);

  clock += 30_000; // innenfor minIntervalMs
  const entry = await generate({ ...opts, swr: true });
  assert.equal(entry.text, 'fersk');
  assert.equal(calls.length, 1);
});

test('swr med stale cache svarer med gammel tekst og fornyer i bakgrunnen', async () => {
  const calls = fakeClient((n) => textResponse(`svar ${n}`));
  await generate(opts);

  clock += 2 * 60_000; // forbi minIntervalMs
  const entry = await generate({ ...opts, swr: true });
  assert.equal(entry.text, 'svar 1', 'den besøkende venter aldri på det nye kallet');

  await _flush();
  assert.equal(calls.length, 2, 'bakgrunnsregenerering ble fyrt');
  assert.equal(getCached('test').text, 'svar 2');
});

test('swr med kald cache venter på svaret (rådgiverklikket)', async () => {
  const calls = fakeClient(() => textResponse('første'));
  const entry = await generate({ ...opts, swr: true });
  assert.equal(entry.text, 'første');
  assert.equal(calls.length, 1);
});

test('swr fyrer ikke bakgrunnskall innenfor failure-backoff', async () => {
  const calls = fakeClient((n) => {
    if (n === 1) return textResponse('bra');
    throw new Error('502');
  });
  await generate(opts);

  clock += 2 * 60_000; // stale
  await generate({ ...opts, swr: true });
  await _flush();
  assert.equal(calls.length, 2, 'første bakgrunnsforsøk feilet');

  const entry = await generate({ ...opts, swr: true });
  assert.equal(entry.text, 'bra', 'stale serveres fortsatt');
  await _flush();
  assert.equal(calls.length, 2, 'ingen nytt kall innenfor backoff-vinduet');
});

test('swr deduper samtidige stale-kall til én bakgrunnsgenerering', async () => {
  const calls = fakeClient((n) => textResponse(`svar ${n}`));
  await generate(opts);

  clock += 2 * 60_000;
  const [a, b] = await Promise.all([
    generate({ ...opts, swr: true }),
    generate({ ...opts, swr: true }),
  ]);
  assert.equal(a.text, 'svar 1');
  assert.equal(b.text, 'svar 1');

  await _flush();
  assert.equal(calls.length, 2, 'to stale-treff gir ett bakgrunnskall');
});

test('uten swr blokkerer stale cache fortsatt (uendret oppførsel)', async () => {
  const calls = fakeClient((n) => textResponse(`svar ${n}`));
  await generate(opts);

  clock += 2 * 60_000;
  const entry = await generate(opts);
  assert.equal(entry.text, 'svar 2', 'den besøkende ventet på det nye kallet');
  assert.equal(calls.length, 2);
});
