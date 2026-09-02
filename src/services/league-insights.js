// Liga-innsikt (v1.6.0): rene analysefunksjoner for /liga — ligaintern
// rank per runde, flerserie-graf, rival-radar og kaptein-liga.
// Ingen nettverkskall her utenom assemble-funksjonene, som kun bruker
// fplClient. Se docs/plan-liga-v160.md.

import { differentials, resolvedGw } from './analysis.js';
import config from '../config.js';
import {
  getBootstrap,
  getLeagueStandings,
  getPicks,
  getPicksHistoric,
  getLiveHistoric,
  getEntryHistory,
  getEntryHistoryHistoric,
} from './fplClient.js';

/** Maks antall managere som analyseres (side 1 av standings kuttes hit). */
export const MAX_MANAGERS = 20;

/**
 * Kaptein-ligaens dybde: siste N ferdige runder. Full sesong ville i
 * verstefall kostet 20 managere × 38 runder = 760 picks-kall ved kald
 * cache — taket holder kaldstarten under ~210 kall (Marius 27. aug).
 */
export const CAPTAIN_LEAGUE_DEPTH = 10;

/**
 * Ligaintern plassering per runde, rekonstruert fra hver managers
 * entry-history: sortér kumulativ total per runde, likhet → lavest
 * entry-id. Manager uten historikkrad for en runde får null (hull i
 * serien, ikke 0 poeng).
 *
 * @param {object} p
 * @param {Array} p.results standings.results (alt kuttet til MAX_MANAGERS)
 * @param {Map<number, Array>} p.histories entry → history.current-rader
 * @param {number} p.maxGw siste ferdige runde
 * @returns {{gws: number[], series: Array}|null} null uten ferdige runder
 */
export function leagueRanksByGw({ results, histories, maxGw }) {
  if (!Array.isArray(results) || results.length === 0 || !maxGw || maxGw < 1) return null;

  const gws = [];
  for (let gw = 1; gw <= maxGw; gw++) gws.push(gw);

  const totalByEntryGw = new Map();
  for (const r of results) {
    const rows = histories?.get(r.entry) ?? [];
    const byGw = new Map();
    for (const row of rows) {
      if (row?.event >= 1 && row.event <= maxGw && Number.isFinite(row.total_points)) {
        byGw.set(row.event, row.total_points);
      }
    }
    totalByEntryGw.set(r.entry, byGw);
  }

  // Rank per runde: alle med data den runden, total desc, likhet → lavest entry.
  const rankByGwEntry = new Map();
  for (const gw of gws) {
    const contenders = results
      .filter((r) => totalByEntryGw.get(r.entry).has(gw))
      .map((r) => ({ entry: r.entry, total: totalByEntryGw.get(r.entry).get(gw) }))
      .sort((a, b) => b.total - a.total || a.entry - b.entry);
    contenders.forEach((c, i) => rankByGwEntry.set(`${gw}:${c.entry}`, i + 1));
  }

  const series = results.map((r) => ({
    entry: r.entry,
    entryName: r.entry_name ?? '',
    playerName: r.player_name ?? '',
    points: gws.map((gw) => {
      const total = totalByEntryGw.get(r.entry).get(gw);
      if (total === undefined) return null;
      return { gw, total, rank: rankByGwEntry.get(`${gw}:${r.entry}`) };
    }),
  }));

  return { gws, series };
}

/**
 * Flerserie-SVG-grunnlag fra leagueRanksByGw: polylinje-punkter per
 * manager. rank 1 = y 0 (øverst). me/rival legges SIST i arrayen så de
 * tegnes over de andre. Én runde → single (viewet tegner punkter).
 */
export function buildLeagueGraph({ ranks, myEntry, rivalEntry = null, width = 600, height = 140 }) {
  if (!ranks || !Array.isArray(ranks.series) || ranks.series.length === 0) return null;

  const managers = ranks.series.length;
  const n = ranks.gws.length;
  const single = n === 1;
  const stepX = single ? 0 : width / (n - 1);
  const xAt = (i) => (single ? width / 2 : Math.round(i * stepX));
  const yAt = (rank) => (managers === 1 ? 0 : Math.round(((rank - 1) / (managers - 1)) * height));

  const series = ranks.series.map((s) => {
    const pts = [];
    let lastRank = null;
    s.points.forEach((p, i) => {
      if (!p) return;
      pts.push(`${xAt(i)},${yAt(p.rank)}`);
      lastRank = p.rank;
    });
    return {
      entry: s.entry,
      name: s.entryName || s.playerName,
      points: pts.join(' '),
      me: s.entry === myEntry,
      rival: rivalEntry !== null && s.entry === rivalEntry,
      lastRank,
    };
  });

  // Øvrige først (original rekkefølge), så rival, meg aller sist.
  series.sort((a, b) => (a.me ? 2 : a.rival ? 1 : 0) - (b.me ? 2 : b.rival ? 1 : 0));

  return {
    width,
    height,
    gwFirst: ranks.gws[0],
    gwLast: ranks.gws[n - 1],
    managers,
    single,
    series,
  };
}

