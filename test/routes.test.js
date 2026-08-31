import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// v1.3.4: en sidevisning skal aldri utløse et AI-kall. Regelen er lett å
// bryte ved et uhell (én `await generateAiBrief(...)` i en rute holder), og
// det ville ikke feilet noen annen test — bare kostet penger og ventetid.
// Derfor kontrolleres den på kilden, som markup-kontraktene i app-client.

const routesDir = new URL('../src/routes/', import.meta.url);
const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'));

const read = (file) => fs.readFileSync(new URL(file, routesDir), 'utf8');

test('ingen rute genererer AI-tekst ved sidevisning', () => {
  for (const file of routeFiles) {
    const code = read(file);
    assert.ok(
      !/\bgenerateAiBrief\b/.test(code),
      `${file}: ruter skal bruke getCachedAiBrief, ikke generateAiBrief`,
    );
    assert.ok(
      !/\brefreshNewsSummary\b/.test(code),
      `${file}: nyhetsoppsummeringen friskes opp av refresh.js, ikke av en rute`,
    );
    // Rådgiveren på /lag er unntaket: den utløses av et klikk, ikke av en
    // sidevisning, og må vente når cachen er kald.
    if (file !== 'api.js') {
      assert.ok(
        !/ai\.generate\(/.test(code),
        `${file}: kun rådgiverklikket i api.js har lov til å generere`,
      );
    }
  }
});

test('rådgiverklikket blokkerer aldri på en utgått tekst (swr)', () => {
  const code = read('api.js');
  const call = code.slice(code.indexOf('ai.generate('));
  assert.ok(call.length > 0, 'fant ikke ai.generate i api.js');
  assert.match(
    call.slice(0, call.indexOf('});')),
    /swr:\s*true/,
    'rådgiverens ai.generate mangler swr: true',
  );
});

// v1.7.1: nettleseren skal aldri cache API-JSON — serverens cache styrer
// TTL, og et cachet /live.json ville vist gamle poeng under polling.
test('hele API-routeren svarer med no-store', () => {
  const code = read('api.js');
  assert.match(
    code,
    /router\.use\(noStore\)/,
    'api.js mangler router.use(noStore) fra middleware.js',
  );
});
