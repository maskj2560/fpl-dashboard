# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-28 (økt 43, Opus: v1.3.8–v1.6.0 ut i prod, alle brancher ryddet)

## Status akkurat nå
- **v1.3.8, v1.4.0, v1.5.0 og v1.6.0 MERGET OG TAGGET på `main` 28. aug.**
  Fire `--no-ff`-merger i rekkefølge (v138 → v140 → v150 → v160), alle
  «Merge made by the 'ort' strategy», null konflikt. Tagger: `v1.3.8`,
  `v1.4.0`, `v1.5.0`, `v1.6.0`. **509/509 + lint 0** både på
  `feat/liga-v160` før merge og på merget `main`. Prod-beviset (footer,
  `/health`, rutesveip, ny asset-hash) føres inn i en egen docs-commit
  rett etter deployen — samme økt.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted (gammel
  containers stdout slettes). Beviset er `kill 1` i containerterminalen
  (containeren restartes, loggen beholdes) — de to avslutningslinjene
  skal stå der. Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **v1.3.7 ute i prod siden 26. aug.** Volumet `/app/data` er aktivt
  (navngitt volum `…-fpl-data`). Gjenstående markør-bevis: «Brief-markør
  lastet: runde 2 er alt sendt» i loggen ved første omstart ETTER
  torsdagens auto-brief.
- **P2-skjermbildene tatt og committet 26. aug** (Playwright mot prod,
  mørkt tema, `docs/img/`, lenket fra README). Rest: ekte telefon.
- **Prod-QA 25. aug: 402 sjekker, 0 feil** mot v1.3.4 (dekker også
  v1.3.3); detaljene er rotert til historikken.
- **Asset-hashen var `d508c47f` t.o.m. v1.3.7.** v1.5.0/v1.6.0 endrer
  `style.css` OG `app.js`, så hashen SKAL være ny etter denne deployen —
  den nye føres inn her ved prod-verifiseringen. Regn den fra
  git-blobbene, ikke arbeidstreet (CRLF på disk).
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka er DROPPET** (Marius 28. aug) — han følger forbruket
  løpende i `console.anthropic.com`. Tersklene og skriptet i
  `docs/sjekkpunkt-d-kostnad.md` står ved lag og brukes ved behov.
  Taktbudsjett etter v1.6.0: **~49–53 AI-kall/uke**. Siste måling
  23. aug: $0,94/uke.
- **Git akkurat nå:** alt ligger på `main`. Én push (= én Coolify-deploy)
  tar med taggene `v1.3.7`–`v1.6.0`. De fire featurebranchene og
  `staging` slettes lokalt og på GitHub etter grønn prod-verifisering.
- Eldre status (v1.3.0–v1.3.7, idépakke-beslutningen, prod-QA-detaljene,
  branch-statusen før mergen): `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

Køen i `ROADMAP.md` er den langsiktige prioriteringen. Punkt 1–2 kan bare
Marius gjøre.

1. `[Marius]` **`kill 1` i containerterminalen** → de to avslutningslinjene
   («SIGTERM mottatt — lukker serveren», «Serveren lukket ryddig») er det
   siste beviset for v1.3.5.
2. `[Marius]` **Mobil-QA på ekte telefon** (P2-resten) — særlig de nye
   sidene `/overganger` og `/liga` på 390 px, pluss mockup-sjekk i begge
   temaer.
3. **P3 ved første ekte transfer:** feltnavnene i
   `entry/5330646/transfers/` (`element_in`, `element_out`, `event`,
   `time`, `event_transfers_cost`) mot ekte API. Marius bytter ikke i GW2
   (besluttet 28. aug), så porten venter på hans første ekte bytte. Til da
   er tomtilstanden på `/overganger` korrekt — 0 bytter.
4. **Detaljplan-økt for v1.7.0 «/innsikt»** (kø-punkt 5; beslutningsfasit:
   `docs/plan-idepakken-v16-v19.md`). v1.8.0 og v1.9.0 planlegges hver
   for seg etterpå.
5. **Kostnad:** løpende hos Marius i Anthropic-konsollen — ingen måleuke,
   ingen deploy-fri periode å ta hensyn til.

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
- **Restart serveren etter endringer i `src/`:** ESM lastes én gang ved
  oppstart, så en Playwright-kjøring mot en gammel prosess gir falske funn.
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
- **Måleuka droppet (28. aug):** kostnaden følges løpende av Marius i
  `console.anthropic.com` — ingen stille uke uten deploy. Samme dag:
  ingen bytter i GW2, så P3 venter på hans første ekte transfer.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-08-26 (økt 41, senere): «planlegg hele Overganger-siden perfekt fram
  til testing — hva hvis, all transfer-tracking, masse kul info, still meg
  masse spørsmål». Handling: 3 spørsmålsrunder (alle valg i planens
  Beslutninger-liste; Marius krevde FT-rekonstruksjon i stedet for rå
  poeng), fasit i `docs/plan-overganger-v150.md`, og hele v1.5.0
  TDD-bygget ferdig på `feat/overganger-v150` (T1–T13, 454/454, lint 0,
  røyktest med tomme nøkler + scenario-syklus mot ekte data). Valget
  «AI-kommentar JA» overstyrer «uten AI-kommentar i v1» i beslutningslista.
- 2026-08-27 (økt 42): «Har du andre kule ideer? Lang liste, spør meg
  hvilke jeg vil ha og hvordan hver skal fungere.» Handling: 21 idéer
  presentert, Marius valgte alle 16 hovedidéer; 4 spørsmålsrunder ga
  fasit for hver — `docs/plan-idepakken-v16-v19.md`, fire versjoner
  v1.6.0–v1.9.0 i ROADMAP. Deretter: «Lag en ny branch på github til
  dette. Et staging miljø eller noe» → `staging` + de tre kodebranchene
  pushet til GitHub (ingen deploy — Coolify bygger kun main). Så: «Skal
  vi begynne å jobbe med det nå?» → planlegg + bygg valgt, kaptein-tak
  10 runder godkjent, v1.6.0 TDD-bygget ferdig på `feat/liga-v160`.
- 2026-08-28 (økt 43, Opus): «briefen kom i går; jeg bytter ikke denne
  uka; alt ferdigbygget skal til `main` nå; slett alle andre brancher,
  også `staging`; kostnadskontrollen tar jeg selv i Anthropic-konsollen
  — dropp måleuka.» Handling: v1.3.8 → v1.4.0 → v1.5.0 → v1.6.0 merget
  `--no-ff` og tagget på `main` (509/509 + lint 0 før og etter),
  CHANGELOG-datoene satt til 2026-08-28, ROADMAP-tabellen og kø-punkt
  1/2/4/5 + dokumentkartet ajour, VIDERE.md skrevet om til v1.6.0,
  de tre planfilene arkivert til `docs/arkiv/`, denne fila rotert og
  oppdatert. Deretter: én push (= én Coolify-deploy), prod-verifisering
  utenfra og sletting av alle brancher unntatt `main` — resultatet
  føres inn i statusblokka over i en egen docs-commit samme økt.
- Loggposter fra økt 22–41 (første del): rotert til
  `docs/arkiv/HANDOVER-historikk.md` (200-linjerstaket, sist 2026-08-26).