/**
 * Velger rivalen: forespurt entry når den finnes i ligaen og ikke er meg;
 * ellers nærmeste over meg i tabellen (leder får nærmeste under).
 * null når jeg mangler i lista eller er alene.
 */
export function pickRival({ results, myEntry, requested = null }) {
  if (!Array.isArray(results) || results.length < 2) return null;
  const me = results.find((r) => r.entry === myEntry);
  if (!me) return null;

  if (requested !== null && requested !== myEntry && results.some((r) => r.entry === requested)) {
    return requested;
  }

  const above = results.find((r) => r.rank === me.rank - 1);
  if (above) return above.entry;
  const below = results.find((r) => r.rank === me.rank + 1);
  return below ? below.entry : null;
}

function managerMeta(row) {
  return {
    entry: row.entry,
    entryName: row.entry_name ?? '',
    playerName: row.player_name ?? '',
    rank: row.rank ?? null,
    total: row.total ?? null,
    eventTotal: row.event_total ?? null,
  };
}

function displayPlayer(element, teamsById) {
  const team = teamsById?.get(element.team) ?? {};
  return {
    id: element.id,
    name: element.web_name,
    teamCode: team.code ?? null,
    teamShort: team.short_name ?? '',
    eventPoints: Number.isFinite(element.event_points) ? element.event_points : 0,
  };
}

function captainOf(picks, elementsById, teamsById) {
  const pick = (picks?.picks ?? []).find((p) => p.is_captain);
  const element = pick ? elementsById.get(pick.element) : null;
  if (!element) return null;
  return { ...displayPlayer(element, teamsById), tc: pick.multiplier === 3 };
}

/**
 * Rival-radaren: avstand (totalt + siste runde, rival − meg),
 * differensialer begge veier (eierandel-rekkefølge fra differentials()),
 * felles spillere og begges kaptein. Rundepoeng fra bootstrap
 * `event_points` — ingen ekstra kall. null når picks mangler.
 */
export function buildRivalCompare({ myEntry, rivalEntry, results, myPicks, rivalPicks, elements, teamsById }) {
  const myRow = results.find((r) => r.entry === myEntry);
  const rivalRow = results.find((r) => r.entry === rivalEntry);
  if (!myRow || !rivalRow || !myPicks?.picks || !rivalPicks?.picks) return null;

  const elementsById = new Map(elements.map((e) => [e.id, e]));
  const myIds = new Set(myPicks.picks.map((p) => p.element));
  const rivalIds = new Set(rivalPicks.picks.map((p) => p.element));

  const diff = differentials(myIds, rivalIds, elements);
  const enrich = (list) => list.map((e) => displayPlayer(e, teamsById));

  const shared = elements
    .filter((e) => myIds.has(e.id) && rivalIds.has(e.id))
    .map((e) => displayPlayer(e, teamsById))
    .sort((a, b) => b.eventPoints - a.eventPoints);

  const me = managerMeta(myRow);
  const rival = managerMeta(rivalRow);

  return {
    me,
    rival,
    gapTotal: (rival.total ?? 0) - (me.total ?? 0),
    gapEvent: (rival.eventTotal ?? 0) - (me.eventTotal ?? 0),
    diff: { theirs: enrich(diff.theirs), mine: enrich(diff.mine) },
    shared,
    captains: {
      mine: captainOf(myPicks, elementsById, teamsById),
      rival: captainOf(rivalPicks, elementsById, teamsById),
    },
  };
}

/**
 * Den som faktisk bar bindet: picken med høyest multiplier (dekker TC=3
 * og vise-kaptein som overtok med 2), fallback is_captain når ingen
 * multiplier skiller (f.eks. før runden er spilt).
 */
export function effectiveCaptain(picks) {
  const rows = picks?.picks ?? [];
  if (rows.length === 0) return null;
  let best = null;
  for (const p of rows) {
    if ((p.multiplier ?? 0) >= 2 && (!best || p.multiplier > best.multiplier)) best = p;
  }
  return best ?? rows.find((p) => p.is_captain) ?? null;
}

function livePointsMap(live) {
  const map = new Map();
  for (const e of live?.elements ?? []) map.set(e.id, e.stats?.total_points ?? 0);
  return map;
}

