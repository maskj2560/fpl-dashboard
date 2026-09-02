import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clear } from '../src/services/cache.js';
import {
  optimalXi,
  buildBenchReport,
  buildCaptainAudit,
  buildLuckMeter,
  buildDreamTeamSection,
  assembleInsights,
  buildCareer,
  seasonLabelFrom,
  buildBadges,
  gwsAllPlayed,
  BADGE_IDS,
} from '../src/services/insights.js';

// ---- v1.11.0: Merkedager ---------------------------------------------------

const row = (event, overall_rank, extra = {}) => ({
  event,
  points: 50,
  total_points: 50 * event,
  overall_rank,
  points_on_bench: 3,
  ...extra,
});
const badge = (list, id) => list.find((b) => b.id === id);

test('buildBadges gir «Tre grønne piler» ved tredje grønne runde på rad', () => {
  const current = [
    row(1, 1_000_000),
    row(2, 900_000), // grønn 1
    row(3, 950_000), // rød — nullstiller
    row(4, 800_000), // grønn 1
    row(5, 700_000), // grønn 2
    row(6, 600_000), // grønn 3 → opptjent her
    row(7, 500_000),
  ];
  const b = badge(buildBadges({ current }), 'tre-gronne');
  assert.equal(b.earned, true);
  assert.equal(b.gw, 6, 'tredje runde i første rekke på tre');
  const two = badge(buildBadges({ current: current.slice(0, 5) }), 'tre-gronne');
  assert.equal(two.earned, false, 'to grønne på rad holder ikke');
});

test('buildBadges teller ikke «Tom benk» i Bench Boost-runde', () => {
  const current = [row(1, 500_000, { points_on_bench: 0 }), row(2, 400_000, { points_on_bench: 4 }), row(3, 300_000, { points_on_bench: 0 })];
  const withChip = badge(buildBadges({ current, chips: [{ name: 'bboost', event: 1 }] }), 'null-benk');
  assert.equal(withChip.gw, 3, 'runde 1 var Bench Boost — hele troppen telte');
  const noChip = badge(buildBadges({ current, chips: [] }), 'null-benk');
  assert.equal(noChip.gw, 1);
});

test('buildBadges låser «Bedre enn noen gang» uten tidligere sesonger', () => {
  const current = [row(1, 900_000), row(2, 400_000)];
  const locked = badge(buildBadges({ current, past: [] }), 'rekordrank');
  assert.deepEqual([locked.earned, locked.gw, locked.detail], [false, null, null]);
  const earned = badge(buildBadges({ current, past: [{ season_name: '2024/25', rank: 500_000, total_points: 2000 }] }), 'rekordrank');
  assert.equal(earned.earned, true);
  assert.equal(earned.gw, 2, 'første runde under beste sluttrank');
  assert.match(earned.detail, /400.000 mot 500.000/, 'detaljen nevner ny og gammel rank');
});

test('buildBadges gir «Kapteinsteft» fra tre treff på rad', () => {
  const captainRows = [
    { gw: 1, squadBest: { hit: true } },
    { gw: 2, squadBest: { hit: false } },
    { gw: 3, squadBest: { hit: true } },
    { gw: 4, squadBest: { hit: true } },
    { gw: 5, squadBest: { hit: true } },
  ];
  const b = badge(buildBadges({ current: [row(1, 1), row(2, 1), row(3, 1), row(4, 1), row(5, 1)], extras: { captainRows } }), 'kapteinsrekke');
  assert.equal(b.earned, true);
  assert.equal(b.gw, 5);
  const none = badge(buildBadges({ current: [row(1, 1)], extras: { captainRows: captainRows.slice(0, 4) } }), 'kapteinsrekke');
  assert.equal(none.earned, false);
});

