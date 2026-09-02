# Økt-prompt til Fable — vedlikeholdspakka: v1.12.2, v1.13.0 og docs-slanking

> Skrevet 2. september 2026 (økt 55) etter at re-QA-en av v1.12.1 var bestått
> (11/11 FIKSET, 0 nye funn). Marius valgte fire av seks kandidater; rute-tester
> og CI-workflow ble bevisst utelatt. Prompten er konsumert når alt under er i
> prod og loggført — da slettes fila (git bevarer den).

## Slik brukes den

Lim inn blokka under «Prompten» i en ny Fable-økt i plan-modus. Økten skal
**planlegge først, få planen godkjent av Marius, så bygge**. Ingen kode før
godkjenning. Alle premisser under er målt 2. sep — linjenumre kan ha flyttet
seg, verifiser mot koden før du siterer dem i planen.

## Fasit (besluttet 2. sep — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Innhold | 1 hygiene + Node 24, 2 delte cache-nøkler, 3 AI-statistikk, 4 docs-slanking |
| Utelatt | rute-tester med `createApp()`, CI-workflow — ikke i denne pakka |
| Versjoner | 1 + 2 → **v1.12.2** (patch), 3 → **v1.13.0** (minor), 4 → docs-commit uten versjon |
| Rekkefølge | v1.12.2 → v1.13.0 → docs-slanking (kode først, så rydde det som beskriver koden) |
| Majors (`ejs` 6, `eslint` 10, `@eslint/js` 10, `globals` 17) | **kun vurderes og rapporteres**, ikke oppgraderes nå |
| AI-statistikk vises på | `/health` (eksisterende JSON, ingen ny rute); `DATA_DIR/ai-stats.json` for persistens |
| Delte nøkler løses med | egne nøkler for historic-variantene (`…:hist`), ikke flagg på kalleren |
| Arbeidsform | én feature-branch per versjon, rød test først, merge `--no-ff`, tag, push, prod-sjekk — økten gjør det selv (sluttpakka-fasit) |
| Spørsmål til Marius | kun hvis planen avdekker noe som bryter denne fasiten — ett spørsmålssett, anbefaling først |

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 5 peker hit). Kjør
`git status -sb` (main skal være lik origin/main) og `npm test` + `npm run
lint` som baseline: forventet 756/756 og lint 0 på v1.12.1. Start i
plan-modus, verifiser premissene under mot koden, skriv planen med T-tasks
og testnavn, og be om godkjenning før du skriver kode. Fasiten i
docs/prompt-vedlikehold-v1122-v1130.md er besluttet — ikke re-spør den.

Regler som gjelder hele økten: CLAUDE.md er fasit (TDD med rød test først,
0 nye AI-kall — kildelåsen i test/routes.test.js, ingen nye avhengigheter,
docs i samme commit, Edit-verktøyet på docs fordi de er CRLF, HANDOVER ≤ 200
linjer). Deploy-vindu før hver push: aldri torsdag 19:00–21:00, aldri mens
kamper pågår (GET /api/live.json → anyLive må være false; GW3 starter
fredag 4. sep 21:00 og helgen er kampvindu). Prod-sjekk etter hver deploy:
footer viser ny versjon, `<script`-telling i HTML-en på / er nøyaktig 2,
/health er 200. Bevis før påstand: vis kommandoen og linjene.

## T1 — v1.12.2 på `fix/hygiene-cache-keys-v1122`

1a. Avhengigheter. `npm audit --omit=dev` viser én moderat sårbarhet i `qs`
(Express sin query-parser; GHSA-x5fp-wj9c-mxmx og GHSA-4mjr-xmp4-gh2g).
Kjør `npm audit fix` (patch innenfor range), så `npm update fast-xml-parser`
(5.11.0 → 5.11.1, «wanted»). Verifiser at audit er ren, at package.json
ikke fikk nye toppnivå-avhengigheter, og at 756/756 fortsatt er grønn.
Vurder majors med `npm view <pakke>@latest` + changelog og skriv én linje
per pakke i HANDOVER under «Neste steg» (hva som brekker, om noe) — ikke
oppgrader dem.

1b. Dockerfile: `FROM node:22-alpine` → `FROM node:24-alpine`. Marius
utvikler og tester på Node 24.11.1; Node 24 er Active LTS, 22 er i
maintenance. `engines` i package.json forblir `>=22`. Sjekk at
HEALTHCHECK-linja (node -e med fetch) er uendret og fungerer på 24.
Oppdater DEPLOY.md der Node-versjonen nevnes.