/**
 * Kaptein-ligaen: per manager — kapteinens RÅ poeng (1×, aldri ganget
 * med multiplier; TC identifiserer bare capen) og «tapt mot optimal»,
 * der optimal = beste råscore i start-XI (position ≤ 11). Sum over
 * vinduet `gws` (siste CAPTAIN_LEAGUE_DEPTH ferdige runder).
 */
export function buildCaptainLeague({ results, picksByEntry, liveByGw, elements, teamsById, gws, lastGw }) {
  if (!Array.isArray(gws) || gws.length === 0) return null;
  const elementsById = new Map(elements.map((e) => [e.id, e]));

  const rows = results.map((r) => {
    let sumPoints = 0;
    let sumLost = 0;
    let rounds = 0;
    let last = null;

    for (const gw of gws) {
      const picks = picksByEntry.get(r.entry)?.get(gw);
      const live = liveByGw.get(gw);
      const cap = effectiveCaptain(picks);
      if (!picks?.picks || !live || !cap) {
        if (gw === lastGw) last = null;
        continue;
      }
      const points = livePointsMap(live);
      const capPoints = points.get(cap.element) ?? 0;
      const optimal = picks.picks
        .filter((p) => p.position <= 11)
        .reduce((best, p) => Math.max(best, points.get(p.element) ?? 0), 0);
      const lost = optimal - capPoints;

      sumPoints += capPoints;
      sumLost += lost;
      rounds += 1;

      if (gw === lastGw) {
        const element = elementsById.get(cap.element);
        last = {
          name: element?.web_name ?? 'Ukjent',
          teamCode: teamsById?.get(element?.team)?.code ?? null,
          teamShort: teamsById?.get(element?.team)?.short_name ?? '',
          points: capPoints,
          optimal,
          lost,
          tc: cap.multiplier === 3,
        };
      }
    }

    return {
      entry: r.entry,
      entryName: r.entry_name ?? '',
      last,
      sum: { points: sumPoints, lost: sumLost, rounds },
    };
  });

  rows.sort((a, b) => b.sum.points - a.sum.points || a.sum.lost - b.sum.lost);

  return {
    gws,
    lastGw,
    depth: CAPTAIN_LEAGUE_DEPTH,
    capped: gws[0] > 1,
    rows,
  };
}

// ---- henting -------------------------------------------------------------

/**
 * Promise.all med tak på samtidighet: maks `limit` kall i flukt.
 * Resultatene kommer i input-rekkefølge. Kaldstarten på /liga kan
 * romme ~200 kall — Promise.all rett på ville sluppet alle løs samtidig.
 */
export async function _mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return out;
}

