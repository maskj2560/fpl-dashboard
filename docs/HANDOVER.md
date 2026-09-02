# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-02 (økt 56, Fable: vedlikeholdspakka — v1.12.2
ute, v1.13.0 bygget, se «Neste steg»)

## Status akkurat nå
- **v1.13.0 «AI-statistikk» bygget 2. sep (økt 56)** på `feat/ai-stats-v1130`:
  teller per cacheKey i `ai.js` (calls/tokens/failures/lastAt/model + since)
  → `DATA_DIR/ai-stats.json`, `aiStats` på /health via `healthPayload()`.
  **767/767 + lint 0** (baseline 758). Røyktest med tomme nøkler:
  `aiStats: null`, ingen fil skrevet. Prod-sjekk: under.
- **v1.12.2 «Vedlikehold» i prod 2. sep 20:52 (økt 56)** på
  `fix/hygiene-cache-keys-v1122`: `npm audit fix` (qs 6.16.0, audit ren),
  fast-xml-parser 5.11.1, `node:24-alpine`, egne `:hist`-nøkler (rotårsak
  QA-funn 6) + `finished` i `/api/live.json`. **758/758 + lint 0** (baseline
  756). Røyktest på Node 24: alle sider 200, 0 DEP0169. Prod-sjekk 20:55:
  footer v1.12.2, `<script` 2, /health 200, `dataAlder` 0 (ikke null), sw.js
  no-store, 6 sider 200, hash `ba91839a` (uendret). Merk: `git merge -F -`
  leser IKKE stdin — bruk `-m` (feiltaggen ble slettet og satt på nytt).
- **v1.12.0 «PWA» + v1.12.1 «QA-fikser» i prod 2. sep** (743 → 756 tester;
  re-QA 11/11 FIKSET): statusblokkene rotert til historikkfila. Rapport:
  `docs/arkiv/qa-rapport-v1121.md`. Marius' valg: FDR-4 `#e6003c`, grå pille.
- **v1.8.3–v1.11.0 i prod 2. sep** (655 → 729 tester): statusblokkene rotert
  til historikkfila. Prisvarslene: første melding ventes natt til 4. sep.
- **Asset-hashen i prod er `ba91839a` etter v1.12.1** (v1.12.0 `b6c8f095`,
  v1.11.0 `4718ea73`, v1.9/1.10 `82d7c7a2`, v1.8.3 `6a3b2714`). Regnes fra
  git-blobbene. Prod-sjekk v1.12.1 (2. sep 17:20): 12/12 OK, sw.js no-store.
- **Ekte SIGTERM-bevis mangler.** Beviset er `kill 1` i containerterminalen —
  de to avslutningslinjene skal stå der. Lokalt bevist med
  `process.emit('SIGINT')`, exit 0.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
- **Kostnad: måleuka DROPPET** (28. aug) — følges i `console.anthropic.com`,
  terskler i `docs/sjekkpunkt-d-kostnad.md`. Takt **~49–53 AI-kall/uke**;
  alt i sluttpakka legger til **0**.
- **Git:** de 13 gamle lokale branchene er slettet (10 med `-d`, 3 med `-D`
  etter Marius' beslutning) — kun `main` finnes (alle fem feature-branchene
  i sluttpakka er merget `--no-ff` og slettet). Tagger t.o.m. `v1.12.0`.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

**Sluttpakka (v1.8.3–v1.12.0) og QA-fiksene (v1.12.1) er i prod 2. sep.**
Planen er arkivert i `docs/arkiv/plan-sluttpakka-v183-v1120.md`
(beslutningsfasit med 9 punkter — ikke re-spør). ROADMAP § 0 er ferdig.
**Re-QA bestått 2. sep (11/11 FIKSET, 0 nye funn).** § 0 ferdig. Økt 56
kjører `docs/prompt-vedlikehold-v1122-v1130.md` (ROADMAP § 5): plan godkjent
av Marius, v1.12.2 ute 20:52 (758/758), v1.13.0 bygget (767/767), så
docs-slanking. Prompten slettes når alt er ute.

