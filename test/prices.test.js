import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey,
  snapshotOf,
  diffPrices,
  priceDecision,
  parsePriceFile,
  buildPriceChanges,
  buildPriceForecast,
  FORECAST_MIN_PCT,
  FORECAST_MARKET_PCT,
  priceChangesText,
  getLastPriceChanges,
  _tick,
  _setHooks,
  _reset,
} from '../src/services/prices.js';
import { clear as cacheClear } from '../src/services/cache.js';

const elements = [
  { id: 1, now_cost: 140, web_name: 'Haaland', team: 1 },
  { id: 2, now_cost: 102, web_name: 'Saka', team: 2 },
  { id: 3, now_cost: 55, web_name: 'Raya', team: 2 },
];

// --- Snapshot og diff --------------------------------------------------------

test('snapshotOf gir id → now_cost for alle spillere', () => {
  assert.deepEqual(snapshotOf(elements), { 1: 140, 2: 102, 3: 55 });
});

test('diffPrices finner kun endrede priser og ingen når snapshot mangler', () => {
  const prev = { 1: 140, 2: 103, 3: 55 };
  const now = [
    { id: 1, now_cost: 141 },
    { id: 2, now_cost: 102 },
    { id: 3, now_cost: 55 },
    { id: 4, now_cost: 45 }, // ny spiller uten tidligere pris: ingen endring
  ];
  assert.deepEqual(diffPrices(prev, now), [
    { id: 1, from: 140, to: 141 },
    { id: 2, from: 103, to: 102 },
  ]);
  assert.deepEqual(diffPrices(null, now), [], 'uten snapshot finnes ingen endringer');
  assert.deepEqual(diffPrices({ 1: 141 }, now), [], 'lik pris er ingen endring');
});

// --- Beslutningen ------------------------------------------------------------

test('priceDecision tar første snapshot uten å poste', () => {
  const d = priceDecision({ hasSnapshot: false, changed: false, lastPostedDate: null, today: '2026-09-03', webhook: true });
  assert.deepEqual(d, { snapshot: true, post: false });
});

test('priceDecision poster maks én gang per dato', () => {
  const base = { hasSnapshot: true, changed: true, today: '2026-09-03', webhook: true };
  assert.deepEqual(priceDecision({ ...base, lastPostedDate: null }), { snapshot: true, post: true });
  assert.deepEqual(priceDecision({ ...base, lastPostedDate: '2026-09-02' }), { snapshot: true, post: true });
  assert.deepEqual(
    priceDecision({ ...base, lastPostedDate: '2026-09-03' }),
    { snapshot: true, post: false },
    'andre endring samme dag: nytt snapshot, ingen ny melding',
  );
  assert.deepEqual(
    priceDecision({ ...base, changed: false, lastPostedDate: null }),
    { snapshot: false, post: false },
    'uendrede priser: ingenting å gjøre',
  );
});

test('priceDecision uten webhook tar snapshot men poster aldri', () => {
  const d = priceDecision({ hasSnapshot: true, changed: true, lastPostedDate: null, today: '2026-09-03', webhook: false });
  assert.deepEqual(d, { snapshot: true, post: false });
});

// --- Rapporten ---------------------------------------------------------------

const teamsById = new Map([
  [1, { id: 1, short_name: 'MCI', code: 43 }],
  [2, { id: 2, short_name: 'ARS', code: 3 }],
  [3, { id: 3, short_name: 'LIV', code: 14 }],
]);

function el(id, name, team, cost, tin = 0, tout = 0) {
  return { id, web_name: name, team, now_cost: cost, transfers_in_event: tin, transfers_out_event: tout };
}

