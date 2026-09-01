# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-01 (økt 51, Opus: tabell-UI på /innsikt fikset,
ligger uutgitt på main under `[Unreleased]`)

## Status akkurat nå
- **v1.8.1 «Redesign av /spillere» MERGET TIL MAIN 1. sep (økt 50).**
  Bygget på `fix/spillere-redesign-v181` (11 commits T1–T11, TDD med rød
  før grønn i hver task, CHANGELOG-linje i hver), release-commit
  `102b6de`, merget `--no-ff` (`35258a7`), tagget `v1.8.1`, pushet.
  **613/613 + lint 0 på branch OG merget main** (baseline 602/602);
  `style.test.js` og `routes.test.js` urørt og grønne.
  CHANGELOG-rekkefølgen kontrollert (1.8.1 → 1.8.0 → 1.7.1).
  Innhold: faner (Modul 12), lavmælte `.navn-lenke`-navn, statusbadge kun
  ved avvik, zebra + «Duell»-etikett, snudd knappehierarki i duell-linja,
  én desimal + `andel` fra `players.js`, segmentbryter + søylestripe,
  **terskelvelger-JS-en som manglet i v1.8.0 (Modul 11)**, dødballkort,
  duell-hoder med drakter, strammere spillerkort, kortere ingress. Ny
  token `--row-alt` i begge temablokker.
  **Røyktest 1. sep med tomme nøkler** (`ai:false, discord:false`):
  `/spillere` 200 (919 KB rå / **44,7 KB gzip**), `/api/spiller/411` 200
  mot ekte FPL-data, `abc` 400, `999999` 404, `/finnesikke` 404, **0
  «AI-kall:»-linjer**. Rendret side: 3 faneknapper, 20 dødballkort, 772
  navnelenker, ekte `--andel`-verdier, INGEN `status-a`-badge (kun d/i/s/u).
  **Sju tekniske planavvik** (bl.a. zebra scopet til `#players-table`,
  `.duell-panel` i stedet for kort-i-kort, `.modal .shirt` med fast
  høyde): rotert til historikkfila, avsnittet «planavvikene i v1.8.1».
- **v1.7.1 og v1.7.0 ute i prod 1. sep/31. aug; v1.3.8–v1.6.0 ute
  28. aug** — alle detaljer og prod-bevis i historikkfila.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted; beviset er
  `kill 1` i containerterminalen — de to avslutningslinjene skal stå der.
  Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **Asset-hashen i prod skal være `257cfce2` etter v1.8.2** (økt 51-QA-
  fiksene endret style.css + app.js; før: `3eef00bb`, v1.8.1 `51d1bbb4`).
  Regnet fra git-blobbene på `main`-toppen, aldri fra arbeidstreet — metoden
  er kontrollert ved at v1.8.0-blobbene fortsatt gir `7a3c28b8` (lærdommene).
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka DROPPET** (28. aug) — følges i `console.anthropic.com`,
  terskler i `docs/sjekkpunkt-d-kostnad.md`. Takt **~49–53 AI-kall/uke**
  (v1.7.0/v1.8.0/v1.8.1 legger til 0).
- **Git akkurat nå:** `main` = `origin/main` (`35258a7`+docs); tagger
  t.o.m. `v1.8.1` pushet. **Rest:** 13 gamle, merget lokale brancher
  (inkl. `fix/spillere-redesign-v181`) — ryddes med `git branch -d`.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

Køen i `ROADMAP.md` er prioriteringen; punkt 0–3 kan bare Marius gjøre —
sjekkliste og ferdige kjøreprompter: `docs/oppgaveliste.md` (økt 51).

0. `[Marius]` **Visuell QA av v1.8.1 i prod** (den gikk ut uten lokal
   test): begge temaer × 390 px og desktop × alle tre faner. Sjekk zebra
   sammen med filtrene (annenhver stripe på SYNLIGE rader),
   segmentbryteren 5/10/15 (skal nå faktisk bytte tabell), søylestripa,
   dødballkortene, duellen med drakter og spillerkortet. Kontroller også
   at `?v=257cfce2` står i HTML-en (ny CSS/JS er faktisk ute). Sjekk samtidig
   tallkolonnene på /innsikt, /liga, /live og /overganger: hodene flyttet seg
   i økt 51 (24 stk `th.num` er nå høyrestilt).
1. `[Marius]` **QA av v1.8.0-funksjonene** — spillerkortet (klikk, Esc, ×,
   backdrop, fokus tilbake til navnet) og duellen (to valgte, tredje hake
   avvises, filtrering fjerner haken, sortering beholder valget).
