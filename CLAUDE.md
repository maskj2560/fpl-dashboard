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
```

## Arkitektur

```
src/server.js      oppstart og montering (starter lytteren ved import)
src/middleware.js  rene middleware-byggere: cacheControlFor, createErrorHandler
                   (ligger utenfor server.js så de kan testes)
src/config.js      env-variabler: PORT, FPL_TEAM_ID, LEAGUE_IDS, TZ,
                   NEWS_FEEDS, ANTHROPIC_API_KEY (valgfri), AI_MODEL,
                   DISCORD_WEBHOOK_URL (valgfri), BRIEF_HOURS_BEFORE_DEADLINE
src/routes/        tynne ruter: én fil per side + api.js
src/services/
  fplClient.js     ENESTE modul med nettverkskall til FPL-API-et
  cache.js         TTL-cache med stale-while-revalidate, in-flight dedup
                   og 30 s backoff per nøkkel etter mislykket revalidering
  analysis.js      rene funksjoner: kaptein-/transferanbefalinger, FDR, differensialer
  brief.js         gameweek-briefen: buildBrief (ren data), assembleBrief
                   (henter fra FPL), generateAiBrief (AI-teksten, delt av
                   /brief og auto-briefen)
  live.js          live-visningen: buildLive (ren data), assembleLive (henter)
  transfers.js     «Overganger»-siden: buildTransferAnalysis (ren hva
                   hvis-analyse av egne transfers), assembleTransferAnalysis
                   (henter — maks 38 live-kall, aldri element-summary)
  leagues.js       hvilke ligaer som vises; knownLeagueCount() for /health
  ai.js            felles Claude API-service: lazy init, modell fra config,
                   cache med minimumsintervall per funksjon
  news.js          RSS-nyheter + valgfri AI-oppsummering (via ai.js, cachet)
  notify.js        deadline-scheduler + Discord-webhook for auto-brief (valgfri)
views/             EJS med layout + partials
public/            style.css (CSS-variabler i :root), app.js (vanilla JS)
test/              node:test — ingen nettverkskall. Fakes injiseres via små
                   test-hooks (_setNow/_flush/clear i cache.js, _setClient/
                   _setNow/_reset i ai.js, _send/_setHooks/_reset i notify.js)
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
  server cachet data med banner, ikke krasj
- Live-data (`event/{gw}/live/`) caches maks 1 min; entry/picks/transfers
  5 min. Ferdige runder hentes via `getLiveHistoric(gw)` — samme endepunkt
  og cache-nøkkel, 6 t TTL (poengene er i praksis immutable); kalles kun
  når bootstrap sier runden er `finished`
- Frontend poller live-data kun mens kamper pågår — aldri poll utenfor
  kampvinduer, og all polling går via serverens cache (aldri rett mot FPL)

## AI-funksjoner (valgfrie — appen krever aldri nøkkel)

Alle AI-kall går gjennom `ai.js`. Modell konfigureres med `AI_MODEL`
(default `claude-sonnet-5`; `claude-haiku-4-5` er billig-alternativet).
Fire funksjoner, alle kun aktive når `ANTHROPIC_API_KEY` er satt:

1. **Nyhetsoppsummering** (`news.js`): RSS-titler + ingresser oppsummeres til
   korte norske FPL-punkter. Maks én generering per 30 min, `max_tokens` 2000.
2. **AI-gameweek-brief** (/brief): modellen skriver hele briefen på norsk fra
   data-briefens JSON. Maks én generering per time, `max_tokens` 4000.
   Data-briefen er alltid fallback.
3. **AI transfer-rådgiver** (/lag): kun ved klikk, cachet 1 time,
   `max_tokens` 4000.

`max_tokens` er satt romsligere enn svarlengden tilsier fordi adaptiv tenkning
på Sonnet 5 trekker fra samme budsjett — taket hindrer avkortede svar, og
ubrukte tokens koster ingenting. Lengden styres av instruksjonene i prompten.
4. **Auto-brief** (`notify.js`): postes til `DISCORD_WEBHOOK_URL` X timer før
   deadline (`BRIEF_HOURS_BEFORE_DEADLINE`, default 24). 1–2 kall per uke.
   Bruker samme `generateAiBrief()` som /brief, så de to kan ikke divergere.

Ved feil eller tomt svar venter `ai.js` 5 minutter før nytt forsøk på samme
nøkkel (`FAILURE_BACKOFF_MS`), slik at en ugyldig nøkkel ikke gir ett betalt
kall per sidebesøk.

Kostnadsregler: alt on-demand + cachet for alle besøkende, korte prompts.
Uten nøkkel vises rå data (feed-liste, data-brief) — AI er alltid et tillegg,
aldri et krav.

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
- **Design**: mørkt tema, alle farger som CSS-variabler i `:root`,
  systemfonter, ingen eksterne CDN-er, responsivt.

## Handover (VIKTIG — les først i ny økt)

`docs/HANDOVER.md` er den levende overleveringsfilen. Den oppdateres ved hver
milepæl og ved arbeidsstans, og inneholder: nøyaktig status, neste steg,
åpne beslutninger og kjente feil. **Start alltid en ny økt med å lese den.**
Nærmer økten seg brukerens usage-grense (~95 %): stopp, oppdater
`docs/HANDOVER.md` grundig, commit alt.

## Deploy

Coolify bygger fra Dockerfile ved push til `main` (webhook/auto-deploy).
Det som merges til `main` går altså rett i prod — hold `main` grønn.
Env-variabler settes i Coolify, aldri i repoet. `.env` er gitignored;
`.env.example` holdes oppdatert.
