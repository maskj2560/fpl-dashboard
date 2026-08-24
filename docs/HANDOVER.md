# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + køen øverst i ROADMAP.md, start på
> første ublokkerte køpunkt. Fila holder kun nåtilstand, åpne punkter og
> lærdommer — **tak: 200 linjer.** Sprenges taket: roter eldste logg/status
> til `docs/arkiv/HANDOVER-historikk.md`. Utførte planer: `docs/arkiv/`.

**Sist oppdatert:** 2026-08-24 (økt 31, Opus: v1.3.0 etappe 1 ferdig bygget, venter klarsignal for release)

## Status akkurat nå

- **v1.3.0 ETAPPE 1 FERDIG BYGGET (økt 31, Opus, 24. aug) — venter
  klarsignal for Task 1.0-7 (release).** Branch `feat/ui-v130-fundament`,
  4 commits, **282/282 tester, lint 0**, ingenting pushet, **0 AI-kall.**
  - Task 1.0-1…1.0-5 utført etter `docs/plan-v130-ui-overhaul.md`:
    `test/style.test.js` (tokenparitet + forbud mot hardkodede farger +
    35 kontrastpar i begge temaer), tokenblokkene i `public/style.css`
    (:root = mørkt, `:root[data-theme="light"]` = lyst, 48 fargetokens i
    hver), temafunksjonene + Modul 5 i `public/app.js`, inline-tema-script
    i `layout.ejs`, `views/partials/theme-toggle.ejs` (første partial),
    lilla topbar og re-toning av alle komponenter.
  - TDD-tallene: 272 → rødt 273/1 feilende fil (style.test.js kaster i
    modul-scope — planens alternative form) → 276 → rødt 280/4 → 280 →
    rødt 282/2 → **282**. Alle tall som planlagt.
  - Røyk uten nøkler (port 3011, `ai:false, discord:false`): alle 11 ruter
    200, ukjent sti 404. **Playwright (scratchpad, Vedlegg A): OK 332/332.**
    Ekstra verifisert: auto-modus følger systemet live uten reload, låst
    valg gjør det ikke, aria-label oppdateres.
  - **To avvik fra planens bokstav**, begge for å holde kontrastkravet i
    §8 (heroen er MØRK lilla i BEGGE temaer, så flate-tokens virker ikke
    inni den): `.eyebrow` fikk `--hero-dim` (som i mockupen) i stedet for
    `--accent-text` (3,02:1 i lyst tema), og `.deadline-passed` fikk
    `--hero-text` etter beslutning fra Marius (`--accent-2-text` ga
    2,74:1). Begge rapportert og bekreftet.
- **Plan for UI-overhalingen godkjent (økt 30, Fable, 24. aug).**
  `docs/plan-v130-ui-overhaul.md` (~1900 linjer): 20 verifiserte fakta,
  15 beslutninger fra Marius + 9 implementasjonsvalg, palett med 41 målte
  kontrastpar, fire etapper v1.3.0–v1.3.3 task for task med kode og
  testtall (272 → 282 → 296 → 299). Mockup (begge temaer, 390 px,
  designsystem): https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849.
  **Neste: Opus-økt for v1.3.0** på branch `feat/ui-v130-fundament`.
  0 AI-kall brukt i planøkten, ingenting pushet.
- **Prod kjører v1.2.5 på https://fpl.marsk.no — verifisert 24. aug 01:43.**
  `/health` → 200, `ai:true, discord:true, leagues:1`; footer `v1.2.5`.
- Kostnad målt 23. aug: **$0,94/uke** — under terskelen, ingen tiltak. Ny
  måling i uken etter 31. aug (prisskiftet), se kø-punkt 1.
- `main` er **4 docs-commits foran `origin/main`** (upushet, venter på
  klarsignal), rent tre, **272/272 tester, lint 0**. Én åpen branch:
  `feat/ui-v130-fundament` (4 commits, 282/282) — venter på klarsignal.
- Eldre status (v1.2.3-deploy, doks-opprydning økt 24, versjonsplan økt 25,
  v1.2.4 økt 27): rotert til `docs/arkiv/HANDOVER-historikk.md` 24. aug.

## Åpne punkter

Køen i `ROADMAP.md` er fasiten — den dupliseres ikke her. Kortversjon:

1. P4: kostnadsmåling uken etter 31. aug (metode i `docs/sjekkpunkt-d-kostnad.md`).
2. P1 `[Marius]`: bekreft auto-briefen 20. aug i Discord-kanalen.
3. P3: etter GW2, transfers-skjema mot ekte data + `/overganger` på mobil.
4. P2 `[Marius]`: README-skjermbilder + mobil-QA.
5. v1.3.0–v1.3.3: UI-overhaling i fire etapper — **plan godkjent, neste
   utviklingsjobb** (`docs/plan-v130-ui-overhaul.md`) → deretter
   robusthetskandidatene.

## Driftslærdommer (ikke glem disse)

- **Sjekk `git status -sb`, ikke anta at `main` = `origin/main`:** ved
  starten av økt 30 lå `main` 2 docs-commits foran origin (loggføring fra
  økt 29) selv om prompten sa «main = origin/main».
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
- UI-overhalingen (24. aug, økt 30): 15 beslutninger i
  `docs/plan-v130-ui-overhaul.md` §2 — selvhostet klubbgrafikk (70/110 px)
  med footer-kreditering og server-side fallback, ett tema-ikon i topbaren
  med inline-script + matchMedia, FPL-familien (lilla natt / lilla
  dagslys, grønn kun som fyll på lyst), fire etapper med hvert sitt
  patchnummer, Playwright etter hver etappe, 1 AI-kall totalt,
  `views/partials/` opprettes. Brainstorming-formen: ett spørsmålssett om
  gangen, anbefaling først — Marius valgte anbefalingen på alle 15.
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

- 2026-08-24 (økt 31, Opus): kjøreprompt «Oppdrag (Opus 5,
  utførelsesøkt): utfør ETAPPE 1 — v1.3.0 Fundament» med
  `superpowers:executing-plans` mot `docs/plan-v130-ui-overhaul.md` og
  mockupen som fasit for utseendet (ved avvik vinner planen). Harde
  rammer: Task 1.0-0…1.0-6 nå, Task 1.0-7 kun på eksplisitt klarsignal,
  ingen designbeslutninger (mangler noe → stopp og spør), aldri push uten
  klarsignal (heller ikke docs), aldri to. 19–21 eller mens kamper pågår,
  **0 AI-kall** (`/brief` og `/nyheter` kun med tomme nøkler, `/health` →
  `ai:false` FØRST), TDD med observert rødt ført inn i planfila, ingen nye
  avhengigheter, Playwright kun i scratchpad, docs i samme commit som
  endringen, branch `feat/ui-v130-fundament` fra rent og grønt `main`.
  Handling: alle seks tasks utført, 4 commits, 282/282 + lint 0,
  Playwright 332/332, 0 AI-kall, ingenting pushet. Underveis ett spørsmål
  stilt (kontrastkonflikt på `.deadline-passed` inne i heroen) —
  Marius valgte anbefalingen `--hero-text` (hvit).

- 2026-08-24 (økt 30, Fable): kjøreprompt «Oppdrag (Fable 5): planlegg
  v1.3.0 — full UI-overhaling. KUN PLANLEGGING» med krav: brainstorming
  FØR plan mode (ett sett om gangen, anbefaling først, Marius beslutter),
  verifiser alle fakta selv, klikkbar mockup som Artifact i begge temaer,
  ett definert sluttprodukt (palett/typografi/spacing/komponenter per side),
  fire åpne spørsmål avgjort (klubbgrafikk-kilde/lisens, tema/FOUC,
  FPL-nærhet/kontrast, etapper), plan etter v1.2.5-malen, oppdater
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md, slett `prompt-ui-overhaul-plan.md`,
  ikke rør CHANGELOG, 0 AI-kall, aldri push, Opus-prompt i chatten.
  Underveis: «Klarer du å skrive planfila?» / «Okay da kan du fortsette»
  (bekreftelse etter avbrudd). Handling: 4 spørsmålssett (15 beslutninger,
  alle = anbefalingen), 20 fakta verifisert (bl.a. 140 bilde-URL-er med
  curl, PNG-dimensjoner, 41 kontrastpar), plan skrevet til
  `docs/plan-v130-ui-overhaul.md`, mockup publisert
  (https://claude.ai/code/artifact/87b6dfa8-fa5e-417e-8b63-113799a27849),
  ROADMAP/VIDERE/HANDOVER/CLAUDE.md oppdatert, prompt-fila slettet,
  loggpost økt 28 + eldre status rotert til arkivet, committet lokalt på
  `main` uten push, Opus-prompt levert i chatten. 0 AI-kall.
- Eldre loggposter (økt 22–28): rotert til
  `docs/arkiv/HANDOVER-historikk.md` 2026-08-24 (200-linjerstaket).
