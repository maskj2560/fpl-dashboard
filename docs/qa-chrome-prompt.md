# QA-prompt til Claude for Chrome — full prod-QA etter sluttpakka (v1.8.3–v1.12.0)

> Skrevet 2. september 2026 (økt 53), etter at alle fem releasene i
> sluttpakka er ute i prod. Erstatter `docs/oppgaveliste.md` (konsumert).
> Bruk: åpne https://fpl.marsk.no i en fane, gi Claude tilgang til den, og
> lim inn hele blokka under. Blir økta for lang: kjør STEG 1–5 i én runde og
> STEG 6–10 i neste — rapporten kommer uansett samlet til slutt.

## Fasit å sjekke mot

| Hva | Forventet i prod |
| --- | --- |
| Versjon i footeren | **v1.12.0** |
| Asset-hash (`?v=` på style.css og app.js) | **`b6c8f095`** |
| `<script`-tagger i HTML-en på `/` | **nøyaktig 2** (tema-scriptet + app.js) |
| `/health` | `status: ok`, `ai: true`, `discord: true`, `teamId: true`, `leagues: 1` |
| Tester på `main` | 743/743, lint 0 |

Det som IKKE kan testes i Chrome og står igjen hos Marius:
`kill 1` i containerterminalen (SIGTERM-bevis), mobil-QA på ekte telefon
(Chrome emulerer 390 px, ikke ekte touch), og kostnad i `console.anthropic.com`.

## Prompten

