# HANDOVER-historikk — FPL-dashboard

> Rotert ut av `docs/HANDOVER.md` 23. august 2026 (doks-opprydningen).
> Innholdet under er flyttet verbatim: avsluttede status-blokker (økt 8–23),
> sjekkpunkt-tabellen, versjonshistorikken, utdaterte åpne punkter og hele
> loggen over brukerbeskjeder til og med økt 22. Nyere logg: HANDOVER.md.

## Rotert 2026-09-02 (økt 53, etter v1.12.0): statusblokkene v1.9.0–v1.11.0 (verbatim fra HANDOVER.md)

- **v1.11.0 «Karriere-pakka» i prod 2. sep (økt 53).** Bygget på
  `feat/karriere-v1110`, T1–T5 med rød før grønn: `buildCareer` +
  `buildBadges`/`gwsAllPlayed` (åtte merker) i insights.js, kortene
  #karriere/#merkedager øverst på /innsikt (også før første runde),
  `topBps` i live.js + `bpsRaceHtml` i app.js (bonuskamp under hver kamp i
  gang). `assembleInsights` henter nå entry history (mykt). **729/729 +
  lint 0** (baseline 710). Prod: hash `4718ea73`, kortene synlige.
- **v1.10.0 «Prisvarsler» i prod 2. sep (økt 53).** Bygget på
  `feat/prisvarsler-v1100`, T1–T5 med rød før grønn: `prices.js` (snapshot/
  diff/beslutning/rapport/timer, alltid aktiv, Discord maks én melding per
  Oslo-natt, `postToDiscord` lånt fra notify.js), kort på /overganger,
  kildelås. **710/710 + lint 0** (baseline 691). Ny fil i volumet:
  `price-state.json`. **Første natt etter deploy gir ingen melding** (bare
  snapshot) — første ekte prismelding ventes natt til 4. sep tidligst.
- **v1.9.0 «Planleggingspakka» i prod 2. sep (økt 53).** Bygget på
  `feat/planleggingspakka-v190`, T1–T9 med rød før grønn: chip-planlegger
  (`chips.js` + kort på /lag), Lagsjekk (`deadline.js` + timer i notify.js
  + kort på /brief, Discord kun ved funn), `/kalender.ics` (`calendar.js` +
  rute + lenker på / og /brief), P3 verifisert mot en rivals transfers.
  **691/691 + lint 0** (baseline 655). Ny env `DEADLINE_CHECK_HOURS_BEFORE`
  (default 3, ikke satt i Coolify = default), ny markør `check-state.json`.

## Rotert 2026-09-02 (økt 53, etter v1.10.0): v1.8.3-statusblokka + loggpost økt 52 (verbatim fra HANDOVER.md)

- **v1.8.3 «Herding + tilgjengelighet» merget til main 2. sep (økt 53).**
  Bygget på `fix/herding-a11y-v183`: T1–T7 + røyktestfunn, TDD med rød
  før grønn i hver task (a11y-låsene bevist med mutasjoner), CHANGELOG-
  linje i hver commit. **655/655 + lint 0** (baseline 626). Innhold: CSP
  med nonce (script-src uten unsafe-inline), nosniff/DENY/Referrer/
  Permissions, JSON-tak 32 kB, takstbegrensning 30 POST/DELETE per IP per
  5 min på /api, hopp-lenke + `main#innhold`, `role=timer`, `scope=col`,
  26 tabellcaptions, aria-live på /live, `test/a11y.test.js`. Røyktest
  med tomme nøkler: 11 ruter 200 + 404, hoder på plass, nonce header =
  body, nøyaktig 2 `<script`, 413 JSON på 40 kB, 429 + Retry-After på
  kall 31, **0 AI-kall**. Røyktestfunn fikset: body-parserens 413/400
  ble 500 — feilhandleren leser nå `err.status`.
  **Prod-sjekk etter deploy (gjort 2. sep, økt 53 — CSP-header live,
  nøyaktig 2 `<script`):**
  `curl -sI https://fpl.marsk.no/ | grep -i content-security` og
  `curl -s https://fpl.marsk.no/ | grep -c '<script'` = 2. Flere → en
  Cloudflare-funksjon injiserer script (DEPLOY.md «CSP og Cloudflare»).
- 2026-09-01 (økt 52, Fable): «Runderapporten skal ha mer detaljert prompt,
  bruke eksempler fra lagene mer, kan være lenger. Kom med forslag og
  spør.» Valg via spørsmål: alle fire datapunkter, ~300 ord, alle lag
  nevnes, samme tone. Handling: buildReportData utvidet (0 nye kall),
  buildLeagueReportPrompt med tre nye seksjoner, maxTokens 3000, chipLabel
  flyttet til league-insights.js. TDD: 5 røde før grønn. 626/626 + lint 0.
  Deretter v1.8.2 godkjent: deploy-vindu sjekket (tirsdag 17:58, 0
  kamper), release-commit, merge `--no-ff`, tag `v1.8.2`, push, hash
  `257cfce2`.

## Rotert 2026-09-01 (økt 53): v1.8.1-statusblokka + loggposter økt 50–51 (verbatim fra HANDOVER.md)

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
  høyde): se avsnittet «planavvikene i v1.8.1» lenger ned i denne fila.
- **v1.7.1 og v1.7.0 ute i prod 1. sep/31. aug; v1.3.8–v1.6.0 ute
  28. aug** — alle detaljer og prod-bevis lenger ned i denne fila.
- Asset-hash-historikk: v1.8.0 `7a3c28b8`, v1.8.1 `51d1bbb4`, økt 51-fiksen
  `3eef00bb`, v1.8.2 `257cfce2`.
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

## Rotert 2026-09-01 (økt 47): loggposter økt 45 (verbatim fra HANDOVER.md)

- 2026-08-31 (økt 45, del 2): «Jeg er ikke hjemme. du kan merge og pushe
  til main.» Handling: sjekket deploy-vinduet FØRST (mandag 16:44, 0
  kamper i gang, neste avspark 21:00) → merget `--no-ff`, verifiserte
  CHANGELOG-rekkefølgen og 549/549 + lint 0 på merget `main`, tagget
  `v1.7.0`, én push kl. 16:46. Prod grønt utenfra (se statusen).
  Etterpå: planen arkivert, `feat/innsikt-v170` slettet lokalt, docs ajour.
- 2026-08-31 (økt 45, Opus, utførelsesøkt): mandat = bygg v1.7.0 etter
  den godkjente detaljplanen, ingen designvalg, TDD strengt, ingen
  merge/tag/push til `main` uten klarsignal. Handling: `feat/innsikt-v170`
  fra lokal `main`-topp, T1–T10 i rekkefølge med RED før GREEN i hver
  task (549/549, lint 0), ni conventional commits, CHANGELOG `[1.7.0]`,
  ROADMAP/CLAUDE.md/VIDERE.md/denne fila ajour, prod-bevis for
  v1.3.8–v1.6.0 rotert til historikkfila. To små avvik fra planens
  signaturskisser, begge nødvendige for returformen: `buildLuckMeter` og
  `buildDreamTeamSection` fikk henholdsvis `teamsById` og `picksByGw` som
  ekstra parametre (`teamCode` og sesongtrenden kan ikke utledes uten
  dem). Ingen push, ingen merge, ingen tag.

## Rotert 2026-08-31 (økt 46): v1.7.0-prod-bevis (verbatim fra HANDOVER.md)

- **v1.7.0 «/innsikt» UTE I PROD 31. aug kl. 16:46.** Marius ga
  klarsignal på avstand; merget `--no-ff` (`a25ac0a`), tagget `v1.7.0`,
  én push. **549/549 + lint 0** både på featurebranchen og på merget
  `main`. Ny `src/services/insights.js` (optimalXi, buildBenchReport,
  buildCaptainAudit, buildLuckMeter, buildDreamTeamSection,
  assembleInsights), ny `src/routes/insights.js`, ny `views/innsikt.ejs`,
  `getDreamTeam(gw)` i fplClient. **Null endring i `public/style.css`**,
  så `test/style.test.js` er urørt og asset-hashen står stille.
  Prod-bevis utenfra 31. aug: footer `v1.7.0 · sist oppdatert mandag
  31. august kl. 16:46`; `/health` 200 med `ai:true, discord:true,
  teamId:true, leagues:1`; rutesveip alle 12 ruter 200 inkl. `/innsikt`,
  `/finnesikke` 404; `style.css?v=f9014751` uendret; `/innsikt` har
  nav-lenka markert aktiv og alle fire seksjonene med ekte tall (G=1):
  benkesløsing R1 6 p / −1 unngåelig, kapteinsfasit 0 % troppens beste
  (Haaland 2 p mot Ødegaard 11 p) og 100 % mot global favoritt,
  flaksbarometer +4 (topp Gvardiol +4,7), rundens XI 1 av 11 eid, beste
  De Cuyper 17 p. Lokal røyktest før merge med TOMME nøkler ga
  `ai:false, discord:false` og **0 «AI-kall:»-linjer**.
  Planen er arkivert: `docs/arkiv/plan-innsikt-v170.md`.

## Rotert 2026-08-31 (økt 46): eldre statuspunkter + økt 44-loggpost (verbatim fra HANDOVER.md)

- **v1.3.7 ute i prod siden 26. aug**, volumet `/app/data` aktivt
  (`…-fpl-data`). Gjenstående markør-bevis: «Brief-markør lastet: runde 2
  er alt sendt» i loggen ved første omstart ETTER torsdagens auto-brief.
- **P2-skjermbildene tatt 26. aug** (Playwright mot prod, `docs/img/`,
  lenket fra README). Rest: ekte telefon. **Prod-QA 25. aug: 402 sjekker,
  0 feil** mot v1.3.4; detaljene i historikken.
- 2026-08-31 (økt 44, Fable, planøkt): mandat = detaljplan for v1.7.0
  «/innsikt». Marius godkjente alle seks anbefalingene (begge
  benkekolonner; kapteinstreff identitet+poeng; flakspoeng + topp/bunn 3;
  XI-liste + sesongtrend; hele sesongen; nav etter Liga). På spørsmål om
  risikolista: «Løs det slik at det er minst mulig risiko» → autosub-,
  BB- og chip-antakelsene MÅLT mot ekte API (re-sortering, points_on_bench=0,
  bboost/3xc) — null antakelser igjen i datakontrakten. Plan skrevet til
  `docs/plan-innsikt-v170.md`, kjøreprompt til Opus levert i chatten.

## Rotert 2026-08-25 (økt 40): prod-QA-blokka for v1.3.4 (verbatim fra HANDOVER.md)

- **Prod-QA 25. aug: 402 sjekker, 0 feil** — kjørt ÉN gang mot v1.3.4 og
  dekker dermed også v1.3.3, som aldri ble QA-et. `qa-prod.mjs` **332/332**
  (full 8-siders variant — `/brief` og `/nyheter` er gratis fra v1.3.4, så
  den reduserte 240-varianten var ikke nødvendig), `qa-clubs-prod.mjs`
  **14/14**, `qa-v133.mjs` **56/56**. 11 ruter 200 + 404, `/health`
  ai:true discord:true leagues:1, footer `v1.3.4`.
  **P0-funnet er bekreftet fikset i prod:** klistret tabellhode har 76,7 px
  klaring til toppmenyen på 390 px og 14,6 px på 1440, likt i begge temaer.

## Rotert 2026-08-25 (økt 40): loggpost økt 39 (verbatim fra HANDOVER.md)

- 2026-08-25 (økt 39 Fable + økt 40 Opus): planøkt «sluttspurten». Marius
  besluttet: alle fire robusthetskandidatene bygges (v1.3.5 SIGTERM →
  v1.3.6 gameUpdating → v1.3.7 brief-markør → etter P4: v1.3.8 genitiv +
  v1.4.0 alderstak/dataAlder), promptendringen i filterSummaryPoints
  droppet, volum `/app/data` i Coolify, port9 + tre utførte filer
  arkivert. Plan: `docs/plan-sluttspurt.md`. Handling: Task 0 utført.

## Rotert 2026-08-25 (økt 40): v1.3.4-statusblokka (verbatim fra HANDOVER.md)

- **v1.3.4 UTE I PROD siden 25. aug 02:5x — hele v1.3 er dermed ferdig.**
  350/350, lint 0 (baseline 322), tag `v1.3.4` = `f61aae2` pushet. Ingen
  sidevisning venter på en AI-tekst: `ai.js` har SWR + `getCached()`, de tre
  sidene leser cachen, `refresh.js` frisker opp på klokka. **Målt i prod rett
  etter deploy med TOM AI-cache:** `/brief` 127 ms, `/nyheter` 92 ms, forsiden
  117 ms, gjentatte besøk 89–99 ms (mot 10 023 ms på v1.3.3-adferden). Begge
  AI-kortene til stede → oppstartstikket varmet tekstene (2 budsjetterte kall).
  Plan arkivert: `docs/arkiv/plan-v134-ai-swr.md`.

## Rotert 2026-08-25 (økt 40): loggpost økt 38 (verbatim fra HANDOVER.md)

- 2026-08-25 (økt 38, Opus): kjøreprompt «ferdigstill v1.3.4-releasen +
  samlet prod-QA» etter planøkt 37. Rammer: 0 ekte AI-kall, prod-`/brief`
  og `/nyheter` røres ikke før v1.3.4 er ute, aldri push uten klarsignal.
  Handling: Task 1 (docs-rettelser, 3 commits) + Task 3a–e (1.3.4,
  CHANGELOG-flytt, merge `--no-ff` + tag lokalt), 350/350 + lint 0.
  Deretter lukket Marius helsesjekken via Claude in Chrome (alt. a, bevis
  (i) grønt; `kill 1` virket ikke, se lærdom). Klarsignal «push» 02:47 →
  pushet, prod-verifisert og QA-et: **402 sjekker, 0 feil**. Task 0–6
  fullført; hele v1.3 er dermed ute. Til slutt sendte Marius skjermbilde av
  auto-briefen fra 20. aug 19:30 i Discord → **P1 lukket**.

## Rotert 2026-08-25 (økt 40): loggposter økt 36–37 (verbatim fra HANDOVER.md)

- 2026-08-25 (økt 37, Fable): plan for resten av v1.3 oppdatert etter
  incidenten; A/B/C besluttet (QA én gang på v1.3.4; helsesjekk alt. a med
  b-fallback, Marius, før release; release ons 26. aug). Planfil:
  `.claude/plans/du-er-planleggings-kten-fable-jiggly-iverson.md`.
  Handling: docs-rettelser + release utføres av økt 38 (denne).
- 2026-08-25 (økt 36, etter incidenten): Marius fikk prod opp igjen —
  401-en var «HTTP Basic Authentication» slått på i Coolify, IKKE en
  manglende Traefik-rute. Ba om planleggingsprompt til Fable som oppdaterer
  HELE resten av v1.3 og som avslutter med en kopierbar kjøreprompt til Opus.
  Handling: prompt levert i chatten (planlegging, ingen kode/commit).
- 2026-08-25 (økt 36, Opus): kjøreprompt «utfør kø-punkt 2 (v1.3.4) og
  ferdigstill hele v1.3». Rammer: utfør, ikke re-planlegg; 0 ekte AI-kall
  (tomme nøkler lokalt); prod-/brief og /nyheter lastes aldri før v1.3.4 er
  ute; aldri push uten klarsignal. Målerapporten levert først → klarsignal
  «Kjør». Handling: Task 0–6 utført, 6 commits, 350/350, lint 0.

## Rotert 2026-08-24 (økt 32): v1.3.1-statusblokka (verbatim fra HANDOVER.md)

- **v1.3.1 ETAPPE 2 FERDIG OG UTE (økt 32, Opus, 24. aug).** Task
  1.1-0…1.1-7 utført, merget til `main`, tagget `v1.3.1` og deployet.
  **296/296 tester, lint 0, 0 AI-kall.**
  - `IMG_VERSION = '2627'` i `middleware.js` (immutable-regelen), ny
    `src/services/clubAssets.js` (leser `public/img/clubs/` én gang til
    `app.locals`), `/health` teller bildene, `scripts/fetch-club-assets.mjs`
    + 60 committede bildefiler (561 KB), `teamCode`/`homeCode`/`awayCode` i
    brief-, live- og transfers-payloadene, partialene `club-badge` og
    `club-shirt` tatt i bruk i alle views, `clubBadgeHtml` + error-lytter i
    `public/app.js`, klubb-CSS, footer-kreditering.
  - TDD-tallene: 282 → rødt 277/1 (ESM-linkfeil tar hele fila) → 283 →
    rødt 284/1 (modul mangler) → 287 → rødt **290/5 som planlagt** → 290 →
    rødt **296/6 som planlagt** → **296**.
  - Røyk uten nøkler (port 3011): `ai:false, discord:false`,
    `clubImages {badges:20, shirts:20, keepers:20}`, 8 ruter 200, 404 på
    ukjent sti, alle klubb-URL-er versjonert, bilde → `immutable`.
    **Playwright: 332/332** + eget klubbskript **22/22** (0 brutte bilder
    også når lazy tvinges, 609 merker på /spillere, 15 drakter + 4
    keeperdrakter på /lag, Lag-kolonnen sorterer alfabetisk begge veier).
  - **Ett avvik fra planens bokstav:** assertionen «uversjonert bilde-URL» i
    dashboard-testen var en selvmotsigende regex (flagget korrekte URL-er).
    Rettet til `/\/img\/clubs\/[^"?]+"/`. Markupen er som i planen.

