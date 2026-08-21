# Plan: bonuskolonnen på /live viser publisert bonus (sjekkpunkt C-funnet) → v1.2.3

## Kontekst

Sjekkpunkt C (21. aug ~22:10, observert av Marius via Claude in Chrome under
Arsenal–Coventry) ga grønt på polling/cache/status, men fant at kolonnen
BONUS-EST. på /live står tom («–») hele kampen, også for spillere på banen.

**Rotårsak, verifisert mot prod-API-et samme kveld (ikke gjettet):**
FPL publiserer bonus **provisorisk mens kampen pågår** — `fixtures/?event=1`
hadde `{"identifier":"bonus","h":[{value:3,element:15},…]}` ved 62 spilte
minutter. Da returnerer `hasConfirmedBonus()` (`src/services/analysis.js:371`)
`true`, og løkka i `src/services/live.js:51` hopper over kampen —
`estimateBonus()` kjører aldri, `bonusEst` blir 0 for alle. Vakten mot
dobbelttelling er i seg selv riktig: FPLs `explain` viser at publisert bonus
allerede ligger i `total_points` (Ødegaard: bonus +3 av 11). Konsekvens:
estimeringsvinduet er i praksis null, kolonnen er død.

To andre observasjoner ble ettergått og avsluttet uten funn (Tzolis 5→4:
FPL-revisjon, vi leser `total_points` rått; van Ewijk 51'/0p: appearance +1,
goals_conceded −1 = 0 — korrekt). Full analyse med rådata:
`docs/sjekkpunkt-c-live.md`.

**Beslutning tatt av Marius 21. aug (IKKE re-spør):** vis FPLs publiserte
bonus i kolonnen, merket som foreløpig; legg den IKKE til «Effektivt» (den
ligger allerede i poengsummen); behold BPS-estimatet for vinduet før FPL
publiserer noe. Alternativene «fjern kolonnen» og «la stå» ble avvist.

## Rammer

- **Branch:** `fix/live-bonus`, opprettes fra `fix/lag-anbefalinger`.
  Merge-rekkefølge etter sjekkpunkt D, på klarsignal: `fix/sanitize-brief` →
  `fix/lag-anbefalinger` → `main` (v1.2.2), deretter `fix/live-bonus` →
  `main` (v1.2.3).
- **Aldri push. Ingen merge. Aldri deploy torsdag 19–21.** 0 AI-kall (dette
  arbeidet trenger ingen — ingen prompts endres).
- **Ikke rør polling-tilstandsmaskinen** i `public/app.js`
  (`schedule`/`poll`/`LIVE_POLL_MS`/`nextWakeupDelay`) — sjekkpunkt C målte
  den grønn. Kun bonuscellen i `render()` (linje 199) endres.
- Ikke rør `notify.js`, `brief.js`, `gameUpdating`/banner i `fplClient.js`.
- TDD: rødt observert før grønt. Baseline på fersk branch: **242** —
  avvik → stopp og rapporter. Mål: **248**.
- `npm test` + `npm run lint` grønt før hver commit; conventional commits;
  CHANGELOG `[Unreleased]` + ROADMAP + HANDOVER i samme commit som endringen.

## Task 0 — C-dokumentasjonen (docs-only, på `fix/lag-anbefalinger`)

**Status ved overlevering: gjort av Fable i planøkten** — commit `30a8dab`
(«docs: sjekkpunkt C — polling grønt, bonuskolonne-funn og beslutning»,
inneholder `docs/sjekkpunkt-c-live.md`, ROADMAP v1.2.3-seksjonen og
HANDOVER-statusen). Opus verifiserer med `git log`/`git status` at treet er
rent og committen finnes — IKKE committ på nytt. Deretter opprettes
`fix/live-bonus` fra `fix/lag-anbefalinger`.

## Endringer (alle på `fix/live-bonus`)

### 1. `publishedBonus(fixture)` — ny ren helper i `src/services/analysis.js`

`Map<element, poeng>` fra `bonus`-statistikken (h + a), tom map når
statistikken mangler/er tom. Legges ved siden av `hasConfirmedBonus`
(linje 371), som beholdes uendret (brukes fortsatt som vakt for estimatet;
å redefinere den via `publishedBonus` er valgfri opprydding — gjør det bare
hvis det ikke endrer noen testresultater).

### 2. `src/services/live.js` — skill publisert bonus fra estimat

I `buildLive` (linje 45–56): to mapper i stedet for én.

- `bonusPub`: summeres fra `publishedBonus(f)` for hver kamp som er
  `started` — **også ferdige kamper** (i dag hoppes ferdige over helt; i
  dobbeltrunde skal bekreftet bonus fra tidlig kamp vises).
- `bonusEst`: som i dag — kun `started && !finished && !hasConfirmedBonus(f)`.

Per rad (linje 61–73): nytt felt `bonusPublished` (default 0). `bonusEst`
beholder dagens betydning (estimat som IKKE ligger i poengsummen — testene
på linje 93/110/125 avhenger av det). `effective` er UENDRET:
`(total_points + bonusEst) * multiplier` — publisert bonus ligger alt i
`total_points`.

