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
