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
- **Venter på bruker**: `gh auth login` — deretter opprette GitHub-repo, koble
  remote, pushe main + tag v0.1.0. Så setter bruker opp Coolify (oppskrift i README).
- Neste milepæl: v0.2.0 /spillere (se ROADMAP.md).

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

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`
- FPL_TEAM_ID: ukjent — bruker setter selv i `.env` (placeholder i `.env.example`)

## Åpne beslutninger / kjente feil

- Ingen ennå.
