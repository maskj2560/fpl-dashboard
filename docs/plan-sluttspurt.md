# Plan «Sluttspurten» — alt som gjenstår, fra 25. aug til mål

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Mål:** Ta prosjektet helt i mål: docs-rydding, de fire besluttede
robusthetsreleasene (v1.3.5–v1.3.7 nå, v1.3.8 + v1.4.0 etter P4), og de tre
portene P2/P3/P4 — i riktig rekkefølge rundt GW2 og prisskiftet 1. sept.

**Arkitektur:** Små, isolerte releaser etter husets mønster: rene, testbare
byggere i `middleware.js`/services, ingen forretningslogikk i ruter/views,
TDD på all logikk, én branch per release med `--no-ff`-merge og tag.

**Spec:** Beslutningene i §1 under (tatt av Marius 25. aug 2026, økt 39).
Denne fila ER planen og spec-en — det finnes ingen andre planfiler.

**Arkivering av denne fila:** Når Task 0–9 alle er huket av, flyttes fila til
`docs/arkiv/plan-sluttspurt.md` (Task 9 beskriver hvordan).

---

## §1 Beslutninger (Marius, 25. aug — IKKE re-spør)

1. **Alle fire robusthetskandidatene bygges:** SIGTERM-handler,
   gameUpdating-livssyklus, persistent brief-markør, alderstak + dataAlder.
2. **filterSummaryPoints:** gratis genitiv-fiks (0 AI-kall). Promptendringen
   (kildeindeks per punkt) er **droppet** — den koster AI-kall og løser bare
   falske negative.
3. **Rekkefølge/versjoner:** v1.3.5 SIGTERM → v1.3.6 gameUpdating → v1.3.7
   brief-markør (denne uken, før torsdag 19:00) → **etter P4:** v1.3.8
   genitiv-fiks → v1.4.0 alderstak + dataAlder (v1.4.0 fordi
   payload-kontrakten utvides). Numrene er nominelle: en eventuell
   P3-`fix:`-release rir neste ledige patchnummer og skyver resten.
4. **Brief-markør:** JSON-fil `data/brief-state.json`, sti fra `DATA_DIR`-env
   (default `data`), persistent volum på `/app/data` i Coolify (Marius
   legger til, én gang). Uten volum/skrivefeil: appen oppfører seg som i dag
   — aldri krasj.
5. **Alderstak:** live-data 10 min, alt annet 60 min. Semantikk: data eldre
   enn taket vises FORTSATT, men med banner «Viser data fra HH:MM — får ikke
   kontakt med FPL akkurat nå.» Innenfor taket: stille stale-servering som i
   dag. `/api/brief.json` og `/api/live.json` får `dataAlder` (sekunder).
6. **Docs-rydding:** `plan-doks-opprydning.md`, `plan-v125-brief-kvalitet.md`,
   `sjekkpunkt-c-live.md` og `port9-chrome-prompt.md` flyttes til
   `docs/arkiv/`. Ingenting slettes. Sti-referanser rettes mekanisk OVERALT,
   også inni arkivfiler (godkjent unntak fra «endres ikke»).

## §2 Rekkefølgetabell

| # | Task | Hva | Eier | Låses opp av | Bevis for ferdig |
|---|------|-----|------|--------------|------------------|
| 0 | Task 0 | Docs-rydding + planfila committet | Opus | — | grep-sjekk 0 treff, docs-rot = 4 filer, arkiv = 17, 350/350 |
| 1 | Task 1 | v1.3.5 SIGTERM-handler | Opus | Task 0 | ~353/353 + lint 0; prod: footer v1.3.5 |
| 2 | Task 2 | v1.3.6 gameUpdating + vennlig 503-side | Opus | Task 1 pushet | ~359/359; prod: footer v1.3.6 + graceful-shutdown-logglinjer fra forrige container |
| 3 | Task 3 | v1.3.7 persistent brief-markør | Opus + Marius (volum) | volum `/app/data` bekreftet | ~363/363; lokal røyktest «Brief-markør lastet» |
| 4 | Task 4 | P3: transfers-skjema mot ekte data | Opus | GW2 ferdig (~ma 31.) + Marius' første transfer | feltnavn bekreftet i HANDOVER; ev. `fix:` |
| 5 | Task 5 | P2: README-skjermbilder + mobil-QA | Marius | — | bildefiler committet + 5 sjekker OK |
| 6 | Task 6 | P4: kostnadsmåling | Marius (logger) + Opus | ~ma 7. sept | aikost-output ført i sjekkpunkt-d |
| 7 | Task 7 | v1.3.8 genitiv-fiks | Opus | P4 utført | ~366/366 |
| 8 | Task 8 | v1.4.0 alderstak + dataAlder | Opus | P4 utført | ~375/375; prod-banner-røyktest |
| 9 | Task 9 | Arkiver denne planfila | Opus | Task 0–8 | fila i arkiv, kart oppdatert |

## §3 Kalender (hva kan gjøres NÅR)

- **Ti 25.–on 26. aug:** Task 0–2. Push Task 0+1 som ÉN deploy, Task 2 egen.
- **On 26./to 27. før 12:00:** Task 3 (volumet må være bekreftet først).
  Rekker den ikke det: vent til mandag 31.
- **To 27. aug:** auto-brief GW2 ~19:30 — ALDRI push 19:00–21:00.
- **Fr 28. aug før 19:30:** Marius gjør sesongens første transfer (uten den
  har P3 ingenting å verifisere). Deadline GW2 19:30.
- **Helgen 29.–31. aug:** GW2 spilles — ingen push mens kamper pågår.
- **Ma 31. aug:** Task 4 (P3). Read-only; et avvik gir en liten fix-deploy.
- **1.–6. sept:** STILLE MÅLEUKE — ingen deploy (hver deploy = 2
  oppstartskall som støyer i P4-tallene). Kun Task 5 (Marius) skjer her.
  Marius henter `AI-kall:`-linjer fra Coolify-loggen ca. daglig
  (100-linjersvinduet ruller, se sjekkpunkt-d).
- **Ma 7. sept:** Task 6 (P4). Deretter Task 7–9 i uken 7.–13. sept.

**AI-kall-budsjett for hele planen:** 0 kall fra utførelsen selv. Kostnad =
kun deployenes oppstartstikk: 5–7 deployer × 2 kall ≈ 10–14 kall fordelt
over tre uker, innenfor det godkjente taktbudsjettet (~41–45 kall/uke er
driftstakten; oppstartstikkene er allerede del av budsjettet).

## §4 Globale rammer (gjelder hver task)

