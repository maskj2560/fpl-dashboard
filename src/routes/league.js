import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getLeagueStandings } from '../services/fplClient.js';
import { byId } from '../services/analysis.js';
import { formatNumber, formatSigned } from '../services/format.js';
import { resolveLeagueIds } from '../services/leagues.js';
import { assembleLeagueInsights } from '../services/league-insights.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Miniligaer' });
  try {
    const bootstrap = await getBootstrap();
    const leagueIds = await resolveLeagueIds();
    const leagues = await Promise.all(leagueIds.map((id) => getLeagueStandings(id)));

    // All innsikt (rival-radar, graf, kaptein-liga) bygges for FØRSTE liga;
    // tabellene over viser fortsatt alle. Rival velges med ?rival=<entryId>.
    const insights = leagueIds.length
      ? await assembleLeagueInsights({
          leagueId: leagueIds[0],
          requestedRival: Number(req.query.rival) || null,
        })
      : null;

    res.renderPage('league', {
      title: 'Miniligaer',
      leagues,
      insights,
      report: null,
      myEntry: config.fplTeamId,
      rivalEntry: insights?.rivalEntry ?? null,
      teamsById: byId(bootstrap.teams),
      formatNumber,
      formatSigned,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
