# Plan v1.8.0 «Spiller-pakka» — spillerkort, duell, differensialer, dødballtakere

> Planøkt 2026-09-01 (økt 47, Fable). Alle nøkkelvalg besluttet av Marius i
> fire AskUserQuestion-runder. Alle API-antakelser MÅLT mot ekte FPL-API i
> økten. Planen er skrevet for å være komplett for en utførelses-økt uten
> tilgang til plansamtalen. Godkjent av Marius 1. sep.

## Context

Tredje versjon av idépakken (fasit: `docs/plan-idepakken-v16-v19.md`).
Alt bor på `/spillere`: modal-spillerkort (lazy via nytt `GET /api/spiller/:id`),
spillerduell (klientside fra data-attributter), global differensial-finner og
«Dødballtakere» (server-rendret fra bootstrap). Egen branch `feat/spillere-v180`
fra `main`-toppen (v1.7.1, baseline **556/556 + lint 0**).
**0 AI-kall i alle tilstander** — ingen fil i pakka importerer `ai.js` (som /innsikt).

## Beslutningsfasit (Marius, 1. sep — IKKE re-spør)

1. **Omfang:** alle fire deler i ÉN v1.8.0.
2. **Spillerkort:** modal på /spillere ved klikk på spillernavn, lukkes ×/Esc/backdrop.
   Lazy-hentes via nytt `GET /api/spiller/:id`. Innhold: nøkkeltall (bootstrap) +
   siste 5 runder + kommende 3 kamper med FDR. **IKKE** history_past.
3. **Datakilde:** element-summary KUN lazy per klikk — aldri bulk. Gjenbruker
   eksisterende `getElementSummary(id)` (fplClient.js:111, nøkkel `element:${id}`,
   TTL 30 min, aldri brukt før). «Aldri element-summary»-regelen i CLAUDE.md
   gjelder bulk-analyse (transfers.js) og står urørt.
4. **Duell:** avkrysningsboks på radene + «Sammenlign»-knapp (aktiv ved nøyaktig 2).
   Visning rett under tabellen. Nøkkeltall side-ved-side med vinnermarkering.
   Kun bootstrap-data via data-attrs — 0 nettverkskall.
   **Vinnerregler:** pris → LAVEST vinner; dødball-roller → satt slår null, lavere
   ordenstall vinner; alle andre (form, poeng, P/K, eid %, xG, xA, minutter, bonus)
   → høyest vinner; likhet → ingen markering.
5. **Differensialer:** GLOBAL eierandel (`selected_by_percent`), terskel justerbar
   5/10/15 % (default 10), score = form × (6 − snitt-FDR neste **3** kamper),
   topp 10 vises. Egen seksjon på /spillere.
6. **Straffer:** seksjon «Dødballtakere» — én klubbtabell (20 rader) med ALLE tre
   roller: straffer (1. + neste i køen), hjørner/indirekte, direkte frispark.
   Rollene vises også på spillerkortet.
7. **Sideoppsett:** seksjoner under tabellen (ett scroll-dokument), hopplenker
   øverst: Tabell · Differensialer · Dødballtakere. 390 px-referanse.

## Målt mot ekte FPL-API (2026-09-01 — datakontrakt-fakta, null antakelser)

- **bootstrap-static:** 626 elements, 109 felter. `penalties_order` satt på 66
  spillere — **alle 20 klubber** har minst én (eks ARS: 1. Saka, 2. Gyökeres,
  3. Ødegaard). `corners_and_indirect_freekicks_order`: 80 spillere,
  `direct_freekicks_order`: 55. ALLE `*_text`-felter er tomme — brukes aldri.
- **Tallfelter er STRENGER:** `selected_by_percent="38.0"`, `form="6.0"`,
  `expected_goals="0.00"`, `points_per_game="6.0"`. `now_cost` i tideler (60=£6.0).
  `status="a"`, `photo="154561.jpg"`, `code`=spillerkode, `team_code`=klubbkode.
