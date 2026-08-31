// Sesonginnsikt (v1.7.0): rene analysefunksjoner for /innsikt —
// benkesløsing, kapteinsfasit, flaksbarometer og rundens XI.
// Nettverkskall skjer kun i assembleInsights, og kun via fplClient.
//
// Poengsemantikk: ALLE sammenligninger bruker RÅ 1×-poeng fra live.
// `multiplier` leses kun binært (> 0 = spilte, 0 = benket) — aldri
// aritmetisk. Kapteinsdoblingen måles som identitet/differanse i
// kapteinsfasiten, aldri som en multiplikator på poengsummene.
// Se docs/plan-innsikt-v170.md.

import config from '../config.js';
import { resolvedGw } from './analysis.js';
import { effectiveCaptain, _mapLimit } from './league-insights.js';
import { getBootstrap, getPicksHistoric, getLiveHistoric, getDreamTeam } from './fplClient.js';

/**
 * Lovlige formasjoner som [forsvar, midtbane, spiss]. Utledet av FPLs
 * regler (1 keeper, 3–5 forsvar, 2–5 midtbanespillere, 1–3 spisser,
 * elleve totalt) — samme regelsett som autosub-sjekken i baseline.js.
 */
export const FORMATIONS = [
  [3, 4, 3],
  [3, 5, 2],
  [4, 3, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 2, 3],
  [5, 3, 2],
  [5, 4, 1],
];

/** FPLs chip-navn → kort merke i UI. Ukjent verdi gir ingen merke. */
const CHIP_LABELS = { bboost: 'BB', '3xc': 'TC', wildcard: 'WC', freehit: 'FH' };

const chipLabel = (name) => CHIP_LABELS[name] ?? null;

/**
 * Beste lovlige start-XI av de femten: topp keeper pluss den formasjonen
 * som gir flest poeng når hver posisjon fylles med sine toppscorere.
 *
 * @param {object} p
 * @param {number[]} p.squadIds de femten spiller-id-ene
 * @param {(id:number)=>number|null} p.typeOf element_type (1 GK … 4 FWD)
 * @param {(id:number)=>number} p.pts råpoeng (1×) for spilleren
 * @returns {{ids:number[], points:number}|null}
 */
export function optimalXi({ squadIds, typeOf, pts }) {
  const byType = { 1: [], 2: [], 3: [], 4: [] };
  for (const id of squadIds ?? []) {
    const t = typeOf(id);
    if (byType[t]) byType[t].push(id);
  }
  for (const t of [1, 2, 3, 4]) byType[t].sort((a, b) => pts(b) - pts(a));
  if (byType[1].length === 0) return null;

  const keeper = byType[1][0];
  let best = null;
  for (const [d, m, f] of FORMATIONS) {
    if (byType[2].length < d || byType[3].length < m || byType[4].length < f) continue;
    const ids = [keeper, ...byType[2].slice(0, d), ...byType[3].slice(0, m), ...byType[4].slice(0, f)];
    const points = ids.reduce((sum, id) => sum + pts(id), 0);
    if (!best || points > best.points) best = { ids, points };
  }
  return best;
}

/** Råpoeng per spiller-id fra et live-svar. */
export function livePointsMap(live) {
  const map = new Map();
  for (const e of live?.elements ?? []) map.set(e.id, e.stats?.total_points ?? 0);
  return map;
}

/**
 * De elleve som faktisk spilte: picks med `multiplier > 0`. FPL
 * re-sorterer picks etter autosub (målt 31. aug: innbytteren flyttes opp
 * med multiplier 1), så multiplier er fasiten — ikke posisjonen.
 * Guard: færre enn elleve treff (framtidig API-endring) → posisjon 1–11.
 * Bench Boost gir femten treff, og det er riktig: hele troppen spilte.
 */
export function actualXiIds(picks) {
  const rows = picks?.picks ?? [];
  const played = rows.filter((p) => (p.multiplier ?? 0) > 0);
  if (played.length >= 11) return played.map((p) => p.element);
  return rows.filter((p) => (p.position ?? 99) <= 11).map((p) => p.element);
}

/**
 * Benkesløsing per runde: hva benken scoret, og hvor mye av det som var
 * unngåelig (beste lovlige XI av de femten minus den XI-en som spilte).
 * Begge tall i rå 1×-poeng. Bench Boost: FPL rapporterer selv 0 på
 * benken (målt), og ingenting er sløst — raden får merket «BB».
 *
 * @returns {{rows:Array, totalBench:number, totalAvoidable:number}|null}
 */
