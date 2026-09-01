# Plan — «Sluttpakka»: v1.8.3 → v1.12.0 + full Chrome-QA (økt 53, 1. sep 2026)

## Context

Marius ba om én lang, detaljert plan over alt som skal fikses eller bygges,
at alt bygges ferdig, og at det avsluttes med en full QA i Claude for Chrome
(prompt skrives av meg til slutt). Utgangspunkt: `main` = `origin/main`
(`a21e09e`), v1.8.2 i prod, **626/626 tester + lint 0**, `[Unreleased]` tom.
Køen i ROADMAP hadde igjen: v1.9.0 «Planleggingspakka» (eneste planlagte
versjon) + «Senere / idéer». Marius valgte (spørsmålsrunde 1–3, fasit under)
å ta alt unntatt e-post og spillerbilder, pluss mine egne tillegg.

**Resultat:** fem releaser, hver merget/tagget/pushet av meg, 0 nye AI-kall,
ingen nye avhengigheter, deretter `docs/qa-chrome-prompt.md` til Chrome-QA.

## Beslutningsfasit (Marius, 1. sep — ikke re-spør)

| # | Beslutning |
| --- | --- |
| 1 | Omfang: v1.9.0 (chip-planlegger, deadline-sjekk, kalender) + prisvarsler + BPS-race + FPL-karrieren + badges + PWA + sikkerhetsheadere/robusthet + a11y-pass + repo-rydding. **Ikke** e-post, **ikke** spillerbilder, **ikke** Playwright i repoet. |
| 2 | Jeg merger `--no-ff`, tagger og pusher **selv per versjon** (deploy-vindu sjekkes først: aldri torsdag 19–21, aldri under kamp). |
| 3 | 0 nye AI-kall. Takt forblir ~49–53/uke. |
| 4 | Rekkefølge: **v1.8.3 herding+a11y → v1.9.0 → v1.10.0 pris → v1.11.0 karriere/badges/BPS → v1.12.0 PWA.** |
| 5 | Plassering v1.9.0: chip-planlegger = kort på `/lag`; deadline-sjekk = kort «Lagsjekk» på `/brief` (alltid synlig) + Discord kun ved funn; kalender = «Abonner på kalender» ved nedtellingen på `/` og på `/brief`. Ingen nytt nav-punkt. |
| 6 | Lagsjekk-funn: skadet/suspendert/utlånt/ikke tilgjengelig (i/s/u/n) i XI; tvilsom (d) med chance ≤ 50; kaptein/vise med status ≠ a; starter uten kamp i runden. Infolinje (utløser ikke alene): gratisbytter igjen + aktiv chip. **Ikke** ep_next-hint. |
| 7 | Lagsjekk-grunnlag: picks fra runde N−1 **med byttene for runde N påført** (entry/transfers er synlig før deadline); roller fra N−1; teksten sier det. |
| 8 | Prisvarsel: troppen + topp 5 opp/ned globalt, maks én melding per natt; norsk komma i delta «(+0,1)». Samme innhold som kort på `/overganger`. |
| 9 | Brancher: `-d` de 10 mergede, `-D` de tre umergede (`docs/plan-ui-overhaul`, `feat/discord-everyone`, `fix/news-unknown`). |

## Utenfor min rekkevidde (står igjen hos Marius, listes i HANDOVER)

- `kill 1` i containerterminalen (SIGTERM-bevis for v1.3.5).
- Mobil-QA på ekte telefon (Chrome-QA-en emulerer 390 px).
- Kostnad i `console.anthropic.com`.

## Release-løkka (lik for alle fem)

```
git switch main && git status -sb && npm test && npm run lint     # baseline-tall noteres
git switch -c <branch>
# per task: test først → npm test RØD (vis) → kode → GRØNN → én conventional commit m/ CHANGELOG-linje
npm test && npm run lint                                          # sluttkontroll
# røyktest (egen seksjon) → docs-commit (CHANGELOG [x.y.z] + dato, package.json, ROADMAP, HANDOVER, VIDERE, CLAUDE.md)
# deploy-vindu-sjekk → merge --no-ff → npm test + lint PÅ merget main → CHANGELOG-rekkefølge → tag vX.Y.Z → push (main + tag)
# prod-sjekk: curl /health, footer-versjon, ny asset-hash i HTML
```

Docs er CRLF → **kun Edit-verktøyet** (aldri node-replace/sed). Nye kildefiler LF.
Commit-stil som `git log v1.8.0..v1.8.1`: `feat(scope):`, `fix(scope):`, `docs:`,
`chore(release): vX.Y.Z — versjon, CHANGELOG og docs ajour`.

**Første commit i økta (på main, docs):** loggfør Marius' beskjed i HANDOVER
(økt 53) + legg denne planen som `docs/plan-sluttpakka-v183-v1120.md` (repo-kopi
så en ny økt kan fortsette). Arkiveres til `docs/arkiv/` når alt er ute.

---

## v1.8.3 «Herding + tilgjengelighet» — branch `fix/herding-a11y-v183`

Funn fra utforskingen som styrer rekkefølgen:
- `views/players.ejs:13` har `onsubmit="return false"` — eneste inline-handler; CSP med nonce blokkerer den → fjernes FØR CSP-en.
- `aria-sort` finnes alt (players.ejs, live.ejs, app.js Modul 2 :392–397) → låses med test, ikke bygges.
- `<script id="live-data" type="application/json">` er ikke-kjørbar → CSP-trygg.
- POST-kropper er små (`/api/ai-rad` tom, `/api/scenarier` `{name,event,moves[]}`) → `express.json({ limit: '32kb' })`.