- Push til `main` = deploy rett i prod. Aldri push uten Marius' klarsignal.
- Aldri push torsdag 19:00–21:00 eller mens kamper pågår.
- Grønn `npm test` + `npm run lint` før en milepæl regnes ferdig.
  Baseline nå: **350/350, lint 0.**
- Ingen nye avhengigheter. Playwright/målescript kun i scratchpad.
- Lokale røyktester med TOMME AI/Discord-nøkler i scratchpad-.env
  (teknikk i HANDOVER-lærdommene). 0 ekte AI-kall fra utførelsen.
- Repo-docs er CRLF (ROADMAP.md har BOM). Aldri `sed -i` — bruk Edit-verktøy
  eller Node-skript med `split/join` (bevarer linjeskift).
- CHANGELOG/ROADMAP/HANDOVER oppdateres i SAMME commit som endringen.
  HANDOVER-tak 200 linjer — sprenges det, roter eldste logg til
  `docs/arkiv/HANDOVER-historikk.md`.
- Branch per release (`fix/...` eller `feat/...`), merge `--no-ff` lokalt,
  tag `vX.Y.Z`, push etter klarsignal.
- Sjekk at en fil ikke finnes før du «oppretter» den (lærdom: Write
  overskriver stille). Alle testfiler i planen FINNES allerede.

---

## Task 0: Docs-rydding + planfila inn

**Files:**
- Move: `docs/plan-doks-opprydning.md`, `docs/plan-v125-brief-kvalitet.md`,
  `docs/sjekkpunkt-c-live.md`, `docs/port9-chrome-prompt.md` → `docs/arkiv/`
- Modify: `ROADMAP.md`, `docs/HANDOVER.md`, `docs/arkiv/HANDOVER-historikk.md`
  (+ sti-fiks i 4 arkivfiler)
- Commit også: `docs/plan-sluttspurt.md` (ligger uncommittet fra planøkten)

- [x] **Step 1: Flytt filene**

```bash
git mv docs/plan-doks-opprydning.md docs/arkiv/
git mv docs/plan-v125-brief-kvalitet.md docs/arkiv/
git mv docs/sjekkpunkt-c-live.md docs/arkiv/
git mv docs/port9-chrome-prompt.md docs/arkiv/
```

- [x] **Step 2: Rett alle sti-referanser** — skriv dette til scratchpad som
  `fix-paths.mjs` og kjør `node <scratchpad>/fix-paths.mjs` fra repo-roten.
  `split/join` bevarer CRLF og BOM:

```js
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'ROADMAP.md',
  'docs/arkiv/HANDOVER-historikk.md',
  'docs/arkiv/plan-deploy-v122-v123.md',
  'docs/arkiv/plan-live-bonus.md',
  'docs/arkiv/plan-v124-radgiver-prompt.md',
  'docs/arkiv/plan-doks-opprydning.md',
  'docs/arkiv/port9-chrome-prompt.md',
];
const moved = [
  'sjekkpunkt-c-live.md',
  'plan-v125-brief-kvalitet.md',
  'plan-doks-opprydning.md',
  'port9-chrome-prompt.md',
  'plan-v124-radgiver-prompt.md', // lå ALT i arkiv — ROADMAP:355 m.fl. er døde lenker i dag
];
for (const f of files) {
  let t = readFileSync(f, 'utf8');
  for (const m of moved) t = t.split(`docs/${m}`).join(`docs/arkiv/${m}`);
  writeFileSync(f, t);
}
console.log('Stier rettet i', files.length, 'filer');
```

(Kjente treff som rettes: ROADMAP:113–115, 331, 351, 355, 380;
HANDOVER-historikk:85, 118, 154, 159, 175, 198, 311, 420, 705, 887, 900,
953; plan-deploy-v122-v123:340, 351; plan-live-bonus:7, 126;
plan-v124-radgiver-prompt:9, 488, 635, 642, 648; plan-doks-opprydning:20,
116, 135; port9-chrome-prompt:9.)

- [x] **Step 3: Dokumentkartet i ROADMAP.md** — Edit, ordrett.
  Erstatt disse tre radene (stiene har alt fått arkiv-prefiks av skriptet):

```
| `docs/arkiv/sjekkpunkt-c-live.md` | bevismateriale v1.2.3 |
| `docs/arkiv/port9-chrome-prompt.md` | gjenbrukbar nettleser-QA-oppskrift |
| `docs/arkiv/plan-doks-opprydning.md` | utført ryddeplan (arkiveres ved neste rydding) |
```

med denne ene raden:

```
| `docs/plan-sluttspurt.md` | gjeldende plan: robusthetsreleasene, portene og docs-ryddingen |
```

og erstatt

```
| `docs/arkiv/` (12 filer) | utførte planer + historikk — endres ikke |
```

med

```
| `docs/arkiv/` (17 filer) | utførte planer + historikk (kun sti-referanser rettes ved rydding) |
```

- [x] **Step 4: Versjonstabellen i ROADMAP.md** — erstatt raden

```
| **v1.3.1+** | Robusthetskandidatene, én og én etter avtale | 4 | avtale per punkt |
```

med

```
| **v1.3.5** | Ryddig avslutning (SIGTERM-handler) | 4 | — |
| **v1.3.6** | gameUpdating-livssyklus + vennlig 503-side | 4 | v1.3.5 |
| **v1.3.7** | Persistent «brief sendt»-markør (volum `/app/data`) | 4 | volum i Coolify |
| **v1.3.8** | Genitiv-fiks i nyhetsfilteret | 4 | etter P4 |
| **v1.4.0** | Alderstak på stale data + `dataAlder` i payload | 4 | etter P4 |
```

- [x] **Step 5: Kø-punkt 4 i ROADMAP.md** — erstatt HELE seksjonen
  `### 4. Robusthetskandidater (v1.3.1+, avtales én og én, uprioritert innbyrdes)`
  (overskrift + ingress + alle kulepunkter, t.o.m. persistent-markør-punktet)
  med:

```
### 4. Robusthetsreleasene (besluttet 25. aug — detaljene i `docs/plan-sluttspurt.md`)

Alle fem kandidatene fra kvalitetspasset er avgjort: fire bygges som egne
releaser, den femte (filterSummaryPoints) får en gratis genitiv-fiks i
stedet for den AI-kostende promptendringen (droppet). Rekkefølge:

- [ ] **v1.3.5 Ryddig avslutning:** `createShutdown` i `middleware.js` +
      SIGTERM/SIGINT-håndtering i `server.js`. Docker slipper å SIGKILL-e
      ved deploy, og helsesjekk-beviset (`kill 1`) blir mulig.
- [ ] **v1.3.6 gameUpdating-livssyklus:** tidsstemplet flagg med 5 min
      utløp i `fplClient.js` + forklarende 503-side ved kaldstart i
      oppdateringsvindu (`createErrorHandler`).
- [ ] **v1.3.7 Persistent brief-markør:** `lastSentEvent` til
      `data/brief-state.json` (`DATA_DIR`-env, volum `/app/data` i
      Coolify) — redeploy i 15-min-vinduet kan ikke re-poste briefen.
- [ ] **v1.3.8 Genitiv-fiks i nyhetsfilteret:** navnevarianter uten
      genitiv-s i `filterSummaryPoints` (`news.js`). 0 AI-kall.
- [ ] **v1.4.0 Alderstak + dataAlder:** stale data eldre enn 10 min
      (live) / 60 min (resten) får banner «Viser data fra HH:MM …»;
      `/api/brief.json` og `/api/live.json` får `dataAlder` (sekunder).
```

- [x] **Step 6: HANDOVER.md** — tre endringer + rotering (ordrett):
  1. Nytt statuspunkt (rett under prod-QA-punktet):

```
- **Docs ryddet + restløpet planlagt 25. aug (økt 39/40):** fire utførte
  filer flyttet til `docs/arkiv/` (nå 17 filer), alle stier rettet.
  Gjeldende plan for ALT som gjenstår: `docs/plan-sluttspurt.md`.
```

  2. Kortversjonens punkt 4 under «Åpne punkter» erstattes med:

```
4. Robusthetsreleasene v1.3.5–v1.4.0 (kø 4) — alle besluttet 25. aug,
   detaljene i `docs/plan-sluttspurt.md`.
```

  3. Ny loggpost øverst i «Logg over brukerbeskjeder»:

```
- 2026-08-25 (økt 39 Fable + økt 40 Opus): planøkt «sluttspurten». Marius
  besluttet: alle fire robusthetskandidatene bygges (v1.3.5 SIGTERM →
  v1.3.6 gameUpdating → v1.3.7 brief-markør → etter P4: v1.3.8 genitiv +
  v1.4.0 alderstak/dataAlder), promptendringen i filterSummaryPoints
  droppet, volum `/app/data` i Coolify, port9 + tre utførte filer
  arkivert. Plan: `docs/plan-sluttspurt.md`. Handling: Task 0 utført.
```

  4. Rotering (taket er 200, fila står på 198): flytt loggpostene for
     økt 36 (begge) og økt 37 til toppen av loggseksjonen i
     `docs/arkiv/HANDOVER-historikk.md`, og oppdater sistelinjen til:

```
- Loggposter fra økt 22–37: rotert til `docs/arkiv/HANDOVER-historikk.md`
  (200-linjerstaket, sist 2026-08-25).
```

- [x] **Step 7: Verifiser**

```bash
grep -rnP --include="*.md" "docs/(?!arkiv/)(sjekkpunkt-c-live|plan-v125-brief-kvalitet|plan-doks-opprydning|port9-chrome-prompt|plan-v124-radgiver-prompt)" .
```

Forventet: treff KUN i `docs/plan-sluttspurt.md` (denne fila beskriver
flyttingen). `ls docs` → `HANDOVER.md VIDERE.md arkiv plan-sluttspurt.md
sjekkpunkt-d-kostnad.md`. `ls docs/arkiv | wc -l` → 17.
Kjør `npm test` (350/350) + `npm run lint` (0) — ingen kodeendring, ren
sanity. Tell HANDOVER-linjer (< 200).

- [x] **Step 8: Commit (direkte på main, IKKE push ennå — deployes sammen
  med Task 1)**

```bash
git add -A
git commit -m "docs: rydd docs-rot til fire filer, arkiver fire utførte, plan-sluttspurt inn"
```

**NB / kan gå galt:** git mv + innholdsendring i samme fil er OK i én
commit. Skriptet må kjøres ETTER git mv (stiene i `files` peker på arkiv).
Ikke rør `CHANGELOG.md` — ryddingen er ikke brukersynlig.

---

## Task 1: v1.3.5 — Ryddig avslutning (SIGTERM-handler)

**Files:**
- Modify: `src/middleware.js` (ny `createShutdown`), `src/server.js`
  (fange server-referansen + koble signaler)
- Test: `test/middleware.test.js` (finnes — cacheControlFor/errorHandler-tester)
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md`, `CLAUDE.md`
  (middleware-beskrivelsen: legg til `createShutdown`)

**Interfaces:**
- Produces: `createShutdown({ server, exit = process.exit, log = console.log,
  timeoutMs = 10_000 }) → (signal: string) => void`. Idempotent; lukker
  serveren, `exit(0)` når close-callbacken kommer, `exit(1)` etter
  `timeoutMs` hvis forbindelser henger. Brukes kun av `server.js`.

- [ ] **Step 1: Skriv feilende tester** i `test/middleware.test.js`:

```js
import { createShutdown } from '../src/middleware.js';

function fakeServer() {
  return { closed: false, cb: null, close(cb) { this.closed = true; this.cb = cb; } };
}

test('createShutdown lukker serveren og avslutter med kode 0', () => {
  const server = fakeServer();
  const exits = [];
  const handler = createShutdown({ server, exit: (c) => exits.push(c), log: () => {} });
  handler('SIGTERM');
  assert.equal(server.closed, true);
  server.cb();
  assert.deepEqual(exits, [0]);
});

test('createShutdown ignorerer signal nummer to', () => {
  const server = fakeServer();
  let closeCalls = 0;
  server.close = (cb) => { closeCalls += 1; server.cb = cb; };
  const handler = createShutdown({ server, exit: () => {}, log: () => {} });
  handler('SIGTERM');
  handler('SIGINT');
  assert.equal(closeCalls, 1);
});

test('createShutdown tvinger avslutning når forbindelser henger', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const server = fakeServer(); // close-callbacken kalles aldri
  const exits = [];
  const handler = createShutdown({ server, exit: (c) => exits.push(c), log: () => {} });
  handler('SIGTERM');
  t.mock.timers.tick(10_000);
  assert.deepEqual(exits, [1]);
});
```

(Tilpass import/`test`-signatur til filas eksisterende stil. `t.mock.timers`
er node:test sitt innebygde — Node 22 har det.)

- [ ] **Step 2:** `npm test` → FAIL («createShutdown is not a function»)
- [ ] **Step 3: Implementer** i `src/middleware.js`:

```js
/**
 * Ryddig avslutning: lukker HTTP-serveren på SIGTERM/SIGINT slik at aktive
 * forespørsler fullføres og Docker slipper å SIGKILL-e etter stopp-timeouten
 * (målt 25. aug: PID 1 uten handler ignorerer signalet). Nødutgang etter
 * timeoutMs hvis åpne forbindelser henger igjen.
 */
