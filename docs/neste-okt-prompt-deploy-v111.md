# Kjøreprompt: deploy v1.1.1 til prod

Lim hele blokken under (fra «# Oppdrag» og ned) inn i en **ny Claude Code-økt**
i FPL-repoet.

Den stopper underveis og gir deg en ferdig prompt til Claude in Chrome
(Cloudflare-purge). Når du har kjørt purgen, svarer du «purgen er gjort», og
den fullfører og gir deg to prompter til — én til Claude in Chrome, én til
Fable.

---

# Oppdrag: deploy v1.1.1 til prod og orkestrer resten av lanseringen

Du jobber i c:\Users\mariu\Documents\Claude Code\FPL (Express 5 + EJS, norsk
bokmål, ingen byggesteg). Dette er oppfølgingsøkten etter QA-retteøkten.

## Les først, i denne rekkefølgen

1. `docs/HANDOVER.md` — status, hva som er verifisert, hva som ikke er det
2. `CLAUDE.md` — arkitekturregler og konvensjoner, gjelder foran alt
3. `DEPLOY.md` — deploy-flyten og verifiseringskommandoene (ny i v1.1.1)

Utgangspunkt: branchen `fix/qa-v1.1.1` har 19 commits med alle QA-rettelsene
(P0-1 til P2-8, unntatt P2-7 som ikke var en kodefeil). Lokal tag `v1.1.1`
peker på siste commit. Ingenting er pushet. `npm test` var 113/113 og
`npm run lint` 0 feil ved slutten av forrige økt.

## Tidsvakt — les dette før du gjør noe annet

FPL-sesongen 2026/27 starter fredag 21. august kl. 19:30 norsk tid
(GW1-deadline). Auto-briefen til Discord postes 24 timer før, altså
**~19:30 i dag, torsdag 20. august**. Den nye koden bør være i prod før det,
ellers går briefen på v1.1.0-logikken uten tidsfakta og uten
sanitizeBriefText — nøyaktig feilen QA fant.

Sjekk klokka først. Rekker du det ikke, si fra med én gang og fortsett
likevel — briefen postes uansett, den blir bare svakere.

## Harde regler

- **Ikke kjør prod-verifisering før jeg har bekreftet Cloudflare-purgen.**
  Purgen skjer manuelt i nettleseren. Måler du før den, leser du gammel cache
  og konkluderer feil.
- **Ikke push taggen før prod er bekreftet.**
- **Ikke klikk eller kall «Spør AI om råd»-stien** på /lag. Den koster penger
  per klikk og skal testes i en senere, planlagt økt.
- Ingen nye avhengigheter, ingen byggesteg, ingen CDN-er. Playwright kun i
  scratchpad-mappen din, aldri i package.json.
- Bevis, ikke påstander: vis kommando og faktisk output for hver verifisering.
  Kunne du ikke kjøre noe, si det eksplisitt.

## Fase 1 — merge og push

1. Sjekk ut `main`, merge `fix/qa-v1.1.1` med `--no-ff`.
2. Kjør `npm test` og `npm run lint` på `main`. Begge må være grønne før du
   går videre. Vis outputen.
3. Push `main` til `origin`. Det utløser Coolify-deploy automatisk.
4. Poll `https://fpl.marsk.no/health` til den svarer 200, og hent så forsiden
   og bekreft at footeren viser `v1.1.1`. Ikke gjett at deployen er ute —
   vis den faktiske responsen. Tar det mer enn ~5 minutter, si fra.

## Fase 2 — STOPP og gi meg Cloudflare-prompten

Når deployen er bekreftet ute: stopp all verifisering og skriv ut en ferdig
prompt jeg kan lime rett inn i **Claude in Chrome**. Den skal stå i én
kopierbar kodeblokk, på norsk, og dekke:

- At den skal gå til Cloudflare-dashbordet, velge sonen `marsk.no`, gå til
  Caching og deretter Configuration, og kjøre «Purge Everything»
- Hvorfor: siden har til nå servert uversjonerte `/style.css` og `/app.js`,
  og de gamle oppføringene ligger igjen på edge-cachen. Fra v1.1.1 får assets
  `?v=<innholdshash>`, så dette er et engangssteg
- At den skal bekrefte kvitteringen den faktisk ser på skjermen, ikke anta
- At den etterpå skal åpne https://fpl.marsk.no og si fra om siden viser det
  mørke «Matchday»-temaet med grønn og magenta aksent. Er den fortsatt grå og
  gammel, virket ikke purgen — det skal rapporteres umiddelbart

Skriv tydelig over kodeblokken at prompten skal til Claude in Chrome, og at
jeg må si «purgen er gjort» tilbake til deg før du fortsetter.

Vent på meg her. Ikke fortsett på eget initiativ.

## Fase 3 — prod-verifisering (først etter min bekreftelse)

Kjør hele verifiseringsblokken i `DEPLOY.md` mot prod og rapporter faktisk
output for hvert punkt:

- `/style.css?v=<hash>` gir `public, max-age=31536000, immutable`
- `/style.css` uten `?v=` gir `no-cache`
- `cf-cache-status`-headeren på begge (en `HIT` på den uversjonerte betyr at
  purgen ikke tok)
- Hashen i prod-HTML-en matcher den serveren faktisk serverer
- Alle ti ruter svarer 200: `/`, `/spillere`, `/lag`, `/liga`, `/brief`,
  `/live`, `/nyheter`, `/health`, `/api/brief.json`, `/api/live.json`
- 404 på en ukjent sti
- `/health` viser `ai: true`, `discord: true`, `teamId: true`, `leagues: 1`
- Footeren viser `v1.1.1` på alle sidene

Avvik: rapporter dem, ikke bortforklar dem. Feiler noe, foreslå årsak basert
på faktisk output og spør meg før du endrer noe i prod-oppsettet.

## Fase 4 — lukk ut releasen

1. Push taggen `v1.1.1`.
2. Oppdater `docs/HANDOVER.md`: prod-status, hva som nå er verifisert, og
   flytt det som fortsatt ikke er verifisert til «neste steg». Rett samtidig
   de to utdaterte punktene under «Åpne oppgaver som krever bruker» —
   `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL` er allerede satt i Coolify.
3. Huk av ROADMAP-punktet «Deployet og verifisert i prod».
4. Logg beskjedene mine fra denne økten i HANDOVER med dato og handling.
5. Commit det som `docs:`.

## Fase 5 — gi meg de to neste promptene

Til slutt skriver du ut to ferdige prompter, hver i sin egen kopierbare
kodeblokk, med tydelig overskrift om hvem de skal til og når jeg skal sende
dem.

**Prompt 1 — til Claude in Chrome, sendes når som helst i dag:**
Visuell QA av prod pluss to sideoppgaver. Den skal dekke:

- Gjennomgang av alle sju sidene på både desktopbredde og 390 px mobilbredde,
  med konkrete ting å se etter: vannrett scroll som ikke skal være der,
  tabellhode som legger seg under den sticky toppmenyen, `v1.1.1` i footeren,
  engelsk tekst i grensesnittet, og at AI-merket står på én linje
- Skjermbilder av dashbordet, /spillere og /lag i begge bredder, til README
- At den ikke skal klikke «Spør AI om råd» på /lag
- Sideoppgave: logge inn på fantasy.premierleague.com, finne den private
  ligaen «Var Har Skylda» (liga-id 1397750, jeg er administrator), og vise
  meg hvilke felter som kan endres — uten å endre noe før jeg har bekreftet.
  Bakgrunn: navnet kommer fra FPL selv, det er ikke en feil i appen
- Et tips om at skjermbildene blir bedre etter sesongstart fredag kveld, når
  sidene har ekte data i stedet for tomtilstander

**Prompt 2 — til Fable, sendes i kveld eller i morgen tidlig:**
Be om en verifiseringsplan for sesongstarten. Den skal dekke:

- Hvilke sider og grener som bytter fra tomtilstand til ekte data når
  GW1-deadlinen passerer, og hva som konkret skal sjekkes på hver
- Særlig at P1-1-filtrene i `topForm`, `mostTransferredIn` og
  `mostTransferredOut` slipper ekte data gjennom når tallene blir større enn
  null, og at P2-5- og P2-6-gatene på /lag viser tallene når `squadView`
  finnes
- Hvordan live-polling verifiseres uten å hamre FPL-API-et
- AI-verifiseringen som fortsatt gjenstår: «Spør AI om råd» (ett klikk, cachet
  én time), `sanitizeBriefText` mot en fersk AI-brief (den første versjonen
  fjernet to korrekte setninger, ble rettet, men er ikke kjørt mot en ny ekte
  generering), `filterSummaryPoints` mot ekte nyhetspunkter, og at kveldens
  Discord-brief faktisk kom og ikke motsier kampprogrammet
- Kostnadskontroll etter to til tre dager, med terskler for når det lønner seg
  å bytte til `claude-haiku-4-5`
- Restpunkter: skjermbilder til README, mobilvisning på ekte telefon, og hva
  som eventuelt bør bli v1.2.0
- Krav: konkrete steg med filstier og kommandoer, hvert steg med et
  etterprøvbart akseptansekriterium, tydelig merking av hva som krever meg
  (nettleser, telefon, Discord) og hva en agent kan gjøre selv, og at alt som
  koster AI-kall telles og begrunnes

Legg ved en kort huskeliste til meg for i kveld: se etter auto-briefen i
Discord rundt 19:30, og hva jeg skal se etter i teksten.
