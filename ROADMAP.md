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
- [ ] Auto-briefen verifisert mot ekte Discord-webhook
- [ ] `ANTHROPIC_API_KEY` + `DISCORD_WEBHOOK_URL` + `FPL_TEAM_ID` i Coolify
- [ ] Naturlig auto-brief onsdag 20. aug ~19:30 verifisert
- [ ] Kostnadskontroll etter 2–3 dager i drift

## v1.1.0 — UI-makeover «Matchday» (Milepæl 2 + 3)

- [x] View-render-tester for alle sider med mockdata og tomtilstander,
      inkludert låsing av XSS-escapingen i live/news/brief (sikkerhetsnett)
- [x] Lokal Archivo-font + kontrastverifisert tokenpalett
- [ ] Én-linjes scrollbar navigasjon, hero som broadcast-scoreboard
- [ ] Enhetlig kort- og tabellsystem på alle sider
- [ ] /spillere, /lag (pitch + arealgraf), /live, /liga, /brief, /nyheter
- [ ] Gjennomdesignede tom- og feiltilstander, mobil-finpuss
- [ ] QA-runder 1–5 hos bruker

## Senere / idéer (ikke planlagt)

- Historisk «hva hvis»-analyse av egne transfers
- Prisendrings-varsler
- E-postvarsling som alternativ til Discord
