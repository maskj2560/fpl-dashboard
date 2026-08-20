# Oppdrag: kvalitetspass v1.1.3 — rett alle verifiserte funn fra kodegjennomgangen

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
prod på https://fpl.marsk.no via Coolify, auto-deploy ved push til `main`).

En full kodegjennomgang (åtte uavhengige review-vinkler + manuell verifisering
av hvert funn mot koden) er nettopp gjennomført. Funnene under er BEKREFTET
mot faktisk kode med fil:linje, med mindre de er merket «PLAUSIBEL». Din jobb:
rett dem, med tester, uten å brekke noe.

## Les først

1. `docs/HANDOVER.md` — status. NB: sesongstart-verifisering (M4) pågår i en
   annen økt med sjekkpunkter torsdag kveld–mandag. IKKE forstyrr den.
2. `CLAUDE.md` — arkitekturregler. Gjelder foran alt annet.

## Harde regler

- **Jobb på branchen `fix/kvalitetspass-v113`** (finnes allerede, inneholder
  nye fplClient-tester). ALDRI push uten eksplisitt klarsignal fra Marius —
  push til `main` auto-deployer til prod.
- **Tidskontekst:** i kveld (torsdag 20. aug) ~19:30 sender prod-koden
  auto-brief til Discord; GW1-deadline er fredag 21. aug 19:30. Dine endringer
  er lokale og påvirker ikke dette. Når Marius eventuelt vil deploye: ALDRI
  push i vinduet 19:00–21:00 torsdag (auto-brief), og merk at redeploy innen
  1 time etter en sendt auto-brief i dag vil re-poste den (P1-5 under — det
  er nettopp en av feilene du skal rette).
- **TDD:** for hvert funn med logikk — skriv/utvid test som feiler, rett, se
  grønt. `npm test` (node:test) og `npm run lint` (ESLint flat) skal være
  grønne etter HVER commit. Utgangspunkt: 124/124 grønne, lint 0.
- **Ingen nettverkskall i tester.** Mock global `fetch` (se mønster i
  `test/fplClient.test.js`) eller injiser fakes via små test-hooks
  (mønster: `_setNow`/`_flush`/`clear` i `src/services/cache.js`).
- **Ingen nye avhengigheter.** Ingen nye rammeverk. Appen skal forbli liten.
- **Conventional commits, én commit per funn** (eller per naturlig gruppe),
  med funn-ID i emnelinjen (f.eks. `fix: P0-1 guard mot manglende
  pick-elementer`). CHANGELOG.md under `[Unreleased]` i samme commit for alt
  brukersynlig.
- **Bevis, ikke påstander:** ved «ferdig» skal du vise kjørte kommandoer og
  faktisk output.
- All UI-tekst på norsk. Mørkt tema, CSS-variabler, ingen CDN-er.

## Arkitekturfasit (fra CLAUDE.md — brudd på disse er del av oppdraget)

Dataflyt: routes → services → fplClient → FPL-API. Nettverkskall mot FPL kun
i `fplClient.js`. Aldri forretningslogikk i routes/views. All logikk i
services skal ha tester.

---

## P0 — kan velte sider eller Discord-briefen (rett disse først)

### P0-1: Uguardede `byId.get(pk.element)`-oppslag → TypeError → 500

**Filer:** `src/routes/api.js:50` (assembleLive), `src/routes/api.js:127`
(/api/ai-rad), `src/routes/brief.js:22` (assembleBrief),
`src/routes/team.js:51` (/lag).

Picks caches 5 min, bootstrap 15 min (`src/services/fplClient.js`). Refererer
picks et element-id som ikke finnes i det cachede bootstrap-settet (cache-skew,
eller spiller fjernet fra spillet), gir `.web_name`/`.element_type`/`.status`
på `undefined` en TypeError:

- /live og /api/live.json → 500 for alle
- /brief, /api/brief.json → 500, og `notify.js` sitt auto-brief-forsøk feiler
  hver 6. time → ukens Discord-brief uteblir stille
