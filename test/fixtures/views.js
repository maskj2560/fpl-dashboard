// Mock-locals for view-render-testene. Ingen nettverkskall.
// Fasit er viewene selv: hvert objekt her dekker alle locals viewet refererer.
import { formatDateTime, formatNumber } from '../../src/services/format.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT, translateFplNews } from '../../src/services/analysis.js';
import { clubAssetsFrom } from '../../src/services/clubAssets.js';

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
  transfers_out_event: 500, ...extra,
});

const shared = {
  teamsById, clubAssets, STATUS_LABELS, POSITIONS_SHORT, formatDateTime, formatPrice, formatNumber,
  translateFplNews,
};

export const dashboard = {
  ...shared,
  deadlineEvent: { name: 'Runde 1', deadline_time: '2026-08-21T17:30:00Z' },
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
  graph: { points: '0,0 600,140', area: '0,0 600,140 600,140 0,140', min: 400000, last: 500000 },
  chips: [],
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
};

export const players = {
  teamsById, clubAssets, POSITIONS, POSITIONS_SHORT, STATUS_LABELS, formatPrice, teams,
  players: [player(1, 'Saka'), player(2, 'Salah', { team: 2, status: 'd' })],
};

export const league = {
  teamsById, clubAssets,
  formatNumber,
  myEntry: 123,
  rivalEntry: 456,
  firstLeague: 999,
  leagues: [{
    league: { id: 999, name: 'Kompisligaen' },
    standings: {
      results: [
        { entry: 123, entry_name: 'Marius XI', player_name: 'Marius S.', rank: 1, last_rank: 3, event_total: 60, total: 100 },
        { entry: 456, entry_name: 'Rival FC', player_name: 'Rival R.', rank: 2, last_rank: 1, event_total: 55, total: 95 },
        { entry: 789, entry_name: 'Nykommer FC', player_name: 'Ny N.', rank: 3, last_rank: 0, event_total: 40, total: 80 },
      ],
    },
  }],
  diff: {
    rivalName: 'Rival FC',
    rivalEntry: 456,
    theirs: [player(7, 'Palmer')],
    mine: [player(8, 'Mbeumo')],
  },
};

// Ingen ligaer funnet, ingen differensial valgt, og tomme differensiallister.
export const leagueEmpty = {
  teamsById, clubAssets,
  formatNumber,
  myEntry: 123,
  firstLeague: null,
  leagues: [],
  diff: null,
};

// P1-2: ligaen finnes, men tabellen er tom fram til første runde er spilt.
export const leagueNoRows = {
  teamsById, clubAssets,
  formatNumber,
  myEntry: 123,
  firstLeague: null,
  leagues: [{ league: { id: 1, name: 'Var Har Skylda' }, standings: { results: [] } }],
  diff: null,
};

export const leagueEmptyDiff = {
  ...league,
  diff: { rivalName: 'Rival FC', rivalEntry: 456, theirs: [], mine: [] },
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

export const brief = {
  clubAssets,
  brief: briefData,
  aiBrief: { text: '### Kort oppsummert\n- **Salah** er kapteinsvalget\n', generatedAt: Date.parse('2026-08-19T10:00:00Z') },
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
  points: [],
  items: [],
};

export const newsUnsafeLink = {
  ...news,
  items: [{ title: 'Ond lenke', link: 'javascript:alert(1)', source: 'Ukjent', published: null }],
};

// «Overganger»-siden: data, tomtilstand og transfer som venter på runden sin.
export const transfers = {
  title: 'Overganger',
  clubAssets,
  formatSigned: (n) => String(n),
  analysis: {
    rows: [
      { event: 2, chip: null, inn: { id: 10, name: 'Haaland', teamShort: 'MCI', teamCode: 43, points: 11 }, ut: { id: 11, name: 'Watkins', teamShort: 'AVL', teamCode: 7, points: 1 }, diff: 10, penaltyShare: 4, netto: 6, window: { from: 2, to: 3 }, played: true, pending: false, perGw: [{ gw: 2, inn: 9, ut: 1, diff: 8, cum: 8 }, { gw: 3, inn: 2, ut: 0, diff: 2, cum: 10 }], after5: { diff: 10, gws: 2, complete: false } },
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
