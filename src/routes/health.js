import { Router } from 'express';
import config from '../config.js';
import * as ai from '../services/ai.js';
import { knownLeagueCount } from '../services/leagues.js';

/**
 * Health-payloaden som ren funksjon (deps injiseres) så den testes uten lytter.
 * Rapporterer HVILKE valgfrie funksjoner som er på — aldri verdiene. Gjør det
 * mulig å se fra utsiden om miljøvariablene faktisk nådde containeren.
 * aiStats (v1.13.0): tellere og tokentall per AI-funksjon fra ai.getStats() —
 * synkron, fra minnet: Docker-healthchecken kaller /health hvert 30. sekund.
 */
export function healthPayload({ svc = ai, cfg = config, leagues, clubImages }) {
  const aiOn = svc.isEnabled();
  return {
    status: 'ok',
    features: {
      ai: aiOn,
      aiModel: aiOn ? cfg.aiModel : null,
      discord: Boolean(cfg.discordWebhookUrl),
      teamId: cfg.hasTeamId,
      leagues,
      clubImages,
    },
    aiStats: aiOn ? svc.getStats() : null,
  };
}

const router = Router();

router.get('/', (req, res) => {
  // Ligaene auto-oppdages fra laget når LEAGUE_IDS ikke er satt. Health skal
  // telle det brukeren faktisk får se på /liga, ikke bare config-verdien —
  // men aldri vente på FPL: knownLeagueCount svarer med siste kjente tall og
  // oppdaterer seg i bakgrunnen.
  res.json(healthPayload({ leagues: knownLeagueCount(), clubImages: req.app.locals.clubAssets?.count ?? null }));
});

export default router;
