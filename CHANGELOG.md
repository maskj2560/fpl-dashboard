# Changelog

Alle vesentlige endringer i prosjektet dokumenteres i denne filen.

Formatet følger [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-08-19

### Added

- `/health` viser nå hvilke valgfrie funksjoner som er aktive (AI, Discord,
  team-ID, antall ligaer) — uten å røpe verdiene. Gjør det mulig å se utenfra
  om miljøvariablene faktisk nådde containeren
- Rank-grafen har fått et arealfyll under linjen (`rankGraph` returnerer
  `area`)

### Changed

- **UI-makeover «Matchday» fullført.** Dashboardets hero er nå et
  broadcast-scoreboard: GW-merke, store Archivo-sifre som selve overskriften og
  en grønn-til-magenta hairline i bunnkanten
- Ett kort- og tabellsystem på alle sider, med sticky tabellhode når innholdet
  scroller inne i kortet
- Spillersiden: tydeligere filterfelt, «Viser X av Y» høyrestilt i panelet og
  grønn markering av kolonnen det sorteres på
- Lagsiden: banen har klippestriper, 16-meter og midtsirkel, kapteinen har
  magenta ring, og rank-grafen har grunnlinjer og arealfyll
- Live-siden: kampene vises som scoreboard-kort med stor stilling og
  statuspille; kampen som ruller nå får magenta ramme
- Ligasiden: din egen rad har grønn kantstripe så den er synlig også når
  tabellen scrolles vannrett
- AI-generert innhold er merket likt på dashboardet, /brief og /nyheter — eget
  kort med «AI»-merke og magenta kantstripe, adskilt fra rådataene
- Tomtilstandene sier hva som skjedde og hva du kan gjøre, ikke bare «ingen
  data». AI-rådgiveren viser en animert ventelinje mens den tenker
- All bevegelse ligger bak `prefers-reduced-motion`

### Fixed

- Nav-markeringen er riktig også på feilsiden

## [1.0.1] - 2026-08-19

### Added

- Logglinje per vellykket AI-kall med modell og tokenbruk inn/ut, slik at
  kostnaden kan leses direkte i serverloggen

### Changed

- Ny visuell retning «Matchday»: selvhostet Archivo (variabel, OFL, 34 kB) som
  display-snitt for titler og tall, og en fornyet fiolett kampkveld-palett der
  alle tekst- og merkefarger er kontrastverifisert mot WCAG
- Topbaren er én linje på alle skjermstørrelser. På mobil sveiper du gjennom
  menyen i stedet for at den brekker til flere linjer, aktiv side scrolles
  automatisk inn i syne, og baren er sticky igjen

### Fixed

- Navigasjonen markerer riktig side igjen. `aria-current` ble escapet av EJS og
  stien var relativ til router-mounten, så bare «Dashboard» kunne bli markert —
  og markeringen nådde verken CSS-en eller skjermlesere
- Auto-briefen sendes ikke på nytt når appen deployes eller restartes i
  sendevinduet før deadline. Er det planlagte send-tidspunktet passert med
  mer enn én time, markeres runden som håndtert og hoppes over

## [1.0.0] - 2026-08-19

### Added

- Mobiltilpasning for skjermer under 480 px: topbaren er ikke lenger sticky,
  strammere marger, smalere filterfelt og ordbryting av lange navn
- Tomtilstand på nyhetssiden når ingen feed svarer
- Versjonsnummer og «sist oppdatert» nederst på hver side, inkludert feilsidene.
  Tidspunktet er når serveren startet, altså når siste versjon ble deployet

## [0.9.0] - 2026-08-19

### Added

- Auto-brief til Discord (`notify.js`): briefen postes til
  `DISCORD_WEBHOOK_URL` et valgt antall timer før deadline
  (`BRIEF_HOURS_BEFORE_DEADLINE`, standard 24). AI-briefen brukes når nøkkel
  finnes, ellers data-briefen. Uten webhook-URL er funksjonen inaktiv

## [0.8.0] - 2026-08-19

### Added

- Promptbyggere (`prompts.js`) for AI-brief og transfer-rådgiver, med tester
- AI-skrevet gameweek-brief øverst på `/brief` når `ANTHROPIC_API_KEY` er satt,
  maks én generering per time. Data-briefen vises alltid under som fallback
- «Spør AI om råd»-knapp på `/lag` som sender troppen til `POST /api/ai-rad`
  og viser begrunnede råd, cachet i én time per lag og gameweek

## [0.7.0] - 2026-08-19

### Added

- Felles AI-service (`ai.js`) mot Claude API med lazy init, modell fra
  `AI_MODEL` og hard cache med minimumsintervall per funksjon. Uten
  `ANTHROPIC_API_KEY` er alle AI-funksjoner av, og appen viser rå data
- Nyhetsside (`/nyheter`) med RSS-saker fra britiske kilder (BBC og Sky som
  standard, overstyres med `NEWS_FEEDS`), cachet i 15 minutter
- Valgfri AI-oppsummering av nyhetene på norsk, maks én generering per 30 min
- Nyhetspanel på dashboardet med de tre øverste AI-punktene

## [0.6.0] - 2026-08-19

### Added

- Bonusestimat (`estimateBonus`) som leser BPS fra pågående kamper og
  fordeler 3/2/1 etter FPL-reglene, inkludert delte plasser
- Live-side (`/live`) med egne spilleres live-poeng, bonusestimat, effektive
  poeng med kaptein- og benkvekting, kampstillinger og miniliga-topp
- `GET /api/live.json` og polling hvert 60. sekund kun mens kamper pågår
- «Sist oppdatert»-indikator med puls som viser om kamper er i gang

## [0.5.0] - 2026-08-19

### Added

- `brief.js`-service som setter sammen gameweek-briefen fra rene data:
  skadenytt for høyt eide spillere, globale kapteinsvalg, kamper gruppert
  per dag i norsk tid, og egne anbefalinger når `FPL_TEAM_ID` er satt
- Brief-side (`/brief`) med deadline, skadenytt, kapteinsvalg, kampprogram
  per dag og egne kaptein- og transferkandidater
- `GET /api/brief.json` med samme brief som JSON

## [0.4.0] - 2026-08-19

### Added

- Differensial-analyse (`differentials`) som finner spillere rivalen har og du
  mangler, og omvendt — sortert på eierandel
- Ligaside (`/liga`) med tabell for hver private miniliga, rank-endring med
  pil, egen rad uthevet og lenke til hver rival
- Differensialer mot ligalederen, eller mot valgt rival via `?rival=<id>`

### Fixed

- Nav-lenken «Lag» ble markert som aktiv også på `/liga`

## [0.3.0] - 2026-08-19

### Added

- Analysefunksjoner for kapteinsvalg, salgs- og kjøpskandidater og rank-graf
  (`averageFdr`, `playProbability`, `captainSuggestions`,
  `transferOutCandidates`, `transferInCandidates`, `rankGraph`) med tester
- Lagside (`/lag`) med oppstilling per rekke, benk, kaptein- og visekapteinmerke,
  GW-poeng, totalpoeng, overall rank, lagverdi og bank
- Rank-graf per gameweek på lagsiden
- Kapteinsanbefaling topp 3 med begrunnelse, og salgskandidater med
  erstattere innenfor budsjett
- Egen side når `FPL_TEAM_ID` mangler, med oppskrift på hvor ID-en finnes

## [0.2.0] - 2026-08-19

### Added

- Spillerside (`/spillere`) med full tabell: navn, lag, posisjon, pris, form,
  poeng, poeng per kamp, eierandel, xG, xA og status
- Klientside-sortering på alle kolonner i spillertabellen (klikk eller
  tastatur på kolonneoverskriften, med retningsindikator)
- Filtrering på posisjon, lag og maks pris + tekstsøk, alt uten sidelasting
- Stiler for sidehode, filterpanel og sorterbare kolonneoverskrifter

## [0.1.0] - 2026-08-19

### Added

- Dashboard (`/`) med deadline-nedtelling i norsk tid, ukens flagg
  (skader/suspensjoner sortert på eierandel), topp 10 form, mest kjøpt/solgt
  denne runden og FDR-matrise for neste 5 gameweeks (sortert på snitt-FDR,
  håndterer blanke og doble runder)
- `/health`-endepunkt for Coolify-helsesjekk
- FPL-klient med nettleser-User-Agent, 10 s timeout, 2 retries med backoff
  og 503-håndtering («game is being updated» → banner + sist kjente data)
- TTL-cache med stale-while-revalidate og deduplisering av samtidige kall
- Mørkt tema med CSS-variabler, responsivt, systemfonter, ingen CDN-er
- Dockerfile (node:22-alpine, non-root, HEALTHCHECK) + Coolify-oppskrift i README
