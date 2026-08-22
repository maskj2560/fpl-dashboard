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
  nextOpponents,
  POSITIONS_SHORT,
  resolvePicks,
  transferOutCandidates,
} from '../services/analysis.js';
import { formatDateTime } from '../services/format.js';
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

    // Kontekst modellen ellers gjetter på: hvilken runde rådet gjelder, når
    // deadline er, hvem som allerede har bindet, og hvem troppen møter.
    // Alt hentes fra data vi uansett har lastet — ingen nye nettverkskall.
    const deadline = bootstrap.events.find((e) => e.id === fromGw)?.deadline_time;
    const nameOf = (pick) => elementsById.get(pick?.element)?.web_name ?? null;
    const opponentsByTeam = nextOpponents(fixtures, fromGw);
    const opponentText = (teamId) => {
      const matches = opponentsByTeam.get(teamId);
      if (!matches?.length) return 'ingen kamp';
      return matches
        .map(
          (m) =>
            `mot ${teamsById.get(m.opponent)?.short_name ?? '?'} (${m.home ? 'hjemme' : 'borte'}, FDR ${m.difficulty})`,
        )
        .join(' og ');
    };

    const result = await ai.generate({
      cacheKey: `ai-rad-${config.fplTeamId}-gw${fromGw}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-rådgiver. Vær konkret.',
      prompt: buildAdvicePrompt({
        entryName: entry.name,
        bank: picks.entry_history.bank,
        fromGw,
        deadlineText: deadline ? formatDateTime(deadline) : null,
        captainName: nameOf(picks.picks.find((p) => p.is_captain)),
        viceName: nameOf(picks.picks.find((p) => p.is_vice_captain)),
        squadLines: squad.map(
          (p) =>
            `${p.web_name} (${teamsById.get(p.team)?.short_name}, ${POSITIONS_SHORT[p.element_type]}, ${formatPrice(p.now_cost)}, form ${p.form}, ${opponentText(p.team)})`,
        ),
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