| T | Innhold | Filer | Tester (navn) | Δ |
| --- | --- | --- | --- | --- |
| T1 | Fjern inline `onsubmit`; `submit`-lytter i app.js Modul 2b | `views/players.ejs`, `public/app.js` | views: «ingen view har inline on*-hendelsesattributter (CSP)» (regex over alle fixture-rendringer + rå `views/*.ejs`) | +1 |
| T2 | `createSecurityHeaders({ nonce })` + `buildCsp(nonce)` i `src/middleware.js`; `res.locals.cspNonce`; `layout.ejs:8` får `nonce="<%= cspNonce %>"`; monteres i `server.js` etter `compression()`, før `express.json({limit:'32kb'})` og static | `src/middleware.js`, `src/server.js`, `views/layout.ejs`, `test/middleware.test.js`, `test/views.test.js` (layoutLocals får `cspNonce`) | middleware: «securityHeaders setter CSP med per-forespørsel-nonce og speiler den i res.locals», «securityHeaders gir ny nonce for hver forespørsel», «securityHeaders setter nosniff, DENY, Referrer-Policy og Permissions-Policy», «CSP-en har aldri unsafe-inline for script og alltid frame-ancestors none», «server.js monterer securityHeaders før rutene og begrenser JSON-kroppen til 32kb» (kildelås). views: «layout.ejs gir tema-scriptet CSP-noncen», «layout.ejs har nøyaktig ett inline-script, og det bærer nonce» | +7 |
| T3 | `clientIp(req)` (cf-connecting-ip → x-forwarded-for[0] → socket) + `createRateLimiter({windowMs:5 min, max:30, methods:['POST','DELETE'], now, keyOf})` → 429 JSON + `Retry-After`; `router.use(rateLimitWrites)` rett etter `noStore` i `api.js` | `src/middleware.js`, `src/routes/api.js`, tester | «rateLimiter slipper GET gjennom uansett», «rateLimiter svarer 429 med Retry-After etter maks POST i vinduet», «rateLimiter nullstiller telleren når vinduet er over», «clientIp foretrekker CF-Connecting-IP foran X-Forwarded-For og socket», routes: «hele API-routeren begrenser POST/DELETE per IP» | +5 |
| T4 | Hopp-lenke «Hopp til innhold» først i `<body>`, `<main id="innhold">`, `.skip-link` (skjult til fokus, `--accent`/`--accent-ink`), `role="timer"` på nedtellingen | `views/layout.ejs`, `views/dashboard.ejs`, `public/style.css` | views: «layout.ejs har hopp-lenken som første fokuserbare element og main#innhold»; style: «style.css: hopp-lenken er skjult til den får fokus» | +2 |
| T5 | `scope="col"` på sorterbare `th`; ren `nextSortDir(current)` på filnivå i app.js | `public/app.js`, `views/players.ejs`, `views/live.ejs` | app-client: «nextSortDir veksler descending → ascending og alt annet → descending»; views: «sorterbare kolonnehoder har scope=col og aria-sort» | +2 |
| T6 | `<caption class="sr-only">` på alle `table.data` (dashboard 5, innsikt 6, league 4, transfers 4, players 2, live 1) + klientrendrede tabeller i app.js (ligatabellene :569, `duelHtml` :213); `role="status"` på `#live-status`, `aria-live="polite"` på totalsummen | 6 views, `public/app.js` | views: «hver datatabell har caption eller aria-labelledby», «alle ikon-knapper har aria-label», «live.ejs annonserer status og totalsum med aria-live»; app-client: «duelHtml og ligatabellene har caption» | +4 |
| T7 | Etiketter på alle `input`/`select` (også planlegger-markup i app.js Modul 8); testlås på `prefers-reduced-motion` og global `:focus-visible` | `public/app.js`, `public/style.css` (ved behov) | views: «ingen input eller select uten label, aria-label eller aria-labelledby»; app-client: «klientrendrede skjemafelt har aria-label»; style: «all animation og transition ligger bak prefers-reduced-motion», «global :focus-visible med synlig outline» | +4 |
| T8 | Repo-rydding + docs: `git branch -d` ×10, `-D` ×3; CLAUDE.md (middleware-linja), DEPLOY.md ny seksjon «CSP og Cloudflare» (Rocket Loader AV, Web Analytics-beacon AV — begge injiserer inline-script), CHANGELOG `[1.8.3]`, HANDOVER | docs | — | 0 |

**CSP (én linje):**
`default-src 'self'; script-src 'self' 'nonce-<n>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
(`style-src unsafe-inline` pga. `style="--andel"` i players.ejs:169 og `style="background"` i league.ejs:189; `img data:` pga. SVG-favicon; `worker-src`/`manifest-src` arver `default-src` → PWA-en trenger ingen CSP-endring.)
Øvrige hoder: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`.

**Prod-sjekk etter push (ekstra for denne):** `curl -sI https://fpl.marsk.no/ | grep -i content-security` og `curl -s https://fpl.marsk.no/ | grep -c '<script'` = **2** (tema + app.js) — flere betyr at Cloudflare injiserer script som CSP-en blokkerer → slå av CF-funksjonen, ikke svekk CSP-en.

