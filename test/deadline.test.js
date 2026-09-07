import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTransfers, buildDeadlineCheck, deadlineCheckText } from '../src/services/deadline.js';
import { STATUS_LABELS } from '../src/services/analysis.js';

// Tropp for runde 2 (picks N−1) som sjekkes mot runde 3.
const teamsById = new Map([
  [1, { id: 1, short_name: 'MCI', code: 43 }],
  [2, { id: 2, short_name: 'ARS', code: 3 }],
  [3, { id: 3, short_name: 'LIV', code: 14 }],
]);

const el = (id, name, team, over = {}) => [id, {
  id, web_name: name, team, element_type: 3, status: 'a', news: '', chance_of_playing_next_round: null, ...over,
}];

const baseElements = () => new Map([
  el(1, 'Haaland', 1, { element_type: 4 }),
  el(2, 'Saka', 2),
  el(3, 'Salah', 3),
  el(4, 'Raya', 2, { element_type: 1 }),
  el(5, 'Gabriel', 2, { element_type: 2 }),
  el(6, 'Benk', 3),
  el(99, 'Isak', 3, { element_type: 4 }),
]);

const pick = (element, position, over = {}) => ({
  element, position, multiplier: position <= 11 ? 1 : 0, is_captain: false, is_vice_captain: false, ...over,
});

const basePicks = () => ({
  active_chip: null,
  picks: [
    pick(4, 1), pick(5, 2), pick(2, 3), pick(3, 4),
    pick(1, 5, { is_captain: true, multiplier: 2 }),
    pick(6, 12),
  ],
});

const event = { id: 3, name: 'Gameweek 3', deadline_time: '2026-09-12T10:00:00Z' };
// Alle tre klubbene spiller i runde 3.
const fixturesForGw = [
  { event: 3, team_h: 1, team_a: 2 },
  { event: 3, team_h: 3, team_a: 1 },
];
const entryHistory = {
  current: [
    { event: 1, event_transfers: 0, event_transfers_cost: 0 },
    { event: 2, event_transfers: 0, event_transfers_cost: 0 },
  ],
};

const check = (over = {}) =>
  buildDeadlineCheck({
    picks: basePicks(),
    transfersForGw: [],
    elementsById: baseElements(),
    fixturesForGw,
    teamsById,
    entryHistory,
    chips: [],
    event,
    ...over,
  });

test('applyTransfers bytter ut solgt spiller og lar den nye arve plassen', () => {
  const picks = basePicks();
  const before = JSON.stringify(picks);
  const out = applyTransfers(picks, [
    { element_out: 1, element_in: 99, event: 3 },
    { element_out: 555, element_in: 556, event: 3 }, // ikke i troppen — ignoreres
  ]);
  const isak = out.picks.find((p) => p.element === 99);
  assert.ok(isak, 'Isak skulle vært inne');
  assert.equal(isak.position, 5);
  assert.equal(isak.is_captain, true, 'rollen arves');
  assert.ok(!out.picks.some((p) => p.element === 1), 'Haaland skulle vært ute');
  assert.equal(out.picks.length, 6);
  assert.equal(JSON.stringify(picks), before, 'input skal ikke muteres');
});

test('buildDeadlineCheck flagger suspendert starter', () => {
  const elements = baseElements();
  elements.get(3).status = 's';
  elements.get(3).news = 'Suspended until 20 Sep';
  const c = check({ elementsById: elements });
  assert.equal(c.ok, false);
  assert.equal(c.findings.length, 1);
  assert.equal(c.findings[0].type, 'ute');
  assert.deepEqual(c.findings[0].player, { id: 3, name: 'Salah', teamShort: 'LIV', teamCode: 14 });
  assert.ok(c.findings[0].detail.startsWith(STATUS_LABELS.s), c.findings[0].detail);
});

test('buildDeadlineCheck flagger usikker starter først ved ≤ 50 % spillesjanse', () => {
  const e75 = baseElements();
  e75.get(2).status = 'd';
  e75.get(2).chance_of_playing_next_round = 75;
  assert.equal(check({ elementsById: e75 }).findings.length, 0, '75 % er ikke et funn');

  const e50 = baseElements();
  e50.get(2).status = 'd';
  e50.get(2).chance_of_playing_next_round = 50;
  const c = check({ elementsById: e50 });
  assert.equal(c.findings.length, 1);
  assert.equal(c.findings[0].type, 'tvilsom');
  assert.match(c.findings[0].detail, /50 %/);
});

test('buildDeadlineCheck flagger kaptein og vise med status ulik a — kaptein først', () => {
  const elements = baseElements();
  elements.get(1).status = 'd'; // kaptein, 75 % — ikke tvilsom-funn, men kaptein-funn
  elements.get(1).chance_of_playing_next_round = 75;
  elements.get(2).status = 'i'; // vise + starter
  const picks = basePicks();
  picks.picks.find((p) => p.element === 2).is_vice_captain = true;
  const c = check({ elementsById: elements, picks });
  assert.deepEqual(c.findings.map((f) => f.type), ['kaptein', 'vise', 'ute']);
  assert.equal(c.findings[0].player.name, 'Haaland');
  assert.equal(c.findings[1].player.name, 'Saka');
  assert.equal(c.findings[2].player.name, 'Saka');
});

test('buildDeadlineCheck flagger starter uten kamp i runden, aldri benken', () => {
  // Bare MCI–ARS spiller: LIV (Salah som starter, Benk på benken) er blank.
  const c = check({ fixturesForGw: [{ event: 3, team_h: 1, team_a: 2 }] });
  assert.equal(c.findings.length, 1);
  assert.equal(c.findings[0].type, 'blank');
  assert.equal(c.findings[0].player.name, 'Salah');
  assert.equal(c.findings[0].player.teamShort, 'LIV');
  assert.equal(c.findings[0].detail, 'har ingen kamp i runden');
});

