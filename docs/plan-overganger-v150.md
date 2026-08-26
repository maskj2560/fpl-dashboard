# Plan v1.5.0 — «Overganger» total: analyse + planlegger + scenarier

> Fasit for byggingen. Vedtatt 26. aug 2026 etter tre spørsmålsrunder med
> Marius. Bygges på branch `feat/overganger-v150` (stablet oppå
> `feat/alderstak-v140`), deployes ETTER måleuka (7. sept+) som v1.5.0,
> etter v1.3.8 → v1.4.0. Arkiveres til `docs/arkiv/` når utført.

## Kravene (alle bekreftet av Marius)

1. **Angre-analyse per bytte:** hver rad i byttetabellen kan utvides med
   per-runde-poeng for inn- og ut-spiller, så man ser NÅR byttet snudde.
   Horisont: løpende sesongtotal + milepæl «etter 5 runder: +N».
2. **Planlegger («hva hvis» før bytte):** velg spiller UT fra egen tropp og
   INN fra alle, side-om-side-sammenligning (form, pris/salgspris, FDR,
   forventet poeng, eierandel, status). FULL FPL-regelsjekk: posisjon,
   budsjett = salgspris + bank, maks 3 fra samme klubb.
3. **Scenario-oppfølging:** flere NAVNGITTE scenarier (en runde, 1+ bytter),
   lagres på disk, evalueres etterpå: «planen ville gitt X, du fikk Y».
4. **Alternativ-analyse:** per gjort bytte — «hva om Z i stedet for Y»:
   auto topp 3 (samme posisjon/prisklasse) + egne kandidater.
5. **Sesongkort:** netto inkl. -4, treffprosent, beste/verste, trekk betalt.
6. **Laget uten bytter:** GW1-laget simulert hele sesongen mot faktisk score.
7. **Prisgevinst:** kjøpspris mot nåpris/salgspris, tapte salg.
8. **AI-kommentar:** cachet 1x/døgn via refresh.js, aldri ved sidevisning.
   (Overstyrer den gamle beslutningen «uten AI-kommentar i v1».)
