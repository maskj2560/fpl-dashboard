# «Overganger» — historisk hva hvis-analyse av egne transfers — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (eller subagent-driven-development) to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ny side `/overganger` som viser hva hver av Marius' transfers denne
sesongen faktisk var verdt i poeng, med totalsum, straff, beste/verste bytte
og førsteklasses tomtilstander.

**Architecture:** Ny ren service `src/services/transfers.js`
(`buildTransferAnalysis` ren + `assembleTransferAnalysis` henter) etter
mønsteret fra `live.js`/`brief.js`. To nye fplClient-funksjoner
(`getEntryTransfers`, `getLiveHistoric`). Tynn rute + EJS-view som gjenbruker
eksisterende komponentklasser. Ingen nye avhengigheter, ingen persistens,
ingen AI (besluttet av Marius 2026-08-20).

**Tech Stack:** Express 5 + EJS, Node 22+, ESM, node:test, cache.js (SWR).

**Spec:** `docs/neste-okt-prompt-hva-hvis-transfers.md` (oppdragsdokumentet).
Ved utførelse: kopier denne planen til `docs/plan-hva-hvis-transfers.md`
(Task 1) og hold den i takt med virkeligheten.

## Global Constraints

- Branch `feat/hva-hvis-transfers`. **ALDRI push uten eksplisitt klarsignal
  fra Marius** (push til `main` auto-deployer til prod). Aldri deploy i
  vinduet torsdag 19:00–21:00.
- Conventional commits. `npm test` og `npm run lint` grønne **etter hver
  commit**. Utgangspunkt: 185/185 grønne, lint 0.
- TDD: test først, se rød, implementer, se grønn. Ingen nettverkskall i
  tester (mock global fetch, mønster i `test/fplClient.test.js`).
- Dataflyt: routes → services → fplClient → FPL-API. Nettverkskall mot FPL
  KUN i `src/services/fplClient.js`. Ingen forretningslogikk i routes/views.
- All UI-tekst norsk bokmål. Mørkt tema, CSS-variabler, ingen nye
  avhengigheter, ingen CDN-er.
- Dokumenter oppdateres i samme commit som endringen: CHANGELOG (Unreleased),
  ROADMAP, CLAUDE.md (filkart), docs/HANDOVER.md, planfilen.
- Ikke rør oppførsel sesongstart-verifiseringen observerer (live-polling,
  auto-brief, banner-logikk). `getLive(gw)` endres IKKE — historikk-varianten
  er en NY funksjon.

---

## Kontekst

Funksjonen lå som én linje i ROADMAP («Senere / idéer → Andre idéer»).
Marius vil vite om sesongens transfers har gitt eller kostet poeng. FPL har
ingen slik visning. Sesongen 2026/27 starter fredag 21. august 19:30 —
`entry/{id}/transfers/` er derfor **tom** nå og forblir tom til etter GW1.
Tomtilstanden er hovedtilstanden de første ukene og planlegges som
førsteklasses tilstand, ikke hjørnetilfelle.

**Beslutninger tatt av Marius 2026-08-20 (AskUserQuestion i plan-økten):**
egen side «Overganger» på `/overganger` (ikke seksjon på /lag, ikke /bytter),
og **uten AI-kommentar i v1** (legges som idé i ROADMAP).

Planen er validert av en arkitekt-gjennomgang som fant og tettet to hull:
vindu-terminering ved gjenkjøp av ut-spilleren, og kolonnenavn som ellers
ville sett ut som dobbelttelling av straffen.

## Beslutninger med begrunnelse (svar på oppdragets spørsmål)

### 1. Beregningsmodellen

- **Hva måles:** per transfer (ut=A, inn=B, gjaldt fra runde N):
  `diff = poeng(B i vinduet) − poeng(A i vinduet)`, og
  `netto = diff − straffandel`. **Rå spillerpoeng**, ikke vektet for
  benk/kaptein. Begrunnelse: «hva hvis» er et kontrafaktisk spørsmål om
  spillerne, ikke om lagoppstillingen; vekting ville krevd picks per runde
  (38 ekstra kall) og en modell for hva benken *ville* vært i det
  kontrafaktiske laget — mye kompleksitet for et mindre ærlig tall. UI-et
  sier eksplisitt hva som måles (forklaringslinje under overskriften).
- **Vinduet = perioden byttet faktisk var i effekt.** Fra runde N, til og
  med runden FØR den første av disse skjer i en senere transfer:
  1. **B selges igjen** (`element_out === B`) — neste transfer overtar
     målingen; kjeder (A→B i R3, B→C i R8) gir ikke-overlappende vinduer.
  2. **A kjøpes tilbake** (`element_in === A`) — da eier du begge og
     forgreningen er lukket; uten denne regelen telles As poeng dobbelt
     (som «tapt» her og som «vunnet» i gjenkjøpets egen rad).
  Skjer ingen av delene: til og med siste spilte/pågående runde
  (`resolvedGw`). Free Hit-transfers terminerer ALDRI andre vinduer (FPL
  reverserer laget selv etterpå — salget/kjøpet er midlertidig).
- **Samme spiller inn og ut i samme runde** (flip før deadline — FPL
  registrerer begge og tar straff): vinduet blir tomt, raden vises som
  «Angret før deadline», diff 0, men straffandelen består.
- **Kjent begrensning (dokumentert, ikke fikset):** modellen er
  per-beslutning, ikke global kontrafaktisk. En kjede A→B og B→C i samme
  runde summerer ikke eksakt til «A→C»-effekten. Akseptabelt for v1 —
  forklaringslinjen i UI sier at hvert bytte måles for seg.
- **Straff:** per runde fra `entry/{id}/history/` `current[]`, dokumentert
  feltnavn `event_transfers_cost` — **behandles som uverifisert**, leses med
  `?? 0` og verifiseres mot ekte data når GW2 er i gang (se «Skjemarisiko»).
  Straffen deles **likt** på rundens gyldige transfer-records (records som
  hoppes over pga. manglende felt teller ikke i nevneren — bevisst valg).
  Vises med én desimal og norsk komma når den ikke går opp. Totalsummen
  bruker rundens faktiske kost (ikke summen av avrundede andeler) — totalen
  er alltid eksakt.
- **Chips** (fra `history.chips`, navn: `wildcard`, `freehit`, `bboost`,
  `3xc`):
  - **Wildcard:** transfers behandles normalt (straffen er naturlig 0 i
    FPL-dataene). Raden merkes «Wildcard».
  - **Free Hit:** FPL reverserer laget etter runden → vinduet begrenses til
    KUN runde N, raden merkes «Free Hit», og FH-transfers ignoreres som
    terminatorer for alle andre vinduer (begge retninger).
  - `bboost`/`3xc` påvirker ikke transfers — ignoreres.
