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

## FUNN 2 — «Kamper pågår» hele natten etter kampslutt (stopp-testen 21.–22. aug)

Stopp-testen (punkt 3 i sjekkpunkt C) lot seg ikke kjøre: avbruddsvilkåret
(«Ingen kamper pågår akkurat nå») ble aldri oppfylt. Fire HELT friske
sidelaster over 66 minutter, alle med byte-identisk innhold:

```
22:56:32  «Kamper pågår · Sist oppdatert 22:56:32»
23:02:06  «Kamper pågår · Sist oppdatert 23:02:06»
23:13:54  «Kamper pågår · Sist oppdatert 23:13:54»
00:02:16  «Kamper pågår · Sist oppdatert 00:02:16»
ARS 3–0 COV merket «90'» (aldri «Slutt»), pulserende prikk i alle fire.
```

Kampen var ferdigspilt i virkeligheten før første last.

### Rotårsak (verifisert ~9 t etter kampslutt, 22. aug morgen)

FPL-kilden `fixtures/?event=1` sa fortsatt:

```
started true | finished false | finished_provisional true | minutes 90
```

FPL setter `finished_provisional: true` ved fløyta, men `finished: true`
først ved rundeprosesseringen (typisk neste morgen). Koden leser kun
`f.finished`:

- `anyLive = fixtures.some((f) => f.started && !f.finished)` (`live.js:38`)
  → true hele natten.
- `matches`-payloaden setter `finished: f.finished` (`live.js:84`) → klienten
  viser «90'», aldri «Slutt», og prikken pulserer.

Konsekvens: hver åpen fane pollet hvert 60. sekund hele natten — i strid
med regelen «aldri poll utenfor kampvinduer».

### Hypoteser som ble avkreftet

- **Cache-/snapshot-frys:** nei — kilden selv serverte `finished: false` og
  uendrede stats; cachen speilet kilden korrekt. De identiske sidelastene
  var riktig gjengivelse av en ferdigspilt kamp.
- **«Ikke startede kamper teller som pågående»:** nei — `some()`-betingelsen
  krever `started`.

### «Sist oppdatert» er en falsk friskhetsindikator

`public/app.js:232` og `views/live.ejs:6` skriver `new Date()` ved render —
sidelast-/polletidspunkt, aldri dataenes alder. Etter finished-fiksen er den
i praksis sann når polling går (data maks ~1 min gamle). Ekte dataalder
krever hentetidspunkt per cache-nøkkel og forblir ROADMAP-punktet
«Alderstak på stale data + `dataAlder` i payloaden» (P3-2-rest) — bevisst
utsatt (Marius 22. aug).

### Besluttet løsning (Marius, 22. aug — IKKE re-spør)

`matchDone(f) = f.finished || f.finished_provisional` brukes i `anyLive`,
i `matches`-payloadens `finished`-felt og i bonusestimat-garden. Fikses i
SAMME plan og branch som bonusfunnet (`docs/plan-live-bonus.md`,
`fix/live-bonus`) — samme fil og løkke, egen branch ville gitt konflikt.

Stopp-testen kan først bestås etter at fiksen er deployet — står som åpent
punkt under sjekkpunkt D-oppfølgingen.

## Port 9 — verifisering i prod etter deploy (22. august 2026)

v1.2.3 ble deployet 22. aug kl. 02:43 (se `docs/HANDOVER.md`, økt 23).
Denne seksjonen er fasit for port 9 i `docs/plan-deploy-v122-v123.md`.

### Delbevis 1: stopp-testen holder gjennom HELE det stale vinduet — GRØNT

Dette er sterkere bevis enn planens ett-minutts-test, fordi det er nettopp
her skaden lå: FUNN 2 var at «hver åpne fane fortsatte å polle hele natten».

ARS–COV ble ferdigspilt fredag ~22:50. FPL sto fortsatt på
`finished: false, finished_provisional: true, minutes: 90` da dette ble
målt lørdag **kl. 11:29 — 14,5 timer etter fløyta**. Runden var altså ennå
ikke prosessert, så den gamle koden ville ha stått på «Kamper pågår» og
pollet sammenhengende i 14,5 timer.

Prod på v1.2.3 gjennom samme vindu (målt 02:43, 02:47 og 11:28):

