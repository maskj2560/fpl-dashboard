# Økt-prompt til Fable — planlegg v1.14.0 «Funksjonssveip»: ubrukte FPL-felt → funksjoner → kjøreprompt til Opus

> Skrevet 4. september 2026 (økt 60, Opus) etter at v1.13.2 «UX-polering 2» var
> i prod. Marius valgte retning B, notert siden økt 57 som «funksjonssveip mot
> ubrukte FPL-felt» — den eneste linja som overlevde på disk (`git show
> e63bd4b:docs/prompt-sikkerhetsnett-v1131.md:422`); selve A–D-gjennomgangen
> ble aldri skrevet ned. Denne Fable-økten **planlegger** (kartlegging +
> Marius' valg) og leverer en **kjøreprompt til Opus** som bygger. Prompten er
> konsumert når `docs/prompt-feltpakka-v1140.md` er committet — da slettes
> denne fila (git bevarer den).

## Slik brukes den

Lim inn blokka under «Prompten» i et nytt Fable-vindu i plan-modus. Økten
skriver **0 kode**: den kartlegger, verifiserer, foreslår, får Marius' valg og
skriver kjøreprompten. Alle premisser under er målt 4. sep mot live FPL-API og
`main` = `0862fb4` (v1.14.0 ikke startet) — linjenumre kan ha flyttet seg,
verifiser før du siterer dem.

## Fasit (besluttet av Marius 4. sep, økt 60 — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Hva B er | FPL-API-et gir langt mer enn appen bruker. Sveipen går gjennom **feltene appen ikke leser**, finner hvilke som er ekte funksjonalitet vi mangler, og bygger dem. Ikke felt for feltets skyld. |
| Form | kartlegging → funn-tabeller → Marius velger i puljer (AskUserQuestion, maks 4 per pulje, «Bygg (Anbefalt)» først) → kjøreprompt til Opus. Samme rytme som v1.13.2. |
| Omfang | **én minor, 5–8 funksjoner.** Hvert punkt er større enn en v1.13.2-fiks: en ny seksjon, kolonne eller kort — men fortsatt ≤ ~2 timer for Opus. Er det flere gode kandidater, si det og la Marius kutte. |
| Plassering | **kun berike de ni sidene som finnes.** Ingen nye ruter, ingen tiende nav-lenke — nav-en har alt 9 lenker og var akkurat trang på mobil (265 px av 596 etter v1.13.2). En idé som krever egen side → «Senere / idéer». |
| Datakilder | **kun felt fra endepunkter appen alt kaller** (lista under). **0 nye FPL-kall.** Nye endepunkter (`event-status/`, `set-piece-notes/`, h2h-ligaer …) → «Senere / idéer», aldri i denne pakka. |
| Versjon | **v1.14.0** (minor) «Funksjonssveip». Én branch `feat/funksjonssveip-v1140`, én push, tag `v1.14.0`. |
| Leveranse fra denne økten | `docs/prompt-feltpakka-v1140.md` — kjøreprompt til Opus i samme form som `git show 162ca4d:docs/prompt-ux-polering-v1132.md` (fasit, målte premisser med fil:linje, T-tasks med testnavn, feller, ferdigkriterier). Pluss ROADMAP § 8 og HANDOVER ajour. |
| Rammer | 0 AI-kall, 0 nye avhengigheter, 0 Discord-meldinger, ingen ny modul uten god grunn. Design-reglene i CLAUDE.md gjelder (tokens i BEGGE temaer, kontrast låst av `test/style.test.js`, CSP uten inline-script/`on*`, `<caption>`/`aria-label`/etiketter, 390 px er referansen, bevegelse bak `prefers-reduced-motion`). Playwright kun i scratchpad. |
| Utelatt for alltid | spillerbilder (`photo`-feltet frister — nei, Marius' fasit 1. sep), e-post, nye AI-funksjoner. |
| Spørsmål til Marius | funn-puljene ER spørsmålene. Utover det: kun hvis noe bryter fasiten — ett spørsmålssett, anbefaling først. |

## Målte premisser (4. sep 2026, mot live FPL-API + `main` = `0862fb4`)

### Tilstand

v1.13.2 i prod 4. sep 04:57. `npm test` → **809/809**, lint 0. Asset-hash
`781ffae6`. ROADMAP § 0, § 5, § 6 og § 7 er ferdige — køen er tom.

### Endepunktene appen alt kaller (`src/services/fplClient.js`)

Alt under er lovlig kildemateriale. Alle er cachet; å lese flere felt fra et
svar vi allerede henter koster **null** ekstra kall.

| Funksjon | Endepunkt | TTL |
| --- | --- | --- |
| `getBootstrap` | `bootstrap-static/` | 15 min |
| `getFixtures` | `fixtures/` | (se fila) |
| `getElementSummary` | `element-summary/{id}/` | 30 min — **kun lazy per klikk, aldri i bulk** |
| `getEntry` | `entry/{id}/` | 5 min |
| `getEntryHistory` / `…Historic` | `entry/{id}/history/` | 5 min / 6 t |
| `getEntryTransfers` | `entry/{id}/transfers/` | 5 min |
| `getPicks` / `getPicksHistoric` | `entry/{id}/event/{gw}/picks/` | 5 min / 6 t |
| `getLive` / `getLiveHistoric` | `event/{gw}/live/` | 1 min / 6 t |
| `getDreamTeam` | `dream-team/{gw}/` | 6 t |
| `getLeagueStandings` | `leagues-classic/{id}/standings/` | (se fila) |

### Hvor mye som ligger ubrukt (målt: feltnavn mot `git grep` over `src`, `views`, `public`)

| Kilde | Felt | Ubrukt |
| --- | --- | --- |
| `bootstrap.elements[]` | 109 | **73** |
| `bootstrap.events[]` | 29 | **19** |
| `bootstrap.teams[]` | 22 | **13** |
| `element-summary.history[]` | 41 | **19** |
| `element-summary.history_past[]` | 31 | **21** |
| `element-summary.fixtures[]` | 14 | 2 |
| `event/{gw}/live.elements[].stats` | 29 | **18** |
| `event/{gw}/live.elements[].explain` | — | **hele feltet** |
| `fixtures[]` | 17 | 2 |
| `entry/history.current[]` | 13 | 3 |
| `entry/history.past[]` | 4 | 1 |

Ubrukte toppnivå-nøkler i bootstrap: `game_settings`, `game_config`, `phases`,
`total_players`, `element_stats`, `element_types`.

**Om metoden:** «ubrukt» = feltnavnet finnes ikke som delstreng noe sted i
`src`/`views`/`public`. Den retningen er pålitelig. «Brukt» kan derimot være
falsk positiv (`code` treffer alt mulig) — men ikke alltid: `most_captained`
ser ut som en åpenbar kandidat og **er allerede i bruk** i `insights.js`
(kapteinsfasitens «global favoritt»). **Verifiser hvert funn med grep før du
foreslår det.** Det var akkurat denne fella i v1.7.1: to av tolv «funn» fantes
alt.

### Ubrukte felt i `bootstrap.elements[]` (alle 73, målt)

```
can_transact, can_select, chance_of_playing_this_round, cost_change_event,
cost_change_event_fall, cost_change_start_fall, price_change_percent,
price_change_hourly_rate, price_change_projections, price_change_locked_until,
price_change_calibrating, dreamteam_count, ep_this, news_added, photo, removed,
squad_number, value_form, value_season, known_name, region, team_join_date,
birth_date, has_temporary_code, opta_code, clean_sheets, goals_conceded,
own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves,
influence, creativity, threat, ict_index, clearances_blocks_interceptions,
recoveries, tackles, defensive_contribution, expected_goal_involvements,
expected_goals_conceded, corners_and_indirect_freekicks_text,
direct_freekicks_text, penalties_text, scout_risks, scout_news_link,
influence_rank, influence_rank_type, creativity_rank, creativity_rank_type,
threat_rank, threat_rank_type, ict_index_rank, ict_index_rank_type,
expected_goals_per_90, saves_per_90, expected_assists_per_90,
expected_goal_involvements_per_90, expected_goals_conceded_per_90,
goals_conceded_per_90, now_cost_rank, now_cost_rank_type, form_rank,
form_rank_type, points_per_game_rank, points_per_game_rank_type, selected_rank,
selected_rank_type, starts_per_90, clean_sheets_per_90,
defensive_contribution_per_90
```

### Ti kandidater jeg så underveis (seed, ikke fasit — verifiser og utvid)

1. **Prisprognose** (`price_change_percent`, `price_change_hourly_rate`,
   `price_change_projections`, `price_change_locked_until`). Målt på Raya:
   `pct 7.4`, `rate -141`, og FPLs egen prognose 0/1/2 døgn fram med
   `likelihood`. Dagens `prices.js` sier «Haaland steg i natt» — dette sier
   «stiger sannsynligvis i natt». Eier: `/overganger` prisvarsel-kortet.
2. **`scout_risks`** — strukturerte varsler per runde. Ekte eksempel fra
   API-et: `{"property":"loan_ineligible","gameweek":16,"notes":"This player
   will not be available to face their parent club…"}`. Lagsjekken på /brief
   fanger skade, karantene og kampløse — men ikke låneklausuler.
3. **`defensive_contribution`** (+ `_per_90`) — ny poenggivende statistikk i
   2025/26. **313 spillere har verdi.** Finnes i bootstrap (altså gratis for
   /spillere-tabellen), i `element-summary.history` og i live-stats.
4. **Kort, redninger, bommede straffer** (`yellow_cards`, `red_cards`, `saves`,
   `penalties_saved`, `penalties_missed`, `own_goals`, `clean_sheets`,
   `goals_conceded`) — helt fraværende fra spillerkortet, som i dag viser
   Form/Poeng/P/K/xG/xA.
5. **`live.elements[].explain`** — FPLs egen poengoppdeling per spiller per
   kamp («2 for 60+ min, 4 for mål, −1 for kort»). /live viser summen, aldri
   hvorfor. Kilde: `getLive`/`getLiveHistoric`, alt hentet.
6. **«Runden i tall»** fra `bootstrap.events[]`. Målt for runde 1:
   `average_entry_score 50`, `highest_score 131`, `most_selected 411`,
   `top_element_info {id:115, points:17}`, `chip_plays [{bboost: 814 606},
   {3xc: 250 816}]`, `ranked_count 8 903 411`. Eier: /brief eller /.
   `most_transferred_in` og `most_vice_captained` ligger i samme objekt.
7. **`percentile_rank`** i `entry/history.current[]` — «du var i topp X %
   denne runden», per runde. /innsikt eller /.
8. **Lagstyrke** (`strength_attack_home`, `strength_defence_away`,
   `strength_overall_*` i `bootstrap.teams[]`) — FDR i dag er fixtures'
   `difficulty` alene. Styrketallene gir en rikere motstanderanalyse på /lag
   eller i rival-radaren.
9. **Rank-feltene** (`form_rank_type`, `now_cost_rank_type`, `ict_index_rank`
   …) — «nr. 4 av alle midtbaner på form» er billigere å lese enn å sortere
   seg fram til. /spillere eller spillerkortet.
10. **`start_cost` / `end_cost`** i `element-summary.history_past[]` —
    prisreisen per sesong i spillerkortet, ved siden av karrieretallene.

**Ikke bland kort inn i (3)/(4):** `element_stats` (toppnivå, ubrukt) er FPLs
egen liste over de 26 statistikknavnene med etiketter — nyttig hvis en seksjon
skal navngi statistikker uten hardkodede norske strenger.

### Feller å kjenne før du foreslår

- **`element-summary` hentes ALDRI i bulk.** CLAUDE.md er tydelig: /spillere
  koster 0 slike kall, kortet henter lazy per klikk via `GET /api/spiller/:id`.
  Alt som skal vises for *alle* spillere må komme fra `bootstrap.elements[]`.
  Alt som bare skal vises i spillerkortet kan bruke element-summary gratis
  (samme kall som alt gjøres).
- **Tidlig i sesongen er mange felt 0 eller tomme.** GW3 spilles 4.–7. sep.
  Sjekk faktiske verdier i API-svaret, ikke bare at feltet finnes — et kort som
  viser «0» for alle er ikke en funksjon. Rapporter hvor mange spillere som har
  verdi (som `defensive_contribution`: 313).
- **`price_change_*`-feltene er nye og udokumenterte.** Mål dem over tid hvis
  du kan, og si i planen hvor sikker tolkningen er. `likelihood` hadde negative
  verdier i målingen (Arrizabalaga: `-4`) — betydningen er ikke åpenbar.
- **`photo`, `birth_date`, `region`, `squad_number`, `team_join_date`,
  `known_name`, `opta_code`** — spillerbilder er utelatt for alltid; resten er
  pyntedata uten beslutningsverdi. Ikke foreslå dem.
- **Alt som allerede finnes:** `most_captained` (insights.js), `in_dreamteam`,
  `cost_change_start`, `transfers_in_event`. Grep før du foreslår.
- **Ingen nye AI-funksjoner.** Et felt kan mate en eksisterende AI-prompt
  (f.eks. briefen), men det skal ikke bli et nytt AI-kall.

### Lokal kjøring

`config.js` kjører `process.loadEnvFile()` som leser repoets `.env`
(prod-nøkler!). Start fra **Git Bash** — PowerShell sletter tomme
`$env:`-variabler:

```
ANTHROPIC_API_KEY= DISCORD_WEBHOOK_URL= PORT=3457 DATA_DIR=<scratchpad>/data node src/server.js
```

Bevis før noe annet: `/health` → `"ai":false,"discord":false`. Klikk ALDRI
«Spør AI om råd» på /lag. Å hente FPL-API-et direkte med curl er lov og gratis
— send nettleser-lignende `User-Agent`, ellers avvises kallet.

### Docs

CRLF i arbeidstreet — Edit-verktøyet, aldri `sed -i`. HANDOVER-tak **200
linjer** (den er 200 nå) — roter til `docs/arkiv/HANDOVER-historikk.md` FØR du
legger til noe.

### Kalender

GW3 spilles fredag 4. sep 21:00 og gjennom helgen. Denne økten pusher
ingenting: docs-commiten venter til Opus pusher v1.14.0 (hver deploy koster
2 AI-kall).

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 8 peker hit). Kjør
`git status -sb` og `npm test` + `npm run lint` som baseline: forventet
809/809 og lint 0 på v1.13.2. Fasiten i docs/prompt-feltsveip-v1140.md er
besluttet av Marius 4. sep — ikke re-spør den: én minor med 5–8 funksjoner,
kun berikelse av de ni sidene som finnes, kun felt fra endepunkter appen alt
kaller. Denne økten skriver 0 kode og gjør 0 AI-kall: den kartlegger,
verifiserer, foreslår, får Marius' valg og leverer
docs/prompt-feltpakka-v1140.md som kjøreprompt til en Opus-økt.

Steg 1 — hent fasit fra API-et. Hent hvert endepunkt i premiss-tabellen med
curl til scratchpad (nettleser-User-Agent), og lag din egen felt-diff mot
kodebasen — ikke stol på tallene i prompten, reproduser dem. For hvert
ubrukt felt: datatype, faktisk verdi i dag, og hvor mange spillere/runder
som har en verdi (et felt som er 0 for alle er ikke en funksjon i
september). Legg tabellene i scratchpad, ikke i repoet.

Steg 2 — kartlegg hvor de hører hjemme (Explore-agenter). Én agent per
seksjon: (a) /spillere + spillerkortet + players.js, (b) /live + live.js +
app.js Modul 3, (c) /brief + /innsikt + /lag + de tilhørende servicene,
(d) /overganger + prices.js + pricing.js. Agentene returnerer fil:linje for
hvor et nytt felt ville festes: hvilken service som bygger dataen, hvilket
view som viser den, hvilken eksisterende test som låser området. Ikke
filinnhold.

Steg 3 — funn. Én tabell: nr | felt(ene) | kilde (endepunkt) | hva brukeren
får (én setning) | side | eier (fil:linje) | kostnad (S = ett view + én
service-funksjon, M = to–tre filer, L = for stort → Senere) | dekning
(hvor mange spillere/runder har verdi i dag). Hvert funn skal være verifisert
med grep mot koden — «finnes trolig ikke» er ikke godt nok, det var fella i
v1.7.1 der to av tolv funn allerede fantes. De ti kandidatene i prompten er
et startpunkt, ikke en fasit: stryk dem som ikke holder, og legg til det du
finner selv.

Steg 4 — Marius velger. Presenter i AskUserQuestion-puljer på maks 4, størst
brukerverdi først, hver med «Bygg (Anbefalt)» / «Dropp» (pluss en ekte
variant der det finnes en — f.eks. «i spillerkortet» mot «som kolonne i
tabellen»). Sikt på 5–8 valgte totalt. Alt som blir L eller krever ny
side/nytt endepunkt: egen liste til «Senere / idéer».

Steg 5 — kjøreprompten. Skriv docs/prompt-feltpakka-v1140.md for Opus, samme
skjelett som `git show 162ca4d:docs/prompt-ux-polering-v1132.md`:
(a) fasit-tabell med Marius' valg (nummerert liste over funksjonene, hva som
ble droppet, hva som gikk til Senere/idéer); (b) målte premisser per funksjon
— feltnavn, endepunkt, faktiske verdier fra Steg 1, service/view/test med
fil:linje, og hvilken cache-nøkkel dataen kommer fra; (c) T-tasks per
funksjon, hver med rød test først (services har rene funksjoner → egen
test-fil eller eksisterende; views.test.js for markup, app-client.test.js for
klientlogikk, style.test.js for tokens, app.test.js for status/nonce — nye
assertions, ikke nye rammer) og en linje om hva Opus skal se i nettleseren
ved 390 px i begge temaer; (d) feller (element-summary aldri i bulk, 0 nye
FPL-kall, CRLF, CSP/`on*`, tokens i BEGGE temaer, asset-hashen endres hvis
public/ røres, `<script`-telling på / er 2, prefers-reduced-motion, tomme
felt tidlig i sesongen må ha en tomtilstand); (e) ferdigkriterier (≥ 809
tester, lint 0, kildelåsen i test/routes.test.js uendret grønn, branch
feat/funksjonssveip-v1140 merget --no-ff, tag v1.14.0, deploy-vindu-sjekk —
aldri under kamp (`/api/live.json` → anyLive false), aldri torsdag 19–21 —
prod-sjekk: footer v1.14.0, `<script` = 2 på /, /health 200 med aiStats, ny
asset-hash notert i HANDOVER, 9 sider 200, CI grønn på Node 22 og 24);
(f) «Etter økten». Ta med Steg 1-tallene så Opus kan skrive tomtilstander som
stemmer med virkeligheten.

