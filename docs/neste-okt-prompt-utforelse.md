# Prompt til utførelsesøkten — v1.0.1 → v1.1.0 (Opus 5, effort xhigh)

> Lim inn alt under streken som første melding i en ny økt i
> `c:\Users\mariu\Documents\Claude Code\FPL`.
> Denne økten skal IMPLEMENTERE — planen er ferdig og godkjent.

---

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — et selvhostet
Fantasy Premier League-dashboard i produksjon på https://fpl.marsk.no.
v1.0.0 er tagget og deployet. Push til `main` deployer RETT I PROD via
Coolify (Dockerfile, health check på `/health`).

**Oppdraget: utfør HELE implementeringsplanen i
`docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`
— i rekkefølge, task for task, uten å hoppe over verifiseringssteg.**
Planen er godkjent av meg og inneholder alt: milepæler, ferdig kode,
kommandoer og forventet output. Ikke re-planlegg, ikke redesign, og ikke
spør meg om ting planen allerede har besluttet (avklaringene står i planens
kontekst-seksjon).

## 0. Oppstart — gjør dette først, i denne rekkefølgen

1. Les disse helt, i denne rekkefølgen:
   - `docs/HANDOVER.md` — nøyaktig status + logg over alle mine beskjeder
   - `CLAUDE.md` — arkitektur, konvensjoner, FPL-API-regler, AI-kostnadsregler
   - **HELE planfilen** `docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`
     (~1330 linjer — les alt, ikke skum; hver task har kode, kommandoer og
     forventet output du skal følge)
   - Avviksnotatene i forrige plan
     `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` (grep etter
     «Avvik») — de forklarer bl.a. hvorfor `ai.js` ikke sender
     `thinking`/`effort`, og escaping-reglene i `views/live.ejs` og
     `views/news.ejs` som IKKE skal fjernes
2. Planleggingsøkten ble stoppet før commit. Kjør `git status`: er
   planfilen og `docs/neste-okt-prompt-utforelse.md` untracked, commit dem
   først: `chore: implementeringsplan og kjoreprompt v1.0.1-v1.1.0`
3. Oppdater `docs/HANDOVER.md`: status («plan v1.0.1–v1.1.0 foreligger,
   utførelse startet <dato>»), peker til planfilen, og loggfør i «Logg over
   brukerbeskjeder» avklaringene fra planleggingsøkten 2026-08-19:
   API-nøkkel klar nå · Discord-server/kanal klar · én lokal font OK ·
   rekkefølge AI/Discord først · planen kjøres i Opus 5 med effort xhigh
4. Verifiser grønt utgangspunkt og se outputen selv: `npm test` (35 grønne),
   `npm run lint` (0 feil)

## 1. Kart over planen (detaljene står i planfilen — dette er bare oversikten)

| Milepæl | Innhold | Tasks |
|---|---|---|
| M1 (v1.0.1) | AI + Discord i drift: anti-spam-guard i `notify.js` (TDD), usage-logging i `ai.js`, lokal pre-flight med ekte nøkkel, tvungen Discord-test, prod-påslåing i Coolify, naturlig auto-brief 20. aug ~19:30, kostnadskontroll | 1.1–1.7 |
| M2 | Sikkerhetsnett: view-render-tester for alle 11 views med mockdata (`test/views.test.js` + fixtures), null nye avhengigheter | 2.1 |
| M3 (v1.1.0) | UI-makeover «Matchday»: lokal Archivo-font, ny tokenpalett (kontrastverifisert med medfølgende script), én-linjes scrollbar nav, hero som broadcast-scoreboard, kort-/tabellsystem, alle sider én for én, pitch med banemerking, rank-graf med arealfyll (TDD på `rankGraph`), tom-/feiltilstander, mobil-finpuss, QA-protokoll | 3.1–3.12 |
| M4 | Sesongstart-verifisering, kalenderstyrt 21.–24. aug: sjekkpunkt A (etter deadline), B (kampdag), C (etter runden) | checklister |
| M5 | Skjermbilder til README (bruker), mobilbekreftelse (bruker), sluttdokumentasjon | — |

## 2. Arbeidsform

- Bruk **superpowers:executing-plans**-skillen. Ikke bruk subagenter til
  implementering (utforsking er OK)
- Last **frontend-design**-skillen når Milepæl 3 starter, og
  **dataviz**-skillen før Task 3.7 (rank-grafen)
