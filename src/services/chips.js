// Chip-planleggeren (v1.9.0): rene funksjoner over sesongens kampprogram.
// Ingen nettverk, ingen AI — alt regnes fra bootstrap (teams, chips, events),
// fixtures/ (hele sesongen) og troppens klubbfordeling.

import { fixtureGrid } from './analysis.js';

/** FPL-navnene slik de står i entry-history `chips[].name`. */
export const CHIPS = ['bboost', '3xc', 'freehit', 'wildcard'];

export const CHIP_LABELS = {
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
  freehit: 'Free Hit',
  wildcard: 'Wildcard',
};

const isGw = (n) => Number.isInteger(n) && n >= 1 && n <= 38;

/**
 * Chip-halvdelene. Siden 2024/25 gir FPL ett sett chips per halvdel, og
 * bootstrap `chips[]` bærer `start_event`/`stop_event` per chip. Halvdelen
 * er STOPP-runden: wildcard og Free Hit kan ikke spilles i runde 1 og har
 * `start_event` 2 (QA-funn 1, v1.12.1) — de hører likevel til samme halvdel
 * som Bench Boost/Triple Captain med start 1. `from` er laveste start i
 * gruppa. Uten gyldige felter: 1–19 og 20–38.
 */
export function chipHalves(bootstrapChips, lastGw = 38) {
  const byStop = new Map();
  for (const c of Array.isArray(bootstrapChips) ? bootstrapChips : []) {
    if (!isGw(c?.start_event) || !isGw(c?.stop_event) || c.stop_event < c.start_event) continue;
    const prev = byStop.get(c.stop_event);
    byStop.set(c.stop_event, { from: Math.min(prev?.from ?? c.start_event, c.start_event), to: c.stop_event });
  }
  const list = [...byStop.values()].sort((a, b) => a.from - b.from);
  if (list.length === 0) {
    const mid = Math.floor(lastGw / 2);
    return [
      { half: 1, from: 1, to: mid },
      { half: 2, from: mid + 1, to: lastGw },
    ];
  }
  return list.map((r, i) => ({ half: i + 1, ...r }));
}

/**
 * Dobbel- og blankrunder i [fromGw, toGw] fra fixtureGrid-en. En runde
 * teller bare når minst ett lag har kamp der — runder FPL ikke har satt
 * opp ennå er ikke «blanke» for alle.
 */
export function specialGws(grid, teams, fromGw, toGw) {
  const dgw = [];
  const bgw = [];
  for (let gw = fromGw; gw <= toGw; gw++) {
    const counts = teams.map((t) => [t, grid.get(t.id)?.get(gw)?.length ?? 0]);
    if (!counts.some(([, n]) => n > 0)) continue;
    const doubles = counts.filter(([, n]) => n >= 2).map(([t]) => t.short_name);
    const blanks = counts.filter(([, n]) => n === 0).map(([t]) => t.short_name);
    if (doubles.length) dgw.push({ gw, teams: doubles });
    if (blanks.length) bgw.push({ gw, teams: blanks });
  }
  return { dgw, bgw };
}

// ---- Anbefalinger -----------------------------------------------------------

const BLANK_FDR = 5; // en klubb uten kamp teller som tyngste FDR i Wildcard-regnskapet
const WILDCARD_BAD_RUN = 3.3; // snitt-FDR over tre runder før vi kaller det en tung periode
const FREE_HIT_MIN_BLANK = 4; // så mange i troppen må være blanke før Free Hit anbefales

const ease = (entries) => entries.reduce((sum, e) => sum + (6 - e.difficulty), 0);
const meanDifficulty = (entries) =>
  entries.length ? entries.reduce((sum, e) => sum + e.difficulty, 0) / entries.length : BLANK_FDR;

/** Bench Boost: runden der troppen samlet har flest og lettest kamper. */
function recommendBenchBoost({ gws, grid, squadTeams, counts }) {
  let best = null;
  for (const gw of gws) {
    let score = 0;
    let squadFixtures = 0;
    let difficultySum = 0;
    const dgwClubs = [];
    for (const team of squadTeams) {
      const n = counts.get(team.id);
      const entries = grid.get(team.id)?.get(gw) ?? [];
      score += n * ease(entries);
      squadFixtures += n * entries.length;
      difficultySum += n * entries.reduce((s, e) => s + e.difficulty, 0);
      if (entries.length >= 2) dgwClubs.push(team.short_name);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, gw, squadFixtures, avgFdr: difficultySum / squadFixtures, dgwClubs };
    }
  }
  if (!best) return { rec: null, reason: 'Troppen har ingen kjente kamper i halvdelen' };
  return {
    rec: { gw: best.gw, squadFixtures: best.squadFixtures, avgFdr: best.avgFdr, dgwClubs: best.dgwClubs },
    reason: null,
  };
}

