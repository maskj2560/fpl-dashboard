# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-31 (økt 45, Opus: v1.7.0 «/innsikt» bygget, ikke merget)

## Status akkurat nå
- **v1.7.0 BYGGET 31. aug på `feat/innsikt-v170`, IKKE merget.** T1–T10
  fra `docs/plan-innsikt-v170.md` fullført i rekkefølge, TDD hele veien:
  **549/549 tester (fail 0), `npm run lint` exit 0.** Ni commits.
  Ny `src/services/insights.js` (optimalXi, buildBenchReport,
  buildCaptainAudit, buildLuckMeter, buildDreamTeamSection,
  assembleInsights), ny `src/routes/insights.js`, ny `views/innsikt.ejs`,
  `getDreamTeam(gw)` i fplClient. **Null endring i `public/style.css`** —
  kun eksisterende klasser, så `test/style.test.js` er urørt og
  asset-hashen i prod endres ikke av denne releasen.
  Røyktest lokalt med TOMME nøkler (port 3117): alle 12 ruter 200
  inkl. `/innsikt`, `/finnesikke` 404, `/health` → `ai:false,
  discord:false, teamId:true, leagues:1`, **0 «AI-kall:»-linjer** og null
  softNull-varsler i loggen. Manuell visning mot ekte FPL-data (G=1):
  benkesløsing R1 6 p / −1 unngåelig; kapteinsfasit 0 % troppens beste
  (Haaland 2 p mot Ødegaard 11 p) og 100 % mot global favoritt;
  flaksbarometer +4 (topp Gvardiol +4,7, bunn Isak −4,4); rundens XI
  runde 1 med 1 av 11 eid (João Pedro startet), beste De Cuyper 17 p.
  **Gjenstår: Marius tester lokalt og gir klarsignal for merge.**
- **v1.3.8, v1.4.0, v1.5.0 og v1.6.0 UTE I PROD 28. aug kl. 14:49** —
  fire `--no-ff`-merger, tagget, 509/509 + lint 0 før og etter. Hele
  prod-beviset (rutesveip, /health, footer, dataAlder) er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted; beviset er
  `kill 1` i containerterminalen — de to avslutningslinjene skal stå der.
  Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **v1.3.7 ute i prod siden 26. aug**, volumet `/app/data` aktivt
  (`…-fpl-data`). Gjenstående markør-bevis: «Brief-markør lastet: runde 2
  er alt sendt» i loggen ved første omstart ETTER torsdagens auto-brief.
- **P2-skjermbildene tatt 26. aug** (Playwright mot prod, `docs/img/`,
  lenket fra README). Rest: ekte telefon. **Prod-QA 25. aug: 402 sjekker,
  0 feil** mot v1.3.4; detaljene i historikken.
- **Asset-hashen i prod er `f9014751` fra 28. aug** og endres IKKE av
  v1.7.0 (ingen endring i `style.css`/`app.js`). Regn den alltid fra
  git-blobbene, aldri fra arbeidstreet — se lærdommene.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka er DROPPET** (Marius 28. aug) — han følger forbruket
  løpende i `console.anthropic.com`; tersklene og skriptet i
  `docs/sjekkpunkt-d-kostnad.md` brukes ved behov. Taktbudsjett
  **~49–53 AI-kall/uke** (v1.7.0 legger til 0). Siste måling 23. aug:
  $0,94/uke.
- **Git akkurat nå:** `main` ligger 1 docs-commit foran `origin/main`
  (`02eb9ce`, selve v1.7.0-planen). `feat/innsikt-v170` er branchet fra
  den toppen og har 9 commits; **ikke pushet, ikke merget, ikke tagget**.
  `origin` har KUN `main`; taggene t.o.m. `v1.6.0` er pushet. **Rest:**
  12 gamle, merget lokale brancher fra økt ≤ 35 står igjen (navnene i
  historikkfila) — ingen finnes på GitHub, ryddes med `git branch -d`
  når som helst.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

Køen i `ROADMAP.md` er den langsiktige prioriteringen. Punkt 2–4 kan bare
Marius gjøre.

1. **[Marius] Test v1.7.0 lokalt og gi klarsignal:**
   `git checkout feat/innsikt-v170` + `npm run dev` → se `/innsikt` i
   begge temaer og på 390 px (nav har nå 9 punkter — sjekk at scrollnavet
   med kantfade fra v1.1.2 holder). Klarsignal → merge `--no-ff` til
   `main`, tag `v1.7.0`, ÉN push (= én Coolify-deploy). Aldri torsdag
   19:00–21:00 (auto-brief), aldri mens kamper pågår, GW3-deadline
   fre 4. sept 19:30. Deretter arkiveres `docs/plan-innsikt-v170.md` til
   `docs/arkiv/`. v1.8.0 og v1.9.0 planlegges hver for seg etterpå.
