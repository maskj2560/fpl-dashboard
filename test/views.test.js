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
  ['players', fx.players, 'Differensialer'],
  ['players', fx.players, 'Dødballtakere'],
  ['players', fx.playersNoDiff, 'Dødballtakere'],
  ['league', fx.league, 'Differensialer'],
  ['league', fx.leagueEmpty, 'Fant ingen private miniligaer'],
  ['league', fx.leagueNoRows, 'Ligatabellen er tom fram til første runde'],
  ['league', fx.leagueEmptyDiff, 'Differensialer'],
  ['league', fx.league, 'Rival-radar'],
  ['league', fx.league, 'rival-select'],
  ['league', fx.league, 'Felles spillere'],
  ['league', fx.league, '+5'],
  ['league', fx.league, 'Kaptein-liga'],
  ['league', fx.league, 'Tapt mot optimal'],
  ['league', fx.leagueCaptainsCapped, 'siste 10 ferdige rundene'],
  ['league', fx.league, 'Sesongutvikling'],
  ['league', fx.league, 'league-graph'],
  ['league', fx.league, 'Rundens rapport'],
  ['league', fx.league, '<strong>Rival FC</strong>'],
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
  ['transfers', fx.transfers, 'Treffprosent'],
  ['transfers', fx.transfers, 'row-detail'],
  ['transfers', fx.transfers, 'Prisgevinst'],
  ['transfers', fx.transfers, 'Laget uten bytter'],
  ['transfers', fx.transfers, 'planner-root'],
  ['transfers', fx.transfersEmpty, 'planner-root'],
  ['transfers', fx.transfers, 'Plan A: Isak inn'],
  ['transfers', fx.transfers, 'I stedet for Haaland'],
  ['transfers', fx.transfers, 'alt-sok'],
  ['transfers', fx.transfers, 'Kommentar til byttene'],
  ['innsikt', fx.insights, 'Benkesløsing'],
  ['innsikt', fx.insightsEmpty, 'Innsikt kommer når første runde er ferdigspilt'],
  ['no-team', {}, 'FPL_TEAM_ID'],
  ['404', {}, '404'],
  ['error', { code: 500, heading: 'Noe gikk galt', message: null }, 'Noe gikk galt'],
  ['error', { code: 503, heading: 'FPL oppdaterer spillet', message: 'Prøv igjen om noen minutter.' }, 'FPL oppdaterer spillet'],
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
  gameUpdating: false, staleSince: null, version: '1.0.1', assetVersion: 'a1b2c3d4',
  startedAt: '19.08.2026, 21:00', cspNonce: 'testnonce',
});

test('layout.ejs gir tema-scriptet CSP-noncen', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  assert.ok(html.includes('<script nonce="testnonce">'), 'tema-scriptet mangler nonce');
});

// ---- v1.8.3: tilgjengelighet ----------------------------------------------------

test('layout.ejs har hopp-lenken «Hopp til innhold» som første fokuserbare element og main#innhold', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  const body = html.slice(html.indexOf('<body>'));
  const firstFocusable = body.match(/<(a|button|input|select|textarea)\b[^>]*>/);
  assert.ok(firstFocusable, 'fant ingen fokuserbare elementer');
  assert.match(firstFocusable[0], /class="skip-link"/, `første fokuserbare er ${firstFocusable[0]}`);
  assert.match(firstFocusable[0], /href="#innhold"/);
  assert.ok(body.includes('Hopp til innhold'), 'lenketeksten mangler');
  assert.ok(body.includes('<main id="innhold">'), 'main mangler id="innhold"');
});

// Skjermlesere leser tabellens caption før de går inn i cellene. Alle
// datatabeller får en (sr-only der overskriften alt står synlig over).
test('hver datatabell har caption rett etter <table>', async () => {
  const rendered = new Map();
  for (const [name, locals] of cases) rendered.set(`${name}:${JSON.stringify(locals).length}`, [name, await renderView(name, locals)]);
  let tables = 0;
  for (const [name, html] of rendered.values()) {
    for (const m of html.matchAll(/<table[^>]*>([\s\S]{0,120})/g)) {
      tables += 1;
      assert.match(m[1], /^\s*<caption/, `${name}.ejs: tabell uten caption: <table${m[0].slice(6, 60)}`);
    }
  }
  assert.ok(tables >= 20, `fant bare ${tables} tabeller — mønsteret matcher ikke lenger`);
});

