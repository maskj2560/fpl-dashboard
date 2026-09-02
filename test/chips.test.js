import test from 'node:test';
import assert from 'node:assert/strict';
import { chipHalves, specialGws, buildChipPlan, describeRec, CHIPS } from '../src/services/chips.js';
import { fixtureGrid } from '../src/services/analysis.js';

// Syntetisk liga: fire klubber, GW 4–8. Alt regnes fra denne lista.
const teams = [
  { id: 1, name: 'Arsenal', short_name: 'ARS' },
  { id: 2, name: 'Chelsea', short_name: 'CHE' },
  { id: 3, name: 'Liverpool', short_name: 'LIV' },
  { id: 4, name: 'Everton', short_name: 'EVE' },
];

const fx = (event, h, a, hd, ad) => ({
  event, team_h: h, team_a: a, team_h_difficulty: hd, team_a_difficulty: ad, kickoff_time: '2026-10-01T14:00:00Z',
});

// GW4: alle én kamp. GW5: ARS og CHE dobbel. GW6: bare ARS–CHE (LIV og EVE
// blanke). GW7: ingen kamper satt opp. GW8: alle én kamp.
const fixtures = [
  fx(4, 1, 2, 2, 4), fx(4, 3, 4, 3, 3),
  fx(5, 1, 2, 2, 4), fx(5, 3, 1, 2, 2), fx(5, 2, 4, 3, 3),
  fx(6, 1, 2, 3, 3),
  fx(8, 2, 1, 4, 2), fx(8, 3, 4, 2, 4),
];

const bootstrapChips = [
  { id: 1, name: 'wildcard', start_event: 1, stop_event: 19 },
  { id: 2, name: 'freehit', start_event: 1, stop_event: 19 },
  { id: 3, name: 'bboost', start_event: 1, stop_event: 19 },
  { id: 4, name: '3xc', start_event: 1, stop_event: 19 },
  { id: 5, name: 'wildcard', start_event: 20, stop_event: 38 },
  { id: 6, name: 'freehit', start_event: 20, stop_event: 38 },
  { id: 7, name: 'bboost', start_event: 20, stop_event: 38 },
  { id: 8, name: '3xc', start_event: 20, stop_event: 38 },
];

test('chipHalves leser start_event/stop_event og faller tilbake på 1–19/20–38', () => {
  assert.deepEqual(chipHalves(bootstrapChips), [
    { half: 1, from: 1, to: 19 },
    { half: 2, from: 20, to: 38 },
  ]);
  assert.deepEqual(chipHalves([]), [
    { half: 1, from: 1, to: 19 },
    { half: 2, from: 20, to: 38 },
  ]);
  assert.deepEqual(chipHalves(undefined), chipHalves([]));
  assert.deepEqual(chipHalves([{ name: 'wildcard' }]), chipHalves([]), 'uten gyldige felter → fallback');
  // Gammelt format: ett sett chips for hele sesongen.
  assert.deepEqual(chipHalves([{ name: 'wildcard', start_event: 1, stop_event: 38 }]), [
    { half: 1, from: 1, to: 38 },
  ]);
});

// QA-funn 1 (v1.12.1): FPL 2026/27 lar ikke wildcard og Free Hit spilles i
// runde 1 — de har start_event 2, mens Bench Boost og Triple Captain har 1.
// Prod viste «Halvdel 1 runde 1–19», «Halvdel 2 runde 2–19», «Halvdel 3 runde
// 20–38». Halvdelen er stopp-runden, ikke (start, stopp)-paret.
test('chipHalves: chips som først kan spilles i runde 2 lager ikke en egen halvdel', () => {
  const fpl2026 = [
    { id: 1, name: 'wildcard', start_event: 2, stop_event: 19 },
    { id: 2, name: 'wildcard', start_event: 20, stop_event: 38 },
    { id: 3, name: 'freehit', start_event: 2, stop_event: 19 },
    { id: 4, name: 'bboost', start_event: 1, stop_event: 19 },
    { id: 5, name: '3xc', start_event: 1, stop_event: 19 },
    { id: 6, name: 'freehit', start_event: 20, stop_event: 38 },
    { id: 7, name: 'bboost', start_event: 20, stop_event: 38 },
    { id: 8, name: '3xc', start_event: 20, stop_event: 38 },
  ];
  assert.deepEqual(chipHalves(fpl2026), [
    { half: 1, from: 1, to: 19 },
    { half: 2, from: 20, to: 38 },
  ]);
});

