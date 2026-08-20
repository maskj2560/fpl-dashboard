import { Router } from 'express';
import config from '../config.js';
import { assembleLive } from '../services/live.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Live' });
  try {
    const live = await assembleLive();
    res.renderPage('live', { title: 'Live', live, gw: live.gameweek });
  } catch (err) {
    next(err);
  }
});

export default router;
