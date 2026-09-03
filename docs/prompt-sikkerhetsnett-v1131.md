# Økt-prompt til Opus — v1.13.1 «Sikkerhetsnett»: app-fabrikk, rute-tester, CI og pre-push-hook

> Skrevet 4. september 2026 (økt 57, Fable) etter at Marius valgte retning A
> («sikkerhetsnett for `main`») og bekreftet alle fire anbefalingene i ett
> spørsmålssett. Rute-tester og CI ble bevisst utelatt fra vedlikeholdspakka
> 2. sep — nå bygges de. Prompten er konsumert når v1.13.1 er i prod, CI-en
> har kjørt grønt på GitHub og alt er loggført — da slettes fila (git bevarer
> den).

## Slik brukes den

Lim inn blokka under «Prompten» i en ny Opus-økt i plan-modus. Økten skal
**verifisere premissene, skrive planen, få den godkjent av Marius, så bygge**.
Ingen kode før godkjenning. Alle premisser under er målt 4. sep 2026 på
`main` = `2624055` (v1.13.0) — linjenumre kan ha flyttet seg, verifiser mot
koden før du siterer dem.

## Fasit (besluttet av Marius 4. sep — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Problem | push til `main` = prod-deploy (Coolify). Privat repo på gratisplan: **ingen branch protection, rulesets `[]`** (målt med `gh api`). Eneste vakt i dag er disiplin. |
| Vakt | **CI-workflow + pre-push-hook i repoet** + push-flyt-regel i CLAUDE.md. Ikke prøv rulesets (krever trolig GitHub Pro; ikke i denne pakka). |
| CI-omfang | `npm ci` + `npm run lint` + `npm test` i matrise **Node 22 og 24** (22 = `engines`-gulvet, 24 = prod-imaget). Ingen `docker build`, ingen audit-jobb, ingen eksterne kall, ingen secrets. |
| Rute-tester | **Full stack, alle sider og endepunkter**: ekte Express-app på loopback (port 0) med en falsk FPL-verden. Per side: 200, `<script` = 2, CSP-nonce i header = nonce i HTML, `<main id="innhold">`. Pluss 404, /api no-store, statisk cache, 503-siden, RSS nede, 413, 429. |
| Forutsetning | `server.js` splittes i `src/app.js` (`createApp()` — ren fabrikk, lytter aldri, starter ingen timer) og `src/server.js` (lytt + shutdown + schedulere). Ingen atferdsendring. |
| Versjon | **v1.13.1** (patch): ingen brukersynlig endring, refaktor uten atferdsendring. Én branch: `feat/sikkerhetsnett-v1131`. |
| Avhengigheter | **0 nye** — ingen supertest, ingen husky. `node:test` + `node:http`/global `fetch` mot loopback. |
| AI/Discord | 0 nye AI-kall, 0 Discord-meldinger. Rute-testene kjører med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL` tomme og beviser det. |
| `public/` | urørt → asset-hashen i prod forblir `ba91839a`. |
| Arbeidsform | rød test først, merge `--no-ff`, tag, push, prod-sjekk — økten gjør det selv (sluttpakka-fasit). |
| Spørsmål til Marius | kun hvis planen avdekker noe som bryter denne fasiten — ett spørsmålssett, anbefaling først. |

## Målte premisser (4. sep, `main` = `2624055`)

- **Baseline:** `npm test` → 767/767 på 11,4 s, `npm run lint` → 0. `main` = `origin/main`.
- **`src/server.js` (138 linjer)** bygger `app`, regner `version`/`assetVersion`/
  `startedAt`, monterer alt, og på linje ~118–135: `app.listen(config.port)`,
  `createShutdown`, `startScheduler()`, `startAiRefresher()`, `startPriceWatcher()`,
  `export default app`. **Ingenting importerer `server.js`** (grep: bare en
  kommentar i `src/middleware.js:1`, `package.json`, `Dockerfile`, `README.md:86`
  og to kildelås-tester).
- **To tester grep-er `src/server.js` som kildekode** og må pekes om til
  `src/app.js`: `test/middleware.test.js:80` («server.js monterer
  securityHeaders før rutene …») og `test/pwa.test.js:70` («server.js monterer
  /sw.js og /offline før 404»).
- **Ingen modul starter timere ved import** (grep på `setInterval`/`setTimeout`
  på toppnivå i `src/`: 0 treff). Schedulerne startes kun eksplisitt fra
  `server.js`. `ai.js` er lazy.
- **All `config.dataDir`-bruk er lazy** (funksjoner i ai.js:31, notify.js:44/68/92,
  prices.js:148, scenarios.js:197) → `DATA_DIR` satt i `process.env` **før**
  første import styrer hvor rute-testene skriver.
- **`config.js` kjører `process.loadEnvFile()` som leser repoets `.env`**
  (lokalt: `ANTHROPIC_API_KEY`, `FPL_TEAM_ID`, `DISCORD_WEBHOOK_URL`).
  `loadEnvFile` overskriver ikke variabler som alt finnes i `process.env` —
  sett dem TOMME før import (HANDOVER-lærdom). Verifiser med `/health` →
  `features.ai === false`.
- **`fplClient.js`:** `BASE = 'https://fantasy.premierleague.com/api/'`
  (linje 4). `fplFetch` (linje 65–96) retryer med `sleep(RETRY_DELAYS[...])`
  for ALLE feil unntatt `FplError` med `retryable: false` (503 og 404). En
  mock som **kaster** for en ukjent FPL-sti gir derfor sekunder med retry-
  søvn — svar alltid `{ ok: false, status: 404, json: async () => ({}) }`
  for ukjente FPL-stier. 503 setter `updatingSince` og kaster `FplError(503)`.
- **Stier verdenen må servere** (linjenumre i fplClient.js): `bootstrap-static/`
  (99), `fixtures/` og `fixtures/?event=N` (109), `element-summary/{id}/`
  (116), `entry/{id}/` (132), `entry/{id}/history/` (136 og `:hist` 150),
  `entry/{id}/transfers/` (156), `entry/{id}/event/{gw}/picks/` (162 og
  `:hist` 175), `event/{gw}/live/` (181 og `:hist` 196), `dream-team/{gw}/`
  (206), `leagues-classic/{id}/standings/?page_standings=1` (212).
- **Hvem henter hva** (så verdenen dekker alle sider): `/` bootstrap +
  fixtures + `getNews()` (myk); `/spillere` bootstrap + fixtures; `/lag`
  bootstrap, fixtures, entry, history, picks (+ 404 for kommende runde);
  `/overganger` via `transfers.js`/`baseline.js` (entry, history, transfers,
  picks); `/liga` bootstrap + `resolveLeagueIds()` (`leagues.js:10–14`: env
  `LEAGUE_IDS`, ellers `entry.leagues.classic` med `league_type === 'x'`) +
  standings + `league-insights.js` (rivalers `history:hist` og `picks:hist`);
  `/innsikt` bootstrap, `getEntryHistory` (egen id — alltid fersk),
  `picks:hist` + `live:hist` for alle ferdige runder, `dream-team` for siste;
  `/brief` bootstrap, fixtures, picks (+ `softDeadlineCheck`); `/live` via
  `live.js` (bootstrap, fixtures, live/liveHistoric, picks, standings);
  `/nyheter` kun RSS; `/api/spiller/:id` bootstrap først, så element-summary.
- **RSS:** uten `NEWS_FEEDS` brukes `DEFAULT_FEEDS` (`news.js:46`) — sidene
  vil prøve å hente RSS via global `fetch`. `news.js:50` bruker
  `Promise.allSettled` per feed → én feilende feed velter aldri siden, og
  `/` gjør `getNews().catch(() => null)`. Mocken skal **kaste** for alle
  verter utenom FPL og loopback; da er «RSS nede» gratis dekket.
- **Nonce og script-telling:** `views/layout.ejs:16` `<script nonce="<%= cspNonce %>">`
  (tema-scriptet) og `:77` `<script src="/app.js?v=…" defer>` — nøyaktig 2.
  CSP-header settes av `createSecurityHeaders()` (middleware.js) med
  `'nonce-…'` og speiles i `res.locals.cspNonce`.
- **Feilhandleren** (`middleware.js:154–205`): `err.status === 503` → side
  503 med overskrift «FPL oppdaterer spillet» / JSON `{ error: 'FPL-API-et
  oppdateres — …' }` på `/api/*`; 4xx fra body-parser (413/400) → riktig
  status som JSON på `/api`.
- **Takstbegrenseren** `rateLimitWrites` (`middleware.js:108`) er **én
  modulinstans** (30 POST/DELETE per IP per 5 min) delt av hele test-
  prosessen → 429-testen må ligge **sist** i fila, og testene før den må
  bruke få skrivende kall.
- **`/api/ai-rad`** (`api.js:171–174`): uten nøkkel → `400 { error: 'AI er
  ikke aktivert …' }` før noe annet skjer. **`/api/scenarier`** (`api.js:89`)
  validerer `name`/`event`/`moves` og skriver `DATA_DIR/scenarios.json`.
- **Mock-mønster som finnes:** `route([[regex, payload]])` i
  `test/players.test.js:466` og `serve(table)` i `test/insights.test.js:680`
  (ukjent sti → 404-svar, riktig). Byggerne `picksFor`, `luckLive`, `dtFor`,
  `bootstrapOf` ligger inne i enkelttester — **ikke refaktorer dem ut**;
  den nye verdenen er sin egen fil.
- **Git:** `core.autocrlf=true`, ingen `.gitattributes`, ingen `.githooks/`,
  `core.hooksPath` er ikke satt. Docs er CRLF i arbeidstreet — Edit-verktøyet.
- **GitHub:** `gh` er innlogget som `maskj2560`; Actions er aktivert på
  repoet, 0 kjøringer så langt. `gh api` i Git Bash trenger stier **uten**
  ledende `/` (ellers omskriver MSYS dem til filstier) eller
  `MSYS_NO_PATHCONV=1`.
- **Kalender:** GW3 starter fredag 4. sep 21:00 og helgen er kampvindu.
  Aldri push mens kamper pågår (`/api/live.json` → `anyLive` må være
  `false`), aldri torsdag 19:00–21:00. Hver deploy koster 2 AI-kall
  (oppstartstikket) — bundle docs-pusher med kode.

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 6 peker hit). Kjør
`git status -sb` (main kan ligge én docs-commit foran origin — det er
prompten selv; ellers skal main = origin/main) og `npm test` + `npm run
lint` som baseline: forventet 767/767 og lint 0 på v1.13.0. Start i
plan-modus, verifiser premissene i docs/prompt-sikkerhetsnett-v1131.md
mot koden (linjenumre kan ha flyttet seg), skriv planen med T-tasks og
testnavn, og be om godkjenning før du skriver kode. Fasiten i prompten er
besluttet av Marius 4. sep — ikke re-spør den.

