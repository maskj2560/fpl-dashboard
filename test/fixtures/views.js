// Mock-locals for view-render-testene. Ingen nettverkskall.
// Fasit er viewene selv: hvert objekt her dekker alle locals viewet refererer.
import { formatDateTime, formatNumber, formatSigned } from '../../src/services/format.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT, translateFplNews } from '../../src/services/analysis.js';
import { clubAssetsFrom } from '../../src/services/clubAssets.js';
import { CHIPS, CHIP_LABELS, describeRec } from '../../src/services/chips.js';

// STATUS_LABELS er definert lokalt i rutene (index.js/players.js), ikke eksportert.
const STATUS_LABELS = {
  a: 'Tilgjengelig', d: 'Tvilsom', i: 'Skadet', s: 'Utestengt',
  u: 'Utilgjengelig', n: 'Ikke med',
};

export const teamsById = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
  [2, { id: 2, name: 'Liverpool', short_name: 'LIV', code: 14 }],
]);
const teams = [...teamsById.values()];
// Arsenal har alle tre bildene, Liverpool ingen — begge grener i partialene rendres.
export const clubAssets = clubAssetsFrom(['t3.png', 'shirt_3.png', 'shirt_3_1.png']);

const player = (id, name, extra = {}) => ({
  id, web_name: name, team: 1, element_type: 3, now_cost: 55, form: '5.5',
  total_points: 42, points_per_game: '4.2', selected_by_percent: '12.3',
  expected_goals: '3.40', expected_assists: '2.10', status: 'a', news: '',
  chance_of_playing_next_round: null, transfers_in_event: 1000,
  transfers_out_event: 500, minutes: 900, bonus: 7,
  penalties_order: null, corners_and_indirect_freekicks_order: null,
  direct_freekicks_order: null, ...extra,
});

const shared = {
  teamsById, clubAssets, STATUS_LABELS, POSITIONS_SHORT, formatDateTime, formatPrice, formatNumber,
  translateFplNews,
};

export const dashboard = {
  ...shared,
  deadlineEvent: { name: 'Runde 1', deadline_time: '2026-08-21T17:30:00Z' },
  calendarUrl: 'webcal://fpl.marsk.no/kalender.ics',
  flagged: [player(1, 'Saka', { status: 'i', news: 'Knee injury - 25% chance of playing', chance_of_playing_next_round: 25 })],
  inForm: [player(2, 'Salah', { team: 2 })],
  boughtMost: [player(3, 'Haaland')],
  soldMost: [player(4, 'Watkins')],
  matrix: {
    gameweeks: [1, 2],
    rows: [{
      team: teamsById.get(1),
      cells: [[{ difficulty: 2, opponent: 'LIV', home: true }], []],
      avgDifficulty: 2,
    }],
  },
  newsPoints: ['**Salah** i storform før GW1'],
};

// Grenene uten deadline, uten flaggede spillere, uten AI-nyheter og med tom FDR-rad.
export const dashboardEmpty = {
  ...shared,
  deadlineEvent: null,
  flagged: [],
  inForm: [],
  boughtMost: [],
  soldMost: [],
  matrix: { gameweeks: [], rows: [{ team: teamsById.get(2), cells: [], avgDifficulty: null }] },
  newsPoints: [],
};