Steg 6 — docs. ROADMAP: nytt § 8 med hva/eier/blokkert av/status/størrelse,
versjonsplan-rad for v1.14.0, dokumentkart-rad for den nye prompten, og
Senere/idéer-kandidatene lagt under «Senere / idéer» (de sniker ikke i køen).
HANDOVER: «Neste steg» peker på § 8 og prompten, loggpost for økten, ≤ 200
linjer (den er 200 — roter først). Slett denne prompten (`git rm
docs/prompt-feltsveip-v1140.md`) og fjern dokumentkart-raden dens. Én
docs-commit, IKKE push — Opus pusher sammen med v1.14.0.

Regler hele økten: CLAUDE.md er fasit. Edit-verktøyet på docs (CRLF). Bevis
før påstand: vis kommandoen og linjene (curl-svaret, feltverdiene, /health,
testtallet). Ett spørsmålssett om gangen, anbefaling først. Stopp ved ~95 %
usage med HANDOVER oppdatert om hvilket steg som er ferdig og hvor
funn-tabellene ligger.
```

## Ferdigkriterier for Fable-økten

- Felt-diff reprodusert mot live API for alle endepunktene i premiss-tabellen,
  med faktiske verdier og dekningstall — ikke bare feltnavn.
- Funn-tabell der hvert punkt er verifisert med grep mot koden (fil:linje) og
  har en setning om hva brukeren faktisk får.
- Marius' valg registrert per funn (Bygg / Dropp / Senere), 5–8 valgte.
- `docs/prompt-feltpakka-v1140.md` committet med fasit, premisser, T-tasks med
  testnavn, feller og ferdigkriterier.
- ROADMAP § 8 + versjonsplan + dokumentkart + Senere/idéer ajour; HANDOVER
  ≤ 200 linjer med peker og loggpost; denne prompten slettet.
- 0 kode i `src/`, `views/`, `public/`; 0 AI-kall (bevist med `/health` →
  `ai:false` før første sidevisning); ingenting pushet.

## Etter økten

- Marius limer `docs/prompt-feltpakka-v1140.md` inn i en Opus-økt som bygger
  v1.14.0, pusher og gjør prod-sjekk.
- Stoppet underveis: HANDOVER skal si hvilket steg (1–6) som er ferdig og hvor
  funn-tabellene ligger — neste økt fortsetter derfra.
- Etter B gjenstår **D** fra økt 57: slanking av `style.css` (2500+ linjer) og
  `app.js` (1350+ linjer). Ikke besluttet.
