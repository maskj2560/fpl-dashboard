# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-25 (økt 38, Opus: v1.3.4 ute, QA grønn, P1 lukket)

## Status akkurat nå
- **v1.3.4 UTE I PROD siden 25. aug 02:5x — hele v1.3 er dermed ferdig.**
  350/350, lint 0 (baseline 322), tag `v1.3.4` = `f61aae2` pushet. Ingen
  sidevisning venter på en AI-tekst: `ai.js` har SWR + `getCached()`, de tre
  sidene leser cachen, `refresh.js` frisker opp på klokka. **Målt i prod rett
  etter deploy med TOM AI-cache:** `/brief` 127 ms, `/nyheter` 92 ms, forsiden
  117 ms, gjentatte besøk 89–99 ms (mot 10 023 ms på v1.3.3-adferden). Begge
  AI-kortene til stede → oppstartstikket varmet tekstene (2 budsjetterte kall).
  Plan arkivert: `docs/arkiv/plan-v134-ai-swr.md`.
- **Prod-QA 25. aug: 402 sjekker, 0 feil** — kjørt ÉN gang mot v1.3.4 og
  dekker dermed også v1.3.3, som aldri ble QA-et. `qa-prod.mjs` **332/332**
  (full 8-siders variant — `/brief` og `/nyheter` er gratis fra v1.3.4, så
  den reduserte 240-varianten var ikke nødvendig), `qa-clubs-prod.mjs`
  **14/14**, `qa-v133.mjs` **56/56**. 11 ruter 200 + 404, `/health`
  ai:true discord:true leagues:1, footer `v1.3.4`.
  **P0-funnet er bekreftet fikset i prod:** klistret tabellhode har 76,7 px
  klaring til toppmenyen på 390 px og 14,6 px på 1440, likt i begge temaer.
- **Docs ryddet + restløpet planlagt 25. aug (økt 39/40):** fire utførte
  filer flyttet til `docs/arkiv/` (nå 17 filer), alle stier rettet.
  Gjeldende plan for ALT som gjenstår: `docs/plan-sluttspurt.md`.
- **Asset-hashen i prod er `d508c47f` — og det er RIKTIG.** Den skiftet ved
  v1.3.3 (`style.css` + `app.js`), ikke ved v1.3.4 (kun `src/`). `000fa6f3`
  var v1.3.2-hashen. Regn den fra git-blobbene, ikke arbeidstreet — Windows
  har CRLF på disk og gir et annet tall enn containeren.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **v1.3.0–v1.3.3 ute siden 24. aug:** tokenpalett i to temaer, temabryter,
  klubbgrafikk, finpuss per side og QA-rettelsene. Detaljer rotert til
  `docs/arkiv/HANDOVER-historikk.md`; planer i `docs/arkiv/`. Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen. Ny måling i uken
  etter 31. aug (prisskiftet), nå mot taktbudsjettet ~41–45 kall/uke, kø-punkt 1.
- **Git akkurat nå:** `main` = `origin/main` = `f61aae2`, tag `v1.3.4`
  pushet. Featurebranchen `feat/ai-swr-v134` er merget (`--no-ff`) og kan
  slettes lokalt. Rent tre.