- **Transfer for framtidig runde** (gjort etter deadline, gjelder neste GW):
  vises som «Venter på runde N», teller ikke i totalsummen ennå.
- **Dobbeltrunder:** `event/{gw}/live/` sin `elements[].stats.total_points`
  er allerede aggregert over rundens kamper (bekreftet av eksisterende bruk
  i `src/services/live.js:36`) — ingen spesialhåndtering.
- **Blank runde / spiller mangler i live-payloaden:** 0 poeng (default).
- **Sortering:** transfers-endepunktet leverer nyeste først — sorter
  stigende på `(event, time)` før vindu-matching.

### 2. Data og kostnad

- **Ny** `getEntryTransfers(teamId)` → `entry/{id}/transfers/`, **TTL 5 min**
  — samme som entry/picks/history: endres bare når Marius selv gjør noe, og
  5 min matcher resten av entry-familien.
- **Poeng per runde: `event/{gw}/live/`** (ett kall per runde, alle spillere)
  — IKKE `element-summary/{id}/` (ett kall per spiller, opptil 2×antall
  transfers ≈ 40+ kall, uakseptabelt). Live-endepunktet er hardt begrenset
  oppad til 38 kall uansett antall transfers, og hentes kun fra tidligste
  transfer-runde (transfers kan tidligst gjelde runde 2).
- **Ny** `getLiveHistoric(gw)`: samme endepunkt og **samme cache-nøkkel**
  (`live:{gw}`) som `getLive`, men **TTL 6 timer**. Begrunnelse: en
  ferdigspilt rundes poeng er i praksis immutable; 6 t (kontra evig) fanger
  FPLs sjeldne etterkorrigeringer og begrenser minne. Delt nøkkel gjør at
  transfers-siden gjenbruker det live-siden alt har hentet — første skriver
  setter TTL-en, så dette skal stå i en kommentar. **Guard:** kalles kun for
  runder der bootstrap sier `finished: true` — pågående runde går via
  eksisterende `getLive` (1 min), så live-siden kan aldri få timegammel
  data. (`data_checked` er et strengere «ferdig»-kriterium; `finished` + 6 t
  TTL er godt nok — etterkorrigeringer plukkes opp innen 6 t.) `getLive`
  selv endres ikke (sesongstart-verifiseringen observerer den).
- Verste tilfelle kald cache sent i sesongen: 3 + ~37 kall med `Promise.all`
  ved første sidelasting, deretter varmt i 6 t. Tidlig i sesongen: 3–5 kall.
  Alt via `cache.js` (SWR + dedup) — ingen ny cache-mekanisme. (Skulle FPL
  rate-limite, er chunking à 8 en kjent utvei — ikke bygg den nå.)
- 503 «The game is being updated»: eksisterende mønster — `gameUpdating`
  settes i fplClient, layout viser banner, stale data serveres fra cachen.
  Kald cache + 503 gir feilside (kjent begrensning, P3-1 i ROADMAP — ikke
  denne oppgaven).

### 3. Arkitektur og plassering

- `src/services/transfers.js`: `buildTransferAnalysis({ transfers, history,
  bootstrap, liveByGw })` (ren, all logikk, all testdekning) +
  `assembleTransferAnalysis({ teamId } = {})` (henter; teamId-parameter er
  test-hook, default `config.fplTeamId`). Mønster: `live.js`/`brief.js`.