export const team = {
  teamsById, clubAssets, POSITIONS_SHORT, formatNumber, formatPrice,
  entry: {
    name: 'Marius XI', player_first_name: 'Marius', player_last_name: 'S.',
    summary_overall_points: 100, summary_overall_rank: 500000,
  },
  gw: 1,
  fromGw: 2,
  squadView: {
    activeChip: null,
    formation: '3-4-3',
    entryHistory: { points: 60, value: 1002, bank: 15 },
    byLine: {
      1: [{ pick: { is_captain: false, is_vice_captain: false }, player: player(1, 'Raya', { element_type: 1 }) }],
      2: [{ pick: { is_captain: false, is_vice_captain: true }, player: player(2, 'Gabriel', { element_type: 2 }) }],
      3: [{ pick: { is_captain: true, is_vice_captain: false }, player: player(3, 'Saka') }],
      4: [{ pick: { is_captain: false, is_vice_captain: false }, player: player(4, 'Haaland', { element_type: 4 }) }],
    },
    bench: [{ pick: {}, player: player(5, 'Turner', { element_type: 1 }) }],
  },
  graph: { points: '0,0 600,140', area: '0,0 600,140 600,140 0,140', min: 400000, max: 500000, last: 500000, gwFirst: 1, gwLast: 2 },
  chips: [],
  CHIPS, CHIP_LABELS, describeRec,
  chipPlan: {
    fromGw: 2,
    halves: [
      {
        half: 1, from: 1, to: 19,
        chips: {
          bboost: { used: null, rec: { gw: 5, squadFixtures: 24, avgFdr: 62 / 24, dgwClubs: ['ARS', 'CHE'] }, reason: null },
          '3xc': {
            used: null, reason: null,
            rec: { gw: 5, teamId: 1, teamShort: 'ARS', fixtures: [{ opponent: 'CHE', home: true, difficulty: 2 }, { opponent: 'LIV', home: false, difficulty: 2 }] },
          },
          freehit: { used: null, rec: null, reason: 'Ingen blankrunde rammer troppen bredt nok til Free Hit' },
          wildcard: { used: { event: 1 }, rec: null, reason: 'Brukt i runde 1' },
        },
      },
      {
        half: 2, from: 20, to: 38,
        chips: Object.fromEntries(CHIPS.map((n) => [n, { used: null, rec: null, reason: 'Kampprogrammet for halvdelen er ikke kjent ennå' }])),
      },
    ],
    dgw: [{ gw: 5, teams: ['ARS', 'CHE'] }],
    bgw: [{ gw: 6, teams: ['LIV', 'EVE'] }],
    noSpecial: false,
  },
  recommendations: {
    captains: [{ player: player(3, 'Saka'), criterion: 'form', reasons: ['Form 5.5', 'Lett kamp'] }],
    transfers: [{
      out: { player: player(4, 'Watkins'), reasons: ['Ute av form'] },
      inn: [{ player: player(6, 'Isak', { team: 2 }) }],
    }],
  },
};

// Før sesongstart: ingen picks, ingen historikk, ingen anbefalinger.
export const teamEmpty = {
  ...team,
  gw: null,
  squadView: null,
  graph: null,
  recommendations: null,
  chipPlan: null,
};

// Kampprogrammet har ingen dobbel-/blankrunder ennå.
export const teamNoSpecial = {
  ...team,
  chipPlan: { ...team.chipPlan, dgw: [], bgw: [], noSpecial: true },
};

const diffRow = (id, navn, over = {}) => ({
  id, navn, lag: { kort: 'ARS', kode: 3, navn: 'Arsenal' }, posKort: 'M',
  pris: '5.5', form: '5.5', eid: '4.2', fdr3: '2.7', score: '18.2', andel: 100, ...over,
});

export const players = {
  teamsById, clubAssets, POSITIONS, POSITIONS_SHORT, STATUS_LABELS, formatPrice, teams,
  players: [player(1, 'Saka', { penalties_order: 1 }), player(2, 'Salah', { team: 2, status: 'd' })],
  differentials: {
    terskler: [
      { prosent: 5, rows: [diffRow(1, 'Saka')] },
      {
        prosent: 10,
        rows: [
          diffRow(1, 'Saka'),
          diffRow(2, 'Salah', { lag: { kort: 'LIV', kode: 14, navn: 'Liverpool' }, score: '12.5', andel: 69 }),
        ],
      },
      { prosent: 15, rows: [diffRow(1, 'Saka')] },
    ],
  },
  setPieces: [
    {
      lag: { id: 1, navn: 'Arsenal', kort: 'ARS', kode: 3 },
      straffer: [{ id: 1, navn: 'Saka' }],
      hjorner: [{ id: 1, navn: 'Saka' }],
      frispark: [],
    },
    { lag: { id: 2, navn: 'Liverpool', kort: 'LIV', kode: 14 }, straffer: [], hjorner: [], frispark: [] },
  ],
};

// Sesongstart: ingen har form ennå, så differensiallista finnes ikke.
export const playersNoDiff = { ...players, differentials: null };