/** Triple Captain: klubb × runde med mest samlet «ease» — dobbelrunder teller dobbelt. */
function recommendTripleCaptain({ gws, grid, squadTeams, outfield }) {
  let best = null;
  for (const gw of gws) {
    for (const team of squadTeams) {
      const candidates = outfield.get(team.id) ?? 0;
      if (candidates === 0) continue; // keeperen kapteines ikke
      const entries = grid.get(team.id)?.get(gw) ?? [];
      const score = ease(entries);
      if (score === 0) continue;
      const better = !best || score > best.score ||
        (score === best.score && gw === best.gw && candidates > best.candidates);
      if (better) best = { score, gw, candidates, teamId: team.id, teamShort: team.short_name, fixtures: entries };
    }
  }
  if (!best) return { rec: null, reason: 'Ingen utespiller i troppen har kjent kamp i halvdelen' };
  return { rec: { gw: best.gw, teamId: best.teamId, teamShort: best.teamShort, fixtures: best.fixtures }, reason: null };
}

/** Free Hit: blankrunden som rammer flest i troppen — minst fire, ellers ingen. */
function recommendFreeHit({ gws, bgw, squadTeams, counts }) {
  const inHalf = bgw.filter((b) => gws.includes(b.gw));
  if (inHalf.length === 0) return { rec: null, reason: 'Ingen kjent blankrunde i halvdelen' };
  let best = null;
  for (const { gw, teams: blankShorts } of inHalf) {
    const blankClubs = squadTeams.filter((t) => blankShorts.includes(t.short_name));
    const blankPlayers = blankClubs.reduce((sum, t) => sum + counts.get(t.id), 0);
    if (!best || blankPlayers > best.blankPlayers) {
      best = { gw, blankPlayers, blankClubs: blankClubs.map((t) => t.short_name) };
    }
  }
  if (!best || best.blankPlayers < FREE_HIT_MIN_BLANK) {
    return { rec: null, reason: 'Ingen blankrunde rammer troppen bredt nok til Free Hit' };
  }
  return { rec: best, reason: null };
}

/**
 * Wildcard: finn troppens tyngste tre kjente runder på rad; anbefal
 * vinduet rett etter, 4–6 runder langt, der de letteste klubbene har best
 * program (det er dem man bytter til).
 */
function recommendWildcard({ gws, grid, teams, squadTeams, counts }) {
  const total = squadTeams.reduce((sum, t) => sum + counts.get(t.id), 0);
  const squadFdr = (gw) =>
    squadTeams.reduce((sum, t) => sum + counts.get(t.id) * meanDifficulty(grid.get(t.id)?.get(gw) ?? []), 0) / total;
  const fdrByGw = new Map(gws.map((gw) => [gw, squadFdr(gw)]));

  let worst = null;
  for (let i = 0; i + 2 < gws.length; i++) {
    const avg = (fdrByGw.get(gws[i]) + fdrByGw.get(gws[i + 1]) + fdrByGw.get(gws[i + 2])) / 3;
    if (!worst || avg > worst.avg) worst = { i, avg };
  }
  if (!worst || worst.avg < WILDCARD_BAD_RUN) {
    return { rec: null, reason: 'Troppen har ingen tung periode i halvdelen' };
  }
  const startIndex = worst.i + 3;
  if (startIndex >= gws.length) {
    return { rec: null, reason: 'Den tunge perioden går ut halvdelen — ingen kjente runder etter' };
  }

  const clubAvg = (team, window) =>
    window.reduce((sum, gw) => sum + meanDifficulty(grid.get(team.id)?.get(gw) ?? []), 0) / window.length;
  const lengths = [4, 5, 6].filter((L) => startIndex + L <= gws.length);
  if (lengths.length === 0) lengths.push(gws.length - startIndex);
  let bestWindow = null;
  for (const L of lengths) {
    const window = gws.slice(startIndex, startIndex + L);
    const ranked = teams.map((t) => ({ short: t.short_name, avgFdr: clubAvg(t, window) })).sort((a, b) => a.avgFdr - b.avgFdr);
    const top = ranked.slice(0, 8);
    const score = top.reduce((sum, c) => sum + c.avgFdr, 0) / top.length;
    if (!bestWindow || score <= bestWindow.score) bestWindow = { score, window, ranked };
  }
  return {
    rec: {
      gw: bestWindow.window[0],
      until: bestWindow.window[bestWindow.window.length - 1],
      badRun: { from: gws[worst.i], to: gws[worst.i + 2], avgFdr: worst.avg },
      bestClubs: bestWindow.ranked.slice(0, 5),
    },
    reason: null,
  };
}

