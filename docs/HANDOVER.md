# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + ROADMAP.md, fortsett der «Neste steg» sier.

**Sist oppdatert:** 2026-08-20 ~14:45 (økt 10 «Overganger» v1.2.0 I PROD; økt 8 sesongstart-verifisering PÅGÅR med sjekkpunkter)

## ØKT 10: «Overganger» — v1.2.0 I PROD (2026-08-20 ~14:40)

**Merget og deployet etter klarsignal fra Marius ~14:33** (godt utenfor
sendevinduet torsdag 19–21). Release v1.2.0 kuttet på branchen, merge
`--no-ff` til main, 212/212 + lint 0 verifisert på main FØR push. Tag
`v1.2.0` pushet etter prod-verifisering.

Verifisert i prod ~14:40 (kommandoer kjørt, output sett): alle 11 ruter 200
inkl. `/overganger`, 404 på ukjent sti, footer `v1.2.0`, nav-punktet
«Overganger» synlig, tomtilstanden «Ingen overganger registrert ennå» vises
(korrekt før sesongstart), `/health` = `ai:true, aiModel:claude-sonnet-5,
discord:true, teamId:true, leagues:1`. style.css/app.js er uendret i denne
releasen → samme asset-hash, ingen Cloudflare-hensyn.

**Merk for økt 8 (sjekkpunkt A i kveld):** prod kjører nå v1.2.0, ikke
v1.1.3. Ingen observert oppførsel er endret (`getLive`, notify, brief,
banner urørt) — eneste synlige forskjell er footer-versjonen og den nye
siden/nav-punktet. Redeployen skjedde ~14:40, timer før sendevinduet;
auto-briefen i kveld påvirkes ikke (scheduler re-armert ved oppstart, send-
tidspunktet er ikke passert).

Kjøreprompt: `docs/neste-okt-prompt-hva-hvis-transfers.md`. Plan skrevet i
plan mode, **godkjent av Marius 2026-08-20**, ligger i
`docs/plan-hva-hvis-transfers.md` (task-for-task med TDD og komplett kode).

Marius' beslutninger (AskUserQuestion i planfasen):
1. Egen side **«Overganger» på `/overganger`** (ikke /bytter, ikke seksjon på /lag)
2. **Uten AI-kommentar i v1** (lagt som idé i ROADMAP)

**Status: FERDIG på branchen (6 commits), IKKE merget, IKKE pushet.**
Venter på klarsignal fra Marius. `npm test` 212/212 grønne (27 nye tester),
`npm run lint` 0. Røyktest lokalt med AI/Discord av: alle 11 ruter 200
(inkl. `/overganger`), 404 OK, tomtilstanden «Ingen overganger registrert
ennå» vises, `/health` ga `ai:false, discord:false, teamId:true`. Rører ikke
oppførsel økt 8 observerer (`getLive` uendret — historikk-TTL er ny funksjon
`getLiveHistoric` med delt cache-nøkkel, kalles kun for ferdige runder).

Det som er bygget: `src/services/transfers.js` (buildTransferAnalysis ren +
assembleTransferAnalysis), `getEntryTransfers`/`getLiveHistoric` i fplClient,
`/overganger`-rute + view + nav-punkt «Overganger», `formatSigned` i
format.js. Full plan med beslutninger og avvik:
`docs/plan-hva-hvis-transfers.md`.

