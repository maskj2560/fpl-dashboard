import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clear } from '../src/services/cache.js';
import {
  buildPlayerCard,
  buildDifferentials,
  buildSetPieceTable,
  assemblePlayerCard,
} from '../src/services/players.js';

// Fixturene bruker de MÅLTE feltnavnene fra ekte FPL-API (2026-09-01):
// tallfelter som strenger, now_cost i tideler, *_order for dødballroller.

const teams = [
  { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 },
  { id: 12, name: 'Liverpool', short_name: 'LIV', code: 14 },
  { id: 13, name: 'Man City', short_name: 'MCI', code: 43 },
  { id: 20, name: 'Wolves', short_name: 'WOL', code: 39 },
];
const teamsById = new Map(teams.map((t) => [t.id, t]));

function el(over = {}) {
  return {
    id: 411,
    code: 223094,
    web_name: 'Haaland',
    first_name: 'Erling',
    second_name: 'Haaland',
    team: 13,
    team_code: 43,
    element_type: 4,
    now_cost: 141,
    selected_by_percent: '69.8',
    form: '6.0',
    total_points: 32,
    points_per_game: '6.0',
    expected_goals: '2.40',
    expected_assists: '0.60',
    minutes: 180,
    bonus: 5,
    status: 'a',
    news: '',
    chance_of_playing_next_round: null,
    penalties_order: 1,
    corners_and_indirect_freekicks_order: null,
    direct_freekicks_order: null,
    ...over,
  };
}

function hist(round, over = {}) {
  return {
    round,
    opponent_team: 20,
    was_home: true,
    total_points: 5,
    minutes: 90,
    goals_scored: 1,
    assists: 0,
    bonus: 1,
    bps: 30,
    expected_goals: '0.93',
    expected_assists: '0.40',
    value: 140,
    selected: 1000,
    ...over,
  };
}

function fix(event, over = {}) {
  return {
    event,
    is_home: false,
    team_h: 12,
    team_a: 13,
    difficulty: 4,
    finished: false,
    kickoff_time: '2026-09-13T14:00:00Z',
    ...over,
  };
}

// ---- buildPlayerCard -----------------------------------------------------

test('buildPlayerCard mapper hele payloaden til norske feltnavn', () => {
  const kort = buildPlayerCard({
    element: el(),
    teamsById,
    summary: { fixtures: [fix(3)], history: [hist(2)] },
  });

  assert.deepEqual(kort, {
    id: 411,
    navn: 'Haaland',
    fulltNavn: 'Erling Haaland',
    lag: { navn: 'Man City', kort: 'MCI', kode: 43, id: 13 },
    posisjon: 'Angrep',
    posKort: 'A',
    erKeeper: false,
    pris: '14.1',
    eid: '69.8',
    form: '6.0',
    totalPoeng: 32,
    poengPerKamp: '6.0',
    xg: '2.40',
    xa: '0.60',
    minutter: 180,
    status: 'a',
    statusTekst: 'Klar',
    nytt: null,
    spillesjanse: null,
    dodball: { straffer: 1, hjorner: null, frispark: null },
    sisteKamper: [
      {
        runde: 2,
        motstander: 'WOL',
        hjemme: true,
        poeng: 5,
        minutter: 90,
        mal: 1,
        assists: 0,
        xg: '0.93',
        xa: '0.40',
        bonus: 1,
      },
    ],
    kommende: [{ runde: 3, motstander: 'LIV', hjemme: false, fdr: 4 }],
  });
});

test('buildPlayerCard oversetter nyhetsteksten og gir null når den er tom', () => {
  const skadet = buildPlayerCard({
    element: el({
      status: 'd',
      news: 'Ankle injury - 75% chance of playing',
      chance_of_playing_next_round: 75,
    }),
    teamsById,
    summary: { fixtures: [], history: [] },
  });
  assert.equal(skadet.nytt, 'Ankelskade – 75 % sjanse for spilletid');
  assert.equal(skadet.statusTekst, 'Usikker');
  assert.equal(skadet.spillesjanse, 75);

  const klar = buildPlayerCard({
    element: el({ news: '   ' }),
    teamsById,
    summary: { fixtures: [], history: [] },
  });
  assert.equal(klar.nytt, null);
});

