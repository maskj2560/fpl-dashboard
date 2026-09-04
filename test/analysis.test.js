import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextEvent,
  formationOf,
  flaggedPlayers,
  topForm,
  mostTransferredIn,
  roundInNumbers,
  mostTransferredOut,
  translateFplNews,
  fdrMatrix,
  formatPrice,
  averageFdr,
  teamFdrMap,
  nextOpponents,
  playProbability,
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  rankGraph,
  differentials,
  estimateBonus,
  hasConfirmedBonus,
  publishedBonus,
  resolvePicks,
  resolvedGw,
  byId,
  STATUS_LABELS,
} from '../src/services/analysis.js';

function player(overrides = {}) {
  return {
    id: 1,
    web_name: 'Spiller',
    team: 1,
    element_type: 3,
    now_cost: 55,
    form: '0.0',
    total_points: 0,
    selected_by_percent: '0.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    news: '',
    chance_of_playing_next_round: null,
    status: 'a',
    minutes: 0,
    ...overrides,
  };
}

test('nextEvent finner eventet med is_next', () => {
  const events = [
    { id: 1, is_next: false },
    { id: 2, is_next: true },
  ];
  assert.equal(nextEvent(events).id, 2);
  assert.equal(nextEvent([{ id: 1, is_next: false }]), null);
});

test('flaggedPlayers tar med skadde/usikre, sortert på eierandel', () => {
  const players = [
    player({ id: 1, status: 'a' }),
    player({ id: 2, status: 'i', selected_by_percent: '5.0' }),
    player({ id: 3, status: 'd', selected_by_percent: '40.0' }),
    player({ id: 4, news: 'Hamstring - 75% chance', selected_by_percent: '12.0' }),
    player({ id: 5, status: 'a', chance_of_playing_next_round: 50, selected_by_percent: '1.0' }),
  ];

  const flagged = flaggedPlayers(players);

  assert.deepEqual(
    flagged.map((p) => p.id),
    [3, 4, 2, 5],
    'friske spillere utelates, resten sortert på eierandel',
  );
});

test('flaggedPlayers respekterer limit', () => {
  const players = Array.from({ length: 15 }, (_, i) =>
    player({ id: i, status: 'i', selected_by_percent: String(i) }),
  );
  assert.equal(flaggedPlayers(players, 10).length, 10);
});

test('topForm gir topp N på form, spillere uten spilletid utelates', () => {
  const players = [
    player({ id: 1, form: '8.5', minutes: 500 }),
    player({ id: 2, form: '9.9', minutes: 0 }),
    player({ id: 3, form: '3.2', minutes: 900 }),
    player({ id: 4, form: '6.1', minutes: 200 }),
  ];

  const top = topForm(players, 2);

  assert.deepEqual(
    top.map((p) => p.id),
    [1, 4],
  );
});

test('mostTransferredIn/Out sorterer på transfers denne GW-en', () => {
  const players = [
    player({ id: 1, transfers_in_event: 100, transfers_out_event: 5 }),
    player({ id: 2, transfers_in_event: 900, transfers_out_event: 50 }),
    player({ id: 3, transfers_in_event: 10, transfers_out_event: 800 }),
  ];

  assert.deepEqual(mostTransferredIn(players, 2).map((p) => p.id), [2, 1]);
  assert.deepEqual(mostTransferredOut(players, 2).map((p) => p.id), [3, 2]);
});

// P1-1: før sesongstart er alle form-tall og overgangstall 0. En sortering på
// bare nuller ga en vilkårlig topplista som så ut som ekte rangering.
test('topForm gir tom liste når ingen har form over 0', () => {
  const players = [
    player({ id: 1, form: '0.0', minutes: 500 }),
    player({ id: 2, form: '0.0', minutes: 900 }),
  ];

  assert.deepEqual(topForm(players, 10), []);
});

test('mostTransferredIn/Out gir tom liste når ingen overganger er gjort', () => {
  const players = [
    player({ id: 1, transfers_in_event: 0, transfers_out_event: 0 }),
    player({ id: 2, transfers_in_event: 0, transfers_out_event: 0 }),
  ];

  assert.deepEqual(mostTransferredIn(players, 10), []);
  assert.deepEqual(mostTransferredOut(players, 10), []);
});