| Sjekk | Verdi |
| --- | --- |
| `/api/live.json` → `anyLive` | `false` |
| `matches[0].finished` (ARS–COV) | `true` — utledet av `finished_provisional` |
| Servert /live-HTML | «Ingen kamper pågår akkurat nå» |
| `pulse-on` i initiell HTML | 0 forekomster — prikken pulserer ikke |
| Innbakt `nextKickoff` | `2026-08-22T11:30:00Z` (= 13:30 Oslo) |

Klientlogikken som følger av dette, `public/app.js` `schedule()`: med
`anyLive: false` ryddes 60 s-intervallet og det settes ÉN `setTimeout` til
`nextKickoff + 30 s`. En fane åpnet i dette vinduet gjør altså null kall før
13:30:30. Prod holdt seg grønn på alle 11 ruter gjennom hele perioden.

### Delbevis 2: bonuskolonnen bærer publisert bonus — GRØNT

Fra prod-payloaden (`myPlayers`, ikke `rows`): feltet `bonusPublished`
finnes på **15/15** rader. Ødegaard, samme spiller som i den opprinnelige
observasjonen:

```
{"name":"Ødegaard","points":11,"bonusEst":0,"bonusPublished":3,"effective":11}
```

Bonusen vises (3), og «Effektivt» er 11 — ikke 14. Ingen dobbelttelling.

### Gjenstår: observasjon under kampene (13:30–~20:25 lørdag)

Lørdagens GW1-kamper: 13:30 HUL–MUN, 16:00 EVE–CRY / IPS–SUN / NFO–LEE,
18:30 BRE–TOT (siste, slutter ~20:20).

Serversiden logges automatisk av samplerern under. Klientsiden må observeres
i nettleseren av Marius:

1. **Under kamp:** bonuskolonnen «Bonus» får verdier (`+N` i accentfarge),
   title-teksten sier «Bekreftet av FPL …» eller «Estimat fra BPS», og
   «Effektivt» teller ikke publisert bonus dobbelt.
2. **Stopp-testen ved fløyta ~20:20:** statusen slår om til «Ingen kamper
   pågår akkurat nå» innen ~1 min, kampene merkes «Slutt», prikken slutter
   å pulsere, og nettverksfanen viser INGEN nye `live.json`-kall i minst
   5 minutter etterpå.
3. **Noteres:** klokkeslett, de tre siste `live.json`-kallene, og første
   observerte fravær av kall.

### Sampleren (serversiden av port 9)

Kjøres gjennom kampvinduet; logger hvert 30. sekund og markerer overganger.
Flagger dobbelttelling automatisk (`effective > points + bonusEst`).

```bash
OUT="${1:-port9-samples.log}"; PREV=""
while :; do
  J=$(curl -s --max-time 30 https://fpl.marsk.no/api/live.json)
  LINE=$(printf '%s' "$J" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const d=JSON.parse(s);
      const st=d.matches.map(m=>m.finished?"S":(m.started?"P":"-")).join("");
      const p=d.myPlayers.filter(x=>x.bonusPublished>0||x.bonusEst>0)
        .map(x=>`${x.name}:pts${x.points}/est${x.bonusEst}/pub${x.bonusPublished}/eff${x.effective}`).join(" ");
      const bad=d.myPlayers.filter(x=>x.effective>x.points+x.bonusEst)
        .map(x=>`${x.name}(eff${x.effective})`).join(" ");
      console.log(`anyLive=${d.anyLive} status=${st} bonus[${p}]${bad?" DOBBELTTELLING! "+bad:""}`);
    });')
  echo "$(date +%H:%M:%S) $LINE" | tee -a "$OUT"
  CUR=$(printf '%s' "$LINE" | sed 's/ bonus.*//')
  [ -n "$PREV" ] && [ "$CUR" != "$PREV" ] && echo "$(date +%H:%M:%S) >>> OVERGANG: $PREV -> $CUR" | tee -a "$OUT"
  PREV="$CUR"; sleep 30
done
```

Statuskoden er én bokstav per kamp i rekkefølge: `S` = slutt, `P` = pågår,
`-` = ikke startet. Før kampstart lørdag: `S---------`.

### Resultat fra kampvinduet — BESTÅTT (22. august 2026)

