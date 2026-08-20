# Changelog

Alle vesentlige endringer i prosjektet dokumenteres i denne filen.

Formatet følger [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
og prosjektet følger [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- **Feilende AI-kall gjentas ikke i det uendelige.** Ved feil eller tomt svar
  ventes det fem minutter før nytt forsøk; tidligere fyrte hvert sidebesøk på
  /nyheter og /brief et nytt betalt kall så lenge feilen varte (P1-8)
- **Auto-briefen kan ikke lenger sendes to ganger fordi sjekk-intervallet
  tikker midt i en pågående sending** (P1-6), og vinduet der en redeploy kan
  re-poste briefen er strammet inn fra 1 time til 15 minutter, med logglinje
  når det inntreffer (P1-5)
- **Skadenytt er norsk også i rundebriefen, Discord-meldingen og AI-prompten.**
  «Hamstring injury - Expected back 21 Aug» sto tidligere på engelsk midt i
  den norske teksten; oversettelsen skjer nå i kilden (P1-12)
- **Tvilsomme spillere («Usikker») regnes ikke lenger som sikre startere.**
  Uten publisert spilletidsprosent ga status `d` full sannsynlighet, så
  spilleren kunne dukke opp som kapteinsforslag med «Full spilletid ventet».
  Nå brukes FPLs egen konvensjon på 75 % (P1-11)
- **Nye engelske skadefraser fra FPL logges også i produksjon** (én gang per
  tekst), slik at manglende oversettelser oppdages der de faktisk vises (P1-13)
- **Live-siden viser stillinger og kampklokke uten opptil 15 minutters
  forsinkelse.** Rundens kamper caches nå i 1 minutt (som live-dataene);
  hele sesongens kampliste caches fortsatt i 15 minutter (P0-3, del 1)
- **Én rar dato i en RSS-feed tømmer ikke lenger nyhetslisten.** En `pubDate`
  som ikke lot seg tolke kastet, og da forsvant alle sakene fra den kilden.
  Saken beholdes nå uten tidsstempel (P0-4)
- **Discord-briefen deles riktig opp.** Chunkeren kunne sende en tom melding
  eller en over Discords 2000-tegnsgrense; begge gir 400, og da ble briefen
  aldri fullført — neste sjekk re-postet de første delene. Lange avsnitt uten
  linjeskift splittes nå på ordgrense, og tomme meldinger oppstår ikke (P0-2)

### Fixed

- **Sidene krasjer ikke lenger når troppen inneholder en spiller FPL har
  fjernet.** Picks (5 min cache) og bootstrap (15 min cache) kan komme i
  utakt; da svarte /live, /lag, /brief og `/api/*.json` 500. Ukjente
  pick-elementer droppes nå med en logglinje, og resten av troppen vises (P0-1)

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
