import { Router } from 'express';
import config from '../config.js';
import * as ai from '../services/ai.js';

const router = Router();

// Rapporterer HVILKE valgfrie funksjoner som er slått på — aldri verdiene.
// Gjør det mulig å se fra utsiden om miljøvariablene faktisk nådde containeren.
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    features: {
      ai: ai.isEnabled(),
      aiModel: ai.isEnabled() ? config.aiModel : null,
      discord: Boolean(config.discordWebhookUrl),
      teamId: config.hasTeamId,
      leagues: config.leagueIds.length,
    },
  });
});

export default router;