1c. Rotårsaken bak QA-funn 6: tre funksjonspar i src/services/fplClient.js
deler cache-nøkkel men har ulik TTL, og «første skriver setter TTL-en»:
getLive/getLiveHistoric (`live:${gw}`, 1 min vs 6 t), getPicks/
getPicksHistoric (`picks:${teamId}:${gw}`, 5 min vs 6 t) og
getEntryHistory/getEntryHistoryHistoric (`history:${teamId}`, 5 min vs 6 t;
egen id skal ALLTID via den ferske — CLAUDE.md). I dag må
hver kaller velge riktig funksjon (live.js:174, baseline.js:125,
insights.js:550, league-insights.js:382 og 561) — fellen står åpen for
neste kaller. Gi historic-variantene egne nøkler med suffikset `:hist`
(f.eks. `live:${gw}:hist`), og la staleInfo(gw, { finished }) måle
`live:${gw}:hist` når finished er true. Kostnad: en ferdig runde kan
hentes én gang ekstra per 6 t hvis både live-siden og /innsikt ber om den
— akseptert. Rød test først i test/fplClient.test.js: «getLive etter
getLiveHistoric på samme runde revaliderer etter 1 min» (feiler i dag
fordi 6 t-verdien returneres som fersk) og tilsvarende for picks og
entry-history; test/live.test.js skal fortsatt være grønn. Oppdater
JSDoc-kommentarene (de beskriver den delte nøkkelen), CLAUDE.md-avsnittet
«live:N er DELT …» under FPL-API, og driftslærdommen i HANDOVER (fellen er
lukket i v1.12.2 — skriv hvordan, ikke bare at).

1d. Release: CHANGELOG under [1.12.2] med dato, `npm version`-bump i
package.json (footeren leser den), merge `--no-ff` til main, tag v1.12.2,
deploy-vindu-sjekk, push, prod-sjekk. Asset-hashen skal være uendret
(ingen endring i public/) — noter den i HANDOVER likevel.

## T2 — v1.13.0 på `feat/ai-stats-v1130`

Problem (HANDOVER-lærdom): «Per-funksjon-AI-kostnad kan ikke måles
retroaktivt» — ai.js logger `AI-kall: <nøkkel> modell=… inn=… ut=…`
(startGeneration, rundt linje 99), men Coolify-loggen er 100 linjer og
nullstilles ved deploy. ROADMAP § 1 (P4 kostnadskontroll) er eneste åpne
punkt, og dette er den målbare delen av det.

2a. Teller i src/services/ai.js: per cacheKey `{ calls, inputTokens,
outputTokens, failures, lastAt, model }` pluss `since` (første registrering).
Registrer i startGeneration: vellykket svar → calls + tokens fra res.usage;
tomt svar eller kastet feil → failures. Persister til
`DATA_DIR/ai-stats.json` (versjon 1) etter hver registrering — samme
mønster som prices.js (priceFile/readFileSync/mkdirSync recursive/
writeFileSync, linje ~148–160), med config.dataDir. Les fila lazy ved
første bruk; manglende/ugyldig fil eller feil versjon = tom statistikk,
aldri kast — en diskfeil må aldri velte en generering (try/catch rundt
skrivingen, logg én linje). Eksporter `getStats()` som returnerer
`{ since, totals: { calls, inputTokens, outputTokens, failures }, byKey }`.
Aldri Discord, aldri nye AI-kall.

2b. Vis på /health i src/routes/health.js (importerer allerede ai.js):
nytt felt `aiStats` = getStats() når AI er på, null ellers. Tokentall er
ikke hemmeligheter; nøkkel-verdier vises fortsatt aldri. Docker-
healthchecken kaller /health hvert 30. sekund — getStats() må være
synkron og billig (les fra minnet, aldri fra disk per kall).

2c. Tester (rød først) i test/ai.test.js med den injiserte fake-klienten
(_setClient) som returnerer `usage`: to kall på ulike nøkler gir riktige
totals og byKey; tomt svar øker failures; lese/skrive-funksjonene for fila
injiseres via en test-hook i samme stil som prices.js sin `_setHooks`
(test/prices.test.js:187) — ingen test skriver til ekte DATA_DIR (ingen
eksisterende test overstyrer config.dataDir); persistert innhold leses
tilbake etter _reset; ugyldig JSON gir tom statistikk uten kast. Ny test
for /health-formen hvis det finnes et sted den passer uten å starte
lytteren — ellers dokumenter at /health verifiseres i prod-sjekken.
Kildelåsen i routes.test.js skal være uendret grønn.

