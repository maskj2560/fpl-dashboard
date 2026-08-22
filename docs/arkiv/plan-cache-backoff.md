# Failure-backoff i cache.js (P3-2) — implementeringsplan

> Planlagt av Fable 5 i plan mode, godkjent av Marius 2026-08-20.
> Utføres av Opus 5 i egen økt (kjøreprompt:
> `docs/neste-okt-prompt-cache-backoff-utforelse.md`). Følg planen nøyaktig;
> avvik rapporteres eksplisitt. Steg bruker checkbox-syntaks for sporing.

**Mål:** Etter en mislykket bakgrunnsrevalidering i `cache.js` skal nye forsøk på samme nøkkel tidligst skje 30 s senere — stale verdi serveres fortsatt umiddelbart, og suksess nullstiller backoffen.

**Arkitektur:** Én ny modul-lokal `Map` (`lastFailedAt`) i `src/services/cache.js`. Feil stemples i `fetchDeduped`, suksess sletter stempelet, og stale-stien i `getOrFetch` konsulterer stempelet før den trigger revalidering. Ingen endring utenfor cache.js.

**Tech stack:** Node 22+ ESM, `node:test`, ESLint flat config. Ingen nye avhengigheter.

**Spec:** `docs/neste-okt-prompt-cache-backoff.md` (oppdraget) + funn P3-2 i ROADMAP.md («v1.2.0-kandidater»).

## Kontekst (hvorfor)

`getOrFetch` serverer stale verdi og starter bakgrunnsrevalidering ved HVER request etter utløpt TTL (`src/services/cache.js` linje 17–23). In-flight-dedup hjelper bare mens et forsøk pågår. Er FPL nede over tid, utløser hver sidevisning et nytt forsøk — og hvert forsøk i `fplFetch` er 1 kall + 2 retries over opptil ~10 s (`src/services/fplClient.js` linje 34–65). Resultat: konstant hamring mot et nede-API fra alle sider som leser samme nøkler. Funnet er P3-2 fra kvalitetspasset v1.1.3, verifisert mot koden.

## Designbeslutninger

- **Tilstand:** `const lastFailedAt = new Map()` (nøkkel → `now()` ved siste mislykkede henting), modul-lokal ved siden av `store`/`inFlight`. Stemples i `fetchDeduped` sin catch (én plass, dekker alle stier), slettes ved suksess.
- **Per nøkkel — ja.** Nøkler er ulike FPL-endepunkter; en feil på ett (f.eks. picks før GW1) skal ikke blokkere revalidering av bootstrap. Ved full FPL-nedetid stempler hver nøkkel seg selv ved sitt første forsøk, så effekten konvergerer uansett mot global ro uten kobling mellom nøkler.
- **30 s som konstant**, ikke konfigurerbar: `const FAILURE_BACKOFF_MS = 30_000`. Filen har ingen config i dag, eneste konsument er fplClient, og testene styrer klokken med `_setNow` — injeksjon trengs ikke (YAGNI). Navnet speiler `FAILURE_BACKOFF_MS` i ai.js.
- **`getOrFetch`-signaturen er uendret** (`key, fetcher, { ttl }`). Ingen endringer i fplClient.js.
- **Førstegangshenting (ingen cachet verdi) er uendret:** «ingen entry»-stien konsulterer aldri backoffen og kaster fortsatt feilen til kalleren. At også førstegangsfeil stempler `lastFailedAt` er uobserverbart der (stien leser aldri stempelet) og holder implementasjonen på én kodesti.
- **Samspill med in-flight-dedup:** backoffen sjekkes FØR `fetchDeduped`. Pågår en revalidering, er stempelet ennå ikke satt og dedup kollapser samtidige triggere som i dag; når forsøket avgjøres settes (feil) eller slettes (suksess) stempelet.
- **Samspill med `_flush()`:** uendret. En undertrykt revalidering lager ingen in-flight-promise, så `_flush()` etter en undertrykt request løser umiddelbart — testene forblir deterministiske.
- **`clear()`** tømmer også `lastFailedAt` (hindrer at tilstand lekker mellom tester).
- **Vinduskant:** retry tillates når `now() - failedAt >= FAILURE_BACKOFF_MS` («tidligst 30 s senere» — nøyaktig 30 s er lov). Hver NY feil starter nytt vindu.

**Bevisst utelatt** (produktbeslutninger, tas ikke her):
- *Alderstak på stale data* — å skjule/markere for gamle data endrer hva sidene viser og må avtales med Marius.
- *`dataAlder` i payloaden* — API-kontraktsendring for alle konsumenter; egen beslutning.
De blir stående som restpunkt i ROADMAP-kandidatlista.