Regler som gjelder hele økten: CLAUDE.md er fasit (TDD med rød test
først, 0 nye AI-kall — kildelåsen i test/routes.test.js skal være uendret
grønn, ingen nye avhengigheter, docs i samme commit som koden,
Edit-verktøyet på docs fordi de er CRLF, HANDOVER ≤ 200 linjer). Ingen
test skriver til ekte data/ eller gjør nettverkskall utenfor loopback.
Deploy-vindu før push til main: aldri torsdag 19:00–21:00, aldri mens
kamper pågår (GET https://fpl.marsk.no/api/live.json → anyLive må være
false; GW3 spilles fre 4. sep 21:00 og gjennom helgen). Prod-sjekk etter
deploy: footer viser v1.13.1, `<script`-telling i HTML-en på / er
nøyaktig 2, /health er 200 med aiStats, asset-hashen fra /sw.js er
uendret (ba91839a), og `gh run list --branch main --limit 1` viser grønn
kjøring for merge-commiten. Bevis før påstand: vis kommandoen og linjene.

## T1 — app-fabrikk + rute-tester på `feat/sikkerhetsnett-v1131`

1a. Rød test først: opprett test/app.test.js med én test som gjør
`await import('../src/app.js')` og forventer `typeof createApp ===
'function'`. Den feiler i dag (modulen finnes ikke). Sett miljøet ØVERST i
fila, før noen import av src/: FPL_TEAM_ID=42, LEAGUE_IDS='' (tom → ligaen
oppdages fra entry.leagues.classic, som i prod), NEWS_FEEDS='',
ANTHROPIC_API_KEY='', DISCORD_WEBHOOK_URL='', DATA_DIR=<fs.mkdtempSync i
os.tmpdir()> (slettes i after). Dynamisk import etterpå, aldri statisk.

