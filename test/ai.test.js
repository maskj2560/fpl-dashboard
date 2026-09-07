import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import config from '../src/config.js';
import {
  generate,
  getCached,
  isEnabled,
  getStats,
  statsFile,
  parseStatsFile,
  cacheFile,
  parseCacheFile,
  _flush,
  _setClient,
  _setNow,
  _setHooks,
  _reset,
} from '../src/services/ai.js';

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
  _setHooks({ load: () => null, save: () => {} }); // v1.13.0: aldri ekte DATA_DIR
  clock = 1_000_000;
  _setNow(() => clock);
  console.log = () => {};
  console.error = () => {};
});

afterEach(() => {
  _reset();
  _setHooks(null);
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

// ---- v1.13.0: AI-statistikk per cacheKey, persistert i DATA_DIR/ai-stats.json ----
// Coolify-loggen er 100 linjer og nullstilles ved deploy, så «AI-kall:»-
// linjene kunne aldri summeres i ettertid. Telleren gjør § 1 (P4) målbar på
// /health. Disken injiseres (hooks) — ingen test skriver til ekte DATA_DIR.

test('AI-statistikk er tom før første registrering', () => {
  assert.deepEqual(getStats(), {
    since: null,
    totals: { calls: 0, inputTokens: 0, outputTokens: 0, failures: 0 },
    byKey: {},
  });
});

test('AI-statistikk: to kall på ulike nøkler gir riktige totals og byKey', async () => {
  fakeClient((n) => ({ ...textResponse(`svar ${n}`), usage: { input_tokens: 100 * n, output_tokens: 10 * n } }));
  await generate({ ...opts, cacheKey: 'brief' });
  clock += 1000;
  await generate({ ...opts, cacheKey: 'news' });
  const stats = getStats();
  assert.equal(stats.since, new Date(1_000_000).toISOString());
  assert.deepEqual(stats.totals, { calls: 2, inputTokens: 300, outputTokens: 30, failures: 0 });
  assert.deepEqual(stats.byKey.brief, {
    calls: 1,
    inputTokens: 100,
    outputTokens: 10,
    failures: 0,
    lastAt: new Date(1_000_000).toISOString(),
    model: 'fake-model',
  });
  assert.equal(stats.byKey.news.calls, 1);
  assert.equal(stats.byKey.news.lastAt, new Date(1_001_000).toISOString());
});

test('AI-statistikk: tomt svar og kastet feil teller som failures, ikke calls', async () => {
  fakeClient((n) => {
    if (n === 1) return textResponse('');
    throw new Error('nede');
  });
  await generate(opts); // tomt svar
  clock += 6 * 60_000; // forbi backoff (5 min) og minInterval
  await generate(opts); // kastet feil
  const { totals, byKey } = getStats();
  assert.deepEqual(totals, { calls: 0, inputTokens: 0, outputTokens: 0, failures: 2 });
  assert.equal(byKey.test.lastAt, new Date(clock).toISOString());
  assert.equal(byKey.test.model, config.aiModel, 'ved kastet feil noteres modellen vi prøvde');
});

test('AI-statistikk lagres etter hver registrering og leses tilbake etter _reset', async () => {
  const saved = [];
  _setHooks({ load: () => null, save: (file) => saved.push(JSON.stringify(file)) });
  fakeClient(() => ({ ...textResponse('hei'), usage: { input_tokens: 5, output_tokens: 2 } }));
  await generate(opts);
  assert.equal(saved.length, 1);
  const file = JSON.parse(saved[0]);
  assert.equal(file.version, 1);
  assert.equal(file.byKey.test.calls, 1);

  _reset();
  _setHooks({ load: () => parseStatsFile(saved[0]), save: () => {} });
  const stats = getStats();
  assert.deepEqual(stats.totals, { calls: 1, inputTokens: 5, outputTokens: 2, failures: 0 });
  assert.equal(stats.since, file.since);
});

test('parseStatsFile: ugyldig JSON, feil versjon eller manglende byKey gir null uten å kaste', () => {
  assert.equal(parseStatsFile('{ikke json'), null);
  assert.equal(parseStatsFile(JSON.stringify({ version: 2, byKey: {} })), null);
  assert.equal(parseStatsFile(JSON.stringify({ version: 1 })), null);
  const ok = parseStatsFile(JSON.stringify({ version: 1, since: 'x', byKey: { a: { calls: 'tull' } } }));
  assert.deepEqual(ok.byKey.a, { calls: 0, inputTokens: 0, outputTokens: 0, failures: 0, lastAt: null, model: null });
});

test('AI-statistikk: load som kaster gir tom statistikk, save som kaster velter ikke genereringen', async () => {
  _setHooks({
    load: () => {
      throw new Error('disk');
    },
    save: () => {
      throw new Error('disk full');
    },
  });
  assert.equal(getStats().since, null);
  fakeClient(() => textResponse('hei'));
  const r = await generate(opts);
  assert.equal(r.text, 'hei');
  assert.equal(getStats().totals.calls, 1, 'telleren i minnet oppdateres selv om disken feiler');
});

test('statsFile ligger i config.dataDir', () => {
  assert.equal(statsFile(), path.join(config.dataDir, 'ai-stats.json'));
});

// Kildelås: en test som injiserer klienten registrerer statistikk, og en som
// bare importerer ai.js kan lese den persisterte cachen (v1.15.0) — uten hooks
// ville de truffet ekte DATA_DIR (data/ lokalt). _setHooks kobler fra begge.
test('hver testfil som bruker ai.js kobler fra stats- og cache-disken med _setHooks', () => {
  const testDir = new URL('./', import.meta.url);
  for (const file of fs.readdirSync(testDir).filter((f) => f.endsWith('.test.js'))) {
    const code = fs.readFileSync(new URL(file, testDir), 'utf8');
    if (/_setClient\(/.test(code) || /services\/ai\.js'/.test(code)) {
      assert.match(code, /_setHooks\(/, `${file}: kall ai._setHooks({ load, save }) på modulnivå — kobler fra ai-stats.json og ai-cache.json`);
    }
  }
});

// ---- v1.15.0: AI-cachen overlever restart (DATA_DIR/ai-cache.json) ----
// Hver restart kostet 3 betalte kall (brief + nyheter + overgangskommentar)
// fordi cachen bare bodde i minnet — 24–36 av 52 kall i sjekkpunkt D-målingen
// 7. sep var deploystøy. Fila merkes med package.json-versjonen: en annen
// versjon (nye prompter) forkaster den. Disken injiseres som for stats.

test('config.version er package.json-versjonen', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(config.version, pkg.version);
});

const diskHooks = (extra = {}) => _setHooks({ load: () => null, save: () => {}, ...extra });

test('persistert fersk tekst brukes etter restart: generate innen minIntervalMs koster 0 kall', async () => {
  diskHooks({
    loadCache: () => ({ entries: { test: { text: 'fra disk', generatedAt: clock - 10_000 } } }),
    saveCache: () => {},
  });
  const calls = fakeClient(() => textResponse('ny tekst'));
  assert.equal(getCached('test').text, 'fra disk', 'getCached ser den persisterte teksten');
  const r = await generate(opts);
  assert.equal(r.text, 'fra disk');
  assert.equal(calls.length, 0, 'ingen betalt kall så lenge den persisterte teksten er fersk');

  clock += 60_000; // forbi minIntervalMs — tidsstempelet fra disk gjelder
  const r2 = await generate(opts);
  assert.equal(r2.text, 'ny tekst');
  assert.equal(calls.length, 1);
});

test('persistert tekst fra en annen appVersion forkastes', async () => {
  const file = JSON.stringify({
    version: 1,
    appVersion: '0.0.0-annen',
    entries: { test: { text: 'gammel prompt', generatedAt: clock - 10_000 } },
  });
  assert.equal(parseCacheFile(file, { appVersion: config.version, nowMs: clock }), null);

  diskHooks({ loadCache: () => parseCacheFile(file, { appVersion: config.version, nowMs: clock }), saveCache: () => {} });
  const calls = fakeClient(() => textResponse('ny'));
  assert.equal(getCached('test'), null);
  await generate(opts);
  assert.equal(calls.length, 1, 'tom cache → én generering');
});

test('cache-fila skrives etter hver vellykkede generering med version, appVersion og entries', async () => {
  const saved = [];
  diskHooks({ loadCache: () => null, saveCache: (file) => saved.push(file) });
  fakeClient((n) => textResponse(`svar ${n}`));
  await generate({ ...opts, cacheKey: 'brief' });
  clock += 1000;
  await generate({ ...opts, cacheKey: 'news' });
  assert.equal(saved.length, 2);
  assert.deepEqual(saved[1], {
    version: 1,
    appVersion: config.version,
    entries: {
      brief: { text: 'svar 1', generatedAt: 1_000_000 },
      news: { text: 'svar 2', generatedAt: 1_001_000 },
    },
  });
});

test('parseCacheFile: ugyldig JSON, feil version eller manglende entries gir null uten å kaste', () => {
  const ctx = { appVersion: config.version, nowMs: clock };
  assert.equal(parseCacheFile('{ikke json', ctx), null);
  assert.equal(parseCacheFile(JSON.stringify({ version: 2, appVersion: config.version, entries: {} }), ctx), null);
  assert.equal(parseCacheFile(JSON.stringify({ version: 1, appVersion: config.version }), ctx), null);
});

test('parseCacheFile dropper tom tekst, tidsstempel i framtida og tekst eldre enn 7 døgn — resten beholdes', () => {
  const DAY = 24 * 60 * 60_000;
  const file = JSON.stringify({
    version: 1,
    appVersion: config.version,
    entries: {
      tom: { text: '   ', generatedAt: clock - 1000 },
      framtid: { text: 'x', generatedAt: clock + 1 },
      gammel: { text: 'y', generatedAt: clock - 8 * DAY },
      tull: { text: 'z', generatedAt: 'i går' },
      ok: { text: 'fersk', generatedAt: clock - 1000 },
    },
  });
  assert.deepEqual(parseCacheFile(file, { appVersion: config.version, nowMs: clock }), {
    entries: { ok: { text: 'fersk', generatedAt: clock - 1000 } },
  });
});

test('loadCache som kaster gir tom cache, saveCache som kaster velter ikke genereringen', async () => {
  diskHooks({
    loadCache: () => {
      throw new Error('disk');
    },
    saveCache: () => {
      throw new Error('disk full');
    },
  });
  const calls = fakeClient(() => textResponse('hei'));
  assert.equal(getCached('test'), null);
  const r = await generate(opts);
  assert.equal(r.text, 'hei');
  assert.equal(calls.length, 1);
});

test('feilet og tomt svar skriver ikke cache-fila', async () => {
  const saved = [];
  diskHooks({ loadCache: () => null, saveCache: (file) => saved.push(file) });
  fakeClient((n) => {
    if (n === 1) return textResponse('');
    throw new Error('nede');
  });
  await generate(opts);
  clock += 6 * 60_000;
  await generate(opts);
  assert.equal(saved.length, 0);
});

test('cacheFile ligger i config.dataDir', () => {
  assert.equal(cacheFile(), path.join(config.dataDir, 'ai-cache.json'));
});

// Uten AI (ingen nøkkel, ingen injisert klient) skal disken aldri leses —
// app.test.js kjører hele stacken slik. Kan bare måles der nøkkelen mangler
// (`npm test` lokalt leser utviklerens .env); CI-en har ingen nøkkel.
test(
  'AI av: getCached leser aldri cache-disken',
  { skip: config.anthropicApiKey ? 'ANTHROPIC_API_KEY er satt i .env — CI-en dekker denne' : false },
  () => {
    let reads = 0;
    diskHooks({
      loadCache: () => {
        reads++;
        return { entries: { test: { text: 'fra disk', generatedAt: clock } } };
      },
    });
    assert.equal(getCached('test'), null);
    assert.equal(reads, 0);
  }
);

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