## Rotert 2026-08-24 (økt 32): loggposter økt 30–31 (verbatim fra HANDOVER.md)

- 2026-08-24 (økt 31, Opus): kjøreprompt «Oppdrag (Opus 5,
  utførelsesøkt): utfør ETAPPE 1 — v1.3.0 Fundament» med
  `superpowers:executing-plans` mot `docs/plan-v130-ui-overhaul.md` og
  mockupen som fasit for utseendet (ved avvik vinner planen). Harde
  rammer: Task 1.0-0…1.0-6 nå, Task 1.0-7 kun på eksplisitt klarsignal,
  ingen designbeslutninger (mangler noe → stopp og spør), aldri push uten
  klarsignal (heller ikke docs), aldri to. 19–21 eller mens kamper pågår,
  **0 AI-kall** (`/brief` og `/nyheter` kun med tomme nøkler, `/health` →
  `ai:false` FØRST), TDD med observert rødt ført inn i planfila, ingen nye
  avhengigheter, Playwright kun i scratchpad, docs i samme commit som
  endringen, branch `feat/ui-v130-fundament` fra rent og grønt `main`.
  Handling: alle seks tasks utført, 5 commits, 282/282 + lint 0,
  Playwright 332/332, 0 AI-kall, ingenting pushet. Underveis ett spørsmål
  stilt (kontrastkonflikt på `.deadline-passed` inne i heroen) —
  Marius valgte anbefalingen `--hero-text` (hvit). Deretter klarsignal:
  **«Kjør»** (mandag 24. aug ~03:10). Handling: Task 1.0-7 utført — bump
  1.3.0, docs, merge til `main`, tag `v1.3.0`, push, Coolify-deploy,
  prod-verifisering uten `/brief` og `/nyheter`. Tidsvindu sjekket før
  push: mandag 03:09, 0 kamper i gang, neste avspark 28. aug 19:00 UTC.
  Til slutt: «lag en prompt for å starte på etappe 2 til en ny opus chat».
  Handling: kjøreprompt for ETAPPE 2 (v1.3.1 Klubbgrafikk) levert i chatten,
  ikke som fil — med testtallene 282 → 283 → 287 → 290 → 296, rødfasene,
  0 AI-kall, GW2-kampvinduet som pushregel, og lærdommene fra etappe 1
  (CRLF-normalisering i node-skript, heredoc/apostrof, Playwright-cache,
  hero-tokens, les asset-hash fra prod-HTML).

- 2026-08-24 (økt 30, Fable): kjøreprompt «Oppdrag (Fable 5): planlegg
  v1.3.0 — full UI-overhaling. KUN PLANLEGGING» med krav: brainstorming
  FØR plan mode (ett sett om gangen, anbefaling først, Marius beslutter),
  verifiser alle fakta selv, klikkbar mockup som Artifact i begge temaer,
  ett definert sluttprodukt (palett/typografi/spacing/komponenter per side),
  fire åpne spørsmål avgjort (klubbgrafikk-kilde/lisens, tema/FOUC,
  FPL-nærhet/kontrast, etapper), plan etter v1.2.5-malen, oppdater
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md, slett `prompt-ui-overhaul-plan.md`,
  ikke rør CHANGELOG, 0 AI-kall, aldri push, Opus-prompt i chatten.
  Underveis: «Klarer du å skrive planfila?» / «Okay da kan du fortsette»
  (bekreftelse etter avbrudd). Handling: 4 spørsmålssett (15 beslutninger,
  alle = anbefalingen), 20 fakta verifisert (bl.a. 140 bilde-URL-er med
  curl, PNG-dimensjoner, 41 kontrastpar), plan skrevet til
  `docs/plan-v130-ui-overhaul.md`, mockup publisert
  (https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849),
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md oppdatert, prompt-fila slettet,
  loggpost økt 28 + eldre status rotert til arkivet, committet lokalt på
  `main` uten push, Opus-prompt levert i chatten. 0 AI-kall.

## Rotert 2026-08-24 (økt 31): v1.2.5-status + loggpost økt 29 (verbatim fra HANDOVER.md)

Status-blokk (sto under «Status akkurat nå»):

- **v1.2.5 ferdig og ute (økt 29, Opus).** Hele
  `docs/arkiv/plan-v125-brief-kvalitet.md` (Task 0–6) utført, tag `v1.2.5`.
  **2 AI-kall brukt av 2 budsjetterte.**
  - Tre endringer: (1) `globalCaptains` faller tilbake på `ep_next` når
    all form er 0 og slipper minutes-kravet før sesongens første kamp,
    brief-objektet får `captainsCriterion`; (2) ærlig kapteinsetikett +
    REGLER-seksjon i `buildBriefPrompt`, view-overskrift
    «Kapteinskandidater globalt»; (3) `sanitizeBriefText` omstrukturert
    fra én kontroll til tre som velges per linje — deadline (uendret
    logikk), friskmelding, prosent (nær-miss ±1,0).
  - TDD: 256/256 → **272/272, lint 0**. Rødtallet i Task 1 ble 6, ikke 5
    (vern-testen asserter også `captainsCriterion`) — eneste avvik.
  - Røyktest uten nøkler (port 3011, `ai:false, discord:false`): alle 11
    ruter 200, ukjent sti 404.
  - **E2E lokalt (AI-kall 1 av 2, port 3012, `ai:true, discord:false`):**
    ett kall `ai-brief-gw2` (1680 inn / 977 ut). Ingen «mest brukte
    kapteiner», alle prosenter (15.3, 7.6, 17.5, 16.0, 41.9, 75) eksakt i
    `/api/brief.json`, ingen friskmelding tross to navn på skadelista,
    og **ingen `console.warn` fra sanitize — 0 setninger fjernet**.
  - **Prod-retest (AI-kall 2 av 2), 01:43: bestått.** Ingen «mest
    brukte kapteiner» («**Szoboszlai** … et trygt globalt valg …
    **Guéhi** og **Ndiaye** … om du leter etter differensial»), alle
    prosenter (15.3, 7.6, 41.9, 75) eksakt i `/api/brief.json`, ingen
    friskmelding tross to navn på skadelista, overskriften
    «Kapteinskandidater globalt» på siden. Stikkprøve mot fasiten:
    Ødegaard 11.0/FDR 4.0, Gvardiol 9.0/3.0, Guéhi 10.0/ep 2.8,
    Szoboszlai 8.0/ep 2.5 — alt korrekt.
  - `/nyheter` ble ALDRI besøkt med ekte nøkkel, verken lokalt eller i
    prod.

Loggpost (sto under «Logg over brukerbeskjeder»):

- 2026-08-24 (økt 29, Opus): kjøreprompt «Oppdrag (Opus 5, utførelsesøkt):
  utfør v1.2.5 — brief-kvalitetstrioen» med `superpowers:executing-plans`
  mot `docs/arkiv/plan-v125-brief-kvalitet.md`. Harde rammer: Task 0–5 nå, Task 6
  kun på eksplisitt klarsignal, aldri push uten klarsignal (heller ikke
  docs), aldri push to. 19–21 eller mens kamper pågår, maks 2 AI-kall
  (1 lokal E2E + 1 prod-retest), `/brief` og `/nyheter` aldri med ekte
  nøkkel utenfor de to, TDD med observert rødt, avkryssing i plandokumentet,
  avvik rapporteres. Handling: Task 0–5 utført på branch
  `fix/brief-kvalitet`, 4 commits, 272/272 + lint 0, 1 AI-kall brukt,
  ingen push. Ett avvik meldt: rødtallet i Task 1 ble 6 feilende tester,
  ikke 5 — «minutes-kravet gjelder»-testen asserter også
  `captainsCriterion` og feiler derfor også i rødfasen. Rotering gjort for
  å holde 200-linjerstaket: loggpostene for økt 25–26 og v1.2.4-detaljene
  flyttet til `docs/arkiv/HANDOVER-historikk.md`. Deretter klarsignal:
  **«kjør release»** (mandag 24. aug ~01:40). Handling: Task 6 utført —
  bump 1.2.5, CHANGELOG/ROADMAP/VIDERE/HANDOVER, merge til `main`
  (272/272 + lint 0 på main), tag `v1.2.5`, push, Coolify-deploy,
  prod-retest bestått, branch `fix/brief-kvalitet` slettet. Tidsvindu
  sjekket før push: mandag 01:38, 0 kamper i gang, neste avspark 19:00
  UTC samme dag. Totalt 2 AI-kall i økten.
  Til slutt: «Lag en prompt til fable for planøkten. Husk å ta med alle
  oppdateringer og sånt og at fable skal oppdatere alle filer som trengs.
  Full planlegging. Jeg vil ha et sluttprodukt på ui overhaulen.» +
  «Og husk at den skal lage prompt til opus». Handling: planleggingsprompt
  for v1.3.0 (UI-overhaling) levert i chatten, ikke som fil. Prompten
  krever brainstorming før plan mode, visuell mockup som Artifact i BEGGE
  temaer som sluttprodukt, ett definert sluttresultat uten «kan
  vurderes», oppdatering av plan/ROADMAP/VIDERE/HANDOVER/CLAUDE.md,
  sletting av den utdaterte `docs/prompt-ui-overhaul-plan.md`, 0 AI-kall,
  ingen push — og en kopierbar Opus-prompt til slutt.

## Rotert 2026-08-24 (økt 30): status-blokker + loggpost økt 28 (verbatim fra HANDOVER.md)

Status-blokker (sto under «Status akkurat nå»):

- Eldre: v1.2.3-deployen (22.–23. aug). Deploy-planen
  (port 0–10) ble ferdig utført 22.–23. aug; sjekkpunkt B, C og D er lukket,
  A har ett restpunkt (auto-brief-verifisering, kø-punkt 3). Bevis og
  detaljer: `docs/arkiv/sjekkpunkt-c-live.md`, `docs/sjekkpunkt-d-kostnad.md` og
  `docs/arkiv/HANDOVER-historikk.md`.
- **Doks-opprydning utført (økt 24):** docs/-rot fra 30 til 7 filer,
  utførte planer i `docs/arkiv/`, 19 konsumerte økt-prompter slettet,
  ROADMAP omskrevet med prioritert kø, denne fila slanket til ≤200 linjer.
  Plan: `docs/arkiv/plan-doks-opprydning.md`.