- /lag → 500
- /api/ai-rad → 500 (som HTML, se P1-7)

**Fix-design:** én delt hjelper, f.eks. i `src/services/analysis.js`:
`resolvePicks(picks, elementsById)` som mapper picks → `{pick, player}` og
**dropper** oppføringer uten player med én `console.warn` per forekomst
(`Pick-element %d mangler i bootstrap`). Alle fire kallsteder bruker den.
Sidene skal rendre med resten av troppen — aldri 500.
**Tester:** enhetstest for hjelperen (manglende id droppes + warn), pluss
view-render-test (mønster i `test/views.test.js`) der ett pick-element mangler.

### P0-2: Discord-chunking kan sende tom eller >2000-tegns melding → 400

**Fil:** `src/services/notify.js:93–115` (`postToDiscord`).

To bekreftede feil i chunkeren: (a) første linje >1900 tegn pusher `current`
(= tom streng) som egen chunk — Discord avviser tomme meldinger med 400;
(b) en enkeltlinje >1900 tegn sendes udelt → >2000 tegn → 400. AI-briefen
genereres med `maxTokens: 4000`, så et langt avsnitt uten linjeskift er
realistisk. Konsekvens: `postToDiscord` kaster etter at tidligere chunks alt
er postet, `lastSentEvent` settes aldri, og neste `check()` re-poster de
første chunkene — delvise dubletter hver 6. time og aldri komplett brief.

**Fix-design:** trekk ut ren funksjon `chunkDiscordText(text, max = 1900)`
(eksporter for test): aldri tomme chunks, linjer lengre enn `max` hard-splittes
(helst på ordgrense). `postToDiscord` bruker den.
**Tester:** tom melding oppstår aldri; 2500-tegns enkeltlinje → to chunks
begge ≤ max; vanlig flerlinjetekst → uendret oppførsel; ingen chunk tom.

### P0-3: Live-polling starter aldri før avspark og gjenopptas aldri + stale `anyLive`

**Filer:** `public/app.js:215–230` (Modul 3), `src/services/fplClient.js:71–74`
(`getFixtures`), `src/routes/api.js:31–32`.

Tre samvirkende feil:
1. Polling startes KUN hvis `anyLive` var true ved sidelast — åpner brukeren
   /live før avspark, fryser siden gjennom hele kampen.
2. `clearInterval` ved første `anyLive=false` er permanent — i gapet mellom
   lørdagskampene (15:00-slutt → 17:30-start) dør pollingen for godt.
3. `assembleLive` avleder `anyLive`/stillinger/kampklokke fra
   `getFixtures(gw)` med 15-min TTL — så selv med polling viser siden
   «Ikke startet» i opptil 15 min etter avspark, og en fane åpnet i det
   vinduet leser false og dreper seg selv (feil 2).

**Fix-design:**
- `fplClient.js`: per-GW-fixtures trenger kort TTL i kampvinduer. Enkleste
  robuste løsning: `getFixtures(gw)` får `ttl: 1 * MIN` (samme som live-data;
  den polles bare mens /live-siden er åpen, og SWR + dedup demper støyten).
  `getFixtures()` uten gw (helsesong, brukes av FDR/brief) beholder 15 min.
- `api.js`/`assembleLive`: legg `nextKickoff` (ISO, tidligste
  `!f.started`-fixture sin `kickoff_time`, ellers null) i payloaden.
- `public/app.js` Modul 3: liten tilstandsmaskin i stedet for engangsvalg:
  etter hver render av data `d`: hvis `d.anyLive` → sørg for 60 s-interval;
  ellers → stopp intervalet, og hvis `d.nextKickoff` finnes → sett ETT
  `setTimeout` som gjør ett nytt poll ved kickoff + 30 s buffer (re-evaluerer
  da på nytt). Ingen kontinuerlig polling utenfor kampvinduer — CLAUDE.md-
  regelen «aldri poll utenfor kampvinduer» gjelder fortsatt; en engangs-vekking
  ved kjent avsparktidspunkt er OK, et intervall er det ikke.