**Majors vurdert 2. sep (kun rapport — ikke oppgradert, Marius' fasit):**
- `ejs` 3.1.10 → 6.0.1: v4 fjernet `client`-flagget + Jake, v6 er dual
  ESM/CJS; appen bruker kun `view engine` + `include()` → lav risiko, men
  tomme releasenotes — bevis med `npm i ejs@6 && npm test` når det passer.
- `eslint`/`@eslint/js` 9.39 → 10.x: Node-krav ok, flat config ok; tre nye
  regler i recommended (`no-unassigned-vars`, `no-useless-assignment`,
  `preserve-caught-error`) kan gi lint-feil — kjør lint etter bump.
- `globals` 16.5 → 17.12: eneste brudd er `audioWorklet` skilt fra
  `browser`; vi bruker `nodeBuiltin`/`browser`/`serviceworker` → trygg.

**Kun Marius kan gjøre:**
1. `kill 1` i containerterminalen → «SIGTERM mottatt — lukker serveren» +
   «Serveren lukket ryddig» (siste bevis for v1.3.5).
2. Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px, ikke ekte touch).
3. Kostnad i `console.anthropic.com` (P4, løpende).
4. ~~Re-sjekk av v1.12.1 i Chrome~~ — **utført 2. sep, 11/11 FIKSET.**
   Gjenstår: STEG 7 (/live under kamp, fre 4. sep fra 21:00), 9c
   (installer-tilbud), 9e (offline i DevTools); etter første bytte: stat-
   fliser på /overganger (390 px) + «−0,3» i Prisgevinst (ikke sett 2. sep).

## Driftslærdommer (ikke glem disse)

- **Stale-banner på /live mellom runder = delt cache-nøkkel, ikke nett
  (v1.12.1, QA-funn 6) — fellen LUKKET i v1.12.2.** `live:N` ble delt av
  `getLive` (1 min) og `getLiveHistoric` (6 t); første skriver satte TTL-en.
  Lukket slik: historic-variantene (live/picks/entry-history) har egne
  nøkler med suffiks `:hist`, `staleInfo(gw, { finished: true })` måler
  hist-nøkkelen, `/api/live.json` sender `finished` (ellers `dataAlder`
  null); låst av fplClient.test.js + kildelås i routes.test.js. Diagnose: to
  `/api/live.json`-kall — stiger `dataAlder` mens FPL svarer, er det cachen.
- **FPL-bootstrap `chips[]`: wildcard og Free Hit har `start_event` 2** (kan
  ikke spilles i runde 1) — halvdeler grupperes på `stop_event`, aldri på
  (start, stopp)-paret.
- **401 med `Basic realm="traefik"`: sjekk FØRST om «HTTP Basic
  Authentication» er huket av for appen i Coolify.** Haken henger en
  basicauth-middleware på HTTPS-routeren og rammer ALLE stier, også
  `/health`; realmnavnet er Traefiks standard, ikke tegn på manglende rute
  (som ville gitt 404). Redeploy hjelper ikke — fjern haken (løst 25. aug).
- **Coolifys «Running (healthy)» sier bare at appen svarer INNE i
  containeren.** Coolifys egen HTTP-sjekk overstyrte Dockerfilens og brukte
  `curl`, som ikke finnes i `node:22-alpine` → «healthy» mens prod svarte
  401 på alt (fikset 25. aug: Coolifys sjekk AV). Også den riktige sjekken
  går utenom Traefik — «prod svarer rart» feilsøkes ALLTID utenfra først.
- **`kill 1` virker FRA v1.3.5 — før det gjorde det ingenting** (målt
  25. aug: null effekt, containeren restartet aldri). PID 1 i et
  container-namespace mottar kun signaler den har egen handler for, og
  appen hadde ingen. Med `createShutdown` på plass er `kill 1` i
  containerterminalen den trygge måten å bevise ryddig avslutning:
  containeren restartes av `unless-stopped` og BEHOLDER loggen.
  Aldri `docker stop`/`kill` på prod — da blir den liggende nede.
- **Restart serveren etter endringer i `src/`** — ESM lastes én gang.
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken hentes på nytt hver sesong:** `npm run fetch-clubs` + bump
  `IMG_VERSION` i `src/middleware.js` i SAMME commit, ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutine: DEPLOY.md.