test('buildPlayerCard tar siste 5 runder, nyeste først, og beholder begge DGW-radene', () => {
  const history = [
    hist(1),
    hist(2),
    hist(3),
    hist(4),
    hist(5, { opponent_team: 1 }),
    hist(5, { opponent_team: 12 }),
    hist(6),
  ];

  const kort = buildPlayerCard({ element: el(), teamsById, summary: { fixtures: [], history } });

  assert.deepEqual(
    kort.sisteKamper.map((k) => [k.runde, k.motstander]),
    [
      [6, 'WOL'],
      [5, 'LIV'],
      [5, 'ARS'],
      [4, 'WOL'],
      [3, 'WOL'],
    ],
  );
});

test('buildPlayerCard gir hjemme: null når was_home mangler', () => {
  const uten = hist(2);
  delete uten.was_home;

  const kort = buildPlayerCard({
    element: el(),
    teamsById,
    summary: { fixtures: [], history: [uten] },
  });

  assert.equal(kort.sisteKamper[0].hjemme, null);
});

test('buildPlayerCard hopper over blanke og ferdigspilte kamper, maks 3 kommende', () => {
  const fixtures = [
    fix(null),
    fix(3, { finished: true }),
    fix(3, { is_home: true, team_h: 13, team_a: 1, difficulty: 2 }),
    fix(4, { difficulty: 5 }),
    fix(5, { difficulty: 3 }),
    fix(6, { difficulty: 1 }),
  ];

  const kort = buildPlayerCard({ element: el(), teamsById, summary: { fixtures, history: [] } });

  assert.deepEqual(kort.kommende, [
    { runde: 3, motstander: 'ARS', hjemme: true, fdr: 2 },
    { runde: 4, motstander: 'LIV', hjemme: false, fdr: 5 },
    { runde: 5, motstander: 'LIV', hjemme: false, fdr: 3 },
  ]);
});

test('buildPlayerCard tåler tom og manglende historikk', () => {
  const tom = buildPlayerCard({
    element: el(),
    teamsById,
    summary: { fixtures: [], history: [] },
  });
  assert.deepEqual(tom.sisteKamper, []);

  const uten = buildPlayerCard({ element: el(), teamsById, summary: {} });
  assert.deepEqual(uten.sisteKamper, []);
  assert.deepEqual(uten.kommende, []);
});

test('buildPlayerCard null-guarder alle tre dødballrollene', () => {
  const ingen = el();
  delete ingen.penalties_order;
  delete ingen.corners_and_indirect_freekicks_order;
  delete ingen.direct_freekicks_order;

  assert.deepEqual(
    buildPlayerCard({ element: ingen, teamsById, summary: {} }).dodball,
    { straffer: null, hjorner: null, frispark: null },
  );

  assert.deepEqual(
    buildPlayerCard({
      element: el({ corners_and_indirect_freekicks_order: 2, direct_freekicks_order: 3 }),
      teamsById,
      summary: {},
    }).dodball,
    { straffer: 1, hjorner: 2, frispark: 3 },
  );
});

// ---- buildDifferentials --------------------------------------------------

// Kampene gir MCI (13) snitt-FDR 3.0 i vinduet 3–5; LIV (12) har ingen kamper
// i vinduet og faller tilbake på 3.5. ARS (1) ligger på 1.0.
const diffFixtures = [
  { event: 2, team_h: 13, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 5 },
  { event: 3, team_h: 13, team_a: 20, team_h_difficulty: 2, team_a_difficulty: 4 },
  { event: 4, team_h: 20, team_a: 13, team_h_difficulty: 4, team_a_difficulty: 3 },
  { event: 5, team_h: 13, team_a: 1, team_h_difficulty: 4, team_a_difficulty: 1 },
  { event: 6, team_h: 13, team_a: 1, team_h_difficulty: 1, team_a_difficulty: 1 },
];

let nextId = 500;
function kandidat(over = {}) {
  return el({
    id: (nextId += 1),
    web_name: `Spiller${nextId}`,
    team: 13,
    selected_by_percent: '4.0',
    form: '4.0',
    minutes: 90,
    status: 'a',
    ...over,
  });
}

function tersklerFor(elements, over = {}) {
  const r = buildDifferentials({
    elements,
    fixtures: diffFixtures,
    fromGw: 3,
    teamsById,
    ...over,
  });
  return new Map(r.terskler.map((t) => [t.prosent, t.rows]));
}

