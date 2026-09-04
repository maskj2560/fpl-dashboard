# Økt-prompt til Opus — v1.13.2 «UX-polering 2»: ti småfiks fra funksjonsgjennomgangen

> Skrevet 4. september 2026 (økt 59, Fable) etter gjennomgangen av alle 9 sider +
> tverrgående. Planprompten som styrte gjennomgangen er konsumert og slettet (git
> bevarer den: `git show edba4a7:docs/prompt-ux-gjennomgang-v1132.md`). Marius
> valgte «Fiks» på alle ti funn i tre puljer 4. sep; fire større kandidater gikk
> til «Senere / idéer» i ROADMAP. Denne prompten er konsumert når v1.13.2 er i
> prod — da slettes fila (T9), og git bevarer den.

## Slik brukes den

Lim inn blokka under «Prompten» i en ny Opus-økt i plan-modus. Økten skal
**verifisere premissene, skrive planen, få den godkjent av Marius, så bygge**.
Ingen kode før godkjenning. Alle premisser under er målt 4. sep 2026 på
`main` = `edba4a7` (v1.13.1 + docs) — linjenumre kan ha flyttet seg, verifiser
mot koden før du siterer dem.

## Fasit (besluttet av Marius 4. sep, økt 59 — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Form | ti småfiks fra gjennomgangen, bygget som **én patch-release**. Hver fiks: én view/CSS/app.js-endring (+ rute der viewet trenger en ny local), ≤ ~1 time, ingen nye FPL-kall, ingen ny modul. |
| Fiksene | **1** kortere logo på mobil (nav får plass) · **2** rad-tak på /spillere (første 100 treff + «Vis alle») · **3** managernavn på egen linje i ligatabellen · **4** tomtilstand for Lagsjekk-kortet på /brief · **5** feilstatus på /live når hentingen glipper · **6** `--fs-xs` 11,2 → 12 px · **7** appens datoformat på /nyheter · **8** sammenleggbare forklaringer på /innsikt · **9** «neste avspark» mellom runder på /live · **10** «Nå»-kolonna i Prisgevinst skjules på mobil. Detaljer i T1–T8. |
| Behold | ingen funn ble «Behold». |
| Senere / idéer (IKKE i denne pakka) | desimalkomma i norsk UI («12,5»), server-side paginering på /spillere, meny-knapp for mobil-nav, kopier-knapp for webcal-adressen — ligger i ROADMAP «Senere / idéer». |
| Versjon | **v1.13.2** (patch) «UX-polering 2». Én branch `feat/ux-polering-v1132`, én push, tag `v1.13.2`. |
| Rammer | 0 AI-kall (kildelåsen i `test/routes.test.js` uendret grønn), 0 nye avhengigheter, 0 Discord-meldinger. Playwright kun i scratchpad, aldri i repoet. |
| Design | CLAUDE.md gjelder: alle farger som tokens i BEGGE temaer (låst av `test/style.test.js`), kontrast ≥ 4,5:1, CSP uten inline-script/`on*`, `<caption>`/`aria-label`/etiketter, 390 px er referansen, bevegelse bak `prefers-reduced-motion` (ingen nye animasjoner). |
| Tester | rød test først, nye assertions i eksisterende rammer (`views.test.js` for markup, `app-client.test.js` for klientlogikk, `style.test.js` for tokens/CSS, `app.test.js` for status/nonce). Ingen nye testrammer. |
| `public/` | endres (CSS + JS) → asset-hashen i prod endres fra `ba91839a`. Noteres i HANDOVER. |
| Arbeidsform | merge `--no-ff`, tag, push, CI grønn, prod-sjekk — økten gjør det selv. Deploy-vindu: aldri under kamp (GW3 spilles fre 4. sep 21:00 og gjennom helgen), aldri torsdag 19–21. |
| Spørsmål til Marius | kun hvis planen avdekker noe som bryter denne fasiten — ett spørsmålssett, anbefaling først. Marius' egne QA-punkter (STEG 7 /live under kamp, 9c, 9e, telefon, «−0,3» i Prisgevinst, stat-fliser på /overganger) er hans — ikke fiks dem. |