- **ALLE docs er CRLF i arbeidstreet (LF i indeksen, `core.autocrlf=true`;
  ROADMAP har BOM).** Et node-`replace` med `\n` i søkestrengen MATCHER IKKE
  og feiler STILLE — det skjedde med to CHANGELOG-tillegg i økt 45. Bruk
  Edit-verktøyet på docs. `sed -i` er forbudt. Nye filer skrives med LF;
  git normaliserer.
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser `.env` UANSETT `--env-file`. Sett
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME i en scratchpad-.env
  (eller i `process.env` før import) — de settes først og overskrives ikke.
  Verifiser med `/health` → `ai:false, discord:false`.
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip er GRATIS fra v1.3.4** (verifisert i prod 25. aug):
  `/brief` og `/nyheter` leser kun cachen. T.o.m. v1.3.3 kostet hvert besøk
  et AI-kall. Unntaket består: klikk ALDRI «Spør AI om råd» på `/lag` i en
  verifisering — det er det eneste stedet et klikk kan utløse et kall.
- **Per-funksjon-AI-kostnad leses på `/health` (fra v1.13.0):** `aiStats`
  har `since`, `totals` og `byKey.<cacheKey>` (calls/inputTokens/
  outputTokens/failures/lastAt/model), persistert i volumets
  `ai-stats.json` — overlever deploy. Coolify-loggen (100 linjer,
  nullstilles ved deploy) trengs ikke lenger for dette.
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets. Ufarlig — all HTML refererer versjonerte URL-er.
- `ai.js` sender bevisst ikke `thinking`/`effort` (feiler på Haiku 4.5);
  `max_tokens` er romslig pga. adaptiv tenkning på Sonnet 5.
- Liganavnet «Var Har Skylda» kommer slik fra FPL-API-et (liga 1397750,
  Marius er admin) — ikke en kodefeil.
- JSON i `views/live.ejs` escaper `<` fordi lagnavn kommer fra andre
  FPL-brukere — ikke fjern escapingen.
- **Picks for kommende runde er ikke offentlige før deadline** (API-et gir
  404). Alt som skal se «laget for runde N» før deadline må bruke picks fra
  N−1 + `entry/{id}/transfers/` (som ER synlig før deadline).
- `event_transfers_cost` ligger i `history.current` (per runde), ikke på
  radene i `entry/{id}/transfers/` (verifisert 2. sep mot en rival).

## Brukerens beslutninger (IKKE re-spør)

- Tiltale: **Marius** — alle svar starter med «Hei Marius!».
- AI-modell: `claude-sonnet-5` via `AI_MODEL`-env (`claude-haiku-4-5` billig-alternativ).
- Kostnadskrav: AI billig for én person — alt on-demand + cachet.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.
- UI-overhalingen (økt 30): de 15 designbeslutningene står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen gjelder
  videre: ett spørsmålssett om gangen, anbefaling først.
- Doks-opprydningen (økt 24): konsumerte prompter slettes, utførte planer
  arkiveres til `docs/arkiv/`, docs/-rot holdes lav, HANDOVER-tak 200
  linjer med rotering til historikkfila.
- **v1.8.0 (1. sep):** fasit i `docs/arkiv/plan-spillerpakka-v180.md`.
- **Sluttpakka (1. sep, økt 53):** 9-punkts fasit i
  `docs/arkiv/plan-sluttpakka-v183-v1120.md` — bl.a. AI-økten merger/pusher selv
  per versjon, 0 nye AI-kall, ingen e-post/spillerbilder/Playwright i repo,
  Lagsjekk-grunnlag = picks N−1 + bytter, prisdelta med norsk komma,
  `-D` på de tre umergede branchene.
- Eldre, fortsatt gyldige beslutninger: rotert til historikkfila.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-09-02 (økt 55, Fable): Marius limte inn re-QA-rapporten fra Claude
  for Chrome (17:45–18:20: STEG 1–3 OK, 11/11 FIKSET, 0 nye funn, begge
  temaer, 390 + 1440). Handling: plan-modus, plan godkjent → rapporten
  arkivert (`docs/arkiv/qa-rapport-v1121.md`), re-QA-prompten slettet,
  økt 54-posten rotert, HANDOVER/ROADMAP/VIDERE ajour, 0 kode, én commit.
- 2026-09-02 (økt 55): «Er det noe du kunne anbefalt å gjøre som du kan
  gjøre? … skriv en planleggingsprompt til fable» → seks kandidater med bevis,
  Marius valgte 1–4 (ingen ekstra) → `docs/prompt-vedlikehold-v1122-v1130.md` + § 5.