test('gwsAllPlayed krever minutter på alle 15', () => {
  const picks = { picks: SQUAD.map((id, i) => ({ element: id, position: i + 1, multiplier: i < 11 ? 1 : 0 })) };
  const picksByGw = new Map([[1, picks], [2, picks], [3, null]]);
  const liveByGw = new Map([
    [1, liveFor({})],
    [2, liveFor({}, { 7: { minutes: 0 } })],
    [3, liveFor({})],
  ]);
  assert.deepEqual(gwsAllPlayed({ picksByGw, liveByGw, gws: [1, 2, 3] }), [1]);
});

test('buildBadges returnerer hele katalogen i fast rekkefølge med earned-flagg', () => {
  assert.deepEqual(BADGE_IDS, ['beste-runde', 'tre-gronne', 'hundre', 'topp-100k', 'rekordrank', 'null-benk', 'kapteinsrekke', 'alle-15']);
  const locked = buildBadges({});
  assert.deepEqual(locked.map((b) => b.id), BADGE_IDS);
  for (const b of locked) {
    assert.equal(b.earned, false, `${b.id} skal være låst uten data`);
    assert.equal(b.gw, null);
    assert.equal(b.detail, null);
    assert.ok(typeof b.title === 'string' && b.title.length > 0, `${b.id} mangler tittel`);
    assert.ok(typeof b.description === 'string' && b.description.length > 0, `${b.id} mangler beskrivelse`);
  }

  const current = [
    row(1, 2_000_000, { points: 60 }),
    row(2, 90_000, { points: 112 }), // topp 100k + hundreklubben + sesongbeste
    row(3, 80_000, { points: 112 }), // likhet → første beholdes
  ];
  const earned = buildBadges({ current, extras: { allPlayedGws: [3] } });
  assert.deepEqual([badge(earned, 'beste-runde').gw, badge(earned, 'beste-runde').detail], [2, 'Runde 2 · 112 p']);
  assert.deepEqual([badge(earned, 'hundre').gw, badge(earned, 'hundre').detail], [2, '112 p']);
  assert.equal(badge(earned, 'topp-100k').gw, 2);
  assert.match(badge(earned, 'topp-100k').detail, /90.000/);
  assert.equal(badge(earned, 'alle-15').gw, 3);
  assert.equal(earned.filter((b) => b.earned).length, 4, 'nøyaktig fire opptjent i dette datasettet');
});

// ---- v1.11.0: FPL-karrieren ----------------------------------------------

test('buildCareer finner beste sesong og sesongen så langt', () => {
  const past = [
    { season_name: '2023/24', total_points: 2200, rank: 350000 },
    { season_name: '2024/25', total_points: 2410, rank: 120000 },
    { season_name: '2025/26', total_points: 2300, rank: 200000 },
  ];
  const current = [
    { event: 1, points: 60, total_points: 60, overall_rank: 900000 },
    { event: 2, points: 70, total_points: 130, overall_rank: 400000 },
  ];
  const c = buildCareer({ past, current, seasonLabel: '2026/27' });
  assert.deepEqual(
    c.seasons.map((s) => [s.season, s.points, s.rank, s.best]),
    [['2023/24', 2200, 350000, false], ['2024/25', 2410, 120000, true], ['2025/26', 2300, 200000, false]],
  );
  assert.deepEqual(c.best, { season: '2024/25', rank: 120000 });
  assert.deepEqual(c.current, { label: '2026/27', points: 130, rank: 400000, gws: 2 });
});

test('buildCareer uten past gir tom liste og best null', () => {
  const c = buildCareer({ past: [], current: [], seasonLabel: '2026/27' });
  assert.deepEqual(c, { seasons: [], best: null, current: null });
  const noHistory = buildCareer({ seasonLabel: '2026/27' });
  assert.equal(noHistory.best, null, 'manglende felter skal ikke krasje');
});

test('seasonLabelFrom utleder «2026/27» fra første deadline', () => {
  assert.equal(seasonLabelFrom([{ id: 1, deadline_time: '2026-08-14T17:30:00Z' }]), '2026/27');
  assert.equal(seasonLabelFrom([]), null);
});

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