Målt med to uavhengige instrumenter som ikke deler kodevei: serversiden med
`port9-sampler.sh` (1621 sampler, hvert 30. s, 11:29–01:00) og klientsiden
med Claude in Chrome (10 avlesninger, kun lesing, aldri reload). Full
nettleserrapport: `~/Downloads/live-test-bre-tot-2026-08-22.md`.

#### Stopp-testen ved siste kampslutt (BRE–TOT)

| Instrument | Måling |
| --- | --- |
| Sampler, siste `anyLive=true` | 20:24:47 |
| Sampler, første `anyLive=false` | **20:25:17** (status `SSSSSP----` → `SSSSSS----`) |
| Nettleser, siste henting | **20:25:33** — registrerte «Slutt» og ble den siste |
| Nettleser, status slo om | observert 20:25:51 (avlesning 5) |
| Forplantning server → klient | **~16 sekunder** (krav: ~1 minutt) |

De to instrumentene bekrefter hverandre: serveren slo om mellom 20:24:47 og
20:25:17, og klientens neste planlagte henting kl. 20:25:33 plukket det opp
og stoppet. Nettleseren hadde pollet med nøyaktig 60 s mellomrom fram til da
(20:20:33 → 21:33 → 23:33 → 24:33 → 25:33), i tråd med `LIVE_POLL_MS`.

**Polling opphørte:** «Sist oppdatert» sto urørt på 20:25:33 gjennom fem
oppfølgingsavlesninger (20:27:09, 20:28:19, 20:29:28, 20:30:36, 20:31:44).
Prikken sluttet å pulsere — `pulse-on` var fjernet fra `span.pulse` og
`animation-name` var `none`. Ingen av de tre feilsignaturene inntraff.

**FUNN 2 lot seg ikke reprodusere.** Dette er den siste blokkerte
verifiseringen fra sjekkpunkt C.

#### Stopp-testen bestod dessuten to ganger tidligere samme dag

Sampleren fanget alle overgangene i GW1s lørdagsprogram:

```
13:31:00  false SS---------  ->  true  SP--------   HUL-MUN avspark
15:27:35  true  SP--------   ->  false SS--------   HUL-MUN slutt
16:01:24  false SS--------   ->  true  SSPPP-----   16:00-kampene avspark
17:54:53  true  SSPPP-----   ->  true  SSPPS-----   NFO-LEE slutt
17:58:56  true  SSPPS-----   ->  true  SSPSS-----   IPS-SUN slutt
18:00:57  true  SSPSS-----   ->  false SSSSS-----   EVE-CRY slutt
18:30:43  false SSSSS-----   ->  true  SSSSSP----   BRE-TOT avspark
20:25:17  true  SSSSSP----   ->  false SSSSSS----   BRE-TOT slutt
```

Hver eneste omslag skjedde i samme 30-sekunders sample som fløyta.

#### Bonuskolonnen — BESTÅTT

**Publisert bonus vises, og telles ikke dobbelt.** Ødegaard sto hele dagen på
`{points:11, bonusEst:0, bonusPublished:3, effective:11}`. I nettleseren:
Bonus-kolonnen viste **+3** i accentfarge `rgb(0, 229, 140)`, Effektivt viste
**11** — ikke 14 — og title-attributtet var nøyaktig
«Bekreftet av FPL (foreløpig til runden er ferdig)».

**BPS-estimatet virker i vinduet før FPL publiserer.** Under HUL–MUN gikk
Lammens, Shaw og Mbeumo gjennom `pts0/est2/eff2` og `pts1/est1/eff2` til
`pts1/est2/eff3` — altså poeng pluss estimat, slik estimatet skal telle.

**Ingen dobbelttelling i noen sample.** Sampleren flagget automatisk på
`effective > points + bonusEst`: **0 treff av 1621**.

Sidenote som forklarer et forventet tomrom: dine spillere i HUL–MUN sto uten
publisert bonus hele kampen, og det er korrekt — FPLs provisoriske bonus der
gikk til Ajayi (3), McBurnie (2) og Tzolakis (1), alle Hull-spillere.
Tom bonuscelle for en spiller utenfor topp 3 er riktig oppførsel; feilen var
tom celle for en spiller som *hadde* bonus.