1b. Splitt src/server.js uten atferdsendring. src/app.js eksporterer
`createApp()` som bygger og returnerer Express-appen: alt fra `const app =
express()` t.o.m. `app.use(createErrorHandler(...))`, inkludert
package.json-versjonen, asset-hashen, `startedAt`, `app.locals.clubAssets`,
renderPage-middlewaren og monteringsrekkefølgen (securityHeaders → json →
static → renderPage → ruter → /kalender.ics → /sw.js → /offline → 404 →
feilhandler). Ingen `listen`, ingen `start*()`, ingen `process.on` i
app.js. src/server.js blir ~20 linjer: importer config, createApp,
createShutdown og de tre start-funksjonene; `const app = createApp()`;
listen med samme loggline; SIGTERM/SIGINT; startScheduler,
startAiRefresher, startPriceWatcher. `export default app` fjernes
(ingenting importerer det — verifisert). Oppdater kommentaren i
src/middleware.js:1 («utenfor server.js fordi den starter …» → app.js).
Pek test/middleware.test.js:80 og test/pwa.test.js:70 om til src/app.js
(de blir røde etter flyttingen — det er beviset for at de vokter riktig
fil). Kildelåsen i routes.test.js skal ikke røres.

1c. Den falske FPL-verdenen: test/fixtures/fpl-world.js. Eksporter
`buildWorld()` (et konsistent datasett) og `serveWorld(world, { realFetch
})` som returnerer `{ fetch, calls }`: FPL-URL-er (starter med BASE)
slås opp i en regex-tabell — treff gir `{ ok: true, status: 200, json }`,
ukjent FPL-sti gir `{ ok: false, status: 404, json }` (ALDRI kast — se
retry-fellen); loopback (127.0.0.1) går til realFetch; alle andre verter
kaster `new Error('nett av i test: ' + url)` og registreres i
`calls.outside`. Verdenen må oppfylle disse invariantene, ellers gir
sidene 500: (1) events: GW1 og GW2 `finished: true, data_checked: true`,
GW2 `is_current: true`, GW3 `is_next: true` med `deadline_time` regnet
ved bygging som nå + 2 døgn (nedtellingen bruker ekte klokke); (2)
`entry/42/event/3/picks/` svarer 404 (FPL gir 404 før deadline — /lag og
/brief skal bruke GW2-picks + `entry/42/transfers/`); (3) 15 spillere i
picks GW1 og GW2 med `position` 1–15, `multiplier` 2 for kaptein, 1 for
XI, 0 for benk, `is_captain`/`is_vice_captain`, `entry_history` med
event/points/total_points/bank/value/event_transfers/
event_transfers_cost/points_on_bench/rank/overall_rank, `active_chip:
null`, `automatic_subs: []`; (4) elements med feltene analysis.js,
players.js og insights.js leser (id, code, web_name, first_name,
second_name, team, element_type 1–4, now_cost, status 'a', news '',
chance_of_playing_next_round null, form, total_points, points_per_game,
selected_by_percent, transfers_in_event, transfers_out_event, ep_next,
minutes, goals_scored, assists, expected_goals, expected_assists, bonus,
bps, event_points, cost_change_event, penalties_order,
corners_and_indirect_freekicks_order, direct_freekicks_order) — start
minimalt og legg til feltet en 500-feil etterspør, aldri hele FPL-skjemaet;
(5) `chips` med wildcard/freehit `start_event: 2` (chips.js grupperer på
`stop_event`); (6) teams med id/code/name/short_name der minst én kode
finnes i public/img/clubs (3 = Arsenal) — `app.locals.clubAssets` leser den
ekte mappa; (7) fixtures for GW1–5 med event, team_h, team_a,
team_h_difficulty, team_a_difficulty, kickoff_time, finished, started,
minutes, `stats: []`; (8) `entry/42/` med `leagues.classic:
[{ id: 777, name: 'Testliga', league_type: 'x' }]`, `entry/42/history/`
med `current` for GW1–2, `past` med én sesong, `chips: []`;
`entry/42/transfers/` med ett bytte i GW2 (element_in, element_in_cost,
element_out, element_out_cost, entry, event, time); (9) standings for
777 med to managere (42 og rivalen 43), og `entry/43/history/` +
`entry/43/event/{1,2}/picks/` for rival-radaren; (10) `event/{1,2}/live/`
med `elements[].stats` (minutes, goals_scored, assists, bonus, bps,
total_points, expected_goals, expected_assists) og `explain: []`;
`dream-team/2/` med `team[]` og `top_player`; `element-summary/{id}/` med
`fixtures`, `history`, `history_past` for én spiller. Kopier små hjelpere
fra eksisterende tester ved behov, men la de eksisterende testene stå
urørt.

