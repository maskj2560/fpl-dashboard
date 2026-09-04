# Økt-prompt til Opus — v1.14.0 «Funksjonssveip»: åtte funksjoner på FPL-felt appen ikke leser

> Skrevet 4. september 2026 (økt 61, Fable) etter kartleggingen av alle
> FPL-endepunktene appen alt kaller. Planprompten som styrte kartleggingen er
> konsumert og slettet (git bevarer den: `git show
> 2347ea1:docs/prompt-feltsveip-v1140.md`). Felt-diffen ble reprodusert mot
> live API 4. sep 04:18 UTC (73 av 109 element-felt ubrukt — stemmer), fire
> Explore-agenter ga fil:linje for festepunktene, ti funn ble verifisert med
> grep, og Marius valgte «Bygg» på alle ti i tre puljer; F + G + J er slått
> sammen til én T-task. Denne prompten er konsumert når v1.14.0 er i prod — da
> slettes fila (T9), og git bevarer den.

## Slik brukes den

Lim inn blokka under «Prompten» i en ny Opus-økt i plan-modus. Økten skal
**verifisere premissene, skrive planen, få den godkjent av Marius, så bygge**.
Ingen kode før godkjenning. Alle premisser under er målt 4. sep 2026 på
`main` = `2347ea1` (v1.13.2 + docs) og mot live FPL-API — linjenumre kan ha
flyttet seg, og API-tallene endrer seg for hver runde. Verifiser mot koden og
et ferskt curl-svar før du siterer dem.

## Fasit (besluttet av Marius 4. sep, økt 61 — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Form | **én minor, åtte funksjoner** (T1–T8), hver en ny seksjon/kolonne/kort på en side som finnes. Ingen nye ruter, ingen tiende nav-lenke, ingen nye FPL-endepunkter — kun felt fra svar appen alt henter og cacher. **0 nye FPL-kall.** |
| Funksjonene | **T1** Prisprognose på /overganger (A) · **T2** Poengoppdeling på /live (B) · **T3** «Runden i tall» på / (C) · **T4** «Topp X %» på /lag (D) · **T5** Forsvarsbidrag som kolonne på /spillere + linje i kortet (E) · **T6** Spillerkort-pakka: statrad per posisjon, rank blant posisjonen, tidligere sesonger med prisreise, nyhetsdato og kilde (F + G + J) · **T7** Låneklausul i Lagsjekk + nyhetsdato i Lagsjekk og Ukens flagg (H + J) · **T8** «Dine plasseringer» på /liga (I). |
| Varianter Marius valgte | A: eget kort under Prisendringer (ikke slått sammen). B: utvidbar i navnecellen (ikke alltid synlig). C: kort på / (ikke /innsikt). D: hero-tall OG tabell under rankgrafen. E: kolonne OG kortlinje. F: med rank-linja. G: sesongtabell OG pris-kolonne i Siste kamper. H: Lagsjekk + Discord-tekst + kort. J: dato i kort, Lagsjekk og Ukens flagg; ekstern lenke kun i kortet. |
| Strøket (verifisert, ikke re-foreslå) | lagstyrke (`strength_attack_*`/`strength_defence_*` er **0 for alle 20 lag**), `chance_of_playing_this_round`/`ep_this` (gjelder den spilte runden), `automatic_subs` (0/1 hos Marius; baseline.js simulerer selv), `phases`/`active_phases` (krever `standings/?phase=N`), `game_settings` (ikke brukersynlig), per-90-feltene (to runder), `last_updated_data`, `transfers_balance`, pyntedata (`photo`, `birth_date`, `region`, `squad_number`, `team_join_date`, `known_name`, `opta_code`, `favourite_team`). Fem av dem står i ROADMAP «Senere / idéer». |
| Versjon | **v1.14.0** (minor) «Funksjonssveip». Én branch `feat/funksjonssveip-v1140`, én push, annotert tag `v1.14.0`. Én commit per T-task (`feat:`), CHANGELOG-punkt under `[Unreleased] ### Added` i samme commit. |
| Rammer | 0 AI-kall (kildelåsen i `test/routes.test.js` uendret grønn: players.js, chips.js, deadline.js, calendar.js, prices.js importerer aldri ai.js), 0 nye avhengigheter, 0 Discord-meldinger (Lagsjekk-teksten deler kode med kortet, men ingen ny melding utløses), ingen ny modul. Playwright kun i scratchpad, aldri i repoet. |
| Design | CLAUDE.md gjelder: alle farger som tokens i BEGGE temaer (låst av `test/style.test.js:23/31`) — **ingen nye farger trengs**, `accent`/`negative`/`dim`/`status-*`/`hint-details`/`kort-stat`/`stat-strip` finnes; kontrast ≥ 4,5:1; CSP uten inline-script/`on*` (`<details>` er ok); `<caption>` på hver tabell, `aria-label` på ikon-knapper; 390 px er referansen; bevegelse bak `prefers-reduced-motion`. |
| Tester | rød test først; services har rene funksjoner → egen eller eksisterende test-fil; `views.test.js` for markup, `app-client.test.js` for klientlogikk (vm-kontekst — kun toppnivå-`function` er synlig), `style.test.js` for CSS, `app.test.js` for hele stacken mot `test/fixtures/fpl-world.js`. Nye assertions, ingen nye rammer. |
| `public/` | endres (app.js + evt. style.css) → asset-hashen i prod endres fra `781ffae6`. Noteres i HANDOVER. |
| Arbeidsform | merge `--no-ff -m`, tag, push, CI grønn, prod-sjekk — økten gjør det selv. Deploy-vindu: aldri under kamp (GW3 spilles fre 4. sep 21:00 → søn 6. sep — push til `main` tidligst mandag 7. sep), aldri torsdag 19–21. |
| Spørsmål til Marius | kun hvis planen avdekker noe som bryter denne fasiten — ett spørsmålssett, anbefaling først. |