## Målte premisser (4. sep, `main` = `edba4a7`)

- **Baseline:** `npm test` → 792/792 (10,7 s), `npm run lint` → exit 0. `main` lå én
  docs-commit foran origin (planøktens commit) — forventet.
- **Lokal kjøring uten prod-nøkler:** `config.js` kjører `process.loadEnvFile()` som
  leser repoets `.env` (prod-nøkler!). Start fra Git Bash med
  `ANTHROPIC_API_KEY= DISCORD_WEBHOOK_URL= PORT=3457 DATA_DIR=<scratchpad>/data node src/server.js`
  (tomme variabler settes først og overskrives ikke; PowerShell sletter tomme
  `$env:`-variabler — bruk Bash). Bevis: `/health` → `"ai":false,"discord":false`.
  Klikk ALDRI «Spør AI om råd» på /lag.
- **Før-tall (curl lokalt, kald = første kall etter start, varm = neste):**

  | Side | Status | Kald | Varm | HTML | gzip |
  | --- | --- | --- | --- | --- | --- |
  | / | 200 | 140 ms | 14–16 ms | 63 kB | 5,5 kB |
  | /spillere | 200 | 142 ms | **131–148 ms** | **957 kB** | 46 kB |
  | /lag | 200 | 36 ms | 9 ms | 24 kB | |
  | /overganger | 200 | 33 ms | 7–10 ms | 13 kB | 3 kB |
  | /liga | 200 | 344 ms | 82 ms | 24 kB | |
  | /innsikt | 200 | 27 ms | 6–8 ms | 26 kB | 5 kB |
  | /brief | 200 | 10 ms | 8 ms | 13 kB | |
  | /live | 200 | 15 ms | 2–3 ms | 14 kB | |
  | /nyheter | 200 | 5 ms | 3 ms | 16 kB | |
  | /offline | 200 | 2 ms | 2 ms | 4 kB | |
  | /finnesikke | 404 | 2 ms | 2 ms | 4 kB | |

  Assets: style.css 56 kB (gzip 14), app.js 51 kB (gzip 16), archivo-var.woff2 35 kB
  (preload), img/clubs 60 filer / 692 kB (alle `loading="lazy"`). **/spillere:** 742
  `<img>`, 657 `<input>`, 807 `<button>`, 686 `<tr>`, 13 544 DOM-noder, Playwright-load
  988 ms mot 720–790 ms for de andre sidene (desktop-CPU; mer på telefon). Radene
  bærer ~20 `data-*`-attributter + EJS-innrykk (1,47 kB/rad) — ingen enkelt synder,
  DOM-mengden er iboende. Alle sider: h1 = 1, hver `<table>` har `<caption>`,
  `<script` = 2 (3 på /live — den tredje er `type="application/json"`), ingen
  horisontal overflow ved 390 px.
- **Nav ved 390 px (Playwright):** `nav.scrollWidth` 596, `nav.clientWidth` **173** —
  wordmark «FPLdashboard» + temabryter tar 217 px. Aktiv lenke sentreres alt
  (`public/app.js:321–322`, `scrollIntoView`), men bare 1–2 lenker er synlige.
  Eiere: `.topbar` `public/style.css:269–280`, `.wordmark` :282–294 (`.wordmark span`
  = «dashboard» i aksentfarge), `.topbar nav` :296–303, 640-blokka :367–392
  (kantfade), 480-blokka :1875–1885 (`.topbar nav a`). `views/layout.ejs:38` er
  wordmark-lenken, :42–51 nav-en med 9 lenker. `test/style.test.js:98` låser
  `--topbar-h` (berøres ikke).
