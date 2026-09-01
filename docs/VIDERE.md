# Hva skjer videre med FPL-dashboardet

> Enkel oversikt for Marius — oppdateres når noe blir ferdig eller planlagt.
> (Tekniske detaljer bor i ROADMAP.md; dette er kortversjonen.)

**Sist oppdatert:** 2. september 2026

## Planen videre: fem oppdateringer på rad («Sluttpakka», 1. september)

Alt som sto igjen på idélista bygges nå ferdig, i denne rekkefølgen — hver
går ut i drift for seg:

1. ~~**v1.8.3 — herding og tilgjengelighet.**~~ Se under.
2. **v1.9.0 — planleggingspakka.** Chip-planlegger på Lag-siden (beste
   vindu for Bench Boost, Triple Captain, Free Hit og Wildcard), en
   «Lagsjekk» tre timer før deadline (Discord kun når noe er galt: skadet
   starter, flagget kaptein, spiller uten kamp) og en kalender du kan
   abonnere på med alle deadlines og kampene til spillerne dine.
3. **v1.10.0 — prisvarsler.** Én Discord-melding om natten når prisene i
   troppen din endrer seg, pluss nattens største bevegelser globalt.
4. **v1.11.0 — karriere-pakka.** Tidligere sesonger og merkedager på
   Innsikt-siden, og «bonuskamp» på Live: hvem leder BPS-kampen i hver
   kamp mens den spilles.
5. **v1.12.0 — app på mobilen (PWA).** «Legg til på hjemskjerm» med eget
   ikon, og en enkel frakoblet-side uten nett.

Ingen av delene bruker AI, så kostnaden er uendret. Til slutt får du én
ferdig prompt til Claude for Chrome som tester alt i drift.

## Nytt: v1.8.3 — herding og tilgjengelighet (2. september)

Ingen nye funksjoner, men appen er strammere under panseret:

- **Sikkerhetshoder.** Nettleseren får nå beskjed om nøyaktig hvilke
  script som får kjøre (bare våre egne), at siden ikke kan legges inn i
  andres rammer, og hva som ikke skal lekke i lenker. Skrivende API-kall
  er begrenset til 30 per fem minutter per IP.
- **Tilgjengelighet.** «Hopp til innhold» som første Tab-trykk, tabeller
  med usynlige titler for skjermlesere, kolonnehoder som leses riktig
  etter sortering, og Live-siden sier fra når poengene dine endrer seg.
  Alt er låst med tester, så det ikke forsvinner ved neste endring.
- **Rydding.** 13 gamle arbeidsgrener er slettet lokalt.

## Før det: v1.8.2 — QA-fikser og fyldigere runderapport (1. september)

Fem feil funnet i en prod-gjennomgang med Claude for Chrome er fikset, og
«Rundens rapport» i Discord/på Liga-siden er blitt mye fyldigere:

- **Rapporten bruker lagene dine.** Den får nå benkepoeng, chip, bytter/hits
  og rundens beste spiller for hvert lag i miniligaen, pluss differensialer
  (spillere bare ett lag eide som banket) og flopper (bredt eid, få poeng).
  Den sikter på 250–320 ord (før ~180) og skal nevne hvert lag minst én
  gang. Alt bygges av data som allerede hentes — null ekstra FPL-kall.
- **Filterraden på Spillere** vises kun på Tabell-fanen, ikke på alle tre.
- **Score-søyla** i differensialtabellen er en tynn stripe, ikke et fargefelt.
- **«#» på Liga** står rett over plassifferet, ikke over trendpila.
- **Duellen på mobil** deler bredden i stedet for å stikke utenfor kortet.
- **Tredje avkryssing i duellen**: de ledige boksene låses synlig når to
  spillere er valgt, i stedet for at klikket bare forsvinner.

## Før det: v1.8.1 — Spillere-siden er ryddet opp (1. september)

Ingen nye funksjoner, men siden ser ferdig ut nå. Det viktigste:

- **Tre faner** øverst — Tabell · Differensialer · Dødballtakere — i stedet
  for ett langt dokument du måtte scrolle gjennom. Piltastene bytter fane,
  og `/spillere#differensialer` åpner riktig fane direkte.
