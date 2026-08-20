import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTransferAnalysis } from '../src/services/transfers.js';

// GW1–2 ferdige, GW3 pågår → maxGw 3.
const bootstrap = {
  events: [
    { id: 1, is_current: false, finished: true },
    { id: 2, is_current: false, finished: true },
    { id: 3, is_current: true, finished: false },
  ],
  elements: [
    { id: 10, web_name: 'Haaland' },
    { id: 11, web_name: 'Watkins' },
    { id: 12, web_name: 'Salah' },
    { id: 13, web_name: 'Saka' },
    { id: 14, web_name: 'Isak' },
  ],
};

// Poeng per spiller per runde:        gw1  gw2  gw3
// 10 Haaland                            5    9    2
// 11 Watkins                            2    1    0
// 12 Salah                              8    4    6
// 13 Saka                               3    7    1
// 14 Isak                               6    2    3
function liveFor(points) {
  return {
    elements: Object.entries(points).map(([id, p]) => ({
      id: Number(id),
      stats: { total_points: p },
    })),
  };
}
const liveByGw = new Map([
  [1, liveFor({ 10: 5, 11: 2, 12: 8, 13: 3, 14: 6 })],
  [2, liveFor({ 10: 9, 11: 1, 12: 4, 13: 7, 14: 2 })],
  [3, liveFor({ 10: 2, 11: 0, 12: 6, 13: 1, 14: 3 })],
]);
const history = {
  current: [
    { event: 1, event_transfers_cost: 0 },
    { event: 2, event_transfers_cost: 4 },
    { event: 3, event_transfers_cost: 0 },
  ],
  chips: [],
};
const t = (element_out, element_in, event, time = `2026-0${event}-01T00:00:00Z`) =>
  ({ element_in, element_out, event, time });

test('tom transferliste gir tom analyse (cost telles fra history uansett)', () => {
  const a = buildTransferAnalysis({ transfers: [], history, bootstrap, liveByGw: new Map() });
  assert.equal(a.rows.length, 0);
  assert.deepEqual(a.totals, { diff: 0, cost: 4, netto: -4, count: 0, skipped: 0 });

  const b = buildTransferAnalysis({
    transfers: [],
    history: { current: [], chips: [] },
    bootstrap,
    liveByGw: new Map(),
  });
  assert.deepEqual(b.totals, { diff: 0, cost: 0, netto: 0, count: 0, skipped: 0 });
});

test('én transfer uten senere salg måles til og med pågående runde', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  const r = a.rows[0];
  assert.deepEqual(r.window, { from: 2, to: 3 });
  assert.equal(r.inn.points, 11); // 9 + 2
  assert.equal(r.ut.points, 1); // 1 + 0
  assert.equal(r.diff, 10);
  assert.equal(r.penaltyShare, 4);
  assert.equal(r.netto, 6);
});

test('senere salg av inn-spilleren terminerer vinduet runden før', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 }); // Haaland kun gw2
  assert.equal(a.rows[0].diff, 9 - 1);
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // Salah fra gw3
  assert.equal(a.rows[1].diff, 6 - 2);
});

test('gjenkjøp av ut-spilleren terminerer også vinduet', () => {
  // Watkins ut i r2, kjøpt tilbake i r3 → Haaland-byttet måles kun i r2.
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 11, 3)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 });
  assert.equal(a.rows[0].diff, 9 - 1);
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // Watkins 0 − Saka 1
  assert.equal(a.rows[1].diff, -1);
});

test('kjøpt, solgt og kjøpt igjen gir uavhengige vinduer', () => {
  // r2: Watkins→Haaland. r3: Haaland→Salah, så Salah→Haaland (angret).
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3), t(12, 10, 3, '2026-03-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 });
  assert.equal(a.rows[1].played, false); // Salah inn og ut i samme runde
  assert.equal(a.rows[1].window, null);
  assert.deepEqual(a.rows[2].window, { from: 3, to: 3 }); // Haaland igjen fra r3
});