- **`--fs-xs: 0.7rem`** (`style.css:93`) = 11,2 px, brukt på `th`, `.stat-lbl`,
  `.lbl`, `label`, `.bps-row`, `.status`, `code`. Under 12 px: /live 241
  tekstelementer, /innsikt 50, /lag 43, / 37. Ingen test låser fontstørrelser.
  Stat-flisene på mobil er 8,5rem (`style.css:1901–1908`, QA-funn 9 v1.12.1 —
  «TOTALRANGERING» brakk på 103 px-fliser).
- **/spillere:** filterskjema `views/players.ejs:13–51` (`#filter-count` :50, `role="status"`),
  tabellen :53–116 (`.table-scroll.table-scroll--pinned` — indre scrollboks, bevisst
  v1.8.1-beslutning), raden :84–112 med `data-*` for filter/sort, `#players-empty` :117.
  Klient: `applyFilters()` `public/app.js:444`, lyttere :471–476, sortering :377–416
  (`data-sortable`, rader flyttes i DOM), `rowMatchesFilters` (ren, testet).
  `style.test.js:138` låser at `hidden` slår gjennom mot display-reglene → `tr[hidden]` virker.
- **/liga:** ligatabellen `views/league.ejs:22–51`; raden :42 er
  `<a href="/liga?rival=…">Lagnavn</a> <span class="dim">Managernavn</span>` på én
  linje → «Lag»-kolonna blir så bred at «Totalt» (:46) havner utenfor 390 px.
  Rader har `data-href` (JS-klikk) OG lenke — ok.
- **/brief:** `src/routes/brief.js:10–17` `softDeadlineCheck()` fanger feil og gir
  `null`; :21 `Promise.all([assembleBrief(), softDeadlineCheck()])`; :25–31 renderPage
  med `deadlineCheck`. `views/brief.ejs:20` `if (typeof deadlineCheck !== 'undefined' && deadlineCheck)`,
  kortet :27–47 (`#lagsjekk`, `.rec-list.lagsjekk-liste`, `.hint` :46).
  `src/services/deadline.js:156–157`: uten `teamId` returnerer
  `assembleDeadlineCheck` `null` UTEN å kaste → `null` er tvetydig (ingen team-id
  vs. feil) — derfor eget flagg.
- **/live:** `views/live.ejs:4` `#live-status` (`role="status"`) med
  «Kamper pågår» / «Ingen kamper pågår akkurat nå», :6 `#live-updated`
  «Sist oppdatert HH:MM:SS». Klient `public/app.js`: `nextWakeupDelay` :244 (bruker
  `live.nextKickoff`), elementene :508–510, `render(live)` :528, statustekstene :588–589,
  `schedule` :601–612, `poll()` :614–626 (feil svelges: `catch {}` + nytt forsøk om
  `LIVE_POLL_MS`), første render fra JSON-beholderen :628 — **klientteksten
  overskriver serverteksten straks siden lastes.** `src/services/live.js:90` regner
  `nextKickoff` (ISO eller null), :160 returnerer den i `/api/live.json`.
  `src/routes/live.js:5` importerer `formatTime` fra `format.js`.
- **/nyheter:** `views/news.ejs:42` bruker
  `new Date(i.published).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })` →
  «4.9.2026, 01:40:13»; :24 bruker `toLocaleTimeString` (HH:MM) for AI-oppsummeringen.
  `src/routes/news.js:2` importerer fra news.js, :10 `res.renderPage('news', {…})`.
- **/innsikt:** forklaringene ligger som `<p class="hint">` FØR tallene:
  `views/innsikt.ejs:76` (Benkesløsing), :116 (Kapteinsfasit, 6 linjer ved 390),
  :158–159 (Flaksbarometer, 9 linjer). `.hint` er `style.css:1173`. Ingen
  `details`/`summary`-stiler finnes i style.css (grep 0 treff); `transfers.ejs:238`
  har en ustylet `<details>`.
