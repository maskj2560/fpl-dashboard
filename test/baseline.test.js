import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateNoTransferSeason, assembleBaseline } from '../src/services/baseline.js';
import { clear } from '../src/services/cache.js';

// GW1-tropp i 4-4-2: 1 = keeper, 2–5 forsvar, 6–9 midtbane, 10–11 angrep.
// Benk i rekkefølge: 12 (keeper), 13 (forsvar), 14 (midtbane), 15 (angrep).
// Kaptein 6, visekaptein 7.
const gw1Picks = {
  picks: [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((element, i) => ({
      element,
      position: i + 1,
      is_captain: element === 6,
      is_vice_captain: element === 7,
    })),
    { element: 12, position: 12, is_captain: false, is_vice_captain: false },
    { element: 13, position: 13, is_captain: false, is_vice_captain: false },
    { element: 14, position: 14, is_captain: false, is_vice_captain: false },
    { element: 15, position: 15, is_captain: false, is_vice_captain: false },
  ],
};
const TYPES = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 3, 10: 4, 11: 4, 12: 1, 13: 2, 14: 3, 15: 4 };
const elementsById = new Map(
  Object.entries(TYPES).map(([id, type]) => [Number(id), { id: Number(id), element_type: type, web_name: `Spiller ${id}` }]),
);

// live({ id: [poeng, minutter], ... }) — alle andre i troppen: 2 poeng, 90 min.
function live(overrides = {}) {
  return {
    elements: Object.keys(TYPES).map((id) => {
      const [points, minutes] = overrides[id] ?? [2, 90];
      return { id: Number(id), stats: { total_points: points, minutes } };
    }),
  };
}
const sim = (liveByGw, captainByGw, maxGw) =>
  simulateNoTransferSeason({ gw1Picks, liveByGw, elementsById, captainByGw, maxGw });

test('full pott uten autosubs: XI-poeng pluss dobling av faktisk kaptein', () => {
  const r = sim(new Map([[1, live()]]), new Map([[1, 6]]), 1);
  // 11 startere × 2 + kaptein 6 dobles = 24. Benken teller aldri.
  assert.deepEqual(r.perGw, [{ gw: 1, points: 24, captainId: 6, viceUsed: false, autosubs: [] }]);
  assert.equal(r.total, 24);
});

test('starter med 0 minutter byttes mot benken i rekkefølge', () => {
  // Angriper 10 spilte ikke; benk-keeper (12) kan ikke inn, forsvarer 13 kan
  // (5-4-1 er lovlig). 13 har 4 poeng, 10 hadde 0.
  const r = sim(new Map([[1, live({ 10: [0, 0], 13: [4, 90] })]]), new Map([[1, 6]]), 1);
  assert.deepEqual(r.perGw[0].autosubs, [{ outId: 10, inId: 13 }]);
  assert.equal(r.perGw[0].points, 10 * 2 + 4 + 2); // 10 startere à 2 + 13s 4 + kapteinsdobling
});

test('formasjonskravet stopper bytte som gir null angripere', () => {
  // Begge angriperne (10, 11) spilte ikke. 13 (forsvar) inn for 10 → 5-4-1.
  // For 11 finnes bare 14 (midtbane, ville gitt 0 angripere) og 15 (0 min):
  // 11 blir stående ute, og 14s poeng skal ALDRI telle.
  const r = sim(
    new Map([[1, live({ 10: [0, 0], 11: [0, 0], 13: [4, 90], 14: [5, 90], 15: [9, 0] })]]),
    new Map([[1, 6]]),
    1,
  );
  assert.deepEqual(r.perGw[0].autosubs, [{ outId: 10, inId: 13 }]);
  assert.equal(r.perGw[0].points, 9 * 2 + 4 + 2); // 9 spilte startere + 13 + dobling av 6
});

test('keeper byttes kun mot keeper — og bare når benk-keeperen spilte', () => {
  const byttet = sim(new Map([[1, live({ 1: [0, 0], 12: [3, 90] })]]), new Map([[1, 6]]), 1);
  assert.deepEqual(byttet.perGw[0].autosubs, [{ outId: 1, inId: 12 }]);
  assert.equal(byttet.perGw[0].points, 10 * 2 + 3 + 2);

  const ingen = sim(new Map([[1, live({ 1: [0, 0], 12: [0, 0], 13: [4, 90] })]]), new Map([[1, 6]]), 1);
  assert.deepEqual(ingen.perGw[0].autosubs, []); // 13 er utespiller — aldri inn for keeper
});

test('kaptein utenfor GW1-troppen faller tilbake på GW1-visen', () => {
  const r = sim(new Map([[1, live()]]), new Map([[1, 99]]), 1);
  assert.equal(r.perGw[0].captainId, 7);
  assert.equal(r.perGw[0].viceUsed, true);
});

test('kaptein uten minutter gir visen doblingen', () => {
  const r = sim(new Map([[1, live({ 6: [0, 0] })]]), new Map([[1, 6]]), 1);
  assert.equal(r.perGw[0].captainId, 7);
  assert.equal(r.perGw[0].viceUsed, true);
});

test('faktisk kaptein fra GW1-benken dobles når autosub løfter ham inn', () => {
  const r = sim(new Map([[1, live({ 10: [0, 0], 13: [4, 90] })]]), new Map([[1, 13]]), 1);
  assert.equal(r.perGw[0].captainId, 13);
  assert.equal(r.perGw[0].viceUsed, false);
  assert.equal(r.perGw[0].points, 10 * 2 + 4 + 4);
});

test('total summerer alle rundene', () => {
  const liveByGw = new Map([[1, live()], [2, live({ 6: [10, 90] })]]);
  const r = sim(liveByGw, new Map([[1, 6], [2, 6]]), 2);
  assert.equal(r.total, 24 + (10 * 2 + 10 + 10)); // r2: 10 andre à 2 + 6s 10 + dobling
});

test('assembleBaseline er null uten bytter — og henter da ingenting', async () => {
  clear();
  const originalFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = async () => {
    fetched++;
    return { ok: true, status: 200, json: async () => ({}) };
  };
  try {
    const analysis = { totals: { count: 0 }, maxGw: 3 };
    const result = await assembleBaseline({
      teamId: 42,
      bootstrap: { events: [], elements: [] },
      history: { current: [] },
      analysis,
    });
    assert.equal(result, null);
    assert.equal(fetched, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
