# CLAUDE.md — FPL-dashboard

Selvhostet Fantasy Premier League-dashboard. Server-rendret Express 5 + EJS,
Node 22+, ingen database, ingen byggesteg. Deployes på Coolify (Dockerfile,
port 3000, health check på `/health`). All UI-tekst er på norsk.

## Kommandoer

```
npm run dev     # node --watch, leser .env
npm start       # produksjon
npm test        # node:test — tester i test/
npm run lint    # ESLint (flat config)
npm run fetch-clubs  # (fra v1.3.1) last ned klubbgrafikk, én gang per sesong
```

## Arkitektur

```
src/server.js      oppstart og montering (starter lytteren ved import)
src/middleware.js  rene middleware-byggere: cacheControlFor, createErrorHandler,
                   createShutdown, noStore (v1.7.1: no-store på hele /api)
                   (ligger utenfor server.js så de kan testes)
                   (v1.8.3) createSecurityHeaders/buildCsp: CSP med
                   per-forespørsel-nonce (res.locals.cspNonce → tema-scriptet
                   i layout.ejs — ENESTE inline-script; script-src har aldri
                   unsafe-inline), nosniff, DENY, Referrer-/Permissions-Policy.
                   createRateLimiter/clientIp/rateLimitWrites: 30 POST/DELETE
                   per IP per 5 min på /api (CF-Connecting-IP bak Cloudflare)
src/config.js      env-variabler: PORT, FPL_TEAM_ID, LEAGUE_IDS, TZ,
                   NEWS_FEEDS, ANTHROPIC_API_KEY (valgfri), AI_MODEL,
                   DISCORD_WEBHOOK_URL (valgfri), BRIEF_HOURS_BEFORE_DEADLINE
                   DATA_DIR (default `data`)
src/routes/        tynne ruter: én fil per side + api.js
src/services/
  fplClient.js     ENESTE modul med nettverkskall til FPL-API-et
  cache.js         TTL-cache med stale-while-revalidate, in-flight dedup
                   og 30 s backoff per nøkkel etter mislykket revalidering;
                   ageOf(key) gir alderen på en cachet verdi (alderstaket)
  analysis.js      rene funksjoner: kaptein-/transferanbefalinger, FDR, differensialer
  brief.js         gameweek-briefen: buildBrief (ren data), assembleBrief
                   (henter fra FPL), generateAiBrief (AI-teksten, delt av
                   /brief og auto-briefen)
  prompts.js       rene promptbyggere (brief + rådgiver) og
                   sanitizeBriefText (etterkontroll av AI-briefen)
  live.js          live-visningen: buildLive (ren data), assembleLive (henter)
  transfers.js     «Overganger»-siden: buildTransferAnalysis (ren analyse med
                   per-runde-detaljer, milepæl og alternativer),
                   assembleTransfersPage (hele siden, delseksjoner feiler
                   mykt), generateTransferComment (AI-kommentaren — kalles
                   kun av refresh.js). Aldri element-summary
  pricing.js       (v1.5.0) rene prisfunksjoner: sellingPrice (FPLs
                   halveringsregel), buildPurchases (kjøpshistorikk),
                   buildPriceReport (prisgevinst-seksjonen)
  baseline.js      (v1.5.0) «laget uten bytter»: simulateNoTransferSeason
                   (ren autosub-simulering) + assembleBaseline (henter;
                   getPicksHistoric for ferdige runder)
  scenarios.js     (v1.5.0) hva hvis-planleggeren: buildPlannerData (payload
                   til /api/planlegger.json), validateScenario (server er
                   fasit), buildFtLedger (gratisbytte-regnskap, selvvalidert
                   mot event_transfers_cost), evaluateScenario, og
                   scenario-CRUD med persistens i DATA_DIR/scenarios.json
                   (samme volum-mønster som brief-markøren)
  leagues.js       hvilke ligaer som vises; knownLeagueCount() for /health
  league-insights.js (v1.6.0) liga-innsikten på /liga: leagueRanksByGw +
                   buildLeagueGraph (sesonggraf), pickRival + buildRivalCompare
                   (rival-radar), effectiveCaptain + buildCaptainLeague
                   (kaptein-liga, tak siste 10 ferdige runder), buildReportData
                   (rapportgrunnlag). assembleLeagueInsights/-ReportData henter
                   via fplClient med _mapLimit(8) og myk feil per seksjon.
                   MAX_MANAGERS 20. Egen team-id ALLTID via getEntryHistory
                   (5 min) — getEntryHistoryHistoric (delt nøkkel, 6 t) er kun
                   for andre managere
  insights.js      (v1.7.0) sesonginnsikten på /innsikt: optimalXi +
                   buildBenchReport (benkesløsing), buildCaptainAudit
                   (kapteinsfasit: troppens beste + global favoritt),
                   buildLuckMeter (flakspoeng mot xG/xA), og
                   buildDreamTeamSection (rundens XI + in_dreamteam-trend).
                   assembleInsights henter picks + live for ALLE ferdige
                   runder med _mapLimit(8) og myk feil per seksjon; deler
                   cache-nøkler med baseline.js. actualXiIds er fasiten på
                   hvem som spilte: multiplier > 0 (FPL re-sorterer picks
                   etter autosub). All poengregning er rå 1×. ALDRI ai.js
  players.js       (v1.8.0) «spiller-pakka» på /spillere: buildPlayerCard
                   (payload for modal-spillerkortet), buildDifferentials
                   (global differensial-finner, terskler 5/10/15 %, null når
                   ingen har form ennå), buildSetPieceTable (dødballtakere
                   per klubb, `{id, navn}` × topp 2 per rolle) og
                   assemblePlayerCard (bootstrap FØRST — ukjent id koster
                   aldri et element-summary-kall). (v1.8.1) buildDifferentials
                   sorterer NUMERISK og formaterer så: `fdr3`/`score` er
                   «x.y»-strenger, og hver rad får `andel` (0–100 = score i
                   prosent av toppscoren i den tabellen) til søylestripa.
                   Element-summary hentes
                   KUN lazy per klikk, aldri i bulk. ALDRI ai.js
  clubAssets.js    hvilke klubbbilder som finnes i public/img/clubs/. Leses én
                   gang ved oppstart til app.locals.clubAssets; partialene spør
                   hasBadge/hasShirt/hasKeeper og skriver aldri <img> i blinde.
                   Versjonen (IMG_VERSION) kommer fra middleware.js
  ai.js            felles Claude API-service: lazy init, modell fra config,
                   cache med minimumsintervall per funksjon
  news.js          RSS-nyheter + valgfri AI-oppsummering (via ai.js, cachet)
  notify.js        deadline-scheduler + Discord-webhook for auto-brief (valgfri)
                   «Brief sendt»-markøren lagres i DATA_DIR/brief-state.json
                   så en redeploy i sendevinduet ikke re-poster briefen.
                   (v1.6.0) også «Rundens rapport»: reportDecision + checkReport
                   på samme 6 t-tikk — markør OG tekst i DATA_DIR/report-state.json
                   (webvisningen overlever redeploy, aldri dobbel-post)
  refresh.js       (v1.3.4) timer-styrt oppfrisking av AI-tekstene:
                   refreshDecision (ren beslutning) + startAiRefresher
                   (ett tikk ved oppstart, så hver 30. min). Sender aldri
                   noe til Discord — det er notify.js sin sak
views/             EJS: layout.ejs + én fil per side. views/partials/:
                   theme-toggle (v1.3.0), club-badge og club-shirt (v1.3.1)
public/            style.css (alle farger som tokens: :root = mørkt tema,
                   :root[data-theme="light"] = lyst), app.js (vanilla JS),
                   fonts/ (lokal Archivo), img/clubs/ (klubbgrafikk fra v1.3.1:
                   60 filer, t{code}/shirt_{code}/shirt_{code}_1, ~560 KB)
scripts/           fetch-club-assets.mjs (v1.3.1): henter klubbmerker og
                   drakter fra FPL én gang per sesong — CLI-verktøy, aldri
                   kjøretid. Eneste nettverkskall utenfor fplClient.js
test/              node:test — ingen nettverkskall. Fakes injiseres via små
                   test-hooks (_setNow/_flush/clear i cache.js, _setClient/
                   _setNow/_reset i ai.js, _send/_setHooks/_reset/_initState i notify.js)
                   eller ved å mocke global fetch (test/fplClient.test.js)
```