// ---- buildLuckMeter -----------------------------------------------------

/** Live med xG-statistikk: { id: { g, xg, a, xa } }. */
function luckLive(stats, points = {}) {
  const extra = {};
  for (const [id, s] of Object.entries(stats)) {
    extra[id] = {
      goals_scored: s.g ?? 0,
      assists: s.a ?? 0,
      expected_goals: s.xg ?? '0.0',
      expected_assists: s.xa ?? '0.0',
    };
  }
  return liveFor(points, extra);
}

const luck = (args) => buildLuckMeter({ elementsById, teamsById, ...args });

test('buildLuckMeter bruker målverdien for posisjonen og 3 for assist', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, luckLive({
      3: { g: 1 }, // forsvar: 1 × 6
      8: { g: 1 }, // midtbane: 1 × 5
      13: { g: 1 }, // spiss: 1 × 4
      9: { a: 1 }, // assist: 1 × 3
    })]]),
    gws: [1],
  });

  assert.equal(m.rows[0].luck, 18);
  assert.equal(m.total, 18);
});

test('buildLuckMeter parser xG-strengene fra API-et', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, luckLive({ 3: { g: 2, xg: '1.50' } })]]),
    gws: [1],
  });

  assert.equal(m.rows[0].luck, 3); // (2 − 1,5) × 6
});

test('buildLuckMeter teller kun den XI-en som faktisk spilte, per runde', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, luckLive({ 3: { g: 1 }, 6: { g: 3 } })]]), // 6 er benket
    gws: [1],
  });

  assert.equal(m.rows[0].luck, 6, 'benkespilleren skal ikke telle i rundetallet');
  const benched = m.players.find((p) => p.id === 6);
  assert.equal(benched.luck, 18, 'spillertallet gjelder hele sesongen, også benkerunder');
});

test('buildLuckMeter behandler ugyldige xG-verdier som 0', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, luckLive({ 3: { g: 1, xg: 'x' }, 8: { a: 1, xa: null } })]]),
    gws: [1],
  });

  assert.equal(m.rows[0].luck, 9); // 1 × 6 + 1 × 3, NaN → 0
});

test('buildLuckMeter gir null når xG-feltene mangler i samtlige runder', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, liveFor({ 3: 6, 8: 5 })]]), // ingen expected_*
    gws: [1],
  });

  assert.equal(m, null);
});

test('buildLuckMeter sorterer topp 3 og bunn 3 på sesongflaks', () => {
  const m = luck({
    picksByGw: new Map([[1, picksFor({ xi: XI })]]),
    liveByGw: new Map([[1, luckLive({
      3: { g: 2 }, // +12
      4: { g: 1 }, // +6
      5: { a: 1 }, // +3
      8: { g: 0, xg: '2.0' }, // −10
      9: { g: 0, xg: '1.0' }, // −5
      10: { a: 0, xa: '1.0' }, // −3
    })]]),
    gws: [1],
  });

  assert.deepEqual(m.top.map((p) => p.id), [3, 4, 5]);
  assert.deepEqual(m.bottom.map((p) => p.id), [8, 9, 10]);
  assert.equal(m.top[0].luck, 12);
  assert.equal(m.bottom[0].luck, -10);
  assert.equal(m.top[0].teamCode, 3);
});

// ---- buildDreamTeamSection ----------------------------------------------

/** Dream-team-svar: elleve elementer, posisjon 1–11. */
const dtFor = (ids, topId = ids[0]) => ({
  top_player: { id: topId, points: 20 },
  team: ids.map((element, i) => ({ element, points: 10 - i, position: i + 1 })),
});

// 6 er benket hos meg, 99 eier jeg ikke — resten startet.
const DT_IDS = [1, 3, 4, 6, 8, 9, 10, 11, 13, 14, GLOBAL_ID];

const dream = (args) =>
  buildDreamTeamSection({ elementsById, teamsById, lastGw: 1, gws: [1], ...args });