- **/overganger:** Prisgevinst-tabellen `views/transfers.ejs:265–273`, hodet :273
  `Spiller · Kjøpt · Nå · Salg · Gevinst` (5 kolonner, `table.data` i `.table-scroll`),
  radene og `<tfoot>` «Sum» rett under (verifiser linjer). Ved 390 px er «Gevinst»
  utenfor skjermen.
- **Format-hjelpere:** `src/services/format.js` — `formatDateTime` :15,
  `formatNumber` :24, `formatDay` :47, `formatTime` :52, `formatSigned` :57. De sendes
  **per rute** som locals (`routes/index.js:17`, `league.js:5`, `live.js:5`,
  `team.js:18` …), ikke via `app.locals`. Sjekk `format.js:1–14` for tidssone
  (`Intl`-formaterne) før du skriver forventede strenger.
- **Testmekanikk:**
  - `test/views.test.js`: `renderView(name, locals)` :10 (synkron `ejs.renderFile`),
    `cases`-lista :14 med locals per view (nye locals som viewet leser ubetinget MÅ
    inn der, ellers blir eksisterende tester røde), navngitte tester fra :90
    («layout.ejs …», «brief.ejs …», «live.ejs …»).
  - `test/app-client.test.js`: `loadAppScript()` :9–33 kjører `public/app.js` i en
    `vm`-kontekst med DOM-stub; **toppnivå `function`-deklarasjoner** nås som
    `app.<fn>(…)` (f.eks. `app.nextWakeupDelay`), `const` bare via
    `app.evaluate('…')`. Nye rene hjelpere skrives derfor som `function liveStatusText(…)`
    på filnivå, aldri inne i modul-IIFE-ene.
  - `test/style.test.js`: `block('.selektor')` (:100), 480-blokka leses med
    `css.slice(css.indexOf('@media (max-width: 480px)'))` (:183, :209).
  - `test/app.test.js`: hele stacken mot `test/fixtures/fpl-world.js` — `<script` = 2
    på `/`, nonce, `<main id="innhold">`; ingen endring i rammen.
- **Docs:** CRLF i arbeidstreet (Edit-verktøyet, aldri `sed -i`). HANDOVER er **200
  linjer** (taket) — roter til `docs/arkiv/HANDOVER-historikk.md` FØR du legger til.

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 7 peker hit). Kjør
`git status -sb` (main kan ligge to docs-commits foran origin — planøktene;
ellers skal main = origin/main) og `npm test` + `npm run lint` som baseline:
forventet 792/792 og lint 0 på v1.13.1. Start i plan-modus, verifiser
premissene i docs/prompt-ux-polering-v1132.md mot koden (linjenumre kan ha
flyttet seg), skriv planen med T-tasks og testnavn, og be om godkjenning
før du skriver kode. Fasiten i prompten er besluttet av Marius 4. sep —
ikke re-spør den; de ti fiksene er valgt, ingen «Behold», fire større
idéer ligger alt i ROADMAP «Senere / idéer».