2. `[Marius]` **Mobil-QA på ekte telefon** (P2-resten) — `/overganger`,
   `/liga`, `/innsikt` og nå `/spillere` (checkbox-kolonne + modal + duell)
   på 390 px, i begge temaer. **Nav har 9 punkter** — sjekk at scrollnavet
   med kantfade (v1.1.2) holder.
3. `[Marius]` **`kill 1` i containerterminalen** → de to avslutningslinjene
   («SIGTERM mottatt — lukker serveren», «Serveren lukket ryddig») er det
   siste beviset for v1.3.5.
4. **P3 ved første ekte transfer:** feltnavnene i
   `entry/5330646/transfers/` (`element_in`, `element_out`, `event`,
   `time`, `event_transfers_cost`) mot ekte API. Marius bytter ikke i GW2
   (besluttet 28. aug), så porten venter på hans første ekte bytte — til
   da er tomtilstanden på `/overganger` korrekt (0 bytter).
5. **Kostnad:** løpende hos Marius i Anthropic-konsollen — ingen måleuke.
6. **Kosmetisk:** slett de 12 gamle lokale branchene — `git branch -d`.

**P0 og P1 er LUKKET 25. aug** (helsesjekken og auto-briefen).
## Driftslærdommer (ikke glem disse)

- **401 med `Basic realm="traefik"`: sjekk FØRST om «HTTP Basic
  Authentication» er huket av for appen i Coolify.** Haken henger en
  basicauth-middleware på HTTPS-routeren og rammer ALLE stier, også
  `/health`; realmnavnet er Traefiks standard, ikke tegn på manglende rute
  (som ville gitt 404). Redeploy hjelper ikke — fjern haken (løst 25. aug).
- **Coolifys «Running (healthy)» sier bare at appen svarer INNE i
  containeren.** Coolifys egen HTTP-sjekk overstyrte Dockerfilens og brukte
  `curl`, som ikke finnes i `node:22-alpine` → «healthy» mens prod svarte
  401 på alt (fikset 25. aug: Coolifys sjekk AV). Også den riktige sjekken
  går utenom Traefik — «prod svarer rart» feilsøkes ALLTID utenfra først.
- **`kill 1` virker FRA v1.3.5 — før det gjorde det ingenting** (målt
  25. aug: null effekt, containeren restartet aldri). PID 1 i et
  container-namespace mottar kun signaler den har egen handler for, og
  appen hadde ingen. Med `createShutdown` på plass er `kill 1` i
  containerterminalen den trygge måten å bevise ryddig avslutning:
  containeren restartes av `unless-stopped` og BEHOLDER loggen.
  Aldri `docker stop`/`kill` på prod — da blir den liggende nede.
- **Restart serveren etter endringer i `src/`** — ESM lastes én gang.
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken hentes på nytt hver sesong:** `npm run fetch-clubs` + bump
  `IMG_VERSION` i `src/middleware.js` i SAMME commit, ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutine: DEPLOY.md.
- **ALLE docs er CRLF** (ROADMAP har BOM). Et node-`replace` med `\n` i
  søkestrengen MATCHER IKKE og feiler STILLE — det skjedde med to
  CHANGELOG-tillegg i økt 45, oppdaget først ved sluttkontroll. Bruk
  Edit-verktøyet på docs. `sed -i` er forbudt. Nye kildefiler skrives med
  LF; `core.autocrlf=true` normaliserer, så det er greit.
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser `.env` UANSETT `--env-file`. Sett
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME i en scratchpad-.env
  (eller i `process.env` før import) — de settes først og overskrives ikke.
  Verifiser med `/health` → `ai:false, discord:false`.
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip er GRATIS fra v1.3.4** (verifisert i prod 25. aug):
  `/brief` og `/nyheter` leser kun cachen. T.o.m. v1.3.3 kostet hvert besøk
  et AI-kall. Unntaket består: klikk ALDRI «Spør AI om råd» på `/lag` i en
  verifisering — det er det eneste stedet et klikk kan utløse et kall.
- **Per-funksjon-AI-kostnad kan ikke måles retroaktivt:** Coolify-loggen er
  100 linjer og nullstilles ved deploy — samle `AI-kall:`-linjene løpende.
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets. Ufarlig — all HTML refererer versjonerte URL-er.
- `ai.js` sender bevisst ikke `thinking`/`effort` (feiler på Haiku 4.5);
  `max_tokens` er romslig pga. adaptiv tenkning på Sonnet 5.
- Liganavnet «Var Har Skylda» kommer slik fra FPL-API-et (liga 1397750,
  Marius er admin) — ikke en kodefeil.
- JSON i `views/live.ejs` escaper `<` fordi lagnavn kommer fra andre
  FPL-brukere — ikke fjern escapingen.

## Brukerens beslutninger (IKKE re-spør)

