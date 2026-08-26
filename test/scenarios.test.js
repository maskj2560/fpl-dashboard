import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlannerData } from '../src/services/scenarios.js';

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
