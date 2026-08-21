# Oppdrag (Fable, plan mode): riktige anbefalinger på /lag ved sesongstart (B-1…B-3)

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
ingen database, prod på https://fpl.marsk.no via Coolify, auto-deploy ved
push til `main`).

**Arbeidsdeling:** DU (Fable) planlegger i plan mode og får planen godkjent
av Marius. **Opus 5 gjennomfører** i en egen økt. Når planen er godkjent
skal du lage en KORT overleveringsprompt Marius kan lime inn i Opus 5-økten
(se «Leveranser» nederst). Du skriver ikke produksjonskode selv.

## Les først

1. `docs/HANDOVER.md` — status og aktive økter. **Sesongstart-verifiseringen
   (M4) pågår.** Sjekkpunkt A og B er kjørt; C (lørdag, live-polling) og D
   (søndag/mandag, kostnad + avslutning) gjenstår. Ikke forstyrr dem.
2. `CLAUDE.md` — arkitekturregler. Gjelder foran alt annet i denne prompten.
3. `src/services/analysis.js` linje 222–240 (`captainSuggestions`),
   243–258 (`transferOutCandidates`), 264–282 (`transferInCandidates`),
   linje 100 (`topForm`-filteret — samme gardemønster).
4. `src/routes/team.js` — hele fila (94 linjer). Særlig linje 25–29
   (`Promise.all`), 44 (`fromGw`), 76–88 (`renderPage`).
5. `src/routes/api.js` linje 36–70 — `POST /api/ai-rad`.
6. `src/services/prompts.js` linje 40–53 — `buildAdvicePrompt`.
7. `views/team.ejs` linje 2–3 (undertittel) og 70–90 (Kapteinsvalg-boksen).
8. `test/analysis.test.js` linje 223 og 487 — eksisterende tester for
   `captainSuggestions`.
9. `ROADMAP.md` → «v1.2.0-kandidater» (fra linje 185).

## Bakgrunn: hvordan funnene ble gjort

Funnene kom ut av **sjekkpunkt B** fredag 21. august ca. kl. 20:20, altså
under første ekte runde med låst tropp. Marius så på `/lag` i prod og sa at
anbefalingene «ikke gir helt mening». Det stemte. Alt under er verifisert mot
kjørende prod og mot koden — men **du skal verifisere det på nytt selv**, ikke
stole på denne prompten som fasit.

## Verifiserte fakta (ikke bruk AI-kall eller gjetting på å utlede disse på nytt)

- Bootstrap kl. 20:20 fredag: GW1 `is_current=true`, `is_next=false`,
  `finished=false`. GW2 `is_next=true`. Alle spillere har `form "0.0"` og
  `minutes 0` fram til første kamp er spilt.
- `fromGw = nextEvent(events)?.id ?? gw` gir derfor **2** både i
  `team.js:44` og `api.js:54`. Anbefalingene gjelder altså Runde 2.
- `team.js` sender `gw` (= 1) til viewet, men **ikke** `fromGw`.
- `views/team.ejs:3` skriver «· Runde <%= gw %>» → «· Runde 1».
- `POST /api/ai-rad` henter allerede `picks` og `fixtures` (api.js:46–50).
  `picks.picks[].is_captain` og FDR er altså tilgjengelig **uten et eneste
  nytt nettverkskall**.
- Cache-nøkkelen er `ai-rad-${teamId}-gw${fromGw}`, minimumsintervall 1 time.

## Funn B-1 — kapteinslista er falsk rangering ved sesongstart (viktigst)

`analysis.js:230`:

```js
const score = (parseFloat(p.form) || 0) * ease * probability;
```

Når hele troppen har `form 0.0` blir **score 0 for alle**. `Array.sort` er
stabil i V8, så en komparator som alltid returnerer 0 lar rekkefølgen stå
urørt. Resultatet er at «topp 3 kapteiner» i praksis er *de tre første
utespillerne i pick-rekkefølge*.

Observert i prod: «1. Shaw, 2. Gvardiol, 3. Calafiori» — nøyaktig pick-posisjon
2, 3 og 4 — mens Haaland (15.5m, faktisk kaptein) ikke er nevnt. Alle tre viser
«Form 0.0» i begrunnelsen sin. Ingen rangering har skjedd, men UI-et
presenterer det som en nummerert anbefaling.

**Nabofunksjonene gjør dette riktig — bruk dem som mønster:**

- `transferOutCandidates` (linje 252) har `form < 2.5 && p.minutes > 0` →
  flagger ingen falske salgskandidater før noen har spilt.
- `transferInCandidates` (linje 273) filtrerer på `p.minutes > 0` → returnerer
  tom liste ved sesongstart, som gir korrekt tomtilstand.

`captainSuggestions` er den eneste av de tre uten en slik garde.

**Din oppgave:** planlegg hvordan lista skal oppføre seg når rangeringen ikke
er meningsbærende. Vurder minst disse, og anbefal én:

1. Tomtilstand: returner tom liste når alle scorer er 0, og la viewet vise en
   forklarende tekst («Ingen rangering mulig før første kamp er spilt»).
2. Fallback-kriterium: ranger på `ep_next` (FPLs egen forventet-poeng) eller
   pris når form mangler — men da **må** begrunnelsen si hvilket kriterium som
   ble brukt, ellers flytter vi bare løgnen.
3. Behold lista, men merk den tydelig som urangert.

Vurder også om garden skal være «alle scorer er 0» eller «ingen i troppen har
`minutes > 0`». De to er ikke ekvivalente utenfor sesongstart (en tropp der
alle er skadet/formløse i GW20 gir også score 0). Argumenter for valget.

