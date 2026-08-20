# Oppdrag (Fable, plan mode): robust `sanitizeBriefText` (P3-4)

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
prod på https://fpl.marsk.no via Coolify, auto-deploy ved push til `main`).

**Arbeidsdeling:** DU (Fable) planlegger i plan mode og får planen godkjent
av Marius. **Opus 5 gjennomfører** i en egen økt. Når planen er godkjent
skal du lage en KORT overleveringsprompt Marius kan lime inn i Opus 5-økten
(se «Leveranser» nederst). Du skriver ikke produksjonskode selv.

## Les først

1. `docs/HANDOVER.md` — status og AKTIVE økter. **Sesongstart-verifiseringen
   (M4) pågår torsdag–mandag** med sjekkpunkt A/B/C/D i en annen økt.
   Ikke forstyrr den.
2. `CLAUDE.md` — arkitekturregler. Gjelder foran alt annet i denne prompten.
3. `src/services/prompts.js` → `sanitizeBriefText` (fra ca. linje 60) — det
   som skal endres.
4. `test/prompts.test.js` — eksisterende testmønster for funksjonen.
5. `src/services/brief.js` linje 38–45 — hvor `fixturesByDay[].matches[]`
   med `home`/`away` bygges. **Verifiser selv hvilket navnefelt som brukes.**
6. `ROADMAP.md` → «v1.2.0-kandidater» → punktet «`sanitizeBriefText`
   robusthet».

## Hvorfor denne oppgaven nå

Den er trygg midt i sesongstart-verifiseringen: `sanitizeBriefText` er en
**ren funksjon** over tekst. Ingen nettverkskall, ingen AI-kall, ingen
timere. Den rører ikke live-polling, auto-brief-scheduleren eller
`gameUpdating`-banneret — de tre tingene sjekkpunkt A/B/C observerer.
Arbeidet skjer på branch og pushes ikke, så prod er uendret hele veien.

## Problemet (funn P3-4 fra kvalitetspasset v1.1.3)

`sanitizeBriefText` fjerner setninger der AI-en påstår noe om hvilke kamper
som ligger før/etter deadline, når dataene motsier påstanden. To svakheter:

1. **Setningssplitting:** `line.match(/[^.!?]+[.!?]*/g)` deler på ethvert
   punktum, altså også midt i forkortelser som «kl.», «f.eks.», «bl.a.»,
   «ca.». En setning kan da bli kuttet i to biter der bare den ene halvparten
   ser lagnavnet eller negasjonen — som gir både falske treff og bomskudd.
2. **Lagnavn-matching:** `sentence.includes(name)` matcher rå substring mot
   navnet i `matches[].home/away`.

**NB — ROADMAP-teksten er unøyaktig her.** Den påstår at det matches mot
FPLs kortnavn («Spurs»). Ved kontroll bruker `brief.js` `teams.name`
(fullt navn). **Verifiser dette selv mot koden og korriger ROADMAP-punktet
som del av arbeidet.** Retningen på problemet avhenger av svaret: skriver
modellen et kortnavn eller et kallenavn som ikke er en delstreng av navnet
i dataene, bommer matchen og setningen slipper gjennom ukontrollert.

## Ønsket oppførsel

- Setninger deles korrekt selv når de inneholder vanlige norske
  forkortelser med punktum.
- Lagnavn gjenkjennes robust: en alias-tabell (kortnavn, kallenavn, vanlige
  forkortede former) i tillegg til navnet som ligger i dataene.
- **Ingen endring i funksjonens kontrakt:** samme signatur, samme
  returtype, samme oppførsel når `text` er tom eller `brief` mangler
  kampdata. Funksjonen skal fortsatt bare fjerne setninger den kan motbevise
  med data — når den er i tvil, beholder den teksten.

## Hva planen må svare på

- Hvordan setningssplittingen skal kjenne forkortelser: eksplisitt liste
  eller regel? Hvilke forkortelser (`kl.`, `f.eks.`, `bl.a.`, `ca.`, `dvs.`,
  `osv.`, `nr.`, `mfl.` …)? Velg og begrunn — enkelt slår smart her.
- Hvor alias-tabellen bor (egen konstant i `prompts.js`, eller egen liten
  modul), og hvordan den holdes vedlike når PL-lag rykker opp/ned.
- Om matchingen skal være ordgrense-basert i stedet for `includes`, og hva
  det gjør med flerordsnavn.