- Egen side **`/overganger`**, nav-navn **«Overganger»** (Marius' valg).
  Konsistent med norske URL-er og eksisterende ordbruk i appen. Nav-punktet
  legges etter «Lag» (hører til mitt lag-familien). Montering i `server.js`
  FØR 404-handleren (l.89).
- **Ikke** noe `/api/`-endepunkt — ingenting konsumerer det (frontenden er
  server-rendret og siden trenger ikke polling).
- Uten `FPL_TEAM_ID`: rendrer `no-team`-viewet, som de andre lagsidene.
  (`entry/{id}/transfers/` svarer normalt `[]`, ikke 404 — koden tåler
  begge.)

### 4. UI (se Task 5 for konkret markup)

- `page-head` med h1 «Overganger» + forklaringslinje (`.dim`) som definerer
  målingen i én setning.
- `.stat-strip`: Netto totalt (farget `.accent`/`.negative`), Overganger
  (antall), Poengstraff, Beste bytte, Verste bytte.
- Ett `.card` med `.table-scroll` + `table.data`. Kolonner: **Runde** (m/
  chip-badge), **Inn** (navn + poeng), **Ut** (navn + poeng), **Poengdiff**
  (inn − ut), **Straff**, **Netto** (diff − straff), **Periode** («R2–R7»,
  «Venter på runde 4», «Angret før deadline»). Navnene skiller diff fra
  netto med vilje — ellers ser straffen dobbelttalt ut. Beste/verste rad
  merkes med `.status`-badge. Nyeste runde øverst.
- Tre tomtilstander, alle med egen norsk tekst:
  1. Ingen `FPL_TEAM_ID` → `no-team`-viewet.
  2. Ingen transfers ennå (hovedtilstanden fram til GW2) → `.empty`-kort som
     forklarer hva siden vil vise og når den fylles.
  3. Transfers finnes, men ingen av dem har spilte runder ennå → tabellen
     vises med «Venter på runde N»-rader og stat-strip med «–».
- Gjenbruker kun eksisterende klasser (`.card`, `.data`, `.table-scroll`,
  `.stat-strip`, `.empty`, `.num`, `.accent`, `.negative`, `.dim`,
  `.status`). Forventet ny CSS: **null** (evt. én regel for badge-plassering).
  Mobil 390 px: vannrett scroll kun inne i `.table-scroll` (samme mønster som
  alle andre tabellsider).

### 5. AI

**Bevisst utelatt fra v1** (Marius' valg): tallene taler for seg selv, og en
kommentar koster per generering. Legges under «Andre idéer» i ROADMAP med
begrunnelse; kan ettermonteres via `ai.js` (cachet, minimumsintervall) når
det finnes ekte data å kommentere.

## Skjemarisiko (transfers-endepunktet er tomt før sesongstart)

Dokumentert skjema per record: `element_in`, `element_in_cost`,
`element_out`, `element_out_cost`, `entry`, `event`, `time` — **uverifisert**
(arrayet er tomt for alle entries nå). Tiltak:

1. `buildTransferAnalysis` validerer hver record: `element_in`,
   `element_out` og `event` må være heltall (event 1–38). Records som
   mangler felt hoppes over og telles i `totals.skipped`; viewet viser en
   `.dim`-linje «N overganger kunne ikke tolkes» når `skipped > 0`.
2. `event_transfers_cost` leses med `?? 0`.
3. **Verifiseringsoppgave etter GW2** (egen sjekkliste nederst): kjør ett
   ekte kall mot `entry/5330646/transfers/` og bekreft feltnavnene mot
   fixture-antakelsene. Avvik → oppdater fixtures + kode i en `fix:`-commit.

## Returstruktur fra `buildTransferAnalysis` (kontrakt for view og tester)

```js
{
  rows: [ // kronologisk (eldste først); viewet itererer baklengs
    {
      event: 2,
      chip: null,                        // 'wildcard' | 'freehit' | null
      inn: { id: 10, name: 'Haaland', points: 11 },
      ut:  { id: 11, name: 'Watkins', points: 1 },
      diff: 10,                          // inn.points − ut.points
      penaltyShare: 4,                   // rundens kost / antall gyldige transfers i runden
      netto: 6,                          // diff − penaltyShare
      window: { from: 2, to: 3 },        // null når ikke spilt
      played: true,                      // false: pending eller angret
      pending: false,                    // event > maxGw
    },
  ],
  totals: { diff: 10, cost: 4, netto: 6, count: 1, skipped: 0 },
  // cost = Σ event_transfers_cost fra history.current (eksakt, ikke andeler)
  // netto = diff − cost
  bestIndex: 0,   // indeks i rows (høyest netto blant spilte); null når < 2 spilte
  worstIndex: null,
  maxGw: 3,
}
```

---

### Task 1: Planfil, branch og ROADMAP

**Files:**
- Create: `docs/plan-hva-hvis-transfers.md` (kopi av denne planen)
- Modify: `ROADMAP.md`
- Modify: `docs/HANDOVER.md`

**Interfaces:** ingen kode — dokumenter og branch.

- [ ] **Step 1:** `git checkout -b feat/hva-hvis-transfers` (fra `main`,
      verifiser `git status` rent først)
- [ ] **Step 2:** Kopier denne planen inn i `docs/plan-hva-hvis-transfers.md`
- [ ] **Step 3:** ROADMAP: fjern linjen «Historisk «hva hvis»-analyse av egne
      transfers» fra «Andre idéer»; legg ny seksjon etter v1.1.3:

```markdown
## v1.2.0 — «Overganger»: historisk hva hvis-analyse (planlagt)

_Plan: `docs/plan-hva-hvis-transfers.md`. Versjonsnummeret settes endelig ved
release; rykker M4-kandidatene først, forskyves det._

- [ ] fplClient: `getEntryTransfers` (5 min) + `getLiveHistoric` (6 t, kun ferdige runder)
- [ ] `transfers.js`: buildTransferAnalysis — vindu, diff, straff, chips, kanttilfeller
- [ ] `assembleTransferAnalysis` — henting via cache, maks 38 live-kall
- [ ] /overganger: view, rute, nav, tomtilstander, view-tester
- [ ] Røyktest lokalt (alle ruter 200, AI/Discord av) + docs
- [ ] Etter GW2: verifiser transfers-skjemaet mot ekte data
```

      og under «Andre idéer»: `- AI-kommentar til overgangsanalysen (bevisst
      utelatt fra v1: tallene taler for seg, koster per generering —
      ettermonteres via ai.js ved behov)`
- [ ] **Step 4:** HANDOVER: logg oppdraget + Marius' to beslutninger
      (side «Overganger» på /overganger; uten AI) i «Logg over
      brukerbeskjeder», og legg en kort «ØKT 10»-statusseksjon.
- [ ] **Step 5:** `npm test` og `npm run lint` (skal være 185/185 og 0 —
      ingen kodeendring)
- [ ] **Step 6:** Commit: `docs: plan og roadmap for hva hvis-analyse av transfers`

### Task 2: fplClient — `getEntryTransfers` + `getLiveHistoric`

**Files:**
- Modify: `src/services/fplClient.js` (etter `getEntryHistory`, ~l.98)
- Test: `test/fplClient.test.js`
- Modify: `CLAUDE.md` (FPL-API-seksjonen: transfers 5 min; historisk live 6 t)

**Interfaces:**
- Produces: `getEntryTransfers(teamId) → Promise<Array>` og
  `getLiveHistoric(gw) → Promise<{ elements: [...] }>` — brukes av Task 4.

- [ ] **Step 1: Skriv feilende tester** (mønster: eksisterende mockFetch/
      jsonResponse i samme fil)

```js
test('getEntryTransfers henter entry/{id}/transfers/ og cacher', async () => {
  mockFetch(() => jsonResponse([{ element_in: 10, element_out: 11, event: 2 }]));

  const first = await getEntryTransfers(42);
  const second = await getEntryTransfers(42);

  assert.deepEqual(first, [{ element_in: 10, element_out: 11, event: 2 }]);
  assert.equal(second, first);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /entry\/42\/transfers\/$/);
});

test('getLiveHistoric deler nøkkel med getLive og lever lenger enn 1 min', async () => {
  mockFetch(() => jsonResponse({ elements: [] }));
  let t = 0;
  _setNow(() => t);

  await getLiveHistoric(2);
  await getLive(2); // samme nøkkel: ingen ny henting
  assert.equal(fetchCalls.length, 1);

  t = 5 * 60_000; // 5 min: forbi getLives TTL, godt innenfor 6 t
  await getLiveHistoric(2);
  assert.equal(fetchCalls.length, 1);

  _setNow(null);
});
```

- [ ] **Step 2:** `npm test` → FAIL («getEntryTransfers is not a function»)
- [ ] **Step 3: Implementer** i `fplClient.js`:

```js
export function getEntryTransfers(teamId) {
  return getOrFetch(`transfers:${teamId}`, () => fplFetch(`entry/${teamId}/transfers/`), {
    ttl: 5 * MIN,
  });
}

/**
 * Live-poeng for en FERDIG runde. Samme endepunkt og cache-nøkkel som
 * getLive(), men 6 t TTL: poengene i en ferdigspilt runde er i praksis
 * immutable. Delt nøkkel betyr at første skriver setter TTL-en — derfor
 * skal denne KUN kalles for runder bootstrap melder `finished`, ellers
 * kunne live-siden servert timegammel data for pågående runde.
 */
export function getLiveHistoric(gw) {
  return getOrFetch(`live:${gw}`, () => fplFetch(`event/${gw}/live/`), { ttl: 360 * MIN });
}
```

- [ ] **Step 4:** `npm test` → PASS. `npm run lint` → 0.
- [ ] **Step 5:** CLAUDE.md FPL-API-lista: legg til «entry-transfers 5 min»
      og «historiske live-runder 6 t (immutable når runden er ferdig)».
- [ ] **Step 6:** Commit: `feat: fplClient henter transfers og historiske live-poeng`

### Task 3: `buildTransferAnalysis` — hele den rene kjernen

**Files:**
- Create: `src/services/transfers.js`
- Test: `test/transfers.test.js` (ny)
- Modify: `CLAUDE.md` (filkartet: transfers.js-linje)

**Interfaces:**
- Consumes: `byId`, `resolvedGw` fra `src/services/analysis.js`.
- Produces: `buildTransferAnalysis({ transfers, history, bootstrap, liveByGw })`
  → returstrukturen definert over. `liveByGw` er `Map<gw, liveResponse>` der
  liveResponse er rå `{ elements: [{ id, stats: { total_points } }] }`.

- [ ] **Step 1: Skriv feilende tester** med delt fixture øverst i
      `test/transfers.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTransferAnalysis } from '../src/services/transfers.js';

// GW1–2 ferdige, GW3 pågår → maxGw 3.
const bootstrap = {
  events: [
    { id: 1, is_current: false, finished: true },
    { id: 2, is_current: false, finished: true },
    { id: 3, is_current: true, finished: false },
  ],
  elements: [
    { id: 10, web_name: 'Haaland' },
    { id: 11, web_name: 'Watkins' },
    { id: 12, web_name: 'Salah' },
    { id: 13, web_name: 'Saka' },
    { id: 14, web_name: 'Isak' },
  ],
};

// Poeng per spiller per runde:        gw1  gw2  gw3
// 10 Haaland                            5    9    2
// 11 Watkins                            2    1    0
// 12 Salah                              8    4    6
// 13 Saka                               3    7    1
// 14 Isak                               6    2    3
function liveFor(points) {
  return { elements: Object.entries(points).map(([id, p]) => ({ id: Number(id), stats: { total_points: p } })) };
}
const liveByGw = new Map([
  [1, liveFor({ 10: 5, 11: 2, 12: 8, 13: 3, 14: 6 })],
  [2, liveFor({ 10: 9, 11: 1, 12: 4, 13: 7, 14: 2 })],
  [3, liveFor({ 10: 2, 11: 0, 12: 6, 13: 1, 14: 3 })],
]);
const history = {
  current: [
    { event: 1, event_transfers_cost: 0 },
    { event: 2, event_transfers_cost: 4 },
    { event: 3, event_transfers_cost: 0 },
  ],
  chips: [],
};
const t = (element_out, element_in, event, time = `2026-0${event}-01T00:00:00Z`) =>
  ({ element_in, element_out, event, time });

test('tom transferliste gir tom analyse (cost telles fra history uansett)', () => {
  const a = buildTransferAnalysis({ transfers: [], history, bootstrap, liveByGw: new Map() });
  assert.equal(a.rows.length, 0);
  assert.deepEqual(a.totals, { diff: 0, cost: 4, netto: -4, count: 0, skipped: 0 });

  const b = buildTransferAnalysis({ transfers: [], history: { current: [], chips: [] }, bootstrap, liveByGw: new Map() });
  assert.deepEqual(b.totals, { diff: 0, cost: 0, netto: 0, count: 0, skipped: 0 });
});

test('én transfer uten senere salg måles til og med pågående runde', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  const r = a.rows[0];
  assert.deepEqual(r.window, { from: 2, to: 3 });
  assert.equal(r.inn.points, 11); // 9 + 2
  assert.equal(r.ut.points, 1);   // 1 + 0
  assert.equal(r.diff, 10);
  assert.equal(r.penaltyShare, 4);
  assert.equal(r.netto, 6);
});

test('senere salg av inn-spilleren terminerer vinduet runden før', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 }); // Haaland kun gw2
  assert.equal(a.rows[0].diff, 9 - 1);
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // Salah fra gw3
  assert.equal(a.rows[1].diff, 6 - 2);
});

test('gjenkjøp av ut-spilleren terminerer også vinduet', () => {
  // Watkins ut i r2, kjøpt tilbake i r3 → Haaland-byttet måles kun i r2.
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 11, 3)],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 });
  assert.equal(a.rows[0].diff, 9 - 1);
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // Watkins 0 − Saka 1
  assert.equal(a.rows[1].diff, -1);
});

test('kjøpt, solgt og kjøpt igjen gir uavhengige vinduer', () => {
  // r2: Watkins→Haaland. r3: Haaland→Salah, så Salah→Haaland (angret).
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 12, 3), t(12, 10, 3, '2026-03-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 });
  assert.equal(a.rows[1].played, false); // Salah inn og ut i samme runde
  assert.equal(a.rows[1].window, null);
  assert.deepEqual(a.rows[2].window, { from: 3, to: 3 }); // Haaland igjen fra r3
});

test('samme spiller inn og ut i samme runde er angret — tomt vindu, straffen består', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(10, 11, 2, '2026-02-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].played, false);
  assert.equal(a.rows[0].window, null);
  assert.equal(a.rows[0].diff, 0);
  assert.equal(a.rows[0].penaltyShare, 2); // 4 delt på 2 transfers
});

test('usortert input (API leverer nyeste først) sorteres på event og time', () => {
  const a = buildTransferAnalysis({
    transfers: [t(10, 12, 3), t(11, 10, 2)],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows[0].event, 2);
  assert.deepEqual(a.rows[0].window, { from: 2, to: 2 }); // termineres av r3-salget
});

test('rundens straff deles likt på gyldige records, totalen bruker rundekosten eksakt', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 12, 2, '2026-02-01T01:00:00Z'), t(14, 13, 2, '2026-02-01T02:00:00Z')],
    history, bootstrap, liveByGw,
  });
  for (const r of a.rows) assert.ok(Math.abs(r.penaltyShare - 4 / 3) < 1e-9);
  assert.equal(a.totals.cost, 4); // ikke 3 × 1,33 avrundet
  assert.equal(a.totals.netto, a.totals.diff - 4);
});

test('wildcard-runde merkes og måles normalt', () => {
  const wcHistory = { ...history, chips: [{ name: 'wildcard', event: 2 }] };
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history: wcHistory, bootstrap, liveByGw });
  assert.equal(a.rows[0].chip, 'wildcard');
  assert.deepEqual(a.rows[0].window, { from: 2, to: 3 });
});

test('free hit begrenser eget vindu til én runde og terminerer aldri andre', () => {
  const fhHistory = { ...history, chips: [{ name: 'freehit', event: 3 }] };
  const a = buildTransferAnalysis({
    transfers: [t(13, 14, 2), t(14, 12, 3)], // FH «selger» Isak i r3 — midlertidig
    history: fhHistory, bootstrap, liveByGw,
  });
  assert.deepEqual(a.rows[0].window, { from: 2, to: 3 }); // Isak-vinduet lever videre
  assert.equal(a.rows[0].diff, (2 + 3) - (7 + 1));        // Isak 5 − Saka 8 = −3
  assert.equal(a.rows[1].chip, 'freehit');
  assert.deepEqual(a.rows[1].window, { from: 3, to: 3 }); // kun FH-runden
  assert.equal(a.rows[1].diff, 6 - 3);                    // Salah 6 − Isak 3
});

test('beste og verste bytte pekes ut blant spilte rader', () => {
  const a = buildTransferAnalysis({
    transfers: [t(11, 10, 2), t(13, 12, 2, '2026-02-01T01:00:00Z')],
    history, bootstrap, liveByGw,
  });
  // rad 0: Haaland 11 − Watkins 1 − 2 = 8; rad 1: Salah 10 − Saka 8 − 2 = 0
  assert.equal(a.bestIndex, 0);
  assert.equal(a.worstIndex, 1);
});

test('én spilt rad gir hverken beste eller verste', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history, bootstrap, liveByGw });
  assert.equal(a.bestIndex, null);
  assert.equal(a.worstIndex, null);
});

test('navn slås opp i bootstrap, ukjent id får plassholder og 0 poeng', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 99, 2)], history, bootstrap, liveByGw });
  assert.equal(a.rows[0].inn.name, 'Ukjent (99)');
  assert.equal(a.rows[0].inn.points, 0);
  assert.equal(a.rows[0].ut.name, 'Watkins');
});

test('records med manglende felt hoppes over, telles, og teller ikke i straffnevneren', () => {
  const a = buildTransferAnalysis({
    transfers: [{ element_in: 10, event: 2 }, { element_out: 11 }, t(11, 10, 2)],
    history, bootstrap, liveByGw,
  });
  assert.equal(a.rows.length, 1);
  assert.equal(a.totals.skipped, 2);
  assert.equal(a.rows[0].penaltyShare, 4); // nevner 1, ikke 3
});

test('transfer for framtidig runde er pending og teller ikke i diff', () => {
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 4)], history, bootstrap, liveByGw });
  assert.equal(a.rows[0].pending, true);
  assert.equal(a.rows[0].played, false);
  assert.equal(a.totals.diff, 0);
});

test('før sesongstart (maxGw 0) er alt pending', () => {
  const preseason = { ...bootstrap, events: [{ id: 1, is_next: true, finished: false }] };
  const a = buildTransferAnalysis({ transfers: [t(11, 10, 2)], history: { current: [], chips: [] }, bootstrap: preseason, liveByGw: new Map() });
  assert.equal(a.maxGw, 0);
  assert.equal(a.rows[0].pending, true);
});
```

- [ ] **Step 2:** `npm test` → FAIL (modulen finnes ikke)
- [ ] **Step 3: Implementer** `src/services/transfers.js`:

```js
// Historisk «hva hvis»-analyse av egne transfers: hva hver overgang faktisk
// var verdt i rå spillerpoeng (uten benk-/kapteinsvekting), minus straff.
// Vinduet per transfer er perioden byttet var i effekt: fra runden det
// gjaldt, til inn-spilleren ble solgt igjen eller ut-spilleren kjøpt
// tilbake. Free hit-transfers reverseres av FPL og terminerer aldri andre
// vinduer.
import config from '../config.js';
import {
  getBootstrap,
  getEntryHistory,
  getEntryTransfers,
  getLive,
  getLiveHistoric,
} from './fplClient.js';
import { byId, resolvedGw } from './analysis.js';

function isValidTransfer(t) {
  return (
    [t?.element_in, t?.element_out, t?.event].every((v) => Number.isInteger(v) && v > 0) &&
    t.event <= 38
  );
}

export function buildTransferAnalysis({ transfers, history, bootstrap, liveByGw }) {
  const maxGw = resolvedGw(bootstrap.events);
  const elementsById = byId(bootstrap.elements);
  const name = (id) => elementsById.get(id)?.web_name ?? `Ukjent (${id})`;

  // Poengoppslag: Map<gw, Map<elementId, total_points>> bygget én gang.
  const pointsByGw = new Map(
    [...liveByGw].map(([gw, live]) => [
      gw,
      new Map((live?.elements ?? []).map((e) => [e.id, e.stats?.total_points ?? 0])),
    ]),
  );
  const pointsFor = (id, from, to) => {
    let sum = 0;
    for (let gw = from; gw <= to; gw++) sum += pointsByGw.get(gw)?.get(id) ?? 0;
    return sum;
  };

  const all = Array.isArray(transfers) ? transfers : [];
  const valid = all
    .filter(isValidTransfer)
    .sort((a, b) => a.event - b.event || String(a.time).localeCompare(String(b.time)));
  const skipped = all.length - valid.length;

  const chipByEvent = new Map((history?.chips ?? []).map((c) => [c.event, c.name]));
  const isFhEvent = (e) => chipByEvent.get(e) === 'freehit';

  const costByEvent = new Map(
    (history?.current ?? []).map((r) => [r.event, r.event_transfers_cost ?? 0]),
  );
  const countByEvent = new Map();
  for (const tr of valid) countByEvent.set(tr.event, (countByEvent.get(tr.event) ?? 0) + 1);

  const rows = valid.map((tr, i) => {
    const from = tr.event;
    const isFh = isFhEvent(from);

    // Vinduet slutter runden før byttet oppheves: inn-spilleren selges, eller
    // ut-spilleren kjøpes tilbake. Free hit-transfers teller ikke (FPL
    // reverserer laget selv etterpå).
    let to = maxGw;
    if (isFh) {
      to = Math.min(from, maxGw);
    } else {
      const closer = valid
        .slice(i + 1)
        .find(
          (s) =>
            !isFhEvent(s.event) &&
            (s.element_out === tr.element_in || s.element_in === tr.element_out),
        );
      if (closer) to = Math.min(closer.event - 1, maxGw);
    }

    const pending = from > maxGw;
    const played = !pending && to >= from;
    const innPoints = played ? pointsFor(tr.element_in, from, to) : 0;
    const utPoints = played ? pointsFor(tr.element_out, from, to) : 0;
    const diff = innPoints - utPoints;
    const penaltyShare = (costByEvent.get(from) ?? 0) / (countByEvent.get(from) ?? 1);
    const chipName = chipByEvent.get(from);

    return {
      event: from,
      chip: chipName === 'wildcard' || chipName === 'freehit' ? chipName : null,
      inn: { id: tr.element_in, name: name(tr.element_in), points: innPoints },
      ut: { id: tr.element_out, name: name(tr.element_out), points: utPoints },
      diff,
      penaltyShare,
      netto: diff - penaltyShare,
      window: played ? { from, to } : null,
      played,
      pending,
    };
  });

  const totalDiff = rows.reduce((s, r) => s + r.diff, 0);
  const totalCost = [...costByEvent.values()].reduce((s, c) => s + c, 0);

  const playedIdx = rows.map((r, i) => (r.played ? i : -1)).filter((i) => i >= 0);
  let bestIndex = null;
  let worstIndex = null;
  if (playedIdx.length >= 2) {
    bestIndex = playedIdx.reduce((a, b) => (rows[b].netto > rows[a].netto ? b : a));
    worstIndex = playedIdx.reduce((a, b) => (rows[b].netto < rows[a].netto ? b : a));
  }

  return {
    rows,
    totals: {
      diff: totalDiff,
      cost: totalCost,
      netto: totalDiff - totalCost,
      count: rows.length,
      skipped,
    },
    bestIndex,
    worstIndex,
    maxGw,
  };
}
```

- [ ] **Step 4:** `npm test` → PASS. `npm run lint` → 0.
- [ ] **Step 5:** CLAUDE.md filkart under `src/services/`: `transfers.js
      historisk hva hvis-analyse: buildTransferAnalysis (ren),
      assembleTransferAnalysis (henter)`.
- [ ] **Step 6:** Commit: `feat: buildTransferAnalysis — hva hvis-analysen som ren funksjon`

### Task 4: `assembleTransferAnalysis` — henting

**Files:**
- Modify: `src/services/transfers.js`
- Test: `test/transfers.test.js`

**Interfaces:**
- Produces: `assembleTransferAnalysis({ teamId } = {}) → Promise<analyse>` —
  brukes av ruten i Task 5. `teamId`-parameteren er test-hook (default
  `config.fplTeamId`).

- [ ] **Step 1: Skriv feilende tester.** Disse mocker global fetch — legg dem
      nederst i `test/transfers.test.js` med egne `beforeEach`/`afterEach`
      (importer `clear` fra cache.js; gjenopprett `globalThis.fetch`), slik
      at de rene testene over forblir uten setup:

```js
test('assembleTransferAnalysis henter kun rundene fra tidligste transfer', async () => {
  const routes = [
    [/bootstrap-static\/$/, bootstrap],
    [/entry\/42\/transfers\/$/, [t(11, 10, 2)]],
    [/entry\/42\/history\/$/, history],
    [/event\/2\/live\/$/, liveFor({ 10: 9, 11: 1 })],
    [/event\/3\/live\/$/, liveFor({ 10: 2, 11: 0 })],
  ];
  const calls = [];
  globalThis.fetch = async (url) => {
    const hit = routes.find(([re]) => re.test(String(url)));
    assert.ok(hit, `uventet URL: ${url}`);
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => hit[1] };
  };

  const a = await assembleTransferAnalysis({ teamId: 42 });

  assert.equal(a.rows[0].diff, 10); // (9+2) − (1+0)
  assert.ok(!calls.some((u) => /event\/1\/live/.test(u)), 'runde 1 skal ikke hentes');
  assert.ok(!calls.some((u) => /element-summary/.test(u)), 'aldri element-summary');
});

test('assembleTransferAnalysis uten transfers henter ingen live-runder', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (/transfers\/$/.test(String(url))) return { ok: true, status: 200, json: async () => [] };
    if (/history\/$/.test(String(url))) return { ok: true, status: 200, json: async () => history };
    return { ok: true, status: 200, json: async () => bootstrap };
  };

  const a = await assembleTransferAnalysis({ teamId: 42 });

  assert.equal(a.totals.count, 0);
  assert.ok(!calls.some((u) => /\/live\//.test(u)), 'ingen live-kall uten transfers');
});
```

- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3: Implementer** i `transfers.js`:

```js
/** Henter alt /overganger trenger. `teamId`-parameteren er test-hook. */
export async function assembleTransferAnalysis({ teamId = config.fplTeamId } = {}) {
  const [bootstrap, transfers, history] = await Promise.all([
    getBootstrap(),
    getEntryTransfers(teamId),
    getEntryHistory(teamId),
  ]);

  const maxGw = resolvedGw(bootstrap.events);
  const eventsById = new Map(bootstrap.events.map((e) => [e.id, e]));
  const validEvents = (Array.isArray(transfers) ? transfers : [])
    .filter(isValidTransfer)
    .map((t) => t.event);
  const firstEvent = validEvents.length ? Math.min(...validEvents) : Infinity;

  const liveByGw = new Map();
  if (firstEvent <= maxGw) {
    const gws = [];
    for (let gw = firstEvent; gw <= maxGw; gw++) gws.push(gw);
    const results = await Promise.all(
      gws.map((gw) => (eventsById.get(gw)?.finished ? getLiveHistoric(gw) : getLive(gw))),
    );
    gws.forEach((gw, i) => liveByGw.set(gw, results[i]));
  }

  return buildTransferAnalysis({ transfers, history, bootstrap, liveByGw });
}
```

- [ ] **Step 4:** `npm test` → PASS. `npm run lint` → 0.
- [ ] **Step 5:** Commit: `feat: assembleTransferAnalysis henter analysen via cache`

### Task 5: Siden — view, rute, nav, formatSigned

**Files:**
- Create: `views/transfers.ejs`
- Create: `src/routes/transfers.js`
- Modify: `src/server.js` (import + `app.use('/overganger', …)` etter `/lag`-linjen, FØR 404-handleren)
- Modify: `views/layout.ejs` (nav-lenke etter «Lag»)
- Modify: `src/services/format.js` (+ `formatSigned`)
- Test: `test/format.test.js` (finnes den ikke: legg formatSigned-testene i
  `test/transfers.test.js`), `test/views.test.js`, `test/fixtures/views.js`
- Modify: `CHANGELOG.md` ([Unreleased] → Added), `ROADMAP.md` (avhuking)

**Interfaces:**
- Consumes: `assembleTransferAnalysis` (Task 4), `formatSigned` (ny).
- Produces: rute `/overganger` (200), nav-punkt «Overganger».

- [ ] **Step 1: Feilende tester først.**

`formatSigned` (ved siden av eksisterende format-tester):

```js
test('formatSigned viser fortegn og norsk komma', () => {
  assert.equal(formatSigned(10), '+10');
  assert.equal(formatSigned(-4), '−4');
  assert.equal(formatSigned(0), '0');
  assert.equal(formatSigned(-4 / 3), '−1,3');
});
```

`test/fixtures/views.js` — tre fixtures:

```js
export const transfers = {
  title: 'Overganger',
  formatSigned: (n) => String(n),
  analysis: {
    rows: [
      { event: 2, chip: null, inn: { id: 10, name: 'Haaland', points: 11 }, ut: { id: 11, name: 'Watkins', points: 1 }, diff: 10, penaltyShare: 4, netto: 6, window: { from: 2, to: 3 }, played: true, pending: false },
      { event: 3, chip: 'freehit', inn: { id: 12, name: 'Salah', points: 6 }, ut: { id: 14, name: 'Isak', points: 3 }, diff: 3, penaltyShare: 0, netto: 3, window: { from: 3, to: 3 }, played: true, pending: false },
    ],
    totals: { diff: 13, cost: 4, netto: 9, count: 2, skipped: 0 },
    bestIndex: 0, worstIndex: 1, maxGw: 3,
  },
};
export const transfersEmpty = {
  title: 'Overganger', formatSigned: (n) => String(n),
  analysis: { rows: [], totals: { diff: 0, cost: 0, netto: 0, count: 0, skipped: 0 }, bestIndex: null, worstIndex: null, maxGw: 0 },
};
export const transfersPending = {
  title: 'Overganger', formatSigned: (n) => String(n),
  analysis: { rows: [{ event: 2, chip: null, inn: { id: 10, name: 'Haaland', points: 0 }, ut: { id: 11, name: 'Watkins', points: 0 }, diff: 0, penaltyShare: 0, netto: 0, window: null, played: false, pending: true }], totals: { diff: 0, cost: 0, netto: 0, count: 1, skipped: 0 }, bestIndex: null, worstIndex: null, maxGw: 1 },
};
```

`test/views.test.js` — nye cases i `cases`-lista + NAV:

```js
['transfers', fx.transfers, 'Haaland'],
['transfers', fx.transfers, 'Free Hit'],
['transfers', fx.transfers, 'rå spillerpoeng'],
['transfers', fx.transfersEmpty, 'Ingen overganger registrert ennå'],
['transfers', fx.transfersPending, 'Venter på runde 2'],
```

og i `NAV`-lista: `['/overganger', 'Overganger'],`

- [ ] **Step 2:** `npm test` → FAIL (view finnes ikke, nav-lenken mangler)
- [ ] **Step 3: Implementer.**

`src/services/format.js`:

```js
/** Poengdifferanse med fortegn og norsk komma: +10, −4, −1,3. */
export function formatSigned(n) {
  const rounded = Math.round(n * 10) / 10;
  const abs = Math.abs(rounded).toLocaleString('nb-NO');
  if (rounded > 0) return `+${abs}`;
  if (rounded < 0) return `−${abs}`;
  return '0';
}
```

`src/routes/transfers.js`:

```js
import { Router } from 'express';
import config from '../config.js';
import { assembleTransferAnalysis } from '../services/transfers.js';
import { formatSigned } from '../services/format.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.renderPage('no-team', { title: 'Overganger' });
  }
  try {
    const analysis = await assembleTransferAnalysis();
    res.renderPage('transfers', { title: 'Overganger', analysis, formatSigned });
  } catch (err) {
    next(err);
  }
});

export default router;
```

`src/server.js`: `import transfersRouter from './routes/transfers.js';` og
`app.use('/overganger', transfersRouter);` rett etter `/lag`-mounten.

`views/layout.ejs` (etter Lag-lenken):

```ejs
<a href="/overganger" <%- path.startsWith('/overganger') ? 'aria-current="page"' : '' %>>Overganger</a>
```

`views/transfers.ejs`:

```ejs
<section class="page-head">
  <h1>Overganger</h1>
  <p class="dim">Hva byttene dine var verdt: poengene spilleren du hentet
  faktisk fikk, minus poengene spilleren du solgte fikk, så lenge byttet var
  i effekt — rå spillerpoeng uten benk- og kapteinsvekting, minus
  poengstraff. Hvert bytte måles for seg.</p>
</section>

<% if (analysis.totals.count === 0) { %>
  <section class="card">
    <p class="empty">
      Ingen overganger registrert ennå. Din første overgang kan tidligst
      gjelde runde 2 — når du bytter en spiller, dukker regnskapet opp her:
      poeng inn mot poeng ut for hvert bytte, straff, og summen for sesongen.
    </p>
  </section>
<% } else { %>
  <% const played = analysis.rows.filter((r) => r.played); %>
  <div class="stat-strip">
    <div class="stat"><span class="stat-val <%= analysis.totals.netto > 0 ? 'accent' : (analysis.totals.netto < 0 ? 'negative' : '') %>"><%= played.length ? formatSigned(analysis.totals.netto) : '–' %></span><span class="stat-lbl">Netto totalt</span></div>
    <div class="stat"><span class="stat-val"><%= analysis.totals.count %></span><span class="stat-lbl">Overganger</span></div>
    <div class="stat"><span class="stat-val"><%= analysis.totals.cost > 0 ? formatSigned(-analysis.totals.cost) : '0' %></span><span class="stat-lbl">Poengstraff</span></div>
    <div class="stat"><span class="stat-val"><%= analysis.bestIndex !== null ? analysis.rows[analysis.bestIndex].inn.name : '–' %></span><span class="stat-lbl">Beste bytte</span></div>
    <div class="stat"><span class="stat-val"><%= analysis.worstIndex !== null ? analysis.rows[analysis.worstIndex].inn.name : '–' %></span><span class="stat-lbl">Verste bytte</span></div>
  </div>

  <section class="card card-wide">
    <h2>Bytte for bytte</h2>
    <% if (analysis.totals.skipped > 0) { %>
      <p class="dim"><%= analysis.totals.skipped %> overganger kunne ikke tolkes fra FPL-dataene og er utelatt.</p>
    <% } %>
    <div class="table-scroll">
      <table class="data">
        <thead>
          <tr><th>Runde</th><th>Inn</th><th>Ut</th><th class="num">Poengdiff</th><th class="num">Straff</th><th class="num">Netto</th><th>Periode</th></tr>
        </thead>
        <tbody>
          <% for (let i = analysis.rows.length - 1; i >= 0; i--) { const r = analysis.rows[i]; %>
            <tr>
              <td><%= r.event %><% if (r.chip === 'wildcard') { %> <span class="status">Wildcard</span><% } else if (r.chip === 'freehit') { %> <span class="status">Free Hit</span><% } %></td>
              <td><%= r.inn.name %><% if (r.played) { %> <span class="dim"><%= r.inn.points %> p</span><% } %></td>
              <td><%= r.ut.name %><% if (r.played) { %> <span class="dim"><%= r.ut.points %> p</span><% } %></td>
              <td class="num"><%= r.played ? formatSigned(r.diff) : '–' %></td>
              <td class="num"><%= r.penaltyShare > 0 ? formatSigned(-r.penaltyShare) : '0' %></td>
              <td class="num <%= r.played && r.netto > 0 ? 'accent' : (r.played && r.netto < 0 ? 'negative' : '') %>">
                <%= r.played ? formatSigned(r.netto) : '–' %>
                <% if (i === analysis.bestIndex) { %> <span class="status">Beste</span><% } %>
                <% if (i === analysis.worstIndex) { %> <span class="status">Verste</span><% } %>
              </td>
              <td class="dim"><% if (r.pending) { %>Venter på runde <%= r.event %><% } else if (!r.played) { %>Angret før deadline<% } else if (r.window.from === r.window.to) { %>R<%= r.window.from %><% } else { %>R<%= r.window.from %>–R<%= r.window.to %><% } %></td>
            </tr>
          <% } %>
        </tbody>
      </table>
    </div>
  </section>
<% } %>
```

- [ ] **Step 4:** `npm test` → PASS (inkl. nye view- og NAV-tester).
      `npm run lint` → 0.
- [ ] **Step 5:** CHANGELOG under `[Unreleased]`:

```markdown
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
```

      ROADMAP: huk av gjennomførte punkter i v1.2.0-seksjonen.
- [ ] **Step 6:** Commit: `feat: /overganger — historisk hva hvis-analyse av transfers`

### Task 6: Røyktest, HANDOVER og sluttrapport

**Files:**
- Modify: `docs/HANDOVER.md`, `docs/plan-hva-hvis-transfers.md` (status),
  `ROADMAP.md` (avhuking)
- Scratchpad: egen `.env` (ALDRI repoets `.env`, aldri committes)

- [ ] **Step 1:** Lag `.env` i scratchpad: `PORT=3010`,
      `FPL_TEAM_ID=5330646`, INGEN `ANTHROPIC_API_KEY`, INGEN
      `DISCORD_WEBHOOK_URL`.
- [ ] **Step 2:** Start serveren:
      `node --env-file="<scratchpad>\.env" src/server.js` (bakgrunn).
- [ ] **Step 3:** Verifiser med Invoke-WebRequest: alle 11 ruter 200
      (`/`, `/spillere`, `/lag`, `/overganger`, `/liga`, `/brief`, `/live`,
      `/nyheter`, `/health`, `/api/brief.json`, `/api/live.json`), 404 på
      ukjent sti, og at `/overganger` inneholder «Ingen overganger registrert
      ennå» (tomtilstanden er fasit før sesongstart). Bekreft i konsollen:
      ingen AI-kall-linjer, ingen Discord-scheduler-melding om aktiv sending.
- [ ] **Step 4:** Stopp serveren. `npm test` + `npm run lint` en siste gang —
      rapporter tallene ordrett.
- [ ] **Step 5:** HANDOVER: status for økten, «Etter GW2»-sjekklisten under,
      logg alle beskjeder fra Marius. Planfilen i docs/ oppdateres med
      faktisk status/avvik.
- [ ] **Step 6:** Commit: `docs: handover og røyktestbevis for /overganger`
- [ ] **Step 7:** Rapport til Marius i chatten: hva som er bygget,
      beslutningene (med Marius' to valg), hva som bevisst er utelatt
      (AI-kommentar, /api-endepunkt, picks-vekting, persistens), hva som
      gjenstår (skjemaverifisering etter GW2, merge/push-klarsignal).
      **IKKE merge, IKKE push.**

### Etter GW2 (egen liten oppfølging — ikke nødvendigvis denne branchen)

- [ ] Kjør ett ekte kall mot `entry/5330646/transfers/` og
      `entry/5330646/history/`; bekreft feltnavnene (`element_in`,
      `element_out`, `event`, `time`, `event_transfers_cost`) mot
      fixture-antakelsene. Avvik → `fix:`-commit med oppdaterte fixtures.
- [ ] Se `/overganger` med ekte data; sjekk mobil 390 px (scroll kun i
      `.table-scroll`).

## Verifisering (oppsummert)

1. `npm test` — alle grønne (185 + ~20 nye), output vises i rapporten.
2. `npm run lint` — 0.
3. Røyktest lokalt med AI/Discord av (Task 6) — 11 ruter 200, 404 OK,
   tomtilstand på `/overganger` bekreftet.
4. Ingen push. Merge kun med `--no-ff` etter Marius' klarsignal, aldri i
   vinduet torsdag 19:00–21:00.

## Bevisst utelatt (med begrunnelse — føres også i ROADMAP)

- **AI-kommentar** — Marius' valg; tallene taler for seg. Idé i ROADMAP.
- **`/api/overganger.json`** — ingenting konsumerer det.
- **Picks-vektet poengberegning** — krever picks per runde (38 ekstra kall)
  og en kontrafaktisk benkemodell; rå poeng er ærligere og forklares i UI-et.
- **Kollaps av samme-runde-kjeder (A→B, B→C) til én effektiv transfer** —
  per-beslutning-modellen er enklere og forklares i UI-et; v2-mulighet.
- **Persistens** — analysen regnes ut på forespørsel fra FPL-API-et;
  databasebeslutning tas ikke her.
- **P3-funn og v1.2.0-kandidater** — egne oppdrag, røres ikke.