- **Spillernavnene er lenker, ikke grønne knapper.** Veggen av 772 fylte
  knapper er borte; grønt er igjen reservert for ekte handlinger.
- **«Klar» vises ikke lenger.** Statusmerket dukker bare opp når det
  faktisk er noe å vite (skadet, tvilsom, suspendert, utlånt). Filteret
  virker som før.
- **Tabellen har fått striper** og strammere rader, og avkryssings-
  kolonnen heter nå «Duell» synlig. Stripene teller bare rader du ser, så
  rytmen holder når du filtrerer.
- **Terskelvelgeren 5/10/15 % virker igjen.** Den var død i v1.8.0 — koden
  som lyttet på valget manglet rett og slett. Nå er den en segmentert
  bryter, og scoren har en tynn søyle bak tallet som viser hvor sterk den
  er sammenlignet med toppen av lista.
- **Dødballtakerne er klubbkort** i et rutenett i stedet for en bred
  tabell — ett kort per klubb med merke og de tre rollene under hverandre.
- **Duellen** viser drakt, navn og klubb per spiller, og «Sammenlign» er nå
  den grønne knappen (den var «Tøm valg» før — feil vei).
- **Spillerkortet** har større drakt, navnet står bare i tittelen, og
  Form/Poeng/P/K er store tall over de mindre.

## Før det: v1.8.0 «Spiller-pakka» — i drift siden 1. september

Fire nye ting på **Spillere**-siden, som nå er delt i tre seksjoner med
snarveier øverst (Tabell · Differensialer · Dødballtakere):

- **Spillerkort.** Klikk på et spillernavn — hvor som helst på siden — og
  det spretter opp et kort med drakt, nøkkeltall, dødballroller, de fem
  siste rundene (mål, assist, xG, xA, bonus) og de tre neste kampene
  fargelagt etter vanskelighetsgrad. Detaljene hentes først når du klikker,
  så siden er like rask som før. Lukkes med ×, Esc eller klikk utenfor.
- **Spillerduell.** Kryss av to spillere i tabellen og trykk «Sammenlign».
  Du får nøkkeltallene side ved side med den beste verdien uthevet — der
  billigst vinner på pris, og en fast straffetaker slår en som ikke tar
  straffer.
- **Differensialer.** Spillere nesten ingen andre i verden eier, rangert
  etter form ganget med hvor snilt kampprogrammet er de neste tre rundene.
  Du velger selv om grensen skal gå ved 5, 10 eller 15 % eierandel.
- **Dødballtakere.** Én rad per klubb: hvem som tar straffene, hjørnene og
  de direkte frisparkene — første og andre valg. Navnene er klikkbare.

Hele pakka bruker **ingen AI** og koster dermed ingenting å bruke.

**Ute på https://fpl.marsk.no siden 1. september**, 602 tester grønne. Den
gikk ut uten at du testet lokalt først, så gi den en runde i nettleseren:
spillerkortet (åpne, lukke med Esc), duellen (kryss av to) og
terskelbyttet. Finner du noe rart, fikser vi det som en liten oppdatering.

## Og før det: v1.7.0 «Innsikt» — i drift siden 31. august

En helt ny side i menyen, rett etter «Liga»: **Innsikt** — fasiten på din
egen sesong. Fire ting, alle regnet på ferdigspilte runder:

- **Benkesløsing.** Hva benken din scoret hver runde, og hvor mye av det du
  faktisk kunne fått. «Unngåelig tap» er differansen mellom den beste
  lovlige elleveren du kunne stilt av de femten, og den du stilte. En Bench
  Boost-runde teller som null sløsing — der spilte hele troppen uansett.
- **Kapteinsfasit.** To spørsmål per runde: fikk kapteinen din flest poeng
  av dine femten, og fikk han minst like mange som spilleren resten av
  verden kapteinet? Begge med treffprosent for sesongen.
