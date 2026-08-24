# Plan v1.3.0–v1.3.3 — Full UI-overhaling

> **Status:** godkjent av Marius 2026-08-24 (planøkt 30, Fable 5).
> **Utføres av:** Opus 5 i egne økter (én per etappe), med
> `superpowers:executing-plans`.
> **Mockup (fasit for utseendet):**
> https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
> — dashbord, spillere, lag og brief i begge temaer, 390 px-ramme og
> designsystem-fane. Avvik mellom mockup og plan: planen vinner.
> Kryss av `[ ]` → `[x]` etter hvert som stegene fullføres, og før inn
> observerte testtall der planen ber om det.

## Harde rammer (gjelder alle etapper — ingen unntak)

- **ALDRI push uten eksplisitt klarsignal fra Marius.** Release-tasken i
  hver etappe kjøres KUN på klarsignal. Docs pushes heller ikke.
- **Aldri push torsdag 19:00–21:00** (auto-briefen ~19:30), **aldri mens
  kamper pågår.** GW2-deadline 28. aug 19:30, GW2 spilles ~29.–31. aug.
  Sjekk kampvinduet (`fixtures/?event=N`: ingen `started && !finished_provisional`)
  før enhver push.
- **AI-budsjett: maks 1 betalt kall totalt for v1.3.0–v1.3.3**, og det er
  én prod-visning av `/brief` etter v1.3.2-deployen. Alle andre
  verifiseringer av `/brief` og `/nyheter` skjer med TOMME nøkler
  (scratchpad-.env-teknikken i HANDOVER → `ai:false`). `/api/brief.json`
  er gratis.
- **TDD gjennomgående:** tester først, rødt observeres og føres inn her,
  så implementasjon til grønt. Ingen nettverkskall i tester.
- **Ingen nye avhengigheter.** Playwright kjøres kun i scratchpad, aldri i
  repoet.
- **Ingen designbeslutninger i utførelsen.** Palett, skala, markup og
  komponenter står her og i mockupen. Avvik → stopp og rapporter.
- Tiltale: alle svar starter med «Hei Marius!». Ved ~95 % usage: stopp,
  oppdater `docs/HANDOVER.md`, commit alt (ingen push).

## 1. Verifiserte fakta (målt 24. aug 2026, økt 30)

| # | Fakta | Kilde/kommando |
|---|---|---|
| F1 | `main` er **2 commits foran `origin/main`** (`10e175c`, `acf1b1e` — docs fra økt 29). Rent tre. `origin/main` = `b1f3f6c`. | `git status -sb` → `## main...origin/main [ahead 2]` |
| F2 | Prod: v1.2.5 på fpl.marsk.no (HANDOVER 24. aug). 272/272 tester, lint 0 på `main`. | HANDOVER + `package.json` version 1.2.5 |
| F3 | `views/`: 12 EJS-filer, flat. **Ingen `views/partials/`.** | `wc -l views/*.ejs` |
| F4 | `public/style.css` 1202 linjer / 25 651 B; `public/app.js` 319 linjer / 11 911 B; `public/fonts/archivo-var.woff2` 34 928 B + OFL.txt. | `wc -l`, `ls -la` |
| F5 | `:root` har 43 tokens (linje 15–67). 5 hardkodede farger utenfor `:root`: `.fdr{color:#fff}` (564), `.cap{color:#fff}` (841), `.pitch{--pitch-line:rgba(240,253,248,.09)}` (772), `box-shadow rgba(0,0,0,.35)` (814, 825), `#000` i nav-masken (188–189). `prefers-reduced-motion` finnes (1014, 1103, 1196). **Ingen `prefers-color-scheme`.** | Read style.css |
| F6 | `app.js`: 5 moduler (0 mobilmeny, 1 nedtelling, 2 spillertabell, 3 live, 4 AI-rådgiver). Ingen `localStorage`, ingen data-attributter på `<html>`. Sortering leser `cells[i].textContent.trim()` (app.js:118). | Read app.js |
| F7 | Layout: `res.renderPage()` i `src/server.js:60–76` rendrer view → `body` → `layout.ejs`. Layout-locals: `body,title,path,gameUpdating,version,assetVersion,startedAt`. Ingen inline-script i `<head>`. | Read server.js, layout.ejs |
| F8 | `assetVersion` = sha1(style.css + app.js)[0:8] (`server.js:34–39`). `cacheControlFor(v, assetVersion)` gir immutable kun for `v === assetVersion \|\| v === FONT_VERSION('1')` (`middleware.js:8,16–20`). | Read |
| F9 | `getBootstrap()` returnerer RÅ bootstrap-static (`fplClient.js:68`). `byId(teams)` legger hele lagobjektet i `teamsById` → **`code` er allerede tilgjengelig i viewene dashboard/players/team** (route sender `teamsById`). `league.js` sender IKKE `teamsById`. `brief.js:111,122`, `live.js:91,105–106`, `transfers.js:29` reduserer til `short_name`/navn — der må `code` legges til. | Grep/Read |
| F10 | `teams[].code` for 2026/27 (20 lag): ARS 3, AVL 7, BOU 91, BRE 94, BHA 36, CHE 8, COV 9, CRY 31, EVE 11, FUL 54, HUL 88, IPS 40, LEE 2, LIV 14, MCI 43, MUN 1, NEW 4, NFO 17, TOT 6, SUN 56. `elements[].team_code` finnes også. | `curl bootstrap-static/` → node |
| F11 | **URL-mønstre verifisert, 20/20 lag svarer 200:** merke `resources.premierleague.com/premierleague/badges/70/t{code}.png` (70×70, sum 163 KB); drakt `fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}-110.png` (110×145, sum 178 KB); keeper `shirt_{code}_1-110.png` (110×145, sum 219 KB). Alternativer målt: badges/50 110 KB, badges/100 272 KB, shirt-66 84 KB, gk-66 99 KB. SVG-merker (`badges/t{code}.svg`) er 12–190 KB **per lag** (rasterinnbakt) — forkastet. `badges/rb/*.svg` gir 403. | `curl -w '%{http_code} %{size_download}'` ×140, PNG-IHDR lest |
| F12 | `test/views.test.js`: 13 `test(`-kall → **28 tester** ved kjøring (26 marker-tester i løkke + 8 nav-tester + 13 navngitte). XSS-låsene: live-JSON `<` (l.149), news/brief `bold()` + `<script>`-forbud (l.158, 174), `safeLink` (l.168). Asset-hash-test (l.128) krever `?v=` på css/js og forbyr uversjonerte. Font-preload-test (l.136) sammenligner `?v=` i layout og `@font-face`. | Read views.test.js |
| F13 | Testfiler og `test(`-kall: ai 6, analysis 59, app-client 6, brief 11, cache 14, format 3, fplClient 9, leagues 3, live 15, middleware 6, news 14, notify 14, prompts 44, transfers 16, views 13. Totalt kjørt: 272. | grep -c |
| F14 | `test/live.test.js:183` deepEqual-er hele `matches`-objektet og `:341` låser nøkkellista i `myPlayers[0]` — **begge går rødt når `homeCode/awayCode/teamCode` legges til** og oppdateres i samme rødfase. `test/brief.test.js` deepEqual-er kun navnelister. | Grep deepEqual |
| F15 | `app-client.test.js` kjører `app.js` i `vm` med DOM-stub der alle `getElementById` gir `null` — moduler returnerer tidlig, toppnivå-funksjoner (`escapeHtml`, `nextWakeupDelay`) testes direkte. Samme mønster brukes for tema-funksjonene. | Read |
| F16 | Dockerfile kopierer `src`, `views`, `public` — `public/img/clubs/` følger med automatisk. `.dockerignore` utelater `test`, `docs`, `*.md`. `scripts/` finnes ikke i dag og kopieres ikke inn (riktig). | cat Dockerfile |
| F17 | ESLint: `files` dekker `src/**`, `test/**`, `eslint.config.js` (node) og `public/**/*.js` (browser). `scripts/**` må legges til. | cat eslint.config.js |
| F18 | Playwright ble brukt i scratchpad i v1.1.1 (103 sjekker, fire viewports), aldri i repoet. | HANDOVER-historikk:675 |
| F19 | Kontrastmetoden fra v1.1.0 (WCAG-luminans, `kontrast.mjs` i scratchpad) — gjenbrukes, men flyttes inn i en varig test (`test/style.test.js`). | arkiv/2026-08-19-…:664–700 |
| F20 | `/health` (`src/routes/health.js`) rapporterer features; kan lese `req.app.locals` for klubbgrafikk-tellingen. | Read |

## 2. Beslutninger (Marius, 24. aug 2026 — IKKE re-spør, IKKE fravik)