// Sju stigere (én med +0,2), fem fallere. Haaland og Saka er i troppen.
const pool = [
  el(1, 'Haaland', 1, 141, 900),
  el(2, 'Saka', 2, 101, 0, 800),
  el(3, 'Palmer', 3, 106, 5000),
  el(4, 'Isak', 3, 92, 4000),
  el(5, 'Salah', 3, 130, 3000),
  el(6, 'Rice', 2, 66, 2000),
  el(7, 'Bruno', 1, 87, 1000),
  el(8, 'Gordon', 3, 62, 500),
  el(9, 'Watkins', 1, 88, 0, 900),
  el(10, 'Wood', 2, 70, 0, 700),
  el(11, 'Mateta', 3, 75, 0, 600),
  el(12, 'Bowen', 1, 76, 0, 500),
];
const diffs = [
  { id: 1, from: 140, to: 141 },
  { id: 2, from: 102, to: 101 },
  { id: 3, from: 104, to: 106 },
  { id: 4, from: 91, to: 92 },
  { id: 5, from: 129, to: 130 },
  { id: 6, from: 65, to: 66 },
  { id: 7, from: 86, to: 87 },
  { id: 8, from: 61, to: 62 },
  { id: 9, from: 89, to: 88 },
  { id: 10, from: 71, to: 70 },
  { id: 11, from: 76, to: 75 },
  { id: 12, from: 77, to: 76 },
];

test('buildPriceChanges skiller troppen fra topp 5 opp og ned', () => {
  const c = buildPriceChanges({ diffs, elements: pool, squadIds: [1, 2, 99], teamsById, date: '2026-09-03' });
  assert.equal(c.date, '2026-09-03');
  assert.deepEqual(c.mine.map((r) => r.name), ['Haaland', 'Saka'], 'troppen: begge, stigere først');
  assert.deepEqual(c.mine[0], { id: 1, name: 'Haaland', teamShort: 'MCI', teamCode: 43, from: 140, to: 141, delta: 1 });
  assert.deepEqual(c.risers.map((r) => r.name), ['Palmer', 'Isak', 'Salah', 'Rice', 'Bruno'], 'topp 5 opp: størst delta, så mest kjøpt');
  assert.deepEqual(c.fallers.map((r) => r.name), ['Watkins', 'Saka', 'Wood', 'Mateta', 'Bowen'], 'topp 5 ned: mest solgt først');
  assert.equal(c.countUp, 7);
  assert.equal(c.countDown, 5);
});

test('risers brytes på transfers_in_event ved lik delta, fallers på transfers_out_event', () => {
  const c = buildPriceChanges({
    diffs: [{ id: 6, from: 65, to: 66 }, { id: 7, from: 86, to: 87 }, { id: 11, from: 76, to: 75 }, { id: 12, from: 77, to: 76 }],
    elements: pool,
    squadIds: [],
    teamsById,
    date: '2026-09-03',
  });
  assert.deepEqual(c.risers.map((r) => r.name), ['Rice', 'Bruno']);
  assert.deepEqual(c.fallers.map((r) => r.name), ['Mateta', 'Bowen']);
  assert.deepEqual(c.mine, []);
});

test('buildPriceChanges takler spiller som forsvant fra bootstrap', () => {
  const c = buildPriceChanges({
    diffs: [{ id: 999, from: 50, to: 51 }, { id: 3, from: 104, to: 106 }],
    elements: pool,
    squadIds: [999],
    teamsById,
    date: '2026-09-03',
  });
  assert.deepEqual(c.risers.map((r) => r.name), ['Palmer']);
  assert.equal(c.countUp, 1, 'ukjent spiller telles ikke');
  assert.deepEqual(c.mine, []);
});

// --- Prognosen (v1.14.0) -----------------------------------------------------

// FPLs egne prognosefelt: pct er progresjon mot terskelen (±100 ≈ endring),
// likelihood er et heltall −5..+5, rate er netto bytter per time.
function fc(id, name, team, cost, pct, likelihood, rate, extra = {}) {
  return {
    id,
    web_name: name,
    team,
    now_cost: cost,
    cost_change_event: 0,
    price_change_percent: String(pct),
    price_change_hourly_rate: rate,
    price_change_projections: [
      { offset: 0, projected_percent: String(pct), likelihood },
      { offset: 1, projected_percent: String(pct), likelihood },
    ],
    ...extra,
  };
}

