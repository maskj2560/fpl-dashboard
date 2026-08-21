# Sjekkpunkt C — live-visningen under kampene (21. august 2026)

Observasjonene er gjort av Marius via Claude in Chrome på prod
(https://fpl.marsk.no/live), Runde 1, mens Arsenal–Coventry pågikk.
Alle årsaksforklaringer under er verifisert mot faktiske API-svar samme
kveld — ingen av dem er gjettet. Ingen kode er endret på grunnlag av dette
ennå.

## Observasjonsvindu

21. aug 2026, 22:07:37–22:10:44 (Europe/Oslo). Fanen sto åpen og aktiv,
ingen klikk, ingen navigasjon. Målekilde: sidens egen Resource Timing API
+ Chrome-utvidelsens nettverkslogg.

## C-1 og C-2 — polling og cache: GRØNT, ikke rør

Kall til `/api/live.json` fra nettleseren:

```
22:08:37  200  134 ms  ~650 B
22:09:37  200  136 ms  ~650 B
22:10:37  200  167 ms  ~647 B
```

Nøyaktig 60 sekunder mellom hvert, tre kall på tre minutter, ingen ekstra
eller duplikate kall. «Sist oppdatert» i headeren fulgte kalltidspunktene.
Stemmer med `LIVE_POLL_MS = 60000` i `public/app.js:14`.

Serverens cache tar støyten (målt separat, 5 raske curl mot samme
endepunkt):

```
tid: 0.09s 0.10s 0.14s 0.09s 0.09s   alle 5 identiske: true
cf-cache-status: DYNAMIC   (Cloudflare cacher ikke → alle 5 traff origin)
totalLive: 10  anyLive: true  runde: 1
```

Origin svarer på ~90 ms med identisk payload → TTL-cachen i `cache.js`
serverer, ingen FPL-rundtur per kall.

**Konklusjon: pollingintervall og fetch-logikk skal ikke røres.**

Gjenstår av sjekkpunkt C: stopp-testen når `anyLive` blir false (etter
siste kampslutt) — forventning null nye `live.json`-kall.

## C-3 — status, prikk og kampstillinger: GRØNT

- Statustekst: «Kamper pågår»
- Prikken animerer: `span.pulse.pulse-on`, 8,8 px, `border-radius: 50%`,
  `rgb(255,61,129)`, `animation-name: pulse`, 2s, play-state running
- Arsenal–Coventry oppdaterte seg riktig: 2–0 (45') → 3–0 (51')
- Ingen feil eller exceptions i konsollen i hele perioden

## FUNN — bonuskolonnen står tom hele kampen (eneste reelle feil)

Alle 15 rader viste «–» i kolonnen BONUS-EST. gjennom hele perioden, også
for de fire som var på banen.

### Hva payloaden faktisk inneholder

Feltet finnes, men er 0:

```json
{"name":"Calafiori","team":"ARS","minutes":61,"points":9,"bonusEst":0,"effective":9}
```

### Rotårsak (verifisert mot FPL-API-et)

`fixtures/?event=1` for kampen som pågikk (62 spilte minutter):

```json
{"identifier":"bonus","a":[],"h":[{"value":3,"element":15},{"value":2,"element":12},{"value":1,"element":10}]}
```

FPL publiserer altså bonus **provisorisk mens kampen pågår**, ikke først
ved kampslutt. Da returnerer `hasConfirmedBonus()` (`analysis.js:371`)
`true`, og `live.js:51` hopper over kampen med `continue` — så
`estimateBonus()` kjører aldri, og `bonusEst` blir 0 for alle.

Vakten har rett i at bonusen ikke skal telles to ganger. FPLs egen
`explain` for Ødegaard (`event/1/live/`) viser at den allerede ligger i
poengsummen:

```
minutes +2, goals_scored +5, clean_sheets +1, bonus +3  → total_points 11
```

Konsekvensen er at estimeringsvinduet i praksis er null: provisorisk
bonus dukker opp så snart BPS finnes, så kolonnen står tom hele kampen.

### Besluttet løsning (Marius, 21. aug — IKKE re-spør)

Vis FPLs publiserte bonus i kolonnen, merket som foreløpig, og legg den
**ikke** til «Effektivt» — den ligger allerede i poengsummen.
BPS-estimatet beholdes for vinduet før FPL publiserer noe.
Alternativene «fjern kolonnen» og «la stå som nå» ble avvist.

### Skisse til datamodell (ikke implementert)

- Ny ren helper i `analysis.js`: `publishedBonus(fixture)` →
  `Map<element, poeng>` fra `bonus`-statistikken (h + a). `hasConfirmedBonus`
  kan defineres som `publishedBonus(f).size > 0`.
- `live.js`, per kamp som er startet: har kampen publisert bonus, summeres
  den i `bonusPub`; ellers (og bare når kampen ikke er ferdig) estimeres
  det som i dag i `bonusEst`.
- Rad i payloaden: `bonusEst` beholder dagens betydning (estimert bonus som
  IKKE er i poengsummen — eksisterende tester avhenger av det), nytt felt
  `bonusPublished` = bonus som allerede ligger i `points`.
- `effective` uendret: `(points + bonusEst) * multiplier`.
- `public/app.js:199` viser summen `bonusEst + bonusPublished`, med
  `title` som skiller de to tilfellene. Kolonneoverskriften i
  `views/live.ejs:21` bør da hete «Bonus», ikke «Bonus-est.».

Eksisterende tester som må fortsette å passere uendret:
`test/live.test.js` linje 93 (dobbeltrunde), 110 (to samtidige kamper) og
125 (ingen dobbelttelling). Begge er kompatible med skissen over.

### TDD-plan (rødt før grønt)

1. `analysis.test.js`: `publishedBonus` gir poeng per spiller fra
   `bonus`-statistikken (hjemme + borte), og tom map når statistikken mangler.
2. `live.test.js`: pågående kamp med publisert bonus → `bonusPublished: 3`,
   `bonusEst: 0`, `effective` uendret (ikke dobbelttalt).
3. `live.test.js`: dobbeltrunde med publisert bonus i én kamp og estimat i
   en annen → de to holdes atskilt.
4. `live.test.js`: ferdig kamp med bonus → bonusen vises (i dag hoppes
   ferdige kamper over helt).

Rendringen i `public/app.js` kan ikke enhetstestes med dagens harness:
`test/app-client.test.js` kjører skriptet i en vm der DOM-elementene er
`null`, så `render()` returnerer tidlig og eksponeres ikke. Tabellkroppen
i `views/live.ejs` er tom serverside og fylles av JS, så view-testene
dekker den heller ikke. Rendringsendringen verifiseres derfor manuelt.

## Avklart uten funn — poengverdier

### Tzolis gikk fra 5 til 4 poeng

Ingen feil i vår kode. `live.js:61-62` leser `stats.total_points` rått fra
`event/{gw}/live/` ved hvert kall — ingen akkumulering, ingen lokal state,
ingenting som kan dobbelttrekke eller overskrive. Et fall kan bare komme
fra at FPL reviderer underveis. Tzolis 22:1x samme kveld: 6 poeng
(minutes 2 + assist 3 + clean sheet 1). Provisoriske revisjoner midt i
kamp er normalt.

### van Ewijk: 51 spilte minutter, 0 poeng

Ikke manglende appearance-poeng. FPLs egen `explain` for ham:

```
minutes +2 (63 min), goals_conceded -1 (3 mål)  → total_points 1
```

Ved 51' og 2 baklengsmål: appearance +1, goals_conceded −1 = **0** —
nøyaktig det som ble vist. Forsvarere får −1 per 2 baklengsmål.
Ingen feil, ingen endring.
