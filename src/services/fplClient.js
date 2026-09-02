// ENESTE modul med nettverkskall mot FPL-API-et. Alt går via cache.js.
import { getOrFetch, ageOf } from './cache.js';

const BASE = 'https://fantasy.premierleague.com/api/';
// FPL-API-et kan avvise kall uten nettleser-lignende User-Agent.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const MIN = 60_000;
const TIMEOUT_MS = 10_000;
const RETRY_DELAYS = [500, 1500];

// Settes ved 503 «The game is being updated» — views viser da et banner.
// Stale data serveres videre fra cachen (SWR), så siden krasjer ikke.
// Tidsstemplet: banneret slukkes automatisk UPDATING_TTL_MS etter siste 503
// selv om ingen kall lykkes i mellomtiden (før kunne det henge til neste
// vellykkede henting, i praksis 15 min), og enhver suksess nullstiller det.
const UPDATING_TTL_MS = 5 * 60_000;
let updatingSince = null;
let now = () => Date.now();

export function isGameUpdating() {
  return updatingSince != null && now() - updatingSince < UPDATING_TTL_MS;
}

/** Overstyrer klokken (for tester). null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}

// Alderstak (v1.4.0): eldre stale-data enn dette vises fortsatt, men med
// banner — «usynlig gammelt» finnes ikke lenger. Live foreldes raskere.
const STALE_BANNER_MS = 60 * 60_000;
const STALE_BANNER_LIVE_MS = 10 * 60_000;

// `finished: true` (v1.12.1): en ferdig runde ligger i 6 t-lageret og
// revalideres ikke — poengene er immutable, så alderen sier ingenting om
// kontakten med FPL og skal aldri utløse banneret. Fra v1.12.2 har lageret
// egen nøkkel (`live:N:hist`), og det er den som måles med flagget.
export function staleInfo(gw = null, { finished = false } = {}) {
  const key = gw == null ? 'bootstrap' : finished ? `live:${gw}:hist` : `live:${gw}`;
  const cap = gw == null ? STALE_BANNER_MS : STALE_BANNER_LIVE_MS;
  const age = ageOf(key);
  if (age == null) return null;
  return {
    ageSec: Math.round(age / 1000),
    tooOld: finished ? false : age > cap,
    fetchedIso: new Date(now() - age).toISOString(),
  };
}

export class FplError extends Error {
  constructor(message, status, { retryable = true } = {}) {
    super(message);
    this.name = 'FplError';
    this.status = status;
    this.retryable = retryable;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fplFetch(path) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1]);
    try {
      const res = await fetch(BASE + path, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.status === 503) {
        // «The game is being updated» — løser seg ikke på sekunder, ikke retry.
        updatingSince = now();
        throw new FplError('FPL-API-et oppdateres (503)', 503, { retryable: false });
      }
      if (res.status === 404) {
        throw new FplError(`Ikke funnet hos FPL: ${path}`, 404, { retryable: false });
      }
      if (!res.ok) {
        throw new FplError(`FPL-API-et svarte ${res.status} for ${path}`, res.status);
      }

      const data = await res.json();
      updatingSince = null;
      return data;
    } catch (err) {
      if (err instanceof FplError && !err.retryable) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

export function getBootstrap() {
  return getOrFetch('bootstrap', () => fplFetch('bootstrap-static/'), { ttl: 15 * MIN });
}

/**
 * Kampene. Uten `gw`: hele sesongen (endrer seg sjelden, 15 min).
 * Med `gw`: rundens kamper, som live-siden leser stillinger, kampklokke og
 * «pågår nå» fra — de må være ferske i kampvinduer, derfor 1 min som live-data.
 * Kallet skjer bare mens /live er åpen, og SWR + dedup demper trykket.
 */
export function getFixtures(gw) {
  const path = gw ? `fixtures/?event=${gw}` : 'fixtures/';
  return getOrFetch(`fixtures:${gw ?? 'alle'}`, () => fplFetch(path), {
    ttl: gw ? 1 * MIN : 15 * MIN,
  });
}

export function getElementSummary(playerId) {
  return getOrFetch(`element:${playerId}`, () => fplFetch(`element-summary/${playerId}/`), {
    ttl: 30 * MIN,
  });
}

/**
 * Alderen på spillerens cachede element-summary, i sekunder (null = ikke hentet).
 * Nøkkelnavnet eies av denne modulen — kallstedene skal aldri kjenne det,
 * samme mønster som staleInfo().
 */
