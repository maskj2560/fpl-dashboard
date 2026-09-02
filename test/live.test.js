import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLive, topBps, assembleLive } from '../src/services/live.js';
import { clear as cacheClear, _setNow as cacheSetNow, _flush as cacheFlush } from '../src/services/cache.js';
import { _setNow as fplSetNow } from '../src/services/fplClient.js';

const bootstrap = {
  teams: [
    { id: 1, short_name: 'ARS', code: 3 },
    { id: 2, short_name: 'CHE', code: 8 },
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

// ---- v1.11.0: bonuskamp (BPS-race) per kamp --------------------------------

const elementsById = new Map(bootstrap.elements.map((e) => [e.id, e]));
const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]));
const raceFixture = (extra = {}) => ({
  id: 1,
  team_h: 1,
  team_a: 2,
  started: true,
  finished: false,
  minutes: 60,
  stats: [bps([[10, 30], [11, 30], [12, 20]])],
  ...extra,
});

test('topBps deler bonus ved likhet på topp: 3,3,1', () => {
  const race = topBps(raceFixture(), elementsById, teamsById, new Set());
  assert.deepEqual(
    race.rows.map((r) => [r.name, r.bps, r.bonus, r.mine]),
    [['Palmer', 30, 3, false], ['Saka', 30, 3, false], ['Raya', 20, 1, false]],
    'likhet på topp gir 3,3,1 — sortert på bps, så navn',
  );
  assert.equal(race.source, 'estimat');
  assert.ok(race.rows.every((r) => r.teamShort && r.id), 'radene har id og klubb');
});

test('topBps bruker publisert bonus når FPL har publisert', () => {
  const fixture = raceFixture({ finished: true, stats: [bps([[10, 30], [11, 30], [12, 20]]), confirmedBonus([[12, 3], [10, 2]])] });
  const race = topBps(fixture, elementsById, teamsById, new Set());
  assert.equal(race.source, 'fpl');
  assert.deepEqual(race.rows.map((r) => [r.name, r.bonus]), [['Palmer', 0], ['Saka', 2], ['Raya', 3]]);
});

test('topBps markerer mine spillere og gir tom liste før avspark', () => {
  const race = topBps(raceFixture(), elementsById, teamsById, new Set([10]));
  assert.deepEqual(race.rows.filter((r) => r.mine).map((r) => r.name), ['Saka']);
  const notStarted = topBps(raceFixture({ started: false, minutes: 0, stats: [] }), elementsById, teamsById, new Set([10]));
  assert.deepEqual(notStarted, { rows: [], source: null });
  const noStats = topBps(raceFixture({ stats: [] }), elementsById, teamsById, new Set());
  assert.deepEqual(noStats.rows, [], 'uten bps-statistikk finnes ingen kamp');
});

test('topBps tar med maks fem spillere', () => {
  const many = bps([[10, 50], [11, 45], [12, 40], [13, 35], [14, 30], [15, 25]]);
  const elements = new Map(elementsById);
  for (const id of [13, 14, 15]) elements.set(id, { id, web_name: `S${id}`, team: 1, element_type: 3 });
  const race = topBps(raceFixture({ stats: [many] }), elements, teamsById, new Set());
  assert.equal(race.rows.length, 5);
  assert.deepEqual(race.rows.map((r) => r.bonus), [3, 2, 1, 0, 0]);
});

test('buildLive legger bpsTop på hver kamp', () => {
  const fixtures = [raceFixture(), raceFixture({ id: 2, started: false, minutes: 0, stats: [] })];
  const live = buildLive({ bootstrap, gw: 3, fixtures, live: liveStats([]), picks: { picks: [{ element: 10, position: 1, multiplier: 1, is_captain: false }] } });
  assert.equal(live.matches[0].bpsTop.length, 3);
  assert.equal(live.matches[0].bpsSource, 'estimat');
  assert.ok(live.matches[0].bpsTop.find((r) => r.name === 'Saka').mine, 'mine spillere markeres fra picks');
  assert.deepEqual(live.matches[1].bpsTop, []);
  assert.equal(live.matches[1].bpsSource, null);
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
    {
      home: 'ARS',
      away: 'CHE',
      homeCode: 3,
      awayCode: 8,
      homeScore: 2,
      awayScore: 1,
      started: true,
      finished: false,
      minutes: 63,
      bpsTop: [],
      bpsSource: null,
    },
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
    'finished',
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
    'teamCode',
  ]);
});