test('buildDreamTeamSection mapper rundens XI og merker mine spillere', () => {
  const myPicks = picksFor({ xi: XI, captain: 13 });
  const s = dream({
    dreamTeam: dtFor(DT_IDS),
    myPicks,
    picksByGw: new Map([[1, myPicks]]),
    liveByGw: new Map([[1, liveFor({})]]),
  });

  assert.equal(s.gw, 1);
  assert.equal(s.xi.length, 11);
  assert.deepEqual(s.xi.map((p) => p.id), DT_IDS, 'sortert på position');
  assert.equal(s.xi[0].points, 10);
  assert.equal(s.xi[0].mine, 'startet');
  assert.equal(s.xi.find((p) => p.id === 6).mine, 'benket');
  assert.equal(s.xi.find((p) => p.id === GLOBAL_ID).mine, null);
  assert.equal(s.xi[1].teamShort, 'ARS');
  assert.equal(s.topPlayer.name, 'S1');
  assert.equal(s.topPlayer.points, 20);
});

test('buildDreamTeamSection merker kapteinen min i rundens XI', () => {
  const myPicks = picksFor({ xi: XI, captain: 13 });
  const s = dream({
    dreamTeam: dtFor(DT_IDS),
    myPicks,
    picksByGw: new Map([[1, myPicks]]),
    liveByGw: new Map([[1, liveFor({})]]),
  });

  assert.equal(s.xi.find((p) => p.id === 13).captain, true);
  assert.equal(s.xi.filter((p) => p.captain).length, 1);
});

test('buildDreamTeamSection teller hvor mange av elleveren jeg eide', () => {
  const myPicks = picksFor({ xi: XI, captain: 13 });
  const s = dream({
    dreamTeam: dtFor(DT_IDS),
    myPicks,
    picksByGw: new Map([[1, myPicks]]),
    liveByGw: new Map([[1, liveFor({})]]),
  });

  assert.equal(s.mineCount, 10, 'ti av elleve, inkludert den benkede');
});

test('buildDreamTeamSection bygger sesongtrenden fra in_dreamteam', () => {
  const myPicks = picksFor({ xi: XI, captain: 13 });
  const s = dream({
    dreamTeam: dtFor(DT_IDS),
    myPicks,
    picksByGw: new Map([[1, myPicks], [2, myPicks]]),
    liveByGw: new Map([
      // 6 er benket og skal ikke telle i runde 1.
      [1, liveFor({}, { 3: { in_dreamteam: true }, 8: { in_dreamteam: true }, 6: { in_dreamteam: true } })],
      [2, liveFor({}, { 13: { in_dreamteam: true } })],
    ]),
    gws: [1, 2],
  });

  assert.deepEqual(s.trend, [{ gw: 1, count: 2 }, { gw: 2, count: 1 }]);
});

test('buildDreamTeamSection dropper trenden uten in_dreamteam og seksjonen uten dream-team', () => {
  const myPicks = picksFor({ xi: XI, captain: 13 });
  const utenFelt = dream({
    dreamTeam: dtFor(DT_IDS),
    myPicks,
    picksByGw: new Map([[1, myPicks]]),
    liveByGw: new Map([[1, liveFor({})]]),
  });
  assert.equal(utenFelt.trend, null);
  assert.ok(utenFelt.xi.length === 11, 'resten av seksjonen står');

  const tom = dream({
    dreamTeam: { team: [] },
    myPicks,
    picksByGw: new Map([[1, myPicks]]),
    liveByGw: new Map([[1, liveFor({})]]),
  });
  assert.equal(tom, null);
  assert.equal(dream({ dreamTeam: null, myPicks, picksByGw: new Map(), liveByGw: new Map() }), null);
});

// ---- assembleInsights ---------------------------------------------------
// Mocker global fetch (mønster fra test/transfers.test.js); hooks scopes til
// denne blokken så de rene testene over er uberørt.