## Målimplementasjon (`src/services/cache.js`, komplett)

```js
// Generisk TTL-cache med stale-while-revalidate og in-flight dedup.
// Utløpt verdi serveres umiddelbart mens ny hentes i bakgrunnen; N samtidige
// kall til samme nøkkel gir ett fetcher-kall. Etter en mislykket henting
// ventes FAILURE_BACKOFF_MS før ny revalidering av samme nøkkel — stale
// verdi serveres fortsatt umiddelbart i mellomtiden.

const FAILURE_BACKOFF_MS = 30_000;

const store = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise
const lastFailedAt = new Map(); // key -> tidspunkt for siste mislykkede henting

let now = () => Date.now();

export async function getOrFetch(key, fetcher, { ttl }) {
  const entry = store.get(key);

  if (entry && entry.expiresAt > now()) {
    return entry.value;
  }

  if (entry) {
    // Stale: server gammel verdi med en gang, oppdater i bakgrunnen —
    // men ikke før backoff-vinduet etter forrige feil er over.
    const failedAt = lastFailedAt.get(key);
    if (failedAt === undefined || now() - failedAt >= FAILURE_BACKOFF_MS) {
      fetchDeduped(key, fetcher, ttl).catch(() => {
        // Revalidering feilet — stale verdi beholdes.
      });
    }
    return entry.value;
  }

  return fetchDeduped(key, fetcher, ttl);
}

function fetchDeduped(key, fetcher, ttl) {
  let promise = inFlight.get(key);
  if (!promise) {
    promise = (async () => {
      try {
        const value = await fetcher();
        store.set(key, { value, expiresAt: now() + ttl });
        lastFailedAt.delete(key);
        return value;
      } catch (err) {
        lastFailedAt.set(key, now());
        throw err;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, promise);
  }
  return promise;
}

/** Venter på alle pågående bakgrunnsoppdateringer (for tester). */
export async function _flush() {
  await Promise.allSettled([...inFlight.values()]);
}

/** Overstyrer klokken (for tester). null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}

export function clear() {
  store.clear();
  inFlight.clear();
  lastFailedAt.clear();
}
```

## Globale rammer (gjelder alle tasks)

- Branch **`fix/cache-backoff`** fra `main`. **ALDRI push** uten eksplisitt klarsignal fra Marius (push til `main` auto-deployer til prod). **IKKE merge** før sesongstart-verifiseringens sjekkpunkt D (søndag/mandag) er ferdig. Aldri deploy torsdag 19:00–21:00.
- `npm test` og `npm run lint` grønne etter HVER commit. Utgangspunkt: **212/212, lint 0**. Røde tester kan derfor aldri committes alene — TDD-rødt observeres i økten, test + implementasjon går i samme commit.
- Ingen nettverkskall i tester, ingen ekte timere/sleeps — kun `_setNow`/`_flush`/`clear`.
- Ingen nye avhengigheter. Ingen cache-mekanikk utenfor cache.js.
- Conventional commits. Bevis, ikke påstander: vis kommando + output for hver verifisering.

---

### Task 1: Backoff med tester + docs (én commit)

**Filer:**
- Endre: `src/services/cache.js` (målimplementasjonen over)
- Test: `test/cache.test.js` (6 nye tester nederst i filen)
- Endre: `CHANGELOG.md` (`[Unreleased]` → `### Fixed`), `ROADMAP.md`, `CLAUDE.md` (cache.js-linja)

**Interfaces:** `getOrFetch(key, fetcher, { ttl })`, `_flush()`, `_setNow(fn)`, `clear()` — alle uendret utad. Ny privat konstant `FAILURE_BACKOFF_MS = 30_000`.

- [ ] **Steg 1: Branch**

```powershell
git checkout -b fix/cache-backoff
```

- [ ] **Steg 2: Skriv de 6 nye testene** (nederst i `test/cache.test.js`; `clock`/`beforeEach` finnes allerede)