test('mostTransferredIn/Out tar med bare spillere som faktisk er byttet', () => {
  const players = [
    player({ id: 1, transfers_in_event: 5, transfers_out_event: 0 }),
    player({ id: 2, transfers_in_event: 0, transfers_out_event: 7 }),
  ];

  assert.deepEqual(mostTransferredIn(players, 10).map((x) => x.id), [1]);
  assert.deepEqual(mostTransferredOut(players, 10).map((x) => x.id), [2]);
});

test('fdrMatrix bygger 5 GW-er per lag med riktig difficulty', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 3 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 5);

  assert.deepEqual(matrix.gameweeks, [3, 4, 5, 6, 7]);
  const arsenal = matrix.rows.find((r) => r.team.id === 1);
  assert.equal(arsenal.cells[0].length, 1);
  assert.equal(arsenal.cells[0][0].opponent, 'CHE');
  assert.equal(arsenal.cells[0][0].home, true);
  assert.equal(arsenal.cells[0][0].difficulty, 2);
  assert.equal(arsenal.cells[1][0].home, false);
  assert.equal(arsenal.cells[1][0].difficulty, 3);
  assert.equal(arsenal.cells[2].length, 0, 'blank GW gir tom celle');
});

test('fdrMatrix håndterer dobbel gameweek (to kamper i én celle)', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 3, team_h: 2, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 5 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 1);
  const arsenal = matrix.rows.find((r) => r.team.id === 1);

  assert.equal(arsenal.cells[0].length, 2);
});

test('fdrMatrix stopper på GW 38', () => {
  const teams = [{ id: 1, name: 'Arsenal', short_name: 'ARS' }];
  const matrix = fdrMatrix(teams, [], 36, 5);
  assert.deepEqual(matrix.gameweeks, [36, 37, 38]);
});

test('fdrMatrix sorterer rader på snitt-difficulty (lettest først)', () => {
  const teams = [
    { id: 1, name: 'Arsenal', short_name: 'ARS' },
    { id: 2, name: 'Chelsea', short_name: 'CHE' },
  ];
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
  ];

  const matrix = fdrMatrix(teams, fixtures, 3, 1);

  assert.equal(matrix.rows[0].team.id, 2, 'Chelsea (FDR 2) før Arsenal (FDR 5)');
});

test('formatPrice viser tideler som £-millioner', () => {
  assert.equal(formatPrice(55), '5.5');
  assert.equal(formatPrice(128), '12.8');
  assert.equal(formatPrice(40), '4.0');
});

test('averageFdr regner snitt for lagets kamper i vinduet', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 4 },
    { event: 9, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 5 },
  ];
  assert.equal(averageFdr(fixtures, 1, 3, 3), 3); // (2+4)/2
  assert.equal(averageFdr(fixtures, 1, 9, 1), 5);
  assert.equal(averageFdr([], 1, 3, 3), null);
});

test('playProbability bruker chance og status', () => {
  assert.equal(playProbability(player({ status: 'a', chance_of_playing_next_round: null })), 1);
  assert.equal(playProbability(player({ status: 'd', chance_of_playing_next_round: 75 })), 0.75);
  assert.equal(playProbability(player({ status: 'i', chance_of_playing_next_round: null })), 0);
  assert.equal(playProbability(player({ status: 's', chance_of_playing_next_round: 0 })), 0);
});

test('captainSuggestions rangerer på form x fixture-lettehet x spilletid', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 5 },
  ];
  const squad = [
    player({ id: 1, web_name: 'LettKamp', team: 1, form: '5.0', minutes: 900 }),
    player({ id: 2, web_name: 'ToffKamp', team: 2, form: '5.0', minutes: 900 }),
    player({ id: 3, web_name: 'Skadet', team: 1, form: '9.0', minutes: 900, status: 'i', chance_of_playing_next_round: 0 }),
    player({ id: 4, web_name: 'Keeper', team: 1, element_type: 1, form: '9.9', minutes: 900 }),
  ];
  const top = captainSuggestions(squad, fixtures, 3, 3);
  assert.equal(top[0].player.id, 1, 'lett kamp vinner ved lik form');
  assert.equal(top[1].player.id, 2);
  assert.equal(top.length, 3);
  assert.equal(top[2].score, 0, 'skadet spiller får score 0');
  assert.ok(top.every((t) => t.player.element_type !== 1), 'keeper foreslas ikke');
  assert.ok(top[0].reasons.length >= 2, 'begrunnelse folger med');
});

