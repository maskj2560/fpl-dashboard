import { Router } from 'express';
import { getBootstrap, getFixtures } from '../services/fplClient.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT, STATUS_LABELS, byId, nextEvent } from '../services/analysis.js';
import { buildDifferentials, buildSetPieceTable } from '../services/players.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    // Begge er delte 15 min-nøkler — sidevisningen koster ingen nye kall-typer,
    // og element-summary røres ALDRI herfra (kun lazy per klikk i api.js).
    const [{ teams, elements, events }, fixtures] = await Promise.all([
      getBootstrap(),
      getFixtures(),
    ]);
    const teamsById = byId(teams);

    const players = [...elements].sort((a, b) => b.total_points - a.total_points);
    const fromGw = nextEvent(events)?.id ?? null;

    res.renderPage('players', {
      title: 'Spillere',
      players,
      teams: [...teams].sort((a, b) => a.name.localeCompare(b.name, 'nb')),
      teamsById,
      differentials: buildDifferentials({ elements, fixtures, fromGw, teamsById }),
      setPieces: buildSetPieceTable({ elements, teams }),
      POSITIONS,
      POSITIONS_SHORT,
      STATUS_LABELS,
      formatPrice,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