Regler som gjelder hele økten: CLAUDE.md er fasit (TDD med rød test
først, 0 nye AI-kall — kildelåsen i test/routes.test.js skal være uendret
grønn, ingen nye avhengigheter, docs i samme commit som koden,
Edit-verktøyet på docs fordi de er CRLF, HANDOVER ≤ 200 linjer — den er
200 nå, roter først). Alle farger som tokens i begge temaer, ingen inline-
script/`on*`, 390 px er referansen, `prefers-reduced-motion` respekteres.
Lokal røyktest KUN med tomme ANTHROPIC_API_KEY og DISCORD_WEBHOOK_URL
(bevis: /health → ai:false, discord:false) — se premissene for hvordan.
Se hver fiks i nettleseren ved 390 px (DevTools eller Playwright fra
scratchpad — aldri i repoet) i BEGGE temaer før du kaller den ferdig.
Deploy-vindu før push til main: aldri torsdag 19:00–21:00, aldri mens
kamper pågår (GET https://fpl.marsk.no/api/live.json → anyLive må være
false; GW3 spilles fre 4. sep 21:00 og gjennom helgen — vent til alle
kamper er ferdige). Prod-sjekk etter deploy: footer viser v1.13.2,
`<script`-telling i HTML-en på / er nøyaktig 2, /health er 200 med
aiStats, den NYE asset-hashen fra /sw.js noteres i HANDOVER, 9 sider 200,
og `gh run list --branch main --limit 1` viser grønn kjøring for
merge-commiten på Node 22 og 24. Bevis før påstand: vis kommandoen og
linjene. Stopp ved ~95 % usage med HANDOVER oppdatert om hvilken T-task
som er ferdig og hvilken branch som er åpen.
```

## T0 — branch og baseline

`git checkout -b feat/ux-polering-v1132` fra `main`. `npm test` (792) + `npm run
lint` (0). Noter asset-hashen fra `/sw.js` i prod (`ba91839a`) — den skal ha
endret seg etterpå. Én commit per fiks (`feat:`/`fix:`), CHANGELOG-punkt under
`[Unreleased]` i samme commit som hver fiks.

## T1 — tverrgående (style.css): logo på mobil (fiks 1) og `--fs-xs` (fiks 6)

1a. Rød test i `test/style.test.js`: «style.css: logoen kortes til FPL på mobil så
menyen får plass» — 480-blokka (`css.slice(css.indexOf('@media (max-width: 480px)'))`)
skal inneholde `.wordmark span { display: none; }`. Implementer i 480-blokka
(`style.css:1875+`, ved siden av `.topbar nav a`). `views/layout.ejs:38` røres
ikke (lenketeksten blir «FPL» på mobil — tilgjengelig navn «FPL» er ok; vil du
beholde fullt navn for skjermleser, bruk `.sr-only`-span, IKKE `aria-label`
som avviker fra synlig tekst). **Nettleser:** 390 px → minst 4 lenker synlige,
`document.querySelector('nav[aria-label="Hovedmeny"]').clientWidth` ≥ 250
(var 173); ved 641 px+ er logoen hel. Kantfaden og `scrollIntoView` virker som før.

1b. Rød test: «style.css: --fs-xs er minst 12 px» — `:root`-blokka skal ha
`--fs-xs: 0.75rem`. Implementer på `style.css:93`. **Nettleser (kritisk):** /lag,
/liga (rival-radar) og /live ved 390 px i begge temaer — ingen stat-flis brekker
(«TOTALRANGERING», «RIVALENS KAPTEIN · 13 P»), tabellhodene på /spillere og
/innsikt går ikke over to linjer der de var én. Brekker noe: behold 0.7rem på
tokenet og sett `table.data th, .stat-lbl { font-size: 0.75rem; }` i stedet
(tilpass testen). `.fdr-4`-kontrasten (`style.test.js:70`) er uavhengig.

## T2 — /spillere: rad-tak (fiks 2)

Merk: `content-visibility: auto` på `<tr>`/`<tbody>` har INGEN effekt (size
containment gjelder ikke table-interne bokser) — derfor rad-tak i klienten.

2a. Rød test i `test/app-client.test.js`: ren toppnivå-`function rowLimit(matchCount,
limit, showAll)` → `{ shown, hidden }`: `rowLimit(652, 100, false)` →
`{ shown: 100, hidden: 552 }`, `rowLimit(30, 100, false)` → `{ shown: 30, hidden: 0 }`,
`rowLimit(652, 100, true)` → `{ shown: 652, hidden: 0 }`. Konstant
`PLAYER_ROW_LIMIT = 100` (test: «rad-taket er 100»).

2b. Rød test i `test/views.test.js`: «players.ejs har knappen som viser alle
rader» — `<button type="button" id="players-more" class="btn-quiet" hidden>` etter
`.table-scroll` (`players.ejs:116`), før `#players-empty`.