**Tester:** serverdelen (nextKickoff-utledning) testes når assembleLive
flyttes til service (P2-1). Klientdelen: verifiser manuelt/med Playwright i
scratchpad (`C:\Users\mariu\AppData\...\scratchpad` — aldri i repoet):
mock-side eller lokal server, sjekk at det aldri går <55 s mellom kall og at
timeout settes når anyLive=false med fremtidig kickoff.

### P0-4: Én ugyldig `pubDate` dropper hele nyhetsfeeden

**Fil:** `src/services/news.js:29`.

`new Date(i.pubDate).toISOString()` kaster RangeError på uparsebar dato →
hele `fetchFeed`-promiset avvises → `Promise.allSettled` forkaster ALLE
sakene fra den feeden. Én rar dato fra BBC/Sky tømmer nyhetslisten stille.

**Fix-design:** parse trygt:
`const d = new Date(i.pubDate); published: Number.isNaN(d.getTime()) ? null : d.toISOString()`.
**Test:** feed-item med `pubDate: 'ikke en dato'` → item beholdes med
`published: null`, øvrige items upåvirket (testmønster finnes i
`test/news.test.js`).

---

## P1 — koster penger, dubletter eller feiloppførsel

### P1-5: Auto-brief re-sendes ved redeploy innen 1 t etter sending

**Fil:** `src/services/notify.js:17–22` + `:14` (`lastSentEvent` kun i minnet).

`sendDecision` gir `schedule` for delayMs i `[-1t, 0]`. Etter en vellykket
sending 19:30 vil enhver redeploy før 20:30 starte ny prosess med
`lastSentEvent=null` → `schedule(0)` → identisk brief postes igjen.
Skip-grenens kommentar («briefen er alt sendt») beskriver et tilfelle som i
virkeligheten lander i schedule-grenen.

**Fix-design (avveining — implementér a, dokumentér b):**
(a) Reduser dublett-vinduet: `MAX_LATE_MS` ned til 15 min, og logg tydelig
`Auto-brief planlagt ved oppstart X min etter sendetidspunkt` når delayMs < 0,
slik at en dublett i det gjenværende vinduet i det minste er sporbar.
(b) Full løsning krever persistens på tvers av containere (fil på volum eller
ekstern kilde) — det er en arkitekturbeslutning Marius må ta; legg den i
ROADMAP under «v1.2.0-kandidater» i stedet for å innføre volum nå.
**Test:** utvid `test/notify.test.js` for sendDecision-grensene (−14 min →
schedule, −16 min → skip).

### P1-6: Race — interval-tick under pågående send gir dobbel post

**Fil:** `src/services/notify.js:61` (guard leses før `send()` er ferdig).

`check()` fra 6-timers-intervalet kan lande mens `send()` venter på
AI-kall/Discord (sekunder–30 s). `lastSentEvent` settes først etter fullført
sending, så begge passerer guarden → to meldinger.

**Fix-design:** modulflagg `sending = true` ved start av `send()` (finally →
false); både `check()` og `send()` returnerer tidlig når det er satt.
Alternativt: sett `lastSentEvent` optimistisk FØR posting og rull tilbake ved
feil — men da kolliderer det med P0-2-retry-logikken; flagget er enklere.
**Test:** kall `send`-stien to ganger «samtidig» med en fetcher som henger på
et promise du kontrollerer; verifiser at webhooken bare treffes én gang.

### P1-7: `/api/*`-feil svarer HTML der klienten forventer JSON

**Filer:** `src/server.js` (global feilhandler ~linje 102–120),
`public/app.js` Modul 4 (forventer `{error}`-JSON).

