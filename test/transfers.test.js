import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTransferAnalysis,
  assembleTransferAnalysis,
  assembleTransfersPage,
  buildAlternatives,
  candidatePoints,
  parseAltQuery,
} from '../src/services/transfers.js';
import { clear } from '../src/services/cache.js';

// GW1–2 ferdige, GW3 pågår → maxGw 3.
const bootstrap = {
  events: [
    { id: 1, is_current: false, finished: true },
    { id: 2, is_current: false, finished: true },
    { id: 3, is_current: true, finished: false },
  ],
  teams: [
    { id: 1, short_name: 'MCI', name: 'Man City', code: 43 },
    { id: 2, short_name: 'AVL', name: 'Aston Villa', code: 7 },
    { id: 3, short_name: 'LIV', name: 'Liverpool', code: 14 },
  ],
  elements: [
    { id: 10, web_name: 'Haaland', team: 1, element_type: 4, now_cost: 145, cost_change_start: 4 },
    { id: 11, web_name: 'Watkins', team: 2, element_type: 4, now_cost: 88, cost_change_start: -2 },
    { id: 12, web_name: 'Salah', team: 3, element_type: 3, now_cost: 130, cost_change_start: 0 },
    { id: 13, web_name: 'Saka', team: 3, element_type: 3, now_cost: 60, cost_change_start: 5 },
    { id: 14, web_name: 'Isak', team: 3, element_type: 4, now_cost: 138, cost_change_start: -4 },
    { id: 15, web_name: 'Mateta', team: 2, element_type: 4, now_cost: 140, cost_change_start: 0 },
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
  [1, liveFor({ 10: 5, 11: 2, 12: 8, 13: 3, 14: 6, 15: 1 })],
  [2, liveFor({ 10: 9, 11: 1, 12: 4, 13: 7, 14: 2, 15: 7 })],
  [3, liveFor({ 10: 2, 11: 0, 12: 6, 13: 1, 14: 3, 15: 4 })],
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

test('buildTransferAnalysis legger teamShort og teamCode på inn og ut', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3)],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].inn.teamShort, 'MCI');
  assert.equal(a.rows[0].inn.teamCode, 43);
  assert.equal(typeof a.rows[0].ut.teamCode, 'number');
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

test('perGw dekker vinduet med løpende sum', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  assert.deepEqual(a.rows[0].perGw, [
    { gw: 2, inn: 9, ut: 1, diff: 8, cum: 8 },
    { gw: 3, inn: 2, ut: 0, diff: 2, cum: 10 },
  ]);
});

test('perGw er tom og after5 null for pending og angrede bytter', () => {
  const pendingA = buildTransferAnalysis({
    transfers: [t(11, 10, 4)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(pendingA.rows[0].perGw, []);
  assert.equal(pendingA.rows[0].after5, null);

  const angret = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 11, 2, '2026-02-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(angret.rows[0].perGw, []);
  assert.equal(angret.rows[0].after5, null);
});

test('after5: åpent vindu kortere enn 5 runder er ukomplett', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  assert.deepEqual(a.rows[0].after5, { diff: 10, gws: 2, complete: false });
});

test('after5: terminert vindu er komplett selv med færre enn 5 runder', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].after5, { diff: 8, gws: 1, complete: true });
});

test('after5 stopper ved 5 runder selv om vinduet er lengre', () => {
  // 6 runder: transfer i r1, vindu 1–6 → milepælen teller kun r1–r5.
  const seks = {
    ...bootstrap,
    events: [1, 2, 3, 4, 5].map((id) => ({ id, is_current: false, finished: true }))
      .concat([{ id: 6, is_current: true, finished: false }]),
  };
  const live6 = new Map(
    [1, 2, 3, 4, 5, 6].map((gw) => [gw, liveFor({ 10: 3, 11: 1 })]),
  );
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 1)],
    history: { current: [], chips: [] },
    bootstrap: seks,
    liveByGw: live6,
  });
  assert.deepEqual(a.rows[0].window, { from: 1, to: 6 });
  assert.deepEqual(a.rows[0].after5, { diff: 10, gws: 5, complete: true }); // 5 × (3−1)
  assert.equal(a.rows[0].perGw.length, 6);
});

