import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlannerData, validateScenario } from '../src/services/scenarios.js';

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