```js
test('mislykket revalidering: nytt forsøk innen 30 s undertrykkes, stale serveres', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('nede');
    return 'gammel';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // stale + revalidering feiler (calls=2)
  await _flush();

  clock = 20_000; // 18,5 s etter feilen — innenfor vinduet
  const value = await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();

  assert.equal(value, 'gammel');
  assert.equal(calls, 2, 'ingen ny revalidering innenfor backoff-vinduet');
});

test('etter 30 s backoff prøves revalidering igjen, og suksess lagres', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();

  clock = 31_500; // nøyaktig 1500 + 30 000 — retry er lov
  const stale = await getOrFetch('k', fetcher, { ttl: 1000 }); // trigger retry (calls=3)
  await _flush();
  const fresh = await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(stale, 'verdi-1', 'stale serveres mens retry pågår');
  assert.equal(fresh, 'verdi-3', 'vellykket retry er lagret');
  assert.equal(calls, 3);
});

test('hver mislykket revalidering starter nytt backoff-vindu', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('nede');
    return 'gammel';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();
  clock = 31_500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // retry feiler (calls=3), backoff fra 31 500
  await _flush();

  clock = 60_000; // 28,5 s etter SISTE feil — fortsatt i vinduet
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 3, 'ingen retry før 30 s etter siste feil');

  clock = 61_500; // 30 s etter siste feil
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 4);
});

test('vellykket revalidering nullstiller backoffen', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();
  clock = 31_500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // suksess (calls=3), utløper 32 500
  await _flush();

  clock = 33_000; // ny verdi utløpt — ingen backoff skal gjelde
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 4, 'suksess fjernet backoffen — revalidering skjer straks');
});

test('backoff gjelder per nøkkel', async () => {
  let aCalls = 0;
  let bCalls = 0;
  const failA = async () => {
    aCalls++;
    if (aCalls > 1) throw new Error('nede');
    return 'a';
  };
  const okB = async () => {
    bCalls++;
    return `b-${bCalls}`;
  };

  await getOrFetch('a', failA, { ttl: 1000 });
  await getOrFetch('b', okB, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('a', failA, { ttl: 1000 }); // a feiler → backoff kun for a
  await _flush();

  clock = 2000;
  await getOrFetch('b', okB, { ttl: 1000 }); // b er stale og revaliderer fritt
  await _flush();

  assert.equal(bCalls, 2, 'backoff på a blokkerer ikke b');
  assert.equal(aCalls, 2);
});

test('clear() nullstiller backoff-tilstanden', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();

  clear();
  await getOrFetch('k', fetcher, { ttl: 1000 }); // førstegang etter clear (calls=3), utløper 2500
  clock = 3000;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // stale — må revalidere selv om 3000−1500 < 30 000
  await _flush();

  assert.equal(calls, 4, 'gammel backoff overlever ikke clear()');
});
```

- [ ] **Steg 3: Kjør testene og se rødt der det skal være rødt**

```powershell
npm test
```

Forventet: test 1 («…innen 30 s undertrykkes…») og test 3 («…nytt backoff-vindu») FEILER mot dagens kode (dagens kode revaliderer alltid → `calls` blir for høy). Test 2, 4, 5 og 6 er regresjonspinner som er grønne både før og etter — de låser vinduets slutt, nullstilling ved suksess, per-nøkkel-skopet og `clear()` mot en overivrig implementasjon (f.eks. backoff som aldri slippes, stempling ved suksess, eller globalt vindu). Vis outputen for de to røde.

- [ ] **Steg 4: Implementer målimplementasjonen** (kodeblokken over) i `src/services/cache.js`. Diffen mot dagens fil er: toppkommentaren utvidet, `FAILURE_BACKOFF_MS`, `lastFailedAt`-Map, backoff-sjekk i stale-stien, try/catch i `fetchDeduped` (stemple feil / slette ved suksess), `lastFailedAt.clear()` i `clear()`.

- [ ] **Steg 5: Verifiser grønt**

```powershell
npm test
npm run lint
```

Forventet: **218/218** (212 + 6), lint 0. Vis talllinjene.

