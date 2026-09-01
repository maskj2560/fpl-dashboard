# Mergeoversikt — økt 51 (to AI-økter, én branch)

> Skrevet 1. september 2026 av Opus-økta som fikset QA-funnene.
> **Til deg som skal merge:** alt arbeidet fra begge økter ligger allerede på
> ÉN branch, `fix/qa-funn-okt51`, og hele suiten er grønn. Denne fila er
> fasiten på hva som ligger hvor, hva som er bevist, og nøyaktig hvilke steg
> som gjenstår.

## 1. Situasjonen

To AI-økter har jobbet i det samme arbeidstreet samtidig:

- **Økt A (denne):** fikset sju QA-funn fra en prod-gjennomgang gjort med
  Claude for Chrome. Fem funn fikset, to avvist (se §7).
- **Økt B (deg):** «Rundens rapport» — rikere rapportgrunnlag og lengre
  AI-tekst.

Begge har committet på **samme branch**, fordi arbeidstreet er felles.
Det er ryddet opp; ingenting ligger igjen ustaget.

> **Lærdom å ta med videre:** `git add -A` i et delt arbeidstre sveiper med
> den andre øktas filer. Det skjedde én gang (økt A committet 178 linjer av
> økt Bs testfiler) og ble rettet med `git reset --soft HEAD~1` +
> `git restore --staged <deres filer>` + ny commit. **Stage eksplisitte
> stier så lenge to økter deler mappa.**

## 2. Hva ligger hvor

### `main` — 4 commits foran `origin/main`, kun docs

```
caa7d64 docs: slaa Del A sammen til en QA-prompt med samlet rapport
2f04c4f docs: skriv om Del A til QA-prompter for Claude for Chrome
bb72471 docs: oppgaveliste med QA-sjekkliste og kjoreprompter
7393c6c docs: oppdater QA-punktet med ny asset-hash og tabellhodene
```

Ingen kodeendringer. De ble holdt tilbake bevisst: en docs-only push
trigger en Coolify-rebuild uten at noe brukersynlig endrer seg.

### `fix/qa-funn-okt51` — 6 commits (5 fra økt A, 1 fra økt B)

```
1e70b0f feat: rikere rundens rapport med lagdetaljer          [økt B]
a7e3fb3 fix(spillere): laas de ledige boksene naar duellen er full
51dfd81 fix(spillere): la duellen dele bredden paa mobil
83a0ebd fix(liga): still plassifferet under hodet, ikke trendpila
40c1d61 fix(spillere): gjor score-soyla til en tynn stripe i bunnen av cellen
debd560 fix(spillere): la hidden slaa gjennom mot display-reglene
```

**Filkart — ingen kodeoverlapp mellom øktene:**

| Fil | Økt A | Økt B |
| --- | --- | --- |
| `public/style.css` | ✔ | — |
| `public/app.js` | ✔ (`duellLaas` + Modul 10) | — |
| `views/league.ejs` | ✔ (`rang`-klassen) | — |
| `test/style.test.js`, `test/views.test.js`, `test/app-client.test.js` | ✔ | — |
| `src/services/insights.js`, `league-insights.js`, `notify.js`, `prompts.js` | — | ✔ |
| `test/league-insights.test.js`, `test/prompts.test.js` | — | ✔ |
| `CHANGELOG.md` | ✔ (`### Fixed`) | ✔ (`### Changed`) |
| `docs/HANDOVER.md` | ✔ (på main) | ✔ (på branchen) |

Eneste filer begge har rørt er `CHANGELOG.md` og `docs/HANDOVER.md`, og de
er allerede flettet i arbeidstreet — **ingen konflikt gjenstår**.

## 3. Bevist tilstand (kjørt på branch-toppen)

```
npm test      → ℹ tests 626 / ℹ pass 626 / ℹ fail 0
npm run lint  → eslint . , exit 0
git status -sb → ## fix/qa-funn-okt51   (rent arbeidstre)
```

Baseline før øktene: 615/615 på `main`.

## 4. Hva økt A endret, og hvorfor

Alle fem er QA-funn fra prod, hver med test først:

1. **`[hidden]` slår ikke gjennom** (`debd560`) — `.filters { display: flex }`
   vant over nettleserens `[hidden]`, så filterraden på `/spillere` ble
   stående på alle tre fanene og filtrerte bare tabellen. Global
   `[hidden] { display: none !important }` lukker hele feilklassen.
2. **Score-søyla** (`40c1d61`) — bakgrunnsgradienten dekket hele
   cellehøyden og leste som et fargefelt. Nå 0.3rem søyle langs bunnen,
   `--accent-text` (holder 3:1 i begge temaer).
3. **Rangkolonnen på `/liga`** (`83a0ebd`) — «#» sto over trendpila.
   Pila er absolutt plassert ytterst; hode og celle deler `padding-right`.
   Ny klasse `rang` på både `<th>` og `<td>` i `views/league.ejs`.
4. **Duellen på mobil** (`51dfd81`) — tabellen var 492 px i et 335 px kort
   på 390 px. Under 640 px: `table-layout: fixed` + ombrekking.
5. **Tredje avkryssing** (`a7e3fb3`) — ble avvist uten synlig tegn. Ny ren
   funksjon `duellLaas(bokser, antallValgte)` i `public/app.js` låser de
   ledige boksene ved to valgte. Testet i `test/app-client.test.js`.