test('transferOutCandidates flagger skade, lav form og toff fixture-run', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
    { event: 4, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
  ];
  const squad = [
    player({ id: 1, team: 2, form: '6.0', minutes: 900 }), // frisk, god form, lette kamper
    player({ id: 2, team: 2, status: 'i', chance_of_playing_next_round: 25, minutes: 900 }),
    player({ id: 3, team: 2, form: '1.2', minutes: 900 }),
    player({ id: 4, team: 1, form: '6.0', minutes: 900 }), // FDR-snitt 5
  ];
  const out = transferOutCandidates(squad, fixtures, 3);
  const ids = out.map((o) => o.player.id);
  assert.ok(!ids.includes(1));
  assert.ok(ids.includes(2) && ids.includes(3) && ids.includes(4));
  assert.ok(out.find((o) => o.player.id === 2).reasons[0].length > 3);
});

test('transferInCandidates: samme posisjon, innenfor budsjett, ikke i troppen', () => {
  const fixtures = [];
  const out = player({ id: 1, element_type: 3, now_cost: 80 });
  const elements = [
    out,
    player({ id: 2, element_type: 3, now_cost: 85, form: '7.0', total_points: 60, minutes: 900 }),
    player({ id: 3, element_type: 3, now_cost: 95, form: '9.0', total_points: 90, minutes: 900 }), // for dyr (budsjett 90)
    player({ id: 4, element_type: 2, now_cost: 50, form: '8.0', total_points: 70, minutes: 900 }), // feil posisjon
    player({ id: 5, element_type: 3, now_cost: 60, form: '2.0', total_points: 30, minutes: 900 }),
    player({ id: 6, element_type: 3, now_cost: 70, form: '6.0', total_points: 55, minutes: 900 }), // i troppen
    player({ id: 7, element_type: 3, now_cost: 75, form: '6.5', total_points: 50, minutes: 0 }),   // aldri spilt
  ];
  const inn = transferInCandidates(out, elements, new Set([1, 6]), 10, fixtures, 3, 3);
  const ids = inn.map((c) => c.player.id);
  assert.ok(ids.includes(2) && ids.includes(5));
  assert.ok(!ids.includes(3) && !ids.includes(4) && !ids.includes(6) && !ids.includes(7) && !ids.includes(1));
  assert.equal(ids[0], 2, 'hoyest form/verdi forst');
});

test('rankGraph lager polyline-punkter, lav rank overst', () => {
  const history = [
    { event: 1, overall_rank: 1000000 },
    { event: 2, overall_rank: 500000 },
    { event: 3, overall_rank: 750000 },
  ];
  const g = rankGraph(history, 600, 140);
  assert.equal(g.min, 500000);
  assert.equal(g.max, 1000000);
  assert.equal(g.last, 750000);
  const pts = g.points.split(' ').map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 3);
  assert.equal(pts[0][0], 0);
  assert.equal(pts[2][0], 600);
  assert.ok(pts[1][1] < pts[0][1], 'bedre rank tegnes hoyere (lavere y)');
  assert.equal(rankGraph([], 600, 140), null);
  assert.equal(rankGraph([{ event: 1, overall_rank: 5 }], 600, 140).points, '0,70');
});

// v1.7.1: aksene på grafen trenger rundespennet, ikke bare rank-spennet.
test('rankGraph oppgir første og siste runde for x-aksen', () => {
  const g = rankGraph([
    { event: 2, overall_rank: 100 },
    { event: 3, overall_rank: 200 },
    { event: 5, overall_rank: 150 },
  ], 600, 140);
  assert.equal(g.gwFirst, 2);
  assert.equal(g.gwLast, 5);
});

test('rankGraph gir lukket areal-polygon under linjen', () => {
  const g = rankGraph([{ event: 1, overall_rank: 100 }, { event: 2, overall_rank: 50 }], 600, 140);
  assert.equal(g.area, `${g.points} 600,140 0,140`);
});