test('buildDeadlineCheck gir ok og tom liste når troppen er ren', () => {
  const c = check();
  assert.equal(c.ok, true);
  assert.deepEqual(c.findings, []);
  assert.equal(c.gw, 3);
  assert.equal(c.gwName, 'Runde 3');
  assert.equal(c.deadline, event.deadline_time);
  assert.match(c.basis, /runde 2/);
});

test('footer teller gratisbytter fra ledger minus gjorte bytter, og ukjent når ledgeren er ugyldig', () => {
  const c = check({ transfersForGw: [{ element_out: 1, element_in: 99, event: 3 }] });
  // Etter GW1 og GW2 uten bytter: 2 gratisbytter inn i runde 3, ett brukt.
  assert.deepEqual(c.footer, { freeTransfers: 1, transfersMade: 1, activeChip: null });
  // Byttet er påført: Isak sjekkes, ikke Haaland.
  assert.ok(!c.findings.some((f) => f.player.id === 1));

  const broken = { current: [{ event: 1, event_transfers: 0, event_transfers_cost: 0 }, { event: 2, event_transfers: 0, event_transfers_cost: 4 }] };
  const c2 = check({ entryHistory: broken });
  assert.equal(c2.footer.freeTransfers, null);

  const picks = basePicks();
  picks.active_chip = 'bboost';
  assert.equal(check({ picks }).footer.activeChip, 'bboost');
});

test('deadlineCheckText nevner deadline, grunnlag, hvert funn og footeren', () => {
  const elements = baseElements();
  elements.get(1).status = 'd';
  elements.get(1).chance_of_playing_next_round = 50;
  elements.get(1).news = 'Knock - 50% chance of playing';
  const c = check({ elementsById: elements, fixturesForGw: [{ event: 3, team_h: 1, team_a: 2 }] });
  const text = deadlineCheckText(c, 3);
  assert.ok(text.startsWith('**Lagsjekk — Runde 3**'), text);
  assert.match(text, /deadline om 3 t/);
  assert.ok(text.includes('https://fpl.marsk.no/brief'));
  assert.match(text, /Grunnlag: laget fra runde 2 \+ byttene dine for runde 3/);
  assert.match(text, /- Kaptein: Haaland \(MCI\) er Usikker/);
  assert.match(text, /- Haaland \(MCI\) er Usikker — 50 % sjanse/);
  assert.match(text, /- Salah \(LIV\) har ingen kamp i runden/);
  assert.match(text, /_Gratisbytter igjen: 2 \(0 brukt\) · Chip: ingen_/);
});

// ---- v1.14.0 (T7): låneklausul + nyhetsdato --------------------------------

test('buildDeadlineCheck gir funnet klausul når en starter har scout_risks for runden — og ikke for andre runder', () => {
  const elements = baseElements();
  elements.set(2, {
    ...elements.get(2),
    scout_risks: [
      { property: 'loan_ineligible', gameweek: 3, notes: 'This player will not be available to face their parent club in Gameweek 12.' },
      { property: 'loan_ineligible', gameweek: 27, notes: 'senere runde' },
    ],
  });
  const funn = check({ elementsById: elements }).findings;
  assert.deepEqual(funn.map((f) => f.type), ['klausul']);
  assert.equal(funn[0].player.name, 'Saka');
  assert.match(funn[0].detail, /moderklubben/, 'notes fra FPL er upålitelig — vi skriver teksten selv');

  // Klausul i en annen runde skal ikke gi funn i denne.
  const annen = baseElements();
  annen.set(2, { ...annen.get(2), scout_risks: [{ property: 'loan_ineligible', gameweek: 16 }] });
  assert.deepEqual(check({ elementsById: annen }).findings, []);

  // Benken (posisjon 12) sjekkes aldri.
  const benk = baseElements();
  benk.set(6, { ...benk.get(6), scout_risks: [{ property: 'loan_ineligible', gameweek: 3 }] });
  assert.deepEqual(check({ elementsById: benk }).findings, []);

  // Andre risikotyper er ikke låneklausul.
  const annenType = baseElements();
  annenType.set(2, { ...annenType.get(2), scout_risks: [{ property: 'noe_annet', gameweek: 3 }] });
  assert.deepEqual(check({ elementsById: annenType }).findings, []);
});

test('deadlineCheckText skriver klausul-linja uten «er»', () => {
  const elements = baseElements();
  elements.set(2, { ...elements.get(2), scout_risks: [{ property: 'loan_ineligible', gameweek: 3 }] });
  const tekst = deadlineCheckText(check({ elementsById: elements }), 3);
  assert.match(tekst, /- Saka \(ARS\) kan ikke møte moderklubben/, 'linja skal ikke få «er» foran');
  assert.ok(!/Saka \(ARS\) er kan ikke/.test(tekst));
});

test('statusDetail tar med når nyheten ble meldt', () => {
  const elements = baseElements();
  elements.set(2, {
    ...elements.get(2),
    status: 'i',
    news: 'Groin injury - Unknown return date',
    news_added: '2026-07-23T12:01:23Z',
  });
  const funn = check({ elementsById: elements }).findings;
  assert.equal(funn[0].type, 'ute');
  assert.match(funn[0].detail, /\(meldt .*juli\)$/, 'datoen står bakerst i detaljen');

  // news_added uten news gir ingen dato — og null skal ikke kaste.
  const uten = baseElements();
  uten.set(2, { ...uten.get(2), status: 'i', news: '', news_added: null });
  assert.ok(!/meldt/.test(check({ elementsById: uten }).findings[0].detail));
});
