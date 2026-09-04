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

// v1.12.0: SW-registreringen bruker asset-hashen som ?v — ny URL per deploy gir
// ny registrering, uavhengig av hva Cloudflare måtte ha cachet.
test('swRegistrationUrl bygger /sw.js?v=<hash> og gir null uten versjon', () => {
  assert.equal(app.swRegistrationUrl('a1b2c3d4'), '/sw.js?v=a1b2c3d4');
  assert.equal(app.swRegistrationUrl(''), null);
  assert.equal(app.swRegistrationUrl(null), null);
});

test('app.js registrerer service workeren med updateViaCache none og aldri uten navigator', () => {
  const code = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const block = code.slice(code.indexOf('serviceWorker'));
  assert.ok(block.length > 0, 'ingen SW-registrering i app.js');
  assert.match(code, /'serviceWorker' in navigator/, 'registreringen må være bak en navigator-guard');
  assert.match(block, /meta\[name="fpl-asset-version"\]/, 'asset-versjonen leses fra meta-taggen');
  assert.match(block, /updateViaCache:\s*'none'/, 'SW-kilden skal aldri hentes fra HTTP-cachen');
  assert.match(block, /addEventListener\('load'/, 'registreringen venter til load');
});

// v1.11.0: bonuskampen rendres klientside per kamp (matches fylles av render()).
test('bpsRaceHtml escaper navn, markerer mine og viser estimat-merket', () => {
  const match = {
    bpsTop: [
      { id: 1, name: '<b>X</b>', teamShort: 'ARS', bps: 30, bonus: 3, mine: true },
      { id: 2, name: 'Y', teamShort: 'CHE', bps: 20, bonus: 0, mine: false },
    ],
    bpsSource: 'estimat',
  };
  const html = app.bpsRaceHtml(match);
  assert.ok(html.includes('&lt;b&gt;X&lt;/b&gt;'), 'navnet skal escapes');
  assert.ok(!html.includes('<b>X</b>'), 'rå HTML slapp gjennom');
  assert.ok(html.includes('class="bps-row bps-mine"'), 'mine spillere markeres');
  assert.ok(html.includes('estimat'), 'estimat-merket mangler');
  assert.ok(html.includes('+3'), 'bonusen vises med fortegn');
  assert.ok(html.includes('class="bps-race"'), 'wrapperen mangler');
  const fpl = app.bpsRaceHtml({ ...match, bpsSource: 'fpl' });
  assert.ok(fpl.includes('FPL') && !fpl.includes('estimat'), 'publisert bonus merkes som FPL');
  assert.equal(app.bpsRaceHtml({ bpsTop: [], bpsSource: null }), '', 'tom før avspark');
  assert.equal(app.bpsRaceHtml({}), '', 'tåler kamp uten feltene');
});

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

// v1.13.2 (fiks 2): 686 rader × ~20 data-attributter ga 13 544 DOM-noder og
// 957 kB på /spillere. `content-visibility` har ingen effekt på tabellrader
// (size containment gjelder ikke table-interne bokser), så taket ligger i
// klienten: de 100 første treffene vises, resten bak «Vis alle».
test('rowLimit kapper til taket og teller resten', () => {
  // Spredning flytter objektet inn i denne realmen: vm-konteksten har sin egen
  // Object.prototype, og deepStrictEqual sammenligner prototyper.
  const r = (...a) => ({ ...app.rowLimit(...a) });
  assert.deepEqual(r(652, 100, false), { shown: 100, hidden: 552 });
  assert.deepEqual(r(30, 100, false), { shown: 30, hidden: 0 });
  assert.deepEqual(r(652, 100, true), { shown: 652, hidden: 0 });
  assert.deepEqual(r(0, 100, false), { shown: 0, hidden: 0 });
});

test('rad-taket på /spillere er 100', () => {
  assert.equal(app.evaluate('PLAYER_ROW_LIMIT'), 100);
});

// v1.13.2 (fiks 5): poll() svelget feil stille — «Sist oppdatert 12:30:05» ble
// stående mens tallene under var minutter gamle.
test('liveUpdatedText skiller mellom fersk henting og mistet kontakt', () => {
  assert.equal(app.liveUpdatedText(true, '12:30:05'), 'Sist oppdatert 12:30:05');
  assert.equal(
    app.liveUpdatedText(false, '12:30:05'),
    'Får ikke kontakt — prøver igjen om 1 min (sist OK 12:30:05)',
  );
  assert.equal(app.liveUpdatedText(false, null), 'Får ikke kontakt — prøver igjen om 1 min');
});

// v1.13.2 (fiks 9): «Ingen kamper pågår akkurat nå» sa ingenting om når det
// smeller igjen. nextKickoff finnes alt i /api/live.json.
test('liveStatusText viser neste avspark mellom runder', () => {
  assert.equal(app.liveStatusText({ anyLive: true, nextKickoff: null }), 'Kamper pågår');
  assert.equal(app.liveStatusText({ anyLive: false, nextKickoff: null }), 'Ingen kamper pågår akkurat nå');
  assert.equal(app.liveStatusText({ anyLive: false, nextKickoff: 'tull' }), 'Ingen kamper pågår akkurat nå');

  const t = app.liveStatusText({ anyLive: false, nextKickoff: '2026-09-04T19:00:00Z' });
  assert.ok(t.startsWith('Ingen kamper pågår — neste avspark '), t);
  assert.ok(t.includes(' kl. '), t);
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
  // Navnet eies av modaltittelen (v1.8.1) — nyhetsteksten er escapet her.
  assert.match(html, /&lt;b&gt;Ankelskade&lt;\/b&gt;/);
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

test('playerCardHtml lar modaltittelen eie navnet — ingen dublett i brødteksten', () => {
  const html = app.playerCardHtml(kort(), '');

  assert.ok(!html.includes('Erling Haaland'), 'navnet står allerede i modaltittelen');
  assert.doesNotMatch(html, /kort-navn/);
  assert.match(html, /Man City · Angrep · £14\.1m/, 'linja under drakta består');
});

test('playerCardHtml vekter Form, Poeng og P/K over de sekundære tallene', () => {
  const html = app.playerCardHtml(kort(), '');

  assert.equal((html.match(/kort-stat--stor/g) ?? []).length, 3, 'tre primærtall');
  assert.match(html, /class="kort-stat kort-stat--stor"><span class="kort-stat-navn">Form</);
  assert.match(html, /class="kort-stat"><span class="kort-stat-navn">Eid %</);
});

// ---- v1.8.0: spillerduellen ----------------------------------------------

// Radenes dataset — tallene er strenger fra FPL, tomme dødballattributter
// betyr «ingen rolle».
const ds = (over = {}) => ({
  id: '1', navn: 'Saka', lag: 'ARS', team: '1', pos: '3', price: '5.5',
  form: '5.5', poeng: '42', pk: '4.2', eid: '12.3',
  xg: '3.40', xa: '2.10', min: '900', bonus: '7',
  straffer: '', hjorner: '', frispark: '',
  ...over,
});

test('duelStatus åpner Sammenlign først ved nøyaktig to valgte', () => {
  // Objektet kommer fra vm-realmet, så feltene sammenlignes hver for seg.
  for (const [n, enabled] of [[0, false], [1, false], [2, true], [3, false]]) {
    const s = app.duelStatus(n);
    assert.equal(s.enabled, enabled, `${n} valgte`);
    assert.equal(s.tekst, `${n} av 2 valgt`);
  }
});

// QA-funn (økt 51): en tredje hake ble avvist uten et eneste synlig tegn.
test('duellLaas låser de ledige boksene når duellen er full', () => {
  const full = [{ checked: true }, { checked: true }, { checked: false }];
  assert.equal(app.duellLaas(full, 2), true);
  assert.deepEqual(full.map((b) => b.disabled), [false, false, true]);

  const halv = [{ checked: true, disabled: true }, { checked: false, disabled: true }];
  assert.equal(app.duellLaas(halv, 1), false);
  assert.deepEqual(halv.map((b) => b.disabled), [false, false]);
});

test('duelData beholder FPL-strengene og gjør tomme dødballfelt til null', () => {
  const d = app.duelData(ds({ straffer: '2' }));

  assert.equal(d.navn, 'Saka');
  assert.equal(d.pris, '5.5', 'prisen vises som streng, ikke som tall');
  assert.equal(d.form, '5.5');
  assert.equal(d.straffer, 2);
  assert.equal(d.hjorner, null);
  assert.equal(d.frispark, null);
  // Lag-id-en trengs for å finne riktig drakt-template til duell-hodet.
  assert.equal(d.teamId, '1');
});

test('duelWinners lar laveste pris vinne og resten høyeste', () => {
  const a = app.duelData(ds({ price: '5.5', form: '6.0', poeng: '42' }));
  const b = app.duelData(ds({ navn: 'Salah', price: '12.5', form: '4.0', poeng: '55' }));

  const w = app.duelWinners(a, b);

  assert.equal(w.pris, 'a', 'billigst vinner på pris');
  assert.equal(w.form, 'a');
  assert.equal(w.poeng, 'b');
});

test('duelWinners markerer ingen ved likhet', () => {
  const w = app.duelWinners(app.duelData(ds()), app.duelData(ds({ navn: 'Salah' })));

  for (const key of ['pris', 'form', 'poeng', 'pk', 'eid', 'xg', 'xa', 'min', 'bonus']) {
    assert.equal(w[key], null, `${key} skulle vært uavgjort`);
  }
});

test('duelWinners lar satt dødballrolle slå null, og lavest ordenstall vinne', () => {
  const a = app.duelData(ds({ straffer: '1', hjorner: '' }));
  const b = app.duelData(ds({ navn: 'Salah', straffer: '2', hjorner: '1' }));

  const w = app.duelWinners(a, b);

  assert.equal(w.straffer, 'a', 'lavest ordenstall vinner');
  assert.equal(w.hjorner, 'b', 'satt rolle slår null');

  const ingen = app.duelWinners(app.duelData(ds()), app.duelData(ds({ navn: 'Salah' })));
  assert.equal(ingen.straffer, null, 'ingen av dem har rollen');
});

test('duelHtml escaper navn og markerer vinnercellene', () => {
  const a = app.duelData(ds({ navn: '<script>x</script>', price: '5.5' }));
  const b = app.duelData(ds({ navn: 'Salah', price: '12.5' }));

  const html = app.duelHtml(a, b, app.duelWinners(a, b));

  assert.ok(!html.includes('<script>'), 'uescapet spillernavn i duellen');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong class="accent">5\.5<\/strong>/, 'billigste pris skal markeres');
  assert.ok(!html.includes('<strong class="accent">12.5</strong>'), 'taperen skal ikke markeres');
});

test('duelHtml gir hver spiller et hode med drakt, navn og klubb', () => {
  const a = app.duelData(ds());
  const b = app.duelData(ds({ navn: 'Salah', lag: 'LIV', team: '2' }));

  // Draktene er server-rendret markup fra <template>, samme kontrakt som i
  // spillerkortet: de settes inn rått, aldri escapet.
  const html = app.duelHtml(a, b, app.duelWinners(a, b), '<span class="shirt">A</span>', '<span class="shirt">B</span>');

  assert.equal((html.match(/class="duell-hode"/g) ?? []).length, 2, 'ett hode per spiller');
  assert.match(html, /<span class="shirt">A<\/span>/, 'drakta settes inn som markup');
  assert.match(html, /duell-hode-navn">Saka</);
  assert.match(html, /duell-hode-lag">LIV</);
});

test('duelHtml escaper navnet også i hodet, og takler manglende drakt', () => {
  const a = app.duelData(ds({ navn: '<script>x</script>' }));
  const b = app.duelData(ds({ navn: 'Salah' }));

  const html = app.duelHtml(a, b, app.duelWinners(a, b), '', '');

  assert.ok(!html.includes('<script>'), 'uescapet navn i duell-hodet');
  assert.match(html, /class="duell-hode"/);
});

// ---- v1.8.1: terskelvelgeren paa /spillere --------------------------------

test('terskelSynlighet viser bare den valgte terskelen', () => {
  assert.deepEqual({ ...app.terskelSynlighet('10') }, { 5: true, 10: false, 15: true });
  assert.deepEqual({ ...app.terskelSynlighet('5') }, { 5: false, 10: true, 15: true });
  assert.deepEqual({ ...app.terskelSynlighet('15') }, { 5: true, 10: true, 15: false });
});

test('terskelSynlighet sammenligner verdi, ikke type — radioverdier er strenger', () => {
  assert.deepEqual({ ...app.terskelSynlighet(10) }, { 5: true, 10: false, 15: true });
});

test('terskelSynlighet tar tersklene som finnes i markupen', () => {
  assert.deepEqual({ ...app.terskelSynlighet('15', [5, 15]) }, { 5: true, 15: false });
});

// ---- v1.8.3: tilgjengelighet i klientrendret markup -------------------------

test('klientrendrede tabeller har caption rett etter <table>', () => {
  const src = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const tables = [...src.matchAll(/<table[^>]*>([\s\S]{0,80})/g)];
  assert.ok(tables.length >= 4, `fant bare ${tables.length} tabeller i app.js`);
  for (const m of tables) {
    assert.match(m[1], /^\s*'?\s*\+?\s*'?<caption|^<caption/, `tabell uten caption: <table${m[0].slice(6, 70)}`);
  }
});

// ---- v1.8.3: sortering (Modul 2) -------------------------------------------

test('nextSortDir veksler descending → ascending og alt annet → descending', () => {
  assert.equal(app.nextSortDir('descending'), 'ascending');
  assert.equal(app.nextSortDir('ascending'), 'descending');
  assert.equal(app.nextSortDir('none'), 'descending');
  assert.equal(app.nextSortDir(null), 'descending');
});

// v1.14.0 (T2): FPLs poengoppdeling per spiller på /live — summen fikk aldri
// forklare seg selv. Teksten står i navnecellens <details>.
test('explainText formaterer oppdelingen med × for antall og gir tom streng uten data', () => {
  assert.equal(
    app.explainText([
      { label: 'Minutter', points: 2, value: 90 },
      { label: 'Mål', points: 8, value: 2 },
      { label: 'Bonus', points: 3, value: 3 },
    ]),
    'Minutter 90′ +2 · Mål ×2 +8 · Bonus +3',
    'minutter får apostrof, tellbare over 1 får ×',
  );
  assert.equal(
    app.explainText([
      { label: 'Nullere', points: 4, value: 1 },
      { label: 'Gult kort', points: -1, value: 1 },
    ]),
    'Nullere +4 · Gult kort −1',
    'verdi 1 vises uten ×, negative poeng med minustegn',
  );
  assert.equal(app.explainText([]), '');
  assert.equal(app.explainText(undefined), '');
});

test('app.js sorterer på data-sort før celletekst', () => {
  const code = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(code, /dataset\.sort \?\? /, 'applySort må lese data-sort før textContent');
  assert.match(code, /data-sort="/, 'render må sette data-sort på navnecellen');
  assert.match(code, /openExplain/, 'åpne forklaringer må huskes mellom tikkene');
});

// v1.14.0 (T5): forsvarsbidrag — poenggivende fra 2025/26, aldri vist før.
test('playerCardHtml viser forsvarsbidraget som linje med CBI, Rec og Tk', () => {
  const kort = {
    lag: { navn: 'Everton' }, posisjon: 'Forsvar', pris: '4.5', status: 'a', statusTekst: 'Klar',
    spillesjanse: null, nytt: null, form: '5.0', totalPoeng: 12, poengPerKamp: '6.0',
    eid: '3.0', xg: '0.10', xa: '0.20', minutter: 180,
    forsvar: { dc: 34, cbi: 32, rec: 4, tk: 2, per90: 17 },
    dodball: {}, sisteKamper: [], kommende: [],
  };
  const html = app.playerCardHtml(kort, '');
  assert.match(html, /Forsvarsbidrag/, 'linja mangler');
  assert.match(html, /<strong>34<\/strong>/, 'summen mangler');
  assert.match(html, /CBI 32 · Rec 4 · Tk 2/, 'delene mangler');
  assert.match(html, /17 per 90/, 'per 90 mangler');

  const uten = app.playerCardHtml({ ...kort, forsvar: { dc: 0, cbi: 0, rec: 0, tk: 0, per90: 0 } }, '');
  assert.ok(!uten.includes('Forsvarsbidrag'), 'ingen linje når spilleren ikke har bidrag');
});

// v1.14.0 (T6): spillerkort-pakka — statrad per posisjon, rank blant posisjonen,
// tidligere sesonger med prisreise, nyhetsdato og kildelenke.
const kortBase = {
  lag: { navn: 'Arsenal' }, posisjon: 'Keeper', pris: '5.5', status: 'a', statusTekst: 'Klar',
  spillesjanse: null, nytt: null, nyttMeldt: null, nyttKilde: null,
  form: '5.0', totalPoeng: 12, poengPerKamp: '6.0', eid: '3.0', xg: '0.10', xa: '0.20', minutter: 180,
  forsvar: { dc: 0, cbi: 0, rec: 0, tk: 0, per90: 0 },
  dodball: {}, sisteKamper: [], kommende: [], sesonger: [], rangering: null, stats: [],
};

test('playerCardHtml viser statraden for keeper mot spiss', () => {
  const keeper = app.playerCardHtml({
    ...kortBase,
    stats: [{ navn: 'Redninger', verdi: 22 }, { navn: 'Straffer reddet', verdi: 0 }],
    rangering: { posisjonFlertall: 'keepere', form: { nr: 3, av: 71 }, poengPerKamp: 3, eid: 1, pris: 1 },
  }, '');
  assert.match(keeper, /Redninger/);
  assert.match(keeper, /Straffer reddet/, 'null skal vises, ikke skjules');
  assert.match(keeper, /Form nr\. 3 av 71 keepere/, 'rank-linja mangler');
  assert.match(keeper, /P\/K nr\. 3/);
  assert.match(keeper, /Eid nr\. 1/);
  assert.match(keeper, /Pris nr\. 1/);

  const spiss = app.playerCardHtml({ ...kortBase, posisjon: 'Angrep', stats: [{ navn: 'xGI', verdi: '3.00' }] }, '');
  assert.match(spiss, /xGI/);
  assert.ok(!spiss.includes('Redninger'), 'spisser får ikke keeperstatistikk');
  assert.ok(!spiss.includes('Form nr.'), 'ingen rank-linje uten rangering');
});

test('playerCardHtml viser tidligere sesonger med prisreise og tomtilstand', () => {
  const med = app.playerCardHtml({
    ...kortBase,
    sesonger: [{ sesong: '2025/26', poeng: 162, minutter: 3330, mal: 0, assists: 0, nullere: 19, bonus: 11, prisStart: '5.5', prisSlutt: '6.2' }],
  }, '');
  assert.match(med, /Tidligere sesonger/);
  assert.match(med, /2025\/26/);
  assert.match(med, /5\.5 → 6\.2/, 'prisreisen mangler');

  const uten = app.playerCardHtml(kortBase, '');
  assert.match(uten, /Tidligere sesonger/);
  assert.match(uten, /Første sesong i Premier League\./);
});

test('playerCardHtml viser nyhetsdato og kildelenke med rel=noopener og escaper URL-en', () => {
  const html = app.playerCardHtml({
    ...kortBase,
    nytt: 'Lyskeskade',
    nyttMeldt: 'torsdag 23. juli',
    nyttKilde: 'https://arsenal.com/news?a="b"&c=1',
  }, '');
  assert.match(html, /Lyskeskade — meldt torsdag 23\. juli/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /target="_blank"/);
  assert.ok(!html.includes('news?a="b"'), 'URL-en må escapes i attributtet');
  assert.match(html, /&quot;b&quot;/, 'anførselstegn escapes');

  const utenKilde = app.playerCardHtml({ ...kortBase, nytt: 'Lyskeskade', nyttMeldt: 'torsdag 23. juli' }, '');
  assert.match(utenKilde, /Lyskeskade — meldt torsdag 23\. juli/);
  assert.ok(!utenKilde.includes('<a href'), 'ingen lenke uten kilde');
});

test('playerCardHtml viser prisen i Siste kamper', () => {
  const html = app.playerCardHtml({
    ...kortBase,
    sisteKamper: [{ runde: 2, motstander: 'WOL', hjemme: true, poeng: 5, minutter: 90, mal: 1, assists: 0, xg: '0.93', xa: '0.40', bonus: 1, pris: '5.5' }],
  }, '');
  assert.match(html, /<th class="num">Pris<\/th>/, 'Pris-kolonna mangler');
  assert.match(html, /£5\.5m/, 'prisen i runden mangler');
});