test('buildLive legger teamCode på mine spillere og homeCode/awayCode på kamper', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [
      { event: 1, team_h: 1, team_a: 2, started: true, finished: false, minutes: 10, stats: [] },
    ],
    live: liveStats([[10, { total_points: 3, minutes: 10, bonus: 0 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });
  assert.equal(result.myPlayers[0].teamCode, 3);
  assert.equal(result.matches[0].homeCode, 3);
  assert.equal(result.matches[0].awayCode, 8);
});

// ---- QA-funn 6 (v1.12.1): ferdig runde deler cache-nøkkel med 6 t-lageret ----

test('buildLive setter finished fra rundens finished-flagg i bootstrap', () => {
  const events = (finished) => [{ id: 1, is_current: true, finished }];
  const args = { gw: 1, fixtures: [], live: liveStats([]), picks: null };
  assert.equal(buildLive({ ...args, bootstrap: { ...bootstrap, events: events(true) } }).finished, true);
  assert.equal(buildLive({ ...args, bootstrap: { ...bootstrap, events: events(false) } }).finished, false);
  assert.equal(buildLive({ ...args, bootstrap }).finished, false, 'uten events: ikke ferdig');
  assert.equal(buildLive({ bootstrap, gw: null }).finished, false, 'tom visning er ikke ferdig');
});

// Prod 2. sep: /innsikt skrev `live:2` med 6 t TTL, /live leste samme nøkkel
// via getLive og fikk «fersk» tilbake uten revalidering — mens alderstaket på
// 10 min slo til. Ferdig runde skal derfor BEVISST leses fra 6 t-lageret;
// pågående runde skal fortsatt fornyes etter 1 min. (v1.12.2: 6 t-lageret har
// egen nøkkel `live:N:hist` — fellen er lukket ved kilden.)
const liveBootstrap = (finished) => ({
  ...bootstrap,
  events: [{ id: 2, is_current: true, finished }],
});

async function assembleTwiceTwoMinutesApart(finished) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  let t = 1_000_000;
  cacheClear();
  cacheSetNow(() => t);
  fplSetNow(() => t);
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });
    if (u.endsWith('bootstrap-static/')) return json(liveBootstrap(finished));
    if (u.includes('fixtures/')) return json([]);
    if (u.endsWith('event/2/live/')) return json({ elements: [] });
    return json('', 404); // picks/entry/liga: mykt fravær
  };
  try {
    const first = await assembleLive();
    t += 2 * 60_000;
    const second = await assembleLive();
    await cacheFlush();
    return { first, second, liveFetches: calls.filter((u) => u.endsWith('event/2/live/')).length };
  } finally {
    globalThis.fetch = originalFetch;
    cacheSetNow(null);
    fplSetNow(null);
    cacheClear();
  }
}

test('assembleLive henter en ferdig runde via 6 t-lageret: ett kall på to minutter', async () => {
  const r = await assembleTwiceTwoMinutesApart(true);
  assert.equal(r.first.gameweek, 2);
  assert.equal(r.first.finished, true);
  assert.equal(r.liveFetches, 1, 'ferdig runde skal ikke revalideres etter 1 min');
});

test('assembleLive fornyer en pågående runde etter 1 min: to kall på to minutter', async () => {
  const r = await assembleTwiceTwoMinutesApart(false);
  assert.equal(r.first.finished, false);
  assert.equal(r.liveFetches, 2, 'pågående runde skal revalideres (SWR) etter 1 min');
});