## Funn B-2 — AI-rådgiveren mangler kontekst

`buildAdvicePrompt` (prompts.js:40–53) får kun lagnavn, bank, tropplinjer
(navn, lag, posisjon, pris, form) og flaggede salgskandidater.

Den får ikke — med observert konsekvens i svaret Marius fikk:

| Mangler | Konsekvens i det faktiske svaret |
| --- | --- |
| Hvilken runde rådet gjelder | «Sjekk startoppstillinger … nærmere deadline» på en side som sier Runde 1, der deadline var passert |
| Hvem som allerede ER kaptein | Anbefalte Haaland — som allerede var satt som kaptein |
| Kamper/motstander/FDR | Modellen skrev selv: «Med all form satt til 0.0 må jeg bruke prisen som proxy» |
| Antall gratis bytter | Hedget: «spesielt siden det vil koste deg poeng hvis du ikke har et gratis bytte tilgjengelig» |

De tre første kan fikses uten nye nettverkskall (se verifiserte fakta over).
Det fjerde krever at du finner ut hvor antall gratis bytter faktisk ligger i
FPL-API-et — **slå det opp, ikke gjett feltnavnet.** Finner du det ikke
gratis, er det legitimt å utelate det og heller instruere modellen til å ikke
spekulere om bytter den ikke har data på.

**Kostnadsgate:** promptendringer kan bare verifiseres med ekte AI-kall.
Budsjettet under verifiseringen er ~3 kall, hvorav **1 er brukt**. Planen din
må derfor si eksplisitt hvor mange AI-kall utførelsen trenger, og legge dem
etter sjekkpunkt D. Test alt som kan testes uten kall (prompt-strengen er en
ren funksjon — snapshot-test den).

## Funn B-3 — runde-forvirring i UI-et

Siden viser Runde 1-troppen med overskriften «· Runde 1», mens Kapteinsvalg,
«Vurder å selge» og AI-rådgiveren alle gjelder Runde 2. Logikken er riktig;
kommunikasjonen er det ikke.

Enkleste fiks: send `fromGw` til viewet og skriv «Anbefalinger for Runde N»
over anbefalingsboksene. Vurder om det skal stå på hver boks eller én gang.
Merk at `fromGw === gw` i deler av sesongen (før deadline i inneværende
runde) — teksten må være riktig i begge tilfeller.

## Rammer og harde regler

- **Branch:** `fix/lag-anbefalinger`, ut fra `main`. **Aldri push.** Ingen
  merge før sjekkpunkt D er lukket og Marius gir klarsignal.
- **Aldri deploy torsdag 19:00–21:00** (auto-briefen sendes ~19:30).
- Ikke rør oppførsel som sjekkpunkt C observerer: live-polling i
  `public/app.js`, auto-brief-scheduleren i `notify.js`, `gameUpdating`-banneret
  i `fplClient.js`.
- **TDD:** rødt observert før grønt. `node:test`, ingen nettverkskall i
  tester, ingen ekte timere. Utvid `test/analysis.test.js`; legg til
  `test/prompts.test.js`-dekning for prompt-strengen.
- Ingen nye avhengigheter.
- All UI-tekst på norsk bokmål.
- `npm test` + `npm run lint` grønt før hver commit.
- Conventional commits. `CHANGELOG.md` under `[Unreleased]` i samme commit som
  endringen. `ROADMAP.md`: flytt/oppdater B-1…B-3 fra «v1.2.0-kandidater».
- Bevis for alt: kommando + faktisk output. Ingen «burde nå fungere».

## Merk: HANDOVER er divergert

`docs/HANDOVER.md` finnes i to versjoner. Den nyeste ligger på branchen
`fix/sanitize-brief` (sjekkpunkt A lukket der, P3-4 utført). Branchen
`docs/plan-ui-overhaul` har en eldre. `main` er 10 commits foran
`origin/main`, upushet. **Avklar med Marius hvilken versjon som er sannheten
før du skriver HANDOVER-oppdateringer inn i planen** — ellers lager
utførelsen en tredje divergens.

## Åpne beslutninger du skal legge fram for Marius

Still dem samlet til slutt i planen, med din anbefaling til hver:

1. B-1: tomtilstand, fallback-kriterium, eller «merket som urangert»?
2. B-1: garde på «alle scorer 0» eller «ingen har spilt minutter»?
3. B-2: skal antall gratis bytter med, hvis det koster et ekstra API-kall?
4. B-3: rundetekst på hver boks eller én gang øverst?
5. Skal dette bli v1.2.2, eller vente og gå inn i v1.3.0 (UI-overhalingen)?
   Merk at v1.3.0-planen uansett rører `views/team.ejs`.

## Leveranser

1. Godkjent plan lagret som `docs/plan-lag-anbefalinger.md` — med de fem
   beslutningene, TDD-stegene, forventet testantall før/etter, og en eksplisitt
   telling av AI-kall utførelsen krever.
2. En KORT overleveringsprompt til Opus 5 lagret som
   `docs/neste-okt-prompt-lag-anbefalinger-utforelse.md` og limt i chatten.
   Den skal vise til planfila, ikke gjenta den.
3. `docs/HANDOVER.md` oppdatert (etter avklaringen over) med funnene B-1…B-3
   og hva som er bestemt.
4. Alt committet lokalt på `fix/lag-anbefalinger`. Ingen push.

Tiltale: **Marius**. Start svarene med «Hei Marius!».
