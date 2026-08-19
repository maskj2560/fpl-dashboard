# Changelog

Alle vesentlige endringer i prosjektet dokumenteres i denne filen.

Formatet følger [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