test('rankGraph gir null-areal for ett punkt', () => {
  const g = rankGraph([{ event: 1, overall_rank: 5 }], 600, 140);
  assert.equal(g.area, null);
});

test('differentials finner spillere kun den ene har, sortert paa eierandel', () => {
  const elements = [
    player({ id: 1, selected_by_percent: '50.0' }),
    player({ id: 2, selected_by_percent: '10.0' }),
    player({ id: 3, selected_by_percent: '30.0' }),
    player({ id: 4, selected_by_percent: '5.0' }),
  ];
  const d = differentials(new Set([1, 2]), new Set([1, 3, 4]), elements);
  assert.deepEqual(d.theirs.map((p) => p.id), [3, 4], 'de har, jeg mangler');
  assert.deepEqual(d.mine.map((p) => p.id), [2], 'jeg har, de mangler');
});

function fixtureWithBps(hs, as) {
  return {
    stats: [
      { identifier: 'bps', h: hs.map(([element, value]) => ({ element, value })), a: as.map(([element, value]) => ({ element, value })) },
    ],
  };
}

test('estimateBonus gir 3/2/1 til topp 3 BPS', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 25]], [[3, 28], [4, 10]]));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(3), 2);
  assert.equal(b.get(2), 1);
  assert.equal(b.get(4), undefined);
});

test('estimateBonus deler ved likhet: to paa topp gir 3+3 og deretter 1', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 30]], [[3, 20]]));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(2), 3);
  assert.equal(b.get(3), 1);
});

test('estimateBonus: likhet paa andreplass gir 2+2, ingen enerpoeng', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 25], [3, 25], [4, 20]], []));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(2), 2);
  assert.equal(b.get(3), 2);
  assert.equal(b.get(4), undefined);
});

test('estimateBonus taaler manglende stats', () => {
  assert.equal(estimateBonus({ stats: [] }).size, 0);
  assert.equal(estimateBonus({}).size, 0);
});

// ---- P2-2: FPL-ens engelske statustekster på norsk ------------------------

test('translateFplNews oversetter skadetype med spillesjanse', () => {
  assert.equal(
    translateFplNews('Ankle injury - 75% chance of playing'),
    'Ankelskade – 75 % sjanse for spilletid',
  );
});

test('translateFplNews oversetter ukjent returdato', () => {
  assert.equal(translateFplNews('Foot injury - Unknown return date'), 'Fotskade – uavklart');
});

test('translateFplNews oversetter forventet retur med måned', () => {
  assert.equal(translateFplNews('Knock - Expected back 21 Aug'), 'Smell – ventes tilbake 21. aug.');
});

test('translateFplNews oversetter overganger og utlån', () => {
  assert.equal(translateFplNews('Has joined Real Madrid permanently'), 'Overgang til Real Madrid (permanent)');
  assert.equal(translateFplNews('Has joined Sunderland on loan'), 'Overgang til Sunderland (på lån)');
  assert.equal(translateFplNews('Loaned to Ipswich'), 'Lånt ut til Ipswich');
});

test('translateFplNews oversetter utestengelse', () => {
  assert.equal(translateFplNews('Suspended - Expected back 25 Aug'), 'Utestengt – ventes tilbake 25. aug.');
});

test('translateFplNews beholder ukjent skadetype, men oversetter suffikset', () => {
  assert.equal(
    translateFplNews('Personal reasons - 50% chance of playing'),
    'Personal reasons – 50 % sjanse for spilletid',
  );
});

test('translateFplNews lar ukjent mønster og tom tekst stå urørt', () => {
  assert.equal(translateFplNews('Left the club by mutual consent'), 'Left the club by mutual consent');
  assert.equal(translateFplNews(''), '');
  assert.equal(translateFplNews(null), '');
});

// ---- QA v1.1.1 P3: fraser fra ekte bootstrap-static som slapp gjennom rått --

