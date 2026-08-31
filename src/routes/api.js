import { Router } from 'express';
import config from '../config.js';
import { assembleBrief } from '../services/brief.js';
import { assembleLive } from '../services/live.js';
import {
  getBootstrap,
  getFixtures,
  getPicks,
  getPicksHistoric,
  getEntry,
  getEntryTransfers,
  getEntryHistory,
  staleInfo,
} from '../services/fplClient.js';
import {
  byId,
  captainSuggestions,
  currentEvent,
  nextEvent,
  nextOpponents,
  POSITIONS_SHORT,
  resolvedGw,
  resolvePicks,
  transferInCandidates,
  transferOutCandidates,
} from '../services/analysis.js';
import { buildPurchases } from '../services/pricing.js';
import { buildPlannerData, addScenario, removeScenario } from '../services/scenarios.js';
import { candidatePoints, parseAltQuery } from '../services/transfers.js';
import { getLive, getLiveHistoric } from '../services/fplClient.js';
import { formatDateTime } from '../services/format.js';
import * as ai from '../services/ai.js';
import { buildAdvicePrompt } from '../services/prompts.js';
import { noStore } from '../middleware.js';

const router = Router();
router.use(noStore);

router.get('/brief.json', async (req, res, next) => {
  try {
    const brief = await assembleBrief();
    res.json({ ...brief, dataAlder: staleInfo()?.ageSec ?? null });
  } catch (err) {
    next(err);
  }
});

// Datagrunnlaget for hva hvis-planleggeren på /overganger: min tropp med
// salgspriser + alle spillere. Deles av GET-en (klienten henter lazy) og
// POST-en (server-side validering mot samme fasit). Kun cachede kall.
async function assemblePlanner() {
  const teamId = config.fplTeamId;
  const [bootstrap, fixtures, transfers, history] = await Promise.all([
    getBootstrap(),
    getFixtures(),
    getEntryTransfers(teamId),
    getEntryHistory(teamId),
  ]);
  const gw = Math.max(1, resolvedGw(bootstrap.events));
  const picks = await getPicks(teamId, gw);
  const gw1Picks = gw === 1 ? picks : await getPicksHistoric(teamId, 1);
  const purchases = buildPurchases({
    transfers,
    chips: history?.chips,
    gw1Picks,
    elements: bootstrap.elements,
  });
  const fromGw = nextEvent(bootstrap.events)?.id ?? gw;
  return buildPlannerData({ bootstrap, fixtures, picks, purchases, fromGw });
}

router.get('/planlegger.json', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.status(400).json({ error: 'FPL_TEAM_ID er ikke satt' });
  }
  try {
    res.json(await assemblePlanner());
  } catch (err) {
    next(err);
  }
});

// Scenario-CRUD. Server-valideringen (validateScenario via addScenario) er
// autoritativ — klientens regelsjekk er bare UX. Persistens i DATA_DIR.
router.post('/scenarier', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.status(400).json({ error: 'FPL_TEAM_ID er ikke satt' });
  }
  try {
    const body = req.body ?? {};
    const input = {
      name: typeof body.name === 'string' ? body.name : '',
      event: Number(body.event),
      moves: Array.isArray(body.moves)
        ? body.moves.map((m) => ({ out: Number(m?.out), in: Number(m?.in) }))
        : [],
    };
    const planner = await assemblePlanner();
    const result = addScenario(input, planner);
    if (!result.ok) return res.status(result.status).json({ errors: result.errors });
    res.status(201).json({ scenario: result.scenario });
  } catch (err) {
    next(err);
  }
});

router.delete('/scenarier/:id', (req, res) => {
  const result = removeScenario(String(req.params.id));
  res.status(result.status).end();
});

// Egen kandidat i alternativ-analysen: poengene til en vilkårlig spiller i
// et vindu. Leser kun cachede live-runder — aldri element-summary.
router.get('/alternativ.json', async (req, res, next) => {
  try {
    const bootstrap = await getBootstrap();
    const maxGw = resolvedGw(bootstrap.events);
    const parsed = parseAltQuery(req.query, maxGw);
    if (!parsed.ok) {
      return res.status(400).json({ error: `Ugyldige parametre — spiller, fra og til må være tall, 1 ≤ fra ≤ til ≤ ${maxGw}` });
    }
    const eventsById = new Map(bootstrap.events.map((e) => [e.id, e]));
    const gws = [];
    for (let gw = parsed.fra; gw <= parsed.til; gw++) gws.push(gw);
    const results = await Promise.all(
      gws.map((gw) => (eventsById.get(gw)?.finished ? getLiveHistoric(gw) : getLive(gw))),
    );
    const liveByGw = new Map(gws.map((gw, i) => [gw, results[i]]));
    res.json(candidatePoints({ id: parsed.spiller, from: parsed.fra, to: parsed.til, liveByGw }));
  } catch (err) {
    next(err);
  }
});

router.get('/live.json', async (req, res, next) => {
  try {
    const live = await assembleLive();
    res.json({ ...live, dataAlder: staleInfo(live.gameweek)?.ageSec ?? null });
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
      // Klikk, ikke sidevisning: kald cache må vente (knappen kan ikke svare
      // med ingenting), men en utgått tekst svares det med umiddelbart mens
      // den fornyes i bakgrunnen.
      swr: true,
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