export function elementSummaryAgeSec(playerId) {
  const age = ageOf(`element:${playerId}`);
  return age == null ? null : Math.round(age / 1000);
}

export function getEntry(teamId) {
  return getOrFetch(`entry:${teamId}`, () => fplFetch(`entry/${teamId}/`), { ttl: 5 * MIN });
}

export function getEntryHistory(teamId) {
  return getOrFetch(`history:${teamId}`, () => fplFetch(`entry/${teamId}/history/`), {
    ttl: 5 * MIN,
  });
}

/**
 * Samme endepunkt som getEntryHistory(), men EGEN nøkkel (`…:hist`, v1.12.2)
 * og 6 t TTL. Egen nøkkel betyr at TTL-en aldri smitter over på den ferske
 * varianten (før delte de nøkkel, og «første skriver satte TTL-en»). Regelen
 * står likevel: denne er for ANDRE manageres historikk (ligagrafen på
 * /liga); egen FPL_TEAM_ID (rank-grafen på /lag) må være fersk og hentes
 * alltid via getEntryHistory.
 */
export function getEntryHistoryHistoric(teamId) {
  return getOrFetch(`history:${teamId}:hist`, () => fplFetch(`entry/${teamId}/history/`), {
    ttl: 360 * MIN,
  });
}

export function getEntryTransfers(teamId) {
  return getOrFetch(`transfers:${teamId}`, () => fplFetch(`entry/${teamId}/transfers/`), {
    ttl: 5 * MIN,
  });
}

export function getPicks(teamId, gw) {
  return getOrFetch(`picks:${teamId}:${gw}`, () => fplFetch(`entry/${teamId}/event/${gw}/picks/`), {
    ttl: 5 * MIN,
  });
}

/**
 * Lagoppstillingen i en FERDIG runde. Samme endepunkt som getPicks(), men
 * EGEN nøkkel (`…:hist`, v1.12.2) og 6 t TTL: oppstillingen i en
 * ferdigspilt runde endres aldri. Egen nøkkel betyr at TTL-en aldri smitter
 * over på getPicks. Kalles kun for runder bootstrap melder `finished` —
 * en pågående runde herfra ville vært timegammel.
 */
export function getPicksHistoric(teamId, gw) {
  return getOrFetch(`picks:${teamId}:${gw}:hist`, () => fplFetch(`entry/${teamId}/event/${gw}/picks/`), {
    ttl: 360 * MIN,
  });
}

export function getLive(gw) {
  return getOrFetch(`live:${gw}`, () => fplFetch(`event/${gw}/live/`), { ttl: 1 * MIN });
}

/**
 * Live-poeng for en FERDIG runde. Samme endepunkt som getLive(), men EGEN
 * nøkkel (`live:N:hist`, v1.12.2) og 6 t TTL: poengene i en ferdigspilt
 * runde er i praksis immutable. Før v1.12.2 delte de nøkkel, og «første
 * skriver satte TTL-en»: hadde /innsikt skrevet `live:N` med 6 t, fikk
 * getLive verdien tilbake som «fersk» uten revalidering, og 10-min-taket
 * ga stale-banner i timevis (QA-funn 6). Nå kan TTL-en ikke smitte. Pris:
 * en ferdig runde kan hentes én gang ekstra per 6 t når både live-siden og
 * /innsikt ber om den — akseptert. Kalles kun for runder bootstrap melder
 * `finished`; live-siden måler den med staleInfo(gw, { finished: true }).
 */
export function getLiveHistoric(gw) {
  return getOrFetch(`live:${gw}:hist`, () => fplFetch(`event/${gw}/live/`), { ttl: 360 * MIN });
}

/**
 * Rundens drømmelag (`dream-team/{gw}/`): `{top_player, team[11]}`. Egen
 * cache-nøkkel — endepunktet deles ikke med noe annet. 6 t TTL, samme
 * begrunnelse som getLiveHistoric: kalles KUN for ferdige runder, der
 * utvalget ikke lenger endrer seg.
 */
export function getDreamTeam(gw) {
  return getOrFetch(`dreamteam:${gw}`, () => fplFetch(`dream-team/${gw}/`), { ttl: 360 * MIN });
}

export function getLeagueStandings(leagueId, page = 1) {
  return getOrFetch(
    `league:${leagueId}:${page}`,
    () => fplFetch(`leagues-classic/${leagueId}/standings/?page_standings=${page}`),
    { ttl: 5 * MIN },
  );
}
