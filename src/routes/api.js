import { Router } from 'express';
import config from '../config.js';
import { assembleBrief } from '../services/brief.js';
import { assembleLive } from '../services/live.js';
import { getBootstrap, getFixtures, getPicks, getEntry } from '../services/fplClient.js';
import {
  byId,
  currentEvent,
  formatPrice,
  nextEvent,
  POSITIONS_SHORT,
  resolvePicks,
  transferOutCandidates,
} from '../services/analysis.js';
import * as ai from '../services/ai.js';
import { buildAdvicePrompt } from '../services/prompts.js';

const router = Router();

router.get('/brief.json', async (req, res, next) => {
  try {
    res.json(await assembleBrief());
  } catch (err) {
    next(err);
  }
});

router.get('/live.json', async (req, res, next) => {
  try {
    res.json(await assembleLive());
  } catch (err) {
    next(err);
  }
});

router.post('/ai-rad', async (req, res, next) => {
  try {
    if (!ai.isEnabled()) return res.status(400).json({ error: 'AI er ikke aktivert (mangler ANTHROPIC_API_KEY).' });
    if (!config.hasTeamId) return res.status(400).json({ error: 'FPL_TEAM_ID er ikke satt.' });

    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id;
    if (!gw) return res.status(400).json({ error: 'Ingen aktiv runde.' });

    const [entry, picks, fixtures] = await Promise.all([
      getEntry(config.fplTeamId),
      getPicks(config.fplTeamId, gw),
      getFixtures(),
    ]);
    const elementsById = byId(bootstrap.elements);
    const teamsById = byId(bootstrap.teams);
    const squad = resolvePicks(picks.picks, elementsById).map((s) => s.player);
    const fromGw = nextEvent(bootstrap.events)?.id ?? gw;

    const result = await ai.generate({
      cacheKey: `ai-rad-${config.fplTeamId}-gw${fromGw}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-rådgiver. Vær konkret.',
      prompt: buildAdvicePrompt({
        entryName: entry.name,
        bank: picks.entry_history.bank,
        squadLines: squad.map((p) => `${p.web_name} (${teamsById.get(p.team)?.short_name}, ${POSITIONS_SHORT[p.element_type]}, ${formatPrice(p.now_cost)}, form ${p.form})`),
        outs: transferOutCandidates(squad, fixtures, fromGw).map((o) => `${o.player.web_name}: ${o.reasons.join('; ')}`),
      }),
      maxTokens: 4000,
    });
    if (!result) return res.status(502).json({ error: 'AI-kallet feilet — prøv igjen senere.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
