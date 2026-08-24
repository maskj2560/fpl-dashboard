import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEventName, formatDay, formatTime, formatSigned, formatNumber } from '../src/services/format.js';

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

test('formatNumber grupperer med vanlige mellomrom, ikke NBSP', () => {
  assert.equal(formatNumber(1339328), '1 339 328');
  assert.equal(formatNumber(609), '609');
});

test('formatSigned bruker også vanlige mellomrom i store tall', () => {
  assert.equal(formatSigned(12345), '+12 345');
  assert.equal(formatSigned(-4), '−4');
});
