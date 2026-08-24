# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 30, Fable: plan v1.3.0 UI-overhaling godkjent, mockup publisert)

## Status akkurat nå

- **Plan for UI-overhalingen godkjent (økt 30, Fable, 24. aug).**
  `docs/plan-v130-ui-overhaul.md` (~1900 linjer): 20 verifiserte fakta,
  15 beslutninger fra Marius + 9 implementasjonsvalg, palett med 41 målte
  kontrastpar, fire etapper v1.3.0–v1.3.3 task for task med kode og
  testtall (272 → 282 → 296 → 299). Mockup (begge temaer, 390 px,
  designsystem): https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
  **Neste: Opus-økt for v1.3.0** på branch `feat/ui-v130-fundament`.
  0 AI-kall brukt i planøkten, ingenting pushet.
- **v1.2.5 ferdig og ute (økt 29, Opus).** Hele
  `docs/plan-v125-brief-kvalitet.md` (Task 0–6) utført, tag `v1.2.5`.
  **2 AI-kall brukt av 2 budsjetterte.**
  - Tre endringer: (1) `globalCaptains` faller tilbake på `ep_next` når
    all form er 0 og slipper minutes-kravet før sesongens første kamp,
    brief-objektet får `captainsCriterion`; (2) ærlig kapteinsetikett +
    REGLER-seksjon i `buildBriefPrompt`, view-overskrift
    «Kapteinskandidater globalt»; (3) `sanitizeBriefText` omstrukturert
    fra én kontroll til tre som velges per linje — deadline (uendret
    logikk), friskmelding, prosent (nær-miss ±1,0).
  - TDD: 256/256 → **272/272, lint 0**. Rødtallet i Task 1 ble 6, ikke 5
    (vern-testen asserter også `captainsCriterion`) — eneste avvik.
  - Røyktest uten nøkler (port 3011, `ai:false, discord:false`): alle 11
    ruter 200, ukjent sti 404.
  - **E2E lokalt (AI-kall 1 av 2, port 3012, `ai:true, discord:false`):**
    ett kall `ai-brief-gw2` (1680 inn / 977 ut). Ingen «mest brukte
    kapteiner», alle prosenter (15.3, 7.6, 17.5, 16.0, 41.9, 75) eksakt i
    `/api/brief.json`, ingen friskmelding tross to navn på skadelista,
    og **ingen `console.warn` fra sanitize — 0 setninger fjernet**.
  - **Prod-retest (AI-kall 2 av 2), 01:43: bestått.** Ingen «mest
    brukte kapteiner» («**Szoboszlai** … et trygt globalt valg …
    **Guéhi** og **Ndiaye** … om du leter etter differensial»), alle
    prosenter (15.3, 7.6, 41.9, 75) eksakt i `/api/brief.json`, ingen
    friskmelding tross to navn på skadelista, overskriften
    «Kapteinskandidater globalt» på siden. Stikkprøve mot fasiten:
    Ødegaard 11.0/FDR 4.0, Gvardiol 9.0/3.0, Guéhi 10.0/ep 2.8,
    Szoboszlai 8.0/ep 2.5 — alt korrekt.
  - `/nyheter` ble ALDRI besøkt med ekte nøkkel, verken lokalt eller i
    prod.
- **Prod kjører v1.2.5 på https://fpl.marsk.no — verifisert 24. aug 01:43.**
  `/health` → 200, `ai:true, discord:true, leagues:1`; footer `v1.2.5`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 1.
- `main` er **4 docs-commits foran `origin/main`** (upushet, venter på
  klarsignal), rent tre, **272/272 tester, lint 0**. Ingen åpne
  feature-brancher.
- Eldre status (v1.2.3-deploy, doks-opprydning økt 24, versjonsplan økt 25,
  v1.2.4 økt 27): rotert til `docs/arkiv/HANDOVER-historikk.md` 24. aug.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.3.0–v1.3.3: UI-overhaling i fire etapper — **plan godkjent, neste
   utviklingsjobb** (`docs/plan-v130-ui-overhaul.md`) → deretter
   robusthetskandidatene.

## Driftslærdommer (ikke glem disse)

- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
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

