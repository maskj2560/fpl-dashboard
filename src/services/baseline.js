// «Laget uten bytter»: hva GW1-troppen ville scoret hele sesongen, urørt.
// Deterministiske regler (dokumentert også i UI-et):
//  - Startellever = GW1-oppstillingen; startere uten minutter byttes mot
//    benken i benkerekkefølge (posisjon 12–15), under formasjonskravene
//    1 keeper / minst 3 forsvarere / 2 midtbanespillere / 1 angriper.
//    Keeper byttes kun mot keeper, og bare spillere med minutter kommer inn.
//  - Kaptein: rundens faktiske kaptein hvis han står i den simulerte
//    elleveren, ellers GW1-visekapteinen, ellers GW1-kapteinen. Har
//    kandidaten 0 minutter, prøves nestemann. Dobling er alltid ×2
//    (Triple Captain ignoreres — bevisst forenkling).
import config from '../config.js';
import {
  getLive,
  getLiveHistoric,
  getPicks,
  getPicksHistoric,
} from './fplClient.js';
import { byId } from './analysis.js';

/** Ren simulering — all data injiseres. Se reglene i filhodet. */
export function simulateNoTransferSeason({ gw1Picks, liveByGw, elementsById, captainByGw, maxGw }) {
  const picks = [...(gw1Picks?.picks ?? [])].sort((a, b) => a.position - b.position);
  if (picks.length === 0 || !Number.isInteger(maxGw) || maxGw < 1) {
    return { perGw: [], total: 0 };
  }
  const starters = picks.filter((p) => p.position <= 11).map((p) => p.element);
  const bench = picks.filter((p) => p.position >= 12).map((p) => p.element);
  const squad = new Set([...starters, ...bench]);
  const gw1Captain = picks.find((p) => p.is_captain)?.element ?? null;
  const gw1Vice = picks.find((p) => p.is_vice_captain)?.element ?? null;
  const typeOf = (id) => elementsById.get(id)?.element_type ?? null;

  const perGw = [];
  let total = 0;
  for (let gw = 1; gw <= maxGw; gw++) {
    const stats = new Map(
      (liveByGw.get(gw)?.elements ?? []).map((e) => [
        e.id,
        { points: e.stats?.total_points ?? 0, minutes: e.stats?.minutes ?? 0 },
      ]),
    );
    const pts = (id) => stats.get(id)?.points ?? 0;
    const mins = (id) => stats.get(id)?.minutes ?? 0;

    const xi = [...starters];
    const autosubs = [];
    const used = new Set();
    const validAfterSwap = (outId, inId) => {
      const outType = typeOf(outId);
      const inType = typeOf(inId);
      if (outType == null || inType == null) return false;
      if ((outType === 1) !== (inType === 1)) return false; // keeper kun mot keeper
      const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const id of xi) {
        const t = typeOf(id);
        if (c[t] != null) c[t] += 1;
      }
      c[outType] -= 1;
      c[inType] += 1;
      return c[1] === 1 && c[2] >= 3 && c[3] >= 2 && c[4] >= 1;
    };

    for (let i = 0; i < xi.length; i++) {
      const outId = xi[i];
      if (mins(outId) > 0) continue;
      for (const inId of bench) {
        if (used.has(inId) || mins(inId) === 0) continue;
        if (!validAfterSwap(outId, inId)) continue;
        xi[i] = inId;
        used.add(inId);
        autosubs.push({ outId, inId });
        break;
      }
    }

    const inXi = new Set(xi);
    const actual = captainByGw?.get(gw) ?? null;
    const candidates = [];
    if (actual != null && squad.has(actual)) candidates.push(actual);
    if (gw1Vice != null) candidates.push(gw1Vice);
    if (gw1Captain != null) candidates.push(gw1Captain);
    let captainId = null;
    for (const candidate of candidates) {
      if (inXi.has(candidate) && mins(candidate) > 0) {
        captainId = candidate;
        break;
      }
    }

    const points = xi.reduce((sum, id) => sum + pts(id), 0) + (captainId != null ? pts(captainId) : 0);
    perGw.push({
      gw,
      points,
      captainId,
      viceUsed: captainId != null && captainId !== actual,
      autosubs,
    });
    total += points;
  }
  return { perGw, total };
}

/**
 * Henter det simuleringen trenger og sammenligner med faktisk sesongscore.
 * Null når det ikke finnes bytter (da ER laget uten bytter fasiten) eller
 * GW1-oppstillingen mangler. Alle kall er cachede fplClient-kall; ferdige
 * runder bruker 6 t-TTL-variantene.
 */
export async function assembleBaseline({ teamId = config.fplTeamId, bootstrap, history, analysis } = {}) {
  if (!analysis || analysis.totals.count === 0) return null;
  const maxGw = analysis.maxGw;
  if (!Number.isInteger(maxGw) || maxGw < 1) return null;

  let gw1Picks;
  try {
    gw1Picks = await getPicksHistoric(teamId, 1);
  } catch {
    return null;
  }

  const eventsById = new Map(bootstrap.events.map((e) => [e.id, e]));
  const gws = [];
  for (let gw = 1; gw <= maxGw; gw++) gws.push(gw);
  const [liveResults, picksResults] = await Promise.all([
    Promise.all(gws.map((gw) => (eventsById.get(gw)?.finished ? getLiveHistoric(gw) : getLive(gw)))),
    Promise.all(
      gws.map((gw) =>
        (eventsById.get(gw)?.finished ? getPicksHistoric(teamId, gw) : getPicks(teamId, gw))
          .catch(() => null),
      ),
    ),
  ]);
  const liveByGw = new Map(gws.map((gw, i) => [gw, liveResults[i]]));
  const captainByGw = new Map(
    gws.map((gw, i) => [gw, picksResults[i]?.picks?.find((p) => p.is_captain)?.element ?? null]),
  );

  const elementsById = byId(bootstrap.elements);
  const sim = simulateNoTransferSeason({ gw1Picks, liveByGw, elementsById, captainByGw, maxGw });
  if (sim.perGw.length === 0) return null;

  const current = history?.current ?? [];
  const actualTotal = current.length ? (current[current.length - 1].total_points ?? null) : null;
  return {
    simTotal: sim.total,
    actualTotal,
    diff: actualTotal != null ? actualTotal - sim.total : null,
    perGw: sim.perGw.map((r) => ({
      ...r,
      captainName: r.captainId != null ? (elementsById.get(r.captainId)?.web_name ?? null) : null,
    })),
  };
}
