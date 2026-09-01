// Prisvarsler (v1.10.0): timesnapshot av now_cost i DATA_DIR/price-state.json,
// diff mot forrige snapshot, Discord-melding maks én gang per natt (Oslo-dato)
// og «Prisendringer i natt»-kortet på /overganger. Alltid aktiv — uten webhook
// tas snapshot og kortet fylles, men ingenting postes. Samme mønster som
// refresh.js: ren beslutning + _tick + start + test-hooks. 0 AI-kall.

import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import { formatDay, formatSigned } from './format.js';
import { formatPrice } from './analysis.js';

export const TICK_MS = 60 * 60_000;
export const FILE_VERSION = 1;
const TOP = 5;

const osloDate = new Map();
function formatter(tz) {
  if (!osloDate.has(tz)) {
    osloDate.set(tz, new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }));
  }
  return osloDate.get(tz);
}

/** 'YYYY-MM-DD' i gitt tidssone (default Oslo) — «natten» tilhører dagen den ender på. */
export function dateKey(ms, tz = 'Europe/Oslo') {
  return formatter(tz).format(new Date(ms));
}

/** { [id]: now_cost } for alle spillere i bootstrap. */
export function snapshotOf(elements) {
  const out = {};
  for (const el of elements) out[el.id] = el.now_cost;
  return out;
}

/** Endringer siden forrige snapshot, sortert på id. Tom uten snapshot. */
export function diffPrices(prevPrices, elements) {
  if (!prevPrices) return [];
  const diffs = [];
  for (const el of elements) {
    const from = prevPrices[el.id];
    if (from == null || from === el.now_cost) continue;
    diffs.push({ id: el.id, from, to: el.now_cost });
  }
  return diffs.sort((a, b) => a.id - b.id);
}

/** Ren beslutning: nytt snapshot? Discord-melding? Maks én melding per dato. */
export function priceDecision({ hasSnapshot, changed, lastPostedDate, today, webhook }) {
  if (!hasSnapshot) return { snapshot: true, post: false };
  if (!changed) return { snapshot: false, post: false };
  return { snapshot: true, post: Boolean(webhook) && lastPostedDate !== today };
}

function lookup(map, id) {
  return map instanceof Map ? map.get(id) : map?.[id];
}

function toRow(diff, el, teamsById) {
  const team = lookup(teamsById, el.team);
  return {
    id: el.id,
    name: el.web_name,
    teamShort: team?.short_name ?? '?',
    teamCode: team?.code ?? null,
    from: diff.from,
    to: diff.to,
    delta: diff.to - diff.from,
  };
}

/**
 * Rapporten: troppen (stigere først) + topp 5 opp/ned globalt. Stigere
 * sorteres på delta, så mest kjøpt; fallere på delta, så mest solgt.
 * Spillere som er borte fra bootstrap hoppes over.
 */
export function buildPriceChanges({ diffs, elements, squadIds = [], teamsById, date }) {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const squad = new Set(squadIds);
  const rows = [];
  for (const diff of diffs) {
    const el = byId.get(diff.id);
    if (!el) continue;
    rows.push({ row: toRow(diff, el, teamsById), el });
  }
  const byName = (a, b) => a.row.name.localeCompare(b.row.name, 'nb');
  const up = rows
    .filter(({ row }) => row.delta > 0)
    .sort((a, b) => b.row.delta - a.row.delta || (b.el.transfers_in_event ?? 0) - (a.el.transfers_in_event ?? 0) || byName(a, b));
  const down = rows
    .filter(({ row }) => row.delta < 0)
    .sort((a, b) => a.row.delta - b.row.delta || (b.el.transfers_out_event ?? 0) - (a.el.transfers_out_event ?? 0) || byName(a, b));
  const mine = [...up, ...down].filter(({ row }) => squad.has(row.id)).map(({ row }) => row);
  return {
    date,
    mine,
    risers: up.slice(0, TOP).map(({ row }) => row),
    fallers: down.slice(0, TOP).map(({ row }) => row),
    countUp: up.length,
    countDown: down.length,
  };
}

const priceMove = (r) => `£${formatPrice(r.from)}m → £${formatPrice(r.to)}m (${formatSigned(r.delta / 10)})`;

/** Discord-teksten. Ren — samme innhold som kortet på /overganger. */
export function priceChangesText(changes) {
  const lines = [
    `**Prisendringer natt til ${formatDay(`${changes.date}T12:00:00`)}**`,
    'https://fpl.marsk.no/overganger',
    '',
  ];
  if (changes.mine.length) {
    lines.push('**Troppen din**', ...changes.mine.map((r) => `- ${r.name} (${r.teamShort}) ${priceMove(r)}`));
  } else {
    lines.push('Ingen endringer i troppen din.');
  }
  const list = (rows) => (rows.length ? rows.map((r) => `${r.name} ${priceMove(r)}`).join(' · ') : 'ingen');
  lines.push(
    '',
    `**Opp (${changes.risers.length} av ${changes.countUp}):** ${list(changes.risers)}`,
    `**Ned (${changes.fallers.length} av ${changes.countDown}):** ${list(changes.fallers)}`,
  );
  return lines.join('\n');
}

/** Leser price-state.json. null ved ukjent versjon, manglende priser eller ugyldig JSON. */
export function parsePriceFile(text) {
  try {
    const raw = JSON.parse(text);
    if (raw?.version !== FILE_VERSION || !raw.prices || typeof raw.prices !== 'object') return null;
    return {
      version: FILE_VERSION,
      date: raw.date ?? null,
      prices: raw.prices,
      lastDiff: raw.lastDiff ?? null,
      lastPostedDate: raw.lastPostedDate ?? null,
    };
  } catch {
    return null;
  }
}

export const priceFile = () => path.join(config.dataDir, 'price-state.json');

export function readPriceState() {
  try {
    return parsePriceFile(fs.readFileSync(priceFile(), 'utf8'));
  } catch {
    return null;
  }
}