- **element-summary/{id}:** 13 KB nå (Haaland id 411, GW2), vokser mot ~50 KB
  seint i sesongen. Toppnøkler: `fixtures` (36 kommende: `event`, `is_home`,
  `team_h`/`team_a`, `difficulty`=FDR 1–5, `kickoff_time`, `finished`),
  `history` (per spilt runde: `round`, `opponent_team`, `was_home`,
  `total_points`, `minutes`, `goals_scored`, `assists`, `bonus`, `bps`,
  `expected_goals`/`expected_assists` som strenger, `value`, `selected`),
  `history_past` (brukes IKKE).
- GW2 er `is_current`, ikke `finished` per 1. sep.

## Verifiserte kodefakta (grep-et i planøkten — stol på disse)

- Rute: `src/routes/players.js:7` — GET /, henter `getBootstrap()`, sender players
  sortert på total_points + teams + helpers.
- `views/players.ejs`: filterskjema `#player-filters` (linje 7–44: søk `#filter-search`,
  pos, lag, pris, status, nullstill, `#filter-count`), tabell `class="data sortable"
  data-sortable id="players-table"` (linje 49), kolonner: Spiller, Lag, Pos, Pris,
  Form, Poeng, P/K, Eid %, xG, xA, Status. Rader har `data-name/pos/team/price/status`
  (data-name er lowercase for filteret).
- `public/app.js`: `escapeHtml` (1), `rowMatchesFilters` (22), `queryParam` (33),
  filterbinding ~263, `?sok=`-prefill 286–289 (v1.7.1-krysslenkene), sort-
  generalisering `table[data-sortable]` 179–235 (aria-sort, Enter/Space),
  klikkbare rader /liga 515–520. INGEN modal-kode fra før.
- `src/routes/api.js`: JSON-rutemønster (GET /brief.json:39, /live.json:135,
  POST /ai-rad:144). `noStore` dekker hele /api fra v1.7.1 (middleware.js:34).
- `src/middleware.js` ~57: JSON-feilhandler for /api svarer allerede 503 med
  «FPL-API-et oppdateres — prøv igjen om noen minutter.» og `{error}`-form.
- `src/services/analysis.js`: `POSITIONS` (4), `POSITIONS_SHORT` (11: K/F/M/A),
  `STATUS_LABELS` (14), `nextEvent` (28), `formatPrice` (50),
  `teamFdrMap(fixtures, fromGw, count = 3)` (198), `differentials(myIds,
  rivalIds, elements)` (432 — miniliga-varianten, brukes av league-insights.js:193,
  STÅR URØRT), `translateFplNews` (531).
- `src/services/fplClient.js:111`: `getElementSummary(playerId)` — nøkkel
  `element:${playerId}`, TTL 30 min. `ageOf(key)` finnes i cache.js.
- CSS: `.table-scroll` (560), `.fdr-1..5` (984→, `var(--fdr-N)`), `.btn-link`
  (1546). **`.compare` finnes IKKE** — duelltabellen bruker `table.data` + nye
  klasser. **`--overlay` finnes IKKE** — ny token, MÅ inn i BEGGE temablokker
  (`:root` og `:root[data-theme="light"]`), ellers feiler style.test.js.
- `src/server.js:52`: `compression()` aktiv.
- Tester: `test/players.test.js` finnes IKKE (ny). Mønstre: app-client.test.js
  laster app.js-funksjoner via vm; views.test.js rendrer EJS med
  `test/fixtures/views.js`; fplClient.test.js mocker global fetch;
  routes.test.js gjør kildeskanning (brukes til 0-AI-vern); style.test.js
  låser token-par/kontrast og skal bestå urørt.

## Arkitektur: ny `src/services/players.js`

`buildPlayerCard` (ren), `buildDifferentials` (ren), `buildSetPieceTable` (ren),
`assemblePlayerCard` (henter). Følger pakke-per-side-presedensen fra v1.5.0–v1.7.0
(transfers.js, league-insights.js, insights.js). Importerer `teamFdrMap`,
`nextEvent`, `formatPrice`, `POSITIONS`, `POSITIONS_SHORT`, `STATUS_LABELS`,
`translateFplNews` fra analysis.js — duplér ALDRI FDR-logikk. Samme basenavn i
routes/ og services/ er etablert (insights). Dataflyt: routes → services →
fplClient. Importerer ALDRI ai.js.

