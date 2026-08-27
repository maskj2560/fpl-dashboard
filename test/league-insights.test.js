import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leagueRanksByGw,
  buildLeagueGraph,
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
