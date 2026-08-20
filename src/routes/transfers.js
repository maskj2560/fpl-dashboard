import { Router } from 'express';
import config from '../config.js';
import { assembleTransferAnalysis } from '../services/transfers.js';
import { formatSigned } from '../services/format.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.renderPage('no-team', { title: 'Overganger' });
  }
  try {
    const analysis = await assembleTransferAnalysis();
    res.renderPage('transfers', { title: 'Overganger', analysis, formatSigned });
  } catch (err) {
    next(err);
  }
});

export default router;
