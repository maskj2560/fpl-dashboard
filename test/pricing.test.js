import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellingPrice, buildPurchases, buildPriceReport } from '../src/services/pricing.js';

// Alle priser i tideler (55 = £5.5m), som i FPL-API-et.

const elements = [
  { id: 10, web_name: 'Haaland', team: 1, now_cost: 145, cost_change_start: 4 },
  { id: 11, web_name: 'Watkins', team: 2, now_cost: 88, cost_change_start: -2 },
  { id: 12, web_name: 'Salah', team: 3, now_cost: 130, cost_change_start: 0 },
  { id: 20, web_name: 'Saka', team: 3, now_cost: 60, cost_change_start: 5 },
];
const teamsById = new Map([
  [1, { short_name: 'MCI', code: 43 }],
  [2, { short_name: 'AVL', code: 7 }],
  [3, { short_name: 'LIV', code: 14 }],
]);
const tr = (element_out, element_in, event, element_in_cost, element_out_cost = 50, time = `2026-0${event}-01T00:00:00Z`) =>
  ({ element_in, element_out, event, time, element_in_cost, element_out_cost });

test('salgspris: gevinst halveres og rundes ned, tap selges til nåpris', () => {
  assert.equal(sellingPrice(55, 58), 56); // +3 → halv gevinst rundet ned
  assert.equal(sellingPrice(55, 59), 57); // +4 → +2
  assert.equal(sellingPrice(55, 55), 55);
  assert.equal(sellingPrice(55, 52), 52); // prisfall → nåpris
});

test('kjøpt to ganger — siste kjøp gjelder', () => {
  const purchases = buildPurchases({
    transfers: [tr(11, 10, 2, 140), tr(12, 10, 5, 143)],
    chips: [],
    gw1Picks: null,
    elements,
  });
  assert.deepEqual(purchases.get(10), { buyCost: 143, event: 5, source: 'transfer' });
});

test('free hit-kjøp ignoreres i kjøpsprisen, wildcard teller normalt', () => {
  const purchases = buildPurchases({
    transfers: [tr(11, 10, 2, 140), tr(10, 12, 3, 128)],
    chips: [{ name: 'freehit', event: 3 }, { name: 'wildcard', event: 2 }],
    gw1Picks: null,
    elements,
  });
  assert.equal(purchases.has(12), false); // FH-kjøpet reverseres av FPL
  assert.deepEqual(purchases.get(10), { buyCost: 140, event: 2, source: 'transfer' });
});

test('GW1-spiller får startpris fra cost_change_start, transfer-gjenkjøp vinner', () => {
  const gw1Picks = { picks: [{ element: 20 }, { element: 10 }] };
  const purchases = buildPurchases({
    transfers: [tr(11, 10, 4, 142)],
    chips: [],
    gw1Picks,
    elements,
  });
  assert.deepEqual(purchases.get(20), { buyCost: 55, event: 1, source: 'gw1' }); // 60 − 5
  assert.deepEqual(purchases.get(10), { buyCost: 142, event: 4, source: 'transfer' });
});

test('manglende element_in_cost gir ukjent-markering, aldri NaN', () => {
  const purchases = buildPurchases({
    transfers: [{ element_in: 10, element_out: 11, event: 2, time: '2026-02-01T00:00:00Z' }],
    chips: [],
    gw1Picks: null,
    elements,
  });
  assert.deepEqual(purchases.get(10), { buyCost: null, event: 2, source: 'transfer', ukjent: true });
});

test('prisrapporten regner salgspris og gevinst per eid spiller, med totalsum', () => {
  const purchases = buildPurchases({
    transfers: [tr(12, 10, 2, 140)],
    chips: [],
    gw1Picks: { picks: [{ element: 20 }] },
    elements,
  });
  const report = buildPriceReport({
    picks: { picks: [{ element: 10 }, { element: 20 }], entry_history: { bank: 15, value: 1003 } },
    purchases,
    elements,
    teamsById,
    transfers: [tr(12, 10, 2, 140)],
    chips: [],
  });
  const haaland = report.holdings.find((h) => h.id === 10);
  assert.deepEqual(haaland, {
    id: 10, name: 'Haaland', teamShort: 'MCI', teamCode: 43,
    buyCost: 140, nowCost: 145, sellPrice: 142, gain: 2, ukjent: false,
  });
  const saka = report.holdings.find((h) => h.id === 20);
  assert.equal(saka.buyCost, 55);
  assert.equal(saka.sellPrice, 57); // 55 + floor(5/2)
  assert.deepEqual(report.totals, { buyCost: 195, nowCost: 205, sellPrice: 199, gain: 4 });
  assert.equal(report.bank, 15);
  assert.equal(report.value, 1003);
});

test('spiller med ukjent kjøpspris står i rapporten men teller ikke i totalsummen', () => {
  const purchases = new Map([[10, { buyCost: null, event: 2, source: 'transfer', ukjent: true }]]);
  const report = buildPriceReport({
    picks: { picks: [{ element: 10 }], entry_history: null },
    purchases, elements, teamsById, transfers: [], chips: [],
  });
  assert.equal(report.holdings[0].ukjent, true);
  assert.equal(report.holdings[0].gain, null);
  assert.deepEqual(report.totals, { buyCost: 0, nowCost: 0, sellPrice: 0, gain: 0 });
  assert.equal(report.bank, null);
});

test('missed viser kun salg der prisen har steget, sortert på tapt gevinst', () => {
  // Solgte Salah for 128 (nå 130, +2) og Watkins for 90 (nå 88, fall — utelates).
  const transfers = [tr(12, 10, 3, 140, 128), tr(11, 20, 4, 55, 90)];
  const report = buildPriceReport({
    picks: { picks: [{ element: 10 }, { element: 20 }], entry_history: null },
    purchases: buildPurchases({ transfers, chips: [], gw1Picks: null, elements }),
    elements, teamsById, transfers, chips: [],
  });
  assert.equal(report.missed.length, 1);
  assert.deepEqual(report.missed[0], {
    id: 12, name: 'Salah', teamShort: 'LIV', teamCode: 14, soldFor: 128, nowCost: 130, missed: 2,
  });
});

test('gjenkjøpt spiller står ikke i missed, og free hit-salg teller ikke', () => {
  // Salah solgt i r3, kjøpt tilbake i r5 (i troppen nå); Saka «solgt» i
  // FH-runde; Haaland solgt til dagens pris (ingen tapt gevinst).
  const transfers = [tr(12, 10, 3, 140, 125), tr(10, 12, 5, 129, 145), tr(20, 11, 4, 88, 55)];
  const report = buildPriceReport({
    picks: { picks: [{ element: 12 }, { element: 11 }], entry_history: null },
    purchases: buildPurchases({ transfers, chips: [{ name: 'freehit', event: 4 }], gw1Picks: null, elements }),
    elements, teamsById, transfers,
    chips: [{ name: 'freehit', event: 4 }],
  });
  assert.deepEqual(report.missed, []);
});
