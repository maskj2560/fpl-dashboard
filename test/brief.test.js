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

// ---- P2-4: ingen kommende runde etter sesongslutt --------------------------

test('buildBrief viser avsluttet tilstand når ingen runde er kommende', () => {
  const events = [{ id: 38, name: 'Gameweek 38', deadline_time: '2027-05-20T17:30:00Z', is_next: false }];
  const fixtures = [
    { event: 1, team_h: 1, team_a: 2, kickoff_time: '2026-08-21T17:30:00Z', team_h_difficulty: 2, team_a_difficulty: 4 },
  ];
  const brief = buildBrief({ bootstrap: { ...bootstrapFixture, events }, fixtures });

  assert.equal(brief.gameweek, null);
  assert.deepEqual(brief.fixturesByDay, [], 'skal ikke falle tilbake på runde 1');
  assert.deepEqual(brief.fixturesBeforeDeadline, []);
  assert.deepEqual(brief.captains, []);
  assert.equal(brief.captainsCriterion, null);
  assert.deepEqual(brief.injuries, []);
  assert.equal(brief.mine, null);
});

// ---- v1.2.5: kapteinslista ved sesongstart ---------------------------------
// globalCaptains rangerte kun på form × fixture-lettehet; før første kamp er
// all form 0 og element-ID-rekkefølgen vant (GW1-briefen foreslo keeper + to
// Arsenal-forsvarere i ID-rekkefølge). Nå: samme ep_next-fallback som
// captainSuggestions (v1.2.2), pluss at minutes-kravet slippes før sesongens
// aller første kamp — da har ingen spilt, og kravet ville tømt lista.

const kapteinBootstrap = (elements) => ({
  events: [{ id: 1, name: 'Gameweek 1', deadline_time: '2026-08-21T17:30:00Z', is_next: true }],
  teams: [
    { id: 1, short_name: 'ARS', name: 'Arsenal' },
    { id: 2, short_name: 'CHE', name: 'Chelsea' },
  ],
  elements,
});

// ARS får FDR 2 (lettehet 4), CHE får FDR 4 (lettehet 2).
const kapteinFixtures = [
  { event: 1, team_h: 1, team_a: 2, kickoff_time: '2026-08-21T19:00:00Z', team_h_difficulty: 2, team_a_difficulty: 4 },
];

const spiller = (id, team, overrides = {}) => ({
  id,
  web_name: `Spiller${id}`,
  team,
  element_type: 3,
  status: 'a',
  news: '',
  selected_by_percent: '30.0',
  form: '0.0',
  ep_next: '0.0',
  minutes: 90,
  chance_of_playing_next_round: null,
  ...overrides,
});

test('buildBrief: kapteinslista faller tilbake på ep_next når all form er 0', () => {
  const elements = [
    spiller(1, 2, { ep_next: '5.0' }), // 5.0 × 2 = 10
    spiller(2, 1, { ep_next: '7.0' }), // 7.0 × 4 = 28 — skal vinne tross høyere ID
    spiller(3, 1, { ep_next: '1.0' }), // 1.0 × 4 = 4
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captainsCriterion, 'ep_next');
  assert.deepEqual(brief.captains.map((c) => c.name), ['Spiller2', 'Spiller1', 'Spiller3']);
  assert.equal(brief.captains[0].epNext, '7.0');
});

test('buildBrief: kapteinslista er tom når både form og ep_next er 0 for alle', () => {
  const elements = [spiller(1, 1), spiller(2, 2)];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.deepEqual(brief.captains, []);
  assert.equal(brief.captainsCriterion, null);
});

test('buildBrief: minutes-kravet slippes før sesongstart (alle har 0 minutter)', () => {
  const elements = [
    spiller(1, 1, { minutes: 0, ep_next: '6.0' }),
    spiller(2, 2, { minutes: 0, ep_next: '4.0' }),
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captains.length, 2);
  assert.equal(brief.captains[0].name, 'Spiller1');
  assert.equal(brief.captainsCriterion, 'ep_next');
});

test('buildBrief: minutes-kravet gjelder så snart noen har spilt', () => {
  const elements = [
    spiller(1, 1, { form: '3.0' }),
    spiller(2, 2, { minutes: 0, ep_next: '9.0' }), // høy ep, men ute av lista
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.deepEqual(brief.captains.map((c) => c.name), ['Spiller1']);
  assert.equal(brief.captainsCriterion, 'form');
});

test('buildBrief: captainsCriterion er form når form finnes, og epNext følger med', () => {
  const elements = [spiller(1, 1, { form: '6.5', ep_next: '5.5' })];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captainsCriterion, 'form');
  assert.equal(brief.captains[0].epNext, '5.5');
});
