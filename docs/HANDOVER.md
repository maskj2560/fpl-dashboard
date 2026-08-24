# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-25 (økt 36, Opus: v1.3.4 under arbeid)

## Status akkurat nå

- **v1.3.4 UNDER ARBEID (økt 36, Opus), branch `feat/ai-swr-v134`.**
  Plan: `docs/plan-v134-ai-swr.md`. **Rotårsaken er målt, ikke gjettet:**
  med fake Claude-klient (10 s forsinkelse; ekte kall 20–60 s) tok `/`
  10 038 ms og `/brief` 10 023 ms på KALD cache — og nøyaktig det samme på
  STALE cache. Uten AI (tomme nøkler) er alle 11 ruter under 0,3 s varme
  (tregest: `/spillere` 282 ms, ren rendering av 496 KB HTML).
  `/overganger` var 3 ms fordi laget ennå ikke har transfers — de inntil
  38 live-kallene er altså ikke målt under last (hører til P3).
  **Målt etter (samme fake-klient): forsiden 35 ms, `/nyheter` 4 ms,
  `/brief` 17 ms på KALD cache — 0 AI-kall utløst av sidevisninger, i alle
  cachetilstander. `refresh._tick()` varmer begge tekstene (2 kall), andre
  tikk 0 kall. Rådgiverklikk: kald 10 150 ms (som avtalt), fersk 2 ms,
  stale 1 ms + fornying i bakgrunnen.** Røyktest med tomme nøkler: 11 ruter
  200 + 404, `/health` ai:false, 0 AI-kall, ingen oppfrisker startet.
  Delfunksjoner: (1) `ai.js` SWR + `getCached` ✅ 330/330, (2) `/brief`
  leser cachen (`getCachedAiBrief`) ✅ 333/333, (3) `news.js`:
  `getNews` leser cachen, `refreshNewsSummary` genererer ✅ 337/337,
  (4) rådgiveren `swr: true` + kildekontrakt i `test/routes.test.js`
  ✅ 339/339, (5) `refresh.js` + `startAiRefresher()` i `server.js`
  ✅ **350/350, lint 0** (baseline 322).

- **ETAPPE 4 / v1.3.3: kode og git FERDIG, men PROD SVARER 401.** Økt 34.
  `main` = `origin/main` = `edc372b` (merge `--no-ff` av `fix/ui-v133-qa`),
  tag `v1.3.3` pushet 24. aug 18:00. Målt før push: 322/322, lint 0,
  11 ruter 200 + 404, Playwright 332 + 22 + 56, 0 AI-kall.
  **https://fpl.marsk.no svarer `401` på ALLE stier** med
  `www-authenticate: Basic realm="traefik"` — origin-Traefik uten rute for
  domenet, ikke en app-feil (`dash.marsk.no` svarer 302). To deployforsøk,
  samme utfall; 90 forsøk 18:02–18:29. **Prod-verifiseringen (plan-steg 8
  og 9 i `docs/arkiv/plan-v133-qa.md`) er IKKE utført.** Detaljer og neste
  steg: ROADMAP kø-punkt 1.
- **v1.3.2 (etappe 3) RELEASET 24. aug (økt 33):** finpuss per side +
  kontraktstester for markupen `app.js` avhenger av. 299/299, lint 0.
  Detaljene (inkl. de manuelt målte pillekontrastene) er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.
- **v1.3.1 og v1.3.0 (etappe 2 og 1) ute siden 24. aug:** klubbgrafikk
  (`clubAssets.js`, `IMG_VERSION`, `npm run fetch-clubs`, 60 bildefiler)
  og tokenpaletten i to temaer med temabryter. Detaljene er rotert til
  `docs/arkiv/HANDOVER-historikk.md`.
- **Plan for UI-overhalingen:** `docs/arkiv/plan-v130-ui-overhaul.md` (etappe 1–3,
  godkjent 24. aug) + `docs/arkiv/plan-v133-qa.md` (etappe 4). Mockup:
  https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849
- **Prod er NEDE for oss siden ~18:02 mandag 24. aug: 401 på alle stier.**
  Siste bekreftet grønne prod-verifisering var v1.3.2, 24. aug 13:22
  (`/health` 200, `ai:true, discord:true`, footer `v1.3.2`, assets
  `?v=000fa6f3`, 9 ruter 200 + 404, Playwright 240/240 + 14/14).
  v1.3.3 er pushet, men aldri sett kjøre. Se P0-punktet under.
- **AI-budsjettet for UI-overhalingen: brukt opp (1 av 1), og den ene
  prod-visningen av `/brief` 24. aug 13:23 var grønn.** Detaljene er
  rotert til `docs/arkiv/HANDOVER-historikk.md`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 1.
- **Git akkurat nå:** arbeidstreet står på **`main` = `origin/main` =
  `edc372b`**, tag `v1.3.3` pushet. Merge `--no-ff` av
  `fix/ui-v133-qa` (14 commits). Featurebranchen er slettet lokalt.
  Ingen åpne brancher, rent tre.
- Eldre status (v1.2.3, doks-opprydning, versjonsplan, v1.2.4): arkivert.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. **P0 `[Marius]`: prod svarer 401 — se Coolify-deployloggen for
   v1.3.3 (`edc372b`).** Alt annet står på vent til appen er oppe.
2. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
3. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
4. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
5. P2 `[Marius]`: README-skjermbilder + mobil-QA.
6. v1.3.3 (ETAPPE 4): **kode og git ferdig, prod-verifiseringen gjenstår**
   (plan-steg 8 og 9 i `docs/arkiv/plan-v133-qa.md`). Deretter
   robusthetskandidatene. Gammel åpen boks som er Marius' (Task 1.0-5):
   «Visuell sjekk mot mockupen i begge temaer».

## Driftslærdommer (ikke glem disse)

- **`401` med `www-authenticate: Basic realm="traefik"` = ingen Traefik-
  rute for domenet**, ikke en app-feil. Appen svarer aldri 401 selv.
  Sjekk `dash.marsk.no` (svarer den, lever serveren) og deretter
  Coolify-deployloggen. Skjedde ved v1.3.3-deployen 24. aug.
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

- 2026-08-25 (økt 36, Opus): kjøreprompt «utfør kø-punkt 2 (v1.3.4) og
  ferdigstill hele v1.3». Rammer: utfør, ikke re-planlegg; 0 ekte AI-kall
  (tomme nøkler lokalt); prod-/brief og /nyheter lastes aldri før v1.3.4 er
  ute; aldri push uten klarsignal. Målerapporten levert først → klarsignal
  «Kjør». Handling: Task 0–6 utført, 6 commits, 350/350, lint 0.
- 2026-08-24 (økt 35, Fable): Marius sendte kø-punkt 2-oppdraget hit for
  planlegging + kjøreprompt til Opus som også ferdigstiller HELE v1.3.
  Rotårsak bekreftet i kode: `ai.js:39-44` blokkerer også FORSIDEN
  (`routes/index.js:26-30` awaiter `getNews()`). Beslutning: deadlinevindu
  **6 timer** → ~41–45 kall/uke. Handling: takt-porten i ROADMAP lukket,
  kjøreprompt levert; utførelsesøkten skriver `docs/plan-v134-ai-swr.md`.
- Loggposter fra økt 22–34: rotert til `docs/arkiv/HANDOVER-historikk.md`
  (200-linjerstaket, sist 2026-08-25).
