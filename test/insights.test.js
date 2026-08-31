import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimalXi, buildBenchReport, buildCaptainAudit } from '../src/services/insights.js';

// ---- felles testdata ----------------------------------------------------
// 15 spillere: 1–2 keeper, 3–7 forsvar, 8–12 midtbane, 13–15 spiss.
const TYPES = new Map([
  [1, 1], [2, 1],
  [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
  [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],
  [13, 4], [14, 4], [15, 4],
]);

const SQUAD = [...TYPES.keys()];

const elementsById = new Map(
  [...TYPES].map(([id, type]) => [id, { id, element_type: type, web_name: `S${id}`, team: 1 }]),
);

// Den globale favoritten er bevisst UTENFOR troppen: da kan fasit A
// (troppens beste) og fasit B (global favoritt) gi ulike svar.
const GLOBAL_ID = 99;
elementsById.set(GLOBAL_ID, { id: GLOBAL_ID, element_type: 3, web_name: 'Global', team: 1 });

const typeOf = (id) => TYPES.get(id) ?? null;
const ptsFrom = (map) => (id) => map[id] ?? 0;

/** Live-svar med gitte råpoeng per spiller-id. */
function liveFor(points, extra = {}) {
  return {
    elements: [...SQUAD, GLOBAL_ID].map((id) => ({
      id,
      stats: { total_points: points[id] ?? 0, minutes: 90, ...(extra[id] ?? {}) },
    })),
  };
}

/**
 * Picks: `xi` er de elleve som startet (multiplier 1, kaptein 2), resten
 * havner på benken med multiplier 0. Posisjonene følger rekkefølgen.
 */
function picksFor({ xi, captain = null, vice = null, chip = null, onBench = undefined, allStart = false }) {
  const bench = SQUAD.filter((id) => !xi.includes(id));
  // `vice` satt = kapteinen spilte ikke, og vise-kapteinen bar bindet:
  // FPL gir da multiplier 2 til vise-kapteinen og 1 til kapteinen.
  const carrier = vice ?? captain;
  const rows = [
    ...xi.map((element, i) => ({
      element,
      position: i + 1,
      multiplier: element === carrier ? 2 : 1,
      is_captain: element === captain,
      is_vice_captain: element === vice,
    })),
    ...bench.map((element, i) => ({
      element,
      position: 12 + i,
      multiplier: allStart ? 1 : 0,
      is_captain: false,
      is_vice_captain: false,
    })),
  ];
  const entry_history = onBench === undefined ? {} : { points_on_bench: onBench };
  return { active_chip: chip, entry_history, picks: rows };
}

// ---- optimalXi ----------------------------------------------------------

test('optimalXi velger formasjonen som gir flest poeng (5-2-3)', () => {
  const points = {
    1: 2, 2: 1,
    3: 10, 4: 9, 5: 8, 6: 7, 7: 6,
    8: 3, 9: 2, 10: 1, 11: 0, 12: 0,
    13: 5, 14: 4, 15: 3,
  };
  const res = optimalXi({ squadIds: SQUAD, typeOf, pts: ptsFrom(points) });

  // 5 forsvar (40) + 2 midt (5) + 3 spisser (12) + keeper (2) = 59.
  assert.equal(res.points, 59);
  assert.deepEqual([...res.ids].sort((a, b) => a - b), [1, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15]);
});

test('optimalXi tar med nøyaktig én keeper, selv når reserven scorer mest', () => {
  const points = {
    1: 3, 2: 20,
    3: 5, 4: 5, 5: 5, 6: 5, 7: 5,
    8: 5, 9: 5, 10: 5, 11: 5, 12: 5,
    13: 5, 14: 5, 15: 5,
  };
  const res = optimalXi({ squadIds: SQUAD, typeOf, pts: ptsFrom(points) });

  const keepers = res.ids.filter((id) => typeOf(id) === 1);
  assert.deepEqual(keepers, [2], 'skal bruke den beste keeperen, og bare én');
  assert.equal(res.points, 70); // 20 + 10 × 5
  assert.equal(res.ids.length, 11);
});

// ---- buildBenchReport ---------------------------------------------------

const XI = [1, 3, 4, 5, 8, 9, 10, 11, 13, 14, 15]; // 3-4-3, benk: 2, 6, 7, 12

test('buildBenchReport leser benkepoengene fra entry_history', () => {
  const points = { 2: 1, 6: 2, 7: 3, 12: 4 };
  const report = buildBenchReport({
    picksByGw: new Map([[1, picksFor({ xi: XI, onBench: 6 })]]),
    liveByGw: new Map([[1, liveFor(points)]]),
    elementsById,
    gws: [1],
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].gw, 1);
  assert.equal(report.rows[0].benchPoints, 6, 'FPLs eget tall skal vinne over summering');
  assert.equal(report.totalBench, 6);
});

test('buildBenchReport summerer benkepoengene selv når entry_history mangler', () => {
  const points = { 2: 1, 6: 2, 7: 3, 12: 4 };
  const report = buildBenchReport({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, liveFor(points)]]),
    elementsById,
    gws: [1],
  });

  assert.equal(report.rows[0].benchPoints, 10, 'sum av multiplier 0-picks');
});

