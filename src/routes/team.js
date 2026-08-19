import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getFixtures, getEntry, getEntryHistory, getPicks, FplError } from '../services/fplClient.js';
import {
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  rankGraph,
  formatPrice,
  nextEvent,
  currentEvent,
  POSITIONS_SHORT,
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
    const current = currentEvent(events);
    const upcoming = nextEvent(events);
    const gw = current?.id ?? (upcoming ? upcoming.id - 1 : 0);

    let picks = null;
    if (gw >= 1) {
      try {
        picks = await getPicks(config.fplTeamId, gw);
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
        // 404 = ingen picks for denne GW-en ennå (f.eks. før sesongstart)
      }
    }

    const elementsById = new Map(elements.map((e) => [e.id, e]));
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const fromGw = upcoming?.id ?? gw;

    let squadView = null;
    let recommendations = null;
    if (picks) {
      const squad = picks.picks.map((pk) => ({ pick: pk, player: elementsById.get(pk.element) }));
      const starters = squad.filter((s) => s.pick.position <= 11);
      const bench = squad.filter((s) => s.pick.position >= 12);
      const byLine = {
        1: starters.filter((s) => s.player.element_type === 1),
        2: starters.filter((s) => s.player.element_type === 2),
        3: starters.filter((s) => s.player.element_type === 3),
        4: starters.filter((s) => s.player.element_type === 4),
      };
      squadView = { byLine, bench, entryHistory: picks.entry_history, activeChip: picks.active_chip };

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
    }

    res.renderPage('team', {
      title: 'Mitt lag',
      entry,
      gw,
      squadView,
      recommendations,
      graph: rankGraph(history.current),
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
