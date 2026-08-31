import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// public/app.js er et vanlig script, ikke en modul. Vi kjører det i en vm med
// et minimalt DOM-stub: alle modulene returnerer tidlig fordi elementene ikke
// finnes, og de delte hjelperne på filnivå blir liggende i konteksten.
function loadAppScript() {
  const code = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const noop = () => {};
  const context = {
    console,
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: noop,
    },
    window: { addEventListener: noop },
    setInterval: noop,
    clearInterval: noop,
    setTimeout: noop,
    clearTimeout: noop,
    fetch: noop,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  // const/let på toppnivå havner i kontekstens leksikalske scope, ikke på
  // globalobjektet — de leses derfor med et uttrykk.
  context.evaluate = (expression) => vm.runInContext(expression, context);
  return context;
}

const app = loadAppScript();

test('escapeHtml escaper også anførselstegn', () => {
  assert.equal(app.escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(app.escapeHtml('Nott\'m & "Co"'), 'Nott&#39;m &amp; &quot;Co&quot;');
  assert.equal(app.escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml takler verdier som ikke er strenger', () => {
  assert.equal(app.escapeHtml(42), '42');
  assert.equal(app.escapeHtml(null), 'null');
});

// ---- P0-3: live-polling skal våkne ved avspark og aldri polle utenfor ------

test('polleintervallet er minst 55 sekunder', () => {
  const pollMs = app.evaluate('LIVE_POLL_MS');
  assert.ok(pollMs >= 55000, `LIVE_POLL_MS=${pollMs}`);
});

test('nextWakeupDelay venter til avspark pluss buffer når ingen kamper pågår', () => {
  const now = Date.parse('2026-08-22T12:00:00Z');
  const delay = app.nextWakeupDelay(
    { anyLive: false, nextKickoff: '2026-08-22T14:00:00Z' },
    now,
    30000,
  );
  assert.equal(delay, 2 * 60 * 60_000 + 30000);
});

test('nextWakeupDelay gir 0 når avsparket alt er passert', () => {
  const now = Date.parse('2026-08-22T14:05:00Z');
  assert.equal(
    app.nextWakeupDelay({ anyLive: false, nextKickoff: '2026-08-22T14:00:00Z' }, now, 30000),
    0,
  );
});

test('nextWakeupDelay gir null når kamper pågår eller avspark er ukjent', () => {
  const now = Date.now();
  assert.equal(app.nextWakeupDelay({ anyLive: true, nextKickoff: '2026-08-22T14:00:00Z' }, now, 30000), null);
  assert.equal(app.nextWakeupDelay({ anyLive: false, nextKickoff: null }, now, 30000), null);
  assert.equal(app.nextWakeupDelay({ anyLive: false, nextKickoff: 'tull' }, now, 30000), null);
  assert.equal(app.nextWakeupDelay(null, now, 30000), null);
});

// ---- v1.3.0: tema ----------------------------------------------------------
// Inline-scriptet i layout.ejs speiler resolveTheme(); app.js eier bryteren.

test('resolveTheme bruker lagret valg foran systemet', () => {
  assert.equal(app.resolveTheme('light', false), 'light');
  assert.equal(app.resolveTheme('dark', true), 'dark');
});

test('resolveTheme faller tilbake på systemet når ingenting gyldig er lagret', () => {
  assert.equal(app.resolveTheme(null, true), 'light');
  assert.equal(app.resolveTheme(null, false), 'dark');
  assert.equal(app.resolveTheme('tull', true), 'light');
  assert.equal(app.resolveTheme(undefined, false), 'dark');
});

test('nextMode sykler auto → light → dark → auto', () => {
  assert.equal(app.nextMode('auto'), 'light');
  assert.equal(app.nextMode('light'), 'dark');
  assert.equal(app.nextMode('dark'), 'auto');
  assert.equal(app.nextMode('ukjent'), 'auto');
});

test('THEME_LABELS har norsk etikett for alle tre modusene', () => {
  const labels = app.evaluate('THEME_LABELS');
  assert.deepEqual(Object.keys(labels).sort(), ['auto', 'dark', 'light']);
  assert.match(labels.auto, /^Tema: automatisk/);
  assert.equal(labels.light, 'Tema: lyst');
  assert.equal(labels.dark, 'Tema: mørkt');
});

test('clubBadgeHtml escaper kortnavnet og skriver versjonert bilde eller plassholder', () => {
  const withImg = app.clubBadgeHtml('ARS', 3, '2627', 'md');
  assert.ok(withImg.includes('<span class="club club--md">'));
  assert.ok(withImg.includes('src="/img/clubs/t3.png?v=2627"'));
  assert.ok(withImg.includes('<span class="club-name">ARS</span>'));
  const noImg = app.clubBadgeHtml('<b>', null, '2627');
  assert.ok(noImg.includes('club-fallback'));
  assert.ok(noImg.includes('&lt;b&gt;'));
  assert.ok(!noImg.includes('<img'));
});

// NB: objekter fra vm-konteksten har en annen realms prototyper — deepEqual
// fra assert/strict feiler på dem. Sammenlign derfor JSON-strenger.
test('edgeFadeState viser fade kun mot skjult innhold', () => {
  assert.equal(app.evaluate('JSON.stringify(edgeFadeState(0, 800, 400))'), '{"left":false,"right":true}');
  assert.equal(app.evaluate('JSON.stringify(edgeFadeState(396, 800, 400))'), '{"left":true,"right":false}');
});

test('edgeFadeState er nøytral uten overflow og dobbel midt i', () => {
  assert.equal(app.evaluate('JSON.stringify(edgeFadeState(0, 400, 400))'), '{"left":false,"right":false}');
  assert.equal(app.evaluate('JSON.stringify(edgeFadeState(200, 800, 400))'), '{"left":true,"right":true}');
});

test('plannerRules speiler posisjon, budsjett og klubbtak', () => {
  const rules = app.evaluate(`plannerRules({
    out: { id: 4, pos: 4, sellPrice: 88, lagKode: 7 },
    inn: { pos: 4, pris: 100, lagKode: 43 },
    bank: 15,
    squad: [
      { id: 1, lagKode: 43 }, { id: 2, lagKode: 43 },
      { id: 3, lagKode: 43 }, { id: 4, lagKode: 7 },
    ],
  })`);
  assert.equal(rules.find((r) => r.kode === 'posisjon').ok, true);
  assert.equal(rules.find((r) => r.kode === 'budsjett').ok, true); // 88 + 15 >= 100
  assert.equal(rules.find((r) => r.kode === 'klubbtak').ok, false); // fjerde fra klubb 43
});

test('plannerRules uten kjent salgspris lar budsjettet staa aapent', () => {
  const rules = app.evaluate(`plannerRules({
    out: { id: 4, pos: 4, sellPrice: null, lagKode: 7 },
    inn: { pos: 4, pris: 100, lagKode: 4 },
    bank: 15,
    squad: [{ id: 4, lagKode: 7 }],
  })`);
  assert.equal(rules.find((r) => r.kode === 'budsjett').ok, null);
});

// ---- v1.6.0 Modul 9: rival-valget paa /liga huskes -------------------------

test('rivalNavAction lagrer rival fra query-parameteren', () => {
  assert.deepEqual(
    { ...app.rivalNavAction({ search: '?rival=456', stored: null, validIds: new Set(['456', '789']) }) },
    { type: 'store', value: '456' },
  );
});

test('rivalNavAction redirecter til lagret rival naar param mangler', () => {
  assert.deepEqual(
    { ...app.rivalNavAction({ search: '', stored: '456', validIds: new Set(['456']) }) },
    { type: 'redirect', to: '/liga?rival=456' },
  );
});

test('rivalNavAction redirecter aldri naar param er til stede (ingen loop)', () => {
  const res = app.rivalNavAction({ search: '?rival=789', stored: '456', validIds: new Set(['456', '789']) });
  assert.deepEqual({ ...res }, { type: 'store', value: '789' });
});

test('rivalNavAction rydder lagret rival som ikke finnes i ligaen lenger', () => {
  assert.deepEqual(
    { ...app.rivalNavAction({ search: '', stored: '999', validIds: new Set(['456']) }) },
    { type: 'clear' },
  );
  assert.deepEqual(
    { ...app.rivalNavAction({ search: '', stored: null, validIds: new Set(['456']) }) },
    { type: 'none' },
  );
});

// ---- v1.7.1: sortering og filtrering som rene hjelpere --------------------

test('compareCells sorterer tall numerisk og tekst med norsk locale', () => {
  assert.ok(app.compareCells('9', '10', 'num') < 0, '9 skal foran 10 numerisk');
  assert.ok(app.compareCells('Ødegaard', 'Aina', 'text') > 0, 'Ø etter A på norsk');
  assert.equal(app.compareCells('abc', 'def', 'num'), 0, 'ikke-tall teller som 0');
});

test('rowMatchesFilters krever at alle aktive filtre treffer', () => {
  const ds = { name: 'haaland', pos: '4', team: '13', price: '14.1', status: 'a' };
  assert.equal(app.rowMatchesFilters(ds, {}), true);
  assert.equal(app.rowMatchesFilters(ds, { q: 'haa' }), true);
  assert.equal(app.rowMatchesFilters(ds, { q: 'salah' }), false);
  assert.equal(app.rowMatchesFilters(ds, { pos: '4', status: 'a' }), true);
  assert.equal(app.rowMatchesFilters(ds, { status: 'i' }), false);
  assert.equal(app.rowMatchesFilters(ds, { maxPrice: 14 }), false);
  assert.equal(app.rowMatchesFilters(ds, { maxPrice: 14.5, team: '13' }), true);
});

test('queryParam leser og dekoder verdien fra søkestrengen', () => {
  assert.equal(app.queryParam('?sok=Haaland&pos=4', 'sok'), 'Haaland');
  assert.equal(app.queryParam('?sok=De%20Bruyne', 'sok'), 'De Bruyne');
  assert.equal(app.queryParam('?sok=Luis+D%C3%ADaz', 'sok'), 'Luis Díaz');
  assert.equal(app.queryParam('', 'sok'), null);
});

// ---- v1.8.0: spillerkort-modalen ------------------------------------------

// Navnene kommer fra FPL og rendres klientside — samme trussel som lagnavnene
// i live.ejs. Alt som skrives inn i modalen skal escapes.
const kort = (over = {}) => ({
  id: 411,
  navn: 'Haaland',
  fulltNavn: 'Erling Haaland',
  lag: { navn: 'Man City', kort: 'MCI', kode: 43, id: 13 },
  posisjon: 'Angrep', posKort: 'A', erKeeper: false,
  pris: '14.1', eid: '69.8', form: '6.0',
  totalPoeng: 32, poengPerKamp: '6.0',
  xg: '2.40', xa: '0.60', minutter: 180,
  status: 'a', statusTekst: 'Klar', nytt: null, spillesjanse: null,
  dodball: { straffer: null, hjorner: null, frispark: null },
  sisteKamper: [
    { runde: 2, motstander: 'ARS', hjemme: true, poeng: 12, minutter: 90, mal: 2, assists: 0, xg: '1.47', xa: '0.20', bonus: 3 },
  ],
  kommende: [{ runde: 3, motstander: 'LIV', hjemme: false, fdr: 4 }],
  dataAlder: 12,
  ...over,
});

test('playerCardHtml escaper navn og nyhetstekst', () => {
  const html = app.playerCardHtml(
    kort({
      navn: '<script>x</script>',
      fulltNavn: '<script>x</script>',
      nytt: '<b>Ankelskade</b>',
      sisteKamper: [{ runde: 2, motstander: '"><img>', hjemme: true, poeng: 1, minutter: 5, mal: 0, assists: 0, xg: '0.00', xa: '0.00', bonus: 0 }],
    }),
    '<span class="shirt"></span>',
  );

  assert.ok(!html.includes('<script>'), 'uescapet script-tag i modalen');
  assert.ok(!html.includes('<b>Ankelskade</b>'), 'uescapet nyhetstekst');
  assert.ok(!html.includes('"><img>'), 'uescapet motstandernavn');
  assert.ok(html.includes('&lt;script&gt;'));
  // Drakta kommer fra en server-rendret template og settes inn rå.
  assert.ok(html.includes('<span class="shirt"></span>'));
});

test('playerCardHtml gir kommende kamper FDR-klassen fra fdr-verdien', () => {
  const html = app.playerCardHtml(
    kort({ kommende: [
      { runde: 3, motstander: 'LIV', hjemme: false, fdr: 5 },
      { runde: 4, motstander: 'ARS', hjemme: true, fdr: 2 },
    ] }),
    '',
  );

  assert.match(html, /fdr-5/);
  assert.match(html, /fdr-2/);
});

test('playerCardHtml viser tomtilstand når spilleren ikke har spilt', () => {
  const html = app.playerCardHtml(kort({ sisteKamper: [] }), '');

  assert.match(html, /Ingen spilte kamper ennå/);
  assert.match(html, /6\.0/, 'nøkkeltallene skal vises uansett');
});

test('playerCardHtml lister bare dødballroller som faktisk er satt', () => {
  const html = app.playerCardHtml(
    kort({ dodball: { straffer: 1, hjorner: null, frispark: 3 } }),
    '',
  );

  assert.match(html, /Straffer: 1\. valg/);
  assert.match(html, /Direkte frispark: 3\. valg/);
  assert.ok(!html.includes('Hjørner'), 'tom rolle skal ikke vises');
});

test('playerCardHtml utelater dødball-seksjonen helt uten roller', () => {
  const html = app.playerCardHtml(kort(), '');
  assert.ok(!html.includes('Dødball'), 'ingen roller → ingen seksjon');
});
