// Bygger gameweek-briefen: buildBrief er ren datalogikk, assembleBrief henter
// den fra FPL, og generateAiBrief legger AI-teksten på toppen når nøkkel finnes.
import config from '../config.js';
import { getBootstrap, getFixtures, getPicks, FplError } from './fplClient.js';
import { buildBriefPrompt, sanitizeBriefText } from './prompts.js';
import * as ai from './ai.js';
import {
  nextEvent,
  flaggedPlayers,
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  teamFdrMap,
  translateFplNews,
  byId,
  resolvedGw,
  resolvePicks,
} from './analysis.js';
import { formatDateTime, formatDay, formatEventName, formatTime } from './format.js';

/**
 * Grupperer kampene per dag. `deadline` (ISO) er valgfri: er den satt, får
 * hver kamp `beforeDeadline`, slik at ingen — heller ikke språkmodellen —
 * trenger å regne seg fram til hva som spilles før eller etter deadline.
 */
export function groupFixturesByDay(fixtures, teamsById, deadline = null) {
  const deadlineMs = deadline ? new Date(deadline).getTime() : null;
  const sorted = [...fixtures]
    .filter((f) => f.kickoff_time)
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  const days = [];
  for (const f of sorted) {
    const date = new Date(f.kickoff_time);
    const day = formatDay(f.kickoff_time);
    let bucket = days.find((d) => d.day === day);
    if (!bucket) {
      bucket = { day, matches: [] };
      days.push(bucket);
    }
    bucket.matches.push({
      home: teamsById.get(f.team_h)?.name ?? '?',
      away: teamsById.get(f.team_a)?.name ?? '?',
      homeCode: teamsById.get(f.team_h)?.code ?? null,
      awayCode: teamsById.get(f.team_a)?.code ?? null,
      kickoff: formatTime(f.kickoff_time),
      kickoffIso: f.kickoff_time,
      beforeDeadline: deadlineMs === null ? null : date.getTime() < deadlineMs,
    });
  }
  return days;
}

/**
 * Globale kapteinsvalg: høyt eid + form + lett fixture. Ved sesongstart er
 * all form 0 — da ble score 0 hele veien og element-ID-rekkefølgen vant.
 * Som captainSuggestions (v1.2.2): er samtlige form-scorer 0, rangeres det
 * på FPLs ep_next; er også den 0 for alle, returneres tom liste. Før
 * sesongens aller første kamp har ingen spilt — da slippes minutes-kravet,
 * ellers ville lista vært tom akkurat når briefen trengs til GW1.
 */
function globalCaptains(elements, fixtures, fromGw, limit = 3) {
  const fdrByTeam = teamFdrMap(fixtures, fromGw, 1);
  const allZeroMinutes = elements.every((p) => !p.minutes);
  const candidates = elements
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 15 && (allZeroMinutes || p.minutes > 0))
    .map((p) => {
      const avgFdr = fdrByTeam.get(p.team) ?? null;
      return { p, avgFdr, ease: 6 - (avgFdr ?? 3.5) };
    });
  const scoreAll = (criterion) =>
    candidates.map((c) => ({
      ...c,
      criterion,
      score: (parseFloat(criterion === 'form' ? c.p.form : c.p.ep_next) || 0) * c.ease,
    }));
  let scored = scoreAll('form');
  if (scored.every((s) => s.score === 0)) {
    scored = scoreAll('ep_next');
    if (scored.every((s) => s.score === 0)) return { list: [], criterion: null };
  }
  return {
    list: scored.sort((a, b) => b.score - a.score).slice(0, limit),
    criterion: scored[0].criterion,
  };
}

