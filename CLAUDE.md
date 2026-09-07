# CLAUDE.md — FPL-dashboard

Selvhostet Fantasy Premier League-dashboard. Server-rendret Express 5 + EJS, Node 22+
(imaget er `node:24-alpine`), ingen database, ingen byggesteg. Deployes på Coolify
(Dockerfile, port 3000, health check på `/health`). All UI-tekst er på norsk.

## Kommandoer

```
npm run dev          # node --watch, leser .env
npm start            # produksjon
npm test             # node:test — tester i test/, ingen nettverkskall
npm run lint         # ESLint (flat config)
npm run fetch-clubs  # klubbgrafikk fra FPL, én gang per sesong (CLI, aldri kjøretid)
npm run make-icons   # PWA-ikoner som PNG (kun node:zlib); committes + ICON_VERSION-bump
npm run hooks        # aktiverer .githooks (pre-push: test + lint) — én gang per maskin
```

## Arkitektur

Dataflyt: routes → services → fplClient → FPL-API. Aldri forretningslogikk i
routes eller views. Hver ekstern tjeneste har én modul: FPL i `fplClient.js`,
RSS i `news.js`, Claude API i `ai.js`, Discord-webhook i `notify.js`.

```
src/app.js         createApp(): ren fabrikk — monterer alt, lytter aldri, starter ingen timer
src/server.js      oppstart: lytt, SIGTERM/SIGINT, de tre schedulerne. Eneste fila som starter noe
src/middleware.js  rene, testbare byggere: cacheControlFor, createErrorHandler, createShutdown
                   (SIGTERM), noStore (hele /api), CSP med per-forespørsel-nonce (tema-scriptet i
                   layout.ejs er ENESTE inline-script; aldri unsafe-inline) + sikkerhetshoder,
                   rateLimitWrites (30 POST/DELETE per IP per 5 min på /api), IMG_/ICON_VERSION
src/config.js      env: PORT, FPL_TEAM_ID, LEAGUE_IDS, TZ, NEWS_FEEDS, AI_MODEL, ANTHROPIC_API_KEY og
                   DISCORD_WEBHOOK_URL (valgfrie), BRIEF_/DEADLINE_CHECK_HOURS, DATA_DIR (`data`)
src/routes/        tynne ruter: én per side + api.js (JSON, no-store), calendar.js (/kalender.ics),
                   pwa.js (/sw.js med ekte asset-hash, no-store; /offline), health.js (healthPayload():
                   features av/på — aldri verdier — + aiStats fra ai.getStats())
src/pwa/sw.js      service worker: cache `fpl-<hash>`; kun GET same-origin; /api, /kalender.ics, /health
                   og sw.js alltid utenom; navigasjon nett-først (fallback /offline), ?v= cache-først;
                   ingen HTML caches utenom /offline (HTML bærer CSP-nonce)
src/services/
  fplClient.js     ENESTE modul med nettverkskall til FPL-API-et; staleInfo (alderstaket)
  cache.js         TTL-cache: stale-while-revalidate, in-flight dedup, 30 s backoff per nøkkel etter feil; ageOf(key)
  analysis.js      rene funksjoner: kaptein-/transferråd, FDR, fixtureGrid, roundInNumbers, rankTable.
                   CHIP_LABELS bor her fordi fila importerer INGENTING; chips.js re-eksporterer den
  brief.js         buildBrief (ren) / assembleBrief (henter) / generateAiBrief (AI-teksten)
  prompts.js       rene promptbyggere + sanitizeBriefText
  live.js          buildLive (ren) / assembleLive (ferdig runde via getLiveHistoric +
                   staleInfo(gw, { finished })) / topBps (bonuskamp). explain per spiller
                   (EXPLAIN_LABELS), flatet over kampene; ukjent identifikator vises rått
  transfers.js     «Overganger»: analyse, side (delseksjoner feiler mykt), generateTransferComment
                   (kun via refresh.js). Aldri element-summary
  pricing.js / baseline.js  rene prisfunksjoner (sellingPrice = FPLs halveringsregel); «laget uten bytter» (ren autosub-simulering)
  scenarios.js     hva hvis-planlegger; server er fasit (validateScenario), buildFtLedger,
                   CRUD i DATA_DIR/scenarios.json
  leagues.js       hvilke ligaer som vises; knownLeagueCount() venter aldri på FPL;
                   globalStandings(entry) = de globale type-s-ligaene /liga viser øverst
  league-insights.js /liga: ligagraf, rival-radar, kaptein-liga, rapportdata; _mapLimit(8), myk feil
                   per seksjon, MAX_MANAGERS 20. Egen team-id ALLTID via getEntryHistory (fersk) —
                   Historic-varianten er kun for andre managere
  insights.js      /innsikt: benkesløsing, kapteinsfasit, flaks (xG/xA), rundens XI, karriere +
                   merkedager; picks + live for ALLE ferdige runder (myk feil). actualXiIds =
                   multiplier > 0 (FPL re-sorterer etter autosub); poeng rå 1×
  players.js       /spillere: spillerkort, differensialer, dødballtakere; assemblePlayerCard sjekker
                   bootstrap FØRST (ukjent id koster aldri element-summary) og sender element_types
                   videre — stats per posisjon, rank, sesonger, klausuler
  chips.js         chip-planlegger (halvdeler på stop_event — WC/FH har start_event 2). 0 FPL-kall
  deadline.js      «Lagsjekk»: applyTransfers (picks N−1 + bytter) + funn + Discord-tekst; funnet
                   «klausul» leser scout_risks.gameweek (FPLs notes er feil)
  calendar.js      buildCalendar (VALARM, troppens kamper; CRLF, UTC, foldLine 75 oktetter)
  prices.js        prisvarsler: diff-funksjoner + startPriceWatcher (oppstart, så hver time, ≤ 1 cachet
                   bootstrap-kall/time); price-state.json, maks 1 melding/dato. buildPriceForecast =
                   FPLs prognosefelt (pct/likelihood/rate/locked), 0 kall
  clubAssets.js    hvilke klubbbilder som finnes — partialene skriver aldri <img> i blinde
  ai.js            felles Claude-service: lazy init, cache med minimumsintervall, swr, 5 min
                   backoff. AI-statistikk per cacheKey (calls/tokens/failures/lastAt/model + since)
                   i DATA_DIR/ai-stats.json, lagret per registrering og lest lazy; getStats() er synkron
  news.js          RSS + valgfri AI-oppsummering (cachet)
  notify.js        6 t-scheduler + Discord: auto-brief, rundens rapport, Lagsjekk; markører i DATA_DIR/*-state.json (aldri dobbel-post)
  refresh.js       timer-styrt oppfrisking av AI-tekstene (oppstart + hver 30. min). Aldri Discord
views/             EJS: layout.ejs + én per side; partials/ (theme-toggle, club-badge, club-shirt)
public/            style.css (farger = tokens), app.js, fonts/ (lokal Archivo), img/clubs/ (?v=IMG_VERSION), manifest + PWA-ikoner (?v=ICON_VERSION)
scripts/           fetch-club-assets.mjs, make-pwa-icons.mjs — CLI, aldri kjøretid; eneste nettverkskall utenfor fplClient.js
test/              node:test, ingen nettverkskall. Fakes via test-hooks (_setNow/_flush/clear i cache.js;
                   _setClient/_setNow/_setHooks/_reset i ai.js; _setHooks i notify/prices) eller mocket fetch.
                   app.test.js: hele stacken på loopback mot fixtures/fpl-world.js (fremmede verter kaster)
```

