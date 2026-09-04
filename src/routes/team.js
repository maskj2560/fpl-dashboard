import { Router } from 'express';
import { buildChipPlan, describeRec, CHIPS, CHIP_LABELS } from '../services/chips.js';
import config from '../config.js';
import { getBootstrap, getFixtures, getEntry, getEntryHistory, getPicks, FplError } from '../services/fplClient.js';
import {
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  rankGraph,
  rankTable,
  formatPrice,
  nextEvent,
  POSITIONS_SHORT,
  resolvePicks,
  formationOf,
  resolvedGw,
  byId,
} from '../services/analysis.js';
import { formatNumber } from '../services/format.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.renderPage('no-team', { title: 'Mitt lag' });
  }
  try {
    const [bootstrap, fixtures, entry, history] = await Promise.all([
      getBootstrap(),
      getFixtures(),
      getEntry(config.fplTeamId),
      getEntryHistory(config.fplTeamId),
    ]);
    const { events, elements, teams } = bootstrap;
    const upcoming = nextEvent(events);
    const gw = resolvedGw(events);

    let picks = null;
    if (gw >= 1) {
      try {
        picks = await getPicks(config.fplTeamId, gw);
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
        // 404 = ingen picks for denne GW-en ennå (f.eks. før sesongstart)
      }
    }

    const elementsById = byId(elements);
    const teamsById = byId(teams);
    const fromGw = upcoming?.id ?? gw;

    let squadView = null;
    let recommendations = null;
    let chipPlan = null;
    if (picks) {
      const squad = resolvePicks(picks.picks, elementsById);
      const starters = squad.filter((s) => s.pick.position <= 11);
      const bench = squad.filter((s) => s.pick.position >= 12);
      const byLine = {
        1: starters.filter((s) => s.player.element_type === 1),
        2: starters.filter((s) => s.player.element_type === 2),
        3: starters.filter((s) => s.player.element_type === 3),
        4: starters.filter((s) => s.player.element_type === 4),
      };
      squadView = {
        byLine,
        bench,
        entryHistory: picks.entry_history,
        activeChip: picks.active_chip,
        formation: formationOf(starters),
      };

      const squadPlayers = squad.map((s) => s.player);
      const squadIds = new Set(squadPlayers.map((p) => p.id));
      const bank = picks.entry_history.bank;
      const outs = transferOutCandidates(squadPlayers, fixtures, fromGw);
      recommendations = {
        captains: captainSuggestions(squadPlayers, fixtures, fromGw),
        transfers: outs.map((o) => ({
          out: o,
          inn: transferInCandidates(o.player, elements, squadIds, bank, fixtures, fromGw),
        })),
      };
      // Chip-planleggeren (v1.9.0): ren funksjon over data som alt er hentet.
      chipPlan = buildChipPlan({
        events,
        fixtures,
        teams,
        squad: squadPlayers,
        chipsUsed: history.chips ?? [],
        fromGw,
        bootstrapChips: bootstrap.chips,
      });
    }

    res.renderPage('team', {
      title: 'Mitt lag',
      entry,
      gw,
      fromGw,
      squadView,
      recommendations,
      chipPlan,
      CHIPS,
      CHIP_LABELS,
      describeRec,
      graph: rankGraph(history.current),
      // «Topp X %» (v1.14.0): percentile_rank + overall_rank_percentage fra history.
      rankTable: rankTable(history.current, events, bootstrap.total_players),
      chips: history.chips,
      teamsById,
      POSITIONS_SHORT,
      formatPrice,
      formatNumber,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
