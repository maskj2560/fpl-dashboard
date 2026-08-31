# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-31 (økt 44, Fable: detaljplan v1.7.0 «/innsikt» godkjent)

## Status akkurat nå
- **v1.7.0-detaljplanen GODKJENT 31. aug:** `docs/plan-innsikt-v170.md`
  (T1–T10, testtall 509 → 549, kall-budsjett 2G+2, AI-budsjett 0).
  Alle datafelt målt mot ekte API i planøkta — inkl. autosub-multiplier
  (FPL re-sorterer picks: XI = multiplier > 0) og BB (points_on_bench=0).
  Bygges av Opus på `feat/innsikt-v170` fra `main`; kjøreprompt levert.
- **v1.3.8, v1.4.0, v1.5.0 og v1.6.0 UTE I PROD 28. aug kl. 14:49.**
  Fire `--no-ff`-merger i rekkefølge (v138 → v140 → v150 → v160), alle
  «Merge made by the 'ort' strategy», null konflikt; tagger `v1.3.8`,
  `v1.4.0`, `v1.5.0`, `v1.6.0` pushet. **509/509 + lint 0** både på
  `feat/liga-v160` før merge og på merget `main`. Prod-bevis (utenfra,
  28. aug): footer `v1.6.0 · sist oppdatert fredag 28. august kl. 14:49`;
  `/health` 200 med `ai:true, discord:true, teamId:true, leagues:1`;
  rutesveip `/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`,
  `/nyheter`, `/overganger`, `/api/brief.json`, `/api/live.json` alle
  200 og `/finnesikke` 404; `/liga` har Rival-radar, `rival-select`,
  Kaptein-liga, Sesongutvikling, `league-graph` og «Rundens rapport»
  (runde 1, AI-merke); `/overganger` viser tomtilstanden «Ingen
  overganger registrert ennå» (korrekt — 0 bytter); `dataAlder` finnes
  i både `/api/brief.json` og `/api/live.json` (56 s ved sjekken).
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
- **Asset-hashen i prod er `f9014751` fra 28. aug** (var `d508c47f`
  t.o.m. v1.3.7 — v1.5.0/v1.6.0 endret både `style.css` og `app.js`).
  Verdien ble regnet ut på forhånd fra git-blobbene (sha1 av
  `style.css` + `app.js`, første 8 tegn) og stemte eksakt med prod —
  regn den ALLTID fra git-blobbene, aldri fra arbeidstreet (CRLF på
  disk gir et annet tall). Purge er unødvendig: URL-ene er versjonerte.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka er DROPPET** (Marius 28. aug) — han følger forbruket
  løpende i `console.anthropic.com`. Tersklene og skriptet i
  `docs/sjekkpunkt-d-kostnad.md` står ved lag og brukes ved behov.
  Taktbudsjett etter v1.6.0: **~49–53 AI-kall/uke**. Siste måling
  23. aug: $0,94/uke.
- **Git akkurat nå:** `origin` har KUN `main`. De fire
  featurebranchene og `staging` er slettet lokalt og på GitHub med
  `-d`/`--delete` etter grønn prod-verifisering; taggene t.o.m.
  `v1.6.0` er pushet. **Rest:** 12 gamle lokale brancher fra økt ≤ 35
  (`docs/plan-ui-overhaul`, `feat/ai-swr-v134`, `feat/discord-everyone`,
  `feat/hva-hvis-transfers`, `fix/cache-backoff`, `fix/kvalitetspass-v113`,
  `fix/lag-anbefalinger`, `fix/live-bonus`, `fix/news-unknown`,
  `fix/qa-v1.1.1`, `fix/qa-v1.1.2`, `fix/sanitize-brief`) står igjen —
  alle merget, ingen finnes på GitHub. Slettingen ble blokkert av
  verktøyets tillatelsesklassifiserer i økt 43; ryddes med
  `git branch -d <navn>` når som helst.
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
4. **Bygg v1.7.0 «/innsikt»** (kø-punkt 5): planen er godkjent —
   `docs/plan-innsikt-v170.md`. Opus bygger T1–T10 på `feat/innsikt-v170`
   fra `main`. v1.8.0 og v1.9.0 planlegges hver for seg etterpå.
5. **Kostnad:** løpende hos Marius i Anthropic-konsollen — ingen måleuke,
   ingen deploy-fri periode å ta hensyn til.
6. **Kosmetisk:** slett de 12 gamle lokale branchene (se Git-punktet i
   statusen) — `git branch -d`, alle er merget.

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
