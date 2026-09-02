# Roadmap — utført historikk v0.1.0 → v1.3.4 (arkiv)

> Flyttet verbatim fra ROADMAP.md 2. september 2026 (økt 56, docs-slanking).
> Nyere historikk: versjonsplanen øverst i ROADMAP.md + CHANGELOG.md.

## Utført (v0.1.0 → v1.3.4)

### v0.1.0 — Deploybart skjelett (MVP)

- [x] Prosjektoppsett: package.json, ESLint, mappestruktur fra CLAUDE.md
- [x] `fplClient.js` med TTL-cache, stale-while-revalidate, dedup og 503-håndtering
- [x] Dashboard-side (/): deadline-nedtelling, flagg/skader, topp form, mest kjøpt/solgt, FDR-matrise
- [x] `/health`-endepunkt
- [x] Dockerfile + .dockerignore + README med Coolify-oppskrift
- [x] Tester for cache.js
- [x] **→ Deploy til Coolify med auto-deploy skjer her** (live på https://fpl.marsk.no)

### v0.2.0 — Spillere

- [x] /spillere: full tabell med sortering, filtrering og søk
- [x] Vanilla JS for sortering/filter uten sidelasting

### v0.3.0 — Mitt lag og anbefalinger

- [x] /lag: oppstilling, benk, kaptein, lagverdi, rank-graf
- [x] `analysis.js`: kapteinsanbefaling med begrunnelse (topp 3)
- [x] `analysis.js`: transfers ut + inn-kandidater innenfor budsjett
- [x] Tester for all analyselogikk

### v0.4.0 — Miniliga

- [x] /liga: tabeller for alle ligaene mine
- [x] Differensial-analyse mot leder/rival

### v0.5.0 — Gameweek-brief

- [x] /brief-siden + `GET /api/brief.json`
- [x] Skadenytt, kapteinsvalg, fixtures per dag, mine anbefalinger i kortform

### v0.6.0 — Live-visning

- [x] /live: mine spilleres live-poeng, bonusestimat, miniliga-ranker
- [x] `GET /api/live.json` + polling hvert 60. sek kun mens kamper pågår
- [x] «Sist oppdatert»-indikator

### v0.7.0 — Nyheter med AI-oppsummering

- [x] `news.js`-service: henter FPL-relevante RSS-feeder (gratis)
- [x] `ai.js` felles-service: lazy init, modell fra `AI_MODEL`
      (default `claude-sonnet-5`, `claude-haiku-4-5` som billig-alternativ)
- [x] Valgfri AI-oppsummering når `ANTHROPIC_API_KEY` er satt — cachet,
      regenereres maks hver 30. min
- [x] Uten nøkkel: vis rå nyhetsliste fra feedene (appen krever aldri nøkkelen)
- [x] Nyhetspanel på dashboardet + egen /nyheter-side

### v0.8.0 — AI-brief og transfer-rådgiver

- [x] AI-versjon av /brief: modellen skriver briefen på norsk fra data-briefens
      JSON — maks én generering per time, cachet, data-brief som fallback
- [x] «Spør AI om råd»-knapp på /lag → `POST /api/ai-rad` med tropp +
      analysis-data, begrunnede råd tilbake, cachet 1 time
- [x] Tester for prompt-bygging (rene funksjoner)

### v0.9.0 — Auto-brief før deadline

- [x] `notify.js`: deadline-scheduler uten cron-avhengighet (timer mot neste
      `deadline_time` − `BRIEF_HOURS_BEFORE_DEADLINE`, re-sjekk daglig)
- [x] Poster AI-briefen (eller data-brief uten nøkkel) til `DISCORD_WEBHOOK_URL`
- [x] Uten webhook-URL: funksjonen er inaktiv

### v1.0.0 — Polish

- [x] Mobilgjennomgang av alle sider (CSS-revisjon + media query under 480 px —
      bekreftelse på ekte mobil gjenstår hos bruker)
- [x] Feilsider, tomtilstander og lastetilstander
- [x] Gjennomgang av cache-TTL-er mot faktisk bruk
- [x] README komplett (skjermbilder gjenstår — krever nettleser hos bruker)

### v1.0.1 — AI og Discord i drift (Milepæl 1)

- [x] Anti-spam-guard i `notify.js`: ingen re-sending av auto-briefen ved
      deploy/restart i sendevinduet (`sendDecision`, TDD)
- [x] Usage-logging per AI-kall (modell + inn/ut-tokens) for kostnadskontroll
- [x] Lokal pre-flight av alle fire AI-funksjonene mot ekte API
- [x] Auto-briefen verifisert mot ekte Discord-webhook (inkl. anti-spam-guard)
- [x] `ANTHROPIC_API_KEY` + `DISCORD_WEBHOOK_URL` + `FPL_TEAM_ID` i Coolify
- [x] Naturlig auto-brief torsdag 20. aug ~19:30 verifisert. **Bekreftet
      25. aug** med skjermbilde fra Discord-kanalen: «FPL Bot» postet
      «Rundebrief — Runde 1» 20.08.2026 kl. 19:30, altså nøyaktig 24 t før
      deadline (fre 21. aug 19:30) — `BRIEF_HOURS_BEFORE_DEADLINE` = 24.
      Briefen var komplett på norsk (Deadline, Skadenytt, Kapteinsvalg,
      Kamper å følge med på) med lenke til `/brief`. Dermed er sjekkpunkt A
      lukket i sin helhet.
- [x] Kostnadskontroll etter 2–3 dager i drift — **målt 23. aug: $0,94/uke,
      under planens $1-terskel, ingen tiltak.** Ut-tokens står for 78 % av
      kostnaden; introprisen på sonnet-5 er bekreftet av fakturaen. Samme bruk
      koster $1,48/uke etter 31. aug, så målingen gjentas i uken etter — se
      `docs/sjekkpunkt-d-kostnad.md` (→ **kø-punkt 1**)

### v1.1.0 — UI-makeover «Matchday» (Milepæl 2 + 3)

- [x] View-render-tester for alle sider med mockdata og tomtilstander,
      inkludert låsing av XSS-escapingen i live/news/brief (sikkerhetsnett)
- [x] Lokal Archivo-font + kontrastverifisert tokenpalett
- [x] Én-linjes scrollbar navigasjon, hero som broadcast-scoreboard
- [x] Enhetlig kort- og tabellsystem på alle sider
- [x] /spillere, /lag (pitch + arealgraf), /live, /liga, /brief, /nyheter
- [x] Gjennomdesignede tom- og feiltilstander, mobil-finpuss
- [x] QA-runder 1–5 hos bruker

### v1.1.1 — QA-rettelser

- [x] P0-1 asset-versjonering med innholdshash + DEPLOY.md (Cloudflare-purge)
- [x] P0-2 tabellhodet legger seg ikke under toppmenyen
- [x] P1-1…P1-7 tomtilstander, /health-konsistens, AI-faktakontroll,
      RSS-duplikater, kontrast
- [x] P2-1…P2-6 + P2-8 kontrast, norske skadetekster, ordbrudd, FDR på mobil,
      statstripe og kortlayout
- [x] Verifisert lokalt: 111 tester, lint 0, alle ruter 200, kontrast 8/8 par
      over 4,5:1, Playwright 103 sjekker uten feil på fire viewports
- [x] Deployet og verifisert i prod (push + Cloudflare-purge gjort 2026-08-20)

### v1.1.2 — visuelle QA-rettelser

- [x] P1-1 mørk scrollbar i tabellbokser (Firefox + WebKit)
- [x] P1-2 mobilmenyen viser sidescroll-hint (dynamisk kantfade + scroll-snap)
- [x] P2 engelsk UI-tekst oversatt (Dashbord, Runde, Totalrangering, P/K, Klar)
- [x] P3 skadestatus-oversettelsen dekker alle 72 `news`-mønstre fra FPL
- [x] P4 brief-prompten krever norske fotballuttrykk
- [x] Verifisert lokalt (118 tester, lint 0, Playwright 38/38 på 390 + 1440 px)
      og i prod (alle ruter 200, ny asset-hash, oversettelser synlige)

### v1.1.3 — kvalitetspass (29 verifiserte funn)

- [x] P0-1 uguardede pick-oppslag ga 500 på /live, /lag, /brief og /api
- [x] P0-2 Discord-chunkeren kunne sende tom eller for lang melding
- [x] P0-3 live-pollingen startet aldri før avspark og gjenopptok aldri;
      per-runde-fixtures fikk 1 min TTL og payloaden fikk `nextKickoff`
- [x] P0-4 én ugyldig `pubDate` tømte hele nyhetsfeeden
- [x] P1-5/6 dubletter av auto-briefen (15 min-vindu + `sending`-flagg)
- [x] P1-7 `/api/*`-feil svarer JSON
- [x] P1-8 backoff etter feilende AI-kall (5 min)
- [x] P1-9 `/health` venter aldri på FPL
- [x] P1-10 `?v=` gir immutable kun ved identitet med serverens versjon
- [x] P1-11 status `d` uten prosent → 0,75 spilletid
- [x] P1-12 skadenytt oversettes i briefkilden (view, Discord, AI-prompt)
- [x] P1-13 oversettelsesdrift varsles også i prod, dedupet per prosess
- [x] P1-14 bonusestimat riktig i dobbel runde
- [x] P2-1 forretningslogikk ut av rutene (`services/live.js`,
      `assembleBrief`/`generateAiBrief` i `services/brief.js`)
- [x] P2-2 delte konstanter og hjelpere (`STATUS_LABELS`, `resolvedGw`,
      `byId`, `formatDay`/`formatTime`, delt `escapeHtml`)
- [x] P2-3 `teamFdrMap()` — ett FDR-oppslag per lag per kall
- [x] P2-4 brief etter sesongslutt viser avsluttet tilstand
- [x] P3-6 CLAUDE.md: `max_tokens`-tallene rettet + arkitekturkart oppdatert
- [x] Verifisert lokalt (185 tester, lint 0, alle ti ruter 200 med AI/Discord av)
- [x] P1-5b og P3-1…P3-5 → kø-punkt 8 (robusthetskandidatene)

### v1.2.0 — «Overganger»: historisk hva hvis-analyse

_Plan: `docs/arkiv/plan-hva-hvis-transfers.md`._

- [x] fplClient: `getEntryTransfers` (5 min) + `getLiveHistoric` (6 t, kun ferdige runder)
- [x] `transfers.js`: buildTransferAnalysis — vindu, diff, straff, chips, kanttilfeller
- [x] `assembleTransferAnalysis` — henting via cache, maks 38 live-kall
- [x] /overganger: view, rute, nav, tomtilstander, view-tester
- [x] Røyktest lokalt (alle ruter 200, AI/Discord av) + docs
- [ ] Etter GW2: verifiser transfers-skjemaet mot ekte data → **kø-punkt 2**

### v1.2.1 — failure-backoff i cache.js (P3-2)

_Plan: `docs/arkiv/plan-cache-backoff.md`._

- [x] 30 s backoff per nøkkel etter mislykket revalidering (TDD, 6 nye tester)
- [x] Røyktest lokalt (11 ruter 200, AI/Discord av) + handover

### sanitizeBriefText-robusthet (P3-4) — sluppet i v1.2.2

_Plan: `docs/arkiv/plan-sanitize-brief.md`. NB: det gamle kandidat-punktet sa
«matches mot FPLs kortnavn (‘Spurs’)» — presist er det `teams.name`, som selv
er kortform for noen klubber («Spurs», «Man Utd») og lang form for andre
(«Coventry City»); alias-tabellen dekker begge retninger._

- [x] Setningssplitting tåler norske forkortelser og klokkeslett (TDD, 5 nye tester)
- [x] Lagnavn-alias (`TEAM_ALIASES`) + ordgrense/genitiv-matching (TDD, 5 nye tester)
- [x] Røyktest lokalt (11 ruter 200, AI/Discord av) + handover

### v1.2.2 — riktige anbefalinger på /lag ved sesongstart (B-1…B-3)

_Plan: `docs/arkiv/plan-lag-anbefalinger.md`.
Deploy-plan: `docs/arkiv/plan-deploy-v122-v123.md`._

- [x] B-1: `captainSuggestions` faller tilbake på `ep_next` når all form er 0,
      og gir tom liste når også den er 0 (TDD, 4 nye tester)
- [x] B-1: ren helper `nextOpponents(fixtures, fromGw)` (TDD, 2 nye tester)
- [x] B-2: AI-rådgiveren får runde, deadline, kaptein/vise og motstandere,
      og instrueres mot spekulasjon om gratis bytter (TDD, 3 nye tester)
- [x] B-3: «Anbefalinger for Runde N» + kriterie-/tomtilstand i kapteinsboksen
      (TDD, 2 nye tester)
- [x] Røyktest lokalt med tomme nøkler (11 ruter 200, 0 AI-kall) + handover
- [x] B-2-verifiseringen: 1 AI-kall i prod etter v1.2.2-deployen (Marius
      klikker). **Utført i prod 2026-08-22 kl. 02:36 — bestått.** Funn på
      promptkvaliteten → **kø-punkt 1**

### v1.2.3 — bonuskolonnen på /live (funn fra sjekkpunkt C)

_Full analyse med rådata: `docs/arkiv/sjekkpunkt-c-live.md`. Plan:
`docs/arkiv/plan-live-bonus.md`. Deploy-plan:
`docs/arkiv/plan-deploy-v122-v123.md`._

FPL publiserer bonus provisorisk mens kampen pågår, så `hasConfirmedBonus()`
slår til med én gang og `estimateBonus()` kjører aldri — kolonnen sto tom
hele kampen. Besluttet løsning (Marius 21. aug): vis FPLs publiserte bonus,
merket som foreløpig, uten å legge den til «Effektivt» (den ligger allerede
i poengsummen). BPS-estimatet beholdes for vinduet før FPL publiserer.

- [x] `matchDone` (`finished || finished_provisional`) i `anyLive` og
      `matches`-payloaden — statusen sto på hele natten etter kampslutt (TDD)
- [x] `publishedBonus(fixture)` i `analysis.js` (TDD)
- [x] `live.js`: skill publisert bonus (`bonusPublished`) fra estimat (`bonusEst`)
- [x] `public/app.js` + `views/live.ejs`: vis summen, kolonnen heter «Bonus»
- [x] Manuell verifisering under neste kampvindu (rendringen er utenfor testharnessen)
      — **BESTÅTT 22. aug 2026.** Stopp-testen: server slo om 20:25:17, klientens
      siste henting 20:25:33, «Sist oppdatert» frøs der gjennom 5 min. Bonus:
      Ødegaard +3 «Bekreftet av FPL», Effektivt 11 (ikke 14); BPS-estimat virket
      under HUL–MUN; 0 dobbelttellinger av 1621 sampler. Se
      `docs/arkiv/sjekkpunkt-c-live.md` → «Resultat fra kampvinduet».

### v1.2.4 — AI-rådgiverens promptstruktur på /lag (B-2)

_Plan: `docs/arkiv/plan-v124-radgiver-prompt.md`._

Rådgiver-prompten sendte kun navn, lag, posisjon, pris, form og motstander,
så modellen kunne ikke skille «ingen data» (0 minutter) fra «dårlig form» —
i prod 22. aug skrev den «Haaland … formscore 0.0 (kun én runde spilt)» om en
spiller med `minutes: 0`. UI-et rangerte samtidig på `ep_next` mens prompten
kun fikk `form`, så siden og rådgiveren resonnerte fra ulike signaler.

- [x] `buildAdvicePrompt` (`prompts.js`) tar strukturerte spillerobjekter og
      formaterer selv; `api.js` ble ren datainnsamler (TDD, 6 nye tester)
- [x] Fullt signalsett per spiller: form, `ep_next`, minutter, totalpoeng,
      skadestatus med spillesjanse, motstandere — pluss ferdigspilte runder
- [x] Sidens egne beregninger med i prompten: kapteinstopp med
      rangeringskriterium og innkjøpskandidater per salgskandidat
- [x] REGLER-seksjon: 0 min = «ingen data ennå», aldri påfunnede tall, aldri
      flagget spiller som kaptein, aldri anta gratis bytte
- [x] Røyktest (tomme nøkler): 11 ruter 200, 404, POST `/api/ai-rad` → 400
- [x] Lokal E2E med ekte nøkkel — **B-2-kriteriene bestått 24. aug.**
      Svaret skrev «**João Pedro** har 0 spilte minutter så langt (ingen data
      ennå, ikke svakt)» og begrunnet avviket fra sidens formrangering med
      ventet poeng. Stikkprøve mot FPL-bootstrap: alle siterte tall korrekte.
- [x] Release v1.2.4 + prod-retest

### v1.2.5 — Brief-kvalitetstrioen

_Plan: `docs/arkiv/plan-v125-brief-kvalitet.md`._

Tre funn fra sjekkpunkt A, samme filfamilie, tatt som én release. GW1-briefen
skrev «Alle stiller i utgangspunktet friske» mens `injuries` inneholdt Bruno G.,
oppga Calafiori til 32,3 % mot dataenes 32,6 %, foreslo keeper + to
Arsenal-forsvarere i ren element-ID-rekkefølge, og skrev om etiketten til «de
mest brukte kapteinsvalgene globalt» — en kapteinsandel FPL ikke publiserer.

- [x] `globalCaptains` speiler `captainSuggestions`: all form 0 → `ep_next`,
      også 0 → tom liste. Minutes-kravet slippes når samtlige elements har
      0 minutter (sesongstart). Brief-objektet får `captainsCriterion`
- [x] Ærlig kapteinsetikett i `buildBriefPrompt` med navngitt kriterium, og
      REGLER-seksjon etter mønster fra rådgiveren (v1.2.4): aldri påfunnede
      tall, eksakte prosenter, skadelista er fasit, forbud mot «mest
      valgte/brukte kapteiner». View-overskrift «Kapteinskandidater globalt»
- [x] `sanitizeBriefText` omstrukturert fra én kontroll til tre som velges
      per linje — deadline (uendret logikk), friskmelding, prosent
- [x] Prosentkontroll med nær-miss ±1,0 mot fasit fra
      injuries/captains/mine; gal prosent fjerner setningen (aldri korriger)
- [x] TDD: 256/256 → **272/272, lint 0**. Ny regresjonsfixtur
      `briefGw1MedData` — den ekte GW1-briefen med dataene den faktisk hadde
- [x] Røyktest (tomme nøkler): 11 ruter 200, ukjent sti 404
- [x] Lokal E2E med ekte nøkkel 24. aug: ingen «mest brukte kapteiner», alle
      prosenter eksakt i `/api/brief.json`, ingen friskmelding tross to navn
      på skadelista, og **0 setninger felt av sanitize** (ingen `console.warn`)
- [x] Release v1.2.5 + prod-retest

### v1.3.0–v1.3.3 — UI-overhaling i fire etapper

_Planer: `docs/arkiv/plan-v130-ui-overhaul.md` (etappe 1–3) og
`docs/arkiv/plan-v133-qa.md` (etappe 4)._

- **Hva:** FPL-gjenkjennelse (FPLs lilla/grønn/cyan/rosa + FPLs FDR-farger),
  klubbmerker og drakter (selvhostet, 60 PNG), clean og lett å bruke, tema
  mørk/lys/auto med bryter i topbaren. Alle 15 designspørsmål er besluttet
  av Marius i planøkt 30 — Opus tar ingen designvalg.
- **Eier detaljene:** `docs/arkiv/plan-v130-ui-overhaul.md` (task for task
  med kode, testnavn og forventede testtall) + mockupen
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
- **Etapper (hver grønn, merges alene, prod alltid et helt UI):**
  - [x] **v1.3.0 Fundament** — tokenpalett i begge temaer (kontrast låst av
        `test/style.test.js`), inline-tema-script, temabryter, lilla topbar,
        `views/partials/`. 272 → 282 tester. **Utført 24. aug: 282/282,
        lint 0, Playwright 332/332, tag `v1.3.0` i prod.**
  - [x] **v1.3.1 Klubbgrafikk** — `scripts/fetch-club-assets.mjs`,
        `public/img/clubs/`, `clubAssets.js`, `IMG_VERSION`, `teamCode` i
        brief/live/transfers, partials club-badge/club-shirt i alle views,
        footer-kreditering, `/health` teller bildene. → 296 tester.
        **Utført 24. aug: 296/296, lint 0, Playwright 332/332 + 22/22
        klubbsjekker, 0 AI-kall, tag `v1.3.1` i prod.**
  - [x] **v1.3.2 Finpuss** — hero, korthoder, kampliste, feilsider, mobil.
        → 299 tester. Deretter 1 AI-kall: prod-visning av `/brief`.
        **Utført 24. aug: 299/299, lint 0, Playwright 332/332 + 22/22,
        tag `v1.3.2` i prod.**
  - [x] **v1.3.3 QA-rettelser** — alle 18 funn fra Marius' QA + det
        uverifiserte transfers-pillepunktet. 299 → 322 tester.
        **Utført 24. aug: 322/322, lint 0, Playwright 332/332 + 22/22
        klubbsjekker + 56/56 nye v1.3.3-sjekker, 11 ruter 200 + 404,
        0 AI-kall, tag `v1.3.3` i prod.**
- **Størrelse:** stor — fire utførelsesøkter (Opus), Playwright-QA i
  scratchpad etter hver, QA-runder hos Marius etter v1.3.2.

### v1.3.4 — Ingen ventetid på AI-tekst (SWR + bakgrunnsoppfriskning)

- [x] `ai.js`: stale-while-revalidate + `getCached()` som aldri gjør nettverkskall
- [x] `/brief`, forsiden og `/nyheter` leser cachen i stedet for å generere
- [x] AI-rådgiveren på `/lag` blokkerer aldri på en utgått tekst (kald cache venter fortsatt — knappen kan ikke svare med ingenting)
- [x] `refresh.js`: timer-styrt oppfrisking — briefen 1×/døgn + hver time i et 6-timersvindu før deadline, nyhetene hver 6. time, pluss ett tikk ved oppstart
- [x] **Målt lokalt (fake klient, 10 s forsinkelse):** kald `/brief`
      **10 023 → 17 ms**, forsiden **10 038 → 35 ms**, `/nyheter` 4 ms.
      0 AI-kall utløst av sidevisninger i noen cachetilstand.
- [x] **Utført 25. aug: 350/350 (baseline 322), lint 0, tag `v1.3.4` i prod.**
      Prod-verifisering: 11 ruter 200 + 404 **inkludert `/brief` og
      `/nyheter`** (gratis fra denne versjonen), `/health` ai:true
      discord:true leagues:1, footer `v1.3.4`, asset-hash `d508c47f`
      **uendret fra v1.3.3** (v1.3.4 rører kun `src/`). Målt i prod rett
      etter deploy med tom AI-cache: `/brief` 127 ms, `/nyheter` 92 ms,
      forsiden 117 ms; gjentatte besøk 89–99 ms. Begge AI-kortene til stede,
      så oppstartstikket varmet tekstene (2 budsjetterte kall).
- [x] **Samlet prod-QA 25. aug (dekker også v1.3.3, som aldri ble QA-et):**
      `qa-prod.mjs` **332/332** (8 sider × 4 bredder × 2 temaer — full
      variant, ikke den reduserte 240-varianten, siden `/brief` og
      `/nyheter` nå er gratis), `qa-clubs-prod.mjs` **14/14** (60 + 610 +
      48 klubbbilder, 0 brutte, 0 uversjonerte), `qa-v133.mjs` **56/56**.
      **P0-funnet bekreftet fikset i prod:** klistret tabellhode har 76,7 px
      klaring til toppmenyen på 390 px og 14,6 px på 1440, likt i begge temaer.
- **Størrelse:** én utførelsesøkt (Opus) + planøkt (Fable).