Kontrollert mot eksisterende tester: linje 93 (dobbeltrunde) og 125 (vakt
mot dobbelttelling) består uendret med denne logikken; kun
«payloaden har ingen døde felter» (linje 188) må få `bonusPublished` inn i
listen over radnøkler — det er en villet kontraktsendring, gjøres i samme
commit som feltet.

### 3. Visning — `public/app.js:199` + `views/live.ejs:21`

- Cellen viser summen `p.bonusEst + p.bonusPublished`; `+N` med
  `accent`-klasse når > 0, ellers `–` som før. `title`-attributt skiller
  kildene: «Bekreftet av FPL» / «Estimat fra BPS» / begge (norsk bokmål).
  Feltet kan leses direkte uten `?? 0`-vern — payloaden bygges alltid av
  samme server, gamle payloads finnes ikke klientside.
- Kolonneoverskrift i `views/live.ejs` endres fra «Bonus-est.» til «Bonus».

Rendringen er utenfor testharnessen (dokumentert i
`docs/sjekkpunkt-c-live.md`: `test/app-client.test.js` kjører skriptet i en
vm der DOM-elementene er `null`, så `render()` returnerer tidlig; tabellen
fylles klientside så view-testene dekker den ikke). Verifiseres manuelt
under neste kampvindu.

## TDD — 6 nye tester, 242 → 248 (rødt observert før grønt)

`test/analysis.test.js` (+2), gjenbruk `fixtureWithBps`-mønsteret (linje 321):

1. `publishedBonus` gir poeng per spiller fra `bonus`-statistikken, hjemme
   og borte samlet.
2. `publishedBonus` gir tom map når stats mangler eller `bonus`-statistikken
   er tom.

`test/live.test.js` (+4), gjenbruk `bps`/`confirmedBonus`/`liveStats`-hjelperne:

3. Pågående kamp med publisert bonus → `bonusPublished: 3`, `bonusEst: 0`,
   `effective` uendret (utvider scenarioet fra linje 125).
4. Dobbeltrunde: én kamp med publisert bonus + én som fortsatt estimeres →
   `bonusPublished` og `bonusEst` holdes atskilt på samme rad.
5. Ferdig kamp med bekreftet bonus → `bonusPublished` viser den (i dag
   hoppes ferdige kamper over).
6. Spiller uten bonus → `bonusPublished: 0` (defaulten).

I tillegg oppdateres «payloaden har ingen døde felter» (linje 188) med
`bonusPublished` i radnøklene — det er del av det grønne steget for felt-
endringen, ikke en egen test.

## Docs (i samme commits som endringene)

- **CHANGELOG `[Unreleased]`, Fixed:** bonuskolonnen på /live viser nå
  FPLs publiserte bonus under og etter kamp (før: tom hele kampen fordi
  FPL publiserer provisorisk bonus løpende); estimatet fra BPS beholdes for
  vinduet før publisering; «Effektivt» er uendret (bonusen ligger allerede
  i poengsummen).
- **ROADMAP:** huk av de tre kodepunktene i v1.2.3-seksjonen; manuell
  verifisering-punktet står åpent.
- **HANDOVER:** status for utførelsen + bevis; loggfør Marius' beskjeder.

## Rekkefølge for utførelsen (Opus 5)

1. Task 0-verifisering: `git log`/`git status` bekrefter `30a8dab` og rent
   tre; opprett `fix/live-bonus` fra `fix/lag-anbefalinger`; `npm test`
   baseline (forvent 242) + lint.
2. Tester 1–2 rødt → `publishedBonus` → grønt.
3. Tester 3–6 rødt → `live.js`-endringen + oppdater døde felter-testen →
   grønt. Commit (analysis + live + tester + CHANGELOG/ROADMAP/HANDOVER).
4. Visning: `public/app.js:199` + `views/live.ejs:21`. `npm test` + lint
   (bekrefter at klientharnessen fortsatt laster skriptet). Commit.
5. Røyktest med tomme nøkler (teknikk fra HANDOVER-lærdommene, port 3010):
   `/health` → `ai:false`, `/live` 200, `/api/live.json` inneholder
   `bonusPublished` i radene. Noter om kamper pågår (bonusverdier) eller
   ikke (0-er) — begge er gyldige.
6. Slutt-HANDOVER + final commit. **Ingen push.**

## Verifisering

- `npm test` 248/248, `npm run lint` exit 0 — output limes inn som bevis.
- Røyktest som over; faktisk JSON-utdrag fra `/api/live.json` limes inn.
- Manuell sjekk av kolonnen i nettleser under neste kampvindu (søndagskampene
  eller GW2) — står som åpent ROADMAP-punkt, del av sjekkpunkt D-oppfølgingen.
- Gjenstår av sjekkpunkt C (Marius, ikke Opus): stopp-testen etter siste
  kampslutt — null nye `live.json`-kall når `anyLive` er false.