const fdr1 = (n) => n.toFixed(1).replace('.', ',');

/** Én norsk setning som forklarer anbefalingen med tallene i rec. Tom uten rec. */
export function describeRec(name, rec) {
  if (!rec) return '';
  switch (name) {
    case 'bboost': {
      const dobbel = rec.dgwClubs?.length ? ` · dobbel: ${rec.dgwClubs.join(', ')}` : '';
      return `${rec.squadFixtures} kamper i troppen, snitt-FDR ${fdr1(rec.avgFdr)}${dobbel}`;
    }
    case '3xc':
      return `${rec.teamShort}: ${rec.fixtures.map((f) => `${f.opponent} (${f.home ? 'h' : 'b'})`).join(', ')}`;
    case 'freehit':
      return `${rec.blankPlayers} i troppen er blanke (${rec.blankClubs.join(', ')})`;
    case 'wildcard':
      return `etter tung periode runde ${rec.badRun.from}–${rec.badRun.to} (FDR ${fdr1(rec.badRun.avgFdr)})` +
        ` · beste program: ${rec.bestClubs.map((c) => c.short).join(', ')}`;
    default:
      return '';
  }
}

/**
 * Hele planen: per chip-halvdel, per chip — brukt (med runde) eller en
 * regelbasert anbefaling med begrunnelse. Kun kjente runder (der minst ett
 * lag har kamp) fra og med `fromGw` vurderes.
 */
export function buildChipPlan({ events, fixtures, teams, squad, chipsUsed = [], fromGw, bootstrapChips }) {
  const lastGw = Math.max(38, ...(events ?? []).map((e) => e.id).filter(Number.isInteger));
  const halves = chipHalves(bootstrapChips, lastGw);
  const grid = fixtureGrid(teams, fixtures, 1, lastGw);
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const counts = new Map();
  const outfield = new Map();
  for (const p of squad ?? []) {
    counts.set(p.team, (counts.get(p.team) ?? 0) + 1);
    if (p.element_type !== 1) outfield.set(p.team, (outfield.get(p.team) ?? 0) + 1);
  }
  const squadTeams = teams.filter((t) => counts.has(t.id));

  const known = new Set();
  for (const byGw of grid.values()) for (const gw of byGw.keys()) known.add(gw);
  const { dgw, bgw } = specialGws(grid, teams, fromGw, lastGw);

  const recommenders = {
    bboost: recommendBenchBoost,
    '3xc': recommendTripleCaptain,
    freehit: recommendFreeHit,
    wildcard: recommendWildcard,
  };

  const halvesOut = halves.map((h) => {
    const gws = [];
    for (let gw = Math.max(h.from, fromGw); gw <= h.to; gw++) if (known.has(gw)) gws.push(gw);
    const chips = {};
    for (const name of CHIPS) {
      const usedChip = chipsUsed.find((c) => c?.name === name && c.event >= h.from && c.event <= h.to);
      const used = usedChip ? { event: usedChip.event } : null;
      let rec = null;
      let reason = null;
      if (used) reason = `Brukt i runde ${used.event}`;
      else if (h.to < fromGw) reason = 'Halvdelen er over';
      else if (gws.length === 0) reason = 'Kampprogrammet for halvdelen er ikke kjent ennå';
      else if (squadTeams.length === 0) reason = 'Ingen tropp å regne på';
      else ({ rec, reason } = recommenders[name]({ gws, grid, teams, squadTeams, counts, outfield, bgw, teamsById }));
      chips[name] = { used, rec, reason };
    }
    return { half: h.half, from: h.from, to: h.to, chips };
  });

  return { fromGw, halves: halvesOut, dgw, bgw, noSpecial: dgw.length === 0 && bgw.length === 0 };
}
