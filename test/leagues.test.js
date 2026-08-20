import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knownLeagueCount } from '../src/services/leagues.js';

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
