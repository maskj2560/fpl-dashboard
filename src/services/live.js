// Live-visningen: mine spillere, stillinger og miniligaer for aktiv runde.
import config from '../config.js';
import {
  getBootstrap,
  getFixtures,
  getLive,
  getPicks,
  getLeagueStandings,
  FplError,
} from './fplClient.js';
import { byId, currentEvent, estimateBonus, hasConfirmedBonus, resolvePicks } from './analysis.js';
import { resolveLeagueIds } from './leagues.js';

function emptyLive() {
  return {
    anyLive: false,
    gameweek: null,
    nextKickoff: null,
    totalLive: null,
    myPlayers: [],
    matches: [],
    leagues: [],
  };
}

/**
 * Ren sammenstilling av live-payloaden — ingen nettverkskall.
 * `nextKickoff` lar klienten vekke seg selv ved avspark i stedet for å polle
 * utenfor kampvinduer.
 */
export function buildLive({ bootstrap, gw, fixtures = [], live = null, picks = null, leagues = [] }) {
  if (!gw) return emptyLive();

  const teamsById = byId(bootstrap.teams);
  const elementsById = byId(bootstrap.elements);
  const liveById = new Map((live?.elements ?? []).map((e) => [e.id, e.stats]));

  const anyLive = fixtures.some((f) => f.started && !f.finished);
  const nextKickoff =
    fixtures
      .filter((f) => !f.started && f.kickoff_time)
      .map((f) => f.kickoff_time)
      .sort()[0] ?? null;

  // Bonusestimat per kamp som pågår, summert per spiller: i en dobbel runde
  // kan én spiller ha BPS i to kamper samtidig. Er bonusen alt bekreftet for
  // kampen, ligger den i total_points — da estimerer vi ikke, for da ville
  // poengene blitt talt to ganger.
  const bonusEst = new Map();
  for (const f of fixtures) {
    if (!f.started || f.finished || hasConfirmedBonus(f)) continue;
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
        isCaptain: pick.is_captain,
        onBench: pick.position >= 12,
        minutes: stats.minutes,
        points: stats.total_points,
        bonusEst: bonus,
        effective: (stats.total_points + bonus) * multiplier,
      };
    });
    totalLive = myPlayers.reduce((sum, p) => sum + p.effective, 0);
  }

  const matches = fixtures.map((f) => ({
    home: teamsById.get(f.team_h)?.short_name ?? '?',
    away: teamsById.get(f.team_a)?.short_name ?? '?',
    homeScore: f.team_h_score ?? null,
    awayScore: f.team_a_score ?? null,
    started: f.started,
    finished: f.finished,
    minutes: f.minutes,
  }));

  return { anyLive, gameweek: gw, nextKickoff, totalLive, myPlayers, matches, leagues };
}

/** Henter alt live-siden trenger. Deler av det er valgfritt og feiler mykt. */
export async function assembleLive() {
  const bootstrap = await getBootstrap();
  const gw = currentEvent(bootstrap.events)?.id;
  if (!gw) return emptyLive();

  const [fixtures, live] = await Promise.all([getFixtures(gw), getLive(gw)]);

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
