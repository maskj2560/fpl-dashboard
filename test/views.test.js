import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import ejs from 'ejs';
import * as fx from './fixtures/views.js';

const VIEWS = path.resolve('views');
function renderView(name, locals) {
  return ejs.renderFile(path.join(VIEWS, `${name}.ejs`), locals, { async: false });
}

const cases = [
  ['dashboard', fx.dashboard, 'Neste deadline'],
  ['dashboard', fx.dashboardEmpty, 'Ingen kommende deadline'],
  ['team', fx.team, 'Marius XI'],
  ['team', fx.teamEmpty, 'Fant ingen lagoppstilling'],
  ['players', fx.players, 'players-table'],
  ['league', fx.league, 'Differensialer'],
  ['league', fx.leagueEmpty, 'Fant ingen private miniligaer'],
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