- **Flaksbarometer.** Hvor mye over eller under forventningen spillerne dine
  leverte, målt i poeng (mål mot xG, assist mot xA). Per runde, for
  sesongen, og de tre heldigste og tre uheldigste i troppen din.
- **Rundens XI.** FPLs eget drømmelag for siste ferdige runde, med drakter,
  merket med hvem du eide og hvem som var kapteinen din — pluss en trend
  over hvor mange av dine som kom med, runde for runde.

Siden bruker **ingen AI** og koster dermed ingenting å se på.

**Ute på https://fpl.marsk.no siden 31. august kl. 16:46.** Det eneste som
gjenstår er at du ser den på telefonen — menyen har nå ni punkter, så sjekk
at den lar seg dra sidelengs på 390 px.

## Dette hadde du fra før (v1.6.0, sluppet 28. august)

Dashbord med nedtelling og skader · spillertabell med søk og filter · laget
ditt med kapteinsråd · miniligaen med rival-radar, kaptein-liga og
sesongkurve · rundebrief (AI skriver den på norsk) · live-poeng mens
kampene går · nyheter med AI-oppsummering · auto-brief til Discord kvelden
før hver deadline · «Overganger» med angre-analyse, hva hvis-planlegger og
lagrede planer · «Rundens rapport» til Discord etter hver ferdigspilte
runde.

**Alt som lå ferdigbygget er nå ute i drift (28. august)** — fire
versjoner gikk ut samtidig:

- **v1.3.8 — nyhetsfilteret.** Punkter der et spillernavn står i eieform
  («Haalands») blir ikke lenger kastet bort.
- **v1.4.0 — sidene sier fra når tallene er blitt gamle.** Får appen ikke
  kontakt med FPL, vises tallene fortsatt, men med et banner: «Viser data
  fra HH:MM — får ikke kontakt med FPL akkurat nå».
- **v1.5.0 — hele «Overganger»-siden**, slik du bestilte den 26. august:
  hvert bytte kan brettes ut runde for runde med en dom «etter 5 runder»,
  sesongkort med treffprosent, hva hvis-planlegger med full regelsjekk,
  lagrede planer som følges opp etterpå, «hva om jeg kjøpte Z i stedet»,
  hva GW1-laget ditt ville scoret urørt hele sesongen, prisgevinst per
  spiller, og en AI-kommentar til byttene dine én gang i døgnet.
- **v1.6.0 — hele liga-pakka:** rival-radar (velg hvem du jager, se
  differensialene begge veier), kaptein-liga (hvem kapteinet hva, og hva
  det kostet dem), graf over hele miniligaen sesongen gjennom — og
  **«Rundens rapport»**, som etter hver ferdigspilte runde skåler for
  vinneren og erter taperen i Discord. Rapporten står også på
  Miniligaer-siden.

**Før det (v1.3.7): auto-briefen kan ikke sendes to ganger.**
Appen husker nå på tvers av omstarter at briefen for en runde alt er
sendt til Discord (den fikk en liten lagringsplass i Coolify). Før kunne
en uheldig timet utrulling i kvarteret etter sendetidspunktet ha postet
den samme briefen på nytt.

**Før det (v1.3.5 og v1.3.6): to fikser du forhåpentligvis aldri
merker.** Den første handler om utrullinger: når appen legges ut på nytt,
får den nå beskjed om å avslutte pent, og gjør ferdig sidene som er
underveis før den stopper. Før måtte serveren drepe den etter en
ventetid, og en side du lastet akkurat da kunne bli kuttet på midten.

Den andre handler om FPLs eget vedlikeholdsvindu. Når FPL oppdaterer
spillet sitt, svarer de ikke på data, og appen viser et banner om det.
Det banneret kunne før bli hengende i et kvarter etter at FPL var
tilbake; nå slukker det av seg selv etter fem minutter. Og skjer det rett
etter at appen er startet på nytt — så den ikke har noen tall å vise fra
før — får du nå en side som sier «FPL oppdaterer spillet, prøv igjen om
noen minutter» i stedet for en generisk feilmelding.