| # | Beslutning |
|---|---|
| 1 | **Selvhost** klubbgrafikk i `public/img/clubs/`, hentet av `scripts/fetch-club-assets.mjs` (`npm run fetch-clubs`), committet i repoet. CDN-regelen i CLAUDE.md står. |
| 2 | Størrelser: **merke 70 px, drakt 110 px, keeperdrakt 110 px** (60 filer, ~560 KB). |
| 3 | Varemerker: bruk både merker og drakter, **med kreditering i footer**: «Klubbmerker og drakter tilhører respektive klubber og Premier League.» |
| 4 | Fallback: **serveren vet hvilke filer som finnes** (`src/services/clubAssets.js` leser mappa ved oppstart); partialen skriver `<img>` kun når fila finnes, ellers en nøytral plassholder. Aldri brutt bilde, også uten JS. |
| 5 | Temabryter: **ett ikon i topbaren**, helt til høyre, sykler auto → lys → mørk. Samme på 390 px og desktop. |
| 6 | FOUC: **inline `<script>` i `<head>` før `style.css`** setter `<html data-theme>`. Ligger i HTML (no-cache), påvirker ikke asset-hashen. Uten JS: mørkt. |
| 7 | Auto-modus **følger systemet live** via `matchMedia('(prefers-color-scheme: light)')`-lytter i app.js. |
| 8 | Uttrykk: **FPL-familien** — FPLs farger (lilla #37003C, grønn #00ff87, cyan #04f5ff, rosa #e90052) og FPLs eksakte FDR-farger; vår layout, kortsystem og Archivo beholdes. Ikke kopi. |
| 9 | Mørkt tema: **FPL-lilla natt** (bg #170826, flater #221035/#2d1846/#3a2358). |
| 10 | Lyst tema: **FPL-dagslys** — lilla topbar #37003C, hvite kort, lilla brødtekst #37003C, bg #f4f2f8. |
| 11 | Grønn-regel: **grønn er fyll med mørk tekst oppå i begge temaer; grønn TEKST kun i mørkt.** To tokens: `--accent` (fyll) og `--accent-text` (mørkt #00ff87, lyst #04703d). |
| 12 | **Fire etapper, hvert sitt patchnummer:** v1.3.0 Fundament · v1.3.1 Klubbgrafikk · v1.3.2 Finpuss · v1.3.3 QA-rettelser. Hver etappe grønn, merges alene, prod alltid et helt UI. |
| 13 | **Playwright-QA i scratchpad etter hver etappe**, 390/768/1024/1440 px, begge temaer. |
| 14 | **AI-budsjett 1 kall totalt:** én prod-visning av `/brief` etter v1.3.2. Alle andre etapper 0. |
| 15 | **Opprett `views/partials/`** (club-badge, club-shirt, theme-toggle). CLAUDE.md-avviket lukkes ved at mappa finnes. |

Beslutninger tatt av Fable (implementasjon, ikke smak — rapportert til Marius):

| # | Beslutning |
|---|---|
| F-a | Filnavn speiler FPL: `t{code}.png`, `shirt_{code}.png`, `shirt_{code}_1.png`. Versjonert med `?v=<IMG_VERSION>` der `IMG_VERSION = '2627'` (sesongkonstant i `middleware.js`, immutable via `cacheControlFor`). Ny sesong = kjør skriptet + bump konstanten i samme commit. |
| F-b | `clubAssets` legges på `app.locals` i `server.js` → tilgjengelig i alle views/partials uten å røre rutene. `/health` får `clubImages: {badges, shirts, keepers}`. |
| F-c | `/live` er klientrendret: `app.js` får `clubBadgeHtml()` + en `error`-lytter (capture) på `#live-root` som bytter et feilet bilde til plassholderen. Payloaden bærer `teamCode`/`homeCode`/`awayCode`. |
| F-d | Topbaren er **FPL-lilla #37003C i BEGGE temaer** (merkevareankeret), hvit tekst, grønn aktiv-pille med lilla tekst. |
| F-e | Rosa (#e90052) overtar magentaens roller (kaptein, live, negativt); **cyan (#04f5ff) blir AI-fargen** (AI-merke og AI-kortets hairline). |
| F-f | Typografi: Archivo (display) + systemfont (brødtekst) beholdes; ny 8-trinns størrelsesskala som tokens. |
| F-g | Spillerbilder (FPLs `p{code}.png`, 609 × ~10 KB) tas IKKE med — legges under «Senere / idéer». |
| F-h | Kontrastverifiseringen blir en varig test (`test/style.test.js`) i stedet for et engangsskript. |
| F-i | Branchnavn: `feat/ui-v130-fundament`, `feat/ui-v131-klubbgrafikk`, `feat/ui-v132-finpuss`, `fix/ui-v133-qa`. |

## 3. Visuell retning

### 3.1 Hva som gjenskapes fra FPL, og hva som bevisst er annerledes

| Gjenskapes | Bevisst annerledes |
|---|---|
| Lilla topbar (#37003C) med hvit tekst | Layout: våre kort i grid, ikke FPLs sidebars |
| Grønn #00ff87 som handlingsfarge (knapper, aktiv nav, positivt) | Grønn aldri som tekst på lyst — mørkegrønn #04703d i stedet |
| FDR-fargene 1–5 eksakt (#375523, #01fc7a, #e7e7e7, #ff1751, #80072d) | FDR-merker bruker vår mono-font og hjemme/borte-konvensjon (STORE/små) |
| Drakter på banen, merker i tabeller | Ingen spillerfoto, ingen FPL-ikoner |
| Rosa #e90052 for kaptein/live | Cyan for AI-innhold (FPL har ikke AI) |
| Lilla hero-gradient i lyst tema | Archivo, ikke Premier Sans (proprietær) |

### 3.2 Palett — alle tokens, begge temaer

Mørkt = CSS-basen i `:root` (og det man får uten JS). Lyst = `:root[data-theme="light"]`.
Hver fargetoken finnes i begge blokker — låst av `test/style.test.js`.

| Token | Mørkt | Lyst | Rolle |
|---|---|---|---|
| `--bg` | `#170826` | `#f4f2f8` | sidebakgrunn |
| `--surface` | `#221035` | `#ffffff` | kort |
| `--surface-2` | `#2d1846` | `#efeaf4` | rad-hover, felter, match-kort |
| `--surface-3` | `#3a2358` | `#e3dcec` | gw-badge, plassholder |
| `--border` | `rgba(190,160,255,.14)` | `rgba(55,0,60,.12)` | hairlines |
| `--border-strong` | `rgba(190,160,255,.30)` | `rgba(55,0,60,.25)` | th-linje, felter |
| `--text` | `#f4f1fa` | `#37003C` | brødtekst |
| `--text-dim` | `#b8a9d1` | `#5c4a6b` | dempet |
| `--dim-strong` | `#a293c0` | `#665573` | th, etiketter |
| `--accent` | `#00ff87` | `#00ff87` | FYLL (knapper, aktiv nav, row-me-stripe) |
| `--accent-text` | `#00ff87` | `#04703d` | grønn som TEKST (lenker, positive tall) |
| `--accent-ink` | `#170826` | `#37003C` | tekst oppå `--accent` |
| `--accent-soft` | `rgba(0,255,135,.12)` | `rgba(0,255,135,.18)` | row-me, soft-bakgrunn |
| `--accent-2` | `#e90052` | `#e90052` | rosa FYLL (C-merke, kapteinsring, live-kant) |
| `--accent-2-text` | `#ff4d99` | `#c2003f` | rosa som TEKST (live-status, skadepiller) |
| `--accent-2-ink` | `#ffffff` | `#ffffff` | tekst oppå `--accent-2` |
| `--accent-2-soft` | `rgba(233,0,82,.14)` | `rgba(233,0,82,.10)` | skadepille-bakgrunn |
| `--cyan` | `#04f5ff` | `#04f5ff` | AI-hairline (fyll) |
| `--cyan-text` | `#04f5ff` | `#0b6f78` | AI-merketekst |
| `--cyan-soft` | `rgba(4,245,255,.12)` | `rgba(4,245,255,.14)` | AI-merkebakgrunn |
| `--negative` | `#ff5c8a` | `#c2003f` | negative tall, ▼ |
| `--warn-bg` | `#3d2f0f` | `#fff3cd` | 503-banner, «tvilsom» |
| `--warn-border` | `#8a6d1f` | `#e0b84a` | |
| `--warn-text` | `#ffd166` | `#6b4d00` | |
| `--fdr-1` … `--fdr-5` | `#375523` `#01fc7a` `#e7e7e7` `#ff1751` `#80072d` | samme | FPL-eksakt |
| `--fdr-ink-light` | `#ffffff` | samme | tekst på fdr-1/4/5 |
| `--fdr-ink-dark` | `#37003C` | samme | tekst på fdr-2/3 |
| `--fdr-blank` | `#2d1846` | `#efeaf4` | tom celle |
| `--topbar-bg` | `#37003C` | `#37003C` | |
| `--topbar-text` | `#ffffff` | `#ffffff` | |
| `--topbar-dim` | `#d9cfe0` | `#d9cfe0` | inaktive nav-lenker |
| `--hero-from` | `#221035` | `#37003C` | hero-gradient start |
| `--hero-to` | `#3a2358` | `#5e1a6b` | hero-gradient slutt |
| `--hero-text` | `#f4f1fa` | `#ffffff` | |
| `--hero-dim` | `#b8a9d1` | `#d9cfe0` | |
| `--pitch-line` | `rgba(240,253,248,.09)` | `rgba(55,0,60,.12)` | banelinjer |
| `--pitch-stripe-a` | `rgba(0,255,135,.055)` | `rgba(0,255,135,.16)` | klippestriper |
| `--pitch-stripe-b` | `rgba(0,255,135,.03)` | `rgba(0,255,135,.10)` | |
| `--shadow` | `0 2px 8px rgba(0,0,0,.35)` | `0 2px 8px rgba(55,0,60,.12)` | chips |
| `--scrollbar-thumb` | `#5c4a80` | `#c9bfd6` | |
| `--scrollbar-thumb-hover` | `#7a66a3` | `#b1a4c2` | |
| `--focus` | `#00ff87` | `#37003C` | fokusring |
| `--club-fallback` | `#3a2358` | `#e3dcec` | plassholder-dott |

Ikke-farge-tokens (kun i `:root`): `--font-display`, `--font-body`,
`--font-mono` (uendret); `--fs-xs: .7rem`, `--fs-sm: .8rem`,
`--fs-base: .9rem`, `--fs-md: 1rem`, `--fs-lg: 1.2rem`, `--fs-xl: 1.5rem`,
`--fs-2xl: 1.9rem`, `--fs-hero: clamp(2.6rem, 9vw, 4.2rem)`;
`--space-1…6` (uendret: .25/.5/.75/1/1.5/2.5 rem); `--topbar-h: 57px`
(50px ≤ 640); `--radius: 12px`, `--radius-sm: 8px`, `--radius-pill: 999px`;
`--pad: 1rem`, `--maxw: 1160px`.

### 3.3 Kontrast — målt (WCAG-luminans, 24. aug)

Krav: 4,5:1 løpende tekst, 3:1 grafiske merker/fokus. Alle par under er
kjørt; de blir varige asserts i `test/style.test.js`.

| Par | Mørkt | Lyst |
|---|---|---|
| text / bg | 17,11 | 15,40 |
| text / surface | 15,76 | 17,11 |
| text / surface-3 | — | 12,80 |
| text-dim / surface | 8,07 | 7,93 |
| text-dim / surface-2 | 7,24 | 6,70 |
| text-dim / surface-3 | — | 5,94 |
| dim-strong / surface | 5,83 | 5,82 |
| dim-strong / surface-3 | 4,79 | 5,05 |
| accent-text / bg | 14,24 | 5,58 |
| accent-text / surface | 13,12 | 6,19 |
| accent-text / surface-2 | — | 5,23 |
| accent-ink / accent (knapp) | 14,24 | 12,75 |
| accent-2-text / surface | 5,68 | 6,24 |
| accent-2-text / surface-2 | 5,09 | — |
| accent-2-ink / accent-2 (C-merke) | 4,58 | 4,58 |
| cyan-text / surface | 13,00 | 5,90 |
| cyan-text / surface-2 | — | 4,99 |
| negative / surface-2 | 5,37 | — |
| warn-text / warn-bg | 9,04 | 7,05 |
| topbar-text / topbar-bg | 17,11 | 17,11 |
| topbar-dim / topbar-bg | 11,36 | 11,36 |
| accent-ink / accent (aktiv nav) | — | 12,75 |
| hero-text / hero-from, hero-to | 15,76 / — | 17,11 / 11,44 |
| hero-dim / hero-to | — | 7,60 |
| fdr-ink-light / fdr-1, fdr-4, fdr-5 | 8,45 / 3,82 / 10,57 (krav 3) | samme |
| fdr-ink-dark / fdr-2, fdr-3 | 12,39 / 13,83 | samme |
| focus / bg | 14,24 (krav 3) | 17,11 |
| Blandinger: accent-2-text på accent-2-soft over surface | 5,11 | 5,27 |
| accent-text på accent-soft over surface (row-me) | 10,42 | 5,66 |
| cyan-text på cyan-soft over surface | 8,76 | 5,52 |
| **FPL-grønn #00ff87 som tekst på hvitt** | — | **1,34 — derfor beslutning 11** |

### 3.4 Komponentspråk (eksakt liste)

1. **Topbar** — `#37003C`, 57 px, sticky. Wordmark «FPL·dashboard» (hvit +
   grønn), scrollbar nav (uendret mekanikk), **temabryter** 36×36 px helt
   til høyre. Aktiv lenke: grønn pille (`--accent`) med lilla tekst.
2. **Temabryter** — `<button id="theme-toggle">` med tre inline-SVG-ikoner
   (auto = halvfylt sirkel, lys = sol, mørk = måne), ett synlig via
   `data-mode`. aria-label/title = «Tema: automatisk (følger systemet)» /
   «Tema: lyst» / «Tema: mørkt».
3. **Hero (dashbord)** — gradient `--hero-from → --hero-to`, gw-badge som
   grønn pille, nedtelling Archivo 800 `--fs-hero` tabular, hairline
   grønn → cyan i bunnen.
4. **Sidehode** — h1 `--fs-2xl` 800, dim-linje under.
5. **Kort** — `--surface`, `--border`, `--radius`; h2 majuskel `--fs-xs`
   tracking .12em `--text-dim`. **AI-kort**: 3 px cyan hairline venstre +
   cyan AI-merke.
6. **Stat-strip** — som i dag, verdier Archivo 800 `--fs-xl`.
7. **Datatabell** — `--fs-base`, th `--dim-strong` majuskel, rad-hover
   `--surface-2`, pinned-variant og sortable uendret.
8. **Klubbmerke `.club`** — inline-flex, gap .35rem: `<img>` 70×70 vist
   som 18 px (`--sm`), 28 px (`--md`), 40 px (`--lg`) + `.club-name`
   (Archivo 700, `--fs-sm`). Plassholder `.club-fallback`: sirkel i
   `--club-fallback` med 1 px `--border-strong`.
9. **Drakt-chip `.shirt`** — 110×145 vist 44 px bred (benk 34 px), sentrert
   øverst i spillerkortet.
10. **Spillerkort `.chip`** — drakt + navn + «LAG · £pris». Kaptein: 2 px
    ring `--accent-2` + C-merke (`--accent-2` fyll, hvit). Vise: hul ring.
11. **FDR-merke** — FPLs fem farger, mono-font, min-bredde 2.6rem.
12. **Statuspille** — nøytral (`--surface-2`/`--text-dim`), skade/utestengt
    (`--accent-2-soft`/`--accent-2-text`), tvilsom (warn).
13. **Match-kort (live)** — `--surface-2`, merke `--md` + kortnavn på hver
    side, score Archivo 800 `--fs-lg`; live-kant `--accent-2`.
14. **Tomtilstand/feilside** — `.empty-state`, kode i `--accent-2-text`,
    lenke som grønn knapp.
15. **Filterpanel** — felter `--surface-2`, fokus `--focus`.
16. **Knapper** — `.btn-accent`: fyll `--accent`, tekst `--accent-ink`,
    ingen kant. `.btn-quiet`: `--surface-2` + `--border-strong`.
17. **503-banner** — warn-tokens.
18. **Footer** — kreditering + versjon (mono).
19. **Nyhetsliste** — uendret struktur, lenker `--text` → hover
    `--accent-text`.
20. **Live-puls** — `--accent-2`.

## 4. Klubbgrafikk

- **Kilde:** FPL/PL sine egne PNG-er (F11). **Lisens:** varemerker; privat,
  ikke-kommersiell bruk med kreditering i footer (beslutning 3).
- **Plassering:** `public/img/clubs/` — 60 filer: `t{code}.png` (70×70),
  `shirt_{code}.png` (110×145), `shirt_{code}_1.png` (110×145). Sum ~560 KB,
  committes i repoet, følger med i Docker-imaget via `COPY public`.
- **Skript:** `scripts/fetch-club-assets.mjs` (kode i Task 1.3-3), kjøres
  med `npm run fetch-clubs`. Kjøres manuelt én gang per sesong. Eneste
  sted utenfor `fplClient.js` med nettverk — det er et CLI-verktøy, ikke
  app-kode, og står i CLAUDE.md som unntak.
- **Versjonering:** `?v=2627` (`IMG_VERSION` i `middleware.js`).
  `cacheControlFor` gir immutable for den. Cloudflares 4 t-overstyring
  treffer aldri (alle URL-er versjonerte).
- **Lastestrategi:** `<img loading="lazy" decoding="async" width height>`
  → ingen layout-shift, ingen requests for rader utenfor skjermen. Ingen
  sprite (60 separate, immutable filer er billigere å vedlikeholde og
  cacher bedre). `<img>`, ikke CSS-bakgrunn (alt-tekst, lazy, print).
- **Fallback:** `clubAssets.hasBadge/hasShirt/hasKeeper(code)` fra
  mappelisting ved oppstart. Mangler merke → `.club-fallback`-dott +
  kortnavn. Mangler drakt → merket; mangler det også → dott. Mappa mangler
  helt → alt tekst, appen starter. `/live` (klientrendret) bytter et feilet
  bilde til dotten via `error`-lytter.
- **Antall requests per side:** dashbord ≤ 20 merker (FDR) + ≤ 20 i
  kortene (samme URL-er → cache-treff); /spillere ≤ 20 unike merker;
  /lag 15 drakter + ≤ 20 merker; alle immutable etter første besøk.
- **HTML-vekst:** /spillere 609 rader × ~140 B ≈ +85 KB rå (~+5 KB gzip,
  `compression` er på).

## 5. Temasystem

- **Kart:** dark = `:root {…}` (basen), light = `:root[data-theme="light"] {…}`.
  `color-scheme: dark` / `light` settes i hver blokk (skjemaelementer,
  scrollbars). Ingen `@media (prefers-color-scheme)` i CSS — inline-scriptet
  løser auto til en konkret verdi, så CSS trenger bare én lys-blokk.
- **Inline-script (layout.ejs, FØR `<link rel="stylesheet">`):**

```html
  <script>
    // Tema før første paint: lagret valg vinner, ellers systemets. Må ligge
    // inline foran stilarket — et eksternt script gir et blaff i feil tema.
    // Speiler resolveTheme() i app.js. Uten JS: mørkt (CSS-basen).
    (function () {
      var t = null;
      try { t = localStorage.getItem('fpl-theme'); } catch (e) { /* privat modus */ }
      if (t !== 'light' && t !== 'dark') {
        t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', t);
    })();
  </script>
```

- **Persistens:** `localStorage['fpl-theme']` = `'light'` | `'dark'`;
  fraværende = auto. `try/catch` rundt alt (privat modus kaster).
- **Bryter:** `views/partials/theme-toggle.ejs` inkludert sist i
  `.topbar`. app.js Modul 5 (kode i Task 1.0-3) leser lagret modus,
  setter `data-mode` + aria-label, sykler ved klikk, lytter på
  `matchMedia` i auto.
- **Asset-hash:** scriptet er HTML → `assetVersion` (style.css + app.js)
  uendret av det. Modul 5 i app.js og tokenblokkene i style.css endrer
  hashen som vanlig.
- **390 px:** bryteren er 36×36 px, `flex: 0 0 auto`, plassert etter nav
  med `margin-left: auto`; nav-en beholder sin scroll og kantfade, bryteren
  ligger utenfor scroll-området.

## 6. Per side — sluttresultatet

Markørstrengene i `test/views.test.js` (F12) er **kontrakt** og beholdes
ordrett i markupen: «Neste deadline», «Ingen kommende deadline»,
«Formtallene nullstilles», «Ingen overganger er registrert», «Marius XI»,
«Fant ingen lagoppstilling», `players-table`, «Differensialer», «Fant ingen
private miniligaer», «Ligatabellen er tom fram til første runde»,
«Rundebrief», `live-root`, «Ingen aktiv runde», «FPL-nyheter», «Fant ingen
saker», «Ingen overganger registrert ennå», «Venter på runde», `FPL_TEAM_ID`,
«404», «Noe gikk galt», `team-name-full`, `aria-current="page">Label<`.

| Side | v1.3.0 (tokens) | v1.3.1 (grafikk) | v1.3.2 (finpuss) | Tomtilstand |
|---|---|---|---|---|
| **/** | Hero i hero-tokens, kort/tabeller re-tonet, AI-kort cyan | Lag-kolonner → `.club--sm` i alle fire kort; FDR-radhode → `.club--md` + fullnavn (sr på mobil) | gw-badge grønn pille, hairline grønn→cyan, kort-h2 med tall til høyre | uendret tekst |
| **/spillere** | filterpanel + tabell re-tonet | Lag-kolonne → `.club--sm` | th holder `data-type`/`aria-sort` (låses i test) | «Viser 0 av N» (app.js) |
| **/lag** | statstripe, bane (stripe-tokens), chips | drakter på banen (keeperdrakt for GK), benk 34 px, merker i kapteins-/salgslister | kort-h2 «Oppstilling» får chip-etikett, AI-knapp grønn fyll | uendret tekst |
| **/liga** | row-me `--accent-soft` + stripe, piler accent-text/negative | differensialer får `.club--sm` (rute sender `teamsById`) | — | uendret |
| **/brief** | AI-kort cyan | skader/kapteiner `.club--sm`; kamper `.club--sm` hjemme – borte (`homeCode/awayCode`) | kamp-lista som rader med klokkeslett i mono | uendret |
| **/live** | statstripe, match-kort, puls rosa | spillere `.club--sm` (JS), match-kort `.club--md` (JS), `data-img-version` på `#live-root` | — | «Ingen aktiv runde» |
| **/nyheter** | AI-kort cyan, liste | — | større trykkflater ≤ 480 px (`padding: var(--space-3) 0`) | uendret |
| **/overganger** | statstripe, tabell | Inn/Ut → `.club--sm` med `showName:false` foran navnet | — | uendret |
| **no-team / error / 404** | empty-state tokens, kode i `--accent-2-text` | — | lenke tilbake som `.btn-accent` | er tomtilstanden |

## 7. Datakobling — `teams.code` fram til viewene

- **Ingen forretningslogikk i routes/views.** Partialen leser `team.code`
  og spør `clubAssets` (ren funksjon av en filliste) — det er presentasjon.
- **dashboard, players, team:** `teamsById` (fra `byId(teams)`) bærer
  allerede `code` (F9). Null service-endring.
- **league:** `src/routes/league.js` legger `teamsById: byId(bootstrap.teams)`
  i locals (bootstrap hentes allerede i ruta). Fixtures får `teamsById`.
- **brief.js:** `injuries[].teamCode`, `captains[].teamCode`,
  `fixturesByDay[].matches[].homeCode/awayCode` (i `groupFixturesByDay`).
- **live.js:** `myPlayers[].teamCode`, `matches[].homeCode/awayCode`.
- **transfers.js:** `inn/ut` får `teamShort` + `teamCode` via `ref(id)`
  (bruker `byId(bootstrap.teams ?? [])`).
- **server.js:** `app.locals.clubAssets = loadClubAssets(path.join(rootDir, 'public', 'img', 'clubs'))`.
  Express fletter `app.locals` inn i alle `res.render`-kall, og EJS
  `include` arver foreldrelocals → partialen ser `clubAssets` overalt.
- **/health:** `clubImages: req.app.locals.clubAssets?.count ?? null`.

## 8. Tilgjengelighet

- Kontrast: alle par i §3.3, låst av `test/style.test.js` i begge temaer.
- Tastatur: bryteren er en ekte `<button>`, nås med Tab etter nav-lenkene,
  Enter/Space sykler. Sorterbare th har `tabIndex` + Enter/Space fra før.
- Fokus: `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }`
  — grønn på mørkt (14:1), lilla på lyst (17:1). I topbaren: hvit ring.
- Bilder: `alt=""` (dekorative) + synlig kortnavn, eller `.sr-only`
  fullnavn når `showName:false`. Ingen dobbel opplesning.
- `prefers-reduced-motion`: ingen nye animasjoner; temabytte er
  øyeblikkelig (ingen transition på `body`).
- `color-scheme` per tema → native skjemaelementer og scrollbars følger.
- Bryterens `aria-label` oppdateres ved hvert klikk (skjermleser hører ny
  tilstand).

## 9. Mobil (390 px referanse)

- Uendret og skal ikke regrederes: `.table-scroll` (kun vannrett scroll),
  `.table-scroll--pinned` med sticky thead under `--topbar-h`, nav-scroll
  med scroll-snap + kantfade (app.js Modul 0), `.fdr-table .team-name-full`
  skjult ≤ 480 px, `overflow-wrap: break-word` ≤ 480 px.
- Nytt: bryteren utenfor nav-scrollen (36 px), `.club--sm` 18 px så
  Lag-kolonnen ikke vokser mer enn ~22 px, drakter 40 px på banen ≤ 480 px
  (chip min-width 6.5rem → fire i bredden på 390 px ved flex-wrap).
- Playwright-sjekk: `document.documentElement.scrollWidth <= innerWidth`
  på alle sider × 390/768/1024/1440 × begge temaer.

## 10. Testing

### 10.1 De 13 view-testene (28 kjørte)

- **Ingen av dem skrives om.** Markørene er kontrakt (§6). Nav-regexen
  `aria-current="page">Label<` krever at lenketeksten står rett etter `>`
  — ingen ikoner inni nav-lenker. XSS-testene (live-JSON, `bold()`,
  `safeLink`) er uberørte fordi `esc/bold/safeLink` i brief/news og
  `JSON.stringify(...).replace(/</g,'\\u003c')` i live ikke endres.
- **Fixtures endres (test/fixtures/views.js):** `teamsById` får `code`
  (Arsenal 3, Liverpool 14); `shared` får `clubAssets:
  clubAssetsFrom(['t3.png','shirt_3.png','shirt_3_1.png'])` (Arsenal har
  bilder, Liverpool ikke → begge grener rendres); `league*` får
  `teamsById`; `live.live.myPlayers[0].teamCode: 3`, `matches[0].homeCode: 3,
  awayCode: 14`; `briefData.injuries[0].teamCode: 3`, `captains[0].teamCode:
  14`, `matches[0].homeCode/awayCode`; `transfers.rows[].inn/ut.teamShort/
  teamCode`.
- Partialen guarder `typeof clubAssets !== 'undefined'` → gamle fixtures
  uten `clubAssets` rendrer fortsatt (tekstgren). Rødfasene kommer derfor
  kun fra NYE tester, aldri fra at gamle knekker.

### 10.2 Nye tester og forventede tall

Utgangspunkt `main`: **272/272, lint 0.**

| Etappe | Fil | Nye tester | Sum |
|---|---|---|---|
| v1.3.0 | `test/style.test.js` (ny) | 4: tokenparitet, ingen hardkodede farger, kontrastpar mørkt, kontrastpar lyst | |
| | `test/app-client.test.js` | 4: `resolveTheme` ×2, `nextMode`, `THEME_LABELS` | |
| | `test/views.test.js` | 2: inline-script før stilarket, bryteren i layout | **282** |
| v1.3.1 | `test/middleware.test.js` | 1: `IMG_VERSION` immutable | 283 |
| | `test/clubAssets.test.js` (ny) | 4 | 287 |
| | `test/brief.test.js` 1 · `test/live.test.js` 1 (+2 eksisterende asserts utvides) · `test/transfers.test.js` 1 | 3 | 290 |
| | `test/views.test.js` | 5: badge med fil, badge uten fil, drakt/keeper/fallback, dashboard FDR-merker, footer-kreditering | |
| | `test/app-client.test.js` | 1: `clubBadgeHtml` | **296** |
| v1.3.2 | `test/views.test.js` | 3: hero-kontrakt (`data-deadline` + 4 `data-unit`), feilsidene lenker til `/`, players-thead `data-type`/`aria-sort` | **299** |
| v1.3.3 | etter funn | ≥ 0 | **≥ 299** |

Per task under står forventet rødt/grønt. Avviker tallet: stopp og finn
ut hvorfor før du går videre.

### 10.3 Playwright-QA (scratchpad, etter hver etappe)

Kjøres mot lokal server med tomme nøkler (0 AI-kall). Skript i Vedlegg A.
Sjekker per side (8) × viewport (390/768/1024/1440) × tema (2): ingen
vannrett scroll, ingen brutte bilder (`img.complete && naturalWidth > 0`),
`data-theme` matcher, fokusring på første nav-lenke har `outline-width ≥ 2px`.
Pluss: temabryter persisterer over reload (1 sjekk), sticky thead på
/spillere ved scroll, nav-fade-klasse på 390. **332 sjekker** (regnet ut i
Vedlegg A).
Resultat føres inn i etappens verifiseringstabell. Playwright installeres i
scratchpad (`npm init -y && npm i playwright && npx playwright install chromium`),
aldri i repoet.

## 11. Ytelse

- CSS: mål ≤ 1 550 linjer / ≤ 36 KB rå (i dag 1 202 / 25,6 KB); gzip via
  `compression` ≈ 7 KB. Lys-blokken er ~55 linjer.
- app.js: +~60 linjer (Modul 5 + `clubBadgeHtml` + error-lytter).
- Bilder: ≤ 40 unike requests per side, alle immutable 1 år; første
  dashbord-besøk ≤ 165 KB bilder, deretter 0.
- Ingen byggesteg, ingen nye avhengigheter (Playwright kun i scratchpad).
- HTML: /spillere +~85 KB rå (+~5 KB gzip).

## 12. Risiko og rollback

| Risiko | Etappe | Tiltak | Rollback |
|---|---|---|---|
| Cloudflare serverer gammel CSS | alle | ny hash → ny URL (F8) | ingen purge nødvendig |
| Inline-script feiler i en nettleser | 1.3.0 | try/catch, fallback mørkt | `git revert -m 1 <merge>` + push |
| `localStorage` kaster (privat modus) | 1.3.0 | try/catch i script + Modul 5 | — |
| Kontrast-regresjon ved senere token-endring | alle | `style.test.js` feiler | — |
| Bildemappe mangler i imaget | 1.3.1 | `COPY public` tar den med (F16); `/health` viser `clubImages` | text-fallback, ingen krasj |
| Ny sesong, samme URL, gammel drakt cachet | fremtid | `IMG_VERSION`-bump dokumentert i DEPLOY.md + skriptet | — |
| `live.test.js` nøkkelliste knekker | 1.3.1 | planlagt i rødfasen (F14) | — |
| Marker-streng fjernes i finpuss | 1.3.2 | §6-kontrakten, view-testene | — |
| Halvferdig UI i prod | — | hver etappe er et helt UI; merges kun når grønn + Playwright OK | revert av én merge-commit |
| Prod-retest av /brief koster | 1.3.2 | nøyaktig 1 kall, budsjettert | — |

Rollback-prosedyre (alle etapper): `git revert -m 1 <merge-sha>` på `main`,
`npm test` grønn, push på klarsignal → Coolify deployer forrige tilstand.
Alternativ uten commit: Coolify «Redeploy» av forrige image. localStorage-
nøkkelen `fpl-theme` er ufarlig for en eldre versjon (ignoreres).

## 13. Åpne beslutninger til Marius

**Ingen.** Alle 15 punkter er besluttet (§2). Fables egne implementasjons-
valg (F-a … F-i) er rapportert, ikke åpne.

---

# ETAPPE 1 — v1.3.0 Fundament (branch `feat/ui-v130-fundament`)

Sluttresultat i prod: hele appen i ny palett i BEGGE temaer, lilla topbar,
temabryter som husker valget. Ingen markup-endringer utenfor `layout.ejs`.

## Task 1.0-0 — Oppstart

- [x] Les `docs/HANDOVER.md` + `CLAUDE.md` + denne planen + mockupen.
- [x] `git checkout main && git status --porcelain` tomt. `npm test` →
      **272/272**, `npm run lint` → exit 0. Observert: **272/272, lint exit 0,
      rent tre** (24. aug)
- [x] `git checkout -b feat/ui-v130-fundament`

## Task 1.0-1 — `test/style.test.js` (ny fil): tokenparitet, ingen hardkodede farger, kontrast

**Filer:** `test/style.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Stilarket er et API: hver fargetoken finnes i begge temaer, ingen farger
// utenfor tokenblokkene, og kontrastparene består WCAG i begge temaer.
// Erstatter engangsskriptet kontrast.mjs fra v1.1.0 med en varig test.
const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

function tokensIn(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `fant ikke blokken «${selector} {»`);
  const end = css.indexOf('\n}', start);
  const out = new Map();
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

const dark = tokensIn(':root');
const light = tokensIn(':root[data-theme="light"]');
const isColor = (v) => /^(#|rgba?\(|0 2px 8px)/.test(v);

test('style.css: hver fargetoken i :root finnes også i lyst tema, og omvendt', () => {
  const darkColors = [...dark].filter(([, v]) => isColor(v)).map(([k]) => k);
  const lightKeys = [...light.keys()];
  assert.deepEqual(lightKeys.filter((k) => !dark.has(k)), [], 'lys-token uten mørk motpart');
  assert.deepEqual(darkColors.filter((k) => !light.has(k)), [], 'mørk fargetoken mangler i lyst tema');
  assert.ok(darkColors.length >= 40, `for få fargetokens: ${darkColors.length}`);
});

test('style.css: ingen hardkodede farger utenfor tokenblokkene', () => {
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:root(\[data-theme="light"\])? \{[\s\S]*?\n\}/g, '')
    .split('\n')
    .filter((line) => !line.includes('mask-image')) // #000 i masken er alfa, ikke farge
    .join('\n');
  const hits = stripped.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [];
  assert.deepEqual(hits, [], `hardkodede farger: ${hits.join(', ')}`);
});

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [forgrunn, bakgrunn, krav] — 4.5 tekst, 3 grafikk. Kun hex-tokens.
const PAIRS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text', 'surface-3', 4.5],
  ['text-dim', 'surface', 4.5], ['text-dim', 'surface-2', 4.5], ['text-dim', 'surface-3', 4.5],
  ['dim-strong', 'surface', 4.5], ['dim-strong', 'surface-3', 4.5],
  ['accent-text', 'bg', 4.5], ['accent-text', 'surface', 4.5], ['accent-text', 'surface-2', 4.5],
  ['accent-ink', 'accent', 4.5],
  ['accent-2-text', 'surface', 4.5], ['accent-2-text', 'surface-2', 4.5],
  ['accent-2-ink', 'accent-2', 4.5],
  ['cyan-text', 'surface', 4.5], ['cyan-text', 'surface-2', 4.5],
  ['negative', 'surface', 4.5], ['negative', 'surface-2', 4.5],
  ['warn-text', 'warn-bg', 4.5],
  ['topbar-text', 'topbar-bg', 4.5], ['topbar-dim', 'topbar-bg', 4.5], ['accent-ink', 'accent', 4.5],
  ['hero-text', 'hero-from', 4.5], ['hero-text', 'hero-to', 4.5], ['hero-dim', 'hero-from', 4.5], ['hero-dim', 'hero-to', 4.5],
  ['fdr-ink-light', 'fdr-1', 3], ['fdr-ink-dark', 'fdr-2', 3], ['fdr-ink-dark', 'fdr-3', 3],
  ['fdr-ink-light', 'fdr-4', 3], ['fdr-ink-light', 'fdr-5', 3],
  ['focus', 'bg', 3], ['focus', 'surface', 3],
];

for (const [name, tokens] of [['mørkt', dark], ['lyst', light]]) {
  test(`style.css: kontrastparene består WCAG i ${name} tema`, () => {
    const feil = [];
    for (const [fg, bg, krav] of PAIRS) {
      const f = tokens.get(fg) ?? dark.get(fg);
      const b = tokens.get(bg) ?? dark.get(bg);
      assert.match(f, /^#[0-9a-f]{6}$/i, `${fg} er ikke hex i ${name}`);
      assert.match(b, /^#[0-9a-f]{6}$/i, `${bg} er ikke hex i ${name}`);
      const r = ratio(f, b);
      if (r < krav) feil.push(`${fg}/${bg} = ${r.toFixed(2)} (krav ${krav})`);
    }
    assert.deepEqual(feil, []);
  });
}
```

Merk: dette er 4 `test(`-kall (paritet, hardkodet, kontrast ×2 via løkke),
som i §10.2.

- [x] Tester skrevet. `npm test` — **forventet rødt: 276 tester, 3 feiler**
      (paritet: lys-blokk finnes ikke → `assert.notEqual` kaster i modul-
      scope → hele fila feiler som én). NB: kaster `tokensIn` på toppnivå,
      rapporterer node:test det som 1 feilende fil, ikke 4 tester. Godta
      begge former; noter observert: **273 tester, 1 feiler** (hele
      style.test.js som én — den andre av de to godtatte formene)

## Task 1.0-2 — `public/style.css`: tokenblokkene (grønt for 1.0-1)

Erstatt linje 13–68 (`:root { … }`) med de to blokkene under. Deretter
fjern hardkodede farger (F5): `.fdr { color: var(--fdr-ink-light) }`,
`.fdr-1,.fdr-2,.fdr-3 { color: var(--fdr-ink-dark) }` (fdr-1 får
`--fdr-ink-light` — se §3.2: 1/4/5 hvit, 2/3 lilla), `.cap { color:
var(--accent-2-ink) }`, `.pitch` bruker `var(--pitch-line)`,
`var(--pitch-stripe-a)`, `var(--pitch-stripe-b)`, `.chip { box-shadow:
var(--shadow) }`, `.chip-captain { box-shadow: 0 0 0 2px var(--accent-2), var(--shadow) }`.
`.hero { background: linear-gradient(160deg, var(--hero-from), var(--hero-to)); color: var(--hero-text) }`,
`.hero-date, .countdown .lbl { color: var(--hero-dim) }`, `.countdown .val, .hero h1 { color: var(--hero-text) }`.
`.hero::after { background: linear-gradient(90deg, var(--accent), var(--cyan)) }`.

```css
:root {
  color-scheme: dark;

  /* Flater — FPL-lilla natt. Mørkt er basen: det man får uten JS. */
  --bg: #170826;
  --surface: #221035;
  --surface-2: #2d1846;
  --surface-3: #3a2358;
  --border: rgba(190, 160, 255, 0.14);
  --border-strong: rgba(190, 160, 255, 0.3);

  /* Tekst */
  --text: #f4f1fa;
  --text-dim: #b8a9d1;
  --dim-strong: #a293c0;

  /* Grønn = handling. --accent er FYLL (mørk tekst oppå), --accent-text er
     grønn som tekst — i lyst tema blir den mørkegrønn, FPL-grønn på hvitt
     er 1,34:1. */
  --accent: #00ff87;
  --accent-text: #00ff87;
  --accent-ink: #170826;
  --accent-soft: rgba(0, 255, 135, 0.12);

  /* Rosa = kaptein, live, negativt varsel. Fyll/tekst/ink som for grønn. */
  --accent-2: #e90052;
  --accent-2-text: #ff4d99;
  --accent-2-ink: #ffffff;
  --accent-2-soft: rgba(233, 0, 82, 0.14);

  /* Cyan = AI-innhold */
  --cyan: #04f5ff;
  --cyan-text: #04f5ff;
  --cyan-soft: rgba(4, 245, 255, 0.12);

  --negative: #ff5c8a;
  --warn-bg: #3d2f0f;
  --warn-border: #8a6d1f;
  --warn-text: #ffd166;

  /* FDR — FPLs egne farger, like i begge temaer. 1/4/5 hvit tekst, 2/3 lilla. */
  --fdr-1: #375523;
  --fdr-2: #01fc7a;
  --fdr-3: #e7e7e7;
  --fdr-4: #ff1751;
  --fdr-5: #80072d;
  --fdr-ink-light: #ffffff;
  --fdr-ink-dark: #37003C;
  --fdr-blank: #2d1846;

  /* Topbar er FPL-lilla i begge temaer — merkevareankeret. */
  --topbar-bg: #37003C;
  --topbar-text: #ffffff;
  --topbar-dim: #d9cfe0;

  /* Hero */
  --hero-from: #221035;
  --hero-to: #3a2358;
  --hero-text: #f4f1fa;
  --hero-dim: #b8a9d1;

  /* Banen, skygger, scrollbar, fokus, plassholder */
  --pitch-line: rgba(240, 253, 248, 0.09);
  --pitch-stripe-a: rgba(0, 255, 135, 0.055);
  --pitch-stripe-b: rgba(0, 255, 135, 0.03);
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  --scrollbar-thumb: #5c4a80;
  --scrollbar-thumb-hover: #7a66a3;
  --focus: #00ff87;
  --club-fallback: #3a2358;

  /* Typografi */
  --font-display: 'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Mono', Consolas, 'SF Mono', monospace;
  --fs-xs: 0.7rem;
  --fs-sm: 0.8rem;
  --fs-base: 0.9rem;
  --fs-md: 1rem;
  --fs-lg: 1.2rem;
  --fs-xl: 1.5rem;
  --fs-2xl: 1.9rem;
  --fs-hero: clamp(2.6rem, 9vw, 4.2rem);

  /* Rytme */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2.5rem;
  --topbar-h: 57px;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-pill: 999px;
  --pad: 1rem;
  --maxw: 1160px;
}

/* Lyst tema — FPL-dagslys. Settes av inline-scriptet i layout.ejs (lagret
   valg eller prefers-color-scheme) og av temabryteren i app.js. Kun
   fargetokens: alt annet arves fra :root. */
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #f4f2f8;
  --surface: #ffffff;
  --surface-2: #efeaf4;
  --surface-3: #e3dcec;
  --border: rgba(55, 0, 60, 0.12);
  --border-strong: rgba(55, 0, 60, 0.25);
  --text: #37003C;
  --text-dim: #5c4a6b;
  --dim-strong: #665573;
  --accent: #00ff87;
  --accent-text: #04703d;
  --accent-ink: #37003C;
  --accent-soft: rgba(0, 255, 135, 0.18);
  --accent-2: #e90052;
  --accent-2-text: #c2003f;
  --accent-2-ink: #ffffff;
  --accent-2-soft: rgba(233, 0, 82, 0.1);
  --cyan: #04f5ff;
  --cyan-text: #0b6f78;
  --cyan-soft: rgba(4, 245, 255, 0.14);
  --negative: #c2003f;
  --warn-bg: #fff3cd;
  --warn-border: #e0b84a;
  --warn-text: #6b4d00;
  --fdr-1: #375523;
  --fdr-2: #01fc7a;
  --fdr-3: #e7e7e7;
  --fdr-4: #ff1751;
  --fdr-5: #80072d;
  --fdr-ink-light: #ffffff;
  --fdr-ink-dark: #37003C;
  --fdr-blank: #efeaf4;
  --topbar-bg: #37003C;
  --topbar-text: #ffffff;
  --topbar-dim: #d9cfe0;
  --hero-from: #37003C;
  --hero-to: #5e1a6b;
  --hero-text: #ffffff;
  --hero-dim: #d9cfe0;
  --pitch-line: rgba(55, 0, 60, 0.12);
  --pitch-stripe-a: rgba(0, 255, 135, 0.16);
  --pitch-stripe-b: rgba(0, 255, 135, 0.1);
  --shadow: 0 2px 8px rgba(55, 0, 60, 0.12);
  --scrollbar-thumb: #c9bfd6;
  --scrollbar-thumb-hover: #b1a4c2;
  --focus: #37003C;
  --club-fallback: #e3dcec;
}
```

Token-omdøping i resten av fila (søk/erstatt, i denne rekkefølgen):
`var(--accent-2)` som TEKSTFARGE (`.ai-badge`, `.status-i…`, `.deadline-passed`,
`.empty-code`, `.match-live .match-status`, `.cap.vice`) → `var(--accent-2-text)`;
som fyll/kant (`.cap`, `.chip-captain`, `.match-live`, `.pulse-on`,
`.card-ai`) beholdes `--accent-2`. `a`, `.accent`, `.wordmark span`,
`.eyebrow`, `.filters button:hover`, `table.sortable th[aria-sort]`,
`.news-list a:hover`, `.row-me td:first-child` (stripe = fyll, behold
`--accent`) → tekstbruk får `--accent-text`. `.btn-accent { background:
var(--accent); color: var(--accent-ink); border: 0; }`. `.card-ai
{ border-left-color: var(--cyan) }`, `.ai-badge { background: var(--cyan-soft);
color: var(--cyan-text) }`. `:focus-visible { outline-color: var(--focus) }`.
Skriftstørrelser: erstatt de faste rem-verdiene med nærmeste `--fs-*`
(0.7/0.72 → xs, 0.78–0.85 → sm, 0.88–0.92 → base, 1.1–1.25 → lg,
1.35–1.5 → xl, 1.9 → 2xl, countdown → hero). `border-radius: 99px` →
`var(--radius-pill)`.

- [x] `npm test` — **forventet grønt: 276/276** (style-testene grønne).
      `npm run lint` exit 0. Observert: **276/276, lint exit 0**
- [x] Kjør style-testen alene og les output: `node --test test/style.test.js`
      — alle 4 OK. Observert: **4/4 pass**
- [x] CHANGELOG `[Unreleased]` → `### Changed`: «Ny palett i FPL-familien
      (lilla, grønn, cyan, rosa) og FPLs egne FDR-farger, som tokens i to
      temaer. Kontrasten (≥ 4,5:1) er nå låst av en test.»
- [x] Commit: `feat(ui): tokenpalett for mørkt og lyst tema, kontrast låst av test`

## Task 1.0-3 — Temafunksjoner i `app.js` (TDD)

**Filer:** `test/app-client.test.js`, `public/app.js`

### 3a. Tester først (legg til nederst i app-client.test.js)

```js
// ---- v1.3.0: tema ----------------------------------------------------------
// Inline-scriptet i layout.ejs speiler resolveTheme(); app.js eier bryteren.

test('resolveTheme bruker lagret valg foran systemet', () => {
  assert.equal(app.resolveTheme('light', false), 'light');
  assert.equal(app.resolveTheme('dark', true), 'dark');
});

test('resolveTheme faller tilbake på systemet når ingenting gyldig er lagret', () => {
  assert.equal(app.resolveTheme(null, true), 'light');
  assert.equal(app.resolveTheme(null, false), 'dark');
  assert.equal(app.resolveTheme('tull', true), 'light');
  assert.equal(app.resolveTheme(undefined, false), 'dark');
});

test('nextMode sykler auto → light → dark → auto', () => {
  assert.equal(app.nextMode('auto'), 'light');
  assert.equal(app.nextMode('light'), 'dark');
  assert.equal(app.nextMode('dark'), 'auto');
  assert.equal(app.nextMode('ukjent'), 'auto');
});

test('THEME_LABELS har norsk etikett for alle tre modusene', () => {
  const labels = app.evaluate('THEME_LABELS');
  assert.deepEqual(Object.keys(labels).sort(), ['auto', 'dark', 'light']);
  assert.match(labels.auto, /^Tema: automatisk/);
  assert.equal(labels.light, 'Tema: lyst');
  assert.equal(labels.dark, 'Tema: mørkt');
});
```

- [x] `npm test` — **forventet rødt: 280 tester, 4 feiler.** Observert: **280
      tester, 4 feiler** (nøyaktig som forventet)

### 3b. Implementasjon (public/app.js)

Legg til på filnivå, rett etter `nextWakeupDelay` (før Modul 0):

```js
// Tema: «auto» følger systemet, «light»/«dark» er lagret valg. Inline-
// scriptet i layout.ejs setter data-theme før første paint med samme
// regel — dette er bare bryteren og live-lytting på systemet etterpå.
const THEME_KEY = 'fpl-theme';
const THEME_MODES = ['auto', 'light', 'dark'];
const THEME_LABELS = {
  auto: 'Tema: automatisk (følger systemet)',
  light: 'Tema: lyst',
  dark: 'Tema: mørkt',
};

function resolveTheme(stored, prefersLight) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersLight ? 'light' : 'dark';
}

function nextMode(mode) {
  const i = THEME_MODES.indexOf(mode);
  return THEME_MODES[(i + 1) % THEME_MODES.length];
}
```

Og nederst i fila, etter Modul 4:

```js
// Modul 5: Temabryteren i topbaren. Sykler auto → lys → mørk, lagrer valget
// (auto = ingen nøkkel), og følger systemet live så lenge valget er auto.
(function () {
  'use strict';

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const media = window.matchMedia('(prefers-color-scheme: light)');
  const read = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  };
  const write = (mode) => {
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch {
      // Privat modus / blokkert lagring: valget gjelder til neste sidelast.
    }
  };

  function apply(mode) {
    const theme = resolveTheme(mode === 'auto' ? null : mode, media.matches);
    document.documentElement.setAttribute('data-theme', theme);
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', THEME_LABELS[mode]);
    btn.title = THEME_LABELS[mode];
  }

  let mode = THEME_MODES.includes(read()) ? read() : 'auto';
  apply(mode);
  btn.addEventListener('click', () => {
    mode = nextMode(mode);
    write(mode);
    apply(mode);
  });
  media.addEventListener('change', () => {
    if (mode === 'auto') apply(mode);
  });
})();
```

- [x] `npm test` — **forventet grønt: 280/280.** `npm run lint` exit 0
      (`no-unused-vars`: `THEME_LABELS`, `resolveTheme`, `nextMode` brukes i
      Modul 5). Observert: **280/280, lint exit 0**
- [x] Commit: `feat(ui): temafunksjoner og bryter-modul i app.js`

## Task 1.0-4 — Layout: inline-script, bryter-partial, topbar (TDD)

**Filer:** `test/views.test.js`, `views/layout.ejs`,
`views/partials/theme-toggle.ejs` (ny), `public/style.css`

### 4a. Tester først (views.test.js, etter font-preload-testen)

```js
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
```

- [x] `npm test` — **forventet rødt: 282 tester, 2 feiler.** Observert: **282
      tester, 2 feiler** (nøyaktig som forventet)

### 4b. Implementasjon

**`views/partials/theme-toggle.ejs`** (ny):

```html
<%# Temabryter: auto → lys → mørk. Ikonet velges av data-mode (CSS), app.js
    Modul 5 eier tilstanden. Uten JS: knappen gjør ingenting, siden er mørk. %>
<button type="button" class="theme-toggle" id="theme-toggle" data-mode="auto" aria-label="Tema: automatisk (følger systemet)" title="Tema: automatisk (følger systemet)">
  <svg class="theme-icon theme-icon--auto" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>
  <svg class="theme-icon theme-icon--light" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></g></svg>
  <svg class="theme-icon theme-icon--dark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>
</button>
```

**`views/layout.ejs`:** sett inline-scriptet fra §5 inn mellom favicon-
linja (7) og font-preload (10). Etter `</nav>` (linje 28):
`<%- include('partials/theme-toggle') %>`.

**`public/style.css`** — topbar og bryter:

```css
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0.7rem 1.25rem;
  background: var(--topbar-bg);
  color: var(--topbar-text);
  position: sticky;
  top: 0;
  z-index: 10;
}

.wordmark { color: var(--topbar-text); /* ellers som før */ }
.wordmark span { color: var(--accent); }
.topbar nav a { color: var(--topbar-dim); }
.topbar nav a:hover { color: var(--topbar-text); background: rgba(255, 255, 255, 0.1); }
```

NB: `rgba(255,255,255,.1)` er en hardkodet farge → må være token:
`--topbar-hover: rgba(255, 255, 255, 0.1)` i begge blokker. Legg den til
i 1.0-2-blokkene (samme verdi i begge).

```css
.topbar nav a[aria-current='page'] {
  color: var(--accent-ink);
  background: var(--accent);
  font-weight: 600;
}

.topbar :focus-visible { outline-color: var(--topbar-text); }

.theme-toggle {
  flex: 0 0 auto;
  margin-left: auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--topbar-hover);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--topbar-text);
  cursor: pointer;
  padding: 0;
}

.theme-toggle:hover { background: var(--topbar-hover); }
.theme-toggle .theme-icon { display: none; width: 20px; height: 20px; }
.theme-toggle[data-mode='auto'] .theme-icon--auto,
.theme-toggle[data-mode='light'] .theme-icon--light,
.theme-toggle[data-mode='dark'] .theme-icon--dark { display: block; }
```

Mobil (≤ 640): `.topbar { gap: var(--space-3) }` som før; bryteren
uendret 36 px.

- [x] `npm test` — **forventet grønt: 282/282** (asset-hash- og font-
      testene består: scriptet refererer ingen filer). `npm run lint` exit 0.
      Observert: **282/282, lint exit 0**
- [x] CHANGELOG `[Unreleased]` `### Added`: «Mørkt og lyst tema: følger
      nettleseren automatisk, og en bryter i toppmenyen (auto → lys → mørk)
      husker valget. Ingen blaff i feil tema ved sidelast.» `### Changed`:
      «Toppmenyen er FPL-lilla i begge temaer.»
- [x] Commit: `feat(ui): temabryter, inline-tema-script og lilla topbar`

## Task 1.0-5 — Re-toning av komponentene (kun CSS)

Ingen nye tester (view-testene og style-testene er nettet). Følg §3.4 og
mockupen. Konkret:

- `.hero`: gradient + tekstfarger som i 1.0-2. `.gw-badge { background: var(--accent); color: var(--accent-ink); border: 0; }`.
- `.card h2` uendret struktur; `.card-ai`/`.ai-badge` → cyan.
- `table.data th { color: var(--dim-strong) }`, rad-hover `--surface-2`.
- `.status-i/s/u/n { background: var(--accent-2-soft); color: var(--accent-2-text) }`.
- `.fdr-1,.fdr-4,.fdr-5 { color: var(--fdr-ink-light) }`, `.fdr-2,.fdr-3 { color: var(--fdr-ink-dark) }`. Fjern den gamle «1–2 mørk tekst»-regelen.
- `.pitch` bakgrunn: `repeating-linear-gradient(180deg, var(--pitch-stripe-a) 0 3rem, var(--pitch-stripe-b) 3rem 6rem)` + radial midtsirkel med `--pitch-line`.
- `.chip { box-shadow: var(--shadow) }`, `.chip-captain { box-shadow: 0 0 0 2px var(--accent-2), var(--shadow) }`, `.cap { background: var(--accent-2); color: var(--accent-2-ink) }`, `.cap.vice { color: var(--accent-2-text); border-color: var(--accent-2) }`.
- `.row-me td { background: var(--accent-soft) }`, stripe `--accent`.
- `.match-live { border-color: var(--accent-2) }`, `.match-live .match-status { color: var(--accent-2-text) }`, `.pulse-on { background: var(--accent-2); box-shadow: 0 0 0 3px var(--accent-2-soft) }`.
- `.btn-accent` grønn fyll; `.empty-code { color: var(--accent-2-text) }`; `.empty-state a` → `.btn-accent`-utseende via ny klasse `.btn-link` (samme regler som `.btn-accent`, `display:inline-block; text-decoration:none`).
- `.filters input:focus, select:focus { outline-color: var(--focus) }`.
- Skriftstørrelser → `--fs-*` som beskrevet i 1.0-2.

- [x] `npm test` → **282/282**, `npm run lint` → 0, `node --test test/style.test.js`
      → «ingen hardkodede farger» OK. Observert: **282/282, lint 0, 4/4 i
      style.test.js**
- [ ] Visuell sjekk mot mockupen i begge temaer (lokal server, se 1.0-6).
- [x] Commit: `feat(ui): re-toner alle komponenter til tokenpaletten`

## Task 1.0-6 — Røyk, Playwright, docs — STOPP

- [x] **Røyk uten nøkler (0 AI-kall):** scratchpad-.env med
      `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME, `node --env-file=<sti> src/server.js`
      på ledig port. `/health` → `ai:false, discord:false` FØRST. Så alle 11
      ruter → 200, ukjent → 404. Observert: **port 3011, `ai:false,
      discord:false, leagues:0`; alle 11 ruter 200, /finnes-ikke 404**
- [x] **Playwright (Vedlegg A)** mot samme server: forventet **0 feil** av
      ≈ 259 sjekker. Observert: **OK 332/332, 0 feil** (332 er fasiten fra
      Vedlegg A; «≈ 259» var det gamle anslaget i §10.3)
- [x] Manuell: bytt tema → reload → valget står. Systemtema-bytte i auto
      (Windows: Innstillinger → Farger) → siden følger uten reload.
      Verifisert programmatisk med Playwright `emulateMedia`: auto dark →
      light uten reload (data-mode=auto), låst valg følger IKKE systemet,
      aria-label = «Tema: mørkt» etter to klikk. Reload-persistens dekkes
      av de 8 persistens-sjekkene i qa.mjs.
- [x] Docs: ROADMAP (huk av etappe 1-punktene), HANDOVER (status + logg),
      VIDERE (kort: «lyst/mørkt tema er klart, venter på klarsignal»).
      HANDOVER rotert til 174 linjer (v1.2.5-status + loggpost økt 29 →
      arkivet).
- [x] Commit `docs: v1.3.0 klar for release`. Rapporter til Marius og
      **STOPP.** Task 1.0-7 kun på klarsignal.

## Task 1.0-7 — Release v1.3.0 (KUN på klarsignal)

- [x] Tidsvindu sjekket (ukedag/klokke, kamper i gang: nei). Observert:
      **mandag 24. aug 03:09, 0 kamper i gang, neste avspark 28. aug 19:00 UTC**
- [x] `npm version minor --no-git-tag-version` → 1.3.0.
- [x] CHANGELOG `[Unreleased]` → `## [1.3.0] - <dato>`. ROADMAP: kø-punkt
      5 huk av etappe 1; versjonsplan-rad v1.3.0 strykes. VIDERE «Nytt
      siden sist». HANDOVER status.
- [x] Commit `chore(release): v1.3.0`, `git checkout main`,
      `git merge --no-ff feat/ui-v130-fundament`, `npm test` på main
      (282/282), inspiser CHANGELOG-plasseringen, tag `v1.3.0`.
- [x] Push `main` + tag. Coolify deployer. `/health` → 200, footer
      `v1.3.0`, `curl -sI "https://fpl.marsk.no/style.css?v=<ny hash>"`
      → immutable. Rutesveip **uten** `/brief` og `/nyheter`. Observert:
      **/health 200 `ai:true, discord:true, leagues:1`, footer v1.3.0, hash
      374071c1 → `public, max-age=31536000, immutable`, 9 ruter 200 + 404.
      Playwright mot prod (samme unntak): OK 100/100, topbar rgb(55,0,60)
      i begge temaer.**
- [x] Åpne prod i begge temaer (Marius). Slett lokal branch.

---

# ETAPPE 2 — v1.3.1 Klubbgrafikk (branch `feat/ui-v131-klubbgrafikk`)

Sluttresultat i prod: klubbmerker i alle tabeller/lister, drakter på
banen, kreditering i footer, `/health` teller bildene.

## Task 1.1-0 — Oppstart

- [x] `git checkout main`, rent tre, `npm test` → **282/282**, lint 0.
      Observert: **282/282, fail 0**, `npm run lint` uten utskrift (0).
      (`main` lå 1 docs-commit foran `origin/main` — loggføringen fra økt 31,
      ikke pushet.)
- [x] `git checkout -b feat/ui-v131-klubbgrafikk`

## Task 1.1-1 — `IMG_VERSION` i middleware (TDD)

**Filer:** `test/middleware.test.js`, `src/middleware.js`

Test (etter de tre `cacheControlFor`-testene; oppdater importen til
`{ cacheControlFor, createErrorHandler, FONT_VERSION, IMG_VERSION }`):

```js
test('cacheControlFor gir immutable for bildeversjonen (klubbgrafikk)', () => {
  assert.equal(IMG_VERSION, '2627');
  assert.equal(cacheControlFor(IMG_VERSION, 'ead67020'), IMMUTABLE);
  assert.equal(cacheControlFor('2526', 'ead67020'), 'no-cache');
});
```

- [x] Rødt: **283 tester, 1 feiler** (import gir `undefined`).
      Observert: **277 tester, 1 feilende fil** — ESM gir link-feil, ikke
      `undefined`: `SyntaxError: The requested module '../src/middleware.js'
      does not provide an export named 'IMG_VERSION'`. Hele fila (6 tester)
      kjører derfor ikke: 276 pass + 1 feilende fil. Samme alternative form
      som style.test.js i etappe 1, og som planen selv godtar i 1.1-2.

Implementasjon (`src/middleware.js`, under `FONT_VERSION`):

```js
// Klubbgrafikken (public/img/clubs/) har stabile filnavn per klubbkode, men
// draktene byttes hver sesong. Versjonen er sesongen: bumpes i samme commit
// som `npm run fetch-clubs` kjøres, ellers serveres fjorårets drakter som
// immutable fra Cloudflare.
export const IMG_VERSION = '2627';
```

og i `cacheControlFor`: `(v === assetVersion || v === FONT_VERSION || v === IMG_VERSION)`.

- [x] Grønt: **283/283**, lint 0. Observert: **283/283, fail 0**, lint uten
      utskrift.
- [x] Commit: `feat(assets): IMG_VERSION for klubbgrafikk i cache-reglene`

## Task 1.1-2 — `src/services/clubAssets.js` (TDD) + app.locals + /health

**Filer:** `test/clubAssets.test.js` (ny), `src/services/clubAssets.js` (ny),
`src/server.js`, `src/routes/health.js`

### 2a. Tester

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clubAssetsFrom, loadClubAssets } from '../src/services/clubAssets.js';
import { IMG_VERSION } from '../src/middleware.js';

// Serveren vet hvilke bilder som finnes — partialene spør her i stedet for
// å skrive <img> i blinde. Ren funksjon av en filliste: ingen disk i testene.

test('clubAssetsFrom kjenner igjen merke, drakt og keeperdrakt per klubbkode', () => {
  const a = clubAssetsFrom(['t3.png', 'shirt_3.png', 'shirt_3_1.png', 'shirt_14.png', 'README.txt']);
  assert.equal(a.hasBadge(3), true);
  assert.equal(a.hasShirt(3), true);
  assert.equal(a.hasKeeper(3), true);
  assert.equal(a.hasBadge(14), false);
  assert.equal(a.hasShirt(14), true);
  assert.equal(a.hasKeeper(14), false);
  assert.deepEqual(a.count, { badges: 1, shirts: 2, keepers: 1 });
});

test('clubAssetsFrom svarer nei for ukjent kode, streng-kode uten fil og søppel', () => {
  const a = clubAssetsFrom(['t3.png']);
  assert.equal(a.hasBadge(99), false);
  assert.equal(a.hasBadge('3'), true, 'kode som streng (fra data-attributt) skal treffe');
  assert.equal(a.hasBadge(undefined), false);
  assert.equal(a.hasBadge(null), false);
  assert.equal(a.hasShirt('t3.png'), false);
});

test('clubAssetsFrom eksponerer IMG_VERSION som version', () => {
  assert.equal(clubAssetsFrom([]).version, IMG_VERSION);
});

test('loadClubAssets tåler at mappa mangler — alt faller tilbake på tekst', () => {
  const a = loadClubAssets('/finnes/ikke/' + Date.now());
  assert.equal(a.hasBadge(3), false);
  assert.deepEqual(a.count, { badges: 0, shirts: 0, keepers: 0 });
});
```

- [x] Rødt: **287 tester, 4 feiler** (modul finnes ikke → importfeil = 1
      feilende fil; godta). Observert: **284 tester, 1 feilende fil**
      (`ERR_MODULE_NOT_FOUND: Cannot find module …/src/services/clubAssets.js`)
      — den godtatte formen.

### 2b. Implementasjon

`src/services/clubAssets.js`:

```js
import fs from 'node:fs';
import { IMG_VERSION } from '../middleware.js';

// Hvilke klubbbilder finnes i public/img/clubs/? Leses ÉN gang ved oppstart
// og legges på app.locals — partialene spør hasBadge/hasShirt/hasKeeper og
// skriver aldri <img> for en fil som ikke finnes (nyopprykket lag, glemt
// skriptkjøring). Filnavnene speiler FPL: t{code}.png, shirt_{code}.png,
// shirt_{code}_1.png (keeper).
const BADGE_RE = /^t(\d+)\.png$/;
const SHIRT_RE = /^shirt_(\d+)\.png$/;
const KEEPER_RE = /^shirt_(\d+)_1\.png$/;

/** Ren funksjon av en filliste — testes uten disk. */
export function clubAssetsFrom(fileNames, version = IMG_VERSION) {
  const codes = (re) =>
    new Set(fileNames.map((f) => re.exec(f)?.[1]).filter(Boolean).map(Number));
  const badges = codes(BADGE_RE);
  const shirts = codes(SHIRT_RE);
  const keepers = codes(KEEPER_RE);
  const has = (set) => (code) => code != null && code !== '' && set.has(Number(code));
  return {
    version,
    hasBadge: has(badges),
    hasShirt: has(shirts),
    hasKeeper: has(keepers),
    count: { badges: badges.size, shirts: shirts.size, keepers: keepers.size },
  };
}

/** Leser mappa; mangler den, startes appen likevel (alt blir tekst). */
export function loadClubAssets(dir) {
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    // Mappa finnes ikke — skriptet er ikke kjørt. Ikke en feil.
  }
  return clubAssetsFrom(files);
}
```

`src/server.js` (etter `app.set('views', …)`):

```js
// Klubbgrafikk: mappa leses én gang; app.locals når alle views og partials
// via res.render uten at rutene må sende det.
app.locals.clubAssets = loadClubAssets(path.join(rootDir, 'public', 'img', 'clubs'));
```

+ `import { loadClubAssets } from './services/clubAssets.js';`

`src/routes/health.js`: i `features`, etter `leagues,`:
`clubImages: req.app.locals.clubAssets?.count ?? null,` — og handleren
må ta `(req, res)` i stedet for `(_req, res)`.

- [x] Grønt: **287/287**, lint 0. Observert: **287/287, fail 0**, lint uten
      utskrift.
- [x] Commit: `feat(assets): clubAssets-service, app.locals og /health-telling`

## Task 1.1-3 — Nedlastingsskript + bildene

**Filer:** `scripts/fetch-club-assets.mjs` (ny), `package.json`,
`eslint.config.js`, `public/img/clubs/*` (60 filer), `DEPLOY.md`

`scripts/fetch-club-assets.mjs`:

```js
// Laster ned klubbgrafikk for alle lag i bootstrap-static til
// public/img/clubs/: merke 70 px (t{code}.png), drakt 110 px
// (shirt_{code}.png) og keeperdrakt 110 px (shirt_{code}_1.png).
// Kjøres for hånd én gang per sesong: `npm run fetch-clubs`. Ingen
// avhengigheter (Node ≥ 22 har fetch). Ny sesong = nye drakter på samme
// URL-er → bump IMG_VERSION i src/middleware.js i samme commit.
// Dette er det eneste nettverkskallet utenfor fplClient.js — det er et
// CLI-verktøy, ikke app-kode (CLAUDE.md-unntaket).
import fs from 'node:fs/promises';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const OUT = path.resolve('public/img/clubs');
const BOOTSTRAP = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const sources = (code) => [
  [`t${code}.png`, `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`],
  [`shirt_${code}.png`, `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${code}-110.png`],
  [`shirt_${code}_1.png`, `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${code}_1-110.png`],
];

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const { teams } = await (await fetch(BOOTSTRAP, { headers: { 'User-Agent': UA } })).json();
await fs.mkdir(OUT, { recursive: true });
let ok = 0;
const failed = [];
for (const team of teams) {
  for (const [file, url] of sources(team.code)) {
    try {
      await fs.writeFile(path.join(OUT, file), await get(url));
      ok += 1;
    } catch (err) {
      failed.push(`${team.short_name} ${file}: ${err.message}`);
    }
  }
}
console.log(`Lagret ${ok} av ${teams.length * 3} filer i ${OUT}`);
if (failed.length) {
  console.error(`Feilet:\n  ${failed.join('\n  ')}`);
  process.exit(1);
}
```

`package.json` scripts: `"fetch-clubs": "node scripts/fetch-club-assets.mjs"`.
`eslint.config.js`: første `files`-liste får `'scripts/**/*.mjs'`.

- [x] `npm run fetch-clubs` → «Lagret 60 av 60 filer». `ls public/img/clubs | wc -l`
      → 60. Sum ≈ 560 KB (`du -sh`). Observert: **«Lagret 60 av 60 filer»**,
      60 filer, **561 KB** (`du -sh --apparent-size`; `du -sh` = 692 K disk).
- [x] `npm run lint` → 0 (skriptet lintes nå). `npm test` → 287/287.
      Observert: lint uten utskrift, **287/287**.
- [x] Start serveren lokalt (tomme nøkler) → `/health` viser
      `clubImages: {badges: 20, shirts: 20, keepers: 20}`. Observert:
      `{"status":"ok","features":{"ai":false,"aiModel":null,"discord":false,`
      `"teamId":true,"leagues":0,"clubImages":{"badges":20,"shirts":20,`
      `"keepers":20}}}` (port 3011, scratchpad-.env med tomme nøkler).
- [x] `DEPLOY.md`: ny seksjon «Klubbgrafikk (ny sesong)»: kjør
      `npm run fetch-clubs`, bump `IMG_VERSION` i `src/middleware.js`,
      commit begge sammen; URL-ene i tabellen får raden
      `/img/clubs/*.png?v=<IMG_VERSION>` → immutable.
- [x] Commit: `feat(assets): nedlastingsskript og klubbgrafikk for 2026/27 (60 filer)`

## Task 1.1-4 — `teamCode` i brief/live/transfers-payloadene + liga-route (TDD)

**Filer:** `test/brief.test.js`, `test/live.test.js`, `test/transfers.test.js`,
`src/services/brief.js`, `src/services/live.js`, `src/services/transfers.js`,
`src/routes/league.js`

### 4a. Tester (rødfasen — alle tre filer samtidig)

`test/brief.test.js` — gi lagene i `kapteinBootstrap` `code` (`{ id: 1, short_name: 'ARS', name: 'Arsenal', code: 3 }`, CHE `code: 8`) og legg til:

```js
test('buildBrief legger teamCode på skader, kapteiner og kamper (klubbgrafikk)', () => {
  const elements = [
    spiller(1, 1, { form: '6.0', status: 'd', news: 'Knock', selected_by_percent: '20.0' }),
    spiller(2, 2, { form: '5.0' }),
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });
  assert.equal(brief.injuries[0].teamCode, 3);
  assert.equal(brief.captains[0].teamCode, 3);
  const m = brief.fixturesByDay[0].matches[0];
  assert.equal(m.homeCode, 3);
  assert.equal(m.awayCode, 8);
});
```

(`spiller`-hjelperen og `kapteinFixtures` finnes fra v1.2.5; sjekk at
fixturen faktisk gir en flagget spiller ≥ 5 % — juster `status/news` om
`flaggedPlayers` krever noe annet, og noter det.)

`test/live.test.js` — `bootstrap.teams` (linje 7–8) får `code: 3` (ARS) og
`code: 8` (CHE). Oppdater linje 183–185 til
`{ home: 'ARS', away: 'CHE', homeCode: 3, awayCode: 8, homeScore: 2, … }`
og nøkkellista (~341) får `'teamCode'` (sortert: etter `'team'`). Ny test:

```js
test('buildLive legger teamCode på mine spillere og homeCode/awayCode på kamper', () => {
  const result = buildLive({
    bootstrap,
    gw: 1,
    fixtures: [{ event: 1, team_h: 1, team_a: 2, started: true, finished: false, minutes: 10, stats: [] }],
    live: liveStats([[10, { total_points: 3, minutes: 10, bonus: 0 }]]),
    picks: { picks: [{ element: 10, position: 1, multiplier: 1 }] },
  });
  assert.equal(result.myPlayers[0].teamCode, 3);
  assert.equal(result.matches[0].homeCode, 3);
  assert.equal(result.matches[0].awayCode, 8);
});
```

`test/transfers.test.js` — bootstrap-hjelperen får `teams: [{ id: 1, short_name: 'MCI', code: 43 }, …]`
matchende de `team`-ene elementene bruker (les fila; elementene har
sannsynligvis `team` satt — hvis ikke, sett `team: 1` på dem). Ny test:

```js
test('buildTransferAnalysis legger teamShort og teamCode på inn og ut', () => {
  const a = buildTransferAnalysis(/* samme oppsett som «to bytter»-testen */);
  assert.equal(a.rows[0].inn.teamShort, 'MCI');
  assert.equal(a.rows[0].inn.teamCode, 43);
  assert.equal(typeof a.rows[0].ut.teamCode, 'number');
});
```

- [x] Rødt: **290 tester, forventet 5 feiler** (3 nye + live.test 183 +
      live.test nøkkelliste). Observert: **290 tester, 5 feiler** — nøyaktig
      de forventede (brief-, live- og transfers-testen, «matches speiler
      stilling og status fra fixtures», «payloaden har ingen døde felter»).
      Fixture-notat: `spiller(1, 1, { status: 'd', news: 'Knock' })` treffer
      `flaggedPlayers` uendret, og 20 % eierskap holder både ≥ 5 %-kravet i
      `injuries` og ≥ 15 %-kravet i `globalCaptains` — ingen justering
      trengtes. `test/transfers.test.js` manglet `teams` helt: la til tre lag
      (MCI 43, AVL 7, LIV 14) og `team` på alle fem elementene.

### 4b. Implementasjon

`brief.js`: i `injuries`-mappingen etter `team:` → `teamCode: teamsById.get(p.team)?.code ?? null,`;
samme i `captains`. I `groupFixturesByDay` (linje ~26, der `home/away`
settes): `homeCode: teamsById.get(f.team_h)?.code ?? null, awayCode: teamsById.get(f.team_a)?.code ?? null` —
funksjonen må få `teamsById` hvis den ikke har det (les signaturen).

`live.js`: `myPlayers` får `teamCode: player.team_code ?? teamsById.get(player.team)?.code ?? null,`
(bootstrap har `team_code` på elements — F10); `matches` får
`homeCode: teamsById.get(f.team_h)?.code ?? null, awayCode: teamsById.get(f.team_a)?.code ?? null`.

`transfers.js`: erstatt `name`-hjelperen:

```js
  const teamsById = byId(bootstrap.teams ?? []);
  // Navn + lag for Inn/Ut-cellene. Klubbkoden er det partialen trenger for
  // merket; kortnavnet er teksten ved siden av.
  const ref = (id) => {
    const p = elementsById.get(id);
    const t = p ? teamsById.get(p.team) : null;
    return {
      id,
      name: p?.web_name ?? `Ukjent (${id})`,
      teamShort: t?.short_name ?? null,
      teamCode: t?.code ?? null,
    };
  };
```

og `inn: { ...ref(tr.element_in), points: innPoints }`, `ut: { ...ref(tr.element_out), points: utPoints }`.
Eksisterende asserts på `.inn.name`/`.ut.name` består.

`src/routes/league.js`: `teamsById: byId(bootstrap.teams),` i locals
(importer `byId` fra analysis.js hvis ikke alt importert).

- [x] Grønt: **290/290**, lint 0. Observert: **290/290, fail 0**, lint uten
      utskrift.
- [x] Commit: `feat(data): klubbkode i brief-, live- og transfers-payloadene`

## Task 1.1-5 — Partials + integrasjon i viewene + live-JS + footer (TDD)

**Filer:** `test/fixtures/views.js`, `test/views.test.js`,
`test/app-client.test.js`, `views/partials/club-badge.ejs` (ny),
`views/partials/club-shirt.ejs` (ny), alle views unntatt no-team/error/404,
`views/layout.ejs`, `public/app.js`

### 5a. Fixtures (test/fixtures/views.js)

```js
import { clubAssetsFrom } from '../../src/services/clubAssets.js';

const teamsById = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
  [2, { id: 2, name: 'Liverpool', short_name: 'LIV', code: 14 }],
]);
// Arsenal har alle tre bildene, Liverpool ingen — begge grener i partialene rendres.
const clubAssets = clubAssetsFrom(['t3.png', 'shirt_3.png', 'shirt_3_1.png']);
```

`shared` får `clubAssets`. `team` og `players` og alle `league*` får
`teamsById` + `clubAssets` (league-fixturene manglet `teamsById`).
`briefData.injuries[0]` → `teamCode: 3`; `captains[0]` → `teamCode: 14`;
`fixturesByDay[0].matches[0]` → `homeCode: 3, awayCode: 14`; `brief`/`briefEmpty`
får `clubAssets`. `live.live.myPlayers[0].teamCode = 3`,
`matches[0]` → `homeCode: 3, awayCode: 14`; `live`/`liveEmpty` får `clubAssets`.
`transfers.analysis.rows[0].inn` → `teamShort: 'MCI', teamCode: 43`, `ut` →
`teamShort: 'AVL', teamCode: 7`; rad 2 tilsvarende; `transfers*` får `clubAssets`.

### 5b. Tester (views.test.js, nederst)

```js
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
  assert.ok(!/\/img\/clubs\/[^"]+"(?![^>]*\?v=)/.test(html), 'uversjonert bilde-URL');
});

test('layout.ejs krediterer klubbmerker og drakter i footeren', async () => {
  const html = await renderView('layout', layoutLocals('/'));
  assert.ok(html.includes('Klubbmerker og drakter tilhører respektive klubber og Premier League.'));
});
```

`test/app-client.test.js`:

```js
test('clubBadgeHtml escaper kortnavnet og skriver versjonert bilde eller plassholder', () => {
  const withImg = app.clubBadgeHtml('ARS', 3, '2627', 'md');
  assert.ok(withImg.includes('<span class="club club--md">'));
  assert.ok(withImg.includes('src="/img/clubs/t3.png?v=2627"'));
  assert.ok(withImg.includes('<span class="club-name">ARS</span>'));
  const noImg = app.clubBadgeHtml('<b>', null, '2627');
  assert.ok(noImg.includes('club-fallback'));
  assert.ok(noImg.includes('&lt;b&gt;'));
  assert.ok(!noImg.includes('<img'));
});
```

- [x] Rødt: **296 tester, 6 feiler** (partialene finnes ikke → 3;
      dashboard uten merker → 1; footer → 1; `clubBadgeHtml` → 1).
      Observert: **296 tester, 6 feiler** — nøyaktig de forventede.

### 5c. Implementasjon

**`views/partials/club-badge.ejs`** (ny — hold alt på ÉN linje fra
`<span class="club` til `</span>` så ingen whitespace havner i
`textContent` for sorteringen):

```ejs
<%#
  Klubbmerke + kortnavn. Locals: team ({ code, short_name, name }),
  size ('sm' 18 px | 'md' 28 px | 'lg' 40 px, default 'sm'), showName (default true).
  <img> skrives KUN når clubAssets sier fila finnes — ellers en nøytral
  plassholder. Aldri et brutt bilde, heller ikke uten JS. Bildet er
  dekorativt (alt=""): navnet står som tekst ved siden av, eller som
  skjermlesertekst når showName er false.
%>
<%
  const _size = typeof size === 'string' ? size : 'sm';
  const _showName = typeof showName === 'boolean' ? showName : true;
  const _assets = typeof clubAssets !== 'undefined' ? clubAssets : null;
  const _code = team ? team.code : undefined;
  const _has = Boolean(_assets && _assets.hasBadge(_code));
  const _short = (team && team.short_name) || '?';
  const _full = (team && team.name) || _short;
%>
<span class="club club--<%= _size %>"><% if (_has) { %><img class="club-img" src="/img/clubs/t<%= _code %>.png?v=<%= _assets.version %>" width="70" height="70" alt="" loading="lazy" decoding="async"><% } else { %><span class="club-fallback" aria-hidden="true"></span><% } %><% if (_showName) { %><span class="club-name"><%= _short %></span><% } else { %><span class="sr-only"><%= _full %></span><% } %></span>
```

**`views/partials/club-shirt.ejs`** (ny):

```ejs
<%#
  Drakt til spillerkortene på banen (/lag). Locals: team, keeper (bool).
  Finnes ikke drakta: merket; finnes ikke det heller: plassholder.
  Dekorativ (alt=""): navn og lag står i kortet.
%>
<%
  const _assets = typeof clubAssets !== 'undefined' ? clubAssets : null;
  const _code = team ? team.code : undefined;
  const _keeper = typeof keeper === 'boolean' ? keeper : false;
  let _file = null;
  let _kind = 'shirt';
  if (_assets && _keeper && _assets.hasKeeper(_code)) _file = `shirt_${_code}_1.png`;
  else if (_assets && _assets.hasShirt(_code)) _file = `shirt_${_code}.png`;
  else if (_assets && _assets.hasBadge(_code)) { _file = `t${_code}.png`; _kind = 'badge'; }
%>
<span class="shirt shirt--<%= _kind %>"><% if (_file) { %><img class="shirt-img" src="/img/clubs/<%= _file %>?v=<%= _assets.version %>" width="<%= _kind === 'badge' ? 70 : 110 %>" height="<%= _kind === 'badge' ? 70 : 145 %>" alt="" loading="lazy" decoding="async"><% } else { %><span class="club-fallback club-fallback--shirt" aria-hidden="true"></span><% } %></span>
```

**Views — eksakte erstatninger:**

| Fil:linje | Fra | Til |
|---|---|---|
| dashboard.ejs:38, 68 | `<td><%= teamsById.get(p.team)?.short_name ?? '?' %></td>` | `<td><%- include('partials/club-badge', { team: teamsById.get(p.team) }) %></td>` |
| dashboard.ejs:93, 117 | `<span class="dim"><%= teamsById.get(p.team)?.short_name ?? '' %></span>` | `<%- include('partials/club-badge', { team: teamsById.get(p.team) }) %>` |
| dashboard.ejs:150 | `<td><strong><%= row.team.short_name %></strong> <span class="dim team-name-full"><%= row.team.name %></span></td>` | `<td class="fdr-team"><%- include('partials/club-badge', { team: row.team, size: 'md' }) %> <span class="dim team-name-full"><%= row.team.name %></span></td>` |
| players.ejs:64 | `<td><%= teamsById.get(p.team)?.short_name ?? '?' %></td>` | `<td><%- include('partials/club-badge', { team: teamsById.get(p.team) }) %></td>` |
| team.ejs:29–32 (startere) | `<div class="chip…">` + name + meta | legg `<%- include('partials/club-shirt', { team: teamsById.get(s.player.team), keeper: s.player.element_type === 1 }) %>` som første barn i `.chip` |
| team.ejs:40–43 (benk) | samme | samme include (keeper etter element_type) |
| team.ejs:83 | `<span class="dim"><%= teamsById.get(c.player.team)?.short_name %></span>` | `<%- include('partials/club-badge', { team: teamsById.get(c.player.team) }) %>` |
| team.ejs:103 | `<%= teamsById.get(k.player.team)?.short_name %>` | `<%- include('partials/club-badge', { team: teamsById.get(k.player.team) }) %>` |
| league.ejs:63, 74 | `<td><strong><%= p.web_name %></strong></td>` | `<td><strong><%= p.web_name %></strong> <%- include('partials/club-badge', { team: teamsById.get(p.team) }) %></td>` |
| brief.ejs:38 | `<span class="dim"><%= i.team %> · eid <%= i.ownership %> %</span>` | `<%- include('partials/club-badge', { team: { short_name: i.team, code: i.teamCode } }) %> <span class="dim">eid <%= i.ownership %> %</span>` |
| brief.ejs:45 | `<span class="dim"><%= c.team %> · form …` | `<%- include('partials/club-badge', { team: { short_name: c.team, code: c.teamCode } }) %> <span class="dim">form …` (resten uendret) |
| brief.ejs:58 | `<%= m.home %> – <%= m.away %>` | `<%- include('partials/club-badge', { team: { short_name: m.home, code: m.homeCode } }) %> – <%- include('partials/club-badge', { team: { short_name: m.away, code: m.awayCode } }) %>` |
| transfers.ejs:41 | `<td><%= r.inn.name %>` | `<td><%- include('partials/club-badge', { team: { short_name: r.inn.teamShort, code: r.inn.teamCode, name: r.inn.teamShort }, showName: false }) %> <%= r.inn.name %>` |
| transfers.ejs:42 | `<td><%= r.ut.name %>` | tilsvarende med `r.ut` |
| live.ejs:10 | `<div id="live-root">` | `<div id="live-root" data-img-version="<%= typeof clubAssets !== 'undefined' ? clubAssets.version : '' %>">` |
| layout.ejs:42 | `<p>Uoffisielt verktøy. Data fra Fantasy Premier League.</p>` | `<p>Uoffisielt verktøy. Data fra Fantasy Premier League. Klubbmerker og drakter tilhører respektive klubber og Premier League.</p>` |

**`public/app.js`** — filnivå, etter `nextMode`:

```js
// Klubbmerke i klientrendret markup (/live). Speiler partials/club-badge.ejs.
// Klienten vet ikke hvilke bilder som finnes — feiler et bilde, bytter
// error-lytteren i Modul 3 det til plassholderen.
function clubBadgeHtml(shortName, code, version, size) {
  const name = '<span class="club-name">' + escapeHtml(shortName == null ? '?' : shortName) + '</span>';
  const img =
    Number.isInteger(code) && version
      ? '<img class="club-img" src="/img/clubs/t' + code + '.png?v=' + escapeHtml(version) +
        '" width="70" height="70" alt="" loading="lazy" decoding="async">'
      : '<span class="club-fallback" aria-hidden="true"></span>';
  return '<span class="club club--' + (size || 'sm') + '">' + img + name + '</span>';
}
```

Modul 3: etter `const pulseEl = …`:

```js
  const imgVersion = root.dataset.imgVersion || '';
  // error bobler ikke — fanges i capture-fasen på rota.
  root.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (!img || !img.classList || !img.classList.contains('club-img')) return;
      const ph = document.createElement('span');
      ph.className = 'club-fallback';
      ph.setAttribute('aria-hidden', 'true');
      img.replaceWith(ph);
    },
    true,
  );
```

I `render`: spillerraden `' <span class="dim">' + escapeHtml(p.team) + '</span>'` →
`' ' + clubBadgeHtml(p.team, p.teamCode, imgVersion)`; match-kortet
`'<span class="match-team">' + escapeHtml(m.home) + '</span>'` →
`'<span class="match-team">' + clubBadgeHtml(m.home, m.homeCode, imgVersion, 'md') + '</span>'`,
tilsvarende for `m.away`.

**`public/style.css`** — nye komponenter (legg etter «Status-merker»):

```css
/* ---------- Klubbgrafikk ---------- */

.club {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  vertical-align: middle;
  white-space: nowrap;
}

.club-img,
.club-fallback {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  object-fit: contain;
}

.club--md .club-img,
.club--md .club-fallback { width: 28px; height: 28px; }
.club--lg .club-img,
.club--lg .club-fallback { width: 40px; height: 40px; }

.club-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--fs-sm);
  letter-spacing: 0.02em;
}

/* Plassholder når bildet mangler: nøytral dott, aldri et brutt bilde. */
.club-fallback {
  display: inline-block;
  border-radius: 50%;
  background: var(--club-fallback);
  border: 1px solid var(--border-strong);
}

.shirt {
  display: block;
  margin: 0 auto 0.25rem;
  width: 44px;
  height: 58px;
}

.shirt-img { width: 100%; height: 100%; object-fit: contain; display: block; }
.shirt--badge { width: 40px; height: 40px; }
.club-fallback--shirt { display: block; width: 40px; height: 40px; margin: 0 auto; }
.chip-bench .shirt { width: 34px; height: 45px; }

.match-team .club { gap: 0.5rem; }
.match-team:last-of-type .club { flex-direction: row-reverse; }
```

≤ 480 px: `.shirt { width: 40px; height: 53px; }`.

- [x] Grønt: **296/296**, lint 0. Observert: **296/296, fail 0**, lint uten
      utskrift. Ett avvik i planens testkode rettet: assertionen
      «uversjonert bilde-URL» i dashboard-testen brukte
      `/\/img\/clubs\/[^"]+"(?![^>]*\?v=)/`, som slukte `?v=2627` inn i
      `[^"]+` og deretter lette etter en ny `?v=` i resten av taggen — den
      flagget altså korrekt versjonerte URL-er. Erstattet med
      `/\/img\/clubs\/[^"?]+"/` (en klubb-URL som lukkes uten spørrestreng),
      som er det meldingen sier. Markupen står som i planen.
- [x] Røyk lokalt (tomme nøkler): åpne `/`, `/spillere`, `/lag`, `/liga`,
      `/brief`, `/overganger`, `/live` — merker og drakter synlige, ingen
      brutte bilder i DevTools (Network: alle `/img/clubs/*` 200). Sortér
      «Lag»-kolonnen på /spillere begge veier → alfabetisk. Observert:
      alle åtte ruter 200, `/health` `ai:false, discord:false`. Unike
      klubb-URL-er per side: `/` 20, `/spillere` 20, `/lag` 19, `/brief` 20,
      `/liga` 0, `/overganger` 0, `/live` 0 — de tre siste fordi datagrunnlaget
      er tomt akkurat nå: ligaen har kun ett medlem (ingen rival → ingen
      differensialtabell, som er der merkene sitter), ingen transfers er
      gjort ennå («Ingen overganger registrert ennå»), og /live rendres av
      klienten (`data-img-version="2627"` er på plass). Alle klubb-URL-er er
      versjonert; `/img/clubs/t3.png?v=2627` → 200 +
      `Cache-Control: public, max-age=31536000, immutable`. Sorteringen leser
      `cells[i].textContent.trim()`, og cellene inneholder nå kun kortnavnet
      («BHA») — verifisert i Playwright-kjøringen i 1.1-6.
- [x] CHANGELOG `[Unreleased]` `### Added`: «Klubbmerker i alle tabeller og
      lister, og klubbdrakter på banen på lagsiden — som på FPL. Bildene er
      selvhostet; mangler et bilde, vises kortnavnet i stedet. Footeren
      krediterer klubbene og Premier League.»
- [x] Commit: `feat(ui): klubbmerker og drakter i alle views via partials`

## Task 1.1-6 — Røyk, Playwright, docs — STOPP

- [x] Røyk uten nøkler: `/health` `ai:false, discord:false, clubImages 20/20/20`;
      11 ruter 200; 404. Observert: `/health` →
      `ai:false, discord:false, teamId:true, leagues:0,`
      `clubImages {badges:20, shirts:20, keepers:20}`; åtte HTML-ruter 200
      (/, /spillere, /lag, /liga, /brief, /overganger, /live, /nyheter),
      ukjent sti → 404, `/img/clubs/t3.png?v=2627` → 200 +
      `public, max-age=31536000, immutable`.
- [x] Playwright (Vedlegg A): 0 feil, «brutte bilder = 0» på alle sider.
      Observert: **OK 332/332**. I tillegg et eget klubbskript
      (scratchpad, `qa-clubs.mjs`): **OK 22/22** — alle klubbbilder lastet
      med `loading` tvunget til `eager` (60 på /, 609 på /spillere, 48 på
      /lag, 25 på /brief), 0 brutte, 0 uversjonerte, 0 med bredde 0,
      15 drakter + 4 keeperdrakter på /lag, og Lag-kolonnen sorterer
      alfabetisk begge veier (første klikk er synkende — `sortBy`-adferd
      fra før) med ren kortnavnstekst i cellene.
- [x] ROADMAP/HANDOVER/VIDERE/CLAUDE.md (arkitekturkart: `views/partials/`,
      `clubAssets.js`, `scripts/`) oppdatert. Commit `docs: v1.3.1 klar`.
      Rapporter, **STOPP.** Loggpostene fra økt 30–31 rotert til
      `docs/arkiv/HANDOVER-historikk.md` (HANDOVER: 168 linjer).

## Task 1.1-7 — Release v1.3.1 (KUN på klarsignal)

Som 1.0-7 med `npm version patch` → 1.3.1, tag `v1.3.1`. Etter deploy:
`/health` → `clubImages: {badges:20, shirts:20, keepers:20}`,
`curl -sI "https://fpl.marsk.no/img/clubs/t3.png?v=2627"` → 200 +
`immutable`. Rutesveip uten `/brief` og `/nyheter`.

- [x] Tidsvindu sjekket. Observert: **mandag 24. aug 03:44, 0 kamper i gang
      (GW1 og GW2: ingen `started && !finished_provisional`), neste avspark
      24. aug 19:00 UTC.**
- [x] `npm version patch --no-git-tag-version` → 1.3.1; CHANGELOG
      `[1.3.1] - 2026-08-24`; ROADMAP, VIDERE og HANDOVER oppdatert;
      commit `chore(release): v1.3.1`.
- [x] Merget til `main` (`--no-ff`), **296/296 + lint 0 på main**,
      CHANGELOG-plasseringen inspisert ([1.3.1] over [1.3.0], under
      [Unreleased]), tag `v1.3.1`, pushet `main` + tag (`3b3b50e..8ec5410`).
- [x] Coolify deployet. Observert: **footer `v1.3.1`; `/health` → 200
      `ai:true, discord:true, leagues:1,`
      `clubImages {badges:20, shirts:20, keepers:20}`;
      `/img/clubs/t3.png?v=2627` → 200 + `public, max-age=31536000,
      immutable`; `style.css?v=116be2a2` → immutable; 9 ruter 200 + 404
      (uten `/brief` og `/nyheter`); klubb-URL-er i prod: / 20, /spillere 20,
      /lag 19 — 0 uversjonerte. Playwright mot prod: OK 240/240 (topbar
      rgb(55, 0, 60) i begge temaer) + klubbskript OK 14/14 (0 brutte
      bilder av 60/609/48, 15 drakter + 4 keeperdrakter). 0 AI-kall.**

---

# ETAPPE 3 — v1.3.2 Finpuss (branch `feat/ui-v132-finpuss`)

Sluttresultat i prod: det ferdige uttrykket fra mockupen — hero, sidehoder,
tomtilstander, feilsider, mobilfinpuss. Ingen nye datafelt.

## Task 1.2-0 — Oppstart

- [x] `main` rent, `npm test` → **296/296**, lint 0. Observert: **296/296,
      fail 0**, lint uten utskrift. (`main` lå 1 docs-commit foran
      `origin/main` — post-release-loggføringen fra v1.3.1, ikke pushet.)
- [x] `git checkout -b feat/ui-v132-finpuss`

## Task 1.2-1 — Kontraktstester for markup app.js avhenger av (TDD)

**Filer:** `test/views.test.js`, deretter viewene

```js
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
    const html = await renderView(name, {});
    assert.ok(html.includes('class="empty-state"'), `${name}: mangler empty-state`);
    assert.match(html, /href="\/"[^>]*class="btn-link"/, `${name}: mangler knappelenke til /`);
  }
});

test('players.ejs: alle kolonneoverskrifter beholder data-type og aria-sort (sorteringskontrakten)', async () => {
  const html = await renderView('players', fx.players);
  const ths = html.match(/<th [^>]*>/g) ?? [];
  assert.equal(ths.length, 11, 'antall kolonner endret — app.js Modul 2 sorterer på indeks');
  for (const th of ths) {
    assert.match(th, /data-type="(text|num)"/, th);
    assert.match(th, /aria-sort="(none|ascending|descending)"/, th);
  }
  assert.equal((html.match(/aria-sort="descending"/g) ?? []).length, 1, 'nøyaktig én startsortering');
});
```

- [x] Rødt: **299 tester, 1 feiler** (feilsidene mangler `btn-link`;
      hero- og players-testene er vern og grønne fra start — bekreft).
      Observert: **299 tester, 1 feiler** — kun feilside-testen. Hero- og
      players-vernet grønt fra start, som forventet.

Implementasjon: `no-team.ejs` får `<p><a href="/" class="btn-link">Til dashbordet</a></p>`
nederst; `error.ejs` og `404.ejs`: lenken i teksten beholdes, og
`<p><a href="/" class="btn-link">Til dashbordet</a></p>` legges til
etter avsnittet.

- [x] Grønt: **299/299**, lint 0. Observert: **299/299, fail 0**, lint uten
      utskrift. (`views/no-team.ejs` er LF, de to andre CRLF — patchen tar
      hensyn til begge.)
- [x] Commit: `feat(ui): knappelenke tilbake på feilsidene + kontraktstester`

## Task 1.2-2 — Finpuss per side (markup + CSS, mockupen er fasit)

- **Hero (dashboard.ejs + CSS):** `.eyebrow` → `--hero-dim`, `.gw-badge`
  grønn pille; hairline grønn→cyan; `--fs-hero`. På ≤ 480: `padding: var(--space-5) var(--space-3)`.
- **Kort-h2 med tall:** dashboard-kortene får `<span class="dim"><%= flagged.length %></span>`
  til høyre i h2 (samme mønster som brief-h2 med «generert»).
- **/lag:** «Oppstilling»-h2 får `<% if (squadView.activeChip) { %><span class="status">Chip: …</span><% } %>`
  til høyre. `.pitch` padding `var(--space-5) var(--space-2) var(--space-6)` uendret.
- **/brief:** kamp-lista: `<li>` → `<li class="fixture-row"><span class="num fixture-time"><%= m.kickoff %></span> …merker…</li>`;
  CSS `.fixture-row { display:flex; gap: var(--space-2); align-items:center; padding: .25rem 0; border-bottom: 1px solid var(--border) } .fixture-time { font-family: var(--font-mono); font-size: var(--fs-sm); min-width: 3.2rem }`.
  Fjern inline-stilen `style="padding-left: 0; list-style: none;"` → klasse `.fixture-list`.
- **/nyheter ≤ 480:** `.news-list li { padding: var(--space-3) 0 }` (allerede) — sett `.news-list a { display:block; padding: .15rem 0 }` for trykkflate.
- **/liga:** `.row-me td:first-child { box-shadow: inset 3px 0 0 var(--accent) }` (allerede) — piler `▲/▼` bruker `--accent-text`/`--negative` (fra 1.0-5).
- **/overganger:** «Beste/Verste»-piller → `.status` med `--accent-soft`/`--accent-2-soft` via klassene `.status-best`/`.status-worst` (ny CSS, tokens).
- **Feilsider:** `.btn-link` som `.btn-accent` (fra 1.0-5).
- **Footer:** kreditering på egen linje (`<p class="credit">`), `--fs-sm`.
- Ingen nye farger utenfor tokens (style-testen vokter).

- [x] `npm test` → **299/299**, lint 0 (view-markørene i §6 er urørt).
      Observert: **299/299, fail 0**, lint uten utskrift.
      Merknader: hero-punktet var allerede oppfylt i etappe 1 (`.eyebrow`
      → `--hero-dim`, grønn `.gw-badge`, hairline grønn→cyan, `--fs-hero`,
      480-padding) — ingen endring nødvendig. Piller: `.status-best` =
      `--accent-soft` + `--accent-text`, `.status-worst` = `--accent-2-soft`
      + `--negative`. Forgrunnsfargene var ikke spesifisert i planen;
      kontrasten er målt der pillene faktisk står (kortflaten `--surface`,
      ingen tabellrad bruker `--surface-2`): beste 10,42 mørkt / 5,66 lyst,
      verste 5,39 / 5,27 — alle over 4,5. Parene kunne ikke legges i
      `PAIRS` i style.test.js fordi `*-soft`-tokenene er rgba, ikke hex.
- [x] CHANGELOG `[Unreleased]` `### Changed`: «Finpuss på alle sider etter
      mockupen: hero med rundeetikett, tellere i korthodene, kampliste med
      klokkeslett og merker i briefen, tydeligere feilsider.»
- [x] Commit: `feat(ui): finpuss per side etter mockupen`

## Task 1.2-3 — Røyk, Playwright, docs — STOPP

- [x] Røyk uten nøkler: 11 ruter 200, 404. Observert: **11 ruter 200**
      (/, /spillere, /lag, /overganger, /liga, /brief, /live, /nyheter,
      /health, /api/brief.json, /api/live.json), ukjent sti 404,
      `/health` → `ai:false, discord:false`, clubImages 20/20/20.
- [x] Playwright (Vedlegg A): 0 feil. Observert: **OK 332/332**, og
      klubbskriptet fra etappe 2 fortsatt **OK 22/22** (finpussen rørte
      ikke merkene, draktene eller sorteringen).
- [x] Docs oppdatert, commit `docs: v1.3.2 klar`. Rapporter, **STOPP.**

## Task 1.2-4 — Release v1.3.2 (KUN på klarsignal) + AI-kall 1 av 1

Som 1.0-7 → 1.3.2. Etter deploy og `/health`:

- [x] Tidsvindu sjekket. Observert: **mandag 24. aug 13:18 og 13:21,
      0 kamper i gang (GW1 og GW2: ingen `started && !finished_provisional`),
      neste avspark 28. aug 19:00 UTC.**
- [x] `npm version patch --no-git-tag-version` → 1.3.2; CHANGELOG
      `[1.3.2] - 2026-08-24`; ROADMAP, VIDERE og HANDOVER oppdatert
      (HANDOVER sprengte 200-linjerstaket → loggposten fra økt 32 rotert
      til `docs/arkiv/HANDOVER-historikk.md`, ny lengde 171 linjer);
      commit `chore(release): v1.3.2`.
- [x] Merget til `main` (`--no-ff`), **299/299 + lint 0 på main**,
      CHANGELOG-plasseringen inspisert (`[1.3.2]` over `[1.3.1]`, under
      `[Unreleased]`), tag `v1.3.2`, pushet `main` + tag
      (`2eb6c95..d68c810`).
- [x] Coolify deployet (~50 s). Observert: **footer `v1.3.2`; `/health` →
      200 `ai:true, discord:true, leagues:1,`
      `clubImages {badges:20, shirts:20, keepers:20}`;
      `style.css?v=000fa6f3` og `app.js?v=000fa6f3` (delt `assetVersion`)
      → `public, max-age=31536000, immutable`; `/img/clubs/t3.png?v=2627`
      → 200 + `immutable`; 9 ruter 200 + 404 (uten `/brief` og
      `/nyheter`); 60 klubb-URL-er på `/`, 0 uversjonerte. Playwright mot
      prod: OK 240/240 + klubbskript OK 14/14 (0 brutte bilder av
      60/609/48, 15 drakter + 4 keeperdrakter).**
- [x] **Én** visning av `https://fpl.marsk.no/brief` (AI-kall 1 av 1).
      Sjekk: AI-kortet har cyan hairline + AI-merke, `**fet**` → `<strong>`,
      overskriftene (`### …`) som `.sub-head`, ingen rå markdown, merker i
      skade-/kapteinslistene, kamplista med klokkeslett. Observert:
      **200, 15 899 bytes, 14,5 s (fersk generering).
      `class="card card-wide card-ai"` + `<span class="ai-badge">AI</span>`
      (`.card-ai { border-left: 3px solid var(--cyan) }`);
      60 `<strong>` og **0** rå `**`; 9 `.sub-head` (5 fra AI-teksten:
      Deadline / Skadenytt / Kapteinsvalg / Kamper å følge med på / Mine
      grep, + 4 datogrupper) og **0** rå `###`; 10 `.fixture-row` med
      `.fixture-time` (21:00, 13:30, 16:00 …); klubbmerker: Skader 2,
      Kapteinskandidater 3, Kamper 20 — 25 totalt, **0 uversjonerte**;
      footer `v1.3.2`.**
- [x] `/nyheter` besøkes IKKE med ekte nøkkel. Budsjett: **1 av 1 brukt.**
- [x] Lokal branch `feat/ui-v132-finpuss` slettet.

---

# ETAPPE 4 — v1.3.3 QA-rettelser (branch `fix/ui-v133-qa`)

Funnlista kom 24. aug. Utførelsesplanen ligger i `docs/plan-v133-qa.md`
— denne fila planlegger kun etappe 1–3.

---

## Verifiseringstabell (samlet)

| # | Sjekk | Kommando/handling | Forventet |
|---|---|---|---|
| 1 | Enhetstester per etappe | `npm test` | 282 → 296 → 299 → ≥ 299, exit 0 |
| 2 | Lint | `npm run lint` | exit 0 (inkl. `scripts/`) |
| 3 | Tokenparitet + kontrast | `node --test test/style.test.js` | 4/4 OK i begge temaer |
| 4 | Ingen hardkodede farger | samme test | 0 treff |
| 5 | Røyk uten nøkler | `/health` via scratchpad-.env | `ai:false, discord:false`, 11 ruter 200, 404 |
| 6 | Klubbgrafikk på disk | `ls public/img/clubs \| wc -l` | 60 |
| 7 | `/health` bilder | lokal + prod | `clubImages: {badges:20, shirts:20, keepers:20}` |
| 8 | Cache | `curl -sI …/img/clubs/t3.png?v=2627` | `immutable`; uten `?v=` → `no-cache` |
| 9 | Tema persisterer | manuelt + Playwright | reload beholder valg; auto følger systemet |
| 10 | Playwright per etappe | Vedlegg A | 0 feil av 332 sjekker |
| 11 | Mobil 390 | Playwright + Marius' telefon | ingen body-scroll vannrett, sticky thead, nav-fade |
| 12 | Prod-retest /brief | én visning etter v1.3.2 | AI-kall **1 av 1** |
| 13 | AI-budsjett | opptelling over alle etapper | **1** |

## Kjente begrensninger (dokumentert, ikke feil)

- Bryterens ikon settes av app.js etter last (aria-label/ikon kan vise
  «auto» et øyeblikk før riktig modus) — selve temaet blaffer aldri.
- `/live` bruker klient-fallback for bilder (F-c); et bilde som feiler
  vises som plassholder først etter `error`-hendelsen (millisekunder).
- Uten JS: alltid mørkt tema, bryteren gjør ingenting.
- Kontrasttesten dekker hex-tokens; rgba-blandinger er målt manuelt (§3.3).
- Nyopprykkede lag neste sesong får plassholder til skriptet kjøres.

## Vedlegg A — Playwright-skript (scratchpad, aldri i repoet)

Oppsett (én gang per maskin, i scratchpad-mappa):
`npm init -y && npm i playwright && npx playwright install chromium`.
Kjør: `node qa.mjs http://localhost:3011` mot en server med tomme nøkler.

```js
// qa.mjs — visuell QA for FPL-dashboard. Skriver ut «OK n/n» eller feilene.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:3011';
const PAGES = ['/', '/spillere', '/lag', '/overganger', '/liga', '/brief', '/live', '/nyheter'];
const VIEWPORTS = [390, 768, 1024, 1440];
const THEMES = ['dark', 'light'];
const fails = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) fails.push(msg); };

const browser = await chromium.launch();
for (const theme of THEMES) {
  for (const width of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const tag = `${theme} ${width}px ${path}`;
      const r = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('loading') !== 'lazy').length,
        lazyPending: [...document.images].filter((i) => !i.complete).length,
        toggle: Boolean(document.getElementById('theme-toggle')),
      }));
      check(r.theme === theme, `${tag}: data-theme=${r.theme}, ventet ${theme}`);
      check(r.overflow <= 0, `${tag}: vannrett overflow ${r.overflow}px`);
      check(r.broken === 0, `${tag}: ${r.broken} brutte bilder`);
      check(r.toggle, `${tag}: temabryter mangler`);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth));
      check(outline >= 2, `${tag}: fokusring ${outline}px på ${await page.evaluate(() => document.activeElement.tagName)}`);
    }
    // Persistens: klikk bryter to ganger (auto→light→dark), reload, sjekk.
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.click('#theme-toggle');
    await page.click('#theme-toggle');
    await page.reload({ waitUntil: 'networkidle' });
    check((await page.getAttribute('html', 'data-theme')) === 'dark', `${theme} ${width}px: valg overlevde ikke reload`);
    await page.evaluate(() => localStorage.removeItem('fpl-theme'));
    if (width === 390) {
      await page.goto(base + '/spillere', { waitUntil: 'networkidle' });
      const navFade = await page.evaluate(() => document.querySelector('.topbar nav').className.includes('nav-overflow'));
      check(navFade, `${theme} 390px: nav-fade-klasse mangler`);
      await page.evaluate(() => document.querySelector('.table-scroll--pinned').scrollTo(0, 400));
      const stuck = await page.evaluate(() => getComputedStyle(document.querySelector('.table-scroll--pinned thead th')).position === 'sticky');
      check(stuck, `${theme} 390px: thead ikke sticky`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(fails.length ? `FEIL ${fails.length} av ${checks}:\n` + fails.join('\n') : `OK ${checks}/${checks}`);
process.exit(fails.length ? 1 : 0);
```

Forventet: 8 sider × 4 bredder × 2 temaer × 5 sjekker = 320 + 8
persistens + 4 mobil = **332 sjekker** (§10.3 anslo ≈ 259 — 332 er
fasiten). Lazy-bilder utenfor viewport telles ikke som brutte.