## Datakontrakt

### `GET /api/spiller/:id` → 200 (norske feltnavn, dataAlder-stilen)

```json
{
  "id": 411,
  "navn": "Haaland",
  "fulltNavn": "Erling Haaland",
  "lag": { "navn": "Man City", "kort": "MCI", "kode": 43, "id": 13 },
  "posisjon": "Angrep", "posKort": "A", "erKeeper": false,
  "pris": "14.1", "eid": "69.8", "form": "6.0",
  "totalPoeng": 32, "poengPerKamp": "6.0",
  "xg": "2.40", "xa": "0.60", "minutter": 180,
  "status": "a", "statusTekst": "Klar",
  "nytt": null, "spillesjanse": null,
  "dodball": { "straffer": 1, "hjorner": null, "frispark": null },
  "sisteKamper": [
    { "runde": 2, "motstander": "ARS", "hjemme": true, "poeng": 12,
      "minutter": 90, "mal": 2, "assists": 0, "xg": "1.47", "xa": "0.20", "bonus": 3 }
  ],
  "kommende": [
    { "runde": 3, "motstander": "LIV", "hjemme": false, "fdr": 4 }
  ],
  "dataAlder": null
}
```
(Verdiene er illustrative; feltNAVNENE er kontrakten.)

Regler:
- `nytt` = `translateFplNews(news)`, tom → `null`. `spillesjanse` =
  `chance_of_playing_next_round` (null-guard).
- `sisteKamper` = siste 5 innslag i `history`, nyeste først. DGW gir to rader
  samme runde — begge vises. `was_home` mangler → `hjemme: null` (view utelater
  H/B-merket). `history` tom/mangler → `[]`.
- `kommende` = første 3 fixtures med `event != null && !finished` (blank GW
  hoppes), `fdr` = `difficulty`, motstander utledes av `is_home` +
  `team_h`/`team_a` mot teams.
- Strengtall sendes videre SOM STRENGER (visning) — aldri reformatert.
- `dataAlder` = sekunder siden element-summary-hentingen via ny
  `elementSummaryAgeSec(id)` i fplClient (~4 linjer, `ageOf('element:'+id)` —
  fplClient eier nøkkelnavnet, som staleInfo-mønsteret).
- Feil: ikke-heltalls-id → 400 `{error:"Ugyldig spiller-id"}`; id ikke i
  bootstrap → 404 `{error:"Fant ikke spilleren"}` **uten** element-summary-kall;
  503 under oppdatering → eksisterende JSON-feilhandler.

### Nye data-attrs på radene i players.ejs (i tillegg til dagens)

`data-id`, `data-navn` (web_name original casing), `data-lag` (short_name),
`data-form`, `data-poeng` (total_points), `data-pk` (points_per_game),
`data-eid` (selected_by_percent), `data-xg`, `data-xa`, `data-min` (minutes),
`data-bonus` (bonus), `data-straffer`/`data-hjorner`/`data-frispark`
(ordensverdiene, tom streng når null). ~626 rader × ~130 byte — ufarlig bak
compression(), måles i T6.

## Tasks (TDD: RED før GREEN i HVER task; CHANGELOG under [Unreleased] i samme commit)

Testtallene under er anslag — retningen RED→GREEN er kravet, ikke tallet.

### T1 — Lås getElementSummary-kontrakten
`test/fplClient.test.js` (fetch-mock + `_setNow`). Funksjonen finnes, men er
ubrukt og utestet.
**RED:** (1) `getElementSummary henter element-summary/{id}/ og cacher i 30 min`
(andre kall innen TTL → 1 fetch); (2) `getElementSummary deler ikke nøkkel
mellom spillere` (id 1 + id 2 → 2 fetch).
**GREEN:** ingen produksjonsendring ventet — testene skal bestå mot dagens kode;
feiler de, rettes fplClient. 556 → ~558.
Commit: `test(fplClient): lås getElementSummary — egen nøkkel per spiller, 30 min TTL`

