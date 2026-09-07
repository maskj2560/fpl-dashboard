import { Router } from 'express';
import { getBootstrap, getFixtures } from '../services/fplClient.js';
import {
  nextEvent,
  currentEvent,
  flaggedPlayers,
  topForm,
  mostTransferredIn,
  mostTransferredOut,
  roundInNumbers,
  fdrMatrix,
  formatPrice,
  POSITIONS_SHORT,
  translateFplNews,
  byId,
  STATUS_LABELS,
} from '../services/analysis.js';
import { formatDateTime, formatDay, formatEventName, formatNumber } from '../services/format.js';
import { getNews } from '../services/news.js';
import { calendarUrlFor } from './calendar.js';

const router = Router();


router.get('/', async (req, res, next) => {
  try {
    // Nyheter er et tillegg: feil eller manglende feed skal aldri velte dashboardet.
    const [bootstrap, fixtures, news] = await Promise.all([
      getBootstrap(),
      getFixtures(),
      getNews().catch(() => null),
    ]);
    const { events, teams, elements } = bootstrap;

    const rawEvent = nextEvent(events);
    const deadlineEvent = rawEvent ? { ...rawEvent, name: formatEventName(rawEvent.name) } : null;
    const fromGw = deadlineEvent?.id ?? currentEvent(events)?.id ?? 1;
    const teamsById = byId(teams);

    res.renderPage('dashboard', {
      title: 'Dashbord',
      deadlineEvent,
      calendarUrl: calendarUrlFor(req),
      flagged: flaggedPlayers(elements),
      inForm: topForm(elements),
      boughtMost: mostTransferredIn(elements),
      soldMost: mostTransferredOut(elements),
      // «Runden i tall» (v1.14.0): FPLs fasit for siste ferdige runde.
      roundStats: roundInNumbers(events, byId(elements)),
      matrix: fdrMatrix(teams, fixtures, fromGw, 5),
      newsPoints: (news?.points ?? []).slice(0, 3),
      teamsById,
      STATUS_LABELS,
      POSITIONS_SHORT,
      formatPrice,
      formatDateTime,
      formatDay,
      formatNumber,
      translateFplNews,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
