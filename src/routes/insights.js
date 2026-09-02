import { Router } from 'express';
import config from '../config.js';
import { formatSigned, formatNumber } from '../services/format.js';
import { assembleInsights } from '../services/insights.js';

const router = Router();

// /innsikt leser kun ferdigspilte runder gjennom fplClient-cachene og
// utløser aldri et AI-kall — se routes.test.js, som håndhever regelen.
router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Innsikt' });
  try {
    const insights = await assembleInsights({});
    res.renderPage('innsikt', { title: 'Innsikt', insights, formatSigned, formatNumber });
  } catch (err) {
    next(err);
  }
});

export default router;
