# Oppgaveliste — QA i Claude for Chrome + kjøreprompter til Claude Code

> Full oversikt per **1. september 2026**, etter tabellfiksen i økt 51.
> **Del A** er én samlet prompt til Claude for Chrome som QA-er hele prod
> og rapporterer tilbake.
> **Del B** er kjøreprompter til Claude Code (koden).
> **Del C** er rekkefølgen, **Del D** det som ikke kan delegeres.
> Langsiktig prioritering bor i `ROADMAP.md`, nåtilstand i `docs/HANDOVER.md`.

## Status akkurat nå

- Ute i prod: **v1.8.1** + tabellfiksen fra økt 51 (uutgitt, ligger under
  `[Unreleased]` i CHANGELOG).
- Ny asset-hash på `main`-toppen: **`3eef00bb`** (v1.8.1 hadde `51d1bbb4`).
- `main` er grønn: **615/615 tester, lint 0**.
- Tre uutgitte lokale docs-commits. Blir med neste push.
- Aldri push torsdag 19:00–21:00 (auto-briefen ~19:30), aldri mens kamper
  pågår.

---

## Del A — full prod-QA i én prompt (Claude for Chrome)

Åpne https://fpl.marsk.no i en fane, gi Claude tilgang til den, og lim inn
hele blokka under. Den dekker alle seks sjekkene og ber om én samlet
rapport til slutt. Blir økta for lang, kan du kjøre steg 1–3 i én runde og
steg 4–6 i neste.

```text
Du skal gjøre en visuell QA av et Fantasy Premier League-dashbord som
kjører i prod på https://fpl.marsk.no. Det er mitt eget selvhostede
dashbord.

Regler for hele oppdraget:
- Alt er lesing. Ikke endre innstillinger, ikke logg inn noe sted, ikke
  fyll ut skjemaer, ikke prøv å fikse noe.
- Du SKAL bruke temabryteren (sol/måne-ikonet i toppmenyen) for å bytte
  mellom mørkt og lyst tema, og du kan klikke, sortere, filtrere og
  scrolle — det er slik UI-et testes.
- Ta skjermbilde av alt som ser galt ut.
- Rapporter samlet TIL SLUTT i formatet nederst, ikke underveis.
- Får du ikke testet noe (siden laster ikke, elementet finnes ikke), si
  det eksplisitt i stedet for å gjette.

STEG 1 — Er ny CSS ute?
a) Åpne https://fpl.marsk.no/style.css og søk i teksten etter «th.num».
   Finnes regelen «table.data th.num { text-align: right; }»? Ja/nei.
b) Finnes «table.data.data--fit» i samme fil? Ja/nei.
c) Åpne https://fpl.marsk.no/innsikt og fortell meg hele URL-en stilarket
   lastes fra — den står i <link>-taggen i sidens HTML og har en
   ?v=-parameter bakerst.
Forventet: ja på a og b, og ?v=3eef00bb i c. Er hashen en annen, prøv én
hard refresh (Ctrl+Shift+R) og sjekk på nytt. Er den fortsatt feil,
noter det som BLOKKERER og fortsett likevel med resten.

STEG 2 — Tabellhoder på alle sider (begge temaer)
Jeg fikset nettopp at kolonneoverskrifter over tallkolonner sto til
venstre mens tallene sto til høyre, slik at tallet så ut til å høre til
nabokolonnen. Fiksen gjelder alle sider.
Gå gjennom /innsikt, /liga, /live, /overganger og /spillere. For hver
tabell med tallkolonner: står overskriften rett over tallene sine, eller
er den forskjøvet mot en annen kolonne?
På /innsikt, kortet «Benkesløsing», sjekk i tillegg:
- tallet under «På benken» står rett under den overskriften
- tabellen strekker seg IKKE over hele kortbredden
- chip-kolonnen viser «–» i runder uten chip, ikke tom celle
- raden «Sum sesongen» er BORTE så lenge bare én runde er ferdigspilt
- den grå forklaringsteksten bryter etter ca. 78 tegn i stedet for å gå i
  én lang linje tvers over skjermen, og det er luft mellom teksten og
  tabellhodet
Gjør hele runden i mørkt tema og deretter i lyst.

STEG 3 — /spillere etter redesignen
Siden ble redesignet uten at jeg fikk sett den. Sjekk:
a) Fanene Tabell · Differensialer · Dødballtakere: bytter de innhold ved
   klikk? Bytter piltast venstre/høyre fane når en fane har fokus? Åpner
   /spillere#differensialer riktig fane direkte?
b) Tabellen: er annenhver rad stripet? Bruk et filter (posisjon eller
   søkefelt) og sjekk at stripene fortsatt går annenhver SYNLIGE rad.
c) Differensialer: bytter velgeren 5 % / 10 % / 15 % faktisk innholdet i
   tabellen? Er det en tynn søyle bak score-tallet, og er den lengst på
   øverste rad?
d) Dødballtakere: vises klubbene som kort i et rutenett, med klubbmerke og
   rollene under hverandre?
e) Duell-linja: er «Sammenlign» den grønne knappen, og er den deaktivert
   til to spillere er krysset av?
Begge temaer.

STEG 4 — Spillerkortet og duellen
På /spillere, test og rapporter hva som faktisk skjer:
a) Klikk et spillernavn — åpnes et kort med drakt, nøkkeltall,
   dødballroller, siste fem runder og neste tre kamper?
b) Lukk med ×. Åpne igjen, lukk med Esc. Åpne igjen, lukk ved klikk
   utenfor kortet.
c) Etter lukking: står tastaturfokus tilbake på navnet du klikket? (Trykk
   Tab én gang og se hvor fokusrammen havner.)
d) Kryss av to spillere. Prøv en tredje — den skal avvises.
e) Med to valgte: filtrer bort den ene. Forsvinner haken?
f) Velg to på nytt, sorter tabellen på en kolonne. Beholdes valget?
g) Trykk «Sammenlign» — kommer nøkkeltallene side ved side med beste
   verdi uthevet?

STEG 5 — Mobilvisning, 390 px
Sett vindusbredden til ca. 390 px (eller Chromes mobilvisning,
iPhone-format) og gå gjennom /overganger, /liga, /innsikt og /spillere:
a) Har SELVE SIDEN vannrett scroll? Det skal den ikke ha — bare tabellene
   skal kunne dras sidelengs.
b) Toppmenyen har 9 punkter: kan den dras sidelengs, og ser du en
   fade-kant som viser at det er mer?
c) Klippes, overlapper eller flyter tekst og tall utenfor kortene?
d) På /spillere: fungerer avkryssingskolonnen, spillerkortet og duellen
   like bra som på desktop?
Begge temaer.

STEG 6 — Rask API-sjekk
a) https://fpl.marsk.no/health — hvilke funksjoner står som true/false?
b) https://fpl.marsk.no/api/brief.json — finnes feltet «dataAlder», og hva
   er verdien i sekunder?
c) https://fpl.marsk.no/finnesikke — kommer det en 404-side på norsk?

RAPPORT (avslutt med denne, i denne rekkefølgen)
1. Statuslinje per steg: «STEG n — OK» / «STEG n — AVVIK» / «STEG n — IKKE
   TESTET (grunn)».
2. Funnliste, ett funn per linje, nummerert, i dette formatet:
   [ALVORLIGHET] side | tema | bredde | forventet | faktisk
   ALVORLIGHET er BLOKKERER, VIKTIG eller KOSMETISK.
3. Skjermbildene, merket med funnnummer.
4. Til slutt: hva som så bra ut, kort.
Ikke foreslå kodefiks og ikke gjett på årsak — jeg tar rapporten videre
til utvikleren.
```