- 2026-08-24 (økt 30, Fable): kjøreprompt «Oppdrag (Fable 5): planlegg
  v1.3.0 — full UI-overhaling. KUN PLANLEGGING» med krav: brainstorming
  FØR plan mode (ett sett om gangen, anbefaling først, Marius beslutter),
  verifiser alle fakta selv, klikkbar mockup som Artifact i begge temaer,
  ett definert sluttprodukt (palett/typografi/spacing/komponenter per side),
  fire åpne spørsmål avgjort (klubbgrafikk-kilde/lisens, tema/FOUC,
  FPL-nærhet/kontrast, etapper), plan etter v1.2.5-malen, oppdater
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md, slett `prompt-ui-overhaul-plan.md`,
  ikke rør CHANGELOG, 0 AI-kall, aldri push, Opus-prompt i chatten.
  Underveis: «Klarer du å skrive planfila?» / «Okay da kan du fortsette»
  (bekreftelse etter avbrudd). Handling: 4 spørsmålssett (15 beslutninger,
  alle = anbefalingen), 20 fakta verifisert (bl.a. 140 bilde-URL-er med
  curl, PNG-dimensjoner, 41 kontrastpar), plan skrevet til
  `docs/plan-v130-ui-overhaul.md`, mockup publisert
  (https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849),
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md oppdatert, prompt-fila slettet,
  loggpost økt 28 + eldre status rotert til arkivet, committet lokalt på
  `main` uten push, Opus-prompt levert i chatten. 0 AI-kall.
- 2026-08-24 (økt 29, Opus): kjøreprompt «Oppdrag (Opus 5, utførelsesøkt):
  utfør v1.2.5 — brief-kvalitetstrioen» med `superpowers:executing-plans`
  mot `docs/plan-v125-brief-kvalitet.md`. Harde rammer: Task 0–5 nå, Task 6
  kun på eksplisitt klarsignal, aldri push uten klarsignal (heller ikke
  docs), aldri push to. 19–21 eller mens kamper pågår, maks 2 AI-kall
  (1 lokal E2E + 1 prod-retest), `/brief` og `/nyheter` aldri med ekte
  nøkkel utenfor de to, TDD med observert rødt, avkryssing i plandokumentet,
  avvik rapporteres. Handling: Task 0–5 utført på branch
  `fix/brief-kvalitet`, 4 commits, 272/272 + lint 0, 1 AI-kall brukt,
  ingen push. Ett avvik meldt: rødtallet i Task 1 ble 6 feilende tester,
  ikke 5 — «minutes-kravet gjelder»-testen asserter også
  `captainsCriterion` og feiler derfor også i rødfasen. Rotering gjort for
  å holde 200-linjerstaket: loggpostene for økt 25–26 og v1.2.4-detaljene
  flyttet til `docs/arkiv/HANDOVER-historikk.md`. Deretter klarsignal:
  **«kjør release»** (mandag 24. aug ~01:40). Handling: Task 6 utført —
  bump 1.2.5, CHANGELOG/ROADMAP/VIDERE/HANDOVER, merge til `main`
  (272/272 + lint 0 på main), tag `v1.2.5`, push, Coolify-deploy,
  prod-retest bestått, branch `fix/brief-kvalitet` slettet. Tidsvindu
  sjekket før push: mandag 01:38, 0 kamper i gang, neste avspark 19:00
  UTC samme dag. Totalt 2 AI-kall i økten.
  Til slutt: «Lag en prompt til fable for planøkten. Husk å ta med alle
  oppdateringer og sånt og at fable skal oppdatere alle filer som trengs.
  Full planlegging. Jeg vil ha et sluttprodukt på ui overhaulen.» +
  «Og husk at den skal lage prompt til opus». Handling: planleggingsprompt
  for v1.3.0 (UI-overhaling) levert i chatten, ikke som fil. Prompten
  krever brainstorming før plan mode, visuell mockup som Artifact i BEGGE
  temaer som sluttprodukt, ett definert sluttresultat uten «kan
  vurderes», oppdatering av plan/ROADMAP/VIDERE/HANDOVER/CLAUDE.md,
  sletting av den utdaterte `docs/prompt-ui-overhaul-plan.md`, 0 AI-kall,
  ingen push — og en kopierbar Opus-prompt til slutt.
- Eldre loggposter (økt 22–28): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