const leagueResults = [
  { entry: 123, entry_name: 'Marius XI', player_name: 'Marius S.', rank: 1, last_rank: 3, event_total: 60, total: 100 },
  { entry: 456, entry_name: 'Rival FC', player_name: 'Rival R.', rank: 2, last_rank: 1, event_total: 55, total: 95 },
  { entry: 789, entry_name: 'Nykommer FC', player_name: 'Ny N.', rank: 3, last_rank: 0, event_total: 40, total: 80 },
];

const radarPlayer = (id, name, eventPoints) => ({
  id, name, teamCode: 3, teamShort: 'ARS', eventPoints,
});

export const league = {
  teamsById, clubAssets,
  formatNumber, formatSigned, formatDateTime,
  myEntry: 123,
  rivalEntry: 456,
  leagues: [{
    league: { id: 999, name: 'Kompisligaen' },
    standings: { results: leagueResults },
  }],
  report: {
    lastReportedEvent: 2,
    text: 'Rundens vinner ble **Rival FC** med 55 poeng.\n\nSelv holdt du unna på topp.',
    generatedAt: '2026-08-27T10:00:00Z',
    source: 'ai',
  },
  insights: {
    gw: 2,
    leagueName: 'Kompisligaen',
    results: leagueResults,
    rivalEntry: 456,
    rival: {
      me: { entry: 123, entryName: 'Marius XI', playerName: 'Marius S.', rank: 1, total: 100, eventTotal: 60 },
      rival: { entry: 456, entryName: 'Rival FC', playerName: 'Rival R.', rank: 2, total: 95, eventTotal: 55 },
      gapTotal: -5,
      gapEvent: -5,
      diff: {
        theirs: [radarPlayer(7, 'Palmer', 9)],
        mine: [radarPlayer(8, 'Mbeumo', 5)],
      },
      shared: [radarPlayer(9, 'Haaland', 12)],
      captains: {
        mine: { ...radarPlayer(9, 'Haaland', 12), tc: false },
        rival: { ...radarPlayer(7, 'Palmer', 9), tc: true },
      },
    },
    graph: {
      width: 600,
      height: 140,
      gwFirst: 1,
      gwLast: 2,
      managers: 3,
      single: false,
      series: [
        { entry: 789, name: 'Nykommer FC', points: '0,140 600,140', me: false, rival: false, lastRank: 3 },
        { entry: 456, name: 'Rival FC', points: '0,70 600,0', me: false, rival: true, lastRank: 1 },
        { entry: 123, name: 'Marius XI', points: '0,0 600,70', me: true, rival: false, lastRank: 2 },
      ],
    },
    captainLeague: {
      gws: [1, 2],
      lastGw: 2,
      depth: 10,
      capped: false,
      rows: [
        { entry: 123, entryName: 'Marius XI', last: { name: 'Haaland', teamCode: 3, teamShort: 'ARS', points: 12, optimal: 12, lost: 0, tc: false }, sum: { points: 20, lost: 2, rounds: 2 } },
        { entry: 456, entryName: 'Rival FC', last: { name: 'Palmer', teamCode: 3, teamShort: 'ARS', points: 9, optimal: 12, lost: 3, tc: true }, sum: { points: 15, lost: 6, rounds: 2 } },
        { entry: 789, entryName: 'Nykommer FC', last: null, sum: { points: 5, lost: 0, rounds: 1 } },
      ],
    },
  },
};

// Kaptein-ligaen når dybdetaket har kuttet eldre runder.
export const leagueCaptainsCapped = {
  ...league,
  insights: {
    ...league.insights,
    captainLeague: {
      ...league.insights.captainLeague,
      gws: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      lastGw: 12,
      capped: true,
    },
  },
};

// Rapporten uten AI-nøkkel: datafallback skal ikke bære AI-merket.
export const leagueDataReport = {
  ...league,
  report: {
    lastReportedEvent: 2,
    text: 'Rundens vinner: **Rival FC** med 55 poeng.',
    generatedAt: '2026-08-27T10:00:00Z',
    source: 'data',
  },
};

// Ingen ligaer funnet — ingen innsikt å vise.
export const leagueEmpty = {
  teamsById, clubAssets,
  formatNumber, formatSigned, formatDateTime,
  myEntry: 123,
  rivalEntry: null,
  leagues: [],
  report: null,
  insights: null,
};

