# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-26 (økt 41, Fable: v1.3.7 UTE I PROD, v1.3.8+v1.4.0 klare på brancher)

## Status akkurat nå
- **v1.3.5 og v1.3.6 UTE I PROD 25. aug** (footer `v1.3.6`, `/health` 200).
  v1.3.5: SIGTERM/SIGINT-handler (`createShutdown`). v1.3.6: tidsstemplet
  gameUpdating (5 min utløp) + egen 503-side ved kaldstart i FPLs
  oppdateringsvindu. 360/360, lint 0.
- **Ekte SIGTERM-bevis mangler — og Coolifys DEPLOY-logg er feil sted å
  lete.** Deploy-loggen (25. aug 02:04, v1.3.6) viser build + «Removing
  old containers»; appens stdout lever i den gamle containerens logg, som
  slettes med containeren. Sirkumstansielt: fjerningen tok 0,5 s — uten
  handler venter Docker ut stopp-timeouten (10 s) og SIGKILL-er. Ekte
  bevis: `kill 1` i containerterminalen (samme container restartes, loggen
  beholdes) — de to linjene skal stå der. Lokalt er handleren bevist med
  `process.emit('SIGINT')`: «SIGINT mottatt — lukker serveren» +
  «Serveren lukket ryddig», exit 0.
- **v1.3.7 UTE I PROD 26. aug** (footer `v1.3.7`, `/health` 200, hash
  `d508c47f` uendret). Volumet `/app/data` lagt til i Coolify FØR pushen
  (navngitt volum `…-fpl-data`, via Claude in Chrome) — aktivt fra denne
  deployen. Gjenstående markør-bevis: «Brief-markør lastet: runde 2 er
  alt sendt» i loggen ved første omstart ETTER torsdagens auto-brief.
- **v1.3.8 og v1.4.0 forhåndsbygget 26. aug** på `fix/genitiv-nyhetsfilter-v138`
  og `feat/alderstak-v140` (stablet oppå førstnevnte) — 375/375, lint 0,
  røyktest OK. IKKE merget: merge `--no-ff` + tag + push først etter P4.
- **P2-skjermbildene tatt og committet 26. aug** (Playwright mot prod,
  mørkt tema, `docs/img/`, lenket fra README). Rest: ekte telefon.
- **v1.3.4 (AI-SWR) ute siden 25. aug** — målingene og detaljene er rotert
  til `docs/arkiv/HANDOVER-historikk.md`; plan: `docs/arkiv/plan-v134-ai-swr.md`.
- **Prod-QA 25. aug: 402 sjekker, 0 feil** mot v1.3.4 (dekker også v1.3.3);
  detaljene er rotert til historikken. v1.3.5–v1.3.7 rører kun `src/`, så
  QA-en står — ingen ny full QA er planlagt.
- **Asset-hashen i prod er `d508c47f`, og den er RIKTIG.** Den skiftet ved
  v1.3.3 (`style.css` + `app.js`) og skal IKKE endres av v1.3.4–v1.3.7, som
  kun rører `src/`. Regn den fra git-blobbene, ikke arbeidstreet — Windows
  har CRLF på disk og gir et annet tall enn containeren.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **v1.3.0–v1.3.3 ute siden 24. aug** (tokenpalett, temabryter, klubbgrafikk,
  finpuss, QA-rettelser). Detaljer i `docs/arkiv/HANDOVER-historikk.md`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen. Ny måling i uken
  etter 31. aug (prisskiftet), nå mot taktbudsjettet ~41–45 kall/uke, kø-punkt 1.
- **Git akkurat nå:** `main` pushet t.o.m. `98377e0` 26. aug (v1.3.7 +
  docs + P2-skjermbilder), tag `v1.3.7` pushet. Lokale brancher:
  `fix/genitiv-nyhetsfilter-v138` og `feat/alderstak-v140` (umerget).
  Docs-commits etter dette kan ligge lokalt til neste release-push —
  måleuken 1.–6. sept skal være deploy-fri.