2d. Docs og release: CHANGELOG [1.13.0]; CLAUDE.md (ai.js-linja + /health i
arkitekturkartet); DEPLOY.md-avsnittet om DATA_DIR (ny fil ai-stats.json
ved siden av brief-/report-/check-/price-state og scenarios); HANDOVER:
lærdommen «kan ikke måles retroaktivt» omskrives til hvordan man leser
/health nå, ROADMAP § 1 får en linje om at tallene finnes på /health.
Bump, merge `--no-ff`, tag v1.13.0, deploy-vindu, push, prod-sjekk:
/health skal ha `aiStats` med `since` og calls ≥ 1 etter oppstartstikket.

## T3 — docs-slanking (docs-commit, ingen versjon)

Motivasjon: CLAUDE.md er 353 linjer med 49 versjonsmerker («(v1.x.y)»,
«fra v1.x») og leses inn i HVER økt; ROADMAP-seksjonen «Utført (v0.1.0 →
v1.3.4)» er 337 av 542 linjer. Historikken bor allerede i CHANGELOG, git
og docs/arkiv.

3a. CLAUDE.md → mål ≤ 200 linjer. Fjern versjonsmerker og «når/hvorfor det
ble sånn»-narrativ; behold HVA hver modul gjør (én–to linjer per modul) og
alle regler med begrunnelse. Lag først en sjekkliste over regler som MÅ
overleve, og verifiser den etterpå med grep — minst: fplClient er eneste
modul med FPL-nettverkskall; element-summary kun lazy per klikk; picks for
kommende runde gir 404 før deadline; polling kun i kampvinduer; alderstak
og staleInfo; `:hist`-nøklene (fra T1); alle seks AI-funksjoner med
takt og at sidevisninger aldri utløser AI-kall; kildelåsen (moduler som
aldri importerer ai.js); CSP uten inline-script uten nonce og ingen
on*-attributter; tema-tokens i begge blokker og kontrastkravene; FDR-4
`#e6003c`; `<caption>`/aria-regler; deploy-vinduene; CRLF-regelen; commit-
og CHANGELOG-konvensjonene; HANDOVER-taket. Ikke bruk caveman-komprimering
på CLAUDE.md — den skal leses av mennesker også.

3b. ROADMAP.md: flytt hele «## Utført (v0.1.0 → v1.3.4)» verbatim til
docs/arkiv/roadmap-utfort-v010-v134.md (med en tolinjers header om hvor den
kom fra), la det stå en tre-linjers peker i ROADMAP. Dokumentkart: ny rad
for arkivfila, oppdater arkiv-tellingen til faktisk antall
(`ls docs/arkiv | wc -l`). ROADMAP har BOM og CRLF — Edit-verktøyet.

3c. HANDOVER.md: § 5 i «Neste steg» markeres utført, denne prompten slettes
(`git rm docs/prompt-vedlikehold-v1122-v1130.md`), Dokumentkart-raden for
den fjernes, loggpost for økten, ≤ 200 linjer (roter til historikkfila om
nødvendig). Commit, deploy-vindu, push.

## Ferdigkriterier

- `main` = `origin/main`, tagger v1.12.2 og v1.13.0 pushet, alle brancher
  merget `--no-ff` og slettet.
- `npm test` grønn med FLERE tester enn 756 (nye tester for nøkler og
  statistikk), `npm run lint` 0, `npm audit --omit=dev` ren.
- Prod: footer v1.13.0, `/health` med `aiStats`, `<script` = 2, hash notert.
- CLAUDE.md ≤ 200 linjer med sjekklista bekreftet, ROADMAP uten
  «Utført»-seksjonen, HANDOVER ≤ 200 linjer, prompten slettet.
- 0 nye AI-kall i noen tilstand, 0 nye avhengigheter, 0 Discord-meldinger
  fra denne pakka.
```

## Etter økten

- Alt grønt: prompten er slettet av økten selv (3c). Marius' egne punkter
  (STEG 7 under kamp, 9c, 9e, telefon, `kill 1`) står fortsatt i HANDOVER.
- Stoppet underveis (usage-grense): HANDOVER skal si nøyaktig hvilken T-task
  som er ferdig og hvilken branch som er åpen — neste økt fortsetter derfra
  med denne fila som fasit.