## Målte premisser (4. sep 2026 04:18 UTC, `main` = `2347ea1`)

### Tilstand

v1.13.2 i prod 4. sep 04:57. `npm test` → **809/809**, lint 0, asset-hash
`781ffae6`. `main` ligger docs-commits foran origin (planøktene pusher ikke —
Opus pusher alt sammen). GW2 er `finished` + `data_checked`; GW3 er `is_next`
(deadline fre 4. sep 17:30 UTC). Marius har 0 bytter (`transfers` = `[]`),
picks for GW3 gir 404 før deadline (ventet).

### Endepunkt og cache-nøkkel per T-task (alle alt hentet — 0 nye kall)

| T | Data | fplClient | Nøkkel · TTL |
| --- | --- | --- | --- |
| T1, T3, T5, T6, T7 | `bootstrap.elements[]`, `events[]`, `element_types[]`, `total_players` | `getBootstrap` | `bootstrap` · 15 min |
| T2 | `event/{gw}/live.elements[].explain[]` | `getLive` / `getLiveHistoric` | `live:N` 1 min / `live:N:hist` 6 t |
| T4 | `entry/{id}/history.current[]` | `getEntryHistory` | `history:5330646` · 5 min |
| T6 | `element-summary/{id}.history_past[]`, `history[].value` | `getElementSummary` | `element:ID` · 30 min — **kun per klikk via `GET /api/spiller/:id`, aldri i bulk** |
| T8 | `entry/{id}.leagues.classic[]` | `getEntry` | `entry:5330646` · 5 min (alt kalt av `leagues.js:12` når `LEAGUE_IDS` er tom — prod og lokalt) |

### Feltverdier og dekning (652 spillere, 38 runder, 20 lag)

| Felt | Dekning i dag | Eksempel |
| --- | --- | --- |
| `price_change_percent` (streng) | 497/652 ≠ 0; 140 med \|pct\| ≥ 50, 52 ≥ 80; min −103,8 (Moore) maks 91,5 (Cherki) | Mbeumo «-101.6», Haaland «58.1» |
| `price_change_projections[]` | 652/652, alltid offset 0/1/2 | `[{offset:0, projected_percent:"5.6", likelihood:1}, …]` |
| `price_change_projections[].likelihood` | heltall **−5..+5** (ikke prosent); offset 0: 0 (159), ±1 (190), ±2 (113), ±3 (172), ±4 (5), ±5 (13) | Cherki `[5,5,5]`, Mbeumo `[-5,-5,-5]` |
| `price_change_hourly_rate` | 491/652 ≠ 0; 9 med \|rate\| ≥ 1000 | Cherki 4215, Mbeumo −2002, Raya −159 |
| `price_change_locked_until` | 61/652; alle har pct 0 og likelihood 0; tidene ligner avspark | «2026-09-04T19:30…», «2026-09-07T14:00…» |
| `cost_change_event` | 119/652: 12 × +1, 1 × +2, 106 × −1 | — |
| `live.elements[].explain[].stats[]` GW1+GW2 | 1775 innslag: minutes 1236, clean_sheets 110, goals_conceded 98, yellow_cards 74, bonus 62, defensive_contribution 60, assists 53, goals_scored 53, saves 23, own_goals 4, red_cards 1, penalties_missed 1; `points_modification` alltid 0 | Haaland GW2: `minutes 90 → +2`, `goals_scored 2 → +8`, `bonus 3 → +3`; Egan GW2: `clean_sheets 1 → +4`, `defensive_contribution 13 → +2` |
| `events[]` (kun ferdige runder) | 2/38 | GW2: `average_entry_score 81`, `highest_score 161`, `highest_scoring_entry 2241815`, `most_selected 165` (João Pedro), `most_transferred_in 115` (De Cuyper), `top_element_info {id:426, points:23}` (B.Fernandes), `most_captained 411` (Haaland), `most_vice_captained 1` (Raya), `transfers_made 11 562 127`, `chip_plays [bboost 338 660, freehit 78 863, wildcard 279 227, 3xc 233 946]`, `ranked_count 9 904 815`. GW3: `average 0`, `highest null`, `chip_plays []`. |
| `history.current[]` | 2/2 | GW1 `points 58, rank 2 201 657, overall_rank 2 201 654, percentile_rank 25, overall_rank_percentage "25"`; GW2 `81, 4 714 786, 3 345 863, 50, "34"` |
| `bootstrap.total_players` | — | 10 387 678 |
| `defensive_contribution` (+ `_per_90`, `clearances_blocks_interceptions`, `recoveries`, `tackles`) | 313/652 (CBI 270, rec 315, tk 244) | Egan (DEF) 34 = CBI 32 + rec 4 + tk 2, per 90 17; Stach (MID) 32; Ajer 27 |
| `clean_sheets` / `goals_conceded` / `saves` / `penalties_saved` / `yellow_cards` / `red_cards` / `own_goals` / `penalties_missed` | 102 / 260 / 22 / **0** / 71 / 1 / 4 / 1 | — |
| `expected_goals_conceded` / `expected_goal_involvements` / `ict_index` / `bps` / `dreamteam_count` / `value_season` | 348 / 294 / 348 / 362 / 21 (maks 2) / 358 | B.Fernandes ICT 35,4 (rank 1) |
| `form_rank_type`, `points_per_game_rank_type`, `selected_rank_type`, `now_cost_rank_type`, `ict_index_rank_type` | 652/652 | Haaland form 2, PPG 2, eid 1, pris 1, ICT 3; Saka 3/4/14/3/6; Raya 3/3/1/1/20 |
| `element_types[].element_count` | 4/4 | K 71, F 214, M 289, A 78 (`singular_name_short` GKP/DEF/MID/FWD) |
| `element-summary.history_past[]` | Raya 5 sesonger; 18 rader over 4 spillere; **leses ingen steder i src i dag** | Raya 2025/26: `start_cost 55, end_cost 62, total_points 162, minutes 3330, clean_sheets 19, saves 60, bonus 11` |
| `element-summary.history[].value` | 8/8 | pris i tideler per runde |
| `scout_risks[]` | 7/652, alle `property "loan_ineligible"` | Garnacho (AVL) gw 16 + 27, Guessand (CRY) 34 + 14, Disasi (CRY) 13 + 20, Grealish (EVE) 18 + 28, Marmoush (TOT) 19 + 25, Mudryk (TOT) 35 + 8, Danso (SUN) 23 + 12 — **Dansos `notes` sier «Gameweek 12» for begge; bruk `gameweek`** |
| `news_added` | alle 162 med `news` har den (38 ≤ 2 d, 23 ≤ 7 d, 67 ≤ 30 d, 34 > 30 d); 57 har dato uten nyhet | «2026-07-23T12:01:23Z» |
| `scout_news_link` | 43/652 (alle med `news`), klubbsider, https | J.Timber → arsenal.com/news/… |
| `entry.leagues.classic[]` type `s` | 5 ligaer | Overall 3 345 863 av 9 904 802 (`entry_percentile_rank 35`, `entry_last_rank 2 201 654`), Norway 92 709 av 208 834 (45), Liverpool 365 917 av 1 200 497 (35), Viaplay League 218 081 av 527 250 (45), «Gameweek 1» 3 345 658 av 8 899 691 (40); type `x` = «Var Har Skylda» 3 av 5 |