- Eldre status (v1.2.3, doks-opprydning, versjonsplan, v1.2.4): arkivert.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4 (kø 1): kostnadsmåling uken etter 31. aug — nå mot taktbudsjettet
   ~41–45 kall/uke (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P3 (kø 2): etter GW2, transfers-skjema mot ekte data + `/overganger`
   på mobil.
3. P2 `[Marius]` (kø 3): README-skjermbilder + mobil-QA. Her hører også
   Marius' gamle åpne boks hjemme: «Visuell sjekk mot mockupen i begge
   temaer» (Task 1.0-5).
4. Robusthetsreleasene v1.3.5–v1.4.0 (kø 4) — alle besluttet 25. aug,
   detaljene i `docs/plan-sluttspurt.md`.
**P1 er LUKKET 25. aug** (auto-briefen bekreftet i Discord), og dermed er
sjekkpunkt A ferdig i sin helhet.

## Driftslærdommer (ikke glem disse)

- **401 med `Basic realm="traefik"`: sjekk FØRST om «HTTP Basic
  Authentication» er slått på for appen i Coolify.** Haken henger en
  Traefik basicauth-middleware på HTTPS-routeren og rammer ALLE stier,
  også `/health` — og `realm="traefik"` er Traefiks standardrealm for
  BasicAuth, ikke et tegn på manglende rute. En manglende app-rute gir
  normalt 404, ikke 401. Redeploy hjelper ikke (tre forsøk 24. aug);
  fjern haken + Redeploy løste det (25. aug). Routeren pekte riktig på
  port 3000 hele tiden.
- **Coolifys «Running (healthy)» sier bare at appen svarer INNE i
  containeren.** Coolifys egen HTTP-sjekk overstyrer Dockerfilens
  HEALTHCHECK, og den genererte kommandoen brukte `curl`, som ikke finnes i
  `node:22-alpine`: `curl: not found | Return code: 0` → «healthy» mens prod
  svarte 401 på alt. Fikset 25. aug (Coolifys sjekk AV). **MEN:** også den
  riktige sjekken kaller `localhost:3000` utenom Traefik — den ville meldt
  «healthy» gjennom hele 401-incidenten også. «Prod svarer rart» feilsøkes
  ALLTID utenfra først. Detaljer + bevis-krav: DEPLOY.md.
- **`kill 1` stopper ikke appen i containeren** (målt 25. aug: null effekt,
  containeren restartet aldri). PID 1 i et container-namespace mottar kun
  signaler den har egen handler for, og appen har ingen SIGTERM-handler.
  Trygg måte å teste helsesjekken på: `docker pause` + `docker unpause`.
  Aldri `docker stop`/`kill` på prod — `unless-stopped` lar den bli nede.
- **Sjekk at fila ikke finnes før du «oppretter» den:** planen sa
  «Create `test/format.test.js`», men fila fantes med 3 tester fra
  v1.2.0. Write overskrev dem stille, og det ble bare synlig fordi
  testtallet ble 302 i stedet for 305. Gjenopprettet med `git checkout`.
- **Restart serveren etter endringer i `src/`:** ESM-moduler lastes én
  gang ved oppstart, så en Playwright-kjøring mot en gammel prosess gir
  falske funn (CSS og views slo gjennom med én gang, `format.js` ikke).
- **En CSS-overstyring må stå ETTER regelen den overstyrer:** en
  medieblokk lenger oppe i fila har lik spesifisitet og taper cascaden.
  `.table-scroll--pinned`-reserven lå i ≤640-blokka på linje 307, mens
  basisregelen står på ~577 — reserven hadde null effekt (målt: boksen ble
  502 px, ikke 406 px). Oppdaget i økt 34.
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
- **Klubbgrafikken må hentes på nytt hver sesong:** `npm run fetch-clubs` +
  bump `IMG_VERSION` i `src/middleware.js` i SAMME commit — ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutinen står i DEPLOY.md
  («Klubbgrafikk (ny sesong)»).
- **Skriv `\r\n` i node-patchskript mot docs/kildefiler** — repoets filer er
  CRLF, og en enkelt `\n` gir en fil med blandede linjeskift (skjedde i
  `docs/VIDERE.md` i økt 32, normalisert med en regex på `(?<!\r)\n`).
- **Bash-heredoc med apostrofer i innholdet feiler** i dette verktøyet
  (wrapperen bruker enkle anførselstegn) — bruk Write/Edit for filer med
  `'` i teksten (CSS, norsk prosa).
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser repoets `.env` UANSETT `--env-file`.
  Riktig teknikk: sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` som
  TOMME i en scratchpad-.env — `--env-file` setter dem først, `loadEnvFile`
  overskriver ikke. Verifiser med `/health` → `ai:false, discord:false`.
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip koster penger — GJELDER KUN T.O.M. v1.3.3:** `GET /brief`
  og `/nyheter` genererte AI-tekst per besøk. Deploy-/verifiseringsplaner
  måtte utelate dem fra sveip eller budsjettere (~6 kall / ~$0,07 sist).
  Fra v1.3.4 leser rutene kun cachen, og et besøk koster ingenting — de kan
  inngå i sveip igjen så snart v1.3.4 er verifisert i prod.
  `/api/brief.json` har alltid vært ren data og trygg.
- **Per-funksjon-AI-kostnad kan ikke måles retroaktivt:** Coolify-loggen er
  100 linjer og nullstilles ved hver deploy. Skal fordelingen måles, må
  `AI-kall:`-linjene samles løpende (f.eks. før hver deploy).
- **En ren merge er ikke bevis på en riktig merge:** git plasserte
  v1.2.3-punkter inni `[1.2.2]`-seksjonen i CHANGELOG uten konflikt — 
  plasseringen må inspiseres, ikke antas.
- Cloudflare overstyrer origins `no-cache` med `max-age=14400` på
  uversjonerte assets (Browser Cache TTL 4 t). Ufarlig — all HTML refererer
  versjonerte URL-er (`?v=<hash>`); hash endres bare når CSS/JS endres.
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
- UI-overhalingen (24. aug, økt 30): alle 15 designbeslutninger står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen: ett
  spørsmålssett om gangen, anbefaling først — Marius valgte anbefalingen
  på alle 15. Den formen gjelder videre.
- Doks-opprydningen (23. aug, økt 24): konsumerte prompter slettes, utførte
  planer arkiveres til `docs/arkiv/`; docs/-rot holdes på ~7 filer;
  ROADMAP-køen har promptstruktur-fiksen øverst; HANDOVER-tak 200 linjer
  med rotering til `docs/arkiv/HANDOVER-historikk.md`.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-08-25 (økt 39 Fable + økt 40 Opus): planøkt «sluttspurten». Marius
  besluttet: alle fire robusthetskandidatene bygges (v1.3.5 SIGTERM →
  v1.3.6 gameUpdating → v1.3.7 brief-markør → etter P4: v1.3.8 genitiv +
  v1.4.0 alderstak/dataAlder), promptendringen i filterSummaryPoints
  droppet, volum `/app/data` i Coolify, port9 + tre utførte filer
  arkivert. Plan: `docs/plan-sluttspurt.md`. Handling: Task 0 utført.
- 2026-08-25 (økt 38, Opus): kjøreprompt «ferdigstill v1.3.4-releasen +
  samlet prod-QA» etter planøkt 37. Rammer: 0 ekte AI-kall, prod-`/brief`
  og `/nyheter` røres ikke før v1.3.4 er ute, aldri push uten klarsignal.
  Handling: Task 1 (docs-rettelser, 3 commits) + Task 3a–e (1.3.4,
  CHANGELOG-flytt, merge `--no-ff` + tag lokalt), 350/350 + lint 0.
  Deretter lukket Marius helsesjekken via Claude in Chrome (alt. a, bevis
  (i) grønt; `kill 1` virket ikke, se lærdom). Klarsignal «push» 02:47 →
  pushet, prod-verifisert og QA-et: **402 sjekker, 0 feil**. Task 0–6
  fullført; hele v1.3 er dermed ute. Til slutt sendte Marius skjermbilde av
  auto-briefen fra 20. aug 19:30 i Discord → **P1 lukket**.
- Loggposter fra økt 22–37: rotert til `docs/arkiv/HANDOVER-historikk.md`
  (200-linjerstaket, sist 2026-08-25).
