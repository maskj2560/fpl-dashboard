# Changelog

Alle vesentlige endringer i prosjektet dokumenteres i denne filen.

Formatet følger [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- `npm audit fix`: `qs` 6.15.3 → 6.16.0 (Express sin query-parser;
  GHSA-x5fp-wj9c-mxmx og GHSA-4mjr-xmp4-gh2g, moderat). Kun
  `package-lock.json` endret — ingen nye toppnivå-avhengigheter.

### Changed

- `fast-xml-parser` 5.11.0 → 5.11.1 (patch innenfor range).
- Dockerfile: `node:22-alpine` → `node:24-alpine` (Node 24 er Active LTS,
  22 i vedlikehold; appen utvikles og testes på 24). `engines` er fortsatt
  `>=22`, `HEALTHCHECK` uendret. Lokal røyktest på Node 24.11.1: alle sider
  200, ingen `DeprecationWarning` i loggen.

## [1.12.1] - 2026-09-02

Elleve funn fra Chrome-QA-en mot prod (`docs/qa-chrome-prompt.md`, 2. sep):
seks VIKTIG på `fix/qa-viktig-v1121`, fem KOSMETISK på
`fix/qa-kosmetisk-v1121`. Rød test før hver fiks. 756/756, lint 0.

### Fixed

- Live-siden viste «Viser data fra HH:MM — får ikke kontakt med FPL» i
  timevis mellom runder (QA-funn 6): en ferdig runde deler cache-nøkkel
  `live:N` med 6 t-lageret (`getLiveHistoric`, skrevet av /innsikt,
  /overganger og /liga), så `getLive` fikk verdien tilbake som «fersk» uten
  revalidering — mens alderstaket på 10 min slo til. Ferdige runder leses nå
  bevisst fra 6 t-lageret (`event.finished ? getLiveHistoric : getLive`, som
  baseline.js/transfers.js alt gjorde), `buildLive` bærer `finished`, og
  `staleInfo(gw, { finished: true })` utløser aldri banneret — poengene er
  immutable. `dataAlder` rapporteres som før. Fire nye tester.
- Chip-planleggeren på /lag viste tre halvdeler («1–19», «2–19» med samme
  innhold, «20–38») (QA-funn 1): FPL 2026/27 gir wildcard og Free Hit
  `start_event` 2 (kan ikke spilles i runde 1), og `chipHalves` skilte på
  (start, stopp)-paret. Halvdelen er nå stopp-runden, `from` er laveste
  start i gruppa. Én ny test med FPLs faktiske chip-data.
- Chip-planleggeren: en chip uten anbefaling (ingen kjent blankrunde / ingen
  tung periode) får grå pille «Ingen anbefaling» foran begrunnelsen, så hver
  rad alltid har en pille (QA-funn 2, Marius' valg). QA-fasiten STEG 3b
  oppdatert. Én ny view-test.
- «Abonner på kalender» i nedtellingskortet på / var uleselig i lyst tema
  (QA-funn 3): lenken arvet den globale `--accent-text` (mørkegrønn) på den
  lilla gradienten — 1,85–2,76:1. Ny token `--hero-link` (FPL-grønn i begge
  temaer, 8,5–13:1 mot begge gradientfargene, låst i kontrastparene) og
  regelen `.hero a`. Hero-en er lilla i begge temaer, som topbaren, så
  regelen «grønn tekst kun i mørkt tema» gjelder ikke der.
- Oppstillingen på /lag brakk radene på 390 px (3-4-3 ble 2+1 / 2+2 / 2+1)
  (QA-funn 4): spillerkortene hadde `min-width: 7.5rem` og raden fikk
  wrappe. På ≤ 480 px deler kortene nå raden likt (`flex: 1 1 0`, uten wrap),
  navn og meta får ellipse ved plassmangel. Benken beholder wrap. Låst i
  `test/style.test.js`.
- Korthodet «AI Oppsummering» på /nyheter overlappet «generert 12:42 · neste
  tidligst 18:42» på 390 px (QA-funn 5): `.card h2` er flex uten wrap, og
  `.h2-title { min-width: 0 }` lot tittelen krympe under innholdet sitt.
  Korthodet får `flex-wrap: wrap`, så lang meta faller ned på egen linje.
  Låst i `test/style.test.js`.
- AI-rundebriefen viste «• *Watkins**» med bokstavelige stjerner (QA-funn 8):
  punktmarkør-regexen i brief.ejs (`^[-*]\s*`) spiste første stjerne i en
  linje som starter rett på `**Navn**`. Markøren krever nå mellomrom etter
  seg (`\s+`). Én ny view-test med fixture.
- Prisgevinst-tabellen på /overganger skrev «+0.5»/«0.0» mens
  prisendringskortet skrev «+0,1» (QA-funn 10): Gevinst-kolonnen (og
  summen) bruker nå `formatSigned` — prisdelta med norsk komma, absolutte
  priser beholder punktum som resten av appen. Én ny view-test.
- webcal-adressen i sidehodet på /brief ble delt midt i ordet
  («fpl.marsk.n / o/kalender.ics») innenfor 78ch-taket (QA-funn 7):
  `word-break: break-all` → `overflow-wrap: anywhere`, så hele adressen
  flyttes ned først. Låst i `test/style.test.js`.
- Statflisene på /lag på 390 px brakk «3 345 863» over to linjer og
  «TOTALRANGERING» midt i ordet (QA-funn 9): tre ~103 px-fliser → to i
  bredden (`minmax(8.5rem, 1fr)`), en odde siste tar hele raden, og
  etikettene får `overflow-wrap: normal`. Låst i `test/style.test.js`.

### Changed

- FDR-4-fargen er mørknet fra FPLs `#ff1751` til `#e6003c` (QA-funn 11,
  Marius' valg): hvit 12 px-tekst i FDR-cellene ga 3,8:1, nå 4,7:1.
  Kontrastkravet for `fdr-ink-light/fdr-4` hevet til 4,5 i
  `test/style.test.js`. FDR 1/2/3/5 er fortsatt FPL-eksakte.

## [1.12.0] - 2026-09-02

### Added

- PWA (ikoner): `scripts/make-pwa-icons.mjs` (`npm run make-icons`) tegner
  app-ikonet — FPL-lilla flate med avrundede hjørner og FPL-grønn sirkel —
  som PNG med kun `node:zlib` (egen PNG-koder: signatur, IHDR, IDAT, IEND,
  CRC via `zlib.crc32`, 4× supersampling). Genererte og committede filer:
  `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (full flate),
  `apple-touch-icon.png` (180, ugjennomsiktig) + håndskrevet `icon.svg`.
  To nye tester.
- PWA (manifest): `public/manifest.webmanifest` (navn «FPL-dashboard»,
  kortnavn «FPL», `standalone`, FPL-lilla `theme_color`, mørkt `--bg` som
  `background_color`, SVG + 192/512 + maskable-ikoner, alle `?v=1`).
  `layout.ejs` lenker manifestet og apple-touch-ikonet med `ICON_VERSION`
  (ny i `middleware.js`, får `immutable` som font- og bildeversjonene) og
  bærer `theme-color`, `mobile-web-app-capable`, `apple-mobile-web-app-title`
  og `<meta name="fpl-asset-version">` (leses av SW-registreringen). Tre
  nye tester.
- PWA (service worker): `src/pwa/sw.js` serveres på `GET /sw.js` med den
  ekte asset-hashen byttet inn (`no-store`, cache-navn `fpl-<hash>` → ny SW
  og opprydding av gamle cacher per deploy). Strategi: navigasjon nett-først
  med `/offline` som fallback, `?v=`-assets cache-først, alt annet rett til
  nett; `/api`, `/kalender.ics`, `/health` og `sw.js` selv går alltid utenom.
  Ny side `GET /offline` («Du er frakoblet»). Seks nye tester.
- PWA (registrering): `app.js` registrerer `/sw.js?v=<asset-hash>` ved
  `load` med `updateViaCache: 'none'`, bak en `navigator`-guard; hashen
  leses fra `<meta name="fpl-asset-version">`. Dermed kan appen legges til
  på hjemskjermen («Legg til på hjemskjerm» / installer-prompt) med eget
  ikon, og viser frakoblet-siden uten nett. To nye tester.

## [1.11.0] - 2026-09-02

### Added

- FPL-karrieren (grunnlag): `buildCareer` i `insights.js` — tidligere
  sesonger fra entry history (`past`) med beste sluttrank markert, pluss
  sesongen så langt (`current`); `seasonLabelFrom` utleder «2026/27» fra
  første deadline. Finnes før første runde er spilt. Tre nye tester.
  0 AI-kall.
- Merkedager (grunnlag): `buildBadges` — fast katalog på åtte merker i fast
  rekkefølge (Sesongbeste, Tre grønne piler, Hundreklubben, Topp 100 000,
  Bedre enn noen gang, Tom benk, Kapteinsteft, Alle femten spilte) med
  `earned`/`gw`/`detail`; låste merker har null. Tom benk teller ikke i
  Bench Boost-runder, Kapteinsteft bygger på kapteinsfasiten, «Alle femten
  spilte» på `gwsAllPlayed` (minutter > 0 for alle 15). Seks nye tester.
- FPL-karrieren og Merkedager på `/innsikt`: to nye kort øverst — tabell
  over tidligere sesonger (beste sluttrank markert) med «Denne sesongen så
  langt», og åtte merke-fliser der låste er grået (`aria-disabled`). Begge
  vises også før første runde er ferdigspilt. `assembleInsights` henter
  entry history (egen id → 5 min-nøkkel, myk feil → kortene skjules) —
  ett ekstra cachet kall, 0 AI-kall. Fem nye tester.
- Bonuskamp (grunnlag): `topBps` i `live.js` — topp fem på BPS per kamp
  med bonusen de ligger an til (FPLs publiserte tall når kampen er ferdig
  eller publisert, ellers estimatet der likhet arves: 3,3,1), mine spillere
  markert; `buildLive` legger `bpsTop` + `bpsSource` («fpl»/«estimat») på
  hver kamp i `/api/live.json`. Tom før avspark. Fem nye tester.
- Bonuskamp på `/live`: hver kamp i gang viser «Bonus (estimat)»/«(FPL)»
  med topp fem på BPS, bonusen de ligger an til og mine spillere i fet —
  rendres klientside av `bpsRaceHtml` (ren, testet i vm). Én ny test.

## [1.10.0] - 2026-09-02

### Added

- Prisvarsler (grunnlag): `prices.js` med `dateKey` (Oslo-dato — natten
  tilhører dagen den ender på), `snapshotOf`/`diffPrices` (kun endrede
  priser, ingen uten snapshot), `priceDecision` (første snapshot poster
  aldri, maks én Discord-melding per dato, uten webhook kun snapshot) og
  `parsePriceFile` (versjon 1, ellers null). Sju nye tester. 0 AI-kall.
- Prisvarsler (rapport): `buildPriceChanges` (troppen først — stigere, så
  fallere — pluss topp 5 opp/ned globalt; likhet brytes på mest
  kjøpt/solgt; spillere borte fra bootstrap hoppes over) og
  `priceChangesText` (Discord-teksten: «£14.0m → £14.1m (+0,1)» med norsk
  komma, «Ingen endringer i troppen din.» når tom). Fire nye tester.
- Prisvarsler (timer): `startPriceWatcher` i `server.js` — alltid aktiv,
  ett tikk ved oppstart og så hver time (≤ 1 cachet bootstrap-kall/time).
  Snapshot og dagens rapport i `DATA_DIR/price-state.json` (versjon 1),
  snapshotet lagres FØR Discord-posten, en andre endring samme natt slås
  sammen (første `from`, siste `to`, netto null faller bort) uten ny
  melding. Uten webhook: snapshot + kort, aldri post. `postToDiscord`
  eksporteres fra `notify.js` (Discord blir der). Fem nye tester.
- Prisvarsler (kort): «Prisendringer natt til …» øverst på `/overganger`
  når det finnes en rapport — troppen din (eller «Ingen endringer i troppen
  din.»), så topp 5 opp og ned med klubbmerke, pris før/etter og delta.
  Ruta leser kun `getLastPriceChanges()` (0 FPL-kall, 0 AI-kall).
  Kildelås: `prices.js` importerer aldri `ai.js` og låner Discord-sendingen
  fra `notify.js`. Tre nye tester.

## [1.9.0] - 2026-09-02

### Added

- Chip-planlegger (grunnlag): `chips.js` med chip-halvdelene fra bootstrap
  (`start_event`/`stop_event`, fallback 1–19/20–38) og dobbel-/blankrunde-
  deteksjon; `fixtureGrid` trukket ut av `fdrMatrix` i `analysis.js` og
  delt. 0 AI-kall.
- Chip-planlegger (regler): `buildChipPlan` gir per halvdel og chip enten
  «brukt i runde N» eller en anbefaling med begrunnelse — Bench Boost i
  runden der troppen har flest og lettest kamper, Triple Captain for
  klubb × runde med mest samlet «ease» (dobbelrunder teller dobbelt,
  keeperklubber hoppes over), Free Hit i blankrunden som rammer minst fire
  i troppen, Wildcard rett etter troppens tyngste tre runder (snitt-FDR
  ≥ 3,3) med 4–6 lette runder for de beste klubbene. Kun kjente runder
  vurderes.
- «Lag» har fått kortet «Chip-planlegger» under rankgrafen: to halvdeler ×
  fire chips med brukt-pille eller anbefalt runde + begrunnelse
  (`describeRec`), pluss lista over kjente dobbel- og blankrunder. Bygget
  av data siden alt hentet — 0 nye FPL-kall, 0 AI-kall.
- Lagsjekk (grunnlag): `deadline.js` med `applyTransfers` (picks fra
  forrige runde + byttene for kommende — FPL gir ikke ut nye picks før
  deadline), `buildDeadlineCheck` (funn: skadet/suspendert/utlånt starter,
  tvilsom ≤ 50 %, flagget kaptein/vise, starter uten kamp; footer med
  gratisbytter fra FT-regnskapet og aktiv chip) og `deadlineCheckText`
  (Discord-teksten). Åtte nye tester.
- Lagsjekk (timer): `notify.js` kjører `assembleDeadlineCheck`
  `DEADLINE_CHECK_HOURS_BEFORE` timer (default 3) før deadline på samme
  6 t-tikk som auto-briefen, og poster til Discord KUN ved funn. Markøren
  lagres uansett i `DATA_DIR/check-state.json` (ren tropp re-sjekkes ikke,
  redeploy dobbel-poster aldri); sen omstart sjekker fortsatt, men aldri
  de siste 15 min før deadline (`sendDecision` fikk valgfri `maxLateMs`).
  Ny env-variabel i `.env.example` og README. Fire nye tester.
- Lagsjekk (kort): `/brief` viser kortet «Lagsjekk» under sidehodet — alltid
  synlig når det finnes en kommende runde og picks: funnliste med etikett
  (Kaptein/Visekaptein/Ute/Tvilsom/Uten kamp), klubbmerke og detalj, eller
  «Alt klart»; footer med gratisbytter, aktiv chip og grunnlaget. Ruta
  henter sjekken mykt (feil → kortet skjules, briefen vises). To nye tester.
- Kalender (grunnlag): `calendar.js` bygger en RFC 5545-kalender — én
  hendelse per deadline (alle 38, VALARM 3 t før, stabil UID per sesong)
  og troppens klubbers kamper fra og med neste runde (2 t, FDR i
  beskrivelsen). CRLF, folding på 75 oktetter (æøå er to byte), UTC med Z,
  ingen VTIMEZONE. Seks nye tester.
- Kalender (rute og lenker): `GET /kalender.ics` (`text/calendar`, no-store,
  inline filnavn; feil går til feilhandleren) og «Abonner på kalender» med
  webcal-adressen under nedtellingen på `/` og i sidehodet på `/brief`.
  Kildelås: `calendar.js`, `chips.js` og `deadline.js` importerer aldri
  `ai.js`. Tre nye tester.

## [1.8.3] - 2026-09-02

### Security

- Sikkerhetshoder på alle svar: `Content-Security-Policy` med
  per-forespørsel-nonce for tema-scriptet (ingen `unsafe-inline` for script),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy` og `Permissions-Policy`. JSON-kropper begrenses til
  32 kB. Ny `createSecurityHeaders`/`buildCsp` i `middleware.js`, låst av
  tester på hodene, noncen og monteringsrekkefølgen.
- Takstbegrensning på skrivende API-kall: POST/DELETE under `/api` tåler
  30 kall per IP per 5 minutter, deretter 429 med `Retry-After`. IP-en
  leses fra `CF-Connecting-IP` bak Cloudflare (så `X-Forwarded-For`, så
  socketen). GET er uberørt — de leser serverens cache.

### Changed

- Tilgjengelighet: hopp-lenken «Hopp til innhold» er første Tab på alle
  sider (synlig kun ved fokus) og peker på `<main id="innhold">`;
  nedtellingen på dashbordet er merket `role="timer"` så sekundene aldri
  leses opp.
- Tilgjengelighet: kolonnehodene i de sorterbare tabellene («Spillere»,
  «Live») har `scope="col"`; `aria-sort`-vekslingen er trukket ut som ren
  `nextSortDir` og testlåst.
- Tilgjengelighet: alle datatabeller (26, også de klientrendrede) har en
  skjermleser-caption; «Live» annonserer kampstatus (`role="status"`) og
  totalsummen (`aria-live="polite"`). Testlåst: hver `<table>` følges av
  `<caption>`, og hver ikon-knapp har `aria-label`.
- Tilgjengelighet: ny `test/a11y.test.js` låser at alle skjemafelt (views
  og klientrendret markup) har etikett, at all bevegelse ligger bak
  `prefers-reduced-motion`, og at den globale fokusringen består.

### Fixed

- Feilhandleren svarte 500 «Noe gikk galt» med stacktrace i loggen på
  klientfeil fra body-parseren (for stor kropp, ugyldig JSON). Nå gis
  riktig status (413/400) som JSON på `/api`, uten logging. Funnet i
  røyktesten av 32 kB-taket.
- «Spillere»: filterskjemaet brukte et inline `onsubmit` for å hindre at
  Enter sendte skjemaet. Flyttet til app.js — CSP-en som kommer i samme
  versjon ville blokkert inline-handlere stille. Testlåst: ingen view har
  `on*`-attributter.

## [1.8.2] - 2026-09-01

### Changed

- «Rundens rapport»: rikere grunnlag og lengre tekst. Rapporten får nå
  lagdetaljer per manager (benkepoeng, chip, bytter/hit, rundens beste
  spiller), differensialer (aleneeid spiller ≥ 8 p) og flopper (bredt eid,
  ≤ 2 p) — alt fra picks + live som allerede hentes, 0 nye FPL-kall.
  Prompten ber om 250–320 ord (før ~180) og at hvert lag nevnes med et
  konkret eksempel; `max_tokens` 2000 → 3000. Samme tone som før.

### Fixed

- «Spillere»: en tredje avkryssing i duellen ble avvist uten et eneste
  synlig tegn. Når to spillere er valgt, låses de øvrige boksene i stedet.
- «Spillere»: duellen var bredere enn kortet på mobil, så spiller 2 lå
  utenfor og måtte dras fram sidelengs. På smale skjermer deler de tre
  kolonnene bredden i stedet, og duell-hodet stables.
- «Liga»: kolonnehodet «#» sto over trendpila i stedet for over plassifferet,
  fordi hele cellen er høyrestilt. Pila har nå en fast plass ytterst, og
  hodet reserverer den samme plassen.
- «Spillere»: søylestripa bak score-tallet i differensialtabellen fylte hele
  cellehøyden og leste som et fargefelt. Nå er den en tynn søyle langs
  bunnen av cellen.
- «Spillere»: filterraden ble stående på alle tre fanene og filtrerte bare
  tabellen — et søk viste «Viser 1 av 629 spillere» over en ufiltrert
  differensialtabell. `hidden` taper mot enhver `display`-regel med klasse;
  nå slår `hidden` gjennom overalt.
- Tabellhoder over tallkolonner sto til venstre mens tallene sto til høyre,
  så verdien så ut til å høre til nabokolonnen (tydeligst i benkesløsingen
  på «Innsikt», der «6» havnet under «Unngåelig tap» og «−1» under «Chip»).
  Gjelder alle tabellene på alle sider.
- «Innsikt»: benkesløsingen og flakstabellen krymper til innholdet i stedet
  for å strekke fire korte kolonner over hele kortbredden.
- «Innsikt»: sumraden i benkesløsingen vises først når det finnes mer enn
  én ferdigspilt runde — med én runde gjentok den bare radens egne tall.
  Sumraden har fått en egen skillestrek, så den leses som en sum.
- «Innsikt»: chip-kolonnen viser «–» i runder uten chip i stedet for en
  tom celle.
- Forklaringstekst rett over en tabell eller tallstripe har fått luft, og
  ingresser og forklaringer brytes på 78 tegn i stedet for å gå i én lang
  linje over hele skjermen.

## [1.8.1] - 2026-09-01

### Fixed

- «Spillere»: spillernavn vises som lavmælte tekstlenker i stedet for fylte
  grønne knapper. Veggen av 772 like knapper er borte, og den grønne
  knappen er igjen reservert for ekte handlinger.
- «Spillere»: statusmerket vises kun når spilleren har et avvik (skadet,
  tvilsom, suspendert, utilgjengelig, utlånt). «Klar» på nesten alle 626
  rader var støy. Statusfilteret virker som før.
- «Spillere»: spillertabellen har fått zebra-striper og strammere radhøyde,
  og checkbox-kolonnen har en synlig «Duell»-overskrift i stedet for tekst
  kun for skjermlesere. Stripene teller bare synlige rader, så rytmen holder
  når filtrene brukes.
- «Spillere»: knappehierarkiet i duell-linja er snudd. «Sammenlign» er nå
  primærknappen (grønn, deaktivert til to spillere er valgt), «Tøm valg» er
  en lavmælt tekstknapp.
- «Spillere»: FDR 3 og score i differensialtabellen har alltid én desimal
  («3.0», ikke «3»), så kolonnene står rett under hverandre. Sorteringen
  skjer fortsatt på tallet, og FPLs egne tall (form, eid, xG, xA) er urørt.
- «Spillere»: terskelvelgeren 5/10/15 % under Differensialer virker igjen.
  I v1.8.0 fantes ingen kode som lyttet på valget, så bare 10 %-tabellen
  kunne vises. Regelen er nå en ren funksjon og låst med test.
- «Spillere»: terskelvelgeren er en segmentert pillebryter i stedet for tre
  løse radioknapper, og score-kolonnen har fått en diskret søylestripe som
  viser hvor sterk scoren er i forhold til den beste i tabellen.
- «Spillere» er delt i tre faner — Tabell, Differensialer og Dødballtakere —
  i stedet for ett langt scroll-dokument. Faneraden kan styres med piltaster,
  og `/spillere#differensialer` åpner riktig fane direkte. Duellen og
  filtrene hører til Tabell-fanen.
- «Spillere»: dødballtakerne vises som klubbkort i et rutenett — ett kort per
  klubb med merke og de tre rollene under hverandre («Straffer: 1. Saka ·
  2. Ødegaard») — i stedet for en bred tabell med fire kolonner. Navnene er
  fortsatt klikkbare.
- «Spillere»: duellen får et hode per spiller med klubbdrakt, navn og klubb,
  så det er tydelig hvem som er hvem i sammenligningen.
- «Spillere»: spillerkortet har fått ryddigere hierarki — navnet står kun i
  modaltittelen, drakta er stor (110 px), Form/Poeng/P/K vises som store
  primærtall over de mindre (Eid %, xG, xA, Minutter), og kamptabellen er
  strammet inn.
- «Spillere»: kortere ingress, mer luft rundt faneraden og tydeligere
  seksjonstitler.

## [1.8.0] - 2026-09-01

### Added

- Grunnlaget for spillerkortet: `buildPlayerCard` samler nøkkeltall, siste
  fem runder (dobbeltrunder gir to rader) og de tre neste kampene med FDR
  til ett norsk datasett. Skadenyheter oversettes, og dødballrollene
  (straffer, hjørner, frispark) følger med.
- Differensial-finner: rangerer spillere med lav global eierandel etter
  form og kampprogram (score = form × (6 − snitt-FDR neste tre runder)).
  Terskelen kan settes til 5, 10 eller 15 %, og topp 10 vises per terskel.
  Før noen har fått form — helt i sesongstart — sier siden fra i stedet
  for å liste vilkårlige navn.
- «Dødballtakere»: én tabellrad per klubb med de to første i køen for
  straffer, hjørner/indirekte frispark og direkte frispark. Klubber uten
  kjente takere står oppført med «–», så hele serien er med.
- Nytt endepunkt `GET /api/spiller/:id` som spillerkortet hentes fra.
  Detaljdataene lastes først når du klikker på et navn — aldri for alle
  626 spillerne — og en ukjent id svares med 404 uten å koste et kall mot
  FPL. Svaret oppgir også hvor gamle dataene er (`dataAlder`).
- «Spillere» er nå tre seksjoner med hopplenker øverst: Tabell,
  Differensialer og Dødballtakere. Spillernavn er blitt knapper som åpner
  spillerkortet, og hver rad har en avkrysningsboks for spillerduellen.
  Terskelbytte (5/10/15 %) skjer i nettleseren — ingen sidelasting, ingen
  nye kall mot FPL.
- Spillerkort: klikk på et spillernavn åpner et kort med nøkkeltall,
  dødballroller, de fem siste rundene og de tre neste kampene med
  FDR-farge. Kortet lukkes med ×, Esc eller klikk utenfor, tastaturfokus
  holdes inne i dialogen, og fokus går tilbake til navnet du klikket på.
- Spillerduell: kryss av to spillere i tabellen og trykk «Sammenlign» for å
  se nøkkeltallene side ved side, med den beste verdien uthevet på hver
  rad. Billigst vinner på pris, satt dødballrolle slår ingen rolle, og lik
  verdi markeres ikke. Alt regnes i nettleseren — ingen kall mot FPL.

### Fixed

- Kontrakten for `getElementSummary` er låst med tester: egen cache-nøkkel
  per spiller og 30 minutters levetid. Funksjonen fantes fra før, men var
  ubrukt og utestet — nå er den grunnmuren spillerkortet hviler på.

## [1.7.1] - 2026-09-01

### Added

- Krysslenker: spillernavn på dashbordet (Toppform, Mest kjøpt/solgt),
  i briefens kapteinskandidater og i rundens XI på «Innsikt» lenker nå
  til «Spillere» med søket ferdig utfylt (`/spillere?sok=…`).
- «Spillere» har fått status-filter (Klar/Usikker/Skadet/Suspendert/Ute),
  og «Mine spillere» på «Live» kan nå sorteres ved å klikke på kolonnene —
  sorteringen beholdes når live-tallene oppdateres. «Live» forklarer også
  forskjellen på publisert og estimert bonus.
- Grafene på «Lag» (totalrangering) og «Liga» (sesongutvikling) har fått
  akse-etiketter: beste/dårligste verdi på y-aksen og første/siste runde
  på x-aksen — ikke lenger nødvendig å gjette skalaen.
- «Nyheter» viser nå når neste AI-oppsummering tidligst kommer («generert
  HH:MM · neste tidligst HH:MM») — teksten er timer-styrt som før, ingen
  knapp og ingen ekstra AI-kall.

- Flere forklaringer der tall sto ukommentert: flagg-hint på dashbordet,
  FDR forklart på briefen, xG/xA forklart på «Spillere» og «Innsikt»,
  «lovlig ellever» presisert i benkesløsingen, og tomtilstand for «Mine
  kapteinsvalg» på briefen.

### Changed

- På «Overganger» vises bytter som ikke teller («Venter på runde» /
  «Angret før deadline») nå som badge med dempet rad, så de spilte
  byttene skiller seg ut.

### Fixed

- API-endepunktene (`/api/*.json`) sender nå `Cache-Control: no-store`,
  så nettleseren aldri viser utdatert JSON — serverens cache styrer
  ferskheten alene.

## [1.7.0] - 2026-08-31

### Added

- Ny side «Innsikt» (`/innsikt`, i menyen etter Liga): fasiten på din egen
  sesong, regnet på rå spillerpoeng uten kapteinsdobling og kun på
  ferdigspilte runder. Ingen AI — siden koster null kroner å se på.
- «Benkesløsing» på «Innsikt»: hva benken scoret hver runde, hvor mye av det
  som var unngåelig (beste lovlige ellever av de femten minus den du faktisk
  stilte), sum for hele sesongen og merking av chip-runder. En Bench
  Boost-runde teller som null sløsing — hele troppen spilte.
- «Kapteinsfasit» på «Innsikt»: kapteinen din mot troppens beste spiller
  (delt topp teller som treff) og mot rundens globale favoritt, runde for
  runde, med treffprosent for begge fasitene. Runder der FPL ikke oppgir en
  global favoritt står som «Ikke målt» og teller ikke mot deg.
- «Flaksbarometer» på «Innsikt»: over- og underprestasjon mot xG og xA målt
  i poeng, per runde og for hele sesongen, pluss de tre heldigste og de tre
  uheldigste spillerne i troppen din.
- «Rundens XI» på «Innsikt»: FPLs eget drømmelag for siste ferdigspilte
  runde med draktbilde, posisjon og poeng, merket med hvem av dem du eide
  (startet eller benket) og hvem som bar kapteinsbindet ditt — pluss en
  sesongtrend over hvor mange av elleveren din som kom med, runde for runde.

### Changed

- `fplClient` har fått `getDreamTeam(gw)` (`dream-team/{gw}/`, egen
  cache-nøkkel, 6 t TTL). Hentes kun for siste ferdigspilte runde.

## [1.6.0] - 2026-08-28

### Added

- Rival-radar på «Miniligaer»: velg rival i nedtrekksmeny (forhåndsvalgt =
  nærmeste over deg), se poengavstand totalt og siste runde, differensialer
  begge veier med rundens poeng, felles spillere og begges kaptein.
- Kaptein-liga på «Miniligaer»: hvem i ligaen kapteinet hva sist runde,
  med «tapt mot optimal» (beste spiller i start-XI minus kapteinen) og
  sum over de siste 10 ferdige rundene.
- Sesonggraf på «Miniligaer»: hele ligaens plassering runde for runde i
  én graf — du og rivalen uthevet, resten dempet, med tegnforklaring.
- Rival-valget huskes i nettleseren: åpner du «Miniligaer» uten valgt
  rival, sendes du til sist valgte; forsvinner rivalen fra ligaen,
  ryddes valget.
- «Rundens rapport»: etter hver ferdigspilte runde skrives én rapport om
  miniligaen (vinner, taper, bevegelser, kapteinsvalg og din runde) —
  AI-skrevet «roast med glimt i øyet» med nøktern datafallback. Postes
  til Discord når webhook er satt, og overlever redeploy
  (`DATA_DIR/report-state.json`). Maks 1 AI-kall per runde.

## [1.5.0] - 2026-08-28

### Added

- «Overganger»-analysen bryter hvert bytte ned per runde (poeng inn/ut
  med løpende sum), gir en milepælsdom «etter 5 runder», og teller
  sesongtall: spilte bytter, treffprosent og antall -4-trekk betalt.
- «Overganger»-siden viser treffprosent og antall trekk i sesongkortet,
  og hver rad i byttetabellen kan utvides til per-runde-detaljene med
  milepælsdommen.
- Ny «Prisgevinst»-seksjon på «Overganger»: kjøpspris mot dagens pris og
  salgspris per spiller (FPLs halveringsregel), sum for troppen, og salg
  der prisen siden har steget.
- Ny «Laget uten bytter»-seksjon på «Overganger»: GW1-laget simuleres
  urørt gjennom sesongen (med autosubs og kapteinsregler) og sammenlignes
  med faktisk poengsum — svaret på om byttene har lønt seg totalt.
- Ny hva hvis-planlegger på «Overganger»: velg spiller ut og inn, se
  tallene side om side (pris/salgspris, form, forventet poeng, FDR,
  eierandel, status) og få FPL-reglene sjekket — posisjon, budsjett med
  salgspris + bank, maks 3 fra samme klubb. Datagrunnlaget hentes først
  når planleggeren åpnes.
- Scenarier kan lagres (maks 20, navngitte, med prissnapshot) og slettes —
  de overlever redeploy i samme lagringsplass som brief-markøren.
  Gratisbyttene rekonstrueres fra historikken (1 per runde, bank opptil 5,
  wildcard/free hit bruker ingen) og selvvalideres mot FPLs faktiske trekk.
- Scenariene følges opp på siden: «planen ville gitt X, du fikk Y» med
  trekk fra gratisbytte-regnskapet, per bytte-diff og 5-rundersmilepæl
  for både planen og det faktiske valget.
- Alternativ-analyse per bytte: detaljraden foreslår de 3 beste kandidatene
  i samme posisjon og prisklasse (pris ved sesongstart) målt i samme vindu,
  og et søkefelt lar deg sjekke en hvilken som helst annen spiller.
- AI-kommentar til overgangsanalysen («godt bytte, dårlig timing»):
  genereres maks én gang i døgnet av bakgrunnsoppfriskeren, aldri av en
  sidevisning, og kun når det finnes spilte bytter. Vises med cyan
  AI-merke under sesongkortet.

## [1.4.0] - 2026-08-28

### Added

- Sidene sier fra når FPL-dataene er gamle: er de eldre enn alderstaket
  (10 minutter for live, 60 minutter ellers), vises banneret «Viser data
  fra HH:MM — får ikke kontakt med FPL akkurat nå.» Innenfor taket
  serveres data stille som før.
- `/api/brief.json` og `/api/live.json` oppgir `dataAlder` — sekunder
  siden dataene sist ble hentet fra FPL.

## [1.3.8] - 2026-08-28

### Fixed

- Nyhetsoppsummeringens etterkontroll forkaster ikke lenger gyldige
  punkter der et navn står i genitiv («Haalands») mens saken har
  grunnformen («Haaland»).

## [1.3.7] - 2026-08-25

### Fixed

- Auto-briefen kan ikke lenger postes to ganger til Discord når appen
  deployes i kvarteret etter sendetidspunktet: «brief sendt»-markøren
  lagres i `data/brief-state.json` og overlever omstart og redeploy.
  Krever et persistent volum på `/app/data` i Coolify; uten volum
  oppfører appen seg som før.

## [1.3.6] - 2026-08-25

### Fixed

- «FPL oppdaterer spillet»-banneret kan ikke lenger bli hengende: det
  slukkes automatisk fem minutter etter siste 503 fra FPL, i tillegg til
  ved første vellykkede svar.
- Åpnes siden mens FPL oppdaterer spillet og ingenting ligger i cachen,
  vises en forklarende side med råd om å prøve igjen — ikke en generisk
  feilside. `/api/*` svarer 503 med egen feilmelding i samme situasjon.

## [1.3.5] - 2026-08-25

### Fixed

- Serveren avslutter ryddig ved deploy og omstart: aktive forespørsler
  fullføres før prosessen stopper, i stedet for at Docker må drepe den
  etter stopp-timeouten (SIGTERM/SIGINT-handler med 10 s nødutgang).

## [1.3.4] - 2026-08-25

### Added

- Serveren frisker opp AI-tekstene selv, på klokka: rundebriefen én gang i
  døgnet og hver time de siste seks timene før deadline, nyhetene hver
  sjette time — pluss én gang like etter en oppdatering av appen. Tekstene
  er dermed klare før noen ser på siden.

### Fixed

- `/brief` vises med en gang: siden leser AI-teksten fra cachen i stedet for
  å generere den mens du venter. Er teksten ikke laget ennå, vises
  data-briefen som før.
- Forsiden og `/nyheter` vises med en gang: nyhetsoppsummeringen leses fra
  cachen i stedet for å genereres mens du venter. Forsiden ventet på den
  samme teksten som `/nyheter`, uten at det var synlig noe sted.
- AI-rådgiveren på `/lag` svarer med en gang når det finnes et tidligere
  råd, og henter et nytt i bakgrunnen. Første klikk i en runde venter som før.

### Changed

- `ai.js` kan servere en utgått AI-tekst med en gang og fornye den i
  bakgrunnen (stale-while-revalidate), og har fått `getCached()` som leser
  cachen uten noen gang å gjøre et nettverkskall. Grunnlaget for at ingen
  sidevisning skal vente på en AI-tekst.

## [1.3.3] - 2026-08-24

### Added

- Hele raden i ligatabellen er klikkbar, og laget du sammenlikner deg med
  markeres i tabellen.
- Formasjonen (for eksempel 3-4-3) vises i hodet på Oppstilling-kortet.
- Live-siden viser antall i korthodene («Mine spillere», «Kamper» og hver
  liga), som på dashbordet — og tallene oppdateres med live-dataene.
- Spillere-siden sier fra når filtrene ikke gir treff, med en knapp for å
  nullstille dem.
- Tabeller som kan dras sidelengs har samme myke kanthint som menyen.

### Fixed

- Tabellhodet på Spillere legger seg ikke lenger bak toppmenyen på mobil;
  toppmenyens høyde styres nå av `--topbar-h` (57/50 px).
- Bedre kontrast i lyst tema på versjonslinja i footeren og på benkeradene
  på lagsiden — de var dempet med gjennomsiktighet og falt under kravet.
- Store tall brekker aldri lenger inni en sifergruppe — «1 339 328» deles
  bare mellom gruppene, og aldri i tabellceller.
- Mindre orddeling på mobil: automatisk bindestrek er slått av, og
  statistikkortene deler aldri ord. Lange ord nødbrekkes fortsatt.
- Ligatabellen viser en retningsmarkør på hver rad — også i runde 1, der
  ingen har historikk ennå — og markørene har skjermlesertekst
  («opp 2 plasser»).
- Rankgrafen på lagsiden viser en synlig markør når det bare finnes ett
  datapunkt — før var linjen usynlig i runde 1.
- Toppmenyen toner ut på begge kanter når det finnes mer å scrolle til —
  venstrefaden manglet når den aktive siden ble scrollet inn ved sidelast.
- AI-rådgiverkortet på lagsiden har samme cyan AI-markering som
  AI-kortene ellers i appen.
- 404-siden har bare én vei tilbake — knappen — i stedet for både en
  tekstlenke og en knapp.
- Kapteinsvalg-kortet strekkes ikke lenger forbi sitt eget innhold for å
  møte nabokortets høyde.

## [1.3.2] - 2026-08-24

### Changed

- Finpuss på alle sider etter mockupen: hero med rundeetikett, tellere i
  korthodene, kampliste med klokkeslett og merker i briefen, tydeligere
  feilsider.

## [1.3.1] - 2026-08-24

### Added

- Klubbmerker i alle tabeller og lister, og klubbdrakter på banen på
  lagsiden — som på FPL. Bildene er selvhostet; mangler et bilde, vises
  kortnavnet i stedet. Footeren krediterer klubbene og Premier League.

## [1.3.0] - 2026-08-24

### Added

- Mørkt og lyst tema: følger nettleseren automatisk, og en bryter i
  toppmenyen (auto → lys → mørk) husker valget. Ingen blaff i feil tema
  ved sidelast.

### Changed

- Toppmenyen er FPL-lilla i begge temaer.
- Ny palett i FPL-familien (lilla, grønn, cyan, rosa) og FPLs egne
  FDR-farger, som tokens i to temaer. Kontrasten (≥ 4,5:1) er nå låst av
  en test.

## [1.2.5] - 2026-08-24

### Fixed

- Kapteinslista i rundebriefen er ikke lenger vilkårlig ved sesongstart:
  er all form 0, rangeres det på forventet poeng (FPL) som på /lag, og
  minutter-kravet slippes før sesongens første kamp. Briefen oppgir nå
  også hvilket kriterium som rangerte.
- AI-briefen kan ikke lenger friskmelde troppen når skadelista har
  innhold — slike setninger fjernes i etterkontrollen (GW1-funnet «alle
  stiller friske» tross Bruno G. på skadelista).
- Etterkontrollen feller setninger med forvrengte prosenttall: et
  prosenttall som ikke finnes i brief-dataene, men ligger ≤1,0 fra en
  fasitverdi, fjerner setningen (GW1-funnet 32,3 % mot dataenes 32,6 %).

### Changed

- Brief-prompten kaller kapteinslista det den er (høyt eide spillere med
  gunstig kamp — ikke målt kapteinsandel), navngir rangeringskriteriet, og
  har fått en REGLER-seksjon etter mønster fra rådgiveren (v1.2.4).
  Overskriften på /brief heter nå «Kapteinskandidater globalt».

## [1.2.4] - 2026-08-24

### Fixed

- **AI-rådgiveren på /lag dikter ikke lenger begrunnelser.** Prompten
  sender nå fullt datagrunnlag per spiller (form, forventet poeng,
  minutter, totalpoeng, skadestatus med spillesjanse), antall
  ferdigspilte runder, og sidens egne kaptein- og innkjøpsforslag med
  rangeringskriterium — strukturert i seksjoner med harde regler:
  0 minutter = «ingen data ennå», aldri påfunnede tall, aldri flagget
  spiller som kaptein (B-2-funnet fra prod 22. aug).

## [1.2.3] - 2026-08-22

### Fixed

- **Bonuskolonnen på /live viser nå FPLs publiserte bonus.** FPL publiserer
  bonus provisorisk allerede mens kampen pågår, og siden hoppet da over
  bonusen helt for å unngå dobbelttelling — kolonnen sto tom hele kampen.
  Nå vises den publiserte bonusen under og etter kampen, mens BPS-estimatet
  beholdes for vinduet før FPL publiserer noe. «Effektivt» er uendret:
  publisert bonus ligger allerede i poengsummen og legges ikke til på nytt.
  Kolonnen heter nå «Bonus», og hjelpeteksten sier om tallet er bekreftet av
  FPL eller estimert fra BPS.
- **/live regner nå kampen som ferdig ved fløyta.** FPL setter
  `finished_provisional` med én gang kampen er slutt, men `finished` først
  ved rundeprosesseringen neste morgen. Siden leste bare `finished`, så
  statusen sto på «Kamper pågår», kampen viste minuttall i stedet for
  «Slutt», og hver åpne fane fortsatte å polle hele natten. Nå slår statusen
  om til «Ingen kamper pågår» ved kampslutt, og pollingen stopper.

## [1.2.2] - 2026-08-22

### Changed

- **AI-rådgiveren på /lag vet nå hvilken runde rådet gjelder.** Prompten
  oppgir runde og deadline, hvem som er kaptein og visekaptein i laget ditt,
  og hvilken motstander hver spiller møter (hjemme/borte og FDR, begge
  kampene ved dobbeltrunde). Rådgiveren må si eksplisitt om kapteinen bør
  beholdes eller byttes. Antall gratis bytter er ikke tilgjengelig fra
  FPL-API-et uten innlogging, så modellen er instruert om aldri å anta at et
  bytte er gratis — poengkostnaden nevnes kun som forbehold. Ingen nye
  nettverkskall: all kontekst kommer fra data siden allerede henter.

### Fixed

- **/lag sier nå hvilken runde anbefalingene gjelder.** Siden viste «Runde 1»
  i undertittelen mens kaptein- og byttekandidatene hele tiden gjaldt neste
  runde. Anbefalingsseksjonen har fått overskriften «Anbefalinger for Runde
  N». Kapteinsboksen forklarer dessuten når rangeringen bygger på forventede
  poeng i stedet for form, og viser en tomtilstand i stedet for en tom liste
  når ingen i troppen er spilleklare.
- **Kapteinsforslagene på /lag er ikke lenger vilkårlige ved sesongstart.**
  Før første kamp er formen 0.0 for alle, og lista viste da pick-rekkefølgen
  din som om den var en rangering (tre tilfeldige spillere, alle med
  «Form 0.0»). Nå rangeres det på FPLs forventede poeng (`ep_next`) når ingen
  i troppen har form ennå, med begrunnelsen «Forventet poeng (FPL)» i stedet
  for den villedende formlinja. Har ingen i troppen forventede poeng heller —
  for eksempel om alle er skadet — vises tomtilstand framfor en topp 3 uten
  dekning. Så snart minst én spiller har reell form, rangeres det som før.
- AI-briefens etterkontroll kutter ikke lenger setninger midt i norske
  forkortelser («kl.», «f.eks.») eller klokkeslett («21.00») — færre
  feilfjernede setninger, og uriktige deadline-påstander med forkortelse i
  setningen fanges nå.
- AI-briefens etterkontroll gjenkjenner nå lagnavn-varianter («Tottenham»
  for FPLs «Spurs», «Manchester United» for «Man Utd», «Coventry» for
  «Coventry City» osv.) med ordgrenser og genitiv, så uriktige
  deadline-påstander fanges selv når modellen skriver et annet navn enn
  FPL-dataene — uten at lagnavn treffer inni andre ord.

## [1.2.1] - 2026-08-20

### Fixed

- **Ved FPL-nedetid slutter sidene å hamre på API-et.** Når en
  bakgrunnsoppdatering av cachet FPL-data feiler, venter cachen nå 30
  sekunder per nøkkel før neste forsøk (før: nytt forsøk på opptil ~10 s
  ved hver eneste sidevisning). Gamle data serveres umiddelbart som før,
  og et vellykket forsøk nullstiller ventetiden (P3-2)

## [1.2.0] - 2026-08-20

### Added

- **Ny side «Overganger» (/overganger).** For hver overgang du har gjort i
  sesongen: poengene spilleren du hentet faktisk ga, mot poengene spilleren
  du solgte ville gitt, så lenge byttet var i effekt (til spilleren du
  hentet ble solgt videre eller den du solgte hentet tilbake) — minus
  poengstraff. Totalsum, poengstraff og beste/verste bytte øverst. Wildcard-
  og Free Hit-runder merkes (Free Hit måles kun i sin egen runde, siden
  laget reverseres). Før første overgang forklarer siden hva den kommer til
  å måle. Målingen bruker rå spillerpoeng uten benk- og kapteinsvekting —
  det står på siden.

## [1.1.3] - 2026-08-20

Kvalitetspass: 29 verifiserte funn fra en full kodegjennomgang, rettet med
tester. Ingen nye funksjoner — alt handler om at det som finnes ikke svikter.

### Fixed

- **Sidene krasjer ikke lenger når troppen inneholder en spiller FPL har
  fjernet.** Picks (5 min cache) og bootstrap (15 min cache) kan komme i
  utakt; da svarte /live, /lag, /brief og `/api/*.json` 500. Ukjente
  pick-elementer droppes nå med en logglinje, og resten av troppen vises (P0-1)
- **Discord-briefen deles riktig opp.** Chunkeren kunne sende en tom melding
  eller en over Discords 2000-tegnsgrense; begge gir 400, og da ble briefen
  aldri fullført — neste sjekk re-postet de første delene. Lange avsnitt uten
  linjeskift splittes nå på ordgrense, og tomme meldinger oppstår ikke (P0-2)
- **Live-siden våkner av seg selv.** Pollingen startet bare hvis kamper alt
  pågikk da siden ble lastet, og stoppet for godt ved første pause — en fane
  åpnet før avspark, eller i pausen mellom lørdagskampene, frøs. Nå settes ett
  vekkesignal ved neste avspark, og 60-sekunderspollingen starter og stopper
  med kampene. Rundens kamper caches i 1 minutt (som live-dataene), så
  stillinger og kampklokke henger ikke opptil et kvarter etter (P0-3)
- **Én rar dato i en RSS-feed tømmer ikke lenger nyhetslisten.** En `pubDate`
  som ikke lot seg tolke kastet, og da forsvant alle sakene fra den kilden.
  Saken beholdes nå uten tidsstempel (P0-4)
- **Auto-briefen kan ikke lenger sendes to ganger fordi sjekk-intervallet
  tikker midt i en pågående sending** (P1-6), og vinduet der en redeploy kan
  re-poste briefen er strammet inn fra 1 time til 15 minutter, med logglinje
  når det inntreffer (P1-5)
- **Feil på `/api/*` svarer JSON i stedet for en HTML-feilside.** Klienten
  leste svaret som JSON og viste «Nettverksfeil» uansett hva som gikk galt;
  nå kommer den faktiske feilmeldingen fram (P1-7)
- **Feilende AI-kall gjentas ikke i det uendelige.** Ved feil eller tomt svar
  ventes det fem minutter før nytt forsøk; tidligere fyrte hvert sidebesøk på
  /nyheter og /brief et nytt betalt kall så lenge feilen varte (P1-8)
- **`/health` svarer umiddelbart selv om FPL henger.** Proben ventet tidligere
  på et FPL-kall med retry-stige (opptil ~30 s), noe som kunne gi Coolify en
  restart-loop. Ligatallet leses nå fra siste kjente verdi og oppdateres i
  bakgrunnen (P1-9)
- **`?v=`-parameteren gir bare evig cache for versjoner serveren faktisk
  serverer.** Tidligere holdt det at verdien så riktig ut, slik at en gammel
  container under en deploy kunne få Cloudflare til å låse utdaterte filer
  under den nye adressen (P1-10)
- **Tvilsomme spillere («Usikker») regnes ikke lenger som sikre startere.**
  Uten publisert spilletidsprosent ga status `d` full sannsynlighet, så
  spilleren kunne dukke opp som kapteinsforslag med «Full spilletid ventet».
  Nå brukes FPLs egen konvensjon på 75 % (P1-11)
- **Skadenytt er norsk også i rundebriefen, Discord-meldingen og AI-prompten.**
  «Hamstring injury - Expected back 21 Aug» sto tidligere på engelsk midt i
  den norske teksten; oversettelsen skjer nå i kilden (P1-12)
- **Nye engelske skadefraser fra FPL logges også i produksjon** (én gang per
  tekst), slik at manglende oversettelser oppdages der de faktisk vises (P1-13)
- **Bonusestimatet forsvinner ikke i dobbel runde.** Bekreftet bonus fra en
  ferdigspilt kamp skjulte estimatet for kampen som pågikk; estimatene summeres
  nå per spiller og telles aldri dobbelt (P1-14)
- **Spillerlista og dashbordet viser samme statustekst.** «Utilgjengelig» ble
  vist som «Utilgj.» på /spillere fordi teksten fantes i to kopier (P2-2)
- **Rundebriefen viser avsluttet sesong i stedet for runde 1-data** når det
  ikke finnes en kommende runde (P2-4)

### Changed

- **Forretningslogikken er flyttet ut av rutene** til `services/brief.js` og
  nye `services/live.js`, og AI-briefen genereres av én delt `generateAiBrief()`
  som /brief og auto-briefen deler — de kunne før divergere stille. Ikke
  synlig i UI-et, men payloaden på `/api/live.json` har mistet tre ubrukte
  felter (`pos`, `multiplier`, `updatedAt`) og fått `nextKickoff` (P2-1)
- **FDR-snittene bygges én gang per kall** i stedet for én full skann av
  kamplista per kandidat (P2-3)

## [1.1.2] - 2026-08-20

Rettelser etter visuell QA av v1.1.1 i prod (1440 px og 390 px).

### Changed

- **AI-briefen bes eksplisitt om norske fotballuttrykk** («holdt nullen»
  i stedet for «clean sheet», «runde» i stedet for «gameweek»). Kun
  promptjustering — genereringslogikken er uendret (QA v1.1.1, P4)

### Fixed

- **Skadestatus fra FPL oversettes helt, ikke halvveis.** «Unspecified
  injury», «Arm/Muscular injury», «Lack of match fitness», «Suspended until
  <dato>», «has returned to <klubb>» og lånevarianter («on loan for the rest
  of the season» → «på lån ut sesongen», «on loan until <dato>») dekkes nå —
  verifisert mot alle 72 unike `news`-strenger i bootstrap-static. Nye
  engelske fraser gir `console.warn` i dev (QA v1.1.1, P3)
- **Engelsk UI-tekst er oversatt.** «Dashboard» → «Dashbord» (meny + tittel),
  «Overall rank» → «Totalrangering», «Gameweek» → «Runde»/«Rundebrief» overalt
  (også i Discord-headeren og AI-prompten), «PPG» → «P/K» med forklarende
  tooltip, statusmerket «OK» → «Klar», «dashboardet» → «dashbordet».
  Ordet «deadline» beholdes bevisst og konsekvent — det brukes i dagligtale,
  og `sanitizeBriefText` kontrollerer AI-tekst mot nettopp det ordet
  (QA v1.1.1, P2) Halve navigasjonen lå
  utenfor skjermen på 390 px uten noe hint. Kantfaden vises nå kun på siden
  med mer innhold, lenkene snapper på plass (`scroll-snap`), og den aktive
  lenken scrolles fortsatt inn i syne ved sidelast (QA v1.1.1, P1-2)
- **Mørk scrollbar i tabellbokser.** Chrome tegnet lys standard-scrollbar
  inne i de mørke `.table-scroll`-boksene (godt synlig på /spillere).
  Scrollbaren matcher nå temaet i både Firefox og WebKit (QA v1.1.1, P1-1)

## [1.1.1] - 2026-08-20

Rettelser etter ekstern QA av v1.1.0. Viktigst: assets versjoneres, slik at
v1.1.0-designet faktisk blir synlig i prod.

### Fixed

- **Assets versjoneres med innholdshash** (`/style.css?v=<hash>`). Cloudflare
  serverte utdatert CSS og JS etter deploy, slik at hele v1.1.0-designet var
  usynlig i prod. Versjonerte URL-er caches for alltid (`immutable`),
  uversjonerte får `no-cache`. Fonten versjoneres manuelt (`?v=1`) i både
  preload-lenken og `@font-face` (P0-1)
- **Tabellhodet legger seg ikke lenger under toppmenyen.** Tabellene på
  dashbordet, /liga, /live og /brief flyter nå med siden i stedet for å ha egen
  vertikal scroll. Den lange spillertabellen beholder scrollboksen, men hele
  boksen festes under menyen (`--topbar-h`) med plass til footeren (P0-2)
- **Dashbordet presenterer ikke tomme datasett som rangeringer.** «Toppform»,
  «Mest kjøpt» og «Mest solgt» viste en vilkårlig sortering av spillere med
  form 0 og 0 overganger. Listene er nå tomme når datagrunnlaget er null, og
  kortene forklarer hvorfor (P1-1)
- **/liga forklarer tomme ligatabeller,** og ingressen «Klikk på et lag …»
  vises bare når minst én liga har rader å klikke på (P1-2)
- **/health teller ligaene brukeren faktisk får se.** Feltet `leagues` telte
  bare `LEAGUE_IDS`, mens /liga auto-oppdager ligaene fra laget. Begge bruker
  nå `resolveLeagueIds()`, med fallback til config-antallet hvis FPL er nede
  (P1-2)
- **AI-merket brekker ikke over to linjer,** og klokkeslettet ved siden av
  vises uten sekunder («generert 21:04») (P1-3)
- **AI-briefen motsier ikke lenger kampdataene.** Modellen regnet selv ut hva
  som ble spilt før deadline og bommet. Briefen beregner nå fasiten
  (`beforeDeadline` per kamp), sender den til modellen som forhåndsberegnede
  tidsfakta, og fjerner setninger som påstår noe annet — både på /brief og i
  auto-briefen til Discord (P1-4)
- **AI-nyhetspunktene er etterprøvbare.** Sakene på /nyheter viser nå ingressen
  fra RSS-en, prompten forbyr detaljer som ikke står i sakene, og punkter som
  ikke deler et eneste egennavn med noen sak forkastes før de vises (P1-5)
- **Samme nyhetssak vises ikke flere ganger.** Saker dedupliseres på
  normalisert lenke (uten sporingsparametre) og normalisert tittel (P1-6)
- **Tabelloverskriftene er lesbare.** De sto i `--text-faint` (3,8:1 mot
  kortbakgrunnen) og bruker nå det nye tokenet `--dim-strong` (5,3:1) (P1-7)
- **FDR-4-ruten har lesbar tekst.** Fargen er mørknet fra `#d24069` til
  `#bd3a5f` (4,6:1 mot hvit tekst), fortsatt tydelig skilt fra FDR-5 (P2-1)
- **Skadetekstene på dashbordet er på norsk.** «Ukens flagg» oversetter FPL-ens
  engelske statustekst («Ankle injury - 75% chance of playing» →
  «Ankelskade – 75 % sjanse for spilletid»), inkludert overganger, utlån,
  utestengelser og forventet retur. Ukjente mønstre vises uendret (P2-2)
- **Ord brekkes ikke midt inne** på skjermer under 480 px — bare ord som ikke
  får plass brekkes, med orddeling (P2-3)
- **FDR-matrisen viser flere runder på mobil.** Lagets fullnavn skjules visuelt
  (skjermlesere får det fortsatt) og cellene er strammere under 480 px (P2-4)
- **Statstripa på /lag lyver ikke om tall som mangler.** «Totalt» og «Overall
  rank» viste tall fra forrige sesong før troppen finnes — nå står det `–` i
  hele stripa (P2-5)
- **Undertittelen på /lag skriver ikke «Gameweek –»** — leddet utelates helt
  når det ikke finnes en runde å vise (P2-6)
- **Dashbordets fire kort ligger 2 × 2 på brede skjermer** i stedet for tre på
  første rad og ett alene på den andre (P2-8)

### Added

- `DEPLOY.md`: deploy-flyt, asset-cache-reglene og engangssteget for
  Cloudflare-purge

### Removed

- `--text-faint` — tabellhodene var eneste bruker, og de er flyttet til
  `--dim-strong`

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