Marius' tropp (GW2-picks) mot T1: Mbeumo −101,6 (likelihood −5), Wirtz −84,8
(−3), Shaw −66,7 (−3), Haaland +58,1 (+3), Groß +45,7 (+3), Gvardiol +27,9 (+2);
ingen har `scout_risks`, ingen har `news`.

### Tolkning av prisfeltene (udokumenterte — si det i UI-teksten)

- `price_change_percent` = progresjon mot terskelen for endring; ±100 ≈
  endring. **Fire spillere lå under −100 uten å falle** 4. sep (Moore,
  Mbeumo, O.Dango, Hincapie) → terskelen er ikke hard 100. Vis «nær endring»,
  lov aldri.
- `likelihood` korrelerer med pct: pct ≥ 80 → 3..5, pct ≤ −80 → −3..−5.
  Etikett i UI: |5–4| «svært trolig», 3 «trolig», 1–2 «mulig», 0 «–».
- `price_change_hourly_rate`: r = 0,968 mot netto bytter/time siden deadline
  (n = 95 med |rate| ≥ 100) → «netto bytter per time» (trolig siste vindu —
  skalaen er ca. halvparten av snittet over hele runden). Vis som tall med
  fortegn, ikke som prosent.
- `price_change_locked_until`: låste spillere har pct 0 — **ikke** tolk som
  «stabil». Vis «låst til dd. måned HH:MM» (`formatDay` + `formatTime`).

### Test-verdenen (`test/fixtures/fpl-world.js`) — hva den alt har

`average_entry_score` for ferdige runder (linje 135), `percentile_rank: 40`
(224, 276), `explain: []` (257), `element_types` (294), `history_past` med én
sesong (417). Den **mangler** `price_change_*`, `scout_risks`, `news_added`,
`scout_news_link`, `defensive_contribution`, rank-feltene og `leagues.classic`
av type `s` — koden må tåle `undefined` overalt (app.test.js kjører hele
stacken mot den), og du legger til feltene i verdenen der en stack-test
trenger dem.

### Lokal kjøring

`config.js` kjører `process.loadEnvFile()` som leser repoets `.env`
(prod-nøkler!). Start fra **Git Bash** — PowerShell sletter tomme
`$env:`-variabler:

```
ANTHROPIC_API_KEY= DISCORD_WEBHOOK_URL= PORT=3457 DATA_DIR=<scratchpad>/data node src/server.js
```

Bevis før første sidevisning: `/health` → `"ai":false,"discord":false`. Klikk
ALDRI «Spør AI om råd» på /lag. Curl mot FPL-API-et direkte er lov og gratis —
send nettleser-lignende `User-Agent`.

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 8 peker hit). Kjør
`git status -sb` (main ligger docs-commits foran origin — planøktene
pusher ikke) og `npm test` + `npm run lint` som baseline: forventet
809/809 og lint 0 på v1.13.2. Start i plan-modus, verifiser premissene i
docs/prompt-feltpakka-v1140.md mot koden (linjenumre kan ha flyttet seg)
og mot et ferskt curl-svar fra bootstrap-static/ (feltverdiene endrer seg
per runde), skriv planen med T-tasks og testnavn, og be om godkjenning
før du skriver kode. Fasiten i prompten er besluttet av Marius 4. sep —
ikke re-spør den: åtte funksjoner er valgt med varianter, ti kandidater er
strøket med bevis, fem idéer ligger alt i ROADMAP «Senere / idéer».

