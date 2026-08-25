# Plan: bonus + kampslutt på /live (sjekkpunkt C-funnene) → v1.2.3

## Kontekst

Sjekkpunkt C avdekket TO feil på /live, begge med rotårsak verifisert mot
prod-API-et (ikke gjettet). Full analyse med rådata:
`docs/arkiv/sjekkpunkt-c-live.md`.

**Funn 1 — bonuskolonnen står tom hele kampen** (21. aug ~22:10, observert
av Marius via Claude in Chrome under Arsenal–Coventry): FPL publiserer bonus
**provisorisk mens kampen pågår** — `fixtures/?event=1` hadde
`{"identifier":"bonus","h":[{value:3,element:15},…]}` ved 62 spilte minutter.
Da returnerer `hasConfirmedBonus()` (`src/services/analysis.js:371`) `true`,
og løkka i `src/services/live.js:51` hopper over kampen — `estimateBonus()`
kjører aldri, `bonusEst` blir 0 for alle. Vakten mot dobbelttelling er i seg
selv riktig: FPLs `explain` viser at publisert bonus allerede ligger i
`total_points` (Ødegaard: bonus +3 av 11). Konsekvens: estimeringsvinduet er
i praksis null, kolonnen er død.

**Funn 2 — siden sier «Kamper pågår» hele natten etter kampslutt** (stopp-
testen 21.–22. aug: fire friske sidelaster 22:56–00:02, alle viste «Kamper
pågår», ARS–COV «90'», pulserende prikk — 66+ min etter fløyta). Rotårsak,
verifisert ~9 t etter kampslutt: FPL setter `finished_provisional: true` ved
fløyta, men `finished: true` først ved rundeprosesseringen (neste morgen).
Koden leser kun `f.finished`: `anyLive` (`live.js:38`) og
`matches`-payloaden (`live.js:84`). Konsekvens: statusen står på, «Slutt»
vises aldri, og hver åpen fane poller hvert 60. sekund hele natten — i strid
med «aldri poll utenfor kampvinduer». Cache-hypotesen ble avkreftet: kilden
selv serverte `finished: false`, dataene var korrekt speilet. Polling-/
fetch-logikken i frontend ble målt riktig begge kvelder og skal ikke røres.

To andre observasjoner ble ettergått og avsluttet uten funn (Tzolis 5→4:
FPL-revisjon, vi leser `total_points` rått; van Ewijk 51'/0p: appearance +1,
goals_conceded −1 = 0 — korrekt). «Sist oppdatert» viser rendertidspunkt,
ikke dataalder (`public/app.js:232`, `views/live.ejs:6`) — ekte dataalder
krever cache-metadata og forblir ROADMAP-punktet «Alderstak på stale data +
`dataAlder` i payloaden» (P3-2-rest). Ikke i denne planen.

**Beslutninger tatt av Marius 21.–22. aug (IKKE re-spør):**

1. Funn 1: vis FPLs publiserte bonus i kolonnen, merket som foreløpig; legg
   den IKKE til «Effektivt» (den ligger allerede i poengsummen); behold
   BPS-estimatet for vinduet før FPL publiserer noe. Alternativene «fjern
   kolonnen» og «la stå» ble avvist.
2. Funn 2: fikses i SAMME plan/branch (utvidelse valgt 22. aug — samme fil,
   samme løkke; egen branch ville gitt konflikt). dataAlder tas IKKE nå.

## Rammer

- **Branch:** `fix/live-bonus`, opprettes fra `fix/lag-anbefalinger`.
  Merge-rekkefølge etter sjekkpunkt D, på klarsignal: `fix/sanitize-brief` →
  `fix/lag-anbefalinger` → `main` (v1.2.2), deretter `fix/live-bonus` →
  `main` (v1.2.3).
- **Aldri push. Ingen merge. Aldri deploy torsdag 19–21.** 0 AI-kall (dette
  arbeidet trenger ingen — ingen prompts endres).
- **Ikke rør polling-tilstandsmaskinen** i `public/app.js`
  (`schedule`/`poll`/`LIVE_POLL_MS`/`nextWakeupDelay`) — sjekkpunkt C målte
  den grønn to ganger. Kun bonuscellen i `render()` (linje 199) endres.
- Ikke rør `notify.js`, `brief.js`, `gameUpdating`/banner i `fplClient.js`.
- TDD: rødt observert før grønt. Baseline på fersk branch: **242** —
  avvik → stopp og rapporter. Mål: **250**.
- `npm test` + `npm run lint` grønt før hver commit; conventional commits;
  CHANGELOG `[Unreleased]` + ROADMAP + HANDOVER i samme commit som endringen.

## Task 0 — C-dokumentasjonen (docs-only, på `fix/lag-anbefalinger`)

**Status ved overlevering: gjort av Fable i planøktene** — commits `30a8dab`
(funn 1 + beslutning) og den påfølgende docs-committen (funn 2 + denne
planutvidelsen). Opus verifiserer med `git log`/`git status` at treet er
rent — IKKE committ på nytt. Deretter opprettes `fix/live-bonus` fra
`fix/lag-anbefalinger`.

## Endringer (alle på `fix/live-bonus`)

### 1. `publishedBonus(fixture)` — ny ren helper i `src/services/analysis.js`

`Map<element, poeng>` fra `bonus`-statistikken (h + a), tom map når
statistikken mangler/er tom. Legges ved siden av `hasConfirmedBonus`
(linje 371), som beholdes uendret (brukes fortsatt som vakt for estimatet;
å redefinere den via `publishedBonus` er valgfri opprydding — gjør det bare
hvis det ikke endrer noen testresultater).

### 2. `src/services/live.js` — kampslutt + skill publisert bonus fra estimat

**Kampslutt (funn 2):** lokal helper i modulen,
`const matchDone = (f) => f.finished || f.finished_provisional;`

- `anyLive` (linje 38): `f.started && !matchDone(f)`.
- `matches`-payloaden (linje 84): `finished: matchDone(f)` — payload-feltet
  beholder navnet `finished` (semantikk «ferdigspilt»), så klientens
  «Slutt»-visning fikses uten å røre `render()`-logikken for kamper.
- Test-fixtures uten `finished_provisional` gir `undefined` → falsy →
  eksisterende tester upåvirket.

**Bonus (funn 1):** i `buildLive` (linje 45–56), to mapper i stedet for én.

- `bonusPub`: summeres fra `publishedBonus(f)` for hver kamp som er
  `started` — også ferdige kamper (i dobbeltrunde skal bekreftet bonus fra
  tidlig kamp vises).
- `bonusEst`: kun `started && !matchDone(f) && !hasConfirmedBonus(f)`
  (dagens betingelse, med `matchDone` i stedet for bare `finished` — ved
  fløyta finnes publisert bonus uansett, så estimatet trengs ikke lenger).

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
`docs/arkiv/sjekkpunkt-c-live.md`: `test/app-client.test.js` kjører skriptet i en
vm der DOM-elementene er `null`, så `render()` returnerer tidlig; tabellen
fylles klientside så view-testene dekker den ikke). Verifiseres manuelt
under neste kampvindu.