export function createShutdown({ server, exit = process.exit, log = console.log, timeoutMs = 10_000 }) {
  let shuttingDown = false;
  return (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} mottatt — lukker serveren`);
    const force = setTimeout(() => {
      log('Åpne forbindelser henger igjen — tvinger avslutning');
      exit(1);
    }, timeoutMs);
    force.unref?.();
    server.close(() => {
      log('Serveren lukket ryddig');
      exit(0);
    });
  };
}
```

og i `src/server.js` (import utvides med `createShutdown`):

```js
const server = app.listen(config.port, () => {
  console.log(`FPL-dashboard lytter på http://localhost:${config.port}`);
});

// Ryddig avslutning ved deploy/omstart — uten dette må Docker SIGKILL-e.
const shutdown = createShutdown({ server });
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

- [ ] **Step 4:** `npm test` → ~353/353, `npm run lint` → 0
- [ ] **Step 5: Lokal røyktest** (tomme nøkler): start appen, `GET /` → 200,
  send `Ctrl+C`/SIGINT → loggen viser «SIGINT mottatt — lukker serveren» +
  «Serveren lukket ryddig», exit-kode 0.
- [ ] **Step 6: Docs i samme commit** — `package.json` version `1.3.5`;
  CHANGELOG (flytt fra `[Unreleased]`, sett dagens dato):

```
## [1.3.5] - 2026-08-XX

### Fixed

- Serveren avslutter ryddig ved deploy og omstart: aktive forespørsler
  fullføres før prosessen stopper, i stedet for at Docker må drepe den
  etter stopp-timeouten (SIGTERM/SIGINT-handler med 10 s nødutgang).
```

  ROADMAP: huk av v1.3.5-punktet i kø 4 og stryk raden i versjonstabellen
  etter husets mønster (`| ~~**v1.3.5**~~ | ~~Ryddig avslutning …~~ |
  **utført XX. aug** | — |`). CLAUDE.md: `src/middleware.js`-linjen i
  arkitekturkartet utvides med `createShutdown`. HANDOVER: statuspunkt +
  loggpost etter malen fra Task 0.
- [ ] **Step 7:** Branch `fix/sigterm-v135`, commit
  `fix: ryddig avslutning ved SIGTERM/SIGINT (v1.3.5)`, merge `--no-ff` til
  main, tag `v1.3.5`. **STOPP → rapport til Marius, vent på «push».**
  Push deployer Task 0 + Task 1 sammen (én deploy).
- [ ] **Step 8: Prod-verifisering etter push:** footer viser `v1.3.5`,
  `/health` 200. (Det ENDELIGE beviset — graceful shutdown i drift — kommer
  automatisk ved NESTE deploy, se Task 2 Step 8. Alternativt kan Marius
  kjøre `kill 1` i containerterminalen: loggen skal vise de to
  avslutningslinjene og containeren skal restarte. Aldri `docker stop`.)

**NB / kan gå galt:** `server.close()` venter på åpne keep-alive-forbindelser
— derfor nødutgangen. Ikke rør timerne i notify/refresh; `exit()` tar dem.
Testene må ikke kalle den ekte `process.exit` (alltid injiser `exit`).

---

## Task 2: v1.3.6 — gameUpdating-livssyklus + vennlig 503-side

**Files:**
- Modify: `src/services/fplClient.js` (tidsstemplet flagg + `_setNow`-hook),
  `src/middleware.js` (`createErrorHandler`: 503-gren), `views/error.ejs`
  (parametrisert kode/overskrift/melding)
- Test: `test/fplClient.test.js`, `test/middleware.test.js`,
  `test/views.test.js` (error-viewets render-test får nye locals)
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md`, `CLAUDE.md`
  (FPL-API-seksjonen: 503-flagget utløper etter 5 min)

**Interfaces:**
- Produces: `_setNow(fn)` i fplClient (test-hook, samme mønster som
  cache.js). `isGameUpdating()` beholder signaturen.
- `createErrorHandler` beholder signaturen; `error.ejs` får locals
  `{ code, heading, message }` (alltid satt av feilhandleren).

- [ ] **Step 1: Feilende tester** i `test/fplClient.test.js` (bruk samme
  mockFetch/jsonResponse-hjelpere som filas eksisterende 503-test):

```js
test('gameUpdating utløper av seg selv 5 min etter siste 503', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  mockFetch(() => new Response('The game is being updated', { status: 503 }));
  await assert.rejects(getBootstrap());
  assert.equal(isGameUpdating(), true);
  t += 5 * 60_000;
  assert.equal(isGameUpdating(), false);
  _setNow(null);
});

