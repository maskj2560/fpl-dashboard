import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupFixturesByDay, buildBrief } from '../src/services/brief.js';

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

// P1-4: kampene merkes med hvilken side av deadline de ligger på, slik at
// verken viewet eller språkmodellen trenger å regne det ut selv.
test('groupFixturesByDay merker kamper før og etter deadline', () => {
  const fixtures = [
    { team_h: 1, team_a: 2, kickoff_time: '2026-08-21T16:00:00Z' },
    { team_h: 2, team_a: 1, kickoff_time: '2026-08-21T19:00:00Z' },
  ];

  const days = groupFixturesByDay(fixtures, teamsById, '2026-08-21T17:30:00Z');
  const matches = days.flatMap((d) => d.matches);

  assert.equal(matches[0].beforeDeadline, true);
  assert.equal(matches[1].beforeDeadline, false);
  assert.equal(matches[0].kickoffIso, '2026-08-21T16:00:00Z');
});

test('groupFixturesByDay lar beforeDeadline være null uten deadline', () => {
  const days = groupFixturesByDay(
    [{ team_h: 1, team_a: 2, kickoff_time: '2026-08-21T16:00:00Z' }],
    teamsById,
  );

  assert.equal(days[0].matches[0].beforeDeadline, null);
});

// ---- P1-12: skadenytt skal være norsk også i briefen -----------------------

const bootstrapFixture = {
  events: [{ id: 3, name: 'Gameweek 3', deadline_time: '2026-09-05T17:30:00Z', is_next: true }],
  teams: [
    { id: 1, short_name: 'ARS', name: 'Arsenal' },
    { id: 2, short_name: 'CHE', name: 'Chelsea' },
  ],
  elements: [
    {
      id: 10,
      web_name: 'Saka',
      team: 1,
      element_type: 3,
      status: 'i',
      news: 'Ankle injury - Expected back 21 Aug',
      selected_by_percent: '30.0',
      form: '5.0',
      minutes: 400,
      chance_of_playing_next_round: null,
    },
    {
      id: 11,
      web_name: 'Palmer',
      team: 2,
      element_type: 3,
      status: 'a',
      news: '',
      selected_by_percent: '40.0',
      form: '7.0',
      minutes: 500,
      chance_of_playing_next_round: null,
    },
  ],
};

test('buildBrief oversetter skadenytt til norsk i kilden', () => {
  const brief = buildBrief({ bootstrap: bootstrapFixture, fixtures: [] });
  assert.equal(brief.injuries.length, 1);
  assert.equal(brief.injuries[0].name, 'Saka');
  assert.equal(brief.injuries[0].news, 'Ankelskade – ventes tilbake 21. aug.');
});

test('buildBrief beholder «Ingen detaljer» når FPL ikke har news-tekst', () => {
  const elements = bootstrapFixture.elements.map((p) =>
    p.id === 10 ? { ...p, news: '' } : p,
  );
  const brief = buildBrief({ bootstrap: { ...bootstrapFixture, elements }, fixtures: [] });
  assert.equal(brief.injuries[0].news, 'Ingen detaljer');
});
