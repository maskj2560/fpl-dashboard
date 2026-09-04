// En liten, konsistent FPL-verden for rute-testene (v1.13.1).
//
// `buildWorld()` bygger datasettet; `serveWorld()` gjør det om til en
// fetch-erstatter. Reglene i serveWorld er viktigere enn de ser ut:
//
//  - Ukjent FPL-sti svarer 404-OBJEKT, aldri kast. `fplFetch` retryer med
//    `sleep(RETRY_DELAYS)` for alt som ikke er FplError med retryable:false —
//    en mock som kaster ville lagt sekunder med søvn inn i hver test.
//  - Loopback slippes videre til den ekte fetch, ellers ville testene målt
//    mocken mot seg selv i stedet for å snakke med serveren.
//  - Alle andre verter KASTER og logges i `calls.outside`. Det er både
//    «RSS nede»-scenarioet og beviset for at ingenting går til Anthropic
//    eller Discord.
//
// Verdenen er bevisst minimal: felter legges til når en side faktisk krever
// dem, ikke fordi FPL-skjemaet har dem.

const BASE = 'https://fantasy.premierleague.com/api/';

export const TEAM_ID = 42;
export const RIVAL_ID = 43;
export const LEAGUE_ID = 777;

// Klubbkoder som faktisk har grafikk i public/img/clubs — app.locals.clubAssets
// leser den ekte mappa, så minst én kode må finnes der for at partialene skal
// skrive <img> i det hele tatt.
const TEAM_CODES = [3, 7, 91, 36, 8, 31, 11, 54, 2, 14, 43, 1, 4, 6, 88, 17, 56, 94, 40, 9];

const DAY = 24 * 60 * 60 * 1000;

function iso(ms) {
  return new Date(ms).toISOString();
}

/** 20 lag med id 1–20 og ekte klubbkoder. */
function buildTeams() {
  return TEAM_CODES.map((code, i) => ({
    id: i + 1,
    code,
    name: `Lag ${i + 1}`,
    short_name: `L${String(i + 1).padStart(2, '0')}`,
    strength: 3,
    strength_overall_home: 1100,
    strength_overall_away: 1100,
  }));
}

/**
 * Fire spillere per lag — én per posisjon, id = (lag − 1) × 4 + posisjon.
 * Det gir 80 spillere: nok til en tropp, differensialer og dødballister.
 */
function buildElements() {
  const elements = [];
  for (let team = 1; team <= 20; team++) {
    for (let type = 1; type <= 4; type++) {
      const id = (team - 1) * 4 + type;
      elements.push({
        id,
        code: 100000 + id,
        web_name: `Spiller ${id}`,
        first_name: `Fornavn${id}`,
        second_name: `Etternavn${id}`,
        team,
        team_code: TEAM_CODES[team - 1],
        element_type: type,
        now_cost: 40 + type * 10 + (id % 7),
        cost_change_event: id % 5 === 0 ? 1 : 0,
        cost_change_start: id % 5 === 0 ? 2 : 0,
        status: 'a',
        news: '',
        news_added: null,
        chance_of_playing_next_round: null,
        chance_of_playing_this_round: null,
        form: String((id % 9) / 2),
        total_points: 10 + (id % 40),
        event_points: id % 12,
        points_per_game: String(1 + (id % 5)),
        selected_by_percent: String((id % 30) + 0.5),
        transfers_in_event: id * 11,
        transfers_out_event: id * 7,
        ep_next: String(2 + (id % 4)),
        ep_this: String(2 + (id % 4)),
        minutes: 90 * (id % 3) + 90,
        starts: 2,
        goals_scored: id % 4,
        assists: id % 3,
        clean_sheets: id % 2,
        goals_conceded: id % 3,
        saves: type === 1 ? id % 6 : 0,
        yellow_cards: id % 2,
        red_cards: 0,
        bonus: id % 4,
        bps: 10 + (id % 25),
        influence: String(10 + id),
        creativity: String(10 + id),
        threat: String(10 + id),
        ict_index: String(10 + id),
        expected_goals: String(((id % 7) / 10).toFixed(2)),
        expected_assists: String(((id % 5) / 10).toFixed(2)),
        expected_goal_involvements: String(((id % 9) / 10).toFixed(2)),
        expected_goals_conceded: String(((id % 6) / 10).toFixed(2)),
        penalties_order: id % 20 === 3 ? 1 : null,
        corners_and_indirect_freekicks_order: id % 20 === 7 ? 1 : null,
        direct_freekicks_order: id % 20 === 11 ? 1 : null,
        dreamteam_count: 0,
        in_dreamteam: false,
      });
    }
  }
  return elements;
}

/**
 * GW1 og GW2 er ferdigspilt og kontrollert (`data_checked` — /innsikt og
 * ligarapporten ser bare på slike runder). GW3 er neste, med deadline om to
 * døgn: nedtellingen bruker den ekte klokka.
 */