- Testtilfeller (node:test, ingen nettverkskall, ingen AI-kall): setning med
  «kl. 19:30» splittes ikke feil; negasjon overlever splittingen; kortnavn/
  kallenavn gjenkjennes; setning uten lagnavn oppfører seg som før; tom
  tekst og manglende `brief` uendret; **alle eksisterende tester i
  `test/prompts.test.js` forblir grønne uendret**.
- Commit-for-commit-rekkefølge med TDD (rød først), én delfunksjon per commit.
- Dokumentoppdateringer i samme commit som endringen: CHANGELOG
  `[Unreleased]` (hva brukeren merker), ROADMAP (flytt punktet ut av
  kandidatlista + korriger «kortnavn»-påstanden), HANDOVER (status + logg),
  CLAUDE.md hvis en beskrivelse i filkartet blir feil.

**Bevisst utenfor scope** (skriv dem som «bevisst utelatt» med én linje
begrunnelse): `filterSummaryPoints` i `news.js` (P3-5 — egen funksjon, egen
fil), og enhver endring av selve AI-prompten (koster AI-kall å teste, må
avtales med Marius separat).

## Harde regler (skal også inn i Opus 5-prompten)

- **Branch `fix/sanitize-brief`, ut fra `main`.** ALDRI push uten eksplisitt
  klarsignal fra Marius — push til `main` auto-deployer til prod.
- **IKKE merge før sesongstart-verifiseringen er ferdig** (sjekkpunkt D,
  søndag/mandag), med mindre Marius sier noe annet. Aldri deploy i vinduet
  torsdag 19:00–21:00 (auto-brief ~19:30).
- **`main` har upushede commits og en upushet tag `v1.2.1`.** Prod kjører
  v1.2.0. Ikke push dem «på veien», ikke rebase dem, ikke rør taggen.
- **Ingen AI-kall.** Funksjonen testes med hardkodet tekst i fixtures. Skal
  du ha realistisk AI-tekst, be Marius om utdraget fra sjekkpunkt A —
  ikke generer ny. AI-budsjettet er ~3 kall og telles i HANDOVER.
- TDD med `node:test` i `test/`. Ingen nettverkskall i tester, ingen ekte
  timere/sleeps.
- Ingen nye avhengigheter.
- `npm test` og `npm run lint` grønne etter hver commit. Utgangspunkt:
  **218/218 grønne, lint 0** (v1.2.1, lokalt merget).
- Conventional commits. Commit hyppig — minst én per delfunksjon.
- Røyktest til slutt med egen `.env` i scratchpad der nøklene settes TOMME:
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` (config.js kjører
  `process.loadEnvFile()` som leser repoets `.env` med prod-nøklene uansett
  `--env-file` — tomme verdier fra `--env-file` vinner). `PORT=3010`,
  `FPL_TEAM_ID=5330646`. Verifiser `/health` → `ai:false, discord:false`
  FØR du ser på noe annet. Alle 11 ruter 200, 404 på ukjent sti.
- Bevis, ikke påstander: aldri «fungerer/fikset/består» uten kommando +
  output vist i økten.
- Alle beskjeder fra Marius loggføres i `docs/HANDOVER.md` med dato og
  handling. ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres i samme commit
  som endringen, ikke bare ved milepæler.
- Tiltale: **Marius**. Alle svar starter med «Hei Marius!».
- Stopp ved ~95 % usage: oppdater `docs/HANDOVER.md` grundig og commit alt.

## Leveranser fra planøkten (Fable)

1. Plan lagret som `docs/plan-sanitize-brief.md`, godkjent av Marius i plan
   mode. Detaljert nok til at Opus 5 kan utføre uten deg: filer, kode,
   testnavn med forventninger, commit-rekkefølge, forventede testtall.
2. **Kort overleveringsprompt til Opus 5** (maks ~15 linjer), lagret som
   `docs/neste-okt-prompt-sanitize-brief-utforelse.md` OG limt inn i chatten
   så Marius kan kopiere den. Den skal peke på planfilen og HANDOVER, gjenta
   de harde reglene i kortform (branch, aldri push, ikke merge før etter
   sjekkpunkt D, ingen AI-kall, TDD med rødt observert først, grønt etter
   hver commit, røyktest-teknikken) og kreve kort sluttrapport med bevis.
3. HANDOVER oppdatert (status + logg over Marius' beskjeder), committet
   lokalt — **ingen push**.