`next(err)` på API-ruter rendrer HTML-feilside → `res.json()` kaster i
klienten → villedende «Nettverksfeil». **Fix-design:** i feilhandleren: hvis
`req.path.startsWith('/api/')` (eller `req.originalUrl`), svar
`res.status(500).json({ error: 'Noe gikk galt.' })` (behold 503-varianten for
`FplError` med spillet-oppdateres-melding hvis den finnes). **Test:**
view-/integrasjonstest som monterer appen med en rute som kaster og sjekker
`content-type: application/json` på `/api/`-sti.

### P1-8: Ingen backoff ved AI-feil — ubegrenset betalt retry

**Fil:** `src/services/ai.js:52–58`.

Ved feil/tomt svar oppdateres aldri `generatedAt`, så neste besøkende fyrer
nytt betalt kall umiddelbart. Ved ugyldig nøkkel/tom kreditt hamrer hvert
sidebesøk på /nyheter og /brief Claude API-et med full prompt.

**Fix-design:** modul-map `lastFailureAt` per cacheKey; etter feil ELLER tomt
svar settes den, og `generate()` returnerer `cached ?? null` uten API-kall i
`FAILURE_BACKOFF_MS = 5 * 60_000` etterpå. Suksess nullstiller.
**Testbarhet:** legg til minimale test-hooks etter cache.js-mønsteret:
`_setClient(fake)` og `_reset()` (tømmer store/inFlight/lastFailureAt).
**Tester:** feilende fake-klient → 1 kall, umiddelbart nytt `generate()` → 0
nye kall; etter backoff-utløp (styr klokken via `_setNow`-mønster eller
injisert now) → nytt forsøk; suksess-sti uendret (cache + dedup).

### P1-9: `/health` blokkerer på FPL-rundtur — unhealthy-loop-risiko

**Fil:** `src/routes/health.js:16`, `src/services/leagues.js`.

Proben awaiter `resolveLeagueIds()` → `getEntry()` → nettverkskall med
retry-stige (verst ~30 s ved hengende tilkobling). Coolify bruker /health som
gate — restart mens FPL henger kan gi unhealthy-loop.

**Fix-design:** health skal aldri vente på FPL: modul-level
`lastKnownLeagues = config.leagueIds.length`; ved probe: fyr
`resolveLeagueIds()` uten await (`.then(ids => lastKnownLeagues = ids.length).catch(...)`)
og svar synkront med `lastKnownLeagues`. Første svar etter kaldstart kan vise
config-tallet — det er greit, dokumentér i kommentar.
**Test:** health-ruta svarer < ~50 ms med hengende getEntry-fake.

### P1-10: `?v=`-cache-poisoning — immutable for enhver velformet verdi

**Fil:** `src/server.js:41` (`VERSION_PARAM`), `:57`.

Formsjekk (8 hex / 1–4 sifre) er nok til `immutable`. Under deploy-overlapp
kan gammel container svare på `style.css?v=<ny-hash>` med GAMMELT innhold
stemplet immutable → Cloudflare cacher feil bytes under ny hash til manuell
purge. **Fix-design:** identitetssjekk: kun `v === assetVersion` eller
`v === '1'` (fontens manuelle versjon, hold den i en navngitt konstant
`FONT_VERSION` med kommentar om DEPLOY.md) får immutable; alt annet
`no-cache`. **Test:** unit på header-logikken hvis den trekkes ut som ren
funksjon `cacheControlFor(v, assetVersion)` — gjør det.

### P1-11: Tvilsom spiller uten prosent scores som 100 % starter

**Fil:** `src/services/analysis.js:140–143` (`playProbability`).

Status `d` med `chance_of_playing_next_round: null` → 1.0 → kapteinsforslag
med «Full spilletid ventet» og transferInCandidates slipper spilleren gjennom
≥ 0.75-filteret. FPL flagger ofte 'd' før prosenten publiseres.
**Fix-design:** `d` uten prosent → 0.75 (FPLs egen konvensjon for «doubtful»).
**Test:** utvid analysis-testene: `{status:'d', chance: null}` → 0.75; sjekk
at begrunnelsestekster fortsatt stemmer (captainSuggestions).