Forventet: 626 → ~651.

---

## v1.9.0 «Planleggingspakka» — branch `feat/planleggingspakka-v190`

Nye services importerer **aldri** `ai.js` (kildelås i routes.test.js som for players.js).
Ny env: `DEADLINE_CHECK_HOURS_BEFORE` (default 3) i `config.js`, `.env.example`, README-tabellen.

### Data

| Del | fplClient-kall | TTL | Ekstra nett |
| --- | --- | --- | --- |
| Chip-planlegger (/lag) | getBootstrap, getFixtures() (`fixtures:alle`), getPicks, getEntryHistory — alle hentes alt av `routes/team.js` | 15m/15m/5m/5m | 0 |
| Lagsjekk (timer + /brief) | getBootstrap, getFixtures() filtrert på `event === gw`, getPicks(resolvedGw), getEntryHistory, getEntryTransfers | 15m/15m/5m/5m/5m | ≤ 5 cachede kall per runde fra timeren |
| Kalender | getBootstrap, getFixtures(), getPicks(resolvedGw) | 15m/15m/5m | 0 ved varm cache |

### A. Chip-planlegger — `src/services/chips.js` (ren)

```js
export const CHIPS = ['bboost', '3xc', 'freehit', 'wildcard'];          // navnene i history.chips
export const CHIP_LABELS = { bboost: 'Bench Boost', '3xc': 'Triple Captain', freehit: 'Free Hit', wildcard: 'Wildcard' };
export function chipHalves(bootstrapChips, lastGw = 38)   // fra bootstrap.chips[].start_event/stop_event, fallback 1–19 / 20–38
export function fixtureGrid({ teams, fixtures, fromGw, toGw })  // Map<teamId, Map<gw, [{opponent, home, difficulty}]>> — DEL hjelperen med fdrMatrix (analysis.js:131–172), ikke kopier
export function specialGws(grid, teams, fromGw, toGw)     // { dgw:[{gw, teams:[short]}], bgw:[{gw, teams:[short]}] }
export function buildChipPlan({ events, fixtures, teams, squadTeamCounts, chipsUsed, fromGw, bootstrapChips })
// → { fromGw, halves:[{half, from, to, chips:{ bboost:{used, rec}, '3xc':…, freehit:…, wildcard:… }}], dgw, bgw, noSpecial }
```

Regler (ease = 6 − difficulty; klubb uten kamp = 0 kamper/0 ease; kun runder ≥ fromGw i halvdelen; brukt chip → `rec: null`):
- **Bench Boost:** `bb(g) = Σ_klubb n_klubb × Σ ease(kamper i g)`; maks, likhet → tidligst. `rec: {gw, squadFixtures, avgFdr, dgwClubs}`.
- **Triple Captain:** per (klubb med minst én ikke-keeper i troppen, g): `Σ ease`; DGW dobler naturlig. `rec: {gw, teamId, teamShort, fixtures}`; likhet → tidligst, så flest spillere i klubben.
- **Free Hit:** kun i BGW-runder: `fh(g) = Σ n_klubb for blanke klubber`; krever ≥ 4, ellers `rec: null, reason: 'Ingen blankrunde rammer troppen bredt nok'`. `rec: {gw, blankPlayers, blankClubs}`.
- **Wildcard:** `squadFdr(g)` = vektet snitt-FDR over troppens klubber (blank = 5); `badness(s) = mean(squadFdr(s..s+2))`; `s* = argmax`, krever ≥ 3,3 ellers `rec: null, reason: 'Troppen har ingen tung periode i halvdelen'`; vindu starter `w = s*+3`, lengde L ∈ {4,5,6} (klippet til halvdelen) som minimerer snitt-FDR for de 8 letteste klubbene i `[w, w+L−1]`, likhet → lengst. `rec: {gw: w, until, badRun:{from,to,avgFdr}, bestClubs: topp 5}`.
- `noSpecial` når verken DGW eller BGW er kjent → kortet sier «Ingen dobbel- eller blankrunder er kjent ennå — FPL flytter kamper utover sesongen», men viser BB/TC/WC likevel.

Kort «Chip-planlegger» på `/lag` etter rankgrafen, før «Anbefalinger» (team.ejs:79): to halvdeler × fire chips, brukt = grå pille med runde, anbefaling med runde + begrunnelse; DGW/BGW-liste.

Tester `test/chips.test.js` (syntetisk 3–4 klubber, GW 1–8): «chipHalves leser start_event/stop_event og faller tilbake på 1–19/20–38», «specialGws finner dobbel- og blankrunde», «buildChipPlan anbefaler Bench Boost i dobbelrunden med lavest FDR», «buildChipPlan foretrekker dobbelrunde for Triple Captain og hopper over keeperklubber», «buildChipPlan anbefaler Free Hit bare når minst fire i troppen er blanke», «buildChipPlan legger Wildcard rett etter troppens tyngste 3-rundersvindu», «buildChipPlan markerer brukte chips per halvdel og gir dem ingen anbefaling», «buildChipPlan uten spesialrunder gir noSpecial og fortsatt BB/TC/WC» (+8). Views: «team.ejs viser chip-planleggeren med brukt/tilgjengelig», «team.ejs forklarer når ingen spesialrunder er kjent» (+2).

### B. Deadline-sjekk — `src/services/deadline.js` + timer i `notify.js`

