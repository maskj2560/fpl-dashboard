# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-09-04 (økt 62, Opus: v1.14.0 «Funksjonssveip» bygget — venter på deploy-vinduet)

## Status akkurat nå
- **v1.14.0 «Funksjonssveip» BYGGET 4. sep (økt 62, Opus) — IKKE I PROD ENNÅ.**
  Åtte funksjoner på FPL-felt appen alt hentet, men aldri leste, alle på
  branchen `feat/funksjonssveip-v1140` (9 commits): prisprognose (/overganger),
  poengoppdeling (/live), «Runden i tall» (/), «Topp X %» (/lag), forsvarsbidrag
  (/spillere + kort), spillerkort-pakka, låneklausul + nyhetsdato (Lagsjekk, Ukens
  flagg), «Dine plasseringer» (/liga). **841/841 + lint 0** (baseline 809), rød test
  først på hver. **0 nye FPL-kall** — `fplClient.js` og `src/pwa/` er urørt
  (`git diff main --stat` tom); kildelåsen i routes.test.js uendret grønn; 0 nye
  avhengigheter. Hver funksjon sett i Playwright ved 390 px i BEGGE temaer, 0 px
  vannrett overflow. Lokal sveip: 11 ruter 200, `<script` = 2 på `/`, `/health` →
  `ai:false, discord:false`.
  **Gjenstår (Marius eller neste økt):** push branch → CI grønn → merge `--no-ff`
  → annotert tag `v1.14.0` → push `main` **tidligst mandag 7. sep** (GW3 spilles
  fre 4. sep 21:00 → søn 6. sep) → prod-sjekk → `git rm docs/prompt-feltpakka-v1140.md`.
  CHANGELOG-datoen står som 2026-09-07 — juster hvis mergen glipper til en annen dag.
- **v1.13.2 i prod 4. sep 04:57** (ti småfiks, 809/809, hash `781ffae6`, CI `33831271617`)
  og **v1.13.1 i prod 4. sep 02:37** (`createApp()`, `app.test.js`, CI Node 22+24,
  pre-push-hook, 792/792, hash `ba91839a`). Fulle detaljer i historikkfila.
- **v1.13.0 og v1.8.3–v1.12.2 i prod 2. sep** (655 → 767 tester) — detaljene i
  historikkfila. Prisvarslene: første Discord-melding var ventet natt til 4. sep.
- **Feilsiden i prod er ikke visuelt bevist ennå** (fiksen er låst av tester).
  Ved neste 503-vindu: sjekk at `/` viser «FPL oppdaterer spillet», ikke ren tekst.
- **Asset-hash i prod: `781ffae6`** (v1.12.1–v1.13.1 `ba91839a`, eldre i
  historikkfila). Regnes fra git-blobbene (LF), ikke arbeidstreet (CRLF).
- **Ekte SIGTERM-bevis mangler.** Beviset er `kill 1` i containerterminalen — de
  to avslutningslinjene skal stå der. Lokalt bevist med `SIGINT`, exit 0.
- **Helsesjekken:** alt. a aktiv (Coolifys sjekk AV, Dockerfilens gjelder).
- **Kostnad: måleuka DROPPET** (28. aug) — følges i `console.anthropic.com`,
  terskler i `docs/sjekkpunkt-d-kostnad.md`. Takt **~49–53 AI-kall/uke**.
- **Git:** kun `main` finnes lokalt og på origin — hver feature-branch merges
  `--no-ff` og slettes begge steder. Tagger t.o.m. `v1.13.2`.
- Eldre status og alle detaljer: `docs/arkiv/HANDOVER-historikk.md`.

## Neste steg (start her)

**Ferdig og i prod — ROADMAP § 0, § 5, § 6, § 7:** sluttpakka v1.8.3–v1.12.0
(`docs/arkiv/plan-sluttpakka-v183-v1120.md`, 9-punkts fasit — ikke re-spør),
v1.12.2/v1.13.0 (`git show d34e3c8:…`), v1.13.1 (`git show e63bd4b:…`) og
v1.13.2 (`git show 162ca4d:…`).