Dataflyt: routes → services → fplClient → FPL-API. Nettverkskall mot FPL skjer
kun i `fplClient.js`. Andre eksterne tjenester har hver sin service: RSS i
`news.js`, Claude API (via `@anthropic-ai/sdk`) i `ai.js`, Discord-webhook i
`notify.js`. Aldri forretningslogikk i routes eller views.

## FPL-API

Base `https://fantasy.premierleague.com/api/` — åpent, ingen nøkkel. Viktig:

- Send nettleser-lignende `User-Agent`, ellers kan API-et avvise kall
- Priser (`now_cost`) er i tideler: 55 = £5.5m
- `bootstrap-static/` er hovedkilden (events/teams/elements) — cache 15 min
- Under kampoppdateringer kan API-et gi 503 «The game is being updated»:
  server cachet data med banner, ikke krasj. Flagget er tidsstemplet og
  utløper av seg selv 5 min etter siste 503; uten cache viser feilhandleren
  en forklarende 503-side i stedet for den generiske feilsiden
- Live-data (`event/{gw}/live/`) caches maks 1 min; entry/picks/transfers
  5 min. Ferdige runder hentes via `getLiveHistoric(gw)` — samme endepunkt
  og cache-nøkkel, 6 t TTL (poengene er i praksis immutable); kalles kun
  når bootstrap sier runden er `finished`
