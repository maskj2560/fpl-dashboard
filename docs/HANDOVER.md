# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 29, Opus: v1.2.5 Task 0–5 utført, venter
på klarsignal for release)

## Status akkurat nå

- **VENTER PÅ KLARSIGNAL: v1.2.5 Task 6 (release).** Task 0–5 i
  `docs/plan-v125-brief-kvalitet.md` er utført på branch
  `fix/brief-kvalitet` (4 commits, `79c9ed8` øverst). Ingenting pushet.
  Task 6 = versjonsbump, CHANGELOG/ROADMAP/VIDERE, merge til `main`, tag,
  push, prod-retest — kjøres KUN når Marius sier fra.
  - TDD-løpet: 256/256 → **272/272, lint 0**. Rødtallene per task står
    avkrysset i plandokumentet.
  - Tre endringer: (1) `globalCaptains` faller tilbake på `ep_next` når
    all form er 0 og slipper minutes-kravet før sesongens første kamp,
    brief-objektet får `captainsCriterion`; (2) ærlig kapteinsetikett +
    REGLER-seksjon i `buildBriefPrompt`, view-overskrift
    «Kapteinskandidater globalt»; (3) `sanitizeBriefText` omstrukturert
    til tre kontroller — deadline (uendret), friskmelding, prosent
    (nær-miss ±1,0).
  - **AI-budsjett: 1 av 2 kall brukt** (lokal E2E). Kall 2 er reservert
    prod-retesten i Task 6.
  - E2E lokalt 24. aug (port 3012, `ai:true, discord:false`): ett kall
    `ai-brief-gw2` (1680 inn / 977 ut). Alle sjekkpunkter bestått —
    ingen «mest brukte kapteiner», alle prosenter (15.3, 7.6, 17.5,
    16.0, 41.9, 75) eksakt i `/api/brief.json`, ingen friskmelding selv
    om skadelista hadde to navn, og **ingen `console.warn` fra sanitize
    — 0 setninger fjernet**, altså ingen korrekt setning felt ved uhell.
  - Røyktest uten nøkler (port 3011, `ai:false, discord:false`): alle 11
    ruter 200, ukjent sti 404.
  - `/nyheter` ble ALDRI besøkt med ekte nøkkel.
- **Prod kjører v1.2.4 på https://fpl.marsk.no — verifisert 24. aug 00:55.**
  Deploy tok 30 s fra push. `/health` → 200, `ai:true, discord:true,
  leagues:1`; `/lag` → 200 med `v1.2.4` i footeren.
- Eldre: v1.2.3-deployen (22.–23. aug). Deploy-planen
  (port 0–10) ble ferdig utført 22.–23. aug; sjekkpunkt B, C og D er lukket,
  A har ett restpunkt (auto-brief-verifisering, kø-punkt 3). Bevis og
  detaljer: `docs/sjekkpunkt-c-live.md`, `docs/sjekkpunkt-d-kostnad.md` og
  `docs/arkiv/HANDOVER-historikk.md`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 2.
- `main` er 2 docs-commits foran `origin/main` (økt 27-loggen `1a0dd15` +
  v1.2.5-planen `2439eab`) og ligger urørt på **256/256, lint 0**.
  Aktiv branch: `fix/brief-kvalitet` (4 commits over main, 272/272,
  lint 0). Ingenting er pushet — heller ikke docs.
- **Doks-opprydning utført (økt 24):** docs/-rot fra 30 til 7 filer,
  utførte planer i `docs/arkiv/`, 19 konsumerte økt-prompter slettet,
  ROADMAP omskrevet med prioritert kø, denne fila slanket til ≤200 linjer.
  Plan: `docs/plan-doks-opprydning.md`.
