import { Router } from 'express';
import { getBootstrap } from '../services/fplClient.js';
import { formatPrice, POSITIONS, POSITIONS_SHORT } from '../services/analysis.js';

const router = Router();

const STATUS_LABELS = {
  a: 'OK',
  d: 'Usikker',
  i: 'Skadet',
  s: 'Suspendert',
  u: 'Ute',
  n: 'Utilgj.',
};

router.get('/', async (req, res, next) => {
  try {
    const { teams, elements } = await getBootstrap();
    const teamsById = new Map(teams.map((t) => [t.id, t]));

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
