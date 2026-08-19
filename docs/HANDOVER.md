# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + ROADMAP.md, fortsett der «Neste steg» sier.

**Sist oppdatert:** 2026-08-19 (økt 1, v0.1.0 ferdig)

## Status

- Plan godkjent av bruker. Full plan: `C:\Users\mariu\.claude\plans\full-claude-code-prompt-ancient-crescent.md`
  (essensen ligger i CLAUDE.md + ROADMAP.md — de er autoritative)
- **v0.1.0 FERDIG og tagget**: dashboard (/), /health, cache (SWR+dedup),
  fplClient (retry/503), mørkt tema, Dockerfile. 18/18 tester grønne, lint grønn.
  Røyk-testet lokalt (200 på / og /health, 404 OK) OG i Docker-container (health 200).
- **GitHub FERDIG**: privat repo `https://github.com/maskj2560/fpl-dashboard`,
  main + tag v0.1.0 pushet, remote `origin` koblet. Bruker: maskj2560.
- **Coolify GJENSTÅR**: instans på `dash.marsk.no` (hoster marsk.no og
  utevakt.marsk.no). Appen skal på `fpl.marsk.no`. Venter på brukerens valg:
  UI-oppsett selv (oppskrift i README) eller automatisering via Coolify-API
  (trenger API-token i fil + eksisterende GitHub App-source i Coolify).
  DNS: A-post for fpl.marsk.no må pekes mot serveren (hvis ikke wildcard finnes).
- **v0.2.0 PÅBEGYNT, avbrutt av bruker («Stopp»)**. Nøyaktig WIP-status:
  - `src/routes/players.js` skrevet ✅ (rute ferdig, sortert på total_points)
  - `views/players.ejs` skrevet ✅ (full tabell + filter-form med id-er:
    filter-search/position/team/price/reset/count, tabell id=players-table,
    th har data-type="num|text" + aria-sort; rader har data-name/pos/team/price)
  - GJENSTÅR for v0.2.0:
    1. Montere ruten i `src/server.js`: `import playersRouter from './routes/players.js'`
       + `app.use('/spillere', playersRouter)` (FØR 404-handleren)
    2. Legge til `<a href="/spillere">Spillere</a>` i nav i `views/layout.ejs`
       (med aria-current-mønsteret som Dashboard-lenken)
    3. `public/app.js`: modul for #players-table — kolonnesortering (klikk på th,
       toggle asc/desc, parseFloat for data-type=num, oppdater aria-sort) +
       filtrering (søk mot data-name, posisjon mot data-pos, lag mot data-team,
       maks pris mot data-price, teller «Viser X av Y» i #filter-count, Nullstill)
    4. `public/style.css`: stiler for .page-head, .filters (labels, inputs,
       selects, button — mørkt tema-tokens finnes i :root) og th-sortering
       (cursor pointer, pil-indikator på aria-sort)
    5. Røyk-test /spillere, lint+test, CHANGELOG under [Unreleased] → [0.2.0],
       huk av i ROADMAP, commit + tag v0.2.0 (+ bump package.json version)

## Brukerens beslutninger (fra brainstorming, IKKE re-spør)

- AI-modell: `claude-sonnet-5` overalt via `AI_MODEL`-env (Haiku 4.5 som billig-alternativ)
- Scope utvidet med: AI-gameweek-brief (v0.8.0), AI transfer-rådgiver (v0.8.0),
  auto-brief til Discord før deadline (v0.9.0)
- Kostnadskrav: AI må være billig for én person — alt on-demand + cachet
- Layout: egen liten EJS-layout-helper, IKKE express-ejs-layouts
- RSS: `fast-xml-parser` når v0.7.0 startes
- Bruker stopper økter ved ~95 % usage → oppdater denne filen grundig før stopp

## Neste steg (i rekkefølge)

1. `git init` + commit `chore: initial project docs` (Steg 0 ferdig)
2. Milepæl v0.1.0 etter planen i ROADMAP.md — commit-rekkefølge:
   scaffolding → config.js → cache.js+tester → fplClient.js → server/dashboard → analysis-tester → Docker/README → release 0.1.0 + tag

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

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`
- FPL_TEAM_ID: ukjent — bruker setter selv i `.env` (placeholder i `.env.example`)

## Åpne beslutninger / kjente feil

- Ingen ennå.