**Før det (v1.3.4): sidene venter aldri på AI-en lenger.**
Før denne versjonen kunne rundebriefen og nyhetene ta 10–60 sekunder å
laste, fordi siden sto og ventet mens AI-en skrev teksten. Nå skriver
serveren tekstene på forhånd, etter klokka: rundebriefen én gang i døgnet
og hver time de siste seks timene før deadline, nyhetene hver sjette time.
Siden viser det som ligger klart, med en gang. Målt i drift: rundebriefen
laster på 0,13 sekunder mot 10 sekunder før. Er en tekst ikke laget ennå,
får du data-briefen med tallene i stedet — akkurat som før. Det eneste
stedet du fortsatt kan bli sittende å vente, er første klikk på AI-rådet
på Lag-siden, og det er med vilje: den knappen kan ikke svare med
ingenting.

Det gjør også at appen bruker AI-en jevnere: rundt 41–45 kall i uka i
stedet for ett per sidevisning.

**Før det (v1.3.3): QA-rettelsene etter gjennomgangen din.**
Tabellhodet på Spillere blir ikke lenger liggende bak toppmenyen når du
scroller på telefonen. Ligatabellen viser en pil på hver rad — også i
runde 1, der ingen har flyttet på seg ennå — og hele raden er klikkbar,
med laget du sammenlikner deg med tydelig markert. Lagsiden viser
formasjonen (for eksempel 3-4-3) i overskriften over banen, og
rankgrafen viser en prikk når det bare finnes én runde å tegne. Live-siden
har fått samme tellere i korthodene som dashbordet. Store tall som
1 339 328 brekker aldri lenger midt i en tallgruppe, og teksten deles
langt sjeldnere med bindestrek på smal skjerm. Filtrerer du bort alle
spillerne, sier siden fra og tilbyr en knapp som nullstiller filtrene.
Tabeller du kan dra sidelengs toner ut i kanten, slik menyen allerede
gjorde. I tillegg: bedre kontrast på versjonslinja og benkeradene i lyst
tema, cyan AI-merke på rådgiverkortet, og én vei tilbake fra 404-siden i
stedet for to. Dette er bit 4 av 4 — drakten er ferdig.

Fra før (v1.3.2): **finpuss på alle sidene.** Toppen av
dashbordet viser nå hvilken runde det gjelder ved siden av nedtellingen, og
hvert kort har fått et tall i overskriften — hvor mange skadede, hvor mange
kampene teller. Kamplista i rundebriefen har fått klokkeslett og klubbmerker
i stedet for bare navn, lagsiden sier fra i overskriften hvis du har en chip
aktiv, og «Overganger» markerer beste og verste bytte som farget pille.
Går noe galt, får feilsidene nå en tydelig knapp tilbake til dashbordet i
stedet for bare en lenke i teksten. Dette var bit 3 av 4.

Fra før (v1.3.1): **klubbmerker og drakter.** Merket
til klubben står nå ved siden av spilleren i alle tabeller og lister, og
på lagsiden har spillerne på banen fått klubbdrakta si — keeperen sin
egen keeperdrakt, akkurat som på FPL. Bildene ligger på vår egen server,
så de laster raskt og forsvinner ikke om FPL flytter på noe; mangler et
bilde, vises kortnavnet som før. Footeren krediterer klubbene og Premier
League. Dette er bit 2 av 4.

Fra før (v1.3.0): **ny drakt på siden — og du kan velge lyst eller mørkt
tema.** Knappen helt til høyre i toppmenyen sykler mellom automatisk
(følger telefonen/PC-en), lyst og mørkt, og husker valget ditt. Fargene
er FPLs egne: lilla toppmeny, grønn som handlingsfarge, cyan på alt AI-en
har skrevet, og FPLs nøyaktige fargeskala på kampvanskelighet.

