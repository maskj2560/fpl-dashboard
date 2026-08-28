import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlannerData,
  validateScenario,
  buildFtLedger,
  parseScenarioFile,
  listScenarios,
  addScenario,
  removeScenario,
  _setHooks,
  _reset,
  evaluateScenario,
} from '../src/services/scenarios.js';

// Priser i tideler. Runde 3 er neste — FDR regnes for runde 3–5.
const bootstrap = {
  events: [
    { id: 1, is_current: false, finished: true },
    { id: 2, is_current: true, finished: false },
    { id: 3, is_next: true, finished: false },
  ],
  teams: [
    { id: 1, short_name: 'MCI', code: 43 },
    { id: 2, short_name: 'AVL', code: 7 },
  ],
  elements: [
    { id: 10, web_name: 'Haaland', team: 1, element_type: 4, now_cost: 145, form: '7.5', ep_next: '8.2', selected_by_percent: '55.3', status: 'a', chance_of_playing_next_round: null },
    { id: 11, web_name: 'Watkins', team: 2, element_type: 4, now_cost: 88, form: '3.0', ep_next: '4.1', selected_by_percent: '12.0', status: 'd', chance_of_playing_next_round: 75 },
    { id: 12, web_name: 'Ukjentmann', team: 9, element_type: 2, now_cost: 40, form: 'x', ep_next: null, selected_by_percent: null, status: 'a', chance_of_playing_next_round: null },
  ],
};
const fixtures = [
  { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
  { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3 },
  { event: 6, team_h: 1, team_a: 2, team_h_difficulty: 1, team_a_difficulty: 1 }, // utenfor vinduet
];
const picks = {
  picks: [{ element: 10, position: 11 }],
  entry_history: { bank: 15, value: 1003 },
};
const purchases = new Map([[10, { buyCost: 140, event: 2, source: 'transfer' }]]);

test('planlegger-payload: salgspris per tropp-spiller og bank fra picks', () => {
  const data = buildPlannerData({ bootstrap, fixtures, picks, purchases, fromGw: 3 });
  assert.equal(data.event, 3);
  assert.equal(data.bank, 15);
  assert.equal(data.maxPerClub, 3);
  assert.deepEqual(data.squad, [
    { id: 10, navn: 'Haaland', lag: 'MCI', lagKode: 43, pos: 4, sellPrice: 142, buyCost: 140 },
  ]);
});

test('planlegger-payload: fdr3 er snittet av rundene i vinduet', () => {
  const data = buildPlannerData({ bootstrap, fixtures, picks, purchases, fromGw: 3 });
  const haaland = data.players.find((p) => p.id === 10);
  assert.equal(haaland.fdr3, 2.5); // MCI: 2 (r3) + 3 (r4), r6 er utenfor
  assert.equal(haaland.pris, 145);
  assert.equal(haaland.form, 7.5);
  assert.equal(haaland.epNext, 8.2);
  assert.equal(haaland.eid, 55.3);
  assert.equal(haaland.status, 'a');
  const watkins = data.players.find((p) => p.id === 11);
  assert.equal(watkins.sjanse, 75);
});

test('planlegger-payload: manglende felter blir null, aldri undefined', () => {
  const data = buildPlannerData({ bootstrap, fixtures, picks, purchases, fromGw: 3 });
  const ukjent = data.players.find((p) => p.id === 12);
  assert.equal(ukjent.lag, null); // lag 9 finnes ikke i teams
  assert.equal(ukjent.lagKode, null);
  assert.equal(ukjent.form, null); // 'x' er ikke et tall
  assert.equal(ukjent.epNext, null);
  assert.equal(ukjent.eid, null);
  for (const p of data.players) {
    for (const [key, value] of Object.entries(p)) {
      assert.notEqual(value, undefined, `players.${p.id}.${key} er undefined`);
    }
  }
});

test('planlegger-payload: spiller uten kjent kjøpspris får sellPrice null', () => {
  const utenKjop = buildPlannerData({
    bootstrap, fixtures,
    picks: { picks: [{ element: 11, position: 10 }], entry_history: null },
    purchases: new Map(),
    fromGw: 3,
  });
  assert.deepEqual(utenKjop.squad, [
    { id: 11, navn: 'Watkins', lag: 'AVL', lagKode: 7, pos: 4, sellPrice: null, buyCost: null },
  ]);
  assert.equal(utenKjop.bank, null);
});

// --- validateScenario (T7): serveren er fasit for reglene ---

const squadFx = [
  { id: 10, navn: 'Haaland', lag: 'MCI', lagKode: 43, pos: 4, sellPrice: 142, buyCost: 140 },
  { id: 21, navn: 'Dias', lag: 'MCI', lagKode: 43, pos: 2, sellPrice: 55, buyCost: 55 },
  { id: 22, navn: 'Stones', lag: 'MCI', lagKode: 43, pos: 2, sellPrice: 53, buyCost: 53 },
  { id: 23, navn: 'Konsa', lag: 'AVL', lagKode: 7, pos: 2, sellPrice: 45, buyCost: 45 },
];
const plannerFx = {
  event: 3,
  bank: 15,
  maxPerClub: 3,
  squad: squadFx,
  players: [
    ...squadFx.map((s) => ({ id: s.id, navn: s.navn, lagKode: s.lagKode, pos: s.pos, pris: s.sellPrice + 3 })),
    { id: 30, navn: 'Isak', lagKode: 4, pos: 4, pris: 155 },
    { id: 31, navn: 'Doku', lagKode: 43, pos: 2, pris: 50 },
    { id: 32, navn: 'Saliba', lagKode: 3, pos: 2, pris: 60 },
    { id: 33, navn: 'Dyr', lagKode: 9, pos: 4, pris: 158 },
  ],
};
const scenario = (moves, extra = {}) => ({ name: 'Plan A', event: 4, moves, ...extra });
const codes = (result) => result.errors.map((e) => e.code);

test('gyldig bytte passerer med tom feilliste', () => {
  const r = validateScenario(scenario([{ out: 10, in: 30 }]), plannerFx);
  assert.deepEqual(r, { ok: true, errors: [] });
});

test('posisjonsmismatch avvises', () => {
  const r = validateScenario(scenario([{ out: 10, in: 32 }]), plannerFx);
  assert.deepEqual(codes(r), ['posisjon']);
});

test('budsjettet bruker salgspris pluss bank, ikke nåpris', () => {
  // Salgspris 142 + bank 15 = 157 < 158 — med nåpris 145 ville byttet passert.
  const r = validateScenario(scenario([{ out: 10, in: 33 }]), plannerFx);
  assert.deepEqual(codes(r), ['budsjett']);
});

test('fjerde spiller fra samme klubb avvises — ut-spilleren frigjør plassen sin', () => {
  const fjerde = validateScenario(scenario([{ out: 23, in: 31 }]), plannerFx);
  assert.deepEqual(codes(fjerde), ['klubbtak']); // 3 MCI fra før + Doku = 4

  const frigjort = validateScenario(scenario([{ out: 21, in: 31 }]), plannerFx);
  assert.equal(frigjort.ok, true); // Dias ut åpner MCI-plassen
});

test('inn-spiller som alt står i troppen avvises', () => {
  const r = validateScenario(scenario([{ out: 23, in: 21 }]), plannerFx);
  assert.ok(codes(r).includes('alt-i-troppen'));
});

test('ukjente spillere, duplikater og ugyldig navn/runde gir egne koder', () => {
  assert.ok(codes(validateScenario(scenario([{ out: 999, in: 30 }]), plannerFx)).includes('ikke-i-troppen'));
  assert.ok(codes(validateScenario(scenario([{ out: 10, in: 999 }]), plannerFx)).includes('ukjent-spiller'));
  assert.ok(codes(validateScenario(scenario([{ out: 10, in: 30 }, { out: 10, in: 33 }]), plannerFx)).includes('duplikat'));
  assert.ok(codes(validateScenario(scenario([{ out: 10, in: 30 }], { name: '' }), plannerFx)).includes('navn'));
  assert.ok(codes(validateScenario(scenario([{ out: 10, in: 30 }], { event: 0 }), plannerFx)).includes('runde'));
  assert.ok(codes(validateScenario(scenario([], {}), plannerFx)).includes('bytter'));
});

// --- buildFtLedger (T8): gratisbyttene rekonstrueres og selvvalideres ---

const hist = (rows) => ({
  current: rows.map(([event, event_transfers, event_transfers_cost]) => ({
    event, event_transfers, event_transfers_cost,
  })),
});

test('FT-beholdningen bygger seg opp med 1 per runde, maks 5', () => {
  const ledger = buildFtLedger({
    history: hist([[1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0], [7, 0, 0]]),
    chips: [],
  });
  assert.equal(ledger.valid, true);
  assert.equal(ledger.byGw.get(2).ftBefore, 1);
  assert.equal(ledger.byGw.get(6).ftBefore, 5);
  assert.equal(ledger.byGw.get(7).ftBefore, 5); // taket
});

test('trekk beregnes som transfers utover beholdningen ganger 4 — og valideres mot history', () => {
  const ledger = buildFtLedger({
    history: hist([[1, 0, 0], [2, 1, 0], [3, 3, 8], [4, 0, 0], [5, 2, 0]]),
    chips: [],
  });
  assert.equal(ledger.valid, true);
  assert.equal(ledger.byGw.get(3).ftBefore, 1);
  assert.equal(ledger.byGw.get(3).paid, 8); // 3 bytter, 1 gratis
  assert.equal(ledger.byGw.get(5).ftBefore, 2); // 1 + 1 banket fra r4
});

test('wildcard og free hit bruker ingen gratisbytter', () => {
  const ledger = buildFtLedger({
    history: hist([[1, 0, 0], [2, 8, 0], [3, 1, 0]]),
    chips: [{ name: 'wildcard', event: 2 }],
  });
  assert.equal(ledger.valid, true);
  assert.equal(ledger.byGw.get(2).paid, 0);
  assert.equal(ledger.byGw.get(3).ftBefore, 2); // 1 bevart gjennom WC + 1 ny
});

test('avvik mellom modellen og faktisk kost gir valid false', () => {
  const ledger = buildFtLedger({
    history: hist([[1, 0, 0], [2, 1, 4]]), // 1 bytte med 1 FT skulle kostet 0
    chips: [],
  });
  assert.equal(ledger.valid, false);
});

// --- persistens + CRUD (T8): hooks-mønsteret fra notify.js, ingen fs ---

test('parseScenarioFile: gyldig fil rundtur, korrupt og ukjent versjon gir tom liste', () => {
  const scenarioObj = { id: 'abc', name: 'Plan A', event: 4, createdAt: 'x', moves: [{ out: 10, in: 30 }], snapshot: { bank: 15, prices: {} } };
  assert.deepEqual(parseScenarioFile(JSON.stringify({ version: 1, scenarios: [scenarioObj] })), [scenarioObj]);
  assert.deepEqual(parseScenarioFile('{korrupt'), []);
  assert.deepEqual(parseScenarioFile(JSON.stringify({ version: 99, scenarios: [scenarioObj] })), []);
});

test('addScenario validerer, lagrer og returnerer scenarioet med id og prissnapshot', () => {
  const saved = [];
  _setHooks({ load: () => [], save: (list) => saved.push(list) });
  try {
    const r = addScenario({ name: ' Plan A ', event: 4, moves: [{ out: 10, in: 30 }] }, plannerFx);
    assert.equal(r.ok, true);
    assert.equal(r.status, 201);
    assert.equal(r.scenario.name, 'Plan A');
    assert.ok(r.scenario.id.length > 10);
    assert.deepEqual(r.scenario.snapshot, { bank: 15, prices: { 10: 142, 30: 155 } });
    assert.equal(saved.length, 1);
    assert.deepEqual(listScenarios(), [r.scenario]);
  } finally {
    _reset();
  }
});

test('addScenario med regelbrudd gir 400 og lagrer ingenting', () => {
  const saved = [];
  _setHooks({ load: () => [], save: (list) => saved.push(list) });
  try {
    const r = addScenario({ name: 'X', event: 4, moves: [{ out: 10, in: 32 }] }, plannerFx);
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
    assert.deepEqual(r.errors.map((e) => e.code), ['posisjon']);
    assert.equal(saved.length, 0);
  } finally {
    _reset();
  }
});

test('tak på 20 scenarier', () => {
  const mange = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, name: `P${i}`, event: 4, moves: [] }));
  _setHooks({ load: () => mange, save: () => {} });
  try {
    const r = addScenario({ name: 'En til', event: 4, moves: [{ out: 10, in: 30 }] }, plannerFx);
    assert.equal(r.status, 400);
    assert.ok(r.errors.some((e) => e.code === 'tak'));
  } finally {
    _reset();
  }
});