describe('assembleInsights', () => {
  const originalFetch = globalThis.fetch;
  let calls;

  const bootstrap = {
    events: [
      { id: 1, finished: true, data_checked: true, most_captained: GLOBAL_ID },
      { id: 2, finished: true, data_checked: true, is_current: true, most_captained: GLOBAL_ID },
      { id: 3, finished: false, is_next: true },
    ],
    elements: [...elementsById.values()],
    teams: [{ id: 1, code: 3, short_name: 'ARS', name: 'Arsenal' }],
  };

  const routes = () => [
    [/bootstrap-static\/$/, bootstrap],
    [/entry\/42\/event\/1\/picks\/$/, picksFor({ xi: XI, captain: 13, onBench: 4 })],
    [/entry\/42\/event\/2\/picks\/$/, picksFor({ xi: XI, captain: 13, onBench: 2 })],
    [/event\/1\/live\/$/, luckLive({ 3: { g: 1 } })],
    [/event\/2\/live\/$/, luckLive({ 13: { g: 1, xg: '0.5' } })],
    [/dream-team\/2\/$/, dtFor(DT_IDS)],
  ];

  function serve(table) {
    globalThis.fetch = async (url) => {
      const u = String(url);
      calls.push(u);
      const hit = table.find(([re]) => re.test(u));
      if (!hit) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => hit[1] };
    };
  }

  beforeEach(() => {
    clear();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('henter kun ferdige runder, og dream-team kun for den siste', async () => {
    serve(routes());
    const insights = await assembleInsights({ teamId: 42 });

    assert.equal(insights.gw, 2);
    assert.equal(insights.finishedCount, 2);
    assert.ok(!calls.some((u) => /event\/3\/live/.test(u)), 'runde 3 er ikke ferdig');
    assert.ok(!calls.some((u) => /event\/3\/picks/.test(u)), 'runde 3 er ikke ferdig');
    assert.deepEqual(calls.filter((u) => /dream-team/.test(u)).length, 1);
    assert.ok(calls.some((u) => /dream-team\/2\/$/.test(u)), 'dream-team skal hentes for runde 2');
  });

  test('bygger alle fire seksjonene fra ferdige runder', async () => {
    serve(routes());
    const insights = await assembleInsights({ teamId: 42 });

    assert.deepEqual(insights.bench.rows.map((r) => r.gw), [1, 2]);
    assert.equal(insights.bench.totalBench, 6);
    assert.deepEqual(insights.captains.rows.map((r) => r.gw), [1, 2]);
    assert.equal(insights.luck.rows.length, 2);
    assert.equal(insights.dreamTeam.gw, 2);
    assert.equal(insights.dreamTeam.mineCount, 10);
  });

  test('en seksjon som feiler tar ikke med seg resten', async () => {
    serve(routes().filter(([re]) => !/dream-team/.test(String(re))));
    const insights = await assembleInsights({ teamId: 42 });

    assert.equal(insights.dreamTeam, null, 'dream-team 404 → seksjonen utelates');
    assert.ok(insights.bench, 'benkesløsingen skal fortsatt leveres');
    assert.ok(insights.captains);
    assert.ok(insights.luck);
  });

  test('ingen ferdige runder gir tomme seksjoner uten ekstra kall', async () => {
    serve([[/bootstrap-static\/$/, { ...bootstrap, events: [{ id: 1, finished: false, is_next: true }] }]]);
    const insights = await assembleInsights({ teamId: 42 });

    assert.equal(insights.finishedCount, 0);
    assert.deepEqual(
      [insights.bench, insights.captains, insights.luck, insights.dreamTeam],
      [null, null, null, null],
    );
    assert.equal(calls.length, 1, 'kun bootstrap');
  });

  test('assembleInsights henter aldri element-summary', async () => {
    serve(routes());
    await assembleInsights({ teamId: 42 });
    assert.ok(!calls.some((u) => /element-summary/.test(u)), 'aldri element-summary');
  });
});
