# ETAPPE 4 — v1.3.3 QA-rettelser: utførelsesplan

> **For utførende økt (Opus):** REQUIRED SUB-SKILL: bruk
> superpowers:executing-plans. Følg taskene i rekkefølge, én commit per task,
> kryss av `- [x]` og før inn «Observert: ______». Ta INGEN designbeslutninger —
> alt er pinnet her. Ved avvik mellom mockup og denne planen vinner planen.

**Mål:** rette alle 18 QA-funn fra v1.3.2-gjennomgangen (P0×1, P1×4, P2×13)
pluss det uverifiserte transfers-pille-punktet, og slippe v1.3.3.

**Arkitektur:** kun eksisterende moduler. Nye rene funksjoner: `formationOf`
i `src/services/analysis.js`, `edgeFadeState` på filnivå i `public/app.js`.
Ingen nye filer utenom `test/format.test.js`. Ingen CLAUDE.md-endring utløses
av noen task (ingen ny modul, partial eller tokenprinsipp).

**Spec:** funnlista fra Marius (24. aug 2026, gjengitt per task under) +
`docs/plan-v130-ui-overhaul.md` §3.2 (tokens), §6 (markørstrenger = kontrakt),
§10 (testregime), Vedlegg A (Playwright). Mockup:
https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849

## Globale rammer (gjelder hver task)

- **ALDRI last `/brief` eller `/nyheter` i prod, aldri klikk `#ai-advice-btn`.**
  Lokalt med TOMME nøkler er de gratis og SKAL med i røyken. **0 AI-kall totalt.**
- Lokal server: scratchpad-`.env` med `ANTHROPIC_API_KEY=` og
  `DISCORD_WEBHOOK_URL=` satt TOMME (`config.js` kjører `process.loadEnvFile()`
  som leser repoets `.env` uansett `--env-file`; tomme verdier i scratchpad-fila
  vinner fordi `loadEnvFile` ikke overskriver satte variabler).
  Verifiser `/health` → `ai:false, discord:false` FØR noe annet.
- **Aldri push uten eksplisitt klarsignal fra Marius — heller ikke docs.**
  Før enhver push: `fixtures/?event=N` for inneværende + neste runde (ingen
  `started && !finished_provisional`), aldri torsdag 19:00–21:00 (auto-brief
  ~19:30). **GW2-deadline fredag 28. aug 19:30, GW2 spilles ~29.–31. aug:
  release FØR fredag kveld eller ETTER at GW2 er ferdigspilt — aldri midt i.**
- Ingen nye avhengigheter. Playwright kun i scratchpad
  (`C:\Users\mariu\AppData\Local\Temp\claude\c--Users-mariu-Documents-Claude-Code-FPL\dac6fcf4-da08-4c03-892f-b9b259b42891\scratchpad`
  — gjenbruk `qa.mjs`, `qa-prod.mjs`, `qa-clubs.mjs`, `qa-clubs-prod.mjs` og
  installert chromium; ALDRI `npm i playwright` i repoet).
- 390 px måles med iframe på samme origin
  (`<iframe src="/spillere" style="width:390px;height:760px">`).
- Ingen hardkodede farger utenfor tokenblokkene; nye tokens må inn i BEGGE
  temablokker — `test/style.test.js` vokter begge deler.
- Markørstrengene i §6 i `docs/plan-v130-ui-overhaul.md` er kontrakt og skal
  stå ordrett videre: «Neste deadline», «Ingen kommende deadline»,
  «Formtallene nullstilles», «Ingen overganger er registrert», «Marius XI»,
  «Fant ingen lagoppstilling», `players-table`, «Differensialer», «Fant ingen
  private miniligaer», «Ligatabellen er tom fram til første runde»,
  «Rundebrief», `live-root`, «Ingen aktiv runde», «FPL-nyheter», «Fant ingen
  saker», «Ingen overganger registrert ennå», «Venter på runde», `FPL_TEAM_ID`,
  «404», «Noe gikk galt», `team-name-full`, `aria-current="page">Label<`.
- Conventional commits. Docs i SAMME commit som endringen:
  **CHANGELOG.md** (`[Unreleased]`, Keep a Changelog) for hver brukersynlig
  rettelse; **docs/HANDOVER.md** oppdateres ved hver task (status, git,
  lærdommer, logg over Marius-beskjeder m/ dato; tak 200 linjer — roter
  eldste til `docs/arkiv/HANDOVER-historikk.md`).
- «Bevis, ikke påstander»: aldri «fungerer» uten kommando + output i økten.
- Repoets filer er CRLF — skriv `\r\n` i node-patchskript; bruk Write/Edit
  for norsk prosa og CSS (Bash-heredoc knekker på apostrofer).
- Ved ~95 % usage: stopp, oppdater `docs/HANDOVER.md` grundig, commit alt,
  ingen push.
- TDD-baseline: **299 tester.** Anslag etter planen: **322**. NB fra økt 32:
  en ESM-linkfeil tar HELE testfila — rødfasen kan derfor vise FÆRRE tester
  enn anslått, ikke bare N røde. Før inn observerte tall.

## Pinnede skjønnsvalg (avgjort i planøkten — Opus følger dem)

Alle designvalg er tatt. Marius kan overstyre FØR Opus-økten starter; ellers
gjelder anbefalingen (først i hvert punkt):

1. **Funn 1-omfang:** kun /spillere har rader som scroller uavhengig av siden
   (pinned-boksen) — bare den kan vise «rader uten hode». Dashbord/liga/live-
   tabellene følger sidescrollen (hode og rader forsvinner sammen = normal
   flyt, ikke brutt). *Alternativ (avvist):* sticky thead mot viewport på alle
   tabeller — umulig så lenge `.table-scroll` er en vannrett scrollboks
   (overflow-x gjør elementet til scrollcontainer for sticky).
2. **Funn 1-mekanikk:** fjern den virkningsløse sticky-en på boksen og styr
   i stedet regnestykket: boksens `max-height` får en mobilreserve som er
   større enn alt innhold under boksen, så siden aldri kan scrolle boksen opp
   under topbaren. *Alternativ (avvist):* JS-målt offset — mer kode, samme resultat.
3. **Funn 3 nøytralmarkør:** `–` (tankestrek) i `--text-dim` med
   `aria-label="uendret plassering"`. *Alternativ:* `·`.
4. **Funn 14:** hele raden klikkbar via `data-href` + klikkdelegering i app.js;
   tastatur dekkes av `<a>`-en i raden (Tab + Enter, synlig fokusring finnes).
   Valgt rival markeres med `.row-rival` (bakgrunn `--surface-2`, rosa
   venstrestripe `--accent-2` — speiler `.row-me`-mønsteret; rosa = motstander).
   Standard-rivalen (lederen) markeres også — det er raden differensialpanelet
   faktisk viser. *Alternativ (avvist):* kun hjelpetekst-justering.
5. **Funn 7:** `color: var(--text-dim)` i stedet for opacity — låsbart i
   `PAIRS`, likt i begge temaer; klubbmerkene på benkeradene beholder full
   farge (bevisst). *Alternativ (avvist):* temaavhengig opacity — kan ikke
   låses i testen, må måles manuelt ved hver endring.
6. **Funn 18:** `.grid--start`-utility KUN på anbefalingsgridet på /lag.
   *Alternativ (avvist):* `align-items: start` globalt på `.grid` — endrer
   dashbordets kortpar visuelt uten at noe funn ber om det.