Regler som gjelder hele økten: CLAUDE.md er fasit (TDD med rød test
først, 0 nye AI-kall — kildelåsen i test/routes.test.js skal være uendret
grønn, 0 nye FPL-kall — kun felt fra svar appen alt henter, element-
summary aldri i bulk, ingen nye avhengigheter, docs i samme commit som
koden, Edit-verktøyet på docs fordi de er CRLF, HANDOVER ≤ 200 linjer —
roter først). Alle farger som tokens i begge temaer (ingen nye farger
trengs), ingen inline-script/`on*`, `<caption>` på hver tabell, 390 px er
referansen, `prefers-reduced-motion` respekteres. Hvert felt som kan
mangle eller være 0 tidlig i sesongen skal ha en tomtilstand — tallene i
premissene sier hvor mange som har verdi i dag. Lokal røyktest KUN med
tomme ANTHROPIC_API_KEY og DISCORD_WEBHOOK_URL (bevis: /health →
ai:false, discord:false) — se premissene for hvordan. Se hver funksjon i
nettleseren ved 390 px (DevTools eller Playwright fra scratchpad — aldri
i repoet) i BEGGE temaer før du kaller den ferdig. Deploy-vindu før push
til main: aldri torsdag 19:00–21:00, aldri mens kamper pågår (GET
https://fpl.marsk.no/api/live.json → anyLive må være false; GW3 spilles
fre 4. sep 21:00 → søn 6. sep — push tidligst mandag 7. sep). Prod-sjekk
etter deploy: footer viser v1.14.0, `<script`-telling i HTML-en på / er
nøyaktig 2, /health er 200 med aiStats, den NYE asset-hashen fra /sw.js
noteres i HANDOVER, 9 sider 200, hvert av de åtte kortene finnes i
prod-HTML-en (grep-listen i ferdigkriteriene), og `gh run list --branch
main --limit 1` viser grønn kjøring for merge-commiten på Node 22 og 24.
Bevis før påstand: vis kommandoen og linjene. Stopp ved ~95 % usage med
HANDOVER oppdatert om hvilken T-task som er ferdig og hvilken branch som
er åpen.
```

## T0 — branch og baseline

`git switch -c feat/funksjonssveip-v1140` fra `main`. `npm test` (809) +
`npm run lint` (0). `git config core.hooksPath` skal svare `.githooks` (ellers
`npm run hooks`). Noter asset-hashen i prod (`781ffae6`) — den skal ha endret
seg etterpå. Start lokal server fra Git Bash (se premissene), `/health` →
`ai:false` FØR første sidevisning.

## T1 — Prisprognose på /overganger (funn A)

**Service.** Ny ren `buildPriceForecast({ elements, squadIds = [], teamsById })`
i `src/services/prices.js` ved siden av `buildPriceChanges` (prices.js:80 —
samme rad-form `id, name, teamShort, teamCode`). Retur
`{ mine, risers, fallers, countRising, countFalling, lockedCount }`; rad
`{ id, name, teamShort, teamCode, cost, pct, likelihood, rate, lockedUntil, changed }`
der `pct` er `parseFloat(price_change_percent)`, `likelihood` er offset 0,
`changed` er `cost_change_event`. Regler (låst av test): eksporterte
konstanter `FORECAST_MIN_PCT = 20` (troppen) og `FORECAST_MARKET_PCT = 50`
(marked, topp 5 hver vei); stigere sortert pct desc så rate desc, fallere pct
asc så rate asc; låste (`price_change_locked_until`) vises i troppen med
`lockedUntil` men aldri i topplistene; spillere uten `price_change_projections`
(test-verdenen) hoppes over → tomme lister, aldri kast. Kalles fra
`assembleTransfersPage` (`src/services/transfers.js:318–394`): `bootstrap` og
`picks` finnes alt — `squadIds` fra `picks.picks[].element`, `[]` når picks
feilet (try-blokka linje 326–347). Ny retur-nøkkel `priceForecast`; ruta
`src/routes/transfers.js:26` sender den til viewet.

**View.** `views/transfers.ejs`: ny `<section class="card card-wide"
id="prisprognose">` rett etter `#prisendringer` (linje 66), samme
grid/tabellmønster som linje 17–64. Kolonner: Spiller | Pris | Mot endring
(`formatSigned(pct)` + « %», `accent`/`negative`) | FPL-sannsynlighet (etikett
fra likelihood) | Bytter/t (`formatSigned(rate)`). Troppen først (alle med
|pct| ≥ 20, låste med «låst til …»), så «Stiger» og «Faller» (5 av
countRising/countFalling). Hint: «FPLs egne tall fra bootstrap (15 min).
Prosent = hvor nær en prisendring; 100 ≈ endring i natt — ingen garanti.»
Tomtilstander: «Ingen i troppen din er nær en prisendring.» / «Ingen.» Kortet
vises alltid (avhenger ikke av `price-state.json`).

**Tester (rød først).** `test/prices.test.js`: «buildPriceForecast sorterer
stigere på pct og fallere på pct, troppen først med terskel»,
«buildPriceForecast hopper over spillere uten prisfelt og holder låste utenfor
topplistene». `test/views.test.js`: «transfers.ejs viser prisprognosen med
troppen først og tomtilstand» (fixture for transfers får `priceForecast`; vern
med `typeof priceForecast !== 'undefined'` så `cases`-lista ikke blir rød).
`test/routes.test.js:75` (prices.js importerer aldri ai.js) uendret grønn.

**Nettleser.** /overganger ved 390 px i begge temaer: kortet under
Prisendringer, tre tabeller stablet, Mbeumo øverst blant fallerne i troppen med
«svært trolig».

## T2 — Poengoppdeling på /live (funn B)