test('buildBenchReport regner unngåelig tap på rå 1×-poeng, aldri doblet kaptein', () => {
  // Kaptein 13 har 10 poeng, benkespiller 6 har 12: optimal bytter 5 → 6.
  const points = {
    1: 2, 2: 0,
    3: 4, 4: 4, 5: 1, 6: 12, 7: 0,
    8: 3, 9: 3, 10: 3, 11: 3, 12: 0,
    13: 10, 14: 2, 15: 2,
  };
  const report = buildBenchReport({
    picksByGw: new Map([[1, picksFor({ xi: XI, captain: 13, onBench: 12 })]]),
    liveByGw: new Map([[1, liveFor(points)]]),
    elementsById,
    gws: [1],
  });

  // Faktisk XI (rå): 2+4+4+1+3+3+3+3+10+2+2 = 37. Doblet kaptein ville gitt 47.
  // Optimal 4-4-3 finnes ikke; beste lovlige er 3-4-3 med 6 inn for 5: 48.
  assert.equal(report.rows[0].avoidable, 11);
  assert.equal(report.totalAvoidable, 11);
});

test('buildBenchReport nuller ut sløsingen i en Bench Boost-runde', () => {
  const points = { 2: 1, 6: 2, 7: 3, 12: 4, 13: 9 };
  const report = buildBenchReport({
    picksByGw: new Map([[1, picksFor({ xi: XI, chip: 'bboost', onBench: 0, allStart: true })]]),
    liveByGw: new Map([[1, liveFor(points)]]),
    elementsById,
    gws: [1],
  });

  assert.equal(report.rows[0].benchPoints, 0);
  assert.equal(report.rows[0].avoidable, 0, 'ingenting er sløst når hele benken teller');
  assert.equal(report.rows[0].chip, 'BB');
});

test('buildBenchReport akkumulerer over rundene og hopper over manglende picks', () => {
  const p1 = { 2: 1, 6: 2, 7: 3, 12: 4 };
  const p2 = { 2: 0, 6: 5, 7: 0, 12: 0 };
  const report = buildBenchReport({
    picksByGw: new Map([
      [1, picksFor({ xi: XI, onBench: 10 })],
      [2, null],
      [3, picksFor({ xi: XI, onBench: 5 })],
    ]),
    liveByGw: new Map([
      [1, liveFor(p1)],
      [3, liveFor(p2)],
    ]),
    elementsById,
    gws: [1, 2, 3],
  });

  assert.deepEqual(report.rows.map((r) => r.gw), [1, 3], 'runde uten picks utelates');
  assert.equal(report.totalBench, 15);
  assert.equal(report.rows[0].chip, null);

  assert.equal(
    buildBenchReport({ picksByGw: new Map(), liveByGw: new Map(), elementsById, gws: [] }),
    null,
    'ingen runder → hele seksjonen null',
  );
});

// ---- buildCaptainAudit --------------------------------------------------

const teamsById = new Map([[1, { id: 1, code: 3, short_name: 'ARS', name: 'Arsenal' }]]);
const eventsFor = (map) =>
  new Map(Object.entries(map).map(([gw, mc]) => [Number(gw), { id: Number(gw), most_captained: mc }]));

const audit = (args) => buildCaptainAudit({ elementsById, teamsById, ...args });

test('buildCaptainAudit teller delt topp i troppen som treff, ellers bom', () => {
  const a = audit({
    picksByGw: new Map([
      [1, picksFor({ xi: XI, captain: 13 })],
      [2, picksFor({ xi: XI, captain: 13 })],
    ]),
    liveByGw: new Map([
      [1, liveFor({ 13: 12, 3: 12, 8: 4 })], // delt topp med 3
      [2, liveFor({ 13: 5, 3: 9, 8: 4 })], // 3 er alene best
    ]),
    eventsById: eventsFor({ 1: GLOBAL_ID, 2: GLOBAL_ID }),
    gws: [1, 2],
  });

  assert.equal(a.rows[0].squadBest.hit, true, 'delt topp skal telle som treff');
  assert.equal(a.rows[0].squadBest.points, 12);
  assert.equal(a.rows[1].squadBest.hit, false);
  assert.equal(a.rows[1].squadBest.name, 'S3');
  assert.equal(a.rows[0].captain.id, 13);
  assert.equal(a.rows[0].captain.points, 12, 'kapteinen føres med rå 1×-poeng');
  assert.equal(a.rows[0].captain.teamCode, 3);
});