test('translateFplNews dekker skadetypene fra ekte FPL-data', () => {
  assert.equal(
    translateFplNews('Unspecified injury - 75% chance of playing'),
    'Uspesifisert skade – 75 % sjanse for spilletid',
  );
  assert.equal(
    translateFplNews('Unspecified injury - Unknown return date'),
    'Uspesifisert skade – uavklart',
  );
  assert.equal(translateFplNews('Arm injury - Unknown return date'), 'Armskade – uavklart');
  assert.equal(
    translateFplNews('Muscular injury - Unknown return date'),
    'Muskelskade – uavklart',
  );
  assert.equal(
    translateFplNews('Lack of match fitness - 75% chance of playing'),
    'Mangler kamptrening – 75 % sjanse for spilletid',
  );
});

test('translateFplNews oversetter lånevarianter i overganger', () => {
  assert.equal(
    translateFplNews('Has joined Juventus on loan for the rest of the season'),
    'Overgang til Juventus (på lån ut sesongen)',
  );
  assert.equal(
    translateFplNews('Has joined Wrexham on loan until 1 Jan'),
    'Overgang til Wrexham (på lån til 1. jan.)',
  );
});

test('translateFplNews oversetter utestengelse med dato og retur til klubb', () => {
  assert.equal(translateFplNews('Suspended until 29 Aug'), 'Utestengt til 29. aug.');
  assert.equal(translateFplNews('has returned to Getafe CF'), 'Tilbake hos Getafe CF');
});

test('translateFplNews varsler i dev når et mønster ikke matcher', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  translateFplNews('Some brand new phrase FPL invented');
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0].arguments[0]), /uten oversettelsesmønster/);

  warn.mock.resetCalls();
  translateFplNews('Ankle injury - 75% chance of playing');
  assert.equal(warn.mock.callCount(), 0, 'kjent mønster skal ikke varsle');
});

// ---- P0-1: picks som peker på ukjente elementer ----------------------------

test('resolvePicks kobler picks mot elementer og beholder rekkefølgen', () => {
  const byId = new Map([
    [1, { id: 1, web_name: 'Raya' }],
    [2, { id: 2, web_name: 'Saka' }],
  ]);
  const resolved = resolvePicks([{ element: 2 }, { element: 1 }], byId);
  assert.deepEqual(
    resolved.map((r) => r.player.web_name),
    ['Saka', 'Raya'],
  );
  assert.equal(resolved[0].pick.element, 2);
});

test('resolvePicks dropper pick uten element i bootstrap og advarer', () => {
  const byId = new Map([[1, { id: 1, web_name: 'Raya' }]]);
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const resolved = resolvePicks([{ element: 1 }, { element: 999 }], byId);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].player.web_name, 'Raya');
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].join(' '), /999/);
});

test('resolvePicks tåler tom eller manglende pick-liste', () => {
  assert.deepEqual(resolvePicks([], new Map()), []);
  assert.deepEqual(resolvePicks(undefined, new Map()), []);
});

// ---- P1-11: tvilsom spiller uten publisert prosent -------------------------

test('playProbability gir 0,75 for status d uten publisert prosent', () => {
  assert.equal(playProbability(player({ status: 'd', chance_of_playing_next_round: null })), 0.75);
});

test('captainSuggestions merker tvilsom spiller uten prosent som redusert spilletid', () => {
  const squad = [player({ id: 1, element_type: 3, team: 1, form: '8.0', status: 'd', chance_of_playing_next_round: null })];
  const [top] = captainSuggestions(squad, [{ event: 5, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 }], 5);
  assert.ok(top.reasons.includes('Spilletid 75 %'), top.reasons.join(' | '));
  assert.equal(top.probability, 0.75);
});

// ---- P1-13: oversettelses-drift skal varsles også i prod -------------------

test('translateFplNews advarer om ukjent mønster, men bare én gang per tekst', () => {
  const warnings = [];
  const original = console.warn;
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    translateFplNews('Quantum entanglement - Expected back never');
    translateFplNews('Quantum entanglement - Expected back never');
  } finally {
    console.warn = original;
    process.env.NODE_ENV = prev;
  }
  assert.equal(warnings.length, 1, warnings.join(' / '));
  assert.match(warnings[0], /Quantum entanglement/);
});

// ---- P2-2: delte hjelpere -------------------------------------------------

test('resolvedGw velger aktiv runde når den finnes', () => {
  const events = [
    { id: 4, is_current: false, is_next: false },
    { id: 5, is_current: true, is_next: false },
    { id: 6, is_current: false, is_next: true },
  ];
  assert.equal(resolvedGw(events), 5);
});

