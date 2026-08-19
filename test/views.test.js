import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fsp from 'node:fs/promises';
import ejs from 'ejs';
import * as fx from './fixtures/views.js';

const VIEWS = path.resolve('views');
function renderView(name, locals) {
  return ejs.renderFile(path.join(VIEWS, `${name}.ejs`), locals, { async: false });
}

const cases = [
  ['dashboard', fx.dashboard, 'Neste deadline'],
  ['dashboard', fx.dashboardEmpty, 'Ingen kommende deadline'],
  ['dashboard', fx.dashboardEmpty, 'Formtallene nullstilles'],
  ['dashboard', fx.dashboardEmpty, 'Ingen overganger er registrert'],
  ['team', fx.team, 'Marius XI'],
  ['team', fx.teamEmpty, 'Fant ingen lagoppstilling'],
  ['players', fx.players, 'players-table'],
  ['league', fx.league, 'Differensialer'],
  ['league', fx.leagueEmpty, 'Fant ingen private miniligaer'],
  ['league', fx.leagueNoRows, 'Ligatabellen er tom fram til første runde'],
  ['league', fx.leagueEmptyDiff, 'Differensialer'],
  ['brief', fx.brief, 'Gameweek'],
  ['brief', fx.briefEmpty, 'Gameweek'],
  ['live', fx.live, 'live-root'],
  ['live', fx.liveEmpty, 'Ingen aktiv gameweek'],
  ['news', fx.news, 'FPL-nyheter'],
  ['news', fx.newsEmpty, 'Fant ingen saker'],
  ['no-team', {}, 'FPL_TEAM_ID'],
  ['404', {}, '404'],
  ['error', {}, 'Noe gikk galt'],
];

let n = 0;
for (const [name, locals, marker] of cases) {
  n += 1;
  test(`${n}. views/${name}.ejs rendrer med mockdata og inneholder «${marker}»`, async () => {
    const html = await renderView(name, locals);
    assert.ok(html.includes(marker), `${name}: fant ikke «${marker}»`);
  });
}

// layout.ejs var lenge utenfor testdekningen, og både en EJS-syntaksfeil og en
// ødelagt aria-current slapp gjennom. Den rendres derfor her også.
const layoutLocals = (path) => ({
  body: '<p>innhold</p>', title: 'Test', path,
  gameUpdating: false, version: '1.0.1', assetVersion: 'a1b2c3d4',
  startedAt: '19.08.2026, 21:00',
});

const NAV = [
  ['/', 'Dashboard'],
  ['/spillere', 'Spillere'],
  ['/lag', 'Lag'],
  ['/liga', 'Liga'],
  ['/brief', 'Brief'],
  ['/live', 'Live'],
  ['/nyheter', 'Nyheter'],
];

for (const [path, label] of NAV) {
  test(`layout.ejs markerer «${label}» som aktiv side for ${path}`, async () => {
    const html = await renderView('layout', layoutLocals(path));
    const marked = [...html.matchAll(/aria-current="page">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(marked, [label], `${path}: feil aktiv nav-lenke`);
    assert.ok(!html.includes('&#34;page&#34;'), 'aria-current ble escapet');
  });
}

test('layout.ejs viser 503-banneret bare når spillet oppdateres', async () => {
  const uten = await renderView('layout', layoutLocals('/'));
  const med = await renderView('layout', { ...layoutLocals('/'), gameUpdating: true });
  assert.ok(!uten.includes('FPL oppdaterer spillet'));
  assert.ok(med.includes('FPL oppdaterer spillet'));
});

// P0-1: uversjonerte asset-URL-er lot Cloudflare servere gammel CSS/JS etter
// deploy. Layouten skal aldri referere /style.css eller /app.js uten ?v=.
// P1-2: ingressen ber brukeren klikke på et lag — den skal ikke vises når
// ingen liga har rader å klikke på.
test('league.ejs skjuler klikk-ingressen når alle ligatabeller er tomme', async () => {
  const tom = await renderView('league', fx.leagueNoRows);
  const full = await renderView('league', fx.league);
  assert.ok(!tom.includes('Klikk på et lag'), 'ingressen vises på tom ligatabell');
  assert.ok(full.includes('Klikk på et lag'), 'ingressen mangler når tabellen har rader');
});

test('layout.ejs versjonerer css og js med innholdshash', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  assert.ok(html.includes('href="/style.css?v=a1b2c3d4"'), 'css mangler ?v=');
  assert.ok(html.includes('src="/app.js?v=a1b2c3d4"'), 'js mangler ?v=');
  assert.ok(!html.includes('"/style.css"'), 'uversjonert /style.css i layout');
  assert.ok(!html.includes('"/app.js"'), 'uversjonert /app.js i layout');
});

test('layout.ejs preloader fonten med samme ?v som @font-face i style.css', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  const css = await fsp.readFile(path.join('public', 'style.css'), 'utf8');
  const pick = (text, start, end) => {
    const i = text.indexOf(start);
    return i === -1 ? null : text.slice(i + start.length, text.indexOf(end, i + start.length));
  };
  const preload = pick(html, 'rel="preload" href="', '"');
  const face = pick(css, "src: url('", "'");
  assert.equal(preload, face, 'preload og @font-face peker på ulike URL-er');
  assert.ok(preload?.includes('?v='), 'fonten er ikke versjonert');
});

test('live.ejs escaper < i lagnavn inne i script-blokken', async () => {
  const html = await renderView('live', fx.live);
  assert.ok(!html.includes('</script><img'), 'lagnavn brøt ut av script-taggen');
  assert.ok(html.includes('\\u003c/script'), 'forventet escapet <');
  // JSON-en skal fortsatt parses tilbake til det opprinnelige lagnavnet.
  const json = html.match(/<script id="live-data"[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(json).leagues[0].top[0].name, fx.HOSTILE_TEAM_NAME);
});

test('news.ejs escaper AI-tekst men beholder **fet**', async () => {
  const html = await renderView('news', {
    ...fx.news,
    points: ['**Salah** & <script>alert(1)</script>'],
  });
  assert.ok(html.includes('<strong>Salah</strong>'), 'fet markering forsvant');
  assert.ok(!html.includes('<script>alert(1)'), 'AI-tekst ble ikke escapet');
  assert.ok(html.includes('&amp;'), 'ampersand ble ikke escapet');
});

test('news.ejs blokkerer lenker som ikke er http(s)', async () => {
  const html = await renderView('news', fx.newsUnsafeLink);
  assert.ok(!html.includes('javascript:alert'), 'javascript-lenke slapp gjennom');
  assert.ok(html.includes('href="#"'), 'forventet at usikker lenke ble byttet til #');
});

test('brief.ejs escaper AI-tekst men beholder **fet**', async () => {
  const html = await renderView('brief', {
    ...fx.brief,
    aiBrief: { text: '**Salah** <script>alert(1)</script>', generatedAt: Date.now() },
  });
  assert.ok(html.includes('<strong>Salah</strong>'), 'fet markering forsvant');
  assert.ok(!html.includes('<script>alert(1)'), 'AI-tekst ble ikke escapet');
});
