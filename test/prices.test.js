import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey,
  snapshotOf,
  diffPrices,
  priceDecision,
  parsePriceFile,
  buildPriceChanges,
  priceChangesText,
} from '../src/services/prices.js';

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
  assert.deepEqual(ok, { version: 1, date: '2026-09-03', prices: { 1: 140 }, lastDiff: null, lastPostedDate: null });
  assert.equal(parsePriceFile(JSON.stringify({ version: 2, prices: {} })), null, 'ukjent versjon');
  assert.equal(parsePriceFile(JSON.stringify({ version: 1 })), null, 'prices mangler');
  assert.equal(parsePriceFile('{ikke json'), null, 'ugyldig JSON');
  assert.equal(parsePriceFile(''), null, 'tom fil');
});