test('buildCaptainAudit gir treff mot global favoritt når kapteinen er minst like god', () => {
  const a = audit({
    picksByGw: new Map([
      [1, picksFor({ xi: XI, captain: 13 })],
      [2, picksFor({ xi: XI, captain: 13 })],
    ]),
    liveByGw: new Map([
      [1, liveFor({ 13: 9, 99: 9 })], // likt = treff
      [2, liveFor({ 13: 2, 99: 9 })],
    ]),
    eventsById: eventsFor({ 1: GLOBAL_ID, 2: GLOBAL_ID }),
    gws: [1, 2],
  });

  assert.equal(a.rows[0].global.hit, true, 'likt med favoritten er ikke et tap');
  assert.equal(a.rows[0].global.name, 'Global');
  assert.equal(a.rows[0].global.points, 9);
  assert.equal(a.rows[1].global.hit, false);
});

test('buildCaptainAudit holder runder uten most_captained utenfor global-nevneren', () => {
  const a = audit({
    picksByGw: new Map([
      [1, picksFor({ xi: XI, captain: 13 })],
      [2, picksFor({ xi: XI, captain: 13 })],
    ]),
    liveByGw: new Map([
      [1, liveFor({ 13: 9, 99: 4 })],
      [2, liveFor({ 13: 9, 99: 4 })],
    ]),
    eventsById: eventsFor({ 1: GLOBAL_ID }), // runde 2 mangler feltet
    gws: [1, 2],
  });

  assert.equal(a.rows[1].global, null);
  assert.deepEqual(a.counted, { squad: 2, global: 1 });
  assert.equal(a.hitGlobalPct, 100, 'kun runden med felt teller');
});

test('buildCaptainAudit bruker den som faktisk bar bindet (vise-kaptein)', () => {
  const a = audit({
    picksByGw: new Map([[1, picksFor({ xi: XI, captain: 13, vice: 8 })]]),
    liveByGw: new Map([[1, liveFor({ 13: 0, 8: 11 })]]),
    eventsById: eventsFor({ 1: GLOBAL_ID }),
    gws: [1],
  });

  assert.equal(a.rows[0].captain.id, 8, 'vise-kapteinen overtok');
  assert.equal(a.rows[0].captain.points, 11);
  assert.equal(a.rows[0].squadBest.hit, true);
});

test('buildCaptainAudit regner treffprosent på begge fasitene', () => {
  const a = audit({
    picksByGw: new Map([
      [1, picksFor({ xi: XI, captain: 13 })],
      [2, picksFor({ xi: XI, captain: 13 })],
      [3, picksFor({ xi: XI, captain: 13 })],
    ]),
    liveByGw: new Map([
      [1, liveFor({ 13: 9, 3: 2, 99: 4 })], // treff A, treff B
      [2, liveFor({ 13: 9, 3: 2, 99: 12 })], // treff A, bom B
      [3, liveFor({ 13: 1, 3: 8, 99: 12 })], // bom A, bom B
    ]),
    eventsById: eventsFor({ 1: GLOBAL_ID, 2: GLOBAL_ID, 3: GLOBAL_ID }),
    gws: [1, 2, 3],
  });

  assert.equal(a.hitSquadPct, 67);
  assert.equal(a.hitGlobalPct, 33);
  assert.deepEqual(a.counted, { squad: 3, global: 3 });
});

test('buildCaptainAudit hopper over runder uten picks og gir null uten rader', () => {
  const a = audit({
    picksByGw: new Map([
      [1, null],
      [2, picksFor({ xi: XI, captain: 13 })],
    ]),
    liveByGw: new Map([[2, liveFor({ 13: 9, 99: 4 })]]),
    eventsById: eventsFor({ 1: GLOBAL_ID, 2: GLOBAL_ID }),
    gws: [1, 2],
  });
  assert.deepEqual(a.rows.map((r) => r.gw), [2]);

  assert.equal(
    audit({ picksByGw: new Map(), liveByGw: new Map(), eventsById: new Map(), gws: [] }),
    null,
  );
});