**Service.** `src/services/live.js:87` bygger `liveById` av `e.stats` alene —
utvid til `{ stats, explain }`. I myPlayers (linje 126–137) legg
`explain: [{ label, points, value }]`, flatet over `explain[]`-kampene
(dobbeltrunde gir to sett), med etiketter fra ny eksportert `EXPLAIN_LABELS`:
minutes «Minutter», goals_scored «Mål», assists «Assist», clean_sheets
«Nullere», goals_conceded «Baklengs», yellow_cards «Gult kort», red_cards
«Rødt kort», saves «Redninger», bonus «Bonus», defensive_contribution
«Forsvarsbidrag», own_goals «Selvmål», penalties_missed «Straffebom»,
penalties_saved «Straffe reddet»; ukjent identifikator → identifikatoren
selv. Innslag med `points 0` **og** `value 0` utelates; `points_modification`
droppes. Payloaden i `GET /api/live.json` (`src/routes/api.js:160`) vokser med
~15 × ≤ 6 rader — ingen JSON-tak finnes.

**Klient.** `public/app.js:597 render`: når `p.explain.length > 0` blir
navnecellen `<details class="hint-details live-why"><summary>` + navn, C-merke
og klubbmerke som i dag + `</summary><span class="dim">` +
`explainText(p.explain)` + `</span></details>`; ellers som i dag. Ny toppnivå-
`function explainText(explain)` → «Minutter 90 +2 · Mål ×2 +8 · Bonus +3»
(`×` kun når value > 1 for tellbare, «90′» for minutter er ok). **Felle:** Modul
2 sorterer på `cell.textContent` (`app.js:418`) — oppdelingen ville forurense
navnenøkkelen. Fiks: `applySort` leser `cell.dataset.sort ?? textContent`, og
render setter `data-sort="<navn>"` på navnecellen. Radene bygges på nytt ved
hvert tikk → husk åpne `<details>` per navn i et `Set` i Modul 3 og sett `open`
igjen i render. Ingen ny CSS trengs (`.hint-details` har fokusring —
`style.test.js:242`); trengs justering, legg den i begge temaer-nøytralt.

**Tester.** `test/live.test.js`: «buildLive legger poengoppdelingen på hver
spiller med norske etiketter og tåler tomt explain» (bruk `liveStats`-hjelperen
fra live.test.js:3 og gi den et `explain`-argument). `test/app-client.test.js`:
«explainText formaterer oppdelingen med × for antall og gir tom streng uten
data», «app.js sorterer på data-sort før celletekst» (grep på kildekoden som
testen på linje 45–54). `test/views.test.js:243` (aria-live) og `:387`
(escaping i script-blokken) uendret grønne.

**Nettleser.** /live mellom runder (GW2 er ferdig → `getLiveHistoric`): alle
15 har oppdeling, Haaland viser «Minutter 90 +2 · Mål ×2 +8 · Bonus +3»; åpne
to, klikk «Poeng»-sortering — rekkefølgen holder og de to er fortsatt åpne;
390 px i begge temaer.

## T3 — «Runden i tall» på / (funn C)

**Service.** Ny ren `roundInNumbers(events, elementsById)` i
`src/services/analysis.js` (ved `mostTransferredIn`, linje 111) → `{ gw, name,
average, highest, mostSelected, mostTransferredIn, topPlayer: { name, points },
mostCaptained, mostViceCaptained, transfersMade, chips: [{ chip, label, count }],
rankedCount }` for **siste `finished`-runde med `average_entry_score` > 0**,
ellers `null`. Navn via `elementsById` (ukjent id → «–»). Chip-etiketter fra
`CHIP_LABELS` (`src/services/chips.js:10`; chips.js importerer ikke ai.js).
Ruta `src/routes/index.js:39` → `roundStats: roundInNumbers(events, byId(elements))`.

**View.** `views/dashboard.ejs`: ny `<section class="card" id="runden-i-tall">`
i `.grid` etter «Mest solgt» (linje 131): h2 «Runde 2 i tall» + `<span
class="dim">` med «snitt 81». Innhold som `<dl>`-liste (eller `.stat-strip`-
fliser, to i bredden på mobil — `style.test.js:208`): Snitt · Høyeste · Mest
valgt · Mest kjøpt · Rundens beste (23 p) · Kaptein · Vise · Bytter · Chips
(fire etiketter med `formatNumber`). Spillernavn lenker som i «Mest kjøpt»
(`/spillere?sok=`). Tomtilstand (null): «Tallene kommer når første runde er
ferdigspilt.»

**Tester.** `test/analysis.test.js`: «roundInNumbers velger siste ferdige
runde og slår opp navnene», «roundInNumbers gir null før første runde er
ferdig eller når FPL ikke har fylt tallene». `test/views.test.js`:
«dashboard.ejs viser runden i tall og tomtilstanden» (`fx.dashboard` og
`fx.dashboardEmpty` i `test/fixtures/views.js:37/57` får `roundStats`).

**Nettleser.** / ved 390 px i begge temaer: kortet i kortrekka, tallene fra
GW2; lenkene går til /spillere med søket fylt.

## T4 — «Topp X %» på /lag (funn D)

**Service.** Ny ren `rankTable(historyCurrent, events, totalPlayers)` i
`analysis.js` ved `rankGraph` (linje 357) → `{ rows: [{ gw, points, average,
highest, rank, overallRank, percentile }], overall: { rank, percentage,
totalPlayers } }`; `overall` fra siste rad (`overall_rank`,
`overall_rank_percentage`), `average`/`highest` fra `events[]` per gw; manglende
felt → `null` i cellen; tom `historyCurrent` → `null`. Ruta
`src/routes/team.js:95` → `rankTable: rankTable(history.current, events,
bootstrap.total_players)`.

**View.** `views/team.ejs:9`: hero-flisen «Totalrangering» får en underlinje
`<span class="dim">topp 34 % av 10 387 678</span>` (kun når
`rankTable?.overall.percentage`). Seksjonen «Totalrangering per runde» (linje
52–76): etter `<p class="hint">` en `div.table-scroll > table.data.data--fit`
med `<caption class="sr-only">`: Runde | Poeng | Snitt | Høyeste | Rank |
Topp % — poeng ≥ snitt får `accent`, manglende verdi «–». `formatNumber`
finnes i konteksten.

