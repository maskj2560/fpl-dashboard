# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 33, Opus: v1.3.2 released)

## Status akkurat nå

- **v1.3.2 (etappe 3) RELEASET 24. aug (økt 33, Opus).** Task 1.2-4 kjørt
  på klarsignal: bump 1.3.2, docs, merge `--no-ff` til `main`, tag
  `v1.3.2`, push, Coolify-deploy. **299/299 tester, lint 0.**
  Prod-verifisering og det ene AI-kallet: se linjen om prod nedenfor.
  - Innholdet: kontraktstester som låser markupen `app.js` avhenger av
    (heroens `data-deadline` + fire `data-unit`, 11 kolonnehoder med
    `data-type` og `aria-sort`), `btn-link` tilbake til dashbordet på
    404/error/no-team, tellere i dashbord-korthodene, aktiv chip i
    Oppstilling-hodet, kamplista i briefen som `.fixture-row` med
    klokkeslett, Beste/Verste som piller, kreditering på egen linje i
    footeren.
  - Heroen var allerede ferdig fra etappe 1 — ingen endring nødvendig.
  - Pillenes forgrunnsfarger var ikke spesifisert i planen. Målt der de
    står (kortflaten `--surface`): beste 10,42 mørkt / 5,66 lyst, verste
    5,39 / 5,27. Kan ikke låses i `PAIRS` — `*-soft` er rgba, ikke hex.
  - **Neste: ETAPPE 4 (v1.3.3 QA-rettelser) — blokkert av Marius' funn
    som nummerert P0/P1/P2-liste. Ingen planlagte tasks.**
- **v1.3.1 (etappe 2) ute siden 24. aug:** klubbmerker i alle tabeller og
  lister, drakter på banen, `clubAssets.js` + `IMG_VERSION`,
  `npm run fetch-clubs` og 60 bildefiler. Detaljene er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.
- **v1.3.0 (etappe 1) ute siden 24. aug:** tokenpalett i to temaer med
  kontrast låst av `test/style.test.js`, inline-tema-script, temabryter,
  lilla topbar, `views/partials/`. Detaljene fra økt 31 er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.
- **Plan for UI-overhalingen:** `docs/plan-v130-ui-overhaul.md` (~1900
  linjer, godkjent 24. aug) — fire etapper v1.3.0–v1.3.3 med kode og
  testtall (272 → 282 → 296 → 299). Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
  **20 av 21 tasks ferdige. Kun ETAPPE 4 gjenstår (ingen planlagte
  tasks — innholdet er Marius' QA-funn).**
- **Prod kjører v1.3.1 på https://fpl.marsk.no — verifisert 24. aug 13:16**
  (etter docs-rebuilden).
  `/health` → 200, `ai:true, discord:true, leagues:1,`
  `clubImages {badges:20, shirts:20, keepers:20}`; footer `v1.3.1`;
  `/img/clubs/t3.png?v=2627` → 200 + `immutable`. Playwright mot prod
  (uten /brief og /nyheter): 240/240 + klubbskript 14/14.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 1.
- **Git akkurat nå:** `main` = `origin/main` (docs-commiten fra
  v1.3.1-releasen pushet 24. aug 13:12; Coolify bygde identisk kode på
  nytt, prod verifisert oppe etterpå: `/health` 200, footer `v1.3.1`).
  Arbeidstreet står på **`feat/ui-v132-finpuss`** — 3 commits, **kun
  lokalt, ikke pushet**. Det er der v1.3.2-jobben og denne fila er
  nyest; `main` sin HANDOVER er fortsatt v1.3.1-versjonen.
- Eldre status (v1.2.3-deploy, doks-opprydning økt 24, versjonsplan økt 25,
  v1.2.4 økt 27): rotert til `docs/arkiv/HANDOVER-historikk.md` 24. aug.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.3.3 (ETAPPE 4): **venter på Marius' QA-funn** som nummerert
   P0/P1/P2-liste i chatten. Ingen planlagte tasks. Deretter
   robusthetskandidatene. Gammel åpen boks som er Marius' (Task 1.0-5):
   «Visuell sjekk mot mockupen i begge temaer».

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

- 2026-08-24 (økt 33, Opus): kjøreprompt «fullfør ETAPPE 3 — release
  v1.3.2 — og forbered ETAPPE 4». Rammer: Task 1.2-4 kun på eksplisitt
  klarsignal, ingen designbeslutninger, aldri push uten klarsignal
  (heller ikke docs), `fixtures/?event=N` før enhver push, aldri torsdag
  19–21, **nøyaktig ett AI-kall igjen** (én visning av prod-`/brief`
  ETTER deploy), `/nyheter` aldri med ekte nøkkel, rutesveip uten
  `/brief` og `/nyheter`, ingen nye avhengigheter, Playwright kun i
  scratchpad, docs i samme commit, kryss av i planfila med observerte
  tall. ETAPPE 4 startes ikke før Marius leverer P0/P1/P2-lista.
  Handling: status rapportert (299/299, lint 0, versjon 1.3.1, rent tre,
  4 commits foran `main`), deretter klarsignal **«Kjør»** (mandag
  24. aug ~13:18). Task 1.2-4 utført — se statusdelen øverst.
- Loggposten fra økt 32 (v1.3.1-releasen + v1.3.2-bygget): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
- Loggposter fra økt 30–31: rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
- Eldre loggposter (økt 22–28): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