// P1-2: ligaen finnes, men tabellen er tom fram til første runde er spilt.
export const leagueNoRows = {
  teamsById, clubAssets,
  formatNumber, formatSigned, formatDateTime,
  myEntry: 123,
  rivalEntry: null,
  leagues: [{ league: { id: 1, name: 'Var Har Skylda' }, standings: { results: [] } }],
  report: null,
  insights: null,
};

// Rival valgt, men ingen differensialer noen vei (identiske tropper).
export const leagueEmptyDiff = {
  ...league,
  insights: {
    ...league.insights,
    rival: {
      ...league.insights.rival,
      diff: { theirs: [], mine: [] },
      shared: [radarPlayer(9, 'Haaland', 12)],
    },
  },
};

const briefData = {
  gameweek: { id: 1, name: 'Runde 1', deadlineFormatted: 'fredag 21. august kl. 19:30' },
  injuries: [{ name: 'Saka', team: 'ARS', teamCode: 3, ownership: '25.0', news: 'Kneskade — tvilsom' }],
  captains: [{ name: 'Salah', team: 'LIV', teamCode: 14, form: '7.2', ownership: '48.1', avgFdr: 2.3 }],
  fixturesByDay: [{ day: 'lørdag 22. august', matches: [{ kickoff: '13:30', home: 'Arsenal', away: 'Liverpool', homeCode: 3, awayCode: 14 }] }],
  mine: {
    captains: [{ player: player(3, 'Saka'), reasons: ['Hjemme mot LIV'] }],
    transfers: [{ out: { player: player(4, 'Watkins'), reasons: ['Ute av form'] }, inn: [{ player: player(6, 'Isak') }] }],
  },
};

// Lagsjekk (v1.9.0): samme form som buildDeadlineCheck gir.
export const deadlineCheck = {
  gw: 2,
  gwName: 'Runde 2',
  deadline: '2026-08-28T17:30:00Z',
  basis: 'laget fra runde 1 + byttene dine for runde 2',
  findings: [
    { type: 'kaptein', player: { id: 3, name: 'Saka', teamShort: 'ARS', teamCode: 3 }, detail: 'Skadet — Kneskade, ventes tilbake 1. nov.' },
    { type: 'tvilsom', player: { id: 6, name: 'Isak', teamShort: 'LIV', teamCode: 14 }, detail: 'Usikker — 50 % sjanse for spilletid' },
    { type: 'blank', player: { id: 9, name: 'Haaland', teamShort: 'MCI', teamCode: 43 }, detail: 'har ingen kamp i runden' },
  ],
  footer: { freeTransfers: 1, transfersMade: 1, activeChip: null },
  ok: false,
};

export const deadlineCheckClean = {
  ...deadlineCheck,
  findings: [],
  footer: { freeTransfers: 2, transfersMade: 0, activeChip: 'wildcard' },
  ok: true,
};

export const brief = {
  clubAssets,
  brief: briefData,
  aiBrief: { text: '### Kort oppsummert\n- **Salah** er kapteinsvalget\n', generatedAt: Date.parse('2026-08-19T10:00:00Z') },
  deadlineCheck,
  CHIP_LABELS,
  calendarUrl: 'webcal://fpl.marsk.no/kalender.ics',
};

// Uten nøkkel og uten FPL_TEAM_ID: ingen AI-brief, ingen personlige anbefalinger.
export const briefEmpty = {
  clubAssets,
  brief: { gameweek: null, injuries: [], captains: [], fixturesByDay: [], mine: null },
};

// Lagnavn kommer fra andre FPL-brukere — fixturen inneholder derfor et navn
// som forsøker å bryte ut av <script>-taggen i live.ejs.
export const HOSTILE_TEAM_NAME = 'Lag </script><img src=x onerror=alert(1)>';

export const live = {
  clubAssets,
  gw: 1,
  live: {
    updatedAt: '2026-08-22T13:45:00Z',
    anyLive: true,
    gameweek: 1,
    totalLive: 42,
    myPlayers: [{
      name: 'Saka', team: 'ARS', teamCode: 3, pos: 'M', isCaptain: true, multiplier: 2,
      onBench: false, minutes: 61, points: 8, bonusEst: 2, effective: 20,
    }],
    matches: [{ home: 'ARS', away: 'LIV', homeCode: 3, awayCode: 14, homeScore: 1, awayScore: 0, started: true, finished: false, minutes: 61 }],
    leagues: [{ name: 'Kompisligaen', top: [{ rank: 1, name: HOSTILE_TEAM_NAME, gw: 60, total: 100, me: false }] }],
  },
};