- **Versjonsplan lagt (økt 25):** ROADMAP har nå versjonsplan-tabell øverst
  (v1.2.4 → v1.2.5 → v1.3.0 → v1.3.1+, porter P1–P4 for sjekker/målinger)
  og et dokumentkart. Kun kodereleaser får versjonsnummer (Marius' valg).
- **v1.2.4 ferdig og ute (økt 27).** Rådgiver-prompten bygges i
  `buildAdvicePrompt` (prompts.js) med fullt signalsett + sidens
  beregninger + REGLER. 2 AI-kall brukt av 2, B-2-kriteriene bestått både
  lokalt og i prod. Full bevisføring: `docs/arkiv/HANDOVER-historikk.md`.

Loggpost:

- 2026-08-24 (økt 28, Fable): kjøreprompt «Oppdrag (Fable 5, plan mode):
  planlegg v1.2.5 — brief-kvalitetstrioen» med krav: brainstorming FØR plan
  mode (spørsmål ett sett om gangen, anbefaling først, Marius beslutter),
  plan så detaljert som mulig (kopierbar kode, eksakte testnavn/asserts,
  testtall rødt→grønt, verifiseringstabell) til
  `docs/arkiv/plan-v125-brief-kvalitet.md` for Opus 5, TDD, ingen nye
  avhengigheter, egen branch, aldri push uten klarsignal, release som eget
  task på klarsignal, aldri push to. 19–21/under kamper, eksplisitt lavt
  AI-tak, /brief og /nyheter aldri med ekte nøkkel utenfor budsjettet,
  docs-oppdateringer i samme commit (ROADMAP/HANDOVER/VIDERE), commit
  lokalt på main UTEN push, ta stilling til to ryddepunkter, Opus-prompt
  leveres i chatten. Brainstorming: Marius valgte anbefalingen på alle 9
  spørsmål (begge tiltak for motsigelser; nær-miss ±1,0; fjern setning;
  speil captainSuggestions; minutes-slipp før sesongstart;
  captainsCriterion; ærlig etikett + REGLER + view-synk; maks 2 AI-kall;
  rydding i planøkten). Handling: plan skrevet og godkjent, ROADMAP/
  HANDOVER/VIDERE oppdatert, v124-planen arkivert, `fix/radgiver-prompt`
  slettet, alt committet på main (ingen push), Opus-prompt levert i
  chatten. 0 AI-kall, ingen kodeendringer.

## Rotert 2026-08-24 (økt 28): loggposter økt 22–24 (verbatim fra HANDOVER.md)

- 2026-08-23 (økt 24, natt ~01:40): kjøreprompt «Oppdrag (Fable, plan mode):
  rydd dokumentasjonen og skriv veikartet ferdig» + fire beslutninger
  besvart (Marius valgte anbefalingen på alle fire): (1) slett konsumerte
  prompter, arkiver utførte planer; (2) målstruktur 7 filer i docs/-rot +
  arkiv; (3) promptstruktur-fiksen øverst i køen, foran UI-overhalingen;
  (4) HANDOVER-tak 200 linjer med historikk til arkiv. Handling: hele
  ryddeplanen utført (`docs/arkiv/plan-doks-opprydning.md`), ROADMAP omskrevet
  med prioritert kø, HANDOVER slanket, VIDERE og CLAUDE.md oppdatert.
  0 AI-kall, ingen kodeendringer.
- 2026-08-23 (økt 23, natt ~01:30): «vil ha en Fable-prompt som planlegger
  stor opprydning av docs/ og skriver ROADMAP om til full framoversikt».
  Handling: `docs/neste-okt-prompt-doks-opprydning.md` skrevet med målt
  inventering (siden konsumert og slettet av økt 24 — se over).
- 2026-08-22 (økt 23): deploy-økten — klarsignaler «okay push v1.2.2»
  (02:31) og «kjør port 7» (02:41); B-2-kallet klikket i prod 02:36 med
  funnet «prompten bør struktureres på en mye bedre måte» (nå kø-punkt 1).
  Handling: v1.2.1 → v1.2.3 deployet og verifisert, port 0–10 utført.
  Full detalj: seksjonene under.

## Status ved rotering (per økt 23, 23. august 2026)

- **DEPLOYEN ER FERDIG (økt 23, Opus 5). v1.2.1, v1.2.2 og v1.2.3 er i prod
  og verifisert, port 0–10 er utført, og sjekkpunkt C er lukket.**
  (Deploy 2026-08-22 kl. 02:16–02:43, verifisering til 22. aug kl. 20:31.)
  Planen `docs/plan-deploy-v122-v123.md` fulgt port for port.
  **0 AI-kall fra Opus i hele økten** — Marius' B-2-klikk er det eneste.
  - **Port 0 grønn:** rent tre; tips som forventet (`main` c33aef1,
    `fix/lag-anbefalinger` c5b9748, `fix/live-bonus` c3020e5).
    `pre-deploy-main` satt på c33aef1 (lokal, pushes aldri).
  - **Port 1 grønn (prod-baseline før alt):** v1.2.0, `/health` =
    `ai:true, discord:true, teamId:true, leagues:1`, 11/11 ruter 200,
    404 ok. Bevis: scratchpad `port1-baseline-okt23.txt`.
  - **Port 2 grønn:** 2a merge `fix/lag-anbefalinger` → 0 konflikter,
    **242/242** + lint 0. 2b release v1.2.2 (`npm version`, CHANGELOG
    5 punkter, `npm ci` exit 0, 242/242) → `ef30162` + tag v1.2.2.
    2c merge `fix/live-bonus` → **250/250** + lint 0 → `4ac88ef`.
    2d release v1.2.3 (`npm ci` exit 0, 250/250) → `c5354e7` + tag v1.2.3.
  - **AVVIK i 2c (håndtert, ikke stopp):** planen varslet CHANGELOG-konflikt.
    Git merget i stedet **rent, men semantisk feil** — de 2 live-punktene
    havnet inni `[1.2.2]`-seksjonen i stedet for `[Unreleased]`. Rettet
    manuelt til planens foreskrevne måltilstand (`[Unreleased]` = kun de 2
    live-punktene; `[1.2.2]` = 5 punkter) og lagt inn i merge-committen via
    `--amend` (begge foreldre intakt). **Lærdom: en ren merge er ikke bevis
    på en riktig merge — CHANGELOG-plasseringen må inspiseres, ikke antas.**
  - **Port 3 grønn:** Docker-bygg + røyktest av alle tre tagger
    (v1.2.1/v1.2.2/v1.2.3), hver: build exit 0, `/health` =
    `ai:false, discord:false, teamId:true, leagues:0`, 11/11 ruter 200,
    404 ok, serverlogg kun lyttelinja (**0 AI-kall**), riktig versjon i image.
  - **To målefeil i port 3, begge i testharnesket — ikke i appen:**
    (1) curl mot `localhost` ga `000` fordi Docker-proxyen godtar TCP før
    Node lytter → «Empty reply from server» (exit 52), og `--retry` dekker
    ikke tomt svar. Løst med `--retry-all-errors`. (2) `/health` viste
    `leagues:1` ved et senere kall; det er dokumentert oppførsel
    (`leagues.js` løser lagets private ligaer i bakgrunnen, første svar
    etter kaldstart gir config-tallet 0). Planens `leagues:0` er riktig.
  - **Port 4 GO:** port 0–3 grønne, kl. 02:25 mot tidsport 11:30 (9 t
    margin). **Ingen ekte kamp pågår** — verifisert mot FPL-API-et:
    ARS–COV `started=true, minutes=90, finished_provisional=true,
    finished=false`, 0 ekte live-kamper. Prods `anyLive:true` ER v1.2.0-
    bugen som v1.2.3 fikser.
  - **Port 5 grønn — v1.2.1 DEPLOYET:** `git push origin
    78d438e:refs/heads/main v1.2.1` → `feb0c7f..78d438e` (fast-forward,
    6 commits) + tag. Footer flippet v1.2.0 → **v1.2.1** kl. 02:28:22
    (~1 min). `/health` identisk med baseline, 11/11 ruter 200, 404 ok.
    Bevis: scratchpad `port5-verifisering.txt`.
  - **Port 6 grønn — v1.2.2 DEPLOYET:** klarsignal fra Marius 2026-08-22
    kl. 02:31 («okay push v1.2.2»). Førkontroll: 0 ekte live-kamper,
    fast-forward bekreftet, kl. 02:32 mot tidsport 11:30. `git push origin
    v1.2.2^{commit}:refs/heads/main v1.2.2` → `78d438e..ef30162` + tag.
    Footer flippet **v1.2.2** kl. 02:33:05 (~30 s). `/health` identisk med
    baseline, 11/11 ruter 200, 404 ok. v1.2.2-synlig endring bekreftet:
    /lag viser «Anbefalinger for Runde 2» nøyaktig 1 gang, 0 «undefined».
    Bevis: scratchpad `port6-verifisering.txt`.
  - **B-2-AI-kallet UTFØRT av Marius i prod 2026-08-22 kl. 02:36**
    (budsjettkall 2 av ~3). Prod-verifiseringen av /lag-rådgiveren BESTOD:
    norsk råd i tre deler, nevner runde, deadline, kaptein/visekaptein og
    FDR-kontekst; fixture-dataene var korrekte (City–CRY borte FDR 3 ER
    GW2-kampen).
  - **NYTT FUNN fra samme kall (Marius, kl. 02:37): «den er enda litt rar …
    prompten bør struktureres på en mye bedre måte uten at den kan gi uklare
    eller dårlige begrunnelser».** Modellen skrev «Haaland … formscore 0.0
    (kun én runde spilt)» — Haaland har `minutes 0, total_points 0` og har
    ikke spilt. Årsak: `api.js:86-88` sender kun form som prestasjonssignal.
    Full analyse lagt i ROADMAP under «Senere / idéer». **Blokkerer IKKE
    port 7:** v1.2.3 rører kun live.js/app.js/analysis.js/live.ejs, ikke
    prompts.js eller /lag-ruten. Fikses som egen release etter deployen —
    planens regel «aldri fiks inni deployen».
  - **Port 7 grønn — v1.2.3 DEPLOYET:** klarsignal fra Marius kl. 02:41
    («kjør port 7»). Førkontroll: `main` = `c5354e7` = v1.2.3, ff bekreftet,
    0 ekte live-kamper. `git push origin main v1.2.3` → `ef30162..c5354e7`
    + tag. Footer flippet **v1.2.3** kl. 02:43:38. `/health` identisk med
    baseline, 11/11 ruter 200, 404 ok.
    **v1.2.3-fiksene bevist i prod:** `anyLive: false` (sto på `true` rett
    før deployen — selve bugen), /live viser «Ingen kamper pågår akkurat
    nå», og `matches[0].finished: true` for ARS–COV selv om FPL fortsatt
    har `finished:false, finished_provisional:true`. `bonusPublished` finnes
    på **15/15** rader i `myPlayers`; Ødegaard =
    `{points:11, bonusEst:0, bonusPublished:3, effective:11}` — bonusen
    vises og telles ikke dobbelt. Bevis: scratchpad `port7-verifisering.txt`.
    NB: radene i payloaden heter `myPlayers`, ikke `rows`.
  - **Port 10 delvis utført:** `pre-deploy-main` slettet (c33aef1 er uansett
    ancestor av `main`, så commiten er ikke tapt). ROADMAP: B-2-punktet
    huket av. Docs committet lokalt, **ikke pushet** — planen sier docs-push
    etter kampslutt (~21:00+), og resten av port 10 krever port 9-resultatet.
  - **PORT 9 BESTÅTT 22. aug — sjekkpunkt C er endelig lukket.** Målt med to
    uavhengige instrumenter: sampleren (1621 sampler, hvert 30. s) og Claude
    in Chrome (10 avlesninger, aldri reload). Stopp-testen ved BRE–TOT:
    server slo om mellom 20:24:47 og **20:25:17**; klientens neste planlagte
    henting **20:25:33** fanget «Slutt» og ble den siste. Forplantning
    **~16 s** mot kravet på ~1 min. «Sist oppdatert» frøs på 20:25:33 gjennom
    fem oppfølgingsavlesninger, `pulse-on` var fjernet, `animation-name: none`.
    Stopp-testen bestod dessuten ved HUL–MUN (15:27:35) og EVE–CRY (18:00:57)
    — hvert omslag i samme 30 s-sample som fløyta. **FUNN 2 lot seg ikke
    reprodusere.**
  - **Bonuskolonnen bestått:** Ødegaard viste **+3** i accentfarge med
    title «Bekreftet av FPL (foreløpig til runden er ferdig)» og Effektivt
    **11**, ikke 14. BPS-estimatet virket i vinduet før publisering
    (MUN-trioen `pts1/est2/eff3` under HUL–MUN). **0 dobbelttellinger av
    1621 sampler** (automatisk flagg på `effective > points + bonusEst`).
    Full dokumentasjon: `docs/arkiv/sjekkpunkt-c-live.md` → «Resultat fra
    kampvinduet». Nettleserrapporten ligger i
    `~/Downloads/live-test-bre-tot-2026-08-22.md`.
  - **PORT 10 FULLFØRT:** `pre-deploy-main` slettet, ROADMAP-punktet
    «Manuell verifisering under neste kampvindu» huket av med tall,
    sjekkpunkt-dokumentet fylt ut, docs pushet til `main` (23. aug natt,
    ingen kamper — neste avspark søndag 15:00). Sampleren stoppet.
  - **DEPLOY-PLANEN ER DERMED FERDIG UTFØRT, port 0–10.** Port 8 (rollback)
    ble aldri utløst.
  - **ENESTE ÅPNE PUNKT — promptstrukturen på /lag-rådgiveren.** v1.2.2
    fikset UI-rangeringen til `ep_next` når ingen har form, men AI-prompten
    får fortsatt kun `form` (`api.js:86-88`), så siden og rådgiveren
    resonnerer fra ulike signaler — og rådgiveren har ingen etterkontroll
    slik briefen har. Full analyse i ROADMAP under «Senere / idéer».
    Krever egen brainstorming + plan + release. Ikke påbegynt.
  - **Sjekkpunkt D målt 23. aug: $0,94/uke, under terskelen, ingen tiltak.**
    Introprisen bekreftet av fakturaen ($0,985 utregnet mot $1,477 på
    ordinærpris). Ut-tokens er 78 % av kostnaden. Ny måling i uken etter
    31. aug — se `docs/sjekkpunkt-d-kostnad.md`. To metodefunn der:
    per-funksjon-kostnad lar seg ikke måle retroaktivt (100-linjers loggvindu
    + restart ved hver deploy), og «0 AI-kall fra Opus» var upresist —
    prod-sveipet over `/brief` og `/nyheter` utløste ~6 betalte kall (~$0,07).
  - **Beskjed fra Marius 23. aug ~01:30:** vil ha en Fable-prompt som
    planlegger stor opprydning av `docs/` (30 filer, 6 901 linjer, hvorav 18
    `neste-okt-prompt-*`) og skriver ROADMAP om til full framoversikt over
    alt som gjenstår. **Handling:** `docs/neste-okt-prompt-doks-opprydning.md`
    skrevet med målt inventering, komplett liste over åpne punkter, harde
    regler og fire beslutninger som skal legges fram for ham. Prompten setter
    seg selv i scope for opprydningen den bestiller.
- **PORT 0-AVVIKET LØST — deploy-planen patchet (økt 22), klar for ny
  deploy-økt.** (2026-08-22 natt ~02:30, Fable i plan mode.) Kjøreprompt
  til Opus 5: `docs/neste-okt-prompt-deploy-utforelse-v2.md` (v1 har fått
  UTDATERT-banner). Plan: `docs/plan-deploy-v122-v123.md` med «Endret
  22. aug (økt 22)»-blokk øverst — kun port 0, 2a/2b, 2c, port 10 og
  fakta-avsnittet er rørt.
  - **Marius' beslutninger (økt 22 ~02:15, IKKE re-spør):** alternativ A —
    Opus tagger `c33aef1` som `pre-deploy-main` i port 0 og bruker den som
    reset-mål i 2a/2b (pushes aldri, slettes i port 10); vinduet står:
    lørdag 22. aug, hard tidsport 11:30 (ellers søndag 13:00 via port 4).
  - **Nye målinger (økt 22, read-only):** 3 av de 4 docs-commitene på main
    (`56e5d16`, `c16cf14`, `9ca665f`) er allerede ancestors av alle tre
    feature-branchene — kun `c33aef1` (ny fil
    `docs/prompt-ui-overhaul-plan.md`) er unik for main. `git merge-tree
    --write-tree main fix/live-bonus` → exit 0, **0 konflikter** — økt
    21-frykten for HANDOVER-konflikt i 2c er avkreftet. Komplett
    konfliktliste for 2c: `{ CHANGELOG.md }` (indusert av
    2b-release-committen; package.json/-lock utelukket).
  - Ingenting merget/pushet; prod urørt (v1.2.0). **0 AI-kall.**

- **Deploy-plan for v1.2.1 + v1.2.2 + v1.2.3 GODKJENT — klar for Opus 5.**
  (økt 20, 2026-08-22 natt ~02:00, Fable i plan mode.) Plan:
  `docs/plan-deploy-v122-v123.md` — nummererte porter med bevis-kommando og
  stopp-kriterium per port; utførelsesprompt:
  `docs/neste-okt-prompt-deploy-utforelse.md`.
  - **Marius' beslutninger (IKKE re-spør):** tre pusher (v1.2.1 alene →
    v1.2.2 → v1.2.3, stopp + klarsignal mellom hver), egen v1.2.2-tag,
    B-2-AI-kallet tas i prod etter v1.2.2-deployen (Marius klikker),
    vindu lørdag 22. aug med hard tidsport 11:30 (ellers søndag, 13:00).
  - Alt bygges, testes og Docker-røyktestes lokalt (3 tagger × image) FØR
    første push. Push-lisensen i planen er uttømmende.
  - Varslet i planen: CHANGELOG-konflikt VENTES ved merge 2 (port 2c, med
    løsningsoppskrift — merge-tree-målingen var før release-commitene), og
    «seks punkter» i oppdragsprompten er faktisk 7 (5 til v1.2.2 + 2 til
    v1.2.3; opplistingen der er fasit). **0 AI-kall i planøkten.**

- **v1.2.3 UTFØRT på branch `fix/live-bonus` — IKKE merget, IKKE pushet.**
  (økt 19, 2026-08-22, Opus 5, branchet fra `fix/lag-anbefalinger` @
  `c5b9748`.) Planen `docs/plan-live-bonus.md` fulgt punkt for punkt, ingen
  avvik. Begge C-funnene er fikset. **0 AI-kall.**
  - Commits: `5ce81de` (funn 2: `matchDone` + `publishedBonus`-helperen),
    `80f52fb` (funn 1: `bonusPub`/`bonusEst` atskilt, radfeltet
    `bonusPublished`), `8b242e3` (visningen), og siste commit på branchen
    (denne handover-oppdateringen).
  - **Baseline verifisert:** `npm test` **242/242** på fersk branch, akkurat
    som planen forutsa. Sluttilstand **250/250**, `npm run lint` exit 0 —
    planens mål på 250 truffet nøyaktig.
  - **TDD, rødt observert før grønt hver gang:** `publishedBonus` →
    `SyntaxError: … does not provide an export named 'publishedBonus'`, så
    244/244. Funn 2 → 245 tester, 244 pass, **1 fail** («kampen er
    ferdigspilt, ingen polling»), så 245/245. Funn 1 → 250 tester, 244 pass,
    **6 fail** (fem nye bonustester + kontrakttesten «payloaden har ingen
    døde felter»), så 250/250.
  - **Røyktest port 3010 med tomme nøkler** (scratchpad-`.env`, teknikken
    fra driftslærdommene): `/health` =
    `{"status":"ok","features":{"ai":false,"aiModel":null,"discord":false,`
    `"teamId":true,"leagues":0}}`, alle ruter 200, ukjent sti 404,
    serverloggen inneholder kun lyttelinja — **0 AI-kall**.
  - **Røyktesten traff nøyaktig scenarioet fra begge funnene, mot ekte
    prod-data ~17 t etter ARS–COV.** Rå FPL-fixture: `finished: false`,
    `finished_provisional: true`, `minutes: 90` — altså sto feilen fortsatt
    på i kilden. Vår payload ga likevel `anyLive: false` og
    `matches[0].finished: true`, og /live-HTML-en sa «Ingen kamper pågår
    akkurat nå» uten pulseprikk. Med den gamle koden ville siden ha stått på
    «Kamper pågår» og pollet videre. Ødegaard — samme spiller som i den
    opprinnelige observasjonen — kom ut som
    `{"points":11,"bonusEst":0,"bonusPublished":3,"effective":11}`: bonusen
    vises, og «Effektivt» teller den ikke to ganger. Kolonneoverskriften er
    «Bonus».
  - **Utestående:** manuell verifisering av selve rendringen under neste
    kampvindu (bonuscellen fylles klientside og er utenfor testharnessen —
    `test/app-client.test.js` kjører skriptet i en vm der DOM-elementene er
    `null`). Stopp-testen fra sjekkpunkt C kan først bestås etter deploy.
    Begge står som åpne ROADMAP-punkter.
  - **Merge-rekkefølge (krever klarsignal fra Marius):**
    `fix/sanitize-brief` → `fix/lag-anbefalinger` → `main` (v1.2.2), deretter
    `fix/live-bonus` → `main` (v1.2.3). Aldri deploy torsdag 19–21.

- **Sjekkpunkt C: polling GRØNT, ett funn på bonuskolonnen.** (økt 17,
  2026-08-21 ~22:10, observert av Marius via Claude in Chrome på prod under
  Arsenal–Coventry.) Full analyse med rådata: `docs/arkiv/sjekkpunkt-c-live.md`.
  - Polling: tre kall til `/api/live.json`, nøyaktig 60 s mellom hvert, ingen
    duplikater. Cachen tar støyten (5 raske curl → identisk payload, ~90 ms,
    `cf-cache-status: DYNAMIC`). Statustekst, pulseprikk og kampstillinger
    riktige, ingen konsollfeil. **Pollingintervall og fetch-logikk skal ikke
    røres.**
  - Gjenstår av C: stopp-testen når `anyLive` blir false etter siste
    kampslutt (forventning: null nye `live.json`-kall).
  - **Funn:** bonuskolonnen står tom hele kampen. Rotårsak verifisert mot
    FPL-API-et: FPL publiserer bonus provisorisk MENS kampen pågår, så
    `hasConfirmedBonus()` (`analysis.js:371`) slår til og `live.js:51`
    hopper over kampen — `estimateBonus()` kjører aldri. Bonusen ligger
    allerede i `total_points` (FPLs egen `explain` for Ødegaard: bonus +3 av
    11 poeng), så vakten mot dobbelttelling er riktig; det er kolonnen som er
    død. Løsning besluttet, se ROADMAP v1.2.3. **Ikke implementert** — Marius
    stoppet utførelsen og ba om at funnene ble skrevet ned først.
    **Plan GODKJENT av Marius (økt 18): `docs/plan-live-bonus.md`** —
    branch `fix/live-bonus` (fra `fix/lag-anbefalinger`), 0 AI-kall.
    UTVIDET 22. aug etter stopp-testen: FPL setter `finished` først ved
    rundeprosesseringen (`finished_provisional` settes ved fløyta), så
    /live sa «Kamper pågår» og pollet hele natten. Begge C-funnene fikses
    i samme plan: 8 nye tester, 242 → 250. Utførelsesprompt:
    `docs/neste-okt-prompt-live-bonus-utforelse.md`. Stopp-testen kan
    først bestås etter deploy — åpent punkt under sjekkpunkt D.
  - Avklart uten funn: Tzolis 5→4 poeng (vi leser `total_points` rått hvert
    kall, ingen akkumulering — FPL reviderte selv) og van Ewijk 51'/0 poeng
    (appearance +1, goals_conceded −1 = 0; korrekt).

