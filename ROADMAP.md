# Roadmap — FPL-dashboard

Køen øverst er den prioriterte rekkefølgen for alt som gjenstår — nytt
arbeid starter alltid på punkt 1 som ikke er blokkert. Nye idéer legges
under «Senere / idéer», de sniker ikke i køen. Utført historikk står bakerst.
En milepæl er ferdig når alt er huket av, `npm test` og `npm run lint` er
grønne, CHANGELOG er oppdatert og endringene er committet og pushet.

## Versjonsplan — hele løpet på ett brett

Prinsipp (besluttet av Marius 24. aug): **kun releaser med kodeendring får
versjonsnummer.** Verifiseringer og målinger er «porter» (P1–P4) — de
utløses av dato eller Marius, går parallelt med utviklingssporet, og et
funn blir en `fix:`-commit som rir neste ledige patchnummer.

| Nr | Hva | Kø-punkt | Blokkert av |
| --- | --- | --- | --- |
| **v1.2.4** | AI-rådgiverens promptstruktur på /lag | 1 | ingenting — neste utviklingsjobb |
| **P1** | Marius: bekreft auto-briefen 20. aug i Discord | 3 | Marius (minutter) |
| **P2** | Marius: README-skjermbilder + mobil-QA | 5 | Marius |
| **P3** | Etter GW2: transfers-skjema mot ekte data | 4 | GW2 spilt (~29.–31. aug) |
| **P4** | Kostnadsmåling uken etter 1. sep | 2 | dato |
| **v1.2.5** | Brief-kvalitetstrioen | 6 | v1.2.4 |
| **v1.3.0** | UI-overhaling | 7 | v1.2.5 |
| **v1.3.1+** | Robusthetskandidatene, én og én etter avtale | 8 | avtale per punkt |
| *(uten nr)* | Senere/idéer | — | ikke planlagt |

Kalenderlogikk: utviklingssporet (v1.2.4 → v1.2.5 → v1.3.0) går uavbrutt;
portene fyres når dato/Marius tillater, uten å blokkere sporet.

## Kø — hva gjøres videre, i rekkefølge

### 1. AI-rådgiverens promptstruktur på /lag (v1.2.4)

- **Hva:** rådgiver-prompten (`src/routes/api.js:85-88`) sender kun navn,
  lag, posisjon, pris, **form** og motstander per spiller. Verken `minutes`,
  `total_points`, `ep_next`, skadestatus eller antall spilte runder følger
  med, så modellen kan ikke skille «ingen data» fra «dårlig form» og dikter
  opp begrunnelser — den skrev «Haaland … formscore 0.0 (kun én runde
  spilt)» om en spiller med `minutes: 0` (Marius' B-2-kall i prod
  2026-08-22 kl. 02:36). Utilsiktet sideeffekt av v1.2.2: UI-et rangerer på
  `ep_next` når ingen har form, mens prompten fortsatt kun får `form` —
  siden og rådgiveren resonnerer fra ulike signaler. Rådgiveren har heller
  ingen etterkontroll tilsvarende `sanitizeBriefText`
  (`src/services/prompts.js:135`).
- **Hvorfor her:** Marius har pekt på denne som den han vil ha fikset;
  kjent feil i prod.
- **Eier detaljene:** `docs/plan-v124-radgiver-prompt.md` (brainstormet og
  godkjent 24. aug, økt 26). Utføres av Opus 5 i egen økt; egen release
  (planens regel: aldri fiks inni en deploy).
- **Blokkert av:** ingenting.
- **Størrelse:** liten–medium — 1 planøkt + 1 utførelsesøkt, 1–2 AI-kall
  til ende-til-ende-verifisering.

### 2. (P4) Kostnadskontroll etter prisskiftet

- **Hva:** Sonnet 5 går fra intropris $2/$10 til ordinær $3/$15 per 1M
  tokens 1. september. Målingen 23. aug ga $0,94/uke (under terskelen);
  samme bruk koster $1,48/uke etter prisskiftet — inn i $1–4-båndet der
  planen sier «se hvilken funksjon som drar». Ut-tokens er 78 % av
  kostnaden, så kortere svar er den billigere knappen før modellbytte.
- **Eier detaljene:** `docs/sjekkpunkt-d-kostnad.md` (metode, terskler,
  analyseskript).