test('fixtureGrid gir kamper per lag per runde, delt med fdrMatrix', () => {
  const grid = fixtureGrid(teams, fixtures, 4, 8);
  assert.equal(grid.get(1).get(5).length, 2, 'ARS har dobbel i GW5');
  assert.equal(grid.get(1).get(5)[0].opponent, 'CHE');
  assert.equal(grid.get(1).get(5)[0].difficulty, 2);
  assert.equal(grid.get(3).get(6), undefined, 'LIV er blank i GW6');
  assert.equal(grid.get(2).get(4)[0].home, false);
});

test('specialGws finner dobbel- og blankrunde', () => {
  const grid = fixtureGrid(teams, fixtures, 4, 8);
  const s = specialGws(grid, teams, 4, 8);
  assert.deepEqual(s.dgw, [{ gw: 5, teams: ['ARS', 'CHE'] }]);
  assert.deepEqual(s.bgw, [{ gw: 6, teams: ['LIV', 'EVE'] }], 'GW7 uten kamper for noen er ikke blank');
});

test('CHIPS er FPL-navnene i history.chips', () => {
  assert.deepEqual(CHIPS, ['bboost', '3xc', 'freehit', 'wildcard']);
});

// ---- buildChipPlan ----------------------------------------------------------

// Troppen: ARS 5 (én keeper), CHE 4, LIV 4, EVE 2 — 15 spillere.
const squad = [
  { team: 1, element_type: 1 }, { team: 1, element_type: 2 }, { team: 1, element_type: 3 },
  { team: 1, element_type: 3 }, { team: 1, element_type: 4 },
  { team: 2, element_type: 2 }, { team: 2, element_type: 2 }, { team: 2, element_type: 3 }, { team: 2, element_type: 4 },
  { team: 3, element_type: 2 }, { team: 3, element_type: 3 }, { team: 3, element_type: 3 }, { team: 3, element_type: 4 },
  { team: 4, element_type: 1 }, { team: 4, element_type: 2 },
];
const events = Array.from({ length: 38 }, (_, i) => ({ id: i + 1 }));
const plan = (extra = {}) =>
  buildChipPlan({ events, fixtures, teams, squad, chipsUsed: [], fromGw: 4, bootstrapChips, ...extra });

test('buildChipPlan anbefaler Bench Boost i dobbelrunden med lavest FDR', () => {
  const p = plan();
  const bb = p.halves[0].chips.bboost;
  assert.equal(bb.used, null);
  // bb(5) = 5·8 + 4·5 + 4·4 + 2·3 = 82 slår bb(8) = 48 og bb(4) = 46.
  assert.equal(bb.rec.gw, 5);
  assert.equal(bb.rec.squadFixtures, 24);
  assert.deepEqual(bb.rec.dgwClubs, ['ARS', 'CHE']);
  assert.ok(Math.abs(bb.rec.avgFdr - 62 / 24) < 1e-9, `avgFdr ${bb.rec.avgFdr}`);
});

test('buildChipPlan foretrekker dobbelrunde for Triple Captain og hopper over keeperklubber', () => {
  const tc = plan().halves[0].chips['3xc'];
  assert.equal(tc.rec.gw, 5);
  assert.equal(tc.rec.teamShort, 'ARS');
  assert.equal(tc.rec.fixtures.length, 2);
  assert.deepEqual(tc.rec.fixtures.map((f) => f.opponent), ['CHE', 'LIV']);

  // Har troppen bare keeperen fra ARS, kan ikke ARS anbefales som kaptein.
  const keeperOnly = squad.filter((p) => p.team !== 1 || p.element_type === 1);
  const tc2 = plan({ squad: keeperOnly }).halves[0].chips['3xc'];
  assert.notEqual(tc2.rec.teamShort, 'ARS');
  assert.equal(tc2.rec.teamShort, 'CHE');
  assert.equal(tc2.rec.gw, 5);
});

test('buildChipPlan anbefaler Free Hit bare når minst fire i troppen er blanke', () => {
  const fh = plan().halves[0].chips.freehit;
  assert.equal(fh.rec.gw, 6);
  assert.equal(fh.rec.blankPlayers, 6);
  assert.deepEqual(fh.rec.blankClubs, ['LIV', 'EVE']);

  // Bare tre blanke spillere (LIV 1 + EVE 2) → ingen anbefaling, men en grunn.
  const fewBlank = squad.filter((p) => p.team !== 3).concat([{ team: 3, element_type: 3 }]);
  const fh2 = plan({ squad: fewBlank }).halves[0].chips.freehit;
  assert.equal(fh2.rec, null);
  assert.match(fh2.reason, /blankrunde/i);
});