export const liveEmpty = { clubAssets, gw: null, live: null };

export const news = {
  aiEnabled: true,
  generatedAt: Date.parse('2026-08-19T10:00:00Z'),
  nextUpdateAt: Date.parse('2026-08-19T16:00:00Z'),
  points: ['**Salah** scoret to mot ARS'],
  items: [{
    title: 'Salah scoret to',
    link: 'https://example.com/sak',
    description: 'Liverpool vant 3–0 på Anfield.',
    source: 'BBC Sport',
    published: '2026-08-19T09:00:00Z',
  }],
};

// Uten nøkkel og uten feed-svar: ingen AI-punkter, tom saksliste,
// og en lenke som ikke er http(s) (safeLink skal blokkere den).
export const newsEmpty = {
  aiEnabled: false,
  generatedAt: null,
  nextUpdateAt: null,
  points: [],
  items: [],
};

export const newsUnsafeLink = {
  ...news,
  items: [{ title: 'Ond lenke', link: 'javascript:alert(1)', source: 'Ukjent', published: null }],
};

// «Overganger»-siden: data, tomtilstand og transfer som venter på runden sin.
// Prisvarsler (v1.10.0): samme form som buildPriceChanges gir.
export const priceChanges = {
  date: '2026-09-03',
  mine: [
    { id: 1, name: 'Haaland', teamShort: 'MCI', teamCode: 43, from: 140, to: 141, delta: 1 },
    { id: 2, name: 'Saka', teamShort: 'ARS', teamCode: 3, from: 102, to: 101, delta: -1 },
  ],
  risers: [
    { id: 3, name: 'Palmer', teamShort: 'CHE', teamCode: 8, from: 104, to: 106, delta: 2 },
    { id: 1, name: 'Haaland', teamShort: 'MCI', teamCode: 43, from: 140, to: 141, delta: 1 },
  ],
  fallers: [{ id: 2, name: 'Saka', teamShort: 'ARS', teamCode: 3, from: 102, to: 101, delta: -1 }],
  countUp: 7,
  countDown: 5,
};

export const transfers = {
  title: 'Overganger',
  clubAssets,
  formatSigned: (n) => String(n),
  formatPrice: (n) => (n / 10).toFixed(1),
  formatDay: () => 'torsdag 3. september',
  priceChanges,
  aiComment: { text: "Byttene treffer — **Haaland** inn var rett.", generatedAt: 1 },
  scenarios: [
    {
      id: 'scen-1',
      name: 'Plan A: Isak inn',
      event: 3,
      createdAt: '2026-08-26T10:00:00.000Z',
      moves: [{ out: 11, in: 14 }],
      snapshot: { bank: 15, prices: { 11: 88, 14: 90 } },
      evaluering: {
        pending: false,
        ftEstimert: true,
        plan: { diff: 7, cost: 4, after5: { diff: 7, gws: 1, complete: false } },
        actual: { diff: 3, cost: 0, after5: { diff: 3, gws: 1, complete: false } },
        perMove: [{ out: { id: 11, name: 'Watkins', teamShort: 'AVL', teamCode: 7 }, in: { id: 14, name: 'Isak', teamShort: 'NEW', teamCode: 4 }, diff: 7 }],
      },
    },
  ],
  baseline: {
    simTotal: 118,
    actualTotal: 131,
    diff: 13,
    perGw: [
      { gw: 1, points: 60, captainId: 10, captainName: 'Haaland', viceUsed: false, autosubs: [] },
      { gw: 2, points: 58, captainId: 12, captainName: 'Salah', viceUsed: true, autosubs: [{ outId: 11, inId: 12 }] },
    ],
  },
  priceReport: {
    holdings: [
      { id: 10, name: 'Haaland', teamShort: 'MCI', teamCode: 43, buyCost: 140, nowCost: 145, sellPrice: 142, gain: 2, ukjent: false },
      { id: 12, name: 'Salah', teamShort: 'LIV', teamCode: 14, buyCost: null, nowCost: 130, sellPrice: null, gain: null, ukjent: true },
    ],
    totals: { buyCost: 140, nowCost: 145, sellPrice: 142, gain: 2 },
    missed: [{ id: 20, name: 'Saka', teamShort: 'LIV', teamCode: 14, soldFor: 55, nowCost: 60, missed: 5 }],
    bank: 15,
    value: 1003,
  },
  analysis: {
    rows: [
      { event: 2, chip: null, inn: { id: 10, name: 'Haaland', teamShort: 'MCI', teamCode: 43, points: 11 }, ut: { id: 11, name: 'Watkins', teamShort: 'AVL', teamCode: 7, points: 1 }, diff: 10, penaltyShare: 4, netto: 6, window: { from: 2, to: 3 }, played: true, pending: false, perGw: [{ gw: 2, inn: 9, ut: 1, diff: 8, cum: 8 }, { gw: 3, inn: 2, ut: 0, diff: 2, cum: 10 }], after5: { diff: 10, gws: 2, complete: false }, innCost: 140, alternativer: [{ id: 15, name: 'Mateta', teamShort: 'AVL', teamCode: 7, startPrice: 140, points: 13, delta: 2 }] },
      { event: 3, chip: 'freehit', inn: { id: 12, name: 'Salah', teamShort: 'LIV', teamCode: 14, points: 6 }, ut: { id: 14, name: 'Isak', teamShort: 'NEW', teamCode: 4, points: 3 }, diff: 3, penaltyShare: 0, netto: 3, window: { from: 3, to: 3 }, played: true, pending: false, perGw: [{ gw: 3, inn: 6, ut: 3, diff: 3, cum: 3 }], after5: { diff: 3, gws: 1, complete: true } },
    ],
    season: { played: 2, wins: 2, hitRate: 1, hitsPaid: 1 },
    totals: { diff: 13, cost: 4, netto: 9, count: 2, skipped: 0 },
    bestIndex: 0,
    worstIndex: 1,
    maxGw: 3,
  },
};