```js
export function applyTransfers(picks, transfersForGw)   // picks N−1 → tropp for N: ut fjernes, inn arver plassen (posisjon/rolle) — ren
export function buildDeadlineCheck({ picks, transfersForGw, elementsById, fixturesForGw, teamsById, entryHistory, chips, event })
// → { gw, gwName, deadline, basis: 'forrige runde + bytter', findings:[{type, player:{id,name,teamShort,teamCode}, detail}],
//     footer:{ freeTransfers|null, transfersMade, activeChip|null }, ok }
export function deadlineCheckText(check, hoursBefore)   // Discord-tekst, ren
export async function assembleDeadlineCheck({ teamId } = {})   // henter via fplClient; null uten kommende runde
```

Funn-typer (startere = `pick.position ≤ 11`; detalj via `translateFplNews`/`STATUS_LABELS`): `kaptein` (status ≠ a), `vise`, `ute` (i/s/u/n), `tvilsom` (d og chance ≤ 50), `blank` (klubb uten kamp med `event === gw`). Rekkefølge: kaptein, vise, så etter posisjon. Dedup på (type, id). Footer: `buildFtLedger({history, chips})` (scenarios.js:165) → `freeTransfers = valid ? max(next − transfersMade, 0) : null`; `activeChip = picks.active_chip`.

Discord-tekst:
```
**Lagsjekk — Runde 12** (deadline om 3 t, lørdag 24. oktober kl. 12:00)
https://fpl.marsk.no/brief
Grunnlag: laget fra runde 11 + byttene dine for runde 12.

- Kaptein: Haaland (MCI) er Usikker — 50 % sjanse for spilletid
- Saka (ARS) er Skadet — Kneskade, ventes tilbake 1. nov.
- Mbeumo (BRE) har ingen kamp i runden

_Gratisbytter igjen: 1 (1 brukt) · Chip: ingen_
```

notify.js: `sendDecision` får valgfri `maxLateMs` (default uendret); ny markør `lastCheckedEvent` i `DATA_DIR/check-state.json`; hooks `loadCheck/saveCheck/checkCompose`; `_initState`/`_reset` utvides; `export const _checkDeadline`; `tick()` kaller `checkDeadline()` kun når webhook finnes; `checkDeadline()` speiler `check()` (:135–169) med `hoursBefore: config.deadlineCheckHoursBefore` og `maxLateMs = (hoursBefore·60 − 15)·60_000` (sen omstart sjekker fortsatt, aldri etter deadline − 15 min); `sendCheck` poster **kun ved `!ok`**, markøren lagres uansett (ren tropp re-sjekkes ikke hver 6. t); logger «Lagsjekk: alt klart for Runde N».

Kort «Lagsjekk» på `/brief` under page-head: funnliste eller «Alt klart ✓», footer-linja, hint om grunnlaget. `routes/brief.js` kaller `assembleDeadlineCheck` (myk feil → kortet skjules).

Tester `test/deadline.test.js`: «applyTransfers bytter ut solgt spiller og lar den nye arve plassen», «buildDeadlineCheck flagger suspendert starter», «buildDeadlineCheck flagger usikker starter først ved ≤ 50 % spillesjanse», «buildDeadlineCheck flagger kaptein og vise med status ulik a — kaptein først», «buildDeadlineCheck flagger starter uten kamp i runden, aldri benken», «buildDeadlineCheck gir ok og tom liste når troppen er ren», «footer teller gratisbytter fra ledger minus gjorte bytter, og ukjent når ledgeren er ugyldig», «deadlineCheckText nevner deadline, grunnlag, hvert funn og footeren» (+8). notify.test.js: «sendDecision godtar egen maxLateMs», «checkDeadline poster kun ved funn og lagrer markøren uansett», «checkDeadline hopper over runde som alt er sjekket», «checkDeadline kjører sent etter omstart men aldri etter deadline» (+4). Views: «brief.ejs viser Lagsjekk med funn», «brief.ejs viser «Alt klart» uten funn» (+2).

### C. Kalender — `src/services/calendar.js` + `src/routes/calendar.js` (`/kalender.ics`)

```js
export function icsDate(iso)        // '2026-10-24T10:00:00Z' → '20261024T100000Z' (UTC, ingen VTIMEZONE)
export function escapeText(s)       // \ ; , og linjeskift
export function foldLine(line)      // ≤ 75 oktetter (Buffer.byteLength), fortsettelse CRLF + ' '
export function buildCalendar({ events, fixtures, squadTeamIds, teamsById, now })  // → streng med CRLF
```

Struktur: `VCALENDAR` (VERSION 2.0, PRODID `-//FPL-dashboard//v1.9.0//NB`, CALSCALE, METHOD:PUBLISH, X-WR-CALNAME «FPL-dashboard», X-PUBLISHED-TTL/REFRESH-INTERVAL PT6H) → én `VEVENT` per event (alle 38): UID `fpl-deadline-<id>-<sesongår>@fpl-dashboard`, DTSTAMP(now), DTSTART(deadline), ingen DTEND, SUMMARY «FPL deadline – Runde N», URL `/brief`, `VALARM` DISPLAY `TRIGGER:-PT3H` → én `VEVENT` per fixture med `kickoff_time`, `event ≥ fromGw` og hjemme/borte i `squadTeamIds`: UID `fpl-fixture-<fixture.id>@…`, DURATION PT2H, SUMMARY «ARS – MCI (Runde N)», DESCRIPTION «Arsenal mot Man City\nFDR 4/2». Uten `FPL_TEAM_ID`: kun deadlines.
Rute: `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: inline; filename="fpl-dashboard.ics"`, `Cache-Control: no-store`; monteres før 404 i server.js.
Lenke: `routes/index.js` og `routes/brief.js` gir `calendarUrl = 'webcal://' + req.get('host') + '/kalender.ics'`; `dashboard.ejs` (etter nedtellingen) og `brief.ejs` (page-head): «Abonner på kalender» + én linje «eller lim `webcal://…` inn i kalenderappen».