**Tester.** `test/analysis.test.js`: «rankTable kobler runder mot snittet og
topp-prosenten», «rankTable tåler manglende percentile-felt og tom historikk».
`test/views.test.js`: «team.ejs viser topp-prosenten i hero og tabellen under
rankgrafen» (`fx.team` i views.js:68 får `rankTable`; `fx.teamEmpty` → ingen
tabell, hero-flisen uendret).

**Nettleser.** /lag ved 390 px: fem fliser to i bredden — underlinja må ikke
sprenge flisens høyde (sjekk at flisene i samme rad er like høye; ellers
`font-size: var(--fs-xs)` på span-en); tabellen scroller; begge temaer.

## T5 — Forsvarsbidrag på /spillere og i kortet (funn E)

**View.** `views/players.ejs:61–76`: ny `<th scope="col" data-type="num"
class="num" aria-sort="none" title="Forsvarsbidrag: CBI + recoveries +
tackles">DC</th>` etter xA (før Status); raden (79–112) får
`data-dc="<%= p.defensive_contribution ?? 0 %>"` og `<td class="num">`. Modul 2
sorterer automatisk (data-type num); tabellen er `table-scroll--pinned` — den
13. kolonna scroller, første kolonner står; rad-taket (Modul 2b) og duellen
(Modul 10, data-attributter) rører du ikke.

**Service/kort.** `src/services/players.js:38 buildPlayerCard` →
`forsvar: { dc, cbi, rec, tk, per90 }` (tall, `?? 0`;
`defensive_contribution_per_90`). `public/app.js:41 playerCardHtml` → etter
primærraden `<p class="kort-dc">Forsvarsbidrag <strong>34</strong> <span
class="dim">(CBI 32 · Rec 4 · Tk 2) · 17 per 90</span></p>` + hint «2 p ved 10
(forsvar) / 12 (midt, spiss) i én kamp».

**Tester.** `test/views.test.js`: «players.ejs har DC-kolonna med data-dc på
radene». `test/players.test.js` (mønster linje 85): «buildPlayerCard tar med
forsvarsbidraget med delene og per 90». `test/app-client.test.js`:
«playerCardHtml viser forsvarsbidraget som linje med CBI, Rec og Tk».

**Nettleser.** /spillere ved 390 px: scroll høyre til DC, sorter — Egan
øverst; kortet for Egan viser linja; begge temaer.

## T6 — Spillerkort-pakka (funn F + G + J-kort)

**Service.** `buildPlayerCard({ element, teamsById, summary, elementTypes })`
(ny valgfri `elementTypes` = `bootstrap.element_types`; `assemblePlayerCard`
sender den — bootstrap sjekkes alt FØRST der). Nye retur-nøkler:

- `stats: [{ navn, verdi }]` per posisjon — **K:** Redninger (`saves`), Nullere
  (`clean_sheets`), Baklengs (`goals_conceded`), xGC
  (`expected_goals_conceded`), Straffer reddet (`penalties_saved`), Bonus;
  **F:** Nullere, Baklengs, xGC, Bonus, Gule (`yellow_cards`), Røde
  (`red_cards`); **M/A:** xGI (`expected_goal_involvements`), Bonus, BPS,
  Gule, Røde, Straffebom (`penalties_missed`) — pluss for alle: ICT
  (`ict_index`), Drømmelag (`dreamteam_count`), Verdi (`value_season`, tittel
  «poeng per £m»). Strengtall sendes som strenger (som `form`, `xg` i dag).
- `rangering: { posisjonFlertall, form: { nr, av }, poengPerKamp, eid, pris }`
  fra `form_rank_type`, `points_per_game_rank_type`, `selected_rank_type`,
  `now_cost_rank_type` og `elementTypes.find(t => t.id === element_type).element_count`;
  `posisjonFlertall` = «keepere» / «forsvarere» / «midtbanespillere» / «spisser»;
  `null` når `elementTypes` mangler.
- `sesonger: [{ sesong, poeng, minutter, mal, assists, nullere, bonus, prisStart,
  prisSlutt }]` fra `summary.history_past` nyeste først (`formatPrice` på
  `start_cost`/`end_cost`), `[]` uten.
- `sisteKamper[].pris` = `formatPrice(h.value)`.
- `nyttMeldt: formatDay(element.news_added)` kun når `nytt` finnes;
  `nyttKilde: element.scout_news_link` kun når den begynner med `https://`,
  ellers `null`.

**Klient.** `app.js:41 playerCardHtml`: under primærraden en `<p class="dim">`
«Form nr. 2 av 78 spisser · P/K nr. 2 · Eid nr. 1 · Pris nr. 1» (kun med
`rangering`); tredje `.kort-stats`-rad fra `d.stats`; «Siste kamper»
(linje 76–87) får kolonna Pris; ny `<h3>Tidligere sesonger</h3>` med
`table.data` (Sesong | P | Min | Mål | A | Nullere | Bonus | Pris «5,5 → 6,2»)
og tomtilstand `<p class="empty">Første sesong i Premier League.</p>`;
nyhetslinja (linje 54) blir «Lyskeskade — meldt torsdag 23. juli · <a
href="…" rel="noopener noreferrer" target="_blank">Kilde</a>» — URL-en
escapes med `escapeHtml`, lenken kun når `nyttKilde`.

