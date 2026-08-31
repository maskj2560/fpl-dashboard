# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-01 (økt 46, Fable: v1.7.1 ute i prod)

## Status akkurat nå
- **v1.7.1 «UX-polering» UTE I PROD 1. sep rett etter midnatt.** Bygget
  31. aug (12 godkjente småfiks fra full funksjonsgjennomgang — Marius
  valgte «Fiks» på alle 12), merge holdt til etter kampslutt («Kampen er
  ferdig» 1. sep): merget `--no-ff` (`1633969`), tagget `v1.7.1`, én
  push. **556/556 + lint 0** på branch OG merget main. Innhold: no-store
  på /api, «neste tidligst» på /nyheter, grafakser /lag+/liga,
  statusfilter + sort-generalisering (`table[data-sortable]`, sortering
  overlever live-polling), krysslenker `/spillere?sok=`, forklaringer
  (flagg, FDR, xG/xA, lovlig ellever), venter/angret-badges på
  /overganger. Pakke 8 (liga-lenker) og 11 (aria-live) krevde INGEN
  endring — fantes alt. Prod-bevis utenfra 1. sep: footer `v1.7.1`,
  `/health` 200 `ai:true, discord:true, leagues:1`, alle 9 ruter 200 +
  `/finnesikke` 404, `/api/live.json` svarer `Cache-Control: no-store`,
  alle nye features spot-sjekket i markupen (30 krysslenker på
  dashbordet). Røyktest 31. aug med tomme nøkler: 0 «AI-kall:»-linjer.
- **v1.7.0 «/innsikt» ute i prod 31. aug kl. 16:46** (`a25ac0a`, tag
  `v1.7.0`, 549/549). Prod-beviset er rotert til historikkfila.
- **v1.3.8, v1.4.0, v1.5.0 og v1.6.0 UTE I PROD 28. aug kl. 14:49** —
  fire `--no-ff`-merger, tagget, 509/509 + lint 0. Prod-beviset er
  rotert til `docs/arkiv/HANDOVER-historikk.md`.
- **Ekte SIGTERM-bevis mangler.** Deploy-loggen er feil sted; beviset er
  `kill 1` i containerterminalen — de to avslutningslinjene skal stå der.
  Lokalt bevist med `process.emit('SIGINT')`, exit 0.
- **Asset-hashen i prod er `397624a7` fra 1. sep** (v1.7.1 endret
  style.css + app.js — hashen byttet fra `f9014751` som ventet). Regn den
  alltid fra git-blobbene, aldri fra arbeidstreet — se lærdommene.
  v1.3.7-markørbeviset og P2-detaljene: rotert til historikkfila 31. aug.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
  Se lærdommene under for hva den IKKE fanger.
- **Kostnad: måleuka er DROPPET** (Marius 28. aug) — han følger forbruket
  løpende i `console.anthropic.com`; tersklene og skriptet i
  `docs/sjekkpunkt-d-kostnad.md` brukes ved behov. Taktbudsjett
  **~49–53 AI-kall/uke** (v1.7.0 legger til 0). Siste måling 23. aug:
  $0,94/uke.
- **Git akkurat nå:** `main` = `origin/main`; `origin` har KUN `main`,
  taggene t.o.m. `v1.7.1` er pushet. `feat/ux-polering-v171` er slettet
  lokalt (ble aldri pushet). **Rest:** 12 gamle, merget lokale brancher
  fra økt ≤ 35 (navnene i historikkfila) — ryddes med `git branch -d`
  når som helst.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

Køen i `ROADMAP.md` er den langsiktige prioriteringen. Punkt 1–2 kan bare
Marius gjøre.

1. `[Marius]` **Mobil-QA på ekte telefon** (P2-resten) — `/overganger`,
   `/liga` og nå `/innsikt` på 390 px, i begge temaer. **Nav har nå 9
   punkter** — sjekk at scrollnavet med kantfade (v1.1.2) holder.
2. `[Marius]` **`kill 1` i containerterminalen** → de to avslutningslinjene
   («SIGTERM mottatt — lukker serveren», «Serveren lukket ryddig») er det
   siste beviset for v1.3.5.
3. **Bygg v1.8.0 «Spiller-pakka»** (kø-punkt 5): spillerkort, duell,
   differensialer, straffer. Detaljplan-økt først (T-tasks, TDD), som for
   v1.6.0 og v1.7.0. Fasit: `docs/plan-idepakken-v16-v19.md`.
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

- 2026-08-31 (økt 45, del 2): «Jeg er ikke hjemme. du kan merge og pushe
  til main.» Handling: sjekket deploy-vinduet FØRST (mandag 16:44, 0
  kamper i gang, neste avspark 21:00) → merget `--no-ff`, verifiserte
  CHANGELOG-rekkefølgen og 549/549 + lint 0 på merget `main`, tagget
  `v1.7.0`, én push kl. 16:46. Prod grønt utenfra (se statusen).
  Etterpå: planen arkivert, `feat/innsikt-v170` slettet lokalt, docs ajour.
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
- 2026-09-01 (økt 46, del 2): «Kampen er ferdig». Handling: merget
  `--no-ff`, verifiserte 556/556 + lint 0 og CHANGELOG-rekkefølgen på
  merget main, tagget `v1.7.1`, pushet, prod-bevis utenfra (se statusen),
  branch slettet, docs ajour.
- 2026-08-31 (økt 46, Fable): «gå gjennom hver eneste funksjon jeg kan
  gjøre på siden … Spørr meg om jeg vil beholde det slik det er eller det
  du tenker kunne fikses.» Handling: tre Explore-agenter kartla alle 9
  sider + tverrgående; 12 forslag i tre AskUserQuestion-puljer — Marius
  valgte «Fiks (Anbefalt)» på ALLE 12. Bygget som v1.7.1 med TDD på
  logikken (noStore, nextSummaryUpdateAt, rankGraph-akser, compareCells/
  rowMatchesFilters/queryParam). Merge holdt tilbake: avspark 21:00.
- Loggposter fra økt 22–43: rotert til
  `docs/arkiv/HANDOVER-historikk.md` (200-linjerstaket, sist 2026-08-31).