- **TDD der planen sier det:** skriv testen, KJØR den og se den feile,
  implementer, se den grønn. Ikke hopp over RED-steget
- **Avkryssing:** huk av `- [ ]` i planfilen etter hvert fullført steg, og
  huk av i `ROADMAP.md` per milepæl
- **Avvik:** stemmer ikke virkeligheten med planen (feil linjenummer,
  API-overraskelse, bedre løsning) — gjør det riktige, og skriv et
  `**Avvik fra planen:**`-notat direkte på steget i planfilen, som i forrige
  plan. Avviksnotater er dokumentasjon, ikke nederlag
- **Designretningen i M3 er forpliktende** («Matchday»-seksjonen i planen):
  signaturen er hero-scoreboardet, aksent-økonomien er grønn = handling,
  magenta = kun kaptein/live/negativt. Ikke innfør nye retninger underveis

## 3. Tidskritisk — les dette nøye

- GW1-deadline: **torsdag 21. aug 19:30** norsk tid. Auto-briefen sender
  naturlig **onsdag 20. aug ~19:30** hvis env-variablene står i Coolify før det
- **Milepæl 1 skal derfor være ferdig og i prod før onsdag 20. aug ~19:00**
- Jeg har API-nøkkel og Discord-kanal KLARE. Spør meg STRAKS du når
  Task 1.3 (nøkkel i lokal `.env`), Task 1.4 (webhook-URL) og Task 1.5
  (env-variablene i Coolify: `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK_URL` og
  `FPL_TEAM_ID`) — ikke vent til slutten av en task
- `notify.js`-fiksen (Task 1.1) MÅ pushes før UI-pushene starter — ellers
  re-sender hver deploy briefen til Discord i 24-timersvinduet før deadline

## 4. Faste regler (brudd = stopp og fiks)

- Grønn `npm test` + `npm run lint` FØR hver push. Vis outputen
- Etter hver push: verifiser prod med
  `(Invoke-WebRequest https://fpl.marsk.no/<side> -UseBasicParsing).StatusCode`
- Conventional commits, ingen æøå i commit-meldinger (bruk a/o/aa),
  Co-Authored-By-trailer slik harnesset ditt oppgir
- `ROADMAP.md`, `CHANGELOG.md` og `docs/HANDOVER.md` oppdateres ved HVER
  delfunksjon, ikke bare ved milepæler. Alle mine beskjeder loggføres i
  HANDOVER med dato og handling
- Release-rutine ved milepæl: CHANGELOG Unreleased → versjonert seksjon med
  dato, bump `version` i `package.json`, `docs: release vX.Y.Z`, tag,
  `git push origin main --tags`, verifiser footer i prod
- Windows/PowerShell 5.1: `;` ikke `&&`. Bruk Edit/Write-verktøyene på alle
  filer med norsk tekst — ALDRI `Get-Content -Raw` + `Set-Content`
  (dobbeltkoder UTF-8 og ødelegger æøå)
- Påstå aldri at noe virker uten å ha kjørt kommandoen og sett outputen i
  økten. Kunne du ikke kjøre den: si det eksplisitt
- Ingen nye npm-avhengigheter, ingen CDN-er, ingen byggesteg, alle farger
  som tokens i `:root`, norsk bokmål i all UI-tekst
- Klassenavn-kontrakten i planens «Globale rammer»: ID-er og klasser som
  `public/app.js` bruker, beholdes. Endres markup i `views/live.ejs`, endres
  render-funksjonen i app.js modul 3 i SAMME commit
- Nærmer økten seg ~95 % usage: stopp, oppdater HANDOVER grundig, commit og
  push alt

## 5. QA-sløyfen i Milepæl 3

Ingen av oss har nettleser i økten. Etter hver QA-merket push (rundene 1–5 i
Task 3.12): be meg åpne siden på telefon (primært) og desktop (sekundært) og
rapportere per checklisten i planen, format `SIDE · ENHET · FUNN`. Fiks
funnene FØR du starter neste side. Prod viser tomtilstander på
lag/liga/live fram til sesongstart — det er tilsiktet, ikke feil.

## 6. Ryddig stopp

Milepæl 4 er kalenderstyrt (21.–24. aug) og tilhører normalt senere økter.
Når du når et kalenderstyrt ventepunkt eller usage-grensen: HANDOVER
oppdatert med nøyaktig status og neste steg, alt committet og pushet, og en
tydelig beskjed til meg om hva som skjer når, og hva neste økt skal gjøre.
