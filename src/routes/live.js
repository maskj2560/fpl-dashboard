import { Router } from 'express';
import config from '../config.js';
import { getBootstrap } from '../services/fplClient.js';
import { currentEvent } from '../services/analysis.js';
import { assembleLive } from './api.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Live' });
  try {
    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id ?? null;
    const live = gw ? await assembleLive() : null;
    res.renderPage('live', { title: 'Live', live, gw });
  } catch (err) {
    next(err);
  }
});

export default router;
