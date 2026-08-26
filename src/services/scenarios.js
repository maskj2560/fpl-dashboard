// «Hva hvis»-planleggeren og scenariene på /overganger: datagrunnlaget
// klienten trenger for å planlegge et bytte (T6), regelvalidering (T7),
// FT-regnskap og persistens (T8) og evaluering (T9). Rene funksjoner der
// det er mulig; all henting skjer i rutene via fplClient.
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