export function buildBenchReport({ picksByGw, liveByGw, elementsById, gws }) {
  const typeOf = (id) => elementsById.get(id)?.element_type ?? null;
  const rows = [];

  for (const gw of gws ?? []) {
    const picks = picksByGw?.get(gw);
    const live = liveByGw?.get(gw);
    if (!picks?.picks?.length || !live) continue;

    const points = livePointsMap(live);
    const pts = (id) => points.get(id) ?? 0;
    const squadIds = picks.picks.map((p) => p.element);
    const chip = chipLabel(picks.active_chip);
    const bb = picks.active_chip === 'bboost';

    const reported = picks.entry_history?.points_on_bench;
    const benchPoints = Number.isFinite(reported)
      ? reported
      : picks.picks.filter((p) => (p.multiplier ?? 0) === 0).reduce((s, p) => s + pts(p.element), 0);

    let avoidable = 0;
    if (!bb) {
      const played = actualXiIds(picks).reduce((s, id) => s + pts(id), 0);
      const best = optimalXi({ squadIds, typeOf, pts });
      avoidable = best ? Math.max(0, best.points - played) : 0;
    }

    rows.push({ gw, benchPoints, avoidable, chip });
  }

  if (rows.length === 0) return null;
  return {
    rows,
    totalBench: rows.reduce((s, r) => s + r.benchPoints, 0),
    totalAvoidable: rows.reduce((s, r) => s + r.avoidable, 0),
  };
}

/**
 * Kapteinsfasiten, to fasiter per runde:
 *
 * A «troppens beste»: bar kapteinen den høyeste RÅ scoren blant de femten?
 *   Delt topp teller som treff — valget var like godt som det beste.
 * B «global favoritt»: fikk kapteinen minst like mange rå poeng som
 *   rundens `most_captained`? Runder der bootstrap mangler feltet holdes
 *   utenfor B-nevneren i stedet for å telles som bom.
 *
 * Bindet tilskrives den som faktisk bar det (effectiveCaptain dekker TC
 * og vise-kaptein som overtok). Poengene er alltid 1× — multiplieren
 * brukes kun til å identifisere kapteinen.
 *
 * @returns {{rows:Array, hitSquadPct:number, hitGlobalPct:number|null,
 *   counted:{squad:number, global:number}}|null}
 */
export function buildCaptainAudit({ picksByGw, liveByGw, eventsById, elementsById, teamsById, gws }) {
  const nameOf = (id) => elementsById?.get(id)?.web_name ?? 'Ukjent';
  const rows = [];

  for (const gw of gws ?? []) {
    const picks = picksByGw?.get(gw);
    const live = liveByGw?.get(gw);
    const cap = effectiveCaptain(picks);
    if (!picks?.picks?.length || !live || !cap) continue;

    const points = livePointsMap(live);
    const pts = (id) => points.get(id) ?? 0;
    const capPoints = pts(cap.element);

    let bestId = null;
    for (const p of picks.picks) if (bestId === null || pts(p.element) > pts(bestId)) bestId = p.element;
    const squadBest = { name: nameOf(bestId), points: pts(bestId), hit: capPoints === pts(bestId) };

    const mostCaptained = eventsById?.get(gw)?.most_captained;
    const global = Number.isFinite(mostCaptained)
      ? { name: nameOf(mostCaptained), points: pts(mostCaptained), hit: capPoints >= pts(mostCaptained) }
      : null;

    const element = elementsById?.get(cap.element);
    rows.push({
      gw,
      captain: {
        id: cap.element,
        name: nameOf(cap.element),
        teamCode: teamsById?.get(element?.team)?.code ?? null,
        teamShort: teamsById?.get(element?.team)?.short_name ?? '',
        points: capPoints,
      },
      squadBest,
      global,
    });
  }

  if (rows.length === 0) return null;
  const withGlobal = rows.filter((r) => r.global);
  const pct = (hits, total) => (total ? Math.round((hits / total) * 100) : null);

  return {
    rows,
    hitSquadPct: pct(rows.filter((r) => r.squadBest.hit).length, rows.length),
    hitGlobalPct: pct(withGlobal.filter((r) => r.global.hit).length, withGlobal.length),
    counted: { squad: rows.length, global: withGlobal.length },
  };
}

/** Poengverdien av et mål per posisjon: keeper/forsvar 6, midtbane 5, spiss 4. */
const GOAL_VALUE = { 1: 6, 2: 6, 3: 5, 4: 4 };