1d. Oppsett i test/app.test.js: `before` → `globalThis.fetch = serveWorld(
buildWorld(), { realFetch: originalFetch }).fetch`, `app = createApp()`,
`server = app.listen(0, '127.0.0.1')`, `base = 'http://127.0.0.1:' +
server.address().port`. `after` → `server.closeAllConnections()`,
`server.close()`, gjenopprett fetch, slett DATA_DIR-mappa. `beforeEach` →
`clear()` fra src/services/cache.js så hver test måler sin egen henting.
Henger prosessen etter siste test, har noe startet en timer ved import —
det er en feil i 1b, ikke i testen. Hjelper `get(path)`/`post(path, body)`
som returnerer `{ status, headers, text }`.

1e. Testene (rød først, én om gangen; navnene er forslag i husets stil):
- «createApp() bygger appen uten å lytte og uten å starte schedulere»
  (1a, utvidet: `createApp()` returnerer en funksjon med `.use`, og
  fetch-loggen er tom etter kallet).
- Én test per side, generert i en `for … of` over ['/', '/spillere',
  '/lag', '/overganger', '/liga', '/innsikt', '/brief', '/live',
  '/nyheter', '/offline']: «side <sti> svarer 200 med to <script>,
  matchende CSP-nonce og main#innhold». Sjekk: status 200, Content-Type
  text/html, antall forekomster av `<script` er nøyaktig 2, noncen i
  Content-Security-Policy (`'nonce-XXX'`) er identisk med
  `<script nonce="XXX">` i HTML-en, `<main id="innhold"` finnes, teksten
  «Viser data fra» finnes IKKE (cachen er fersk), og «FPL oppdaterer»
  finnes ikke. En 500 her: les feilhandlerens `console.error` — det er
  et manglende felt i verdenen, ikke en appfeil, med mindre feilen er
  reproduserbar med ekte FPL-data (da er det et funn: fiks som `fix:` i
  samme branch og skriv det i CHANGELOG).
