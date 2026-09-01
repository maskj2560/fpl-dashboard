import { Router } from 'express';
import { assembleBrief, getCachedAiBrief } from '../services/brief.js';
import { assembleDeadlineCheck } from '../services/deadline.js';
import { CHIP_LABELS } from '../services/chips.js';

const router = Router();

// Lagsjekk-kortet feiler mykt: briefen skal aldri falle fordi sjekken gjør det.
async function softDeadlineCheck() {
  try {
    return await assembleDeadlineCheck();
  } catch (err) {
    console.error('Lagsjekk på /brief feilet:', err.message);
    return null;
  }
}

router.get('/', async (req, res, next) => {
  try {
    const [brief, deadlineCheck] = await Promise.all([assembleBrief(), softDeadlineCheck()]);
    // Kun cachen: siden skal aldri vente på en Claude-rundtur. Er teksten
    // ikke generert ennå, viser viewet data-briefen (den dokumenterte
    // fallbacken), og refresh.js genererer den på neste tikk.
    res.renderPage('brief', { title: 'Rundebrief', brief, aiBrief: getCachedAiBrief(brief), deadlineCheck, CHIP_LABELS });
  } catch (err) {
    next(err);
  }
});

export default router;
