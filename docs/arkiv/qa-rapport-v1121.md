# QA-rapport fpl.marsk.no — verifisering av v1.12.1

> Arkivert 2. sep 2026 (økt 55). Rapport fra Claude for Chrome etter `docs/qa-chrome-reqa-v1121.md` (slettet samme dag — git bevarer den).

Testet onsdag 2. september 2026, kl. 17:45–18:20 (Europe/Oslo).
Oppsett: desktop 1440 px (Chrome-vinduet resized til innerWidth 1456; 2560 px sjekket for funn 7), mobil 390 × 844 px i Claude-appens innebygde nettleser (Chrome-motor, mobil-emulering, DPR 2 — ikke DPR 3, Chromes egen DevTools-mobilvisning krevde datamaskinstyring som ikke var slått på). Begge temaer på alle sjekker. Ingen innlogging, ingen skjemaer, «Spør AI om råd» ble aldri klikket.

## 1. Status per steg

- STEG 1 — OK
- STEG 2 — OK
- STEG 3 — OK

## 2. Funn 1–11

- Funn 1 — FIKSET. Chip-planleggeren har nøyaktig to halvdeler: «Halvdel 1 runde 1–19» og «Halvdel 2 runde 20–38». Teksten «runde 2–19» finnes ikke i sidens tekst (søkt i hele body, begge bredder, begge temaer).
- Funn 2 — FIKSET. Alle åtte chip-rader har pille: Bench Boost «Runde 13»/«Runde 26» (grønn), Triple Captain «Runde 3»/«Runde 20» (grønn), Free Hit «Ingen anbefaling» (grå) + «Ingen kjent blankrunde i halvdelen» i begge halvdeler, Wildcard «Ingen anbefaling» (grå) + «Troppen har ingen tung periode i halvdelen» i halvdel 1 og «Runde 25–28» (grønn) i halvdel 2. Ingen rad uten pille.
- Funn 3 — FIKSET. «Abonner på kalender» i det lilla kortet: computed color rgb(0, 255, 135) i lyst tema (og rgb(0, 255, 135) i mørkt), begge bredder. Gradient i lyst tema: linear-gradient(160deg, rgb(55,0,60), rgb(94,26,107)). Kontrast: 12,75:1 mot rgb(55,0,60) og 8,53:1 mot rgb(94,26,107) — begge over 8:1. (Mørkt tema-gradient rgb(34,16,53)→rgb(58,35,88): 13,1:1 / 10,0:1.) Samme lenke i sidehodet på /brief er rgb(4,112,61) i lyst tema — som forventet, ikke et funn.
- Funn 4 — FIKSET. /lag 390 px: pitch-radene har 1, 3, 4 og 3 kort, hver rad på én linje (samme y-posisjon for alle kort i raden), i både mørkt og lyst tema. Kortbredder 120/102/75/102 px. Ingen navn er avkortet (scrollWidth = clientWidth på alle .chip-name, inkludert «João Pedro» og «Ødegaard»); ingen «…» vises. Benk brekker 2+2 (tillatt).
- Funn 5 — FIKSET. /nyheter 390 px: «AI Oppsummering» (y=154) og «generert 17:45 · neste tidligst 23:45» (y=181) står på hver sin linje uten overlapp, begge temaer. På 1440 px står de på samme linje (begge y=183, tittel x=180, tekst x=943).
- Funn 6 — FIKSET. Måling 1 kl. 17:50: finished=true, dataAlder=0, gameweek=2 → /live uten gult banner. Måling 2 kl. 18:16–18:18: finished=true, dataAlder=1596 (mobil) / 1671 (desktop) → /live fortsatt uten banner («Ingen kamper pågår akkurat nå · Sist oppdatert 18:18:06»). Sterk test: dataAlder > 600 med finished=true, der det gamle banneret ville vist seg. Begge bredder, begge temaer.
- Funn 7 — FIKSET. /brief: webcal://fpl.marsk.no/kalender.ics ligger i ett sammenhengende linjefragment (én client rect, 209 px bred) på 1440 px og 2560 px, hel på egen linje etter «eller lim inn», begge temaer. På 390 px står adressen også hel på egen linje (én rect).
- Funn 8 — FIKSET. Kortet «AI Rundebrief» (generert 17:45): 0 stjernetegn i teksten, ingen linje starter med «• *», 23 <strong>-elementer rundt navn (Watkins, Haaland, Groß, Gvardiol, B.Fernandes, Cherki, Lammens, …). Sjekket i begge temaer og begge bredder.
- Funn 9 — FIKSET. /lag 390 px: statflisene står to i bredden (x=14 og x=199, 177 px brede), Bank alene på hele raden (361 px). «3 345 863» på én linje, «TOTALRANGERING» og «LAGVERDI (£M)» på én linje uten klipping, begge temaer. /innsikt 390 px: flisene («Traff troppens beste», «Minst like god som global favoritt», «Av rundens XI eide du», «Rundens beste») står to i bredden (164 px), «Flakspoeng i sesongen» alene på raden; ingen klipping, etiketter brekker bare mellom ord. /liga har også fliser (Avstand totalt / Siste runde / Min kaptein / Rivalens kaptein) — to i bredden, OK. /overganger: ingen statfliser rendres akkurat nå (siden viser «Ingen overganger registrert ennå»), så den delen kunne ikke testes.
- Funn 10 — FIKSET. Prisgevinst-tabellen: Gevinst-kolonnen viser «0» for null og «+0,1» (João Pedro), Sum-raden «+0,1». Kjøpt/Nå/Salg beholder punktum (5.0). Prisendringskortet øverst bruker «+0,1» / «−0,1». Merk: troppen har ingen negativ gevinst i dag, så formatet «−0,3» kunne ikke observeres i Gevinst-kolonnen (minustegnet er verifisert i prisendringskortet).
- Funn 11 — FIKSET. .fdr-4 i tabellen (22 celler) og i forklaringen («4»): bakgrunn rgb(230, 0, 60), tekst rgb(255, 255, 255), identisk i begge temaer. Kontrast mot hvit: 4,74:1 (gammel rgb(255,23,81) ville gitt 3,82:1). FDR 1 rgb(55,85,35)/hvit, FDR 2 rgb(1,252,122)/rgb(55,0,60), FDR 3 rgb(231,231,231)/rgb(55,0,60), FDR 5 rgb(128,7,45)/hvit — uendret mellom temaer.