- **Versjonsplan lagt (økt 25):** ROADMAP har nå versjonsplan-tabell øverst
  (v1.2.4 → v1.2.5 → v1.3.0 → v1.3.1+, porter P1–P4 for sjekker/målinger)
  og et dokumentkart. Kun kodereleaser får versjonsnummer (Marius' valg).
- **v1.2.4 ferdig og ute (økt 27).** Rådgiver-prompten bygges i
  `buildAdvicePrompt` (prompts.js) med fullt signalsett + sidens
  beregninger + REGLER. 2 AI-kall brukt av 2, B-2-kriteriene bestått både
  lokalt og i prod. Full bevisføring: `docs/arkiv/HANDOVER-historikk.md`.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.2.5: brief-kvalitetstrioen — **kode ferdig og verifisert lokalt,
   venter kun på klarsignal for release (Task 6)** →
   v1.3.0: UI-overhaling (bekreftet 24. aug) → v1.3.1+: robusthetskandidater.

## Driftslærdommer (ikke glem disse)

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
  flyttet til `docs/arkiv/HANDOVER-historikk.md`.
- 2026-08-24 (økt 28, Fable): kjøreprompt «Oppdrag (Fable 5, plan mode):
  planlegg v1.2.5 — brief-kvalitetstrioen» med krav: brainstorming FØR plan
  mode (spørsmål ett sett om gangen, anbefaling først, Marius beslutter),
  plan så detaljert som mulig (kopierbar kode, eksakte testnavn/asserts,
  testtall rødt→grønt, verifiseringstabell) til
  `docs/plan-v125-brief-kvalitet.md` for Opus 5, TDD, ingen nye
  avhengigheter, egen branch, aldri push uten klarsignal, release som eget
  task på klarsignal, aldri push to. 19–21/under kamper, eksplisitt lavt
  AI-tak, /brief og /nyheter aldri med ekte nøkkel utenfor budsjettet,
  docs-oppdateringer i samme commit (ROADMAP/HANDOVER/VIDERE), commit
  lokalt på main UTEN push, ta stilling til to ryddepunkter, Opus-prompt
  leveres i chatten. Brainstorming: Marius valgte anbefalingen på alle 9
  spørsmål (begge tiltak for motsigelser; nær-miss ±1,0; fjern setning;
  speil captainSuggestions; minutes-slipp før sesongstart;
  captainsCriterion; ærlig etikett + REGLER + view-synk; maks 2 AI-kall;
  rydding i planøkten). Handling: plan skrevet og godkjent, ROADMAP/
  HANDOVER/VIDERE oppdatert, v124-planen arkivert, `fix/radgiver-prompt`
  slettet, alt committet på main (ingen push), Opus-prompt levert i
  chatten. 0 AI-kall, ingen kodeendringer.
- 2026-08-24 (økt 27, Opus): kjøreprompt «Oppdrag (Opus 5, utførelsesøkt):
  utfør v1.2.4 — AI-rådgiverens promptstruktur på /lag» med harde rammer:
  Task 1–2 nå, Task 3 kun på klarsignal, aldri push uten klarsignal, maks
  2 AI-kall (1 lokal E2E + 1 prod-retest), aldri /brief eller /nyheter med
  ekte nøkkel, TDD med observert rødt, checkbox-sporing i plandokumentet,
  avvik rapporteres. Handling: Task 1 + Task 2 utført etter planen (2
  commits på `fix/radgiver-prompt`), 1 AI-kall brukt, ingen push. Ett
  metodetillegg utover planen: tallene i AI-svaret ble stikkprøvd mot
  FPLs `bootstrap-static/` i tillegg til /lag-siden (gratis, ingen AI).
  Deretter klarsignal: **«kjør release»** (mandag 24. aug ~00:50). Handling:
  Task 3 utført — bump 1.2.4, CHANGELOG/ROADMAP/VIDERE, merge til `main`
  (256/256 + lint 0 på main), tag `v1.2.4`, push, Coolify-deploy på 30 s,
  prod-retest bestått. Tidsvindu sjekket før push: mandag 00:45, 0 kamper
  i gang, GW2-deadline 28. aug. Totalt 2 AI-kall i økten.
  Til slutt: «Lag en kopierbar prompt til fable som skal planlegge neste
  steg. Husk det med å oppdatere ting. Ikke skriv en fil.» Handling:
  planleggingsprompt for v1.2.5 (brief-kvalitetstrioen) levert i chatten,
  ikke som fil. To åpne ryddepunkter meldt til Marius, ikke utført:
  lokal branch `fix/radgiver-prompt` står igjen, og
  `docs/plan-v124-radgiver-prompt.md` bør arkiveres til `docs/arkiv/`.
- Eldre loggposter (økt 22–26): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