test('season teller treffprosent kun over spilte rader', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 12, 2, '2026-02-01T01:00:00Z'), t(14, 13, 4)],
    history, bootstrap, liveByGw,
  });
  // r0 netto 8 (treff), r1 netto 0 (ikke treff), r2 pending (teller ikke).
  assert.deepEqual(a.season, { played: 2, wins: 1, hitRate: 0.5, hitsPaid: 1 });
});

test('season uten spilte rader har hitRate null, hitsPaid fra history', () => {
  const a = buildTransferAnalysis({ transfers: [], history, bootstrap, liveByGw: new Map() });
  assert.deepEqual(a.season, { played: 0, wins: 0, hitRate: null, hitsPaid: 1 });

  const b = buildTransferAnalysis({
    transfers: [],
    history: { current: [], chips: [] },
    bootstrap,
    liveByGw: new Map(),
  });
  assert.equal(b.season.hitsPaid, 0);
});

test('alternativer: samme posisjon og startpris innen toleransen, rangert på poeng', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  const alt = buildAlternatives({
    row: a.rows[0],
    buyCost: 140,
    elements: bootstrap.elements,
    teamsById: new Map(bootstrap.teams.map((team) => [team.id, team])),
    liveByGw,
  });
  // Kandidater (angripere, start 135–145): Mateta 140 (11 p), Isak 142 (5 p).
  assert.deepEqual(alt.map((c) => [c.id, c.points, c.delta]), [[15, 11, 0], [14, 5, -6]]);
  assert.equal(alt[0].name, 'Mateta');
  assert.equal(alt[0].startPrice, 140);
  assert.equal(alt[0].teamShort, 'AVL');
});

test('alternativer: byttets egne spillere er aldri kandidater, selv i prisklassen', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  const alt = buildAlternatives({
    row: a.rows[0],
    buyCost: 140,
    elements: bootstrap.elements,
    teamsById: new Map(bootstrap.teams.map((team) => [team.id, team])),
    liveByGw,
    tolerance: 100, // slipper inn Watkins (start 90) på pris — men aldri på id
  });
  assert.ok(!alt.some((c) => c.id === 10 || c.id === 11));
});

test('alternativer: ukjent kjøpspris eller pending bytte gir tom liste', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 12, 4)],
    history, bootstrap, liveByGw,
  });
  const felles = {
    elements: bootstrap.elements,
    teamsById: new Map(bootstrap.teams.map((team) => [team.id, team])),
    liveByGw,
  };
  assert.deepEqual(buildAlternatives({ row: a.rows[0], buyCost: null, ...felles }), []);
  assert.deepEqual(buildAlternatives({ row: a.rows[1], buyCost: 130, ...felles }), []); // pending
});

test('candidatePoints summerer vinduet og gir per-runde-liste', () => {
  const r = candidatePoints({ id: 15, from: 2, to: 3, liveByGw });
  assert.deepEqual(r, { points: 11, perGw: [{ gw: 2, p: 7 }, { gw: 3, p: 4 }] });
});

test('parseAltQuery: gyldige tall innenfor 1..maxGw, ellers ok false', () => {
  assert.deepEqual(parseAltQuery({ spiller: '15', fra: '2', til: '3' }, 3), {
    ok: true, spiller: 15, fra: 2, til: 3,
  });
  assert.equal(parseAltQuery({ spiller: '15', fra: '2', til: '4' }, 3).ok, false); // til > maxGw
  assert.equal(parseAltQuery({ spiller: 'x', fra: '2', til: '3' }, 3).ok, false); // ikke tall
  assert.equal(parseAltQuery({ spiller: '15', fra: '3', til: '2' }, 3).ok, false); // fra > til
  assert.equal(parseAltQuery({}, 3).ok, false);
});