const forecastPool = [
  fc(1, 'Cherki', 1, 65, 91.5, 5, 4215),
  fc(2, 'Haaland', 1, 141, 58.1, 3, 1200),
  fc(3, 'Gross', 2, 63, 58.1, 3, 900), // lik pct som Haaland → rate bryter
  fc(4, 'Gvardiol', 3, 60, 27.9, 2, 300),
  fc(5, 'Rice', 2, 66, 12.0, 1, 40), // under terskelen for troppen
  fc(6, 'Mbeumo', 1, 79, -101.6, -5, -2002, { cost_change_event: -1 }),
  fc(7, 'Wirtz', 3, 100, -84.8, -3, -700),
  fc(8, 'Shaw', 2, 45, -66.7, -3, -500),
  fc(9, 'Bowen', 1, 76, -30.0, -2, -120),
];

test('buildPriceForecast sorterer stigere på pct og fallere på pct, troppen først med terskel', () => {
  const f = buildPriceForecast({
    elements: forecastPool,
    squadIds: [2, 3, 5, 6],
    teamsById,
  });
  assert.equal(FORECAST_MIN_PCT, 20);
  assert.equal(FORECAST_MARKET_PCT, 50);
  assert.deepEqual(
    f.mine.map((r) => r.name),
    ['Haaland', 'Gross', 'Mbeumo'],
    'troppen: over terskelen, stigere først, rate bryter lik pct — Rice (12 %) faller utenfor',
  );
  assert.deepEqual(f.mine[0], {
    id: 2,
    name: 'Haaland',
    teamShort: 'MCI',
    teamCode: 43,
    cost: 141,
    pct: 58.1,
    likelihood: 3,
    rate: 1200,
    lockedUntil: null,
    changed: 0,
  });
  assert.equal(f.mine[2].changed, -1, 'cost_change_event følger med');
  assert.deepEqual(f.risers.map((r) => r.name), ['Cherki', 'Haaland', 'Gross']);
  assert.deepEqual(f.fallers.map((r) => r.name), ['Mbeumo', 'Wirtz', 'Shaw']);
  assert.equal(f.countRising, 3, 'kun de over markedsterskelen telles');
  assert.equal(f.countFalling, 3);
  assert.equal(f.lockedCount, 0);
});

test('buildPriceForecast hopper over spillere uten prisfelt og holder låste utenfor topplistene', () => {
  const laast = fc(10, 'Raya', 2, 55, 0, 0, 0, { price_change_locked_until: '2026-09-04T19:30:00Z' });
  const f = buildPriceForecast({
    elements: [
      ...forecastPool,
      laast,
      { id: 11, web_name: 'Ukjent', team: 1, now_cost: 45 }, // test-verdenen: ingen prisfelt
      fc(12, 'Isak', 3, 92, 99.9, 5, 5000, { price_change_locked_until: '2026-09-07T14:00:00Z' }),
    ],
    squadIds: [10, 11],
    teamsById,
  });
  assert.deepEqual(f.mine.map((r) => r.name), ['Raya'], 'låst spiller vises i troppen, spiller uten felt hoppes over');
  assert.equal(f.mine[0].lockedUntil, '2026-09-04T19:30:00Z');
  assert.ok(!f.risers.some((r) => r.name === 'Isak'), 'låste holdes utenfor topplistene');
  assert.equal(f.countRising, 3, 'låste telles ikke som stigere');
  assert.equal(f.lockedCount, 2);
  assert.deepEqual(buildPriceForecast({ elements: [], teamsById }), {
    mine: [],
    risers: [],
    fallers: [],
    countRising: 0,
    countFalling: 0,
    lockedCount: 0,
  });
});