- Eldre status (v1.2.3, doks-opprydning, versjonsplan, v1.2.4): arkivert.

## Neste steg (start her)

Fasiten for alt som gjenstår er `docs/plan-sluttspurt.md` — den har kode,
tester, ordrett dokumenttekst, kalender og bevis-krav per task. Køen i
`ROADMAP.md` er den langsiktige prioriteringen og sier det samme.
**Punkt 1–2 kan bare Marius gjøre — Claude in Chrome-promptene er levert
i økt 41 og kan gjenbrukes fra chatloggen.**

1. `[Marius]` **`kill 1` i containerterminalen** (Chrome-prompt 2) → de to
   avslutningslinjene er siste bevis for v1.3.5; huker av Task 2 Step 8.
2. `[Marius]` **Én transfer før fr 28. kl. 19:30** (Chrome-prompt 3) —
   uten den har P3 ingen ekte data å verifisere feltnavnene mot.
3. **Task 4 (P3), tidligst ma 31. aug:** feltnavnene i
   `entry/5330646/transfers/` mot ekte API + `/overganger` på 390 px.
4. **Task 5 (P2), delvis utført 26. aug:** skjermbildene er committet —
   gjenstår mobil-QA på ekte telefon + mockup-sjekk (Chrome-prompt 4).
5. **Task 6 (P4), ~ma 7. sept:** kostnadsmåling etter prisskiftet, mot
   $-tersklene OG taktbudsjettet ~41–45 kall/uke.
6. **Task 7–8 etter P4:** koden er FERDIG på branchene (se status) — kun
   merge `--no-ff` + tag + push gjenstår (P3-avvik → renummerer mekanisk
   først). Til slutt Task 9: arkiver planfila.

**P1 er LUKKET 25. aug** (auto-briefen bekreftet i Discord) — sjekkpunkt A
er dermed ferdig i sin helhet. P0 ble lukket samme dag.

## Driftslærdommer (ikke glem disse)

- **401 med `Basic realm="traefik"`: sjekk FØRST om «HTTP Basic
  Authentication» er huket av for appen i Coolify.** Haken henger en
  basicauth-middleware på HTTPS-routeren og rammer ALLE stier, også
  `/health`; realmnavnet er Traefiks standard, ikke tegn på manglende rute
  (som ville gitt 404). Redeploy hjelper ikke — fjern haken (løst 25. aug).
- **Coolifys «Running (healthy)» sier bare at appen svarer INNE i
  containeren.** Coolifys egen HTTP-sjekk overstyrte Dockerfilens og brukte
  `curl`, som ikke finnes i `node:22-alpine` → «healthy» mens prod svarte
  401 på alt (fikset 25. aug: Coolifys sjekk AV). Også den riktige sjekken
  går utenom Traefik — «prod svarer rart» feilsøkes ALLTID utenfra først.
- **`kill 1` virker FRA v1.3.5 — før det gjorde det ingenting** (målt
  25. aug: null effekt, containeren restartet aldri). PID 1 i et
  container-namespace mottar kun signaler den har egen handler for, og
  appen hadde ingen. Med `createShutdown` på plass er `kill 1` i
  containerterminalen den trygge måten å bevise ryddig avslutning:
  containeren restartes av `unless-stopped` og BEHOLDER loggen.
  Aldri `docker stop`/`kill` på prod — da blir den liggende nede.
- **Sjekk at fila ikke finnes før du «oppretter» den:** planen sa
  «Create `test/format.test.js`», men fila fantes med 3 tester fra
  v1.2.0. Write overskrev dem stille, og det ble bare synlig fordi
  testtallet ble 302 i stedet for 305. Gjenopprettet med `git checkout`.
- **Restart serveren etter endringer i `src/`:** ESM lastes én gang ved
  oppstart, så en Playwright-kjøring mot en gammel prosess gir falske funn.
