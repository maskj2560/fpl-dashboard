// Prislogikk for «Overganger»: FPLs salgsprisregel, kjøpshistorikk per
// spiller og prisrapporten for troppen. Rene funksjoner — ingen henting.
// Alle priser er i tideler (55 = £5.5m), som i FPL-API-et.
// Feltene element_in_cost/element_out_cost er uverifiserte før P3 — mangler
// de, merkes spilleren `ukjent` og holdes utenfor summene. Aldri NaN.

/** FPLs salgsregel: halve gevinsten (rundet ned) til deg, tap tas fullt. */
export function sellingPrice(buyCost, nowCost) {
  const profit = nowCost - buyCost;
  return profit > 0 ? buyCost + Math.floor(profit / 2) : nowCost;
}

const isInt = (v) => Number.isInteger(v);
const validEvent = (e) => isInt(e) && e >= 1 && e <= 38;

const fhEvents = (chips) =>
  new Set((chips ?? []).filter((c) => c?.name === 'freehit').map((c) => c.event));

function sortedTransfers(transfers) {
  return (Array.isArray(transfers) ? transfers : [])
    .filter((t) => validEvent(t?.event))
    .sort((a, b) => a.event - b.event || String(a.time).localeCompare(String(b.time)));
}

/**
 * Gjeldende kjøpspris per spiller: GW1-troppen «kjøpes» til startpris
 * (now_cost − cost_change_start), transfer-kjøp overskriver i kronologisk
 * rekkefølge (siste kjøp gjelder). Free hit-kjøp reverseres av FPL og
 * teller aldri.
 */
export function buildPurchases({ transfers, chips, gw1Picks, elements }) {
  const purchases = new Map();
  const elementsById = new Map((elements ?? []).map((e) => [e.id, e]));

  for (const p of gw1Picks?.picks ?? []) {
    const e = elementsById.get(p?.element);
    if (!e || !isInt(e.now_cost) || !isInt(e.cost_change_start)) continue;
    purchases.set(p.element, {
      buyCost: e.now_cost - e.cost_change_start,
      event: 1,
      source: 'gw1',
    });
  }

  const fh = fhEvents(chips);
  for (const t of sortedTransfers(transfers)) {
    if (!isInt(t.element_in) || t.element_in <= 0 || fh.has(t.event)) continue;
    purchases.set(
      t.element_in,
      isInt(t.element_in_cost)
        ? { buyCost: t.element_in_cost, event: t.event, source: 'transfer' }
        : { buyCost: null, event: t.event, source: 'transfer', ukjent: true },
    );
  }
  return purchases;
}

/**
 * Prisrapporten for troppen: kjøpspris, nåpris, salgspris og gevinst per
 * eid spiller (med totalsum over de kjente), pluss `missed` — siste salg
 * der prisen siden har steget, sortert på tapt gevinst. Gjenkjøpte spillere
 * (står i troppen nå) telles aldri som tapt salg.
 */
export function buildPriceReport({ picks, purchases, elements, teamsById, transfers, chips }) {
  const elementsById = new Map((elements ?? []).map((e) => [e.id, e]));
  const ref = (id) => {
    const e = elementsById.get(id);
    const t = e ? teamsById?.get(e.team) : null;
    return {
      id,
      name: e?.web_name ?? `Ukjent (${id})`,
      teamShort: t?.short_name ?? null,
      teamCode: t?.code ?? null,
    };
  };

  const squad = (picks?.picks ?? []).map((p) => p?.element).filter((id) => isInt(id));
  const holdings = [];
  const totals = { buyCost: 0, nowCost: 0, sellPrice: 0, gain: 0 };
  for (const id of squad) {
    const e = elementsById.get(id);
    const purchase = purchases?.get(id);
    if (!e || !isInt(e.now_cost) || !purchase || purchase.ukjent) {
      holdings.push({
        ...ref(id),
        buyCost: null,
        nowCost: isInt(e?.now_cost) ? e.now_cost : null,
        sellPrice: null,
        gain: null,
        ukjent: true,
      });
      continue;
    }
    const sell = sellingPrice(purchase.buyCost, e.now_cost);
    const holding = {
      ...ref(id),
      buyCost: purchase.buyCost,
      nowCost: e.now_cost,
      sellPrice: sell,
      gain: sell - purchase.buyCost,
      ukjent: false,
    };
    holdings.push(holding);
    totals.buyCost += holding.buyCost;
    totals.nowCost += holding.nowCost;
    totals.sellPrice += holding.sellPrice;
    totals.gain += holding.gain;
  }

  const inSquad = new Set(squad);
  const fh = fhEvents(chips);
  const lastSale = new Map();
  for (const t of sortedTransfers(transfers)) {
    if (!isInt(t.element_out) || t.element_out <= 0 || fh.has(t.event)) continue;
    lastSale.set(t.element_out, isInt(t.element_out_cost) ? t.element_out_cost : null);
  }
  const missed = [];
  for (const [id, soldFor] of lastSale) {
    if (soldFor == null || inSquad.has(id)) continue;
    const e = elementsById.get(id);
    if (!e || !isInt(e.now_cost) || e.now_cost <= soldFor) continue;
    missed.push({ ...ref(id), soldFor, nowCost: e.now_cost, missed: e.now_cost - soldFor });
  }
  missed.sort((a, b) => b.missed - a.missed);

  return {
    holdings,
    totals,
    missed,
    bank: isInt(picks?.entry_history?.bank) ? picks.entry_history.bank : null,
    value: isInt(picks?.entry_history?.value) ? picks.entry_history.value : null,
  };
}
