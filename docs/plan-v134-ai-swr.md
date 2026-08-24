# Plan v1.3.4 — Ingen skal vente på en AI-tekst

> Skrevet som Task 0 i utførelsesøkten (økt 36, Opus) fra kjøreprompten som
> ble laget i planøkt 35 (Fable). Designet og takten er besluttet av Marius —
> dette dokumentet er fasiten for utførelsen, ikke et diskusjonsgrunnlag.

## Problemet

Marius meldte 24. aug at deler av siden bruker ekstremt lang tid på å laste,
og mistenkte briefene. Koden bekrefter mistanken:

- `ai.js:39-44` serverer cachen **kun** når den er ferskere enn
  `minIntervalMs`. Er den eldre, venter den besøkende på hele
  Claude-rundturen (20–60 s for briefen: `max_tokens` 4000 + adaptiv tenkning).
- Det rammer tre steder:
  - `/brief` (`routes/brief.js:9` — `await generateAiBrief(brief)`)
  - `/nyheter` (`routes/news.js:9` — `await getNews()`)
  - **forsiden** (`routes/index.js:26-30` awaiter `getNews()` i `Promise.all`;
    `.catch(() => null)` fanger feil, ikke treghet)
- Rådgiveren (`routes/api.js:68`) blokkerer ved klikk.
- AI-cachen bor i minnet, så den er **tom etter hver deploy** — første
  besøkende etter en utrulling betaler alltid full ventetid.

Viewene har allerede fallback for `null` (`brief.ejs:17`, `news.ejs:20`), så
en kald cache kan trygt vise data-briefen / rå feed-liste.

## Målet

En sidevisning skal **aldri** blokkere på et AI-kall, og et sidebesøk skal
**aldri** utløse et AI-kall. Serveren frisker opp på timer.

## Pinnede valg (Marius — ikke re-spør)

- Alle tre AI-tekstene: brief, nyheter, rådgiver.
- Unntak: rådgiverklikk ved **kald** cache venter (knappen kan ikke svare med
  ingenting). **Stale** cache blokkerer aldri noe sted.
- Takt: briefen 1x/døgn + hver time i deadlinevinduet; nyhetene hver 6. time.
- **Deadlinevindu: 6 timer** (bekreftet 24. aug).
- Auto-briefen i `notify.js` deler `cacheKey` med `/brief` og varmer cachen
  gratis. `notify.js` endres **ikke**, og refresheren sender **aldri** noe
  til Discord.

## Design

### 1. `ai.js`

- Ny eksport `getCached(cacheKey)` → `{text, generatedAt}` eller `null`.
  Uansett alder, aldri nettverk.
- `generate({...})` får opsjonen `swr: true`:
  - cache finnes → returner umiddelbart, og er den eldre enn `minIntervalMs`
    og ikke i failure-backoff: fyr bakgrunnsregenerering (gjenbruk
    in-flight-dedup, feil → backoff som før),
  - kald cache → `await` som i dag.
  - Uten `swr` er oppførselen uendret.
- Ny test-hook `_flush()` etter mønster fra `cache.js`.

### 2. `brief.js`

- Helper `briefCacheKey(brief)` delt av begge stier.
- Ny `getCachedAiBrief(brief)` = `getCached` → `sanitizeBriefText` →
  `entry` eller `null`.
- `generateAiBrief` uendret (auto-briefen og refresheren bruker den).
- `routes/brief.js` bytter til `getCachedAiBrief`.

### 3. `news.js`

- `getNews()` bytter `ai.generate` → `ai.getCached('news-summary')`.
- Ny `refreshNewsSummary()` (henter items → `ai.generate`, `minInterval`
  30 min som i dag), eksportert for refresheren.
- Dette avblokker både dashbordet og `/nyheter`.

### 4. `routes/api.js`

- Rådgiverens `ai.generate` får `swr: true`.

### 5. Ny `src/services/refresh.js`

Ren funksjon `refreshDecision({nowMs, briefGeneratedAt, newsGeneratedAt,
deadlineTime, hasUpcoming})` → `{brief, news}`:

- **news**: mangler eller >= 6 t gammel.
- **brief**: `hasUpcoming` false → aldri (sesongslutt skal ikke koste kall);
  innenfor `0 < deadline - naa <= 6 t` → true (60-min-gulvet i `ai.js` capper
  til hver time); ellers mangler eller >= 24 t.

`startAiRefresher()`:

- no-op uten `ai.isEnabled()`,
- én tick straks (oppstartsvarming etter deploy),
- så `setInterval` 30 min med `.unref()`.

Tick: `getBootstrap` (delt cache) → `nextEvent` → `refreshDecision` →
`generateAiBrief(await assembleBrief())` / `refreshNewsSummary()`, hver del i
`try`/`catch` med logg. Test-hooks `_setNow`/`_reset` + eksportert `_tick` —
ingen ekte `setInterval` i tester (notify-mønsteret).

`server.js`: `startAiRefresher()` ved siden av `startScheduler()`.

**30-min-tick er bevisst:** generering tar ~30 s, så en 60-min-tick ville
truffet alder 59,5 min og hoppet over annenhver oppfriskning i vinduet.

## Kostnad

| Kilde | Kall/uke |
| --- | --- |
| Nyheter (hver 6. time) | 28 |
| Brief (7 daglige + ~6 i deadlinevinduet, deler nøkkel med auto-briefen) | ~13 |
| Rådgiverklikk | 0–3 |
| Oppstartsvarming (2 per deploy) | 2 |
| **Sum** | **~41–45** |

Midtukerunder gir +~6. Mot ROADMAP-anslaget ~35: akseptert av Marius via
6-timersvinduet. Landet er omtrent dagens kostnadsbånd (~$0,9/uke målt
23. aug, ~$1,48/uke etter prisskiftet 1. sep) fordi de besøks-styrte kallene
bortfaller helt.

Avviker implementasjonen vesentlig fra dette: **stopp og spør Marius.**

## Rekkefølge

| Task | Innhold |
| --- | --- |
| 0 | Branch `feat/ai-swr-v134`, denne planen, commit |
| 1 | **Mål før du bygger**: scratchpad-.env med tomme nøkler, `/health`-sjekk, `measure.mjs` (11 ruter kald+varm), `measure-ai.mjs` (fake klient med ~10 s delay). Rapportér tabellen før kodeendring |
| 2–6 | Designpunkt 1–5, TDD per delfunksjon (rød fase med forventet testtall først) |
| 7 | Docs i SAMME commit som hver delfunksjon: CHANGELOG `[Unreleased]`, CLAUDE.md (AI-seksjon + kostnadsregler + driftslærdom), ROADMAP kø-punkt 2, `docs/HANDOVER.md` |
| 8 | Lokal verifisering: `npm test` mot baseline 322, lint 0, røyktest med tomme nøkler, før/etter-måling. **Rapportér og stopp** |

Baseline: `npm test` 322, `npm run lint` 0. Anslag nye tester: ai +8, brief +3,
news +4, rådgiver +2, refresh +9 → ~345–350. Rød fase gir fasit.

## Rammer for utførelsen

- **Ingen ekte Claude-kall.** Alt lokalt med TOMME nøkler i en
  scratchpad-`.env` (`config.js` kjører `process.loadEnvFile()` som leser
  repoets `.env` uansett `--env-file`, men tomme verdier i `--env-file`
  vinner). Verifiser `/health` → `ai:false, discord:false` FØR noe annet.
  AI-oppførsel testes kun med `ai._setClient(fake)`.
- **Prod-`/brief` og prod-`/nyheter` lastes ALDRI før v1.3.4 kjører i prod.**
  Etterpå er de gratis.
- Ingen nye avhengigheter. Playwright/målescript kun i scratchpad.
- Aldri push uten eksplisitt klarsignal fra Marius.
- Aldri push torsdag 19:00–21:00 (auto-brief ~19:30) eller mens kamper pågår.
  Release kun før fre 28. aug ~18:00 ELLER etter at GW2 er ferdigspilt.
