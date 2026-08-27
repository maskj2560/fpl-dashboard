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
| ~~**v1.2.4**~~ | ~~AI-rådgiverens promptstruktur på /lag~~ | **utført 24. aug** | — |
| ~~**P0**~~ | ~~Coolify-helsesjekk fiks + bevis~~ | **utført 25. aug — alt. a aktiv** | — |
| ~~**P1**~~ | ~~Marius: bekreft auto-briefen 20. aug i Discord~~ | **utført 25. aug — brief bekreftet i kanalen** | — |
| **P2** | Marius: README-skjermbilder + mobil-QA | 3 | **skjermbilder utført 26. aug** — gjenstår mobil-QA på ekte telefon |
| **P3** | Etter GW2: transfers-skjema mot ekte data | 2 | GW2 spilt (~29.–31. aug) |
| **P4** | Kostnadsmåling uken etter 1. sep | 1 | dato |
| ~~**v1.2.5**~~ | ~~Brief-kvalitetstrioen~~ | **utført 24. aug** | — |
| ~~**v1.3.0**~~ | ~~UI-overhaling, etappe 1: fundament (tokens i to temaer, temabryter, lilla topbar)~~ | **utført 24. aug** | — |
| ~~**v1.3.1**~~ | ~~UI-overhaling, etappe 2: klubbgrafikk (merker + drakter, selvhostet)~~ | **utført 24. aug** | — |
| ~~**v1.3.2**~~ | ~~UI-overhaling, etappe 3: finpuss per side~~ | **utført 24. aug** | — |
| ~~**v1.3.3**~~ | ~~UI-overhaling, etappe 4: QA-rettelser~~ | **utført 24. aug — prod-QA grønn 25. aug** | — |
| ~~**v1.3.4**~~ | ~~Ingen ventetid på AI-tekst: SWR + bakgrunnsoppfriskning~~ | **utført 25. aug — ute i prod, QA grønn** | — |
| ~~**v1.3.5**~~ | ~~Ryddig avslutning (SIGTERM-handler)~~ | **utført 25. aug** | — |
| ~~**v1.3.6**~~ | ~~gameUpdating-livssyklus + vennlig 503-side~~ | **utført 25. aug** | — |
| ~~**v1.3.7**~~ | ~~Persistent «brief sendt»-markør (volum `/app/data`)~~ | **utført 26. aug — ute i prod** | — |
| **v1.3.8** | Genitiv-fiks i nyhetsfilteret | 4 | **kode klar på branch 26. aug** — merge/deploy etter P4 |
| **v1.4.0** | Alderstak på stale data + `dataAlder` i payload | 4 | **kode klar på branch 26. aug** — merge/deploy etter P4 |
| **v1.5.0** | «Overganger» total: planlegger, scenarier, analyse, AI-kommentar | 4 | **kode klar på branch 26. aug** — merge/deploy etter P4, etter v1.3.8/v1.4.0 |
| **v1.6.0** | «Liga-pakka»: rival-radar, ligagraf, kaptein-liga, roast-rapport | 5 | P4-mergen (v1.3.8–v1.5.0 først) |
| **v1.7.0** | «/innsikt»: benkesløsing, kapteinsfasit, flaksbarometer, rundens XI | 5 | v1.6.0 |
| **v1.8.0** | «Spiller-pakka»: spillerkort, duell, differensialer, straffer | 5 | v1.7.0 |
| **v1.9.0** | «Planleggingspakka»: chip-planlegger, deadline-sjekk, kalender-feed | 5 | v1.8.0 |
| *(uten nr)* | Senere/idéer | — | ikke planlagt |

Kalenderlogikk: utviklingssporet (v1.3.0 → v1.3.1+) går uavbrutt;
portene fyres når dato/Marius tillater, uten å blokkere sporet.

## Kø — hva gjøres videre, i rekkefølge

### 1. (P4) Kostnadskontroll etter prisskiftet

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

### 2. (P3) Etter GW2: verifiser transfers-skjemaet mot ekte data

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

### 3. (P2) README-skjermbilder + mobil-QA `[Marius]`

- **Hva:** Del 6-restene fra sesongstart-verifiseringen: ~~skjermbilder til
  README~~ (**utført 26. aug** — Playwright mot prod, `docs/img/`), og
  mobilvisning på ekte telefon (vannrett scroll, sticky hode, footer,
  norsk, AI-merke).
- **Eier detaljene:** restpunkt-listen i `docs/sjekkpunkt-d-kostnad.md`.
- **Blokkert av:** Marius (nettleser + telefon).
- **Størrelse:** liten.

### 4. Robusthetsreleasene (besluttet 25. aug — detaljene i `docs/plan-sluttspurt.md`)

Alle fem kandidatene fra kvalitetspasset er avgjort: fire bygges som egne
releaser, den femte (filterSummaryPoints) får en gratis genitiv-fiks i
stedet for den AI-kostende promptendringen (droppet). Rekkefølge:

- [x] **v1.3.5 Ryddig avslutning:** `createShutdown` i `middleware.js` +
      SIGTERM/SIGINT-håndtering i `server.js`. Docker slipper å SIGKILL-e
      ved deploy, og helsesjekk-beviset (`kill 1`) blir mulig.
- [x] **v1.3.6 gameUpdating-livssyklus:** tidsstemplet flagg med 5 min
      utløp i `fplClient.js` + forklarende 503-side ved kaldstart i
      oppdateringsvindu (`createErrorHandler`).
- [x] **v1.3.7 Persistent brief-markør:** `lastSentEvent` til
      `data/brief-state.json` (`DATA_DIR`-env, volum `/app/data` i
      Coolify) — redeploy i 15-min-vinduet kan ikke re-poste briefen.
      **Utført 26. aug** — volum lagt til, pushet og verifisert i prod.
- [ ] **v1.3.8 Genitiv-fiks i nyhetsfilteret:** navnevarianter uten
      genitiv-s i `filterSummaryPoints` (`news.js`). 0 AI-kall.
      **Kode klar 26. aug** på `fix/genitiv-nyhetsfilter-v138` —
      merge + tag + push etter P4.
- [ ] **v1.4.0 Alderstak + dataAlder:** stale data eldre enn 10 min
      (live) / 60 min (resten) får banner «Viser data fra HH:MM …»;
      `/api/brief.json` og `/api/live.json` får `dataAlder` (sekunder).
      **Kode klar 26. aug** på `feat/alderstak-v140` (stablet) —
      merge + tag + push etter P4.
- [ ] **v1.5.0 «Overganger» total:** angre-analyse med per-runde-detaljer,
      hva hvis-planlegger med full FPL-regelsjekk, lagrede navngitte
      scenarier med FT-regnskap og oppfølging, alternativ-analyse,
      sesongkort, «laget uten bytter»-simulering, prisgevinst og
      AI-kommentar (1x/døgn). Fasit: `docs/plan-overganger-v150.md`.
      **Kode klar 26. aug** på `feat/overganger-v150` (stablet, T1–T13,
      454/454, røyktest grønn) — merge + tag + push etter P4,
      etter v1.3.8 og v1.4.0.

### 5. Idépakken v1.6.0–v1.9.0 (besluttet 27. aug)

- **Hva:** 16 nye funksjoner valgt av Marius, alle nøkkelvalg avgjort i
  fire spørsmålsrunder. Fire versjoner: liga-pakka → /innsikt →
  spiller-pakka → planleggingspakka.
- **Eier detaljene:** `docs/plan-idepakken-v16-v19.md` (beslutningsfasit).
  Hver versjon får egen detaljplan-økt (T-tasks, TDD) før bygging.
- **Blokkert av:** P4-mergen — v1.3.8/v1.4.0/v1.5.0 skal inn i main
  først, så ny branch per versjon fra main (ingen 4. etasje på stabelen).
- **Størrelse:** stor (fire releaser).

## Dokumentkart — hvor alt bor

Én eier per fil; alt uten leserverdi for en ny økt ligger i `docs/arkiv/`
eller git. En ny økt leser `docs/HANDOVER.md` → køen her → resten ved behov.

| Fil | Rolle |
| --- | --- |
| `ROADMAP.md` (rot) | fasiten: versjonsplan, kø, dokumentkart, historikk |
| `docs/HANDOVER.md` | nåtilstand + lærdommer + beslutninger (tak 200 linjer) |
| `docs/VIDERE.md` | Marius' ikke-tekniske kortversjon |
| `docs/arkiv/plan-v130-ui-overhaul.md` | godkjent plan for v1.3.0–v1.3.3 (UI-overhaling), utføres etappevis |
| `docs/sjekkpunkt-d-kostnad.md` | metode + skript for P4-målingen |
| `docs/plan-sluttspurt.md` | gjeldende plan: robusthetsreleasene, portene og docs-ryddingen |
| `docs/arkiv/plan-v134-ai-swr.md` | utført plan for v1.3.4 (SWR + oppfrisker) |
| `docs/arkiv/` (17 filer) | utførte planer + historikk (kun sti-referanser rettes ved rydding) |

## Senere / idéer (ikke planlagt)

- Prisendrings-varsler (daglig prissnapshot, Discord ved endring i troppen)
- E-postvarsling som alternativ til Discord
- Spillerbilder (FPLs `p{code}.png`, 609 × ~10 KB) — bevisst utelatt fra
  v1.3-overhalingen (beslutning F-g i planen)
- BPS-race live: topp 3 bonuskandidater per kamp mens kampene går
- FPL-karrieren: tidligere sesonger (beste rank, rekorder) som egen side
- Badges/merkedager: «beste runde noensinne», «3 grønne piler på rad»
- PWA: installer appen på mobilen som egen app med ikon
- ~~AI-kommentar til overgangsanalysen~~ — bygget i v1.5.0

---

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
