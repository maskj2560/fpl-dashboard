import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clear } from '../src/services/cache.js';
import {
  leagueRanksByGw,
  buildLeagueGraph,
  pickRival,
  buildRivalCompare,
  effectiveCaptain,
  buildCaptainLeague,
  _mapLimit,
  assembleLeagueInsights,
  buildReportData,
  assembleLeagueReportData,
} from '../src/services/league-insights.js';

// ---- fixtures ------------------------------------------------------------

function manager(entry, entryName, playerName, extra = {}) {
  return {
    entry,
    entry_name: entryName,
    player_name: playerName,
    rank: extra.rank ?? 1,
    last_rank: extra.last_rank ?? extra.rank ?? 1,
    total: extra.total ?? 0,
    event_total: extra.event_total ?? 0,
  };
}

function historyRows(totalsPerGw) {
  return totalsPerGw.map((total, i) => ({ event: i + 1, total_points: total }));
}

const results = [
  manager(1, 'Lag A', 'Anna'),
  manager(2, 'Lag B', 'Bendik'),
  manager(3, 'Lag C', 'Carl'),
];

// ---- leagueRanksByGw -----------------------------------------------------

test('leagueRanksByGw rangerer per runde etter total, lavest entry vinner ved likhet', () => {
  const histories = new Map([
    [1, historyRows([50, 80])],
    [2, historyRows([50, 90])],
    [3, historyRows([40, 85])],
  ]);

  const ranks = leagueRanksByGw({ results, histories, maxGw: 2 });

  assert.deepEqual(ranks.gws, [1, 2]);
  const byEntry = new Map(ranks.series.map((s) => [s.entry, s]));
  // GW1: A og B har 50 hver — lavest entry-id (A) får rank 1.
  assert.equal(byEntry.get(1).points[0].rank, 1);
  assert.equal(byEntry.get(2).points[0].rank, 2);
  assert.equal(byEntry.get(3).points[0].rank, 3);
  // GW2: B 90, C 85, A 80.
  assert.equal(byEntry.get(2).points[1].rank, 1);
  assert.equal(byEntry.get(3).points[1].rank, 2);
  assert.equal(byEntry.get(1).points[1].rank, 3);
  assert.equal(byEntry.get(1).entryName, 'Lag A');
  assert.equal(byEntry.get(1).playerName, 'Anna');
});

test('leagueRanksByGw teller kun runder til og med maxGw og gir null-punkt uten historikkrad', () => {
  const histories = new Map([
    [1, historyRows([50, 80, 120])], // GW3 finnes, men maxGw er 2
    [2, historyRows([50, 90, 130])],
    [3, historyRows([40])], // mangler GW2
  ]);

  const ranks = leagueRanksByGw({ results, histories, maxGw: 2 });

  assert.deepEqual(ranks.gws, [1, 2]);
  const c = ranks.series.find((s) => s.entry === 3);
  assert.equal(c.points[1], null, 'manglende historikkrad skal gi null, ikke 0');
  // Rangeringen i GW2 teller bare de som har data.
  const b = ranks.series.find((s) => s.entry === 2);
  assert.equal(b.points[1].rank, 1);
});

test('leagueRanksByGw returnerer null uten ferdige runder', () => {
  const histories = new Map([[1, historyRows([50])]]);
  assert.equal(leagueRanksByGw({ results, histories, maxGw: 0 }), null);
  assert.equal(leagueRanksByGw({ results: [], histories: new Map(), maxGw: 3 }), null);
});

// ---- buildLeagueGraph ----------------------------------------------------

function ranksFixture() {
  const histories = new Map([
    [1, historyRows([50, 80])],
    [2, historyRows([50, 90])],
    [3, historyRows([40, 85])],
  ]);
  return leagueRanksByGw({ results, histories, maxGw: 2 });
}

test('buildLeagueGraph: rank 1 ligger øverst (y=0), sisteplass nederst (y=height)', () => {
  const graph = buildLeagueGraph({ ranks: ranksFixture(), myEntry: 1 });

  assert.equal(graph.width, 600);
  assert.equal(graph.height, 140);
  const a = graph.series.find((s) => s.entry === 1);
  // A: rank 1 i GW1 (y=0), rank 3 i GW2 (y=140). x: 0 og 600.
  assert.equal(a.points, '0,0 600,140');
  const b = graph.series.find((s) => s.entry === 2);
  assert.equal(b.points, '0,70 600,0');
  assert.equal(b.lastRank, 1);
});

