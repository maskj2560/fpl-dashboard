// «Hva hvis»-planleggeren og scenariene på /overganger: datagrunnlaget
// klienten trenger for å planlegge et bytte (T6), regelvalidering (T7),
// FT-regnskap og persistens (T8) og evaluering (T9). Rene funksjoner der
// det er mulig; all henting skjer i rutene via fplClient.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../config.js';
import { sellingPrice } from './pricing.js';
import { byId, teamFdrMap } from './analysis.js';

const num = (v) => {
  if (v == null || v === '') return null; // Number(null) er 0 — aldri det vi vil
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Payloaden til GET /api/planlegger.json: min tropp med salgspriser og
 * bank, pluss alle spillere med tallene sammenligningen trenger. Bygges
 * utelukkende fra data som allerede er hentet — ingen egne kall. Alle
 * felter er tall/tekst eller null, aldri undefined (klienten stoler på det).
 */
export function buildPlannerData({ bootstrap, fixtures, picks, purchases, fromGw }) {
  const elementsById = byId(bootstrap.elements);
  const teamsById = byId(bootstrap.teams ?? []);
  const fdr = teamFdrMap(fixtures ?? [], fromGw, 3);

  const squad = (picks?.picks ?? [])
    .map((p) => p?.element)
    .filter((id) => Number.isInteger(id))
    .map((id) => {
      const e = elementsById.get(id);
      const t = e ? teamsById.get(e.team) : null;
      const purchase = purchases?.get(id);
      const known = e && purchase && !purchase.ukjent && Number.isInteger(e.now_cost);
      return {
        id,
        navn: e?.web_name ?? `Ukjent (${id})`,
        lag: t?.short_name ?? null,
        lagKode: t?.code ?? null,
        pos: e?.element_type ?? null,
        sellPrice: known ? sellingPrice(purchase.buyCost, e.now_cost) : null,
        buyCost: known ? purchase.buyCost : null,
      };
    });

  const players = (bootstrap.elements ?? []).map((e) => {
    const t = teamsById.get(e.team);
    return {
      id: e.id,
      navn: e.web_name ?? `Ukjent (${e.id})`,
      lag: t?.short_name ?? null,
      lagKode: t?.code ?? null,
      pos: e.element_type ?? null,
      pris: Number.isInteger(e.now_cost) ? e.now_cost : null,
      form: num(e.form),
      epNext: num(e.ep_next),
      eid: num(e.selected_by_percent),
      status: e.status ?? null,
      sjanse: e.chance_of_playing_next_round ?? null,
      fdr3: fdr.get(e.team) ?? null,
    };
  });

  return {
    event: fromGw,
    bank: Number.isInteger(picks?.entry_history?.bank) ? picks.entry_history.bank : null,
    maxPerClub: 3,
    squad,
    players,
  };
}

/**
 * Regelsjekken for et scenario — serveren er fasit, klientens sjekk er bare
 * UX. `planner` er payloaden fra buildPlannerData. Budsjettet bruker
 * salgspris + bank (aldri nåpris); mangler en salgspris, hoppes
 * budsjettsjekken over i stedet for å gjette. Returnerer alle brudd, ikke
 * bare det første.
 */
export function validateScenario(input, planner) {
  const errors = [];
  const push = (code, message) => errors.push({ code, message });

  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (name.length < 1 || name.length > 60) {
    push('navn', 'Scenarioet trenger et navn på 1–60 tegn.');
  }
  if (!Number.isInteger(input?.event) || input.event < 1 || input.event > 38) {
    push('runde', 'Runden må være et tall mellom 1 og 38.');
  }
  const moves = Array.isArray(input?.moves) ? input.moves : [];
  if (moves.length < 1) {
    push('bytter', 'Scenarioet må inneholde minst ett bytte.');
  }

  const squadById = new Map((planner?.squad ?? []).map((s) => [s.id, s]));
  const playersById = new Map((planner?.players ?? []).map((p) => [p.id, p]));
  const maxPerClub = planner?.maxPerClub ?? 3;

  // Klubbtelling: start med troppen, trekk ut-spillerne, legg til inn-spillerne.
  const clubCount = new Map();
  for (const s of squadById.values()) {
    if (s.lagKode != null) clubCount.set(s.lagKode, (clubCount.get(s.lagKode) ?? 0) + 1);
  }

  const outsSeen = new Set();
  const insSeen = new Set();
  let sellSum = 0;
  let buySum = 0;
  let priceUnknown = false;

  for (const m of moves) {
    const out = squadById.get(m?.out);
    const inn = playersById.get(m?.in);
    if (!out) {
      push('ikke-i-troppen', 'Spilleren du vil selge står ikke i troppen din.');
    }
    if (!inn) {
      push('ukjent-spiller', 'Spilleren du vil kjøpe finnes ikke.');
    }
    if (inn && squadById.has(m.in)) {
      push('alt-i-troppen', `${inn.navn} står allerede i troppen din.`);
    }
    if (out && inn && out.pos !== inn.pos && !squadById.has(m.in)) {
      push('posisjon', 'Inn- og ut-spilleren må spille samme posisjon.');
    }
    if (out) {
      if (outsSeen.has(out.id)) push('duplikat', `${out.navn} selges to ganger i samme scenario.`);
      outsSeen.add(out.id);
      if (out.sellPrice == null) priceUnknown = true;
      else sellSum += out.sellPrice;
      if (out.lagKode != null) clubCount.set(out.lagKode, (clubCount.get(out.lagKode) ?? 0) - 1);
    }
    if (inn && !squadById.has(m.in)) {
      if (insSeen.has(inn.id)) push('duplikat', `${inn.navn} kjøpes to ganger i samme scenario.`);
      insSeen.add(inn.id);
      if (inn.pris == null) priceUnknown = true;
      else buySum += inn.pris;
      if (inn.lagKode != null) clubCount.set(inn.lagKode, (clubCount.get(inn.lagKode) ?? 0) + 1);
    }
  }

  if (!priceUnknown && planner?.bank != null && moves.length > 0 && sellSum + planner.bank < buySum) {
    push('budsjett', 'Byttene koster mer enn salgsprisene og banken dekker.');
  }
  for (const [, count] of clubCount) {
    if (count > maxPerClub) {
      push('klubbtak', `Maks ${maxPerClub} spillere fra samme klubb.`);
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Rekonstruerer gratisbytte-beholdningen fra entry-history: 1 nytt FT per
 * runde, bank opptil 5, wildcard/free hit bruker ingen. Selvvalideres mot
 * event_transfers_cost for HVER runde — stemmer ikke modellen med hva FPL
 * faktisk trakk, settes valid false og kalleren faller tilbake på rå
 * poeng. `next` er beholdningen inn i første runde etter historikken.
 */
export function buildFtLedger({ history, chips }) {
  const rows = (history?.current ?? [])
    .filter((r) => Number.isInteger(r?.event))
    .sort((a, b) => a.event - b.event);
  const chipByEvent = new Map((chips ?? []).map((c) => [c.event, c.name]));
  const byGw = new Map();
  let valid = true;
  let ft = 1; // beholdningen inn i runden vi står ved (fra og med runde 2)

  for (const r of rows) {
    const gw = r.event;
    const chip = chipByEvent.get(gw);
    const isFree = chip === 'wildcard' || chip === 'freehit';
    const transfers = Number.isInteger(r.event_transfers) ? r.event_transfers : 0;
    const cost = Number.isInteger(r.event_transfers_cost) ? r.event_transfers_cost : 0;
    const ftBefore = gw === 1 ? null : ft;
    const paid = gw === 1 || isFree ? 0 : Math.max(0, transfers - ftBefore) * 4;
    if (paid !== cost) valid = false;
    byGw.set(gw, { ftBefore, used: transfers, paid: cost });
    if (gw === 1) ft = 1;
    else if (isFree) ft = Math.min(5, ftBefore + 1);
    else ft = Math.min(5, Math.max(ftBefore - transfers, 0) + 1);
  }
  return { byGw, valid, next: ft };
}

// --- Persistens: scenariene overlever redeploy i DATA_DIR/scenarios.json
// (samme volum og mønster som brief-markøren i notify.js). Mangler fila
// eller er den korrupt, starter vi med tom liste og overskriver først ved
// neste lagring. Uskrivbar disk gir 503 fra API-et — aldri krasj.

const MAX_SCENARIOS = 20;
const stateFile = () => path.join(config.dataDir, 'scenarios.json');

let scenarioList = null; // lastes lazy; null = ikke lest ennå
let hooks = { load: null, save: null };

/** Test-hook: bytt ut disk-lesing/-skriving. */
export function _setHooks(next) {
  hooks = { ...hooks, ...next };
  scenarioList = null;
}

/** Test-hook: tilbake til disk og tom minne-tilstand. */
export function _reset() {
  hooks = { load: null, save: null };
  scenarioList = null;
}

/** Ren parser for filinnholdet — ukjent versjon/korrupt JSON gir tom liste. */
export function parseScenarioFile(text) {
  try {
    const raw = JSON.parse(text);
    if (raw?.version !== 1 || !Array.isArray(raw.scenarios)) {
      console.warn('scenarios.json har ukjent format — starter med tom liste');
      return [];
    }
    return raw.scenarios;
  } catch {
    console.warn('scenarios.json kunne ikke tolkes — starter med tom liste');
    return [];
  }
}

function loadFromDisk() {
  try {
    return parseScenarioFile(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return []; // finnes ikke ennå — normalt før første lagring
  }
}

function saveToDisk(list) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify({ version: 1, scenarios: list }));
}

function ensureLoaded() {
  if (scenarioList === null) scenarioList = (hooks.load ?? loadFromDisk)();
  return scenarioList;
}

export function listScenarios() {
  return [...ensureLoaded()];
}

/**
 * Validerer mot planner-datagrunnlaget (serveren er fasit), fryser prisene
 * i et snapshot og lagrer. Returnerer {ok, status, scenario|errors}.
 */
export function addScenario(input, planner) {
  const list = ensureLoaded();
  const validation = validateScenario(input, planner);
  if (!validation.ok) return { ok: false, status: 400, errors: validation.errors };
  if (list.length >= MAX_SCENARIOS) {
    return {
      ok: false,
      status: 400,
      errors: [{ code: 'tak', message: `Maks ${MAX_SCENARIOS} scenarier — slett et først.` }],
    };
  }

  const playersById = new Map(planner.players.map((p) => [p.id, p]));
  const squadById = new Map(planner.squad.map((s) => [s.id, s]));
  const prices = {};
  for (const m of input.moves) {
    prices[m.out] = squadById.get(m.out)?.sellPrice ?? null;
    prices[m.in] = playersById.get(m.in)?.pris ?? null;
  }
  const scenario = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    event: input.event,
    createdAt: new Date().toISOString(),
    moves: input.moves.map((m) => ({ out: m.out, in: m.in })),
    snapshot: { bank: planner.bank, prices },
  };

  const next = [...list, scenario];
  try {
    (hooks.save ?? saveToDisk)(next);
  } catch (err) {
    console.error('Klarte ikke å lagre scenariene:', err.message);
    return {
      ok: false,
      status: 503,
      errors: [{ code: 'lagring', message: 'Kunne ikke lagre scenarioet — prøv igjen senere.' }],
    };
  }
  scenarioList = next;
  return { ok: true, status: 201, scenario };
}

export function removeScenario(id) {
  const list = ensureLoaded();
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return { ok: false, status: 404 };
  try {
    (hooks.save ?? saveToDisk)(next);
  } catch (err) {
    console.error('Klarte ikke å lagre scenariene:', err.message);
    return { ok: false, status: 503 };
  }
  scenarioList = next;
  return { ok: true, status: 204 };
}
