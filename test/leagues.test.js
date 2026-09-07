import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knownLeagueCount, globalStandings } from '../src/services/leagues.js';

// Testene kjører i rekkefølge og deler modultilstanden med vilje: poenget er
// at tallet oppdateres i bakgrunnen og aldri blokkerer den som spør.

test('knownLeagueCount svarer uten å vente når FPL henger', () => {
  const hanging = () => new Promise(() => {});
  const started = Date.now();
  const count = knownLeagueCount(hanging);
  assert.equal(typeof count, 'number');
  assert.ok(Date.now() - started < 50, `brukte ${Date.now() - started} ms`);
});

test('knownLeagueCount oppdaterer tallet i bakgrunnen til neste spørring', async () => {
  const resolved = knownLeagueCount(async () => [11, 22, 33]);
  assert.equal(typeof resolved, 'number');
  await new Promise((r) => setImmediate(r));
  assert.equal(knownLeagueCount(async () => [11, 22, 33]), 3);
});

test('knownLeagueCount beholder siste kjente tall når oppslaget feiler', async () => {
  const count = knownLeagueCount(async () => {
    throw new Error('FPL nede');
  });
  assert.equal(count, 3);
  await new Promise((r) => setImmediate(r));
  assert.equal(knownLeagueCount(() => new Promise(() => {})), 3);
});

// ---- v1.14.0 (T8): «Dine plasseringer» ------------------------------------

const entry = {
  leagues: {
    classic: [
      { id: 1397750, name: 'Var Har Skylda', league_type: 'x', entry_rank: 3, entry_last_rank: 3, rank_count: 5 },
      { id: 314, name: 'Overall', league_type: 's', entry_rank: 3_345_863, entry_last_rank: 2_201_654, entry_percentile_rank: 35, rank_count: 9_904_802 },
      { id: 181, name: 'Norway', league_type: 's', entry_rank: 92_709, entry_last_rank: 55_950, entry_percentile_rank: 45, rank_count: 208_834 },
      { id: 14, name: 'Liverpool', league_type: 's', entry_rank: 365_917, entry_last_rank: 256_978, entry_percentile_rank: 35, rank_count: 1_200_497 },
      { id: 276, name: 'Gameweek 1', league_type: 's', entry_rank: 100, entry_last_rank: 100, entry_percentile_rank: 40, rank_count: 8_899_691 },
    ],
  },
};

test('globalStandings gir de globale ligaene sortert på størrelse med trend og norske navn', () => {
  const rader = globalStandings(entry);
  assert.deepEqual(rader.map((r) => r.name), ['Globalt', 'Gameweek 1', 'Liverpool', 'Norge'], 'størst først, x-ligaer utelates');
  assert.deepEqual(rader[0], {
    id: 314,
    name: 'Globalt',
    rank: 3_345_863,
    lastRank: 2_201_654,
    percentile: 35,
    count: 9_904_802,
    trend: 'ned',
  });
  assert.equal(rader[1].trend, 'lik', 'uendret plassering');
  assert.equal(rader[2].trend, 'ned');
});

test('globalStandings gir tom liste uten ligaer', () => {
  assert.deepEqual(globalStandings(null), []);
  assert.deepEqual(globalStandings({}), []);
  assert.deepEqual(globalStandings({ leagues: { classic: [] } }), []);
  assert.deepEqual(globalStandings({ leagues: { classic: [{ id: 1, league_type: 'x' }] } }), []);
});

test('globalStandings tåler ligaer uten rank_count og percentile', () => {
  // Test-verdenen har en type-s-liga uten rank_count — den må ikke velte kortet.
  const rader = globalStandings({
    leagues: {
      classic: [
        { id: 314, name: 'Overall', league_type: 's', entry_rank: 398_000, entry_last_rank: 399_000 },
        { id: 181, name: 'Norway', league_type: 's', entry_rank: 10, entry_last_rank: 20, rank_count: 500 },
      ],
    },
  });
  assert.deepEqual(rader.map((r) => r.name), ['Norge', 'Globalt'], 'ukjent størrelse sorteres sist');
  assert.equal(rader[1].count, null);
  assert.equal(rader[1].percentile, null);
  assert.equal(rader[1].trend, 'opp', '398 000 er bedre enn 399 000');
});
