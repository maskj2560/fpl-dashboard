# Roadmap — FPL-dashboard

Køen øverst er den prioriterte rekkefølgen for alt som gjenstår — nytt
arbeid starter alltid på punkt 1 som ikke er blokkert. Nye idéer legges
under «Senere / idéer», de sniker ikke i køen. Historikk t.o.m. v1.3.4 ligger i
`docs/arkiv/roadmap-utfort-v010-v134.md`; nyere: versjonsplanen + CHANGELOG.
En milepæl er ferdig når alt er huket av, `npm test` og `npm run lint` er
grønne, CHANGELOG er oppdatert og endringene er committet og pushet.

## Versjonsplan — hele løpet på ett brett

Prinsipp (besluttet av Marius 24. aug): **kun releaser med kodeendring får
versjonsnummer.** Verifiseringer og målinger er «porter» (P1–P4) — de
utløses av dato eller Marius, går parallelt med utviklingssporet, og et
funn blir en `fix:`-commit som rir neste ledige patchnummer.

| Nr | Hva | Kø-punkt | Blokkert av |
| --- | --- | --- | --- |
| ~~**v1.2.4**~~ | ~~AI-rådgiverens promptstruktur på /lag~~ | **utført 24. aug** | — |
| ~~**P0**~~ | ~~Coolify-helsesjekk fiks + bevis~~ | **utført 25. aug — alt. a aktiv** | — |
| ~~**P1**~~ | ~~Marius: bekreft auto-briefen 20. aug i Discord~~ | **utført 25. aug — brief bekreftet i kanalen** | — |
| **P2** | Marius: README-skjermbilder + mobil-QA | 3 | **skjermbilder utført 26. aug** — gjenstår mobil-QA på ekte telefon |
| ~~**P3**~~ | ~~Etter GW2: transfers-skjema mot ekte data~~ | **utført 2. sep — verifisert read-only mot en rivals transfers, feltene stemmer** | — |
| **P4** | Kostnadsmåling uken etter 1. sep | 1 | dato |
| ~~**v1.2.5**~~ | ~~Brief-kvalitetstrioen~~ | **utført 24. aug** | — |
| ~~**v1.3.0**~~ | ~~UI-overhaling, etappe 1: fundament (tokens i to temaer, temabryter, lilla topbar)~~ | **utført 24. aug** | — |
| ~~**v1.3.1**~~ | ~~UI-overhaling, etappe 2: klubbgrafikk (merker + drakter, selvhostet)~~ | **utført 24. aug** | — |
| ~~**v1.3.2**~~ | ~~UI-overhaling, etappe 3: finpuss per side~~ | **utført 24. aug** | — |
| ~~**v1.3.3**~~ | ~~UI-overhaling, etappe 4: QA-rettelser~~ | **utført 24. aug — prod-QA grønn 25. aug** | — |
| ~~**v1.3.4**~~ | ~~Ingen ventetid på AI-tekst: SWR + bakgrunnsoppfriskning~~ | **utført 25. aug — ute i prod, QA grønn** | — |
| ~~**v1.3.5**~~ | ~~Ryddig avslutning (SIGTERM-handler)~~ | **utført 25. aug** | — |
| ~~**v1.3.6**~~ | ~~gameUpdating-livssyklus + vennlig 503-side~~ | **utført 25. aug** | — |
| ~~**v1.3.7**~~ | ~~Persistent «brief sendt»-markør (volum `/app/data`)~~ | **utført 26. aug — ute i prod** | — |
| ~~**v1.3.8**~~ | ~~Genitiv-fiks i nyhetsfilteret~~ | **utført 28. aug — ute i prod** | — |
| ~~**v1.4.0**~~ | ~~Alderstak på stale data + `dataAlder` i payload~~ | **utført 28. aug — ute i prod** | — |
| ~~**v1.5.0**~~ | ~~«Overganger» total: planlegger, scenarier, analyse, AI-kommentar~~ | **utført 28. aug — ute i prod** | — |
| ~~**v1.6.0**~~ | ~~«Liga-pakka»: rival-radar, ligagraf, kaptein-liga, roast-rapport~~ | **utført 28. aug — ute i prod** | — |
| ~~**v1.7.0**~~ | ~~«/innsikt»: benkesløsing, kapteinsfasit, flaksbarometer, rundens XI~~ | **utført 31. aug — ute i prod kl. 16:46, 549/549** | — |
| ~~**v1.7.1**~~ | ~~UX-polering: 12 småfiks fra funksjonsgjennomgang~~ | **utført 1. sep — ute i prod, 556/556** | — |
| ~~**v1.8.0**~~ | ~~«Spiller-pakka»: spillerkort, duell, differensialer, straffer~~ | **utført 1. sep — ute i prod, 602/602** | — |
| ~~**v1.8.1**~~ | ~~Redesign av /spillere: faner, lavmælte lenker, klubbkort~~ | **utført 1. sep — ute i prod, 613/613** | — |
| ~~**v1.8.2**~~ | ~~QA-fikser fra prod-gjennomgang + rikere «Rundens rapport»~~ | **utført 1. sep — 626/626** | — |
| ~~**v1.8.3**~~ | ~~«Herding + tilgjengelighet»: CSP m/ nonce, sikkerhetshoder, JSON-tak, takstbegrensning, a11y-pass, branch-rydding~~ | **utført 2. sep — 655/655** | — |
| ~~**v1.9.0**~~ | ~~«Planleggingspakka»: chip-planlegger (/lag), «Lagsjekk» (/brief + Discord), `/kalender.ics` + P3~~ | **utført 2. sep — 691/691** | — |
| ~~**v1.10.0**~~ | ~~«Prisvarsler»: timesnapshot, Discord maks 1/natt, kort på /overganger~~ | **utført 2. sep — 710/710** | — |
| ~~**v1.11.0**~~ | ~~«Karriere-pakka»: FPL-karrieren + merkedager (/innsikt), bonuskamp (/live)~~ | **utført 2. sep — 729/729** | — |
| ~~**v1.12.0**~~ | ~~«PWA»: manifest, ikoner, service worker, /offline~~ | **utført 2. sep — 743/743** | — |
| ~~**v1.12.1**~~ | ~~QA-fikser: 11 funn fra Chrome-QA-en (falskt stale-banner på /live, tre chip-halvdeler, mobil-layout, kontrast)~~ | **utført 2. sep — 756/756** | — |
| ~~**v1.12.2**~~ | ~~Vedlikehold: `npm audit fix` (qs), `node:24-alpine`, egne `:hist`-cache-nøkler (rotårsaken bak QA-funn 6)~~ | **utført 2. sep — 758/758, ute i prod 20:52** | — |
| ~~**v1.13.0**~~ | ~~AI-kall-statistikk per funksjon i `DATA_DIR/ai-stats.json`, vist som `aiStats` på `/health` (gjør P4 målbart)~~ | **utført 2. sep — 767/767** | — |
| ~~**v1.13.1**~~ | ~~«Sikkerhetsnett»: `createApp()` i `src/app.js`, rute-tester for alle sider mot falsk FPL-verden, CI-workflow (Node 22/24), pre-push-hook~~ | **utført 4. sep — 792/792, CI grønn** | — |
| ~~**v1.13.2**~~ | ~~«UX-polering 2»: ti småfiks fra funksjonsgjennomgangen (mobil-nav, rad-tak på /spillere, tomtilstander, datoformat, småtekst)~~ | **utført 4. sep — 809/809** | — |
| *(uten nr)* | Senere/idéer | — | ikke planlagt |

