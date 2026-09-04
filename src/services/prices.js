// Prisvarsler (v1.10.0): timesnapshot av now_cost i DATA_DIR/price-state.json,
// diff mot forrige snapshot, Discord-melding maks én gang per natt (Oslo-dato)
// og «Prisendringer i natt»-kortet på /overganger. Alltid aktiv — uten webhook
// tas snapshot og kortet fylles, men ingenting postes. Samme mønster som
// refresh.js: ren beslutning + _tick + start + test-hooks. 0 AI-kall.

import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import { formatDay, formatSigned } from './format.js';
import { formatPrice, byId, currentEvent } from './analysis.js';
import { getBootstrap, getPicks, FplError } from './fplClient.js';
import { postToDiscord } from './notify.js';

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

/**
 * FPLs egne prognosefelt (udokumenterte, v1.14.0): `price_change_percent` er
 * progresjonen mot terskelen for en endring — ±100 er nær, men ikke en garanti
 * (fire spillere lå under −100 uten å falle 4. sep 2026). Terskler:
 * troppen vises fra 20 %, markedslistene fra 50 %.
 */
export const FORECAST_MIN_PCT = 20;
export const FORECAST_MARKET_PCT = 50;

function forecastRow(el, teamsById) {
  const team = lookup(teamsById, el.team);
  return {
    id: el.id,
    name: el.web_name,
    teamShort: team?.short_name ?? '?',
    teamCode: team?.code ?? null,
    cost: el.now_cost,
    pct: Number.parseFloat(el.price_change_percent) || 0,
    likelihood: el.price_change_projections[0]?.likelihood ?? 0,
    rate: el.price_change_hourly_rate ?? 0,
    lockedUntil: el.price_change_locked_until ?? null,
    changed: el.cost_change_event ?? 0,
  };
}

/**
 * Prognosen på /overganger: troppen din først, så markedets største
 * bevegelser hver vei. Låste spillere (`price_change_locked_until`) har alltid
 * pct 0 — de vises i troppen med tidspunktet, men aldri i topplistene.
 * Spillere uten `price_change_projections` (test-verdenen, eldre svar) hoppes
 * over — funksjonen kaster aldri.
 */
export function buildPriceForecast({ elements = [], squadIds = [], teamsById }) {
  const squad = new Set(squadIds);
  const rows = [];
  let lockedCount = 0;
  for (const el of elements) {
    if (!Array.isArray(el?.price_change_projections)) continue;
    const row = forecastRow(el, teamsById);
    if (row.lockedUntil) lockedCount += 1;
    rows.push(row);
  }
  const byName = (a, b) => a.name.localeCompare(b.name, 'nb');
  const open = rows.filter((r) => !r.lockedUntil);
  const up = open
    .filter((r) => r.pct >= FORECAST_MARKET_PCT)
    .sort((a, b) => b.pct - a.pct || b.rate - a.rate || byName(a, b));
  const down = open
    .filter((r) => r.pct <= -FORECAST_MARKET_PCT)
    .sort((a, b) => a.pct - b.pct || a.rate - b.rate || byName(a, b));

  const inSquad = rows.filter((r) => squad.has(r.id) && (r.lockedUntil || Math.abs(r.pct) >= FORECAST_MIN_PCT));
  const mineUp = inSquad.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct || b.rate - a.rate || byName(a, b));
  const mineDown = inSquad.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct || a.rate - b.rate || byName(a, b));
  const mineFlat = inSquad.filter((r) => r.pct === 0).sort(byName);

  return {
    mine: [...mineUp, ...mineDown, ...mineFlat],
    risers: up.slice(0, TOP),
    fallers: down.slice(0, TOP),
    countRising: up.length,
    countFalling: down.length,
    lockedCount,
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
      dayDiffs: Array.isArray(raw.dayDiffs) ? raw.dayDiffs : [],
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

function writePriceState(next) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(priceFile(), JSON.stringify(next));
}

/** Slår sammen dagens diff med nye: første `from`, siste `to`; netto null faller bort. */
export function mergeDiffs(prev, fresh) {
  const map = new Map(prev.map((d) => [d.id, { ...d }]));
  for (const d of fresh) {
    const old = map.get(d.id);
    if (old) old.to = d.to;
    else map.set(d.id, { ...d });
  }
  return [...map.values()].filter((d) => d.from !== d.to).sort((a, b) => a.id - b.id);
}