test('removeScenario: ukjent id gir 404, kjent id lagrer resten', () => {
  const saved = [];
  _setHooks({ load: () => [{ id: 'a' }, { id: 'b' }], save: (list) => saved.push(list) });
  try {
    assert.equal(removeScenario('finnes-ikke').status, 404);
    assert.equal(saved.length, 0);
    const r = removeScenario('a');
    assert.equal(r.status, 204);
    assert.deepEqual(saved[0].map((s) => s.id), ['b']);
    assert.deepEqual(listScenarios().map((s) => s.id), ['b']);
  } finally {
    _reset();
  }
});

test('uskrivbar disk gir 503, aldri krasj — og lista i minnet er uendret', () => {
  _setHooks({ load: () => [], save: () => { throw new Error('EACCES'); } });
  try {
    const r = addScenario({ name: 'Plan A', event: 4, moves: [{ out: 10, in: 30 }] }, plannerFx);
    assert.equal(r.status, 503);
    assert.deepEqual(listScenarios(), []);
  } finally {
    _reset();
  }
});

// --- evaluateScenario (T9): planen mot det som faktisk skjedde ---

const lv = (points) => ({
  elements: Object.entries(points).map(([id, p]) => ({ id: Number(id), stats: { total_points: p } })),
});
const liveFx = new Map([
  [2, lv({ 10: 9, 30: 3, 21: 1, 31: 2 })],
  [3, lv({ 10: 2, 30: 7, 21: 0, 31: 5 })],
]);
const namesFx = new Map([
  [10, { id: 10, web_name: 'Haaland', team: 1 }],
  [21, { id: 21, web_name: 'Dias', team: 1 }],
  [31, { id: 31, web_name: 'Doku', team: 1 }],
]);
const teamsFx = new Map([[1, { short_name: 'MCI', code: 43 }]]);
// r2 bruker sitt ene FT, r3 gjør 2 bytter med 1 FT → -4. Konsistent ledger.
const okLedger = buildFtLedger({
  history: hist([[1, 0, 0], [2, 1, 0], [3, 2, 4]]),
  chips: [],
});
const evalArgs = (scenarioPatch = {}, patch = {}) => ({
  scenario: { id: 'x', name: 'Plan A', event: 2, moves: [{ out: 10, in: 30 }], ...scenarioPatch },
  analysisRows: [],
  ftLedger: okLedger,
  liveByGw: liveFx,
  maxGw: 3,
  elementsById: namesFx,
  teamsById: teamsFx,
  ...patch,
});

