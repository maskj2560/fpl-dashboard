# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + ROADMAP.md, fortsett der «Neste steg» sier.

**Sist oppdatert:** 2026-08-19 (økt 2, v0.4.0 ferdig)

## Status

- **Aktiv implementeringsplan: `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`**
  — den inneholder ferdigspesifiserte oppgaver med komplett kode for v0.2.0 → v1.0.0.
  Avkryssing skjer i plan-filen (per steg) og i ROADMAP.md (per milepæl).
- Full opprinnelig plan: `C:\Users\mariu\.claude\plans\full-claude-code-prompt-ancient-crescent.md`
  (essensen ligger i CLAUDE.md + ROADMAP.md — de er autoritative)
- **v0.1.0 FERDIG og tagget**: dashboard (/), /health, cache (SWR+dedup),
  fplClient (retry/503), mørkt tema, Dockerfile. 18/18 tester grønne, lint grønn.
  Røyk-testet lokalt (200 på / og /health, 404 OK) OG i Docker-container (health 200).
- **GitHub FERDIG**: privat repo `https://github.com/maskj2560/fpl-dashboard`,
  main + tag v0.1.0 pushet, remote `origin` koblet. Bruker: maskj2560.
- **Coolify FERDIG og verifisert (økt 2)**: appen er live på https://fpl.marsk.no
  (bak Cloudflare). Auto-deploy fra `main` er bekreftet: push av v0.2.0 ga 200 på
  `/spillere` i prod noen minutter senere. Verifiser etter hver push med
  `(Invoke-WebRequest https://fpl.marsk.no/<side> -UseBasicParsing).StatusCode`.
- **v0.2.0 FERDIG og tagget**: `/spillere` montert med nav-lenke, full tabell,
  klientside-sortering på alle kolonner og filtrering (søk/posisjon/lag/maks pris)
  uten sidelasting, stiler for filterpanel og sorterbare overskrifter.
  18/18 tester grønne, lint grønn, røyk-testet lokalt (200 på `/spillere`,
  `players-table` i HTML, `/style.css` og `/app.js` serveres). Verifisert i prod.
- **v0.3.0 FERDIG og tagget**: `/lag` med oppstilling per rekke, benk, C/V-merker,
  statstripe (GW-poeng, totalt, overall rank, lagverdi, bank), SVG-rank-graf,
  kapteinsanbefaling topp 3 med begrunnelse og salgskandidater med erstattere
  innenfor budsjett. Ny analyselogikk (`averageFdr`, `playProbability`,
  `captainSuggestions`, `transferOutCandidates`, `transferInCandidates`,
  `rankGraph`) med TDD — 24/24 tester grønne, lint grønn.
- **v0.4.0 FERDIG og tagget**: `/liga` med tabell per privat miniliga (rank-endring
  med pil, egen rad uthevet, lenke til hver rival) og differensialer mot leder
  eller `?rival=<entryId>`. `differentials()` i analysis.js med test — 25/25 grønne.
- **VIKTIG om sesongen:** 2026/27 har ikke startet. FPL melder neste GW = 1 med
  deadline 2026-08-21T17:30Z. Før den er passert har FPL ingen picks, ingen
  historikk og ingen ligatabeller: `/lag` viser tomtilstanden «Fant ingen
  lagoppstilling ennå», og `/liga` vil trolig gjøre noe tilsvarende. Grener som
  krever tropp må derfor verifiseres med mockdata-rendring lokalt (se
  `views/team.ejs`-verifiseringen i plan-filen, Task 3.3 Steg 3) fram til
  21. august — ikke tolk tomme sider som feil.

## Brukerens beslutninger (fra brainstorming, IKKE re-spør)

- AI-modell: `claude-sonnet-5` overalt via `AI_MODEL`-env (Haiku 4.5 som billig-alternativ)
- Scope utvidet med: AI-gameweek-brief (v0.8.0), AI transfer-rådgiver (v0.8.0),
  auto-brief til Discord før deadline (v0.9.0)
