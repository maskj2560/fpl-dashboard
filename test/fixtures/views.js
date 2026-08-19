// Mock-locals for view-render-testene. Ingen nettverkskall.
// Fasit er viewene selv: hvert objekt her dekker alle locals viewet refererer.
import { formatDateTime, formatNumber } from '../../src/services/format.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT } from '../../src/services/analysis.js';

// STATUS_LABELS er definert lokalt i rutene (index.js/players.js), ikke eksportert.
const STATUS_LABELS = {
  a: 'Tilgjengelig', d: 'Tvilsom', i: 'Skadet', s: 'Utestengt',
  u: 'Utilgjengelig', n: 'Ikke med',
};

const teamsById = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS' }],
  [2, { id: 2, name: 'Liverpool', short_name: 'LIV' }],
]);
const teams = [...teamsById.values()];

const player = (id, name, extra = {}) => ({
  id, web_name: name, team: 1, element_type: 3, now_cost: 55, form: '5.5',
  total_points: 42, points_per_game: '4.2', selected_by_percent: '12.3',
  expected_goals: '3.40', expected_assists: '2.10', status: 'a', news: '',
  chance_of_playing_next_round: null, transfers_in_event: 1000,
  transfers_out_event: 500, ...extra,
});

const shared = { teamsById, STATUS_LABELS, POSITIONS_SHORT, formatDateTime, formatPrice, formatNumber };

export const dashboard = {
  ...shared,
  deadlineEvent: { name: 'Gameweek 1', deadline_time: '2026-08-21T17:30:00Z' },
  flagged: [player(1, 'Saka', { status: 'i', news: 'Kneskade', chance_of_playing_next_round: 25 })],
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
  teamsById, POSITIONS_SHORT, formatNumber, formatPrice,
  entry: {
    name: 'Marius XI', player_first_name: 'Marius', player_last_name: 'S.',
    summary_overall_points: 100, summary_overall_rank: 500000,
  },
  gw: 1,
  squadView: {
    activeChip: null,
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
    captains: [{ player: player(3, 'Saka'), reasons: ['Form 5.5', 'Lett kamp'] }],
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
  teamsById, POSITIONS, POSITIONS_SHORT, STATUS_LABELS, formatPrice, teams,
  players: [player(1, 'Saka'), player(2, 'Salah', { team: 2, status: 'd' })],
};

export const league = {
  formatNumber,
  myEntry: 123,
  firstLeague: 999,
  leagues: [{
    league: { id: 999, name: 'Kompisligaen' },
    standings: {
      results: [
        { entry: 123, entry_name: 'Marius XI', player_name: 'Marius S.', rank: 1, last_rank: 3, event_total: 60, total: 100 },
        { entry: 456, entry_name: 'Rival FC', player_name: 'Rival R.', rank: 2, last_rank: 1, event_total: 55, total: 95 },
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
  formatNumber,
  myEntry: 123,
  firstLeague: null,
  leagues: [],
  diff: null,
};

export const leagueEmptyDiff = {
  ...league,
  diff: { rivalName: 'Rival FC', rivalEntry: 456, theirs: [], mine: [] },
};

const briefData = {
  gameweek: { id: 1, name: 'Gameweek 1', deadlineFormatted: 'fredag 21. august kl. 19:30' },
  injuries: [{ name: 'Saka', team: 'ARS', ownership: '25.0', news: 'Kneskade — tvilsom' }],
  captains: [{ name: 'Salah', team: 'LIV', form: '7.2', ownership: '48.1', avgFdr: 2.3 }],
  fixturesByDay: [{ day: 'lørdag 22. august', matches: [{ kickoff: '13:30', home: 'Arsenal', away: 'Liverpool' }] }],
  mine: {
    captains: [{ player: player(3, 'Saka'), reasons: ['Hjemme mot LIV'] }],
    transfers: [{ out: { player: player(4, 'Watkins'), reasons: ['Ute av form'] }, inn: [{ player: player(6, 'Isak') }] }],
  },
};

export const brief = {
  brief: briefData,
  aiBrief: { text: '### Kort oppsummert\n- **Salah** er kapteinsvalget\n', generatedAt: Date.parse('2026-08-19T10:00:00Z') },
};

// Uten nøkkel og uten FPL_TEAM_ID: ingen AI-brief, ingen personlige anbefalinger.
export const briefEmpty = {
  brief: { gameweek: null, injuries: [], captains: [], fixturesByDay: [], mine: null },
};

// Lagnavn kommer fra andre FPL-brukere — fixturen inneholder derfor et navn
// som forsøker å bryte ut av <script>-taggen i live.ejs.
export const HOSTILE_TEAM_NAME = 'Lag </script><img src=x onerror=alert(1)>';

export const live = {
  gw: 1,
  live: {
    updatedAt: '2026-08-22T13:45:00Z',
    anyLive: true,
    gameweek: 1,
    totalLive: 42,
    myPlayers: [{
      name: 'Saka', team: 'ARS', pos: 'M', isCaptain: true, multiplier: 2,
      onBench: false, minutes: 61, points: 8, bonusEst: 2, effective: 20,
    }],
    matches: [{ home: 'ARS', away: 'LIV', homeScore: 1, awayScore: 0, started: true, finished: false, minutes: 61 }],
    leagues: [{ name: 'Kompisligaen', top: [{ rank: 1, name: HOSTILE_TEAM_NAME, gw: 60, total: 100, me: false }] }],
  },
};

export const liveEmpty = { gw: null, live: null };

export const news = {
  aiEnabled: true,
  generatedAt: Date.parse('2026-08-19T10:00:00Z'),
  points: ['**Salah** scoret to mot ARS'],
  items: [{ title: 'Salah scoret to', link: 'https://example.com/sak', source: 'BBC Sport', published: '2026-08-19T09:00:00Z' }],
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
