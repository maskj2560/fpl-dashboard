# Plan v1.7.0 «/innsikt» — benkesløsing, kapteinsfasit, flaksbarometer, rundens XI (31. aug 2026)

## Context

Andre versjon av idépakken (fasit: `docs/plan-idepakken-v16-v19.md`). Ny side
`/innsikt` med fire seksjoner om Marius' egen sesong. Planen er godkjent av
Marius 31. aug etter to spørsmålsrunder + API-målinger; bygges av Opus på egen
branch `feat/innsikt-v170` fra `main`. Utgangspunkt: `main` @ `c72a389`,
**509/509 tester**, lint 0, v1.6.0 i prod.

## §0 Status

- **Avgjort (Marius 27. aug + 31. aug):** fire seksjoner på ny side `/innsikt`;
  benkesløsing = BEGGE kolonner (rå benkepoeng + unngåelig tap via optimal XI);
  kapteinsfasit = identitet mot egen tropp (delt topp = treff) + poeng mot global favoritt
  (kaptein ≥ most_captained-spillerens poeng); flaksbarometer = flakspoeng per runde
  ((mål−xG)×målverdi + (assists−xA)×3) + topp/bunn 3 spillere; rundens XI = tabell for siste
  ferdige runde + sesongtrend via `in_dreamteam`; vindu = **hele sesongen**; nav = **etter Liga**.
- **Koden bor:** ny `src/services/insights.js`, ny `src/routes/insights.js`, ny `views/innsikt.ejs`,
  ett nytt endepunkt i `src/services/fplClient.js`. Gjenbruk: `_mapLimit` (league-insights.js:314),
  formasjonsreglene fra `baseline.js:48–61`, `byId`/`resolvedGw` (analysis.js), `formatSigned`
  (format.js), partials `club-shirt`/`club-badge`.
- **AI-budsjett: 0 kall.** Ingen ai.js-import — `routes.test.js`-skanningen låser rutefila automatisk.
- Bygges på egen branch `feat/innsikt-v170` fra `main`. Ingen merge/tag/push uten klarsignal.

## Datakontrakt per seksjon

**Verifisert mot ekte API 31. aug (vist i planøkta):**
- `event/{gw}/live/` stats: `total_points`, `minutes`, `goals_scored`, `assists`,
  `expected_goals`/`expected_assists` (STRENGER, «1.47»), `in_dreamteam` (bool).
- `dream-team/{gw}/`: `{top_player:{id,points}, team:[{element,points,position}×11]}` (GW1 målt).
- Bootstrap events: `most_captained` (GW1=411), `finished`, `data_checked`.
- Picks ferdig runde: `multiplier` 0 på benk / 2 på kaptein, `automatic_subs` (tom array hos
  Marius), `active_chip`, `entry_history.points_on_bench` (GW1=6).

**Også målt 31. aug (var antakelser — nå fakta):**
- **Autosub i ferdig runde** (entry 4829085, GW1): FPL RE-SORTERER picks — innbytteren står
  på posisjon 6 med `multiplier` 1, den utbyttede på posisjon 13 med `multiplier` 0.
  Regelen «faktisk XI = picks med multiplier > 0» er dermed målt, ikke antatt.
  `automatic_subs`-feltnavn målt: `{entry, element_in, element_out, event}` (brukes ikke —
  multiplier-regelen er enklere og målt).
- **Bench Boost** (entry 4410802, GW1): alle fire benkespillere `multiplier` 1 og
  `entry_history.points_on_bench` = **0** — FPL rapporterer selv null sløsing i BB-runder.
  Planens BB-regel (benkepoeng 0 + unngåelig tap 0 + «BB»-merke) matcher API-et eksakt.
- **Chip-navn** fra bootstrap `events[].chip_plays`: `bboost`, `3xc` (målt, GW1).

**Ikke-avhengigheter (trenger ingen guard):**
- TC-multiplier (3) brukes ALDRI aritmetisk — all poengregning er rå 1×-poeng fra live;
  multiplier brukes kun binært (>0 = XI, 0 = benk), og TC-kapteinen står uansett i XI-en.