## TDD — 8 nye tester, 242 → 250 (rødt observert før grønt)

`test/analysis.test.js` (+2), gjenbruk `fixtureWithBps`-mønsteret (linje 321):

1. `publishedBonus` gir poeng per spiller fra `bonus`-statistikken, hjemme
   og borte samlet.
2. `publishedBonus` gir tom map når stats mangler eller `bonus`-statistikken
   er tom.

`test/live.test.js` (+6), gjenbruk `bps`/`confirmedBonus`/`liveStats`-hjelperne:

3. Pågående kamp med publisert bonus → `bonusPublished: 3`, `bonusEst: 0`,
   `effective` uendret (utvider scenarioet fra linje 125).
4. Dobbeltrunde: én kamp med publisert bonus + én som fortsatt estimeres →
   `bonusPublished` og `bonusEst` holdes atskilt på samme rad.
5. Ferdig kamp med bekreftet bonus → `bonusPublished` viser den (i dag
   hoppes ferdige kamper over).
6. Spiller uten bonus → `bonusPublished: 0` (defaulten).
7. Kamp med `finished_provisional: true` (og `finished: false`) →
   `anyLive: false` og `matches[].finished: true` — reproduserer «kamp
   ferdig, men status sier fortsatt pågår».
8. Kamp med `finished_provisional: true` og publisert bonus → ingen
   `bonusEst`, bare `bonusPublished` (estimatet slås av ved fløyta).

I tillegg oppdateres «payloaden har ingen døde felter» (linje 188) med
`bonusPublished` i radnøklene — det er del av det grønne steget for felt-
endringen, ikke en egen test.

## Docs (i samme commits som endringene)

- **CHANGELOG `[Unreleased]`, Fixed** (to punkter): (1) bonuskolonnen på
  /live viser nå FPLs publiserte bonus under og etter kamp; estimatet fra
  BPS beholdes for vinduet før publisering; «Effektivt» er uendret.
  (2) /live regner nå kampen som ferdig ved fløyta
  (`finished_provisional`), så statusen slår om til «Ingen kamper pågår»,
  kampen merkes «Slutt», og pollingen stopper — før sto siden og pollet
  hele natten fordi FPL setter `finished` først ved rundeprosesseringen.
- **ROADMAP:** huk av kodepunktene i v1.2.3-seksjonen; manuell
  verifisering-punktet står åpent.
- **HANDOVER:** status for utførelsen + bevis; loggfør Marius' beskjeder.

## Rekkefølge for utførelsen (Opus 5)

1. Task 0-verifisering: `git log`/`git status` bekrefter docs-commitene og
   rent tre; opprett `fix/live-bonus` fra `fix/lag-anbefalinger`; `npm test`
   baseline (forvent 242) + lint.
2. Tester 1–2 rødt → `publishedBonus` → grønt.
3. Test 7 rødt → `matchDone` i `anyLive` + `matches` → grønt. Commit
   (funn 2 er brukersynlig alene og committes separat).
4. Tester 3–6 + 8 rødt → bonus-endringen i `live.js` + oppdater døde
   felter-testen → grønt. Commit.
5. Visning: `public/app.js:199` + `views/live.ejs:21`. `npm test` + lint
   (bekrefter at klientharnessen fortsatt laster skriptet). Commit.
6. Røyktest med tomme nøkler (teknikk fra HANDOVER-lærdommene, port 3010):
   `/health` → `ai:false`, `/live` 200, `/api/live.json` inneholder
   `bonusPublished` i radene, og — er ingen kamp i gang — `anyLive: false`
   selv om en kamp bare har `finished_provisional`. Noter observert modus.
7. Slutt-HANDOVER + final commit. **Ingen push.**

## Verifisering

- `npm test` 250/250, `npm run lint` exit 0 — output limes inn som bevis.
- Røyktest som over; faktisk JSON-utdrag fra `/api/live.json` limes inn.
- Manuell sjekk under neste kampvindu (lørdagskampene/GW2): bonuskolonnen
  får verdier, og etter kampslutt slår statusen om og pollingen stopper —
  det er den utestående stopp-testen fra sjekkpunkt C, som ikke KAN bestås
  før denne fiksen er deployet. Står som åpent ROADMAP-punkt under
  sjekkpunkt D-oppfølgingen.