Tester `test/calendar.test.js` (split på `\r\n`, unfold): «buildCalendar bruker CRLF på hver linje og aldri nakent LF», «buildCalendar folder ingen linje over 75 oktetter — også med æøå», «buildCalendar gir 38 deadline-hendelser med VALARM 3 timer før», «buildCalendar tar kun troppens klubbers kamper fra og med neste runde», «escapeText escaper semikolon, komma, bakstrek og linjeskift», «buildCalendar bruker Z-tidsstempler og DTSTAMP fra now» (+6). Views: «dashboard.ejs og brief.ejs viser kalenderlenken med webcal-adresse» (+1). Routes: «calendar.js, chips.js og deadline.js importerer aldri ai.js» (+1).

### Task-rekkefølge v1.9.0

T1 chipHalves/fixtureGrid/specialGws (+2) → T2 buildChipPlan (+6) → T3 /lag-kort + team.js + fixtures (+2) → T4 applyTransfers + buildDeadlineCheck + tekst (+8) → T5 assembleDeadlineCheck + config + notify-timer + markør + .env.example/README (+4) → T6 Lagsjekk-kort på /brief (+2) → T7 kalender-generator (+6) → T8 rute + lenker + CSS `.hero-links` (+2) → T9 **P3-verifisering** + docs.

