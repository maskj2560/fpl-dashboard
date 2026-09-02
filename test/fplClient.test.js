import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clear, _setNow, _flush } from '../src/services/cache.js';
import {
  getBootstrap,
  getFixtures,
  getLive,
  getLiveHistoric,
  getEntryTransfers,
  getEntryHistory,
  getEntryHistoryHistoric,
  getPicks,
  getPicksHistoric,
  getDreamTeam,
  getElementSummary,
  elementSummaryAgeSec,
  isGameUpdating,
  staleInfo,
  FplError,
  _setNow as _setFplNow,
} from '../src/services/fplClient.js';

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

// ---- P0-3: per-runde-fixtures må være ferske i kampvinduer -----------------

test('fixtures for én runde revalideres etter ett minutt, helsesongen ikke', async () => {
  mockFetch(() => jsonResponse([]));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    await getFixtures(1);
    await getFixtures();
    assert.equal(fetchCalls.length, 2, 'ulike cache-nøkler');

    clock += 2 * 60_000; // to minutter senere: midt i en kamp
    await getFixtures(1);
    await getFixtures();
    await _flush();

    const perGw = fetchCalls.filter((c) => /fixtures\/\?event=1$/.test(c.url)).length;
    const season = fetchCalls.filter((c) => /fixtures\/$/.test(c.url)).length;
    assert.equal(perGw, 2, 'runde-fixtures skal hentes på nytt');
    assert.equal(season, 1, 'helsesong-fixtures skal fortsatt ligge i cache');
  } finally {
    _setNow(null);
  }
});

// ---- Overganger: transfers-endepunktet og historiske live-poeng ------------

test('getEntryTransfers henter entry/{id}/transfers/ og cacher', async () => {
  mockFetch(() => jsonResponse([{ element_in: 10, element_out: 11, event: 2 }]));

  const first = await getEntryTransfers(42);
  const second = await getEntryTransfers(42);

  assert.deepEqual(first, [{ element_in: 10, element_out: 11, event: 2 }]);
  assert.equal(second, first);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /entry\/42\/transfers\/$/);
});

test('getLiveHistoric deler nøkkel med getLive og lever lenger enn 1 min', async () => {
  mockFetch(() => jsonResponse({ elements: [] }));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    await getLiveHistoric(2);
    await getLive(2); // samme nøkkel: ingen ny henting
    assert.equal(fetchCalls.length, 1);

    clock += 5 * 60_000; // 5 min: forbi getLives TTL, godt innenfor 6 t
    await getLiveHistoric(2);
    assert.equal(fetchCalls.length, 1, 'ferdig runde skal ikke revalideres etter 5 min');
  } finally {
    _setNow(null);
  }
});

// ---- v1.3.6: gameUpdating-flagget er tidsstemplet ------------------------

test('getPicksHistoric deler nøkkel med getPicks og cacher lenge', async () => {
  mockFetch(() => jsonResponse({ picks: [{ element: 10 }] }));

  await getPicksHistoric(42, 1);
  await getPicks(42, 1); // samme nøkkel → cache-treff, ikke nytt fetch
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /entry\/42\/event\/1\/picks\/$/);
});

test('getEntryHistoryHistoric deler nøkkel med getEntryHistory og cacher lenge', async () => {
  mockFetch(() => jsonResponse({ current: [] }));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    await getEntryHistoryHistoric(42);
    await getEntryHistory(42); // samme nøkkel → cache-treff, ikke nytt fetch
    assert.equal(fetchCalls.length, 1);

    clock += 10 * 60_000; // 10 min: forbi getEntryHistorys TTL, godt innenfor 6 t
    await getEntryHistoryHistoric(42);
    assert.equal(fetchCalls.length, 1, 'andres historikk skal ikke revalideres etter 10 min');
    assert.match(fetchCalls[0].url, /entry\/42\/history\/$/);
  } finally {
    _setNow(null);
  }
});

// ---- v1.7.0: rundens drømmelag -----------------------------------------

test('getDreamTeam henter dream-team/{gw}/ og cacher 6 t', async () => {
  mockFetch(() => jsonResponse({ top_player: { id: 1, points: 20 }, team: [] }));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    const first = await getDreamTeam(3);
    assert.deepEqual(first.top_player, { id: 1, points: 20 });
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /dream-team\/3\/$/);

    clock += 60 * 60_000; // 1 time: godt innenfor 6 t
    await getDreamTeam(3);
    assert.equal(fetchCalls.length, 1, 'ferdig runde skal ikke revalideres etter en time');
  } finally {
    _setNow(null);
  }
});

test('getDreamTeam deler ikke nøkkel med live', async () => {
  mockFetch(() => jsonResponse({ team: [] }));

  await getDreamTeam(3);
  await getLive(3); // egen nøkkel → må gi et nytt kall
  assert.equal(fetchCalls.length, 2);
  assert.match(fetchCalls[0].url, /dream-team\/3\/$/);
  assert.match(fetchCalls[1].url, /event\/3\/live\/$/);
});

