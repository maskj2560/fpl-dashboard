// Live-visningen: mine spillere, stillinger og miniligaer for aktiv runde.
import config from '../config.js';
import {
  getBootstrap,
  getFixtures,
  getLive,
  getLiveHistoric,
  getPicks,
  getLeagueStandings,
  FplError,
} from './fplClient.js';
import {
  byId,
  currentEvent,
  estimateBonus,
  hasConfirmedBonus,
  publishedBonus,
  resolvePicks,
} from './analysis.js';
import { resolveLeagueIds } from './leagues.js';

function emptyLive() {
  return {
    anyLive: false,
    finished: false,
    gameweek: null,
    nextKickoff: null,
    totalLive: null,
    myPlayers: [],
    matches: [],
    leagues: [],
  };
}

/**
 * Er kampen ferdigspilt? FPL setter `finished_provisional` ved fløyta, men
 * `finished` først ved rundeprosesseringen — som regel neste morgen. Leser vi
 * bare `finished`, står live-statusen på og klienten poller hele natten.
 */
const matchDone = (f) => f.finished || f.finished_provisional;

const RACE_SIZE = 5;

/**
 * Bonuskampen (v1.11.0): topp fem på BPS i én kamp, med bonusen de ligger
 * an til. Bonus = FPLs publiserte tall når kampen er ferdig eller FPL har
 * publisert, ellers estimatet (likhet arves: 3,3,1 / 3,2,2 / 3,2,1,1).
 * Tom før avspark og uten bps-statistikk. Rent.
 */
export function topBps(fixture, elementsById, teamsById, myIds = new Set()) {
  if (!fixture?.started) return { rows: [], source: null };
  const bpsStat = fixture.stats?.find((s) => s.identifier === 'bps');
  const all = [...(bpsStat?.h ?? []), ...(bpsStat?.a ?? [])].filter((e) => e.value > 0);
  if (all.length === 0) return { rows: [], source: null };

  const published = Boolean(matchDone(fixture) || hasConfirmedBonus(fixture));
  const bonus = published ? publishedBonus(fixture) : estimateBonus(fixture);
  const rows = all
    .map((e) => {
      const el = elementsById.get(e.element);
      return {
        id: e.element,
        name: el?.web_name ?? '?',
        teamShort: teamsById.get(el?.team)?.short_name ?? '?',
        bps: e.value,
        bonus: bonus.get(e.element) ?? 0,
        mine: myIds.has(e.element),
      };
    })
    .sort((a, b) => b.bps - a.bps || a.name.localeCompare(b.name, 'nb'))
    .slice(0, RACE_SIZE);
  return { rows, source: published ? 'fpl' : 'estimat' };
}

/**
 * Ren sammenstilling av live-payloaden — ingen nettverkskall.
 * `nextKickoff` lar klienten vekke seg selv ved avspark i stedet for å polle
 * utenfor kampvinduer.
 */