test('priceChangesText nevner troppen først og «Ingen endringer i troppen din» når tom', () => {
  const c = buildPriceChanges({ diffs, elements: pool, squadIds: [1, 2], teamsById, date: '2026-09-03' });
  const text = priceChangesText(c);
  const lines = text.split('\n');
  assert.equal(lines[0], '**Prisendringer natt til torsdag 3. september**');
  assert.equal(lines[1], 'https://fpl.marsk.no/overganger');
  assert.ok(text.includes('**Troppen din**\n- Haaland (MCI) £14.0m → £14.1m (+0,1)\n- Saka (ARS) £10.2m → £10.1m (−0,1)'), text);
  assert.ok(text.indexOf('**Troppen din**') < text.indexOf('**Opp'), 'troppen skal komme før de globale listene');
  assert.ok(text.includes('**Opp (5 av 7):** Palmer £10.4m → £10.6m (+0,2) · Isak £9.1m → £9.2m (+0,1)'), text);
  assert.ok(text.includes('**Ned (5 av 5):** Watkins £8.9m → £8.8m (−0,1)'), text);

  const none = priceChangesText(buildPriceChanges({ diffs, elements: pool, squadIds: [], teamsById, date: '2026-09-03' }));
  assert.ok(none.includes('Ingen endringer i troppen din.'), none);
  assert.ok(!none.includes('**Troppen din**'));
});

// --- Timeren (_tick) ---------------------------------------------------------

function mockBootstrap(elements) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /bootstrap-static\/$/, `uventet URL: ${url}`);
    return { ok: true, status: 200, json: async () => ({ events: [], elements, teams: [...teamsById.values()] }) };
  };
  return () => {
    globalThis.fetch = original;
  };
}

async function runTick({ state, elements, nowMs, webhook = true, squad = [] }) {
  cacheClear();
  _reset();
  const saved = [];
  const posts = [];
  _setHooks({
    now: () => nowMs,
    load: () => state,
    save: (s) => saved.push(structuredClone(s)),
    post: async (text) => posts.push(text),
    webhook,
    squad: async () => squad,
  });
  const restore = mockBootstrap(elements);
  try {
    await _tick();
  } finally {
    restore();
  }
  return { saved, posts };
}

// Natt til 3. sep kl. 03:00 i Oslo.
const NIGHT = Date.UTC(2026, 8, 3, 1, 0);
const prevPrices = { ...snapshotOf(pool), 1: 140, 2: 102, 3: 104 };

test('_tick tar første snapshot uten å poste', async () => {
  const { saved, posts } = await runTick({ state: null, elements: pool, nowMs: NIGHT, squad: [1, 2] });
  assert.equal(posts.length, 0, 'første snapshot skal aldri poste');
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].prices, snapshotOf(pool));
  assert.equal(saved[0].lastDiff, null);
  assert.equal(saved[0].date, '2026-09-03');
  assert.equal(getLastPriceChanges(), null);
});

test('_tick poster ved endring og lagrer snapshotet FØR meldingen', async () => {
  const state = { version: 1, date: '2026-09-02', prices: prevPrices, dayDiffs: [], lastDiff: null, lastPostedDate: null };
  const { saved, posts } = await runTick({ state, elements: pool, nowMs: NIGHT, squad: [1, 2] });
  assert.equal(posts.length, 1);
  assert.ok(posts[0].includes('- Haaland (MCI) £14.0m → £14.1m (+0,1)'), posts[0]);
  assert.ok(posts[0].startsWith('**Prisendringer natt til torsdag 3. september**'), posts[0]);
  assert.equal(saved.length, 2, 'snapshot lagres før posten, markøren etter');
  assert.equal(saved[0].lastPostedDate, null);
  assert.equal(saved[0].prices[1], 141);
  assert.equal(saved[1].lastPostedDate, '2026-09-03');
  const last = getLastPriceChanges();
  assert.deepEqual(last.mine.map((r) => r.name), ['Haaland', 'Saka']);
  assert.equal(last.countUp, 2);
  assert.equal(last.countDown, 1);
});

