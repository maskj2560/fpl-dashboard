import { Router } from 'express';
import config from '../config.js';
import { assembleTransfersPage } from '../services/transfers.js';
import { formatSigned } from '../services/format.js';
import { formatPrice } from '../services/analysis.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.renderPage('no-team', { title: 'Overganger' });
  }
  try {
    const page = await assembleTransfersPage();
    res.renderPage('transfers', {
      title: 'Overganger',
      analysis: page.analysis,
      priceReport: page.priceReport,
      baseline: page.baseline,
      scenarios: page.scenarios,
      formatSigned,
      formatPrice,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
