# Plan v1.6.0 «Liga-pakka» — rival-radar, ligagraf, kaptein-liga, roast-rapport (27. aug 2026)

## Context

Første versjon av idépakken (fasit: `docs/plan-idepakken-v16-v19.md`).
Marius valgte «planlegg + bygg nå»: ny branch `feat/liga-v160` FRA
`feat/overganger-v150` (4. etasje på stabelen — akseptert; P3-avvik →
mekanisk rebase). Utgangspunkt 454 grønne tester. Arbeidstreet står på
main — kode-referanser gjelder v150-branchen (`git show` ved behov).
Kaptein-liga-dybde: Marius godkjente tak «siste 10 ferdige runder» 27. aug.

## Beslutninger/arkitektur

- Ny service `src/services/league-insights.js`: rene funksjoner +
  `assembleLeagueInsights` (myk feil per seksjon, mønster
  assembleTransfersPage). `MAX_MANAGERS = 20` (slice av standings.results),
  `CAPTAIN_LEAGUE_DEPTH = 10`.
- Ny `getEntryHistoryHistoric(teamId)` i fplClient: SAMME nøkkel
  `history:${id}`, 6 t TTL (getPicksHistoric-mønsteret). KUN for andre
  managere; egen id ALLTID via getEntryHistory (5 min) — ellers får /lag
  6 t gammel egen historikk.
- `_mapLimit(items, 8, fn)` i league-insights — maks 8 samtidige kall.
- Rapporten bor i notify.js (deler CHECK_INTERVAL-timeren, 6 t), state i
  `DATA_DIR/report-state.json` `{lastReportedEvent, text, generatedAt,
  source: 'ai'|'data'}`. Genereres når webhook ELLER AI er på; postes kun
  med webhook. refresh.js røres IKKE.
- Rival-radar ERSTATTER dagens «Differensialer»-kort (radaren inneholder
  differensialene — viewtest-markørene 'Differensialer' beholdes som
  h3/etikett). SSR med `?rival=`; app.js husker valget i
  localStorage['fpl-rival'].
- Alle seksjoner bruker FØRSTE liga i LEAGUE_IDS; eksisterende
  ligatabeller viser fortsatt alle.
- Seksjonsrekkefølge på /liga: eksisterende tabeller → Rundens rapport →
  Rival-radar → Kaptein-liga → Sesonggraf.
- Rammer: TDD RED→GREEN, én commit per task, CHANGELOG [Unreleased]
  løpende, nettverk kun i fplClient, sidevisning utløser/blokkerer aldri
  AI, 0 ekte AI-kall under bygging, kun eksisterende CSS-tokens
  (style.test.js urørt), norsk UI, 390 px. Ingen merge/tag/push.

## Tasks

### T1 — fplClient: getEntryHistoryHistoric
`src/services/fplClient.js`, `test/fplClient.test.js`.
`getOrFetch('history:'+id, …, {ttl: 360*MIN})` + JSDoc etter
getPicksHistoric-malen. Test: `'getEntryHistoryHistoric deler nøkkel med
getEntryHistory og cacher lenge'`. 454 → **455**.

### T2 — league-insights del 1: rank per runde + flerserie-graf
Ny `src/services/league-insights.js` + `test/league-insights.test.js`.
- `leagueRanksByGw({results, histories, maxGw})` → `{gws, series:
  [{entry, entryName, playerName, points: [{gw,total,rank}|null]}]}|null`.
  Rank per gw: total desc, likhet → lavest entry-id; manglende
  historikkrad → null-punkt.
- `buildLeagueGraph({ranks, myEntry, rivalEntry, width=600, height=140})`
  → `{width, height, gwFirst, gwLast, managers, single, series: [{entry,
  name, points:'x,y …', me, rival, lastRank}]}|null`. rank 1 = y 0;
  me/rival SIST i arrayen (tegnes øverst); null-punkter hoppes over;
  single = én gw → punkter.
Tester (6): rangering/likhet; maxGw + null-punkt; null uten ferdige
runder; y-retning; me/rival sist; single. 455 → **461**.

### T3 — pickRival + buildRivalCompare
- `pickRival({results, myEntry, requested})` → entry|null. requested når
  gyldig og ≠ meg; ellers nærmeste over; leder → nærmeste under; alene → null.
- `buildRivalCompare({myEntry, rivalEntry, results, myPicks, rivalPicks,
  elements, teams})` → `{me, rival (entry/entryName/playerName/rank/
  total/eventTotal), gapTotal, gapEvent, diff: {theirs, mine} (via
  differentials() fra analysis.js, beriket med event_points), shared,
  captains: {mine, rival}}` — cap = `{id, name, teamCode, teamShort,
  eventPoints, tc (multiplier===3)}`. Rundepoeng fra bootstrap
  `elements.event_points` — 0 ekstra kall. null når picks mangler.
Tester (7). 461 → **468**.