Fra før (v1.2.5): **rundebriefen er blitt ærligere.**
Tre ting: (1) den kan ikke lenger skrive «alle stiller friske» når skadelista
har navn på seg — slike setninger lukes automatisk bort før du ser dem, og
det samme gjelder prosenttall den har vridd på (den skrev en gang 32,3 % der
dataene sa 32,6 %). (2) Kapteinslista i briefen er ikke lenger tilfeldig før
sesongstart: er formtallene 0 for alle, rangeres den på forventet poeng, akkurat
som lagsiden allerede gjorde. (3) Lista kalles nå «kapteinskandidater» — for det
er det den er. FPL publiserer ingen tall på hvem folk faktisk setter kaptein, og
briefen skrev tidligere «de mest brukte kapteinsvalgene globalt» som om den
visste det.

Fra før (v1.2.4): AI-rådgiveren på lagsiden dikter ikke lenger. Den får alle
tallene for hver spiller og må begrunne seg hvis den sier noe annet enn siden.
Har en spiller 0 minutter, sier den «ingen data ennå», ikke «dårlig form».

Fra før: sesongstarten er ferdig verifisert — alt virket med ekte data.
Live-siden viser bonuspoeng underveis i kampene og skjønner at kampen er
ferdig ved fløyta. Kapteinsrådene på lagsiden gir mening også før noen har
spilt. Kostnaden for AI-en er målt: under 1 dollar i uka.

## Ferdig: ny drakt på hele siden, i fire etapper

**Alle fire etappene er ute (24.–25. august).** Mockupen som ble godkjent:
https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
(klikk deg rundt: dashbord, spillere, lag, brief — knappen øverst til
høyre bytter mellom automatisk, lyst og mørkt tema, og «390 px» nederst
viser mobilbredden).

Det bygges i fire biter, og hver bit legges ut for seg når du sier fra —
siden er aldri halvferdig:

1. ~~**v1.3.0 — nye farger og temavalg.**~~ **Ferdig og ute 24. august.**
   FPL-lilla toppmeny, FPLs grønne og cyan som aksenter, og en knapp som
   bytter mellom automatisk/lyst/mørkt og husker valget ditt.
2. ~~**v1.3.1 — klubbmerker og drakter.**~~ **Ferdig og ute 24. august.**
   Merker i alle tabeller og lister, drakter på banen på lagsiden
   (keeperen får keeperdrakt). Bildene ligger på vår egen server;
   mangler et bilde, vises kortnavnet.
3. ~~**v1.3.2 — finpuss.**~~ **Ferdig og ute 24. august.** Rundeetiketten i
   nedtellingen, kampliste med klokkeslett i briefen, tydeligere feilsider,
   mobilpuss.
4. ~~**v1.3.3 — rettelser**~~ fra din egen gjennomgang i nettleser og på
   telefon. **Ferdig og ute 24. august**, kontrollert i drift 25. august.

## Deretter, i rekkefølge (nummerert plan, 24. august)

Bare oppdateringer med kodeendring får versjonsnummer. Sjekker og målinger
er «porter» — de skjer når datoen eller du er klar, uten å stoppe utviklingen.

- ~~**v1.2.4** — AI-rådgiveren slutter å dikte.~~ **Ferdig 24. august.**
- **Port: sjekke «Overganger» med ekte tall** ved ditt første bytte. Du
  bytter ikke i runde 2 (besluttet 28. august), så til da viser siden
  tomtilstanden — og det er riktig: du har null bytter.
- **Kostnaden følges løpende av deg** (besluttet 28. august): den stille
  måleuka er droppet, du ser tokenforbruket i console.anthropic.com i
  stedet. AI-prisen går opp 50 % 1. september; budsjettet appen er
  bygget for er ca. 49–53 AI-kall i uka.
- ~~**v1.2.5** — rundebriefen blir ærligere.~~ **Ferdig 24. august.**
- ~~**v1.3.0** — nye farger og temavalg.~~ **Ferdig 24. august.**
- ~~**v1.3.1** — klubbmerker og drakter.~~ **Ferdig 24. august.**
- ~~**v1.3.2** — finpuss på alle sider.~~ **Ferdig 24. august.**
- ~~**v1.3.3** — rettelser fra din gjennomgang.~~ **Ferdig 24. august**
  (kontrollert i drift 25. august).