---

## Del B — kjøreprompter til Claude Code

Kopier **hele** blokka inn i en **ny** Claude Code-økt (`/clear` først).
Én oppgave per økt.

### B1. QA-funn → fikser

Bruk denne når rapporten fra Del A er klar. Lim inn funnlista.

```text
Les docs/HANDOVER.md og CLAUDE.md først.

Jeg har QA-et prod med Claude for Chrome. Rapporten:

<lim inn funnlista her>

Oppgave: fiks funnene, ett og ett, i den rekkefølgen de står — BLOKKERER
først, så VIKTIG, så KOSMETISK.

Krav:
- Jobb på en egen branch, ikke på main.
- Reproduser hvert funn i koden FØR du fikser: vis meg hvilken linje som
  forårsaker det. Ikke gjett ut fra beskrivelsen.
- Er et funn feilrapportert (siden er faktisk riktig), si det og hopp over
  det — ikke fiks noe som ikke er i stykker.
- Test først der det er logikk (rød før grønn). Ren CSS/tekst trenger ikke
  test, men si eksplisitt hvorfor.
- CHANGELOG-linje under [Unreleased] i samme commit som endringen.
- Conventional commits, én commit per funn.
- npm test og npm run lint grønne til slutt — vis meg outputen.
- STOPP før merge og push. Jeg godkjenner selv.
```

### B2. Planøkt for v1.9.0 «Planleggingspakka»