test('resolvedGw gir runden før neste når ingen er aktiv', () => {
  assert.equal(resolvedGw([{ id: 6, is_next: true }]), 5);
});

test('resolvedGw gir 0 før sesongstart og etter sesongslutt', () => {
  assert.equal(resolvedGw([{ id: 1, is_next: true }]), 0, 'pre-season');
  assert.equal(resolvedGw([{ id: 38, is_current: false, is_next: false }]), 0, 'post-season');
  assert.equal(resolvedGw([]), 0);
});

test('byId lager oppslag på id', () => {
  const map = byId([{ id: 3, navn: 'c' }, { id: 1, navn: 'a' }]);
  assert.equal(map.get(1).navn, 'a');
  assert.equal(map.get(3).navn, 'c');
  assert.equal(map.get(2), undefined);
  assert.equal(byId([]).size, 0);
});

test('STATUS_LABELS er delt og bruker full form for utilgjengelig', () => {
  assert.equal(STATUS_LABELS.a, 'Klar');
  assert.equal(STATUS_LABELS.d, 'Usikker');
  assert.equal(STATUS_LABELS.n, 'Utilgjengelig');
});

test('hasConfirmedBonus skiller bekreftet bonus fra bare BPS', () => {
  assert.equal(hasConfirmedBonus({ stats: [{ identifier: 'bps', h: [{ element: 1, value: 30 }], a: [] }] }), false);
  assert.equal(hasConfirmedBonus({ stats: [{ identifier: 'bonus', h: [], a: [] }] }), false);
  assert.equal(hasConfirmedBonus({ stats: [{ identifier: 'bonus', h: [{ element: 1, value: 3 }], a: [] }] }), true);
  assert.equal(hasConfirmedBonus({}), false);
});

test('publishedBonus gir poeng per spiller fra bonus-statistikken, hjemme og borte samlet', () => {
  const b = publishedBonus({
    stats: [
      { identifier: 'bps', h: [{ element: 1, value: 40 }], a: [] },
      {
        identifier: 'bonus',
        h: [{ element: 1, value: 3 }, { element: 2, value: 1 }],
        a: [{ element: 3, value: 2 }],
      },
    ],
  });
  assert.equal(b.get(1), 3);
  assert.equal(b.get(2), 1);
  assert.equal(b.get(3), 2, 'bortelaget teller med');
  assert.equal(b.size, 3);
});

test('publishedBonus gir tom map naar stats mangler eller bonus-statistikken er tom', () => {
  assert.equal(publishedBonus({}).size, 0, 'ingen stats');
  assert.equal(publishedBonus({ stats: [] }).size, 0, 'tom stats-liste');
  assert.equal(
    publishedBonus({ stats: [{ identifier: 'bps', h: [{ element: 1, value: 30 }], a: [] }] }).size,
    0,
    'bare BPS, ingen publisert bonus',
  );
  assert.equal(publishedBonus({ stats: [{ identifier: 'bonus', h: [], a: [] }] }).size, 0);
});

// ---- P2-3: ett oppslag per lag i stedet for full skann per kandidat --------

test('teamFdrMap gir samme snitt som averageFdr for hvert lag', () => {
  const fixtures = [
    { event: 5, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 6, team_h: 2, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 5 },
    { event: 7, team_h: 1, team_a: 3, team_h_difficulty: 4, team_a_difficulty: 2 },
    { event: 9, team_h: 1, team_a: 2, team_h_difficulty: 1, team_a_difficulty: 1 },
    { event: null, team_h: 1, team_a: 3, team_h_difficulty: 5, team_a_difficulty: 5 },
  ];
  const map = teamFdrMap(fixtures, 5, 3);
  for (const teamId of [1, 2, 3]) {
    assert.equal(map.get(teamId) ?? null, averageFdr(fixtures, teamId, 5, 3), `lag ${teamId}`);
  }
});

test('teamFdrMap utelater lag uten kamper i vinduet', () => {
  const map = teamFdrMap([{ event: 9, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 }], 5, 3);
  assert.equal(map.size, 0);
});

// ---- B-1: kapteinsforslag ved sesongstart (all form 0.0) -------------------