## FPL-API

Base `https://fantasy.premierleague.com/api/` — åpent, ingen nøkkel.

- Send nettleser-lignende `User-Agent`, ellers kan API-et avvise kall.
  Priser (`now_cost`) er i tideler: 55 = £5.5m.
- `bootstrap-static/` er hovedkilden (events/teams/elements) — cache 15 min.
- 503 «The game is being updated»: server cachet data med banner, ikke krasj. Flagget
  utløper 5 min etter siste 503; uten cache viser feilhandleren en forklarende
  503-side (som alle feilsider: `staleSince` MÅ med).
- Live-data (`event/{gw}/live/`) caches maks 1 min; entry/picks/transfers 5 min.
  Ferdige runder via `getLiveHistoric`/`getPicksHistoric`/`getEntryHistoryHistoric`:
  samme endepunkt, **egne nøkler med suffiks `:hist`**, 6 t TTL (immutable) — ellers ga
  «første skriver setter TTL-en» `getLive` 6 t-verdien som fersk (falskt stale-banner).
  Kun `finished`-runder; egen FPL_TEAM_ID alltid via `getEntryHistory`.
- `dream-team/{gw}/` (`dreamteam:${gw}`, 6 t) og `element-summary/{id}/`
  (`element:${id}`, 30 min). Element-summary hentes KUN lazy per klikk via
  `GET /api/spiller/:id` — aldri i bulk: /spillere koster 0 slike kall.
