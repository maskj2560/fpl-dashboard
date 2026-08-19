import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEventName } from '../src/services/format.js';

test('formatEventName oversetter FPL-ens eventnavn', () => {
  assert.equal(formatEventName('Gameweek 1'), 'Runde 1');
  assert.equal(formatEventName('gameweek 38'), 'Runde 38');
  assert.equal(formatEventName('Runde 2'), 'Runde 2');
  assert.equal(formatEventName(null), '');
});
