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
