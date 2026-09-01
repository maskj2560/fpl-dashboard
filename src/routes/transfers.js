import { Router } from 'express';
import config from '../config.js';
import { assembleTransfersPage, transferCommentCacheKey } from '../services/transfers.js';
import { formatSigned, formatDay } from '../services/format.js';
import { formatPrice } from '../services/analysis.js';
import * as ai from '../services/ai.js';
import { getLastPriceChanges } from '../services/prices.js';

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
      // Prisvarsler (v1.10.0): kun siste rapport fra disk/minne — aldri et FPL-kall her.
      priceChanges: getLastPriceChanges(),
      formatSigned,
      formatPrice,
      formatDay,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
