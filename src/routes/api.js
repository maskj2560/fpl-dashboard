import { Router } from 'express';
import config from '../config.js';
import { assembleBrief } from '../services/brief.js';
import { assembleLive } from '../services/live.js';
import { getBootstrap, getFixtures, getPicks, getEntry } from '../services/fplClient.js';
import {
  byId,
  captainSuggestions,
  currentEvent,
  nextEvent,
  nextOpponents,
  POSITIONS_SHORT,
  resolvePicks,
  transferInCandidates,
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

    // Fullt datagrunnlag + sidens egne beregninger — se buildAdvicePrompt for hvorfor.
    const deadline = bootstrap.events.find((e) => e.id === fromGw)?.deadline_time;
    const nameOf = (pick) => elementsById.get(pick?.element)?.web_name ?? null;
    const opponentsByTeam = nextOpponents(fixtures, fromGw);
    const squadIds = new Set(squad.map((p) => p.id));
    const bank = picks.entry_history.bank;
    const outs = transferOutCandidates(squad, fixtures, fromGw);
    const captains = captainSuggestions(squad, fixtures, fromGw);
    const shortName = (teamId) => teamsById.get(teamId)?.short_name ?? '?';

    const result = await ai.generate({
      cacheKey: `ai-rad-${config.fplTeamId}-gw${fromGw}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-rådgiver. Vær konkret.',
      prompt: buildAdvicePrompt({
        entryName: entry.name,
        bank,
        fromGw,
        deadlineText: deadline ? formatDateTime(deadline) : null,
        captainName: nameOf(picks.picks.find((p) => p.is_captain)),
        viceName: nameOf(picks.picks.find((p) => p.is_vice_captain)),
        roundsPlayed: bootstrap.events.filter((e) => e.finished).length,
        squad: squad.map((p) => ({
          name: p.web_name,
          team: shortName(p.team),
          pos: POSITIONS_SHORT[p.element_type],
          price: p.now_cost,
          form: p.form,
          epNext: p.ep_next,
          minutes: p.minutes,
          totalPoints: p.total_points,
          status: p.status,
          news: p.news,
          chance: p.chance_of_playing_next_round,
          opponents: (opponentsByTeam.get(p.team) ?? []).map((m) => ({
            team: shortName(m.opponent),
            home: m.home,
            fdr: m.difficulty,
          })),
        })),
        pageCaptains: {
          criterion: captains[0]?.criterion ?? null,
          list: captains.map((c) => ({ name: c.player.web_name, reasons: c.reasons })),
        },
        transfers: outs.map((o) => ({
          outName: o.player.web_name,
          reasons: o.reasons,
          inn: transferInCandidates(o.player, bootstrap.elements, squadIds, bank, fixtures, fromGw).map((k) => ({
            name: k.player.web_name,
            team: shortName(k.player.team),
            price: k.player.now_cost,
            form: k.player.form,
            epNext: k.player.ep_next,
          })),
        })),
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
