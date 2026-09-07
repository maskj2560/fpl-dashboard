# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-07 (økt 64, Fable: sjekkpunkt D remålt, v1.15.0 «Kostnadskontroll» bygget)

## Status akkurat nå
- **v1.15.0 «Kostnadskontroll» bygget 7. sep (økt 64, Fable) — IKKE deployet ennå.**
  Sjekkpunkt D remålt fra prod-`aiStats`: $0,76/uke brutto, men 24–36 av 52 kall var
  deploystøy (3 kall per restart — cachen bodde i minnet). Fiks: AI-cachen persisteres i
  `DATA_DIR/ai-cache.json` merket med `config.version` (docs-push = 0 kall), pluss
  `npm run ai-kostnad` + `aiCost.js`. 861 tester (860 + 1 hoppet over lokalt: krever tom
  nøkkel, CI dekker den), lint 0. Branch `feat/ai-cache-kostnad-v1150`.
- **v1.14.0 «Funksjonssveip» i prod 7. sep 13:33 (økt 63, Fable).** Åtte funksjoner
  på FPL-felt appen alt hentet, men aldri leste: prisprognose (/overganger),
  poengoppdeling (/live), «Runden i tall» (/), «Topp X %» (/lag), forsvarsbidrag
  (/spillere + kort), spillerkort-pakka, låneklausul + nyhetsdato (Lagsjekk, Ukens
  flagg), «Dine plasseringer» (/liga). Bygget i økt 62 (Opus) med rød test først:
  **841/841 + lint 0** (baseline 809), 0 nye FPL-kall, 0 nye avhengigheter. Merge
  `7e50060`, CI `34117185708` grønn på Node 22 og 24, hash `90e9512f`. Prod-sjekk
  13:40: footer v1.14.0, `<script` 2 på `/`, `/health` 200 med `aiStats` (48 kall,
  0 failures), 9 sider 200, alle åtte bekreftet (`explain` ×15 i live-json,
  `klausuler: [16,27]` på spiller 160, Raya 5 sesonger + nr. 3 av 71 keepere).
  Kjøreprompten: `git show 225f053:docs/prompt-feltpakka-v1140.md`.
- **v1.13.2 (4. sep, 809/809, hash `781ffae6`), v1.13.1 (4. sep, 792/792) og v1.13.0 +
  v1.8.3–v1.12.2 (2. sep)** — detaljene i historikkfila.
- **Feilsiden i prod er ikke visuelt bevist ennå** (fiksen er låst av tester).
  Ved neste 503-vindu: sjekk at `/` viser «FPL oppdaterer spillet», ikke ren tekst.
- **Asset-hash i prod: `90e9512f`** (v1.13.2 `781ffae6`, v1.12.1–v1.13.1 `ba91839a`,
  eldre i historikkfila). Regnes fra git-blobbene (LF), ikke arbeidstreet (CRLF).
- **Ekte SIGTERM-bevis mangler.** Beviset er `kill 1` i containerterminalen — de
  to avslutningslinjene skal stå der. Lokalt bevist med `SIGINT`, exit 0.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
- **Kostnad: remålt 7. sep — under $1/uke, ingen tiltak.** Priser live-verifisert $2/$10
  (ingen økning 1. sep — dokumentets «$3/$15» var feil). Følges i `console.anthropic.com`;
  `npm run ai-kostnad` regner fra `/health`. Takt **~49–53 organiske AI-kall/uke**.
- **Git:** kun `main` finnes lokalt og på origin — hver feature-branch merges
  `--no-ff` og slettes begge steder. Tagger t.o.m. `v1.14.0`.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

**Ferdig og i prod — ROADMAP § 0, § 5, § 6, § 7, § 8:** sluttpakka v1.8.3–v1.12.0
(`docs/arkiv/plan-sluttpakka-v183-v1120.md`, 9-punkts fasit — ikke re-spør),
v1.12.2/v1.13.0 (`git show d34e3c8:…`), v1.13.1 (`git show e63bd4b:…`),
v1.13.2 (`git show 162ca4d:…`) og v1.14.0 (`git show 225f053:docs/prompt-feltpakka-v1140.md`).

**Neste: slipp v1.15.0** (branchen er ferdig): push → CI grønn → `anyLive:false` → merge
`--no-ff` → tag → push → prod-sjekk (footer, `<script` 2, `/health`: `totals.calls` = før + 3,
sw-hash). **Beviset for 0-kall-deploy:** push prod-bevis-docs-commiten for seg og se at
`totals.calls` står stille og loggen sier «AI-cache lastet fra disk: 3 tekster».
Deploy-vindu: GW3 ferdig ~8. sep; **ikke fre 11. sep 13:30–15:30** (auto-brief GW4 ~14:30),
ikke lør 12. sep 11:00–14:30 (Lagsjekk + deadline), ikke under kampene lør 12.–man 14.
Deretter ikke besluttet: kandidat **D** fra økt 57 — slanking av `style.css` (2612 linjer)
og `app.js` (1503 linjer), krever brainstorming med Marius først (ett spørsmålssett om
gangen, anbefaling først). Andre kandidater under «Senere / idéer» i ROADMAP.