- ~~**v1.3.4** — ingen venting på AI-tekstene.~~ **Ferdig 25. august.**
- ~~**v1.3.5** — appen avslutter ryddig ved utrulling.~~ **Ferdig 25. august.**
- ~~**v1.3.6** — vedlikeholdsbanneret henger ikke, og du får en forklarende
  side hvis FPL oppdaterer akkurat da.~~ **Ferdig 25. august.**
- ~~**v1.3.7 — auto-briefen kan ikke sendes to ganger.**~~ **Ferdig
  26. august** — lagringsplassen kom på plass og versjonen er ute.
- ~~**v1.3.8 og v1.4.0** — de to siste småfiksene: nyhetsfilteret slutter
  å kaste gyldige punkter der et navn står i eieform («Haalands»), og
  sidene sier fra hvis tallene de viser er blitt gamle fordi FPL ikke
  svarer.~~ **Ferdig og ute 28. august.**
- ~~**v1.5.0** — helt ny «Overganger»-side (bestilt av deg 26. august).~~
  **Ferdig og ute 28. august.** Alt du ba om er med: bytter som brettes ut
  runde for runde, sesongkort, hva hvis-planlegger med regelsjekk, lagrede
  planer med oppfølging, alternativ-forslag, «laget uten bytter»,
  prisgevinst og AI-kommentar én gang i døgnet.
- ~~**v1.6.0** — liga-pakka (rival-radar, sesonggraf, kaptein-liga og
  «Rundens rapport» til Discord etter hver runde).~~ **Ferdig og ute
  28. august** — rapporten for runde 1 lå klar på Miniligaer-siden samme
  dag; se etter den i Discord-kanalen også.
- **Neste: «Innsikt»-siden (v1.7.0).** Poeng du la igjen på benken,
  kapteinsfasit, flaks-barometer og rundens lag mot ditt. Deretter
  spiller-pakka (spillerkort ved klikk på navn, sammenlign spillere,
  differensial-finner, hvem tar straffene), og til slutt
  planleggingspakka (beste chip-vindu, automatisk sjekk av laget ditt
  3 timer før deadline, kalender-abonnement med deadlines og kampene
  dine). Bygges pakke for pakke — én plan-økt per pakke først.

## Ting bare du kan gjøre

To ting står i kø akkurat nå (ferdige prompts til Claude in Chrome ligger
i chatten):

1. **Kjør `kill 1`** i Coolifys terminal for appen. Det er den siste
   kontrollen på at v1.3.5 gjør jobben: loggen skal si «SIGTERM mottatt —
   lukker serveren» og «Serveren lukket ryddig», og appen skal starte igjen
   av seg selv.
2. **Se appen på telefonen** og si fra om noe ser rart ut — særlig de nye
   sidene «Overganger» og «Miniligaer».

- ~~Gjør minst ett bytte før fredag 19:30.~~ **Utgår** — du bestemte
  28. august at du ikke bytter i runde 2. «Overganger» sjekkes mot ekte
  tall ved ditt første bytte, når det enn kommer.

- ~~Legge til lagringsplass i Coolify og si «push».~~ **Gjort 26. august**
  — v1.3.7 er ute.

- ~~Sjekke i Discord-kanalen at auto-briefen faktisk kom torsdag 20. august
  ~19:30.~~ **Gjort 25. august** — den kom presis, 24 timer før deadline,
  med hele briefen på norsk. Ingenting mer å sjekke der.
- Se appen på telefonen din og si fra om noe ser rart ut.
- ~~Skjermbilder til README.~~ **Gjort 26. august** — tatt automatisk og
  lagt inn i README.

## Idéer på vent (ikke planlagt, sniker ikke i køen)

- ~~AI som kommenterer overgangsanalysen din~~ — kommer i «Overganger»-siden
- Varsel når spillerprisene endrer seg
- E-postvarsling som alternativ til Discord
- Live bonuskamp (topp 3 bonuskandidater per kamp mens de spilles)
- «FPL-karrieren din»: tidligere sesonger med rekorder
- Merkedager/badges («beste runde noensinne», «3 grønne piler på rad»)
- Appen som egen app på mobilen (PWA)