**Tester.** `test/players.test.js`: «buildPlayerCard gir posisjonsstatistikk,
rank blant posisjonen og tidligere sesonger», «buildPlayerCard gir tom
sesongliste, null-rank og ingen kilde når summary, element_types eller lenke
mangler» (også `http://` → null). `test/app-client.test.js`: «playerCardHtml
viser statraden for keeper mot spiss», «playerCardHtml viser tidligere
sesonger med prisreise og tomtilstand», «playerCardHtml viser nyhetsdato og
kildelenke med rel=noopener og escaper URL-en». `test/players.test.js:85`
(«mapper hele payloaden») oppdateres med de nye nøklene.

**Nettleser.** Kort for Raya (keeper, 5 sesonger, ingen nyhet), Haaland (spiss,
rank nr. 2, ingen sesonger utenom PL → sjekk at tabellen viser hans), og
J.Timber (nyhet + kilde) ved 390 px i begge temaer — tre stat-rader bryter to
i bredden, tabellene scroller, kildelenken åpner i ny fane.

## T7 — Låneklausul i Lagsjekk + nyhetsdato (funn H + J-rest)

**Service.** `src/services/deadline.js:97–111` (starter-loop): `const risk =
(el.scout_risks ?? []).find((r) => r.gameweek === gw)` → `add('klausul', el,
'kan ikke møte moderklubben i runden (låneklausul)')` — bruk `gameweek`, aldri
`notes`. `findingLine` (linje 130–133): `klausul` uten «er », som `blank`.
`statusDetail` (linje 48–52): legg til ` (meldt ${formatDay(el.news_added)})`
når både `news` og `news_added` finnes. `players.js buildPlayerCard` →
`klausuler: [16, 27]` (sorterte `gameweek` for `loan_ineligible`), kortet viser
«Låneklausul: kan ikke spille runde 16 og 27» (tom liste → ingenting).
`notify.js` røres ikke — ingen ny Discord-melding.

**View.** `views/brief.ejs:22–23`: `FUNN_LABEL.klausul = 'Låneklausul'`,
`FUNN_CLASS.klausul = 'status-i'`; linje 41: ingen «er » for `klausul`; linje
33 (ok-teksten) nevner låneklausul. `views/dashboard.ejs` «Ukens flagg» (linje
25–58): `<span class="dim">meldt torsdag 23. juli</span>` når `news_added` —
ruta `src/routes/index.js:53` må sende `formatDay` (mangler i konteksten i dag).

**Tester.** `test/deadline.test.js`: «buildDeadlineCheck gir funnet klausul når
en starter har scout_risks for runden — og ikke for andre runder»,
«deadlineCheckText skriver klausul-linja uten ‘er’», «statusDetail tar med når
nyheten ble meldt» (via et funn med `news` + `news_added`).
`test/views.test.js`: «brief.ejs viser klausul-funnet», «dashboard.ejs viser
nyhetsdatoen i Ukens flagg». `test/players.test.js`: klausulrunder i kortet.
`test/routes.test.js:66–72` (deadline.js importerer aldri ai.js) uendret grønn.

