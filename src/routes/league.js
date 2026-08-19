import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getLeagueStandings, getPicks, FplError } from '../services/fplClient.js';
import { currentEvent, nextEvent, differentials } from '../services/analysis.js';
import { formatNumber } from '../services/format.js';
import { resolveLeagueIds } from '../services/leagues.js';

const router = Router();

async function picksIdSet(entryId, gw) {
  try {
    const picks = await getPicks(entryId, gw);
    return new Set(picks.picks.map((p) => p.element));
  } catch (err) {
    if (err instanceof FplError && err.status === 404) return null;
    throw err;
  }
}

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Miniligaer' });
  try {
    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id ?? (nextEvent(bootstrap.events)?.id ?? 2) - 1;
    const leagueIds = await resolveLeagueIds();
    const leagues = await Promise.all(leagueIds.map((id) => getLeagueStandings(id)));

    // Differensial mot leder (eller valgt rival via ?rival=<entryId>&liga=<leagueId>)
    let diff = null;
    const rivalEntry = Number(req.query.rival) || null;
    const firstLeague = leagues[0];
    const leader =
      rivalEntry ??
      leagues
        .flatMap((l) => l.standings.results)
        .find((r) => r.rank === 1 && r.entry !== config.fplTeamId)?.entry ??
      null;

    if (leader && gw >= 1) {
      const [mine, theirs] = await Promise.all([
        picksIdSet(config.fplTeamId, gw),
        picksIdSet(leader, gw),
      ]);
      if (mine && theirs) {
        const d = differentials(mine, theirs, bootstrap.elements);
        const rivalRow = leagues
          .flatMap((l) => l.standings.results)
          .find((r) => r.entry === leader);
        diff = { ...d, rivalName: rivalRow?.entry_name ?? `Lag ${leader}`, rivalEntry: leader };
      }
    }

    res.renderPage('league', {
      title: 'Miniligaer',
      leagues,
      diff,
      myEntry: config.fplTeamId,
      firstLeague,
      formatNumber,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
