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

// v1.8.0: spiller-pakka skal koste 0 AI-kall i ALLE tilstander, og
// element-summary skal bare hentes lazy ved et klikk (api.js) — aldri i bulk
// fra sidevisningen på /spillere. Begge reglene er billige å bryte og dyre å
// oppdage i drift, derfor låses de på kilden.
const servicesDir = new URL('../src/services/', import.meta.url);
const readService = (file) => fs.readFileSync(new URL(file, servicesDir), 'utf8');

test('spiller-pakka importerer aldri ai.js', () => {
  for (const code of [read('players.js'), readService('players.js')]) {
    assert.ok(
      !/from '\.\.?\/(services\/)?ai\.js'/.test(code),
      'spiller-pakka skal ikke importere ai.js — den koster 0 AI-kall',
    );
    assert.ok(!/\bai\.generate\(/.test(code), 'spiller-pakka skal aldri generere AI-tekst');
  }
});

test('kun api.js når element-summary — aldri /spillere-sidevisningen', () => {
  for (const file of routeFiles) {
    if (file === 'api.js') continue;
    const code = read(file);
    assert.ok(
      !/\bgetElementSummary\b/.test(code),
      `${file}: element-summary hentes kun lazy per klikk i api.js, aldri i bulk`,
    );
    assert.ok(
      !/\bassemblePlayerCard\b/.test(code),
      `${file}: spillerkortet hentes kun av klikkruta i api.js`,
    );
  }
  assert.match(read('api.js'), /\bassemblePlayerCard\b/, 'api.js mangler det lazy kortkallet');
  // Selve nettverkskallet bor i servicen, ikke i ruta.
  assert.match(readService('players.js'), /\bgetElementSummary\b/);
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

// v1.8.3: skrivende kall (POST/DELETE) takstbegrenses per IP. GET er
// gratis (serverens cache), og AI-klikket er alt cachet én time — dette
// stopper bare rå spamming av scenario-fila og rådgiveren.
test('hele API-routeren begrenser POST/DELETE per IP', () => {
  const code = read('api.js');
  assert.match(
    code,
    /router\.use\(rateLimitWrites\)/,
    'api.js mangler router.use(rateLimitWrites) fra middleware.js',
  );
});