**Nettleser.** /brief viser «Alt klart» (Marius' tropp har 0 klausuler) —
funnet bevises med testene; / «Ukens flagg» viser «meldt …» på hver flagget;
kortet for Garnacho viser klausulrundene. 390 px, begge temaer.

## T8 — «Dine plasseringer» på /liga (funn I)

**Service.** Ny ren `globalStandings(entry)` i `src/services/leagues.js` →
`[{ id, name, rank, lastRank, percentile, count, trend }]` for
`league_type === 's'`, sortert på `rank_count` desc (Overall først);
`trend` = 'opp' | 'ned' | 'lik' | null (fra `entry_rank` mot `entry_last_rank`);
navn: Overall → «Globalt», Norway → «Norge», ellers FPL-navnet; `[]` uten
ligaer eller uten `entry`. Ruta `src/routes/league.js`: `getEntry(config.fplTeamId)`
i samme `Promise.all` som i dag, myk feil → `standingsGlobal: []`. Kallet er
et cache-treff når `LEAGUE_IDS` er tom (`leagues.js:12` hentet det alt); med
`LEAGUE_IDS` satt blir det ett cachet kall per 5 min — én setning i CLAUDE.md-
linja for leagues.js.

**View.** `views/league.ejs` etter `.page-head` (linje 6): `<section
class="card card-wide" id="plasseringer">` med h2 «Dine plasseringer» og
`table.data.data--fit` (`<caption class="sr-only">`): Liga | Plass | Av |
Topp % | Trend — pilene som i ligatabellen (linje 28–33, samme klasser).
Skjult (ikke rendret) når lista er tom.

**Tester.** `test/leagues.test.js`: «globalStandings gir de globale ligaene
sortert på størrelse med trend og norske navn», «globalStandings gir tom liste
uten ligaer». `test/views.test.js`: «league.ejs viser dine plasseringer over
ligatabellene og skjuler kortet uten data» (`fx.league` får `standingsGlobal`;
vern med `typeof`).

**Nettleser.** /liga ved 390 px: kortet øverst, fem kolonner scroller, pilene
farget som i tabellen; begge temaer.

## T9 — docs og release

`package.json` → 1.14.0. CHANGELOG `[1.14.0] - 2026-09-0x` med `### Added`-
punktene (flyttet fra `[Unreleased]`, ett per T1–T8). README «Sider»: én
setning per berørt side. CLAUDE.md-linjene for players.js, live.js,
deadline.js, prices.js og leagues.js (én setning hver om ny funksjon/nøkkel;
CLAUDE.md ≤ 200 linjer). ROADMAP § 8 → «Status: FERDIG», versjonsplan-rad
~~v1.14.0~~ «utført <dato> — N/N», dokumentkart-raden for denne prompten
fjernes. HANDOVER: statusblokk v1.14.0 med ny asset-hash, testtall, CI-run-ID
og prod-sjekk; «Neste steg» (D fra økt 57 er neste ubesluttede); loggpost;
≤ 200 linjer — roter først. `git rm docs/prompt-feltpakka-v1140.md`. Merge
`--no-ff -m`, annotert tag `v1.14.0`, push branch → CI grønn (`gh run watch`)
→ merge → push `main` (i deploy-vinduet) → prod-sjekk → HANDOVER-linje med
CI-run-ID og hash.

## Feller (lest av folk som har gått i dem)

- **element-summary hentes ALDRI i bulk.** Alt som vises for alle spillere
  (T5-kolonna) kommer fra `bootstrap.elements[]`; alt i kortet (T6) kommer fra
  det ene kallet som alt gjøres per klikk.
- **0 nye FPL-kall.** T8s `getEntry` er et cache-treff (se premiss); ingen
  ny `getOrFetch`-nøkkel i noen T.
- **Modul 2 sorterer på celletekst** (`app.js:418`) — T2 må gi navnecellen
  `data-sort`, ellers sorteres «Haaland C Minutter 90 +2 …».
- **Radene på /live bygges på nytt ved hvert tikk** — åpne `<details>` lukkes
  hvis du ikke husker dem (T2).
- **vm-testene ser bare toppnivå-`function`:** `explainText` og nye hjelpere
  må ligge på toppnivå i app.js, ikke inne i en IIFE.
- **`cases`-lista i views.test.js:** en ny local som viewet leser ubetinget gjør
  eksisterende tester røde — `typeof x !== 'undefined'`-vern eller legg localen
  inn i lista (`priceForecast`, `roundStats`, `rankTable`, `standingsGlobal`).
- **Test-verdenen mangler de nye feltene** (pris, scout, rank, DC, type-`s`-
  ligaer) — koden må tåle `undefined`; app.test.js kjører hele stacken mot den.
- **Strengtall fra FPL** (`price_change_percent`, `value_season`, `expected_*`,
  `ict_index`) vises som strenger — `parseFloat` kun for terskler og sortering.
- **`likelihood` er −5..+5, ikke prosent.** Låste spillere har pct 0 — ikke
  «stabil». Fire spillere lå under −100 uten å falle — lov aldri en endring.
- **Dansos `notes` er feil** (sier «Gameweek 12» for gw 23) — `gameweek`-feltet
  er fasit.
- **`penalties_saved` er 0 for alle** i september — statraden må vise «0»
  uten å se ødelagt ut.
- **`chip_plays` er `[]` og `average_entry_score` er 0 for kommende runde** —
  T3 velger siste ferdige, aldri `is_current`/`is_next`.
- **Hero-flisene på /lag brakk ved 390 px én gang før** (QA-9) — sjekk T4s
  underlinje i nettleser før du går videre.
- **/live har tre `<script>`-tagger** (JSON-beholderen) — `<script`-tellingen i
  prod-sjekken gjelder `/`.
- **Asset-hashen endres** (app.js, evt. style.css) — hashen fra `/sw.js`
  skrives i HANDOVER etter prod-sjekk.
- **CRLF:** docs endres med Edit-verktøyet; `sed -i` er forbudt. Nye filer LF.
- **PowerShell sletter tomme miljøvariabler** → lokal server fra Git Bash.
- **Deploy koster 2 AI-kall:** ikke push docs for seg — alt i én push.
- **Deploy-vindu:** GW3 fre 4. sep 21:00 → søn 6. sep; push til `main`
  tidligst mandag 7. sep, aldri torsdag 19–21, `anyLive` må være false.

## Ferdigkriterier

- `main` = `origin/main`, tag v1.14.0 pushet, branchen merget `--no-ff` og slettet.
- `npm test` grønn med minst 830 tester (809 + ≥ 21 nye assertions), `npm run
  lint` 0, kildelåsen i routes.test.js uendret, alle style-/a11y-tester grønne.
- Hver av de åtte funksjonene sett i nettleseren ved 390 px i begge temaer
  (T1–T8 sier hva).
- Prod: footer v1.14.0, `<script` = 2 på /, /health 200 med aiStats, NY
  asset-hash notert i HANDOVER, 9 sider 200, CI grønn på Node 22 og 24 for
  merge-commiten, og grep i prod-HTML-en finner `id="prisprognose"`
  (/overganger), `live-why` (/live etter render — sjekk `/api/live.json` har
  `explain`), `id="runden-i-tall"` (/), «topp» i hero-flisen (/lag), `data-dc`
  (/spillere), «Tidligere sesonger» (`/api/spiller/1` → `sesonger`),
  «Låneklausul» (`/api/spiller/160` → `klausuler`), `id="plasseringer"` (/liga).
- 0 nye AI-kall i noen tilstand (aiStats.calls på /health stiger kun med
  oppstartstikket), 0 nye FPL-endepunkter, 0 nye avhengigheter, 0 Discord-
  meldinger.
- CLAUDE.md ≤ 200 linjer, HANDOVER ≤ 200 linjer, prompten slettet, CHANGELOG/
  README/ROADMAP ajour i samme commit som koden.

## Etter økten

- Alt grønt: prompten er slettet av økten selv (T9). Marius' egne punkter
  (STEG 7 under kamp, 9c, 9e, telefon, `kill 1`) står fortsatt i HANDOVER.
- Stoppet underveis (usage-grense): HANDOVER skal si nøyaktig hvilken T-task
  som er ferdig og hvilken branch som er åpen — neste økt fortsetter derfra
  med denne fila som fasit.
- Neste etter B: **D** fra økt 57 — slanking av `style.css` (2605 linjer) og
  `app.js` (1397 linjer, blir større av T2/T5/T6). Ikke besluttet. «Senere /
  idéer» i ROADMAP har de fem kandidatene fra sveipen.
