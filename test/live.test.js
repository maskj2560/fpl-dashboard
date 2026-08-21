import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLive } from '../src/services/live.js';

const bootstrap = {
  teams: [
    { id: 1, short_name: 'ARS' },
    { id: 2, short_name: 'CHE' },
  ],
  elements: [
    { id: 10, web_name: 'Saka', team: 1, element_type: 3 },
    { id: 11, web_name: 'Palmer', team: 2, element_type: 3 },
    { id: 12, web_name: 'Raya', team: 1, element_type: 1 },
  ],
};

function bps(pairs) {
  return { identifier: 'bps', h: pairs.map(([element, value]) => ({ element, value })), a: [] };
}

function confirmedBonus(pairs) {
  return { identifier: 'bonus', h: pairs.map(([element, value]) => ({ element, value })), a: [] };
}

const liveStats = (entries) => ({
  elements: entries.map(([id, stats]) => ({ id, stats })),
});

test('buildLive gir tom visning uten aktiv runde', () => {
  const live = buildLive({ bootstrap, gw: null });
  assert.equal(live.gameweek, null);
  assert.equal(live.anyLive, false);
  assert.equal(live.nextKickoff, null);
  assert.deepEqual(live.myPlayers, []);
  assert.deepEqual(live.matches, []);
});

test('effective ganger med kapteinsmultiplikator og nuller benken', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [{ event: 1, team_h: 1, team_a: 2, started: true, finished: true, minutes: 90 }],
    live: liveStats([
      [10, { total_points: 8, minutes: 90, bonus: 0 }],
      [11, { total_points: 5, minutes: 90, bonus: 0 }],
      [12, { total_points: 6, minutes: 90, bonus: 0 }],
    ]),
    picks: {
      picks: [
        { element: 10, position: 1, multiplier: 2, is_captain: true },
        { element: 11, position: 2, multiplier: 1, is_captain: false },
        { element: 12, position: 12, multiplier: 0, is_captain: false },
      ],
    },
  });

  assert.deepEqual(
    result.myPlayers.map((p) => [p.name, p.effective, p.onBench, p.isCaptain]),
    [
      ['Saka', 16, false, true],
      ['Palmer', 5, false, false],
      ['Raya', 0, true, false],
    ],
  );
  assert.equal(result.totalLive, 21);
  assert.equal(result.myPlayers[0].team, 'ARS');
});

test('pick uten element i bootstrap dropper spilleren, ikke siden', () => {
  const warn = console.warn;
  console.warn = () => {};
  let result;
  try {
    result = buildLive({
      bootstrap,
      gw: 1,
      fixtures: [{ event: 1, team_h: 1, team_a: 2, started: true, finished: true }],
      live: liveStats([[10, { total_points: 4, minutes: 90, bonus: 0 }]]),
      picks: {
        picks: [
          { element: 10, position: 1, multiplier: 1 },
          { element: 999, position: 2, multiplier: 1 },
        ],
      },
    });
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(result.myPlayers.map((p) => p.name), ['Saka']);
  assert.equal(result.totalLive, 4);
});

test('bonusestimat vises for pågående kamp selv når en ferdig kamp ga bonus (dobbel runde)', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      { event: 1, team_h: 1, team_a: 2, started: true, finished: true, stats: [confirmedBonus([[10, 3]])] },
      { event: 1, team_h: 1, team_a: 2, started: true, finished: false, stats: [bps([[10, 40]])] },
    ],
    // total_points inneholder allerede de bekreftede 3 bonuspoengene fra kamp 1.
    live: liveStats([[10, { total_points: 12, minutes: 135, bonus: 3 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusEst, 3, 'estimatet fra kampen som pågår');
  assert.equal(result.myPlayers[0].effective, 15);
});

test('bonusestimat fra to samtidige kamper summeres per spiller', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      { event: 1, team_h: 1, team_a: 2, started: true, finished: false, stats: [bps([[10, 40]])] },
      { event: 1, team_h: 1, team_a: 2, started: true, finished: false, stats: [bps([[10, 35], [11, 30]])] },
    ],
    live: liveStats([[10, { total_points: 6, minutes: 90, bonus: 0 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusEst, 6, '3 + 3 fra to kamper');
});

test('bonus telles ikke dobbelt når den er bekreftet i en kamp som ennå ikke er merket ferdig', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        stats: [bps([[10, 40]]), confirmedBonus([[10, 3]])],
      },
    ],
    live: liveStats([[10, { total_points: 9, minutes: 90, bonus: 3 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusEst, 0);
  assert.equal(result.myPlayers[0].effective, 9);
});

test('anyLive og nextKickoff utledes fra rundens kamper', () => {
  const fixtures = [
    { event: 1, team_h: 1, team_a: 2, started: true, finished: true, kickoff_time: '2026-08-22T11:30:00Z' },
    { event: 1, team_h: 2, team_a: 1, started: false, finished: false, kickoff_time: '2026-08-22T16:30:00Z' },
    { event: 1, team_h: 1, team_a: 2, started: false, finished: false, kickoff_time: '2026-08-22T14:00:00Z' },
  ];
  const before = buildLive({ bootstrap, gw: 1, fixtures });
  assert.equal(before.anyLive, false);
  assert.equal(before.nextKickoff, '2026-08-22T14:00:00Z', 'tidligste kamp som ikke har startet');

  const during = buildLive({
    bootstrap,
    gw: 1,
    fixtures: fixtures.map((f) => ({ ...f, started: true, finished: false })),
  });
  assert.equal(during.anyLive, true);
  assert.equal(during.nextKickoff, null, 'ingen kamper igjen som ikke har startet');
});

test('matches speiler stilling og status fra fixtures', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        minutes: 63,
        team_h_score: 2,
        team_a_score: 1,
      },
    ],
  });
  assert.deepEqual(result.matches, [
    { home: 'ARS', away: 'CHE', homeScore: 2, awayScore: 1, started: true, finished: false, minutes: 63 },
  ]);
});

