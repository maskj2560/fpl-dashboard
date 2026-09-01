# Oppgaveliste — hva Marius gjør, og hva Claude Code får

> Full oversikt per **1. september 2026**, etter tabellfiksen i økt 51.
> Del A er det bare du kan gjøre (prod-QA, telefon, container).
> Del B er ferdige kjøreprompter — kopier hele blokka inn i en **ny**
> Claude Code-økt. Del C er rekkefølgen.
> Langsiktig prioritering bor i `ROADMAP.md`, nåtilstand i `docs/HANDOVER.md`.

## Status akkurat nå

- Ute i prod: **v1.8.1** + tabellfiksen fra økt 51 (uutgitt, ligger under
  `[Unreleased]` i CHANGELOG).
- Ny asset-hash på `main`-toppen: **`3eef00bb`** (v1.8.1 hadde `51d1bbb4`).
- `main` er grønn: **615/615 tester, lint 0**.
- Én uutgitt lokal commit: `7393c6c` (docs). Blir med neste push.
- Aldri push torsdag 19:00–21:00 (auto-briefen ~19:30), aldri mens kamper
  pågår.

---

## Del A — det bare du kan gjøre

### A1. Bekreft at ny CSS faktisk er ute (2 min) `[gjør først]`

1. Åpne https://fpl.marsk.no/innsikt.
2. Høyreklikk → «Vis sidekilde» (Ctrl+U).
3. Søk etter `style.css?v=` i kilden.

**Forventet:** `?v=3eef00bb`. Står det `51d1bbb4`, serverer Cloudflare
gammel CSS — hard refresh (Ctrl+Shift+R). Står det fortsatt feil, er ikke
Coolify ferdig med bygget, eller bygget feilet.

### A2. QA av tabellfiksen (5 min)

Hodene over tallkolonner flyttet seg på **alle** sider — 24 stk. Sjekk i
**begge temaer**:

- `/innsikt` — benkesløsingen: «6» skal stå rett under «På benken», ikke
  under «Unngåelig tap». Tabellen skal ikke lenger strekke seg over hele
  kortbredden. Chip-kolonnen viser «–». Sumraden «Sum sesongen» skal være
  **borte** så lenge kun én runde er ferdigspilt.
- `/liga`, `/live`, `/overganger`, `/spillere` — alle talltabeller: hodet
  skal stå rett over tallet sitt.
- Forklaringstekstene (den grå teksten under overskriftene) skal bryte på
  ~78 tegn, ikke gå i én lang linje over hele skjermen.

**Funn noteres** — de går inn i prompt B1.

### A3. QA av v1.8.1 på `/spillere` (10 min) `[aldri testet visuelt]`

v1.8.1 gikk rett i prod uten lokal visuell test. Begge temaer, desktop:

- Alle tre faner (Tabell · Differensialer · Dødballtakere), piltaster bytter
  fane, `/spillere#differensialer` åpner riktig fane direkte.
- Zebra-stripene: filtrer tabellen og sjekk at annenhver **synlige** rad er
  stripet (ikke annenhver rad i den ufiltrerte lista).
- Segmentbryteren 5/10/15 % skal faktisk bytte tabell (den var død i
  v1.8.0).
- Søylestripa bak scoren, dødballkortene, duell-linja (grønn «Sammenlign»,
  grå «Tøm valg»).

### A4. QA av v1.8.0-funksjonene (10 min)

- **Spillerkortet:** klikk et navn → kort åpnes. Lukk med × , med Esc, og
  ved klikk utenfor. Etter lukking skal tastaturfokus stå på navnet du
  klikket.
- **Duellen:** kryss av to spillere → tredje hake skal avvises. Filtrer bort
  en valgt spiller → haken fjernes. Sorter tabellen → valget beholdes.

### A5. Mobil-QA på ekte telefon, 390 px (15 min)

`/overganger`, `/liga`, `/innsikt` og `/spillere`, begge temaer.
Nav har **9 punkter** — sjekk at scrollnavet med kantfade holder, og at
tabellene scroller sidelengs uten at siden gjør det.

### A6. SIGTERM-beviset (5 min) `[siste åpne punkt fra v1.3.5]`

I Coolify: åpne containerterminalen for appen og kjør `kill 1`.

**Forventet i loggen:** «SIGTERM mottatt — lukker serveren» og
«Serveren lukket ryddig». Containeren startes automatisk på nytt.

### A7. Kostnad (løpende, 2 min i uka)

`console.anthropic.com` → forbruk siste uke. Budsjettet er **~49–53
AI-kall/uke**. Ser tallene gale ut: metode og terskler i
`docs/sjekkpunkt-d-kostnad.md`. `/innsikt` og `/spillere` skal koste 0.

---

## Del B — kjøreprompter til Claude Code

Kopier **hele** blokka. Én oppgave per økt; start alltid ny økt (`/clear`).

### B1. QA-funn → fikser

Bruk denne når A2–A5 har gitt funn. Bytt ut punktene under «Funn».

```text
Les docs/HANDOVER.md og CLAUDE.md først.

Jeg har QA-et prod og funnet dette:

Funn:
1. <side> — <hva som er galt> — <hvilket tema / skjermbredde>
2. ...
3. ...

Oppgave: fiks funnene, ett og ett, i den rekkefølgen jeg listet dem.

Krav:
- Jobb på en egen branch, ikke på main.
- Reproduser hvert funn i koden FØR du fikser: vis meg hvilken linje som
  forårsaker det. Ikke gjett.
- Test først der det er logikk (TDD: rød før grønn). Ren CSS/tekst trenger
  ikke test, men si eksplisitt hvorfor.
- CHANGELOG-linje under [Unreleased] i samme commit som endringen.
- Conventional commits, én commit per funn.
- npm test og npm run lint skal være grønne til slutt — vis meg outputen.
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
- Til slutt: skriv en kjøreprompt jeg kan gi til en ny økt for selve
  byggingen.
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

### B4. Småting-økt (kan tas når som helst)

```text
Les docs/HANDOVER.md og CLAUDE.md.

Tre småting:
1. Slett de gamle lokale branchene (git branch -d) — behold main.
2. Push den uutgitte docs-commiten som ligger lokalt.
3. Foreslå om fiksene som ligger under [Unreleased] i CHANGELOG bør
   slippes som v1.8.2 nå, eller ri med på v1.9.0. Anbefaling først, så
   gjør det jeg velger.

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

1. **A1** (2 min) — uten denne vet du ikke om du QA-er ny eller gammel CSS.
2. **A2 → A3 → A4** i én økt foran PC-en. Noter funn underveis.
3. Har du funn: **B1**. Ingen funn: hopp videre.
4. **A5** på telefonen, **A6** i Coolify-terminalen — begge kan tas når som
   helst, uavhengig av resten.
5. **B2** (planøkt v1.9.0) → godkjenn planen → **B3** (bygg).
6. **B4** når du orker, **B5** når du har gjort ditt første bytte.
7. **A7** løpende, én gang i uka.

## Regler som gjelder alle øktene

- Claude stopper alltid før merge/tag/push. Du godkjenner.
- Push til `main` = deploy til prod. Aldri torsdag 19–21, aldri under kamp.
- `npm test` + `npm run lint` grønne før noe regnes som ferdig — be alltid
  om å se outputen, ikke bare påstanden.
- Hver brukersynlig endring skal ha en CHANGELOG-linje i samme commit.
- Nærmer økta seg usage-grensa: be om at `docs/HANDOVER.md` oppdateres og
  alt committes, før du åpner ny økt.