2c. `applyFilters()` (`app.js:444`): etter filtrering (og etter sortering, som
flytter rader i DOM) settes `hidden` på treff nr. > `PLAYER_ROW_LIMIT` når
`showAll` er false; `#players-more` får teksten «Vis alle 652 spillere» og
vises når `hidden > 0`; klikk → `showAll = true` + ny applyFilters; enhver
filter-/søkeendring nullstiller `showAll`. `#filter-count`: «Viser 100 av 652
spillere» (X = rader som faktisk vises). Sortering (`:377–416`) må trigge
taket på nytt (nye topp-100). Duell-avkrysning og spillerkort på skjulte
rader er uaktuelt (de er `hidden`). **Nettleser:** 390 px → første render
viser 100 rader, knappen under tabellen, sorter på «Pris» → nye 100, søk
«sal» → «Viser 3 av 652 spillere» uten knapp, «Vis alle» → 652 rader.
**Etter-tall til HANDOVER:** `document.querySelectorAll('#players-table tbody
tr:not([hidden])').length` (100) og Playwright/DevTools load-tid mot 988 ms.

## T3 — /liga: managernavn på egen linje (fiks 3)

Rød test i `views.test.js`: «league.ejs merker managernavnet så det kan brytes
ned» — raden har `<span class="dim manager">`. Rød test i `style.test.js`:
480-blokka har `.manager { display: block; }`. Implementer i `league.ejs:42`
(kun klassen) og 480-blokka. **Nettleser:** 390 px → «#», «Lag», «GW», «Totalt»
alle synlige uten sidescroll (`.table-scroll` i ligakortet: `scrollWidth ===
clientWidth`); `(meg)`-raden og rival-markeringen uendret; desktop uendret.
Gjør sjekken ETTER T1b (bredere `th`).

## T4 — /brief: tomtilstand for Lagsjekk (fiks 4)

Rød tester i `views.test.js`: «brief.ejs viser tomtilstand når lagsjekken
feilet» (locals `deadlineCheck: null, deadlineCheckFailed: true` → HTML
inneholder `id="lagsjekk"` og «Lagsjekken er utilgjengelig akkurat nå») og
«brief.ejs skjuler Lagsjekk-kortet uten team-id» (`deadlineCheck: null`,
`deadlineCheckFailed: false` → ingen `id="lagsjekk"`). Viewet leser flagget
med `typeof deadlineCheckFailed !== 'undefined' && deadlineCheckFailed` så
`cases`-lista ikke brekker. `routes/brief.js`: `softDeadlineCheck()` returnerer
`{ check, failed }` (`{ check: null, failed: true }` i catch), ruta sender
`deadlineCheck: r.check, deadlineCheckFailed: r.failed`. Kortet: samme
`<section class="card card-wide" id="lagsjekk">` + `<h2>`, innhold
`<p class="empty">Lagsjekken er utilgjengelig akkurat nå — prøv igjen om litt.</p>`.
**Nettleser:** normaltilstand uendret; feiltilstanden bevises av testen (ikke
saboter FPL-kall i prod-nøkkelfri lokalkjøring for å se den — testen holder).

## T5 — /live: feilstatus (fiks 5) og neste avspark (fiks 9)

5a. Rød tester i `app-client.test.js` for toppnivå-`function liveUpdatedText(ok,
clock)`: `(true, '12:30:05')` → «Sist oppdatert 12:30:05»; `(false, '12:30:05')`
→ «Får ikke kontakt — prøver igjen om 1 min (sist OK 12:30:05)»; `(false, null)`
→ «Får ikke kontakt — prøver igjen om 1 min». `poll()` (`app.js:614–626`):
`lastOk` settes ved `res.ok`; i feilstien (både `!res.ok` og catch) settes
`updatedEl.textContent = liveUpdatedText(false, lastOk)`; `render()` (:589)
bruker `liveUpdatedText(true, klokke)`.