test('buildChipPlan legger Wildcard rett etter troppens tyngste 3-rundersvindu', () => {
  // Standardprogrammet har ingen tung periode (maks snitt 3,09 < 3,3).
  const wc0 = plan().halves[0].chips.wildcard;
  assert.equal(wc0.rec, null);
  assert.match(wc0.reason, /tung periode/i);

  // GW 11–13 er blytunge (FDR 5/5/4), fra GW 14 blir alt lett.
  const tough = [];
  const both = (gw, hd, ad) => tough.push(fx(gw, 1, 2, hd, ad), fx(gw, 3, 4, hd, ad));
  both(10, 2, 2); both(11, 5, 5); both(12, 5, 5); both(13, 4, 4);
  both(14, 2, 2); both(15, 2, 2); both(16, 2, 2); both(17, 2, 2); both(18, 3, 3); both(19, 3, 3);
  const wc = plan({ fixtures: tough, fromGw: 10 }).halves[0].chips.wildcard;
  assert.deepEqual(wc.rec.badRun, { from: 11, to: 13, avgFdr: 14 / 3 });
  assert.equal(wc.rec.gw, 14);
  assert.equal(wc.rec.until, 17, 'fire lette runder (snitt 2) slår fem (2,2) og seks (2,33)');
  assert.equal(wc.rec.bestClubs.length, 4);
  assert.equal(wc.rec.bestClubs[0].avgFdr, 2);
});

test('buildChipPlan markerer brukte chips per halvdel og gir dem ingen anbefaling', () => {
  const p = plan({ chipsUsed: [{ name: 'bboost', event: 3 }, { name: 'wildcard', event: 22 }] });
  assert.deepEqual(p.halves[0].chips.bboost.used, { event: 3 });
  assert.equal(p.halves[0].chips.bboost.rec, null);
  assert.equal(p.halves[0].chips.wildcard.used, null);
  assert.deepEqual(p.halves[1].chips.wildcard.used, { event: 22 });
  assert.equal(p.halves[1].chips.bboost.used, null);
  // Andre halvdel har ikke kjent kampprogram ennå → ingen anbefaling, men grunn.
  assert.equal(p.halves[1].chips.bboost.rec, null);
  assert.match(p.halves[1].chips.bboost.reason, /kampprogram/i);
});

test('describeRec forklarer anbefalingen på norsk med tall fra rec', () => {
  const p = plan();
  const c = p.halves[0].chips;
  assert.equal(describeRec('bboost', c.bboost.rec), '24 kamper i troppen, snitt-FDR 2,6 · dobbel: ARS, CHE');
  assert.equal(describeRec('3xc', c['3xc'].rec), 'ARS: CHE (h), LIV (b)');
  assert.equal(describeRec('freehit', c.freehit.rec), '6 i troppen er blanke (LIV, EVE)');
  assert.equal(
    describeRec('wildcard', { gw: 14, until: 17, badRun: { from: 11, to: 13, avgFdr: 14 / 3 }, bestClubs: [{ short: 'ARS', avgFdr: 2 }, { short: 'CHE', avgFdr: 2.2 }] }),
    'etter tung periode runde 11–13 (FDR 4,7) · beste program: ARS, CHE',
  );
  assert.equal(describeRec('bboost', null), '');
});

test('buildChipPlan uten spesialrunder gir noSpecial og fortsatt BB/TC/WC', () => {
  const singles = fixtures.filter((f) => f.event === 4 || f.event === 8);
  const p = plan({ fixtures: singles });
  assert.equal(p.noSpecial, true);
  assert.deepEqual(p.dgw, []);
  assert.deepEqual(p.bgw, []);
  const c = p.halves[0].chips;
  assert.equal(c.bboost.rec.gw, 8, 'bb(8)=48 slår bb(4)=46');
  // ARS har ease 4 i både GW4 og GW8 (LIV også 4 i GW8): likhet → tidligste runde.
  assert.equal(c['3xc'].rec.gw, 4);
  assert.equal(c['3xc'].rec.teamShort, 'ARS');
  assert.equal(c.freehit.rec, null);
  assert.equal(typeof c.wildcard.reason, 'string');
  assert.equal(p.fromGw, 4);
});
