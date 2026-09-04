# Økt-prompt til Fable — planlegg v1.13.2 «UX-polering 2»: funksjonsgjennomgang → småfiks → kjøreprompt til Opus

> Skrevet 4. september 2026 (økt 57, Fable) etter at v1.13.1 «Sikkerhetsnett»
> var i prod (økt 58, Opus). Marius valgte retning C: «samme form som v1.7.1
> (12 fiks) — gå gjennom hver side som bruker, list friksjon (tetthet,
> mobil-nav, tomtilstander, lastetid). Lav risiko, rask gevinst.» Denne
> Fable-økten **planlegger** (gjennomgang + Marius' valg) og leverer en
> **kjøreprompt til Opus** som bygger. Prompten er konsumert når
> `docs/prompt-ux-polering-v1132.md` er committet — da slettes denne fila
> (git bevarer den).

## Slik brukes den

Lim inn blokka under «Prompten» i et nytt Fable-vindu i plan-modus. Økten
skriver **0 kode**: den kartlegger, måler, foreslår, får Marius' valg, og
skriver kjøreprompten. Alle premisser under er målt 4. sep på `main` =
`75a913d` (v1.13.1) — linjenumre kan ha flyttet seg, verifiser før du
siterer dem.

## Fasit (besluttet av Marius 4. sep — ikke re-spør)

| Hva | Beslutning |
| --- | --- |
| Form | som v1.7.1 (økt 46): full gjennomgang av **alle 9 sider + tverrgående**, funn med forslag, Marius velger «Fiks» / «Behold» per funn i puljer (AskUserQuestion, maks 4 per pulje, «Fiks (Anbefalt)» først). |
| Fokus | tetthet, mobil-navigasjon, tomtilstander, lastetid — pluss forklaringer og konsistens der de er gratis. |
| Størrelse per fiks | **småfiks**: én view/CSS/app.js-endring, ≤ ~1 time for Opus, ingen nye FPL-kall, ingen ny modul. Større funn → «Senere / idéer» i ROADMAP, aldri i denne pakka. |
| Versjon | **v1.13.2** (patch) «UX-polering 2», én branch `feat/ux-polering-v1132`, én push. |
| Leveranse fra denne økten | `docs/prompt-ux-polering-v1132.md` — kjøreprompt til Opus i samme form som `git show e63bd4b:docs/prompt-sikkerhetsnett-v1131.md` (fasit, målte premisser med linjenumre, T-tasks med testnavn, feller, ferdigkriterier). Pluss ROADMAP § 7 og HANDOVER ajour. |
| Rammer | 0 AI-kall, 0 nye avhengigheter, 0 Discord. Design-reglene i CLAUDE.md gjelder (tokens i begge temaer, kontrast låst av `test/style.test.js`, CSP uten inline-script/`on*`, `<caption>`/`aria-label`, 390 px er referansen, bevegelse bak `prefers-reduced-motion`). Playwright kun i scratchpad, aldri i repoet. |
| Utelatt for alltid | spillerbilder, e-post, nye AI-funksjoner (Marius' fasit 1. sep). |
| Spørsmål til Marius | funn-puljene ER spørsmålene. Utover det: kun hvis noe bryter fasiten — ett spørsmålssett, anbefaling først. |

## Målte premisser (4. sep, `main` = `75a913d`)

- **Tilstand:** v1.13.1 i prod 4. sep 02:37. `npm test` → 792/792, lint 0.
  `createApp()` i `src/app.js`; `test/app.test.js` (23 tester) kjører hele
  stacken på loopback mot `test/fixtures/fpl-world.js`. Asset-hash i prod
  `ba91839a` — **endres av denne pakka** (CSS/JS røres), noteres i HANDOVER.
- **Sidene (9 + /offline):** `/` dashboard.ejs (184 linjer), `/spillere`
  players.ejs (215), `/lag` team.ejs (167), `/overganger` transfers.ejs
  (308), `/liga` league.ejs (194), `/innsikt` innsikt.ejs (268), `/brief`
  brief.ejs (121), `/live` live.ejs (35 — datacontainer, resten bygges i
  app.js), `/nyheter` news.ejs (46). layout.ejs 79, error.ejs 13, partials
  club-badge/club-shirt.
- **Navigasjonen:** `views/layout.ejs:42–51` — `<nav aria-label="Hovedmeny">`
  med **9 lenker** i topbaren. Ved 390 px er dette den mest sannsynlige
  friksjonen (horisontal scroll? kantfading via `initEdgeFades` i
  `public/app.js:295`? aktiv side synlig uten scroll?). Mål det, ikke anta.
- **CSS:** `public/style.css` 2539 linjer, **9 media queries**:
  `min-width: 900px` ×1 (linje 620), `max-width: 640px` ×4 (første 2523),
  `max-width: 480px` ×1 (1875), `prefers-reduced-motion` ×3. Alt annet er
  flytende layout. Mørkt tema er `:root`, lyst er `:root[data-theme="light"]`.
- **JS:** `public/app.js` 1322 linjer, vanilla. Kart over funksjonene:
  escapeHtml/compareCells/rowMatchesFilters (sorterbare og filtrerbare
  tabeller, `table[data-sortable]`), playerCardHtml/duel* (spillerkort +
  duell på /spillere), queryParam, nextWakeupDelay (live-polling — kun i
  kampvinduer), resolveTheme/nextMode (temabryter), clubBadgeHtml,
  edgeFadeState/initEdgeFades, plannerRules (hva hvis-planlegger,
  `:727`), rivalNavAction (`:999`), bpsRaceHtml (`:1205`),
  swRegistrationUrl, nextSortDir, terskelSynlighet. Klientlogikken er
  testet i `test/app-client.test.js`.
- **Skjermbilder som finnes:** `docs/img/` — dashbord, lag og spillere i
  desktop + mobil, tatt 28. aug (v1.5-æraen — utdaterte, men gir
  førsteinntrykk). Read-verktøyet viser PNG-er.
- **v1.7.1-metoden (økt 46, 31. aug):** tre Explore-agenter kartla alle 9
  sider + tverrgående; 12 forslag i tre AskUserQuestion-puljer; Marius
  valgte «Fiks (Anbefalt)» på alle 12. To av pakkene (liga-lenker,
  aria-live) viste seg å finnes allerede — **verifiser at et funn faktisk
  mangler før det foreslås.** Innholdet den gang: no-store på /api,
  «neste tidligst» på /nyheter, grafakser, statusfilter + sortering,
  krysslenker `/spillere?sok=`, forklaringer (flagg, FDR, xG/xA), badges på
  /overganger. Ikke foreslå de samme igjen.
- **QA-rester hos Marius (ikke dine):** STEG 7 (/live under kamp), 9c
  (installer-tilbud), 9e (offline i DevTools), ekte telefon, «−0,3» i
  Prisgevinst etter første bytte. Foreslå ikke fiks for ting som venter på
  hans test.
- **Lokal kjøring:** `config.js` kjører `process.loadEnvFile()` som leser
  repoets `.env` (prod-nøkler!). Kjør med `ANTHROPIC_API_KEY=` og
  `DISCORD_WEBHOOK_URL=` tomme satt i `process.env` FØR start (f.eks. via
  en scratchpad-.env med `--env-file` — de settes først og overskrives
  ikke), egen `PORT` og `DATA_DIR` i scratchpad. Bevis: `/health` →
  `ai:false, discord:false`. Sidene henter ekte FPL-data (read-only, lov).
  Klikk ALDRI «Spør AI om råd» på /lag.
- **Lastetid måles lokalt, ikke i prod** (Cloudflare + nett forstyrrer):
  `curl -s -o /dev/null -w '%{time_total} %{size_download}\n'` per side,
  kald cache (første kall etter start) vs. varm; størrelsen på HTML, CSS
  (2539 linjer ukomprimert — `compression` er på), app.js, fontfilene i
  `public/fonts/` og antall `<img>` per side ved 390 px. Terskel for et
  funn: > 300 ms varm render eller > 200 kB HTML.
- **Kjente ting som IKKE er funn:** `/live` har tre `<script>`-tagger (den
  tredje er `type="application/json"`); liganavnet «Var Har Skylda» kommer
  fra FPL; JSON i live.ejs escaper `<` med vilje; stale-banneret «Viser data
  fra HH:MM» er ønsket atferd; feilsidene (503/500/413) ble fikset i v1.13.1
  men er ikke visuelt bevist i prod ennå.
- **Docs er CRLF i arbeidstreet** (Edit-verktøyet, aldri `sed -i`).
  HANDOVER-tak 200 linjer (er 199) — roter til historikkfila ved behov.
- **Kalender:** GW3 spilles fredag 4. sep 21:00 og gjennom helgen. Denne
  økten pusher ingenting som deployer (docs-commit kan vente til Opus
  pusher v1.13.2 — hver deploy koster 2 AI-kall).

## Prompten

```
Les docs/HANDOVER.md og køen øverst i ROADMAP.md (§ 7 peker hit). Kjør
`git status -sb` og `npm test` + `npm run lint` som baseline: forventet
792/792 og lint 0 på v1.13.1. Fasiten i docs/prompt-ux-gjennomgang-v1132.md
er besluttet av Marius 4. sep — ikke re-spør den. Denne økten skriver 0
kode og gjør 0 AI-kall: den kartlegger, måler, foreslår, får Marius' valg
og leverer docs/prompt-ux-polering-v1132.md som kjøreprompt til en Opus-økt.

Steg 1 — kartlegg (Explore-agenter, som i økt 46). Én agent per 3 sider
+ én tverrgående. Per side skal du ha: hver handling brukeren kan gjøre
(lenker, knapper, skjema, sortering, filter, faner, polling), hver
tilstand (tom, laster, stale, feil, uten FPL_TEAM_ID, før/etter deadline,
mellom runder) og hvilke views/CSS-blokker/app.js-funksjoner som eier
dem. Agentene returnerer filsti:linje, ikke innhold. Tverrgående: topbar
og de 9 nav-lenkene ved 390 px, footer, temabryter, hopp-lenke, stale-
og gameUpdating-bannerne, overskriftshierarki, tallformat (norsk komma,
tusenskille, «£5.5m»), tomtilstand-formuleringer, knappetekster.

Steg 2 — mål. Start appen lokalt med tomme AI/Discord-nøkler (bevis:
/health → ai:false, discord:false). Hent alle 9 sider + /offline +
/finnesikke med curl: status, time_total kald og varm, size_download.
Tell per side: <table>, <section>/<h2>, <img>, lenker, skjemafelt.
Hvis `npx playwright` kjører fra scratchpad (aldri i repoet): skjermbilder
av alle sider ved 390×844 og 1440×900 i begge temaer, se på dem med
Read-verktøyet og noter tetthet, avkuttet tekst, horisontal scroll,
uleselige tall, tomme flater. Går ikke Playwright: bruk HTML-en + CSS-en
og de gamle skjermbildene i docs/img/ — og si i planen at visuell
verifisering mangler.

Steg 3 — funn. Én tabell per side + én tverrgående: nr | side | funn |
type (tetthet/mobil/tomtilstand/lastetid/forklaring/konsistens) | alvor
(VIKTIG/KOSMETISK) | forslag (én setning, hva brukeren merker) | eier
(fil:linje) | kostnad (S = én fil, M = to–tre filer). Hvert funn skal
være verifisert mot koden (ikke «finnes trolig ikke» — grep det). Ting
som er større enn småfiks går i en egen liste «Senere / idéer»-kandidater.
Ikke gjenta v1.7.1-fiksene, ikke foreslå det Marius' egne QA-punkter
venter på, ikke foreslå nye FPL-kall, AI-funksjoner eller avhengigheter.

Steg 4 — Marius velger. Presenter funnene i AskUserQuestion-puljer på
maks 4, VIKTIG først, hver med «Fiks (Anbefalt)» / «Behold som i dag»
(pluss et tredje alternativ der det finnes en ekte variant). Sikt på
10–15 valgte fiks totalt; er det flere gode, si det og la Marius kutte.

Steg 5 — kjøreprompten. Skriv docs/prompt-ux-polering-v1132.md for Opus,
samme skjelett som `git show e63bd4b:docs/prompt-sikkerhetsnett-v1131.md`:
(a) fasit-tabell med Marius' valg (nummerert liste over fiksene, hva som
ble «Behold», hva som gikk til Senere/idéer); (b) målte premisser med
linjenumre per fiks (view, CSS-blokk, app.js-funksjon, eksisterende test
som låser området); (c) T-tasks gruppert per side, hver med rød test
først der det finnes logikk (views.test.js for markup, app-client.test.js
for klientlogikk, style.test.js for tokens/kontrast, app.test.js for
status/nonce — nye assertions, ikke nye rammer) og en linje om hva
Opus skal se i nettleseren; (d) feller (CRLF, CSP/`on*`, tokens i begge
temaer, asset-hashen endres, `<script`-tellingen på / er fortsatt 2,
390 px er referansen, `prefers-reduced-motion`); (e) ferdigkriterier
(≥ 792 tester, lint 0, alle a11y/style-tester grønne, branch
feat/ux-polering-v1132 merget --no-ff, tag v1.13.2, deploy-vindu-sjekk —
aldri under kamp, aldri torsdag 19–21 — prod-sjekk: footer v1.13.2,
`<script` = 2 på /, /health 200, ny asset-hash notert, CI grønn); (f)
«Etter økten». Ta med Steg 2-tallene (før-målingene) så Opus kan vise
etter-tall for lastetid-fiksene.

Steg 6 — docs. ROADMAP § 7: status «planlagt, kjøreprompt skrevet»,
versjonsplan-rad v1.13.2, dokumentkart-rad for den nye prompten, og
Senere/idéer-kandidatene lagt under «Senere / idéer» (de sniker ikke i
køen). HANDOVER: «Neste steg» peker på § 7 og prompten, loggpost for
økten, ≤ 200 linjer. Slett denne prompten (git rm docs/prompt-ux-
gjennomgang-v1132.md — den er konsumert) og fjern dokumentkart-raden
dens. Én docs-commit, ikke push (Opus pusher sammen med v1.13.2).

Regler hele økten: CLAUDE.md er fasit. Edit-verktøyet på docs (CRLF).
Bevis før påstand: vis kommandoen og linjene (curl-tallene, /health,
testtallet). Ett spørsmålssett om gangen, anbefaling først. Stopp ved
~95 % usage med HANDOVER oppdatert om hvilket steg som er ferdig.
```

## Ferdigkriterier for Fable-økten

- Funn-tabeller for alle 9 sider + tverrgående, hvert funn verifisert mot
  kode (fil:linje) og med måltall der det gjelder lastetid.
- Marius' valg registrert per funn (Fiks / Behold / Senere).
- `docs/prompt-ux-polering-v1132.md` committet med fasit, premisser,
  T-tasks med testnavn, feller, ferdigkriterier og før-målingene.
- ROADMAP § 7 + versjonsplan + dokumentkart + Senere/idéer ajour; HANDOVER
  ≤ 200 linjer med peker og loggpost; denne prompten slettet.
- 0 kode i `src/`, `views/`, `public/`; 0 AI-kall (bevist med
  `/health` → `ai:false` før første sidevisning); ingenting pushet.

## Etter økten

- Marius limer `docs/prompt-ux-polering-v1132.md` inn i en Opus-økt som
  bygger v1.13.2, pusher og gjør prod-sjekk.
- Stoppet underveis: HANDOVER skal si hvilket steg (1–6) som er ferdig og
  hvor funn-tabellene ligger (scratchpad-fil eller i prompten under
  arbeid) — neste økt fortsetter derfra.