- Kostnadskrav: AI må være billig for én person — alt on-demand + cachet
- Layout: egen liten EJS-layout-helper, IKKE express-ejs-layouts
- RSS: `fast-xml-parser` når v0.7.0 startes
- Bruker stopper økter ved ~95 % usage → oppdater denne filen grundig før stopp

## Neste steg (i rekkefølge)

1. **Milepæl v0.5.0 — Gameweek-brief (data, uten LLM).** Følg plan-filen fra
   «Task 5.1»: `src/services/brief.js` + `test/brief.test.js` (TDD) →
   `/brief`-side og `GET /api/brief.json` → release v0.5.0.
2. Deretter v0.6.0 (/live) og videre i plan-filens rekkefølge.

## Logg over brukerbeskjeder (alle økter — føres løpende)

- 2026-08-19: «Ikke limit deg så mye — lag det så bra du kan med gode nok modeller»
- 2026-08-19: «Men selve AI-en i fantasy må være relativt billig å bruke for én person»
- 2026-08-19: «Bruk brainstorming mens du lager det» → brainstorming kjørt, tre AI-funksjoner + Sonnet 5 valgt
- 2026-08-19: «Nærmer jeg meg maks usage i 5-timersvindu: stopp ~95 %, lag ekstremt detaljert handover som neste AI finner uten forklaring» → denne filen + CLAUDE.md-instruks
- 2026-08-19: «Husk å koble det til GitHuben min» → gh CLI installert men IKKE innlogget; bruker må kjøre `gh auth login`, deretter: opprett repo, koble remote, push
- 2026-08-19: «Si ifra hvis du trenger at jeg gjør noe»
- 2026-08-19: «Ta notat av alt jeg sier» → denne loggen
- 2026-08-19: «Kan jeg konstant se oppdatert todo-liste?» → ROADMAP.md hukes av fortløpende (ikke bare ved milepæl-slutt); bruker åpner den i VS Code markdown-preview
- 2026-08-19: «Stopp» → v0.2.0-arbeid stoppet midt i (WIP-status over)
- 2026-08-19: «Fiks deploy til Coolify og GitHub og auto-deploy først» → PRIORITET før v0.2.0 fortsetter: GitHub-repo + push + Coolify-oppsett. Blokkert på `gh auth login` fra bruker.
- 2026-08-19: «Oppdater ROADMAP, CHANGELOG, CLAUDE.md, HANDOVER kontinuerlig og ofte — alltid oppdatert» → fast rutine: alle fire sjekkes/oppdateres ved hver delfunksjon og hver commit, ikke bare ved milepæler
- 2026-08-19: «Logget inn i gh. Repo skal være PRIVAT. Coolify på dash.marsk.no, hoster marsk.no + utevakt.marsk.no, denne appen skal på fpl.marsk.no» → privat repo opprettet og pushet
- 2026-08-19: «Lag prompt til Claude in Chrome for Coolify-oppsettet + rapport-prompt tilbake» → prompt levert i chat; venter på rapport («RAPPORT TIL CLAUDE CODE — Coolify-deploy fpl-dashboard») før v0.2.0 fortsetter
- 2026-08-19 (økt 2): «Hvor finner jeg to do listen?» → svart: `ROADMAP.md`
  (milepæler) og `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`
  (steg per oppgave), begge i VS Code med Ctrl+Shift+V. Begge hukes av fortløpende.
- 2026-08-19 (økt 2): «Les og følg `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` — den inneholder ALT. Ikke avvik fra planen, ikke bruk subagenter til implementering (model: sonnet hvis unntaksvis nødvendig). Commit plan-filen først, fortell hvor todo-listen er, begynn på første uavkryssede oppgave.» → plan committet (`chore: legg til implementeringsplan v0.2.0-v1.0.0`), arbeid startet på Task 2.1

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`
- FPL_TEAM_ID: ukjent — bruker setter selv i `.env` (placeholder i `.env.example`)

## Åpne beslutninger / kjente feil

- Ingen ennå.
