# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 35, Fable: plan for v1.3.4)

## Status akkurat nå

- **ETAPPE 4 / v1.3.3: kode og git er FERDIG, men PROD SVARER 401.**
  Økt 34, Opus. Klarsignal «Kjør» mandag 24. aug ~17:55. `main` =
  `origin/main` = `edc372b` (merge `--no-ff` av `fix/ui-v133-qa`), tag
  `v1.3.3` pushet 18:00. Alle 18 QA-funn + transfers-pillepunktet rettet.
  - **Målt før push:** `npm test` **322/322** (fra 299), lint 0, 11 ruter
    200 + 404, `/health` → `ai:false, discord:false`. Playwright:
    `qa.mjs` 332/332, `qa-clubs.mjs` 22/22, `qa-v133.mjs` 56/56.
    **0 AI-kall i hele etappen.** Etter merge på `main`: 322/322, lint 0,
    CHANGELOG-plasseringen inspisert og riktig.
  - **BLOKKERT (P0): https://fpl.marsk.no svarer `401 Unauthorized` på
    ALLE stier** (`/`, `/health`, `/spillere`, `/style.css`) med
    `www-authenticate: Basic realm="traefik"`. Cloudflare slipper gjennom
    (`cf-cache-status: DYNAMIC`), så det er origin-Traefik som svarer:
    ingen rute for domenet. Polling hvert 10. sek i 15 min (90 forsøk,
    18:02–18:17) ga 401 hele veien. `dash.marsk.no` svarer 302, så
    serveren og Traefik lever — det er appruten som mangler.
    **Prod-verifiseringen (plan-steg 8 og 9) er IKKE utført.** Marius må
    se på Coolify-deployloggen. Buildet er utelukket som årsak lokalt:
    `package.json`/`package-lock.json` er i synk på 1.3.3, og Dockerfile
    kopierer kun `src/`, `views/`, `public/` — ingenting av det etappen
    endret ligger utenfor de mappene. Docs-pushen 18:22 trigget en NY
    deploy — fortsatt 401 gjennom 18:29. To deployforsøk, samme utfall.
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
- **Prod-rutesveip koster penger:** `GET /brief` og `/nyheter` genererer
  AI-tekst per besøk. Deploy-/verifiseringsplaner må utelate dem fra sveip
  eller budsjettere (~6 kall / ~$0,07 sist). `/api/brief.json` er ren data
  og trygg.
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

- 2026-08-24 (økt 35, Fable): Marius sendte kø-punkt 2-oppdraget hit for
  planlegging + kjøreprompt til Opus som også ferdigstiller HELE v1.3.
  Rotårsak bekreftet i kode: `ai.js:39-44` blokkerer også FORSIDEN
  (`routes/index.js:26-30` awaiter `getNews()`). Beslutning: deadlinevindu
  **6 timer** → ~41–45 kall/uke. Handling: takt-porten i ROADMAP lukket,
  kjøreprompt levert; utførelsesøkten skriver `docs/plan-v134-ai-swr.md`.
- 2026-08-24 (økt 34, etter releasen): Marius melder at **deler av siden
  bruker ekstremt lang tid på å laste**, mistenker briefene, og ber om at
  de caches en periode og friskes opp jevnlig på serveren. Valgte omfang:
  brief + nyheter + rådgiver (huket av alle tre, inkludert det motstridende
  «kun briefen nå» — tolket som alle tre). Takt: spurte «kanskje 1 gang om
  dagen?» og ba om min vurdering. **Anbefaling gitt og pinnet i ROADMAP:**
  daglig oppfriskning + ekstra i timene før deadline, nyheter hver 6. time,
  og — viktigst — SWR i `ai.js` så ingen sidevisning blokkerer.
  Handling: lagt inn som kø-punkt 2 (v1.3.4), robusthetskandidaten
  «SWR i ai.js» strøket og peker dit. Kjøreprompt levert i chatten.
- 2026-08-24 (økt 34, Opus): kjøreprompt «utfør ETAPPE 4 — v1.3.3
  QA-rettelser». Rammer: utfør, ikke re-planlegg — ingen designbeslutninger
  (alt pinnet i planens «Pinnede skjønnsvalg»); avvik plan/kode → STOPP og
  spør. **0 AI-kall:** prod-`/brief` og prod-`/nyheter` lastes ALDRI, og
  `#ai-advice-btn` klikkes aldri; lokalt kjøres alt med TOMME nøkler
  (`/health` → `ai:false, discord:false` først). Én commit per task, docs i
  samme commit, TDD 299 → 322, Playwright kun i scratchpad, ingen nye
  avhengigheter, CRLF i patchskript. STOPP etter Task 1.3-12 — release
  (1.3-13) kun på eksplisitt klarsignal, og kun FØR fre 28. aug ~18:00
  eller etter at GW2 er ferdigspilt. Aldri push uten klarsignal.
  Handling: Task 1.3-0 t.o.m. 1.3-12 utført (13 commits), rapportert og
  stoppet. Deretter klarsignal **«Kjør»** (~17:55) → Task 1.3-13:
  tidsvindu og `fixtures/` sjekket, 1.3.3, merge, tag, push 18:00.
  Prod-verifiseringen strandet på 401 — se statusdelen øverst.
- Loggposter fra økt 22–33: rotert til `docs/arkiv/HANDOVER-historikk.md`
  2026-08-24 (200-linjerstaket).
