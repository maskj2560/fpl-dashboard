# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-02 (økt 53, Fable: hele sluttpakka v1.8.3–v1.12.0
bygget, merget og i prod; sluttrydding gjort — neste: Chrome-QA, se «Neste steg»)

## Status akkurat nå
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

**Sluttpakka er levert: v1.8.3–v1.12.0, alle i prod 2. sep.** Planen er
arkivert i `docs/arkiv/plan-sluttpakka-v183-v1120.md` (beslutningsfasit
med 9 punkter — ikke re-spør). **Neste: Marius kjører
`docs/qa-chrome-prompt.md` i Claude for Chrome mot prod.** Kommer det funn:
én `fix/`-branch per alvorlighet, TDD (rød før grønn), CHANGELOG-linje per
fiks, release som v1.12.1. Ingen funn: kryss av Chrome-QA i ROADMAP § 0.

| Versjon | Innhold | Branch | Status |
| --- | --- | --- | --- |
| v1.8.3 | Herding (CSP m/ nonce, sikkerhetshoder, JSON-tak, takstbegrensning) + tilgjengelighetspass + branch-rydding | `fix/herding-a11y-v183` | **ute 2. sep, 655/655** |
| v1.9.0 | Planleggingspakka: chip-planlegger (/lag), deadline-sjekk «Lagsjekk» (/brief + Discord ved funn), `/kalender.ics` + P3-verifisering mot en rivals transfers | `feat/planleggingspakka-v190` | **ute 2. sep, 691/691** |
| v1.10.0 | Prisvarsler: timesnapshot i `DATA_DIR/price-state.json`, Discord maks 1/natt, kort på /overganger | `feat/prisvarsler-v1100` | **ute 2. sep, 710/710** |
| v1.11.0 | Karriere-pakka: FPL-karrieren + merkedager (/innsikt), bonuskamp (BPS-race) på /live | `feat/karriere-v1110` | **ute 2. sep, 729/729** |
| v1.12.0 | PWA: manifest, ikoner (eget PNG-skript, kun node:zlib), `/sw.js` nett-først, `/offline` | `feat/pwa-v1120` | **ute 2. sep, 743/743** |

Sluttrydding utført 2. sep (docs, HANDOVER ≤ 200, oppgaveliste →
`docs/qa-chrome-prompt.md`). Gjenstår: Chrome-QA (Marius), evt. v1.12.1.

**Kun Marius kan gjøre (uendret):**
1. `kill 1` i containerterminalen → «SIGTERM mottatt — lukker serveren» +
   «Serveren lukket ryddig» (siste bevis for v1.3.5).
2. Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px, ikke ekte touch).
3. Kostnad i `console.anthropic.com` (P4, løpende).

## Driftslærdommer (ikke glem disse)

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

- 2026-09-01 (økt 53, Fable): «Lag en lang og detaljert plan over alle
  planer og funksjoner som skal fikses på eller lages. Alt skal lages og
  gjøres ferdig. Full QA etterpå med Claude in Chrome — lag prompten til
  slutt. Legg til egne ting som bør gjøres. Når planen er godkjent,
  begynn å jobbe.» Handling: tre spørsmålsrunder (omfang, deploy-policy,
  AI-budsjett, egne tillegg, plassering, Lagsjekk-funn, rekkefølge,
  prisformat, brancher, Lagsjekk-grunnlag) → plan godkjent →
  `docs/plan-sluttpakka-v183-v1120.md` + denne fila rotert (økt 50/51 →
  historikkfila). Baseline verifisert: 626/626 + lint 0 på main. Så
  bygget v1.8.3 (T1–T7, røyktestfunn, 655/655), deploy-vindu sjekket
  (natt til onsdag, `anyLive:false`), merget `--no-ff`, tagget, pushet.
  Deretter v1.9.0 på `feat/planleggingspakka-v190`: T1–T9 (chips.js,
  deadline.js + notify-timer, calendar.js + rute, P3 verifisert read-only
  mot `entry/7185653/transfers/` — feltene stemmer), 691/691 + lint 0,
  røyktest grønn (0 AI-kall), deploy-vindu (onsdag 00:32, `anyLive:false`),
  merget `--no-ff` `28d34fb`, tag `v1.9.0`, pushet; prod: hash `82d7c7a2`,
  `/kalender.ics` 200 (272 VEVENT), Lagsjekk og chip-planlegger synlige.
  Så v1.10.0 på `feat/prisvarsler-v1100`: T1–T5 (prices.js: snapshot/
  diff/beslutning/rapport/timer, kort på /overganger, kildelås), 710/710
  + lint 0, røyktest grønn (første snapshot 629 priser, 0 AI-kall),
  deploy-vindu (onsdag 00:44), merget `--no-ff` `7f64ba8`, tag `v1.10.0`,
  pushet; prod: v1.10.0 live, hash uendret `82d7c7a2`, /overganger 200.
- 2026-09-02 (økt 53, Fable): «Fortsett.» → v1.11.0 på `feat/karriere-v1110`:
  T1–T5 (buildCareer, buildBadges/gwsAllPlayed, kortene på /innsikt +
  entry history i assembleInsights, topBps, bpsRaceHtml), 729/729 + lint
  0, røyktest grønn (0 AI-kall), deploy-vindu (onsdag 12:23, `anyLive:
  false`), merget `--no-ff` `4d7c065`, tag `v1.11.0`, pushet; prod: hash
  `4718ea73`, /innsikt-kortene og bpsTop i live.json verifisert. Deretter
  v1.12.0 på `feat/pwa-v1120`: T1–T4 (ikonskript + ikoner, manifest +
  layout + ICON_VERSION, sw.js + /sw.js + /offline, registrering), 743/743
  + lint 0, røyktest grønn, deploy-vindu (onsdag 12:36), merget `--no-ff`
  `1ff9ed2`, tag `v1.12.0`, pushet; prod: hash `b6c8f095`, /sw.js,
  manifest, /offline verifisert. Sluttrydding: plan arkivert, oppgaveliste
  slettet, `docs/qa-chrome-prompt.md` skrevet, HANDOVER rotert.
