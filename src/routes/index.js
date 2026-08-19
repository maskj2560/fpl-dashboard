import { Router } from 'express';
import { getBootstrap, getFixtures } from '../services/fplClient.js';
import {
  nextEvent,
  currentEvent,
  flaggedPlayers,
  topForm,
  mostTransferredIn,
  mostTransferredOut,
  fdrMatrix,
  formatPrice,
  POSITIONS_SHORT,
  translateFplNews,
} from '../services/analysis.js';
import { formatDateTime, formatNumber } from '../services/format.js';
import { getNews } from '../services/news.js';

const router = Router();

const STATUS_LABELS = {
  a: 'OK',
  d: 'Usikker',
  i: 'Skadet',
  s: 'Suspendert',
  u: 'Ute',
  n: 'Utilgjengelig',
};

router.get('/', async (req, res, next) => {
  try {
    // Nyheter er et tillegg: feil eller manglende feed skal aldri velte dashboardet.
    const [bootstrap, fixtures, news] = await Promise.all([
      getBootstrap(),
      getFixtures(),
      getNews().catch(() => null),
    ]);
    const { events, teams, elements } = bootstrap;

    const deadlineEvent = nextEvent(events);
    const fromGw = deadlineEvent?.id ?? currentEvent(events)?.id ?? 1;
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    res.renderPage('dashboard', {
      title: 'Dashboard',
      deadlineEvent,
      flagged: flaggedPlayers(elements),
      inForm: topForm(elements),
      boughtMost: mostTransferredIn(elements),
      soldMost: mostTransferredOut(elements),
      matrix: fdrMatrix(teams, fixtures, fromGw, 5),
      newsPoints: (news?.points ?? []).slice(0, 3),
      teamsById,
      STATUS_LABELS,
      POSITIONS_SHORT,
      formatPrice,
      formatDateTime,
      formatNumber,
      translateFplNews,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