function buildEvents(base) {
  const spec = [
    { id: 1, offsetDays: -14, finished: true, is_previous: true },
    { id: 2, offsetDays: -7, finished: true, is_current: true },
    { id: 3, offsetDays: 2, is_next: true },
    { id: 4, offsetDays: 9 },
    { id: 5, offsetDays: 16 },
  ];
  return spec.map((e) => ({
    id: e.id,
    name: `Runde ${e.id}`,
    deadline_time: iso(base + e.offsetDays * DAY),
    finished: Boolean(e.finished),
    data_checked: Boolean(e.finished),
    is_previous: Boolean(e.is_previous),
    is_current: Boolean(e.is_current),
    is_next: Boolean(e.is_next),
    average_entry_score: e.finished ? 50 + e.id : 0,
    highest_score: e.finished ? 110 + e.id : null,
    most_captained: 3,
    most_selected: 2,
    most_transferred_in: 7,
    top_element: 3,
    top_element_info: e.finished ? { id: 3, points: 16 } : null,
    transfers_made: e.finished ? 1_000_000 : 0,
    chip_plays: [],
  }));
}

/** Ti kamper per runde: lag 1v2, 3v4 … med rotasjon per runde. */
function buildFixtures(base) {
  const fixtures = [];
  let id = 1;
  for (let gw = 1; gw <= 5; gw++) {
    const kickoff = base + (gw === 1 ? -14 : gw === 2 ? -7 : gw === 3 ? 2 : gw === 4 ? 9 : 16) * DAY + 2 * 60 * 60 * 1000;
    for (let i = 0; i < 10; i++) {
      const home = ((i * 2 + gw - 1) % 20) + 1;
      const away = ((i * 2 + gw) % 20) + 1;
      const finished = gw <= 2;
      fixtures.push({
        id: id++,
        event: gw,
        team_h: home,
        team_a: away === home ? (home % 20) + 1 : away,
        team_h_difficulty: ((i + gw) % 5) + 1,
        team_a_difficulty: ((i + gw + 2) % 5) + 1,
        team_h_score: finished ? (i % 3) : null,
        team_a_score: finished ? ((i + 1) % 3) : null,
        kickoff_time: iso(kickoff),
        finished,
        finished_provisional: finished,
        started: finished,
        provisional_start_time: false,
        minutes: finished ? 90 : 0,
        stats: [],
      });
    }
  }
  return fixtures;
}

/**
 * En tropp på 15: 2 GK, 5 DEF, 5 MID, 3 FWD. Startellever 1-4-4-2, kaptein er
 * spiller 3 (multiplier 2), benken har multiplier 0 — akkurat som FPL svarer.
 * Spiller-id-ene er valgt slik at ingen klubb har mer enn 3 spillere: FPLs
 * klubbtak gjelder også i scenario-valideringen.
 */
const SQUAD_STARTERS = [1, 2, 6, 10, 14, 3, 7, 11, 15, 24, 28];
const SQUAD_BENCH = [5, 18, 19, 32];

function buildPicks(gw) {
  const starters = SQUAD_STARTERS;
  const bench = SQUAD_BENCH;
  const picks = starters.map((element, i) => ({
    element,
    position: i + 1,
    multiplier: element === 3 ? 2 : 1,
    is_captain: element === 3,
    is_vice_captain: element === 7,
    element_type: ((element - 1) % 4) + 1,
  }));
  bench.forEach((element, i) => {
    picks.push({
      element,
      position: 12 + i,
      multiplier: 0,
      is_captain: false,
      is_vice_captain: false,
      element_type: ((element - 1) % 4) + 1,
    });
  });
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: gw,
      points: 55 + gw,
      total_points: 55 * gw,
      rank: 500_000,
      rank_sort: 500_000,
      overall_rank: 400_000 - gw * 1000,
      bank: 12,
      value: 1002,
      event_transfers: gw === 2 ? 1 : 0,
      event_transfers_cost: 0,
      points_on_bench: 4,
      percentile_rank: 40,
    },
    picks,
  };
}

/** Live-poeng for alle 80 spillerne i en ferdigspilt runde. */
function buildLive(gw, elements) {
  return {
    elements: elements.map((el) => ({
      id: el.id,
      stats: {
        minutes: el.id % 5 === 0 ? 0 : 90,
        goals_scored: el.id % 9 === 0 ? 1 : 0,
        assists: el.id % 7 === 0 ? 1 : 0,
        clean_sheets: el.id % 3 === 0 ? 1 : 0,
        goals_conceded: el.id % 4,
        own_goals: 0,
        penalties_saved: 0,
        penalties_missed: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: el.id % 11 === 0 ? 3 : 0,
        bps: 10 + ((el.id * gw) % 30),
        starts: el.id % 5 === 0 ? 0 : 1,
        expected_goals: String(((el.id % 7) / 10).toFixed(2)),
        expected_assists: String(((el.id % 5) / 10).toFixed(2)),
        expected_goal_involvements: String(((el.id % 9) / 10).toFixed(2)),
        expected_goals_conceded: String(((el.id % 6) / 10).toFixed(2)),
        total_points: 2 + ((el.id + gw) % 9),
        in_dreamteam: el.id % 13 === 0,
      },
      explain: [],
    })),
  };
}