// Assemble-testene mocker global fetch (mønster fra test/fplClient.test.js);
// hooks scopes til denne describe-blokken så de rene testene over er uberørt.
describe('assembleTransferAnalysis', () => {
  const originalFetch = globalThis.fetch;
  let calls;

  beforeEach(() => {
    clear();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('henter kun rundene fra tidligste transfer, aldri element-summary', async () => {
    const routes = [
      [/bootstrap-static\/$/, bootstrap],
      [/entry\/42\/transfers\/$/, [t(11, 10, 2)]],
      [/entry\/42\/history\/$/, history],
      [/event\/2\/live\/$/, liveFor({ 10: 9, 11: 1 })],
      [/event\/3\/live\/$/, liveFor({ 10: 2, 11: 0 })],
    ];
    globalThis.fetch = async (url) => {
      const hit = routes.find(([re]) => re.test(String(url)));
      assert.ok(hit, `uventet URL: ${url}`);
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => hit[1] };
    };

    const a = await assembleTransferAnalysis({ teamId: 42 });

    assert.equal(a.rows[0].diff, 10); // (9+2) − (1+0)
    assert.ok(!calls.some((u) => /event\/1\/live/.test(u)), 'runde 1 skal ikke hentes');
    assert.ok(!calls.some((u) => /element-summary/.test(u)), 'aldri element-summary');
  });

  test('assembleTransfersPage bygger prisrapport fra picks, aldri element-summary', async () => {
    const routes = [
      [/bootstrap-static\/$/, bootstrap],
      [/entry\/42\/transfers\/$/, [{ ...t(11, 10, 2), element_in_cost: 140, element_out_cost: 88 }]],
      [/entry\/42\/history\/$/, history],
      [/event\/2\/live\/$/, liveFor({ 10: 9, 11: 1 })],
      [/event\/3\/live\/$/, liveFor({ 10: 2, 11: 0 })],
      [/entry\/42\/event\/3\/picks\/$/, { picks: [{ element: 10 }], entry_history: { bank: 15, value: 1003 } }],
      [/entry\/42\/event\/1\/picks\/$/, { picks: [{ element: 11 }] }],
    ];
    globalThis.fetch = async (url) => {
      const hit = routes.find(([re]) => re.test(String(url)));
      assert.ok(hit, `uventet URL: ${url}`);
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => hit[1] };
    };

    const page = await assembleTransfersPage({ teamId: 42 });

    assert.equal(page.analysis.totals.count, 1);
    assert.equal(page.priceReport.holdings[0].sellPrice, 142); // 140 + floor(5/2)
    assert.equal(page.priceReport.bank, 15);
    assert.ok(!calls.some((u) => /element-summary/.test(u)), 'aldri element-summary');
  });

  test('assembleTransfersPage feiler mykt når picks mangler — analysen vises', async () => {
    const routes = [
      [/bootstrap-static\/$/, bootstrap],
      [/entry\/42\/transfers\/$/, [t(11, 10, 2)]],
      [/entry\/42\/history\/$/, history],
      [/event\/2\/live\/$/, liveFor({ 10: 9, 11: 1 })],
      [/event\/3\/live\/$/, liveFor({ 10: 2, 11: 0 })],
    ];
    globalThis.fetch = async (url) => {
      const hit = routes.find(([re]) => re.test(String(url)));
      if (!hit) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => hit[1] };
    };

    const page = await assembleTransfersPage({ teamId: 42 });

    assert.equal(page.analysis.rows[0].diff, 10);
    assert.equal(page.priceReport, null);
  });

  test('uten transfers hentes ingen live-runder', async () => {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      if (/transfers\/$/.test(String(url))) {
        return { ok: true, status: 200, json: async () => [] };
      }
      if (/history\/$/.test(String(url))) {
        return { ok: true, status: 200, json: async () => history };
      }
      return { ok: true, status: 200, json: async () => bootstrap };
    };

    const a = await assembleTransferAnalysis({ teamId: 42 });

    assert.equal(a.totals.count, 0);
    assert.ok(!calls.some((u) => /\/live\//.test(u)), 'ingen live-kall uten transfers');
  });
});