- Tiltale: **Marius** — alle svar starter med «Hei Marius!».
- AI-modell: `claude-sonnet-5` via `AI_MODEL`-env (`claude-haiku-4-5` billig-alternativ).
- Kostnadskrav: AI billig for én person — alt on-demand + cachet.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.
- UI-overhalingen (økt 30): de 15 designbeslutningene står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen gjelder
  videre: ett spørsmålssett om gangen, anbefaling først.
- Doks-opprydningen (økt 24): konsumerte prompter slettes, utførte planer
  arkiveres til `docs/arkiv/`, docs/-rot holdes lav (nå 4 filer + arkiv),
  HANDOVER-tak 200 linjer med rotering til historikkfila.
- Eldre, fortsatt gyldige beslutninger: rotert til historikkfila.
- **v1.8.0 (1. sep):** alle fire deler i én versjon; modal-spillerkort med
  element-summary KUN lazy per klikk; duell fra data-attrs (pris lavest,
  dødball satt-slår-null, ellers høyest, likhet umarkert); global
  eierandel med terskel 5/10/15 % (default 10); alle tre dødball-roller.
  Full fasit: `docs/arkiv/plan-spillerpakka-v180.md` §Beslutningsfasit.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-09-01 (økt 50, Opus, utførelse): mandat = bygg v1.8.1 etter den
  godkjente detaljplanen, TDD strengt, STOPP etter sluttkontrollen i T12 —
  ingen merge, tag eller push. Handling: verifiserte baseline 602/602 +
  lint 0 på main, branch `fix/spillere-redesign-v181`, T1–T11 i rekkefølge
  med rød før grønn i hver task, 11 conventional commits med
  CHANGELOG-linje i hver, røyktest med tomme nøkler (0 AI-kall), docs
  ajour. Sluttstatus **613/613 + lint 0**. Sju tekniske planavvik
  dokumentert i statusen over. Stoppet før merge, som avtalt. Deretter:
  «Klar push» — sjekket deploy-vinduet FØRST (tirsdag 04:56, ingen kamper,
  ikke torsdag 19–21), release-commit på branchen (versjon 1.8.1,
  CHANGELOG `[1.8.1]`, VIDERE.md), merget `--no-ff`, verifiserte 613/613 +
  lint 0 og CHANGELOG-rekkefølgen på merget main, tagget `v1.8.1`,
  arkiverte planfila, regnet ny asset-hash, én push.
- 2026-09-01 (økt 51, Opus): skjermbilde av benkesløsingen på /innsikt +
  «Kan du fikse opp i UIen her?». Funn: `table.data th` (spesifisitet
  0-1-2) slår `.num` (0-1-0), så tallhodene sto til venstre mens tallene
  sto til høyre — «6» leste som «Unngåelig tap» og «−1» som «Chip». Fikset
  globalt med `table.data th.num`. Ellers: `.data--fit` på de to smale
  tabellene, sumraden skjules ved én runde og har egen skillestrek, «–» i
  tom chip-celle, luft mellom `.hint` og tabell/stripe, 78ch tak på ingress
  og hint. To nye style-tester. **615/615 + lint 0**, CHANGELOG under
  `[Unreleased]` (ingen versjonsbump). Så: «Push til main» — deploy-vinduet
  sjekket FØRST (tirsdag 16:08, GW2, 0 kamper i gang), `2080cb7` + docs
  pushet, ny asset-hash `3eef00bb`.
- 2026-09-01 (økt 52, Fable): «Runderapporten skal ha mer detaljert prompt,
  bruke eksempler fra lagene mer, kan være lenger. Kom med forslag og
  spør.» Valg via spørsmål: alle fire datapunkter (benk, chips+hits,
  toppscorer per lag, differensial/flopp), ~300 ord, alle lag nevnes,
  samme tone. Handling: buildReportData utvidet (teams/differentials/
  flops — picks+live som alt hentes, 0 nye kall), buildLeagueReportPrompt
  med tre nye seksjoner + regler 250–320 ord og «hvert lag minst én gang»,
  maxTokens 3000. chipLabel flyttet insights.js → league-insights.js
  (unngå sirkulær import). TDD: 5 røde tester før grønn. **626/626 +
  lint 0.** Deretter: mergeoversikten fra økt A limt inn → v1.8.2 godkjent
  av Marius, hele løypa: deploy-vindu sjekket (tirsdag 17:58, 0 kamper),
  release-commit, merge `--no-ff`, 626/626 + lint 0 PÅ merget main,
  CHANGELOG-rekkefølge ok, hash `257cfce2` bekreftet fra main-blobbene,
  tag `v1.8.2`, push.
  `docs/arkiv/HANDOVER-historikk.md` (200-linjerstaket, sist 2026-09-01).