test('buildLeagueGraph flagger me/rival og legger dem sist i serien', () => {
  const graph = buildLeagueGraph({ ranks: ranksFixture(), myEntry: 1, rivalEntry: 3 });

  const order = graph.series.map((s) => s.entry);
  assert.deepEqual(order, [2, 3, 1], 'øvrige først, så rival, meg aller sist');
  assert.equal(graph.series[2].me, true);
  assert.equal(graph.series[1].rival, true);
  assert.equal(graph.series[0].me, false);
  assert.equal(graph.managers, 3);
});

test('buildLeagueGraph med én runde setter single, og null-ranks gir null', () => {
  const histories = new Map([
    [1, historyRows([50])],
    [2, historyRows([60])],
    [3, historyRows([40])],
  ]);
  const ranks = leagueRanksByGw({ results, histories, maxGw: 1 });

  const graph = buildLeagueGraph({ ranks, myEntry: 1 });
  assert.equal(graph.single, true);
  // Ett punkt sentreres på midten av bredden.
  assert.equal(graph.series.find((s) => s.entry === 2).points, '300,0');

  assert.equal(buildLeagueGraph({ ranks: null, myEntry: 1 }), null);
});

// ---- pickRival -----------------------------------------------------------

const tableResults = [
  manager(10, 'Topplaget', 'Tone', { rank: 1, total: 150 }),
  manager(20, 'Midtlaget', 'Mads', { rank: 2, total: 140 }),
  manager(30, 'Mitt lag', 'Marius', { rank: 3, total: 130 }),
  manager(40, 'Bunnlaget', 'Bård', { rank: 4, total: 120 }),
];

test('pickRival: forespurt rival brukes når den finnes i ligaen', () => {
  assert.equal(pickRival({ results: tableResults, myEntry: 30, requested: 40 }), 40);
});

test('pickRival: default er nærmeste over meg i tabellen', () => {
  assert.equal(pickRival({ results: tableResults, myEntry: 30 }), 20);
});

test('pickRival: leder får nærmeste under, alene gir null', () => {
  assert.equal(pickRival({ results: tableResults, myEntry: 10 }), 20);
  assert.equal(pickRival({ results: [tableResults[2]], myEntry: 30 }), null);
  assert.equal(pickRival({ results: tableResults, myEntry: 999 }), null);
});

test('pickRival ignorerer ukjent id og meg selv som forespurt rival', () => {
  assert.equal(pickRival({ results: tableResults, myEntry: 30, requested: 777 }), 20);
  assert.equal(pickRival({ results: tableResults, myEntry: 30, requested: 30 }), 20);
});

// ---- buildRivalCompare ---------------------------------------------------

function el(id, name, team, eventPoints, ownership) {
  return {
    id,
    web_name: name,
    team,
    event_points: eventPoints,
    selected_by_percent: String(ownership),
  };
}

const elements = [
  el(101, 'Haaland', 1, 12, '55.0'),
  el(102, 'Salah', 2, 8, '45.0'),
  el(103, 'Watkins', 3, 2, '20.0'),
  el(104, 'Isak', 4, 6, '30.0'),
  el(105, 'Raya', 5, 3, '15.0'),
];

const teamsById = new Map([
  [1, { short_name: 'MCI', code: 43 }],
  [2, { short_name: 'LIV', code: 14 }],
  [3, { short_name: 'AVL', code: 7 }],
  [4, { short_name: 'NEW', code: 4 }],
  [5, { short_name: 'ARS', code: 3 }],
]);

function picksOf(ids, captainId, multiplier = 2) {
  return {
    picks: ids.map((id, i) => ({
      element: id,
      position: i + 1,
      is_captain: id === captainId,
      is_vice_captain: false,
      multiplier: id === captainId ? multiplier : 1,
    })),
  };
}

test('buildRivalCompare regner avstand totalt og siste runde med riktig fortegn', () => {
  const results = [
    manager(30, 'Mitt lag', 'Marius', { rank: 3, total: 130, event_total: 60 }),
    manager(20, 'Midtlaget', 'Mads', { rank: 2, total: 140, event_total: 55 }),
  ];
  const compare = buildRivalCompare({
    myEntry: 30,
    rivalEntry: 20,
    results,
    myPicks: picksOf([101, 102], 101),
    rivalPicks: picksOf([101, 103], 103),
    elements,
    teamsById,
  });

  assert.equal(compare.me.entryName, 'Mitt lag');
  assert.equal(compare.rival.playerName, 'Mads');
  assert.equal(compare.gapTotal, 10); // rival 140 − meg 130
  assert.equal(compare.gapEvent, -5); // rival 55 − meg 60
});

