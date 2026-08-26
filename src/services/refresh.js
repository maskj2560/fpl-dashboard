// Timer-styrt oppfrisking av AI-tekstene (v1.3.4). Sidevisninger leser bare
// cachen, så det er denne som holder den varm — inkludert rett etter en
// deploy, der AI-cachen alltid er tom fordi den bor i minnet.
// Sender aldri noe til Discord: auto-briefen i notify.js er sin egen sak
// (den deler cacheKey med /brief og varmer cachen gratis).
import { getBootstrap } from './fplClient.js';
import { nextEvent } from './analysis.js';
import * as ai from './ai.js';
import { assembleBrief, generateAiBrief, briefCacheKey } from './brief.js';
import { refreshNewsSummary, NEWS_CACHE_KEY } from './news.js';
import { generateTransferComment, transferCommentCacheKey } from './transfers.js';

const MIN = 60_000;
const HOUR = 60 * MIN;

// 30 min, ikke 60: en generering tar ~30 s, så en 60-minutters tikk ville
// truffet alder 59,5 min og hoppet over annenhver oppfriskning i
// deadlinevinduet. Gulvet på hvor ofte det faktisk genereres ligger i
// minIntervalMs i ai.js.
const TICK_INTERVAL_MS = 30 * MIN;
const NEWS_MAX_AGE_MS = 6 * HOUR;
const BRIEF_MAX_AGE_MS = 24 * HOUR;
// Overgangskommentaren (v1.5.0): 1x/døgn er nok — analysen endrer seg bare
// når runder spilles. Etter sesongslutt fryses den (som briefen).
const TRANSFER_MAX_AGE_MS = 24 * HOUR;
// Timene før deadline er de eneste der briefen faktisk endrer seg fort
// (lagnytt, priser, skader). Bredden er Marius' valg: 6 timer.
const DEADLINE_WINDOW_MS = 6 * HOUR;

let now = () => Date.now();
let timer = null;

/**
 * Ren beslutning: skal briefen og/eller nyhetene friskes opp nå?
 * `briefGeneratedAt`/`newsGeneratedAt` er null når teksten aldri er laget.
 */
export function refreshDecision({
  nowMs,
  briefGeneratedAt = null,
  newsGeneratedAt = null,
  transferGeneratedAt = null,
  deadlineTime = null,
  hasUpcoming = false,
}) {
  return {
    brief: briefDue({ nowMs, briefGeneratedAt, deadlineTime, hasUpcoming }),
    news: newsGeneratedAt == null || nowMs - newsGeneratedAt >= NEWS_MAX_AGE_MS,
    transferComment:
      hasUpcoming &&
      (transferGeneratedAt == null || nowMs - transferGeneratedAt >= TRANSFER_MAX_AGE_MS),
  };
}

function briefDue({ nowMs, briefGeneratedAt, deadlineTime, hasUpcoming }) {
  // Etter siste runde finnes ingen brief å skrive — sesongslutt skal ikke
  // koste ett kall i døgnet i månedsvis.
  if (!hasUpcoming) return false;
  const msToDeadline = deadlineTime ? new Date(deadlineTime).getTime() - nowMs : null;
  if (msToDeadline != null && msToDeadline > 0 && msToDeadline <= DEADLINE_WINDOW_MS) return true;
  return briefGeneratedAt == null || nowMs - briefGeneratedAt >= BRIEF_MAX_AGE_MS;
}

/** Én runde med oppfrisking. Kaster aldri — en feil skal ikke velte timeren. */
export async function _tick() {
  let upcoming = null;
  try {
    const { events } = await getBootstrap();
    upcoming = nextEvent(events);
  } catch (err) {
    console.error('AI-oppfrisking: kunne ikke hente runden:', err.message);
    return;
  }

  const decision = refreshDecision({
    nowMs: now(),
    briefGeneratedAt: ai.getCached(briefCacheKey({ gameweek: upcoming }))?.generatedAt ?? null,
    newsGeneratedAt: ai.getCached(NEWS_CACHE_KEY)?.generatedAt ?? null,
    transferGeneratedAt: ai.getCached(transferCommentCacheKey())?.generatedAt ?? null,
    deadlineTime: upcoming?.deadline_time ?? null,
    hasUpcoming: Boolean(upcoming),
  });

  if (decision.brief) {
    try {
      await generateAiBrief(await assembleBrief());
    } catch (err) {
      console.error('AI-oppfrisking av briefen feilet:', err.message);
    }
  }
  if (decision.news) {
    try {
      await refreshNewsSummary();
    } catch (err) {
      console.error('AI-oppfrisking av nyhetene feilet:', err.message);
    }
  }
  if (decision.transferComment) {
    try {
      await generateTransferComment();
    } catch (err) {
      console.error('AI-oppfrisking av overgangskommentaren feilet:', err.message);
    }
  }
}

/** Inaktiv uten ANTHROPIC_API_KEY. */
export function startAiRefresher() {
  if (!ai.isEnabled()) return;
  // Første tikk med en gang: etter en deploy er AI-cachen tom, og uten dette
  // ville første besøkende sett data-briefen i opptil 30 minutter.
  _tick();
  timer = setInterval(_tick, TICK_INTERVAL_MS);
  timer.unref?.();
  console.log('AI-oppfrisking aktiv: sjekker hvert 30. minutt');
}

// Test-hooks (samme mønster som notify.js). Aldri satt i produksjon.

/** Overstyrer klokken. null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}

export function _reset() {
  clearInterval(timer);
  timer = null;
}
