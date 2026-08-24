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
  ['dashboard', fx.dashboard, 'Kneskade – 25 % sjanse for spilletid'],
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
  ['brief', fx.brief, 'Rundebrief'],
  ['brief', fx.briefEmpty, 'Rundebrief'],
  ['live', fx.live, 'live-root'],
  ['live', fx.liveEmpty, 'Ingen aktiv runde'],
  ['news', fx.news, 'FPL-nyheter'],
  ['news', fx.news, 'Liverpool vant 3–0 på Anfield.'],
  ['news', fx.newsEmpty, 'Fant ingen saker'],
  ['transfers', fx.transfers, 'Haaland'],
  ['transfers', fx.transfers, 'Free Hit'],
  ['transfers', fx.transfers, 'rå spillerpoeng'],
  ['transfers', fx.transfersEmpty, 'Ingen overganger registrert ennå'],
  ['transfers', fx.transfersPending, 'Venter på runde 2'],
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
  ['/', 'Dashbord'],
  ['/spillere', 'Spillere'],
  ['/lag', 'Lag'],
  ['/overganger', 'Overganger'],
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

// P2-5 og P2-6: uten tropp finnes verken poengsum, rank eller gameweek —
// statstripa viste likevel tall fra forrige sesong, og undertittelen «Gameweek –».
test('team.ejs viser – i hele statstripa når troppen mangler', async () => {
  const html = await renderView('team', fx.teamEmpty);
  const stats = html
    .split('<span class="stat-val">')
    .slice(1)
    .map((chunk) => chunk.split('<')[0].trim());

  assert.equal(stats.length, 5);
  assert.deepEqual(stats, ['–', '–', '–', '–', '–']);
});

test('team.ejs utelater runde-leddet i undertittelen når runden mangler', async () => {
  const tom = await renderView('team', fx.teamEmpty);
  const full = await renderView('team', fx.team);

  assert.ok(!tom.includes('· Runde'), 'runde-leddet vises uten runde');
  assert.ok(full.includes('· Runde'), 'runde-leddet mangler når runden finnes');
});