// Knapper uten lesbar tekst (×, ikon-SVG) må ha aria-label, ellers leses de
// som «knapp».
test('alle ikon-knapper har aria-label', async () => {
  const pages = [...cases.map(([name, locals]) => [name, locals]), ['layout', layoutLocals('/')]];
  for (const [name, locals] of pages) {
    const html = await renderView(name, locals);
    for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = m[2].replace(/<[^>]+>/g, '').trim();
      if (/\p{L}/u.test(text)) continue;
      assert.match(m[1], /aria-label="[^"]+"/, `${name}.ejs: ikon-knapp uten aria-label: <button${m[1]}>${m[2].slice(0, 40)}`);
    }
  }
});

test('live.ejs annonserer status og totalsum med aria-live', async () => {
  const html = await renderView('live', fx.live);
  assert.match(html, /<span id="live-status" role="status"/);
  assert.match(html, /<span class="stat-val" id="live-total" aria-live="polite"/);
});

test('dashboard.ejs merker nedtellingen som timer (aldri opplest hvert sekund)', async () => {
  const html = await renderView('dashboard', fx.dashboard);
  assert.match(html, /<div class="countdown" role="timer"/);
});

test('layout.ejs har nøyaktig ett inline-script, og det bærer nonce', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].map((m) => m[0]);
  assert.equal(inline.length, 1, `fant ${inline.length} inline-script: ${inline.join(' ')}`);
  assert.match(inline[0], /nonce="testnonce"/);
});

const NAV = [
  ['/', 'Dashbord'],
  ['/spillere', 'Spillere'],
  ['/lag', 'Lag'],
  ['/overganger', 'Overganger'],
  ['/liga', 'Liga'],
  ['/innsikt', 'Innsikt'],
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

test('layout.ejs viser alderstak-banneret bare når staleSince er satt', async () => {
  const uten = await renderView('layout', layoutLocals('/'));
  const med = await renderView('layout', { ...layoutLocals('/'), staleSince: '14:05' });
  assert.ok(!uten.includes('Viser data fra'));
  assert.ok(med.includes('Viser data fra 14:05'));
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

// ---- v1.3.2: markup-kontrakter som app.js og feilsidene avhenger av -------

test('dashboard.ejs: heroen har rundeetikett, deadline-dato og nedtelling med data-deadline + fire data-unit', async () => {
  const html = await renderView('dashboard', fx.dashboard);
  assert.ok(html.includes('class="gw-badge">Runde 1<'), 'gw-badge mangler');
  assert.match(html, /data-deadline="2026-08-21T17:30:00Z"/);
  for (const u of ['d', 'h', 'm', 's']) assert.ok(html.includes(`data-unit="${u}"`), `data-unit=${u} mangler`);
  assert.ok(html.includes('Neste deadline'));
});

test('feilsidene (404, error, no-team) bruker empty-state og lenker tilbake til dashbordet', async () => {
  for (const name of ['404', 'error', 'no-team']) {
    const locals = name === 'error'
      ? { code: 500, heading: 'Noe gikk galt', message: null }
      : {};
    const html = await renderView(name, locals);
    assert.ok(html.includes('class="empty-state"'), `${name}: mangler empty-state`);
    assert.match(html, /href="\/"[^>]*class="btn-link"/, `${name}: mangler knappelenke til /`);
  }
});

test('players.ejs: alle kolonneoverskrifter beholder data-type og aria-sort (sorteringskontrakten)', async () => {
  const html = await renderView('players', fx.players);
  // Kun spillertabellens egen thead — differensial- og dødballtabellene under
  // har sine egne overskrifter og sorteres ikke.
  const head = html.slice(html.indexOf('id="players-table"'), html.indexOf('</thead>'));
  const ths = head.match(/<th[ >][^>]*>/g) ?? [];
  assert.equal(ths.length, 12, 'antall kolonner endret — app.js Modul 2 sorterer på indeks');
  const [duell, ...sorterbare] = ths;
  assert.match(duell, /data-nosort/, 'duell-kolonnen skal unntas sorteringen');
  for (const th of sorterbare) {
    assert.match(th, /data-type="(text|num)"/, th);
    assert.match(th, /aria-sort="(none|ascending|descending)"/, th);
  }
  assert.equal((head.match(/aria-sort="descending"/g) ?? []).length, 1, 'nøyaktig én startsortering');
});

// v1.8.3: kolonnehoder i sorterbare tabeller har scope=col, så skjermlesere
// kobler cellen til riktig overskrift også etter at radene er sortert om.
test('sorterbare kolonnehoder har scope=col og aria-sort', async () => {
  const spillere = await renderView('players', fx.players);
  const live = await renderView('live', fx.live);
  for (const [navn, html, id] of [['players', spillere, 'players-table'], ['live', live, 'live-players']]) {
    const start = html.indexOf(`id="${id}"`);
    const head = html.slice(start, html.indexOf('</thead>', start));
    const ths = head.match(/<th[ >][^>]*>/g) ?? [];
    assert.ok(ths.length >= 5, `${navn}: fant for få kolonnehoder`);
    for (const th of ths) {
      assert.match(th, /scope="col"/, `${navn}: ${th}`);
      if (!th.includes('data-nosort')) assert.match(th, /aria-sort="/, `${navn}: ${th}`);
    }
  }
});

// ---- v1.8.0: spiller-pakka ------------------------------------------------

test('players.ejs har kort ingress — forklaringene ligger i tittelattributter', async () => {
  const html = await renderView('players', fx.players);
  const hode = html.slice(0, html.indexOf('id="player-filters"'));
  assert.match(hode, /Klikk på et spillernavn for spillerkortet\./);
  assert.doesNotMatch(hode, /Klikk på en kolonne for å sortere/, 'ingressen skal være kortet ned');
});

test('players.ejs deler siden i tre faner og viser bare tabellen fra serveren', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /class="fane-rad" role="tablist"/, 'fanene erstatter hopplenkene');
  assert.doesNotMatch(html, /class="jump-nav"/, 'hopplenkene skal være borte');
  for (const id of ['tabell', 'differensialer', 'dodballtakere']) {
    assert.match(html, new RegExp(`data-fane="${id}"[^>]*aria-controls="${id}"`), `mangler fane for #${id}`);
    assert.match(html, new RegExp(`id="${id}"`), `mangler seksjonen #${id}`);
  }
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1, 'nøyaktig én aktiv fane');
  assert.match(html, /id="tabell"(?![^>]*hidden)/, 'Tabell er standardfanen');
  assert.match(html, /id="differensialer"[^>]*hidden/, 'Differensialer skal ligge skjult');
  assert.match(html, /id="dodballtakere"[^>]*hidden/, 'Dødballtakere skal ligge skjult');
});

test('players.ejs gjør spillernavn klikkbare og gir radene duell-data', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /class="navn-lenke js-spillerkort" data-id="1"[^>]*>Saka</);
  assert.doesNotMatch(html, /btn-link js-spillerkort/, 'spillernavn skal være lavmælte lenker, ikke fylte knapper');
  assert.match(html, /data-navn="Saka"/);
  assert.match(html, /data-lag="ARS"/);
  assert.match(html, /data-bonus="7"/);
  assert.match(html, /data-min="900"/);
  assert.match(html, /data-straffer="1"/);
  assert.match(html, /class="duell-velg"[^>]*aria-label="Velg Saka til duell"/);
});