**Majors ikke oppgradert (Marius' fasit 2. sep):** `ejs` 6, `eslint` 10, `globals` 17 — vurderingen i historikkfila (økt 58).

**Kun Marius kan gjøre:**
1. `kill 1` i containerterminalen → «SIGTERM mottatt — lukker serveren» +
   «Serveren lukket ryddig» (siste bevis for v1.3.5).
2. Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px, ikke ekte touch).
3. Kostnad i `console.anthropic.com` (P4, løpende). Nå: Cost 2.–7. sep mot `aiStats`
   sine $0,51 — bekrefter at telleren fanger alt. Etter GW4 (fra 15. sep):
   `npm run ai-kostnad -- https://fpl.marsk.no/health` → `league-report:4` = 1 kall.
4. Chrome-QA-rest (re-QA 11/11 bestått 2. sep): STEG 7 (/live under kamp), 9c
   (installer-tilbud), 9e (offline i DevTools); etter første bytte: stat-fliser på
   /overganger (390 px) + «−0,3» i Prisgevinst.

## Driftslærdommer (ikke glem disse)

- **Branch protection finnes ikke på gratis privat repo** (rulesets `[]`, målt
  4. sep). Vakten for `main` er derfor `.githooks/pre-push` (test + lint) og
  CI-en på Node 22/24. Hooken er IKKE aktiv før `npm run hooks` er kjørt på
  maskinen — `git config core.hooksPath` skal svare `.githooks`. Flyt: branch →
  push → CI grønn → merge `--no-ff` → push `main`.
- **En mock som KASTER for en FPL-sti koster sekunder i retry-søvn** (`fplFetch` prøver
  på nytt for alt unntatt 503/404). Ukjent FPL-sti skal svare `{ ok: false, status: 404 }`
  — mønsteret ligger i `test/fixtures/fpl-world.js`.
- **`/live` har tre `<script>`-tagger, ikke to.** Den tredje er
  `<script type="application/json">` med live-dataene — en databeholder som
  ikke kjøres. Script-tellingen i prod-sjekken gjelder `/`.

- **Stale-banner på /live mellom runder var delt cache-nøkkel, ikke nett** — lukket i
  v1.12.2 med egne `:hist`-nøkler. Diagnose: to `/api/live.json`-kall — stiger
  `dataAlder` mens FPL svarer, er det cachen.
- **FPL-bootstrap `chips[]`: wildcard og Free Hit har `start_event` 2** (kan
  ikke spilles i runde 1) — halvdeler grupperes på `stop_event`, aldri på
  (start, stopp)-paret.
- **To Coolify-lærdommer fra 25. aug (fullt løst, detaljene i historikkfila):** en
  huket «HTTP Basic Authentication» gir 401 på ALLE stier inkl. `/health`, og
  «Running (healthy)» sier bare at appen svarer INNE i containeren. «Prod svarer
  rart» feilsøkes ALLTID utenfra først.
- **`kill 1` virker FRA v1.3.5 — før det gjorde det ingenting** (målt 25. aug): PID 1 i
  et container-namespace mottar kun signaler den har egen handler for. Med
  `createShutdown` er `kill 1` den trygge måten å bevise ryddig avslutning — containeren
  restartes av `unless-stopped` og BEHOLDER loggen. Aldri `docker stop`/`kill` på prod.
- **Restart serveren etter endringer i `src/`** — ESM lastes én gang.
- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved starten av økt 30
  lå `main` 2 docs-commits foran origin selv om prompten sa «main = origin/main».
- **Klubbgrafikken hentes på nytt hver sesong:** `npm run fetch-clubs` + bump
  `IMG_VERSION` i `src/middleware.js` i SAMME commit, ellers serverer
  Cloudflare fjorårets drakter som `immutable`. Rutine: DEPLOY.md.
- **ALLE docs er CRLF i arbeidstreet (LF i indeksen, `core.autocrlf=true`; ROADMAP har
  BOM).** Et node-`replace` med LF i søkestrengen MATCHER IKKE og feiler STILLE (skjedde
  i økt 45, og igjen i økt 62 der `\n` i et `node -e`-argument ble en EKTE linjeskift i
  fila). Bruk Edit-verktøyet på docs. `sed -i` er forbudt. Nye filer: LF, git normaliserer.
- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser `.env` UANSETT `--env-file`. Sett
  `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME i `process.env` før start —
  fra Git Bash (`ANTHROPIC_API_KEY= DISCORD_WEBHOOK_URL= node src/server.js`);
  PowerShell SLETTER tomme `$env:`-variabler. Verifiser: `/health` → `ai:false, discord:false`.
- **Aldri push/deploy i timen rundt auto-briefen** (24 t før `deadline_time`: torsdag
  ~19:30 for en fredagsdeadline, **fredag ~14:30 for en lørdagsdeadline som GW4**) eller
  Lagsjekken (3 t før). Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip er GRATIS fra v1.3.4** (verifisert i prod 25. aug):
  `/brief` og `/nyheter` leser kun cachen. T.o.m. v1.3.3 kostet hvert besøk
  et AI-kall. Unntaket består: klikk ALDRI «Spør AI om råd» på `/lag` i en
  verifisering — det er det eneste stedet et klikk kan utløse et kall.
- **Hver restart kostet 3 AI-kall t.o.m. v1.14.0** (oppstartstikket: brief + nyheter +
  overgangskommentar — cachen bodde i minnet; 24–36 av 52 kall 2.–7. sep). Fra v1.15.0
  ligger tekstene i volumets `ai-cache.json` merket med versjon: docs-push = 0 kall, ny
  versjon = 3. Bundle likevel docs-pusher.
- **Per-funksjon-AI-kostnad leses på `/health` (fra v1.13.0):** `aiStats`
  har `since`, `totals` og `byKey.<cacheKey>` (calls/inputTokens/
  outputTokens/failures/lastAt/model), persistert i volumets
  `ai-stats.json` — overlever deploy. Coolify-loggen (100 linjer,
  nullstilles ved deploy) trengs ikke lenger for dette.
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
- **Picks for kommende runde er ikke offentlige før deadline** (API-et gir
  404). Alt som skal se «laget for runde N» før deadline må bruke picks fra
  N−1 + `entry/{id}/transfers/` (som ER synlig før deadline).
- `event_transfers_cost` ligger i `history.current` (per runde), ikke på
  radene i `entry/{id}/transfers/` (verifisert 2. sep mot en rival).

## Brukerens beslutninger (IKKE re-spør)

- Tiltale: **Marius** — alle svar starter med «Hei Marius!».
- AI-modell: `claude-sonnet-5` via `AI_MODEL`-env (`claude-haiku-4-5` billig-alternativ).
- Kostnadskrav: AI billig for én person — alt on-demand + cachet.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.
- UI-overhalingen (økt 30): de 15 designbeslutningene står i
  `docs/arkiv/plan-v130-ui-overhaul.md` §2. Brainstorming-formen gjelder
  videre: ett spørsmålssett om gangen, anbefaling først.
- Doks-opprydningen (økt 24): konsumerte prompter slettes, utførte planer
  arkiveres til `docs/arkiv/`, docs/-rot holdes lav, HANDOVER-tak 200
  linjer med rotering til historikkfila.
- **v1.8.0 (1. sep):** fasit i `docs/arkiv/plan-spillerpakka-v180.md`.
- **Sluttpakka (1. sep, økt 53):** 9-punkts fasit i
  `docs/arkiv/plan-sluttpakka-v183-v1120.md` — AI-økten merger/pusher selv per
  versjon, 0 nye AI-kall, ingen e-post/spillerbilder/Playwright i repo.
- Eldre, fortsatt gyldige beslutninger: rotert til historikkfila.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Logg over brukerbeskjeder (siste økter — eldre: `docs/arkiv/HANDOVER-historikk.md`)

- 2026-09-07 (økt 64, Fable): «Lag en planlegging for sjekkpunkt D». Handling: plan mode —
  prod-`aiStats` hentet, priser live-verifisert (ingen økning 1. sep), deploystøyen påvist
  (3 kall per restart). Ett spørsmålssett: scope (måling + doc + v1.15.0 med skript) og
  invalidering (ved versjonsbytte) — Marius valgte anbefalingene. Bygget med rød test først
  (841 → 861), docs ajour. Ikke pushet ennå.

- 2026-09-07 (økt 63, Fable): «lag en oppsummering av hva som trengs», «er v1.14 ferdig
  eller må det gjøres noe?», «da kan vi slippe v1.14.0». Handling: slippelista kjørt i
  rekkefølge — 841/841 + lint 0 på branchen, `anyLive: false` målt, merge `--no-ff`
  `7e50060`, tag `v1.14.0`, push, branch slettet begge steder, CI `34117185708` grønn
  (22 + 24), prod-sjekk grønn med alle åtte funksjoner bekreftet, hash `90e9512f`,
  kjøreprompten slettet, docs ajour. 0 kode.