**P3 (uten å vente på Marius' første bytte):** hent en rivals `entry`-id fra `leagues-classic/1397750/standings/`, `GET entry/<id>/transfers/` (read-only, fra scratchpad, samme User-Agent som fplClient). Bekreft feltene koden antar: `element_in`, `element_in_cost`, `element_out`, `element_out_cost`, `entry`, `event`, `time` (pricing.js:47–51, transfers.js:28,135). NB: `event_transfers_cost` ligger i `history.current`, ikke på transfer-rader — HANDOVER-formuleringen rettes. Avvik → `fix:` med oppdaterte fixtures. Kryss av P3 i ROADMAP. Vis rått (forkortet) API-svar som bevis.

Docs: CLAUDE.md (tre nye services + env), DEPLOY.md (volumet rommer nå også `check-state.json`), ROADMAP (v1.9.0 utført, køpunkt 5 lukket), `docs/plan-idepakken-v16-v19.md` → `docs/arkiv/`, VIDERE.md.

Forventet: ~651 → ~684.

---

## v1.10.0 «Prisvarsler» — branch `feat/prisvarsler-v1100`

`src/services/prices.js` etter refresh.js-mønsteret (ren beslutning + `_tick` + `startPriceWatcher` + `_setNow/_setHooks/_reset`). **Alltid aktiv** (også uten webhook: snapshot + kort virker, ingen post). Tikk hver 60. min + ett ved oppstart. FPL-kost: ≤ 1 bootstrap/time når ingen surfer.

```js
export const TICK_MS = 60 * 60_000;
export function dateKey(ms, tz)                  // 'YYYY-MM-DD' i Oslo-tid
export function snapshotOf(elements)             // { [id]: now_cost }
export function diffPrices(prevPrices, elements) // [{id, from, to}] sortert på id; tom uten snapshot
export function buildPriceChanges({ diffs, elements, squadIds, teamsById, date })
// → { date, mine:[{id,name,teamShort,teamCode,from,to,delta}], risers: topp 5, fallers: topp 5, countUp, countDown }
//   risers: delta desc, så transfers_in_event desc; fallers: delta asc, så transfers_out_event desc
export function priceDecision({ hasSnapshot, changed, lastPostedDate, today, webhook })  // → { snapshot, post }
export function priceChangesText(changes)        // Discord-tekst (formatPrice + formatSigned(delta/10) → «+0,1»)
export function parsePriceFile(text)             // version 1, ellers null
export function getLastPriceChanges()            // for /overganger (lazy fra disk)
export async function _tick(); export function startPriceWatcher();
```

`DATA_DIR/price-state.json`: `{ version:1, date, prices:{id:now_cost}, lastDiff:{date, mine, risers, fallers, countUp, countDown}, lastPostedDate }`. Korrupt/ukjent versjon → null → neste tikk tar nytt snapshot uten melding. Tikk: snapshot lagres FØR post; samme dato → endringer slås sammen i `lastDiff` (behold første `from`, siste `to`), ingen ny post. Discord via `postToDiscord` eksportert fra notify.js (Discord blir i notify.js). Feil logges, kastes aldri.

Discord-tekst:
```
**Prisendringer natt til onsdag 3. september**
https://fpl.marsk.no/overganger

**Troppen din**
- Haaland (MCI) £14.0m → £14.1m (+0,1)
- Saka (ARS) £10.2m → £10.1m (−0,1)

**Opp (5 av 23):** Palmer £10.5m → £10.6m · Isak £9.1m → £9.2m · …
**Ned (5 av 17):** Watkins £8.9m → £8.8m · …
```
(«Ingen endringer i troppen din.» når `mine` er tom.)

Kort «Prisendringer i natt» på `/overganger` etter stat-stripa, før AI-kommentaren, kun når `priceChanges` finnes: tittel med `formatDay(date)`, tre lister (troppen / opp / ned) som `table.data data--fit` med klubbmerke, hint «Sjekkes hver time; FPL endrer priser om natten.» `routes/transfers.js` legger til `priceChanges: getLastPriceChanges()`.

Tasks/tester: T1 dateKey/snapshotOf/diffPrices/priceDecision/parsePriceFile (+5: «diffPrices finner kun endrede priser og ingen når snapshot mangler», «priceDecision poster maks én gang per dato», «priceDecision uten webhook tar snapshot men poster aldri», «dateKey gir Oslo-dato rundt midnatt», «parsePriceFile gir null ved ukjent versjon») → T2 buildPriceChanges + tekst (+4: «buildPriceChanges skiller troppen fra topp 5 opp og ned», «risers brytes på transfers_in_event ved lik delta», «priceChangesText nevner troppen først og «Ingen endringer i troppen din» når tom», «buildPriceChanges takler spiller som forsvant fra bootstrap») → T3 `_tick`/`startPriceWatcher` + hooks + server.js + `postToDiscord`-eksport (+3: «_tick tar første snapshot uten å poste», «_tick poster ved endring og lagrer nytt snapshot», «_tick slår sammen en andre endring samme dag uten ny post») → T4 kort + rute + fixtures (+2: «transfers.ejs viser prisendringene i natt», «transfers.ejs skjuler priskortet uten snapshot») → T5 kildelås «prices.js importerer aldri ai.js» (+1) + docs (CLAUDE.md, DEPLOY.md volum, README, ROADMAP-idé strøket, VIDERE: «første natt kommer ingen melding — bare snapshot»).

Forventet: ~684 → ~699.

---

## v1.11.0 «Karriere-pakka» — branch `feat/karriere-v1110`

### A+B. FPL-karrieren + Merkedager (`src/services/insights.js`, `/innsikt`)

`assembleInsights` henter i tillegg `getEntryHistory(teamId)` (egen id → ALLTID 5-min-nøkkelen) og returnerer `career` og `badges` **også når 0 runder er ferdige** (past finnes før GW1) → `innsikt.ejs:9–17` rendrer karrierekortet utenfor tomtilstanden.

```js
export function buildCareer({ past, current, seasonLabel })
// → { seasons:[{season, points, rank, best}], best:{season, rank}|null, current:{label, points, rank, gws}|null }
export function gwsAllPlayed({ picksByGw, liveByGw, gws })   // runder der alle 15 hadde minutes > 0
export function buildBadges({ current, past, chips, extras:{ captainRows, allPlayedGws } })
// → [{ id, title, description, earned, gw, detail }] i fast katalogrekkefølge
```

| id | Tittel | Opptjent når | gw/detalj |
| --- | --- | --- | --- |
| `beste-runde` | Sesongbeste | `current.length ≥ 1` | runden med maks `points` (likhet → første) — «Runde 5 · 78 p» |
| `tre-gronne` | Tre grønne piler | tre påfølgende rader med `overall_rank < forrige` | tredje runde i første slike rekke |
| `hundre` | Hundreklubben | rad med `points ≥ 100` | første — «112 p» |
| `topp-100k` | Topp 100 000 | rad med `overall_rank ≤ 100000` | første, rank formatert |
| `rekordrank` | Bedre enn noen gang | `past.length ≥ 1` og rad med `overall_rank < min(past.rank)` | første — «<rank> mot <beste før>» |
| `null-benk` | Tom benk | rad med `points_on_bench === 0` og chip ≠ bboost | første |
| `kapteinsrekke` | Kapteinsteft | tre påfølgende `captainRows` med `squadBest.hit` (fra buildCaptainAudit) | tredje |
| `alle-15` | Alle femten spilte | `allPlayedGws.length ≥ 1` | første |

Låst: `earned:false, gw:null, detail:null`. Aldri avhengig av dreamTeam eller AI.
Views: kort «FPL-karrieren» (tabell sesong/poeng/rank, beste rad `status-best`, + «Denne sesongen så langt») og «Merkedager» (`.merke`-fliser i grid, låste `.merke--laast` med `aria-disabled`, tittel + beskrivelse + «Runde N»). Nye tokens kun hvis nødvendig — i BEGGE temablokker.

### C. Bonuskamp (BPS-race) på `/live`

`live.js`: `topBps(fixture, elementsById, teamsById, myIds)` → `[{id, name, teamShort, bps, bonus, mine}]` med bonus fra `(matchDone || hasConfirmedBonus) ? publishedBonus : estimateBonus` (analysis.js:387–429 — likhet arves: 3,3,1 / 3,2,2 / 3,2,1,1, aldri kuttet til 3), sortert bps desc, navn asc; `buildLive` legger `matches[i].bpsTop = started ? … : []` og `bpsSource: 'fpl'|'estimat'`. Kampene rendres i dag KUN klientside (`#live-matches` fylles av `render()` app.js:550–563) → ren `bpsRaceHtml(match)` på filnivå i app.js (vm-testbar), `render()` legger den inn i hver `.match`; mine spillere i fet; merket «(estimat)»/«(FPL)». CSS `.bps-race`.

Tester: insights.test.js «buildCareer finner beste sesong og sesongen så langt», «buildCareer uten past gir tom liste og best null», «buildBadges gir «Tre grønne piler» ved tredje grønne runde på rad», «buildBadges teller ikke «Tom benk» i Bench Boost-runde», «buildBadges låser «Bedre enn noen gang» uten tidligere sesonger», «buildBadges gir «Kapteinsteft» fra tre treff på rad», «gwsAllPlayed krever minutter på alle 15», «buildBadges returnerer hele katalogen i fast rekkefølge med earned-flagg» (+8); live.test.js «topBps deler bonus ved likhet på topp: 3,3,1», «topBps bruker publisert bonus når FPL har publisert», «topBps markerer mine spillere og gir tom liste før avspark», «buildLive legger bpsTop på hver kamp» (+4); app-client «bpsRaceHtml escaper navn og viser estimat-merket» (+1); views «innsikt.ejs viser FPL-karrieren også før første runde», «innsikt.ejs viser låste merkedager grået» (+2).

Tasks: T1 buildCareer (+2) → T2 buildBadges/gwsAllPlayed (+6) → T3 innsikt-view + fixtures (+2) → T4 topBps + payload (+4) → T5 klientrendring + CSS (+1) → T6 docs (CLAUDE.md insights/live, ROADMAP-idéer strøket, VIDERE).

Forventet: ~699 → ~714.

---

## v1.12.0 «PWA» — branch `feat/pwa-v1120`

Filer: `public/manifest.webmanifest` (name «FPL-dashboard», short_name «FPL», lang nb, start_url `/`, scope `/`, display standalone, theme_color `#37003C`, background_color = mørk `--bg`, icons: `icon.svg` any, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — alle `?v=1`); `public/img/icon.svg` (håndskrevet: lilla `rect rx=20%` + grønn sirkel r=30 %), PNG-ene + `apple-touch-icon.png` (180, ugjennomsiktig, rette hjørner) **committet** (Dockerfile kopierer kun public/); `scripts/make-pwa-icons.mjs` (`npm run make-icons`, kun `node:zlib`: signatur, IHDR 8-bit RGBA, IDAT = deflate(rader med filterbyte 0), IEND, CRC via `zlib.crc32` (Node ≥ 22.2, verifisert) — geometri med 4× supersampling); `ICON_VERSION = '1'` i middleware.js + allow-list; `src/pwa/sw.js` med `__ASSET_VERSION__`-plassholder (eslint-override `globals.serviceworker`); `src/routes/pwa.js` med `createSwHandler({assetVersion, source})` → `GET /sw.js` (`application/javascript`, `no-store`, plassholder byttet) og `GET /offline` (`views/offline.ejs` «Du er frakoblet», no-store); layout.ejs head: `<meta name="fpl-asset-version">`, `theme-color`, `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-title`, `mobile-web-app-capable`.

Service worker: cache `fpl-<assetVersion>`; install precacher `/offline` + `skipWaiting`; activate sletter andre `fpl-*` + `clients.claim`; fetch: kun GET same-origin; `NEVER_CACHE = [/^\/api\//, /^\/kalender\.ics$/, /^\/health$/, /^\/sw\.js$/]` → rett til nett; `mode === 'navigate'` → nett først, `/offline` som fallback; `?v=` → cache først (put ved ok); alt annet → nett uten cache. Registrering i app.js Modul 13: `typeof navigator`-guard, `register('/sw.js?v=' + assetVersion, { updateViaCache: 'none' })` på `load` — ny URL per deploy → ny registrering → gamle cacher ryddet, uavhengig av Cloudflare.

Tester `test/pwa.test.js`: «manifest.webmanifest har navn, short_name, start_url, display standalone og FPL-farger», «manifest-ikonene finnes i public/img og har 192, 512 og maskable», «sw.js cacher aldri /api, /kalender.ics eller /health», «sw.js er nett-først for navigasjon og cache-først kun for ?v=», «sw.js bytter cache-navn med asset-versjonen og rydder gamle», «sw-ruta setter no-store og bytter inn asset-versjonen», «encodePng gir gyldig signatur, IHDR og CRC» (inflate IDAT, lengde = h·(1+4w)), «paintIcon fyller senterpikselen grønn og hjørnet gjennomsiktig»; views «layout.ejs lenker manifest, apple-touch-icon og asset-versjon-meta»; middleware «cacheControlFor gir immutable for ikonversjonen».

Tasks: T1 ikonskript + committede ikoner (+2) → T2 manifest + layout + ICON_VERSION (+3) → T3 sw.js + rute + offline-view (+4) → T4 registrering + CSS (+1) → T5 docs (CLAUDE.md `src/pwa/` + rute, DEPLOY.md «PWA: `npm run make-icons` + bump ICON_VERSION; SW/Cloudflare-notat», ROADMAP, VIDERE).

Forventet: ~714 → ~724.

---

## Sluttrydding (etter v1.12.0, egen docs-commit på main)

1. `docs/oppgaveliste.md` slettes (konsumert); ny **`docs/qa-chrome-prompt.md`** = én samlet prompt til Claude for Chrome (samme regler/rapportformat som Del A i dag), som dekker: STEG 1 ny CSS/JS ute (`?v=<hash>`), konsoll uten «Refused to» (CSP), hopp-lenke ved Tab, STEG 2 alle sider begge temaer × 390/1440, STEG 3 /lag chip-planlegger, STEG 4 /brief Lagsjekk + kalenderlenke (åpne `/kalender.ics`, sjekk `BEGIN:VCALENDAR`, ≥ 38 VEVENT), STEG 5 /overganger priskort (eller «ikke synlig ennå» første natt), STEG 6 /innsikt karriere + merkedager (låste grået), STEG 7 /live bonuskamp (kun i kampvindu — ellers «ikke testbart nå»), STEG 8 /spillere regresjon (faner, modal, duell, filter uten inline onsubmit), STEG 9 PWA (installer-prompt/«Legg til på hjemskjerm», manifest-URL, `/offline` i flymodus/DevTools offline), STEG 10 API: `/health`, `/api/brief.json dataAlder`, 404 norsk, 429 etter 31 POST (curl-instruks — leses, ikke utføres av Chrome), tastaturnavigasjon (Tab-rekkefølge, fokusring, Esc i modal). Rapport: statuslinje per steg + funnliste `[ALVORLIGHET] side | tema | bredde | forventet | faktisk` + skjermbilder + «hva så bra ut».
2. HANDOVER ≤ 200 linjer (roter til historikkfila), ROADMAP-tabellen (alle fem utført + datoer, idéer strøket), CLAUDE.md-kartet komplett, VIDERE.md, README (funksjonsliste + env-tabell), `docs/plan-sluttpakka-v183-v1120.md` → `docs/arkiv/`.
3. Sluttmelding til Marius: hva som er ute (versjoner, testtall, hash), prompten (sti + innhold), det som står igjen hos ham.

## Røyktest (hver release) + deploy-vindu

Scratchpad-`.env` (repoets `.env` leses UANSETT av `loadEnvFile()` — sett nøklene tomme i `process.env` først):
```
PORT=3100  FPL_TEAM_ID=5330646  ANTHROPIC_API_KEY=  DISCORD_WEBHOOK_URL=  DATA_DIR=<scratchpad>/data
```
```
node --env-file=<scratchpad>/.env src/server.js > smoke.log 2>&1 &
curl -s localhost:3100/health                          # ai:false discord:false teamId:true
for p in / /spillere /lag /overganger /liga /innsikt /brief /live /nyheter /api/brief.json /api/live.json /finnesikke; do …; done   # 200 ×11 + 404
grep -c 'AI-kall:' smoke.log                           # MÅ være 0
```
Per release i tillegg: **v1.8.3** `curl -sI / | grep -i 'content-security\|x-frame\|nosniff'`, nonce i header = nonce i `<script>`, 31 raske `POST /api/scenarier` → nr. 31 = 429, 40 kB kropp → 413 JSON. **v1.9.0** `/kalender.ics` har CRLF (`od -c`), ≥ 38 `BEGIN:VEVENT`, `/lag` inneholder «Chip-planlegger», `/brief` «Lagsjekk». **v1.10.0** loggen sier «Prisovervåking: første snapshot lagret», `price-state.json` finnes. **v1.11.0** `/innsikt` har «FPL-karrieren» og «Merkedager», `/api/live.json` har `bpsTop`. **v1.12.0** `/sw.js` no-store + ekte hash, `/manifest.webmanifest?v=1` → `application/manifest+json` immutable, `/offline` 200.

Deploy-vindu før hver push: lokal ukedag/klokke ikke torsdag 19–21; `curl -s https://fpl.marsk.no/api/live.json` → `anyLive:false` og `nextKickoff` ikke innen 30 min.

## Risikoer

| Risiko | Tiltak |
| --- | --- |
| CSP blokkerer tema-scriptet (blaff/feil tema) | nonce låst av views-test; prod-curl på header + `<script`-telling = 2 |
| Cloudflare injiserer script (Rocket Loader/Web Analytics) | DEPLOY.md-sjekkliste; funn → slå av CF-funksjonen |
| Nonce vs HTML-caching | HTML er `no-cache`/dynamisk; SW cacher aldri HTML utenom `/offline` (som bærer sin egen CSP-header) |
| Nye timere kjører i `npm test` | startes kun fra server.js (aldri importert i tester); `_reset` rydder intervaller |
| Timer dobbeltposter etter redeploy | samme markørmønster som briefen; snapshot/markør persistert |
| Picks for kommende runde ikke tilgjengelig før deadline | grunnlag = N−1 + bytter (fasit 7), sagt i tekst og kort |
| Kalender-klienter avviser folding | folding på oktetter, testet med æøå; CRLF låst |
| SW serverer gammel HTML | nett-først, `skipWaiting`+`claim`, ny `?v=` per deploy |
| Testtall-avvik mot estimatene | reelle tall noteres per task i HANDOVER (rød→grønn-bevis) |

## Verifisering (helhet)

- Etter hver release: `npm test` + `npm run lint` grønne på branch OG merget main (tall vises), røyktest 0 AI-kall, prod: `/health`, footer-versjon, `?v=<ny hash>` i HTML, nye ruter 200.
- Til slutt: `git status -sb` rent, `main` = `origin/main`, alle fem tagger pushet, HANDOVER ≤ 200 linjer, `docs/qa-chrome-prompt.md` klar — og Marius kjører den i Claude for Chrome mot prod.