// ---- v1.8.0: element-summary (spillerkortet) -----------------------------

test('getElementSummary henter element-summary/{id}/ og cacher i 30 min', async () => {
  mockFetch(() => jsonResponse({ fixtures: [], history: [] }));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    const first = await getElementSummary(411);
    assert.deepEqual(first, { fixtures: [], history: [] });
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /element-summary\/411\/$/);

    clock += 29 * 60_000; // innenfor 30 min
    await getElementSummary(411);
    assert.equal(fetchCalls.length, 1, 'innenfor TTL skal ikke gi nytt kall');
  } finally {
    _setNow(null);
  }
});

test('getElementSummary deler ikke nøkkel mellom spillere', async () => {
  mockFetch(() => jsonResponse({ fixtures: [], history: [] }));

  await getElementSummary(1);
  await getElementSummary(2);

  assert.equal(fetchCalls.length, 2);
  assert.match(fetchCalls[0].url, /element-summary\/1\/$/);
  assert.match(fetchCalls[1].url, /element-summary\/2\/$/);
});

test('elementSummaryAgeSec leser alderen på spillerens egen cache-nøkkel', async () => {
  mockFetch(() => jsonResponse({ fixtures: [], history: [] }));
  let clock = 1_000_000;
  _setNow(() => clock);
  try {
    assert.equal(elementSummaryAgeSec(411), null, 'ingenting hentet ennå');

    await getElementSummary(411);
    clock += 120_000;

    assert.equal(elementSummaryAgeSec(411), 120);
    assert.equal(elementSummaryAgeSec(412), null, 'annen spiller har egen nøkkel');
  } finally {
    _setNow(null);
  }
});

test('gameUpdating utløper av seg selv 5 min etter siste 503', async () => {
  let t = 1_000_000;
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse('', 503));
    await assert.rejects(() => getBootstrap());
    assert.equal(isGameUpdating(), true);

    t += 5 * 60_000;
    assert.equal(isGameUpdating(), false, 'banneret skal slukke selv om ingen kall lykkes');
  } finally {
    _setFplNow(null);
  }
});

test('en vellykket henting nullstiller gameUpdating med en gang', async () => {
  const t = 1_000_000;
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse('', 503));
    await assert.rejects(() => getBootstrap());
    assert.equal(isGameUpdating(), true);

    clear();
    mockFetch(() => jsonResponse({ events: [] }));
    await getBootstrap();
    assert.equal(isGameUpdating(), false);
  } finally {
    _setFplNow(null);
  }
});

test('gameUpdating er falskt før noe 503 har skjedd', () => {
  assert.equal(isGameUpdating(), false);
});

// ---- v1.4.0: staleInfo — alderstak på stale data --------------------------

test('staleInfo er null når ingenting ligger i cachen', () => {
  assert.equal(staleInfo(), null);
});

test('staleInfo: 30 min gammel bootstrap er innenfor taket', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse({ events: [] }));
    await getBootstrap();
    t += 30 * 60_000;

    const info = staleInfo();
    assert.equal(info.tooOld, false);
    assert.equal(info.ageSec, 1800);
  } finally {
    _setNow(null);
    _setFplNow(null);
  }
});

test('staleInfo: 61 min gammel bootstrap er for gammel', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse({ events: [] }));
    await getBootstrap();
    t += 61 * 60_000;

    const info = staleInfo();
    assert.equal(info.tooOld, true);
    assert.equal(info.fetchedIso, new Date(1_000_000).toISOString());
  } finally {
    _setNow(null);
    _setFplNow(null);
  }
});

test('staleInfo(gw): 11 min gamle live-data er for gamle', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse({ elements: [] }));
    await getLive(2);
    t += 11 * 60_000;

    assert.equal(staleInfo(2).tooOld, true);
    assert.equal(staleInfo(2).ageSec, 660);
  } finally {
    _setNow(null);
    _setFplNow(null);
  }
});

// QA-funn 6 (v1.12.1): en FERDIG runde ligger i 6 t-lageret (delt nøkkel
// med getLive) og revalideres ikke — poengene er immutable, så alderen sier
// ingenting om kontakten med FPL. Uten flagget gjelder 10-min-taket som før.
test('staleInfo(gw, { finished: true }): 5 t gamle live-data for ferdig runde er ikke for gamle', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  _setFplNow(() => t);
  try {
    mockFetch(() => jsonResponse({ elements: [] }));
    await getLiveHistoric(2);
    t += 5 * 60 * 60_000;

    const info = staleInfo(2, { finished: true });
    assert.equal(info.tooOld, false);
    assert.equal(info.ageSec, 18000, 'alderen rapporteres fortsatt (dataAlder)');
    assert.equal(staleInfo(2).tooOld, true, 'uten flagget gjelder live-taket på 10 min');
  } finally {
    _setNow(null);
    _setFplNow(null);
  }
});
