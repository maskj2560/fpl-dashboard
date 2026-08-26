import { Router } from 'express';
import config from '../config.js';
import { assembleTransfersPage, transferCommentCacheKey } from '../services/transfers.js';
import { formatSigned } from '../services/format.js';
import { formatPrice } from '../services/analysis.js';
import * as ai from '../services/ai.js';

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
      // Kun cachen — genereringen eies av refresh.js (aldri en sidevisning).
      aiComment: ai.getCached(transferCommentCacheKey()),
      formatSigned,
      formatPrice,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
