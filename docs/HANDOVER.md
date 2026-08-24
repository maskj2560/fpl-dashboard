# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 32, Opus: v1.3.1 bygget, venter klarsignal)

## Status akkurat nå

- **v1.3.1 ETAPPE 2 BYGGET FERDIG, IKKE RELEASET (økt 32, Opus, 24. aug).**
  Task 1.1-0…1.1-6 utført på branch `feat/ui-v131-klubbgrafikk` (5 commits,
  ikke pushet). **296/296 tester, lint 0, 0 AI-kall.** Task 1.1-7 (release)
  venter på eksplisitt klarsignal fra Marius.
  - `IMG_VERSION = '2627'` i `middleware.js` (immutable-regelen), ny
    `src/services/clubAssets.js` (leser `public/img/clubs/` én gang til
    `app.locals`), `/health` teller bildene, `scripts/fetch-club-assets.mjs`
    + 60 committede bildefiler (561 KB), `teamCode`/`homeCode`/`awayCode` i
    brief-, live- og transfers-payloadene, partialene `club-badge` og
    `club-shirt` tatt i bruk i alle views, `clubBadgeHtml` + error-lytter i
    `public/app.js`, klubb-CSS, footer-kreditering.
  - TDD-tallene: 282 → rødt 277/1 (ESM-linkfeil tar hele fila) → 283 →
    rødt 284/1 (modul mangler) → 287 → rødt **290/5 som planlagt** → 290 →
    rødt **296/6 som planlagt** → **296**.
  - Røyk uten nøkler (port 3011): `ai:false, discord:false`,
    `clubImages {badges:20, shirts:20, keepers:20}`, 8 ruter 200, 404 på
    ukjent sti, alle klubb-URL-er versjonert, bilde → `immutable`.
    **Playwright: 332/332** + eget klubbskript **22/22** (0 brutte bilder
    også når lazy tvinges, 609 merker på /spillere, 15 drakter + 4
    keeperdrakter på /lag, Lag-kolonnen sorterer alfabetisk begge veier).
  - **Ett avvik fra planens bokstav:** assertionen «uversjonert bilde-URL» i
    dashboard-testen var en selvmotsigende regex (flagget korrekte URL-er).
    Rettet til `/\/img\/clubs\/[^"?]+"/`. Markupen er som i planen.
- **v1.3.0 ute i prod siden 24. aug** (tag `v1.3.0`): tokenpalett i to
  temaer med kontrast låst av `test/style.test.js`, inline-tema-script,
  temabryter, lilla topbar, `views/partials/`. Detaljene fra økt 31 er
  rotert til `docs/arkiv/HANDOVER-historikk.md`.
- **Plan for UI-overhalingen:** `docs/plan-v130-ui-overhaul.md` (~1900
  linjer, godkjent 24. aug) — fire etapper v1.3.0–v1.3.3 med kode og
  testtall (272 → 282 → 296 → 299). Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
  **Neste etter release av v1.3.1: etappe 3 (v1.3.2 Finpuss).**
- **Prod kjører v1.3.0 på https://fpl.marsk.no** (deployet og verifisert
  24. aug): `/health` → 200, `ai:true, discord:true, leagues:1`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 1.
- `main` ligger **1 docs-commit foran `origin/main`** (loggføringen fra
  slutten av økt 31 — ikke pushet). Aktiv branch:
  `feat/ui-v131-klubbgrafikk`, rent tre, **296/296 tester, lint 0**.
- Eldre status (v1.2.3-deploy, doks-opprydning økt 24, versjonsplan økt 25,
  v1.2.4 økt 27): rotert til `docs/arkiv/HANDOVER-historikk.md` 24. aug.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.3.1: **bygget og grønt — venter kun på klarsignal for release**
   (Task 1.1-7 i `docs/plan-v130-ui-overhaul.md`). Deretter v1.3.2/v1.3.3,
   så robusthetskandidatene.

## Driftslærdommer (ikke glem disse)

- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken må hentes på nytt hver sesong:** `npm run fetch-clubs` +
  bump `IMG_VERSION` i `src/middleware.js` i SAMME commit — ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutinen står i DEPLOY.md
  («Klubbgrafikk (ny sesong)»).
- **Skriv `\r\n` i node-patchskript mot docs/kildefiler** — repoets filer er
  CRLF, og en enkelt `\n` gir en fil med blandede linjeskift (skjedde i
  `docs/VIDERE.md` i økt 32, normalisert med en regex på `(?<!\r)\n`).
