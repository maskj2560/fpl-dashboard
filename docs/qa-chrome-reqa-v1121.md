# Re-QA-prompt til Claude for Chrome — verifisering av v1.12.1 (11 QA-funn)

> Skrevet 2. september 2026 (økt 54), etter at v1.12.1 er ute i prod.
> Følger opp `docs/qa-chrome-prompt.md` (full QA 2. sep, 11 funn). Bruk:
> åpne https://fpl.marsk.no i en fane, gi Claude tilgang til den, og lim inn
> hele blokka under. Kort økt: ~20 min.

## Fasit å sjekke mot

| Hva | Forventet i prod |
| --- | --- |
| Versjon i footeren | **v1.12.1** |
| Asset-hash (`?v=` på style.css og app.js) | **`ba91839a`** |
| `<script`-tagger i HTML-en på `/` | **nøyaktig 2** |
| `/api/live.json` | har feltet `finished` (true mellom runder) og `dataAlder` |
| Tester på `main` | 756/756, lint 0 |

Det som fortsatt IKKE kan testes i Chrome og står igjen hos Marius:
STEG 7 fra den forrige prompten (bonuskamp på /live — krever pågående kamp,
fredag 4. sep fra 21:00), 9c (installer-tilbudet i adresselinja) og 9e
(offline-modus i DevTools), mobil-QA på ekte telefon, `kill 1` i
containerterminalen og kostnad i `console.anthropic.com`.

## Prompten