- `dream-team/{gw}/` (fra v1.7.0) hentes med `getDreamTeam(gw)` — EGEN
  cache-nøkkel `dreamteam:${gw}`, 6 t TTL, kalles kun for ferdige runder
- `element-summary/{id}/` hentes med `getElementSummary(id)` — nøkkel
  `element:${id}`, 30 min TTL. Fra v1.8.0 brukes den av spillerkortet, og
  KUN lazy per klikk via `GET /api/spiller/:id`. Aldri i bulk (en
  sidevisning av /spillere skal koste 0 element-summary-kall);
  `elementSummaryAgeSec(id)` gir alderen på nøkkelen til `dataAlder`
- Frontend poller live-data kun mens kamper pågår — aldri poll utenfor
  kampvinduer, og all polling går via serverens cache (aldri rett mot FPL)
- Alderstak (v1.4.0): stale data eldre enn 60 min (10 min for live) vises
  fortsatt, men med banneret «Viser data fra HH:MM — får ikke kontakt med
  FPL akkurat nå» (`staleInfo` i fplClient). `/api/brief.json` og
  `/api/live.json` oppgir `dataAlder` (sekunder siden forrige henting)

## AI-funksjoner (valgfrie — appen krever aldri nøkkel)

Alle AI-kall går gjennom `ai.js`. Modell konfigureres med `AI_MODEL`
(default `claude-sonnet-5`; `claude-haiku-4-5` er billig-alternativet).
Seks funksjoner, alle kun aktive når `ANTHROPIC_API_KEY` er satt:

1. **Nyhetsoppsummering** (`news.js`): RSS-titler + ingresser oppsummeres til
   korte norske FPL-punkter. Maks én generering per 30 min, `max_tokens` 2000.
   `getNews()` leser kun cachen; `refreshNewsSummary()` genererer.
2. **AI-gameweek-brief** (/brief): modellen skriver hele briefen på norsk fra
   data-briefens JSON. Maks én generering per time, `max_tokens` 4000.
   Ruten bruker `getCachedAiBrief()`; `generateAiBrief()` kalles kun av
   `refresh.js` og auto-briefen. Data-briefen er alltid fallback.
3. **AI transfer-rådgiver** (/lag): kun ved klikk, cachet 1 time,
   `max_tokens` 4000. Eneste sted et brukerklikk kan vente på et AI-kall —
   og bare når cachen er helt kald (`swr: true`).

`max_tokens` er satt romsligere enn svarlengden tilsier fordi adaptiv tenkning
på Sonnet 5 trekker fra samme budsjett — taket hindrer avkortede svar, og
ubrukte tokens koster ingenting. Lengden styres av instruksjonene i prompten.
4. **Auto-brief** (`notify.js`): postes til `DISCORD_WEBHOOK_URL` X timer før
   deadline (`BRIEF_HOURS_BEFORE_DEADLINE`, default 24). 1–2 kall per uke.
   Bruker samme `generateAiBrief()` som /brief, så de to kan ikke divergere.
5. **Overgangskommentar** (/overganger, fra v1.5.0): kort norsk vurdering av
   byttene («godt bytte, dårlig timing»). Maks 1 generering per døgn via
   `refresh.js`, `max_tokens` 1500, kun når det finnes spilte bytter
   (0 bytter = 0 kall). Ruta leser kun cachen.
6. **Rundens rapport** (/liga + Discord, fra v1.6.0): roast-rapport om
   miniligaen etter hver ferdigspilte runde (`finished && data_checked`).
   Genereres av `notify.js` på 6 t-tikket, `max_tokens` 3000, maks 1 kall
   per runde (event-nøkkel + 7-døgnsintervall + persistert markør).
   Grunnlaget (buildReportData) har også lagdetaljer per manager
   (benk, chip, bytter/hit, toppscorer) + differensialer/flopper — bygget
   av picks + live som uansett hentes, 0 ekstra FPL-kall.
   Datafallback uten nøkkel. Ruta leser kun `getLeagueReport()`.

Ved feil eller tomt svar venter `ai.js` 5 minutter før nytt forsøk på samme
nøkkel (`FAILURE_BACKOFF_MS`), slik at en ugyldig nøkkel ikke gir ett betalt
kall per sidebesøk.