- [ ] **Steg 6: Docs i samme commit**

  - `CHANGELOG.md` under `## [Unreleased]`, ny `### Fixed`:

    ```markdown
    ### Fixed

    - **Ved FPL-nedetid slutter sidene å hamre på API-et.** Når en
      bakgrunnsoppdatering av cachet FPL-data feiler, venter cachen nå 30
      sekunder per nøkkel før neste forsøk (før: nytt forsøk på opptil ~10 s
      ved hver eneste sidevisning). Gamle data serveres umiddelbart som før,
      og et vellykket forsøk nullstiller ventetiden (P3-2)
    ```

  - `ROADMAP.md`: ny seksjon rett etter «## v1.2.0 — …»:

    ```markdown
    ## v1.2.1 — failure-backoff i cache.js (P3-2)

    _Plan: `docs/plan-cache-backoff.md`. Merges først etter sjekkpunkt D._

    - [x] 30 s backoff per nøkkel etter mislykket revalidering (TDD, 6 nye tester)
    - [ ] Røyktest lokalt (11 ruter 200, AI/Discord av) + handover
    ```

    …og i kandidatlista erstattes hele punktet «**Failure-backoff i `cache.js`**: …» med restpunktet:

    ```markdown
    - **Alderstak på stale data + `dataAlder` i payloaden** (rest av P3-2 —
      backoffen er gjort i v1.2.1): å skjule/markere for gamle data er en
      produktbeslutning og en payload-kontraktsendring; tas separat med Marius.
    ```

  - `CLAUDE.md`, filkartlinja for cache.js:

    ```
      cache.js         TTL-cache med stale-while-revalidate, in-flight dedup
                       og 30 s backoff per nøkkel etter mislykket revalidering
    ```

- [ ] **Steg 7: Commit**

```powershell
git add src/services/cache.js test/cache.test.js CHANGELOG.md ROADMAP.md CLAUDE.md
git commit -m "feat(cache): 30 s backoff per nokkel etter mislykket revalidering"
```

### Task 2: Røyktest + handover (én commit)

**Filer:**
- Endre: `docs/HANDOVER.md` (status + logg), `ROADMAP.md` (huk av røyktest-punktet)

- [ ] **Steg 1: Røyktest med tomme nøkler** (teknikk fra HANDOVER «Driftslærdommer»: `config.js` kjører `process.loadEnvFile()` som leser repoets `.env` med prod-nøklene uansett — TOMME verdier fra `--env-file` vinner fordi `loadEnvFile` ikke overskriver satte variabler)

```powershell
# I DENNE øktens scratchpad-mappe (aldri i repoet):
Set-Content "$env:SCRATCH\.env" "PORT=3010`nFPL_TEAM_ID=5330646`nANTHROPIC_API_KEY=`nDISCORD_WEBHOOK_URL=" -Encoding ascii
node --env-file="$env:SCRATCH\.env" src/server.js   # kjør i bakgrunn
```

- [ ] **Steg 2: `/health` FØRST** — gå ikke videre før denne stemmer:

```powershell
(Invoke-WebRequest "http://localhost:3010/health" -UseBasicParsing).Content
```

Forventet: `"ai":false` og `"discord":false`. Står det `true`: STOPP serveren umiddelbart og feilsøk env-filen.

- [ ] **Steg 3: Alle 11 ruter 200 + ukjent sti 404**

```powershell
$ruter = '/','/spillere','/lag','/overganger','/liga','/brief','/live','/nyheter','/health','/api/brief.json','/api/live.json'
foreach ($r in $ruter) { "{0} {1}" -f (Invoke-WebRequest "http://localhost:3010$r" -UseBasicParsing).StatusCode, $r }
try { Invoke-WebRequest "http://localhost:3010/finnes-ikke" -UseBasicParsing } catch { "404-sjekk: {0}" -f $_.Exception.Response.StatusCode.value__ }
```

Forventet: elleve linjer `200 …`, deretter `404-sjekk: 404`. Stopp serveren etterpå.

- [ ] **Steg 4: HANDOVER + ROADMAP, commit**

  - `docs/HANDOVER.md`: oppdater «Sist oppdatert», legg i «Status» at `fix/cache-backoff` er ferdig lokalt (218/218, lint 0, røyktest OK) og venter på sjekkpunkt D før merge; loggfør Marius' beskjeder fra økten.
  - `ROADMAP.md`: huk av røyktest-punktet i v1.2.1-seksjonen.

```powershell
git add docs/HANDOVER.md ROADMAP.md
git commit -m "docs: handover og roeyktestbevis for cache-backoff"
```

- [ ] **Steg 5: Sluttrapport til Marius** — commits (hash + melding), testtall før/etter (212 → 218), lint 0, røyktestlinjene, eventuelle avvik fra planen. **Ingen push. Ingen merge.**

## Verifisering (oppsummert)

1. `npm test` → 218/218, `npm run lint` → 0 (etter hver commit).
2. De to røde testene fra Steg 3 vist røde FØR implementasjon, grønne etter.
3. Røyktest: `/health` → `ai:false, discord:false`, 11 ruter 200, ukjent sti 404.
4. Eksisterende åtte cache-tester uendret og grønne (spesielt «feilet kall caches ikke» — førstegangsstien er upåvirket — og «feilet bakgrunnsoppdatering beholder stale verdi»).