```text
Du skal gjøre en full QA av et Fantasy Premier League-dashbord som kjører i
prod på https://fpl.marsk.no. Det er mitt eget selvhostede dashbord. Det har
nettopp fått fem oppdateringer på rad (sikkerhet/tilgjengelighet,
planleggingspakke, prisvarsler, karriere-pakke og PWA), og jeg vil vite om
alt ser riktig ut i drift.

Regler for hele oppdraget:
- Alt er lesing. Ikke endre innstillinger, ikke logg inn noe sted, ikke
  send skjemaer, ikke prøv å fikse noe. Klikk ALDRI «Spør AI om råd» på
  /lag — det er det eneste klikket som koster penger.
- Du SKAL bruke temabryteren (sol/måne-ikonet i toppmenyen) for å bytte
  mellom mørkt og lyst tema, og du kan klikke, sortere, filtrere, scrolle
  og bruke tastaturet — det er slik UI-et testes.
- Bruk to bredder: desktop (~1440 px) og mobil (~390 px, Chromes
  mobilvisning i iPhone-format).
- Ta skjermbilde av alt som ser galt ut.
- Rapporter samlet TIL SLUTT i formatet nederst, ikke underveis.
- Får du ikke testet noe (siden laster ikke, elementet finnes ikke, ingen
  kamper pågår), si det eksplisitt i stedet for å gjette.

STEG 1 — Er riktig versjon ute, og er sikkerheten på plass?
a) Nederst på https://fpl.marsk.no står versjonen. Hvilken? Forventet v1.12.0.
b) I sidens HTML: hvilken ?v=-parameter har <link>-taggen for /style.css og
   <script>-taggen for /app.js? Forventet b6c8f095 på begge. Er hashen en
   annen, prøv én hard refresh (Ctrl+Shift+R) og sjekk på nytt. Er den
   fortsatt feil: noter BLOKKERER og fortsett likevel.
c) Åpne DevTools-konsollen på /, /spillere, /lag og /live. Finnes det
   meldinger som starter med «Refused to» (Content Security Policy)? Det
   skal det IKKE. Noter også andre røde feil.
d) Trykk Tab én gang på /. Dukker lenken «Hopp til innhold» opp øverst? Trykk
   Enter — havner fokus i hovedinnholdet?
e) Tell <script>-taggene i HTML-en på /. Forventet nøyaktig 2.

STEG 2 — Alle sider, begge temaer, begge bredder
Gå gjennom /, /spillere, /lag, /overganger, /liga, /innsikt, /brief, /live
og /nyheter. For hver side: laster den uten feil? Er det tekst som klippes,
overlapper eller flyter ut av kortene? Har SELVE SIDEN vannrett scroll på
390 px (det skal den ikke — bare tabeller skal kunne dras sidelengs)? Kan
toppmenyen (9 punkter) dras sidelengs på mobil, med fade-kant? Er kontrasten
lesbar i begge temaer? Gjør runden i mørkt tema, så i lyst.

STEG 3 — /lag: chip-planleggeren
Under rankgrafen, over «Anbefalinger», skal det ligge et kort
«Chip-planlegger».
a) Viser det to halvdeler (runde 1–19 og 20–38) med fire chips hver: Bench
   Boost, Triple Captain, Free Hit og Wildcard?
b) Har hver chip en pille: grå «Brukt i runde N», grønn med anbefalt runde +
   en begrunnelse i grå tekst, eller grå «Ingen anbefaling» + begrunnelse?
c) Står det enten en liste over dobbel-/blankrunder, eller teksten «Ingen
   dobbel- eller blankrunder er kjent ennå»?
Begge temaer, begge bredder.

STEG 4 — /brief: Lagsjekk og kalender
a) Rett under sidehodet skal det ligge et kort «Lagsjekk» med rundenavn.
   Viser det enten en funnliste (etiketter som Kaptein/Ute/Tvilsom/Uten
   kamp, spillernavn, klubbmerke og detalj) eller en grønn pille «Alt
   klart»? Under: en grå linje med «Gratisbytter igjen», «Chip» og
   «Grunnlag: laget fra runde N−1 + byttene dine for runde N».
b) I sidehodet og under nedtellingen på /: lenken «Abonner på kalender»
   med adressen webcal://fpl.marsk.no/kalender.ics ved siden av. Ikke klikk
   webcal-lenken (den åpner en kalenderapp) — åpne i stedet
   https://fpl.marsk.no/kalender.ics direkte: starter teksten med
   BEGIN:VCALENDAR, og finnes det minst 38 forekomster av BEGIN:VEVENT?
   Er det linjer som er lengre enn 75 tegn? (Det skal det ikke være.)

STEG 5 — /overganger: prisendringer
Øverst på siden, under sidehodet, KAN det ligge et kort «Prisendringer natt
til …». Kortet vises først etter første natt med prisendringer etter
deployen — er det ikke der, rapporter «ikke synlig ennå», det er riktig
oppførsel de første timene. Er det der: har det tre deler (Troppen din —
eller «Ingen endringer i troppen din.», Opp (x av y), Ned (x av y)) med
klubbmerke, «£14.0m → £14.1m» og delta med norsk komma («+0,1»)? Sjekk
resten av siden også (regnskap, prisgevinst, planlegger) i begge temaer.

STEG 6 — /innsikt: FPL-karrieren og merkedager
Øverst på siden, FØR de andre kortene, skal det ligge to nye kort:
a) «FPL-karrieren»: tabell over tidligere sesonger (Sesong, Poeng,
   Sluttrank) der beste sesong har en grønn pille «Beste» og uthevet rad,
   pluss en grå linje «Denne sesongen så langt (2026/27): …».
b) «Merkedager»: åtte fliser (Sesongbeste, Tre grønne piler, Hundreklubben,
   Topp 100 000, Bedre enn noen gang, Tom benk, Kapteinsteft, Alle femten
   spilte). Er låste fliser tydelig grået/dempet med teksten «Ikke opptjent
   ennå», og opptjente i full farge med runde/detalj? Står telleren «x av
   8» i overskriften?
Begge temaer, begge bredder — sjekk at flisene bryter til én kolonne på
390 px uten å klippe tekst.

STEG 7 — /live: bonuskamp (kun hvis kamper pågår)
Pågår det Premier League-kamper akkurat nå? Hvis nei: rapporter «STEG 7 —
IKKE TESTET (ingen kamper pågår)» og gå videre. Hvis ja: under hver kamp i
gang skal det stå «Bonus (estimat)» eller «Bonus (FPL)» med opptil fem
spillere, BPS-tall og bonus (+3/+2/+1 eller –). Står mine egne spillere i
fet? Oppdateres tallene av seg selv i løpet av et par minutter?

STEG 8 — /spillere: regresjon
a) Fanene Tabell · Differensialer · Dødballtakere: bytter de innhold ved
   klikk? Bytter piltast venstre/høyre fane når en fane har fokus? Åpner
   /spillere#differensialer riktig fane direkte?
b) Søkefeltet: skriv et navn og trykk Enter — siden skal IKKE laste på nytt
   (skjemaet håndteres i JS), og tabellen skal filtreres.
c) Klikk et spillernavn — åpnes spillerkortet? Lukk med Esc. Åpne igjen,
   lukk med klikk utenfor. Står fokus tilbake på navnet etterpå (Tab én
   gang og se hvor fokusrammen havner)?
d) Kryss av to spillere og trykk «Sammenlign» — kommer duellen side ved
   side? Prøv å krysse av en tredje — den skal avvises.
e) Sorter en tallkolonne: står overskriften rett over tallene, og bytter
   pilen retning?
Begge temaer.

STEG 9 — PWA
a) Åpne https://fpl.marsk.no/manifest.webmanifest?v=1 — er det JSON med
   name «FPL-dashboard», short_name «FPL», display «standalone» og fire
   ikoner?
b) Åpne https://fpl.marsk.no/img/icon-512.png?v=1 — lilla firkant med
   avrundede hjørner og grønn sirkel?
c) I Chrome på desktop: vises installer-ikonet i adresselinja (eller
   «Installer FPL-dashboard» i ⋮-menyen) på /? Ikke installer — bare
   bekreft at tilbudet finnes.
d) DevTools → Application → Service Workers: er det en aktiv service
   worker for fpl.marsk.no, med kilde /sw.js?v=b6c8f095? Under Cache
   Storage: finnes en cache som heter fpl-b6c8f095, og INGEN andre fpl-*?
e) Slå på «Offline» i DevTools (Network-fanen) og last / på nytt: kommer
   siden «Du er frakoblet» med knappen «Prøv igjen»? Slå av Offline, trykk
   knappen — kommer dashbordet tilbake?
f) Åpne https://fpl.marsk.no/sw.js — er svaret JavaScript (ikke en
   HTML-side), og inneholder teksten «fpl-b6c8f095»?

STEG 10 — API og tastatur
a) https://fpl.marsk.no/health — hvilke funksjoner står som true/false?
b) https://fpl.marsk.no/api/brief.json — finnes feltet «dataAlder», og hva
   er verdien i sekunder?
c) https://fpl.marsk.no/api/live.json — har hver kamp i «matches» feltene
   «bpsTop» og «bpsSource»?
d) https://fpl.marsk.no/finnesikke — kommer det en 404-side på norsk, med
   samme meny og footer som resten?
e) Tastatur på /: Tab deg gjennom toppmenyen og det første kortet. Er
   fokusrammen synlig på hvert element? Kommer elementene i lesbar
   rekkefølge?
f) (Til utvikleren — bare noter, ikke utfør:) takstbegrensningen testes
   med curl: 31 raske «POST /api/scenarier» fra samme IP skal gi 429 med
   Retry-After på kall 31, og en 40 kB JSON-kropp skal gi 413. Dette gjør
   jeg selv.

RAPPORT (avslutt med denne, i denne rekkefølgen)
1. Statuslinje per steg: «STEG n — OK» / «STEG n — AVVIK» / «STEG n — IKKE
   TESTET (grunn)».
2. Funnliste, ett funn per linje, nummerert, i dette formatet:
   [ALVORLIGHET] side | tema | bredde | forventet | faktisk
   ALVORLIGHET er BLOKKERER, VIKTIG eller KOSMETISK.
3. Skjermbildene, merket med funnnummer.
4. Til slutt: hva som så bra ut, kort.
Ikke foreslå kodefiks og ikke gjett på årsak — jeg tar rapporten videre til
utvikleren.
```

## Etter QA-en

- Ga rapporten funn: åpne en Claude Code-økt med rapporten limt inn og be om
  én `fix/`-branch per alvorlighetsklasse, TDD (rød før grønn), CHANGELOG-
  linje per fiks, og en ny versjon (v1.12.1) når alt er grønt.
- Ingen funn: kryss av «Chrome-QA» i ROADMAP § 0 og loggfør i HANDOVER.
- Uansett: `kill 1`-beviset, ekte mobil-QA og kostnadssjekken er dine — se
  «Kun Marius kan gjøre» i `docs/HANDOVER.md`.

## Regler som gjelder alle øktene (uendret)

- Push til `main` = deploy til prod. Aldri torsdag 19–21 (auto-briefen
  ~19:30), aldri mens kamper pågår (`/api/live.json` → `anyLive:false`).
- `npm test` + `npm run lint` grønne før noe regnes som ferdig — be alltid
  om å se outputen, ikke bare påstanden.
- Hver brukersynlig endring skal ha en CHANGELOG-linje i samme commit.
- Nærmer økta seg usage-grensa: be om at `docs/HANDOVER.md` oppdateres og
  alt committes, før du åpner ny økt.