Steg 1-detaljer: footer viser «v1.12.1 · sist oppdatert onsdag 2. september kl. 17:45»; HTML har `<link rel="stylesheet" href="/style.css?v=ba91839a">` og `<script src="/app.js?v=ba91839a" defer>`; nøyaktig 2 <script>-tagger i rå HTML (én inline nonce-script for tema før første paint + app.js).

Steg 3-detaljer: (a) Ingen av de ni sidene har vannrett scroll på 390 px i noen av temaene (scrollWidth = 390). Elementer som stikker utenfor viewporten ligger alle i egne scrollcontainere (nav-overflow i toppmenyen, .table-scroll rundt tabeller) — ingen tekst flyter ut av kort; eneste «klippede» elementer er sr-only-tekst og .team-name-full som er skjult med vilje på mobil. Korte høyretekster står på samme linje som tittelen: «10» (fire kort på /), «3-4-3», «15»/«10»/«5» (/live), «Runde 3» (Lagsjekk), «Generert 17:45», «Runde 2» (/liga), «3 av 8» (/innsikt). Lange høyretekster faller ned som forventet: «generert … · neste tidligst …» (/nyheter), «3 opp · 17 ned» under den lange tittelen «Prisendringer natt til onsdag 2. september», og «Beste: 2025/26 · rank 2 702 449» (/innsikt). (b) Konsoll på /, /lag, /live og /nyheter etter reload: ingen røde feil. (c) Temavalg: lyst valgt på /lag → /brief → /live → /lag → reload, tre ganger: lyst hele veien alle tre gangene (data-theme=light, localStorage fpl-theme=light, body-bakgrunn rgb(244,242,248)). Bryteren har tre steg (mørkt → automatisk → lyst).

## 3. Nye funn

Ingen nye funn i denne runden.

## 4. Skjermbilder

Ingen gjenværende funn → ingen feil-skjermbilder. 390 px-skjermbilder av fiksene ble tatt i den innebygde nettleseren og ligger i verktøystegene i chatten (kan ikke lagres som filer derfra):
- Funn 4: /lag 390 px, mørkt og lyst — pitch med 1/3/4/3-rader.
- Funn 5: /nyheter 390 px, lyst og mørkt — kortoverskrift med «generert …» på egen linje.
- Funn 9: /lag 390 px, mørkt og lyst — statfliser 2+2+1; /innsikt 390 px lyst — fliser 2 i bredden.
Desktop-skjermbilder (1440 px) av chip-planleggeren, hero-lenken, FDR-tabellen, /brief-kortet, Prisgevinst og /nyheter ligger også i stegene.

## 5. Hva så bra ut

Alle elleve rettelser holder i begge temaer og begge bredder, uten at noe nytt har dukket opp. Kortoverskriftene brekker bare når høyreteksten faktisk er lang. Ingen vannrett scroll, ingen konsollfeil, temavalget er stabilt over tre runder, og /live holder seg uten banner selv med 27 minutter gamle data mellom runder.
