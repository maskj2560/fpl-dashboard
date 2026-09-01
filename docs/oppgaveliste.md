# Oppgaveliste — QA i Claude for Chrome + kjøreprompter til Claude Code

> Full oversikt per **1. september 2026**, etter tabellfiksen i økt 51.
> **Del A** er prod-QA som Claude for Chrome gjør i nettleseren — én prompt
> per oppgave, kopier hele blokka.
> **Del B** er kjøreprompter til Claude Code (koden).
> **Del C** er rekkefølgen, **Del D** det som ikke kan delegeres.
> Langsiktig prioritering bor i `ROADMAP.md`, nåtilstand i `docs/HANDOVER.md`.

## Status akkurat nå

- Ute i prod: **v1.8.1** + tabellfiksen fra økt 51 (uutgitt, ligger under
  `[Unreleased]` i CHANGELOG).
- Ny asset-hash på `main`-toppen: **`3eef00bb`** (v1.8.1 hadde `51d1bbb4`).
- `main` er grønn: **615/615 tester, lint 0**.
- To uutgitte lokale docs-commits (`7393c6c`, `bb72471`). Blir med neste push.
- Aldri push torsdag 19:00–21:00 (auto-briefen ~19:30), aldri mens kamper
  pågår.

---

## Del A — QA i nettleseren (Claude for Chrome)

**Før du starter:** åpne https://fpl.marsk.no i en fane og gi Claude tilgang
til den. Alle A-promptene er **kun lesing** — Claude skal ikke endre
innstillinger, ikke logge inn noe sted, og ikke røre Coolify.

Temabryteren ligger i topbaren (sol/måne). Valget lagres i
`localStorage['fpl-theme']`, så be alltid om at begge temaer sjekkes.

### A1. Er ny CSS faktisk ute? `[gjør denne først]`

```text
Åpne https://fpl.marsk.no/style.css og søk i teksten etter «th.num».

Rapporter:
1. Finnes regelen «table.data th.num { text-align: right; }» i filen? Ja/nei.
2. Finnes «table.data.data--fit»? Ja/nei.
3. Åpne så https://fpl.marsk.no/innsikt og fortell meg hele URL-en som
   stilarket lastes fra (den står i <link>-taggen i sidens HTML, med en
   ?v=-parameter bakerst).

Forventet: ja på 1 og 2, og ?v=3eef00bb i punkt 3. Får du «nei» eller en
annen hash, si det rett ut — da serverer Cloudflare gammel CSS. Prøv én
hard refresh (Ctrl+Shift+R) og rapporter på nytt.

Ikke endre noe på siden. Bare rapporter.
```

### A2. Tabellhodene på alle sider

```text
Kontekst: jeg fikset nettopp at tabellhoder over tallkolonner sto til
venstre mens tallene sto til høyre, så tallet så ut til å høre til
nabokolonnen. Fiksen gjelder alle sider. Nå vil jeg vite om den holder.

Gå gjennom disse sidene på https://fpl.marsk.no:
/innsikt, /liga, /live, /overganger, /spillere

For hver side, for HVER tabell med tallkolonner:
- Står kolonneoverskriften rett over tallene sine, eller er den forskjøvet
  mot en annen kolonne?
- Er det tall som ser ut til å ligge under feil overskrift?

Sjekk spesielt på /innsikt, kortet «Benkesløsing»:
- Tallet under «På benken» skal stå rett under den overskriften.
- Tabellen skal IKKE strekke seg over hele kortbredden.
- Chip-kolonnen skal vise «–» i runder uten chip, ikke stå tom.
- Raden «Sum sesongen» skal være borte så lenge bare én runde er
  ferdigspilt.
- Den grå forklaringsteksten over tabellen skal bryte etter ca. 78 tegn,
  ikke gå i én lang linje tvers over skjermen, og det skal være luft mellom
  teksten og tabellhodet.

Gjør hele runden to ganger: én gang i mørkt tema og én gang i lyst
(temabryteren er sol/måne-knappen i toppmenyen).

Rapporter som en liste: side | tema | hva som er galt | hvor på siden.
Finner du ingenting galt på en side, skriv «OK». Ikke endre noe.
```

### A3. `/spillere` etter redesignen (v1.8.1)