- **Bash-heredoc med apostrofer i innholdet feiler** i dette verktøyet
  (wrapperen bruker enkle anførselstegn) — bruk Write/Edit for filer med
  `'` i teksten (CSS, norsk prosa).
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser repoets `.env` UANSETT `--env-file`.
  Riktig teknikk: sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` som
  TOMME i en scratchpad-.env — `--env-file` setter dem først, `loadEnvFile`
  overskriver ikke. Verifiser med `/health` → `ai:false, discord:false`.
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip koster penger:** `GET /brief` og `/nyheter` genererer
  AI-tekst per besøk. Deploy-/verifiseringsplaner må utelate dem fra sveip
  eller budsjettere (~6 kall / ~$0,07 sist). `/api/brief.json` er ren data
  og trygg.
- **Per-funksjon-AI-kostnad kan ikke måles retroaktivt:** Coolify-loggen er
  100 linjer og nullstilles ved hver deploy. Skal fordelingen måles, må
  `AI-kall:`-linjene samles løpende (f.eks. før hver deploy).
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt — 
  plasseringen må inspiseres, ikke antas.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets (Browser Cache TTL 4 t). Ufarlig — all HTML refererer
  versjonerte URL-er (`?v=<hash>`); hash endres bare når CSS/JS endres.
- `ai.js` sender bevisst ikke `thinking`/`effort` (feiler på Haiku 4.5);
  `max_tokens` er romslig fordi adaptiv tenkning på Sonnet 5 trekker fra
  samme budsjett.
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
- UI-overhalingen (24. aug, økt 30): 15 beslutninger i
  `docs/plan-v130-ui-overhaul.md` §2 — selvhostet klubbgrafikk (70/110 px)
  med footer-kreditering og server-side fallback, ett tema-ikon i topbaren
  med inline-script + matchMedia, FPL-familien (lilla natt / lilla
  dagslys, grønn kun som fyll på lyst), fire etapper med hvert sitt
  patchnummer, Playwright etter hver etappe, 1 AI-kall totalt,
  `views/partials/` opprettes. Brainstorming-formen: ett spørsmålssett om
  gangen, anbefaling først — Marius valgte anbefalingen på alle 15.
- Doks-opprydningen (23. aug, økt 24): konsumerte prompter slettes, utførte
  planer arkiveres til `docs/arkiv/`; docs/-rot holdes på ~7 filer;
  ROADMAP-køen har promptstruktur-fiksen øverst; HANDOVER-tak 200 linjer
  med rotering til `docs/arkiv/HANDOVER-historikk.md`.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-08-24 (økt 32, Opus): kjøreprompt «Oppdrag (Opus 5,
  utførelsesøkt): utfør ETAPPE 2 — v1.3.1 Klubbgrafikk» med
  `superpowers:executing-plans` mot `docs/plan-v130-ui-overhaul.md` og
  mockupen som fasit (ved avvik vinner planen). Harde rammer: Task
  1.1-0…1.1-6 nå, 1.1-7 kun på klarsignal, ingen designbeslutninger,
  aldri push uten klarsignal (heller ikke docs), sjekk `fixtures/?event=N`
  og aldri to. 19–21, **0 AI-kall** (`/health` → `ai:false` FØRST),
  `npm run fetch-clubs` eneste tillatte nettverkskall, TDD med observert
  rødt i planfila (282 → 283 → 287 → 290 → 296), ingen nye avhengigheter,
  Playwright kun i scratchpad, docs i samme commit, branch
  `feat/ui-v131-klubbgrafikk` fra rent og grønt `main`.
  Handling: alle sju tasks (1.1-0…1.1-6) utført, 5 commits, **296/296 +
  lint 0**, Playwright 332/332 + 22/22 klubbsjekker, 60 bildefiler
  (561 KB) committet, 0 AI-kall, ingenting pushet. Ett avvik rapportert:
  planens regex for «uversjonert bilde-URL» flagget korrekte URL-er og ble
  rettet (markupen står som planlagt). Rødfasene 1.1-1 og 1.1-2 ga færre
  tester enn planen anslo fordi ESM-linkfeil tar hele testfila — årsak
  dokumentert i planfila.
- Loggposter fra økt 30–31: rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
- Eldre loggposter (økt 22–28): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