- **Blokkert av:** dato — måles i uken etter 31. august, når GW2–GW3 gir
  organisk trafikk uten utviklingsstøy.
- **Størrelse:** liten.

### 3. (P1) Verifiser auto-briefen 20. august `[Marius]`

- **Hva:** eneste gjenstående punkt fra sjekkpunkt A: at den naturlige
  auto-briefen torsdag 20. aug ~19:30 faktisk kom. Coolify-loggen er
  overskrevet, så Discord-kanalen er beviset.
- **Eier detaljene:** dette punktet (+ avhukingen i v1.0.1-historikken).
- **Blokkert av:** Marius (sjekker Discord-kanalen).
- **Størrelse:** minutter.

### 4. (P3) Etter GW2: verifiser transfers-skjemaet mot ekte data

- **Hva:** feltnavnene i `entry/5330646/transfers/` (`element_in`,
  `element_out`, `event`, `time`, `event_transfers_cost`) er antatt og lest
  med guards — bekreftes mot ekte data når første transfer finnes. Pluss:
  se `/overganger` med ekte data på mobil 390 px (scroll kun i
  `.table-scroll`). Avvik → `fix:`-commit med oppdaterte fixtures.
- **Eier detaljene:** sjekklisten «Etter GW2» i
  `docs/arkiv/plan-hva-hvis-transfers.md`.
- **Blokkert av:** første ekte transfer + GW2 spilt (GW2-deadline
  28. aug 19:30).
- **Størrelse:** liten.

### 5. (P2) README-skjermbilder + mobil-QA `[Marius]`

- **Hva:** Del 6-restene fra sesongstart-verifiseringen: skjermbilder til
  README (dashbord, /spillere, /lag i desktop + 390 px), og mobilvisning på
  ekte telefon (vannrett scroll, sticky hode, footer, norsk, AI-merke).
- **Eier detaljene:** restpunkt-listen i `docs/sjekkpunkt-d-kostnad.md`.
- **Blokkert av:** Marius (nettleser + telefon).
- **Størrelse:** liten.

### 6. Brief-kvalitetstrioen (v1.2.5, én release)

Tre sammenhengende funn fra sjekkpunkt A — samme filfamilie
(`brief.js`/`prompts.js`), samme testmønster, bør tas samlet:

- **AI-briefen kan motsi datagrunnlaget uten at noe fanger det.**
  GW1-briefen skrev «alle stiller friske» mens `injuries` inneholdt
  Bruno G., og oppga Calafiori til 32,3 % mot dataenes 32,6 %.
  `sanitizeBriefText` kontrollerer kun deadline-påstander. Mulig utvidelse
  (P3-5-familien): tallkontroll av prosenter i teksten mot brief-JSON-en,
  og regel om at «ingen skadenytt» ikke kan stå når `injuries` er ikke-tom.
- **Kapteinslista i briefen er vilkårlig ved sesongstart.**
  `globalCaptains` (`src/services/brief.js:52`) rangerer på
  `form * (6 - avgFdr)`; før første kamp er alt 0 og element-ID-rekkefølgen
  vinner (GW1-briefen foreslo keeper + to Arsenal-forsvarere). Fiks: samme
  `ep_next`-fallback som `captainSuggestions` (`src/services/analysis.js:249`)
  fikk i v1.2.2. Gjelder runde 1–2.
- **Prompt-etiketten «Mest aktuelle kapteiner globalt» overselger dataene.**
  Lista er høyt eide spillere med lett kamp, ikke målt kapteinsandel —
  modellen skrev den om til «de mest brukte kapteinsvalgene globalt».
  Etiketten i `buildBriefPrompt` (`src/services/prompts.js:4`) bør si hva
  lista faktisk er.

- **Eier detaljene:** dette punktet; plan mangler.
- **Blokkert av:** v1.2.4 (punkt 1 — samme AI-kall-disiplin, ryddigst etter tur).
- **Størrelse:** medium.

### 7. UI-overhaling (v1.3.0)

- **Hva:** FPL-gjenkjennelse (klubblogoer/drakter), clean og lett å bruke,
  mørk/lys/auto-tema. Planleggingsprompten er skrevet, men aldri kjørt —
  ingen plan finnes ennå.
- **Eier detaljene:** `docs/prompt-ui-overhaul-plan.md` (planleggingsprompt
  med verifiserte fakta og alle åpne spørsmål).
