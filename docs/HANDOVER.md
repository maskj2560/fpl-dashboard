# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-01 (økt 49, Fable: detaljplan v1.8.1 godkjent)

## Status akkurat nå
- **Planøkt v1.8.1 (redesign av /spillere) UTFØRT 1. sep (økt 49).**
  Detaljplan godkjent: `docs/plan-spillere-redesign-v181.md` — 11 valg
  avgjort (faner, lavmælte navnelenker, status kun ved avvik, zebra, én
  desimal i servicen, segmentbryter + søylestripe, dødball-klubbkort,
  duell-hoder, strammere spillerkort, mer luft, versjon v1.8.1).
  STEG 0: modalen VIRKER i prod (skjermbilde, privat vindu — de ustylede
  skjermbildene var cache/verktøy). **Funn: terskelvelgeren 5/10/15 % er
  DØD i prod** (JS mangler; fikses i T6). Neste: utførelses-økt T1–T12.
- **v1.8.0 «Spiller-pakka» MERGET TIL MAIN 1. sep (økt 48).** Bygget på
  `feat/spillere-v180` (9 commits, T1–T9, TDD), merget `--no-ff`
  (`ed164c5`), tagget `v1.8.0`, pushet. **602/602 + lint 0 på branch OG
  merget main**, CHANGELOG-rekkefølgen kontrollert. Marius ga klarsignal
  uten egen lokal test — mobil-/tastatur-QA gjenstår derfor (køpunkt 1).
  Innhold: `src/services/players.js` (buildPlayerCard, buildDifferentials,
  buildSetPieceTable, assemblePlayerCard), `GET /api/spiller/:id`,
  `elementSummaryAgeSec` i fplClient, /spillere i tre seksjoner med
  hopplenker, modal-spillerkort, duell og terskelvelger.
  **To dokumenterte avvik fra planen (begge teknisk nødvendige):**
  (1) `buildDifferentials` tok ikke `teamsById` i planens signatur, men
  rad-kontrakten krever `lag: {kort, kode, navn}` — parameteren er lagt til.
  (2) `buildSetPieceTable` returnerer `{id, navn}` per taker, ikke bare
  navn: T6 krever at navnene er knapper som åpner spillerkortet, og en
  knapp trenger id-en. T4-testene ble justert i T6-commiten.
  **Røyktest 1. sep med tomme nøkler** (`ai:false, discord:false`): alle 9
  ruter 200, `/finnesikke` 404, `/api/spiller/411` 200 mot ekte FPL-data,
  `/api/spiller/abc` 400, `/api/spiller/999999` 404, **0 «AI-kall:»-linjer**.
  Payload /spillere: 528 → 911 KB ukomprimert, men **22,6 → 44,4 KB gzip**
  (compression() aktiv) — mer enn planens anslag ukomprimert, uproblematisk
  over nett. Detaljplan arkivert: `docs/arkiv/plan-spillerpakka-v180.md`.
- **v1.7.1 og v1.7.0 ute i prod 1. sep/31. aug; v1.3.8–v1.6.0 ute
  28. aug** — alle detaljer og prod-bevis i historikkfila.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted; beviset er
  `kill 1` i containerterminalen — de to avslutningslinjene skal stå der.
  Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **Asset-hashen i prod skal være `7a3c28b8` etter v1.8.0** (byttet fra
  `397624a7`; både style.css og app.js endret). Regnet fra git-blobbene på
  `main`-toppen, aldri fra arbeidstreet — se lærdommene.
  v1.3.7-markørbeviset og P2-detaljene: rotert til historikkfila 31. aug.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka er DROPPET** (Marius 28. aug) — forbruket følges i
  `console.anthropic.com`; terskler/skript i `docs/sjekkpunkt-d-kostnad.md`.
  Taktbudsjett **~49–53 AI-kall/uke** (v1.7.0/v1.8.0 legger til 0).
- **Git akkurat nå:** `main` = `origin/main`; tagger t.o.m. `v1.8.0`
  pushet. **Rest:** 12 gamle, merget lokale brancher fra økt ≤ 35
  (navnene i historikkfila) — ryddes med `git branch -d` når som helst.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

Køen i `ROADMAP.md` er den langsiktige prioriteringen. Punkt 1–2 kan bare
Marius gjøre.

1. `[Marius]` **QA av v1.8.0 i prod** — den gikk ut uten lokal test.
   Spillerkortet (klikk, Esc, ×, backdrop, at fokus går tilbake til navnet)
   og duellen (to valgte, tredje hake avvises, filtrering fjerner haken,
   sortering beholder valget). Terskelbytte 5/10/15 er KJENT dødt
   (JS mangler) — ikke test det, fiksen ligger i v1.8.1-planen (T6).
2. `[Marius]` **Mobil-QA på ekte telefon** (P2-resten) — `/overganger`,
   `/liga`, `/innsikt` og nå `/spillere` (checkbox-kolonne + modal + duell)
   på 390 px, i begge temaer. **Nav har 9 punkter** — sjekk at scrollnavet
   med kantfade (v1.1.2) holder.