7. **Funn 11:** AI-kortet beholder tittelen «AI-rådgiver» med `.ai-badge`
   foran (dashbordmønsteret). Mockupens /lag mangler cyan-markeringen —
   funnlista (og dashbord-konsistensen) vinner over mockupen her.
8. **Funn 12:** synlig sirkel ved ett datapunkt (beholder informasjonen);
   `preserveAspectRatio="none"` strekker sirkelen litt til ellipse — akseptert.
   *Alternativ (avvist):* tomtilstandstekst.

## Åpne beslutninger til Marius

Ingen — alle skjønnsvalg er pinnet over. Si fra før Opus-økten hvis noen av
de åtte skal overstyres.

---

### Task 1.3-0: Oppstart og branch

**Files:** ingen kodeendring. Modify: `docs/plan-v130-ui-overhaul.md` (ETAPPE
4-stubben), Create (allerede skrevet av planøkten): `docs/plan-v133-qa.md`.

- [x] **Steg 1:** `git status -sb` → rent tre på `main` = `origin/main`.
      Observert: rent tre, main = origin/main (15fa8f5), kun de to nye planfilene utracket
- [x] **Steg 2:** `npm test` → 299/299, `npm run lint` → exit 0.
      Observert: npm test 299/299 pass 0 fail; npm run lint exit 0
- [x] **Steg 3:** `git checkout -b fix/ui-v133-qa`
- [x] **Steg 4:** I `docs/plan-v130-ui-overhaul.md`: erstatt brødteksten i
      seksjonen «# ETAPPE 4 — v1.3.3 QA-rettelser (branch `fix/ui-v133-qa`)»
      (linje ~1940, t.o.m. linja før `---`) med:
      «Funnlista kom 24. aug. Utførelsesplanen ligger i `docs/plan-v133-qa.md`
      — denne fila planlegger kun etappe 1–3.»
- [x] **Steg 5:** Commit: `docs: plan for v1.3.3 QA-rettelser (etappe 4)`
      (begge planfilene).

### Task 1.3-1: Funn 8 + 1 — topbar låses til tokenet, pinned-boksen kan ikke gli under

**Files:** Modify `public/style.css` (:209-219, :306-314, :577-582),
`test/style.test.js`.

**Interfaces — produserer:** `.topbar` med `height: var(--topbar-h)`;
`.table-scroll--pinned` uten `position: sticky`; hjelpefunksjonen `block(sel)`
i style-testen (gjenbrukes av task 1.3-2/3/9).

- [x] **Steg 1 (rød):** nye tester i `test/style.test.js` (etter
      kontrast-løkka):