- `entry/{id}/event/{gw}/picks/` for KOMMENDE runde gir 404 før deadline.
  Alt som viser «laget for runde N» før deadline bruker picks fra N−1 +
  `entry/{id}/transfers/`. `event_transfers_cost` ligger i `history.current`.
- Frontend poller live-data kun mens kamper pågår, alltid via serverens cache — aldri rett mot FPL.
- Alderstak: stale data eldre enn 60 min (10 min for live) vises med banneret «Viser
  data fra HH:MM — får ikke kontakt med FPL» (`staleInfo`); `{ finished: true }` måler
  `:hist`-nøkkelen og utløser aldri banneret. `/api/brief.json` og `/api/live.json`
  oppgir `dataAlder` (sekunder) — stiger den mens FPL svarer, er det cachen.

## AI-funksjoner (valgfrie — appen krever aldri nøkkel)

Alle AI-kall går gjennom `ai.js`. Modell via `AI_MODEL` (default `claude-sonnet-5`;
`claude-haiku-4-5` er billig-alternativet). `max_tokens` er romslig fordi adaptiv tenkning
trekker fra samme budsjett — lengden styres av prompten. Seks funksjoner, alle kun aktive
med `ANTHROPIC_API_KEY`:

1. **Nyhetsoppsummering** (`news.js`): maks 1 per 30 min, 2000 tokens.
   `getNews()` leser kun cachen; `refreshNewsSummary()` genererer.
2. **AI-gameweek-brief** (/brief): 1 per time, 4000 tokens. Ruta leser
   `getCachedAiBrief()`; `generateAiBrief()` kun via refresh.js/auto-briefen.
3. **AI transfer-rådgiver** (/lag): kun ved klikk, cachet 1 time, 4000 tokens.
   Eneste sted et klikk kan vente på et AI-kall — bare når cachen er helt kald.
4. **Auto-brief** (`notify.js`): til Discord `BRIEF_HOURS_BEFORE_DEADLINE` (24) timer før
   deadline — samme `generateAiBrief()` som /brief.
5. **Overgangskommentar** (/overganger): 1 per døgn via refresh.js, 1500 tokens, kun når
   det finnes spilte bytter (0 bytter = 0 kall).
6. **Rundens rapport** (/liga + Discord): roast av miniligaen etter hver
   ferdigspilt runde (`finished && data_checked`), 3000 tokens, maks 1/runde.

**Kostnadsregel: timer-styrt, ikke besøks-styrt.** En sidevisning utløser aldri et
AI-kall og blokkerer aldri på et — den leser cachen (`ai.getCached`); utgått tekst
serveres straks og fornyes i bakgrunnen (`swr`). Unntaket er rådgiverklikket. Takt
~49–53 kall/uke + ett tikk ved oppstart; måles på `/health` → `aiStats`. **Kildelås**
i `test/routes.test.js`: ingen rute kaller generering, og players.js, chips.js,
deadline.js, calendar.js og prices.js importerer aldri `ai.js`. Uten nøkkel vises rå
data: AI er alltid et tillegg, aldri et krav.

## Konvensjoner

- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`), minst én per
  delfunksjon. Feature-branch per versjon, merge `--no-ff`, annotert tag, push etter hver
  milepæl (`git merge -F -` leser ikke stdin — bruk `-m`).
- **Push-flyt**: branch → push → CI grønn (`gh run watch`) → merge `--no-ff` → push `main`.
  Pre-push-hooken kjører test + lint lokalt (`npm run hooks` én gang per maskin); CI-en er
  andre lag og eneste bevis på Node 22.
- **CHANGELOG.md**: Keep a Changelog. Hver brukersynlig endring under `[Unreleased]` i samme
  commit som endringen; ved release: versjonert seksjon med dato + tag (SemVer). Alle docs
  oppdateres i samme commit som koden.
- **ROADMAP.md**: jobb i køens rekkefølge, huk av etter hvert. Nye idéer under «Senere /
  idéer» — de sniker ikke i køen.
- **Tester**: TDD — rød test først. All logikk i services har tester; grønn `npm test` +
  `npm run lint` før en milepæl er ferdig. Ingen test skriver til ekte DATA_DIR (hooks).
  Bevis før påstand: vis kommando og output.
- **Stil**: moderne JS (ESM, async/await), ingen nye avhengigheter uten god grunn.
- **Design**: to temaer — mørkt er CSS-basen i `:root`, lyst er
  `:root[data-theme="light"]`; auto følger `prefers-color-scheme`, manuelt valg i
  `localStorage['fpl-theme']`, satt av inline-scriptet i `<head>` FØR stilarket (ingen
  blaff). Alle farger er tokens i BEGGE blokker, ingen hardkodede utenfor dem; kontrast
  ≥ 4,5:1 tekst / ≥ 3:1 grafikk (låst av `test/style.test.js`). FPLs merkevarefarger
  (lilla #37003C, grønn #00ff87, cyan #04f5ff, rosa #e90052) og FDR-farger — unntak
  `--fdr-4` = `#e6003c` (12 px-tekst trenger 4,5:1 mot hvit).
  Grønn er fyll med mørk tekst; grønn TEKST kun i mørkt tema, unntatt på hero-flaten
  (`--hero-link`). Klubbgrafikk selvhostet, `?v=<IMG_VERSION>` (ny sesong = `npm run
  fetch-clubs` + bump i SAMME commit, ellers serverer Cloudflare fjorårets drakter
  immutable). Systemfonter + lokal Archivo, ingen CDN-er ved kjøretid, responsivt
  (390 px er referansen), bevegelse bak `prefers-reduced-motion`.
- **CSP og tilgjengelighet**: ingen inline `<script>` uten nonce og ingen `on*`-attributter
  i views/klient-markup (CSP-en blokkerer dem stille; `style="…"` er ok). Hver `<table>` har
  `<caption>`, hvert skjemafelt etikett, hver ikon-knapp `aria-label`, `<main id="innhold">`
  er hopp-lenkens mål (låst av testene).
- **Docs er CRLF i arbeidstreet** (LF i indeksen, `core.autocrlf=true`;
  ROADMAP har BOM). Bruk Edit-verktøyet på docs — et node-`replace` med `\n`
  matcher ikke og feiler stille; `sed -i` er forbudt.

## Handover (VIKTIG — les først i ny økt)

`docs/HANDOVER.md` er den levende overleveringsfila: status, åpne punkter,
driftslærdommer og Marius' beslutninger (ikke re-spør dem). **Start alltid en ny økt
med å lese den + køen øverst i ROADMAP.md.** Tak **200 linjer** (roter til
`docs/arkiv/HANDOVER-historikk.md`); utførte planer i `docs/arkiv/`, konsumerte
prompter slettes. Nær usage-grensen (~95 %): oppdater HANDOVER, commit.

## Deploy

Coolify bygger fra Dockerfile ved push til `main` — det som merges går rett i prod, så
hold `main` grønn: hooken og CI-en (`.github/workflows/ci.yml`, Node 22 + 24) er
sikkerhetsnettet. Env-variabler settes i Coolify, aldri i repoet; `.env` er gitignored,
`.env.example` holdes oppdatert. `DATA_DIR` er et volum (`/app/data`):
brief-/report-/check-/price-state, scenarios og ai-stats.
**Deploy-vindu: aldri torsdag 19:00–21:00 (auto-briefen), aldri mens kamper pågår**
(`/api/live.json` → `anyLive` må være `false`). Prod-sjekk etter hver deploy: footer
viser ny versjon, `<script`-telling på `/` er nøyaktig 2, `/health` er 200, hash fra
`/sw.js` noteres i HANDOVER. Lokal røyktest: `config.js` leser repoets `.env` uansett
— sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` tomme (`--env-file`).
