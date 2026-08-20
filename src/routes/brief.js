import { Router } from 'express';
import { assembleBrief, generateAiBrief } from '../services/brief.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const brief = await assembleBrief();
    res.renderPage('brief', { title: 'Rundebrief', brief, aiBrief: await generateAiBrief(brief) });
  } catch (err) {
    next(err);
  }
});

export default router;