function buildHistory(teamId, { rank }) {
  return {
    current: [1, 2].map((gw) => ({
      event: gw,
      points: 55 + gw + (teamId === RIVAL_ID ? 3 : 0),
      total_points: (55 + (teamId === RIVAL_ID ? 3 : 0)) * gw,
      rank: 500_000,
      rank_sort: 500_000,
      overall_rank: rank - gw * 1000,
      bank: 12,
      value: 1002,
      event_transfers: gw === 2 ? 1 : 0,
      event_transfers_cost: 0,
      points_on_bench: 4,
      percentile_rank: 40,
    })),
    past: [{ season_name: '2024/25', total_points: 2100, rank: 250_000 }],
    chips: [],
  };
}

/** Hele datasettet. `base` er «nå» — nedtellingen på sidene bruker ekte klokke. */
export function buildWorld({ now = Date.now() } = {}) {
  const teams = buildTeams();
  const elements = buildElements();
  const events = buildEvents(now);
  const fixtures = buildFixtures(now);

  const bootstrap = {
    events,
    teams,
    elements,
    element_types: [
      { id: 1, singular_name: 'Keeper', singular_name_short: 'MV', plural_name: 'Keepere' },
      { id: 2, singular_name: 'Forsvar', singular_name_short: 'FOR', plural_name: 'Forsvarere' },
      { id: 3, singular_name: 'Midtbane', singular_name_short: 'MID', plural_name: 'Midtbanespillere' },
      { id: 4, singular_name: 'Spiss', singular_name_short: 'SPI', plural_name: 'Spisser' },
    ],
    total_players: 10_000_000,
    // Wildcard og Free Hit har start_event 2 i ekte data — halvdelene
    // grupperes derfor på stop_event (QA-funn 1, v1.12.1).
    chips: [
      { id: 1, name: 'wildcard', number: 1, start_event: 2, stop_event: 19, chip_type: 'transfer' },
      { id: 2, name: 'freehit', number: 1, start_event: 2, stop_event: 19, chip_type: 'transfer' },
      { id: 3, name: 'bboost', number: 1, start_event: 1, stop_event: 19, chip_type: 'team' },
      { id: 4, name: '3xc', number: 1, start_event: 1, stop_event: 19, chip_type: 'team' },
      { id: 5, name: 'wildcard', number: 2, start_event: 20, stop_event: 38, chip_type: 'transfer' },
      { id: 6, name: 'freehit', number: 2, start_event: 20, stop_event: 38, chip_type: 'transfer' },
      { id: 7, name: 'bboost', number: 2, start_event: 20, stop_event: 38, chip_type: 'team' },
      { id: 8, name: '3xc', number: 2, start_event: 20, stop_event: 38, chip_type: 'team' },
    ],
  };

  const entry = {
    id: TEAM_ID,
    name: 'Testlaget',
    player_first_name: 'Test',
    player_last_name: 'Manager',
    summary_overall_points: 110,
    summary_overall_rank: 398_000,
    summary_event_points: 57,
    current_event: 2,
    leagues: {
      classic: [
        { id: LEAGUE_ID, name: 'Testliga', league_type: 'x', entry_rank: 1, entry_last_rank: 2 },
        { id: 314, name: 'Overall', league_type: 's', entry_rank: 398_000, entry_last_rank: 399_000 },
      ],
      h2h: [],
      cup: { matches: [], status: {}, cup_league: null },
    },
  };

  const transfers = [
    {
      element_in: 24,
      element_in_cost: 83,
      element_out: 16,
      element_out_cost: 82,
      entry: TEAM_ID,
      event: 2,
      time: iso(now - 8 * DAY),
    },
  ];

  const standings = {
    league: { id: LEAGUE_ID, name: 'Testliga', created: iso(now - 100 * DAY) },
    new_entries: { results: [] },
    standings: {
      has_next: false,
      page: 1,
      results: [
        {
          id: 1,
          entry: TEAM_ID,
          entry_name: 'Testlaget',
          player_name: 'Test Manager',
          rank: 1,
          last_rank: 2,
          rank_sort: 1,
          total: 110,
          event_total: 57,
        },
        {
          id: 2,
          entry: RIVAL_ID,
          entry_name: 'Rivalen',
          player_name: 'Rival Manager',
          rank: 2,
          last_rank: 1,
          rank_sort: 2,
          total: 116,
          event_total: 60,
        },
      ],
    },
  };

  const dreamTeam = {
    team: SQUAD_STARTERS.map((element, i) => ({
      element,
      position: i + 1,
      points: 6 + (i % 5),
    })),
    top_player: { id: 3, points: 16 },
  };

  const elementSummary = (id) => ({
    fixtures: [3, 4, 5].map((gw) => ({
      id: gw,
      event: gw,
      event_name: `Runde ${gw}`,
      is_home: gw % 2 === 0,
      difficulty: (gw % 5) + 1,
      team_h: 1,
      team_a: 2,
      kickoff_time: iso(now + gw * DAY),
    })),
    history: [1, 2].map((gw) => ({
      element: id,
      fixture: gw,
      opponent_team: (id % 20) + 1,
      round: gw,
      minutes: 90,
      total_points: 4 + gw,
      goals_scored: 0,
      assists: gw % 2,
      clean_sheets: 1,
      bonus: 1,
      bps: 20,
      was_home: gw % 2 === 0,
      value: 55,
      expected_goals: '0.20',
      expected_assists: '0.10',
      kickoff_time: iso(now - (3 - gw) * 7 * DAY),
    })),
    history_past: [{ season_name: '2024/25', total_points: 150, minutes: 3000, element_code: 100000 + id }],
  });

  return {
    now,
    bootstrap,
    fixtures,
    entry,
    transfers,
    standings,
    dreamTeam,
    elementSummary,
    history: {
      [TEAM_ID]: buildHistory(TEAM_ID, { rank: 400_000 }),
      [RIVAL_ID]: buildHistory(RIVAL_ID, { rank: 380_000 }),
    },
    picks: { 1: buildPicks(1), 2: buildPicks(2) },
    live: { 1: buildLive(1, elements), 2: buildLive(2, elements) },
  };
}

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/**
 * Gjør verdenen til en fetch-erstatter.
 * Returnerer `{ fetch, calls, fail, clearFailures }` — `fail(fragment, status)`
 * lar en test slå av en sti (503-testen) uten å bygge verdenen på nytt.
 */
