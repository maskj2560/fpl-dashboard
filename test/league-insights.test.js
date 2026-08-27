import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leagueRanksByGw,
  buildLeagueGraph,
  pickRival,
  buildRivalCompare,
  effectiveCaptain,
  buildCaptainLeague,
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