test('players.ejs gir duell-kolonnen en synlig overskrift', async () => {
  const html = await renderView('players', fx.players);
  const head = html.slice(html.indexOf('id="players-table"'), html.indexOf('</thead>'));
  const duellTh = head.match(/<th[^>]*data-nosort[^>]*>[\s\S]*?<\/th>/);
  assert.ok(duellTh, 'checkbox-kolonnen mangler');
  assert.match(duellTh[0], />Duell<\/th>/, 'checkbox-kolonnen skal ha synlig etikett');
  assert.doesNotMatch(duellTh[0], /sr-only/, 'etiketten skal være synlig, ikke bare for skjermlesere');
});

test('players.ejs viser statusbadge kun ved avvik — «Klar» er stille', async () => {
  const html = await renderView('players', fx.players);
  const rad = (navn) => {
    const i = html.indexOf(`data-name="${navn.toLowerCase()}"`);
    assert.notEqual(i, -1, `fant ikke raden til ${navn}`);
    return html.slice(i, html.indexOf('</tr>', i));
  };
  assert.doesNotMatch(rad('Saka'), /class="status /, 'status a skal gi tom statuscelle');
  assert.match(rad('Salah'), /class="status status-d"/, 'avvik skal fortsatt vises');
  assert.match(rad('Saka'), /data-status="a"/, 'statusfilteret leser data-status, ikke cella');
});

test('players.ejs har duell-skallet og en tom duell-seksjon', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /id="duell-teller"[^>]*>0 av 2 valgt</);
  assert.match(html, /class="btn-accent"[^>]*id="duell-start"[^>]*disabled/, 'Sammenlign er primærknappen');
  assert.match(html, /class="btn-quiet"[^>]*id="duell-tom"/, 'Tøm valg skal være lavmælt');
  assert.doesNotMatch(html, /class="btn-link"[^>]*id="duell-tom"/);
  // Duellen bor inne i Tabell-fanen og følger dens synlighet.
  assert.match(html, /<section id="duell" class="duell-panel" hidden>/);
  const tabell = html.slice(html.indexOf('id="tabell"'), html.indexOf('id="differensialer"'));
  assert.ok(tabell.includes('id="duell"'), 'duell-seksjonen skal ligge inne i Tabell-fanen');
});