Kostnadsregler (fra v1.3.4): tekstene er **timer-styrt**, ikke besøks-styrt.
En sidevisning blokkerer aldri på et AI-kall og utløser aldri et — den leser
cachen (`ai.getCached`). Eneste unntak: rådgiverklikket på /lag venter når
cachen er helt kald. Utgått tekst serveres umiddelbart og fornyes i
bakgrunnen (`swr: true` i `ai.generate`). Takt: briefen 1x/døgn + hver time
i et 6-timersvindu før deadline, nyhetene hver 6. time,
overgangskommentaren 1x/døgn (fra v1.5.0), ligarapporten 1x per
ferdigspilt runde (fra v1.6.0), pluss ett tikk ved
oppstart (AI-cachen bor i minnet og er tom etter hver deploy) — til sammen
~49–53 kall/uke. `/innsikt` (v1.7.0) og spiller-pakka på `/spillere`
(v1.8.0, inkludert `/api/spiller/:id`) er utenfor dette regnskapet: de
importerer aldri `ai.js` og koster **0 AI-kall** i alle tilstander — låst
på kilden i `test/routes.test.js`.
Prompts holdes korte. Uten nøkkel vises rå data
(feed-liste, data-brief) — AI er alltid et tillegg, aldri et krav.

## Konvensjoner

- **Commits**: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
  Commit hyppig — minst én per delfunksjon. Push etter hver milepæl.
- **CHANGELOG.md**: Keep a Changelog. Hver brukersynlig endring inn under
  `[Unreleased]` i samme commit som endringen. Ved ferdig milepæl: flytt til
  versjonert seksjon med dato + git-tag (SemVer).
- **ROADMAP.md**: jobb i milepælrekkefølge, huk av etter hvert. Nye idéer
  legges under «Senere / idéer», de sniker ikke i køen.
- **Tester**: all logikk i `analysis.js`/`cache.js` skal ha tester. Grønn
  `npm test` + `npm run lint` før en milepæl regnes som ferdig.
- **Stil**: moderne JS (ESM, async/await), ingen nye avhengigheter uten god
  grunn — appen skal forbli liten og rask.
- **Design** (fra v1.3.0, plan i `docs/arkiv/plan-v130-ui-overhaul.md`): to
  temaer — mørkt er CSS-basen i `:root`, lyst er `:root[data-theme="light"]`.
  Auto følger `prefers-color-scheme`; manuelt valg lagres i
  `localStorage['fpl-theme']`; temaet settes av et inline-script i
  `<head>` i layout.ejs FØR stilarket (ingen blaff). Alle farger er tokens
  som finnes i BEGGE blokker, ingen hardkodede farger utenfor dem, kontrast
  ≥ 4,5:1 tekst / ≥ 3:1 grafikk — låst av `test/style.test.js`. FPLs
  merkevarefarger (lilla #37003C, grønn #00ff87, cyan #04f5ff, rosa
  #e90052) og FPLs egne FDR-farger; grønn er fyll med mørk tekst, grønn
  TEKST kun i mørkt tema. Klubbgrafikk (merker 70 px, drakter 110 px)
  selvhostes i `public/img/clubs/`, versjonert med `?v=<IMG_VERSION>`;
  viewene skriver aldri `<img>` for en fil som ikke finnes (clubAssets).
  Systemfonter + lokal Archivo, ingen eksterne CDN-er ved kjøretid,
  responsivt (390 px er referansen).
- **CSP og tilgjengelighet** (fra v1.8.3): ingen inline `<script>` uten
  nonce og ingen `on*`-attributter i views eller klient-markup (CSP-en
  blokkerer dem stille); `style="…"` er tillatt. Hver `<table>` følges av
  `<caption>`, hvert skjemafelt har etikett, hver ikon-knapp har
  `aria-label`, all bevegelse ligger bak `prefers-reduced-motion`, og
  `<main id="innhold">` er hopp-lenkens mål. Låst av `test/views.test.js`,
  `test/middleware.test.js`, `test/app-client.test.js` og `test/a11y.test.js`.

## Handover (VIKTIG — les først i ny økt)

`docs/HANDOVER.md` er den levende overleveringsfilen. Den oppdateres ved hver
milepæl og ved arbeidsstans, og inneholder: nøyaktig status, åpne punkter,
driftslærdommer og brukerens beslutninger. **Start alltid en ny økt med å
lese den + køen øverst i ROADMAP.md.** Fila har et tak på **200 linjer**:
sprenges det, roteres eldste logg/status til
`docs/arkiv/HANDOVER-historikk.md`. Utførte planer og annen historikk bor i
`docs/arkiv/` — konsumerte økt-prompter slettes (git bevarer dem).
Nærmer økten seg brukerens usage-grense (~95 %): stopp, oppdater
`docs/HANDOVER.md` grundig, commit alt.

## Deploy

Coolify bygger fra Dockerfile ved push til `main` (webhook/auto-deploy).
Det som merges til `main` går altså rett i prod — hold `main` grønn.
Env-variabler settes i Coolify, aldri i repoet. `.env` er gitignored;
`.env.example` holdes oppdatert.