### T2 — buildPlayerCard (ren)
Ny `src/services/players.js` + ny `test/players.test.js`. Fixtures med de MÅLTE
feltnavnene (bootstrap-element + element-summary-utdrag — se datakontrakten).
`buildPlayerCard({ element, teamsById, summary })` → payloaden uten dataAlder
(ruta legger den på).
**RED (7):** full mapping med norske felt; `nytt` oversettes og tom → null;
siste 5 = slice nyeste først + DGW-dobbeltrad; `was_home` mangler → `hjemme: null`;
kommende hopper `event: null` og `finished: true`, maks 3; history tom/undefined
→ `sisteKamper: []`; dødball-null-guards (`?? null`).
**GREEN:** implementer. → ~565.
Commit: `feat(spillere): buildPlayerCard — payload for spillerkortet`

### T3 — buildDifferentials (global)
`buildDifferentials({ elements, fixtures, fromGw })` →
`{ terskler: [{prosent: 5, rows}, {prosent: 10, rows}, {prosent: 15, rows}] } | null`.
Kandidatfilter: `parseFloat(selected_by_percent) < prosent` (10.0 er IKKE < 10),
`status === 'a'`, `minutes > 0`, `parseFloat(form) > 0`. Har ALLE kandidater
form 0 (sesongstart) → returner **null** (ærlig tomtilstand, aldri vilkårlig
rangering). Score = `(parseFloat(form)||0) × (6 − (teamFdrMap(fixtures, fromGw,
3).get(team) ?? 3.5))`, 1 desimal, topp 10 per terskel.
Row: `{ id, navn, lag: {kort, kode, navn}, posKort, pris, form, eid, fdr3, score }`.
**RED (6):** terskelgrensen (eksakt 10.0 ekskluderes); scoreformel mot håndregnet
fasit; FDR-fallback 3.5 uten kamper i vinduet; sortering + topp 10-kutt;
alle form 0 → null; status-/minuttfiltrene.
**GREEN:** implementer med `teamFdrMap`-import. → ~571.
Commit: `feat(spillere): buildDifferentials — global differensial-finner med terskler`

### T4 — buildSetPieceTable
`buildSetPieceTable({ elements, teams })` → 20 rader sortert på klubbnavn
(`localeCompare` med 'nb'): `{ lag: {id, navn, kort, kode}, straffer: [navn…],
hjorner: [navn…], frispark: [navn…] }`. Per rolle: spillere med ordensfeltet
satt, sortert stigende, **topp 2**. Tom rolle → tom liste (view viser «–»).
`*_text`-feltene brukes ALDRI (målt tomme).
**RED (5):** ordenssortering; topp 2-kutt; klubb uten takere → tomme lister men
raden finnes; alle 20 klubber ut uansett; klubbsortering.
**GREEN:** implementer. → ~576.
Commit: `feat(spillere): buildSetPieceTable — dødballtakere per klubb`

### T5 — assemblePlayerCard + GET /api/spiller/:id + kildekontrakter
- `services/players.js`: `assemblePlayerCard(id)` — `getBootstrap()` → finnes
  elementet? nei → `null` (ALDRI element-summary for ukjent id) →
  `getElementSummary(id)` → `buildPlayerCard`.
- `fplClient.js`: `elementSummaryAgeSec(id)`.
- `routes/api.js`: `GET /spiller/:id` — heltallsvalidering → 400; null → 404;
  ellers `res.json({ ...kort, dataAlder })`. noStore dekker ruta allerede.
**RED:** i players.test.js (fetch-mock à la transfers.test.js:385):
`assemblePlayerCard henter element-summary kun for gitt id`; `ukjent id gir null
uten element-summary-kall`. I routes.test.js (kildeskanning): `spillere-pakka
rører aldri ai.js` (routes/players.js + services/players.js uten ai-import);
`kun api.js blant rutene bruker getElementSummary` (bulk-vernet — routes/players.js
skal ALDRI). I fplClient.test.js: `elementSummaryAgeSec leser alderen på
element-nøkkelen`.
**GREEN:** implementer. → ~581.
Commit: `feat(api): GET /api/spiller/:id — lazy spillerkort med norsk feilhåndtering`