test('buildRivalCompare: differensialer begge veier med rundens poeng + felles spillere', () => {
  const results = [
    manager(30, 'Mitt lag', 'Marius', { rank: 3, total: 130 }),
    manager(20, 'Midtlaget', 'Mads', { rank: 2, total: 140 }),
  ];
  const compare = buildRivalCompare({
    myEntry: 30,
    rivalEntry: 20,
    results,
    myPicks: picksOf([101, 102, 104], 101),
    rivalPicks: picksOf([101, 103, 105], 103),
    elements,
    teamsById,
  });

  // Mine differensialer: Salah (45 %) før Isak (30 %) — eierandel-rekkefølge.
  assert.deepEqual(compare.diff.mine.map((p) => p.name), ['Salah', 'Isak']);
  assert.deepEqual(compare.diff.theirs.map((p) => p.name), ['Watkins', 'Raya']);
  assert.equal(compare.diff.mine[0].eventPoints, 8);
  assert.equal(compare.diff.mine[0].teamShort, 'LIV');
  // Felles: kun Haaland.
  assert.deepEqual(compare.shared.map((p) => p.name), ['Haaland']);
  assert.equal(compare.shared[0].teamCode, 43);
});

test('buildRivalCompare finner begges kaptein og flagger TC, og gir null uten picks', () => {
  const results = [
    manager(30, 'Mitt lag', 'Marius', { rank: 3, total: 130 }),
    manager(20, 'Midtlaget', 'Mads', { rank: 2, total: 140 }),
  ];
  const compare = buildRivalCompare({
    myEntry: 30,
    rivalEntry: 20,
    results,
    myPicks: picksOf([101, 102], 101, 3), // TC
    rivalPicks: picksOf([103, 104], 104),
    elements,
    teamsById,
  });

  assert.equal(compare.captains.mine.name, 'Haaland');
  assert.equal(compare.captains.mine.tc, true);
  assert.equal(compare.captains.rival.name, 'Isak');
  assert.equal(compare.captains.rival.tc, false);
  assert.equal(compare.captains.rival.eventPoints, 6);

  assert.equal(
    buildRivalCompare({
      myEntry: 30,
      rivalEntry: 20,
      results,
      myPicks: null,
      rivalPicks: picksOf([103], 103),
      elements,
      teamsById,
    }),
    null,
  );
});

// ---- effectiveCaptain + buildCaptainLeague -------------------------------

function squadPicks(rows) {
  // rows: [element, position, flags]
  return {
    picks: rows.map(([element, position, flags = {}]) => ({
      element,
      position,
      is_captain: flags.c ?? false,
      is_vice_captain: flags.v ?? false,
      multiplier: flags.m ?? (flags.c ? 2 : 1),
    })),
  };
}

function liveOf(pointsById) {
  return {
    elements: Object.entries(pointsById).map(([id, p]) => ({
      id: Number(id),
      stats: { total_points: p },
    })),
  };
}

const captainResults = [
  manager(30, 'Mitt lag', 'Marius', { rank: 1 }),
  manager(20, 'Midtlaget', 'Mads', { rank: 2 }),
];

test('kapteinens poeng telles rått (1x) selv om multiplier er 2', () => {
  const picksByEntry = new Map([
    [30, new Map([[1, squadPicks([[101, 1, { c: true }], [102, 2], [103, 12]])]])],
    [20, new Map([[1, squadPicks([[102, 1, { c: true }], [101, 2]])]])],
  ]);
  const liveByGw = new Map([[1, liveOf({ 101: 12, 102: 8, 103: 4 })]]);

  const table = buildCaptainLeague({
    results: captainResults,
    picksByEntry,
    liveByGw,
    elements,
    teamsById,
    gws: [1],
    lastGw: 1,
  });

  const mine = table.rows.find((r) => r.entry === 30);
  assert.equal(mine.last.name, 'Haaland');
  assert.equal(mine.last.points, 12, 'rå poeng, aldri ganget med multiplier');
  assert.equal(mine.last.optimal, 12);
  assert.equal(mine.last.lost, 0);
  const rival = table.rows.find((r) => r.entry === 20);
  assert.equal(rival.last.points, 8);
  assert.equal(rival.last.optimal, 12); // Haaland i start-XI slo kapteinen
  assert.equal(rival.last.lost, 4);
});