Kalenderlogikk: utviklingssporet (v1.3.0 → v1.3.1+) går uavbrutt;
portene fyres når dato/Marius tillater, uten å blokkere sporet.

## Kø — hva gjøres videre, i rekkefølge

### 0. «Sluttpakka» v1.8.3 → v1.12.0 (besluttet 1. sep, økt 53)

- **Hva:** fem releaser i rekkefølge — herding + tilgjengelighet (v1.8.3),
  planleggingspakka (v1.9.0), prisvarsler (v1.10.0), karriere-pakka
  (v1.11.0), PWA (v1.12.0) — pluss repo-rydding, P3 mot en rivals ekte
  transfers, og til slutt `docs/qa-chrome-prompt.md` for full prod-QA i
  Claude for Chrome. 0 nye AI-kall, ingen nye avhengigheter.
- **Eier detaljene:** `docs/arkiv/plan-sluttpakka-v183-v1120.md` (T-tasks,
  testnavn, beslutningsfasit med 9 punkter — ikke re-spør; arkivert 2. sep
  da alt var ute). QA-prompten: `docs/qa-chrome-prompt.md`.
- **Blokkert av:** ingenting. AI-økten merger `--no-ff`, tagger og pusher
  selv per versjon etter deploy-vindu-sjekk (Marius' beslutning).
- **Status:** v1.8.3 ute 2. sep (655/655), v1.9.0 ute 2. sep (691/691),
  v1.10.0 ute 2. sep (710/710), v1.11.0 ute 2. sep (729/729), v1.12.0 ute
  2. sep (743/743). **Alle fem releasene er ute.** Sluttrydding gjort
  2. sep. **Chrome-QA kjørt av Marius 2. sep: 11 funn (6 VIKTIG, 5
  KOSMETISK) → alle fikset i v1.12.1 (756/756, ute 2. sep). Re-QA i
  Chrome 2. sep 18:20: 11/11 FIKSET, 0 nye funn — § 0 er ferdig.** Gjenstår
  hos Marius: STEG 7 under en kamp (fre 4. sep fra 21:00), 9c, 9e og ekte
  telefon. Rapporten: `docs/arkiv/qa-rapport-v1121.md`.
- **Størrelse:** stor (fem releaser).

### 1. (P4) Løpende kostnadskontroll

- **Hva:** **måleuka er droppet** (besluttet av Marius 28. aug). Marius
  følger tokenforbruket løpende i `console.anthropic.com` i stedet for
  én stille måleuke. Tersklene og analysemetoden i
  `docs/sjekkpunkt-d-kostnad.md` står ved lag og brukes ved behov —
  altså når tallene i konsollen ser gale ut. Taktbudsjettet etter
  v1.6.0 er **~49–53 AI-kall/uke** (brief, nyheter,
  overgangskommentar, ligarapport).
- **Eier detaljene:** `docs/sjekkpunkt-d-kostnad.md` (metode, terskler,
  analyseskript).
- **Måling (fra v1.13.0):** tallene finnes på `/health` → `aiStats`
  (`since`, `totals`, `byKey` per AI-funksjon: calls/inputTokens/
  outputTokens/failures/lastAt/model), persistert i volumets
  `ai-stats.json` — Coolify-loggen trengs ikke.
- **Blokkert av:** ingenting — løpende oppfølging hos Marius.
- **Størrelse:** liten.

### 2. ~~(P3) Etter GW2: verifiser transfers-skjemaet mot ekte data~~ — utført 2. sep (økt 53)

- **Utført:** verifisert read-only mot en rivals `entry/7185653/transfers/`
  (fra ligaens standings). Radene har nøyaktig `element_in`,
  `element_in_cost`, `element_out`, `element_out_cost`, `entry`, `event`,
  `time` — som `pricing.js`/`transfers.js` antar. `event_transfers_cost`
  ligger i `history.current`, ikke på transfer-radene (formuleringen her
  var upresis; koden var riktig). Ingen avvik, ingen fix. Gjenstår kun
  Marius' egen mobil-sjekk av `/overganger` når han har gjort et bytte.

### 3. (P2) README-skjermbilder + mobil-QA `[Marius]`

- **Hva:** Del 6-restene fra sesongstart-verifiseringen: ~~skjermbilder til
  README~~ (**utført 26. aug** — Playwright mot prod, `docs/img/`), og
  mobilvisning på ekte telefon (vannrett scroll, sticky hode, footer,
  norsk, AI-merke).
- **Eier detaljene:** restpunkt-listen i `docs/sjekkpunkt-d-kostnad.md`.
- **Blokkert av:** Marius (nettleser + telefon).
- **Størrelse:** liten.

### 4. Robusthetsreleasene (besluttet 25. aug — detaljene i `docs/arkiv/plan-sluttspurt.md`)

Alle fem kandidatene fra kvalitetspasset er avgjort: fire bygges som egne
releaser, den femte (filterSummaryPoints) får en gratis genitiv-fiks i
stedet for den AI-kostende promptendringen (droppet). Rekkefølge:

- [x] **v1.3.5 Ryddig avslutning:** `createShutdown` i `middleware.js` +
      SIGTERM/SIGINT-håndtering i `server.js`. Docker slipper å SIGKILL-e
      ved deploy, og helsesjekk-beviset (`kill 1`) blir mulig.
- [x] **v1.3.6 gameUpdating-livssyklus:** tidsstemplet flagg med 5 min
      utløp i `fplClient.js` + forklarende 503-side ved kaldstart i
      oppdateringsvindu (`createErrorHandler`).
- [x] **v1.3.7 Persistent brief-markør:** `lastSentEvent` til
      `data/brief-state.json` (`DATA_DIR`-env, volum `/app/data` i
      Coolify) — redeploy i 15-min-vinduet kan ikke re-poste briefen.
      **Utført 26. aug** — volum lagt til, pushet og verifisert i prod.
- [x] **v1.3.8 Genitiv-fiks i nyhetsfilteret:** navnevarianter uten
      genitiv-s i `filterSummaryPoints` (`news.js`). 0 AI-kall.
      **Utført 28. aug** — merget, tagget `v1.3.8` og ute i prod.
- [x] **v1.4.0 Alderstak + dataAlder:** stale data eldre enn 10 min
      (live) / 60 min (resten) får banner «Viser data fra HH:MM …»;
      `/api/brief.json` og `/api/live.json` får `dataAlder` (sekunder).
      **Utført 28. aug** — merget, tagget `v1.4.0` og ute i prod.
- [x] **v1.5.0 «Overganger» total:** angre-analyse med per-runde-detaljer,
      hva hvis-planlegger med full FPL-regelsjekk, lagrede navngitte
      scenarier med FT-regnskap og oppfølging, alternativ-analyse,
      sesongkort, «laget uten bytter»-simulering, prisgevinst og
      AI-kommentar (1x/døgn). Fasit:
      `docs/arkiv/plan-overganger-v150.md`.
      **Utført 28. aug** — merget, tagget `v1.5.0` og ute i prod.

### 5. Idépakken v1.6.0–v1.9.0 (besluttet 27. aug)

- **Hva:** 16 nye funksjoner valgt av Marius, alle nøkkelvalg avgjort i
  fire spørsmålsrunder. Fire versjoner: liga-pakka → /innsikt →
  spiller-pakka → planleggingspakka.
- **Eier detaljene:** `docs/arkiv/plan-idepakken-v16-v19.md` (beslutningsfasit,
  arkivert 2. sep). Hver versjon fikk egen detaljplan (T-tasks, TDD).
- **Status:** v1.6.0 **ute i prod 28. aug** (merget, tagget `v1.6.0`,
  509/509; detaljplan arkivert: `docs/arkiv/plan-liga-v160.md`).
  **v1.7.0 UTE I PROD 31. aug kl. 16:46** (merget `--no-ff`, tagget
  `v1.7.0`, **549/549** + lint 0 før og etter, prod-sveip grønt, 0
  AI-kall; detaljplan arkivert: `docs/arkiv/plan-innsikt-v170.md`).
  **v1.8.0 «Spiller-pakka» UTE I PROD 1. sep** (merget `--no-ff`, tagget
  `v1.8.0`, **602/602** + lint 0 før og etter merge, røyktest med tomme
  nøkler grønn — 0 AI-kall; detaljplan arkivert:
  `docs/arkiv/plan-spillerpakka-v180.md`). **v1.8.1 «Redesign av
  /spillere» UTE I PROD 1. sep** (merget `--no-ff` `35258a7`, tagget
  `v1.8.1`, **613/613** + lint 0 før og etter merge, røyktest med tomme
  nøkler grønn — 0 AI-kall; detaljplan arkivert:
  `docs/arkiv/plan-spillere-redesign-v181.md`). **v1.9.0
  «Planleggingspakka» UTE I PROD 2. sep** (merget `--no-ff`, tagget
  `v1.9.0`, **691/691** + lint 0, røyktest med tomme nøkler grønn — 0
  AI-kall; detaljene i `docs/arkiv/plan-sluttpakka-v183-v1120.md`). **Idépakken
  er dermed ferdig levert.**
- **Blokkert av:** —
- **Størrelse:** stor (fire releaser) — **utført**.

### 5. ~~Vedlikeholdspakka: v1.12.2 + v1.13.0 + docs-slanking~~ (besluttet 2. sep, økt 55) — utført 2. sep (økt 56)

- **Hva:** fire funn fra en read-only gjennomgang etter re-QA-en, valgt av
  Marius (rute-tester og CI ble utelatt): (1) `npm audit fix` for `qs`,
  `fast-xml-parser`-patch og `node:24-alpine` i Dockerfile; (2) egne
  `:hist`-nøkler for getLiveHistoric/getPicksHistoric/getEntryHistoryHistoric
  så «første skriver setter TTL-en» (QA-funn 6) ikke kan skje igjen;
  (3) AI-kall-statistikk per funksjon i `DATA_DIR/ai-stats.json` vist på
  `/health` — gjør § 1 målbart uten Coolify-loggen; (4) CLAUDE.md 353 → ≤ 200
  linjer og ROADMAP-seksjonen «Utført» (337 linjer) til arkiv.
- **Eier detaljene:** `docs/prompt-vedlikehold-v1122-v1130.md` (fasit,
  T1–T3, ferdigkriterier) — konsumert og slettet 2. sep (git bevarer den:
  `git show d34e3c8:docs/prompt-vedlikehold-v1122-v1130.md`).
- **Status:** **utført 2. sep (økt 56):** v1.12.2 (758/758, prod 20:52) og
  v1.13.0 (767/767, prod 20:59, `aiStats` på /health), CLAUDE.md 353 → ≤ 200
  linjer, ROADMAP-historikken til `docs/arkiv/roadmap-utfort-v010-v134.md`.
- **Blokkert av:** —
- **Størrelse:** middels (to små releaser + én docs-commit). 0 AI-kall.

### 6. ~~v1.13.1 «Sikkerhetsnett»: app-fabrikk, rute-tester, CI + pre-push-hook~~ (besluttet 4. sep, økt 57) — utført 4. sep (økt 58)

- **Levert:** `createApp()` i `src/app.js` (lytter aldri, starter ingen timer),
  `test/app.test.js` + `test/fixtures/fpl-world.js` (23 rute-tester mot en falsk
  FPL-verden), `.github/workflows/ci.yml` (Node 22 + 24) og `.githooks/pre-push`
  med `npm run hooks`. 792/792, lint 0, CI grønn. Bonusfunn fikset i samme
  branch: feilsidene falt ned til ren tekst fordi `staleSince` manglet i
  layout-locals. Prompten er konsumert og slettet.

### 7. ~~v1.13.2 «UX-polering 2»: funksjonsgjennomgang → småfiks~~ (utført 4. sep)

- **Hva:** samme form som v1.7.1 (økt 46): full gjennomgang av alle 9 sider +
  tverrgående som bruker — tetthet, mobil-navigasjon (9 nav-lenker ved
  390 px), tomtilstander, lastetid (målt lokalt med curl), forklaringer og
  konsistens. Funn i tabeller med fil:linje, Marius velger «Fiks»/«Behold» i
  puljer, 10–15 småfiks bygges som én patch. Større funn → «Senere / idéer».
- **Eier detaljene:** begge prompter er konsumert og slettet — planprompten til
  Fable (`git show edba4a7:docs/prompt-ux-gjennomgang-v1132.md`) og kjøreprompten
  til Opus (`git show 162ca4d:docs/prompt-ux-polering-v1132.md`).
- **Blokkert av:** ingenting. 0 AI-kall, 0 nye avhengigheter; asset-hashen
  endres (CSS/JS). Deploy-vindu: aldri under kamp (GW3 fre 4. sep 21:00 →
  søndag), aldri torsdag 19–21.
- **Status: FERDIG.** Gjennomgang utført 4. sep (økt 59, Fable): 10 funn, Marius
  valgte «Fiks» på alle, fire større idéer til «Senere / idéer». Bygget 4. sep
  (økt 60, Opus): alle ti fiksene ute, 809/809 (baseline 792), lint 0, hver fiks
  sett i nettleser ved 390 px i begge temaer. Tre avvik fra kjøreprompten ble
  funnet under premissverifiseringen og løst: `colspan="4"` i Prisgevinst krysset
  «Nå»-kolonna (fantomkolonne), `poll()`s feilsti rørte ikke statuslinja mens et
  intervall gikk, og `nextKickoff` var `null` i prod (fiks 9 bevist med
  server/klient-parittet i stedet).
- **Størrelse:** middels (én patch-release, 10 fiks: 1 logo på mobil, 2 rad-tak
  /spillere, 3 managernavn /liga, 4 Lagsjekk-tomtilstand /brief, 5 feilstatus
  /live, 6 `--fs-xs` 12 px, 7 datoformat /nyheter, 8 details /innsikt, 9 neste
  avspark /live, 10 «Nå»-kolonna /overganger).

## Dokumentkart — hvor alt bor

Én eier per fil; alt uten leserverdi for en ny økt ligger i `docs/arkiv/`
eller git. En ny økt leser `docs/HANDOVER.md` → køen her → resten ved behov.

| Fil | Rolle |
| --- | --- |
| `ROADMAP.md` (rot) | fasiten: versjonsplan, kø, dokumentkart, historikk |
| `docs/HANDOVER.md` | nåtilstand + lærdommer + beslutninger (tak 200 linjer) |
| `docs/VIDERE.md` | Marius' ikke-tekniske kortversjon |
| `docs/arkiv/plan-v130-ui-overhaul.md` | godkjent plan for v1.3.0–v1.3.3 (UI-overhaling), utføres etappevis |
| `docs/sjekkpunkt-d-kostnad.md` | metode + skript for P4-målingen |
| `docs/arkiv/plan-sluttspurt.md` | utført plan: robusthetsreleasene, portene og docs-ryddingen |
| `docs/arkiv/plan-idepakken-v16-v19.md` | beslutningsfasit for idépakken v1.7.0–v1.9.0 (utført, arkivert 2. sep) |
| `docs/arkiv/plan-sluttpakka-v183-v1120.md` | utført plan for v1.8.3–v1.12.0 (T-tasks, testnavn, 9-punkts fasit) — alt ute 2. sep |
| `docs/qa-chrome-prompt.md` | prompten til Claude for Chrome: full prod-QA etter sluttpakka (STEG 1–10, rapportformat, fasit) |
| `docs/arkiv/qa-rapport-v1121.md` | re-QA-rapporten fra Claude for Chrome 2. sep (11/11 FIKSET, målte kontraster og `dataAlder`) |
| `docs/arkiv/roadmap-utfort-v010-v134.md` | ROADMAPs «Utført»-historikk v0.1.0 → v1.3.4, flyttet verbatim 2. sep 2026 (økt 56) |
| `docs/arkiv/plan-spillere-redesign-v181.md` | utført detaljplan for v1.8.1 (redesign av /spillere, T1–T12) |
| `docs/arkiv/plan-innsikt-v170.md` | utført detaljplan for v1.7.0 «/innsikt» (T1–T10) |
| `docs/arkiv/plan-v134-ai-swr.md` | utført plan for v1.3.4 (SWR + oppfrisker) |
| `docs/arkiv/` (27 filer) | utførte planer, QA-rapport + historikk (kun sti-referanser rettes ved rydding) |

## Senere / idéer (ikke planlagt)

- ~~Prisendrings-varsler~~ — **utført 2. sep som v1.10.0** (`prices.js`)
- E-postvarsling som alternativ til Discord — **droppet 1. sep** (krever
  SMTP-avhengighet; Discord dekker behovet)
- Spillerbilder (FPLs `p{code}.png`, 609 × ~10 KB) — bevisst utelatt fra
  v1.3-overhalingen (beslutning F-g), bekreftet droppet 1. sep
- ~~BPS-race live~~ — **utført 2. sep i v1.11.0** (`topBps` i live.js)
- ~~FPL-karrieren~~ — **utført 2. sep i v1.11.0** (`buildCareer`)
- ~~Badges/merkedager~~ — **utført 2. sep i v1.11.0** (`buildBadges`, åtte merker)
- ~~PWA~~ — **utført 2. sep som v1.12.0** (manifest, ikoner, `/sw.js`, `/offline`)
- ~~AI-kommentar til overgangsanalysen~~ — bygget i v1.5.0
- Desimalkomma i norsk UI («12,5» i stedet for «12.5», «£100,3m») — rører
  `formatPrice` (analysis.js), ~10 `toFixed` i views og spillerkort/planlegger i
  app.js; større enn småfiks (notert i UX-gjennomgangen 4. sep, økt 59)
- Server-side paginering / virtuell liste på /spillere (957 kB HTML, 13 544
  DOM-noder) — krever ny API-rute og klientlogikk; v1.13.2 tar rad-tak i klienten
- Meny-knapp (hamburger) for mobil-navigasjonen — endrer interaksjonsmodellen
  fra v1.3 (scrollende meny); v1.13.2 korter logoen i stedet
- Kopier-knapp for webcal-adressen (hero på / og /brief) — trenger JS

---

## Utført (v0.1.0 → v1.3.4)

Historikken (337 linjer) er flyttet verbatim til
`docs/arkiv/roadmap-utfort-v010-v134.md` (2. sep 2026, økt 56). Nyere
historikk: versjonsplanen øverst + CHANGELOG.md.