### T6 — /spillere-ruta + view: seksjoner, hopplenker, datagrunnlag
- `src/routes/players.js`: hent `getFixtures()` parallelt med bootstrap
  (`Promise.all`); `fromGw = nextEvent(events)?.id ?? null`; send
  `differentials` (null når garden slår til), `setPieces`, spillerlisten uendret.
- `views/players.ejs`:
  1. Hopplenker under page-head: «Tabell · Differensialer · Dødballtakere»
     (`#tabell/#differensialer/#dodballtakere`, ny `.jump-nav`, id på seksjonene).
  2. Radene: nye data-attrs (kontrakten over); navnecellen blir
     `<button type="button" class="btn-link js-spillerkort" data-id="…">`;
     NY checkbox-kolonne først: `<th data-nosort>` med sr-only-tekst,
     `<input type="checkbox" class="duell-velg" aria-label="Velg <navn> til duell">`.
  3. Duell-skall: `.duell-bar` (teller «N av 2 valgt» + «Sammenlign» disabled +
     «Tøm valg») + tom `<section class="card" id="duell" hidden>` under tabellen.
  4. Differensial-seksjon: fieldset med tre radioer (5/10/15, 10 forhåndsvalgt) +
     TRE pre-rendrede tabeller (`data-terskel`, kun 10 synlig) — terskelbytte er
     ren klient-toggle, 0 nettverk. Kolonner: Spiller (js-spillerkort-knapp) |
     Lag | Pos | Pris | Form | Eid % | FDR 3 | Score. Tomtilstand ved null:
     «Differensialer kommer når formtallene finnes — etter første runde».
  5. Dødballtakere: `.table-scroll`-tabell, 20 rader: Klubb (club-badge) |
     Straffer (Navn1 · Navn2) | Hjørner/indirekte | Direkte frispark, «–» for
     tomt. Navnene som js-spillerkort-knapper (gjenbruker modalen).
  6. Modal-skall: `<div id="spillerkort" hidden>` med backdrop,
     `role="dialog" aria-modal="true" aria-labelledby`, lukkeknapp, tom body.
     Pluss `<template data-shirt="<teamId>">`/`data-shirt-keeper` per klubb
     (20×2) som inkluderer `partials/club-shirt` — clubAssets-vokteren rendrer
     server-side, klienten KLONER templaten og skriver aldri `<img>` i blinde.
- `public/app.js` Modul 2: hopp over `th[data-nosort]` i sorteringsbindingen.
- `public/style.css`: `.jump-nav`, `.duell-bar`, terskelvelger — KUN
  eksisterende tokens.
**RED:** utvid `test/fixtures/views.js` (fx.players med differentials/setPieces/
nye locals + fx.playersNoDiff); views.test.js (7): 'Dødballtakere',
'Differensialer', tomtilstanden, 'duell', 'spillerkort', `data-shirt`,
`js-spillerkort`.
**GREEN:** rute + view + CSS. Mål payload-vekst (`curl -s localhost:3000/spillere | wc -c`). → ~588.
Commit: `feat(spillere): seksjoner, hopplenker og duell-datagrunnlag på /spillere`

### T7 — Klient: spillerkort-modalen + CSS
`public/app.js`:
- Ren strengbygger `playerCardHtml(data, shirtHtml)`: escapeHtml på ALT (navn,
  nytt, motstander — også attributtverdier); `.fdr-N`-klasser på kommende;
  dødball-roller som «Straffer: 1. valg»; tomtilstand «Ingen spilte kamper ennå»
  ved tom sisteKamper; nøkkeltall-grid + siste kamper-tabell + kommende-liste.
- Modul: delegert klikk på `.js-spillerkort` → åpne modal, lastetilstand
  (dots-mønsteret fra AI-rådgiveren), `fetch('/api/spiller/'+id)`, klient-cache
  i `Map` (noStore gjør nettlesercache død — serverens 30 min tar resten),
  feil → `data.error` eller «Fikk ikke hentet spillerkortet — prøv igjen.»