2. `[Marius]` **`kill 1` i containerterminalen** → de to avslutningslinjene
   («SIGTERM mottatt — lukker serveren», «Serveren lukket ryddig») er det
   siste beviset for v1.3.5.
3. `[Marius]` **Mobil-QA på ekte telefon** (P2-resten) — `/overganger`,
   `/liga` og nå `/innsikt` på 390 px, i begge temaer.
4. **P3 ved første ekte transfer:** feltnavnene i
   `entry/5330646/transfers/` (`element_in`, `element_out`, `event`,
   `time`, `event_transfers_cost`) mot ekte API. Marius bytter ikke i GW2
   (besluttet 28. aug), så porten venter på hans første ekte bytte — til
   da er tomtilstanden på `/overganger` korrekt (0 bytter).
5. **Kostnad:** løpende hos Marius i Anthropic-konsollen — ingen måleuke.
6. **Kosmetisk:** slett de 12 gamle lokale branchene — `git branch -d`.

**P0 og P1 er LUKKET 25. aug** (helsesjekken og auto-briefen).
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
- **Restart serveren etter endringer i `src/`** — ESM lastes én gang.
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken hentes på nytt hver sesong:** `npm run fetch-clubs` + bump
  `IMG_VERSION` i `src/middleware.js` i SAMME commit, ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutine: DEPLOY.md.
- **ALLE docs er CRLF** (ROADMAP har BOM). Et node-`replace` med `\n` i
  søkestrengen MATCHER IKKE og feiler STILLE — det skjedde med to
  CHANGELOG-tillegg i økt 45, oppdaget først ved sluttkontroll. Bruk
  Edit-verktøyet på docs. `sed -i` er forbudt. Nye kildefiler skrives med
  LF; `core.autocrlf=true` normaliserer, så det er greit.
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
  100 linjer og nullstilles ved deploy — samle `AI-kall:`-linjene løpende.
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets. Ufarlig — all HTML refererer versjonerte URL-er.
- `ai.js` sender bevisst ikke `thinking`/`effort` (feiler på Haiku 4.5);
  `max_tokens` er romslig pga. adaptiv tenkning på Sonnet 5.
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
- **Måleuka droppet (28. aug):** kostnaden følges løpende av Marius i
  `console.anthropic.com`. Samme dag: ingen bytter i GW2, så P3 venter.
- **v1.7.0 (31. aug):** begge benkekolonner; kapteinstreff på både
  identitet og poeng; flakspoeng + topp/bunn 3; XI-liste + sesongtrend;
  vindu = hele sesongen; nav-plass etter Liga. Fasit i planen.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-08-31 (økt 45, Opus, utførelsesøkt): mandat = bygg v1.7.0 etter
  den godkjente detaljplanen, ingen designvalg, TDD strengt, ingen
  merge/tag/push til `main` uten klarsignal. Handling: `feat/innsikt-v170`
  fra lokal `main`-topp, T1–T10 i rekkefølge med RED før GREEN i hver
  task (549/549, lint 0), ni conventional commits, CHANGELOG `[1.7.0]`,
  ROADMAP/CLAUDE.md/VIDERE.md/denne fila ajour, prod-bevis for
  v1.3.8–v1.6.0 rotert til historikkfila. To små avvik fra planens
  signaturskisser, begge nødvendige for returformen: `buildLuckMeter` og
  `buildDreamTeamSection` fikk henholdsvis `teamsById` og `picksByGw` som
  ekstra parametre (`teamCode` og sesongtrenden kan ikke utledes uten
  dem). Ingen push, ingen merge, ingen tag.
- 2026-08-31 (økt 44, Fable, planøkt): mandat = detaljplan for v1.7.0
  «/innsikt». Marius godkjente alle seks anbefalingene (begge
  benkekolonner; kapteinstreff identitet+poeng; flakspoeng + topp/bunn 3;
  XI-liste + sesongtrend; hele sesongen; nav etter Liga). På spørsmål om
  risikolista: «Løs det slik at det er minst mulig risiko» → autosub-,
  BB- og chip-antakelsene MÅLT mot ekte API (re-sortering, points_on_bench=0,
  bboost/3xc) — null antakelser igjen i datakontrakten. Plan skrevet til
  `docs/plan-innsikt-v170.md`, kjøreprompt til Opus levert i chatten.
- Loggposter fra økt 22–43: rotert til
  `docs/arkiv/HANDOVER-historikk.md` (200-linjerstaket, sist 2026-08-31).
