# Oppdrag (Fable, plan mode): failure-backoff i cache.js (P3-2)

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — selvhostet
FPL-dashboard (Express 5 + EJS, Node 22+, norsk bokmål, ingen byggesteg,
prod på https://fpl.marsk.no via Coolify, auto-deploy ved push til `main`).

**Arbeidsdeling:** DU (Fable) planlegger i plan mode og får planen godkjent
av Marius. **Opus 5 gjennomfører** i en egen økt. Når planen er godkjent
skal du derfor lage en KORT overleveringsprompt Marius kan lime inn i
Opus 5-økten (se «Leveranser» nederst). Du skriver ikke produksjonskode selv.

## Les først

1. `docs/HANDOVER.md` — status og AKTIVE økter. **Sesongstart-verifiseringen
   (M4) pågår torsdag–mandag** med sjekkpunkter i en annen økt. Ikke
   forstyrr den.
2. `CLAUDE.md` — arkitekturregler. Gjelder foran alt annet i denne prompten.
3. `src/services/cache.js` (~60 linjer) og `test/cache.test.js` — det som
   skal endres, og testmønsteret (`_setNow`/`_flush`/`clear`).
4. `src/services/fplClient.js` — eneste konsument; se retry-stigen i
   `fplFetch` (1 kall + 2 retries over ~10 s) som gjør problemet verre.
5. `ROADMAP.md` → «v1.2.0-kandidater» → punktet «Failure-backoff i cache.js».

## Problemet (funn P3-2 fra kvalitetspasset v1.1.3, verifisert mot koden)

`getOrFetch` serverer stale verdi og starter en bakgrunnsrevalidering ved
HVER request etter utløpt TTL. In-flight-dedup hjelper bare mens et forsøk
pågår. Feiler revalideringen (FPL nede over tid), utløser neste request et
nytt forsøk umiddelbart — og hvert forsøk er opptil ~10 s med retries i
fplClient. Resultat: konstant hamring mot et nede-API fra alle sider som
leser samme nøkler.

## Ønsket oppførsel

Etter en MISLYKKET revalidering for en nøkkel skal nye revalideringsforsøk
for samme nøkkel tidligst skje **30 s** senere. Stale verdi serveres fortsatt
umiddelbart (som i dag). Vellykket henting nullstiller backoffen.
Førstegangshenting (ingen cachet verdi) påvirkes IKKE — den skal fortsatt
kaste feilen til kalleren som i dag.

**Bevisst utenfor scope** (produktbeslutninger som ikke tas her): alderstak
på stale data og `dataAlder` i payloaden. Skriv dem som «bevisst utelatt» i
planen, med én linje begrunnelse.

## Hva planen må svare på

- Hvor backoff-tilstanden bor (f.eks. `lastFailedAt` per nøkkel), hvordan
  den ryddes (`clear()`), og at `getOrFetch`-signaturen er uendret.
- Samspillet med in-flight-dedup og `_flush()`-testhooken.
- Skal backoffen gjelde per nøkkel (ja — begrunn) og skal 30 s være
  konstant eller konfigurerbar (velg, begrunn — dagens fil har ingen config).
- Testtilfeller (node:test, `_setNow`, ingen nettverkskall, ingen ekte
  timere): feilende revalidering → neste request innen 30 s gir stale verdi
  UTEN nytt fetcher-kall; etter 30 s prøves igjen; suksess nullstiller;
  førstegangsfeil kastes fortsatt; `clear()` nullstiller backoff;
  eksisterende tester forblir grønne.
- Commit-for-commit-rekkefølge med TDD (rød først), én delfunksjon per commit.
- Dokumentoppdateringer i samme commit som endringen: CHANGELOG
  `[Unreleased]` (hva brukeren merker: sidene slutter å hamre på FPL under
  nedetid), ROADMAP (flytt punktet fra kandidatlista til en avhukbar
  oppføring), HANDOVER (status + logg), CLAUDE.md (cache.js-linja i
  filkartet hvis beskrivelsen endres).

## Harde regler (skal også inn i Opus 5-prompten)

- **Branch `fix/cache-backoff`.** ALDRI push uten eksplisitt klarsignal fra
  Marius — push til `main` auto-deployer til prod.
- **IKKE merge før sesongstart-verifiseringen er ferdig** (sjekkpunkt D,
  søndag/mandag), med mindre Marius sier noe annet. Aldri deploy i vinduet
  torsdag 19:00–21:00 (auto-brief ~19:30).
- TDD med `node:test` i `test/`. Ingen nettverkskall i tester. Bruk
  `_setNow`-hooken — ingen ekte timere/sleeps.
- Ingen nye avhengigheter. Ingen ny cache-mekanisme utenfor cache.js.
- `npm test` og `npm run lint` grønne etter hver commit. Utgangspunkt:
  **212/212 grønne, lint 0** (v1.2.0).
- Conventional commits.
- Røyktest til slutt med egen `.env` i scratchpad der nøklene settes TOMME:
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` (config.js kjører
  `process.loadEnvFile()` som leser repoets `.env` med prod-nøklene uansett
  `--env-file` — tomme verdier fra `--env-file` vinner). `PORT=3010`,
  `FPL_TEAM_ID=5330646`. Verifiser `/health` → `ai:false, discord:false`
  FØR du ser på noe annet. Alle 11 ruter 200, 404 på ukjent sti.
- Bevis, ikke påstander: aldri «fungerer/fikset/består» uten kommando +
  output vist i økten.

## Leveranser fra planøkten (Fable)

1. Plan lagret som `docs/plan-cache-backoff.md`, godkjent av Marius i plan
   mode. Detaljert nok til at Opus 5 kan utføre uten deg: filer, kode,
   testnavn med forventninger, commit-rekkefølge.
2. **Kort overleveringsprompt til Opus 5** (maks ~15 linjer), lagret som
   `docs/neste-okt-prompt-cache-backoff-utforelse.md` OG limt inn i chatten
   så Marius kan kopiere den. Den skal peke på planfilen og HANDOVER, gjenta
   de harde reglene i kortform (branch, aldri push, ikke merge før etter
   sjekkpunkt D, TDD, grønt etter hver commit, røyktest-teknikken) og kreve
   kort sluttrapport med bevis.
3. HANDOVER oppdatert (status + logg over Marius' beskjeder), committet
   lokalt — **ingen push**.