test('players.ejs viser tre terskler, men bare 10 % synlig fra start', async () => {
  const html = await renderView('players', fx.players);
  for (const p of [5, 10, 15]) {
    assert.match(html, new RegExp(`data-terskel="${p}"`), `mangler terskel ${p}`);
  }
  assert.match(html, /data-terskel="10"(?![^>]*hidden)/, '10 % skal være synlig');
  assert.match(html, /data-terskel="5"[^>]*hidden/, '5 % skal være skjult');
  assert.match(html, /value="10" checked/, '10 % skal være forhåndsvalgt');
});

test('players.ejs tegner terskelvelgeren som segmenter og scoren med søylestripe', async () => {
  const html = await renderView('players', fx.players);
  // Radioene beholdes (tastatur + JS), men teksten pakkes i et span som styles.
  assert.match(html, /name="diff-terskel" value="10" checked><span>under 10&nbsp;%<\/span>/);
  assert.match(html, /class="terskel-segmenter"/, 'labelene skal ligge i en segmentbryter');
  // Bredden på stripa kommer fra servicen som andel av toppscoren.
  assert.match(html, /class="num score-celle" style="--andel: 100%"/);
  assert.match(html, /class="num score-celle" style="--andel: 69%"/);
});

test('players.ejs sier fra når differensiallista ikke finnes ennå', async () => {
  const html = await renderView('players', fx.playersNoDiff);
  assert.match(html, /Differensialer kommer når formtallene finnes — etter første runde/);
  assert.doesNotMatch(html, /data-terskel=/);
});

test('players.ejs lister dødballtakere som klubbkort med – for tomme roller', async () => {
  const html = await renderView('players', fx.players);
  const seksjon = html.slice(html.indexOf('id="dodballtakere"'));
  assert.match(seksjon, /class="dodball-grid"/, 'kortene skal ligge i et rutenett');
  assert.equal((seksjon.match(/class="dodball-kort"/g) ?? []).length, 2, 'ett kort per klubb');
  assert.doesNotMatch(seksjon, /<table/, 'tabellen erstattes av kort');
  assert.match(seksjon, /class="dodball-rolle">Straffer</);
  assert.match(seksjon, /1\. <button type="button" class="navn-lenke js-spillerkort" data-id="1">Saka<\/button>/);
  assert.match(seksjon, /club-name">LIV</, 'klubber uten takere skal ha kort likevel');
  assert.match(seksjon, /–/, 'tomme roller skal vises som tankestrek');
});

test('players.ejs har modal-skallet og server-rendrede drakt-templates', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /<div id="spillerkort"[^>]*hidden>/);
  assert.match(html, /role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="spillerkort-lukk"/);
  assert.match(html, /id="spillerkort-body"/);
  assert.match(html, /<template data-shirt="1">/);
  assert.match(html, /<template data-shirt-keeper="1">/);
  // Arsenal har grafikk, Liverpool ikke — vokteren skal ha valgt riktig gren.
  assert.match(html, /<template data-shirt="1">[\s\S]*?shirt_3\.png/);
  assert.match(html, /<template data-shirt="2">\s*<span class="shirt shirt--shirt"><span class="club-fallback/);
});

test('league.ejs viser retningsmarkører med skjermlesertekst', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /class="rank-up" aria-label="opp 2 plasser">▲/);
  assert.match(html, /class="rank-down" aria-label="ned 1 plass">▼/);
});

// QA-funn (økt 51): «#» sto over trendpila fordi hele cellen er høyrestilt.
// Hode og celle deler klassen som reserverer plass til pila.
test('league.ejs gir plassifferet og hodet samme rang-klasse', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /<th class="num rang">#<\/th>/);
  assert.match(html, /<td class="num rang">/);
});

