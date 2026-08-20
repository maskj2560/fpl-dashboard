import { Router } from 'express';
import config from '../config.js';
import { assembleBrief } from './brief.js';
import { getBootstrap, getFixtures, getLive, getPicks, getLeagueStandings, getEntry, FplError } from '../services/fplClient.js';
import {
  currentEvent,
  estimateBonus,
  resolvePicks,
  POSITIONS_SHORT,
  transferOutCandidates,
  nextEvent,
  formatPrice,
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

export async function assembleLive() {
  const bootstrap = await getBootstrap();
  const gw = currentEvent(bootstrap.events)?.id;
  if (!gw) return { updatedAt: new Date().toISOString(), anyLive: false, gameweek: null, myPlayers: [], matches: [], leagues: [] };

  const [fixtures, live] = await Promise.all([getFixtures(gw), getLive(gw)]);
  const anyLive = fixtures.some((f) => f.started && !f.finished);
  const liveById = new Map(live.elements.map((e) => [e.id, e.stats]));
  const elementsById = new Map(bootstrap.elements.map((e) => [e.id, e]));
  const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]));

  // Bonusestimat kun for kamper som ikke er ferdige (ferdige har ekte bonus i stats)
  const bonusEst = new Map();
  for (const f of fixtures) {
    if (f.started && !f.finished) {
      for (const [el, b] of estimateBonus(f)) bonusEst.set(el, b);
    }
  }

  let myPlayers = [];
  let totalLive = null;
  try {
    const picks = await getPicks(config.fplTeamId, gw);
    myPlayers = resolvePicks(picks.picks, elementsById).map(({ pick: pk, player: p }) => {
      const stats = liveById.get(pk.element) ?? { total_points: 0, minutes: 0, bonus: 0 };
      const bonus = stats.bonus > 0 ? 0 : (bonusEst.get(pk.element) ?? 0);
      return {
        name: p.web_name,
        team: teamsById.get(p.team)?.short_name ?? '?',
        pos: POSITIONS_SHORT[p.element_type],
        isCaptain: pk.is_captain,
        multiplier: pk.multiplier,
        onBench: pk.position >= 12,
        minutes: stats.minutes,
        points: stats.total_points,
        bonusEst: bonus,
        effective: (stats.total_points + bonus) * (pk.multiplier || (pk.position >= 12 ? 0 : 1)),
      };
    });
    totalLive = myPlayers.reduce((sum, p) => sum + p.effective, 0);
  } catch (err) {
    if (!(err instanceof FplError && err.status === 404)) throw err;
  }

  const matches = fixtures.map((f) => ({
    home: teamsById.get(f.team_h)?.short_name ?? '?',
    away: teamsById.get(f.team_a)?.short_name ?? '?',
    homeScore: f.team_h_score,
    awayScore: f.team_a_score,
    started: f.started,
    finished: f.finished,
    minutes: f.minutes,
  }));

  let leagues = [];
  try {
    const ids = config.leagueIds.length
      ? config.leagueIds
      : (await getEntry(config.fplTeamId)).leagues.classic.filter((l) => l.league_type === 'x').map((l) => l.id);
    leagues = (await Promise.all(ids.map((id) => getLeagueStandings(id)))).map((l) => ({
      name: l.league.name,
      top: l.standings.results.slice(0, 8).map((r) => ({
        rank: r.rank,
        name: r.entry_name,
        gw: r.event_total,
        total: r.total,
        me: r.entry === config.fplTeamId,
      })),
    }));
  } catch {
    // Miniliga-feil skal ikke velte live-visningen.
  }

  return { updatedAt: new Date().toISOString(), anyLive, gameweek: gw, totalLive, myPlayers, matches, leagues };
}

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
    const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
    const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]));
    const squad = resolvePicks(picks.picks, byId).map((s) => s.player);
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
