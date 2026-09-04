import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getEntry, getLeagueStandings } from '../services/fplClient.js';
import { byId } from '../services/analysis.js';
import { formatNumber, formatSigned, formatDateTime } from '../services/format.js';
import { globalStandings, resolveLeagueIds } from '../services/leagues.js';
import { assembleLeagueInsights } from '../services/league-insights.js';
import { getLeagueReport } from '../services/notify.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Miniligaer' });
  try {
    // getEntry er et cache-treff når LEAGUE_IDS er tom (resolveLeagueIds
    // henter den alt) — «Dine plasseringer» koster 0 nye FPL-kall.
    const [bootstrap, entry] = await Promise.all([
      getBootstrap(),
      getEntry(config.fplTeamId).catch(() => null),
    ]);
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
      // «Dine plasseringer» (v1.14.0): de globale ligaene resolveLeagueIds siler bort.
      standingsGlobal: globalStandings(entry),
      insights,
      report: getLeagueReport(),
      myEntry: config.fplTeamId,
      rivalEntry: insights?.rivalEntry ?? null,
      teamsById: byId(bootstrap.teams),
      formatNumber,
      formatSigned,
      formatDateTime,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
