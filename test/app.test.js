// Rute-tester (v1.13.1): hele stacken på loopback mot en falsk FPL-verden.
//
// Miljøet settes FØR enhver import fra src/ — config.js fryser konfigurasjonen
// ved første import, og `process.loadEnvFile()` overskriver ikke variabler som
// allerede finnes i process.env. Derfor er alle src/-importer dynamiske.
// AI og Discord er slått av med tomme nøkler: testene beviser at ingen
// forespørsel går til Anthropic eller Discord i noen tilstand.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { buildWorld, serveWorld, TEAM_ID } from './fixtures/fpl-world.js';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpl-app-test-'));

process.env.FPL_TEAM_ID = String(TEAM_ID);
process.env.LEAGUE_IDS = '';
process.env.NEWS_FEEDS = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.DISCORD_WEBHOOK_URL = '';
process.env.DATA_DIR = dataDir;

const realFetch = globalThis.fetch;

let createApp;
let clearCache;
let world;
let served;
let app;
let server;
let base;

before(async () => {
  world = buildWorld();
  served = serveWorld(world, { realFetch });
  globalThis.fetch = served.fetch;

  ({ createApp } = await import('../src/app.js'));
  ({ clear: clearCache } = await import('../src/services/cache.js'));

  app = createApp();
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  // Keep-alive holder serveren åpen — uten dette henger `node --test`.
  server?.closeAllConnections();
  server?.close();
  globalThis.fetch = realFetch;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

// Hver test måler sin egen henting.
beforeEach(() => clearCache?.());

async function get(pathname, init) {
  const res = await realFetch(base + pathname, init);
  return { status: res.status, headers: res.headers, text: await res.text() };
}

async function post(pathname, body) {
  return get(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
  });
}

const SIDER = ['/', '/spillere', '/lag', '/overganger', '/liga', '/innsikt', '/brief', '/live', '/nyheter', '/offline'];

// ---- fabrikken -------------------------------------------------------------

test('createApp() bygger appen uten å lytte og uten å starte schedulere', () => {
  const før = served.calls.fpl.length;
  const fersk = createApp();
  assert.equal(typeof fersk.use, 'function', 'fabrikken skal gi en Express-app');
  assert.equal(served.calls.fpl.length, før, 'fabrikken skal ikke hente noe fra FPL');

  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  for (const forbudt of ['app.listen', 'process.on', 'startScheduler', 'startAiRefresher', 'startPriceWatcher']) {
    assert.ok(!src.includes(forbudt), `${forbudt} hører hjemme i server.js, ikke app.js`);
  }
});

// ---- sidene ----------------------------------------------------------------

for (const side of SIDER) {
  test(`side ${side} svarer 200 med to <script>, matchende CSP-nonce og main#innhold`, async () => {
    const { status, headers, text } = await get(side);
    assert.equal(status, 200, `${side} svarte ${status}`);
    assert.match(headers.get('content-type') ?? '', /text\/html/);

    // Kjørbare scripts skal være nøyaktig to: tema-scriptet (med nonce) og
    // /app.js. `<script type="application/json">` er en databeholder — den
    // kjøres ikke og telles ikke (live.ejs sender live-dataene slik).
    const alle = text.match(/<script[^>]*>/g) ?? [];
    const kjørbare = alle.filter((tag) => !tag.includes('type="application/json"'));
    assert.equal(kjørbare.length, 2, `${side} har ${kjørbare.length} kjørbare <script>, forventet 2`);

    const fraHeader = /'nonce-([A-Za-z0-9+/=_-]+)'/.exec(headers.get('content-security-policy') ?? '')?.[1];
    const fraHtml = /<script nonce="([^"]+)"/.exec(text)?.[1];
    assert.ok(fraHeader, 'CSP-headeren mangler nonce');
    assert.equal(fraHtml, fraHeader, 'noncen i HTML-en må være den samme som i CSP-headeren');

    assert.ok(text.includes('<main id="innhold"'), 'hopp-lenkens mål mangler');
    assert.ok(!text.includes('Viser data fra'), 'stale-banneret skal ikke vises med fersk cache');
    assert.ok(!text.includes('FPL oppdaterer'), '503-banneret skal ikke vises');
  });
}

test('ukjent sti gir 404-siden i layouten', async () => {
  const { status, text } = await get('/finnes-ikke');
  assert.equal(status, 404);
  assert.equal((text.match(/<script/g) ?? []).length, 2);
  assert.ok(text.includes('<main id="innhold"'));
});

// ---- /health ---------------------------------------------------------------

test('/health svarer 200 med features av og aiStats null', async () => {
  const { status, text } = await get('/health');
  assert.equal(status, 200);
  const body = JSON.parse(text);
  assert.equal(body.status, 'ok');
  assert.equal(body.features.ai, false);
  assert.equal(body.features.aiModel, null);
  assert.equal(body.features.discord, false);
  assert.equal(body.features.teamId, true);
  assert.equal(body.aiStats, null);
  assert.ok(!text.includes('sk-ant'), '/health skal aldri bære nøkkelverdier');
});

// ---- /api ------------------------------------------------------------------

test('/api/brief.json og /api/live.json svarer JSON med no-store og dataAlder som tall', async () => {
  const brief = await get('/api/brief.json');
  assert.equal(brief.status, 200);
  assert.equal(brief.headers.get('cache-control'), 'no-store');
  assert.equal(typeof JSON.parse(brief.text).dataAlder, 'number');

  const live = await get('/api/live.json');
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('cache-control'), 'no-store');
  const body = JSON.parse(live.text);
  assert.equal(typeof body.dataAlder, 'number');
  assert.equal(body.anyLive, false);
  assert.equal(body.finished, true);
});