test('suksess nullstiller gameUpdating med en gang', async () => {
  let t = 1_000_000;
  _setNow(() => t);
  mockFetch(() => new Response('', { status: 503 }));
  await assert.rejects(getBootstrap());
  assert.equal(isGameUpdating(), true);
  mockFetch(() => jsonResponse({ events: [] }));
  await getBootstrap();
  assert.equal(isGameUpdating(), false);
  _setNow(null);
});
```

  (NB: cachen må tømmes mellom kallene som i filas øvrige tester — 503-en
  cacher ingenting, så andre `getBootstrap` går på nett.)

  I `test/middleware.test.js` (~3 tester): feil med `status: 503` →
  `/api/`-forespørsel får `503` + `{ error: 'FPL-API-et oppdateres — prøv
  igjen om noen minutter.' }`; HTML-forespørsel får status 503 og siden
  inneholder «FPL oppdaterer spillet»; vanlig feil gir fortsatt 500.

- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3: Implementer.** `fplClient.js`:

```js
// Settes ved 503 «The game is being updated». Tidsstemplet: banneret slukkes
// automatisk UPDATING_TTL_MS etter siste 503 selv om ingen kall lykkes i
// mellomtiden (før kunne det henge i 15 min), og enhver suksess nullstiller.
const UPDATING_TTL_MS = 5 * 60_000;
let updatingSince = null;
let now = () => Date.now();

export function isGameUpdating() {
  return updatingSince != null && now() - updatingSince < UPDATING_TTL_MS;
}

/** Overstyrer klokken (for tester). null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}
```

  I 503-grenen: `updatingSince = now();` — ved suksess: `updatingSince = null;`
  (erstatter dagens `gameUpdating = true/false`).

  `createErrorHandler` i `middleware.js`:

```js
return (err, req, res, next) => {
  const updating = err?.status === 503;
  if (!updating) console.error('Uventet feil:', err);
  if (res.headersSent) return;

  if (wantsJson(req)) {
    res.status(updating ? 503 : 500).json({
      error: updating ? 'FPL-API-et oppdateres — prøv igjen om noen minutter.' : 'Noe gikk galt.',
    });
    return;
  }

  res.status(updating ? 503 : 500);
  const locals = updating
    ? {
        code: 503,
        heading: 'FPL oppdaterer spillet',
        message: 'Dataene er ikke tilgjengelige riktig ennå — prøv igjen om noen minutter.',
      }
    : { code: 500, heading: 'Noe gikk galt', message: null };
  res.render('error', locals, /* …samme layout-oppfølging som i dag… */);
};
```

  `views/error.ejs` (hele fila):

```ejs
<section class="empty-state">
  <p class="empty-code"><%= code %></p>
  <h1><%= heading %></h1>
  <% if (message) { %>
    <p><%= message %></p>
  <% } else { %>
    <p>
      Klarte ikke å hente eller vise dataene. Ofte er FPL-API-et midlertidig
      utilgjengelig — prøv igjen om et øyeblikk, eller gå til <a href="/">dashbordet</a>.
    </p>
  <% } %>
  <p><a href="/" class="btn-link">Til dashbordet</a></p>
</section>
```

  Oppdater error-viewets render-test i `test/views.test.js` med de nye
  locals (den rendrer i dag med `{}` — det vil nå kaste; send
  `{ code: 500, heading: 'Noe gikk galt', message: null }`).

- [ ] **Step 4:** `npm test` → ~359/359, `npm run lint` → 0
- [ ] **Step 5: Lokal røyktest** (tomme nøkler): alle 11 ruter 200, ukjent
  sti 404. (503-stien er dekket av testene — ikke prøv å fremprovosere den
  mot ekte FPL.)
- [ ] **Step 6: Docs i samme commit** — `package.json` `1.3.6`; CHANGELOG:

```
## [1.3.6] - 2026-08-XX

### Fixed

- «FPL oppdaterer spillet»-banneret kan ikke lenger bli hengende: det
  slukkes automatisk fem minutter etter siste 503 fra FPL, i tillegg til
  ved første vellykkede svar.
- Åpnes siden mens FPL oppdaterer spillet og ingenting ligger i cachen,
  vises en forklarende side med råd om å prøve igjen — ikke en generisk
  feilside. `/api/*` svarer 503 med egen feilmelding i samme situasjon.
```

  ROADMAP: huk av + stryk rad (mønster fra Task 1). CLAUDE.md
  FPL-API-punktet om 503 utvides med «flagget utløper av seg selv etter
  5 min». HANDOVER: status + logg.
- [ ] **Step 7:** Branch `fix/game-updating-v136`, commit
  `fix: tidsstemplet gameUpdating-flagg og forklarende 503-side (v1.3.6)`,
  merge `--no-ff`, tag `v1.3.6`. **STOPP → vent på «push».**
- [ ] **Step 8: Prod-verifisering:** footer `v1.3.6`, `/health` 200 — og
  hent GRACEFUL-SHUTDOWN-BEVISET: loggen til forrige container (deploy-
  overgangen) skal vise «SIGTERM mottatt — lukker serveren» + «Serveren
  lukket ryddig». Før beviset i HANDOVER (lukker Task 1s bevispunkt).

**NB / kan gå galt:** ikke la `updating`-grenen logge hele stacktracen for
hver 503 (støy). `err.status === 503` treffer `FplError` fra fplClient;
andre feil har ikke `status` og går som 500. Kaldstart-scenarioet = tom
cache + 503 → ruta kaster → feilhandleren viser den nye siden.

---

## Task 3: v1.3.7 — Persistent «brief sendt»-markør

**Files:**
- Modify: `src/config.js` (`dataDir`), `src/services/notify.js`
  (last/lagre markøren), `Dockerfile` (`/app/data` eid av node),
  `.gitignore` (`data/`), `.env.example` (`DATA_DIR`)
- Test: `test/notify.test.js`
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md`, `CLAUDE.md`
  (config-lista + notify-beskrivelsen), `DEPLOY.md` (volum-oppskrift)

**Interfaces:**
- `config.dataDir: string` (env `DATA_DIR`, default `'data'`).
- notify.js internt: `loadState() → number|null`, `saveState(id)` (begge
  overstyrbare via `_setHooks({ loadState, saveState })`), ny eksport
  `_initState()` som `startScheduler` kaller og testene kan kalle direkte.

- [ ] **Step 0 (Marius, FØR push):** legg til persistent volum i Coolify:
  Storages → destination path `/app/data`. Bekreft i chatten.
- [ ] **Step 1: Feilende tester** i `test/notify.test.js` (bruk filas
  `_setHooks`/`_send`/`_reset`-mønster):

```js
test('brief-markøren leses ved oppstart og hindrer re-sending', async () => {
  const posts = [];
  _setHooks({ loadState: () => 2, compose: async () => 'melding', post: async (m) => posts.push(m) });
  _initState();
  await _send({ id: 2, name: 'Gameweek 2' });
  assert.equal(posts.length, 0);
});

test('vellykket sending lagrer markøren', async () => {
  const saved = [];
  _setHooks({ loadState: () => null, compose: async () => 'melding', post: async () => {}, saveState: (id) => saved.push(id) });
  _initState();
  await _send({ id: 3, name: 'Gameweek 3' });
  assert.deepEqual(saved, [3]);
});

test('feil ved lagring stopper ikke sendingen', async () => {
  const posts = [];
  _setHooks({
    loadState: () => null,
    compose: async () => 'melding',
    post: async (m) => posts.push(m),
    saveState: () => { throw new Error('disk borte'); },
  });
  _initState();
  await _send({ id: 3, name: 'Gameweek 3' }); // skal ikke kaste
  assert.equal(posts.length, 1);
});
```

- [ ] **Step 2:** `npm test` → FAIL («_initState is not a function»)
- [ ] **Step 3: Implementer** i `notify.js` (+ `import fs from 'node:fs'`,
  `import path from 'node:path'`):

```js
// Markøren overlever redeploy: uten den re-poster en deploy innenfor
// 15-min-vinduet briefen til Discord (P1-5b). Fila ligger på DATA_DIR
// (volum i prod); mangler den eller er den uskrivbar, faller vi tilbake
// til ren minne-oppførsel — aldri krasj.
const stateFile = () => path.join(config.dataDir, 'brief-state.json');

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    return Number.isInteger(raw.lastSentEvent) ? raw.lastSentEvent : null;
  } catch {
    return null;
  }
}

function saveState(eventId) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify({ lastSentEvent: eventId }));
}

function persistState(eventId) {
  try {
    (hooks.saveState ?? saveState)(eventId);
  } catch (err) {
    console.error('Klarte ikke å lagre brief-markøren:', err.message);
  }
}

export function _initState() {
  lastSentEvent = (hooks.loadState ?? loadState)();
  if (lastSentEvent != null) {
    console.log(`Brief-markør lastet: runde ${lastSentEvent} er alt sendt`);
  }
}
```

  `startScheduler`: kall `_initState()` rett etter webhook-guarden.
  I `send()`: etter `lastSentEvent = event.id;` → `persistState(event.id);`.
  I skip-grenen i `check()`: samme `persistState(upcoming.id)`.
  `hooks`-objektet utvides med `loadState: null, saveState: null`, og
  `_reset()` nullstiller dem.
  `config.js`: `dataDir: process.env.DATA_DIR || 'data',`.
  `Dockerfile` — legg inn FØR `USER node`:

```
RUN mkdir -p /app/data && chown node:node /app/data
```

  `.gitignore`: ny linje `data/`. `.env.example`:

```
# Mappe for tilstand som skal overleve omstart (auto-briefens sendt-markør).
# DATA_DIR=data
```

- [ ] **Step 4:** `npm test` → ~363/363, `npm run lint` → 0
- [ ] **Step 5: Lokal røyktest med ekte fs** (0 nettverkskall til
  AI/Discord): skriv `{"lastSentEvent":2}` til
  `<scratchpad>/data/brief-state.json`, start appen med scratchpad-.env der
  `DATA_DIR=<scratchpad>/data`, `DISCORD_WEBHOOK_URL=http://localhost:9/`
  (dummy — GW2 er runde 2, markøren matcher, så check() returnerer før noe
  sendes) og TOM `ANTHROPIC_API_KEY=`. Bevis: logglinjen «Brief-markør
  lastet: runde 2 er alt sendt» + ingen Discord-feil i loggen.
- [ ] **Step 6: Docs i samme commit** — `package.json` `1.3.7`; CHANGELOG:

```
## [1.3.7] - 2026-08-XX

### Fixed

- Auto-briefen kan ikke lenger postes to ganger til Discord når appen
  deployes i kvarteret etter sendetidspunktet: «brief sendt»-markøren
  lagres i `data/brief-state.json` og overlever omstart og redeploy.
  Krever et persistent volum på `/app/data` i Coolify; uten volum
  oppfører appen seg som før.
```

  DEPLOY.md: kort avsnitt «Volum for brief-markøren» (destination
  `/app/data`, satt opp 2026-08-XX). CLAUDE.md: `DATA_DIR` inn i
  config-lista + én setning i notify-beskrivelsen. ROADMAP: huk av + stryk
  rad. HANDOVER: status + logg. Fjern/juster den utdaterte kommentaren
  øverst i notify.js («Varig løsning krever persistens … se ROADMAP»).
- [ ] **Step 7:** Branch `fix/brief-markor-v137`, commit
  `fix: brief sendt-markøren overlever redeploy (v1.3.7)`, merge `--no-ff`,
  tag `v1.3.7`. **STOPP → volumet MÅ være bekreftet (Step 0), så vent på
  «push».** Deploy senest torsdag 27. før 12:00, ellers mandag 31.
- [ ] **Step 8: Prod-verifisering:** footer `v1.3.7`, `/health` 200.
  Naturlig sluttbevis: torsdag 27. ~19:30 sendes GW2-briefen og fila
  skrives; ved NESTE deploy/omstart skal loggen vise «Brief-markør lastet:
  runde 2 er alt sendt». Føres i HANDOVER når det observeres (typisk ved
  Task 4-fix eller Task 7-deployen).

**NB / kan gå galt:** navngitte Docker-volum arver eierskapet fra imaget
(`chown node:node` i Dockerfile er derfor nok); blir fila likevel uskrivbar
logges én feillinje per forsøk og appen går videre. `loadState` tåler
manglende, tom og korrupt fil (try/catch → null). Ikke flytt
`_initState`-kallet foran webhook-guarden — uten webhook skal modulen
forbli helt inaktiv.

---

## Task 4: P3 — transfers-skjemaet mot ekte data (TIDLIGST ma 31. aug)

**Gate:** GW2 ferdigspilt OG Marius har gjort minst én transfer (gjør den
før deadline fr 28. kl. 19:30 — uten transfer finnes ingen data å sjekke).

- [ ] **Step 1:** Scratchpad-skript (engangs, utenfor repoet — presedens:
  QA-skriptene) som henter `entry/5330646/transfers/` og
  `entry/5330646/history/` med nettleser-User-Agent, og skriver ut
  feltnavnene i første element av hver.
- [ ] **Step 2:** Sammenlikn med fixture-antakelsene i
  `test/fixtures`/`test/transfers.test.js`: `element_in`, `element_out`,
  `event`, `time`, `event_transfers_cost`. Avvik → oppdater fixtures +
  guards i `src/services/transfers.js`, TDD, `fix:`-commit som rir neste
  ledige patchnummer (skyver i så fall v1.3.8/v1.4.0-numrene).
- [ ] **Step 3:** Se `https://fpl.marsk.no/overganger` med ekte data;
  mobilsjekk 390 px (vannrett scroll kun i `.table-scroll`) — Playwright i
  scratchpad eller Marius' telefon (overlapper P2).
- [ ] **Step 4:** Før resultatet i HANDOVER (feltnavnene bekreftet/avvik),
  huk av «Etter GW2»-punktet under v1.2.0 i ROADMAP, fjern kø-punkt 2 og
  stryk P3-raden i versjonstabellen (`**utført XX. aug**`). Commit
  `docs: P3 lukket — transfers-skjemaet bekreftet mot ekte data`.
  (Ren docs-commit kan vente med push til neste release-deploy hvis
  måleuken har startet.)

## Task 5: P2 — README-skjermbilder + mobil-QA (Marius, når som helst)

- [ ] Marius: skjermbilder (dashbord, /spillere, /lag i desktop + 390 px)
  → legges der README forventer dem; mobilsjekkene (vannrett scroll,
  sticky hode, footer, norsk, AI-merke) på ekte telefon.
- [ ] Opus: commit bildene, huk av P2 i ROADMAP (kø-punkt 3 fjernes,
  P2-raden strykes), oppdater restpunkt-lista i
  `docs/sjekkpunkt-d-kostnad.md` og HANDOVER.

## Task 6: P4 — kostnadsmåling (ma 7. sept; metoden EIES av sjekkpunkt-d)

**Gate:** stille måleuke 1.–6. sept gjennomført (ingen deploy).
Marius samler `AI-kall:`-linjer fra Coolify-loggen løpende gjennom uken
(vinduet er 100 linjer — hent ca. daglig).

- [ ] **Step 1 (Marius):** loggutdrag siden 1. sept + Anthropic-konsollens
  Usage/Cost for samme dager (konsollen er fallback/tak som sist).
- [ ] **Step 2 (Opus):** gjenskap `aikost.js` i scratchpad fra kilden
  nederst i `docs/sjekkpunkt-d-kostnad.md`, kjør
  `node aikost.js <antall døgn> < aikall.txt`. NB: fra 1. sept gjelder
  ordinærprisen $3/$15 — bruk `claude-sonnet-5-standard`-raden som
  primærtall.
- [ ] **Step 3:** Vurder mot tersklene (<$1 ingen tiltak; $1–4 se hvilken
  funksjon som drar — kortere svar er første knapp; >$4 bytt
  `AI_MODEL=claude-haiku-4-5`) OG mot taktbudsjettet ~41–45 kall/uke.
  Avvik i antall kall = en funksjon fyrer oftere enn designet — finn
  hvilken før noe endres.
- [ ] **Step 4:** Før resultatet inn i `docs/sjekkpunkt-d-kostnad.md`
  (ny seksjon «Resultat — målt 7. sept 2026»), oppdater HANDOVER +
  ROADMAP (kø-punkt 1 fjernes, P4-raden strykes). Commit
  `docs: P4 — kostnad målt etter prisskiftet`. Eventuelt modellbytte er én
  env-endring i Coolify (Marius) + notat i HANDOVER — ingen release.

---

## Task 7: v1.3.8 — genitiv-fiks i nyhetsfilteret (etter P4)

**Files:**
- Modify: `src/services/news.js` (`filterSummaryPoints`-matchingen)
- Test: `test/news.test.js`
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md`

**Interfaces:** `properNames` og `filterSummaryPoints` beholder signaturene.

- [ ] **Step 1: Feilende tester** i `test/news.test.js` (samme
  item-/punktform som filas eksisterende filterSummaryPoints-tester):

```js
test('genitiv i punktet matcher grunnform i saken', () => {
  const items = [{ title: 'Haaland scoret hat trick', description: '' }];
  const kept = filterSummaryPoints(['**Haalands** form er skremmende'], items);
  assert.equal(kept.length, 1);
});

test('apostrof-genitiv matcher også', () => {
  const items = [{ title: 'Salah tilbake i trening', description: '' }];
  const kept = filterSummaryPoints(['**Salah’s** status er avklart'], items);
  assert.equal(kept.length, 1);
});

test('punkt uten navnematch forkastes fortsatt', () => {
  const items = [{ title: 'Haaland scoret', description: '' }];
  const kept = filterSummaryPoints(['**Isak** nærmer seg comeback'], items);
  assert.equal(kept.length, 0);
});
```

- [ ] **Step 2:** `npm test` → FAIL (genitiv-testene)
- [ ] **Step 3: Implementer** i `news.js` — hjelpefunksjon + bruk i filteret:

```js
/** Navnet i småbokstaver + varianten uten genitiv-s («haalands» → «haaland»). */
function nameVariants(name) {
  const n = name.toLowerCase();
  const stripped = n.replace(/(?:['’]s|['’]|s)$/u, '');
  return stripped !== n && stripped.length > 2 ? [n, stripped] : [n];
}
```

  I `filterSummaryPoints`, erstatt
  `names.some((n) => corpus.includes(n.toLowerCase()))` med
  `names.some((n) => nameVariants(n).some((v) => corpus.includes(v)))`.
  (Motsatt retning — grunnform i punktet, genitiv i saken — dekkes allerede
  av substring-matchen.)

- [ ] **Step 4:** `npm test` → ~366/366, `npm run lint` → 0
- [ ] **Step 5: Docs i samme commit** — `package.json` `1.3.8`; CHANGELOG:

```
## [1.3.8] - 2026-09-XX

### Fixed

- Nyhetsoppsummeringens etterkontroll forkaster ikke lenger gyldige
  punkter der et navn står i genitiv («Haalands») mens saken har
  grunnformen («Haaland»).
```

  ROADMAP: huk av + stryk rad. HANDOVER: status + logg.
- [ ] **Step 6:** Branch `fix/genitiv-nyhetsfilter-v138`, commit
  `fix: genitiv-navn felles ikke av nyhetsfilteret (v1.3.8)`, merge
  `--no-ff`, tag. **STOPP → vent på «push».** (Kan gjerne deployes sammen
  med Task 8 — da tagges begge og pushes én gang.)

**NB:** falske positive er ufarlige her (et punkt beholdes), falske negative
var bugen. Ingen AI-kall — verifiseringen er ren unit-test.

---

## Task 8: v1.4.0 — alderstak på stale data + dataAlder (etter P4)

**Files:**
- Modify: `src/services/cache.js` (`fetchedAt` + `ageOf`),
  `src/services/fplClient.js` (`staleInfo`), `src/server.js` (renderPage
  sender `staleSince` til layout), `src/routes/live.js` (live-taket),
  `src/routes/api.js` (`dataAlder` i brief.json + live.json),
  `views/layout.ejs` (banner)
- Test: `test/cache.test.js`, `test/fplClient.test.js`, `test/views.test.js`
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `docs/HANDOVER.md`, `CLAUDE.md`

**Interfaces:**
- `cache.js`: `ageOf(key) → ms | null` (null når nøkkelen ikke finnes).
  `getOrFetch` uendret utad; entry lagrer nå også `fetchedAt`.
- `fplClient.js`: `staleInfo(gw = null) → null | { ageSec, tooOld,
  fetchedIso }` — `gw == null` leser nøkkel `'bootstrap'` mot 60-min-taket,
  ellers `` `live:${gw}` `` mot 10-min-taket.
- Layout-kontrakt: `staleSince` (formatert klokkeslett-streng eller null)
  rendrer banneret. API-kontrakt: `dataAlder` (heltall sekunder eller null).

- [ ] **Step 1: Feilende tester.** `test/cache.test.js` (~3, med `_setNow`):

```js
test('ageOf gir alderen på en cachet verdi', async () => {
  let t = 0;
  _setNow(() => t);
  await getOrFetch('nokkel', async () => 'verdi', { ttl: 1000 });
  t = 400;
  assert.equal(ageOf('nokkel'), 400);
  _setNow(null);
});

test('ageOf er null for ukjent nøkkel', () => {
  assert.equal(ageOf('finnes-ikke'), null);
});

test('ageOf nullstilles når verdien revalideres', async () => {
  let t = 0;
  _setNow(() => t);
  await getOrFetch('n2', async () => 'a', { ttl: 100 });
  t = 200; // utløpt → SWR-henting i bakgrunnen
  await getOrFetch('n2', async () => 'b', { ttl: 100 });
  await _flush();
  assert.equal(ageOf('n2'), 0);
  _setNow(null);
});
```

  `test/fplClient.test.js` (~3, med `_setNow` fra Task 2 + cache-`_setNow`
  synkronisert): `staleInfo()` er null uten cache; `tooOld: false` ved
  30 min gammel bootstrap; `tooOld: true` ved 61 min; live-varianten
  `staleInfo(2)` `tooOld: true` ved 11 min. `test/views.test.js` (~2):
  layout med `staleSince: '14:05'` inneholder «Viser data fra 14:05»;
  uten → ikke.

- [ ] **Step 2:** `npm test` → FAIL
- [ ] **Step 3: Implementer.** `cache.js`: `store.set(key, { value,
  expiresAt: now() + ttl, fetchedAt: now() })` +

```js
/** Alder i ms på cachet verdi for nøkkelen, null når den ikke finnes. */
export function ageOf(key) {
  const entry = store.get(key);
  return entry ? now() - entry.fetchedAt : null;
}
```

  `fplClient.js`:

```js
// Alderstak (v1.4.0): eldre stale-data enn dette vises fortsatt, men med
// banner — «usynlig gammelt» finnes ikke lenger. Live foreldes raskere.
const STALE_BANNER_MS = 60 * 60_000;
const STALE_BANNER_LIVE_MS = 10 * 60_000;

export function staleInfo(gw = null) {
  const key = gw == null ? 'bootstrap' : `live:${gw}`;
  const cap = gw == null ? STALE_BANNER_MS : STALE_BANNER_LIVE_MS;
  const age = ageOf(key);
  if (age == null) return null;
  return {
    ageSec: Math.round(age / 1000),
    tooOld: age > cap,
    fetchedIso: new Date(now() - age).toISOString(),
  };
}
```

  `server.js` renderPage-layoutdataene: alle sider får bootstrap-taket
  automatisk —

```js
const stale = staleInfo();
// … i layout-datalista:
staleSince: data.staleSince !== undefined
  ? data.staleSince
  : stale?.tooOld ? formatTime(stale.fetchedIso) : null,
```

  (`formatTime` importeres fra `./services/format.js` — sjekk eksakt navn
  der; live-siden bruker den alt.) `routes/live.js` overstyrer med
  live-taket: `staleSince: liveStale?.tooOld ? formatTime(liveStale.fetchedIso) : null`
  der `liveStale = staleInfo(gw)`. `views/layout.ejs`, rett under
  gameUpdating-banneret:

```ejs
<% if (staleSince) { %>
  <div class="banner" role="status">
    Viser data fra <%= staleSince %> — får ikke kontakt med FPL akkurat nå.
  </div>
<% } %>
```

  `routes/api.js`: brief.json-svaret får
  `dataAlder: staleInfo()?.ageSec ?? null`, live.json-svaret
  `dataAlder: staleInfo(gw)?.ageSec ?? null` (samme `gw` som payloaden er
  bygget for).

- [ ] **Step 4:** `npm test` → ~375/375, `npm run lint` → 0
- [ ] **Step 5: Lokal røyktest** (tomme nøkler): 11 ruter 200 uten banner;
  `/api/brief.json` og `/api/live.json` inneholder `dataAlder` som tall.
- [ ] **Step 6: Docs i samme commit** — `package.json` `1.4.0`; CHANGELOG:

```
## [1.4.0] - 2026-09-XX

### Added

- Sidene sier fra når FPL-dataene er gamle: er de eldre enn alderstaket
  (10 minutter for live, 60 minutter ellers), vises banneret «Viser data
  fra HH:MM — får ikke kontakt med FPL akkurat nå.» Innenfor taket
  serveres data stille som før.
- `/api/brief.json` og `/api/live.json` oppgir `dataAlder` — sekunder
  siden dataene sist ble hentet fra FPL.
```

  CLAUDE.md: FPL-API-seksjonen får alderstak-setningen; cache-beskrivelsen
  nevner `ageOf`. ROADMAP: huk av + stryk rad. HANDOVER: status + logg.
- [ ] **Step 7:** Branch `feat/alderstak-v140`, commit
  `feat: alderstak med banner + dataAlder i API-payloadene (v1.4.0)`,
  merge `--no-ff`, tag `v1.4.0`. **STOPP → vent på «push».**
- [ ] **Step 8: Prod-verifisering:** footer `v1.4.0`, `/health` 200,
  `/api/brief.json` har `dataAlder`, ingen banner synlig (dataene er
  ferske). Banner-tilstanden er bevist av testene — ikke prøv å
  fremprovosere FPL-nedetid.

**NB / kan gå galt:** views.test.js rendrer layout direkte — den nye
`staleSince`-localen må inn i ALLE eksisterende layout-render-tester
(samme øvelse som `gameUpdating` i sin tid). `staleInfo` må bruke samme
`now`-kilde som `ageOf` sammenlikner mot, ellers spriker testklokkene.
`getLiveHistoric` deler nøkkel `live:${gw}` — for ferdige runder er data
immutable og `tooOld` irrelevant, men banneret styres av SISTE henting, så
en 6 t gammel historisk runde på /overganger gir IKKE banner (bootstrap
styrer der — riktig oppførsel).

---

## Task 9: Arkiver denne planfila (når Task 0–8 er huket av)

- [ ] `git mv docs/plan-sluttspurt.md docs/arkiv/plan-sluttspurt.md`
- [ ] ROADMAP dokumentkart: fjern plan-sluttspurt-raden, oppdater
  arkiv-raden til «(18 filer)». Rett ev. gjenværende referanser til
  `docs/plan-sluttspurt.md` (grep!) til arkiv-stien.
- [ ] HANDOVER: statuspunktet om planen oppdateres til «alt utført,
  plan arkivert»; loggpost. Commit
  `docs: sluttspurten fullført — planen arkivert`.