```js
const block = (sel) => {
  const start = css.indexOf(`${sel} {`);
  assert.notEqual(start, -1, `fant ikke blokken «${sel} {»`);
  return css.slice(start, css.indexOf('\n}', start));
};

test('style.css: topbaren låses til --topbar-h', () => {
  assert.match(block('.topbar'), /height: var\(--topbar-h\)/);
  assert.ok(!block('.topbar').includes('padding: 0.7rem'), 'vertikal padding skal ikke styre høyden');
});

test('style.css: pinned-tabellen er en indre scrollboks uten egen sticky', () => {
  const b = block('.table-scroll--pinned');
  assert.ok(!b.includes('position: sticky'), 'sticky på boksen har ~0 reiserom inne i kortet og er død vekt');
  assert.match(b, /max-height: min\(75vh/);
  assert.match(block('.table-scroll--pinned table.data thead th'), /position: sticky/);
});
```

- [x] **Steg 2:** `node --test test/style.test.js` → forventet 2 røde
      (4 gamle grønne). Observert: 6 tester, 4 pass, 2 fail (som anslått)
- [x] **Steg 3:** `public/style.css`:
      - `.topbar` (:209): erstatt `padding: 0.7rem 1.25rem;` med
        `height: var(--topbar-h);` + `padding: 0 1.25rem;`
        (`* { box-sizing: border-box }` finnes (:170), `align-items: center`
        sentrerer 36px-knappen i 50px).
      - `@media (max-width: 640px)`-blokken (:311-314): `padding: 0.55rem 0.9rem`
        → `padding: 0 0.9rem` (`--topbar-h: 50px` står allerede i medieblokken).
      - `.table-scroll--pinned` (:577-582): fjern `position: sticky;` og
        `top: var(--topbar-h);`. Behold `overflow: auto` og
        `max-height: min(75vh, calc(100dvh - var(--topbar-h) - 13rem));`.
        Legg til i samme medieblokk som topbar-50px:

```css
  /* Reserven må være større enn alt innhold UNDER boksen (footer + marger),
     ellers kan siden scrolle boksen opp bak topbaren. max() beskytter
     lave landskapsvinduer mot en kollapset boks. */
  .table-scroll--pinned {
    max-height: max(14rem, calc(100dvh - var(--topbar-h) - 19rem));
  }
```

- [x] **Steg 4:** `node --test test/style.test.js` → 6/6. `npm test` → 301.
      Observert: style.test.js 6/6, npm test 301/301 pass 0 fail, lint exit 0
- [x] **Steg 5:** Playwright-sjekk 1–2 i qa-v133.mjs (Vedlegg B) mot lokal
      server: topbar eksakt 57/50, thead th ≥ topbarens underkant ved maks
      sidescroll på /spillere 390 i BEGGE temaer. Er sticky-sjekken rød:
      øk 19rem i 1rem-steg til grønn og noter verdien.
      Observert (inkl. endelig rem): qa-t1.mjs (sjekk 1+2, begge temaer × 390/1440): 8/8 OK. TO RETTELSER UTOVER PLANTEKSTEN, begge for at plangrepet skulle virke: (a) mobilreserven lå i medieblokka på linje 307, altså FØR basisregelen på ~577 — lik spesifisitet, så basisregelen vant og reserven hadde null effekt; flyttet til en egen 640px-blokk ETTER pinned-reglene. (b) desktopreserven måtte fra 13rem til 14rem: innholdet under boksen målte 209,4 px mot 13rem = 208 px, så hodet gled 1,4 px for høyt på 1440 (Vedlegg B kjører sjekk 2 i BEGGE bredder). Endelige verdier: 14rem desktop / 19rem mobil. Målt slakk etterpå: thead 71,6 vs topbar 57,0 (1440) og 126,7 vs 50,0 (390), likt i mørkt og lyst.
- [x] **Steg 6:** CHANGELOG `[Unreleased]` → Fixed: «Tabellhodet på /spillere
      legger seg ikke lenger bak toppmenyen på mobil; toppmenyens høyde styres
      av `--topbar-h` (57/50 px).» HANDOVER-status. Commit:
      `fix: topbar låst til --topbar-h og pinned-tabellen kan ikke gli under (QA 1+8)`

### Task 1.3-2: Funn 6 + 7 — kontrast uten opacity

**Files:** Modify `public/style.css` (:1356-1361, :1217-1219),
`test/style.test.js`.

- [x] **Steg 1 (rød):**

```js
test('style.css: ingen opacity-demping på versjonslinja og benkeradene', () => {
  assert.ok(!block('footer .version').includes('opacity'));
  assert.ok(!block('.row-bench td').includes('opacity'));
});
```

      Pluss to nye par i `PAIRS`: `['text-dim', 'bg', 4.5]` (versjonslinja står
      på `--bg`; benkeraden dekkes av eksisterende `['text-dim','surface',4.5]`).
- [x] **Steg 2:** `node --test test/style.test.js` → 1 rød. Observert: 7 tester, 6 pass, 1 fail. NB: planen sier «to nye par i PAIRS», men navngir bare ett — kun ['text-dim', 'bg', 4.5] er lagt til (benkeraden dekkes av det eksisterende text-dim/surface-paret, som planen selv skriver). Det nye paret var grønt fra start.
- [x] **Steg 3:** `footer .version`: fjern `opacity: 0.75;` (arver `--text-dim`
      fra `footer`). `.row-bench td`: erstatt `opacity: 0.55;` med
      `color: var(--text-dim);`.
- [x] **Steg 4:** `node --test test/style.test.js` grønn; `npm test` → 302.
      Observert: style.test.js 7/7, npm test 302/302 pass 0 fail, lint exit 0
- [x] **Steg 5:** CHANGELOG (Fixed: kontrast på versjonslinje/benkerader i lyst
      tema), HANDOVER. Commit:
      `fix: kontrast uten opacity på versjonslinja og benkeradene (QA 6+7)`

### Task 1.3-3: Funn 2 + 9 + 10 — tallgrupper og orddeling

**Files:** Modify `src/services/format.js`, `public/style.css` (:979-992,
:623-626, :1429-1432). Create `test/format.test.js`.

**Interfaces — produserer:** `formatNumber`/`formatSigned` med VANLIGE
mellomrom som tusenskille (brekker mellom grupper, aldri inni).

- [x] **Steg 1 (rød):** ny fil `test/format.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatSigned } from '../src/services/format.js';

test('formatNumber grupperer med vanlige mellomrom, ikke NBSP', () => {
  assert.equal(formatNumber(1339328), '1 339 328');
  assert.equal(formatNumber(609), '609');
});

test('formatSigned bruker også vanlige mellomrom i store tall', () => {
  assert.equal(formatSigned(12345), '+12 345');
  assert.equal(formatSigned(-4), '−4');
});
```

      Og i `test/style.test.js`:

```js
test('style.css: orddeling er manuell i brødtekst og av i statistikkortene', () => {
  assert.match(css, /hyphens: manual/);
  assert.ok(!/hyphens: auto/.test(css));
  assert.match(block('.stat-lbl'), /hyphens: none/);
  assert.match(block('.stat-val'), /hyphens: none/);
  assert.match(block('.num'), /white-space: nowrap/);
});
```

- [x] **Steg 2:** kjør begge filene → forventet 3 røde (NBSP-strengene ser
      like ut i terminalen — sammenlikningen feiler på `\u00A0`/`\u202F`).
      Observert: 10 tester i de to filene, 7 pass, 3 fail (som anslått). NB: planen sier «Create test/format.test.js», men fila FANTES med 3 tester fra v1.2.0 — de to nye ble lagt TIL, ikke erstattet.
- [x] **Steg 3:** `format.js`: i `formatNumber` returner
      `number.format(n).replace(/[\u00A0\u202F]/g, ' ')` (kommentar: Intl
      bruker NBSP; vanlige mellomrom lar tall brekke MELLOM grupper, og
      `white-space: nowrap` på `.num` holder tabellceller hele). I
      `formatSigned` samme `.replace` på `abs`-linja.
      `style.css`: `.stat-val` + `.stat-lbl` får `hyphens: none;`;
      `.num` får `white-space: nowrap;`; body-blokken i ≤480-media (:1429-1432)
      endres `hyphens: auto` → `hyphens: manual` (oppdater kommentaren over:
      lange ord nødbrekkes fortsatt av `overflow-wrap: break-word`, men uten
      automatisk bindestrek).
- [x] **Steg 4:** `npm test` → 305 (302 + 2 format + 1 style). Observert: npm test 305/305 pass 0 fail, lint exit 0
- [x] **Steg 5:** Playwright-sjekk 3 (Vedlegg B): ingen `.stat-val` med
      vannrett overflow på /lag og /overganger 390, `hyphens` computed
      `none`/`manual`. Observert: qa-t3.mjs (begge temaer × 390/1440 × /lag+/overganger, 5 sjekker hver): 40/40 OK. stat-val: hyphens none og 0 px overflow (5 kort på /lag, /overganger har ingen). body-hyphens computed manual, .num nowrap, ingen NBSP igjen i teksten. NB: serveren måtte restartes — ESM-moduler lastes én gang ved oppstart, så gammel format.js ga falske NBSP-treff mens CSS-endringer slo gjennom med én gang.
- [x] **Steg 6:** CHANGELOG (Fixed: tall brekker aldri inni sifergrupper;
      langt mindre orddeling på mobil), HANDOVER. Commit:
      `fix: vanlige mellomrom i tallgrupper og manuell orddeling (QA 2+9+10)`

### Task 1.3-4: Funn 3 + 14 — retningsmarkører og klikkbare rader på /liga

**Files:** Modify `views/league.ejs` (:27-43), `src/routes/league.js` (:53-61),
`public/style.css`, `public/app.js` (ny modul nederst),
`test/views.test.js`, `test/fixtures/views.js` (:117-118).

**Interfaces — produserer:** locals `rivalEntry` til league-viewet; klassene
`.rank-up/.rank-down/.rank-same/.row-rival`; `tr[data-href]`-delegering.

- [x] **Steg 1 (rød):** i `test/fixtures/views.js` legg til en tredje rad i
      liga-fixturens `standings.results`:
      `{ entry: 789, entry_name: 'Nykommer FC', player_name: 'Ny N.', rank: 3, last_rank: 0, event_total: 40, total: 80 },`
      og `rivalEntry: 456` i league-localsene (samme objekt som har
      `formatNumber`). Nye tester i `test/views.test.js`:

```js
test('league.ejs viser retningsmarkører med skjermlesertekst', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /class="rank-up" aria-label="opp 2 plasser">▲/);
  assert.match(html, /class="rank-down" aria-label="ned 1 plass">▼/);
});

test('league.ejs viser nøytral markør uten historikk', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /class="rank-same" aria-label="uendret plassering">–/);
});

test('league.ejs gjør radene klikkbare og markerer valgt rival', async () => {
  const html = await renderView('league', fx.league);
  assert.match(html, /data-href="\/liga\?rival=456"/);
  assert.match(html, /row-rival/);
  assert.ok(!html.includes('data-href="/liga?rival=123"'), 'aldri lenke på min egen rad');
});
```

      (Fixture-eksportene er bekreftet i `test/fixtures/views.js`:
      `league`:108, `team`:64, `players`:103, `live`:182, `transfers`:229 —
      views-testen når dem som `fx.league` osv.)
- [x] **Steg 2:** kjør views-testen → 3 røde. Observert: views.test.js: 61 tester, 58 pass, 3 fail (som anslått)
- [x] **Steg 3:** `views/league.ejs` — radstart og rangcelle erstattes med:

```ejs
<tr class="<%= [r.entry === myEntry ? 'row-me' : '', r.entry === rivalEntry ? 'row-rival' : ''].join(' ').trim() %>"<% if (r.entry !== myEntry) { %> data-href="/liga?rival=<%= r.entry %>"<% } %>>
  <td class="num">
    <%= r.rank %>
    <% if (r.last_rank && r.rank < r.last_rank) { %>
      <span class="rank-up" aria-label="opp <%= r.last_rank - r.rank %> <%= r.last_rank - r.rank === 1 ? 'plass' : 'plasser' %>">▲</span>
    <% } else if (r.last_rank && r.rank > r.last_rank) { %>
      <span class="rank-down" aria-label="ned <%= r.rank - r.last_rank %> <%= r.rank - r.last_rank === 1 ? 'plass' : 'plasser' %>">▼</span>
    <% } else { %>
      <span class="rank-same" aria-label="uendret plassering">–</span>
    <% } %>
  </td>
```

      (De gamle `accent`/`negative`-pilspennene (:30-32) utgår. Resten av raden
      uendret. NB: aria-testen over forventer «opp 2 plasser»/«ned 1 plass» —
      det stemmer med fixture-radene 3→1 og 1→2.)
      `src/routes/league.js`: legg `rivalEntry: diff?.rivalEntry ?? null,` i
      `renderPage`-localsene.
      `public/style.css` (ved `.row-me`-reglene):

```css
.rank-up { color: var(--accent-text); }
.rank-down { color: var(--accent-2-text); }
.rank-same { color: var(--text-dim); }

tr[data-href] { cursor: pointer; }

.row-rival td { background: var(--surface-2); }
.row-rival td:first-child { box-shadow: inset 3px 0 0 var(--accent-2); }
```

      `public/app.js` — ny modul nederst (etter Modul 5):

```js
// Modul 6: Klikkbare tabellrader (/liga). Raden speiler lenken i cellen —
// tastatur og fokus dekkes av selve <a>-en, raden er bare et større mål.
(function () {
  'use strict';
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-href]');
    if (!row || e.target.closest('a')) return;
    window.location.href = row.dataset.href;
  });
})();
```

- [x] **Steg 4:** `npm test` → 308, lint 0. Observert: npm test 308/308 pass 0 fail, lint exit 0
- [x] **Steg 5:** Playwright-sjekk 4–5 (Vedlegg B). Observert: qa-t4.mjs (begge temaer × 390/1440, 4 sjekker hver): 16/16 OK. Ekte liga har 4 rader, alle med aria-merket markør; 3 klikkbare (egen rad har ingen data-href), cursor pointer; klikk på radcellen navigerte til /liga?rival=7185653 og .row-rival dukket opp.
- [x] **Steg 6:** CHANGELOG (Fixed: retningsmarkører med skjermlesertekst også
      i runde 1; Added: hele ligaraden klikkbar, valgt rival markeres),
      HANDOVER. Commit: `fix: retningsmarkører og klikkbare rader på /liga (QA 3+14)`

### Task 1.3-5: Funn 4 — formasjonen i Oppstilling-hodet

**Files:** Modify `src/services/analysis.js` (etter `resolvePicks`),
`src/routes/team.js` (:61), `views/team.ejs` (:24), `public/style.css`,
`test/analysis.test.js`, `test/views.test.js`, `test/fixtures/views.js`.

**Interfaces — produserer:** `formationOf(starters)` → `'3-5-2'`;
`squadView.formation`; `.h2-meta`-wrapper for høyresiden i korthoder.

- [x] **Steg 1 (rød):** `test/analysis.test.js`:

```js
test('formationOf teller forsvar-midtbane-angrep, keeper holdes utenfor', () => {
  const s = (t) => ({ player: { element_type: t } });
  assert.equal(formationOf([s(1), s(2), s(2), s(2), s(3), s(3), s(3), s(3), s(3), s(4), s(4)]), '3-5-2');
});

test('formationOf tåler tom liste', () => {
  assert.equal(formationOf([]), '0-0-0');
});
```

      `test/views.test.js` (fixture: sett `formation: '3-4-3'` i
      team-fixturens `squadView`):

```js
test('team.ejs viser formasjonen i Oppstilling-hodet', async () => {
  const html = await renderView('team', fx.team);
  assert.match(html, /h2-meta"><span class="dim">3-4-3<\/span>/);
});
```

- [x] **Steg 2:** kjør → 3 røde (formationOf er udefinert — importlinja kan
      felle hele analysis-testfila i rødfasen, da vises færre tester).
      Observert: analysis.test.js + views.test.js: 63 tester, 61 pass, 2 fail — ESM-linkfeilen felte HELE analysis-fila (teller som 1 feil), pluss team.ejs-testen. Som planen advarte om: færre synlige røde enn anslått.
- [x] **Steg 3:** `analysis.js`:

```js
/** «3-5-2» fra starterne: forsvar-midtbane-angrep. Keeperen telles ikke. */
export function formationOf(starters) {
  const count = (t) => starters.filter((s) => s.player.element_type === t).length;
  return `${count(2)}-${count(3)}-${count(4)}`;
}
```

      `team.js` (:61): `squadView = { byLine, bench, entryHistory: picks.entry_history, activeChip: picks.active_chip, formation: formationOf(starters) };`
      (+ importer `formationOf`).
      `team.ejs` (:24):

```ejs
<h2><span class="h2-title">Oppstilling</span><span class="h2-meta"><span class="dim"><%= squadView.formation %></span><% if (squadView.activeChip) { %><span class="status">Chip: <%= squadView.activeChip %></span><% } %></span></h2>
```

      `style.css` (ved `.card h2`-reglene):

```css
.card h2 .h2-meta { display: inline-flex; gap: var(--space-2); align-items: baseline; }
```

- [x] **Steg 4:** `npm test` → 311, lint 0. Observert: npm test 311/311 pass 0 fail, lint exit 0
- [x] **Steg 5:** CHANGELOG (Added: formasjonen vises i Oppstilling-hodet),
      HANDOVER. Commit: `feat: formasjonen i Oppstilling-hodet på /lag (QA 4)`

### Task 1.3-6: Funn 5 — tellere i korthodene på /live

**Files:** Modify `views/live.ejs` (:19, :26), `public/app.js` (Modul 3),
`test/views.test.js`.

- [x] **Steg 1 (rød):** `test/views.test.js` (bruk live-fixturens faktiske
      lengder):

```js
test('live.ejs viser antall til høyre i korthodene', async () => {
  const html = await renderView('live', fx.live);
  assert.match(html, new RegExp('id="live-count-players">' + fx.live.live.myPlayers.length + '<'));
  assert.match(html, new RegExp('id="live-count-matches">' + fx.live.live.matches.length + '<'));
});
```

- [x] **Steg 2:** rød. Observert: views.test.js: 63 tester, 62 pass, 1 fail
- [x] **Steg 3:** `live.ejs`:
      `<h2><span class="h2-title">Mine spillere</span><span class="dim" id="live-count-players"><%= live.myPlayers.length %></span></h2>`
      og tilsvarende `Kamper` / `live-count-matches` / `live.matches.length`.
      `app.js` Modul 3: hent `const playersCount = document.getElementById('live-count-players');`
      og `matchesCount` ved de andre oppslagene (:215-221); i `render(live)`
      etter `matchesRoot.innerHTML`-blokken:
      `if (playersCount) playersCount.textContent = live.myPlayers.length;`
      `if (matchesCount) matchesCount.textContent = live.matches.length;`
      Liga-kortene (JS-genererte) får telleren i template-strengen (:280):
      `'<section class="card"><h2><span class="h2-title">' + escapeHtml(l.name) + '</span><span class="dim">' + l.top.length + '</span></h2><div class="table-scroll">…'`
- [x] **Steg 4:** `npm test` → 312, lint 0. Observert: npm test 312/312 pass 0 fail, lint exit 0
- [x] **Steg 5:** CHANGELOG (Added: tellere i /live-korthodene som på
      dashbordet), HANDOVER. Commit: `feat: tellere i korthodene på /live (QA 5)`

### Task 1.3-7: Funn 12 — grafen ved ett datapunkt

**Files:** Modify `src/services/analysis.js` (`rankGraph`, :360),
`views/team.ejs` (:65), `test/analysis.test.js`, `test/views.test.js`,
`test/fixtures/views.js`.

- [x] **Steg 1 (rød):** `test/analysis.test.js`:

```js
test('rankGraph flagger ett-punkts-grafen', () => {
  assert.equal(rankGraph([{ event: 1, overall_rank: 5 }], 600, 140).single, true);
  assert.equal(rankGraph([{ event: 1, overall_rank: 100 }, { event: 2, overall_rank: 50 }], 600, 140).single, false);
});
```

      `test/views.test.js` (fixture: sett team-fixturens `graph` til
      `{ points: '0,70', area: null, single: true, min: 5, max: 5, first: 5, last: 5 }`
      i en egen render, eller legg `single: false` i eksisterende graf-fixture
      og en ny variant med `single: true`):

```js
test('team.ejs tegner en synlig markør når grafen bare har ett punkt', async () => {
  const html = await renderView('team', { ...fx.team, graph: { points: '0,70', area: null, single: true, min: 5, max: 5, first: 5, last: 5 } });
  assert.match(html, /<circle cx="0" cy="70" r="5" fill="var\(--accent\)"/);
});
```

- [x] **Steg 2:** rød (2 nye). Eksisterende graf-fixture uten `single` rendrer
      fortsatt (falsy → ingen sirkel). Observert: analysis+views: 126 tester, 124 pass, 2 fail (ingen ESM-linkfeil denne gangen — rankGraph var allerede importert)
- [x] **Steg 3:** `rankGraph` returner
      `{ points, area, min, max, first: values[0], last: values[values.length - 1], single: ranks.length === 1 }`.
      `team.ejs` etter polyline-linja (:65):

```ejs
      <%# Ett punkt: span=0 gir alltid x=0,y=70 (height/2) i rankGraph. %>
      <% if (graph.single) { %><circle cx="0" cy="70" r="5" fill="var(--accent)" /><% } %>
```

      (Bonuspunktet i funnet er allerede oppfylt: polylinja HAR
      `vector-effect="non-scaling-stroke"` — verifisert, ingen endring.)
- [x] **Steg 4:** `npm test` → 314, lint 0. Observert: npm test 314/314 pass 0 fail, lint exit 0
- [x] **Steg 5:** CHANGELOG (Fixed: rank-grafen viser en markør ved ett
      datapunkt), HANDOVER. Commit: `fix: synlig markør i rank-grafen ved ett datapunkt (QA 12)`

### Task 1.3-8: Funn 13 — tomtilstand på /spillere

**Files:** Modify `views/players.ejs` (:78, etter `</div>`), `public/app.js`
(Modul 2), `public/style.css` (`.btn-link` ved behov), `test/views.test.js`.

- [x] **Steg 1 (rød):**

```js
test('players.ejs har en skjult tomtilstand for null filtertreff', async () => {
  const html = await renderView('players', fx.players);
  assert.match(html, /id="players-empty" hidden>Ingen spillere matcher filtrene\./);
  assert.match(html, /id="players-empty-reset"[^>]*>Nullstill filtrene</);
});
```

- [x] **Steg 2:** rød. Observert: views.test.js: 65 tester, 64 pass, 1 fail
- [x] **Steg 3:** `players.ejs` — inne i kortet, rett etter `</div>`
      (table-scroll, :78):

```ejs
  <p class="empty" id="players-empty" hidden>Ingen spillere matcher filtrene.
    <button type="button" class="btn-link" id="players-empty-reset">Nullstill filtrene</button></p>
```

      `app.js` Modul 2: ved elementoppslagene (:165-170) legg
      `const empty = document.getElementById('players-empty');` og
      `const emptyReset = document.getElementById('players-empty-reset');`.
      I `applyFilters()` etter løkka: `if (empty) empty.hidden = shown !== 0;`.
      Etter reset-lytteren: `if (emptyReset) emptyReset.addEventListener('click', () => reset.click());`.
      `style.css`: sjekk `.btn-link`-blokken (:1291) — mangler den
      `cursor: pointer;`, legg det til (den brukes nå også på en `<button>`).
- [x] **Steg 4:** `npm test` → 315, lint 0. Observert: npm test 315/315 pass 0 fail, lint exit 0. NB: .btn-link hadde allerede cursor: pointer — ingen CSS-endring nødvendig.
- [x] **Steg 5:** Playwright-sjekk 8 (Vedlegg B): filtrer til 0 treff →
      tomtilstand synlig, «Viser 0 av», klikk nullstill → rader tilbake.
      Observert: qa-t8.mjs (begge temaer × 390/1440): 8/8 OK. Viser 0 av 609 spillere, 0 synlige rader, tomtilstand synlig; etter nullstill 609 rader tilbake og tomtilstanden skjult igjen.
- [x] **Steg 6:** CHANGELOG (Added: tomtilstand med nullstill-knapp på
      /spillere), HANDOVER. Commit: `feat: tomtilstand på /spillere ved null filtertreff (QA 13)`

### Task 1.3-9: Funn 16 + 17 — kantfade på mobilmenyen og tabellene

**Files:** Modify `public/app.js` (filnivå + Modul 0 + Modul 3),
`public/style.css` (`.table-scroll` + nye klasser), `test/app-client.test.js`,
`test/style.test.js`.

**Interfaces — produserer:** `edgeFadeState(scrollLeft, scrollWidth, clientWidth)`
→ `{ left, right }`; `initEdgeFades(el, prefix)`; klassene
`.table-fade-left/.table-fade-right`.

- [x] **Steg 1 (rød):** `test/app-client.test.js`:

```js
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
```

      `test/style.test.js`:

```js
test('style.css: tabellboksene har samme kantfade-mekanikk som menyen', () => {
  assert.match(block('.table-scroll'), /mask-image: linear-gradient\(90deg/);
  assert.match(css, /\.table-scroll\.table-fade-left \{ --fade-l: 28px; \}/);
  assert.match(css, /\.table-scroll\.table-fade-right \{ --fade-r: 28px; \}/);
});
```

- [x] **Steg 2:** rød (3 nye; vm-konteksten trenger ingen nye stubber —
      `requestAnimationFrame` kalles bare når nav finnes). Observert: app-client + style: 22 tester, 19 pass, 3 fail (som anslått)
- [x] **Steg 3:** `app.js` — på filnivå (ved `clubBadgeHtml`):

```js
// Kantfade-tilstand for en vannrett scrollboks. Ren funksjon (testes i
// test/app-client.test.js); 4 px slingring så subpiksel-scroll ikke flimrer.
function edgeFadeState(scrollLeft, scrollWidth, clientWidth) {
  const maxScroll = scrollWidth - clientWidth;
  return { left: scrollLeft > 4, right: maxScroll - scrollLeft > 4 };
}

// Delte oppdaterere: resize treffer alle registrerte bokser; oppdaterere for
// elementer som er fjernet fra DOM (live-rerender) melder seg av selv.
const edgeFadeUpdates = new Set();

function initEdgeFades(el, prefix) {
  function update() {
    if (!el.isConnected) { edgeFadeUpdates.delete(update); return; }
    const s = edgeFadeState(el.scrollLeft, el.scrollWidth, el.clientWidth);
    el.classList.toggle(prefix + '-left', s.left);
    el.classList.toggle(prefix + '-right', s.right);
  }
  update();
  el.addEventListener('scroll', update, { passive: true });
  edgeFadeUpdates.add(update);
  return update;
}
```

      Modul 0 skrives om (fikser funn 16-racen: lytterne festes og målingen
      gjentas i neste frame, siden `scrollIntoView` kan fullføre etter første
      måling):

```js
// Modul 0: Kantfade på vannrette scrollbokser — mobilmenyen og tabellene.
// Faden vises bare mot kanter med skjult innhold. Modul 3 initierer på nytt
// for tabeller den rendrer selv.
(function () {
  'use strict';

  window.addEventListener('resize', () => {
    for (const update of edgeFadeUpdates) update();
  });

  const nav = document.querySelector('.topbar nav');
  if (nav) {
    const update = initEdgeFades(nav, 'nav-overflow');
    const active = nav.querySelector('a[aria-current="page"]');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
    requestAnimationFrame(update);
  }

  for (const box of document.querySelectorAll('.table-scroll')) {
    initEdgeFades(box, 'table-fade');
  }
})();
```

      Modul 3, etter `leaguesRoot.innerHTML = …`-blokken i `render()`:

```js
    for (const box of leaguesRoot.querySelectorAll('.table-scroll')) {
      initEdgeFades(box, 'table-fade');
    }
```

      `style.css` — i `.table-scroll`-blokken (:547, gjelder ALLE bredder):

```css
  --fade-l: 0px;
  --fade-r: 0px;
  mask-image: linear-gradient(90deg, transparent, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 var(--fade-l), #000 calc(100% - var(--fade-r)), transparent);
```

      og etter blokken:

```css
.table-scroll.table-fade-left { --fade-l: 28px; }
.table-scroll.table-fade-right { --fade-r: 28px; }
```

      (mask-linjer filtreres allerede fra fargeskannen i style-testen. Kjent
      kosmetikk: faden tar også med seg endene av scrollbaren i boksen —
      akseptert. Nav-CSS-en (:319-332) er uendret; klassene heter det samme.)
- [x] **Steg 4:** `npm test` → 318, lint 0. Observert: npm test 318/318 pass 0 fail, lint exit 0
- [x] **Steg 5:** Playwright-sjekk 9 (Vedlegg B): venstrefade på nav når
      aktiv side er scrollet inn (/lag 390), tabellfade høyre ved overflow og
      venstre etter scroll. Observert: qa-t9.mjs (begge temaer, 390 px): 6/6 OK. Nav på /lag: overflow, scrollet inn, BEGGE fadeklassene satt. Dashbordtabell: table-fade-right i ro, etter scroll til enden table-fade-left og right borte; mask-image satt i computed style.
- [x] **Steg 6:** CHANGELOG (Fixed: myk uttoning på begge kanter av menyen;
      Added: samme kanthint på vannrett scrollende tabeller), HANDOVER.
      Commit: `fix: kantfade på begge menykanter og på tabellbokser (QA 16+17)`

### Task 1.3-10: Funn 11 + 15 + 18 — AI-kort, 404-lenke, kortstrekk

**Files:** Modify `views/team.ejs` (:73, :115-116), `views/404.ejs` (:4),
`public/style.css`, `test/views.test.js`.

- [x] **Steg 1 (rød):**

```js
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
```

- [x] **Steg 2:** rød (3 nye; den eksisterende feilside-testen
      (`views.test.js:291-297`) krever fortsatt `href="/" class="btn-link"` —
      den forblir grønn). Observert: views.test.js: 68 tester, 65 pass, 3 fail (som anslått). Den eksisterende feilside-testen forble grønn.
- [x] **Steg 3:** `team.ejs` (:115-116):
      `<section class="card card-wide card-ai" id="ai-advice-box">` og
      `<h2><span class="h2-title"><span class="ai-badge">AI</span> AI-rådgiver</span></h2>`.
      `team.ejs` (:73): `<div class="grid grid--start">` (kun anbefalingsgridet).
      `404.ejs` (:4): `<p>Adressen peker ikke på noe her.</p>` (mockupens
      ordlyd; tekstlenka fjernes, `«404»`-markøren og knappen står).
      `style.css` (ved `.grid`-reglene):

```css
/* Kort som ikke skal strekkes til naboens høyde (anbefalingene på /lag). */
.grid--start { align-items: start; }
```

- [x] **Steg 4:** `npm test` → 321, lint 0. Observert: npm test 321/321 pass 0 fail, lint exit 0
- [x] **Steg 5:** CHANGELOG (Fixed: cyan AI-markering på rådgiverkortet, én
      lenke på 404, Kapteinsvalg strekkes ikke forbi innholdet), HANDOVER.
      Commit: `fix: AI-markering på /lag, enkel 404-lenke, kortstrekk (QA 11+15+18)`

### Task 1.3-11: Uverifisert — transfers-pillene finnes og har riktig farge

**Files:** Modify `test/views.test.js`, ev. `test/fixtures/views.js`.

- [x] **Steg 1:** inspiser transfers-fixturen (`test/fixtures/views.js:239`):
      `bestIndex: 0` finnes — sørg for at også `worstIndex` peker på en spilt
      rad (sett den om den er `null` i hovedfixturen med rader).
- [x] **Steg 2 (rød):**

```js
test('transfers.ejs merker beste og verste bytte som piller', async () => {
  const html = await renderView('transfers', fx.transfers);
  assert.match(html, /status status-best">Beste</);
  assert.match(html, /status status-worst">Verste</);
});
```

- [x] **Steg 3:** kjør → forventet GRØNN med én gang hvis fixturen alt har
      begge indeksene (markupen finnes i `transfers.ejs:47-48`); rød kun hvis
      fixturen manglet `worstIndex`. Uansett: testen låser markupen.
      CSS-fargene er verifisert token-baserte (`style.css:662-669`:
      `--accent-soft`/`--accent-text` og `--accent-2-soft`/`--negative`) og
      kontrasten ble målt manuelt i v1.3.2 (HANDOVER: 10,42/5,66 og 5,39/5,27)
      — ingen CSS-endring.
      Observert (rød/grønn + tall): GRØNN med én gang: fixturen har bestIndex 0 og worstIndex 1, begge på spilte rader. views.test.js 69/69.
- [x] **Steg 4:** `npm test` → 322, lint 0. Observert: npm test 322/322 pass 0 fail, lint exit 0 — måltallet i planen truffet nøyaktig
- [x] **Steg 5:** HANDOVER: uverifisert-punktet lukket (test, ikke drift).
      ROADMAP: ingen endring (P3-punktet om ekte data står). Commit:
      `test: lås beste/verste-pillene på /overganger`

### Task 1.3-12: Røyk, Playwright, docs — STOPP

**Files:** Modify `docs/HANDOVER.md`, `docs/VIDERE.md`, `ROADMAP.md`,
`CHANGELOG.md` (kun inspeksjon), `README.md` (kun ved behov).

- [ ] **Steg 1:** `npm test` → 322, `npm run lint` → 0. Observert: ______
- [ ] **Steg 2:** Røyk uten nøkler: scratchpad-.env (tomme nøkler),
      `/health` → `ai:false, discord:false` FØRST, deretter alle 11 ruter →
      200 (`/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`, `/nyheter`,
      `/overganger`, `/health`, `/api/brief.json`, `/api/live.json`) + ukjent
      sti → 404. `/brief` og `/nyheter` ER med — de er gratis uten nøkkel.
      Observert: ______
- [ ] **Steg 3:** Playwright lokalt: `node qa.mjs http://localhost:3011` →
      0 feil av 332, `node qa-clubs.mjs` → 22/22, og `node qa-v133.mjs` →
      0 feil (Vedlegg B; skriv fila til scratchpad). Observert: ______
- [ ] **Steg 4:** Docs-sveip i én commit:
      - `docs/VIDERE.md`: «Nytt siden sist» skrives om til v1.3.3 i
        brukerspråk (tabellhodet holder seg synlig, piler i ligaen, formasjon,
        tellere, roligere orddeling, tomtilstand på Spillere, kantfade);
        forrige avsnitt demoteres til «Fra før»; overskriften «Dette har du
        nå (v1.3.x …)» bumpes.
      - `ROADMAP.md`: kø-punkt 5: huk av etappe 4 med observerte tall
        (tester/lint/Playwright). Versjonsplan-raden v1.3.3 røres IKKE ennå
        (strykes ved release i 1.3-13). Vurder P2-raden («README-skjermbilder
        + mobil-QA» — fortsatt Marius' punkt, IKKE huk av) og P3 (uendret).
      - `README.md`: sjekk om skjermbilder/beskrivelser er utdatert av
        rettelsene (liste-siden /liga og /spillere er endret) — noter i
        HANDOVER hvis P2-punktet bør oppdateres av Marius.
      - `docs/HANDOVER.md`: full status, testtall, gjenstår kun release.
      Commit: `docs: status etter QA-rettelsene, klar for v1.3.3`
- [ ] **Steg 5:** Rapportér til Marius: testtall 299 → observert, lint,
      Playwright-tall, rettede funn (alle 18 + uverifisert), og **STOPP —
      ingen release uten klarsignal.**

### Task 1.3-13: Release v1.3.3 (KUN på klarsignal fra Marius)

**Files:** `package.json` (via `npm version`), `CHANGELOG.md`, `ROADMAP.md`,
`docs/HANDOVER.md`, `docs/VIDERE.md`, arkivflytt av begge planfilene.

- [ ] **Steg 0: KLARSIGNAL FRA MARIUS FORELIGGER.** Observert (ordrett): ______
- [ ] **Steg 1: tidsvindu.** Nå er FØR fredag 28. aug ~18:00, ELLER GW2 er
      ferdigspilt (alle kamper `finished_provisional`). Aldri torsdag
      19:00–21:00. Sjekk `fixtures/?event=2` (og `?event=3` ved sen release):
      ingen kamp `started && !finished_provisional`. Observert: ______
- [ ] **Steg 2:** `npm version patch` → 1.3.3 (på branchen).
- [ ] **Steg 3:** CHANGELOG: flytt `[Unreleased]`-punktene til
      `## [1.3.3] - <dato>`. ROADMAP: stryk v1.3.3-raden i versjonsplanen,
      flytt v1.3.0–v1.3.3 til utført-historikken. VIDERE/HANDOVER: bump.
      Arkiver `docs/plan-v130-ui-overhaul.md` OG `docs/plan-v133-qa.md` til
      `docs/arkiv/` (`git mv`). Commit: `chore(release): v1.3.3`
- [ ] **Steg 4:** `git checkout main` + `git merge --no-ff fix/ui-v133-qa`.
- [ ] **Steg 5:** `npm test` + `npm run lint` på main. Observert: ______
- [ ] **Steg 6: INSPISER CHANGELOG-plasseringen etter merge** — åpne fila og
      se at 1.3.3-punktene står under `[1.3.3]`, ikke i en eldre seksjon
      (git har plassert punkter feil uten konflikt før). Observert: ______
- [ ] **Steg 7:** `git tag v1.3.3` + push av main og taggen (klarsignalet fra
      steg 0 dekker pushen; tidsvinduet fra steg 1 sjekkes PÅ NYTT om det har
      gått over en time). Coolify auto-deployer.
- [ ] **Steg 8: prod-verifisering UTEN `/brief` og `/nyheter`:** `/health` →
      200 med `ai:true, discord:true`, footer `v1.3.3`, ny asset-hash på
      `style.css`/`app.js`, 9 ruter → 200 (alle UNNTATT /brief og /nyheter)
      + 404. **0 AI-kall.** Observert: ______
- [ ] **Steg 9:** Playwright mot prod: `node qa-prod.mjs` (240 sjekker — den
      utelater AI-sidene) + `node qa-clubs-prod.mjs` (14) + qa-v133.mjs mot
      prod med `PAGES` uten `/brief`/`/nyheter`. Observert: ______
- [ ] **Steg 10:** `git branch -d fix/ui-v133-qa`. HANDOVER: release-status,
      observerte prod-tall, loggpost for klarsignalet. Commit + push (dekket
      av klarsignalet). Rapportér.

## Vedlegg B — qa-v133.mjs (scratchpad, aldri i repoet)

Kjøres i tillegg til qa.mjs: `node qa-v133.mjs http://localhost:3011`.
Mot prod: fjern `/brief`/`/nyheter` fra PAGES-lista (her er de uansett ikke med).

```js
// qa-v133.mjs — navngitte sjekker for QA-funnene i v1.3.3.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:3011';
const fails = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const browser = await chromium.launch();

for (const theme of ['dark', 'light']) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, colorScheme: theme });
    const page = await ctx.newPage();
    const tag = `${theme} ${width}px`;

    // 1: topbar er eksakt --topbar-h (57/50)
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const th = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
    check(Math.abs(th - (width <= 640 ? 50 : 57)) < 0.6, `${tag}: topbar ${th}px`);

    // 14: versjonslinja uten opacity
    const vOp = await page.evaluate(() => getComputedStyle(document.querySelector('footer .version')).opacity);
    check(vOp === '1', `${tag}: footer .version opacity ${vOp}`);

    // 2: sticky thead på /spillere ved maks sidescroll
    await page.goto(base + '/spillere', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const m = await page.evaluate(() => ({
      thTop: document.querySelector('.table-scroll--pinned thead th').getBoundingClientRect().top,
      topbarBottom: document.querySelector('.topbar').getBoundingClientRect().bottom,
    }));
    check(m.thTop >= m.topbarBottom - 0.5, `${tag}: thead ${m.thTop} < topbar ${m.topbarBottom}`);

    // 8: tomtilstand på /spillere (filtrer til 0 treff, nullstill)
    const empty = await page.evaluate(() => {
      const set = (id, v, ev) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event(ev, { bubbles: true })); };
      set('filter-position', '1', 'change');
      set('filter-price', '3.5', 'input');
      set('filter-search', 'zzz-finnes-ikke', 'input');
      const shown = !document.getElementById('players-empty').hidden;
      const count = document.getElementById('filter-count').textContent;
      document.getElementById('players-empty-reset').click();
      return { shown, count, hiddenAgain: document.getElementById('players-empty').hidden };
    });
    check(empty.shown && empty.count.startsWith('Viser 0 av') && empty.hiddenAgain, `${tag}: tomtilstand ${JSON.stringify(empty)}`);

    // 3: statistikkort uten mid-gruppe-brekk (proxy: css + ingen overflow)
    await page.goto(base + '/lag', { waitUntil: 'networkidle' });
    const stats = await page.evaluate(() => [...document.querySelectorAll('.stat-val')].map((el) => ({
      hy: getComputedStyle(el).hyphens, over: el.scrollWidth - el.clientWidth,
    })));
    check(stats.every((s) => s.hy === 'none' && s.over <= 1), `${tag}: stat-val ${JSON.stringify(stats)}`);

    // 6: formasjonen i Oppstilling-hodet matcher banen
    const form = await page.evaluate(() => {
      const dim = document.querySelector('.h2-meta .dim');
      const rows = [...document.querySelectorAll('.pitch .pitch-row')].map((r) => r.querySelectorAll('.chip').length);
      return { text: dim ? dim.textContent : null, derived: rows.slice(1).join('-') };
    });
    check(form.text !== null && /^\d+-\d+-\d+$/.test(form.text) && form.text === form.derived, `${tag}: formasjon ${JSON.stringify(form)}`);

    // 13: AI-kortet har cyan-markeringen (KNAPPEN KLIKKES ALDRI)
    const ai = await page.evaluate(() => {
      const box = document.getElementById('ai-advice-box');
      return box && box.classList.contains('card-ai') && Boolean(box.querySelector('.ai-badge'));
    });
    check(ai, `${tag}: ai-advice-box mangler card-ai/ai-badge`);

    // 12: grid--start strekker ikke kortene
    const grid = await page.evaluate(() => {
      const g = document.querySelector('.grid--start');
      return g ? getComputedStyle(g).alignItems : null;
    });
    check(grid === null || grid === 'start', `${tag}: grid--start align-items ${grid}`);

    // 10: graf-markør ved ett punkt (kun når grafen faktisk har ett punkt)
    const graph = await page.evaluate(() => {
      const poly = document.querySelector('.rank-graph polyline');
      if (!poly) return { skip: true };
      const single = !poly.getAttribute('points').includes(' ');
      return { skip: false, single, circle: Boolean(document.querySelector('.rank-graph circle')) };
    });
    check(graph.skip || graph.single === graph.circle, `${tag}: graf ${JSON.stringify(graph)}`);

    // 9a: kantfade nav — aktiv side scrollet inn på 390 → fade der det er skjult innhold
    if (width === 390) {
      const nav = await page.evaluate(() => {
        const n = document.querySelector('.topbar nav');
        const overflow = n.scrollWidth - n.clientWidth > 4;
        return { overflow, scrolled: n.scrollLeft > 4, left: n.classList.contains('nav-overflow-left'), right: n.classList.contains('nav-overflow-right') };
      });
      check(!nav.overflow || (nav.scrolled ? nav.left : nav.right), `${tag}: nav-fade ${JSON.stringify(nav)}`);

      // 9b: tabellfade på en vannrett scrollende boks
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      const fade = await page.evaluate(() => {
        const box = [...document.querySelectorAll('.table-scroll')].find((b) => b.scrollWidth - b.clientWidth > 4);
        if (!box) return { skip: true };
        const right = box.classList.contains('table-fade-right');
        box.scrollTo(box.scrollWidth, 0);
        return new Promise((res) => setTimeout(() => res({ skip: false, right, leftAfter: box.classList.contains('table-fade-left') }), 100));
      });
      check(fade.skip || (fade.right && fade.leftAfter), `${tag}: tabellfade ${JSON.stringify(fade)}`);
    }

    // 4+5: /liga — markører, aria, radklikk, rivalmarkering
    await page.goto(base + '/liga', { waitUntil: 'networkidle' });
    const liga = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('table.data tbody tr')];
      if (rows.length === 0) return { skip: true };
      const marked = rows.every((r) => r.querySelector('.rank-up[aria-label], .rank-down[aria-label], .rank-same[aria-label]'));
      const clickable = rows.filter((r) => r.dataset.href);
      const cursor = clickable.length === 0 || getComputedStyle(clickable[0]).cursor === 'pointer';
      return { skip: false, marked, cursor, href: clickable[0] ? clickable[0].dataset.href : null };
    });
    check(liga.skip || (liga.marked && liga.cursor), `${tag}: liga-markører ${JSON.stringify(liga)}`);
    if (!liga.skip && liga.href) {
      await page.goto(base + liga.href, { waitUntil: 'networkidle' });
      const rival = await page.evaluate(() => Boolean(document.querySelector('.row-rival')));
      check(rival, `${tag}: row-rival mangler etter rival-klikk`);
    }

    // 11: 404 med bare knappelenken
    await page.goto(base + '/denne-finnes-ikke', { waitUntil: 'networkidle' });
    const notFound = await page.evaluate(() => ({
      links: document.querySelectorAll('.empty-state a').length,
      btn: Boolean(document.querySelector('.empty-state a.btn-link')),
    }));
    check(notFound.links === 1 && notFound.btn, `${tag}: 404-lenker ${JSON.stringify(notFound)}`);

    // 7: /live-tellere (hopper over ved «Ingen aktiv runde»)
    await page.goto(base + '/live', { waitUntil: 'networkidle' });
    const live = await page.evaluate(() => {
      const el = document.getElementById('live-count-players');
      if (!el) return { skip: true };
      return { skip: false, count: el.textContent, rows: document.querySelectorAll('#live-players tbody tr').length };
    });
    check(live.skip || Number(live.count) === live.rows, `${tag}: live-teller ${JSON.stringify(live)}`);

    await ctx.close();
  }
}

await browser.close();
console.log(fails.length ? `FEIL ${fails.length} av ${checks}:\n` + fails.join('\n') : `OK ${checks}/${checks}`);
process.exit(fails.length ? 1 : 0);
```

Forventet: ~60 sjekker (2 temaer × 2 bredder × ~14, noen kun på 390), 0 feil.
Skip-utfall (tom liga, ingen aktiv runde, flerpunkts graf) noteres i
observert-feltet, de teller som grønne.

## Verifiseringstabell (samlet)

| # | Sjekk | Kommando/handling | Forventet | Observert |
|---|---|---|---|---|
| 1 | Enhetstester | `npm test` | 299 → 322, exit 0 | ______ |
| 2 | Lint | `npm run lint` | exit 0 | ______ |
| 3 | Tokenparitet/kontrast/mekanikk-låser | `node --test test/style.test.js` | alle grønne, 2 nye PAIRS-par | ______ |
| 4 | Røyk uten nøkler | scratchpad-.env, `/health` FØRST | `ai:false, discord:false`, 11 ruter 200, 404 | ______ |
| 5 | Playwright basis | `node qa.mjs` + `qa-clubs.mjs` | 0 feil av 332 + 22/22 | ______ |
| 6 | Playwright v1.3.3 | `node qa-v133.mjs` | 0 feil (~60) | ______ |
| 7 | AI-kall hele etappen | opptelling | **0** | ______ |
| 8 | Prod etter release | 9 ruter + `/health` + footer, UTEN /brief //nyheter | 200, `v1.3.3`, ny hash | ______ |
| 9 | Playwright prod | `qa-prod.mjs` + `qa-clubs-prod.mjs` + v133 u/AI-sider | 240 + 14 + ~60, 0 feil | ______ |
| 10 | Regresjonslista fra QA | manuell/Playwright: tema-syklus, sortering, filtre, fokus, ingen sidescroll, merker/drakter, row-me, hero, footer, FDR | alt uendret | ______ |