```text
Gå til https://fpl.marsk.no/spillere. Denne siden ble redesignet uten at
jeg fikk sett den, så jeg vil ha en grundig gjennomgang. Kun lesing og
klikking — ikke endre innstillinger.

Sjekk:
1. Fanene øverst (Tabell · Differensialer · Dødballtakere): bytter de
   innhold når du klikker? Bytter piltast venstre/høyre fane når en fane
   har fokus? Åpner /spillere#differensialer riktig fane direkte?
2. Tabellen: er annenhver rad stripet? Bruk et filter (f.eks. velg en
   posisjon eller skriv i søkefeltet) og sjekk at stripene fortsatt går
   annenhver SYNLIGE rad — ikke hopper i mønsteret.
3. Fanen Differensialer: bytter velgeren 5 % / 10 % / 15 % faktisk
   innholdet i tabellen? (Den var i stykker i forrige versjon.) Er det en
   tynn søyle bak score-tallet, og er den lengst på øverste rad?
4. Fanen Dødballtakere: vises klubbene som kort i et rutenett, med
   klubbmerke og rollene under hverandre?
5. Duell-linja: er «Sammenlign» den grønne knappen, og er den deaktivert
   til to spillere er krysset av?

Gjenta i begge temaer. Rapporter: hva som virker, og hva som ikke virker,
med hvilken fane og hvilket tema. Skjermbilde av alt som ser galt ut.
```

### A4. Spillerkortet og duellen (v1.8.0)

```text
På https://fpl.marsk.no/spillere, test disse interaksjonene og rapporter
hva som faktisk skjer:

Spillerkortet:
1. Klikk på et spillernavn i tabellen — åpnes det et kort med drakt,
   nøkkeltall, dødballroller, siste fem runder og neste tre kamper?
2. Lukk med ×-knappen. Åpne igjen, lukk med Esc. Åpne igjen, lukk ved å
   klikke utenfor kortet.
3. Etter lukking: står tastaturfokus tilbake på spillernavnet du klikket?
   (Trykk Tab én gang og se hvor fokusrammen havner.)

Duellen:
4. Kryss av to spillere. Prøv å krysse av en tredje — den skal avvises.
5. Med to valgte: filtrer bort den ene (søk etter noe annet). Forsvinner
   haken?
6. Velg to på nytt og sorter tabellen på en kolonne. Beholdes valget?
7. Trykk «Sammenlign» — kommer nøkkeltallene side ved side, med beste
   verdi uthevet?

Rapporter punkt for punkt: forventet vs. hva som skjedde. Skjermbilde der
noe avviker.
```

### A5. Mobilvisning, 390 px

```text
Sett vindusbredden til ca. 390 px (eller bruk Chromes mobilvisning,
iPhone-format) og gå gjennom disse sidene på https://fpl.marsk.no:
/overganger, /liga, /innsikt, /spillere

For hver side:
1. Er det vannrett scroll på SELVE SIDEN? (Det skal det ikke være — bare
   tabellene skal kunne dras sidelengs.)
2. Toppmenyen har 9 punkter: kan den dras sidelengs, og ser du en
   fade-kant som antyder at det er mer å scrolle til?
3. Er det tekst eller tall som klippes, overlapper eller går utenfor
   kortet?
4. På /spillere: fungerer avkryssingskolonnen, spillerkortet og duellen
   like bra som på desktop?

Begge temaer. Rapporter: side | tema | problem | skjermbilde.
```

### A6. Rask helsesjekk av API-et

```text
Åpne disse og rapporter hva de svarer:
1. https://fpl.marsk.no/health — hvilke funksjoner står som true/false?
2. https://fpl.marsk.no/api/brief.json — finnes feltet «dataAlder», og hva
   er verdien i sekunder?
3. https://fpl.marsk.no/finnesikke — kommer det en 404-side på norsk, ikke
   en stygg standardfeil?

Bare rapporter det du ser. Ikke endre noe.
```

---

## Del B — kjøreprompter til Claude Code

Kopier **hele** blokka inn i en **ny** Claude Code-økt (`/clear` først).
Én oppgave per økt.

### B1. QA-funn → fikser

Bruk denne når Del A har gitt funn. Lim inn rapporten fra Claude for Chrome.

```text
Les docs/HANDOVER.md og CLAUDE.md først.

Jeg har QA-et prod med Claude for Chrome. Rapporten:

<lim inn rapporten her>

Oppgave: fiks funnene, ett og ett, i den rekkefølgen de står.

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

1. **A1** i Claude for Chrome — uten den vet du ikke om du QA-er ny eller
   gammel CSS.
2. **A2 → A3 → A4** i samme Chrome-økt. Ta vare på rapporten.
3. **A5** (mobilbredde) og **A6** (API-sjekk) når du vil.
4. Har Del A gitt funn: **B1** i Claude Code.
5. **B2** (planøkt v1.9.0) → godkjenn planen → **B3** (bygg).
6. **B4** når du orker, **B5** etter ditt første ekte bytte.

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