test('/api/spiller/:id henter element-summary én gang, ukjent id gir 404', async () => {
  const før = served.calls.count('element-summary');
  const ok = await get('/api/spiller/3');
  assert.equal(ok.status, 200);
  assert.equal(served.calls.count('element-summary') - før, 1, 'ett element-summary-kall per kaldt kort');

  const igjen = await get('/api/spiller/3');
  assert.equal(igjen.status, 200);
  assert.equal(served.calls.count('element-summary') - før, 1, 'andre klikk skal leses fra cachen');

  const ukjent = await get('/api/spiller/99999');
  assert.equal(ukjent.status, 404);
  assert.equal(served.calls.count('element-summary') - før, 1, 'ukjent id skal stoppes av bootstrap først');
});

test('POST /api/ai-rad svarer 400 uten ANTHROPIC_API_KEY og treffer aldri Anthropic', async () => {
  const { status, text } = await post('/api/ai-rad');
  assert.equal(status, 400);
  assert.match(JSON.parse(text).error, /AI er ikke aktivert/);
  assert.deepEqual(served.calls.outside.filter((u) => u.includes('anthropic')), []);
});

test('POST /api/scenarier avviser ugyldig kropp med 400 og lagrer gyldig i DATA_DIR', async () => {
  const ugyldig = await post('/api/scenarier', { name: '', event: 0, moves: [] });
  assert.equal(ugyldig.status, 400);
  assert.ok(Array.isArray(JSON.parse(ugyldig.text).errors));

  const gyldig = await post('/api/scenarier', { name: 'Testscenario', event: 3, moves: [{ out: 15, in: 23 }] });
  assert.equal(gyldig.status, 201, gyldig.text);
  const { scenario } = JSON.parse(gyldig.text);

  const lagret = JSON.parse(fs.readFileSync(path.join(dataDir, 'scenarios.json'), 'utf8'));
  assert.ok(JSON.stringify(lagret).includes('Testscenario'), 'scenarioet skal ligge i DATA_DIR');

  const slettet = await get(`/api/scenarier/${scenario.id}`, { method: 'DELETE' });
  assert.ok([200, 204].includes(slettet.status), `DELETE svarte ${slettet.status}`);
});

// ---- statiske filer og PWA -------------------------------------------------

test('versjonert asset er immutable, uversjonert er no-cache', async () => {
  const sw = await get('/sw.js');
  const hash = /fpl-([0-9a-f]{8})/.exec(sw.text)?.[1];
  assert.ok(hash, 'sw.js må bære asset-hashen');

  const versjonert = await get(`/style.css?v=${hash}`);
  assert.equal(versjonert.status, 200);
  assert.match(versjonert.headers.get('cache-control') ?? '', /immutable/);

  const uversjonert = await get('/style.css');
  assert.equal(uversjonert.status, 200);
  assert.match(uversjonert.headers.get('cache-control') ?? '', /no-cache/);
});

test('/sw.js er no-store og bærer asset-hashen', async () => {
  const { status, headers, text } = await get('/sw.js');
  assert.equal(status, 200);
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.match(text, /fpl-[0-9a-f]{8}/);
});

// ---- feiltilstander --------------------------------------------------------

test('FPL 503 gir «FPL oppdaterer spillet» på sider og JSON på /api', async () => {
  served.fail('bootstrap-static/', 503);
  try {
    const side = await get('/');
    assert.equal(side.status, 503);
    assert.ok(side.text.includes('FPL oppdaterer spillet'), '503-siden mangler overskriften');

    clearCache();
    const api = await get('/api/brief.json');
    assert.equal(api.status, 503);
    assert.match(JSON.parse(api.text).error, /oppdateres/);
  } finally {
    served.clearFailures();
    clearCache();
    // Et vellykket kall nullstiller `updatingSince` (modultilstand i
    // fplClient.js) — ellers ville neste side vist banneret.
    const frisk = await get('/');
    assert.equal(frisk.status, 200);
    assert.ok(!frisk.text.includes('FPL oppdaterer'));
  }
});

test('sidene tåler at alle RSS-feeder feiler — og ingenting går til AI eller Discord', async () => {
  served.calls.outside.length = 0;
  const forside = await get('/');
  const nyheter = await get('/nyheter');
  assert.equal(forside.status, 200);
  assert.equal(nyheter.status, 200);
  assert.ok(served.calls.outside.length > 0, 'RSS-feedene skal ha vært forsøkt');
  const fremmede = served.calls.outside.filter((u) => /anthropic|discord/.test(u));
  assert.deepEqual(fremmede, [], 'ingen forespørsel skal gå til Anthropic eller Discord');
});

test('for stor JSON-kropp gir 413 som JSON', async () => {
  const { status, headers, text } = await post('/api/scenarier', JSON.stringify({ name: 'x'.repeat(40_000) }));
  assert.equal(status, 413);
  assert.match(headers.get('content-type') ?? '', /application\/json/);
  assert.ok(JSON.parse(text).error, 'feilhandleren skal svare JSON på /api');
});

// ---- SIST i fila: takstbegrenseren er én modulinstans delt av hele prosessen
test('skrivende API-kall begrenses per IP med 429 og Retry-After', async () => {
  let siste;
  for (let i = 0; i < 40; i++) {
    siste = await post('/api/ai-rad');
    if (siste.status === 429) break;
  }
  assert.equal(siste.status, 429, 'takstbegrenseren slo aldri inn');
  assert.ok(Number(siste.headers.get('retry-after')) > 0, 'Retry-After mangler');
});