test('buildDifferentials ekskluderer eierandel som er nøyaktig på terskelen', () => {
  const paa = kandidat({ selected_by_percent: '10.0', web_name: 'Paa' });
  const under = kandidat({ selected_by_percent: '9.9', web_name: 'Under' });

  const t = tersklerFor([paa, under]);

  assert.deepEqual(t.get(10).map((r) => r.navn), ['Under']);
  assert.deepEqual(t.get(15).map((r) => r.navn).sort(), ['Paa', 'Under']);
  assert.deepEqual(t.get(5).map((r) => r.navn), []);
});

test('buildDifferentials regner score = form × (6 − snitt-FDR) med én desimal', () => {
  const p = kandidat({ form: '4.0', team: 13 });

  const [row] = tersklerFor([p]).get(5);

  // Tallene formateres i servicen, ikke i viewet: alltid én desimal.
  assert.equal(row.fdr3, '3.0');
  assert.equal(row.score, '12.0'); // 4.0 × (6 − 3.0)
  assert.deepEqual(row, {
    id: p.id,
    navn: p.web_name,
    lag: { kort: 'MCI', kode: 43, navn: 'Man City' },
    posKort: 'A',
    pris: '14.1',
    form: '4.0',
    eid: '4.0',
    fdr3: '3.0',
    score: '12.0',
    andel: 100,
  });
});

test('buildDifferentials faller tilbake på FDR 3.5 for lag uten kamper i vinduet', () => {
  const p = kandidat({ team: 12, form: '2.0' });

  const [row] = tersklerFor([p]).get(5);

  assert.equal(row.fdr3, '3.5');
  assert.equal(row.score, '5.0'); // 2.0 × (6 − 3.5)
});

test('buildDifferentials sorterer på score og kutter på topp 10', () => {
  const mange = [];
  for (let i = 1; i <= 12; i++) {
    mange.push(kandidat({ form: `${i}.0`, web_name: `F${i}` }));
  }

  const rows = tersklerFor(mange).get(5);

  assert.equal(rows.length, 10);
  assert.deepEqual(
    rows.map((r) => r.navn),
    ['F12', 'F11', 'F10', 'F9', 'F8', 'F7', 'F6', 'F5', 'F4', 'F3'],
  );
  // Sorteringen skjer numerisk FØR formateringen — ellers ville '9.0' > '36.0'.
  assert.ok(parseFloat(rows[0].score) > parseFloat(rows[9].score));
  // andel = score i prosent av toppscoren i DENNE tabellen (søylestripa).
  assert.equal(rows[0].andel, 100);
  assert.ok(rows.every((r) => r.andel >= 0 && r.andel <= 100), 'andel skal ligge i 0–100');
  assert.equal(rows[9].andel, Math.round((parseFloat(rows[9].score) / parseFloat(rows[0].score)) * 100));
});

test('buildDifferentials returnerer null når ingen har form ennå', () => {
  const sesongstart = [
    kandidat({ form: '0.0', minutes: 0 }),
    kandidat({ form: '0.0', minutes: 90 }),
  ];

  assert.equal(
    buildDifferentials({ elements: sesongstart, fixtures: diffFixtures, fromGw: 3 }),
    null,
  );
});

test('buildDifferentials filtrerer bort skadde, ubrukte og formløse spillere', () => {
  const ok = kandidat({ web_name: 'Ok' });
  const skadet = kandidat({ web_name: 'Skadet', status: 'i' });
  const ubrukt = kandidat({ web_name: 'Ubrukt', minutes: 0 });
  const formlos = kandidat({ web_name: 'Formlos', form: '0.0' });

  const rows = tersklerFor([ok, skadet, ubrukt, formlos]).get(5);

  assert.deepEqual(rows.map((r) => r.navn), ['Ok']);
});

// ---- buildSetPieceTable --------------------------------------------------

// De MÅLTE feltene: penalties_order, corners_and_indirect_freekicks_order,
// direct_freekicks_order. *_text-feltene er tomme hos FPL og brukes aldri.
function taker(navn, team, roller = {}) {
  return el({
    id: (nextId += 1),
    web_name: navn,
    team,
    penalties_order: null,
    corners_and_indirect_freekicks_order: null,
    direct_freekicks_order: null,
    ...roller,
  });
}

function radFor(tabell, kort) {
  return tabell.find((r) => r.lag.kort === kort);
}