test('samme spiller inn og ut i samme runde er angret — tomt vindu, straffen består', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 11, 2, '2026-02-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].played, false);
  assert.equal(a.rows[0].window, null);
  assert.equal(a.rows[0].diff, 0);
  assert.equal(a.rows[0].penaltyShare, 2); // 4 delt på 2 transfers
});

test('usortert input (API leverer nyeste først) sorteres på event og time', () => {
  const a = buildTransferAnalysis({
    transfers: [t(10, 12, 3), t(11, 10, 2)],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].event, 2);
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 }); // termineres av r3-salget
});

test('rundens straff deles likt på gyldige records, totalen bruker rundekosten eksakt', () => {
  const a = buildTransferAnalysis({
    transfers: [
      t(11, 10, 2),
      t(13, 12, 2, '2026-02-01T01:00:00Z'),
      t(14, 13, 2, '2026-02-01T02:00:00Z'),
    ],
    history, bootstrap, liveByGw,
  });
  for (const r of a.rows) assert.ok(Math.abs(r.penaltyShare - 4 / 3) < 1e-9);
  assert.equal(a.totals.cost, 4); // ikke 3 × 1,33 avrundet
  assert.equal(a.totals.netto, a.totals.diff - 4);
});

test('wildcard-runde merkes og måles normalt', () => {
  const wcHistory = { ...history, chips: [{ name: 'wildcard', event: 2 }] };
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2)],
    history: wcHistory, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].chip, 'wildcard');
  assert.deepEqual(a.rows[0].window, { from: 2, to: 3 });
});

test('free hit begrenser eget vindu til én runde og terminerer aldri andre', () => {
  const fhHistory = { ...history, chips: [{ name: 'freehit', event: 3 }] };
  const a = buildTransferAnalysis({
    transfers: [t(13, 14, 2), t(14, 12, 3)], // FH «selger» Isak i r3 — midlertidig
    history: fhHistory, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 3 }); // Isak-vinduet lever videre
  assert.equal(a.rows[0].diff, (2 + 3) - (7 + 1)); // Isak 5 − Saka 8 = −3
  assert.equal(a.rows[1].chip, 'freehit');
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // kun FH-runden
  assert.equal(a.rows[1].diff, 6 - 3); // Salah 6 − Isak 3
});

test('beste og verste bytte pekes ut blant spilte rader', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 12, 2, '2026-02-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  // rad 0: Haaland 11 − Watkins 1 − 2 = 8; rad 1: Salah 10 − Saka 8 − 2 = 0
  assert.equal(a.bestIndex, 0);
  assert.equal(a.worstIndex, 1);
});

test('én spilt rad gir hverken beste eller verste', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  assert.equal(a.bestIndex, null);
  assert.equal(a.worstIndex, null);
});

test('navn slås opp i bootstrap, ukjent id får plassholder og 0 poeng', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 99, 2)], history, bootstrap, liveByGw });
  assert.equal(a.rows[0].inn.name, 'Ukjent (99)');
  assert.equal(a.rows[0].inn.points, 0);
  assert.equal(a.rows[0].ut.name, 'Watkins');
});

test('records med manglende felt hoppes over, telles, og teller ikke i straffnevneren', () => {
  const a = buildTransferAnalysis({
    transfers: [{ element_in: 10, event: 2 }, { element_out: 11 }, t(11, 10, 2)],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows.length, 1);
  assert.equal(a.totals.skipped, 2);
  assert.equal(a.rows[0].penaltyShare, 4); // nevner 1, ikke 3
});

test('transfer for framtidig runde er pending og teller ikke i diff', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 4)], history, bootstrap, liveByGw });
  assert.equal(a.rows[0].pending, true);
  assert.equal(a.rows[0].played, false);
  assert.equal(a.totals.diff, 0);
});

test('før sesongstart (maxGw 0) er alt pending', () => {
  const preseason = { ...bootstrap, events: [{ id: 1, is_next: true, finished: false }] };
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2)],
    history: { current: [], chips: [] },
    bootstrap: preseason,
    liveByGw: new Map(),
  });
  assert.equal(a.maxGw, 0);
  assert.equal(a.rows[0].pending, true);
});