- A11y: fokus til lukkeknappen ved åpning, Esc + × + backdropklikk lukker,
  Tab-felle i dialogen, fokus tilbake til utløserknappen, body-scroll låses.
`public/style.css`: `.modal`-familie med NY token `--overlay` (rgba) definert i
BEGGE temablokker — ellers feiler style.test.js.
**RED (app-client, vm-mønsteret, 4–5):** playerCardHtml escaper navn/nytt
(`<script>`-fixtur); FDR-klasser fra fdr-verdien; tomtilstand ved tom historikk;
dødball-rader kun for satte roller.
**GREEN:** implementer. → ~593.
Commit: `feat(spillere): spillerkort-modal — lazy henting, Esc/fokus, drakt fra partial`

### T8 — Klient: spillerduellen + CSS
Rene funksjoner i app.js (testes via app-client):
- `duelStatus(count)` → `{ enabled: count === 2, tekst: 'N av 2 valgt' }`.
- `duelData(ds)` → parsed objekt fra dataset (parseFloat KUN til sammenligning,
  visning beholder strengen; tomme dødballattrs → null).
- `duelWinners(a, b)` → per nøkkel `'a' | 'b' | null` etter vinnerreglene i
  fasiten (pris lavest; dødball satt-slår-null + lavest ordenstall; ellers
  høyest; likhet → null).
- `duelHtml(a, b, winners)` → tabell (`table.data`), vinnercelle
  `<strong class="accent">` (eksisterende mønster), escapeHtml på navn.
Modul: delegert change-lytter på `.duell-velg` (tilstanden bor i input-noden som
flyttes MED raden ved sortering — aldri radindeks); maks 2 (tredje avvises);
«Sammenlign» rendrer `#duell` og scroller dit; «Tøm valg» nullstiller.
`applyFilters`-løypa utvides: rader som skjules får haken fjernet + status
oppdateres. Duell bygget fra kopierte data består om raden filtreres bort etterpå.
**RED (app-client, 6):** duelStatus 0/1/2/3; duelWinners pris-lavest + likhet +
dødball-regelen; duelData strengtall/null; duelHtml escaper og markerer vinnere.
**GREEN:** implementer + CSS (kun tokens). → ~599.
Commit: `feat(spillere): spillerduell — avkrysning, sammenlign og vinnermarkering`

### T9 — Røyktest + versjon + docs
- package.json → 1.8.0. CHANGELOG: [Unreleased] → [1.8.0] med dato.
- ROADMAP: huk av v1.8.0 i versjonstabellen + køen. CLAUDE.md: services/players.js
  i arkitekturblokka, `/api/spiller/:id`, regelen «element-summary kun lazy per
  klikk — aldri bulk», elementSummaryAgeSec. HANDOVER: status + logg
  (200-linjerstak — roter ved behov). docs/VIDERE.md ajour.