test('league.ejs viser nøytral markør uten historikk', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /class="rank-same" aria-label="uendret plassering">–/);
});

test('league.ejs viser ikke ai-badge for datarapport', async () => {
  const html = await renderView('league', fx.leagueDataReport);
  assert.ok(html.includes('Rundens rapport'), 'rapporten skal vises');
  assert.ok(!html.includes('ai-badge'), 'datafallback skal ikke bære AI-merket');
});

test('league.ejs uten grafdata utelater league-graph', async () => {
  const html = await renderView('league', fx.leagueEmpty);
  assert.ok(!html.includes('league-graph'), 'grafen skal utelates helt uten data');
});

test('league.ejs gjør radene klikkbare og markerer valgt rival', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /data-href="\/liga\?rival=456"/);
  assert.match(html, /row-rival/);
  assert.ok(!html.includes('data-href="/liga?rival=123"'), 'aldri lenke på min egen rad');
});

test('team.ejs viser formasjonen i Oppstilling-hodet', async () => {
  const html = await renderView('team', fx.team);
  assert.match(html, /h2-meta"><span class="dim">3-4-3<\/span>/);
});

test('live.ejs viser antall til høyre i korthodene', async () => {
  const html = await renderView('live', fx.live);
  assert.match(html, new RegExp('id="live-count-players">' + fx.live.live.myPlayers.length + '<'));
  assert.match(html, new RegExp('id="live-count-matches">' + fx.live.live.matches.length + '<'));
});

test('team.ejs tegner en synlig markør når grafen bare har ett punkt', async () => {
  const html = await renderView('team', { ...fx.team, graph: { points: '0,70', area: null, single: true, min: 5, max: 5, first: 5, last: 5 } });
  assert.match(html, /<circle cx="0" cy="70" r="5" fill="var\(--accent\)"/);
});

test('players.ejs har en skjult tomtilstand for null filtertreff', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /id="players-empty" hidden>Ingen spillere matcher filtrene\./);
  assert.match(html, /id="players-empty-reset"[^>]*>Nullstill filtrene</);
});