**UHELL under røyktesten (loggført av ærlighet, prod upåvirket):** første
kjøring brukte en scratchpad-.env UTEN nøkler — men `config.js` sin
`process.loadEnvFile()` leser repoets `.env` uansett, så serveren startet
med prod-nøklene: 2 ekte AI-kall skjedde lokalt (news-summary inn=1221/
ut=633 + ai-brief-gw1 inn=715/ut=824, øre-beløp) og Discord-scheduleren ble
armert. INGEN melding ble sendt (send-tidspunktet ~19:30 var timer unna;
prosessen ble drept med én gang). Riktig teknikk (brukt i andre kjøring, og
dokumentert i planfilen): sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=`
som TOMME i scratchpad-.env — `--env-file` vinner over `loadEnvFile`.
NB for økt 8s kostnadskontroll: de 2 kallene vises i Anthropic-forbruket,
men IKKE i Coolify-loggen (de kjørte lokalt).

Gjenstår etter merge: «Etter GW2»-sjekklisten i planfilen (verifiser
transfers-skjemaets feltnavn mot ekte data, se siden med ekte data, mobil).

## ØKT 9: kvalitetspass v1.1.3 — I PROD (2026-08-20 ~03:00)

Branch `fix/kvalitetspass-v113` merget til `main` med `--no-ff` og pushet
2026-08-20 ~03:00 (godt utenfor sendevinduet 19:00–21:00; ingen auto-brief
sendt ennå i dag, så P1-5-dublettrisikoen var ikke i spill).
`npm test` 185/185 grønne, `npm run lint` 0.
Kjøreprompt: `docs/neste-okt-prompt-kvalitetspass.md` (29 verifiserte funn).

**Merk for sesongstart-verifiseringen:** sjekkpunkt A–D observerer nå v1.1.3,
ikke v1.1.2. Endret oppførsel som er verdt å se etter: live-siden poller
etter en tilstandsmaskin (starter/stopper med kampene, våkner ved avspark),
`/api/live.json` har fått `nextKickoff` og mistet `pos`/`multiplier`/
`updatedAt`, skadenytt i briefen og Discord-meldingen er norsk, og AI-kall
har 5 min backoff etter en feil.

Rettet (funn-ID i commitmeldingene):

| Funn | Rettelse |
| --- | --- |
| P0-1 | `resolvePicks()` — ukjent pick-element velter ikke /live, /lag, /brief, /api |
| P0-2 | `chunkDiscordText()` — ingen tomme eller >2000-tegns Discord-meldinger |
| P0-3 | `getFixtures(gw)` 1 min TTL; `nextKickoff` i payloaden; klienten er en tilstandsmaskin som våkner ved avspark |
| P0-4 | Ugyldig `pubDate` dropper ikke hele RSS-feeden |
| P1-5/6 | `MAX_LATE_MS` 60 → 15 min + logg; `sending`-flagg mot dobbelpost |
| P1-7 | `/api/*`-feil svarer JSON |
| P1-8 | AI-backoff 5 min etter feil/tomt svar |
| P1-9 | `/health` venter aldri på FPL (`knownLeagueCount`) |
| P1-10 | `?v=` gir immutable kun ved identitet med `assetVersion`/`FONT_VERSION` |
| P1-11 | Status `d` uten prosent → 0,75 spilletid |
| P1-12 | Skadenytt oversettes i briefkilden (view + Discord + AI-prompt) |
| P1-13 | Oversettelsesdrift varsles også i prod, dedupet per prosess |
| P1-14 | Bonusestimat per pågående kamp, summert — riktig i dobbel runde |
| P2-1 | `assembleBrief`/`assembleLive` → services; ny `live.js`; `generateAiBrief()` deles av /brief og auto-briefen |
| P2-2 | `STATUS_LABELS`, `resolvedGw`, `byId`, `formatDay`/`formatTime`, delt `escapeHtml` |
| P2-3 | `teamFdrMap()` — ett oppslag per lag i stedet for full skann per kandidat |
| P2-4 | Brief etter sesongslutt viser avsluttet tilstand, ikke runde 1-data |
| P3-6 | CLAUDE.md: `max_tokens` 2000/4000 med begrunnelse; arkitekturkart oppdatert |

Ikke gjort (ligger i ROADMAP under «v1.2.0-kandidater»): P1-5b persistent
«brief sendt»-markør, og P3-1…P3-5 (`gameUpdating`-livssyklus, SWR-backoff i
cache.js, SWR i ai.js, `sanitizeBriefText`-robusthet, `filterSummaryPoints`).
P3-3 og P3-5 krever avklaring med Marius før de røres.

Verifisert lokalt (kommandoer kjørt, output sett): 185/185 tester, lint 0, og
røyktest mot lokal server på port 3010 med **AI og Discord slått av** (egen
`.env` i scratchpad — prod-nøklene i repoets `.env` ble ikke brukt, ingen
AI-kall, ingen webhook-post, scheduleren startet ikke). Alle ti ruter 200,
ukjent sti 404. `/api/brief.json` matcher nullpunkt-fasiten fra sjekkpunkt 0:
«Runde 1», deadline «fredag 21. august kl. 19:30», `injuries: []`,
`fixturesBeforeDeadline: []`, 3 kapteiner, 4 kampdager.
`Cache-Control` verifisert: riktig hash og `?v=1` → `immutable`, `?v=deadbeef`
og uversjonert → `no-cache`.

**Merget, deployet og verifisert i prod** etter klarsignal fra Marius
2026-08-20 ~02:55. Tidspunktet var trygt: sendevinduet 19:00–21:00 torsdag var
langt unna, og dagens auto-brief hadde ikke gått ennå, så redeployen kunne ikke
re-poste noe. Push 02:59, deployen ute 02:59:38 (30 s). Tag `v1.1.3` pushet.

Verifisert i prod (kommandoer kjørt ~03:02, output sett):

- Alle ti ruter 200, ukjent sti 404
- Footer `v1.1.3` på alle sju HTML-sidene
- `/health`: `ai:true, aiModel:claude-sonnet-5, discord:true, teamId:true, leagues:1`
- Ny asset-hash `2ba078b0` matcher sha1 av `public/style.css` + `public/app.js`
  slik de ligger i git (LF) — servert innhold er altså det som ble pushet.
  `?v=2ba078b0` → `immutable`; `?v=deadbeef` får det ikke lenger (P1-10 virker)
- `/api/live.json` har `nextKickoff` og har mistet `pos`/`multiplier`/`updatedAt`
- `/api/brief.json` matcher nullpunkt-fasiten fra sjekkpunkt 0: «Runde 1»,
  deadline «fredag 21. august kl. 19:30», `injuries: []`,
  `fixturesBeforeDeadline: []`, kapteiner Raya/Gabriel/Calafiori (ARS), 4 kampdager
- Ingen Cloudflare-purge nødvendig (ny asset-URL kommer automatisk)

Åpen observasjon (ikke en regresjon fra v1.1.3): Cloudflare svarer
`Cache-Control: max-age=14400` med `cf-cache-status: REVALIDATED` på
uversjonerte assets, altså sonens Browser Cache TTL som overstyrer originens
`no-cache`. Originen er verifisert riktig lokalt. Lav konsekvens siden alle
assets refereres versjonert fra HTML-en, men verdt å vite ved framtidig
feilsøking av «gammel CSS».

## AKTIV ØKT (8): sesongstart-verifisering (M4) — sjekkpunkter

Kjøreprompten (`docs/neste-okt-prompt-sesongstart.md`) ble sendt natt til
torsdag 01:37. Plan godkjent i plan mode:
`C:\Users\mariu\.claude\plans\oppdrag-verifiser-sesongstarten-wise-puffin.md`.
**Kjøremodus (Marius' valg): Marius pinger økten ved hvert sjekkpunkt.**
Dør økten: ny økt leser planfilen + denne seksjonen og fortsetter.

| Sjekkpunkt | Når | Hva |
| --- | --- | --- |
| 0 (FERDIG) | torsdag natt | prep: Playwright-scripts i scratchpad, docs, denne tabellen. Nullpunkt-snapshot (01:55, desktop+390 px): /spillere /lag /liga /live alle 200, null konsollfeil, null vannrett scroll, tomtilstander bekreftet på /lag+/liga. Data-brief-fasit hentet (scratchpad `brief-foer-deadline.json`): `gameweek.name="Runde 1"`, deadline «fredag 21. august kl. 19:30», `fixturesBeforeDeadline=[]`, `injuries=[]`, kapteiner Raya/Gabriel/Calafiori (ARS), første kamp Arsenal–Coventry fre 21:00 |
| A | torsdag ~19:45 | etterkontroll auto-brief: Marius limer inn Discord-melding + Coolify-logg; sammenlign mot `/api/brief.json` |
| B | fredag ~20:30+ | tomtilstand → ekte data alle sider; **Marius klikker «Spør AI om råd» ÉN gang** (budsjettkall 1) |
| C | lørdag under kampene | live-polling ≤1 kall/60 s, stopp ved `anyLive=false`, cache-bevis; re-sjekk kampavhengige B-punkter |
| D | søndag/mandag | kostnadskontroll (Marius limer inn `AI-kall:`-linjer), skjermbilder, mobilsjekk, v1.2.0-kandidater, avslutning |

**AI-kall-telleliste (budsjett ~3 utover automatiske sidebesøk):**

- Budsjettkall brukt: **0 av ~3**
- Automatiske (sidebesøk/auto-brief): auto-brief torsdag ~19:30 (forventet),
  /brief- og /nyheter-genereringer ved sidebesøk (cachet 1 t / 30 min)

Viktig nyanse for sjekkpunkt B: `transfers_*_event` kan legitimt være 0 hele
GW1 — tomtilstand på «Mest kjøpt/solgt» er da KORREKT. Verifiser mot
bootstrap-tall, ikke rapporter som feil. `topForm` krever spilte minutter.

## v1.1.2 ER I PROD (2026-08-20 ~01:30)

Marius kjørte visuell QA av v1.1.1 i prod (1440/390 px) og ga en retteordre.
Branch `fix/qa-v1.1.2` (7 commits) merget til `main` med `--no-ff`, pushet
01:27, deployen ute 01:28. Tag `v1.1.2` pushet etter prod-verifisering.

Verifisert i prod (kommandoer kjørt ~01:30, output sett): alle ti ruter 200,
404 OK, footer `v1.1.2` på alle sju sider, ny asset-hash `ead67020` matcher
servert innhold, `immutable`-header OK, `/health` `ai:true, discord:true,
teamId:true, leagues:1`, og oversettelsene er synlige i prod-HTML
(«Dashbord», «Runde 1», «Uspesifisert skade», «på lån ut sesongen»,
480 × «Klar», «P/K», «Rundebrief»). Cloudflare-purge trengtes ikke
(assets får ny URL automatisk).

- **P1-1** mørk scrollbar i `.table-scroll` (Firefox + WebKit, CSS-variabler)
- **P1-2** mobilmenyens kantfade vises nå kun på siden med uscrollet innhold
  (app.js togglar klasser), scroll-snap på lenkene, aktiv lenke scrolles inn
- **P2** engelsk UI-tekst oversatt: Dashbord, Totalrangering, Runde/Rundebrief
  (ny `formatEventName` i format.js), P/K med tooltip, «Klar», «dashbordet».
  **Avvik fra retteordren: DEADLINE beholdt** (ikke FRIST) — konsekvent
  overalt; Marius bruker ordet selv, og `sanitizeBriefText` matcher på det.
  Merkenavnet «FPL-dashboard» (wordmark + tittel-suffiks) er også beholdt.
- **P3** oversettelsen dekker alle 72 unike `news`-strenger i bootstrap-static
  (verifisert mot ekte data); `console.warn` i dev ved nye mønstre
- **P4** brief-prompten krever norske fotballuttrykk («holdt nullen», «runde»)

Verifisert lokalt: `npm test` 118/118, lint 0, Playwright (scratchpad) 38/38
grønne på 390 + 1440 px — ingen vannrett scroll på noen side, sticky
tabellhode 80/50 og 86/57 px (matcher QA-målene), fade-logikken og footer
v1.1.2 bekreftet. AI/Discord var slått AV under lokal verifisering (tomme
env-nøkler) — ingen AI-kall, ingen webhook-post.

## v1.1.1 ER I PROD (2026-08-20 ~00:45)

Branch `fix/qa-v1.1.1` merget til `main` med `--no-ff` og pushet 00:36.
Coolify-deployen var ute 00:37 (forsiden viste `v1.1.1`). Marius kjørte
Cloudflare «Purge Everything» på sonen `marsk.no` via Claude in Chrome og
bekreftet kvitteringen + at Matchday-temaet vises. Tag `v1.1.1` er pushet.

### Verifisert i prod (kommandoer kjørt 2026-08-20 ~00:45, output sett)

- Alle ti ruter 200, ukjent sti 404
- `/health`: `ai:true, aiModel:claude-sonnet-5, discord:true, teamId:true, leagues:1`
- Footeren viser `v1.1.1` på alle sju HTML-sidene
- `?v=d5196f5e` i prod-HTML matcher sha1 av servert style.css+app.js
  (felles hash for begge filer — by design, `src/server.js`)
- Versjonerte assets: `Cache-Control: public, max-age=31536000, immutable`,
  `cf-cache-status: HIT`
- Uversjonerte assets: `cf-cache-status: MISS` → `REVALIDATED` (aldri `HIT`)
  — purgen tok, edge revaliderer mot origin hver gang
- **Kjent avvik (ufarlig):** Cloudflare skriver om origins `no-cache` til
  `Cache-Control: max-age=14400` på uversjonerte assets (trolig
  «Browser Cache TTL»-innstillingen i Cloudflare, 4 timer). Ingen HTML
  refererer de uversjonerte URL-ene lenger, og edge revaliderer alltid, så
  effekten er ~null. Valgfritt: sett Browser Cache TTL til «Respect Existing
  Headers» i Cloudflare. IKKE endret noe — venter på Marius.

### Hva som er gjort

Alle QA-funn utenom P2-7 er rettet, én commit per funn med funn-ID i
emnelinjen. Se CHANGELOG `[1.1.1]` for brukersynlig liste. Kort:

- **P0-1** asset-versjonering med innholdshash i `src/server.js`
  (`?v=<sha1 8 hex>`), `immutable` for versjonerte URL-er og `no-cache` for
  uversjonerte. Ny `DEPLOY.md` med flyten og Cloudflare-purge-steget.
- **P0-2** `.table-scroll` har bare `overflow-x` nå; kun /spillere bruker
  `.table-scroll--pinned` som festes under `--topbar-h` (50/57 px).
- **P1-1…P1-7** tomtilstander på dashbord og /liga, `/health` teller oppløste
  ligaer via nye `src/services/leagues.js`, AI-briefens tidsfakta +
  `sanitizeBriefText`, nyhetspunkter filtreres mot egennavn i sakene,
  RSS-dedup, `--dim-strong` for tabellhoder.
- **P2-1…P2-6 + P2-8** FDR-4-farge, `translateFplNews`, ordbrudd, FDR på
  mobil, statstripe og undertittel på /lag, 2 × 2-grid på dashbordet.

### Verifisert lokalt (kommandoer kjørt, output sett)

- `npm test` 113/113 grønne, `npm run lint` 0 feil
- Lokal server: alle 10 ruter 200, 404 på ukjent sti, `/health`
  `leagues: 1` (auto-oppdaget — `LEAGUE_IDS` er ikke satt)
- Asset-headere: `?v=<hash>` → `public, max-age=31536000, immutable`,
  uten `?v=` → `no-cache`
- Kontrastskript: 8 av 8 fargepar over 4,5:1
- Playwright (kun i scratchpad, aldri i repoet) på 390×844, 360×740,
  844×390, 1440×900: 103 sjekker uten feil — ingen vannrett scroll, topbar
  én linje, ai-badge 18,4 px på én linje, 4 av 5 GW-kolonner synlige på 390,
  fokusring, null konsollfeil. Sticky: 264 festede tabellhoder observert,
  0 under menyen. /spillere: 11 kolonner × 2 retninger sorterer riktig,
  kombinerte filtre og nullstill virker.

### Fortsatt IKKE verifisert (neste steg)

- **«Spør AI om råd»-stien på /lag** — ikke rørt, rendres ikke før
  sesongstart. Testes i en planlagt økt (koster penger per klikk).
- **Auto-briefen til Discord i kveld** — postes ~19:30 torsdag 20. august
  (24 t før GW1-deadline fredag 21. august 19:30). v1.1.1-koden med tidsfakta
  og `sanitizeBriefText` er i prod i god tid. Marius sjekker Discord ~19:30.
- **sanitizeBriefText mot en fersk AI-brief** — den første versjonen fjernet
  to korrekte setninger i en ekte kjøring. Retting og regresjonstester er på
  plass, men ikke kjørt mot en ny ekte generering. Kveldens auto-brief er
  første ekte test.
- **filterSummaryPoints mot ekte nyhetspunkter** — samme mønster: tester
  grønne, ikke verifisert mot en fersk AI-generering i prod.
- **Sesongstart-verifisering (M4)** — tomtilstander → ekte data etter
  GW1-deadline fredag 21. august 19:30. Kjøreprompt:
  `docs/neste-okt-prompt-sesongstart.md`.
- **Mobilvisning på ekte telefon + skjermbilder til README (M5)**
- P2-7 (til info): ligaen heter «Var Har Skylda» fordi FPL-API-et leverer
  den slik (verifisert mot `entry/5330646/`). Ingen kodefeil — endres i
  FPL-UI-et hvis ønskelig; Marius er admin for liga-id 1397750.

### Logg over beskjeder fra bruker

- 2026-08-19: kjøreprompt for QA-retteøkten gitt (plan som fasit, branch
  `fix/qa-v1.1.1`, ingen push/deploy). Handling: utført i denne økten.
- 2026-08-20: «fortsett der det kuttet» / «keep going where you left off»
  (to ganger under økten). Handling: arbeidet fortsatte uavbrutt fra
  P1-7-målingen; ingenting gikk tapt.
- 2026-08-20 (økt 7): kjøreprompt for deploy av v1.1.1 gitt
  (`docs/neste-okt-prompt-deploy-v111.md`). Handling: Fase 1–4 utført —
  merge, test/lint grønt, push, deploy bekreftet, Cloudflare-prompt levert,
  prod verifisert etter purge-bekreftelse, tag pushet, docs oppdatert.
- 2026-08-20 (økt 7): «Jeg vet ikke hvilken prompt … kanskje samme prompt
  idk» (fila `docs/neste-okt-prompt-deploy-v111.md` åpnet i IDE-en midt i
  økten). Handling: bekreftet at det var samme prompt som økten allerede
  kjørte — ingen handling nødvendig.
- 2026-08-20 (økt 7): «Purgen er gjennomført … Purge request successfully
  received» + bekreftet Matchday-tema (mørkt, grønn/magenta) på
  fpl.marsk.no. Handling: Fase 3-verifiseringen kjørt, deretter Fase 4.
- 2026-08-20 (økt 7): retteordre fra visuell QA av v1.1.1 limt inn
  («QA-fiks for fpl.marsk.no (v1.1.1)», P1-1…P4) + «Hva gjør jeg nå?».
  Handling: alle funn rettet på `fix/qa-v1.1.2`, verifisert lokalt.
- 2026-08-20 (økt 7): «push. Deretter lag en veldig god handover med prompt
  til en ny sesjon om hva som skal bli gjort». Handling: merge + push +
  prod-verifisering + tag `v1.1.2` pushet; denne handoveren oppdatert og
  `docs/neste-okt-prompt-sesongstart.md` skrevet.

## Status

- **NESTE ØKT GJØR DETTE:** sesongstart-verifisering (M4). GW1-deadline er
  fredag 21. august 19:30; etter den bytter sidene fra tomtilstand til ekte
  data. Marius bestiller en detaljert verifiseringsplan fra Fable med
  prompten levert i økt 7 (se chat-loggen). QA-retteplanen for v1.1.1 er
  FERDIG og i prod (se toppen av denne filen).

- **AKTIV implementeringsplan: `docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`**
  — Del A (M1: AI + Discord i drift, v1.0.1), M2 (view-render-tester),
  Del B (M3: UI-makeover «Matchday», v1.1.0), M4 (sesongstart-verifisering
  21.–24. aug), M5 (skjermbilder/avslutning). Kjøreprompt for utførelsesøkten:
  `docs/neste-okt-prompt-utforelse.md`. Utførelse startet 2026-08-19 (økt 4,
  Opus 5 / effort xhigh). Avkryssing i planfilen (per steg) + ROADMAP (per milepæl).
- **Fullført implementeringsplan: `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`**
  — ferdigspesifiserte oppgaver med komplett kode for v0.2.0 → v1.0.0, alt avhuket.
  Inneholder avviksnotater som fortsatt gjelder (grep «Avvik»).
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
- **v0.5.0 FERDIG og tagget**: `/brief` og `GET /api/brief.json` bygget på
  `src/services/brief.js` (ren data, ingen LLM). Verifisert mot ekte FPL-data:
  GW1, deadline «fredag 21. august kl. 19:30», skadeliste, tre kapteinsforslag
  og kampprogram gruppert per dag. 26/26 tester grønne.
- **v0.6.0 FERDIG og tagget**: `/live` + `GET /api/live.json` med live-poeng,
  bonusestimat fra BPS (`estimateBonus`, 4 tester), kaptein- og benkvekting,
  kampstillinger og miniliga-topp. Frontend poller kun mens kamper pågår og
  stopper når runden er ferdig. 30/30 tester grønne.
  Merk: JSON-en som legges inn i `views/live.ejs` escaper `<` fordi lagnavn
  kommer fra andre FPL-brukere — ikke fjern den escapingen.
- **v0.7.0 FERDIG og tagget**: `/nyheter` med RSS (BBC + Sky som default,
  `NEWS_FEEDS` overstyrer, cachet 15 min) og valgfri AI-oppsummering via ny
  `ai.js`. Nyhetspanel på dashboardet. Nye avhengigheter: `@anthropic-ai/sdk`
  og `fast-xml-parser` — de to eneste planen tillater. 33/33 tester grønne.
- **v0.8.0 FERDIG og tagget**: AI-brief øverst på `/brief` (maks én generering
  per time per gameweek, data-briefen alltid under som fallback) og
  «Spør AI om råd»-knapp på `/lag` mot `POST /api/ai-rad` (cachet én time per
  lag og gameweek). Promptbyggere i `prompts.js` med tester — 35/35 grønne.
  All AI-tekst escapes før `**fet**` blir `<strong>`.
- **v0.9.0 FERDIG og tagget**: `notify.js` poster briefen til Discord X timer
  før deadline (`BRIEF_HOURS_BEFORE_DEADLINE`, default 24), med AI-briefen når
  nøkkel finnes og data-briefen ellers. Verifisert mot lokal mock-webhook.
  Uten `DISCORD_WEBHOOK_URL` er scheduleren inaktiv og serveren upåvirket.
- **v1.0.0 FERDIG og tagget**: polish. Mobil-media-query under 480 px (topbar
  ikke lenger sticky, strammere marger, ordbryting), tomtilstand på nyhetssiden,
  README-tabellen komplett. Verifisert: 35/35 tester, lint 0, alle ti ruter 200
  lokalt + 404 på ukjent sti, feilsiden vises når FPL-API-et er nede (simulert),
  `docker build` og container-health OK.
- **Prod verifisert på v1.0.0** (2026-08-19): footeren viser `v1.0.0 · sist
  oppdatert …`, og alle ti ruter svarer 200 på https://fpl.marsk.no
  (`/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`, `/nyheter`, `/health`,
  `/api/brief.json`, `/api/live.json`).
- **Åpne oppgaver som krever bruker (ikke feil i koden):**
  1. ~~`ANTHROPIC_API_KEY` i Coolify~~ — **GJORT** (2026-08-19, `/health`
     viser `ai:true`)
  2. ~~`DISCORD_WEBHOOK_URL` i Coolify~~ — **GJORT** (2026-08-19, `/health`
     viser `discord:true`)
  3. Bekreft mobilvisningen på ekte telefon
  4. Skjermbilder til README (krever nettleser)
- **AI-status:** all AI er av i prod fram til `ANTHROPIC_API_KEY` settes i
  Coolify. Uten nøkkel viser `/nyheter` rå feed-liste, og dashboardpanelet
  er skjult — det er tilsiktet, ikke en feil. `AI_MODEL` er `claude-sonnet-5`
  som standard (`claude-haiku-4-5` er billig-alternativet).
  Merk: `ai.js` sender bevisst ikke `thinking`/`output_config.effort`, fordi
  `effort` gir feil på Haiku 4.5. `max_tokens` er satt romslig fordi adaptiv
  tenkning på Sonnet 5 trekker fra samme budsjett.
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

## v1.1.0 er i prod (2026-08-19 22:23)

Footeren viser `v1.1.0`, alle ti ruter svarer 200, `npm test` 71/71 grønne og
`npm run lint` 0 feil. Milepæl 2 og hele Milepæl 3 (Task 3.1–3.11) er ferdige.

**Det som gjenstår før planen er lukket:**
1. **QA-rundene 1–5 hos brukeren** (Task 3.12 steg 1) — ikke gjennomført ennå.
   Rapportformat `SIDE · ENHET · FUNN`. Funn blir fix-commits + v1.1.x.
2. **Task 1.6** — den naturlige auto-briefen **torsdag 20. august ~19:30**.
   Forventet: én melding i Discord, og ved senere deploy samme kveld
   logglinja `Auto-brief hoppet over for Gameweek 1: send-tidspunktet er
   passert` UTEN ny melding.
3. **Task 1.7** — kostnadskontroll etter 2–3 dager (`AI-kall:`-linjer i
   Coolify-loggen). Tiltak ved over ~$4/uke: `AI_MODEL=claude-haiku-4-5`.
4. **Milepæl 4** — sesongstart-verifisering, kalenderstyrt 21.–24. august.
5. **Milepæl 5** — skjermbilder til README (krever nettleser hos brukeren).

## Neste steg (i rekkefølge)

Følg den aktive planen
`docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`
task for task. Kort oversikt:

1. **M1 (v1.0.1) — tidskritisk, må i prod før onsdag 20. aug ~19:00:**
   anti-spam-guard i `notify.js` (Task 1.1, TDD), usage-logging i `ai.js`
   (1.2), lokal pre-flight med ekte nøkkel (1.3), tvungen Discord-test (1.4),
   env-variabler i Coolify + release v1.0.1 (1.5), naturlig auto-brief
   onsdag ~19:30 (1.6), kostnadskontroll (1.7).
2. **M2:** view-render-tester for alle 11 views (`test/views.test.js`).
3. **M3 (v1.1.0):** UI-makeover «Matchday» — én side per commit med QA-runde
   hos bruker mellom hver.
4. **M4:** sesongstart-verifisering, kalenderstyrt 21.–24. aug.
5. **M5:** skjermbilder til README + mobilbekreftelse (bruker).

## Logg over brukerbeskjeder (alle økter — føres løpende)

- 2026-08-20 (økt 10): kjøreprompt for «historisk hva hvis-analyse av egne
  transfers» sendt (`docs/neste-okt-prompt-hva-hvis-transfers.md`), plan mode.
  Handling: kodebase kartlagt, plan skrevet og validert, to spørsmål stilt.
- 2026-08-20 (økt 10): svar på AskUserQuestion — «Egen side "Overganger"»
  (URL /overganger) og «Uten AI i v1». Handling: valgene låst inn i planen.
- 2026-08-20 (økt 10): planen godkjent i plan mode + «keep going where you
  left off». Handling: utførelse startet på branch `feat/hva-hvis-transfers`;
  alle 6 tasks fullført samme dag (212/212 tester, lint 0, røyktest OK).
  Uhell underveis: 2 ekte AI-kall i første røyktestkjøring pga.
  `loadEnvFile()` — se ØKT 10-seksjonen.
- 2026-08-20 (økt 10, ~14:33): «Jeg er klar for å merge» + spørsmål om hva
  «skjemaverifisering etter GW2» betyr. Handling: forklart (feltnavnene i
  transfers-endepunktet er uverifiserte til første ekte overgang finnes);
  release v1.2.0 kuttet, merget `--no-ff`, pushet, prod verifisert ~14:40,
  tag `v1.2.0` pushet.
- 2026-08-20 (økt 10, ~14:40): «Hvor mye av planen er gjennomført?»
  Handling: statusrapport gitt — alle 6 tasks (36/36 steg) ferdige; kun
  «Etter GW2»-sjekklisten gjenstår (krever ekte data).
- 2026-08-20 (økt 9): kjøreprompt for kvalitetspasset v1.1.3 sendt
  (`docs/neste-okt-prompt-kvalitetspass.md`, 29 verifiserte funn P0–P3).
  Handling: alle P0-, P1- og P2-funn rettet med tester på branchen
  `fix/kvalitetspass-v113`, P3 dokumentert/lagt i ROADMAP. Ikke pushet.
- 2026-08-20 (økt 9, midt i arbeidet): «Hvordan er status på gjennomføringen?»
  Handling: statusoversikt gitt i økten (ferdige funn, gjenstående), arbeidet
  fortsatte uten omprioritering.
- 2026-08-20 (økt 9, ~02:55): «Okay du kan pushe til main». Handling: versjonen
  kuttet som v1.1.3 (package.json, CHANGELOG, ROADMAP), branchen merget med
  `--no-ff` og pushet. Coolify auto-deployer. Prod verifisert 03:02, tag
  `v1.1.3` pushet.
- 2026-08-20 (økt 9, ~03:10): ba om en kjøreprompt til Fable for «historisk
  hva hvis-analyse av egne transfers» — plan først, deretter implementering,
  med alle reglene inkludert dokumentoppdateringene. Handling: skrevet til
  `docs/neste-okt-prompt-hva-hvis-transfers.md`. Datagrunnlaget verifisert mot
  FPL-API-et først: `entry/{id}/transfers/` finnes men er tom (FPL nullstiller
  ved sesongskifte), `entry/{id}/history/` har `current: []`, og
  `element-summary/{id}/history` er tom før sesongstart — funksjonen har altså
  ingen data før GW2, og tomtilstanden er hovedtilstanden de første ukene.

- 2026-08-20 (økt 8, 01:37): kjøreprompt for sesongstart-verifiseringen sendt
  (`docs/neste-okt-prompt-sesongstart.md`-innholdet). Handling: plan skrevet
  og godkjent, sjekkpunkt 0 (prep) utført.
- 2026-08-20 (økt 8): valg av kjøremodus — «Du pinger meg»: Marius melder seg
  i økten ved hvert sjekkpunkt (A i kveld ~19:45, B fredag ~20:30, C lørdag,
  D søndag/mandag). Handling: sjekkpunktplan lagt inn øverst i denne filen.
- 2026-08-20 (økt 8, ~01:45): skjermbilde av Discord-melding «sendt rundt
  kl 22» + spørsmål om hva han ser etter i loggene. Handling: avklart at
  meldingen var onsdagens tvungne røyk-test (Task 1.4, 45,5 t før deadline =
  onsdag 22:00, gammel ordbruk fra før v1.1.2 — forventet). Ekte auto-brief
  kommer torsdag ~19:30. Logglinje-fasit gitt.
- 2026-08-20 (økt 8, ~01:50): skjermbilde av Coolify-loggen: `Auto-brief
  aktiv: sender 24 t før deadline` + `FPL-dashboard lytter på
  http://localhost:3000`. Handling: bekreftet korrekt tilstand — scheduler
  armert, venter på ~19:30.
- 2026-08-20 (økt 8, ~02:00): «Er det noe annet vi kan jobbe med i
  mellomtiden?» → valg «Kvalitetspass». Handling: branch
  `fix/kvalitetspass-v113` opprettet, `test/fplClient.test.js` lagt til
  (124/124 grønne), full kodegjennomgang kjørt (8 review-vinkler, /code-review
  high) og alle funn verifisert mot koden — 29 funn rapportert.
- 2026-08-20 (økt 8, ~02:30): «Lag alle funnene dine om til en veldig
  detaljert prompt … til en ny ai agent med opus 5» + «Så venter vi med steg
  A og B greiene». Handling: `docs/neste-okt-prompt-kvalitetspass.md` skrevet
  (P0–P3 med fix-design og testkrav per funn). Sjekkpunkt A–D står uendret og
  venter på ping. VIKTIG for kvalitetspass-agenten: aldri push uten Marius'
  klarsignal, aldri deploy i sendevinduet torsdag 19:00–21:00.

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
- 2026-08-19 (økt 2): «Lag en prompt jeg kan gi til fable for å planlegge. Han
  skal fullføre alt som er påbegynt og hjelpe meg. La han planlegge lenge» +
  «Husk å legg til alt av relevant informasjon» + «Så han finner kontekst og
  planer og sånt» + «Han skal også gjøre en full UI makeover slik at alt ser
  ekstremt bra ut» + «Det skal se clean ut» + «Og alle funksjoner skal være
  kodet ferdig» → skrevet `docs/neste-okt-prompt.md`: full kontekst
  (dokumentkart, arkitektur, alle sider, design-tokens, FPL-API, miljøfeller),
  del A = fullføre og verifisere alt påbegynt, del B = full UI-makeover med
  «clean» som uttalt mål. Prompten ber om planlegging først, ikke koding.
- 2026-08-19 (økt 2): «Neste gang du pusher kan du legge til versjon og siste
  update nederst på siden + oppdatere den hver gang det pushes» → footeren viser
  nå `v<versjon> · sist oppdatert <tidspunkt>`. Versjonen leses fra
  `package.json` ved oppstart, og tidspunktet er serverens oppstartstid — som i
  praksis er deploy-tidspunktet, siden Coolify starter ny container per push.
  Ingen manuell oppdatering trengs; husk bare å bumpe `version` i `package.json`
  ved hver release, slik release-rutinen allerede sier.
- 2026-08-19 (økt 2): «Hvordan planlegger du å bruke AI og sånt på brief? Blir
  det via API? Si ifra hvis du trenger noe» → svart: Anthropic API via
  `@anthropic-ai/sdk`, først i v0.8.0. v0.5.0-briefen er ren data uten LLM og
  er alltid fallback. Trenger fra bruker: `ANTHROPIC_API_KEY` i Coolify (før
  v0.7.0/v0.8.0 gir effekt) og evt. `DISCORD_WEBHOOK_URL` (v0.9.0).
- 2026-08-19 (økt 2): «Okay. forsett videre» → kjørte videre på v0.5.0 uten stopp.
- 2026-08-19 (økt 2): «Hvor finner jeg to do listen?» → svart: `ROADMAP.md`
  (milepæler) og `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`
  (steg per oppgave), begge i VS Code med Ctrl+Shift+V. Begge hukes av fortløpende.
- 2026-08-19 (økt 2): «Les og følg `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` — den inneholder ALT. Ikke avvik fra planen, ikke bruk subagenter til implementering (model: sonnet hvis unntaksvis nødvendig). Commit plan-filen først, fortell hvor todo-listen er, begynn på første uavkryssede oppgave.» → plan committet (`chore: legg til implementeringsplan v0.2.0-v1.0.0`), arbeid startet på Task 2.1
- 2026-08-19 (økt 3, planlegging): avklaringer gitt til planleggingsøkten —
  **Anthropic API-nøkkel er klar nå** · **Discord-server/kanal er klar**
  (webhook lages når planen sier fra) · **én lokal fontfil er OK**
  (selvhostet, ingen CDN) · **rekkefølge: AI/Discord først**, deretter UI,
  deretter sesongverifisering · **planen skal kjøres i Opus 5 med effort xhigh**.
  → Alt er tatt inn i «Kontekst»-seksjonen i planfilen
  `docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`.
  Planleggingsøkten ble stoppet før commit; utførelsesøkten committet planfilen
  og kjørepromptet (`chore: implementeringsplan og kjoreprompt v1.0.1-v1.1.0`).
- 2026-08-19 (økt 4, utførelse): «Utfør HELE implementeringsplanen — i
  rekkefølge, task for task, uten å hoppe over verifiseringssteg. Ikke
  re-planlegg, ikke bruk subagenter til implementering.» → executing-plans
  startet. Utgangspunkt verifisert grønt: `npm test` 35/35, `npm run lint` 0 feil.
- 2026-08-19 (økt 4): «Jeg ønsker at du skal begynne å kalle meg Jens … alltid si
  "Hei Jens!" først. Lag et permanent minne på det.» → deretter «Hvorfor tror du
  jeg heter jens?» og valget **«Bytt til Marius»**. Resultat: minnet heter nå
  `memory/tiltale-marius.md` (indeksert i `MEMORY.md`, `tiltale-jens.md`
  slettet). **Alle svar starter med «Hei Marius!».**
- 2026-08-19 (økt 4): «Da har jeg laget en .env fil som har antrhopic api koden
  min» → Task 1.3 pre-flight kjørt mot ekte API, alt grønt (se under).
- 2026-08-19 (økt 4): «Jeg vet ikke hvordan jeg finner fpl lag iden» → svart med
  to metoder: `/entry/<id>/event/1` i URL-en på Points-fanen, eller
  `https://fantasy.premierleague.com/api/me/` innlogget (`"entry": <id>`).
- 2026-08-19 (økt 4): «Der fant jeg fpl team iden og la det inn i .env filen»
  → `FPL_TEAM_ID=5330646` (lagnavn «Marius Super Team»). Alle ti ruter svarer
  200 lokalt med ekte ID; `/lag` og `/liga` viser tomtilstander som forventet
  før sesongstart. **Husk: samme ID må inn i Coolify sammen med nøklene.**

- 2026-08-19 (økt 4): «Vent, gå tilbake til Jens...» og deretter «Nei kall meg
  Marius please. Ikke endre igjen» → **endelig: Marius**. Minnet ligger i
  `memory/tiltale-marius.md`; ikke endre tiltalenavnet igjen uten ny instruks.
- 2026-08-19 (økt 4): webhook-URL oppgitt i klartekst i chatten → brukt til
  Task 1.4, lagt i `.env` (gitignored). **Brukeren er varslet om at URL-en nå
  ligger i samtaleloggen og kan regenereres i Discord.**
- 2026-08-19 (økt 4): «Vis to-do listen» → svart: `ROADMAP.md` (milepæler) og
  plan-filen (steg), begge avhukes fortløpende; status-tabell gitt i chatten.
- 2026-08-19 (økt 4): «Det kom en melding i discord chatten ja. Så den funker
  helt fint» → Task 1.4 steg 4 bekreftet av bruker.
- 2026-08-19 (økt 4): «Nå trykket jeg redeploy på environment variables» +
  skjermbilder av Coolify → avdekket at bare `TZ` og `FPL_TEAM_ID` fantes.
- 2026-08-19 (økt 4): «Nå har jeg lagt til api key og discord webhook. Og
  trukket redeploy» → `/health` bekrefter `ai:true, discord:true, teamId:true`.
  Task 1.5 ferdig.

- 2026-08-19 (økt 5, planlegging): full ekstern QA-rapport for v1.1.0 gitt som
  oppdrag («rett opp QA-funn og få v1.1.0 faktisk live») → kodebase kartlagt,
  plan skrevet og godkjent i plan mode.
- 2026-08-19 (økt 5): «Husk å presenter planen som en prompt jeg kan gi til en ny
  kodeagent» + «En hel prompt med referanser til planen i filsystemet» →
  `docs/neste-okt-prompt-qa-v111.md` opprettet.
- 2026-08-19 (økt 5): avklaringer — **P1-5: strategi B** (vis RSS-ingress i
  saklista + strammere prompt + egennavn-etterkontroll) og **Playwright OK i
  scratchpad** (aldri i repoet) for nettleser-verifisering.
- 2026-08-19 (økt 5): «Okay da kan du stoppe her» + «Så sender jeg prompten til
  en ny agent» + «gjør det du må gjøre før jeg sender prompten videre» →
  HANDOVER oppdatert og promptfilen committet lokalt (ingen push).

## LØST: AI og Discord er nå aktive i prod (2026-08-19 22:20)

Saken var at `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL` aldri var lagt inn i
Coolify — bare `TZ` og `FPL_TEAM_ID` sto i lista. Brukeren la dem til og
redeployet. Fasit nå:

```
GET https://fpl.marsk.no/health
{"status":"ok","features":{"ai":true,"aiModel":"claude-sonnet-5","discord":true,"teamId":true,"leagues":0}}
```

Verifisert på ekte sider i prod: `/nyheter` har AI-oppsummering, `/brief` viser
AI-briefen, dashboardet har AI-nyhetspanelet. Auto-briefen er dermed armert.

**Diagnose-endepunktet beholdes:** `/health` rapporterer hvilke valgfrie
funksjoner som er på (aldri verdiene). Bruk det først neste gang noe
«virker lokalt, men ikke i prod».

## Pre-flight-resultat (Task 1.3, 2026-08-19, lokalt med ekte nøkkel)

- `/nyheter`: `AI-kall: news-summary modell=claude-sonnet-5 inn=1306 ut=824`.
  Sju norske punkter, alle sporet til faktiske overskrifter i feed-listen.
- `/brief`: `AI-kall: ai-brief-gw1 … inn=552 ut=796`. Andre sidelasting ga
  ingen ny logglinje → timescachen virker. Innholdet stemmer mot rådataene.
- `POST /api/ai-rad`: kontrollert 400 (`Ingen aktiv gameweek.`) før sesongstart
  — ikke krasj. Full verifisering skjer i M4 sjekkpunkt A.
- Konklusjon: `claude-sonnet-5` beholdes, ingen promptjustering nødvendig.
## Discord-verifisering (Task 1.4, 2026-08-19, lokalt)

- Rå webhook-røyk-test: `HTTP 204`.
- Tvungen sending med `BRIEF_HOURS_BEFORE_DEADLINE=45.5`: konsollen viste
  `Auto-brief aktiv: sender 45.5 t før deadline`, `AI-kall: ai-brief-gw1 …
  inn=519 ut=859` og `Auto-brief sendt for Gameweek 1`.
- **Anti-spam-guarden verifisert ende-til-ende:** ny start med
  `BRIEF_HOURS_BEFORE_DEADLINE=47` (send-tidspunkt 1,5 t passert) ga
  `Auto-brief hoppet over for Gameweek 1: send-tidspunktet er passert` og
  INGEN ny Discord-melding.
- `BRIEF_HOURS_BEFORE_DEADLINE` er fjernet fra `.env` igjen (default 24).
- Gjenstår: brukeren bekrefter visuelt at meldingen i kanalen ser hel ut.

- **Deadline er fredag 21. august kl. 19:30**, ikke torsdag (planens
  ukedagsnavn er forskjøvet én dag; datoene stemmer). Den naturlige
  auto-briefen sender derfor **torsdag 20. august ~19:30** — Milepæl 1 må være
  i prod før **torsdag 20. august ~19:00**.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`
- FPL_TEAM_ID: ukjent — bruker setter selv i `.env` (placeholder i `.env.example`)

## Åpne beslutninger / kjente feil

- ~~17 QA-funn (P0-1…P2-8)~~ — RETTET i v1.1.1, i prod 2026-08-20.
- ~~Cloudflare-purge~~ — GJORT 2026-08-20 (Marius, via Claude in Chrome).
- Cloudflare skriver om `no-cache` til `max-age=14400` på uversjonerte
  assets (trolig Browser Cache TTL = 4 t). Ufarlig — se verifiserings-
  seksjonen øverst. Valgfri opprydding i Cloudflare-innstillingene.