- Røyktest med TOMME nøkler (scratchpad-.env-oppskriften i HANDOVER —
  `config.js` kjører `process.loadEnvFile()` som leser repoets `.env` uansett,
  så sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` tomme FØRST):
  alle 9 ruter 200 + /finnesikke 404, `GET /api/spiller/<gyldig id>` 200,
  `/api/spiller/abc` 400, `/api/spiller/999999` 404, `/health` →
  `ai:false, discord:false`, **0 «AI-kall:»-linjer i loggen**.
- Manuell sjekk mot ekte FPL-data (`npm run dev`): modal (klikk, Esc, fokus
  tilbake), duell (2 valgte, filtrering fjerner hake), terskelbytte 5/10/15,
  390 px i BEGGE temaer (checkbox-kolonne + modal + duell).
- Full `npm test` + `npm run lint` → vis talllinjene.
Commit: `chore(release): v1.8.0 — versjon, CHANGELOG og docs ajour`
**STOPP her: ingen merge, ingen tag, ingen push uten Marius' klarsignal.**

## Filliste

**Nye:** `src/services/players.js` · `test/players.test.js`
**Endrede:** `src/routes/players.js` · `src/routes/api.js` ·
`src/services/fplClient.js` (kun elementSummaryAgeSec) · `views/players.ejs` ·
`public/app.js` · `public/style.css` · `test/fplClient.test.js` ·
`test/routes.test.js` · `test/app-client.test.js` · `test/views.test.js` ·
`test/fixtures/views.js` · `CHANGELOG.md` · `ROADMAP.md` · `CLAUDE.md` ·
`docs/HANDOVER.md` · `docs/VIDERE.md` · `package.json`
**Urørte (bevisst):** `src/services/analysis.js` (kun importeres fra),
`test/style.test.js` (grønn hele veien), `src/services/transfers.js`.

## Testplan

| Hva | Hvor | Mønster |
| --- | --- | --- |
| getElementSummary/elementSummaryAgeSec | test/fplClient.test.js | fetch-mock + _setNow |
| buildPlayerCard/buildDifferentials/buildSetPieceTable | test/players.test.js | fixtures med målte feltnavn |
| assemblePlayerCard (kun gitt id; ukjent → 0 kall) | test/players.test.js | fetch-mock à la transfers.test.js:385 |
| 0 AI + bulk-vern | test/routes.test.js | kildeskanning |
| playerCardHtml, duel*-funksjonene | test/app-client.test.js | vm-lasting av app.js |
| Seksjoner, tomtilstander, modal-/duell-skall, drakt-templates | test/views.test.js + fixtures | EJS-rendring |
| Tokens/kontrast | test/style.test.js | består urørt |

556 → ~599 tester (anslag).

## Risikoliste

1. **503/gameUpdating under modal-henting** → JSON-feilhandleren svarer alt 503
   med norsk melding på /api; klienten viser `data.error` i modal-body — aldri
   krasj, modalen kan lukkes.
2. **XSS fra FPL-navn/news** → escapeHtml på alt klientside (navnene kommer fra
   FPL, samme trussel som lagnavn-escapingen i live.ejs).
3. **Valgt rad filtreres bort** → applyFilters fjerner haken + oppdaterer teller;
   åpnet duell består (kopierte data, ikke DOM-referanser).
4. **Modal-a11y** → fokus-styring + Esc + Tab-felle + aria; manuell tastatursjekk i T9.
5. **Strengtall** → parseFloat kun i beregninger; visning viser FPL-strengen urørt.
6. **Tom history tidlig i sesong** → `sisteKamper: []` + tomtilstand; nøkkeltall
   vises uansett.
7. **Sortering vs. checkbox** → tilstand bor i input-noden som flyttes med raden;
   `data-id`, aldri radindeks; `th[data-nosort]` unntas sortering.
8. **Alle form 0 (sesongstart)** → buildDifferentials → null → ærlig tomtilstand.
9. **Payload-vekst /spillere** (~90–130 KB ukomprimert ekstra) → compression()
   finnes; måles i T6; drakt-templates er 20×2, ikke per spiller.
10. **Ukjent id** → bootstrap-sjekk FØR element-summary (0 bortkastede kall).
11. **Blank/dobbel GW i kommende** → fixtures uten `event` hoppes; DGW gir to
    rader samme runde.

## Kall-budsjett

Sidelast /spillere: bootstrap (15 min, delt) + fixtures (15 min, delt) — 0 nye
kall-typer, varm cache = 0. Modalklikk: 1 × element-summary per unike spiller
per 30 min (SWR + in-flight-dedup i cache.js). Duell/differensialer/dødball:
0 nettverk etter sidelast. **AI: 0 kall i alle tilstander.**

## Praktiske fallgruver for utførelses-økten (fra HANDOVER — IKKE hopp over)

- Alle docs er CRLF (ROADMAP har BOM) — bruk Edit-verktøyet, ALDRI node-replace
  med `\n` i søkestreng, aldri `sed -i`. Nye kildefiler skrives med LF.
- Restart serveren etter endringer i src/ — ESM lastes én gang.
- Klikk ALDRI «Spør AI om råd» på /lag under verifisering.
- Sjekk `git status -sb` før branch-opprettelse — ikke anta main = origin/main.
- Alle svar til Marius starter med «Hei Marius!».
- Nærmer økten seg ~95 % usage: stopp, oppdater HANDOVER grundig, commit.