test('team.ejs merker AI-rådgiveren som AI-kort', async () => {
  const html = await renderView('team', fx.team);
  assert.match(html, /card-wide card-ai" id="ai-advice-box"/);
  assert.match(html, /ai-badge">AI<\/span> AI-rådgiver/);
});

test('404.ejs har bare knappelenken tilbake', async () => {
  const html = await renderView('404', {});
  assert.ok(!html.includes('>dashbordet</a>'), 'tekstlenka i brødteksten skal bort');
  assert.match(html, /href="\/" class="btn-link"/);
});

test('team.ejs lar ikke anbefalingskortene strekkes forbi innholdet', async () => {
  const html = await renderView('team', fx.team);
  assert.match(html, /class="grid grid--start"/);
});

test('transfers.ejs merker beste og verste bytte som piller', async () => {
  const html = await renderView('transfers', fx.transfers);
  assert.match(html, /status status-best">Beste</);
  assert.match(html, /status status-worst">Verste</);
});

test('transfers.ejs: prisgevinst med salgspris, ukjent-fallback og tapte salg', async () => {
  const html = await renderView('transfers', fx.transfers);
  assert.match(html, /14\.2/); // salgspris 142 tideler
  assert.match(html, /ukjent kjøpspris/); // Salah mangler element_in_cost
  assert.match(html, /Saka: solgt for 5\.5, nå 6\.0/);

  const uten = await renderView('transfers', fx.transfersEmpty);
  assert.doesNotMatch(uten, /Prisgevinst/); // priceReport null → seksjonen skjules
});

test('transfers.ejs: detaljraden viser per-runde-tabell og milepæl', async () => {
  const html = await renderView('transfers', fx.transfers);
  assert.match(html, /btn-expand" aria-expanded="false"/);
  assert.match(html, /row-detail" hidden/);
  assert.match(html, /Hittil \(2 av 5 runder\): 10/);
  assert.match(html, /Byttet varte 1 runde: 3/);
  assert.match(html, /100 %/); // treffprosent: 2 av 2 bytter i pluss

  // Komplett 5-rundersvindu får den endelige dommen.
  const rows = fx.transfers.analysis.rows;
  const komplett = {
    ...fx.transfers,
    analysis: {
      ...fx.transfers.analysis,
      rows: [{ ...rows[0], after5: { diff: 12, gws: 5, complete: true } }, rows[1]],
    },
  };
  const html2 = await renderView('transfers', komplett);
  assert.match(html2, /Etter 5 runder: 12/);
});

// v1.7.0: benkesløsingen skal både summere sesongen og merke chip-rundene —
// en Bench Boost-runde er 0 sløst, ikke bare 0 benkepoeng.
test('innsikt.ejs viser sumraden og BB-merket i benkesløsingen', async () => {
  const html = await renderView('innsikt', fx.insights);

  assert.ok(html.includes('Sum sesongen'), 'sumraden mangler');
  assert.ok(html.includes('>20<'), 'sum benkepoeng mangler');
  assert.ok(html.includes('−11'), 'sum unngåelig tap mangler fortegn');
  assert.ok(html.includes('<span class="status">BB</span>'), 'BB-merket mangler');
});

test('innsikt.ejs viser kapteinsfasiten med begge treffprosentene', async () => {
  const html = await renderView('innsikt', fx.insights);

  assert.ok(html.includes('Kapteinsfasit'), 'seksjonen mangler');
  assert.ok(html.includes('67 %'), 'treffprosent mot troppens beste');
  assert.ok(html.includes('50 %'), 'treffprosent mot global favoritt');
  assert.ok(html.includes('Haaland'), 'kapteinsraden mangler');
  assert.ok(html.includes('Ikke målt'), 'runde uten most_captained skal merkes, ikke telles som bom');
});

test('innsikt.ejs viser flaksbarometeret med fortegn per runde', async () => {
  const html = await renderView('innsikt', fx.insights);

  assert.ok(html.includes('Flaksbarometer'), 'seksjonen mangler');
  assert.ok(html.includes('+4,2'), 'positiv runde mangler fortegn');
  assert.ok(html.includes('−3,1'), 'negativ runde mangler fortegn');
  assert.ok(html.includes('+1,1'), 'sesongsummen mangler');
});

test('innsikt.ejs lister topp 3 og bunn 3 på flaks', async () => {
  const html = await renderView('innsikt', fx.insights);

  assert.ok(html.includes('Mest flaks'), 'topplista mangler');
  assert.ok(html.includes('Mest uflaks'), 'bunnlista mangler');
  assert.ok(html.includes('Watkins'), 'bunnlista har ingen spillere');
  assert.ok(html.includes('−10'), 'flakspoeng for bunnlista');
  assert.ok(html.includes('gjelder hele sesongen'), 'hintet om spillertallenes vindu mangler');
});

test('innsikt.ejs viser rundens XI og merker mine spillere', async () => {
  const html = await renderView('innsikt', fx.insights);

  assert.ok(html.includes('Rundens XI'), 'seksjonen mangler');
  assert.ok(html.includes('Startet'), 'merking av egne startende mangler');
  assert.ok(html.includes('Benket'), 'merking av egne benkede mangler');
  assert.ok(html.includes('6 av 11'), 'oppsummeringen av hvor mange jeg eide mangler');
  assert.ok(html.includes('Rundens beste'), 'top_player er ikke fremhevet');
});

test('innsikt.ejs rendrer trendlinjen bare når den finnes', async () => {
  const med = await renderView('innsikt', fx.insights);
  const uten = await renderView('innsikt', fx.insightsNoTrend);

  assert.ok(med.includes('Dine i rundens XI per runde'), 'trenden mangler');
  assert.ok(!uten.includes('Dine i rundens XI per runde'), 'trenden vises uten data');
  assert.ok(uten.includes('Rundens XI'), 'resten av seksjonen skal stå');
});

// ---- v1.8.3: CSP -------------------------------------------------------------

// CSP-en (script-src 'self' + nonce) blokkerer inline-hendelsesattributter
// stille — et onsubmit/onclick i et view ville bare slutte å virke i prod.
test('ingen view har inline on*-hendelsesattributter (CSP)', async () => {
  const inlineHandler = /\son[a-z]+=["']/i;
  for (const [name, locals] of cases) {
    const html = await renderView(name, locals);
    assert.ok(!inlineHandler.test(html), `${name}.ejs rendrer et inline on*-attributt`);
  }
  const files = (await fsp.readdir(VIEWS, { recursive: true })).filter((f) => f.endsWith('.ejs'));
  for (const file of files) {
    const src = await fsp.readFile(path.join(VIEWS, file), 'utf8');
    assert.ok(!inlineHandler.test(src), `${file} har et inline on*-attributt i kilden`);
  }
});