async function softNull(fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Liga-innsikt: seksjon feilet mykt: ${err.message}`);
    return null;
  }
}

/**
 * Henter alt /liga-innsikten trenger via fplClient-cachene. Bootstrap og
 * standings er harde feil (uten dem finnes ingen side); rival-radar,
 * graf og kaptein-liga feiler mykt til null hver for seg.
 */
export async function assembleLeagueInsights({ leagueId, teamId = config.fplTeamId, requestedRival = null }) {
  const [bootstrap, standings] = await Promise.all([getBootstrap(), getLeagueStandings(leagueId)]);

  const results = (standings?.standings?.results ?? []).slice(0, MAX_MANAGERS);
  const leagueName = standings?.league?.name ?? '';
  const events = bootstrap.events ?? [];
  const gw = resolvedGw(events);
  const teamsById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t]));
  const elements = bootstrap.elements ?? [];

  const base = { gw, leagueName, results, rivalEntry: null, rival: null, graph: null, captainLeague: null };
  if (results.length === 0) return base;

  const rivalEntry = pickRival({ results, myEntry: teamId, requested: requestedRival });
  base.rivalEntry = rivalEntry;

  const finishedAll = events.filter((e) => e.finished).map((e) => e.id);
  const finishedGws = finishedAll.slice(-CAPTAIN_LEAGUE_DEPTH);

  // Rival-radar: rundens picks for meg og rivalen — aldri resten av ligaen.
  base.rival = await softNull(async () => {
    if (!rivalEntry || gw < 1) return null;
    const [myPicks, rivalPicks] = await Promise.all([getPicks(teamId, gw), getPicks(rivalEntry, gw)]);
    return buildRivalCompare({ myEntry: teamId, rivalEntry, results, myPicks, rivalPicks, elements, teamsById });
  });

  // Sesonggraf: entry-history per manager. Egen id ALLTID via
  // getEntryHistory (5 min) — 6 t-varianten har egen :hist-nøkkel (v1.12.2),
  // men regelen står: egen id skal alltid være fersk.
  base.graph = await softNull(async () => {
    const histories = await _mapLimit(results, 8, async (r) => {
      const history = r.entry === teamId ? await getEntryHistory(r.entry) : await getEntryHistoryHistoric(r.entry);
      return [r.entry, history?.current ?? []];
    });
    const ranks = leagueRanksByGw({ results, histories: new Map(histories), maxGw: finishedAll.at(-1) ?? 0 });
    return buildLeagueGraph({ ranks, myEntry: teamId, rivalEntry });
  });

  // Kaptein-liga: picks + live KUN for ferdige runder i dybdevinduet.
  base.captainLeague = await softNull(async () => {
    if (finishedGws.length === 0) return null;
    const liveRows = await _mapLimit(finishedGws, 8, async (g) => [g, await getLiveHistoric(g)]);
    const liveByGw = new Map(liveRows);

    const wanted = [];
    for (const r of results) for (const g of finishedGws) wanted.push([r.entry, g]);
    const picksRows = await _mapLimit(wanted, 8, async ([entry, g]) => {
      try {
        return [entry, g, await getPicksHistoric(entry, g)];
      } catch {
        return [entry, g, null]; // 404 o.l.: manageren fantes ikke den runden
      }
    });
    const picksByEntry = new Map();
    for (const [entry, g, picks] of picksRows) {
      if (!picksByEntry.has(entry)) picksByEntry.set(entry, new Map());
      picksByEntry.get(entry).set(g, picks);
    }

    return buildCaptainLeague({
      results,
      picksByEntry,
      liveByGw,
      elements,
      teamsById,
      gws: finishedGws,
      lastGw: finishedGws.at(-1),
    });
  });

  return base;
}

// ---- rundens rapport -----------------------------------------------------

/** FPLs chip-navn → kort merke i UI. Ukjent verdi gir ingen merke. */
const CHIP_LABELS = { bboost: 'BB', '3xc': 'TC', wildcard: 'WC', freehit: 'FH' };

export const chipLabel = (name) => CHIP_LABELS[name] ?? null;

/** Differensial i rapporten: aleneeid spiller med minst så mange råpoeng. */
const DIFFERENTIAL_MIN_POINTS = 8;

/** Flopp i rapporten: maks så mange råpoeng tross bred eierskap i ligaen. */
const FLOP_MAX_POINTS = 2;

/**
 * Lagdetaljer + differensialer/flopper for rapporten. Eierskap telles kun
 * i start-XI (multiplier > 0 — FPL re-sorterer picks etter autosub), og
 * alle poeng er rå 1×. Managere uten picks utelates fra lagdetaljene.
 */
function buildReportDetails({ results, picksByEntry, live, elements, eventId }) {
  const empty = { teams: [], differentials: [], flops: [] };
  if (!picksByEntry || !live || !elements?.length) return empty;

  const pointsOf = new Map();
  for (const e of live.elements ?? []) pointsOf.set(e.id, e.stats?.total_points ?? 0);
  const nameOf = new Map(elements.map((e) => [e.id, e.web_name]));

  const teams = [];
  const owners = new Map(); // element-id → [entryName, ...] i start-XI
  for (const r of results) {
    const picks = picksByEntry.get(r.entry)?.get(eventId);
    if (!picks?.picks?.length) continue;

    const xi = picks.picks.filter((p) => p.multiplier > 0);
    const benched = picks.picks.filter((p) => p.multiplier === 0);
    const reported = picks.entry_history?.points_on_bench;
    const bench = Number.isInteger(reported)
      ? reported
      : benched.reduce((sum, p) => sum + (pointsOf.get(p.element) ?? 0), 0);

    let top = null;
    for (const p of xi) {
      const points = pointsOf.get(p.element) ?? 0;
      if (!top || points > top.points) top = { name: nameOf.get(p.element) ?? '?', points };
      const list = owners.get(p.element) ?? [];
      list.push(r.entry_name ?? '');
      owners.set(p.element, list);
    }

    teams.push({
      entryName: r.entry_name ?? '',
      playerName: r.player_name ?? '',
      bench,
      chip: chipLabel(picks.active_chip),
      transfers: picks.entry_history?.event_transfers ?? 0,
      hit: picks.entry_history?.event_transfers_cost ?? 0,
      topScorer: top,
    });
  }
  if (!teams.length) return empty;

  const differentials = [];
  const flops = [];
  const broadOwnership = Math.ceil(teams.length / 2);
  for (const [id, list] of owners) {
    const points = pointsOf.get(id) ?? 0;
    if (list.length === 1 && points >= DIFFERENTIAL_MIN_POINTS) {
      differentials.push({ entryName: list[0], name: nameOf.get(id) ?? '?', points });
    } else if (list.length >= broadOwnership && points <= FLOP_MAX_POINTS) {
      flops.push({ name: nameOf.get(id) ?? '?', points, owners: list.length });
    }
  }
  differentials.sort((a, b) => b.points - a.points);
  flops.sort((a, b) => b.owners - a.owners || a.points - b.points);

  return { teams, differentials: differentials.slice(0, 3), flops: flops.slice(0, 3) };
}

/**
 * Grunnlaget for «Rundens rapport»: vinner/taper på rundepoeng,
 * bevegelser (rank ≠ last_rank), tabellen, min runde med kapteinsfasit
 * og alle kapteinsvalg — pluss lagdetaljer (benk, chip, bytter/hit,
 * toppscorer) og differensialer/flopper når picks + live + elements
 * sendes med. Rene data — prompten bygges i prompts.js.
 */
export function buildReportData({ event, leagueName, results, captainRound, myEntry, picksByEntry, live, elements }) {
  const byEvent = [...results].sort((a, b) => (b.event_total ?? 0) - (a.event_total ?? 0));
  const capByEntry = new Map((captainRound?.rows ?? []).map((r) => [r.entry, r.last]));

  const meta = (r) => ({
    entryName: r.entry_name ?? '',
    playerName: r.player_name ?? '',
    eventTotal: r.event_total ?? 0,
  });

  const myRow = results.find((r) => r.entry === myEntry) ?? null;
  const myCap = myRow ? capByEntry.get(myEntry) : null;

  return {
    event: { id: event.id, name: event.name },
    league: { name: leagueName, size: results.length },
    winner: byEvent.length ? meta(byEvent[0]) : null,
    loser: byEvent.length ? meta(byEvent.at(-1)) : null,
    movers: results
      .filter((r) => r.last_rank && r.rank !== r.last_rank)
      .map((r) => ({ entryName: r.entry_name ?? '', from: r.last_rank, to: r.rank })),
    table: results.map((r) => ({
      rank: r.rank,
      entryName: r.entry_name ?? '',
      playerName: r.player_name ?? '',
      eventTotal: r.event_total ?? 0,
      total: r.total ?? 0,
    })),
    mine: myRow
      ? {
          entryName: myRow.entry_name ?? '',
          rank: myRow.rank,
          lastRank: myRow.last_rank ?? null,
          eventTotal: myRow.event_total ?? 0,
          total: myRow.total ?? 0,
          captain: myCap
            ? { name: myCap.name, points: myCap.points, lost: myCap.lost, tc: myCap.tc }
            : null,
        }
      : null,
    captains: (captainRound?.rows ?? [])
      .filter((r) => r.last)
      .map((r) => ({
        entryName: r.entryName,
        captain: r.last.name,
        points: r.last.points,
        lost: r.last.lost,
        tc: r.last.tc,
      })),
    ...buildReportDetails({ results, picksByEntry, live, elements, eventId: event.id }),
  };
}

/**
 * Henter rapportgrunnlaget for ÉN ferdig runde: standings + live +
 * picks per manager KUN for rapportrunden. Deler cache-nøkler med
 * /liga-visningen, så rapporten er gratis når siden nettopp er vist.
 */
export async function assembleLeagueReportData({ leagueId, teamId = config.fplTeamId, event }) {
  const [bootstrap, standings] = await Promise.all([getBootstrap(), getLeagueStandings(leagueId)]);
  const results = (standings?.standings?.results ?? []).slice(0, MAX_MANAGERS);
  const teamsById = new Map((bootstrap.teams ?? []).map((t) => [t.id, t]));

  const live = await getLiveHistoric(event.id);
  const liveByGw = new Map([[event.id, live]]);
  const picksRows = await _mapLimit(results, 8, async (r) => {
    try {
      return [r.entry, await getPicksHistoric(r.entry, event.id)];
    } catch {
      return [r.entry, null];
    }
  });
  const picksByEntry = new Map(picksRows.map(([entry, picks]) => [entry, new Map([[event.id, picks]])]));

  const captainRound = buildCaptainLeague({
    results,
    picksByEntry,
    liveByGw,
    elements: bootstrap.elements ?? [],
    teamsById,
    gws: [event.id],
    lastGw: event.id,
  });

  return buildReportData({
    event,
    leagueName: standings?.league?.name ?? '',
    results,
    captainRound,
    myEntry: teamId,
    picksByEntry,
    live,
    elements: bootstrap.elements ?? [],
  });
}