test('captainSuggestions faller tilbake på ep_next når ingen har form', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 },
  ];
  const squad = [
    player({ id: 1, web_name: 'Back', team: 1, ep_next: '1.7' }),
    player({ id: 2, web_name: 'Spiss', team: 2, ep_next: '4.0' }),
    player({ id: 3, web_name: 'Midt', team: 1, ep_next: '2.5' }),
  ];
  const top = captainSuggestions(squad, fixtures, 2, 3);
  assert.deepEqual(
    top.map((t) => t.player.id),
    [2, 3, 1],
    'rangert på ep_next, ikke pick-rekkefølge',
  );
  assert.ok(
    top.every((t) => t.criterion === 'ep_next'),
    'kriteriet merkes så viewet kan forklare det',
  );
  const reasons = top[0].reasons.join(' | ');
  assert.match(reasons, /Forventet poeng \(FPL\) 4\.0/);
  assert.doesNotMatch(reasons, /Form/, 'ingen villedende «Form 0.0» i fallback');
});

test('ep_next-fallback vekter fixture-lettehet og spilletid som vanlig', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 5 },
  ];
  const squad = [
    player({ id: 3, web_name: 'Skadet', team: 1, ep_next: '9.0', status: 'i', chance_of_playing_next_round: 0 }),
    player({ id: 2, web_name: 'ToffKamp', team: 2, ep_next: '3.0' }),
    player({ id: 1, web_name: 'LettKamp', team: 1, ep_next: '3.0' }),
  ];
  const top = captainSuggestions(squad, fixtures, 2, 3);
  assert.equal(top[0].player.id, 1, 'lett kamp vinner ved lik ep_next');
  assert.equal(top[1].player.id, 2);
  assert.equal(top[2].player.id, 3);
  assert.equal(top[2].score, 0, 'skadet spiller får score 0 også i fallback');
});

test('captainSuggestions returnerer tom liste når verken form eller ep_next finnes', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 },
  ];
  const squad = [
    player({ id: 1, team: 1 }), // ep_next mangler helt
    player({ id: 2, team: 2, ep_next: '0.0' }),
  ];
  assert.deepEqual(captainSuggestions(squad, fixtures, 2, 3), []);
});

test('captainSuggestions bruker form som før så snart én spiller har form', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 },
  ];
  const squad = [
    player({ id: 1, web_name: 'IForm', team: 1, form: '5.0', minutes: 90, ep_next: '1.0' }),
    player({ id: 2, web_name: 'UtenForm', team: 2, ep_next: '9.9' }),
  ];
  const top = captainSuggestions(squad, fixtures, 2, 3);
  assert.equal(top[0].player.id, 1, 'ep_next overstyrer ikke ekte form');
  assert.ok(top.every((t) => t.criterion === 'form'));
  assert.match(top[0].reasons.join(' | '), /Form 5\.0/);
});

// ---- B-2: motstanderkontekst til AI-rådgiveren -----------------------------

test('nextOpponents gir motstander, hjemme/borte og FDR for runden', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 3, team_h: 1, team_a: 3, team_h_difficulty: 5, team_a_difficulty: 1 },
  ];
  const map = nextOpponents(fixtures, 2);
  assert.deepEqual(map.get(1), [{ opponent: 2, home: true, difficulty: 2 }]);
  assert.deepEqual(map.get(2), [{ opponent: 1, home: false, difficulty: 4 }]);
  assert.equal(map.has(3), false, 'lag uten kamp i runden mangler i mappet');
});

test('nextOpponents gir to innslag ved dobbeltrunde', () => {
  const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 2, team_h: 3, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 5 },
    { event: null, team_h: 1, team_a: 4, team_h_difficulty: 1, team_a_difficulty: 1 },
  ];
  const map = nextOpponents(fixtures, 2);
  assert.deepEqual(map.get(1), [
    { opponent: 2, home: true, difficulty: 2 },
    { opponent: 3, home: false, difficulty: 5 },
  ]);
  assert.equal(map.has(4), false, 'kamp uten runde teller ikke');
});

test('formationOf teller forsvar-midtbane-angrep, keeper holdes utenfor', () => {
  const s = (t) => ({ player: { element_type: t } });
  assert.equal(formationOf([s(1), s(2), s(2), s(2), s(3), s(3), s(3), s(3), s(3), s(4), s(4)]), '3-5-2');
});