9. **FT-regnskap (Marius' krav):** gratisbyttene REKONSTRUERES — 1 per
   runde, bank opptil 5, WC/FH bruker ingen — og selvvalideres mot
   `event_transfers_cost`; mismatch → rå poeng med merknad.
10. Åpne POST/DELETE uten auth: akseptert (samme trusselmodell som resten).
11. Layout, analyse øverst: 1 Sesongkort · 2 AI-kommentar · 3 Bytte for
    bytte (utvidbare rader) · 4 Planlegger · 5 Scenarier · 6 Laget uten
    bytter · 7 Prisgevinst.

## Rammer (absolutte)

- Branch `feat/overganger-v150` STABLET oppå `feat/alderstak-v140`. ALDRI
  merge/tag/push i byggefasen. Release-rekkefølge etter P4:
  v1.3.8 → v1.4.0 → v1.5.0 (`--no-ff` + tag per versjon).
- TDD RED → GREEN per task. Dagens transfers-tester skal ALDRI knekke:
  `totals`-formen `{diff, cost, netto, count, skipped}` er låst (nye
  aggregat i NYTT toppnivåfelt `season`), og `assembleTransferAnalysis`
  sin kalladferd er låst (aldri element-summary, aldri runder før første
  transfer) — ny henting skjer i NY `assembleTransfersPage()`.
- Nettverk kun i fplClient.js. Sidevisning blokkerer aldri på AI. 0 ekte
  AI-kall under bygging (røyktest med tomme nøkler). Norsk UI, tema-tokens
  (style.test.js urørt), 390 px referanse, klubbmerker via partials.
- `element_in_cost`/`element_out_cost` er UVERIFISERT før første transfer
  (fre 28.) og P3 (ma 31.): guards + `ukjent: true`-fallback, aldri
  krasj/NaN. T3/T4 re-verifiseres mot ekte data ved P3 før merge.

## Arkitektur

Nye service-filer (transfers.js ville blitt 600+ linjer):

- `src/services/pricing.js` — salgspris + kjøpshistorikk + prisrapport (ren)
- `src/services/baseline.js` — «laget uten bytter»-simulering (ren)
- `src/services/scenarios.js` — planlegger-data, regelvalidering, FT-ledger,
  scenario-CRUD + persistens (`DATA_DIR/scenarios.json`, notify.js-mønsteret)
- transfers.js beholder analysen + får `assembleTransfersPage()` + AI-generator

Nøkkelbeslutninger:

- **B1 Spillerliste:** nytt `GET /api/planlegger.json` bygget kun fra
  eksisterende cacher, lazy-fetch ved første åpning av planleggeren — ikke
  inline JSON (70–100 KB på hver sidevisning ellers).
- **B2 Per-runde-detaljer:** `<details>` er ugyldig i `<tbody>` — JS-togglet
  `<tr class="row-detail" hidden><td colspan>` + knapp med `aria-expanded`.
  Details/summary kun utenfor tabeller (Laget uten bytter).
- **B3 Salgspris (tideler):** `profit > 0 ? buyCost + floor(profit/2)
  : nowCost`. Kjøpspris = siste transfer-record med `element_in === id`
  som IKKE er free hit-runde; ellers GW1-original:
  `now_cost − cost_change_start`. Edge: gjenkjøp (siste vinner), wildcard
  (teller normalt), inn+ut samme runde (siste etter `time`), manglende
  felt (`ukjent`).
- **B4 Scenario-fil:** `{version: 1, scenarios: [{id (randomUUID), name,
  event, createdAt, moves: [{out, in}], snapshot: {bank, prices}}]}`.
  Korrupt/feil versjon → tom liste + warn, overskrives først ved neste
  lagring. Tak 20. Uskrivbar disk → 503 med norsk melding, aldri krasj.
- **B5 Alternativ-pris:** startpris (`now_cost − cost_change_start`) som
  dokumentert proxy («pris ved sesongstart»), toleranse ±5 tideler mot
  byttets `element_in_cost`. Poeng fra liveByGw over byttets eget vindu.
- **B6 Baseline:** full autosub-sim som ren funksjon: GW1-tropp fryses;
  0-minutters startere byttes mot benken i rekkefølge under formasjonskrav
  (1K, ≥3F, ≥2M, ≥1A; keeper↔keeper); kaptein = faktisk kaptein den runden
  hvis i GW1-troppen, ellers GW1-vise; kaptein 0 min → visen dobles;
  alltid ×2 (TC ignoreres, dokumentert). Faktisk total fra
  `getEntryHistory.current[siste].total_points`. Faktisk kaptein per runde:
  ny `getPicksHistoric(teamId, gw)` — delt nøkkel `picks:${teamId}:${gw}`,
  6 t TTL, kun ferdige runder.
- **B7 AI-kommentar:** kun refresh.js-tikket, maks 1x/døgn, kun når ≥1
  spilt bytte. Ruta leser kun `ai.getCached`. `card-ai` + `.ai-badge`
  under sesongkortet.
- **B8 FT-ledger** (scenarios.js): `buildFtLedger({history, chips})` → per
  runde `{ftBefore, used, paid}`; ft = 1 i GW2,
  `ft_next = min(5, max(ft − transfers, 0) + 1)`, WC/FH-runde:
  `ft_next = min(5, ft + 1)` og kost 0. Valider
  `max(0, transfers − ft)*4 === event_transfers_cost` for ALLE runder →
  `valid`. Scenario-kost = `max(0, moves − ftBefore(N))*4` når valid
  (scenariet ERSTATTER rundens faktiske bytter); ellers rå poeng + merknad.

## API-flate

| Endepunkt | Metode | Ut/valg |
|---|---|---|
| `/api/planlegger.json` | GET | `{event, bank, squad: [{id, navn, lag, lagKode, pos, sellPrice, buyCost}], players: [{id, navn, lag, lagKode, pos, pris, form, epNext, eid, status, sjanse, fdr3}]}` |
| `/api/scenarier` | POST | 201 `{scenario}` / 400 `{errors: [{code, message}]}` — server-validering autoritativ |
| `/api/scenarier/:id` | DELETE | 204 / 404 |
| `/api/alternativ.json` | GET | `?spiller=&fra=&til=` → `{points, perGw}` / 400 |

Valideringskoder: navn, runde, ukjent-spiller, ikke-i-troppen,
alt-i-troppen, posisjon, budsjett (salgspris+bank, IKKE nåpris), klubbtak
(ut-spilleren frigjør plassen sin), duplikat. `express.json()` er montert.

## Tasks (hver = én commit, grønn suite; CHANGELOG under [Unreleased] løpende)

- [x] **T0 Oppstart:** denne fila + HANDOVER/ROADMAP ajour (main),
      branch `feat/overganger-v150` fra `feat/alderstak-v140`.
- [ ] **T1 Per-runde + milepæl + sesongtall (ren):** transfers.js. Per rad:
      `perGw: [{gw, inn, ut, diff, cum}]` (tom når `!played`),
      `after5: {diff, gws, complete}|null`; toppnivå `season: {played,
      wins, hitRate, hitsPaid}` (hitRate null ved 0 spilte, hitsPaid =
      cost/4). Tester: perGw dekker vinduet m/løpende sum; tom for
      pending/angret; after5 komplett/ukomplett/terminert; treffprosent
      kun over spilte; eksisterende grønne.
- [ ] **T2 UI sesongkort + utvidbare rader:** transfers.ejs, app.js
      (Modul 7: toggle), style.css (`.row-detail`, `.btn-expand`,
      `.milestone`), views-test + fixtures (ADDITIVE felter,
      `locals.`-guards — markørtestene består). Kantfade re-init.
- [ ] **T3 pricing.js (NY, ren):** `sellingPrice`, `buildPurchases`,
      `buildPriceReport` → `{holdings, totals, missed, bank, value}`.
      test/pricing.test.js: halvering rundes ned; prisfall → nåpris;
      gjenkjøp; FH ignoreres; WC teller; GW1-startpris; manglende felt →
      ukjent, aldri NaN; missed kun ved prisstigning; gjenkjøpt ikke i missed.
- [ ] **T4 `assembleTransfersPage()` + prisgevinst-seksjon:** transfers.js
      (myk feil per del som assembleLive), routes/transfers.js bytter,
      viewet seksjon 7. Test: picks-404 → analyse vises, prisgevinst
      skjules; assembleTransferAnalysis-kalladferd uendret.
- [ ] **T5 baseline.js (NY) + `getPicksHistoric`:** fplClient (delt nøkkel,
      360 min, kun ferdige runder), `simulateNoTransferSeason` →
      `{perGw: [{gw, points, captainId, viceUsed, autosubs}], total}`,
      `assembleBaseline` → null ved 0 bytter/manglende GW1-picks. Viewet
      seksjon 6 (details/summary per-runde). Tester: autosub-rekkefølge;
      formasjonskrav; keeper↔keeper; kapteinsregler ×3; 0 bytter henter
      ingenting; delt cache-nøkkel.
- [ ] **T6 planlegger-data + GET /api/planlegger.json:** scenarios.js
      (`buildPlannerData`), api.js. Tester: salgspris per tropp-spiller;
      fdr3 fra teamFdrMap; null aldri undefined; 400 uten team-id.
- [ ] **T7 regelvalidering + planlegger-UI:** scenarios.js
      (`validateScenario` → `{ok, errors}`), viewet seksjon 4, app.js
      Modul 8 (lazy fetch, søk, klient-speil av reglene), style.css
      (`.compare`, `.rule-check`). Tester: posisjonsmismatch; budsjett =
      salgspris+bank; klubbtak inkl. frigjort plass; alt-i-troppen;
      gyldig → tom feilliste.
- [ ] **T8 FT-ledger + persistens + CRUD:** scenarios.js (`buildFtLedger`
      per B8; load/persist/list/add/remove + `_setHooks`/`_reset` etter
      notify.js-mønsteret), api.js POST/DELETE. Tester: FT bygger til
      maks 5; WC/FH bruker ikke FT; validerer mot event_transfers_cost;
      mismatch → valid false; manglende/korrupt fil → tom liste; ukjent
      versjon; tak 20; DELETE ukjent → 404; POST regelbrudd → 400 uten
      lagring; uskrivbar disk → 503.
- [ ] **T9 scenario-evaluering + seksjon:** scenarios.js
      (`evaluateScenario` → `{plan: {diff, cost, after5}, actual: {…},
      perMove, pending, ftEstimert}`), assemble utvider liveByGw-spennet
      til min(førsteTransfer, minste scenario-event), viewet seksjon 5
      (+slett-knapp). Tester: plan måles fra scenariorunden; faktisk = 0
      ved ingen bytter; FT-kost begge sider; milepæl; framtidig runde →
      pending m/forventet kost; spiller borte fra bootstrap → plassholder.
- [ ] **T10 alternativ-analyse (ren + topp 3 i detaljraden):** transfers.js
      (`buildAlternatives({…, limit: 3, tolerance: 5})`, delt
      `candidatePoints`). Tester: samme posisjon + ±0.5m startpris;
      rangert på poeng i byttets vindu; egne spillere aldri kandidater;
      manglende buyCost → tom liste; pending → ingen.
- [ ] **T11 egne kandidater: GET /api/alternativ.json + UI:** api.js
      (1 ≤ fra ≤ til ≤ maxGw, kun cachede runder), app.js («legg til
      kandidat»). Tester: ugyldig id → 400; til > maxGw → 400; gyldig →
      sum + perGw.
- [ ] **T12 AI-kommentar:** prompts.js (`buildTransferCommentPrompt` —
      kompakt grunnlag, REGLER-blokk som briefen, maks ~120 ord),
      transfers.js (`generateTransferComment` → null ved 0 spilte bytter,
      `ai.generate` minInterval 24 t, maxTokens 1500), refresh.js
      (tredje bein i `refreshDecision`, `_tick` i egen try/catch),
      routes/transfers.js (`ai.getCached`), viewet seksjon 2. Tester:
      prompt har sesongnetto + hvert spilte bytte, utelater pending;
      ingen generering uten spilte bytter; 24-timersregel; ruta kaller
      aldri generate; tikk overlever feil.
- [ ] **T13 ferdigstilling:** package.json 1.5.0; CHANGELOG [1.5.0];
      ROADMAP; CLAUDE.md (pricing/baseline/scenarios i tabellen,
      AI-funksjon 5, scenarios.json i DATA_DIR); HANDOVER (status + RETT
      beslutningslista om AI-kommentar). Full røyktest med tomme nøkler:
      alle ruter 200, planlegger-payload, POST/DELETE-syklus, 0 AI-kall.
      STOPP: ingen merge/tag/push.

## Kall-budsjett

Kald sti: dagens 3 + ≤38 live → + 1 picks (5 min) + ≤38 picks-historikk
(6 t, delt nøkkel) + fixtures (delt) + ≤2 ekstra live-runder. Varm sti
(6 t) identisk med i dag. AI +1/døgn (~48–52 kall/uke totalt).
API-endepunktene leser kun cacher.

## Verifisering

- Per task: `npm test` grønn (vis tellinger), `npm run lint` 0.
- Etter T13: røyktest i scratchpad med TOMME nøkler (config leser repoets
  `.env` uansett — bekreft `/health` → `ai:false, discord:false`); vis
  rutestatuser + eksempel-payloads.
- Ved P3 (ma 31. aug, etter Marius' transfer fredag): verifiser
  `element_in_cost`/`element_out_cost` + FT-ledger mot ekte data fra
  entry/5330646; avvik → fix-commit på branchen.
- Marius tester lokalt (`npm run dev`) før merge; deploy etter 7. sept.

## Risikoer

- Transfer-feltnavn uverifisert til fredag → guards overalt, P3 er sjekkpunktet.
- FT-ledger kan avvike ved API-rariteter → selvvalidering + rå-fallback.
- v1.4.0-branchen er underlaget: renummereres den (P3-fix), rebases
  v1.5.0-branchen mekanisk.
- Baseline-simuleringen er tyngst — flest tester der (T5) før UI.