- **Blokkert av:** v1.2.5 (køen foran). Marius bekreftet 24. aug at den
  fortsatt er ønsket. Kostnad avklares i planøkten (klubbgrafikk-kilde/
  lisens, lys palett med kontrastkrav, etappeinndeling).
- **Størrelse:** stor — egen planøkt, flere utførelsesøkter i etapper,
  QA-runder hos Marius.

### 8. Robusthetskandidater (v1.3.1+, avtales én og én, uprioritert innbyrdes)

Reelle funn fra kvalitetspasset v1.1.3 (P3) og verifiseringen — ingen
fikses uten avtale:

- **`gameUpdating`-livssyklus** (`src/services/fplClient.js`): globalt
  flagg settes av 503 på ett endepunkt, nullstilles av suksess på et annet;
  banner kan henge 15 min, kaldstart under oppdateringsvindu 500-er.
  Redesign: tidsstemplet flagg eller status per endepunkt.
- **Alderstak på stale data + `dataAlder` i payloaden** (rest av P3-2):
  produktbeslutning + payload-kontraktsendring — tas separat med Marius.
- **SWR i `ai.js`**: første besøkende per intervall venter hele
  Claude-rundturen (5–20 s). NB: endrer semantikken «AI-kall skjer ved
  sidebesøk» som verifiseringen bygger på — må avklares først.
- **`filterSummaryPoints`-dybde** (`src/services/news.js:158`): genitiv
  bommer på substring-matchen. Robusthet ligger i promptendring
  (kildeindeks per punkt) — koster AI-kall å teste, må avtales.
- **Persistent «brief sendt»-markør** (P1-5b): `lastSentEvent` lever i
  minnet; redeploy innenfor 15-min-vinduet re-poster briefen. Krever
  tilstand som overlever containeren — arkitekturbeslutning.

## Dokumentkart — hvor alt bor

Én eier per fil; alt uten leserverdi for en ny økt ligger i `docs/arkiv/`
eller git. En ny økt leser `docs/HANDOVER.md` → køen her → resten ved behov.

| Fil | Rolle |
| --- | --- |
| `ROADMAP.md` (rot) | fasiten: versjonsplan, kø, dokumentkart, historikk |
| `docs/HANDOVER.md` | nåtilstand + lærdommer + beslutninger (tak 200 linjer) |
| `docs/VIDERE.md` | Marius' ikke-tekniske kortversjon |
| `docs/prompt-ui-overhaul-plan.md` | ukjørt planleggingsprompt for v1.3.0 |
| `docs/sjekkpunkt-d-kostnad.md` | metode + skript for P4-målingen |
| `docs/sjekkpunkt-c-live.md` | bevismateriale v1.2.3 |
| `docs/port9-chrome-prompt.md` | gjenbrukbar nettleser-QA-oppskrift |
| `docs/plan-doks-opprydning.md` | utført ryddeplan (arkiveres ved neste rydding) |
| `docs/arkiv/` (11 filer) | utførte planer + historikk — endres ikke |

## Senere / idéer (ikke planlagt)

- AI-kommentar til overgangsanalysen (bevisst utelatt fra v1: tallene taler
  for seg, koster per generering — ettermonteres via ai.js ved behov)
- Prisendrings-varsler
- E-postvarsling som alternativ til Discord

---

## Utført (v0.1.0 → v1.2.3)

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
- [ ] Naturlig auto-brief torsdag 20. aug ~19:30 verifisert → **kø-punkt 3**
- [x] Kostnadskontroll etter 2–3 dager i drift — **målt 23. aug: $0,94/uke,
      under planens $1-terskel, ingen tiltak.** Ut-tokens står for 78 % av
      kostnaden; introprisen på sonnet-5 er bekreftet av fakturaen. Samme bruk
      koster $1,48/uke etter 31. aug, så målingen gjentas i uken etter — se
      `docs/sjekkpunkt-d-kostnad.md` (→ **kø-punkt 2**)

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
- [ ] Etter GW2: verifiser transfers-skjemaet mot ekte data → **kø-punkt 4**

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

_Full analyse med rådata: `docs/sjekkpunkt-c-live.md`. Plan:
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
      `docs/sjekkpunkt-c-live.md` → «Resultat fra kampvinduet».