- **B-1…B-3 riktige anbefalinger på /lag: UTFØRT på branch
  `fix/lag-anbefalinger` — IKKE merget, IKKE pushet.** (økt 17,
  2026-08-21, Opus 5. Planen `docs/plan-lag-anbefalinger.md` fulgt; ett
  avvik lagt fram og avklart, se under.)
  - Commits: `6ede6eb` (B-1: ep_next-fallback + tomtilstand + helperen
    `nextOpponents`), `8d1ed23` (B-2: runde/deadline/kaptein/motstandere i
    rådgiver-prompten + anti-spekulasjon om gratis bytter), `883909b`
    (B-3: «Anbefalinger for Runde N» + kriterie-/tomtilstand i viewet),
    og siste commit på branchen (røyktestbevis + denne oppdateringen).
  - Rørt: `src/services/analysis.js`, `src/services/prompts.js`,
    `src/routes/api.js`, `src/routes/team.js`, `views/team.ejs`, tester og
    docs. IKKE rørt: `public/app.js`, `notify.js`, `brief.js`,
    `gameUpdating`/banner i `fplClient.js` — alt sjekkpunkt C/D observerer
    står urørt.
  - **Baseline-avvik (avklart):** planen anslo `npm test` = 228; faktisk
    målt **231/231 grønt**. Årsak: commit `0e507a4` la til 2 tester etter
    at anslaget ble skrevet, pluss 1 i historisk bokføring (HANDOVER-linjene
    om P3-4 sier 228, linja om `0e507a4` sier 229). Diffen mot
    `fix/sanitize-brief` var kun docs. Marius' valg: kjør videre med 231.
  - **Bevis, TDD-rødt observert før grønt hver gang:** B-1 → 235 tester,
    231 pass, **4 fail**; helper → import-feil (ingen `nextOpponents`);
    B-2 → 240 tester, 237 pass, **3 fail**; B-3 → 242 tester, 240 pass,
    **2 fail**. Sluttilstand `npm test` **242/242**, `npm run lint` exit 0.
    (242, ikke planens 241: `nextOpponents` fikk 2 tester der planen
    regnet 1 — hjemme/borte + tomt lag, og dobbeltrunde.)
  - **Røyktest port 3010 med tomme nøkler** (scratchpad-`.env`):
    `/health` = `{"status":"ok","features":{"ai":false,"aiModel":null,`
    `"discord":false,"teamId":true,"leagues":0}}`, alle 11 ruter 200,
    ukjent sti 404, **0 AI-kall**. /lag viste «Anbefalinger for Runde 2»
    nøyaktig én gang, ingen «undefined» i HTML-en, og kapteinsboksen kjørte
    i **form-modus** (Calafiori form 5.0 øverst) — ep_next-fallbacken er
    korrekt inaktiv nå som GW1-kampene er spilt. Fallbacken er derfor kun
    verifisert av testene, ikke observert i prod-data.
  - **Neste steg — krever klarsignal fra Marius:** 1 AI-kall («Spør AI om
    råd» lokalt) for ende-til-ende-verifisering ETTER sjekkpunkt D, så
    release v1.2.2 og merge i rekkefølgen `fix/sanitize-brief` →
    `fix/lag-anbefalinger` → `main`.

- **B-1…B-3 riktige anbefalinger på /lag: plan GODKJENT, klar for Opus 5.**
  (økt 16, 2026-08-21, Fable i plan mode.) Funnene kom fra sjekkpunkt B
  (fredag ~20:20): kapteinslista på /lag er pick-rekkefølge når alle har form
  0.0 (`captainSuggestions` mangler garden naboene har), AI-rådgiveren mangler
  runde/kaptein/kamper-kontekst, og siden sier «Runde 1» mens anbefalingene
  gjelder Runde 2. Plan: `docs/plan-lag-anbefalinger.md` — ep_next-fallback
  med merket kriterium + tomtilstand, rikere AI-prompt (runde, deadline,
  kaptein, motstander/FDR; gratis bytter utelates bevisst — `my-team/` krever
  auth, verifisert 403), «Anbefalinger for Runde N» én gang i viewet.
  10 nye tester, 228 → 238 (faktisk baseline var 231 → mål 241, se over).
  Utførelsen koster **1 AI-kall, først ETTER
  sjekkpunkt D**. Utførelsesprompt:
  `docs/neste-okt-prompt-lag-anbefalinger-utforelse.md`.
  **Beslutninger tatt av Marius 21. aug (IKKE re-spør):** ep_next-fallback;
  garde «alle scorer 0»; gratis bytter utelates + anti-spekulasjonsinstruks;
  rundetekst én gang øverst; release som v1.2.2; branch
  `fix/lag-anbefalinger` ut fra `fix/sanitize-brief` (denne HANDOVER-linjen
  er sannheten; merge-rekkefølge etter D: sanitize-brief → lag-anbefalinger
  → main). `brief.js`/`globalCaptains` røres IKKE (står som ROADMAP-kandidat).

- **P3-4 `sanitizeBriefText`-robusthet: UTFØRT på branch `fix/sanitize-brief`
  — IKKE merget, IKKE pushet.** (økt 14, Opus 5. Planen fulgt uten avvik.)
  - Commits: `28ab239` (forkortelses-/klokkeslett-maskering i
    setningssplittingen + 5 tester + CHANGELOG), `de2616d` (`TEAM_ALIASES` +
    ordgrense/genitiv-matching + 5 tester + CHANGELOG/ROADMAP),
    og siste commit på branchen (handover + røyktestbevis, denne).
  - Kun `src/services/prompts.js`, `test/prompts.test.js` og docs er rørt.
    Ingen oppførsel som sjekkpunkt A–D observerer er endret (ingen nettverk,
    ingen timere, ingen AI-prompt-endring).
  - Bevis: TDD-rødt observert først begge tasks — Task 1: 223 tester,
    219 pass, **4 fail** (nøyaktig de fire splitting-testene); Task 2:
    228 tester, 226 pass, **2 fail** (de to alias-testene). Deretter
    `npm test` **228/228** og `npm run lint` exit 0 etter hver commit.
    Utgangspunkt på `main` var 218/218.
  - Røyktest port 3010 med tomme nøkler (scratchpad-`.env`):
    `/health` = `{"status":"ok","features":{"ai":false,"aiModel":null,`
    `"discord":false,"teamId":true,"leagues":0}}` (`leagues:0` fordi
    scratchpad-env-en ikke setter `LEAGUE_IDS` — `/liga` svarte likevel 200),
    alle 11 ruter 200, ukjent sti 404, **0 AI-kall** i serverloggen.
  - **Neste steg — krever klarsignal fra Marius:** merge til `main` etter
    sjekkpunkt D (søndag/mandag), evt. som v1.2.2. Push av `main` +
    tag `v1.2.1` gjenstår fortsatt separat (se punktet under).
