import { Router } from 'express';
import { getBootstrap } from '../services/fplClient.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT, STATUS_LABELS, byId } from '../services/analysis.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { teams, elements } = await getBootstrap();
    const teamsById = byId(teams);

    const players = [...elements].sort((a, b) => b.total_points - a.total_points);

    res.renderPage('players', {
      title: 'Spillere',
      players,
      teams: [...teams].sort((a, b) => a.name.localeCompare(b.name, 'nb')),
      teamsById,
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