5b. Rød tester for toppnivå-`function liveStatusText(live)`: `anyLive: true` →
«Kamper pågår»; `anyLive: false, nextKickoff: '2026-09-04T19:00:00Z'` → starter
med «Ingen kamper pågår — neste avspark » og inneholder « kl. »; `nextKickoff:
null`/ugyldig → «Ingen kamper pågår akkurat nå». Klientformat:
`toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })`
+ « kl. » + `toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })`.
Server: `routes/live.js` importerer `formatDay` i tillegg til `formatTime` og
sender `nextKickoffText` (`formatDay(iso) + ' kl. ' + formatTime(iso)` eller
null); `live.ejs:4` bruker den. Rød test i `views.test.js`: «live.ejs viser neste
avspark mellom runder». **Felle:** klienten rendrer fra JSON-beholderen straks
(`app.js:628`) og overskriver serverteksten — de to strengene MÅ være identiske
(sjekk `format.js:1–14`: samme ukedag-/månedsform og tidssone; i testen unngår
du å låse tidssonen: assert på prefiks + « kl. », eller sett `TZ` bevisst).
**Nettleser:** mellom runder står «Ingen kamper pågår — neste avspark fredag 4.
september kl. 21:00» (ingen blaff ved lasting); DevTools → Network «Offline»
→ innen 1 min «Får ikke kontakt …», «Online» → tilbake.

## T6 — /nyheter: appens datoformat (fiks 7)

Rød test i `views.test.js`: «news.ejs viser publiseringstidspunkt i appens
datoformat, uten sekunder» — item med `published: '2026-09-04T01:40:13Z'` gir
« kl. 03:40» (Europe/Oslo) og HTML-en matcher IKKE `/\d{2}:\d{2}:\d{2}/`.
`routes/news.js` importerer `formatDay`, `formatTime` fra `../services/format.js`
og sender dem som locals (:10); `news.ejs:42` →
`<%= formatDay(i.published) %> kl. <%= formatTime(i.published) %>`. Legg
hjelperne inn i news-oppføringen i `cases` (:14). **Nettleser:** «BBC Sport ·
fredag 4. september kl. 03:40».

## T7 — /innsikt: sammenleggbare forklaringer (fiks 8)

Rød test i `views.test.js`: «innsikt.ejs legger forklaringene i lukkede details»
— minst 3 `<details class="hint-details">` med `<summary>Slik regnes det</summary>`,
ingen `open`. Pakk `innsikt.ejs:76`, :116 og :158–159 (`<p class="hint">` blir
værende inni). CSS: `.hint-details summary { cursor: pointer; }` + samme
farge/størrelse som `.hint` (`style.css:1173`, tokens), `.hint-details[open]
summary { margin-bottom: … }`. Ingen JS. **Nettleser:** 390 px → tallene rett
under kortoverskriften, «Slik regnes det» åpner/lukker, fokusring synlig i
begge temaer.

## T8 — /overganger: «Nå»-kolonna på mobil (fiks 10)

Rød test i `views.test.js`: «transfers.ejs merker Nå-kolonna i Prisgevinst» —
`<th class="num col-now">Nå</th>` og `class="num col-now"` på td-ene (også i
`<tfoot>`). Rød test i `style.test.js`: 480-blokka har `.col-now { display:
none; }`. **Nettleser:** 390 px → Spiller/Kjøpt/Salg/Gevinst synlige uten
sidescroll; 641 px+ har alle fem. Marius' QA-punkter på samme side (stat-fliser,
«−0,3») røres ikke.

## T9 — docs og release

CHANGELOG `[1.13.2] — 2026-09-0x` med de ti punktene (flyttet fra
`[Unreleased]`), README der funksjonslista nevner /spillere-tabellen eller
/live, ROADMAP § 7 (status «utført», versjonsplan-rad, dokumentkart-raden for
denne prompten fjernes), HANDOVER (statusblokk v1.13.2 med ny asset-hash,
testtall, prod-sjekk; «Neste steg»; loggpost; ≤ 200 linjer — roter først),
`git rm docs/prompt-ux-polering-v1132.md`. Merge `--no-ff` med `-m`, annotert tag
`v1.13.2`, push branch → CI grønn (`gh run watch`) → merge → push `main` (i
deploy-vinduet) → prod-sjekk → HANDOVER-linje med CI-run-ID og hash.