- **En CSS-overstyring må stå ETTER regelen den overstyrer** — en medieblokk
  lenger oppe har lik spesifisitet og taper cascaden. `.table-scroll--pinned`
  lå i ≤640-blokka over basisregelen og hadde null effekt (økt 34).
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken hentes på nytt hver sesong:** `npm run fetch-clubs` + bump
  `IMG_VERSION` i `src/middleware.js` i SAMME commit, ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutine: DEPLOY.md.
- **Skriv `\r\n` i node-patchskript mot repo-filer** — de er CRLF (ROADMAP
  har i tillegg BOM), og en enkelt `\n` gir blandede linjeskift. `sed -i` er
  forbudt på docs; bruk Edit eller et skript med `split('\r\n')/join`.
- **Bash-heredoc med apostrofer i innholdet feiler** i dette verktøyet
  (wrapperen bruker enkle anførselstegn) — bruk Write/Edit for filer med
  `'` i teksten (CSS, norsk prosa).
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser `.env` UANSETT `--env-file`. Sett
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME i en scratchpad-.env
  (eller i `process.env` før import) — de settes først og overskrives ikke.
  Verifiser med `/health` → `ai:false, discord:false`.
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip er GRATIS fra v1.3.4** (verifisert i prod 25. aug):
  `/brief` og `/nyheter` leser kun cachen. T.o.m. v1.3.3 kostet hvert besøk
  et AI-kall. Unntaket består: klikk ALDRI «Spør AI om råd» på `/lag` i en
  verifisering — det er det eneste stedet et klikk kan utløse et kall.
- **Per-funksjon-AI-kostnad kan ikke måles retroaktivt:** Coolify-loggen er
  100 linjer og nullstilles ved hver deploy. Skal fordelingen måles, må
  `AI-kall:`-linjene samles løpende (f.eks. før hver deploy).
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets. Ufarlig — all HTML refererer versjonerte URL-er.
- `ai.js` sender bevisst ikke `thinking`/`effort` (feiler på Haiku 4.5);
  `max_tokens` er romslig fordi adaptiv tenkning på Sonnet 5 trekker fra
  samme budsjett.
- Liganavnet «Var Har Skylda» kommer slik fra FPL-API-et (liga 1397750,
  Marius er admin) — ikke en kodefeil.
- JSON i `views/live.ejs` escaper `<` fordi lagnavn kommer fra andre
  FPL-brukere — ikke fjern escapingen.

## Brukerens beslutninger (IKKE re-spør)

- Tiltale: **Marius** — alle svar starter med «Hei Marius!».
- AI-modell: `claude-sonnet-5` via `AI_MODEL`-env (`claude-haiku-4-5` billig-alternativ).
- Kostnadskrav: AI billig for én person — alt on-demand + cachet.
- Layout: egen liten EJS-layout-helper, IKKE express-ejs-layouts.
- «Overganger»: egen side på `/overganger`, uten AI-kommentar i v1.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.
- UI-overhalingen (økt 30): de 15 designbeslutningene står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen gjelder
  videre: ett spørsmålssett om gangen, anbefaling først.
- Doks-opprydningen (økt 24): konsumerte prompter slettes, utførte planer
  arkiveres til `docs/arkiv/`, docs/-rot holdes lav (nå 4 filer + arkiv),
  HANDOVER-tak 200 linjer med rotering til historikkfila.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-08-26 (økt 41, Fable): «full oversikt over alt gjenværende», så
  «planlegg og gjennomfør alt som kan gjøres nå». Handling: v1.3.8 og
  v1.4.0 TDD-bygget på egne brancher uten merge/push (375/375, lint 0,
  røyktest), status ført her + ROADMAP + planens §0. Deretter: «alle
  Chrome-handlinger via Claude in Chrome, du kan pushe» → P2-skjermbilder
  tatt med Playwright og committet. Volum-rapporten kom (Claude in
  Chrome, navngitt volum) → push: v1.3.7 + docs ut 26. aug, prod
  verifisert utenfra (footer, `/health`, uendret asset-hash).
- Loggposter fra økt 22–40: rotert til `docs/arkiv/HANDOVER-historikk.md`
  (200-linjerstaket, sist 2026-08-26).
