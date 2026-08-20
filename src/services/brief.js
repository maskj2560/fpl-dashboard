// Bygger gameweek-briefen fra rene data (ingen LLM her).
import config from '../config.js';
import {
  nextEvent,
  flaggedPlayers,
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  averageFdr,
  translateFplNews,
} from './analysis.js';
import { formatDateTime, formatEventName } from './format.js';

const dayFmt = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: config.tz,
});
const timeFmt = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: config.tz,
});

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
    const day = dayFmt.format(date);
    let bucket = days.find((d) => d.day === day);
    if (!bucket) {
      bucket = { day, matches: [] };
      days.push(bucket);
    }
    bucket.matches.push({
      home: teamsById.get(f.team_h)?.name ?? '?',
      away: teamsById.get(f.team_a)?.name ?? '?',
      kickoff: timeFmt.format(date),
      kickoffIso: f.kickoff_time,
      beforeDeadline: deadlineMs === null ? null : date.getTime() < deadlineMs,
    });
  }
  return days;
}

/** Globale kapteinsvalg: høyt eid + form + lett fixture. */
function globalCaptains(elements, fixtures, fromGw, limit = 3) {
  return elements
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 15 && p.minutes > 0)
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 1);
      return { p, score: (parseFloat(p.form) || 0) * (6 - (avgFdr ?? 3.5)), avgFdr };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildBrief({ bootstrap, fixtures, myTeam = null }) {
  const { events, elements, teams } = bootstrap;
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const upcoming = nextEvent(events);
  const fromGw = upcoming?.id ?? 1;
  const gwFixtures = fixtures.filter((f) => f.event === fromGw);

  const injuries = flaggedPlayers(elements, 12)
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 5)
    .map((p) => ({
      name: p.web_name,
      team: teamsById.get(p.team)?.short_name ?? '?',
      ownership: p.selected_by_percent,
      // Oversatt i kilden: da arver view, Discord-fallbacken og AI-prompten
      // norsken uten hver sin kopi av oversettelsen.
      news: translateFplNews(p.news) || 'Ingen detaljer',
      status: p.status,
    }));

  const captains = globalCaptains(elements, fixtures, fromGw).map(({ p, avgFdr }) => ({
    name: p.web_name,
    team: teamsById.get(p.team)?.short_name ?? '?',
    form: p.form,
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

  const fixturesByDay = groupFixturesByDay(gwFixtures, teamsById, upcoming?.deadline_time ?? null);
  const fixturesBeforeDeadline = fixturesByDay
    .flatMap((d) => d.matches)
    .filter((m) => m.beforeDeadline)
    .map((m) => `${m.home}–${m.away} (${m.kickoff})`);

  return {
    generatedAt: new Date().toISOString(),
    gameweek: upcoming
      ? {
          id: upcoming.id,
          name: formatEventName(upcoming.name),
          deadline: upcoming.deadline_time,
          deadlineFormatted: formatDateTime(upcoming.deadline_time),
        }
      : null,
    injuries,
    captains,
    fixturesByDay,
    fixturesBeforeDeadline,
    mine,
  };
}
