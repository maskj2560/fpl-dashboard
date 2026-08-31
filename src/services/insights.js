// Sesonginnsikt (v1.7.0): rene analysefunksjoner for /innsikt —
// benkesløsing, kapteinsfasit, flaksbarometer og rundens XI.
// Nettverkskall skjer kun i assembleInsights, og kun via fplClient.
//
// Poengsemantikk: ALLE sammenligninger bruker RÅ 1×-poeng fra live.
// `multiplier` leses kun binært (> 0 = spilte, 0 = benket) — aldri
// aritmetisk. Kapteinsdoblingen måles som identitet/differanse i
// kapteinsfasiten, aldri som en multiplikator på poengsummene.
// Se docs/plan-innsikt-v170.md.

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