- «/health svarer 200 med features av og aiStats null»
  (`features.ai === false`, `features.discord === false`, `teamId ===
  true`, `aiStats === null`, ingen nøkkelverdier i kroppen).
- «/api/brief.json og /api/live.json svarer JSON med no-store og dataAlder
  som tall» (Cache-Control `no-store`, `typeof dataAlder === 'number'`,
  `anyLive === false`, `finished === true` i live.json).
- «/api/spiller/:id henter element-summary én gang, ukjent id gir 404 uten
  kall» (tell `element-summary` i `calls`).
- «POST /api/ai-rad svarer 400 uten ANTHROPIC_API_KEY og treffer aldri
  Anthropic» (`calls.outside` inneholder ingen anthropic-vert).
- «POST /api/scenarier avviser ugyldig kropp med 400 og lagrer gyldig i
  DATA_DIR» (les `scenarios.json` i scratch-mappa; DELETE etterpå gir
  200/204 — bruk maks 3 skrivende kall her).
- «ukjent sti gir 404-siden i layouten» (404, `<script` = 2, main#innhold).
- «versjonert asset er immutable, uversjonert no-cache» (`/style.css?v=
  <assetVersion fra /sw.js>` → `immutable`; `/style.css` → `no-cache`).
- «/sw.js er no-store og bærer asset-hashen; /offline er cachbar av
  workeren» (sw.js `no-store`, inneholder `fpl-<hash>`).
- «FPL 503 gir «FPL oppdaterer spillet» på sider og JSON på /api» (bytt
  verdenens bootstrap-svar til `{ ok: false, status: 503 }`, `clear()`
  først; `/` → 503 med overskriften, `/api/brief.json` → 503 JSON; gjenopprett
  etterpå — merk at `updatingSince` nå er satt: kall `_setNow` eller
  `getBootstrap` med gyldig svar så flagget nullstilles for neste test).
- «sidene tåler at alle RSS-feeder feiler» (`/` og `/nyheter` er 200
  mens `calls.outside` bare inneholder RSS-verter — dette beviser samtidig
  at 0 forespørsler gikk til Anthropic eller Discord).
- «for stor JSON-kropp gir 413 som JSON» (POST 40 kB til /api/scenarier).
- SIST i fila: «skrivende API-kall begrenses per IP med 429 og
  Retry-After» (loop POST /api/ai-rad til 429 kommer; forvent det innen
  31 kall totalt i prosessen; sjekk `Retry-After`).

1f. Kjør hele suiten: forventet ≥ 767 + ~24 nye, lint 0, og kjøretiden
skal ikke øke med mer enn noen sekunder (ingen retry-søvn — se fellene).
Commit i små steg: `refactor(server): createApp() i app.js — server.js
lytter og starter schedulere`, `test(app): falsk FPL-verden + rute-tester
for alle sider`, osv.

## T2 — CI-workflow og pre-push-hook (samme branch)

2a. .github/workflows/ci.yml:

    name: CI
    on:
      push:
      pull_request:
    permissions:
      contents: read
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    jobs:
      test:
        runs-on: ubuntu-latest
        strategy:
          fail-fast: false
          matrix:
            node: [22, 24]
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: ${{ matrix.node }}
              cache: npm
          - run: npm ci
          - run: npm run lint
          - run: npm test

Ingen secrets, ingen `.env` (config.js tåler at den mangler), ingen
nettverkskall i testene → kjøringen er reproduserbar. Push branchen og
vis `gh run list --branch feat/sikkerhetsnett-v1131 --limit 1` grønn før
merge; feiler noe på Node 22 som ikke feiler på 24, er det et
engines-funn.

2b. Pre-push-hook i repoet, .githooks/pre-push (LF, kjørbar):

    #!/bin/sh
    # main går rett i prod — ingen push uten grønn test og lint.
    set -e
    echo "pre-push: npm test + npm run lint"
    npm test --silent
    npm run lint --silent

Legg til .gitattributes med `.githooks/* text eol=lf` FØR hooken commites
(core.autocrlf=true ville ellers gitt CRLF i arbeidstreet, og `sh` feiler
stille på `\r`). Sett kjørbar-bit i indeksen: `git update-index
--chmod=+x .githooks/pre-push`. Nytt npm-script `"hooks": "git config
core.hooksPath .githooks"`; kjør `npm run hooks` én gang lokalt og bevis
med `git config core.hooksPath` → `.githooks`. Beviset for at hooken
virker: første push i 2a skal vise linja «pre-push: npm test + npm run
lint» i push-outputen. Ingen omgåelse innebygd (`git push --no-verify`
finnes, og CLAUDE.md forbyr den allerede).

2c. Push-flyt som regel i CLAUDE.md (Konvensjoner → Commits): feature-
branch → push → `gh run watch` (eller `gh run list --branch <navn>`)
grønn → merge `--no-ff` → push main. Hooken kjører test + lint lokalt
uansett; CI-en er andre lag og eneste bevis på Node 22.

## T3 — docs og release

3a. CHANGELOG under [1.13.1] med dato: Lagt til — CI-workflow (Node 22/24),
pre-push-hook + `npm run hooks`, rute-tester for alle sider og endepunkter
mot en falsk FPL-verden (test/app.test.js, N tester). Endret — server.js
splittet i app.js (`createApp()`) + server.js, ingen atferdsendring.
`npm version patch --no-git-tag-version` (footeren leser package.json).

3b. CLAUDE.md: arkitekturkartet får `src/app.js createApp(): ren fabrikk
(monterer alt, lytter aldri, starter ingen timer)` og `src/server.js`
omskrives til «lytt, SIGTERM, schedulere». `test/`-linja nevner
app.test.js + fixtures/fpl-world.js (full stack på loopback, mocket fetch
med kast for fremmede verter). Konvensjoner: push-flyten fra 2c og at
hooken aktiveres med `npm run hooks`. Deploy-avsnittet: CI-en er
sikkerhetsnettet før merge, prod-sjekken består. Hold fila ≤ 200 linjer.

3c. README.md: linje ~86 (`src/server.js oppstart, middleware,
feilhåndtering`) → app.js + server.js; kommandolista får `npm run hooks`;
en setning om CI. DEPLOY.md: avsnitt «Før push» med hook + CI-flyt.
`.env.example` er uendret (ingen ny variabel).

3d. HANDOVER.md: statusblokk for v1.13.1 (testtall, CI-kjøring-URL/ID,
hash uendret), driftslærdom «branch protection er utilgjengelig på gratis
privat repo — vakten er hook + CI; `npm run hooks` må kjøres på ny maskin»,
§ 6 i «Neste steg» markeres utført, loggpost, denne prompten slettes
(`git rm docs/prompt-sikkerhetsnett-v1131.md`) og Dokumentkart-raden i
ROADMAP fjernes. ROADMAP: versjonsplan-raden v1.13.1 huket av, § 6
strøket. ≤ 200 linjer (roter til historikkfila om nødvendig).

3e. Release: merge `--no-ff` til main med `-m` (ikke `-F -`), annotert tag
v1.13.1, deploy-vindu-sjekk, push main + tag, prod-sjekk som i prompten,
branch slettet. `gh run list --branch main --limit 1` grønn — noter run-ID
i HANDOVER.

## Feller (lest av folk som har gått i dem)

- **Retry-søvn:** en mock som kaster for en FPL-sti gir `sleep(RETRY_DELAYS)`
  per forsøk. Svar 404-objekt. Ser en test ut til å ta > 1 s, er det dette.
- **Global fetch er også testens verktøy:** loopback må passere til den
  ekte `fetch` — ellers tester du mocken mot seg selv.
- **Miljø før import:** `config.js` fryser config ved første import og
  `loadEnvFile` overskriver ikke satte variabler. Alt i `process.env`
  må settes øverst i testfila, og `src/` importeres dynamisk etterpå.
- **Takstbegrenseren er global i prosessen:** 429-testen sist, og hold
  skrivende kall før den under 10.
- **`updatingSince` er modultilstand i fplClient.js:** etter 503-testen
  må et vellykket svar (eller `_setNow` 5 min frem) nullstille flagget,
  ellers viser neste side «FPL oppdaterer»-banneret.
- **Keep-alive holder serveren åpen:** `server.closeAllConnections()`
  før `server.close()`, ellers henger `node --test` etter grønn kjøring.
- **`data_checked`:** ligarapporten og /innsikt ser bare på runder med
  `finished && data_checked`. Uten flagget blir /innsikt tom (ikke 500).
- **CRLF:** hooken MÅ være LF (`.gitattributes` først). Docs endres med
  Edit-verktøyet; `sed -i` er forbudt.
- **`gh api` i Git Bash:** `gh api repos/...` uten ledende `/`.
- **Deploy koster 2 AI-kall:** ikke push docs for seg — alt i én push.

## Ferdigkriterier

- `main` = `origin/main`, tag v1.13.1 pushet, branchen merget `--no-ff` og
  slettet.
- `npm test` grønn med minst 790 tester (767 + rute-testene), `npm run
  lint` 0, kjøretid < 20 s lokalt. Kildelåsen i routes.test.js uendret.
- `.github/workflows/ci.yml` finnes; `gh run list --branch main --limit 1`
  viser grønn kjøring for merge-commiten på både Node 22 og 24.
- `.githooks/pre-push` (LF, kjørbar) + `.gitattributes` + `npm run hooks`;
  `git config core.hooksPath` → `.githooks` lokalt; push-outputen viste
  hook-linja.
- `src/app.js` eksporterer `createApp()`; `src/server.js` er den eneste
  fila som lytter og starter schedulere; ingen test importerer server.js.
- Prod: footer v1.13.1, `<script` = 2, /health 200 med `aiStats`, hash
  `ba91839a` uendret, 6 sider 200.
- 0 nye AI-kall i noen tilstand, 0 nye avhengigheter, 0 Discord-meldinger.
- CLAUDE.md ≤ 200 linjer, HANDOVER ≤ 200 linjer, prompten slettet,
  CHANGELOG/README/DEPLOY/ROADMAP ajour i samme commit som koden.

## Etter økten

- Alt grønt: prompten er slettet av økten selv (3d). Marius' egne punkter
  (STEG 7 under kamp, 9c, 9e, telefon, `kill 1`) står fortsatt i HANDOVER.
- Stoppet underveis (usage-grense): HANDOVER skal si nøyaktig hvilken
  T-task som er ferdig og hvilken branch som er åpen — neste økt fortsetter
  derfra med denne fila som fasit.
- Neste kandidater etter dette (ikke besluttet, bare notert i økt 57):
  B funksjonssveip mot ubrukte FPL-felt, C funksjonsgjennomgang → småfiks
  (à la v1.7.1), D slanking av style.css/app.js.