3. `[Marius]` **`kill 1` i containerterminalen** → de to avslutningslinjene
   («SIGTERM mottatt — lukker serveren», «Serveren lukket ryddig») er det
   siste beviset for v1.3.5.
4. **P3 ved første ekte transfer:** feltnavnene i
   `entry/5330646/transfers/` (`element_in`, `element_out`, `event`,
   `time`, `event_transfers_cost`) mot ekte API. Marius bytter ikke i GW2
   (besluttet 28. aug), så porten venter på hans første ekte bytte — til
   da er tomtilstanden på `/overganger` korrekt (0 bytter).
5. **Kostnad:** løpende hos Marius i Anthropic-konsollen — ingen måleuke.
6. **Kosmetisk:** slett de 12 gamle lokale branchene — `git branch -d`.

**P0 og P1 er LUKKET 25. aug** (helsesjekken og auto-briefen).
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
- **ALLE docs er CRLF** (ROADMAP har BOM). Et node-`replace` med `\n` i
  søkestrengen MATCHER IKKE og feiler STILLE — det skjedde med to
  CHANGELOG-tillegg i økt 45, oppdaget først ved sluttkontroll. Bruk
  Edit-verktøyet på docs. `sed -i` er forbudt. Nye kildefiler skrives med
  LF; `core.autocrlf=true` normaliserer, så det er greit.
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

## Brukerens beslutninger (IKKE re-spør)

- Tiltale: **Marius** — alle svar starter med «Hei Marius!».
- AI-modell: `claude-sonnet-5` via `AI_MODEL`-env (`claude-haiku-4-5` billig-alternativ).
- Kostnadskrav: AI billig for én person — alt on-demand + cachet.
- Layout: egen liten EJS-layout-helper, IKKE express-ejs-layouts.
- «Overganger»: egen side på `/overganger`, uten AI-kommentar i v1.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.
- UI-overhalingen (økt 30): de 15 designbeslutningene står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen gjelder
  videre: ett spørsmålssett om gangen, anbefaling først.
- Doks-opprydningen (økt 24): konsumerte prompter slettes, utførte planer
  arkiveres til `docs/arkiv/`, docs/-rot holdes lav (nå 4 filer + arkiv),
  HANDOVER-tak 200 linjer med rotering til historikkfila.
- **Måleuka droppet (28. aug):** kostnaden følges løpende av Marius i
  `console.anthropic.com`. Samme dag: ingen bytter i GW2, så P3 venter.
- **v1.7.0 (31. aug):** begge benkekolonner; kapteinstreff på både
  identitet og poeng; flakspoeng + topp/bunn 3; XI-liste + sesongtrend;
  vindu = hele sesongen; nav-plass etter Liga. Fasit i planen.
- **v1.8.0 (1. sep):** alle fire deler i én versjon; modal-spillerkort med
  element-summary KUN lazy per klikk; duell fra data-attrs (pris lavest,
  dødball satt-slår-null, ellers høyest, likhet umarkert); global
  eierandel med terskel 5/10/15 % (default 10); alle tre dødball-roller.
  Full fasit: `docs/arkiv/plan-spillerpakka-v180.md` §Beslutningsfasit.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-09-01 (økt 49, Fable, planøkt): mandat = detaljplan for visuell
  redesign av /spillere, ingen kode. Underveis: «Jeg kan sende
  skjermbilde» (STEG 0) — skjermbildet beviste at modalen virker i prod.
  Fire AskUserQuestion-runder — Marius valgte anbefalingen i alle 11
  spørsmål; versjon v1.8.1. Funn: terskelvelger-JS mangler helt (død i
  prod, fikses i T6). Plan skrevet og godkjent, ROADMAP/CHANGELOG/
  HANDOVER ajour, loggpost økt 47 rotert til historikkfila.
- 2026-09-01 (økt 48, Opus, utførelse): mandat = bygg v1.8.0 etter planen,
  TDD strengt, stopp etter T9 uten merge/tag/push. Handling: verifiserte
  baseline 556/556 + lint 0 på main, branch `feat/spillere-v180`, T1–T9
  med rød→grønn i hver task, 9 conventional commits, CHANGELOG i hver
  commit, røyktest med tomme nøkler, docs ajour. Sluttstatus 602/602 +
  lint 0. To planavvik dokumentert i statusen over. Stoppet før merge.
  Deretter: «push og merge til main» — merget `--no-ff` (`ed164c5`),
  verifiserte 602/602 + lint 0 og CHANGELOG-rekkefølgen på merget main,
  tagget `v1.8.0`, arkiverte detaljplanen, pushet. Marius testet IKKE
  lokalt først, så prod-QA av modal/duell er lagt inn som køpunkt 1.
- Loggposter fra økt 22–47: rotert til
  `docs/arkiv/HANDOVER-historikk.md` (200-linjerstaket, sist 2026-09-01).