## Feller (lest av folk som har gått i dem)

- **`content-visibility` virker ikke på tabellrader** — fiks 2 er rad-tak, ikke CSS.
- **`--fs-xs` og stat-flisene:** 8,5rem-fliser ved 390 px brakk allerede én gang
  (QA-9). Sjekk /lag, /liga, /live i nettleser før du går videre; fallback i T1b.
- **/live: klient overskriver server ved lasting** (`app.js:628`). Ulik streng gir
  blaff. Samme tidssone-logikk begge steder.
- **vm-testene ser bare toppnivå-`function`:** nye hjelpere som `const` inne i en
  IIFE er usynlige for `app.<fn>` — og `app.evaluate` når dem heller ikke.
- **`cases`-lista i views.test.js:** en ny local som viewet leser ubetinget gjør
  eksisterende tester røde — bruk `typeof x !== 'undefined'`-vern eller legg
  localen inn i lista.
- **PowerShell sletter tomme miljøvariabler** (`$env:X = ''` fjerner X) → lokal
  server startes fra Git Bash, ellers leser `loadEnvFile` prod-nøklene.
- **`hidden` og sortering:** sorteringen flytter rader; taket må regnes på nytt
  etter sort, ellers viser du «feil» 100.
- **Asset-hashen endres** (CSS + JS) — `<script`-tellingen på / er fortsatt 2;
  hashen fra `/sw.js` skrives i HANDOVER etter prod-sjekk.
- **CRLF:** docs endres med Edit-verktøyet; `sed -i` er forbudt. Nye filer LF.
- **Deploy koster 2 AI-kall:** ikke push docs for seg — alt i én push.
- **Deploy-vindu:** GW3 fre 4. sep 21:00 → søndag kveld. `anyLive` må være false.

## Ferdigkriterier

- `main` = `origin/main`, tag v1.13.2 pushet, branchen merget `--no-ff` og slettet.
- `npm test` grønn med minst 805 tester (792 + ≥ 13 nye assertions), `npm run
  lint` 0, kildelåsen i routes.test.js uendret, alle style-/a11y-tester grønne.
- Hver av de ti fiksene sett i nettleseren ved 390 px i begge temaer (T1–T8 sier hva).
- Prod: footer v1.13.2, `<script` = 2 på /, /health 200 med aiStats, NY asset-hash
  notert i HANDOVER, 9 sider 200, CI grønn på Node 22 og 24 for merge-commiten.
- Etter-tall for /spillere i HANDOVER (rader i første render, load-tid) mot
  før-tallene over.
- 0 nye AI-kall i noen tilstand, 0 nye avhengigheter, 0 Discord-meldinger.
- CLAUDE.md ≤ 200 linjer, HANDOVER ≤ 200 linjer, prompten slettet, CHANGELOG/README/
  ROADMAP ajour i samme commit som koden.

## Etter økten

- Alt grønt: prompten er slettet av økten selv (T9). Marius' egne punkter (STEG 7
  under kamp, 9c, 9e, telefon, «−0,3», stat-fliser på /overganger, `kill 1`) står
  fortsatt i HANDOVER.
- Stoppet underveis (usage-grense): HANDOVER skal si nøyaktig hvilken T-task som
  er ferdig og hvilken branch som er åpen — neste økt fortsetter derfra med denne
  fila som fasit.
- Neste kandidater etter dette (ikke besluttet, notert i økt 57): B funksjonssveip
  mot ubrukte FPL-felt, D slanking av style.css/app.js. «Senere / idéer» i ROADMAP
  har de fire større UX-idéene fra denne gjennomgangen.
