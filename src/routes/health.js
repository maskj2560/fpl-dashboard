import { Router } from 'express';
import config from '../config.js';
import * as ai from '../services/ai.js';
import { resolveLeagueIds } from '../services/leagues.js';

const router = Router();

// Rapporterer HVILKE valgfrie funksjoner som er slått på — aldri verdiene.
// Gjør det mulig å se fra utsiden om miljøvariablene faktisk nådde containeren.
router.get('/', async (_req, res) => {
  // Ligaene auto-oppdages fra laget når LEAGUE_IDS ikke er satt. Health skal
  // telle det brukeren faktisk får se på /liga, ikke bare config-verdien.
  // Er FPL nede, faller vi tilbake til config-antallet — health skal aldri feile.
  let leagues = config.leagueIds.length;
  try {
    leagues = (await resolveLeagueIds()).length;
  } catch (err) {
    console.error('Health: klarte ikke å løse opp ligaer:', err.message);
  }

  res.json({
    status: 'ok',
    features: {
      ai: ai.isEnabled(),
      aiModel: ai.isEnabled() ? config.aiModel : null,
      discord: Boolean(config.discordWebhookUrl),
      teamId: config.hasTeamId,
      leagues,
    },
  });
});

export default router;