### P1-12: Skadenytt på engelsk i brief, Discord og AI-prompt

**Filer:** `src/services/brief.js` (injuries bygges, ~linje 80),
`views/brief.ejs:38`, `src/services/notify.js:87`, `src/services/prompts.js:10`.

`translateFplNews` (analysis.js:353) er kun koblet på dashbordet. Data-briefen,
Discord-fallbacken og AI-prompten viser rå engelsk («Hamstring injury -
Expected back 21 Aug») midt i norsk tekst.
**Fix-design:** oversett i kilden — `buildBrief` legger
`news: translateFplNews(p.news)` i injuries-objektene. Da arver views/brief.ejs,
notify.js og prompts.js norsken gratis. Dashbordet oversetter allerede i view —
la det være (annen datavei), eller normaliser også den hvis lett.
**Test:** utvid `test/brief.test.js`: injury med `news: 'Ankle injury -
Expected back 21 Aug'` → norsk tekst i brief-objektet.

### P1-13: Oversettelses-drift varsles aldri i prod

**Fil:** `src/services/analysis.js:338–341` (`warnUnmatched`).

Gaten `NODE_ENV !== 'production'` gjør at miljøet som faktisk ser nye
FPL-strenger aldri logger dem — stikk i strid med kommentaren over funksjonen
og inkonsistent med søster-etterkontrollene (sanitizeBriefText,
filterSummaryPoints) som warner ubetinget.
**Fix-design:** fjern gaten. For å unngå loggspam: dedupliser per prosess
(`Set` med allerede-varslede tekster).
**Test:** samme tekst to ganger → én warn (mock console.warn).

### P1-14: DGW — bekreftet bonus i kamp 1 nuller estimatet i kamp 2

**Fil:** `src/routes/api.js:52` (og `:41` overwrite ved to in-play-kamper).

`stats.bonus > 0 ? 0 : estimat` er riktig for enkel runde, men i dobbel runde
aggregerer live-stats begge kampene: bekreftet bonus fra den ferdige kampen
skjuler estimatet fra den pågående. `bonusEst.set` overskriver også på tvers
av fixtures (behold høyeste, eller summer per element).
**Fix-design (gjør i P2-1-flyttingen):** ta bonusestimatet fra pågående
fixtures uavhengig av `stats.bonus`; `bonus = bonusEst.get(el) ?? 0` og
`effective = (total_points + bonus) …` — men trekk fra dobbelttelling: FPL
legger bekreftet bonus inn i `total_points` først når kampen er `finished`,
så estimat for pågående kamp + total_points er additivt korrekt også i DGW.
Ved flere samtidige in-play-kamper: `bonusEst.set(el, (bonusEst.get(el) ?? 0) + b)`.
**Test:** DGW-scenario i den nye service-testen (P2-1): spiller med bonus=3
fra ferdig kamp + BPS-ledelse i pågående → estimat vises, effective riktig.

---

## P2 — arkitektur og gjenbruk (gjør koden riktig og testbar)

### P2-1: Flytt forretningslogikken ut av rutene (CLAUDE.md-brudd)

- `assembleBrief` fra `src/routes/brief.js:12–33` → `src/services/brief.js`.
  Da forsvinner også lagbruddet `src/services/notify.js:7` (service importerer
  fra routes i dag).
- `assembleLive` fra `src/routes/api.js:26–101` → ny `src/services/live.js`.
  Rutene blir tynne (try/res.json/next).
- Ny `generateAiBrief(brief)` i `src/services/brief.js` (eller egen modul):
  dedupliserer den ORDRETT dupliserte AI-blokken i `routes/brief.js:40–49` og
  `notify.js:64–73` (samme cacheKey, system-streng, maxTokens, sanitize) —
  i dag kan de divergere stille ved endring på ett sted.