// ---- Timeren ----------------------------------------------------------------

const hooks = { now: null, load: null, save: null, post: null, webhook: null, squad: null };
let state = null;
let loaded = false;
let timer = null;
let ticking = false;

function ensureLoaded() {
  if (loaded) return;
  state = (hooks.load ?? readPriceState)();
  loaded = true;
}

function persist(next) {
  state = next;
  try {
    (hooks.save ?? writePriceState)(next);
  } catch (err) {
    console.error('Prisovervåking: klarte ikke å lagre snapshotet:', err.message);
  }
}

/** Troppens spiller-id-er (inneværende runde). Tom uten team-id/picks — troppen er et tillegg. */
async function loadSquadIds(bootstrap) {
  if (!config.fplTeamId) return [];
  const current = currentEvent(bootstrap.events);
  if (!current) return [];
  try {
    const picks = await getPicks(config.fplTeamId, current.id);
    return picks.picks.map((p) => p.element);
  } catch (err) {
    if (!(err instanceof FplError && err.status === 404)) {
      console.error('Prisovervåking: fikk ikke troppen:', err.message);
    }
    return [];
  }
}

/** Siste rapport til kortet på /overganger — lazy fra disk, null før første endring. */
export function getLastPriceChanges() {
  ensureLoaded();
  return state?.lastDiff ?? null;
}

/** Én runde. Kaster aldri — en feil skal ikke velte timeren. */
export async function _tick() {
  if (ticking) return;
  ticking = true;
  try {
    ensureLoaded();
    const bootstrap = await getBootstrap();
    const { elements, teams } = bootstrap;
    const today = dateKey((hooks.now ?? Date.now)());
    const diffs = diffPrices(state?.prices ?? null, elements);
    const webhook = hooks.webhook ?? Boolean(config.discordWebhookUrl);
    const decision = priceDecision({
      hasSnapshot: Boolean(state),
      changed: diffs.length > 0,
      lastPostedDate: state?.lastPostedDate ?? null,
      today,
      webhook,
    });
    if (!decision.snapshot) return;

    let dayDiffs = state?.dayDiffs ?? [];
    let lastDiff = state?.lastDiff ?? null;
    if (diffs.length) {
      const squadIds = await (hooks.squad ?? loadSquadIds)(bootstrap);
      dayDiffs = state?.date === today ? mergeDiffs(dayDiffs, diffs) : diffs;
      lastDiff = buildPriceChanges({ diffs: dayDiffs, elements, squadIds, teamsById: byId(teams), date: today });
    }
    // Snapshotet lagres FØR posten: feiler Discord, dukker ikke samme endring
    // opp som «ny» neste time — og en redeploy dobbel-poster aldri.
    persist({
      version: FILE_VERSION,
      date: today,
      prices: snapshotOf(elements),
      dayDiffs,
      lastDiff,
      lastPostedDate: state?.lastPostedDate ?? null,
    });
    console.log(
      diffs.length
        ? `Prisovervåking: ${diffs.length} prisendringer (${today})`
        : 'Prisovervåking: første snapshot lagret',
    );
    if (decision.post) {
      await (hooks.post ?? postToDiscord)(priceChangesText(lastDiff));
      persist({ ...state, lastPostedDate: today });
      console.log('Prisovervåking: Discord-melding sendt');
    }
  } catch (err) {
    console.error('Prisovervåking feilet:', err.message);
  } finally {
    ticking = false;
  }
}

/** Alltid aktiv: uten webhook tas snapshot og kortet fylles, ingenting postes. */
export function startPriceWatcher() {
  _tick();
  timer = setInterval(_tick, TICK_MS);
  timer.unref?.();
  console.log(
    `Prisovervåking aktiv: sjekker hver time${config.discordWebhookUrl ? ', Discord maks én melding per natt' : ' (ingen webhook — kun kortet på /overganger)'}`,
  );
}

// Test-hooks (samme mønster som notify.js). Aldri satt i produksjon.

export function _setHooks(overrides) {
  Object.assign(hooks, overrides);
}

export function _reset() {
  clearInterval(timer);
  timer = null;
  state = null;
  loaded = false;
  ticking = false;
  for (const key of Object.keys(hooks)) hooks[key] = null;
}