### T4 — buildCaptainLeague
- `effectiveCaptain(picks)`: pick med høyest multiplier; fallback is_captain
  (dekker VC-overtakelse og TC).
- `buildCaptainLeague({results, picksByEntry, liveByGw, elements, gws,
  lastGw})` → `{gws, lastGw, depth, capped, rows: [{entry, entryName,
  last: {name, teamCode, teamShort, points, optimal, lost, tc}|null,
  sum: {points, lost, rounds}}]}`. capPoints = RÅ live-poeng (1×);
  optimal = beste råscore i start-XI (position ≤ 11); lost = optimal −
  capPoints. Sortering: sum.points desc, så sum.lost asc.
Tester (6): rå 1×; TC flagges uten å gange; VC effektiv; benk teller
ikke; manglende picks hoppes; sortering. 468 → **474**.

### T5 — assembleLeagueInsights + _mapLimit
Flyt: bootstrap + getLeagueStandings (hard feil) → slice 20 →
`resolvedGw`, finishedGws = siste 10 ferdige → pickRival → tre seksjoner
i hver sin try/catch (myk → null):
- rival: getPicks(meg, gw) + getPicks(rival, gw) → buildRivalCompare (404 → null)
- graph: histories via _mapLimit(8) — egen id getEntryHistory, andre
  getEntryHistoryHistoric → leagueRanksByGw → buildLeagueGraph
- captainLeague: getLiveHistoric per finishedGw + getPicksHistoric per
  manager×gw via _mapLimit(8) (404 → null-innslag) → buildCaptainLeague
Retur `{gw, leagueName, results, rivalEntry, rival, graph, captainLeague}`.
Tester (5, fetch-mock à la transfers.test.js:385): _mapLimit-grense +
rekkefølge; alle seksjoner; kutter 20/10; én seksjon feiler → null +
resten leveres; aldri element-summary/uferdige picks. 474 → **479**.

### T6 — /liga-ruta + Rival-radar-seksjon
`src/routes/league.js`, `views/league.ejs`, fixtures, views-test, style.css.
Rute: behold tabellene, fjern inline-differensiallogikk; `insights =
assembleLeagueInsights({leagueId: leagueIds[0], requestedRival:
Number(req.query.rival) || null})`; locals: insights, report: null (T12),
formatSigned (format.js:57), formatNumber, teamsById, myEntry, rivalEntry.
View: GET-form `#rival-form` med `#rival-select` (alle unntatt meg,
valgt = rivalEntry) + noscript-knapp; avstandskort (formatSigned);
begges kaptein m/club-badge + TC-merke; differensialtabeller begge veier
(h3 «Differensialer», ny Poeng-kolonne); felles spillere. Fixtures
omformes (markører består); style.css kun eksisterende tokens.
Tester (4): 'Rival-radar', 'rival-select', 'Felles spillere',
fortegns-avstand. 479 → **483**.

### T7 — Kaptein-liga-seksjon
Tabell: Manager | Kaptein (siste runde, badge) | Poeng | Tapt mot
optimal | Sum poeng | Sum tapt. row-me, «(TC)», formatSigned på tapt,
hint «Sum over de siste 10 ferdige rundene» ved capped, «–» uten picks.
Tester (3, inkl. fx.leagueCaptainsCapped). 483 → **486**.

### T8 — Sesonggraf-seksjon
SVG etter team.ejs:52–70-mønsteret, klasse `rank-graph league-graph`.
Meg = var(--accent) 2.5px, rival = var(--accent-2) 2px, øvrige =
var(--text-dim) 1px — full farge, ingen opacity (kontrast ≥ 3:1).
Legend med navn + sluttplassering. single → punkter. Hint «toppen er
1. plass». Tester (3): 'Sesongutvikling', 'league-graph', tomdata
utelater grafen. 486 → **489**.

### T9 — app.js Modul: rival-valg i localStorage
Ren toppnivåfunksjon `rivalNavAction({search, stored, validIds})` →
`{type: 'store'|'redirect'|'clear'|'none', …}`; param i URL → store
(aldri loop); lagret + gyldig uten param → redirect (location.replace);
lagret ugyldig → clear. Init kun når #rival-select finnes; change →
form.submit(). Tester (4, vm-mønsteret i app-client.test.js). 489 → **493**.

### T10 — Rapportgrunnlag + prompt
- league-insights: `buildReportData({event, leagueName, results,
  captainRound, myEntry})` → `{event, league, winner, loser (på
  event_total), movers (rank≠last_rank), table, mine (m/captain-fasit),
  captains}`; `assembleLeagueReportData({leagueId, teamId, event})` —
  standings + bootstrap + getLiveHistoric(event.id) + getPicksHistoric
  per manager via _mapLimit; deler cache med sidevisningen.