test('planen måles fra scenariorunden til maxGw med rå poeng', () => {
  const r = evaluateScenario(evalArgs());
  assert.equal(r.pending, false);
  assert.equal(r.plan.diff, (3 - 9) + (7 - 2)); // -1
  assert.deepEqual(r.plan.after5, { diff: -1, gws: 2, complete: false });
  assert.equal(r.perMove[0].diff, -1);
});

test('FT-kost regnes fra ledgeren på begge sider', () => {
  const r = evaluateScenario(evalArgs({ event: 3, moves: [{ out: 10, in: 30 }, { out: 21, in: 31 }] }));
  assert.equal(r.ftEstimert, true);
  assert.equal(r.plan.cost, 4); // 2 bytter, 1 FT inn i runde 3
  assert.equal(r.actual.cost, 4); // det FPL faktisk trakk i runde 3
});

test('faktisk side er 0 når ingen bytter ble gjort den runden', () => {
  const r = evaluateScenario(evalArgs());
  assert.equal(r.actual.diff, 0);
  assert.equal(r.actual.after5, null);
});

test('faktisk side summerer analyseradene for runden', () => {
  const rows = [
    { event: 2, diff: 10, after5: { diff: 10, gws: 2, complete: false } },
    { event: 3, diff: 99, after5: null }, // annen runde — teller ikke
  ];
  const r = evaluateScenario(evalArgs({}, { analysisRows: rows }));
  assert.equal(r.actual.diff, 10);
  assert.deepEqual(r.actual.after5, { diff: 10, gws: 2, complete: false });
});

test('ledger som ikke validerer gir ukjent kost, aldri gjetting', () => {
  const brutt = buildFtLedger({ history: hist([[1, 0, 0], [2, 1, 4]]), chips: [] });
  const r = evaluateScenario(evalArgs({}, { ftLedger: brutt }));
  assert.equal(r.ftEstimert, false);
  assert.equal(r.plan.cost, null);
});

test('scenario for framtidig runde er pending med forventet kost', () => {
  const r = evaluateScenario(evalArgs({ event: 5, moves: [{ out: 10, in: 30 }, { out: 21, in: 31 }] }));
  assert.equal(r.pending, true);
  assert.equal(r.plan.diff, null);
  // ledger.next etter runde 3 (2 bytter, 1 FT) er 1; runde 4 ubrukt gir 2 inn i runde 5.
  assert.equal(r.plan.cost, 0);
});

test('spiller som er borte fra bootstrap får plassholder-navn', () => {
  const r = evaluateScenario(evalArgs());
  assert.equal(r.perMove[0].in.name, 'Ukjent (30)');
  assert.equal(r.perMove[0].out.name, 'Haaland');
  assert.equal(r.perMove[0].out.teamCode, 43);
});