/** xG-feltene kommer som strenger («1.47»). Ugyldig eller manglende → 0. */
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Flaksbarometeret: hvor mye spillerne over- eller underpresterte mot
 * forventningen, målt i poeng — (mål − xG) × målverdien for posisjonen
 * pluss (assist − xA) × 3.
 *
 * Rundetallet summerer den XI-en som faktisk spilte. Spillertallene er
 * sesongsummer for de femten i siste ferdige rundes tropp og gjelder hele
 * sesongen, uavhengig av når spilleren ble kjøpt — det står som hint i UI.
 *
 * Mangler `expected_goals`/`expected_assists` i samtlige runder, blir
 * hele seksjonen null: heller en utelatt seksjon enn gale tall.
 *
 * @returns {{rows:Array, total:number, players:Array, top:Array, bottom:Array}|null}
 */
export function buildLuckMeter({ picksByGw, liveByGw, elementsById, teamsById, gws }) {
  const statsByGw = new Map();
  let sawExpected = false;

  for (const gw of gws ?? []) {
    const live = liveByGw?.get(gw);
    if (!live) continue;
    const map = new Map();
    for (const e of live.elements ?? []) {
      const s = e.stats ?? {};
      if (s.expected_goals !== undefined || s.expected_assists !== undefined) sawExpected = true;
      map.set(e.id, {
        goals: num(s.goals_scored),
        xg: num(s.expected_goals),
        assists: num(s.assists),
        xa: num(s.expected_assists),
      });
    }
    statsByGw.set(gw, map);
  }
  if (!sawExpected) return null;

  const luckOf = (id, s) => {
    if (!s) return 0;
    const value = GOAL_VALUE[elementsById?.get(id)?.element_type] ?? 0;
    return (s.goals - s.xg) * value + (s.assists - s.xa) * 3;
  };

  const rows = [];
  let total = 0;
  let lastPicks = null;
  for (const gw of gws ?? []) {
    const picks = picksByGw?.get(gw);
    const stats = statsByGw.get(gw);
    if (!picks?.picks?.length || !stats) continue;
    lastPicks = picks;

    let sum = 0;
    for (const id of actualXiIds(picks)) sum += luckOf(id, stats.get(id));
    total += sum;
    rows.push({ gw, luck: round1(sum) });
  }
  if (rows.length === 0) return null;

  const players = (lastPicks?.picks ?? []).map((p) => {
    const id = p.element;
    const agg = { goals: 0, xg: 0, assists: 0, xa: 0, luck: 0 };
    for (const stats of statsByGw.values()) {
      const s = stats.get(id);
      if (!s) continue;
      agg.goals += s.goals;
      agg.xg += s.xg;
      agg.assists += s.assists;
      agg.xa += s.xa;
      agg.luck += luckOf(id, s);
    }
    const element = elementsById?.get(id);
    return {
      id,
      name: element?.web_name ?? 'Ukjent',
      teamCode: teamsById?.get(element?.team)?.code ?? null,
      goals: agg.goals,
      xg: round1(agg.xg),
      assists: agg.assists,
      xa: round1(agg.xa),
      luck: round1(agg.luck),
    };
  });

  const sorted = [...players].sort((a, b) => b.luck - a.luck || a.id - b.id);
  return {
    rows,
    total: round1(total),
    players,
    top: sorted.slice(0, 3),
    bottom: [...sorted].reverse().slice(0, 3),
  };
}

/**
 * Rundens XI: FPLs eget drømmelag for siste ferdige runde, merket med
 * hvem av dem jeg eide (startet/benket) og hvem som bar bindet mitt.
 *
 * Sesongtrenden teller, per ferdig runde, hvor mange av MIN faktiske XI
 * som havnet i rundens drømmelag (`in_dreamteam` i live). Mangler feltet,
 * blir trenden null — resten av seksjonen står. Tomt eller ugyldig
 * dream-team-svar (f.eks. 404 rett etter rundeslutt) gir null seksjon.
 *
 * @returns {{gw:number, topPlayer:object|null, xi:Array, mineCount:number,
 *   trend:Array|null}|null}
 */