**Neste: slipp v1.14.0 (ROADMAP § 8).** Koden er ferdig og grønn på
`feat/funksjonssveip-v1140`; **CI-kjøring `33885599446` på `d947a04` er grønn på
Node 22 OG 24**, branchen ligger på origin og `main` er urørt. Mandag 7. sep
eller senere, i denne rekkefølgen:

1. `GET https://fpl.marsk.no/api/live.json` → `anyLive` MÅ være `false`; aldri tor. 19–21.
2. `git switch main && git merge --no-ff -m "…" feat/funksjonssveip-v1140`, annotert tag
   `v1.14.0`, push `main` + tag, slett branchen begge steder.
3. Prod-sjekk: footer v1.14.0, `<script` = 2 på `/`, `/health` 200 med `aiStats`, ny
   asset-hash fra `/sw.js` noteres her, 9 sider 200, og grep i prod-HTML: `id="prisprognose"`,
   `live-why` + `explain` i `/api/live.json`, `id="runden-i-tall"`, «topp » i hero-flisen,
   `data-dc`, «Tidligere sesonger» i `/api/spiller/1`, «Låneklausul» i `/api/spiller/160`,
   `id="plasseringer"`.
4. `git rm docs/prompt-feltpakka-v1140.md` + fjern dokumentkart-raden, sett ROADMAP-raden
   til «utført», og skriv merge-commitens CI-run-ID + den nye asset-hashen inn her.

Etter B gjenstår **D** fra økt 57: slanking av `style.css` (2612 linjer) og
`app.js` (1503 linjer — større etter T2/T5/T6). Ikke besluttet.

**Majors ikke oppgradert (Marius' fasit 2. sep):** `ejs` 6, `eslint` 10, `globals` 17 — vurderingen i historikkfila (økt 58).

**Kun Marius kan gjøre:**
1. `kill 1` i containerterminalen → «SIGTERM mottatt — lukker serveren» +
   «Serveren lukket ryddig» (siste bevis for v1.3.5).
2. Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px, ikke ekte touch).
3. Kostnad i `console.anthropic.com` (P4, løpende).
4. Chrome-QA-rest (re-QA 11/11 bestått 2. sep): STEG 7 (/live under kamp,
   fre 4. sep fra 21:00), 9c (installer-tilbud), 9e (offline i DevTools);
   etter første bytte: stat-fliser på /overganger (390 px) + «−0,3» i Prisgevinst.

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
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
  Aldri push mens kamper pågår.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
- **Prod-rutesveip er GRATIS fra v1.3.4** (verifisert i prod 25. aug):
  `/brief` og `/nyheter` leser kun cachen. T.o.m. v1.3.3 kostet hvert besøk
  et AI-kall. Unntaket består: klikk ALDRI «Spør AI om råd» på `/lag` i en
  verifisering — det er det eneste stedet et klikk kan utløse et kall.
- **Hver deploy koster 2 AI-kall** (oppstartstikket: brief + nyheter; målt på
  `/health` 2. sep: calls 2 → 4 over én docs-deploy). Bundle docs-pusher.
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

- 2026-09-04 (økt 62, Opus): Marius limte inn kjøreprompten for v1.14.0. Handling:
  premissene verifisert mot koden og ferskt curl-svar (åtte avvik justert — bl.a.
  at test-verdenen FAKTISK har en type-s-liga og `news_added: null`, og at
  `routes/league.js` ikke hadde noen `Promise.all` å henge `getEntry` på), plan
  godkjent, T1–T8 bygget med rød test først (809 → 841), hver sett i nettleser ved
  390 px i begge temaer. Docs oppdatert. IKKE pushet: deploy-vinduet er mandag 7. sep.

- 2026-09-04 (økt 61, Fable): planprompten for v1.14.0 + «skriv en kjøreprompt til
  opus». Handling: alle 12 endepunkter curlet, felt-diff reprodusert (73/109), ti funn
  A–J verifisert med grep (en agent meldte `most_captained` ubrukt — grep viste
  insights.js:164), tre puljer → alle «Bygg», F+G+J slått sammen. Kjøreprompt skrevet,
  ROADMAP § 8 ajour, planprompten slettet. 0 kode, 0 AI-kall, ingenting pushet.

