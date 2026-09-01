// Kalenderabonnement (v1.9.0): GET /kalender.ics. Grunnlaget hentes via
// fplClient (bootstrap + fixtures + picks for inneværende runde — alt cachet),
// kalenderen bygges av services/calendar.js. Uten FPL_TEAM_ID eller før
// første runde: kun deadlines. Aldri cachet (no-store) — klienten poller selv
// hver 6. time (REFRESH-INTERVAL). 0 AI-kall.

import config from '../config.js';
import { getBootstrap, getFixtures, getPicks, FplError } from '../services/fplClient.js';
import { byId, currentEvent, nextEvent } from '../services/analysis.js';
import { buildCalendar } from '../services/calendar.js';

/** webcal-adressen sidene lenker til; null uten Host-header (tester). */
export function calendarUrlFor(req) {
  const host = req.get?.('host');
  return host ? `webcal://${host}/kalender.ics` : null;
}

async function loadCalendarData() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
  const { events, teams, elements } = bootstrap;
  const current = currentEvent(events);
  const fromGw = nextEvent(events)?.id ?? current?.id ?? 1;

  let squadTeamIds = [];
  if (config.fplTeamId && current) {
    const picks = await getPicks(config.fplTeamId, current.id).catch((err) => {
      if (err instanceof FplError && err.status === 404) return null;
      throw err;
    });
    if (picks) {
      const elementsById = byId(elements);
      squadTeamIds = [...new Set(picks.picks.map((p) => elementsById.get(p.element)?.team).filter((t) => t != null))];
    }
  }
  return { events, fixtures, teams, squadTeamIds, fromGw };
}

/** Handler-fabrikk så ruta kan testes uten nettverk (load/now injiseres). */
export function createCalendarHandler({ load = loadCalendarData, now = Date.now, version } = {}) {
  return async (req, res, next) => {
    try {
      const data = await load();
      const host = req.get?.('host');
      const ics = buildCalendar({
        events: data.events,
        fixtures: data.fixtures,
        squadTeamIds: data.squadTeamIds,
        fromGw: data.fromGw,
        teamsById: byId(data.teams),
        now: now(),
        siteUrl: host ? `https://${host}` : undefined,
        version: version ?? req.app?.locals?.version,
      });
      res.set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'inline; filename="fpl-dashboard.ics"',
      });
      res.send(ics);
    } catch (err) {
      next(err);
    }
  };
}