// P2-4: fullnavnet i FDR-matrisen skjules visuelt på mobil, men må bli stående
// i markupen for skjermlesere.
test('dashboard.ejs merker fullnavnet i FDR-matrisen', async () => {
  const html = await renderView('dashboard', fx.dashboard);

  assert.ok(html.includes('team-name-full'), 'fullnavnet mangler klassen');
  assert.ok(html.includes('Arsenal'), 'fullnavnet er fjernet fra markupen');
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

test('layout.ejs setter data-theme i et inline-script FØR stilarket lastes', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  const script = html.indexOf("localStorage.getItem('fpl-theme')");
  const css = html.indexOf('href="/style.css?v=');
  assert.notEqual(script, -1, 'inline-scriptet mangler');
  assert.ok(script < css, 'scriptet må ligge før stilarket, ellers blaffer siden i feil tema');
  assert.ok(html.includes("setAttribute('data-theme'"), 'scriptet setter ikke data-theme');
  assert.ok(html.includes('prefers-color-scheme: light'), 'auto-fallback mangler');
});

test('layout.ejs har temabryteren i topbaren med aria-label', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  assert.match(html, /<button type="button" class="theme-toggle" id="theme-toggle" data-mode="auto" aria-label="Tema: automatisk \(følger systemet\)"/);
  const topbarEnd = html.indexOf('</header>');
  assert.ok(html.indexOf('id="theme-toggle"') < topbarEnd, 'bryteren ligger ikke i topbaren');
  assert.equal((html.match(/class="theme-icon /g) ?? []).length, 3, 'tre ikoner (auto/lys/mørk)');
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

// ---- B-3: hvilken runde anbefalingene gjelder, og hva de bygger på --------

test('team.ejs navngir runden anbefalingene gjelder og forklarer ep_next-fallbacken', async () => {
  const html = await renderView('team', {
    ...fx.team,
    recommendations: {
      ...fx.team.recommendations,
      captains: [
        {
          player: fx.team.recommendations.captains[0].player,
          criterion: 'ep_next',
          reasons: ['Forventet poeng (FPL) 4.0', 'FDR 2.0 neste kamp', 'Full spilletid ventet'],
        },
      ],
    },
  });
  assert.ok(html.includes('Anbefalinger for Runde 2'), 'runde-overskriften mangler');
  assert.ok(html.includes('Ingen formdata ennå'), 'kriterielinja mangler');
  assert.ok(html.includes('Forventet poeng (FPL) 4.0'), 'begrunnelsen mangler');
});

test('team.ejs viser tomtilstand når ingen kapteinskandidater er spilleklare', async () => {
  const html = await renderView('team', {
    ...fx.team,
    recommendations: { ...fx.team.recommendations, captains: [] },
  });
  assert.ok(html.includes('Ingen aktuelle kapteiner'), 'tomtilstanden mangler');
  assert.ok(!html.includes('Ingen formdata ennå'), 'kriterielinja skal ikke vises uten kandidater');
});

// ---- v1.3.1: klubbgrafikk ---------------------------------------------------
const badgeLocals = (team, extra = {}) => ({ team, clubAssets: fx.clubAssets, ...extra });

test('partials/club-badge.ejs skriver versjonert <img> når merket finnes på disk', async () => {
  const html = await renderView('partials/club-badge', badgeLocals(fx.teamsById.get(1)));
  assert.match(html, /<img class="club-img" src="\/img\/clubs\/t3\.png\?v=2627" width="70" height="70" alt="" loading="lazy" decoding="async">/);
  assert.ok(html.includes('<span class="club-name">ARS</span>'));
  assert.ok(!html.includes('club-fallback'));
});

test('partials/club-badge.ejs faller tilbake på plassholder — aldri brutt bilde', async () => {
  const html = await renderView('partials/club-badge', badgeLocals(fx.teamsById.get(2)));
  assert.ok(!html.includes('<img'), 'skrev <img> for et merke som ikke finnes');
  assert.ok(html.includes('class="club-fallback" aria-hidden="true"'));
  assert.ok(html.includes('<span class="club-name">LIV</span>'));
  // Uten clubAssets i det hele tatt (gamle locals): også tekst.
  const bare = await renderView('partials/club-badge', { team: fx.teamsById.get(1) });
  assert.ok(!bare.includes('<img'));
  // showName:false → navnet som skjermlesertekst, ikke synlig.
  const quiet = await renderView('partials/club-badge', badgeLocals(fx.teamsById.get(1), { showName: false }));
  assert.ok(quiet.includes('<span class="sr-only">Arsenal</span>'));
  assert.ok(!quiet.includes('club-name'));
});

test('partials/club-shirt.ejs velger keeperdrakt, drakt, merke eller plassholder', async () => {
  const gk = await renderView('partials/club-shirt', badgeLocals(fx.teamsById.get(1), { keeper: true }));
  assert.match(gk, /src="\/img\/clubs\/shirt_3_1\.png\?v=2627" width="110" height="145"/);
  const out = await renderView('partials/club-shirt', badgeLocals(fx.teamsById.get(1), { keeper: false }));
  assert.match(out, /src="\/img\/clubs\/shirt_3\.png\?v=2627"/);
  const none = await renderView('partials/club-shirt', badgeLocals(fx.teamsById.get(2)));
  assert.ok(!none.includes('<img'));
  assert.ok(none.includes('club-fallback'));
});

test('dashboard.ejs viser klubbmerker i FDR-matrisen og lagkolonnene', async () => {
  const html = await renderView('dashboard', fx.dashboard);
  assert.ok(html.includes('/img/clubs/t3.png?v=2627'), 'Arsenal-merket mangler');
  assert.ok(html.includes('club--md'), 'FDR-radhodet bruker ikke md-størrelsen');
  assert.ok(html.includes('team-name-full'), 'fullnavnet i FDR-matrisen forsvant');
  // En klubb-URL som lukkes uten spørrestreng er uversjonert. (Planens form,
  // `[^"]+"(?![^>]*\?v=)`, slukte selve `?v=` inn i `[^"]+` og så etter en ny
  // `?v=` i resten av taggen — den flagget dermed korrekte URL-er.)
  assert.ok(!/\/img\/clubs\/[^"?]+"/.test(html), 'uversjonert bilde-URL');
});

test('layout.ejs krediterer klubbmerker og drakter i footeren', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  assert.ok(html.includes('Klubbmerker og drakter tilhører respektive klubber og Premier League.'));
});
