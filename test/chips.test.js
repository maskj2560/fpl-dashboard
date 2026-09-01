import test from 'node:test';
import assert from 'node:assert/strict';
import { chipHalves, specialGws, CHIPS } from '../src/services/chips.js';
import { fixtureGrid } from '../src/services/analysis.js';

// Syntetisk liga: fire klubber, GW 4–8. Alt regnes fra denne lista.
const teams = [
  { id: 1, name: 'Arsenal', short_name: 'ARS' },
  { id: 2, name: 'Chelsea', short_name: 'CHE' },
  { id: 3, name: 'Liverpool', short_name: 'LIV' },
  { id: 4, name: 'Everton', short_name: 'EVE' },
];

const fx = (event, h, a, hd, ad) => ({
  event, team_h: h, team_a: a, team_h_difficulty: hd, team_a_difficulty: ad, kickoff_time: '2026-10-01T14:00:00Z',
});

// GW4: alle én kamp. GW5: ARS og CHE dobbel. GW6: bare ARS–CHE (LIV og EVE
// blanke). GW7: ingen kamper satt opp. GW8: alle én kamp.
const fixtures = [
  fx(4, 1, 2, 2, 4), fx(4, 3, 4, 3, 3),
  fx(5, 1, 2, 2, 4), fx(5, 3, 1, 2, 2), fx(5, 2, 4, 3, 3),
  fx(6, 1, 2, 3, 3),
  fx(8, 2, 1, 4, 2), fx(8, 3, 4, 2, 4),
];

const bootstrapChips = [
  { id: 1, name: 'wildcard', start_event: 1, stop_event: 19 },
  { id: 2, name: 'freehit', start_event: 1, stop_event: 19 },
  { id: 3, name: 'bboost', start_event: 1, stop_event: 19 },
  { id: 4, name: '3xc', start_event: 1, stop_event: 19 },
  { id: 5, name: 'wildcard', start_event: 20, stop_event: 38 },
  { id: 6, name: 'freehit', start_event: 20, stop_event: 38 },
  { id: 7, name: 'bboost', start_event: 20, stop_event: 38 },
  { id: 8, name: '3xc', start_event: 20, stop_event: 38 },
];

test('chipHalves leser start_event/stop_event og faller tilbake på 1–19/20–38', () => {
  assert.deepEqual(chipHalves(bootstrapChips), [
    { half: 1, from: 1, to: 19 },
    { half: 2, from: 20, to: 38 },
  ]);
  assert.deepEqual(chipHalves([]), [
    { half: 1, from: 1, to: 19 },
    { half: 2, from: 20, to: 38 },
  ]);
  assert.deepEqual(chipHalves(undefined), chipHalves([]));
  assert.deepEqual(chipHalves([{ name: 'wildcard' }]), chipHalves([]), 'uten gyldige felter → fallback');
  // Gammelt format: ett sett chips for hele sesongen.
  assert.deepEqual(chipHalves([{ name: 'wildcard', start_event: 1, stop_event: 38 }]), [
    { half: 1, from: 1, to: 38 },
  ]);
});

test('fixtureGrid gir kamper per lag per runde, delt med fdrMatrix', () => {
  const grid = fixtureGrid(teams, fixtures, 4, 8);
  assert.equal(grid.get(1).get(5).length, 2, 'ARS har dobbel i GW5');
  assert.equal(grid.get(1).get(5)[0].opponent, 'CHE');
  assert.equal(grid.get(1).get(5)[0].difficulty, 2);
  assert.equal(grid.get(3).get(6), undefined, 'LIV er blank i GW6');
  assert.equal(grid.get(2).get(4)[0].home, false);
});

test('specialGws finner dobbel- og blankrunde', () => {
  const grid = fixtureGrid(teams, fixtures, 4, 8);
  const s = specialGws(grid, teams, 4, 8);
  assert.deepEqual(s.dgw, [{ gw: 5, teams: ['ARS', 'CHE'] }]);
  assert.deepEqual(s.bgw, [{ gw: 6, teams: ['LIV', 'EVE'] }], 'GW7 uten kamper for noen er ikke blank');
});

test('CHIPS er FPL-navnene i history.chips', () => {
  assert.deepEqual(CHIPS, ['bboost', '3xc', 'freehit', 'wildcard']);
});
