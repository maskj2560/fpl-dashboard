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
