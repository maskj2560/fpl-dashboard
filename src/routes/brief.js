import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getFixtures, getPicks, FplError } from '../services/fplClient.js';
import { buildBrief } from '../services/brief.js';
import { currentEvent, nextEvent } from '../services/analysis.js';

const router = Router();

/** Delt av /brief (HTML) og /api/brief.json. Eksporteres for gjenbruk. */
export async function assembleBrief() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
  let myTeam = null;
  if (config.hasTeamId) {
    const gw = currentEvent(bootstrap.events)?.id ?? (nextEvent(bootstrap.events)?.id ?? 2) - 1;
    if (gw >= 1) {
      try {
        const picks = await getPicks(config.fplTeamId, gw);
        const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
        myTeam = {
          squadPlayers: picks.picks.map((p) => byId.get(p.element)),
          elements: bootstrap.elements,
          bank: picks.entry_history.bank,
          fromGw: nextEvent(bootstrap.events)?.id ?? gw,
        };
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
      }
    }
  }
  return buildBrief({ bootstrap, fixtures, myTeam });
}

router.get('/', async (req, res, next) => {
  try {
    res.renderPage('brief', { title: 'Gameweek-brief', brief: await assembleBrief() });
  } catch (err) {
    next(err);
  }
});

export default router;
