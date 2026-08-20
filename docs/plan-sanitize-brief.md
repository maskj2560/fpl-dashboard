# Robust `sanitizeBriefText` (P3-4) — implementeringsplan

> **For agentiske utførere:** PÅKREVD UNDER-SKILL: bruk
> `superpowers:executing-plans` og utfør oppgavene i rekkefølge. Stegene har
> avkryssingsbokser (`- [ ]`) for sporing. Utfører: **Opus 5** i egen økt.

**Mål:** `sanitizeBriefText` i `src/services/prompts.js` skal splitte setninger
korrekt tross norske forkortelser, og gjenkjenne lagnavn-varianter (alias +
ordgrense) — uten å endre funksjonens kontrakt.

**Arkitektur:** Alt skjer i én fil (`src/services/prompts.js`) + testfilen
(`test/prompts.test.js`) + docs. To delfunksjoner, én commit hver:
(1) punktum-maskering av forkortelser/klokkeslett før setningssplitting,
(2) alias-tabell + ordgrensebasert lagnavn-matching. Ren tekstfunksjon —
ingen nettverkskall, ingen AI-kall, ingen timere.

**Teknologi:** Node 22+ ESM, `node:test`, ESLint flat config. Ingen nye
avhengigheter.

**Spec:** `docs/neste-okt-prompt-sanitize-brief.md` (oppdragsbeskrivelsen).

## Globale begrensninger (gjelder hver task)

- Branch **`fix/sanitize-brief`** ut fra `main`. **ALDRI `git push`** — push
  til `main` auto-deployer prod. **IKKE merge** før sjekkpunkt D
  (søndag/mandag) og kun på klarsignal fra Marius.
- `main` har upushede commits + upushet, annotert tag `v1.2.1` — ikke rør dem,
  ikke rebase, ikke push «på veien».
- **INGEN AI-kall.** Tester bruker hardkodet tekst. AI-budsjettet telles i
  `docs/HANDOVER.md`.
- TDD: skriv testene først, **observer rødt** (kjør `npm test`, se antall
  feilende), implementer, se grønt. Ingen nettverkskall eller ekte timere i
  tester.
- `npm test` og `npm run lint` grønne etter hver commit.
  Utgangspunkt på `main`: **218/218, lint 0**.
- Conventional commits. Docs (CHANGELOG/ROADMAP/HANDOVER) i **samme commit**
  som endringen de beskriver.
- Aldri deploy/push torsdag 19:00–21:00 (auto-brief ~19:30) — irrelevant her
  siden ingenting pushes, men nevnt for ordens skyld. Røyktesten i Task 3 er
  lokal med tomme nøkler og er trygg uansett tidspunkt.
- Alle beskjeder fra Marius loggføres i `docs/HANDOVER.md` med dato+handling.
- Tiltale: Marius — alle svar starter med «Hei Marius!». Stopp ved ~95 %
  usage: oppdater HANDOVER grundig, commit alt (uten push).

## Kontekst

**Hvorfor:** Funn P3-4 fra kvalitetspasset v1.1.3. `sanitizeBriefText` er
etterkontrollen som fjerner setninger der AI-briefen påstår noe uriktig om
hvilke kamper som ligger før/etter deadline. To svakheter:

1. **Setningssplitting** ([prompts.js:95](src/services/prompts.js#L95)):
   `line.match(/[^.!?]+[.!?]*/g)` deler på ethvert punktum — også i «kl.»,
   «f.eks.» og klokkeslett «21.00». En halv setning kan da mangle lagnavnet
   eller negasjonen som gjør den korrekt → både falske fjerninger og
   påstander som slipper gjennom.
2. **Lagnavn-matching** ([prompts.js:71](src/services/prompts.js#L71)):
   `sentence.includes(name)` mot navnet i `matches[].home/away`.

**Verifiserte fakta (ikke gjenverifiser — bevis i planøkten):**

- [brief.js:41-42](src/services/brief.js#L41-L42) bygger `home`/`away` fra
  **`teams.name`** (ikke `short_name`, som er trebokstavskoder «TOT»/«MCI»).
- Sjekkpunkt 0-snapshotet (`brief-foer-deadline.json`, ekte GW1-data 2026-27)
  viser at FPLs `teams.name` selv er kortform for flere klubber: **«Spurs»,
  «Man City», «Man Utd», «Nott'm Forest»** — og lang form for andre:
  **«Coventry City», «Hull City», «Ipswich Town»**. Sesongens 20 lag:
  Arsenal, Aston Villa, Bournemouth, Brentford, Brighton, Chelsea,
  Coventry City, Crystal Palace, Everton, Fulham, Hull City, Ipswich Town,
  Leeds, Liverpool, Man City, Man Utd, Newcastle, Nott'm Forest, Spurs,
  Sunderland.
- ROADMAP-punktet (linje 189–192) er altså upresist begge veier: det matches
  mot `teams.name` (ikke «kortnavn» i betydningen `short_name`), men flere
  `name`-verdier ER kortformer. Problemet er reelt i begge retninger:
  modellen kan skrive «Tottenham» (ikke delstreng av «Spurs») og «Coventry»
  (ikke delstreng-treff via `includes` er det faktisk — men ordgrense-match
  av hele datanavnet «Coventry City» bommer). Korrigeres i Task 2.
- ESLint: kun `js.configs.recommended` + `no-unused-vars`/`eqeqeq`/
  `prefer-const`. NB `no-control-regex` er med i recommended — ikke legg
  sentinel-tegnet i et regex-LITERAL (koden under bruker `replaceAll` med
  streng, som er trygt).
- `test/prompts.test.js` har i dag 12 tester; totalen er 218.

**Designvalg (besluttet — ikke re-vurder):**

1. **Forkortelser: eksplisitt liste + maskering**, ikke regel. En regel som
   «ikke splitt før liten bokstav/siffer» feiler for «bl.a. Arsenal», der
   neste ord er egennavn med stor bokstav. Enkel liste er forutsigbar og
   testbar; enkelt slår smart. I tillegg én sifferregel: punktum MELLOM to
   sifre («21.00», «2.5») maskeres — det er aldri setningsslutt.
2. **Alias-tabellen bor som modul-konstant i `prompts.js`** (eneste bruker;
   egen modul er YAGNI). Ikke eksportert. Nøkkel = FPLs `teams.name`;
   lag uten oppføring matches på datanavnet alene, så opprykk/nedrykk krever
   ingen endring — man legger bare til en rad når FPL-navn og vanlig
   skriftform ikke overlapper.
3. **Ordgrense-matching med valgfri genitiv, case-sensitiv.** Hindrer treff
   inni ord («Forestillingen» ≠ «Forest»). `(?:'?s|')?` beholder dagens
   genitiv-treff («Liverpools», «Spurs'») som ren `\b` ville mistet.
   Case-sensitiv som dagens `includes` — minst mulig kontraktsendring.
   Bevisst INGEN alias for tvetydige enkeltord («City», «United» — flere
   klubber); i tvil skal funksjonen beholde teksten.
4. **Kontrakten er urørt:** samme signatur/returtype, samme tidlig-retur for
   tom tekst / manglende `brief` / `beforeDeadline == null`, samme
   «i tvil → behold»-semantikk, samme `console.warn`-logging.

---

### Task 1: Branch + setningssplitting som tåler forkortelser

**Filer:**
- Endre: `src/services/prompts.js`
- Test: `test/prompts.test.js`
- Docs: `CHANGELOG.md`

**Grensesnitt:**
- Konsumerer: dagens `sanitizeBriefText(text, brief)` (uendret signatur).
- Produserer: interne hjelpere `maskDots(line)` / `unmaskDots(s)` som Task 2
  bygger videre på (Task 2 rører dem ikke, men testene sameksisterer).

- [ ] **Steg 1: Opprett branch**

```powershell
git -C "c:\Users\mariu\Documents\Claude Code\FPL" status
git checkout -b fix/sanitize-brief main
```

Forvent: ren arbeidskatalog (evt. kun uversjonerte docs-filer), ny branch.

- [ ] **Steg 2: Skriv de fem nye testene (fire røde + én kontraktsvokter)**

Legg til nederst i `test/prompts.test.js`:

```js
// ---- P3-4: setningssplitting som tåler forkortelser ---------------------
// `line.match(/[^.!?]+[.!?]*/g)` delte på ethvert punktum — også i «kl.» og
// «21.00» — så halve setninger ble vurdert hver for seg. Da kan halvparten
// mangle lagnavnet eller negasjonen som gjør helheten korrekt.

const briefUtenTidligeKamper = {
  ...briefMedTidsfakta,
  fixturesByDay: [{
    day: 'fredag 21. august',
    matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false }],
  }],
  fixturesBeforeDeadline: [],
};

test('sanitizeBriefText: tom tekst og manglende brief er uendret', () => {
  assert.equal(sanitizeBriefText('', briefMedTidsfakta), '');
  assert.equal(sanitizeBriefText('Alt spilles før deadline.', undefined), 'Alt spilles før deadline.');
});

test('sanitizeBriefText splitter ikke på «kl.» — korrekt sammensatt setning beholdes', () => {
  const text = '**Arsenal**–Chelsea (kl. 18:00) spilles før deadline, mens Liverpool–Bournemouth går etter deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText: negasjon overlever «f.eks.» i samme setning', () => {
  const text = 'Ingen av kampene, f.eks. Liverpool–Bournemouth, starter før deadline.';

  assert.equal(sanitizeBriefText(text, briefUtenTidligeKamper), text);
});

test('sanitizeBriefText splitter ikke på klokkeslett med punktum', () => {
  const text = 'Liverpool spiller først 21.00 — det er etter deadline, mens Arsenal–Chelsea (18.00) går før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText fjerner uriktig påstand selv med forkortelse i setningen', () => {
  const text = 'Kampen starter kl. 21:00 før deadline.';

  assert.equal(sanitizeBriefText(text, briefUtenTidligeKamper), '');
});
```

(`briefMedTidsfakta` finnes allerede øverst i filen. Tom tekst/manglende
brief-testen låser kontrakten og er grønn allerede — det er meningen. Merk
at siste test viser dagens FALSKE NEGATIV: splitten skiller «Kampen starter
kl.» fra «21:00 før deadline.», så `OM_KAMPER` aldri ser kamp-ordet, og den
uriktige påstanden slipper gjennom i dag.)

- [ ] **Steg 3: Observer rødt**

```powershell
npm test
```

Forvent: **223 tester, 219 pass, 4 fail** — nøyaktig de fire
splitting-testene; kontraktsvokteren er grønn.

- [ ] **Steg 4: Implementer maskeringen**

I `src/services/prompts.js`, legg inn rett FØR `sanitizeBriefText`
(over doc-kommentaren):

```js
// Norske forkortelser med punktum som ikke avslutter en setning. Punktumene
// maskeres før setningssplitting og gjenopprettes etterpå. Bevisst en enkel,
// eksplisitt liste: regelen «ikke splitt før liten bokstav» ville feilet for
// «bl.a. Arsenal», der neste ord er et egennavn.
const ABBREVIATIONS = ['f.eks.', 'bl.a.', 'dvs.', 'osv.', 'mfl.', 'evt.', 'pga.', 'o.l.', 'ca.', 'kl.', 'nr.', 'jf.'];
const ABBR_RE = new RegExp(
  `(?<!\\p{L})(?:${ABBREVIATIONS.map((a) => a.replaceAll('.', '\\.')).join('|')})`,
  'giu',
);
const DOT_MASK = '\u0001';
const maskDots = (line) =>
  line
    .replace(ABBR_RE, (abbr) => abbr.replaceAll('.', DOT_MASK))
    .replace(/(\d)\.(?=\d)/g, `$1${DOT_MASK}`); // klokkeslett/desimaltall: «21.00», «2.5»
const unmaskDots = (s) => s.replaceAll(DOT_MASK, '.');
```

Og endre linjeløkken i `sanitizeBriefText` (dagens linje 93–105) til:

```js
  const lines = text.split('\n').map((line) => {
    if (!/deadline/i.test(line)) return line;
    const masked = maskDots(line);
    const sentences = masked.match(/[^.!?]+[.!?]*/g) ?? [masked];
    const kept = sentences.filter((s) => {
      if (keep(s)) return true;
      dropped.push(unmaskDots(s).trim());
      return false;
    });
    if (kept.length === sentences.length) return line;
    const rest = unmaskDots(kept.join('')).trim();
    // Er det bare et punktmerke eller en overskriftsmarkør igjen, ryddes linjen bort.
    return /^([-*]|#{1,3})?\s*$/.test(rest) ? null : rest;
  });
```

(Uendret-stien returnerer fortsatt originallinjen umaskert, så tekst uten
fjerninger er byte-for-byte identisk. `keep()` kjører på maskert setning —
trygt, siden verken deadline-regexene, `NEGATION`, `OM_KAMPER` eller lagnavn
inneholder punktum som maskeres.)

Oppdater også doc-kommentaren over funksjonen med én setning, f.eks.:
«Setninger splittes med maskering av norske forkortelser og klokkeslett, så
punktum i ‘kl.’/‘21.00’ ikke kutter setningen i to.»

- [ ] **Steg 5: Observer grønt + lint**

```powershell
npm test
npm run lint
```

Forvent: **223/223 pass**, lint exit 0. (De 12 gamle prompts-testene skal
være uendret grønne — rør dem ikke.)

- [ ] **Steg 6: CHANGELOG + commit**

I `CHANGELOG.md` under `## [Unreleased]`, legg til:

```markdown
### Fixed

- AI-briefens etterkontroll kutter ikke lenger setninger midt i norske
  forkortelser («kl.», «f.eks.») eller klokkeslett («21.00») — færre
  feilfjernede setninger, og uriktige deadline-påstander med forkortelse i
  setningen fanges nå.
```

```powershell
git add src/services/prompts.js test/prompts.test.js CHANGELOG.md
git commit -m "fix: sanitizeBriefText splitter ikke setninger på norske forkortelser"
```

---

### Task 2: Lagnavn-alias + ordgrensematching

**Filer:**
- Endre: `src/services/prompts.js`
- Test: `test/prompts.test.js`
- Docs: `CHANGELOG.md`, `ROADMAP.md`

**Grensesnitt:**
- Konsumerer: `sanitizeBriefText` slik Task 1 etterlot den (maskering på
  plass; `before`/`after`-settene og `keep()` som i dag).
- Produserer: modul-konstant `TEAM_ALIASES` (ikke eksportert), hjelperne
  `escapeRe`/`teamNameRe`, og `names(sentence, matchers)` som tar en liste
  ferdigbygde regexer i stedet for et `Set` med navn.

- [ ] **Steg 1: Skriv de fem testene (to røde, tre voktere)**

Legg til nederst i `test/prompts.test.js`:

```js
// ---- P3-4: lagnavn-alias og ordgrenser ----------------------------------
// FPLs `teams.name` er selv kortform for flere klubber («Spurs», «Man Utd»),
// mens modellen gjerne skriver «Tottenham»/«Manchester United». Uten alias
// slapp uriktige påstander gjennom. Ordgrensen hindrer samtidig treff inni
// ord, og genitiv-støtten bevarer treffene substring-matchingen ga oss.

const briefMedSpurs = {
  fixturesByDay: [{
    day: 'fredag 21. august',
    matches: [
      { home: 'Spurs', away: 'Newcastle', kickoff: '21:00', beforeDeadline: false },
      { home: 'Man Utd', away: 'Everton', kickoff: '20:00', beforeDeadline: false },
      { home: 'Arsenal', away: 'Chelsea', kickoff: '18:00', beforeDeadline: true },
    ],
  }],
};

test('sanitizeBriefText fjerner uriktig påstand når modellen skriver «Tottenham» og dataene «Spurs»', () => {
  const text = 'Tottenham spiller sin kamp før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedSpurs), '');
});

test('sanitizeBriefText fjerner uriktig påstand med «Manchester United» for «Man Utd»', () => {
  const text = 'Manchester United spiller før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedSpurs), '');
});

test('sanitizeBriefText beholder korrekt påstand skrevet med kallenavn', () => {
  const briefMedSpursFoer = {
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [
        { home: 'Spurs', away: 'Newcastle', kickoff: '18:00', beforeDeadline: true },
        { home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false },
      ],
    }],
  };
  const text = '**Tottenham** spiller før deadline, så velg kaptein tidlig.';

  assert.equal(sanitizeBriefText(text, briefMedSpursFoer), text);
});

test('sanitizeBriefText matcher ikke lagnavn inni ord (ordgrense)', () => {
  const briefMedForest = {
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [
        { home: "Nott'm Forest", away: 'Sunderland', kickoff: '21:00', beforeDeadline: false },
        { home: 'Arsenal', away: 'Chelsea', kickoff: '18:00', beforeDeadline: true },
      ],
    }],
  };
  const text = 'Forestill deg: flere kamper starter før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedForest), text);
});

test('sanitizeBriefText matcher genitiv («Liverpools») også etter ordgrense-endringen', () => {
  const text = 'Liverpools kamp spilles før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), '');
});
```

- [ ] **Steg 2: Observer rødt**

```powershell
npm test
```

Forvent: **228 tester, 226 pass, 2 fail** — de to alias-testene
(«Tottenham», «Manchester United»). De tre siste er voktere som er grønne
allerede i dag (kallenavn-før-testen via `anyBefore`-stien, ordgrense-testen
fordi alias ikke finnes ennå, genitiv-testen via dagens substring-match) —
de skal HINDRE at implementasjonen i steg 3 gjøres naivt med `includes` på
alias eller ren `\b` uten genitiv. Dette avviket fra «alle røde» er
forventet og ikke et stopp-signal.

- [ ] **Steg 3: Implementer alias + ordgrense**

I `src/services/prompts.js`, legg inn etter maskeringshjelperne fra Task 1:

```js
// FPL-navn (`teams.name`) → skriveformer modellen kan bruke i stedet.
// Lag uten oppføring matches på navnet fra dataene alene — nyopprykkede lag
// virker uten endring her; legg til en rad først når FPL-navnet og vanlig
// skriftform ikke overlapper. Tvetydige enkeltord («City», «United») skal
// bevisst IKKE inn: i tvil beholder funksjonen teksten.
const TEAM_ALIASES = {
  'Spurs': ['Tottenham', 'Tottenham Hotspur'],
  'Man City': ['Manchester City'],
  'Man Utd': ['Manchester United'],
  "Nott'm Forest": ['Nottingham Forest', 'Forest'],
  'Aston Villa': ['Villa'],
  'Coventry City': ['Coventry'],
  'Hull City': ['Hull'],
  'Ipswich Town': ['Ipswich'],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Ordgrense + valgfri genitiv («Liverpools», «Spurs'») — hindrer treff inni
// ord («Forestillingen» er ikke «Forest»). Case-sensitiv, som includes var.
const teamNameRe = (name) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?:'?s|')?(?![\\p{L}\\p{N}])`, 'u');
```

I `sanitizeBriefText`: behold byggingen av `before`/`after`-settene og
`anyBefore` uendret, og erstatt dagens
`const names = (sentence, set) => [...set].some((name) => sentence.includes(name));`
med:

```js
  const toMatchers = (set) =>
    [...set].flatMap((name) => [name, ...(TEAM_ALIASES[name] ?? [])]).map(teamNameRe);
  const beforeMatchers = toMatchers(before);
  const afterMatchers = toMatchers(after);
  const names = (sentence, matchers) => matchers.some((re) => re.test(sentence));
```

og oppdater de to `keep()`-linjene til å sende matcher-listene:

```js
    if (claimsBefore && names(sentence, afterMatchers) && !names(sentence, beforeMatchers)) return false;
    if (claimsAfter && names(sentence, beforeMatchers) && !names(sentence, afterMatchers)) return false;
```

(Regexene har ikke `g`-flagg, så `.test()` er tilstandsløs og kan gjenbrukes
per setning. `escapeRe` gjør at navn som «Nott'm Forest» er trygge som
regex-kilde.)

- [ ] **Steg 4: Observer grønt + lint**

```powershell
npm test
npm run lint
```

Forvent: **228/228 pass**, lint exit 0 — inkludert at alle 12 opprinnelige
prompts-tester og de 5 fra Task 1 fortsatt er grønne.

- [ ] **Steg 5: CHANGELOG + ROADMAP + commit**

`CHANGELOG.md` under `[Unreleased]` → `### Fixed`, nytt punkt:

```markdown
- AI-briefens etterkontroll gjenkjenner nå lagnavn-varianter («Tottenham»
  for FPLs «Spurs», «Manchester United» for «Man Utd», «Coventry» for
  «Coventry City» osv.) med ordgrenser og genitiv, så uriktige
  deadline-påstander fanges selv når modellen skriver et annet navn enn
  FPL-dataene — uten at lagnavn treffer inni andre ord.
```

`ROADMAP.md`: fjern hele kulepunktet «**`sanitizeBriefText` robusthet**»
(linje 189–192) fra «v1.2.0-kandidater», og legg inn en ny seksjon rett
etter `## v1.2.1 — failure-backoff i cache.js (P3-2)`-seksjonen:

```markdown
## sanitizeBriefText-robusthet (P3-4) — på branch `fix/sanitize-brief`, ikke merget

_Plan: `docs/plan-sanitize-brief.md`. Merges først etter sjekkpunkt D, på
klarsignal. NB: det gamle kandidat-punktet sa «matches mot FPLs kortnavn
(‘Spurs’)» — presist er det `teams.name`, som selv er kortform for noen
klubber («Spurs», «Man Utd») og lang form for andre («Coventry City»);
alias-tabellen dekker begge retninger._

- [x] Setningssplitting tåler norske forkortelser og klokkeslett (TDD, 5 nye tester)
- [x] Lagnavn-alias (`TEAM_ALIASES`) + ordgrense/genitiv-matching (TDD, 5 nye tester)
- [ ] Røyktest lokalt (11 ruter 200, AI/Discord av) + handover
```

(Tredje punkt legges inn ukrysset nå og krysses av i Task 3-commiten.)

```powershell
git add src/services/prompts.js test/prompts.test.js CHANGELOG.md ROADMAP.md
git commit -m "fix: sanitizeBriefText gjenkjenner lagnavn-alias med ordgrenser"
```

CLAUDE.md: ingen endring — filkartet nevner ikke `prompts.js`, og ingen
beskrivelse blir feil av endringen. (Sjekket i planøkten.)

---

### Task 3: Røyktest + handover-commit

**Filer:**
- Endre: `docs/HANDOVER.md`, `ROADMAP.md` (kryss av røyktest-punktet)
- Scratchpad: `.env`-fil UTENFOR repoet

- [ ] **Steg 1: Røyktest med tomme nøkler** (driftslærdom fra HANDOVER:
  `config.js` kjører `process.loadEnvFile()` som leser repoets `.env` med
  prod-nøkler uansett — tomme verdier fra `--env-file` settes først og
  vinner)

Skriv scratchpad-`.env` (IKKE i repoet):

```
PORT=3010
FPL_TEAM_ID=5330646
ANTHROPIC_API_KEY=
DISCORD_WEBHOOK_URL=
```

Start serveren med `node --env-file=<scratchpad-sti>\.env src\server.js`
(i bakgrunnen), og verifiser **i denne rekkefølgen**:

```powershell
# 1. FØRST: tomme nøkler bekreftet — før noe annet sjekkes
(Invoke-WebRequest http://localhost:3010/health -UseBasicParsing).Content
# Forvent: "ai":false og "discord":false i svaret. Er de true: STOPP serveren
# umiddelbart og feilsøk .env-teknikken — ikke fortsett.

# 2. Alle 11 GET-ruter → 200
foreach ($p in '/health','/','/spillere','/lag','/overganger','/liga','/brief','/live','/nyheter','/api/brief.json','/api/live.json') {
  $r = Invoke-WebRequest "http://localhost:3010$p" -UseBasicParsing; "$p -> $($r.StatusCode)"
}

# 3. Ukjent sti → 404
try { Invoke-WebRequest http://localhost:3010/finnes-ikke -UseBasicParsing } catch { "404-test -> $($_.Exception.Response.StatusCode.value__)" }
```

Stopp serveren etterpå. Ta vare på outputen — den skal ordrett inn i
sluttrapporten og refereres i HANDOVER. (Serveren gjør ekte FPL-kall — det
er OK og forventet; forbudet gjelder AI-kall, og testsuiten er fortsatt
nettverksfri.)

- [ ] **Steg 2: HANDOVER + commit**

I `docs/HANDOVER.md`:
- Nytt kulepunkt øverst under «Status akkurat nå»: P3-4 utført på branch
  `fix/sanitize-brief` (IKKE merget, IKKE pushet), commits (hash-ene),
  testtall 218 → 228, lint 0, røyktestresultat (ai:false/discord:false,
  11 ruter 200, 404 OK), og at merge venter på sjekkpunkt D + klarsignal.
- Oppdater «Sist oppdatert»-linjen.
- Loggfør Marius' kjøreprompt for denne økten under «Logg over
  brukerbeskjeder» med dato og handling.
- AI-kall-tellelisten: uendret (0 nye kall — bekreft eksplisitt).

Kryss av røyktest-punktet i den nye ROADMAP-seksjonen (`- [x]`).

```powershell
git add docs/HANDOVER.md ROADMAP.md
git commit -m "docs: handover og røyktestbevis for sanitize-brief"
```

- [ ] **Steg 3: Sluttkontroll og rapport**

```powershell
npm test          # forvent 228/228
npm run lint      # forvent exit 0
git log --oneline main..fix/sanitize-brief   # forvent de 3 commitene
git status        # rent tre; INGEN push er gjort
```

Sluttrapport til Marius (starter med «Hei Marius!»): commitliste, testtall
rødt→grønt per task, lint, røyktest-output, bekreftelse «0 AI-kall, ingen
push, ingen merge», og at neste steg (merge + evt. versjon v1.2.2) venter på
sjekkpunkt D.

---

## Bevisst utelatt (ikke gjør dette)

- **`filterSummaryPoints` i `news.js`** — det er funn P3-5: egen funksjon,
  egen fil, krever egen avtale (robusthetsgrepet ligger i promptendring).
- **Endringer i selve AI-prompten** (`buildBriefPrompt` m.m.) — koster
  AI-kall å teste; må avtales med Marius separat.
- **Release/versjonsbump** (package.json er 1.2.1) — versjon settes ved
  merge etter sjekkpunkt D, ikke nå.
- **Endringer i `brief.js`** — `groupFixturesByDay` og datakontrakten er
  korrekte som de er; alt løses i `prompts.js`.
- **Realistisk AI-tekst i tester** — hardkodede strenger holder; trengs et
  ekte brief-utdrag, be Marius om teksten fra sjekkpunkt A i stedet for å
  generere ny.

## Verifisering (oppsummert)

| Punkt | Kommando | Forventet |
| --- | --- | --- |
| Utgangspunkt på main | `npm test` | 218/218 |
| Task 1 rødt | `npm test` | 223 tester, 4 fail |
| Task 1 grønt | `npm test` + `npm run lint` | 223/223, lint 0 |
| Task 2 rødt | `npm test` | 228 tester, 2 fail |
| Task 2 grønt | `npm test` + `npm run lint` | 228/228, lint 0 |
| Røyktest | `/health` først, så 11 ruter + 404 | `ai:false, discord:false`, alle 200, 404 |
| Branch | `git log --oneline main..fix/sanitize-brief` | 3 commits, ingen push |

## Etter godkjenning (Fable-øktens egne steg — ikke Opus)

1. Kopier denne planen til `docs/plan-sanitize-brief.md`.
2. Skriv kort Opus 5-utførelsesprompt (~15 linjer) til
   `docs/neste-okt-prompt-sanitize-brief-utforelse.md` + lim i chatten.
3. Oppdater `docs/HANDOVER.md` (status + logg over Marius' beskjeder).
4. Commit docs lokalt på `main` (presedens: c16cf14) — **ingen push**.