export const transfersEmpty = {
  title: 'Overganger',
  clubAssets,
  formatSigned: (n) => String(n),
  formatPrice: (n) => (n / 10).toFixed(1),
  priceReport: null,
  baseline: null,
  scenarios: [],
  aiComment: null,
  analysis: {
    rows: [],
    season: { played: 0, wins: 0, hitRate: null, hitsPaid: 0 },
    totals: { diff: 0, cost: 0, netto: 0, count: 0, skipped: 0 },
    bestIndex: null,
    worstIndex: null,
    maxGw: 0,
  },
};

export const transfersPending = {
  title: 'Overganger',
  clubAssets,
  formatSigned: (n) => String(n),
  formatPrice: (n) => (n / 10).toFixed(1),
  priceReport: null,
  baseline: null,
  scenarios: [],
  aiComment: null,
  analysis: {
    rows: [
      { event: 2, chip: null, inn: { id: 10, name: 'Haaland', teamShort: 'MCI', teamCode: 43, points: 0 }, ut: { id: 11, name: 'Watkins', teamShort: 'AVL', teamCode: 7, points: 0 }, diff: 0, penaltyShare: 0, netto: 0, window: null, played: false, pending: true, perGw: [], after5: null },
    ],
    season: { played: 0, wins: 0, hitRate: null, hitsPaid: 0 },
    totals: { diff: 0, cost: 0, netto: 0, count: 1, skipped: 0 },
    bestIndex: null,
    worstIndex: null,
    maxGw: 1,
  },
};

// ---- /innsikt (v1.7.0) --------------------------------------------------

const dtPlayer = (id, name, teamCode, teamShort, elementType, points, mine, captain = false) =>
  ({ id, name, teamCode, teamShort, elementType, points, mine, captain });

const luckPlayer = (id, name, teamCode, goals, xg, assists, xa, luck) =>
  ({ id, name, teamCode, goals, xg, assists, xa, luck });