test('formationOf tåler tom liste', () => {
  assert.equal(formationOf([]), '0-0-0');
});

test('rankGraph flagger ett-punkts-grafen', () => {
  assert.equal(rankGraph([{ event: 1, overall_rank: 5 }], 600, 140).single, true);
  assert.equal(rankGraph([{ event: 1, overall_rank: 100 }, { event: 2, overall_rank: 50 }], 600, 140).single, false);
});

// ---- v1.14.0 (T3): «Runden i tall» fra bootstrap.events[] -------------------

const rundeEvents = [
  { id: 1, name: 'Gameweek 1', finished: true, average_entry_score: 50, highest_score: 131, most_selected: 411, most_transferred_in: 115, top_element_info: { id: 115, points: 17 }, most_captained: 411, most_vice_captained: 1, transfers_made: 1_000_000, chip_plays: [{ chip_name: 'bboost', num_played: 814_606 }], ranked_count: 8_903_411 },
  {
    id: 2,
    name: 'Gameweek 2',
    finished: true,
    average_entry_score: 81,
    highest_score: 161,
    most_selected: 165,
    most_transferred_in: 115,
    top_element_info: { id: 426, points: 23 },
    most_captained: 411,
    most_vice_captained: 1,
    transfers_made: 11_562_127,
    chip_plays: [
      { chip_name: 'bboost', num_played: 338_660 },
      { chip_name: '3xc', num_played: 233_946 },
    ],
    ranked_count: 9_904_815,
  },
  { id: 3, name: 'Gameweek 3', is_next: true, finished: false, average_entry_score: 0, highest_score: null, chip_plays: [], ranked_count: 0 },
];

const rundeElements = new Map([
  [411, { id: 411, web_name: 'Haaland' }],
  [165, { id: 165, web_name: 'João Pedro' }],
  [115, { id: 115, web_name: 'De Cuyper' }],
  [426, { id: 426, web_name: 'B.Fernandes' }],
  [1, { id: 1, web_name: 'Raya' }],
]);

test('roundInNumbers velger siste ferdige runde og slår opp navnene', () => {
  const r = roundInNumbers(rundeEvents, rundeElements);
  assert.equal(r.gw, 2, 'kommende runde har average 0 og skal aldri velges');
  assert.equal(r.average, 81);
  assert.equal(r.highest, 161);
  assert.equal(r.mostSelected, 'João Pedro');
  assert.equal(r.mostTransferredIn, 'De Cuyper');
  assert.deepEqual(r.topPlayer, { name: 'B.Fernandes', points: 23 });
  assert.equal(r.mostCaptained, 'Haaland');
  assert.equal(r.mostViceCaptained, 'Raya');
  assert.equal(r.transfersMade, 11_562_127);
  assert.equal(r.rankedCount, 9_904_815);
  assert.deepEqual(r.chips, [
    { chip: 'bboost', label: 'Bench Boost', count: 338_660 },
    { chip: '3xc', label: 'Triple Captain', count: 233_946 },
  ]);
});

test('roundInNumbers gir null før første runde er ferdig eller når FPL ikke har fylt tallene', () => {
  assert.equal(roundInNumbers([rundeEvents[2]], rundeElements), null, 'ingen ferdig runde');
  assert.equal(roundInNumbers([], rundeElements), null);
  assert.equal(roundInNumbers(undefined, rundeElements), null);
  const tomFerdig = [{ id: 1, name: 'Gameweek 1', finished: true, average_entry_score: 0 }];
  assert.equal(roundInNumbers(tomFerdig, rundeElements), null, 'ferdig runde uten snitt er ikke fylt ennå');
  const ukjent = roundInNumbers(
    [{ id: 1, name: 'Gameweek 1', finished: true, average_entry_score: 40, most_selected: 999, top_element_info: null }],
    rundeElements,
  );
  assert.equal(ukjent.mostSelected, '–', 'ukjent id gir tankestrek, ikke krasj');
  assert.equal(ukjent.topPlayer, null);
  assert.deepEqual(ukjent.chips, [], 'ingen chip_plays gir tom liste');
  assert.equal(ukjent.highest, null);
});