export function serveWorld(world, { realFetch = globalThis.fetch } = {}) {
  const calls = { fpl: [], outside: [] };
  calls.count = (fragment) => calls.fpl.filter((p) => p.includes(fragment)).length;
  const failures = new Map();

  const table = [
    [/^bootstrap-static\/$/, () => world.bootstrap],
    [/^fixtures\/(\?event=(\d+))?$/, (m) => (m[2] ? world.fixtures.filter((f) => f.event === Number(m[2])) : world.fixtures)],
    [/^element-summary\/(\d+)\/$/, (m) => (Number(m[1]) <= 80 ? world.elementSummary(Number(m[1])) : null)],
    [/^entry\/(\d+)\/$/, (m) => (Number(m[1]) === world.entry.id ? world.entry : null)],
    [/^entry\/(\d+)\/history\/$/, (m) => world.history[m[1]] ?? null],
    [/^entry\/(\d+)\/transfers\/$/, (m) => (Number(m[1]) === world.entry.id ? world.transfers : [])],
    // Picks for KOMMENDE runde finnes ikke hos FPL før deadline → 404.
    [/^entry\/(\d+)\/event\/(\d+)\/picks\/$/, (m) => world.picks[m[2]] ?? null],
    [/^event\/(\d+)\/live\/$/, (m) => world.live[m[1]] ?? null],
    [/^dream-team\/(\d+)\/$/, (m) => (world.live[m[1]] ? world.dreamTeam : null)],
    [/^leagues-classic\/(\d+)\/standings\/\?page_standings=\d+$/, (m) => (Number(m[1]) === world.standings.league.id ? world.standings : null)],
  ];

  async function fetchImpl(input, init) {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);

    // Testens egne kall til serveren må gå på ekte nett.
    if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(url)) return realFetch(input, init);

    if (url.startsWith(BASE)) {
      const path = url.slice(BASE.length);
      calls.fpl.push(path);
      for (const [fragment, status] of failures) {
        if (path.includes(fragment)) return jsonResponse(status, {});
      }
      for (const [re, handler] of table) {
        const m = re.exec(path);
        if (!m) continue;
        const body = handler(m);
        // null = finnes ikke hos FPL. 404-OBJEKT, aldri kast: et kast ville
        // gitt to runder retry-søvn per oppslag.
        return body == null ? jsonResponse(404, {}) : jsonResponse(200, body);
      }
      return jsonResponse(404, {});
    }

    calls.outside.push(url);
    throw new Error(`nett av i test: ${url}`);
  }

  return {
    fetch: fetchImpl,
    calls,
    fail: (fragment, status) => failures.set(fragment, status),
    clearFailures: () => failures.clear(),
  };
}