test('_tick slår sammen en andre endring samme dag uten ny post', async () => {
  const first = await runTick({
    state: { version: 1, date: '2026-09-02', prices: prevPrices, dayDiffs: [], lastDiff: null, lastPostedDate: null },
    elements: pool,
    nowMs: NIGHT,
    squad: [1, 2],
  });
  // En time senere: Saka tilbake til 10.2 (netto null), Palmer videre til 10.7.
  const later = pool.map((e) => (e.id === 2 ? { ...e, now_cost: 102 } : e.id === 3 ? { ...e, now_cost: 107 } : e));
  const { saved, posts } = await runTick({ state: first.saved.at(-1), elements: later, nowMs: NIGHT + 60 * 60_000, squad: [1, 2] });
  assert.equal(posts.length, 0, 'samme dato: ingen ny melding');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].lastPostedDate, '2026-09-03');
  assert.equal(saved[0].prices[2], 102);
  const last = getLastPriceChanges();
  assert.deepEqual(last.mine.map((r) => r.name), ['Haaland'], 'Saka gikk opp og ned igjen — netto null');
  const palmer = last.risers.find((r) => r.name === 'Palmer');
  assert.deepEqual([palmer.from, palmer.to, palmer.delta], [104, 107, 3], 'første from, siste to');
});

test('_tick uten webhook tar snapshot men poster aldri', async () => {
  const state = { version: 1, date: '2026-09-02', prices: prevPrices, dayDiffs: [], lastDiff: null, lastPostedDate: null };
  const { saved, posts } = await runTick({ state, elements: pool, nowMs: NIGHT, webhook: false, squad: [1] });
  assert.equal(posts.length, 0);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].lastPostedDate, null);
  assert.equal(getLastPriceChanges().mine.length, 1, 'kortet fylles også uten webhook');
});

test('_tick uten endringer rører verken fil eller Discord', async () => {
  const state = { version: 1, date: '2026-09-02', prices: snapshotOf(pool), dayDiffs: [], lastDiff: null, lastPostedDate: null };
  const { saved, posts } = await runTick({ state, elements: pool, nowMs: NIGHT });
  assert.equal(saved.length, 0);
  assert.equal(posts.length, 0);
});

// --- Dato og fil -------------------------------------------------------------

test('dateKey gir Oslo-dato rundt midnatt', () => {
  // 2. sep 21:30 UTC = 23:30 i Oslo (CEST); 22:30 UTC = 00:30 den 3.
  assert.equal(dateKey(Date.UTC(2026, 8, 2, 21, 30)), '2026-09-02');
  assert.equal(dateKey(Date.UTC(2026, 8, 2, 22, 30)), '2026-09-03');
  // Vintertid: 15. des 23:30 UTC = 00:30 den 16. (CET)
  assert.equal(dateKey(Date.UTC(2026, 11, 15, 23, 30)), '2026-12-16');
  assert.equal(dateKey(Date.UTC(2026, 11, 15, 22, 30), 'UTC'), '2026-12-15');
});

test('parsePriceFile gir null ved ukjent versjon eller ugyldig JSON', () => {
  const ok = parsePriceFile(JSON.stringify({ version: 1, date: '2026-09-03', prices: { 1: 140 }, lastDiff: null, lastPostedDate: null }));
  assert.deepEqual(ok, { version: 1, date: '2026-09-03', prices: { 1: 140 }, dayDiffs: [], lastDiff: null, lastPostedDate: null });
  assert.equal(parsePriceFile(JSON.stringify({ version: 2, prices: {} })), null, 'ukjent versjon');
  assert.equal(parsePriceFile(JSON.stringify({ version: 1 })), null, 'prices mangler');
  assert.equal(parsePriceFile('{ikke json'), null, 'ugyldig JSON');
  assert.equal(parsePriceFile(''), null, 'tom fil');
});