## 5. Versjonsvalg (må avklares med Marius før release-commit)

`[Unreleased]` inneholder nå **begge** øktene:

- `### Changed` — rikere «Rundens rapport» (økt B)
- `### Fixed` — fem QA-fikser (økt A) + fem tabell-/typografifikser fra
  tidligere samme dag (allerede ute i prod, men uutgitt som versjon)

**Anbefaling: `v1.8.2` (patch).** `v1.9.0` er reservert til
«Planleggingspakka» i `ROADMAP.md`, og ingen av endringene her er en ny
funksjon — rapporten blir rikere, ikke ny. Marius bestemmer.

## 6. Mergeoppskrift — steg for steg

**Sjekk deploy-vinduet FØRST:** aldri torsdag 19:00–21:00 (auto-briefen
sendes ~19:30), aldri mens kamper pågår. Push til `main` = deploy til prod.

```bash
# 1. Bekreft at branchen er grønn og ren
git status -sb
npm test && npm run lint

# 2. Release-commit PÅ BRANCHEN (etter at Marius har godkjent versjonen)
#    - package.json: "version": "1.8.2"
#    - CHANGELOG.md: flytt [Unreleased]-innholdet til "## [1.8.2] - 2026-09-01"
#      (behold rekkefølgen 1.8.2 → 1.8.1 → 1.8.0)
#    - ROADMAP.md: ny rad i versjonsplanen for v1.8.2
#    - docs/VIDERE.md: kortversjonen til Marius
git add package.json CHANGELOG.md ROADMAP.md docs/VIDERE.md
git commit -m "chore(release): v1.8.2 — versjon, CHANGELOG og docs ajour"

# 3. Merge til main (main har 4 docs-commits som IKKE er pushet — de blir med)
git checkout main
git merge --no-ff fix/qa-funn-okt51 -m "Merge fix/qa-funn-okt51 — v1.8.2 QA-fikser og rikere rundens rapport"

# 4. Verifiser PÅ MERGET MAIN, ikke bare på branchen
npm test && npm run lint          # forventet: 626/626 + exit 0
head -60 CHANGELOG.md             # rekkefølgen 1.8.2 → 1.8.1 → 1.8.0

# 5. Tag og push i én omgang
git tag v1.8.2
git push origin main --follow-tags
```

### Asset-hashen etter mergen

`public/style.css` og `public/app.js` er begge endret, så `?v=`-en bytter:

| Ref | Hash |
| --- | --- |
| `main` i dag | `3eef00bb` |
| `fix/qa-funn-okt51` (og merget main) | **`257cfce2`** |

Regn den alltid fra git-blobbene, aldri fra arbeidstreet:

```bash
node --input-type=module -e "
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
const blob = (p) => execSync('git show main:' + p, { encoding: 'buffer', maxBuffer: 1 << 26 });
console.log(crypto.createHash('sha1').update(blob('public/style.css')).update(blob('public/app.js')).digest('hex').slice(0, 8));
"
```

Oppdater `docs/HANDOVER.md` (statuslinja om asset-hashen OG QA-punktet i
«Neste steg», som i dag sier `3eef00bb`) i release-commiten eller rett etter
mergen. Marius verifiserer hashen i prod via sidekilden.

## 7. Åpne punkter som IKKE skal mergast bort

- **QA-funn 6 (modalen mangler `role="dialog"`) er feilrapportert.**
  `views/players.ejs:208` har `role="dialog" aria-modal="true"
  aria-labelledby="spillerkort-tittel"` — attributtene ligger på
  `.modal-dialog`, ikke på `.modal`-wrapperen QA-agenten inspiserte.
  Ingen endring gjort, ingen trengs.
- **QA-funn 7 (duellen merker HØYEST «Eid %» som best) venter på Marius.**
  Det følger v1.8.0-beslutningen «pris lavest, dødball satt slår null,
  ellers høyest». Skal lav eierandel vinne i en differensialjakt, er det én
  linje i `DUELL_RADER`/`duelWinners` i `public/app.js` — men det er en
  beslutning, ikke en bug.
- **`docs/oppgaveliste.md`** (på `main`) er Marius' arbeidsliste: én samlet
  QA-prompt til Claude for Chrome (Del A) og kjøreprompter til Claude Code
  (Del B). Del A er allerede kjørt én gang — funnene derfra er det økt A
  fikset. Hold fila i live.
- **Fortsatt åpent fra før:** `kill 1`-beviset for v1.3.5, P3
  (transfers-skjemaet mot ekte data etter Marius' første bytte), 13 gamle
  lokale brancher som kan slettes, mobil-QA på ekte telefon.

## 8. Etter mergen

1. Slett arbeidsbranchen: `git branch -d fix/qa-funn-okt51`.
2. Oppdater `docs/HANDOVER.md`: status, ny asset-hash, loggpost for økta,
   og hold 200-linjerstaket (roter til `docs/arkiv/HANDOVER-historikk.md`).
3. Be Marius verifisere i prod: `?v=257cfce2` i sidekilden, filterraden
   borte på Differensialer- og Dødballtakere-fanene, tynn søyle i
   score-kolonnen, «#» rett over plassifferet på `/liga`, duellen som deler
   bredden på 390 px, og låste bokser når to spillere er valgt.
4. Slett denne fila når mergen er i havn — git husker den.
