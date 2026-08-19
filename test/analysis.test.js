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