test('TC (multiplier 3) endrer ikke råpoengene, men flagges tc', () => {
  const picks = squadPicks([[101, 1, { c: true, m: 3 }], [102, 2]]);
  assert.equal(effectiveCaptain(picks).element, 101);

  const picksByEntry = new Map([[30, new Map([[1, picks]])]]);
  const liveByGw = new Map([[1, liveOf({ 101: 12, 102: 8 })]]);
  const table = buildCaptainLeague({
    results: [captainResults[0]],
    picksByEntry,
    liveByGw,
    elements,
    teamsById,
    gws: [1],
    lastGw: 1,
  });
  assert.equal(table.rows[0].last.points, 12);
  assert.equal(table.rows[0].last.tc, true);
});

test('vise-kapteinen med multiplier 2 er effektiv kaptein når kapteinen sto over', () => {
  // Kapteinen (101) spilte ikke — FPL flytter bindet: VC får multiplier 2.
  const picks = squadPicks([
    [101, 1, { c: true, m: 1 }],
    [102, 2, { v: true, m: 2 }],
  ]);
  assert.equal(effectiveCaptain(picks).element, 102);
});

test('optimal er beste råscore i start-XI — benken (position > 11) teller ikke', () => {
  const picksByEntry = new Map([
    [30, new Map([[1, squadPicks([[102, 1, { c: true }], [104, 2], [101, 12]])]])],
  ]);
  // Haaland (101) scorer mest, men står på benken (position 12).
  const liveByGw = new Map([[1, liveOf({ 101: 12, 102: 8, 104: 6 })]]);
  const table = buildCaptainLeague({
    results: [captainResults[0]],
    picksByEntry,
    liveByGw,
    elements,
    teamsById,
    gws: [1],
    lastGw: 1,
  });
  assert.equal(table.rows[0].last.optimal, 8);
  assert.equal(table.rows[0].last.lost, 0);
});

test('manager uten picks i en runde hoppes over og rounds teller riktig', () => {
  const picksByEntry = new Map([
    [30, new Map([
      [1, squadPicks([[101, 1, { c: true }]])],
      [2, squadPicks([[102, 1, { c: true }]])],
    ])],
    [20, new Map([[1, squadPicks([[102, 1, { c: true }]])], [2, null]])],
  ]);
  const liveByGw = new Map([
    [1, liveOf({ 101: 10, 102: 5 })],
    [2, liveOf({ 101: 4, 102: 7 })],
  ]);
  const table = buildCaptainLeague({
    results: captainResults,
    picksByEntry,
    liveByGw,
    elements,
    teamsById,
    gws: [1, 2],
    lastGw: 2,
  });

  const mine = table.rows.find((r) => r.entry === 30);
  assert.equal(mine.sum.points, 17); // 10 + 7
  assert.equal(mine.sum.rounds, 2);
  const rival = table.rows.find((r) => r.entry === 20);
  assert.equal(rival.sum.points, 5);
  assert.equal(rival.sum.rounds, 1);
  assert.equal(rival.last, null, 'uten picks i siste runde er last null');
});

test('rader sorteres på sum poeng, deretter minst tapt — og vindu som ikke starter på GW1 er capped', () => {
  const picksByEntry = new Map([
    [30, new Map([[3, squadPicks([[101, 1, { c: true }], [102, 2]])]])],
    [20, new Map([[3, squadPicks([[102, 1, { c: true }], [101, 2]])]])],
  ]);
  const liveByGw = new Map([[3, liveOf({ 101: 10, 102: 10 })]]);
  const table = buildCaptainLeague({
    results: captainResults,
    picksByEntry,
    liveByGw,
    elements,
    teamsById,
    gws: [3],
    lastGw: 3,
  });

  // Begge har 10 kapteinspoeng; 30 tapte 0, 20 tapte 0 — likhet beholdes,
  // men sorteringens fasit pinnes med et skjevt tilfelle:
  assert.deepEqual(table.rows.map((r) => r.entry), [30, 20]);
  assert.equal(table.capped, true, 'gws starter på 3 — eldre runder er kuttet');
  assert.equal(table.depth, 10);

  const liveSkewed = new Map([[3, liveOf({ 101: 10, 102: 4 })]]);
  const skewed = buildCaptainLeague({
    results: captainResults,
    picksByEntry,
    liveByGw: liveSkewed,
    elements,
    teamsById,
    gws: [3],
    lastGw: 3,
  });
  // 30 kapteinet Haaland (10, tapt 0); 20 kapteinet Salah (4, tapt 6).
  assert.deepEqual(skewed.rows.map((r) => r.entry), [30, 20]);
  assert.equal(skewed.rows[1].sum.lost, 6);
});