**Guards (defensive, mot fremtidige API-endringer — ikke antakelser):**
| Felt | Guard |
| --- | --- |
| `multiplier` | Gir multiplier>0 færre enn 11 spillere (uten BB) → fallback posisjon 1–11 |
| `most_captained` | Har verdi FØR runden er ferdig (målt: GW2) → brukes kun for `finished`-runder; mangler → raden ut av B-nevneren |
| `in_dreamteam` | Mangler → sesongtrend null, resten av seksjonen står |
| xG-felt | `parseFloat` med NaN→0 per spiller; mangler feltene i samtlige runder → hele flaksseksjonen null med forklarende tomtilstand — aldri gale tall |
| `active_chip` | Ukjent verdi → ingen merke, raden behandles som vanlig runde |

## Arkitektur

- `src/services/insights.js`: rene funksjoner + `assembleInsights` (myk feil per seksjon à la
  `assembleLeagueInsights`, `softNull`-mønsteret). Import av `_mapLimit` fra league-insights.js.
- Nytt i fplClient: `getDreamTeam(gw)` — nøkkel `dreamteam:${gw}`, 6 t TTL (getLiveHistoric-
  mønsteret). Kalles KUN for siste ferdige runde.
- Delt datainnhenting: `finishedGws` = alle `finished`-runder → picks + live per runde via
  `_mapLimit(8)` (`getPicksHistoric`/`getLiveHistoric` — samme cache-nøkler som baseline.js
  på /overganger deler). Egen id: picksHistoric er OK (etablert i baseline.js); entry-history
  brukes ikke (points_on_bench tas fra picks' entry_history).
- Poengsemantikk: ALLE sammenligninger på rå 1×-poeng. Kapteinsdobling måles kun i
  kapteinsfasiten — som identitet/differanse, aldri som multiplikator.
- Ingen /api-endepunkt, ingen polling — alt er ferdigspilte, immutable runder.
- Rammer som v1.6.0: TDD RED→GREEN, én commit per task, CHANGELOG [Unreleased] løpende,
  nettverk kun i fplClient, norsk UI, kun eksisterende CSS-tokens (style.test.js urørt), 390 px.

## Tasks

### T1 — fplClient: getDreamTeam
`src/services/fplClient.js`, `test/fplClient.test.js`.
`getOrFetch('dreamteam:'+gw, () => fplFetch('dream-team/'+gw+'/'), {ttl: 360*MIN})` + JSDoc
(«kun ferdige runder — 6 t»). Tester (2): `'getDreamTeam henter dream-team/{gw}/ og cacher 6 t'`,
`'getDreamTeam deler ikke nøkkel med live'`. 509 → **511**.
Bevis: `npm test` viser 511 pass, lint 0.

### T2 — insights.js: optimalXi + buildBenchReport
Ny `src/services/insights.js` + `test/insights.test.js`.
- `optimalXi({squadIds, typeOf, pts})` → `{ids, points}`: beste lovlige XI av 15 — enumerer
  formasjonene (3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-2-3, 5-3-2, 5-4-1; alltid 1 keeper),
  toppscorere per posisjon. Samme regler som baseline.js:48–61 (validAfterSwap er swap-basert
  og ueksportert — reglene gjenbrukes, ikke funksjonen).
- `buildBenchReport({picksByGw, liveByGw, elementsById, gws})` → `{rows:[{gw, benchPoints,
  avoidable, chip}], totalBench, totalAvoidable}|null`. benchPoints = picks'
  `entry_history.points_on_bench`, fallback = sum rå poeng for multiplier===0-picks.
  avoidable = optimalXi − sum rå poeng for faktisk XI (multiplier>0, fallback pos 1–11).
  BB-runde: avoidable 0 + chip-merke.
Tester (7): formasjonsvalg; keeper-regelen; benchPoints fra entry_history; beregnet fallback;
avoidable rå 1× (kaptein ikke doblet); BB-runde; akkumulering. 511 → **518**.

### T3 — buildCaptainAudit
`buildCaptainAudit({picksByGw, liveByGw, eventsById, elementsById, teamsById, gws})` →
`{rows:[{gw, captain:{id,name,teamCode,points}, squadBest:{name,points,hit},
global:{name,points,hit}|null}], hitSquadPct, hitGlobalPct, counted:{squad, global}}|null`.
Treff A: kapteinens råpoeng === maks råpoeng blant alle 15 (delt topp = treff). Treff B:
kapteinens råpoeng ≥ most_captained-spillerens råpoeng; runder uten most_captained ute av
B-nevneren. TC/VC: raden bruker effektiv kaptein (`effectiveCaptain`-logikken fra
league-insights.js:223 — importeres), poeng alltid 1×.
Tester (6): treff/bom A inkl. delt topp; treff/bom B; manglende most_captained → ekskludert;
VC-overtakelse; prosentregning; manglende picks-runde hoppes. 518 → **524**.

### T4 — buildLuckMeter
`buildLuckMeter({picksByGw, liveByGw, elementsById, gws})` → `{rows:[{gw, luck}], total,
players:[{id, name, teamCode, goals, xg, assists, xa, luck}], top, bottom}|null`.
Rundevis: sum over faktisk XI (multiplier>0): (goals−xG)×målverdi(element_type: GK/DEF 6,
MID 5, FWD 4) + (assists−xA)×3, avrundet 1 desimal. Per spiller: sesongsum over ALLE ferdige
runder for de 15 i siste ferdige rundes tropp (spillerens flaks, uavhengig av kjøpstidspunkt —
dokumenteres i UI-hint). top/bottom = topp/bunn 3 på luck. Hele seksjonen null når xG-feltene
mangler i samtlige runder.
Tester (6): formelen per posisjon; strengparsing; kun faktisk XI teller rundevis; NaN-guard;
seksjon null uten xG-felt; topp/bunn-sortering. 524 → **530**.

### T5 — buildDreamTeamSection
`buildDreamTeamSection({dreamTeam, lastGw, myPicks, liveByGw, elementsById, teamsById, gws})` →
`{gw, topPlayer:{name,points}, xi:[{id, name, teamCode, teamShort, elementType, points,
mine:'startet'|'benket'|null, captain}], mineCount, trend:[{gw,count}]|null}|null`.
xi fra dream-team-team-arrayen (position-sortert); mine/captain fra myPicks (siste ferdige
runde). trend: per ferdig runde, antall av MIN faktiske XI den runden med `in_dreamteam`
true i rundens live — feltet mangler → trend null. Tom/ugyldig dream-team → hele seksjonen null.
Tester (5): mapping + merking; kapteinsmerke; mineCount; trend fra in_dreamteam; trend null
uten felt; (tom → null). 530 → **535**.

### T6 — assembleInsights
Flyt: `getBootstrap()` (hard feil) → `finishedGws` (alle finished, kronologisk) → tom →
`{gw, sections: alle null}` → picks + live per runde via `_mapLimit(8)` (picks-404 → null-innslag)
→ `getDreamTeam(sisteFerdige)` i softNull → fire buildere i hver sin softNull.
Retur `{gw, finishedCount, bench, captains, luck, dreamTeam}`.
Tester (5, fetch-mock à la transfers.test.js:385): kun ferdige runder hentes; dream-team kun
for siste; én seksjon feiler mykt → resten leveres; ingen ferdige runder → alt null uten kall;
aldri element-summary. 535 → **540**.

### T7 — rute + nav + view-skjelett + Benkesløsing-seksjon
Ny `src/routes/insights.js` (league.js-mønsteret: hasTeamId-guard → no-team), montering
`app.use('/innsikt', …)` i server.js, nav-lenke «Innsikt» etter Liga i layout.ejs,
ny `views/innsikt.ejs` + fixtures (`fx.insights`, `fx.insightsEmpty`) i test/fixtures/views.js.
Seksjon 1: tabell Runde | På benken | Unngåelig tap | Chip i `.table-scroll`, sumrad,
formatSigned, tomtilstand «Innsikt kommer når første runde er ferdigspilt».
Tester (4): 'Benkesløsing'-markør + sumrad; tomtilstand; nav-lenken i layout; BB-merket.
540 → **544**. Bevis: 544 pass + lint 0.

### T8 — Kapteinsfasit- + Flaksbarometer-seksjonene
Kapteinsfasit: tabell Runde | Kaptein | Troppens beste | Global favoritt, treff-piller (✓/–),
to treffprosent-kort. Flaksbarometer: rundeliste med ±flakspoeng (formatSigned, pos/neg-klasse
med eksisterende tokens), sesongsum, topp 3 / bunn 3 med draktbilder + hint om at spillertallene
gjelder hele sesongen. Tester (3): 'Kapteinsfasit' + prosentkortene; 'Flaksbarometer' + fortegn;
topp/bunn-listene. 544 → **547**.

### T9 — Rundens XI-seksjon
Tabell for siste ferdige runde: draktbilde (club-shirt), navn, posisjon, poeng, merking
«Startet/Benket» + C-merke; top_player fremhevet; mineCount-oppsummering; trendlinje
(«dine i rundens XI per runde») som enkel tallrekke/mini-tabell. Tester (2): 'Rundens XI' +
merking av egne; trenden rendres/utelates. 547 → **549**.

### T10 — Røyktest + versjon + docs
package.json 1.7.0; CHANGELOG [1.7.0] (flytt fra [Unreleased]); ROADMAP (huk av v1.7.0);
CLAUDE.md (insights.js + getDreamTeam i arkitekturblokka, /innsikt i rutelista);
HANDOVER (status + 200-linjerstak); docs/VIDERE.md. Røyktest med TOMME nøkler
(scratchpad-.env, HANDOVER-oppskriften): alle ruter 200 inkl. `/innsikt` + 404, `/health` →
`ai:false, discord:false`, 0 AI-kall-linjer i loggen. Full `npm test` (**549**) + lint 0.
Manuell sjekk mot ekte FPL-data lokalt. STOPP: ingen merge/tag/push uten Marius.

## Kall-budsjett /innsikt (G = ferdige runder)

Kald: bootstrap 1 + picks G + live G + dream-team 1 = **2G + 2** (G=3 → 8; verstefall G=38 → 78,
hvorav 2G deles med /overganger-baselinen — i praksis er de varme om /overganger er besøkt).
Varm (< 6 t): 0. `_mapLimit(8)` på picks/live. AI: **0 kall** i alle tilstander.

## Restrisiko (etter måling — alle datafelt er verifisert mot ekte API 31. aug)

Ingen antakelser gjenstår i datakontrakten. Det som står igjen er driftskost og
fremtidssikring, og ingen av dem kan gi gale tall på siden:

1. **Kaldstart-kost, ikke korrekthet:** ~78 kall ved G=38 er samme mønster som
   /overganger-baselinen har kjørt i prod siden v1.5.0 (2G kall, delt cache-nøkler) —
   /innsikt legger kun til dream-team (+1). _mapLimit(8) demper, 6 t-TTL gjør gjentatte
   besøk gratis. Verste utfall: første sidelast går tregt én gang per 6. time.
2. **FPL endrer API-et en dag:** hver seksjon ligger i egen softNull + guards over —
   verste utfall er en utelatt seksjon med forklaring, aldri krasj, aldri gale tall.
3. **dream-team 404/tomt** rett etter rundeslutt → softNull, seksjonen utelates til neste tikk.
4. **Nav vokser til 9 punkter på 390 px** → scrollnav med kantfade finnes (v1.1.2); QA-sjekk i T10.
5. **Ingen nye tokens/farger** — style.test.js står urørt og skal være grønn hele veien.

## Verifisering

Per task: `npm test` (vis talllinjene) + `npm run lint` (0). Etter T10: røyktesten over +
manuell visning av /innsikt mot ekte FPL-data lokalt (`npm run dev`). Marius tester lokalt
(`git checkout feat/innsikt-v170`). Deploy-vinduer: ALDRI push torsdag 19:00–21:00 (auto-brief
3. sept ~19:30), aldri mens kamper pågår; GW3-deadline fre 4. sept 19:30. Merge til `main`
(= prod) kun på Marius' klarsignal.