test('kamp med finished_provisional regnes som ferdig, selv om finished ennaa er false', () => {
  // FPL setter finished_provisional ved fløyta, men finished først ved
  // rundeprosesseringen neste morgen. Leser vi bare finished, står siden på
  // «Kamper pågår» og poller hele natten.
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        finished_provisional: true,
        minutes: 90,
        team_h_score: 2,
        team_a_score: 1,
      },
    ],
  });
  assert.equal(result.anyLive, false, 'kampen er ferdigspilt, ingen polling');
  assert.equal(result.matches[0].finished, true, 'klienten skal vise «Slutt»');
});

test('publisert bonus i paagaaende kamp vises som bonusPublished, ikke som estimat', () => {
  // FPL publiserer bonus provisorisk mens kampen pågår. Den ligger allerede i
  // total_points, så den skal vises — men ikke legges til «Effektivt».
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        stats: [bps([[10, 40]]), confirmedBonus([[10, 3]])],
      },
    ],
    live: liveStats([[10, { total_points: 9, minutes: 62, bonus: 3 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusPublished, 3);
  assert.equal(result.myPlayers[0].bonusEst, 0, 'ingen estimat naar FPL har publisert');
  assert.equal(result.myPlayers[0].effective, 9, 'bonusen ligger alt i total_points');
});

test('dobbeltrunde: publisert bonus og estimat holdes atskilt paa samme rad', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      { event: 1, team_h: 1, team_a: 2, started: true, finished: true, stats: [confirmedBonus([[10, 3]])] },
      { event: 1, team_h: 1, team_a: 2, started: true, finished: false, stats: [bps([[10, 40]])] },
    ],
    // total_points inneholder de 3 publiserte bonuspoengene fra kamp 1.
    live: liveStats([[10, { total_points: 12, minutes: 135, bonus: 3 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusPublished, 3, 'fra den ferdige kampen');
  assert.equal(result.myPlayers[0].bonusEst, 3, 'fra kampen som paagaar');
  assert.equal(result.myPlayers[0].effective, 15, 'kun estimatet legges til');
});

test('ferdig kamp med bekreftet bonus viser bonusPublished', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: true,
        stats: [bps([[10, 40]]), confirmedBonus([[10, 2]])],
      },
    ],
    live: liveStats([[10, { total_points: 8, minutes: 90, bonus: 2 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 2, is_captain: true }] },
  });

  assert.equal(result.myPlayers[0].bonusPublished, 2);
  assert.equal(result.myPlayers[0].bonusEst, 0);
  assert.equal(result.myPlayers[0].effective, 16, 'kapteinen dobler total_points, ikke bonusen paa nytt');
});

test('spiller uten bonus faar bonusPublished 0', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        stats: [bps([[11, 40]]), confirmedBonus([[11, 3]])],
      },
    ],
    live: liveStats([[10, { total_points: 2, minutes: 90, bonus: 0 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusPublished, 0);
});

test('ved floeyta slaas estimatet av, bare publisert bonus staar igjen', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      {
        event: 1,
        team_h: 1,
        team_a: 2,
        started: true,
        finished: false,
        finished_provisional: true,
        stats: [bps([[10, 40]]), confirmedBonus([[10, 3]])],
      },
    ],
    live: liveStats([[10, { total_points: 9, minutes: 90, bonus: 3 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });

  assert.equal(result.myPlayers[0].bonusEst, 0);
  assert.equal(result.myPlayers[0].bonusPublished, 3);
  assert.equal(result.myPlayers[0].effective, 9);
});

test('payloaden har ingen døde felter', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [{ event: 1, team_h: 1, team_a: 2, started: false, finished: false }],
    live: liveStats([[10, { total_points: 3, minutes: 20, bonus: 0 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });
  assert.deepEqual(Object.keys(result).sort(), [
    'anyLive',
    'gameweek',
    'leagues',
    'matches',
    'myPlayers',
    'nextKickoff',
    'totalLive',
  ]);
  assert.deepEqual(Object.keys(result.myPlayers[0]).sort(), [
    'bonusEst',
    'bonusPublished',
    'effective',
    'isCaptain',
    'minutes',
    'name',
    'onBench',
    'points',
    'team',
  ]);
});