// ---- _mapLimit + assembleLeagueInsights ----------------------------------

test('_mapLimit kjører maks N samtidig og bevarer rekkefølgen', async () => {
  let inFlight = 0;
  let peak = 0;
  const fn = async (x) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight -= 1;
    return x * 10;
  };

  const out = await _mapLimit([1, 2, 3, 4, 5, 6], 2, fn);

  assert.deepEqual(out, [10, 20, 30, 40, 50, 60]);
  assert.ok(peak <= 2, `peak var ${peak}, skal være maks 2`);
});

describe('assembleLeagueInsights', () => {
  const originalFetch = globalThis.fetch;
  let calls;

  beforeEach(() => {
    clear();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function standingsOf(rows) {
    return { league: { name: 'Testligaen' }, standings: { results: rows } };
  }

  function row(entry, rank, total, eventTotal = 0) {
    return {
      entry,
      entry_name: `Lag ${entry}`,
      player_name: `Spiller ${entry}`,
      rank,
      last_rank: rank,
      total,
      event_total: eventTotal,
    };
  }

  function bootstrapOf(events) {
    return {
      events,
      elements: [
        { id: 101, web_name: 'Haaland', team: 1, event_points: 12, selected_by_percent: '55.0' },
        { id: 102, web_name: 'Salah', team: 2, event_points: 8, selected_by_percent: '45.0' },
      ],
      teams: [
        { id: 1, short_name: 'MCI', code: 43 },
        { id: 2, short_name: 'LIV', code: 14 },
      ],
    };
  }

  function serve(routes) {
    globalThis.fetch = async (url) => {
      const u = String(url);
      calls.push(u);
      const hit = routes.find(([re]) => re.test(u));
      assert.ok(hit, `uventet URL: ${u}`);
      const body = typeof hit[1] === 'function' ? hit[1](u) : hit[1];
      if (body && body.__status) {
        return { ok: false, status: body.__status, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => body };
    };
  }

  const historyFor = () => ({ current: [{ event: 1, total_points: 50 }] });
  const picksFor = (cap) => ({
    picks: [
      { element: 101, position: 1, is_captain: cap === 101, is_vice_captain: false, multiplier: cap === 101 ? 2 : 1 },
      { element: 102, position: 2, is_captain: cap === 102, is_vice_captain: false, multiplier: cap === 102 ? 2 : 1 },
    ],
  });

  test('assembleLeagueInsights bygger alle tre seksjoner fra mocket API', async () => {
    const events = [
      { id: 1, is_current: false, finished: true },
      { id: 2, is_current: true, finished: false },
    ];
    serve([
      [/bootstrap-static\/$/, bootstrapOf(events)],
      [/leagues-classic\/99\/standings\//, standingsOf([row(77, 1, 80, 40), row(42, 2, 70, 35)])],
      [/entry\/\d+\/history\/$/, historyFor],
      [/entry\/42\/event\/\d+\/picks\/$/, picksFor(101)],
      [/entry\/77\/event\/\d+\/picks\/$/, picksFor(102)],
      [/event\/1\/live\/$/, { elements: [{ id: 101, stats: { total_points: 12 } }, { id: 102, stats: { total_points: 8 } }] }],
    ]);

    const insights = await assembleLeagueInsights({ leagueId: 99, teamId: 42 });

    assert.equal(insights.leagueName, 'Testligaen');
    assert.equal(insights.rivalEntry, 77, 'nærmeste over meg');
    assert.equal(insights.rival.captains.mine.name, 'Haaland');
    assert.equal(insights.graph.managers, 2);
    assert.equal(insights.captainLeague.rows.length, 2);
    assert.equal(insights.gw, 2);
  });

  test('kutter ligaen til 20 managere og kapteinsligaen til 10 runder', async () => {
    const events = [];
    for (let i = 1; i <= 12; i++) events.push({ id: i, is_current: i === 12, finished: true });
    const rows = [];
    for (let e = 1; e <= 25; e++) rows.push(row(e, e, 100 - e));
    const longHistory = () => ({
      current: Array.from({ length: 12 }, (_, i) => ({ event: i + 1, total_points: (i + 1) * 10 })),
    });
    serve([
      [/bootstrap-static\/$/, bootstrapOf(events)],
      [/leagues-classic\/99\/standings\//, standingsOf(rows)],
      [/entry\/\d+\/history\/$/, longHistory],
      [/entry\/\d+\/event\/\d+\/picks\/$/, picksFor(101)],
      [/event\/\d+\/live\/$/, { elements: [{ id: 101, stats: { total_points: 5 } }] }],
    ]);

    const insights = await assembleLeagueInsights({ leagueId: 99, teamId: 1 });

    assert.equal(insights.graph.managers, 20);
    assert.deepEqual(insights.captainLeague.gws, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(insights.captainLeague.capped, true);
    assert.ok(!calls.some((u) => /event\/[12]\/picks\//.test(u)), 'runde 1-2 er kuttet av dybdetaket');
  });

  test('en seksjon som feiler gir null - de andre leveres', async () => {
    const events = [
      { id: 1, is_current: false, finished: true },
      { id: 2, is_current: true, finished: false },
    ];
    serve([
      [/bootstrap-static\/$/, bootstrapOf(events)],
      [/leagues-classic\/99\/standings\//, standingsOf([row(77, 1, 80), row(42, 2, 70)])],
      [/entry\/\d+\/history\/$/, historyFor],
      [/entry\/\d+\/event\/2\/picks\/$/, { __status: 500 }],
      [/entry\/\d+\/event\/1\/picks\/$/, picksFor(101)],
      [/event\/1\/live\/$/, { elements: [{ id: 101, stats: { total_points: 12 } }] }],
    ]);

    const insights = await assembleLeagueInsights({ leagueId: 99, teamId: 42 });

    assert.equal(insights.rival, null, 'rundens picks feilet -> rival-radar null');
    assert.ok(insights.graph, 'grafen leveres likevel');
    assert.ok(insights.captainLeague, 'kaptein-ligaen leveres likevel');
  });

  test('henter aldri element-summary, og rundens picks kun for meg og rivalen', async () => {
    const events = [
      { id: 1, is_current: false, finished: true },
      { id: 2, is_current: true, finished: false },
    ];
    serve([
      [/bootstrap-static\/$/, bootstrapOf(events)],
      [/leagues-classic\/99\/standings\//, standingsOf([row(77, 1, 80), row(42, 2, 70), row(55, 3, 60)])],
      [/entry\/\d+\/history\/$/, historyFor],
      [/entry\/\d+\/event\/\d+\/picks\/$/, picksFor(101)],
      [/event\/1\/live\/$/, { elements: [{ id: 101, stats: { total_points: 12 } }] }],
    ]);

    await assembleLeagueInsights({ leagueId: 99, teamId: 42 });

    assert.ok(!calls.some((u) => /element-summary/.test(u)), 'aldri element-summary');
    const currentPicks = calls.filter((u) => /event\/2\/picks\//.test(u));
    assert.equal(currentPicks.length, 2, 'kun meg + rival for uferdig runde');
    const historicPicks = calls.filter((u) => /event\/1\/picks\//.test(u));
    assert.equal(historicPicks.length, 3, 'kaptein-ligaen henter alle tre for ferdig runde');
  });
});

// ---- buildReportData + assembleLeagueReportData --------------------------

function reportFixture() {
  const reportResults = [
    { entry: 123, entry_name: 'Marius XI', player_name: 'Marius S.', rank: 1, last_rank: 3, event_total: 60, total: 100 },
    { entry: 456, entry_name: 'Rival FC', player_name: 'Rival R.', rank: 2, last_rank: 1, event_total: 42, total: 95 },
    { entry: 789, entry_name: 'Nykommer FC', player_name: 'Ny N.', rank: 3, last_rank: 3, event_total: 71, total: 80 },
  ];
  const captainRound = {
    gws: [2],
    lastGw: 2,
    depth: 10,
    capped: false,
    rows: [
      { entry: 123, entryName: 'Marius XI', last: { name: 'Haaland', points: 12, optimal: 12, lost: 0, tc: false }, sum: { points: 12, lost: 0, rounds: 1 } },
      { entry: 456, entryName: 'Rival FC', last: { name: 'Salah', points: 4, optimal: 9, lost: 5, tc: true }, sum: { points: 4, lost: 5, rounds: 1 } },
      { entry: 789, entryName: 'Nykommer FC', last: null, sum: { points: 0, lost: 0, rounds: 0 } },
    ],
  };
  return { reportResults, captainRound };
}

/** Picks + live + elements for lagdetaljene i rapporten (samme runde 2). */
function reportDetailsFixture() {
  const elements = [
    { id: 101, web_name: 'Haaland' },
    { id: 102, web_name: 'Salah' },
    { id: 103, web_name: 'Isak' },
    { id: 104, web_name: 'Botman' },
    { id: 105, web_name: 'Raya' },
    { id: 106, web_name: 'Mbeumo' },
    { id: 107, web_name: 'Wood' },
  ];
  const live = {
    elements: [
      { id: 101, stats: { total_points: 18 } },
      { id: 102, stats: { total_points: 4 } },
      { id: 103, stats: { total_points: 10 } },
      { id: 104, stats: { total_points: 1 } },
      { id: 105, stats: { total_points: 5 } },
      { id: 106, stats: { total_points: 7 } },
      { id: 107, stats: { total_points: 3 } },
    ],
  };
  const picks = {
    // Marius XI: rapportert benk, hit, ingen chip.
    123: {
      active_chip: null,
      entry_history: { points_on_bench: 7, event_transfers: 2, event_transfers_cost: 8 },
      picks: [
        { element: 101, multiplier: 2 },
        { element: 104, multiplier: 1 },
        { element: 105, multiplier: 1 },
        { element: 106, multiplier: 0 },
      ],
    },
    // Rival FC: mangler points_on_bench (fallback fra benkepicks), TC-chip.
    456: {
      active_chip: '3xc',
      entry_history: { event_transfers: 0, event_transfers_cost: 0 },
      picks: [
        { element: 101, multiplier: 1 },
        { element: 102, multiplier: 3 },
        { element: 104, multiplier: 1 },
        { element: 107, multiplier: 0 },
      ],
    },
    // Nykommer FC: eneste eier av Isak (differensial).
    789: {
      active_chip: null,
      entry_history: { points_on_bench: 0, event_transfers: 1, event_transfers_cost: 0 },
      picks: [
        { element: 103, multiplier: 2 },
        { element: 104, multiplier: 1 },
      ],
    },
  };
  const picksByEntry = new Map(
    Object.entries(picks).map(([entry, p]) => [Number(entry), new Map([[2, p]])]),
  );
  return { elements, live, picksByEntry };
}

test('buildReportData kaarer rundevinner og -taper paa rundepoeng', () => {
  const { reportResults, captainRound } = reportFixture();
  const data = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
  });

  assert.equal(data.winner.entryName, 'Nykommer FC');
  assert.equal(data.winner.eventTotal, 71);
  assert.equal(data.loser.entryName, 'Rival FC');
  assert.equal(data.loser.eventTotal, 42);
  assert.equal(data.league.name, 'Testligaen');
  assert.equal(data.league.size, 3);
  assert.equal(data.event.name, 'Runde 2');
});

test('buildReportData tar med bevegelser og min runde med kapteinsfasit', () => {
  const { reportResults, captainRound } = reportFixture();
  const data = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
  });

  // 123 gikk 3 -> 1, 456 gikk 1 -> 2; 789 sto stille.
  assert.deepEqual(data.movers, [
    { entryName: 'Marius XI', from: 3, to: 1 },
    { entryName: 'Rival FC', from: 1, to: 2 },
  ]);
  assert.equal(data.mine.rank, 1);
  assert.equal(data.mine.lastRank, 3);
  assert.equal(data.mine.captain.name, 'Haaland');
  assert.equal(data.mine.captain.lost, 0);
  // Kapteinslista tar kun managere med picks den runden.
  assert.deepEqual(data.captains.map((c) => c.entryName), ['Marius XI', 'Rival FC']);
  assert.equal(data.captains[1].tc, true);
});

test('buildReportData bygger lagdetaljer med benk, chip, hits og toppscorer', () => {
  const { reportResults, captainRound } = reportFixture();
  const { elements, live, picksByEntry } = reportDetailsFixture();
  const data = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
    picksByEntry,
    live,
    elements,
  });

  // Sortert som tabellen (results-rekkefølgen).
  assert.deepEqual(data.teams.map((t) => t.entryName), ['Marius XI', 'Rival FC', 'Nykommer FC']);

  const [mine, rival, ny] = data.teams;
  assert.equal(mine.bench, 7); // rapportert points_on_bench
  assert.equal(mine.chip, null);
  assert.equal(mine.transfers, 2);
  assert.equal(mine.hit, 8);
  assert.deepEqual(mine.topScorer, { name: 'Haaland', points: 18 }); // rå 1×, ikke kapteinsdoblet

  assert.equal(rival.bench, 3); // fallback: benkepicks (multiplier 0) mot live
  assert.equal(rival.chip, 'TC');
  assert.deepEqual(rival.topScorer, { name: 'Haaland', points: 18 });

  assert.deepEqual(ny.topScorer, { name: 'Isak', points: 10 });
});

test('buildReportData finner differensialer og flopper i ligaen', () => {
  const { reportResults, captainRound } = reportFixture();
  const { elements, live, picksByEntry } = reportDetailsFixture();
  const data = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
    picksByEntry,
    live,
    elements,
  });

  // Isak: eid kun av Nykommer FC, 10 p (>= 8). Salah (4 p) og Raya (5 p) er
  // også aleneeid, men under terskelen. Benkespillere teller ikke som eierskap.
  assert.deepEqual(data.differentials, [{ entryName: 'Nykommer FC', name: 'Isak', points: 10 }]);
  // Botman: i start-XI hos alle tre, 1 p (<= 2).
  assert.deepEqual(data.flops, [{ name: 'Botman', points: 1, owners: 3 }]);
});

test('buildReportData tåler manglende picks og utelatte nye arg', () => {
  const { reportResults, captainRound } = reportFixture();
  const { elements, live, picksByEntry } = reportDetailsFixture();
  picksByEntry.set(456, new Map([[2, null]])); // henting feilet for én manager

  const data = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
    picksByEntry,
    live,
    elements,
  });
  // Manager uten picks utelates fra lagdetaljene — tabellen dekker laget uansett.
  assert.deepEqual(data.teams.map((t) => t.entryName), ['Marius XI', 'Nykommer FC']);

  // Helt uten de nye argene (gamle kallere): tomme lister, resten uendret.
  const bare = buildReportData({
    event: { id: 2, name: 'Runde 2' },
    leagueName: 'Testligaen',
    results: reportResults,
    captainRound,
    myEntry: 123,
  });
  assert.deepEqual(bare.teams, []);
  assert.deepEqual(bare.differentials, []);
  assert.deepEqual(bare.flops, []);
  assert.equal(bare.winner.entryName, 'Nykommer FC');
});

describe('assembleLeagueReportData', () => {
  const originalFetch = globalThis.fetch;
  let calls;

  beforeEach(() => {
    clear();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('henter picks kun for rapportrunden', async () => {
    const routes = [
      [/bootstrap-static\/$/, {
        events: [{ id: 1, is_current: false, finished: true }, { id: 2, is_current: true, finished: false }],
        elements: [{ id: 101, web_name: 'Haaland', team: 1, event_points: 12, selected_by_percent: '55.0' }],
        teams: [{ id: 1, short_name: 'MCI', code: 43 }],
      }],
      [/leagues-classic\/99\/standings\//, {
        league: { name: 'Testligaen' },
        standings: { results: [
          { entry: 42, entry_name: 'Mitt lag', player_name: 'Marius S.', rank: 1, last_rank: 2, event_total: 30, total: 80 },
          { entry: 77, entry_name: 'Rival FC', player_name: 'Rival R.', rank: 2, last_rank: 1, event_total: 20, total: 70 },
        ] },
      }],
      [/event\/1\/live\/$/, { elements: [{ id: 101, stats: { total_points: 12 } }] }],
      [/entry\/\d+\/event\/1\/picks\/$/, { picks: [{ element: 101, position: 1, is_captain: true, is_vice_captain: false, multiplier: 2 }] }],
    ];
    globalThis.fetch = async (url) => {
      const u = String(url);
      calls.push(u);
      const hit = routes.find(([re]) => re.test(u));
      assert.ok(hit, `uventet URL: ${u}`);
      return { ok: true, status: 200, json: async () => hit[1] };
    };

    const data = await assembleLeagueReportData({
      leagueId: 99,
      teamId: 42,
      event: { id: 1, name: 'Runde 1' },
    });

    assert.equal(data.winner.entryName, 'Mitt lag');
    assert.equal(data.mine.captain.name, 'Haaland');
    assert.ok(!calls.some((u) => /event\/2\/picks\//.test(u)), 'aldri picks for andre runder');
    assert.equal(calls.filter((u) => /event\/1\/picks\//.test(u)).length, 2);
  });
});
