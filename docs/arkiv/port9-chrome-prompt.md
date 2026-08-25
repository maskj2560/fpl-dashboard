# Prompt til Claude in Chrome — stopp-testen (port 9, sjekkpunkt C)

Sendes av Marius litt FØR Brentford–Tottenham er ferdigspilt (avspark 18:30,
slutt ~20:20). Måler klientsiden av v1.2.3-fiksen: at siden slutter å hente
data av seg selv når siste kamp er over. Serversiden logges parallelt av
samplerern (`port9-sampler.sh`).

Resultatet føres inn under «Resultat fra kampvinduet» i
`docs/arkiv/sjekkpunkt-c-live.md`.

**Hvorfor «Sist oppdatert» brukes som måleinstrument:** `public/app.js:243`
skriver `new Date()` ved hver render, og render kalles kun etter en vellykket
henting. Feltet sier altså ingenting om dataenes alder (det er et eget,
utsatt ROADMAP-punkt), men det er en presis markør for *når siden sist hentet
data*. Fryser feltet, har pollingen stoppet. Derfor er reload forbudt i
prompten — en reload nullstiller tilstandsmaskinen og lager et nytt kall.

## Prompten

```
Du skal overvåke en nettside og dokumentere én bestemt overgang. Du skal ikke
endre noe.

SIDE: https://fpl.marsk.no/live — den skal allerede være åpen i fanen.

ALLER VIKTIGST: Du skal ALDRI laste siden på nytt. Ikke trykk F5, ikke naviger,
ikke klikk på lenker, ikke åpne siden på nytt. Hele testen går ut på å måle om
siden slutter å hente data av seg selv, og en reload nullstiller nøyaktig det
jeg måler. Du skal kun LESE det som står på skjermen. Er siden ikke åpen, åpne
den én gang og skriv tydelig at du gjorde det.

HVA SOM TESTES: Fotballkampen Brentford mot Tottenham (vises som «BRE» og
«TOT») holder på å bli ferdigspilt. Når dommeren blåser av, skal siden innen
omtrent ett minutt slutte å oppdatere seg selv. Siden hadde tidligere en feil
der den trodde kampen fortsatt pågikk og fortsatte å hente data hele natten.
Det er den feilen som skal være borte.

Kampen er sannsynligvis IKKE ferdig når du begynner. Det er meningen — jeg
starter deg med vilje i forkant.

RYTME: Les siden med en gang, og deretter én gang i minuttet.
HARD GRENSE: Maks 20 minutter totalt, uansett hva som skjer. Når 20 minutter
har gått, avslutt og rapporter det du har — også hvis kampen ikke ble ferdig.

NOTER FEM TING VED HVER AVLESNING:
1. Klokkeslettet akkurat nå
2. Teksten øverst på siden: enten «Kamper pågår» eller «Ingen kamper pågår
   akkurat nå»
3. Verdien i feltet «Sist oppdatert HH:MM:SS» — skriv den av nøyaktig, med
   sekunder
4. Statusfeltet for BRE–TOT i kamplista: enten et minuttall som «90'» eller
   ordet «Slutt»
5. Om prikken ved statusteksten pulserer/blinker, eller står stille

OVERGANGEN DU VENTER PÅ — disse fire skal skje omtrent samtidig:
- BRE–TOT-raden går fra minuttall til «Slutt»
- Toppteksten går fra «Kamper pågår» til «Ingen kamper pågår akkurat nå»
- Prikken slutter å pulsere
- «Sist oppdatert» slutter å endre seg

Skriv ned klokkeslettet dette skjer, og hva «Sist oppdatert» sto på i det
øyeblikket.

ETTER OVERGANGEN: fortsett å lese én gang i minuttet i fem minutter til. Det
eneste som betyr noe da er om «Sist oppdatert» endrer seg. Den skal stå helt
stille. Endrer den seg, noter nøyaktig når og til hvilken verdi.

DETTE ER FEIL, OG SKAL RAPPORTERES MED EN GANG DU SER DET:
- BRE–TOT står på «Slutt», men toppteksten står fortsatt på «Kamper pågår»
  mer enn to minutter senere
- «Sist oppdatert» fortsetter å endre seg etter at statusen har slått om
- Prikken pulserer videre etter overgangen
Ikke vent til slutten med å si fra om noe av dette.

EN EKSTRA SJEKK VED FØRSTE AVLESNING: I tabellen «Mine spillere», finn raden
«Ødegaard». Bonus-kolonnen skal vise «+3» i grønt, og Effektivt-kolonnen skal
vise «11» — ikke 14. Hold musepekeren over «+3» og skriv av hjelpeteksten som
dukker opp.

SLUTTRAPPORT: Gi meg en tabell med én rad per avlesning (klokkeslett,
statustekst, «Sist oppdatert», BRE–TOT-status, pulserer ja/nei). Under den:
nøyaktig klokkeslett for overgangen, om «Sist oppdatert» sto stille i fem
minutter etterpå, og Ødegaard-linjen. Avslutt med en tydelig konklusjon på om
testen er bestått eller ikke — ikke skriv «bestått» hvis du ikke faktisk
observerte overgangen innenfor de 20 minuttene.
```
