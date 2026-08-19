import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextEvent,
  flaggedPlayers,
  topForm,
  mostTransferredIn,
  mostTransferredOut,
  fdrMatrix,
  formatPrice,
  averageFdr,
  playProbability,
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  rankGraph,
  differentials,
} from '../src/services/analysis.js';

function player(overrides = {}) {
  return {
    id: 1,
    web_name: 'Spiller',
    team: 1,
    element_type: 3,
    now_cost: 55,
    form: '0.0',
    total_points: 0,
    selected_by_percent: '0.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    news: '',
    chance_of_playing_next_round: null,
    status: 'a',
    minutes: 0,
    ...overrides,
  };
}

test('nextEvent finner eventet med is_next', () => {
  const events = [
    { id: 1, is_next: false },
    { id: 2, is_next: true },
  ];
  assert.equal(nextEvent(events).id, 2);
  assert.equal(nextEvent([{ id: 1, is_next: false }]), null);
});

test('flaggedPlayers tar med skadde/usikre, sortert på eierandel', () => {
  const players = [
    player({ id: 1, status: 'a' }),
    player({ id: 2, status: 'i', selected_by_percent: '5.0' }),
    player({ id: 3, status: 'd', selected_by_percent: '40.0' }),
    player({ id: 4, news: 'Hamstring - 75% chance', selected_by_percent: '12.0' }),
    player({ id: 5, status: 'a', chance_of_playing_next_round: 50, selected_by_percent: '1.0' }),
  ];

  const flagged = flaggedPlayers(players);

  assert.deepEqual(
    flagged.map((p) => p.id),
    [3, 4, 2, 5],
    'friske spillere utelates, resten sortert på eierandel',
  );
});

test('flaggedPlayers respekterer limit', () => {
  const players = Array.from({ length: 15 }, (_, i) =>
    player({ id: i, status: 'i', selected_by_percent: String(i) }),
  );
  assert.equal(flaggedPlayers(players, 10).length, 10);
});

test('topForm gir topp N på form, spillere uten spilletid utelates', () => {
  const players = [
    player({ id: 1, form: '8.5', minutes: 500 }),
    player({ id: 2, form: '9.9', minutes: 0 }),
    player({ id: 3, form: '3.2', minutes: 900 }),
    player({ id: 4, form: '6.1', minutes: 200 }),
  ];

  const top = topForm(players, 2);

  assert.deepEqual(
    top.map((p) => p.id),
    [1, 4],
  );
});

test('mostTransferredIn/Out sorterer på transfers denne GW-en', () => {
  const players = [
    player({ id: 1, transfers_in_event: 100, transfers_out_event: 5 }),
    player({ id: 2, transfers_in_event: 900, transfers_out_event: 50 }),
    player({ id: 3, transfers_in_event: 10, transfers_out_event: 800 }),
  ];

  assert.deepEqual(mostTransferredIn(players, 2).map((p) => p.id), [2, 1]);
  assert.deepEqual(mostTransferredOut(players, 2).map((p) => p.id), [3, 2]);
});

test('fdrMatrix bygger 5 GW-er per lag med riktig difficulty', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 5);

  assert.deepEqual(matrix.gameweeks, [3, 4, 5, 6, 7]);
  const arsenal = matrix.rows.find((r) => r.team.id === 1);
  assert.equal(arsenal.cells[0].length, 1);
  assert.equal(arsenal.cells[0][0].opponent, 'CHE');
  assert.equal(arsenal.cells[0][0].home, true);
  assert.equal(arsenal.cells[0][0].difficulty, 2);
  assert.equal(arsenal.cells[1][0].home, false);
  assert.equal(arsenal.cells[1][0].difficulty, 3);
  assert.equal(arsenal.cells[2].length, 0, 'blank GW gir tom celle');
});

test('fdrMatrix håndterer dobbel gameweek (to kamper i én celle)', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 3, team_h: 2, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 5 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 1);
  const arsenal = matrix.rows.find((r) => r.team.id === 1);

  assert.equal(arsenal.cells[0].length, 2);
});

test('fdrMatrix stopper på GW 38', () => {
  const teams = [{ id: 1, name: 'Arsenal', short_name: 'ARS' }];
  const matrix = fdrMatrix(teams, [], 36, 5);
  assert.deepEqual(matrix.gameweeks, [36, 37, 38]);
});

test('fdrMatrix sorterer rader på snitt-difficulty (lettest først)', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 1);

  assert.equal(matrix.rows[0].team.id, 2, 'Chelsea (FDR 2) før Arsenal (FDR 5)');
});

test('formatPrice viser tideler som £-millioner', () => {
  assert.equal(formatPrice(55), '5.5');
  assert.equal(formatPrice(128), '12.8');
  assert.equal(formatPrice(40), '4.0');
});

test('averageFdr regner snitt for lagets kamper i vinduet', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 4 },
    { event: 9, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 5 },
  ];
  assert.equal(averageFdr(fixtures, 1, 3, 3), 3); // (2+4)/2
  assert.equal(averageFdr(fixtures, 1, 9, 1), 5);
  assert.equal(averageFdr([], 1, 3, 3), null);
});