// Takerne er { id, navn } — viewet trenger id-en for å åpne spillerkortet.
const navn = (takere) => takere.map((t) => t.navn);

test('buildSetPieceTable sorterer takerne på ordenstall, ikke på listerekkefølge', () => {
  const elements = [
    taker('Tredje', 1, { penalties_order: 3 }),
    taker('Forste', 1, { penalties_order: 1 }),
    taker('Hjorne2', 1, { corners_and_indirect_freekicks_order: 2 }),
    taker('Hjorne1', 1, { corners_and_indirect_freekicks_order: 1 }),
    taker('Frispark1', 1, { direct_freekicks_order: 1 }),
  ];

  const rad = radFor(buildSetPieceTable({ elements, teams }), 'ARS');

  assert.deepEqual(navn(rad.straffer), ['Forste', 'Tredje']);
  assert.deepEqual(navn(rad.hjorner), ['Hjorne1', 'Hjorne2']);
  assert.deepEqual(navn(rad.frispark), ['Frispark1']);
  assert.deepEqual(Object.keys(rad.straffer[0]), ['id', 'navn']);
});

test('buildSetPieceTable viser bare de to første i køen per rolle', () => {
  const elements = [1, 2, 3, 4].map((n) => taker(`S${n}`, 13, { penalties_order: n }));

  assert.deepEqual(navn(radFor(buildSetPieceTable({ elements, teams }), 'MCI').straffer), ['S1', 'S2']);
});

test('buildSetPieceTable beholder raden for klubber uten kjente takere', () => {
  const rad = radFor(buildSetPieceTable({ elements: [], teams }), 'WOL');

  assert.deepEqual(rad, {
    lag: { id: 20, navn: 'Wolves', kort: 'WOL', kode: 39 },
    straffer: [],
    hjorner: [],
    frispark: [],
  });
});

test('buildSetPieceTable gir én rad per klubb i lista, uansett takere', () => {
  const tabell = buildSetPieceTable({
    elements: [taker('Bare en', 1, { penalties_order: 1 })],
    teams,
  });

  assert.equal(tabell.length, teams.length);
  assert.deepEqual(tabell.map((r) => r.lag.id).sort((a, b) => a - b), [1, 12, 13, 20]);
});

test('buildSetPieceTable sorterer klubbene på navn', () => {
  const rotete = [
    { id: 20, name: 'Wolves', short_name: 'WOL', code: 39 },
    { id: 13, name: 'Man City', short_name: 'MCI', code: 43 },
    { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 },
  ];

  const tabell = buildSetPieceTable({ elements: [], teams: rotete });

  assert.deepEqual(tabell.map((r) => r.lag.navn), ['Arsenal', 'Man City', 'Wolves']);
});

// ---- assemblePlayerCard ---------------------------------------------------

// Mocker global fetch (mønster fra test/fplClient.test.js og transfers.test.js);
// hooks scopes til blokken så de rene testene over er uberørt.
describe('assemblePlayerCard', () => {
  const originalFetch = globalThis.fetch;
  let calls;

  const bootstrap = { teams, elements: [el(), el({ id: 412, web_name: 'Foden' })] };

  beforeEach(() => {
    clear();
    calls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function route(extra = []) {
    const routes = [[/bootstrap-static\/$/, bootstrap], ...extra];
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      const hit = routes.find(([re]) => re.test(String(url)));
      assert.ok(hit, `uventet URL: ${url}`);
      return { ok: true, status: 200, json: async () => hit[1] };
    };
  }

  test('assemblePlayerCard henter element-summary kun for den gitte spilleren', async () => {
    route([[/element-summary\/411\/$/, { fixtures: [fix(3)], history: [hist(2)] }]]);

    const kort = await assemblePlayerCard(411);

    assert.equal(kort.navn, 'Haaland');
    assert.deepEqual(kort.kommende, [{ runde: 3, motstander: 'LIV', hjemme: false, fdr: 4 }]);
    assert.equal(calls.filter((u) => /element-summary/.test(u)).length, 1);
    assert.ok(calls.some((u) => /element-summary\/411\/$/.test(u)));
  });

  test('assemblePlayerCard gir null for ukjent id uten å hente element-summary', async () => {
    route();

    assert.equal(await assemblePlayerCard(999999), null);
    assert.deepEqual(calls.filter((u) => /element-summary/.test(u)), []);
  });
});
