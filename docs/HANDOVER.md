# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 27, Opus: v1.2.4 released og verifisert i prod)

## Status akkurat nå

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
- `main` = `origin/main`, rent tre, **250/250 tester, lint 0**. Ingen åpne
  feature-brancher.
- **Doks-opprydning utført (økt 24):** docs/-rot fra 30 til 7 filer,
  utførte planer i `docs/arkiv/`, 19 konsumerte økt-prompter slettet,
  ROADMAP omskrevet med prioritert kø, denne fila slanket til ≤200 linjer.
  Plan: `docs/plan-doks-opprydning.md`.
- **Versjonsplan lagt (økt 25):** ROADMAP har nå versjonsplan-tabell øverst
  (v1.2.4 → v1.2.5 → v1.3.0 → v1.3.1+, porter P1–P4 for sjekker/målinger)
  og et dokumentkart. Kun kodereleaser får versjonsnummer (Marius' valg).
- **v1.2.4 ferdig og ute (økt 27, Opus).** Hele
  `docs/plan-v124-radgiver-prompt.md` (Task 1–3) utført, tag `v1.2.4`,
  `main` = `origin/main` = `14cd91b`. **2 AI-kall brukt av 2 budsjetterte.**
  - Rådgiver-prompten bygges nå i `buildAdvicePrompt` (prompts.js) fra
    strukturerte spillerobjekter; `api.js` er ren datainnsamler. Fullt
    signalsett + sidens beregninger (kapteinstopp m/kriterium,
    innkjøpskandidater) + REGLER-seksjon. Ingen nye FPL-kall.
  - TDD: rødt observert (256 tester, 246 pass, 10 fail) → grønt
    **256/256, lint exit 0**.
  - Røyktest (tomme nøkler, port 3010): `/health` → `ai:false,
    discord:false`, alle 11 ruter 200, ukjent sti 404, POST `/api/ai-rad`
    → 400 «AI er ikke aktivert».
  - **E2E lokalt med ekte nøkkel (AI-kall 1 av 2, `/health` → `ai:true,
    discord:false`): B-2-kriteriene bestått.** Svaret: «## 1) Kaptein:
    Behold Haaland … Selv om sidens formbaserte rangering topper
    **Ødegaard** (form 11.0) foran **Haaland** (form 2.0), viser tallene
    noe annet når man ser på ventet poeng» og «**João Pedro** har 0 spilte
    minutter så langt (ingen data ennå, ikke svakt)» — nøyaktig feilen
    B-2 gjaldt. Stikkprøve mot FPL-bootstrap: Ødegaard form 11.0/ep 2.3,
    Haaland form 2.0/ep 4.0, Gakpo form 12.0/ep 2.5/7.0m, Wirtz form
    2.0/62 min/7.5m, João Pedro 0 min — **alle tall korrekte, ingen
    påfunnede**. Rådgiveren begrunnet også avviket fra sidens rangering
    og antok ikke gratis bytte.
  - **Prod-retest (AI-kall 2 av 2), 24. aug 00:55: B-2-kriteriene bestått.**
    «**João Pedro** har 0 minutter spilt så langt — dette er ikke
    nødvendigvis dårlig form, men mangel på data» og «Jeg fraviker altså
    sidens rene formbaserte rangering — ventet poeng gir et mer helhetlig
    bilde». Stikkprøve: Ødegaard form 11.0/ep 2.3, Haaland ep 4.0/form 2.0,
    M.Sangaré form 14.0/5.5m, Groß form 2.0/5.5m — alle korrekte. Også
    hjemme/borte stemte (MCI borte mot CRY FDR 3; CHE hjemme mot BHA).
  - `/brief` og `/nyheter` ble ALDRI besøkt med ekte nøkkel, verken lokalt
    eller i prod.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.2.5: brief-kvalitetstrioen (neste utviklingsjobb, plan mangler) →
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
- 2026-08-24 (økt 26): kjøreprompt «Oppdrag (plan mode): planlegg v1.2.4 —
  AI-rådgiverens promptstruktur på /lag» + brainstorming: Marius valgte
  anbefalingen på alle fire spørsmål (fullt signalsett; sidens beregninger
  med i prompten; promptregler i stedet for etterkontroll; databygging
  flyttes til prompts.js). Underveis: «Gjør planen så detaljert som mulig
  … lag en lett kopierbar prompt til opus … Ikke lag en fil for det …
  oppdater alle filene du trenger.» Handling: plan skrevet og godkjent
  (`docs/plan-v124-radgiver-prompt.md`), HANDOVER/ROADMAP oppdatert,
  Opus-prompt levert i chatten. 0 AI-kall, ingen kodeendringer, ingen push.
- 2026-08-24 (økt 25): «Lag en full plan over alt filene i docs og alle
  planene dette prosjektet har … i hvilke steg … med versjonsnummer …
  mest optimale løsningen.» To beslutninger tatt: (1) kun kodereleaser får
  versjonsnummer, sjekker/målinger er porter P1–P4; (2) UI-overhalingen
  bekreftet som v1.3.0 etter v1.2.5. Handling: versjonsplan-tabell +
  dokumentkart inn i ROADMAP, VIDERE speilet, denne loggen. 0 AI-kall,
  ingen kodeendringer.
- 2026-08-23 (økt 24, natt ~01:40): kjøreprompt «Oppdrag (Fable, plan mode):
  rydd dokumentasjonen og skriv veikartet ferdig» + fire beslutninger
  besvart (Marius valgte anbefalingen på alle fire): (1) slett konsumerte
  prompter, arkiver utførte planer; (2) målstruktur 7 filer i docs/-rot +
  arkiv; (3) promptstruktur-fiksen øverst i køen, foran UI-overhalingen;
  (4) HANDOVER-tak 200 linjer med historikk til arkiv. Handling: hele
  ryddeplanen utført (`docs/plan-doks-opprydning.md`), ROADMAP omskrevet
  med prioritert kø, HANDOVER slanket, VIDERE og CLAUDE.md oppdatert.
  0 AI-kall, ingen kodeendringer.
- 2026-08-23 (økt 23, natt ~01:30): «vil ha en Fable-prompt som planlegger
  stor opprydning av docs/ og skriver ROADMAP om til full framoversikt».
  Handling: `docs/neste-okt-prompt-doks-opprydning.md` skrevet med målt
  inventering (siden konsumert og slettet av økt 24 — se over).
- 2026-08-22 (økt 23): deploy-økten — klarsignaler «okay push v1.2.2»
  (02:31) og «kjør port 7» (02:41); B-2-kallet klikket i prod 02:36 med
  funnet «prompten bør struktureres på en mye bedre måte» (nå kø-punkt 1).
  Handling: v1.2.1 → v1.2.3 deployet og verifisert, port 0–10 utført.
  Full detalj: `docs/arkiv/HANDOVER-historikk.md`.