export function buildDreamTeamSection({
  dreamTeam,
  lastGw,
  myPicks,
  picksByGw,
  liveByGw,
  elementsById,
  teamsById,
  gws,
}) {
  const rows = dreamTeam?.team ?? [];
  if (rows.length === 0) return null;

  const nameOf = (id) => elementsById?.get(id)?.web_name ?? 'Ukjent';
  const owned = new Set((myPicks?.picks ?? []).map((p) => p.element));
  const started = new Set(actualXiIds(myPicks));
  const captainId = effectiveCaptain(myPicks)?.element ?? null;

  const xi = [...rows]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row) => {
      const id = row.element;
      const element = elementsById?.get(id);
      const club = teamsById?.get(element?.team);
      return {
        id,
        name: nameOf(id),
        teamCode: club?.code ?? null,
        teamShort: club?.short_name ?? '',
        elementType: element?.element_type ?? null,
        points: row.points ?? 0,
        mine: started.has(id) ? 'startet' : owned.has(id) ? 'benket' : null,
        captain: id === captainId,
      };
    });

  const top = dreamTeam?.top_player;
  const topPlayer = top?.id != null ? { name: nameOf(top.id), points: top.points ?? 0 } : null;

  let sawFlag = false;
  const trend = [];
  for (const gw of gws ?? []) {
    const live = liveByGw?.get(gw);
    const picks = picksByGw?.get(gw);
    if (!live || !picks?.picks?.length) continue;
    const flags = new Map();
    for (const e of live.elements ?? []) {
      if (e.stats?.in_dreamteam !== undefined) sawFlag = true;
      flags.set(e.id, e.stats?.in_dreamteam === true);
    }
    trend.push({ gw, count: actualXiIds(picks).filter((id) => flags.get(id)).length });
  }

  return {
    gw: lastGw,
    topPlayer,
    xi,
    mineCount: xi.filter((p) => p.mine).length,
    trend: sawFlag && trend.length > 0 ? trend : null,
  };
}

async function softNull(fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Innsikt: seksjon feilet mykt: ${err.message}`);
    return null;
  }
}

/**
 * Henter alt /innsikt trenger via fplClient-cachene. Bootstrap er en hard
 * feil (uten den finnes ingen side); de fire seksjonene feiler mykt til
 * null hver for seg.
 *
 * Vinduet er HELE sesongen: picks + live for hver ferdige runde, hentet
 * med _mapLimit(8) og 6 t-TTL. Cache-nøklene deles med /overganger-
 * baselinen, så gjentatte besøk koster ingenting. Dream-team hentes kun
 * for siste ferdige runde. Ingen AI, ingen element-summary.
 *
 * @returns {Promise<{gw:number, finishedCount:number, bench:object|null,
 *   captains:object|null, luck:object|null, dreamTeam:object|null}>}
 */
export async function assembleInsights({ teamId = config.fplTeamId } = {}) {
  const bootstrap = await getBootstrap();
  const events = bootstrap.events ?? [];
  const elementsById = new Map((bootstrap.elements ?? []).map((e) => [e.id, e]));
  const teamsById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t]));
  const eventsById = new Map(events.map((e) => [e.id, e]));

  const gws = events
    .filter((e) => e.finished)
    .map((e) => e.id)
    .sort((a, b) => a - b);

  const base = {
    gw: resolvedGw(events),
    finishedCount: gws.length,
    bench: null,
    captains: null,
    luck: null,
    dreamTeam: null,
  };
  if (gws.length === 0) return base;

  const liveRows = await _mapLimit(gws, 8, async (g) => [g, await getLiveHistoric(g)]);
  const picksRows = await _mapLimit(gws, 8, async (g) => {
    try {
      return [g, await getPicksHistoric(teamId, g)];
    } catch {
      return [g, null]; // 404 o.l.: laget fantes ikke den runden
    }
  });
  const liveByGw = new Map(liveRows);
  const picksByGw = new Map(picksRows);
  const lastGw = gws.at(-1);

  base.bench = await softNull(() => buildBenchReport({ picksByGw, liveByGw, elementsById, gws }));
  base.captains = await softNull(() =>
    buildCaptainAudit({ picksByGw, liveByGw, eventsById, elementsById, teamsById, gws }),
  );
  base.luck = await softNull(() => buildLuckMeter({ picksByGw, liveByGw, elementsById, teamsById, gws }));
  base.dreamTeam = await softNull(async () =>
    buildDreamTeamSection({
      dreamTeam: await getDreamTeam(lastGw),
      lastGw,
      myPicks: picksByGw.get(lastGw),
      picksByGw,
      liveByGw,
      elementsById,
      teamsById,
      gws,
    }),
  );

  return base;
}
