import { Router } from 'express';
import config from '../config.js';
import { assembleLive } from '../services/live.js';
import { staleInfo } from '../services/fplClient.js';
import { formatTime } from '../services/format.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Live' });
  try {
    const live = await assembleLive();
    // Live-siden måles mot det strengere live-taket, ikke bootstrap-taket —
    // men en ferdig runde er immutable og unntatt (QA-funn 6, v1.12.1).
    const liveStale = staleInfo(live.gameweek, { finished: live.finished });
    res.renderPage('live', {
      title: 'Live',
      live,
      gw: live.gameweek,
      staleSince: liveStale?.tooOld ? formatTime(liveStale.fetchedIso) : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