- prompts.js: `buildLeagueReportPrompt(data)` — «Rundens rapport for
  miniligaen X etter Runde Y», datablokker, toneinstruks «roast med
  glimt i øyet: ert taperen godmodig, skål for vinneren — aldri
  ondsinnet», REGLER: kun tall fra grunnlaget, navn eksakt, norsk,
  «runde» aldri «gameweek», spillernavn i **fet**, maks ~180 ord,
  2–4 avsnitt uten overskrifter.
Tester (5). 493 → **498**.

### T11 — notify.js: rapport-scheduler + persist + getLeagueReport
Ny state-fil report-state.json (loadState/saveState/persistState-mønster).
- `reportCacheKey(eventId)` = `league-report:${eventId}`
- `reportDecision({events, lastReportedEvent})` → `{action:'none'}` |
  `{action:'report', event}` (nyeste finished && data_checked > markør;
  to runder nede → kun nyeste)
- `checkReport()`: reporting-flagg → decision → resolveLeagueIds →
  assembleLeagueReportData → ai.generate({cacheKey, minIntervalMs:
  7 døgn, system: vittig norsk FPL-kommentator, maxTokens: 2000}) —
  null/AI av → `dataReportText(data)` (source 'data') → post med header
  «**Rundens rapport — <runde> · <liga>**\nhttps://fpl.marsk.no/liga» kun
  når webhook satt → markør + tekst persisteres FØRST etter vellykket
  post (uten webhook: rett etter generering). Feilet post → ingen
  persist, retry neste tikk (AI-cachen gjør retry gratis).
- `getLeagueReport()` → state|null.
- `startScheduler`: reportActive = webhook || ai.isEnabled(); tick =
  briefActive && check() + checkReport(); _initState laster begge
  markører. Hooks utvides (reportCompose, loadReport, saveReport).
Tester (8): decision none/nyeste; post én gang + markør; uten webhook
genererer men poster aldri; feilet post ingen markør; overlapp-guard;
redeploy-lesing; dataReportText-innhold. 498 → **506**.

### T12 — «Rundens rapport» på /liga
Rute: `report: getLeagueReport()` (kun state-fila — aldri AI-kall).
View: card-ai-seksjon mellom tabellene og Rival-radar; ai-badge KUN når
source==='ai'; boldAi-escaping fra transfers.ejs:28–43; tidsstempel;
uten state utelates seksjonen. Tester (3): 'Rundens rapport',
fet-markering, datarapport uten ai-badge. 506 → **509**.

### T13 — Røyktest + versjon/dokumenter
package.json 1.6.0; CHANGELOG [1.6.0]; ROADMAP (huk av); CLAUDE.md
(league-insights i arkitektur, AI-funksjon: ligarapport 1 kall/uke,
report-state.json, budsjett ~49–53 kall/uke); HANDOVER (200-linjerstak);
docs/VIDERE.md. Røyktest med TOMME nøkler (scratchpad-.env): /liga
rendrer, 0 AI-kall-linjer, alle ruter 200 + 404. Full `npm test`
(**509**) + `npm run lint` 0. STOPP: ingen merge/tag/push (P4-rekkefølgen:
v1.3.8 → v1.4.0 → v1.5.0 → v1.6.0). Push av branchen til GitHub som
backup er OK (ingen deploy) + oppdater `staging` til v160-toppen.

## Kall-budsjett /liga (N ≤ 20 managere, G ≤ 10 runder, L ligaer)

Kald: bootstrap 1 + standings L + history N + picks-rival 2 + picks N×G
+ live G ≈ 114 + L (10-mannsliga) / 233 + L (verstefall). Varm (< 5 min): 0.
SWR: kun første last etter deploy blokkerer, dempet av _mapLimit(8).
Rapporten: deler cache + 1 AI-kall per runde (event-nøkkel + 7 d intervall).

## Risikoer

1. Kaldstart-byge (~230 kall verstefall) → _mapLimit(8), tak 20/10, myk
   feil, updating-banner. Overvåk loggen første døgn.
2. Delt nøkkel history:<id> med to TTL-er → regel «egen id alltid via
   getEntryHistory», JSDoc + T5-test.
3. Multiplier-semantikk (VC/TC) pinnes av T4-testene — avvik i ekte data
   gir feil fasit, ikke krasj.
4. Krasj mellom post og persist → re-post neste tikk (samme vindu som
   briefen; akseptert).
5. Redirect-loop utelukket av param-regelen + clear (T9-tester).
6. Ligaer > 50: side 1 + kutt 20, dokumentert i viewet.
7. Grafkontrast: fulle tokenfarger uten opacity — style.test.js urørt.
8. v150-basen endres (P3-fix) → mekanisk rebase av v160.

## Verifisering

Per task: `npm test` (vis tall) + `npm run lint` 0. Etter T13: røyktest
tomme nøkler (alle ruter 200 + 404, `/health` ai:false discord:false,
0 AI-kall), /liga manuelt mot ekte FPL-data lokalt (Marius' liga
1397750). Marius tester lokalt (`git checkout feat/liga-v160`,
`npm run dev`). Deploy først i P4-rekkefølgen etter måleuka.
