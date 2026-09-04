import { Router } from 'express';
import { assembleBrief, getCachedAiBrief } from '../services/brief.js';
import { assembleDeadlineCheck } from '../services/deadline.js';
import { CHIP_LABELS } from '../services/chips.js';
import { calendarUrlFor } from './calendar.js';

const router = Router();

// Lagsjekk-kortet feiler mykt: briefen skal aldri falle fordi sjekken gjør det.
// `assembleDeadlineCheck` gir også null uten team-id, uten å kaste — derfor et
// eget flagg: uten team-id skal kortet være borte, ved feil skal det si fra.
async function softDeadlineCheck() {
  try {
    return { check: await assembleDeadlineCheck(), failed: false };
  } catch (err) {
    console.error('Lagsjekk på /brief feilet:', err.message);
    return { check: null, failed: true };
  }
}

router.get('/', async (req, res, next) => {
  try {
    const [brief, lagsjekk] = await Promise.all([assembleBrief(), softDeadlineCheck()]);
    // Kun cachen: siden skal aldri vente på en Claude-rundtur. Er teksten
    // ikke generert ennå, viser viewet data-briefen (den dokumenterte
    // fallbacken), og refresh.js genererer den på neste tikk.
    res.renderPage('brief', {
      title: 'Rundebrief',
      brief,
      aiBrief: getCachedAiBrief(brief),
      deadlineCheck: lagsjekk.check,
      deadlineCheckFailed: lagsjekk.failed,
      CHIP_LABELS,
      calendarUrl: calendarUrlFor(req),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
