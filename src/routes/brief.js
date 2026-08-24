import { Router } from 'express';
import { assembleBrief, getCachedAiBrief } from '../services/brief.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const brief = await assembleBrief();
    // Kun cachen: siden skal aldri vente på en Claude-rundtur. Er teksten
    // ikke generert ennå, viser viewet data-briefen (den dokumenterte
    // fallbacken), og refresh.js genererer den på neste tikk.
    res.renderPage('brief', { title: 'Rundebrief', brief, aiBrief: getCachedAiBrief(brief) });
  } catch (err) {
    next(err);
  }
});

export default router;
