import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupFixturesByDay } from '../src/services/brief.js';

const teamsById = new Map([
  [1, { id: 1, short_name: 'ARS', name: 'Arsenal' }],
  [2, { id: 2, short_name: 'CHE', name: 'Chelsea' }],
]);

test('groupFixturesByDay grupperer kamper per dag i norsk tid, sortert', () => {
  const fixtures = [
    { team_h: 1, team_a: 2, kickoff_time: '2026-08-22T14:00:00Z' },
    { team_h: 2, team_a: 1, kickoff_time: '2026-08-21T17:30:00Z' },
    { team_h: 1, team_a: 2, kickoff_time: '2026-08-22T16:30:00Z' },
  ];
  const days = groupFixturesByDay(fixtures, teamsById);
  assert.equal(days.length, 2);
  assert.match(days[0].day, /21\./);
  assert.equal(days[1].matches.length, 2);
  assert.equal(days[1].matches[0].home, 'Arsenal');
  assert.match(days[1].matches[0].kickoff, /16[:.]00/);
});