```text
Du skal verifisere at 11 feil er rettet i et Fantasy Premier League-dashbord
som kjører i prod på https://fpl.marsk.no. Det er mitt eget selvhostede
dashbord. Du fant feilene selv i forrige QA-runde (versjon v1.12.0); nå er
v1.12.1 ute, og jeg vil vite om hvert enkelt funn er borte — og om noe nytt
har dukket opp.

Regler for hele oppdraget:
- Alt er lesing. Ikke endre innstillinger, ikke logg inn noe sted, ikke
  send skjemaer, ikke prøv å fikse noe. Klikk ALDRI «Spør AI om råd» på
  /lag — det er det eneste klikket som koster penger.
- Bruk temabryteren (sol/måne-ikonet i toppmenyen) for å bytte mellom mørkt
  og lyst tema. Klikk, scroll og bruk tastaturet fritt ellers.
- Bruk to bredder: desktop (~1440 px) og mobil (~390 px, Chromes
  mobilvisning i iPhone-format, DPR 3).
- Ta skjermbilde av hvert funn som fortsatt er der, og ett skjermbilde per
  fiks som ser riktig ut på 390 px (funn 4, 5 og 9) — de er lettest å
  bedømme visuelt.
- Rapporter samlet TIL SLUTT i formatet nederst, ikke underveis.
- Får du ikke testet noe, si det eksplisitt i stedet for å gjette.

STEG 1 — Er riktig versjon ute?
a) Nederst på https://fpl.marsk.no står versjonen. Forventet v1.12.1.
b) I sidens HTML: hvilken ?v=-parameter har <link>-taggen for /style.css og
   <script>-taggen for /app.js? Forventet ba91839a på begge. Er hashen en
   annen, prøv én hard refresh (Ctrl+Shift+R). Er den fortsatt feil: noter
   BLOKKERER og fortsett likevel (da tester du gammel kode).
c) Tell <script>-taggene i HTML-en på /. Forventet nøyaktig 2.

STEG 2 — De elleve funnene, ett for ett
Nummereringen er den samme som i forrige rapport. For hvert punkt: skriv
«FIKSET», «FORTSATT FEIL» eller «IKKE TESTBART (grunn)».

Funn 1 — /lag, chip-planleggeren (begge temaer, begge bredder)
   Kortet «Chip-planlegger» skal ha NØYAKTIG TO halvdeler: «Halvdel 1 runde
   1–19» og «Halvdel 2 runde 20–38». Forrige gang var det tre («Halvdel 2
   runde 2–19» med samme innhold som halvdel 1). Finnes teksten «runde 2–19»
   noe sted på siden? Det skal den ikke.

Funn 2 — /lag, chip-planleggeren
   Hver chip-rad skal ha en pille: grå «Brukt i runde N», grønn «Runde N»
   (med begrunnelse i grå tekst etter), ELLER grå «Ingen anbefaling» + en
   begrunnelse i grå tekst («Ingen kjent blankrunde i halvdelen» /
   «Troppen har ingen tung periode i halvdelen»). Forrige gang manglet
   pillen helt på Free Hit og Wildcard. Finnes det nå en rad uten pille?

Funn 3 — / i LYST tema, begge bredder
   Lenken «Abonner på kalender» ligger i det lilla nedtellingskortet øverst.
   Den skal nå være FPL-grønn (rgb(0,255,135)) — les fargen med DevTools —
   og tydelig lesbar på gradienten. Regn ut kontrasten mot begge
   gradientfargene (rgb(55,0,60) og rgb(94,26,107)); forventet over 8:1.
   Sjekk også mørkt tema: samme grønne farge.
   MERK: samme lenke i sidehodet på /brief ligger IKKE på lilla og skal
   fortsatt ha den vanlige lenkefargen der (mørkegrønn i lyst tema) — det er
   riktig, ikke et funn.

Funn 4 — /lag på 390 px, begge temaer
   Oppstillingen på banen skal vise formasjonen som hele rader: for 3-4-3
   betyr det tre rader med 3, 4 og 3 kort — ingen rad skal brekke til
   «2+1» eller «2+2». Kortene er smalere enn før, og lange navn kan slutte
   med «…» — det er greit. Benkeraden («Benk») får fortsatt lov til å
   brekke. Er noe tekst i kortene klippet på en måte som gjør spilleren
   ukjennelig (f.eks. bare «…»)? Noter i så fall.

Funn 5 — /nyheter på 390 px, begge temaer
   Kortoverskriften «AI Oppsummering» og teksten «generert HH:MM · neste
   tidligst HH:MM» skal IKKE overlappe. Enten står de på samme linje, eller
   så har «generert …» falt ned på egen linje under overskriften. Sjekk
   også på 1440 px at de fortsatt står på samme linje der.

Funn 6 — /live og /api/live.json (begge bredder)
   Åpne /api/live.json. Noter «finished» og «dataAlder». Åpne så /live: det
   skal IKKE ligge et gult banner «Viser data fra HH:MM — får ikke kontakt
   med FPL akkurat nå» øverst. Forrige gang lå banneret der i 36+ minutter
   mellom runder. Testen er sterkest når «finished» er true og «dataAlder»
   er over 600 — da ville det gamle banneret vist seg. Er «dataAlder» under
   600, vent noen minutter (gjør de andre stegene) og sjekk /live igjen til
   slutt, og noter begge målingene. Etter fredag 4. sep kl. 19:30 er runde 3
   i gang og «finished» er false — da er testen ikke meningsfull; noter det.

Funn 7 — /brief på 1440 px (og gjerne 2560 px om du kan), begge temaer
   I sidehodet står «… eller lim inn webcal://fpl.marsk.no/kalender.ics i
   kalenderappen». Adressen skal stå hel — enten på samme linje eller hel
   på neste linje. Forrige gang ble den delt midt i ordet («fpl.marsk.n /
   o/kalender.ics»). På 390 px kan den deles hvis den alene er bredere enn
   linja — noter hva du ser, men det er ikke et funn.

Funn 8 — /brief, AI-rundebriefen (begge temaer)
   Les hele kortet «AI Rundebrief». Ingen linje skal starte med «• *», og
   ingen synlige stjerner (* eller **) skal stå igjen rundt spillernavn —
   navnene skal være fete. MERK: teksten genereres på nytt hver time, så
   akkurat «Watkins»-linja kan være borte; sjekk mønsteret på hele kortet.

Funn 9 — /lag på 390 px, begge temaer
   Statflisene øverst (GW-poeng, Totalt, Totalrangering, Lagverdi, Bank)
   skal stå TO i bredden, og den femte (Bank) skal ta hele raden alene.
   Tallet under «Totalrangering» (f.eks. «3 345 863») skal stå på ÉN linje,
   og etiketten «TOTALRANGERING» skal ikke deles midt i ordet. «LAGVERDI
   (£M)» på én linje. Sjekk også /innsikt og /overganger på 390 px: der er
   det også statfliser — står de to i bredden uten klipping?

Funn 10 — /overganger, begge temaer
   Tabellen «Prisgevinst»: kolonnen «Gevinst» (og «Sum»-raden) skal bruke
   norsk komma med fortegn, f.eks. «+0,5», «−0,3» eller «0» for null.
   Kolonnene Kjøpt/Nå/Salg beholder punktum («5.0») — det er riktig, ikke
   et funn. Sammenlign med prisendringskortet lenger opp på siden: samme
   kommaformat der («+0,1»).

Funn 11 — /, FDR-tabellen (begge temaer)
   FDR-4-cellene (nest rødeste) skal nå ha bakgrunn rgb(230,0,60) — ikke
   rgb(255,23,81) som før — med hvit tekst. Les fargen med DevTools på en
   celle med tallet 4 (også i forklaringen under tabellen) og regn ut
   kontrasten mot hvit: forventet 4,7:1. FDR 1, 2, 3 og 5 skal være
   uendret.

STEG 3 — Regresjon (raskt)
a) Gå gjennom /, /spillere, /lag, /overganger, /liga, /innsikt, /brief,
   /live og /nyheter på 390 px i begge temaer: har SELVE SIDEN vannrett
   scroll (skal ikke)? Er det tekst som klippes eller flyter ut av kort?
   Korthodene på alle sider (tittel til venstre, tekst til høyre): står
   korte høyretekster som «Runde 3» og «15» fortsatt på samme linje som
   tittelen? (Funn 5-fiksen lot lange tekster falle ned — korte skal ikke.)
b) DevTools-konsollen på /, /lag, /live og /nyheter: røde feil?
c) Temavalget: velg lyst tema på /lag, gå til /brief, så /live, så tilbake
   til /lag, og last siden på nytt. Er det fortsatt lyst hele veien? Gjør
   dette tre ganger. Forrige gang falt valget tilbake til mørkt én gang
   uten at det lot seg gjenta.

RAPPORT (avslutt med denne, i denne rekkefølgen)
1. Statuslinje per steg: «STEG n — OK» / «STEG n — AVVIK» / «STEG n — IKKE
   TESTET (grunn)».
2. Funn 1–11 med status: «Funn n — FIKSET» / «Funn n — FORTSATT FEIL» /
   «Funn n — IKKE TESTBART (grunn)», og for funn 6 begge målingene av
   dataAlder.
3. Nye funn, ett per linje, nummerert fra 12, i dette formatet:
   [ALVORLIGHET] side | tema | bredde | forventet | faktisk
   ALVORLIGHET er BLOKKERER, VIKTIG eller KOSMETISK.
4. Skjermbildene, merket med funnnummer.
5. Til slutt: hva som så bra ut, kort.
Ikke foreslå kodefiks og ikke gjett på årsak — jeg tar rapporten videre til
utvikleren.
```

## Etter re-QA-en

- Alle 11 FIKSET og ingen nye funn: kryss av punkt 4 under «Kun Marius» i
  `docs/HANDOVER.md`; STEG 7/9c/9e står igjen til en kamp pågår.
- FORTSATT FEIL eller nye funn: lim rapporten inn i en ny økt → `fix/`-branch,
  rød test først, v1.12.2.