export function buildLive({ bootstrap, gw, fixtures = [], live = null, picks = null, leagues = [] }) {
  if (!gw) return emptyLive();

  // Ferdig runde: poengene er immutable — styrer cache-lag og alderstak.
  const finished = Boolean(bootstrap.events?.find((e) => e.id === gw)?.finished);
  const teamsById = byId(bootstrap.teams);
  const elementsById = byId(bootstrap.elements);
  const liveById = new Map((live?.elements ?? []).map((e) => [e.id, e.stats]));

  const anyLive = fixtures.some((f) => f.started && !matchDone(f));
  const nextKickoff =
    fixtures
      .filter((f) => !f.started && f.kickoff_time)
      .map((f) => f.kickoff_time)
      .sort()[0] ?? null;

  // Bonus per spiller, summert over rundens kamper — i en dobbel runde kan én
  // spiller ha bonus i to kamper. To atskilte tall:
  //
  //   bonusPub — bonusen FPL selv har publisert. Ligger allerede i
  //              total_points, så den vises men legges aldri til «Effektivt».
  //   bonusEst — vårt BPS-estimat for vinduet før FPL publiserer noe. Ligger
  //              IKKE i total_points, så det legges til «Effektivt».
  //
  // Estimatet slås av så snart kampen har publisert bonus eller er
  // ferdigspilt; ellers ville de samme poengene blitt talt to ganger.
  const bonusPub = new Map();
  const bonusEst = new Map();
  for (const f of fixtures) {
    if (!f.started) continue;
    for (const [element, b] of publishedBonus(f)) {
      bonusPub.set(element, (bonusPub.get(element) ?? 0) + b);
    }
    if (matchDone(f) || hasConfirmedBonus(f)) continue;
    for (const [element, b] of estimateBonus(f)) {
      bonusEst.set(element, (bonusEst.get(element) ?? 0) + b);
    }
  }

  let myPlayers = [];
  let totalLive = null;
  if (picks) {
    myPlayers = resolvePicks(picks.picks, elementsById).map(({ pick, player }) => {
      const stats = liveById.get(pick.element) ?? { total_points: 0, minutes: 0, bonus: 0 };
      const bonus = bonusEst.get(pick.element) ?? 0;
      const multiplier = pick.multiplier || (pick.position >= 12 ? 0 : 1);
      return {
        name: player.web_name,
        team: teamsById.get(player.team)?.short_name ?? '?',
        teamCode: player.team_code ?? teamsById.get(player.team)?.code ?? null,
        isCaptain: pick.is_captain,
        onBench: pick.position >= 12,
        minutes: stats.minutes,
        points: stats.total_points,
        bonusEst: bonus,
        bonusPublished: bonusPub.get(pick.element) ?? 0,
        effective: (stats.total_points + bonus) * multiplier,
      };
    });
    totalLive = myPlayers.reduce((sum, p) => sum + p.effective, 0);
  }

  const myIds = new Set((picks?.picks ?? []).map((p) => p.element));
  const matches = fixtures.map((f) => {
    const race = topBps(f, elementsById, teamsById, myIds);
    return {
      home: teamsById.get(f.team_h)?.short_name ?? '?',
      away: teamsById.get(f.team_a)?.short_name ?? '?',
      homeCode: teamsById.get(f.team_h)?.code ?? null,
      awayCode: teamsById.get(f.team_a)?.code ?? null,
      homeScore: f.team_h_score ?? null,
      awayScore: f.team_a_score ?? null,
      started: f.started,
      finished: Boolean(matchDone(f)),
      minutes: f.minutes,
      bpsTop: race.rows,
      bpsSource: race.source,
    };
  });

  return { anyLive, finished, gameweek: gw, nextKickoff, totalLive, myPlayers, matches, leagues };
}

/** Henter alt live-siden trenger. Deler av det er valgfritt og feiler mykt. */
export async function assembleLive() {
  const bootstrap = await getBootstrap();
  const event = currentEvent(bootstrap.events);
  const gw = event?.id;
  if (!gw) return emptyLive();

  // Ferdig runde leses fra 6 t-lageret (egen nøkkel `live:N:hist` fra
  // v1.12.2 — se getLiveHistoric); pågående runde fornyes etter 1 min som før.
  const [fixtures, live] = await Promise.all([
    getFixtures(gw),
    event.finished ? getLiveHistoric(gw) : getLive(gw),
  ]);

  let picks = null;
  try {
    picks = await getPicks(config.fplTeamId, gw);
  } catch (err) {
    // 404 = ingen picks for runden ennå (typisk før sesongstart).
    if (!(err instanceof FplError && err.status === 404)) throw err;
  }

  let leagues = [];
  try {
    const ids = await resolveLeagueIds();
    leagues = (await Promise.all(ids.map((id) => getLeagueStandings(id)))).map((l) => ({
      name: l.league.name,
      top: l.standings.results.slice(0, 8).map((r) => ({
        rank: r.rank,
        name: r.entry_name,
        gw: r.event_total,
        total: r.total,
        me: r.entry === config.fplTeamId,
      })),
    }));
  } catch {
    // Miniliga-feil skal ikke velte live-visningen.
  }

  return buildLive({ bootstrap, gw, fixtures, live, picks, leagues });
}