- I flyttingen: bruk `resolveLeagueIds()` fra `src/services/leagues.js` i
  assembleLive i stedet for den inlinede kopien uten `hasTeamId`-guard
  (`api.js:83–85`), og fjern døde felter i payloaden: `pos`, `multiplier`,
  `updatedAt` (ingen konsument — verifisert mot views/live.ejs og app.js) og
  det ubrukte `data-live`-attributtet i `views/live.ejs:10`.
- Forenkle `src/routes/live.js:12–14`: dropp den duplikate bootstrap/gw-
  beregningen; `assembleLive` håndterer null-tilfellet selv og returnerer
  `gameweek` (`res.renderPage('live', { live, gw: live.gameweek })`).

**Tester:** nå som logikken ligger i services: `test/live.test.js` med mocket
fplClient-data (bruk `clear()` fra cache.js + mocket global fetch, ELLER
strukturer servicen så den tar data inn som argumenter der det er naturlig).
Dekk: effective-formelen (kaptein ×2, benk ×0, multiplier), bonusaggregering
(inkl. P1-14-DGW-tilfellene), anyLive, nextKickoff (P0-3), tom-tilfeller.
View-render-testene i `test/views.test.js` skal fortsatt være grønne.

### P2-2: Delte konstanter og hjelpere (dedup med eksisterende drift)

- `STATUS_LABELS` duplisert i `src/routes/index.js:20` og
  `src/routes/players.js:7` — ALLEREDE driftet (`n`: «Utilgjengelig» vs
  «Utilgj.»). Flytt til `src/services/analysis.js` ved `POSITIONS`;
  velg «Utilgjengelig» (full form) begge steder.
- GW-oppløsning triplisert med ulike fallbacks: `routes/brief.js:16` og
  `routes/league.js:24` (`?? 2) - 1`-magi), `routes/team.js:30–32` (fallback
  0). Én `resolvedGw(events)` i analysis.js med tester for: aktiv runde,
  pre-season (next=1 → 0), post-season (ingen next), midt-sesong.
  NB: team.js bruker `gw >= 1`-gate — bevar semantikken (pre-season skal ikke
  hente picks); brief.js har samme gate.
- `byId(list)`-hjelper i analysis.js for `new Map(xs.map(x => [x.id, x]))` —
  brukt på 7 steder (api.js:34–35, 125–126, team.js:44–45, brief.js-ruta,
  index.js:42, players.js:19, analysis.js:84).
- `src/services/brief.js:13–23` har egne `Intl.DateTimeFormat`-instanser —
  flytt til `src/services/format.js` som `formatDay`/`formatTime` ved siden
  av eksisterende `formatDateTime` (samme locale/tz-eierskap).
- `public/app.js`: Modul 4 sin `escapeHtml` (:241) vs Modul 3 sin `esc`
  (:162) — én delt fil-scope-hjelper som også escaper anførselstegn.

### P2-3: `averageFdr`-ytelse

**Fil:** `src/services/analysis.js:128` + kallere (`transferInCandidates`).
Per-kandidat lineær skann av hele fixtures-lista → O(kandidater × elementer ×
fixtures) for 20 lagverdier. **Fix:** bygg `Map teamId → avgFdr` én gang per
kall i transferInCandidates (og captainSuggestions om samme mønster) og slå
opp. Behold `averageFdr` som ren funksjon (den har tester) — legg
`teamFdrMap(fixtures, fromGw, count)` ved siden av, med tester.

### P2-4: Post-season-fallback i buildBrief

**Fil:** `src/services/brief.js:71` (PLAUSIBEL — verifiser først).
`fromGw = nextEvent(...) ?? 1` → etter GW38 bygges briefen på GW1-data. Etter
P2-2 sin `resolvedGw` finnes semantikken sentralt; la brief vise tom/avsluttet
tilstand når ingen kommende runde finnes (`gameweek: null`-stien finnes
allerede i view).

---

## P3 — hardening (gjør hvis tiden strekker til; ellers ROADMAP)

Disse er reelle, men større redesign. Implementér bare om alt over er grønt;
ellers: legg dem under «v1.2.0-kandidater» i ROADMAP.md med én linje hver.