export function buildBrief({ bootstrap, fixtures, myTeam = null }) {
  const { events, elements, teams } = bootstrap;
  const teamsById = byId(teams);
  const upcoming = nextEvent(events);
  // Etter siste runde finnes ingen kommende runde. Uten dette ble briefen
  // bygget på runde 1-data. Viewet har allerede en tom tilstand for
  // `gameweek: null` — den er den riktige her.
  if (!upcoming) {
    return {
      generatedAt: new Date().toISOString(),
      gameweek: null,
      injuries: [],
      captains: [],
      captainsCriterion: null,
      fixturesByDay: [],
      fixturesBeforeDeadline: [],
      mine: null,
    };
  }
  const fromGw = upcoming.id;
  const gwFixtures = fixtures.filter((f) => f.event === fromGw);

  const injuries = flaggedPlayers(elements, 12)
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 5)
    .map((p) => ({
      name: p.web_name,
      team: teamsById.get(p.team)?.short_name ?? '?',
      teamCode: teamsById.get(p.team)?.code ?? null,
      ownership: p.selected_by_percent,
      // Oversatt i kilden: da arver view, Discord-fallbacken og AI-prompten
      // norsken uten hver sin kopi av oversettelsen.
      news: translateFplNews(p.news) || 'Ingen detaljer',
      status: p.status,
    }));

  const globals = globalCaptains(elements, fixtures, fromGw);
  const captains = globals.list.map(({ p, avgFdr }) => ({
    name: p.web_name,
    team: teamsById.get(p.team)?.short_name ?? '?',
    teamCode: teamsById.get(p.team)?.code ?? null,
    form: p.form,
    epNext: p.ep_next,
    ownership: p.selected_by_percent,
    avgFdr,
  }));

  let mine = null;
  if (myTeam) {
    const { squadPlayers, elements: all, bank, fromGw: gw } = myTeam;
    const squadIds = new Set(squadPlayers.map((p) => p.id));
    const outs = transferOutCandidates(squadPlayers, fixtures, gw);
    mine = {
      captains: captainSuggestions(squadPlayers, fixtures, gw),
      transfers: outs.map((o) => ({
        out: o,
        inn: transferInCandidates(o.player, all, squadIds, bank, fixtures, gw),
      })),
    };
  }

  const fixturesByDay = groupFixturesByDay(gwFixtures, teamsById, upcoming.deadline_time);
  const fixturesBeforeDeadline = fixturesByDay
    .flatMap((d) => d.matches)
    .filter((m) => m.beforeDeadline)
    .map((m) => `${m.home}–${m.away} (${m.kickoff})`);

  return {
    generatedAt: new Date().toISOString(),
    gameweek: {
      id: upcoming.id,
      name: formatEventName(upcoming.name),
      deadline: upcoming.deadline_time,
      deadlineFormatted: formatDateTime(upcoming.deadline_time),
    },
    injuries,
    captains,
    captainsCriterion: globals.criterion,
    fixturesByDay,
    fixturesBeforeDeadline,
    mine,
  };
}

/**
 * Setter sammen data-briefen fra FPL. Delt av /brief, /api/brief.json og
 * auto-briefen til Discord.
 */
export async function assembleBrief() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
  let myTeam = null;
  if (config.hasTeamId) {
    const gw = resolvedGw(bootstrap.events);
    if (gw >= 1) {
      try {
        const picks = await getPicks(config.fplTeamId, gw);
        myTeam = {
          squadPlayers: resolvePicks(picks.picks, byId(bootstrap.elements)).map((s) => s.player),
          elements: bootstrap.elements,
          bank: picks.entry_history.bank,
          fromGw: nextEvent(bootstrap.events)?.id ?? gw,
        };
      } catch (err) {
        // 404 = ingen picks for runden ennå (typisk før sesongstart).
        if (!(err instanceof FplError && err.status === 404)) throw err;
      }
    }
  }
  return buildBrief({ bootstrap, fixtures, myTeam });
}

/**
 * AI-briefen for en ferdig bygd data-brief. Én implementasjon delt av /brief
 * og auto-briefen; tidligere lå blokken ordrett begge steder og kunne drive
 * fra hverandre. Returnerer null når AI er av, kallet feilet eller svaret var
 * tomt — data-briefen er alltid fallback.
 */
export async function generateAiBrief(brief) {
  if (!ai.isEnabled()) return null;
  const result = await ai.generate({
    cacheKey: `ai-brief-gw${brief.gameweek?.id ?? 0}`,
    minIntervalMs: 60 * 60_000,
    system: 'Du er en norsk Fantasy Premier League-ekspert. Skriv presist og handlingsorientert.',
    prompt: buildBriefPrompt(brief),
    maxTokens: 4000,
  });
  if (!result?.text) return null;
  // Etterkontroll: modellen har påstått ting om deadline som ikke stemte med
  // kampdataene. Uriktige setninger fjernes før briefen vises.
  return { ...result, text: sanitizeBriefText(result.text, brief) };
}