test('playProbability bruker chance og status', () => {
  assert.equal(playProbability(player({ status: 'a', chance_of_playing_next_round: null })), 1);
  assert.equal(playProbability(player({ status: 'd', chance_of_playing_next_round: 75 })), 0.75);
  assert.equal(playProbability(player({ status: 'i', chance_of_playing_next_round: null })), 0);
  assert.equal(playProbability(player({ status: 's', chance_of_playing_next_round: 0 })), 0);
});

test('captainSuggestions rangerer på form x fixture-lettehet x spilletid', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 5 },
  ];
  const squad = [
    player({ id: 1, web_name: 'LettKamp', team: 1, form: '5.0', minutes: 900 }),
    player({ id: 2, web_name: 'ToffKamp', team: 2, form: '5.0', minutes: 900 }),
    player({ id: 3, web_name: 'Skadet', team: 1, form: '9.0', minutes: 900, status: 'i', chance_of_playing_next_round: 0 }),
    player({ id: 4, web_name: 'Keeper', team: 1, element_type: 1, form: '9.9', minutes: 900 }),
  ];
  const top = captainSuggestions(squad, fixtures, 3, 3);
  assert.equal(top[0].player.id, 1, 'lett kamp vinner ved lik form');
  assert.equal(top[1].player.id, 2);
  assert.equal(top.length, 3);
  assert.equal(top[2].score, 0, 'skadet spiller får score 0');
  assert.ok(top.every((t) => t.player.element_type !== 1), 'keeper foreslas ikke');
  assert.ok(top[0].reasons.length >= 2, 'begrunnelse folger med');
});

test('transferOutCandidates flagger skade, lav form og toff fixture-run', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
    { event: 4, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
  ];
  const squad = [
    player({ id: 1, team: 2, form: '6.0', minutes: 900 }), // frisk, god form, lette kamper
    player({ id: 2, team: 2, status: 'i', chance_of_playing_next_round: 25, minutes: 900 }),
    player({ id: 3, team: 2, form: '1.2', minutes: 900 }),
    player({ id: 4, team: 1, form: '6.0', minutes: 900 }), // FDR-snitt 5
  ];
  const out = transferOutCandidates(squad, fixtures, 3);
  const ids = out.map((o) => o.player.id);
  assert.ok(!ids.includes(1));
  assert.ok(ids.includes(2) && ids.includes(3) && ids.includes(4));
  assert.ok(out.find((o) => o.player.id === 2).reasons[0].length > 3);
});

test('transferInCandidates: samme posisjon, innenfor budsjett, ikke i troppen', () => {
  const fixtures = [];
  const out = player({ id: 1, element_type: 3, now_cost: 80 });
  const elements = [
    out,
    player({ id: 2, element_type: 3, now_cost: 85, form: '7.0', total_points: 60, minutes: 900 }),
    player({ id: 3, element_type: 3, now_cost: 95, form: '9.0', total_points: 90, minutes: 900 }), // for dyr (budsjett 90)
    player({ id: 4, element_type: 2, now_cost: 50, form: '8.0', total_points: 70, minutes: 900 }), // feil posisjon
    player({ id: 5, element_type: 3, now_cost: 60, form: '2.0', total_points: 30, minutes: 900 }),
    player({ id: 6, element_type: 3, now_cost: 70, form: '6.0', total_points: 55, minutes: 900 }), // i troppen
    player({ id: 7, element_type: 3, now_cost: 75, form: '6.5', total_points: 50, minutes: 0 }),   // aldri spilt
  ];
  const inn = transferInCandidates(out, elements, new Set([1, 6]), 10, fixtures, 3, 3);
  const ids = inn.map((c) => c.player.id);
  assert.ok(ids.includes(2) && ids.includes(5));
  assert.ok(!ids.includes(3) && !ids.includes(4) && !ids.includes(6) && !ids.includes(7) && !ids.includes(1));
  assert.equal(ids[0], 2, 'hoyest form/verdi forst');
});

test('rankGraph lager polyline-punkter, lav rank overst', () => {
  const history = [
    { event: 1, overall_rank: 1000000 },
    { event: 2, overall_rank: 500000 },
    { event: 3, overall_rank: 750000 },
  ];
  const g = rankGraph(history, 600, 140);
  assert.equal(g.min, 500000);
  assert.equal(g.max, 1000000);
  assert.equal(g.last, 750000);
  const pts = g.points.split(' ').map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 3);
  assert.equal(pts[0][0], 0);
  assert.equal(pts[2][0], 600);
  assert.ok(pts[1][1] < pts[0][1], 'bedre rank tegnes hoyere (lavere y)');
  assert.equal(rankGraph([], 600, 140), null);
  assert.equal(rankGraph([{ event: 1, overall_rank: 5 }], 600, 140).points, '0,70');
});

test('differentials finner spillere kun den ene har, sortert paa eierandel', () => {
  const elements = [
    player({ id: 1, selected_by_percent: '50.0' }),
    player({ id: 2, selected_by_percent: '10.0' }),
    player({ id: 3, selected_by_percent: '30.0' }),
    player({ id: 4, selected_by_percent: '5.0' }),
  ];
  const d = differentials(new Set([1, 2]), new Set([1, 3, 4]), elements);
  assert.deepEqual(d.theirs.map((p) => p.id), [3, 4], 'de har, jeg mangler');
  assert.deepEqual(d.mine.map((p) => p.id), [2], 'jeg har, de mangler');
});
