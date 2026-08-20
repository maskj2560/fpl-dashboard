# Roadmap — FPL-dashboard

Milepælene fullføres i rekkefølge. En milepæl er ferdig når alt er huket av,
`npm test` og `npm run lint` er grønne, CHANGELOG er oppdatert og endringene er
committet (og pushet hvis remote finnes).

## v0.1.0 — Deploybart skjelett (MVP)

- [x] Prosjektoppsett: package.json, ESLint, mappestruktur fra CLAUDE.md
- [x] `fplClient.js` med TTL-cache, stale-while-revalidate, dedup og 503-håndtering
- [x] Dashboard-side (/): deadline-nedtelling, flagg/skader, topp form, mest kjøpt/solgt, FDR-matrise
- [x] `/health`-endepunkt
- [x] Dockerfile + .dockerignore + README med Coolify-oppskrift
- [x] Tester for cache.js
- [x] **→ Deploy til Coolify med auto-deploy skjer her** (live på https://fpl.marsk.no)

## v0.2.0 — Spillere

- [x] /spillere: full tabell med sortering, filtrering og søk
- [x] Vanilla JS for sortering/filter uten sidelasting

## v0.3.0 — Mitt lag og anbefalinger

- [x] /lag: oppstilling, benk, kaptein, lagverdi, rank-graf
- [x] `analysis.js`: kapteinsanbefaling med begrunnelse (topp 3)
- [x] `analysis.js`: transfers ut + inn-kandidater innenfor budsjett
- [x] Tester for all analyselogikk

## v0.4.0 — Miniliga

- [x] /liga: tabeller for alle ligaene mine
- [x] Differensial-analyse mot leder/rival

## v0.5.0 — Gameweek-brief

- [x] /brief-siden + `GET /api/brief.json`
- [x] Skadenytt, kapteinsvalg, fixtures per dag, mine anbefalinger i kortform

## v0.6.0 — Live-visning

- [x] /live: mine spilleres live-poeng, bonusestimat, miniliga-ranker
- [x] `GET /api/live.json` + polling hvert 60. sek kun mens kamper pågår
- [x] «Sist oppdatert»-indikator

## v0.7.0 — Nyheter med AI-oppsummering

- [x] `news.js`-service: henter FPL-relevante RSS-feeder (gratis)
- [x] `ai.js` felles-service: lazy init, modell fra `AI_MODEL`
      (default `claude-sonnet-5`, `claude-haiku-4-5` som billig-alternativ)
- [x] Valgfri AI-oppsummering når `ANTHROPIC_API_KEY` er satt — cachet,
      regenereres maks hver 30. min
- [x] Uten nøkkel: vis rå nyhetsliste fra feedene (appen krever aldri nøkkelen)
- [x] Nyhetspanel på dashboardet + egen /nyheter-side

## v0.8.0 — AI-brief og transfer-rådgiver

- [x] AI-versjon av /brief: modellen skriver briefen på norsk fra data-briefens
      JSON — maks én generering per time, cachet, data-brief som fallback
- [x] «Spør AI om råd»-knapp på /lag → `POST /api/ai-rad` med tropp +
      analysis-data, begrunnede råd tilbake, cachet 1 time
- [x] Tester for prompt-bygging (rene funksjoner)

## v0.9.0 — Auto-brief før deadline

- [x] `notify.js`: deadline-scheduler uten cron-avhengighet (timer mot neste
      `deadline_time` − `BRIEF_HOURS_BEFORE_DEADLINE`, re-sjekk daglig)
- [x] Poster AI-briefen (eller data-brief uten nøkkel) til `DISCORD_WEBHOOK_URL`
- [x] Uten webhook-URL: funksjonen er inaktiv

## v1.0.0 — Polish

- [x] Mobilgjennomgang av alle sider (CSS-revisjon + media query under 480 px —
      bekreftelse på ekte mobil gjenstår hos bruker)
- [x] Feilsider, tomtilstander og lastetilstander
- [x] Gjennomgang av cache-TTL-er mot faktisk bruk
- [x] README komplett (skjermbilder gjenstår — krever nettleser hos bruker)

## v1.0.1 — AI og Discord i drift (Milepæl 1)

- [x] Anti-spam-guard i `notify.js`: ingen re-sending av auto-briefen ved
      deploy/restart i sendevinduet (`sendDecision`, TDD)
- [x] Usage-logging per AI-kall (modell + inn/ut-tokens) for kostnadskontroll
- [x] Lokal pre-flight av alle fire AI-funksjonene mot ekte API
- [x] Auto-briefen verifisert mot ekte Discord-webhook (inkl. anti-spam-guard)
- [x] `ANTHROPIC_API_KEY` + `DISCORD_WEBHOOK_URL` + `FPL_TEAM_ID` i Coolify
- [ ] Naturlig auto-brief torsdag 20. aug ~19:30 verifisert
- [ ] Kostnadskontroll etter 2–3 dager i drift

## v1.1.0 — UI-makeover «Matchday» (Milepæl 2 + 3)

- [x] View-render-tester for alle sider med mockdata og tomtilstander,
      inkludert låsing av XSS-escapingen i live/news/brief (sikkerhetsnett)
- [x] Lokal Archivo-font + kontrastverifisert tokenpalett
- [x] Én-linjes scrollbar navigasjon, hero som broadcast-scoreboard
- [x] Enhetlig kort- og tabellsystem på alle sider
- [x] /spillere, /lag (pitch + arealgraf), /live, /liga, /brief, /nyheter
- [x] Gjennomdesignede tom- og feiltilstander, mobil-finpuss
- [x] QA-runder 1–5 hos bruker

## v1.1.1 — QA-rettelser

- [x] P0-1 asset-versjonering med innholdshash + DEPLOY.md (Cloudflare-purge)
- [x] P0-2 tabellhodet legger seg ikke under toppmenyen
- [x] P1-1…P1-7 tomtilstander, /health-konsistens, AI-faktakontroll,
      RSS-duplikater, kontrast
- [x] P2-1…P2-6 + P2-8 kontrast, norske skadetekster, ordbrudd, FDR på mobil,
      statstripe og kortlayout
- [x] Verifisert lokalt: 111 tester, lint 0, alle ruter 200, kontrast 8/8 par
      over 4,5:1, Playwright 103 sjekker uten feil på fire viewports
- [x] Deployet og verifisert i prod (push + Cloudflare-purge gjort 2026-08-20)

## v1.1.2 — visuelle QA-rettelser

- [x] P1-1 mørk scrollbar i tabellbokser (Firefox + WebKit)
- [x] P1-2 mobilmenyen viser sidescroll-hint (dynamisk kantfade + scroll-snap)
- [x] P2 engelsk UI-tekst oversatt (Dashbord, Runde, Totalrangering, P/K, Klar)
- [x] P3 skadestatus-oversettelsen dekker alle 72 `news`-mønstre fra FPL
- [x] P4 brief-prompten krever norske fotballuttrykk
- [x] Verifisert lokalt (118 tester, lint 0, Playwright 38/38 på 390 + 1440 px)
      og i prod (alle ruter 200, ny asset-hash, oversettelser synlige)

## v1.1.3 — kvalitetspass (29 verifiserte funn)

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
- [ ] P1-5b og P3-1…P3-5 → «v1.2.0-kandidater» under

## v1.2.0 — «Overganger»: historisk hva hvis-analyse (planlagt)

_Plan: `docs/plan-hva-hvis-transfers.md`. Versjonsnummeret settes endelig ved
release; rykker M4-kandidatene først, forskyves det._

- [ ] fplClient: `getEntryTransfers` (5 min) + `getLiveHistoric` (6 t, kun ferdige runder)
- [ ] `transfers.js`: buildTransferAnalysis — vindu, diff, straff, chips, kanttilfeller
- [ ] `assembleTransferAnalysis` — henting via cache, maks 38 live-kall
- [ ] /overganger: view, rute, nav, tomtilstander, view-tester
- [ ] Røyktest lokalt (alle ruter 200, AI/Discord av) + docs
- [ ] Etter GW2: verifiser transfers-skjemaet mot ekte data

## Senere / idéer (ikke planlagt)

### v1.2.0-kandidater (samles under sesongstart-verifiseringen, M4)

_Ikke-kritiske funn fra verifiseringen 20.–24. august legges her. Ingen av
dem fikses uten avtale._

Fra kvalitetspasset v1.1.3 (P3-funn — reelle, men større redesign; bevisst
ikke gjort midt i sesongstart-verifiseringen):

- **`gameUpdating`-livssyklus** (`fplClient.js`): flagget er globalt, settes av
  503 på ett endepunkt og nullstilles av suksess på et hvilket som helst annet.
  Med varm cache kan banneret bli stående i 15 min etter at FPL er friskt, og
  ved kaldstart under et oppdateringsvindu 500-er sidene i stedet for å vise
  banneret. Redesign: tidsstemplet flagg eller status per endepunkt i
  cache-metadata.
- **Failure-backoff i `cache.js`**: ved varig FPL-nedetid trigger hver request
  en ny bakgrunnshenting (3 forsøk × 10 s). Legg minst 30 s mellom mislykkede
  revalideringer per nøkkel, og vurder alderstak på stale data + `dataAlder`
  i payloaden.
- **SWR i `ai.js`**: første besøkende per intervall venter hele Claude-
  rundturen (5–20 s). Cache.js-mønsteret ville servert cachet tekst med én
  gang og regenerert i bakgrunnen. NB: endrer semantikken «AI-kall skjer ved
  sidebesøk» som verifiseringen bygger på — må avklares først.
- **`sanitizeBriefText` robusthet** (`prompts.js`): setningssplittingen deler
  på forkortelsespunktum («kl.», «f.eks.»), og lagnavn matches kun mot FPLs
  kortnavn («Spurs») selv om modellen kan skrive «Tottenham». Vurder alias-map
  + splitting som kjenner forkortelsene.
- **`filterSummaryPoints` dybde** (`news.js`): genitiv («Haalands») bommer på
  substring-matchen, så korrekte punkter droppes. Robustheten ligger ett nivå
  opp: be modellen sitere kildeindeks per punkt og verifiser indeksen.
  Promptendring → koster AI-kall å teste, må avtales.

- **Persistent «brief sendt»-markør for auto-briefen.** `lastSentEvent` lever
  bare i minnet, så en redeploy innenfor MAX_LATE_MS (15 min) etter en sendt
  brief re-poster den. Varig løsning krever tilstand som overlever containeren
  (fil på volum eller ekstern kilde) — arkitekturbeslutning som må tas
  bevisst, ikke smugles inn (kvalitetspass v1.1.3, P1-5b)

### Andre idéer

- AI-kommentar til overgangsanalysen (bevisst utelatt fra v1: tallene taler
  for seg, koster per generering — ettermonteres via ai.js ved behov)
- Prisendrings-varsler
- E-postvarsling som alternativ til Discord