export const insights = {
  title: 'Innsikt',
  clubAssets,
  formatSigned,
  insights: {
    gw: 3,
    finishedCount: 3,
    bench: {
      rows: [
        { gw: 1, benchPoints: 6, avoidable: 4, chip: null },
        { gw: 2, benchPoints: 12, avoidable: 0, chip: 'BB' },
        { gw: 3, benchPoints: 2, avoidable: 7, chip: null },
      ],
      totalBench: 20,
      totalAvoidable: 11,
    },
    captains: {
      rows: [
        {
          gw: 1,
          captain: { id: 10, name: 'Haaland', teamCode: 3, teamShort: 'ARS', points: 13 },
          squadBest: { name: 'Haaland', points: 13, hit: true },
          global: { name: 'Salah', points: 9, hit: true },
        },
        {
          gw: 2,
          captain: { id: 10, name: 'Haaland', teamCode: 3, teamShort: 'ARS', points: 2 },
          squadBest: { name: 'Saka', points: 11, hit: false },
          global: { name: 'Salah', points: 14, hit: false },
        },
        {
          gw: 3,
          captain: { id: 11, name: 'Salah', teamCode: 14, teamShort: 'LIV', points: 8 },
          squadBest: { name: 'Salah', points: 8, hit: true },
          global: null,
        },
      ],
      hitSquadPct: 67,
      hitGlobalPct: 50,
      counted: { squad: 3, global: 2 },
    },
    luck: {
      rows: [
        { gw: 1, luck: 4.2 },
        { gw: 2, luck: -3.1 },
        { gw: 3, luck: 0 },
      ],
      total: 1.1,
      players: [
        luckPlayer(10, 'Haaland', 3, 5, 2.4, 1, 0.6, 11.6),
        luckPlayer(11, 'Salah', 14, 2, 1.2, 3, 1.4, 8.8),
        luckPlayer(12, 'Saka', 3, 1, 0.4, 2, 1.1, 5.7),
        luckPlayer(13, 'Watkins', 14, 0, 1.9, 0, 0.8, -10.0),
        luckPlayer(14, 'Palmer', 3, 1, 2.2, 0, 1.0, -9.0),
        luckPlayer(15, 'Gordon', 14, 0, 0.7, 1, 1.5, -5.0),
      ],
      top: [
        luckPlayer(10, 'Haaland', 3, 5, 2.4, 1, 0.6, 11.6),
        luckPlayer(11, 'Salah', 14, 2, 1.2, 3, 1.4, 8.8),
        luckPlayer(12, 'Saka', 3, 1, 0.4, 2, 1.1, 5.7),
      ],
      bottom: [
        luckPlayer(13, 'Watkins', 14, 0, 1.9, 0, 0.8, -10.0),
        luckPlayer(14, 'Palmer', 3, 1, 2.2, 0, 1.0, -9.0),
        luckPlayer(15, 'Gordon', 14, 0, 0.7, 1, 1.5, -5.0),
      ],
    },
    dreamTeam: {
      gw: 3,
      topPlayer: { name: 'Salah', points: 17 },
      xi: [
        dtPlayer(20, 'Raya', 3, 'ARS', 1, 9, 'startet'),
        dtPlayer(21, 'Saliba', 3, 'ARS', 2, 12, 'startet'),
        dtPlayer(22, 'Van Dijk', 14, 'LIV', 2, 11, null),
        dtPlayer(23, 'Gvardiol', 14, 'LIV', 2, 10, 'benket'),
        dtPlayer(11, 'Salah', 14, 'LIV', 3, 17, 'startet', true),
        dtPlayer(12, 'Saka', 3, 'ARS', 3, 14, 'startet'),
        dtPlayer(24, 'Palmer', 14, 'LIV', 3, 13, null),
        dtPlayer(25, 'Mbeumo', 3, 'ARS', 3, 12, null),
        dtPlayer(10, 'Haaland', 3, 'ARS', 4, 15, 'startet'),
        dtPlayer(26, 'Isak', 14, 'LIV', 4, 12, null),
        dtPlayer(27, 'Wood', 3, 'ARS', 4, 11, null),
      ],
      mineCount: 6,
      trend: [
        { gw: 1, count: 2 },
        { gw: 2, count: 1 },
        { gw: 3, count: 5 },
      ],
    },
  },
};

// Sesongtrenden mangler når live-svarene ikke har in_dreamteam.
export const insightsNoTrend = {
  ...insights,
  insights: {
    ...insights.insights,
    dreamTeam: { ...insights.insights.dreamTeam, trend: null },
  },
};

export const insightsEmpty = {
  title: 'Innsikt',
  clubAssets,
  formatSigned,
  insights: { gw: 0, finishedCount: 0, bench: null, captains: null, luck: null, dreamTeam: null },
};