- **P3-4-planen (godkjent i økt 13, Fable i plan mode):**
  `docs/plan-sanitize-brief.md` —
  to delfunksjoner med TDD (forkortelses-maskering i setningssplittingen,
  lagnavn-alias + ordgrense/genitiv-matching), 10 nye tester, 218 → 228.
  Utførelsesprompt til Opus 5: `docs/neste-okt-prompt-sanitize-brief-utforelse.md`.
  Branch `fix/sanitize-brief`, ingen push, ingen merge før sjekkpunkt D.
  Verifisert i planøkten mot GW1-snapshotet: FPLs `teams.name` er selv
  kortform for flere klubber («Spurs», «Man Utd», «Nott'm Forest») og lang
  form for andre («Coventry City», «Hull City», «Ipswich Town») —
  alias-tabellen i planen dekker begge retninger; ROADMAP-punktets
  «kortnavn»-påstand korrigeres som del av utførelsen.
- **v1.2.0 «Overganger» er i prod** (2026-08-20 ~14:40, tag pushet).
  Ny side `/overganger`: historisk hva hvis-analyse av egne transfers.
  Verifisert i prod: alle 11 ruter 200, 404 OK, footer v1.2.0, tomtilstanden
  «Ingen overganger registrert ennå» vises (korrekt før sesongstart),
  `/health` = `ai:true, discord:true, teamId:true, leagues:1`.
  Lokalt: `npm test` 212/212, `npm run lint` 0.
  Plan med alle beslutninger og avvik: `docs/plan-hva-hvis-transfers.md`.
- **AKTIV økt 8: sesongstart-verifisering (M4)** — sjekkpunkter under.
  GW1-deadline fredag 21. august 19:30. **Ikke rør oppførsel den observerer
  (live-polling, auto-brief, banner) uten avtale. Aldri push/deploy torsdag
  19:00–21:00 (auto-brief ~19:30).**
- Prod kjører v1.2.0, ikke v1.1.3 som sjekkpunktplanen antok — ingen
  observert oppførsel er endret (getLive, notify, brief, banner urørt);
  synlig forskjell er footer-versjonen og det nye nav-punktet «Overganger».
- **v1.2.1 cache-backoff (P3-2) er MERGET TIL `main` LOKALT — IKKE PUSHET.**
  (økt 12, Opus 5. Marius valgte «merge + release + tag lokalt, ingen push».)
  `main` ligger foran `origin/main` (upushet); prod kjører fortsatt v1.2.0.
  Plan: `docs/plan-cache-backoff.md`
  (fulgt uten avvik). Innhold: 30 s backoff per nøkkel i `src/services/cache.js`
  etter mislykket bakgrunnsrevalidering — stale verdi serveres fortsatt
  umiddelbart, suksess nullstiller backoffen, `clear()` tømmer tilstanden.
  Kun cache.js + tester + docs er rørt; ingen observert oppførsel i
  sesongstart-verifiseringen er endret.
  - Commits: `a1f7a5d` (impl + 6 tester + CHANGELOG/ROADMAP/CLAUDE.md),
    `c302cd1` (handover + røyktestbevis), `7ccb754` (`chore: release v1.2.1`
    — package.json/lock 1.2.0 → 1.2.1, CHANGELOG `[1.2.1] - 2026-08-20`),
    `78d438e` (merge --no-ff til `main`). Tag **`v1.2.1`** (annotert) peker
    på `78d438e`. Branchen `fix/cache-backoff` står igjen lokalt.
  - Bevis: TDD-rødt observert først (218 tester, 216 pass, 2 fail — nøyaktig
    de to planen forutså), deretter `npm test` **218/218** og
    `npm run lint` exit 0. Røyktest på port 3010 med tomme nøkler:
    `/health` = `ai:false, discord:false`, alle 11 ruter 200, ukjent sti 404,
    0 AI-kall i serverloggen.
  - **Neste steg — kun push, krever klarsignal fra Marius:** push FØRST etter
    sjekkpunkt D (søndag/mandag), og aldri torsdag 19:00–21:00. Da:
    `git push origin main` og `git push origin v1.2.1`. Coolify deployer
    automatisk; verifiser prod med `/health` (`ai:true, discord:true`),
    11 ruter 200 og footer v1.2.1.
  - Alle 218 tester + lint 0 er verifisert på `main` etter merge.

## Sjekkpunkter for økt 8 (Marius pinger økten)

Plan: `C:\Users\mariu\.claude\plans\oppdrag-verifiser-sesongstarten-wise-puffin.md`

| Sjekkpunkt | Når | Hva |
| --- | --- | --- |
| 0 (FERDIG) | torsdag natt | prep + nullpunkt-snapshot (alle sider 200, tomtilstander bekreftet, data-brief-fasit i scratchpad `brief-foer-deadline.json`: «Runde 1», deadline «fredag 21. august kl. 19:30», kapteiner Raya/Gabriel/Calafiori) |
| A | torsdag ~19:45 | etterkontroll auto-brief: Discord-melding + Coolify-logg mot `/api/brief.json` |
| B | fredag ~20:30+ | tomtilstand → ekte data alle sider; **Marius klikker «Spør AI om råd» ÉN gang** (budsjettkall 1) |
| C | lørdag under kampene | live-polling ≤1 kall/60 s, stopp ved `anyLive=false`, cache-bevis |
| D | søndag/mandag | kostnadskontroll (`AI-kall:`-linjer), skjermbilder, mobilsjekk, v1.2.x-kandidater, avslutning |

**AI-kall-telleliste (budsjett ~3 utover automatiske):** brukt **1 av ~3**
(sjekkpunkt B, fredag 21. aug: Marius klikket «Spør AI om råd» én gang).
Planlagt: 1 kall til for B-2-verifiseringen ETTER sjekkpunkt D → blir 2 av ~3.
(P3-4-utførelsen i økt 14 gjorde **0 AI-kall** — tester bruker
hardkodet tekst, og røyktesten kjørte med tomme nøkler, `/health` `ai:false`.)
NB: 2 lokale AI-kall skjedde ved et uhell i økt 10s røyktest (se lærdommer) —
de vises i Anthropic-forbruket, IKKE i Coolify-loggen.

Nyanse for sjekkpunkt B: `transfers_*_event` kan legitimt være 0 hele GW1 —
tomtilstand på «Mest kjøpt/solgt» er da KORREKT. `topForm` krever spilte
minutter. Kveldens auto-brief er også første ekte test av `sanitizeBriefText`
og `filterSummaryPoints` mot en fersk AI-generering.

## «Overganger» (v1.2.0) — gjenstående oppfølging

Etter GW2, når første ekte transfer finnes (sjekkliste i planfilen):

1. Verifiser feltnavnene i `entry/5330646/transfers/` mot antakelsene
   (`element_in`, `element_out`, `event`, `time`, `event_transfers_cost`).
   Avvik → `fix:`-commit med oppdaterte fixtures.
2. Se `/overganger` med ekte data; mobil 390 px (scroll kun i `.table-scroll`).

## Versjonshistorikk (detaljer: CHANGELOG.md + git-tags)

- v0.1.0–v1.0.0: skjelett → spillere → lag → liga → brief → live → nyheter/AI
  → AI-brief/rådgiver → auto-brief → polish. Alle tagget, alt i prod.
- v1.0.1: AI + Discord i drift (anti-spam-guard, usage-logging, nøkler i Coolify).
- v1.1.0: UI-makeover «Matchday» + view-render-tester.
- v1.1.1/v1.1.2: QA-rettelser (asset-versjonering med innholdshash, sticky
  tabellhoder, tomtilstander, norske oversettelser, mobilmeny).
- v1.1.3: kvalitetspass, 29 funn rettet (se ROADMAP for lista).
- v1.2.0: «Overganger» — hva hvis-analyse av egne transfers.

## Åpne punkter

- **Deploy v1.2.1 → v1.2.3 klar for nytt forsøk** (port 0-avviket løst i
  økt 22 — se Status). Opus 5 kjører
  `docs/neste-okt-prompt-deploy-utforelse-v2.md`; lørdagsvinduet krever
  øktstart ~08–09 (siste push ~10:45, hard port 11:30), ellers tar port 4
  automatisk søndag 13:00.
- **B-1…B-3 er ferdig kodet** (branch `fix/lag-anbefalinger`, se Status).
  Gjenstår: 1 AI-kall for ende-til-ende-verifisering etter sjekkpunkt D, så
  release v1.2.2 og merge `fix/sanitize-brief` → `fix/lag-anbefalinger` →
  `main` — alt på klarsignal fra Marius.
- **P3-4 er ferdig kodet** (branch `fix/sanitize-brief`, se Status).
  Gjenstår: merge etter sjekkpunkt D på klarsignal fra Marius — samme
  klarsignal som push av `main` + tag `v1.2.1`.
- M5: skjermbilder til README + mobilbekreftelse (krever Marius).
- v1.2.x-kandidater i ROADMAP (P1-5b + P3-1…P3-5): fikses kun etter avtale.
  P3-2 har kjøreklar prompt (se Status). P3-3/P3-5 krever avklaring med
  Marius. P1-5b er en arkitekturbeslutning (persistens).
- Valgfritt i Cloudflare: Browser Cache TTL → «Respect Existing Headers».

## Logg over brukerbeskjeder (alle økter — føres løpende)

- 2026-08-22 (økt 22, natt ~02:15): kjøreprompt «Oppdrag (Fable, plan
  mode): løs port 0-avviket i deploy-planen» + to svar på
  plan-spørsmålene: **alternativ A** (`pre-deploy-main`-tag på `c33aef1`
  som reset-mål i 2a/2b) og **lørdag** (vinduet står, port 4 håndterer
  NO-GO → søndag). Handling: konfliktflaten målt på nytt (merge-tree main
  ↔ fix/live-bonus = 0 konflikter; 3 av 4 docs-commits allerede i
  branchenes historikk — HANDOVER-konflikt-frykten avkreftet, 2c-lista er
  `{ CHANGELOG.md }`), `docs/plan-deploy-v122-v123.md` patchet (port 0,
  2a/2b, 2c, port 10 + fakta), `docs/neste-okt-prompt-deploy-utforelse-v2.md`
  skrevet, UTDATERT-banner på v1, HANDOVER oppdatert. Kun docs-commits
  lokalt på `fix/live-bonus`, ingen push, 0 AI-kall.

- 2026-08-22 (økt 21, natt ~02:15): «okay lag en prompt til fable om dette.
  planleggingspromt. fable skriver enn prompt for opus etter planen er
  godkjent». Handling: `docs/neste-okt-prompt-port0-avvik.md` skrevet —
  planleggingsoppdrag til Fable for å patche deploy-planen etter port
  0-avviket. Tre problemer spesifisert: (1) reset-ankeret, med alternativ A
  `pre-deploy-main`-tag vs. B parkering av docs-commitene, (2) port 2c må
  måle konfliktflaten på nytt fordi begge sider nå redigerer
  `docs/HANDOVER.md` — dagens stopp-kriterium ville utløst full stopp, (3)
  `dbcf253` blir foreldet og må ryddes. Leveransekrav: plan-patch +
  `docs/neste-okt-prompt-deploy-utforelse-v2.md` til Opus 5. Ingen push.

- 2026-08-22 (økt 21, natt ~02:00): kjøreprompt «Oppdrag (Opus 5): utfør
  deploy-planen v1.2.1 → v1.2.3» — planen er fasit, ingen re-planlegging,
  uttømmende push-lisens (port 5/6/7 + docs-commit i port 10), absolutte
  stopp-punkter etter deploy 1 og 2, 0 AI-kall fra Opus. Handling: **port 0
  STOPPET på avvik** — lokal `main` står ikke på `78d438e` slik planen
  forutsetter. Ingenting endret, ingenting pushet; venter på klarsignal
  (se «Åpne punkter»).

- 2026-08-22 (økt 20, natt ~01:45): kjøreprompt «Oppdrag (Fable, plan mode):
  trygg deploy av v1.2.2 + v1.2.3 til prod» — planlegg, Opus 5 utfører; krav:
  «alt skal funke før noe pushes/committes/merges til main». Fire åpne
  spørsmål besvart av Marius: tre pusher; egen v1.2.2-tag; B-2-kallet i prod
  etter v1.2.2-deployen; lørdag med tidsport 11:30 (ellers søndag 13:00).
  Handling: plan godkjent og lagret som `docs/plan-deploy-v122-v123.md`,
  Opus-prompt i `docs/neste-okt-prompt-deploy-utforelse.md`, ROADMAP og
  HANDOVER oppdatert, committet lokalt på `fix/live-bonus`. Ingen push,
  0 AI-kall.
- 2026-08-22 (økt 19): ga Opus 5 utførelsesoppdraget for v1.2.3 med
  `docs/plan-live-bonus.md` som fasit — «følg planen NØYAKTIG, ikke re-spør,
  ikke re-planlegg», Task 0 er alt gjort av Fable (verifiser, ikke committ på
  nytt), TDD med rødt før grønt (baseline 242 → mål 250), 0 AI-kall, aldri
  push, ingen merge, aldri deploy torsdag 19–21, ikke rør
  polling-tilstandsmaskinen i `public/app.js`, og «avviker virkeligheten fra
  planens antakelser: stopp og legg det fram». Handling: hele planen utført
  på `fix/live-bonus` i tre kodecommits, 250/250, lint 0, røyktest med tomme
  nøkler (`ai:false`). Ingen avvik fra planen, ingen push, ingen merge.
- 2026-08-22 (økt 18, natt/morgen): limte inn stopp-test-rapporten fra
  Claude in Chrome — testen lot seg ikke kjøre, /live sa «Kamper pågår» i
  66+ min etter kampslutt (fire friske sidelaster, frosset innhold).
  Handling: rotårsak verifisert mot FPL-API-et (finished_provisional vs
  finished), cache-hypotesen avkreftet. Marius valgte «Utvid v1.2.3-planen»
  — plan, prompt, ROADMAP og sjekkpunkt-C-dokumentet oppdatert og
  committet. dataAlder bevisst utsatt (P3-2-rest). Ingen kode endret.
- 2026-08-21 (økt 17, kveld): limte inn sjekkpunkt C-observasjonene fra
  Claude in Chrome, avbrøt påbegynt implementering med «jeg ønsker bare at du
  oppdaterer all denne informasjonen i fil eller noe». Handling: alt skrevet
  til `docs/arkiv/sjekkpunkt-c-live.md` + ROADMAP/HANDOVER, committet `30a8dab`.
  Ingen kode endret.
- 2026-08-21 (økt 18): «les gjennom hele chatten og lag en solid plan …
  du skal planlegge. opus skal gjennomføre» (byttet til Fable). Handling:
  plan for v1.2.3 skrevet og godkjent (`docs/plan-live-bonus.md`),
  utførelsesprompt levert, alt committet lokalt. Ingen push, 0 AI-kall.
- 2026-08-21 (økt 17): kjøreprompt «Oppdrag (Opus 5): utfør planen for riktige
  anbefalinger på /lag (B-1…B-3)». Handling: baseline målt til 231/231 (planen
  sa 228) → stoppet og la fram avviket med årsak i stedet for å improvisere.
  Marius svarte «Kjør videre, mål 241» og ba samtidig om at tallet rettes i
  plan- og handover-dokumentene. Utførelsen fortsetter etter planen.
- 2026-08-21 (økt 16, kveld): kjøreprompt «Oppdrag (Fable, plan mode): riktige
  anbefalinger på /lag ved sesongstart (B-1…B-3)» — planlegg, Opus 5 utfører.
  Handling: fakta re-verifisert mot kode + engangs GET-kall (`ep_next` > 0 for
  502/600 spillere ved sesongstart; `my-team/` gir 403 uten auth; fromGw = 2),
  seks beslutninger stilt og besvart — Marius valgte anbefalingen på alle seks
  (se Status). Plan godkjent og lagret som `docs/plan-lag-anbefalinger.md`,
  utførelsesprompt skrevet, oppdragsprompten arkivert til `docs/arkiv/`, alt
  committet lokalt på `fix/lag-anbefalinger` (base `fix/sanitize-brief`).
  Ingen push, **0 AI-kall i planøkten**.
- 2026-08-20 (økt 14, ~19:50): limte inn Coolify-loggen + «jeg er ikke hjemme
  … kan du sjekke det opp eller kanskje jeg kan sjekke fra github?» Handling:
  **sjekkpunkt A er LUKKET.** `/api/brief.json` hentet fra prod med curl
  (offentlig URL, ruten kaller kun `assembleBrief` → 0 AI-kall).
  GitHub kan ikke brukes til dette — det er live prod-data, og repoet er
  dessuten ikke pushet siden v1.2.0.
  Fasit mot briefen: `fixturesBeforeDeadline: []` ✅, `captains` = Raya 36,3 /
  Gabriel 29,6 / Calafiori 32,6, alle form 0.0 ✅, `injuries` = 1 (Bruno G.).
  Avvik funnet: briefen påsto «alle stiller friske» (feil), og skrev
  Calafiori 32,3 % mot dataenes 32,6 % — begge ført i ROADMAP.
  Loggen viste INGEN «AI-brief: fjernet …»-linje: gammel `sanitizeBriefText`
  kuttet ingenting, så fixturen er ubeskåret modelltekst.
  AI-kall torsdag: 3 × news-summary + 2 × ai-brief-gw1 (ett fra et
  /brief-besøk, ett fra auto-briefen > 1 t senere — forventet).
  Fikset underveis: «Unknown»-skadetypen, branch `fix/news-unknown`
  (`d88b913`, ut fra `main`), 218 → 219 tester, rødt observert først.

- 2026-08-20 (økt 14, ~19:35): limte inn hele Discord-meldingen fra
  auto-briefen + «hva gjøres videre?». Handling: sjekkpunkt A påbegynt.
  Briefen kom presis 19:30 — auto-brief-scheduleren virker i prod.
  Teksten er lagret uendret som `test/fixtures/brief-gw1.js` med to
  regresjonstester (229 → 231, grønt, lint 0, commit `0e507a4`).
  Bekreftet fra ekte tekst: P3-3-tidsfaktaene følges («samtlige kamper
  spilles etter at deadline har passert»), norske uttrykk brukes («holdt
  nullen», «runde»), og ny `sanitizeBriefText` lar teksten stå uendret.
  Nytt funn ført i ROADMAP: kapteinslista er vilkårlig ved sesongstart
  (form 0.0 → score 0 for alle). GJENSTÅR for Marius: Coolify-logg og
  `/api/brief.json` — se «Sjekkpunkt A».

- 2026-08-20 (økt 14, ~16:00): «kan du sørge for at discord webhooken sender
  en @everyone når den sender brief?» Handling: gjort på EGEN branch
  `feat/discord-everyone` (ut fra `main`, commit `75e1f96`) — holdes atskilt
  fra P3-4 så de kan merges uavhengig. `@everyone` legges på i
  `postToDiscord`, ikke i brief-teksten, så kanalen pinges nøyaktig én gang
  selv når briefen deles i flere meldinger. `allowed_mentions.parse` er satt
  til `['everyone']`, som samtidig slår av bruker-/rollementions fra
  AI-teksten. TDD: 228 → 231 tester, 3 rødt observert først, deretter
  231/231 + lint 0. Ikke pushet — kveldens brief (~19:30) går som før, uten
  ping. Får effekt først ved deploy etter sjekkpunkt D.
- 2026-08-20 (økt 14, etter P3-4): «går det fint om jeg nå venter til 1930
  med den briefen (i dag er torsdag). også fikser vi videre derfra. steg A».
  Handling: bekreftet — auto-briefen postes ~19:30 torsdag (24 t før
  GW1-deadline fredag 19:30), sjekkpunkt A gjøres ~19:45. Ingenting fra
  P3-4-økten påvirker den: branchen er ikke pushet, prod kjører v1.2.0 med
  den GAMLE `sanitizeBriefText`. Kveldens brief er derfor en gratis ekte test
  av dagens versjon — teksten bør tas vare på som fixture til P3-4/P3-5.
  Push-forbudet torsdag 19–21 er uansett ikke i veien (ingenting skal pushes).
- 2026-08-20 (økt 14): kjøreprompt «Oppdrag (Opus 5): utfør
  sanitize-brief-planen (P3-4)» — les HANDOVER (ikke forstyrr den aktive
  sesongstart-verifiseringen A–D), CLAUDE.md og `docs/plan-sanitize-brief.md`;
  følg planen nøyaktig task for task, ingen re-planlegging, ingen subagenter;
  branch `fix/sanitize-brief`, aldri push, ikke merge før sjekkpunkt D +
  klarsignal; ikke rør `main`s upushede commits/tag `v1.2.1`; ingen AI-kall;
  TDD med rødt observert først; røyktest med tomme nøkler på PORT=3010 der
  `/health` sjekkes først; bevis (kommando + output) for hver verifisering;
  loggføring; tiltale Marius. Handling: utført som beskrevet — tre commits
  (`28ab239`, `de2616d` + denne docs-commiten), 218 → 228 tester, lint 0,
  røyktest OK, 0 AI-kall, ingen push, ingen merge. Ingen avvik fra planen.
- 2026-08-20 (økt 13): kjøreprompt «Oppdrag (Fable, plan mode): robust
  sanitizeBriefText (P3-4)» — planlegg i plan mode, Opus 5 utfører; harde
  regler: branch `fix/sanitize-brief`, aldri push, ikke merge før sjekkpunkt
  D, aldri deploy torsdag 19–21, ingen AI-kall, TDD/node:test uten nettverk
  og ekte timere, ingen nye avhengigheter, bevis for alt, loggføring,
  tiltale Marius. Handling: plan godkjent i plan mode og lagret som
  `docs/plan-sanitize-brief.md`; Opus 5-prompt skrevet til
  `docs/neste-okt-prompt-sanitize-brief-utforelse.md` (+ limt i chatten);
  HANDOVER oppdatert; committet lokalt på `main` uten push. 0 AI-kall.
- 2026-08-20 (økt 12, ~15:20): kjøreprompt «Oppdrag (Opus 5): utfør
  cache-backoff-planen (P3-2)» — følg planen nøyaktig, branch
  `fix/cache-backoff`, TDD med rødt observert først, ingen push, ingen merge
  før sjekkpunkt D, røyktest med tomme nøkler, bevis for hver verifisering.
  Handling: utført som beskrevet, to commits lokalt (`a1f7a5d` + denne
  docs-commiten),
  212 → 218 tester, lint 0, røyktest OK. Ingen avvik fra planen.
- 2026-08-20 (økt 12, ~15:15): «Lag en ny prompt til claude med alle
  eksisterende regler … skal ikke stå i veien for sjekkpunktene A B C D, be
  fable også lage en prompt som skal sendes til opus 5». Handling:
  `docs/neste-okt-prompt-sanitize-brief.md` skrevet — planleggingsoppdrag til
  Fable for **P3-4 `sanitizeBriefText`-robusthet**, valgt fordi det er en ren
  tekstfunksjon (null nettverk, null AI-kall, rører ikke live-polling,
  auto-brief-scheduler eller banner). Prompten krever at Fable leverer en kort
  Opus 5-utførelsesprompt.
- 2026-08-20 (økt 12, ~15:05): «Og gjør alt i neste steg» → varslet om at
  push auto-deployer prod midt i sesongstart-verifiseringen, og at hans egen
  regel sier merge først etter sjekkpunkt D. Valgte **«merge + release + tag
  lokalt, ingen push»**. Handling: `chore: release v1.2.1` (7ccb754), merge
  `--no-ff` til `main` (78d438e), annotert tag `v1.2.1`. Push gjenstår og
  krever eget klarsignal.
- 2026-08-20 (økt 11, ~14:55): kjøreprompt for planlegging av cache-backoff
  (P3-2) gitt til Fable i plan mode; underveis: «Så nå lager du en prompt jeg
  kan sende til Opus? For å gjennomføre planen?» → bekreftet. Handling: plan
  godkjent og lagret som `docs/plan-cache-backoff.md`, kort Opus 5-prompt i
  `docs/neste-okt-prompt-cache-backoff-utforelse.md`, HANDOVER oppdatert,
  committet lokalt uten push.
- 2026-08-20 (økt 10, ~15:00): «Gå gjennom docs-filen, rydd — ikke poeng med
  masse historikk. Finn en oppgave som kan gjøres akkurat nå og lag en
  kopierbar prompt til en ny AI-agent.» Handling: HANDOVER.md ryddet (denne
  versjonen), P3-2 cache-backoff valgt som trygg oppgave under
  verifiseringen, prompt skrevet til `docs/neste-okt-prompt-cache-backoff.md`.
- 2026-08-20 (økt 10, ~15:05): «Prompten skal be Fable lage en kort
  overleveringsprompt når planen er ferdig — Fable planlegger, Opus 5
  gjennomfører.» Handling: prompten omskrevet som planleggingsoppdrag med
  leveransekrav om kort Opus 5-prompt.
- 2026-08-20 (økt 10, ~15:10): «Lag en oversiktlig, ikke-teknisk fil bare
  til meg om hva som skal implementeres videre.» Handling: `docs/VIDERE.md`
  opprettet (holdes oppdatert ved milepæler).
- 2026-08-20 (økt 10, ~14:40): «Hvor mye av planen er gjennomført?» Handling:
  statusrapport — alle 6 tasks ferdige, kun «Etter GW2»-sjekklisten igjen.
- 2026-08-20 (økt 10, ~14:33): «Jeg er klar for å merge» + spørsmål om
  skjemaverifiseringen. Handling: forklart; release v1.2.0 kuttet, merget
  `--no-ff`, pushet, prod verifisert ~14:40, tag pushet.
- 2026-08-20 (økt 10): kjøreprompt for hva hvis-analysen + plan godkjent +
  to valg (side «Overganger», uten AI). Handling: bygget med TDD på branch,
  212/212, røyktest OK. Uhell: 2 lokale AI-kall pga. `loadEnvFile()` — se
  lærdommer.
- 2026-08-20 (økt 9): kjøreprompt kvalitetspass v1.1.3 (29 funn) → rettet på
  branch; «Okay du kan pushe til main» → v1.1.3 i prod ~03:00, tag pushet;
  bestilte kjøreprompt for hva hvis-analysen (skrevet med API-verifisert
  datagrunnlag).
- 2026-08-20 (økt 8): kjøreprompt sesongstart-verifisering → plan godkjent,
  sjekkpunkt 0 utført; valg «Marius pinger økten per sjekkpunkt»; avklart at
  Discord-meldingen «kl 22» var onsdagens tvungne røyktest; Coolify-logg
  bekreftet scheduler armert; «noe å jobbe med i mellomtiden?» → valg
  «Kvalitetspass» → 29 funn → «lag detaljert prompt til Opus 5» →
  `docs/neste-okt-prompt-kvalitetspass.md`; «vent med A/B-greiene».
- 2026-08-20 (økt 7): deploy-kjøreprompt v1.1.1 utført; Cloudflare-purge
  bekreftet av Marius (via Claude in Chrome); retteordre fra visuell QA →
  `fix/qa-v1.1.2`; «push + lag god handover med prompt til ny sesjon» →
  v1.1.2 i prod, sesongstart-prompt skrevet.
- 2026-08-19 (økt 5): QA-rapport v1.1.0 som oppdrag → plan godkjent;
  «presenter planen som prompt til ny kodeagent» →
  `docs/neste-okt-prompt-qa-v111.md`; avklaringer: P1-5 strategi B,
  Playwright OK i scratchpad (aldri i repoet); «stopp her, gjør det du må
  før jeg sender prompten» → committet lokalt uten push.
- 2026-08-19 (økt 4): «Utfør HELE implementeringsplanen, ikke re-planlegg,
  ikke subagenter» → utført; tiltale-runden endte på **Marius** (permanent
  minne); `.env` med API-nøkkel → pre-flight grønn; FPL team-ID funnet og
  satt (5330646); webhook-URL gitt i klartekst (Marius varslet om at den kan
  regenereres); Discord-melding bekreftet mottatt; env-variabler lagt i
  Coolify → `/health` ai:true/discord:true.
- 2026-08-19 (økt 2–3): «lag prompt til Fable for planlegging — fullføre alt
  + full UI-makeover, clean» → `docs/neste-okt-prompt.md`; footer med
  versjon + sist oppdatert bestilt (implementert); AI-strategi avklart
  (Anthropic API, v0.8.0, data-brief alltid fallback); planlegging med
  avklaringer (nøkkel klar, Discord klar, én lokal fontfil OK, AI/Discord
  først, Opus 5 xhigh for utførelse).
- 2026-08-19 (økt 1): «Ikke limit deg — lag det så bra du kan»; «AI-en må
  være billig for én person»; «bruk brainstorming» → tre AI-funksjoner +
  Sonnet 5; usage-regel ~95 % → handover; GitHub-kobling (privat repo,
  Coolify på fpl.marsk.no); «ta notat av alt jeg sier» → denne loggen;
  «ROADMAP som løpende todo»; «fiks deploy til Coolify/GitHub først» →
  gjort; Claude in Chrome-prompt for Coolify-oppsett levert.

## Loggposter økt 25–26 (rotert fra HANDOVER 2026-08-24, økt 29)

- 2026-08-24 (økt 26): kjøreprompt «Oppdrag (plan mode): planlegg v1.2.4 —
  AI-rådgiverens promptstruktur på /lag» + brainstorming: Marius valgte
  anbefalingen på alle fire spørsmål (fullt signalsett; sidens beregninger
  med i prompten; promptregler i stedet for etterkontroll; databygging
  flyttes til prompts.js). Underveis: «Gjør planen så detaljert som mulig
  … lag en lett kopierbar prompt til opus … Ikke lag en fil for det …
  oppdater alle filene du trenger.» Handling: plan skrevet og godkjent
  (`docs/arkiv/plan-v124-radgiver-prompt.md`), HANDOVER/ROADMAP oppdatert,
  Opus-prompt levert i chatten. 0 AI-kall, ingen kodeendringer, ingen push.
- 2026-08-24 (økt 25): «Lag en full plan over alt filene i docs og alle
  planene dette prosjektet har … i hvilke steg … med versjonsnummer …
  mest optimale løsningen.» To beslutninger tatt: (1) kun kodereleaser får
  versjonsnummer, sjekker/målinger er porter P1–P4; (2) UI-overhalingen
  bekreftet som v1.3.0 etter v1.2.5. Handling: versjonsplan-tabell +
  dokumentkart inn i ROADMAP, VIDERE speilet, denne loggen. 0 AI-kall,
  ingen kodeendringer.

## v1.2.4-detaljer (rotert fra HANDOVER 2026-08-24, økt 29)

- **v1.2.4 ferdig og ute (økt 27, Opus).** Hele
  `docs/arkiv/plan-v124-radgiver-prompt.md` (Task 1–3) utført, tag `v1.2.4`,
  `main` = `origin/main` = `14cd91b`. **2 AI-kall brukt av 2 budsjetterte.**
  - Rådgiver-prompten bygges nå i `buildAdvicePrompt` (prompts.js) fra
    strukturerte spillerobjekter; `api.js` er ren datainnsamler. Fullt
    signalsett + sidens beregninger (kapteinstopp m/kriterium,
    innkjøpskandidater) + REGLER-seksjon. Ingen nye FPL-kall.
  - TDD: rødt observert (256 tester, 246 pass, 10 fail) → grønt
    **256/256, lint exit 0**.
  - Røyktest (tomme nøkler, port 3010): `/health` → `ai:false,
    discord:false`, alle 11 ruter 200, ukjent sti 404, POST `/api/ai-rad`
    → 400 «AI er ikke aktivert».
  - **E2E lokalt med ekte nøkkel (AI-kall 1 av 2, `/health` → `ai:true,
    discord:false`): B-2-kriteriene bestått.** Svaret: «## 1) Kaptein:
    Behold Haaland … Selv om sidens formbaserte rangering topper
    **Ødegaard** (form 11.0) foran **Haaland** (form 2.0), viser tallene
    noe annet når man ser på ventet poeng» og «**João Pedro** har 0 spilte
    minutter så langt (ingen data ennå, ikke svakt)» — nøyaktig feilen
    B-2 gjaldt. Stikkprøve mot FPL-bootstrap: Ødegaard form 11.0/ep 2.3,
    Haaland form 2.0/ep 4.0, Gakpo form 12.0/ep 2.5/7.0m, Wirtz form
    2.0/62 min/7.5m, João Pedro 0 min — **alle tall korrekte, ingen
    påfunnede**. Rådgiveren begrunnet også avviket fra sidens rangering
    og antok ikke gratis bytte.
  - **Prod-retest (AI-kall 2 av 2), 24. aug 00:55: B-2-kriteriene bestått.**
    «**João Pedro** har 0 minutter spilt så langt — dette er ikke
    nødvendigvis dårlig form, men mangel på data» og «Jeg fraviker altså
    sidens rene formbaserte rangering — ventet poeng gir et mer helhetlig
    bilde». Stikkprøve: Ødegaard form 11.0/ep 2.3, Haaland ep 4.0/form 2.0,
    M.Sangaré form 14.0/5.5m, Groß form 2.0/5.5m — alle korrekte. Også
    hjemme/borte stemte (MCI borte mot CRY FDR 3; CHE hjemme mot BHA).
  - `/brief` og `/nyheter` ble ALDRI besøkt med ekte nøkkel, verken lokalt
    eller i prod.

## Loggpost økt 27 (rotert fra HANDOVER 2026-08-24, økt 29)

- 2026-08-24 (økt 27, Opus): kjøreprompt «Oppdrag (Opus 5, utførelsesøkt):
  utfør v1.2.4 — AI-rådgiverens promptstruktur på /lag» med harde rammer:
  Task 1–2 nå, Task 3 kun på klarsignal, aldri push uten klarsignal, maks
  2 AI-kall (1 lokal E2E + 1 prod-retest), aldri /brief eller /nyheter med
  ekte nøkkel, TDD med observert rødt, checkbox-sporing i plandokumentet,
  avvik rapporteres. Handling: Task 1 + Task 2 utført etter planen (2
  commits på `fix/radgiver-prompt`), 1 AI-kall brukt, ingen push. Ett
  metodetillegg utover planen: tallene i AI-svaret ble stikkprøvd mot
  FPLs `bootstrap-static/` i tillegg til /lag-siden (gratis, ingen AI).
  Deretter klarsignal: **«kjør release»** (mandag 24. aug ~00:50). Handling:
  Task 3 utført — bump 1.2.4, CHANGELOG/ROADMAP/VIDERE, merge til `main`
  (256/256 + lint 0 på main), tag `v1.2.4`, push, Coolify-deploy på 30 s,
  prod-retest bestått. Tidsvindu sjekket før push: mandag 00:45, 0 kamper
  i gang, GW2-deadline 28. aug. Totalt 2 AI-kall i økten.
  Til slutt: «Lag en kopierbar prompt til fable som skal planlegge neste
  steg. Husk det med å oppdatere ting. Ikke skriv en fil.» Handling:
  planleggingsprompt for v1.2.5 (brief-kvalitetstrioen) levert i chatten,
  ikke som fil. To åpne ryddepunkter meldt til Marius, ikke utført:
  lokal branch `fix/radgiver-prompt` står igjen, og
  `docs/arkiv/plan-v124-radgiver-prompt.md` bør arkiveres til `docs/arkiv/`.

## Rotert 2026-08-24 (økt 33): loggposten fra økt 32 (verbatim fra HANDOVER.md)

- 2026-08-24 (økt 32, Opus): kjøreprompt «Oppdrag (Opus 5,
  utførelsesøkt): utfør ETAPPE 2 — v1.3.1 Klubbgrafikk» med
  `superpowers:executing-plans` mot `docs/plan-v130-ui-overhaul.md` og
  mockupen som fasit (ved avvik vinner planen). Harde rammer: Task
  1.1-0…1.1-6 nå, 1.1-7 kun på klarsignal, ingen designbeslutninger,
  aldri push uten klarsignal (heller ikke docs), sjekk `fixtures/?event=N`
  og aldri to. 19–21, **0 AI-kall** (`/health` → `ai:false` FØRST),
  `npm run fetch-clubs` eneste tillatte nettverkskall, TDD med observert
  rødt i planfila (282 → 283 → 287 → 290 → 296), ingen nye avhengigheter,
  Playwright kun i scratchpad, docs i samme commit, branch
  `feat/ui-v131-klubbgrafikk` fra rent og grønt `main`.
  Handling: alle sju tasks (1.1-0…1.1-6) utført, 5 commits, **296/296 +
  lint 0**, Playwright 332/332 + 22/22 klubbsjekker, 60 bildefiler
  (561 KB) committet, 0 AI-kall, ingenting pushet. Ett avvik rapportert:
  planens regex for «uversjonert bilde-URL» flagget korrekte URL-er og ble
  rettet (markupen står som planlagt). Rødfasene 1.1-1 og 1.1-2 ga færre
  tester enn planen anslo fordi ESM-linkfeil tar hele testfila — årsak
  dokumentert i planfila. Deretter klarsignal: **«Kjør»** (mandag 24. aug
  ~03:45). Handling: Task 1.1-7 utført — bump 1.3.1, docs, merge til
  `main`, tag `v1.3.1`, push, Coolify-deploy, prod-verifisering uten
  `/brief` og `/nyheter` (240/240 + 14/14 i Playwright). Tidsvindu før
  push: mandag 03:44, 0 kamper i gang, neste avspark 24. aug 19:00 UTC.
  Til slutt nytt **«Kjør»** (~04:05), tolket som klarsignal for ETAPPE 3.
  Handling: Task 1.2-0…1.2-3 utført på `feat/ui-v132-finpuss`, 3 commits,
  299/299 + lint 0, Playwright 332/332 + 22/22, 0 AI-kall, ingenting
  pushet. Deretter spørsmål om status på overhalingen (svart: 20 av 21
  tasks ferdig, kun Task 1.2-4 igjen + etappe 4 som avhenger av Marius’
  QA-funn). Til slutt: **«DU kan pushe til main. Deretter lag en fin
  overtagelse til neste agent med en kopierbar prompt. Ikke lag en fil
  for den prompten alene.»** Handling: kampvindu sjekket (mandag 13:12,
  0 kamper i gang, neste avspark 24. aug 19:00 UTC), `main` pushet
  (`8ec5410..2eb6c95`), Coolify-rebuild verifisert (prod oppe, v1.3.1),
  HANDOVER skrevet som overlevering på branchen, prompt levert i chatten
  (ikke som fil). `feat/ui-v132-finpuss` bevisst IKKE pushet — en push
  til `main` av den ville vært release, som krever eget klarsignal.

## Rotert 2026-08-24 (økt 34): loggposten fra økt 33 (verbatim fra HANDOVER.md)

- 2026-08-24 (økt 33, Opus): kjøreprompt «fullfør ETAPPE 3 — release
  v1.3.2 — og forbered ETAPPE 4». Rammer: Task 1.2-4 kun på eksplisitt
  klarsignal, ingen designbeslutninger, aldri push uten klarsignal
  (heller ikke docs), `fixtures/?event=N` før enhver push, aldri torsdag
  19–21, **nøyaktig ett AI-kall igjen** (én visning av prod-`/brief`
  ETTER deploy), `/nyheter` aldri med ekte nøkkel, rutesveip uten
  `/brief` og `/nyheter`, ingen nye avhengigheter, Playwright kun i
  scratchpad, docs i samme commit, kryss av i planfila med observerte
  tall. ETAPPE 4 startes ikke før Marius leverer P0/P1/P2-lista.
  Handling: status rapportert (299/299, lint 0, versjon 1.3.1, rent tre,
  4 commits foran `main`), deretter klarsignal **«Kjør»** (mandag
  24. aug ~13:18). Task 1.2-4 utført — se statusdelen øverst.

## Rotert 2026-08-24 (økt 34): v1.3.0-statusbulleten (verbatim fra HANDOVER.md)

- **v1.3.0 (etappe 1) ute siden 24. aug:** tokenpalett i to temaer med
  kontrast låst av `test/style.test.js`, inline-tema-script, temabryter,
  lilla topbar, `views/partials/`. Detaljene fra økt 31 er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.

## Rotert 2026-08-24 (økt 34): v1.3.2-statusblokka (verbatim fra HANDOVER.md)

- **v1.3.2 (etappe 3) RELEASET 24. aug (økt 33, Opus).** Task 1.2-4 kjørt
  på klarsignal: bump 1.3.2, docs, merge `--no-ff` til `main`, tag
  `v1.3.2`, push, Coolify-deploy. **299/299 tester, lint 0, prod grønn,
  AI-budsjettet brukt opp (1 av 1).** Detaljene: se prod-linjene nedenfor.
  - Innholdet: kontraktstester som låser markupen `app.js` avhenger av
    (heroens `data-deadline` + fire `data-unit`, 11 kolonnehoder med
    `data-type` og `aria-sort`), `btn-link` tilbake til dashbordet på
    404/error/no-team, tellere i dashbord-korthodene, aktiv chip i
    Oppstilling-hodet, kamplista i briefen som `.fixture-row` med
    klokkeslett, Beste/Verste som piller, kreditering på egen linje i
    footeren.
  - Heroen var allerede ferdig fra etappe 1 — ingen endring nødvendig.
  - Pillenes forgrunnsfarger var ikke spesifisert i planen. Målt der de
    står (kortflaten `--surface`): beste 10,42 mørkt / 5,66 lyst, verste
    5,39 / 5,27. Kan ikke låses i `PAIRS` — `*-soft` er rgba, ikke hex.

## Rotert 2026-08-24 (økt 34): planbulleten for UI-overhalingen (verbatim fra HANDOVER.md)

- **Plan for UI-overhalingen:** `docs/plan-v130-ui-overhaul.md` (~1900
  linjer, godkjent 24. aug) — fire etapper v1.3.0–v1.3.3 med kode og
  testtall (272 → 282 → 296 → 299). Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
  **20 av 21 tasks ferdige. Kun ETAPPE 4 gjenstår (ingen planlagte
  tasks — innholdet er Marius' QA-funn).**

## Rotert 2026-08-24 (økt 34): task-for-task-loggen for ETAPPE 4 (verbatim fra HANDOVER.md)

- **ETAPPE 4 (v1.3.3 QA-rettelser) PÅGÅR — økt 34, Opus.** Branch
  `fix/ui-v133-qa`, plan i `docs/plan-v133-qa.md` (13 tasks, 18 QA-funn +
  det uverifiserte transfers-pillepunktet). Baseline: 299/299, lint 0.
  Ingen AI-kall — `/brief` og `/nyheter` kun LOKALT med tomme nøkler
  (`/health` → `ai:false, discord:false` bekreftet), aldri i prod.
  Lint exit 0 etter hver task. Avvik fra planteksten føres inn i
  planfilas «Observert»-felt.
  - 1.3-0: branch, planfiler, ETAPPE 4-stubben peker videre.
  - 1.3-1 (QA 1+8): 301/301, Playwright 8/8. `--topbar-h` styrer
    menyhøyden (57/50 px); pinned-boksen mistet sin virkningsløse sticky
    og fikk en høydereserve (14rem desktop / 19rem mobil) i stedet.
  - 1.3-2 (QA 6+7): 302/302. `opacity` ut av versjonslinja og
    benkeradene — `--text-dim` i stedet, låst med `text-dim`/`bg` i PAIRS.
  - 1.3-3 (QA 2+9+10): 305/305, Playwright 40/40. Intl-NBSP byttet mot
    vanlige mellomrom i `formatNumber`/`formatSigned`, `.num` er `nowrap`,
    statistikkortene deler aldri ord, `hyphens: manual` i body.
  - 1.3-4 (QA 3+14): 308/308, Playwright 16/16. `.rank-up/-down/-same`
    med `aria-label` på hver ligarad, hele raden klikkbar via
    `tr[data-href]` (Modul 6 i app.js), valgt rival får `.row-rival`.
  - 1.3-5 (QA 4): 311/311. `formationOf()` i analysis.js, formasjonen i
    Oppstilling-hodet via ny `.h2-meta`-wrapper.
  - 1.3-6 (QA 5): 312/312. Tellere i /live-korthodene (`live-count-players`,
    `live-count-matches` + antall rader per liga), oppdatert av Modul 3.
  - 1.3-7 (QA 12): 314/314. `rankGraph` returnerer `single`, og team.ejs
    tegner en `<circle>` når grafen bare har ett punkt.
  - 1.3-8 (QA 13): 315/315, Playwright 8/8. Tomtilstand med nullstill-knapp
    på /spillere (`players-empty`), styrt av Modul 2.
  - 1.3-9 (QA 16+17): 318/318, Playwright 6/6. `edgeFadeState`/`initEdgeFades`
    på filnivå i app.js deles av menyen og `.table-scroll`; Modul 0 måler på
    nytt i neste frame (fikser racen mot `scrollIntoView`).
  - 1.3-10 (QA 11+15+18): 321/321. `card-ai` + `.ai-badge` på AI-rådgiveren,
    404 har kun knappelenken, `.grid--start` på anbefalingsgridet.
  - 1.3-11: **322/322** — måltallet i planen. Beste/verste-pillene på
    /overganger er nå låst av en test (grønn med én gang; fixturen hadde
    allerede begge indeksene). Det uverifiserte punktet er dermed lukket
    som markup-kontrakt — P3-punktet om ekte data etter GW2 står fortsatt.

## Rotert 2026-08-24 (økt 34): AI-budsjettdetaljene for UI-overhalingen

- **AI-budsjettet for UI-overhalingen er brukt opp: 1 av 1.** Den ene
  visningen av prod-`/brief` (24. aug 13:23) var grønn: cyan hairline +
  AI-merke, 60 `<strong>` og 0 rå `**`, 9 `.sub-head` og 0 rå `###`,
  10 `.fixture-row` med klokkeslett, 25 klubbmerker (0 uversjonerte).
  `/nyheter` ble aldri besøkt med ekte nøkkel.

## Rotert 2026-08-25 (økt 36): loggposter fra økt 34 (verbatim fra HANDOVER.md)

- 2026-08-24 (økt 34, etter releasen): Marius melder at **deler av siden
  bruker ekstremt lang tid på å laste**, mistenker briefene, og ber om at
  de caches en periode og friskes opp jevnlig på serveren. Valgte omfang:
  brief + nyheter + rådgiver (huket av alle tre, inkludert det motstridende
  «kun briefen nå» — tolket som alle tre). Takt: spurte «kanskje 1 gang om
  dagen?» og ba om min vurdering. **Anbefaling gitt og pinnet i ROADMAP:**
  daglig oppfriskning + ekstra i timene før deadline, nyheter hver 6. time,
  og — viktigst — SWR i `ai.js` så ingen sidevisning blokkerer.
  Handling: lagt inn som kø-punkt 2 (v1.3.4), robusthetskandidaten
  «SWR i ai.js» strøket og peker dit. Kjøreprompt levert i chatten.
- 2026-08-24 (økt 34, Opus): kjøreprompt «utfør ETAPPE 4 — v1.3.3
  QA-rettelser». Rammer: utfør, ikke re-planlegg — ingen designbeslutninger
  (alt pinnet i planens «Pinnede skjønnsvalg»); avvik plan/kode → STOPP og
  spør. **0 AI-kall:** prod-`/brief` og prod-`/nyheter` lastes ALDRI, og
  `#ai-advice-btn` klikkes aldri; lokalt kjøres alt med TOMME nøkler
  (`/health` → `ai:false, discord:false` først). Én commit per task, docs i
  samme commit, TDD 299 → 322, Playwright kun i scratchpad, ingen nye
  avhengigheter, CRLF i patchskript. STOPP etter Task 1.3-12 — release
  (1.3-13) kun på eksplisitt klarsignal, og kun FØR fre 28. aug ~18:00
  eller etter at GW2 er ferdigspilt. Aldri push uten klarsignal.
  Handling: Task 1.3-0 t.o.m. 1.3-12 utført (13 commits), rapportert og
  stoppet. Deretter klarsignal **«Kjør»** (~17:55) → Task 1.3-13:
  tidsvindu og `fixtures/` sjekket, 1.3.3, merge, tag, push 18:00.
  Prod-verifiseringen strandet på 401 — se statusdelen øverst.

## Rotert 2026-08-25 (økt 38): v1.3.4-statusbulleten med fulle måltall (verbatim fra HANDOVER.md)

- **v1.3.4 KODEFERDIG (økt 36, Opus), branch `feat/ai-swr-v134`, upushet.**
  Plan: `docs/plan-v134-ai-swr.md`. **Rotårsaken er målt, ikke gjettet:**
  med fake Claude-klient (10 s forsinkelse; ekte kall 20–60 s) tok `/`
  10 038 ms og `/brief` 10 023 ms på KALD cache — og nøyaktig det samme på
  STALE cache. Uten AI (tomme nøkler) er alle 11 ruter under 0,3 s varme
  (tregest: `/spillere` 282 ms, ren rendering av 496 KB HTML).
  `/overganger` var 3 ms fordi laget ennå ikke har transfers — de inntil
  38 live-kallene er altså ikke målt under last (hører til P3).
  **Målt etter (samme fake-klient): forsiden 35 ms, `/nyheter` 4 ms,
  `/brief` 17 ms på KALD cache — 0 AI-kall utløst av sidevisninger, i alle
  cachetilstander. `refresh._tick()` varmer begge tekstene (2 kall), andre
  tikk 0 kall. Rådgiverklikk: kald 10 150 ms (som avtalt), fersk 2 ms,
  stale 1 ms + fornying i bakgrunnen.** Røyktest med tomme nøkler: 11 ruter
  200 + 404, `/health` ai:false, 0 AI-kall, ingen oppfrisker startet.
  Delfunksjoner: (1) `ai.js` SWR + `getCached` ✅ 330/330, (2) `/brief`
  leser cachen (`getCachedAiBrief`) ✅ 333/333, (3) `news.js`:
  `getNews` leser cachen, `refreshNewsSummary` genererer ✅ 337/337,
  (4) rådgiveren `swr: true` + kildekontrakt i `test/routes.test.js`
  ✅ 339/339, (5) `refresh.js` + `startAiRefresher()` i `server.js`
  ✅ **350/350, lint 0** (baseline 322).

## Rotert 2026-08-25 (økt 38): loggposten fra økt 35 (verbatim fra HANDOVER.md)

- 2026-08-24 (økt 35, Fable): Marius sendte kø-punkt 2-oppdraget hit for
  planlegging + kjøreprompt til Opus som også ferdigstiller HELE v1.3.
  Rotårsak bekreftet i kode: `ai.js:39-44` blokkerer også FORSIDEN
  (`routes/index.js:26-30` awaiter `getNews()`). Beslutning: deadlinevindu
  **6 timer** → ~41–45 kall/uke. Handling: takt-porten i ROADMAP lukket,
  kjøreprompt levert; utførelsesøkten skriver `docs/plan-v134-ai-swr.md`.

## Rotert 2026-08-25 (økt 38): statusblokka før v1.3.4-releasen (verbatim fra HANDOVER.md)

- **v1.3.4 KLARGJORT FOR RELEASE (økt 38), ingenting pushet:
  350/350, lint 0** (baseline 322). `package.json` = 1.3.4, CHANGELOG
  flyttet til `[1.3.4] - 2026-08-25`, merge `--no-ff` av
  `feat/ai-swr-v134` til `main` + tag `v1.3.4` gjort LOKALT.
  **Pushen venter kun på Marius' «push»** — helsesjekken ble lukket 25. aug.
  Vindu: ons 26. aug (reserve tor 27. før 19:00), aldri to 19–21, aldri
  under kamper. Plan: `docs/plan-v134-ai-swr.md`.
  MÅLT (fake klient, 10 s forsinkelse): KALD `/brief` **10 023 → 17 ms**,
  forsiden **10 038 → 35 ms**, **0 AI-kall fra sidevisninger** i alle
  cachetilstander; `refresh._tick()` varmer begge tekstene (2 kall ved
  oppstart), andre tikk 0. Fulle før/etter-tall: `docs/arkiv/HANDOVER-historikk.md`.

- **v1.3.3 (ETAPPE 4): kode og git FERDIG 24. aug, prod-QA gjenstår.**
  `main` = `origin/main` = `edc372b` (merge `--no-ff` av `fix/ui-v133-qa`),
  tag `v1.3.3` pushet 24. aug 18:00. Målt før push: 322/322, lint 0,
  11 ruter 200 + 404, Playwright 332 + 22 + 56, 0 AI-kall. Prod-
  verifiseringen (plan-steg 8 og 9 i `docs/arkiv/plan-v133-qa.md`) er
  IKKE utført — den kjøres ÉN gang mot prod på v1.3.4, se kø-punkt 2.
- **v1.3.0–v1.3.2 (etappe 1–3) ute siden 24. aug:** tokenpalett i to temaer
  med temabryter, klubbgrafikk (`clubAssets.js`, `IMG_VERSION`,
  `npm run fetch-clubs`, 60 bildefiler) og finpuss per side. Detaljene er
  rotert til `docs/arkiv/HANDOVER-historikk.md`.
- **Plan for UI-overhalingen:** `docs/arkiv/plan-v130-ui-overhaul.md` (etappe 1–3,
  godkjent 24. aug) + `docs/arkiv/plan-v133-qa.md` (etappe 4). Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
- **Prod er OPPE igjen siden 25. aug** (Marius fjernet «HTTP Basic
  Authentication»-haken + Redeploy). Kjører **v1.3.3**, `/health` →
  `ai:true, discord:true, leagues:1` (bekreftet på nytt 25. aug 02:28).
  Siste grønne prod-VERIFISERING er fortsatt v1.3.2 24. aug 13:22 — v1.3.3
  er sett kjøre, men aldri QA-et.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 3.
- **Git akkurat nå:** `main` har v1.3.4 merget inn (`--no-ff`) og tag
  `v1.3.4` satt, men ligger **upushet foran `origin/main`** (de 2 gamle
  docs-commitene + docs-rettelsene fra økt 38 + release-merge). Siste
  PUSHEDE tag er `v1.3.3` (`edc372b`) — det er fortsatt den prod kjører.

## Loggpost rotert 26. aug 2026 (økt 40, fra HANDOVER)

- 2026-08-25 (økt 40, Opus): kjøreprompt «SLUTTSPURTEN» — utfør
  `docs/plan-sluttspurt.md` task for task, aldri push uten klarsignal,
  0 ekte AI-kall. Klarsignal «push og fortsett» → v1.3.5 ut; «push» →
  v1.3.6 ut. Marius limte inn Coolifys deploy-logg for v1.3.6 (bygg, ikke
  app-logg — SIGTERM-linjene sto ikke der) og ba til slutt om «en skikkelig
  god handover til neste agent». Handling: Task 0–2 utført og verifisert i
  prod, Task 3 (v1.3.7) klar lokalt i påvente av volumet, 364/364 + lint 0,
  og overleveringen ryddet: HANDOVER fikk «Neste steg» øverst, planfila en
  §0-statusblokk, ROADMAP viser v1.3.7 som «kode klar, ikke deployet», og
  VIDERE.md ble ajour (den lå tre versjoner bak).

## Loggpost rotert 26. aug 2026 (økt 41 første del, fra HANDOVER)

- 2026-08-26 (økt 41, Fable): «full oversikt over alt gjenværende», så
  «planlegg og gjennomfør alt som kan gjøres nå». Handling: v1.3.8 og
  v1.4.0 TDD-bygget på egne brancher uten merge/push (375/375, lint 0,
  røyktest), status ført her + ROADMAP + planens §0. Deretter: «alle
  Chrome-handlinger via Claude in Chrome, du kan pushe» → P2-skjermbilder
  tatt med Playwright og committet. Volum-rapporten kom (Claude in
  Chrome, navngitt volum) → push: v1.3.7 + docs ut 26. aug, prod
  verifisert utenfra (footer, /health, uendret asset-hash).

## Roterte lærdommer (fra HANDOVER 27. aug 2026, 200-linjerstaket)

- **Sjekk at fila ikke finnes før du «oppretter» den:** planen sa
  «Create `test/format.test.js`», men fila fantes med 3 tester fra
  v1.2.0. Write overskrev dem stille, og det ble bare synlig fordi
  testtallet ble 302 i stedet for 305. Gjenopprettet med `git checkout`.
- **En CSS-overstyring må stå ETTER regelen den overstyrer** — en medieblokk
  lenger oppe har lik spesifisitet og taper cascaden. `.table-scroll--pinned`
  lå i ≤640-blokka over basisregelen og hadde null effekt (økt 34).

## Rotert 2026-08-28 (økt 43): status + neste steg før v1.3.8–v1.6.0-releasen (verbatim fra HANDOVER.md)

## Status akkurat nå
- **v1.3.5 og v1.3.6 UTE I PROD 25. aug** (footer `v1.3.6`, `/health` 200).
  v1.3.5: SIGTERM/SIGINT-handler (`createShutdown`). v1.3.6: tidsstemplet
  gameUpdating (5 min utløp) + egen 503-side ved kaldstart i FPLs
  oppdateringsvindu. 360/360, lint 0.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted (gammel
  containers stdout slettes). Beviset er `kill 1` i containerterminalen
  (containeren restartes, loggen beholdes) — de to avslutningslinjene
  skal stå der. Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **v1.3.7 UTE I PROD 26. aug** (footer `v1.3.7`, `/health` 200, hash
  `d508c47f` uendret). Volumet `/app/data` lagt til i Coolify FØR pushen
  (navngitt volum `…-fpl-data`, via Claude in Chrome) — aktivt fra denne
  deployen. Gjenstående markør-bevis: «Brief-markør lastet: runde 2 er
  alt sendt» i loggen ved første omstart ETTER torsdagens auto-brief.
- **v1.3.8 og v1.4.0 forhåndsbygget 26. aug** på `fix/genitiv-nyhetsfilter-v138`
  og `feat/alderstak-v140` (stablet oppå førstnevnte) — 375/375, lint 0,
  røyktest OK. IKKE merget: merge `--no-ff` + tag + push først etter P4.
- **v1.5.0 «Overganger» total FERDIGBYGGET 26. aug** på
  `feat/overganger-v150` (stablet oppå v1.4.0-branchen): T1–T13 utført,
  454/454, lint 0, røyktest grønn (alle ruter, planlegger-payload,
  scenario-POST/DELETE mot ekte data — klubbtaket avviste korrekt).
  Fasit: `docs/plan-overganger-v150.md`. Marius tester lokalt
  (`npm run dev`) når han vil; merge/deploy etter P4, etter v1.3.8/v1.4.0.
- **Idépakken v1.6.0–v1.9.0 besluttet 27. aug:** 16 funksjoner, alle valg
  avgjort i fire spørsmålsrunder. Fasit: `docs/plan-idepakken-v16-v19.md`.
  Egen detaljplan-økt per versjon (kø-punkt 5).
- **v1.6.0 Liga-pakka FERDIGBYGGET 27. aug** på `feat/liga-v160` (stablet
  på v1.5.0-branchen — Marius godkjente «planlegg + bygg nå» og 4. etasje):
  rival-radar, sesonggraf, kaptein-liga (tak siste 10 runder, godkjent),
  Rundens rapport (roast, persistert i DATA_DIR/report-state.json).
  T1–T13, 509/509, lint 0, røyktest med tomme nøkler grønn mot ekte
  ligadata. Plan: `docs/plan-liga-v160.md`. Merge etter v1.5.0 i P4-løpet.
- **P2-skjermbildene tatt og committet 26. aug** (Playwright mot prod,
  mørkt tema, `docs/img/`, lenket fra README). Rest: ekte telefon.
- **v1.3.4 (AI-SWR) ute siden 25. aug** — målingene og detaljene er rotert
  til `docs/arkiv/HANDOVER-historikk.md`; plan: `docs/arkiv/plan-v134-ai-swr.md`.
- **Prod-QA 25. aug: 402 sjekker, 0 feil** mot v1.3.4 (dekker også v1.3.3);
  detaljene er rotert til historikken. v1.3.5–v1.3.7 rører kun `src/`, så
  QA-en står — ingen ny full QA er planlagt.
- **Asset-hashen i prod er `d508c47f`, og den er RIKTIG** (uendret siden
  v1.3.3). Regn den fra git-blobbene, ikke arbeidstreet (CRLF på disk).
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **v1.3.0–v1.3.3 ute siden 24. aug** (tokenpalett, temabryter, klubbgrafikk,
  finpuss, QA-rettelser). Detaljer i `docs/arkiv/HANDOVER-historikk.md`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen. Ny måling i uken
  etter 31. aug (prisskiftet), nå mot taktbudsjettet ~41–45 kall/uke, kø-punkt 1.
- **Git akkurat nå:** `main` pushet t.o.m. `98377e0` 26. aug, tag
  `v1.3.7` pushet. Branchene (umerget, stablet) v138 → v140 → v150 →
  `feat/liga-v160` + `staging` (= v160-toppen) er PUSHET til GitHub som
  backup/staging — utløser ingen deploy, Coolify bygger kun `main`.
  Docs-commits på main ligger lokalt til neste release-push —
  måleuken 1.–6. sept skal være deploy-fri.
- Eldre status (v1.2.3, doks-opprydning, versjonsplan, v1.2.4): arkivert.

## Neste steg (start her)

Fasiten for alt som gjenstår er `docs/plan-sluttspurt.md` — den har kode,
tester, ordrett dokumenttekst, kalender og bevis-krav per task. Køen i
`ROADMAP.md` er den langsiktige prioriteringen og sier det samme.
**Punkt 1–2 kan bare Marius gjøre — Claude in Chrome-promptene er levert
i økt 41 og kan gjenbrukes fra chatloggen.**

1. `[Marius]` **`kill 1` i containerterminalen** (Chrome-prompt 2) → de to
   avslutningslinjene er siste bevis for v1.3.5; huker av Task 2 Step 8.
2. `[Marius]` **Én transfer før fr 28. kl. 19:30** (Chrome-prompt 3) —
   uten den har P3 ingen ekte data å verifisere feltnavnene mot.
3. **Task 4 (P3), tidligst ma 31. aug:** feltnavnene i
   `entry/5330646/transfers/` mot ekte API + `/overganger` på 390 px.
4. **Task 5 (P2), delvis utført 26. aug:** skjermbildene er committet —
   gjenstår mobil-QA på ekte telefon + mockup-sjekk (Chrome-prompt 4).
5. **Task 6 (P4), ~ma 7. sept:** kostnadsmåling etter prisskiftet, mot
   $-tersklene OG taktbudsjettet ~41–45 kall/uke.
6. **Task 7–8 etter P4:** koden er FERDIG på branchene (se status) — kun
   merge `--no-ff` + tag + push gjenstår (P3-avvik → renummerer mekanisk
   først). Deretter v1.5.0 (`docs/plan-overganger-v150.md`), til slutt
   Task 9: arkiver planfilene. Så: idépakken v1.6.0–v1.9.0 (kø-punkt 5).

**P1 er LUKKET 25. aug** (auto-briefen bekreftet i Discord) — sjekkpunkt A
er dermed ferdig i sin helhet. P0 ble lukket samme dag.

## Rotert 2026-08-28 (økt 43): loggpostene fra økt 41 og 42 (verbatim fra HANDOVER.md)

- 2026-08-26 (økt 41, senere): «planlegg hele Overganger-siden perfekt fram
  til testing — hva hvis, all transfer-tracking, masse kul info, still meg
  masse spørsmål». Handling: 3 spørsmålsrunder (alle valg i planens
  Beslutninger-liste; Marius krevde FT-rekonstruksjon i stedet for rå
  poeng), fasit i `docs/plan-overganger-v150.md`, og hele v1.5.0
  TDD-bygget ferdig på `feat/overganger-v150` (T1–T13, 454/454, lint 0,
  røyktest med tomme nøkler + scenario-syklus mot ekte data). Valget
  «AI-kommentar JA» overstyrer «uten AI-kommentar i v1» i beslutningslista.
- 2026-08-27 (økt 42): «Har du andre kule ideer? Lang liste, spør meg
  hvilke jeg vil ha og hvordan hver skal fungere.» Handling: 21 idéer
  presentert, Marius valgte alle 16 hovedidéer; 4 spørsmålsrunder ga
  fasit for hver — `docs/plan-idepakken-v16-v19.md`, fire versjoner
  v1.6.0–v1.9.0 i ROADMAP. Deretter: «Lag en ny branch på github til
  dette. Et staging miljø eller noe» → `staging` + de tre kodebranchene
  pushet til GitHub (ingen deploy — Coolify bygger kun main). Så: «Skal
  vi begynne å jobbe med det nå?» → planlegg + bygg valgt, kaptein-tak
  10 runder godkjent, v1.6.0 TDD-bygget ferdig på `feat/liga-v160`.
- 2026-08-28 (økt 43, Opus): «briefen kom i går; jeg bytter ikke denne
  uka; alt ferdigbygget skal til `main` nå; slett alle andre brancher,
  også `staging`; kostnadskontrollen tar jeg selv i Anthropic-konsollen
  — dropp måleuka.» Handling: v1.3.8 → v1.4.0 → v1.5.0 → v1.6.0 merget
  `--no-ff` og tagget på `main` (509/509 + lint 0 før og etter),
  CHANGELOG-datoene satt til 2026-08-28, ROADMAP-tabellen og kø-punkt
  1/2/4/5 + dokumentkartet ajour, VIDERE.md skrevet om til v1.6.0,
  de tre planfilene arkivert til `docs/arkiv/`, denne fila rotert og
  oppdatert. Så ÉN push kl. 14:48 (= én Coolify-deploy, live 14:49),
  prod-verifisert utenfra (alt grønt, se statusen), og de fem
  branchene slettet lokalt og på GitHub. «Rundens rapport» for runde 1
  ble generert ved oppstartstikket og vises på /liga med AI-merke;
  Discord-posten er ikke verifisert herfra — Marius sjekker kanalen.

## Rotert 2026-08-31 (økt 45, Opus, bygget v1.7.0)

Prod-beviset for v1.3.8–v1.6.0 (rotert fra HANDOVER-statusen, tatt 28. aug
kl. 14:49 utenfra): footer `v1.6.0 · sist oppdatert fredag 28. august
kl. 14:49`; `/health` 200 med `ai:true, discord:true, teamId:true,
leagues:1`; rutesveip `/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`,
`/nyheter`, `/overganger`, `/api/brief.json`, `/api/live.json` alle 200 og
`/finnesikke` 404; `/liga` hadde Rival-radar, `rival-select`, Kaptein-liga,
Sesongutvikling, `league-graph` og «Rundens rapport» (runde 1, AI-merke);
`/overganger` viste tomtilstanden «Ingen overganger registrert ennå»
(korrekt — 0 bytter); `dataAlder` fantes i både `/api/brief.json` og
`/api/live.json` (56 s ved sjekken). Fire `--no-ff`-merger i rekkefølge
(v138 → v140 → v150 → v160), alle «Merge made by the 'ort' strategy», null
konflikt; tagger `v1.3.8`, `v1.4.0`, `v1.5.0`, `v1.6.0` pushet. 509/509 +
lint 0 både på `feat/liga-v160` før merge og på merget `main`.

De 12 gamle lokale branchene fra økt ≤ 35 (alle merget, ingen på GitHub,
ryddes med `git branch -d <navn>`): `docs/plan-ui-overhaul`,
`feat/ai-swr-v134`, `feat/discord-everyone`, `feat/hva-hvis-transfers`,
`fix/cache-backoff`, `fix/kvalitetspass-v113`, `fix/lag-anbefalinger`,
`fix/live-bonus`, `fix/news-unknown`, `fix/qa-v1.1.1`, `fix/qa-v1.1.2`,
`fix/sanitize-brief`. Slettingen ble blokkert av verktøyets
tillatelsesklassifiserer i økt 43.

Asset-hash-detaljen (rotert fra statusen): hashen var `d508c47f` t.o.m.
v1.3.7; v1.5.0/v1.6.0 endret både `style.css` og `app.js` og ga
`f9014751`. Verdien ble regnet ut på forhånd fra git-blobbene (sha1 av
`style.css` + `app.js`, første 8 tegn) og stemte eksakt med prod. Purge
er unødvendig: URL-ene er versjonerte.

## Rotert 2026-09-01 (økt 48) — v1.7.1-detaljene og loggen fra økt 46

**v1.7.1 «UX-polering» ute i prod 1. sep rett etter midnatt.** Bygget
31. aug (12 godkjente småfiks fra full funksjonsgjennomgang — Marius
valgte «Fiks» på alle 12), merge holdt til etter kampslutt («Kampen er
ferdig» 1. sep): merget `--no-ff` (`1633969`), tagget `v1.7.1`, én push.
**556/556 + lint 0** på branch OG merget main. Innhold: no-store på /api,
«neste tidligst» på /nyheter, grafakser /lag+/liga, statusfilter +
sort-generalisering (`table[data-sortable]`, sortering overlever
live-polling), krysslenker `/spillere?sok=`, forklaringer (flagg, FDR,
xG/xA, lovlig ellever), venter/angret-badges på /overganger. Pakke 8
(liga-lenker) og 11 (aria-live) krevde INGEN endring — fantes alt.
Prod-bevis utenfra 1. sep: footer `v1.7.1`, `/health` 200
`ai:true, discord:true, leagues:1`, alle 9 ruter 200 + `/finnesikke` 404,
`/api/live.json` svarer `Cache-Control: no-store`, alle nye features
spot-sjekket i markupen (30 krysslenker på dashbordet). Røyktest 31. aug
med tomme nøkler: 0 «AI-kall:»-linjer.

Loggposter:

- 2026-09-01 (økt 46, del 2): «Kampen er ferdig». Handling: merget
  `--no-ff`, verifiserte 556/556 + lint 0 og CHANGELOG-rekkefølgen på
  merget main, tagget `v1.7.1`, pushet, prod-bevis utenfra, branch
  slettet, docs ajour.
- 2026-08-31 (økt 46, Fable): «gå gjennom hver eneste funksjon jeg kan
  gjøre på siden … Spørr meg om jeg vil beholde det slik det er eller det
  du tenker kunne fikses.» Handling: tre Explore-agenter kartla alle 9
  sider + tverrgående; 12 forslag i tre AskUserQuestion-puljer — Marius
  valgte «Fiks (Anbefalt)» på ALLE 12. Bygget som v1.7.1 med TDD på
  logikken (noStore, nextSummaryUpdateAt, rankGraph-akser, compareCells/
  rowMatchesFilters/queryParam). Merge holdt tilbake: avspark 21:00.

## Rotert 2026-09-01 (økt 49, planøkt v1.8.1) — loggpost økt 47 + små statusdetaljer

Statusdetaljer komprimert ut av HANDOVER (verbatim-fakta):
- v1.7.1: `1633969`, tag `v1.7.1`, 556/556 + lint 0, prod-bevis utenfra
  grønt. v1.7.0: `a25ac0a`, tag `v1.7.0`, 549/549, ute 31. aug kl. 16:46.
  v1.3.8–v1.6.0: fire `--no-ff`-merger 28. aug kl. 14:49, 509/509.
- Kostnad: siste måling 23. aug var $0,94/uke.
- Git: `origin` har KUN `main`; `feat/spillere-v180` ble slettet lokalt
  etter v1.8.0-mergen (ble aldri pushet).

Loggpost:

- 2026-09-01 (økt 47, Fable, planøkt): mandat = detaljplan v1.8.0, ingen
  kode. Handling: målte FPL-API-et (bootstrap 109 felter, element-summary-
  strukturen), fire AskUserQuestion-runder — Marius valgte anbefalingen i
  alle 11 spørsmål. Underveis: «planen så detaljert at Opus gjennomfører
  like bra», «kjøreprompt i chatten, ikke fil». Plan skrevet, docs ajour,
  loggposter økt 45 rotert til historikkfila (200-linjerstaket).

## Rotert 2026-09-01 (økt 50): v1.8.0-statusblokka og loggpost økt 48

Statusblokk (verbatim fra HANDOVER.md, avsluttet da v1.8.1 ble bygget):

- **v1.8.0 «Spiller-pakka» MERGET TIL MAIN 1. sep (økt 48).** Bygget på
  `feat/spillere-v180` (9 commits, T1–T9, TDD), merget `--no-ff`
  (`ed164c5`), tagget `v1.8.0`, pushet. **602/602 + lint 0 på branch OG
  merget main**, CHANGELOG-rekkefølgen kontrollert. Marius ga klarsignal
  uten egen lokal test — mobil-/tastatur-QA gjenstår derfor (køpunkt 1).
  Innhold: `src/services/players.js` (buildPlayerCard, buildDifferentials,
  buildSetPieceTable, assemblePlayerCard), `GET /api/spiller/:id`,
  `elementSummaryAgeSec` i fplClient, /spillere i tre seksjoner med
  hopplenker, modal-spillerkort, duell og terskelvelger.
  **To dokumenterte avvik fra planen (begge teknisk nødvendige):**
  (1) `buildDifferentials` tok ikke `teamsById` i planens signatur, men
  rad-kontrakten krever `lag: {kort, kode, navn}` — parameteren er lagt til.
  (2) `buildSetPieceTable` returnerer `{id, navn}` per taker, ikke bare
  navn: T6 krever at navnene er knapper som åpner spillerkortet, og en
  knapp trenger id-en. T4-testene ble justert i T6-commiten.
  **Røyktest 1. sep med tomme nøkler** (`ai:false, discord:false`): alle 9
  ruter 200, `/finnesikke` 404, `/api/spiller/411` 200 mot ekte FPL-data,
  `/api/spiller/abc` 400, `/api/spiller/999999` 404, **0 «AI-kall:»-linjer**.
  Payload /spillere: 528 → 911 KB ukomprimert, men **22,6 → 44,4 KB gzip**
  (compression() aktiv) — mer enn planens anslag ukomprimert, uproblematisk
  over nett. Detaljplan arkivert: `docs/arkiv/plan-spillerpakka-v180.md`.

Loggpost:

- 2026-09-01 (økt 48, Opus, utførelse): mandat = bygg v1.8.0 etter planen,
  TDD strengt, stopp etter T9 uten merge/tag/push. Handling: verifiserte
  baseline 556/556 + lint 0 på main, branch `feat/spillere-v180`, T1–T9
  med rød→grønn i hver task, 9 conventional commits, CHANGELOG i hver
  commit, røyktest med tomme nøkler, docs ajour. Sluttstatus 602/602 +
  lint 0. To planavvik dokumentert i statusen over. Stoppet før merge.
  Deretter: «push og merge til main» — merget `--no-ff` (`ed164c5`),
  verifiserte 602/602 + lint 0 og CHANGELOG-rekkefølgen på merget main,
  tagget `v1.8.0`, arkiverte detaljplanen, pushet. Marius testet IKKE
  lokalt først, så prod-QA av modal/duell er lagt inn som køpunkt 1.

Beslutninger rotert samtidig (verbatim, fortsatt gyldige — bare ikke lenger
nødvendige i den daglige HANDOVER-fila):

- Layout: egen liten EJS-layout-helper, IKKE express-ejs-layouts.
- «Overganger»: egen side på `/overganger`, uten AI-kommentar i v1.
- **Måleuka droppet (28. aug):** kostnaden følges løpende av Marius i
  `console.anthropic.com`. Samme dag: ingen bytter i GW2, så P3 venter.
- **v1.7.0 (31. aug):** begge benkekolonner; kapteinstreff på både
  identitet og poeng; flakspoeng + topp/bunn 3; XI-liste + sesongtrend;
  vindu = hele sesongen; nav-plass etter Liga. Fasit i planen
  (`docs/arkiv/plan-innsikt-v170.md`).

## Rotert 2026-09-01 (økt 50, etter v1.8.1-mergen): planavvikene i v1.8.1

Sju tekniske avvik fra `docs/arkiv/plan-spillere-redesign-v181.md` (ingen
designvalg endret) — verbatim fra HANDOVER.md:

1. Zebra + strammere radhøyde scopet til `#players-table`, ikke alle
   `table.data` — skal ikke endre åtte andre sider, QA dekker bare
   /spillere.
2. `#duell` flyttet inn i `#tabell` som planlagt, men som
   `class="duell-panel"` — kort-i-kort ga dobbel flate/kant.
3. Terskel-labelene fikk wrapperen `<div class="terskel-segmenter">` inne i
   fieldsetet — `<legend>` i en flex-fieldset er upålitelig.
4. Modul 12 skjuler også `#player-filters` utenfor Tabell-fanen.
5. `.modal .shirt` er `110px × 145px`, ikke `height: auto` — `.shirt` er en
   span uten egen høyde og ville kollapset (samme forhold som 44/58).
6. Duell-hodene ligger i tabellens `<th>`-celler, ikke i en egen rad over
   den — ellers sto navnet to ganger.
7. Escapingtesten for `playerCardHtml` sjekker nyhetsteksten i stedet for
   `&lt;script&gt;`, siden `fulltNavn` ikke lenger rendres i brødteksten.

## Rotert 2026-09-01 (økt 51): loggpost økt 49 (verbatim fra HANDOVER.md)

- 2026-09-01 (økt 49, Fable, planøkt): mandat = detaljplan for visuell
  redesign av /spillere, ingen kode. Underveis: «Jeg kan sende
  skjermbilde» (STEG 0) — skjermbildet beviste at modalen virker i prod.
  Fire AskUserQuestion-runder — Marius valgte anbefalingen i alle 11
  spørsmål; versjon v1.8.1. Funn: terskelvelger-JS mangler helt (død i
  prod, fikses i T6). Plan skrevet og godkjent, docs ajour, økt 47-loggen
  rotert. Så: «kjøreprompt til opus» → levert i chatten (stopp før merge).
