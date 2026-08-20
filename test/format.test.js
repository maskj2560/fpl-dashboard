import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEventName, formatDay, formatTime, formatSigned } from '../src/services/format.js';

test('formatEventName oversetter FPL-ens eventnavn', () => {
  assert.equal(formatEventName('Gameweek 1'), 'Runde 1');
  assert.equal(formatEventName('gameweek 38'), 'Runde 38');
  assert.equal(formatEventName('Runde 2'), 'Runde 2');
  assert.equal(formatEventName(null), '');
});

test('formatDay og formatTime bruker norsk locale og konfigurert tidssone', () => {
  const iso = '2026-08-21T17:30:00Z';
  assert.equal(formatDay(iso), 'fredag 21. august');
  assert.equal(formatTime(iso), '19:30');
});

test('formatSigned viser fortegn og norsk komma', () => {
  assert.equal(formatSigned(10), '+10');
  assert.equal(formatSigned(-4), '−4');
  assert.equal(formatSigned(0), '0');
  assert.equal(formatSigned(-4 / 3), '−1,3');
});
