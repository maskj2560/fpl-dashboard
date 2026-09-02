# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-02 (økt 54, Fable: Chrome-QA-ens 11 funn fikset
og ute som v1.12.1 — neste: Marius' visuelle re-sjekk, se «Neste steg»)

## Status akkurat nå
- **v1.12.1 «QA-fikser» i prod 2. sep (økt 54).** Chrome-QA-en ga 6 VIKTIG
  + 5 KOSMETISK; alle 11 fikset med rød test først på `fix/qa-viktig-v1121`
  (funn 1–6) og `fix/qa-kosmetisk-v1121` (7–11), merget `--no-ff`.
  **756/756 + lint 0** (baseline 743), røyktest grønn (0 AI-kall).
  /live-banneret var IKKE drift, men delt cache-nøkkel (se driftslærdom).
  Marius' valg: FDR-4 → `#e6003c`, chip uten anbefaling → grå pille.
- **v1.12.0 «PWA» i prod 2. sep (økt 53) — SISTE release i sluttpakka.**
  Bygget på `feat/pwa-v1120`, T1–T4 med rød før grønn: `make-pwa-icons.mjs`
  (PNG med kun node:zlib) + committede ikoner, `manifest.webmanifest` +
  PWA-meta i layout (`ICON_VERSION`), `src/pwa/sw.js` på /sw.js (ekte
  asset-hash, no-store, nett-først med `/offline` som fallback), `/offline`,
  registrering i app.js. **743/743 + lint 0** (baseline 729). Prod: hash
  `b6c8f095`, `/sw.js` no-store med `fpl-b6c8f095`, manifest immutable,
  /offline 200, nøyaktig 2 `<script`.
- **v1.9.0–v1.11.0 i prod 2. sep** (691 → 710 → 729 tester; kalender,
  Lagsjekk, chip-planlegger, prisvarsler, karriere, merkedager, bonuskamp):
  detaljer rotert til historikkfila. Prisvarslene: **første natt etter en
  deploy gir ingen melding** (bare snapshot) — ventes natt til 4. sep.
- **Sluttrydding gjort 2. sep:** planen arkivert, `docs/oppgaveliste.md`
  slettet, **`docs/qa-chrome-prompt.md`** skrevet (STEG 1–10 + fasit).
- **v1.8.3 «Herding + tilgjengelighet» i prod 2. sep** (655/655; prod-sjekk
  gjort: CSP-header live, nøyaktig 2 `<script`). Detaljer rotert til
  historikkfila. Hver prod-sjekk videre: `<script`-tellingen skal være 2.
- **Asset-hashen i prod er `b6c8f095` etter v1.12.0** (v1.11.0: `4718ea73`; v1.9.0/v1.10.0: `82d7c7a2`; v1.8.3: `6a3b2714`; før det v1.8.2
  `257cfce2` — metoden kontrollert mot v1.8.2-blobbene). Regnet fra
  git-blobbene, aldri fra arbeidstreet.
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
**Neste: Marius re-kjører STEG 2, 3 og 5 i `docs/qa-chrome-prompt.md` på
390 + 1440** — layout-funnene (3, 4, 5, 7, 9, 11) har bare CSS-låser i
node:test, ikke visuell måling. Nye funn → `fix/`-branch, TDD, v1.12.2.
Ingen funn → ROADMAP § 1 (P4, løpende) og «Senere / idéer».

| Versjon | Innhold | Branch | Status |
| --- | --- | --- | --- |
| v1.8.3 | Herding (CSP m/ nonce, sikkerhetshoder, JSON-tak, takstbegrensning) + tilgjengelighetspass + branch-rydding | `fix/herding-a11y-v183` | **ute 2. sep, 655/655** |
| v1.9.0 | Planleggingspakka: chip-planlegger (/lag), deadline-sjekk «Lagsjekk» (/brief + Discord ved funn), `/kalender.ics` + P3-verifisering mot en rivals transfers | `feat/planleggingspakka-v190` | **ute 2. sep, 691/691** |
| v1.10.0 | Prisvarsler: timesnapshot i `DATA_DIR/price-state.json`, Discord maks 1/natt, kort på /overganger | `feat/prisvarsler-v1100` | **ute 2. sep, 710/710** |
| v1.11.0 | Karriere-pakka: FPL-karrieren + merkedager (/innsikt), bonuskamp (BPS-race) på /live | `feat/karriere-v1110` | **ute 2. sep, 729/729** |
| v1.12.0 | PWA: manifest, ikoner (eget PNG-skript, kun node:zlib), `/sw.js` nett-først, `/offline` | `feat/pwa-v1120` | **ute 2. sep, 743/743** |

Sluttrydding utført 2. sep. Chrome-QA kjørt 2. sep → v1.12.1 ute samme
dag. Gjenstår: visuell re-sjekk (Marius, punkt 4 under).

**Kun Marius kan gjøre:**
1. `kill 1` i containerterminalen → «SIGTERM mottatt — lukker serveren» +
   «Serveren lukket ryddig» (siste bevis for v1.3.5).
2. Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px, ikke ekte touch).
3. Kostnad i `console.anthropic.com` (P4, løpende).
4. Re-sjekk av layout-fiksene i v1.12.1 (STEG 2, 3, 5 på 390 + 1440) og
   de utestede stegene: STEG 7 (/live mens en kamp pågår), 9c (installer-
   tilbudet i adresselinja) og 9e (offline-modus i DevTools).

## Driftslærdommer (ikke glem disse)

- **Stale-banner på /live mellom runder = delt cache-nøkkel, ikke nett
  (v1.12.1, QA-funn 6).** `live:N` deles av `getLive` (1 min) og
  `getLiveHistoric` (6 t); første skriver setter TTL-en. Etter /innsikt fikk
  /live 6 t-verdien som «fersk», ingen revalidering, og 10-min-taket ga
  banner i timevis mens FPL svarte 200. Diagnose: to kall på
  `/api/live.json` med mellomrom — stiger `dataAlder` mens `/api/brief.json`
  er fersk, er det cachen. Fiks: `getLiveHistoric` + `staleInfo(gw,
  { finished: true })` for ferdige runder.
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
- **Per-funksjon-AI-kostnad kan ikke måles retroaktivt:** Coolify-loggen er
  100 linjer og nullstilles ved deploy — samle `AI-kall:`-linjene løpende.
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

- 2026-09-02 (økt 54, Fable): Marius limte inn QA-rapporten fra Claude for
  Chrome (v1.12.0, 13:15–14:00: STEG 1/6/8/10 OK, STEG 7 og 9c/9e ikke
  testet, 6 VIKTIG + 5 KOSMETISK, 12 skjermbilder). Handling: plan-modus —
  rotårsak per funn bekreftet i kode og mot prod/FPL (live.json fryst på
  2929 s mens FPL svarte 200; bootstrap-chips med `start_event` 2), ett
  spørsmålssett (funn 2 → grå pille, funn 11 → `#e6003c`; anbefalingene
  valgt), plan godkjent. Så «Fortsett» → begge branchene bygget med rød
  test først, merget `--no-ff`, 756/756 + lint 0, røyktest grønn, docs
  ajour (CHANGELOG [1.12.1], ROADMAP-rad + § 0 ferdig, CLAUDE.md, QA-fasit
  STEG 3b, arkivplanens FDR-tabell), loggpostene fra økt 53 rotert til
  historikkfila, tag `v1.12.1`, push, prod-sjekk.