```text
Les docs/HANDOVER.md, CLAUDE.md og køpunkt 5 i ROADMAP.md
(docs/plan-idepakken-v16-v19.md har den opprinnelige idébeskrivelsen).

Oppgave: skriv detaljplanen for v1.9.0 «Planleggingspakka»
(chip-planlegger, deadline-sjekk, kalender-feed). INGEN kode i denne økta.

Krav:
- Still meg spørsmålene dine i runder på maks 4 av gangen, med din
  anbefaling først i hvert spørsmål.
- Planen skal ha: datamodell, hvilke FPL-endepunkter som brukes og med
  hvilken cache-TTL, hvilke filer som opprettes/endres, tasks T1..Tn i
  rekkefølge med test-først for hver, og et beslutningsfasit til slutt.
- Regn ut AI-kostnaden: pakka skal koste 0 nye AI-kall med mindre jeg
  eksplisitt sier ja til noe annet.
- Legg planen i docs/plan-planleggingspakka-v190.md og oppdater
  ROADMAP.md + docs/HANDOVER.md.
- Til slutt: skriv en kjøreprompt jeg kan gi til en ny økt for byggingen.
```

### B3. Byggeøkt for v1.9.0

Brukes når planen fra B2 er godkjent.

```text
Les docs/HANDOVER.md, CLAUDE.md og docs/plan-planleggingspakka-v190.md.

Oppgave: bygg v1.9.0 etter den godkjente planen, task for task.

Krav:
- Verifiser baseline (npm test + npm run lint) på main FØR du starter, og
  vis meg tallene.
- Egen branch: feat/planleggingspakka-v190.
- TDD strengt: skriv testen, vis at den er rød, så koden, så grønn.
- Én conventional commit per task, med CHANGELOG-linje i samme commit.
- Ingen nye avhengigheter.
- Røyktest til slutt med tomme AI-nøkler: appen skal fungere og gjøre 0
  AI-kall.
- STOPP etter sluttkontrollen. Ingen merge, ingen tag, ingen push.
```

### B4. Småting-økt (når som helst)

```text
Les docs/HANDOVER.md og CLAUDE.md.

Tre småting:
1. Slett de gamle lokale branchene (git branch -d) — behold main.
2. Push de uutgitte docs-commitene som ligger lokalt.
3. Foreslå om fiksene under [Unreleased] i CHANGELOG bør slippes som
   v1.8.2 nå, eller ri med på v1.9.0. Anbefaling først, så gjør det jeg
   velger.

Sjekk deploy-vinduet FØR eventuell push: aldri torsdag 19-21, aldri mens
kamper pågår.
```

### B5. P3 — verifiser transfers-skjemaet (etter ditt første ekte bytte)

```text
Les docs/HANDOVER.md, CLAUDE.md og køpunkt 2 i ROADMAP.md.

Jeg har nå gjort mitt første ekte bytte. Oppgave: verifiser at feltnavnene
vi antar i entry/5330646/transfers/ (element_in, element_out, event, time,
event_transfers_cost) stemmer mot ekte API-data, og at /overganger viser
byttet riktig — inkludert prisgevinst og gratisbytte-regnskapet.

Krav:
- Vis meg det rå API-svaret (forkortet) som bevis, ikke bare konklusjonen.
- Avvik fikses som fix:-commit på egen branch med test.
- Kryss av P3 i ROADMAP.md og oppdater docs/HANDOVER.md.
- STOPP før merge og push.
```

---

## Del C — rekkefølge

1. **Del A** i Claude for Chrome — én prompt, hele QA-en, samlet rapport.
2. Ga rapporten funn: **B1** i Claude Code.
3. **B2** (planøkt v1.9.0) → godkjenn planen → **B3** (bygg).
4. **B4** når du orker, **B5** etter ditt første ekte bytte.

## Del D — det som ikke kan delegeres

- **SIGTERM-beviset (v1.3.5):** Coolify → containerterminalen → `kill 1`.
  Forventet i loggen: «SIGTERM mottatt — lukker serveren» og «Serveren
  lukket ryddig». Dette restarter prod-containeren — gjør det selv, ikke
  la en agent gjøre det.
- **Kostnad:** `console.anthropic.com`, forbruk siste uke. Budsjett
  **~49–53 AI-kall/uke**; metode og terskler i
  `docs/sjekkpunkt-d-kostnad.md`. `/innsikt` og `/spillere` skal koste 0.
- **Godkjenning av merge/tag/push.** Claude Code stopper alltid før det.

## Regler som gjelder alle øktene

- Push til `main` = deploy til prod. Aldri torsdag 19–21, aldri under kamp.
- `npm test` + `npm run lint` grønne før noe regnes som ferdig — be alltid
  om å se outputen, ikke bare påstanden.
- Hver brukersynlig endring skal ha en CHANGELOG-linje i samme commit.
- Nærmer økta seg usage-grensa: be om at `docs/HANDOVER.md` oppdateres og
  alt committes, før du åpner ny økt.