1. **`gameUpdating`-livssyklus** (`fplClient.js:15`): global boolean settes av
   503 på ett endepunkt og nullstilles av suksess på et HVILKET SOM HELST
   annet; med varm cache kan banneret stå i 15 min etter at FPL er friskt
   (eller forsvinne mens spillet fortsatt oppdateres). Ved kaldstart under
   oppdateringsvindu 500-er sidene i stedet for å vise banner. Redesign:
   tidsstemplet flagg (vis banner maks N min etter siste 503) eller status i
   cache-metadata per endepunkt.
2. **SWR-backoff i cache.js** (`cache.js:19`): ved varig FPL-nedetid trigger
   hver request ny bakgrunnshenting (3 forsøk × 10 s); legg failure-backoff
   per nøkkel (f.eks. min 30 s mellom mislykkede revalideringer) og vurder
   stale-alderstak/`dataAlder` i payload.
3. **SWR i ai.js** (`ai.js:33`): første besøkende per intervall venter hele
   Claude-rundturen synkront (5–20 s). Vurder cache.js-mønsteret: server
   cached tekst umiddelbart, regenerer i bakgrunnen. NB: endrer semantikken
   «AI-kall skjer ved sidebesøk» som brukes i verifisering — koordiner med
   Marius før endring.
4. **sanitizeBriefText robusthet** (`prompts.js:95`): setningssplitting
   splitter på forkortelsespunktum («kl.», «f.eks.»), og lagnavn matches kun
   mot FPL-kortnavn («Spurs») mens modellen kan skrive «Tottenham». Vurder
   alias-map for lagnavn + splitting som ignorerer kjente forkortelser.
5. **filterSummaryPoints dybde** (`news.js:147`): genitiv («Haalands») feiler
   substring-matchen og korrekte punkter droppes; robusthet ligger ett nivå
   opp — be modellen sitere kildeindeks per punkt og verifiser indeksen.
   Prompt-endring → koordiner med Marius (AI-kall for å teste koster penger).
6. **maxTokens-dokumentavvik**: CLAUDE.md sier ~1500/~600, koden bruker
   bevisst 4000/2000 (adaptiv tenkning trekker fra samme budsjett, jf.
   kommentar i `ai.js:24–28`). Oppdater CLAUDE.md-tallene + én setning om
   hvorfor. IKKE rør kodens verdier.

---

## Arbeidsrekkefølge og verifisering

1. `git checkout fix/kvalitetspass-v113` og `npm test && npm run lint`
   (forvent 124/124 og 0).
2. P0-funnene i rekkefølge, så P1, så P2, så ev. P3. TDD per funn. Commit per
   funn med funn-ID.
3. Etter P2-1-flyttingen: kjør HELE suiten + `npm run dev` og røyk-test lokalt:
   alle ti ruter 200 (`/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`,
   `/nyheter`, `/health`, `/api/brief.json`, `/api/live.json`), 404 på ukjent
   sti. Uten API-nøkler i `.env`-kopien din er AI/Discord av — det er greit
   (tomtilstander er forventet før fredag 19:30 uansett).
4. Oppdater fortløpende: CHANGELOG `[Unreleased]`, ROADMAP
   («v1.2.0-kandidater» for alt du IKKE gjør), `docs/HANDOVER.md` (kort
   statusblokk «kvalitetspass v1.1.3» med hva som er gjort/gjenstår).
5. **Slutt-tilstand:** alt committet på branchen, `npm test` + `npm run lint`
   grønne (vis output), IKKE merget, IKKE pushet. Skriv en kort rapport til
   Marius: hva som er rettet, hva som ligger i ROADMAP, og at merge/deploy
   venter på hans klarsignal (koordineres med sesongstart-verifiseringen som
   pågår i helgen — tidligst etter at auto-briefen og fredagens deadline er
   passert, aldri i sendevinduene).

Lykke til. Vær pinlig nøyaktig med bevis: hver «fikset» skal ha test-output.
