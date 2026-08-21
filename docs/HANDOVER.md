# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + ROADMAP.md, fortsett der «Status» sier.
> Versjonshistorikk og detaljer ligger i CHANGELOG.md, ROADMAP.md og git —
> denne filen holder kun nåtilstand, aktive økter og lærdommer.

**Sist oppdatert:** 2026-08-22 (økt 19, Opus 5: v1.2.3 UTFØRT på `fix/live-bonus` — ikke merget, ikke pushet)

## Status akkurat nå

- **v1.2.3 UTFØRT på branch `fix/live-bonus` — IKKE merget, IKKE pushet.**
  (økt 19, 2026-08-22, Opus 5, branchet fra `fix/lag-anbefalinger` @
  `c5b9748`.) Planen `docs/plan-live-bonus.md` fulgt punkt for punkt, ingen
  avvik. Begge C-funnene er fikset. **0 AI-kall.**
  - Commits: `5ce81de` (funn 2: `matchDone` + `publishedBonus`-helperen),
    `80f52fb` (funn 1: `bonusPub`/`bonusEst` atskilt, radfeltet
    `bonusPublished`), `8b242e3` (visningen), og siste commit på branchen
    (denne handover-oppdateringen).
  - **Baseline verifisert:** `npm test` **242/242** på fersk branch, akkurat
    som planen forutsa. Sluttilstand **250/250**, `npm run lint` exit 0 —
    planens mål på 250 truffet nøyaktig.
  - **TDD, rødt observert før grønt hver gang:** `publishedBonus` →
    `SyntaxError: … does not provide an export named 'publishedBonus'`, så
    244/244. Funn 2 → 245 tester, 244 pass, **1 fail** («kampen er
    ferdigspilt, ingen polling»), så 245/245. Funn 1 → 250 tester, 244 pass,
    **6 fail** (fem nye bonustester + kontrakttesten «payloaden har ingen
    døde felter»), så 250/250.
  - **Røyktest port 3010 med tomme nøkler** (scratchpad-`.env`, teknikken
    fra driftslærdommene): `/health` =
    `{"status":"ok","features":{"ai":false,"aiModel":null,"discord":false,`
    `"teamId":true,"leagues":0}}`, alle ruter 200, ukjent sti 404,
    serverloggen inneholder kun lyttelinja — **0 AI-kall**.
  - **Røyktesten traff nøyaktig scenarioet fra begge funnene, mot ekte
    prod-data ~17 t etter ARS–COV.** Rå FPL-fixture: `finished: false`,
    `finished_provisional: true`, `minutes: 90` — altså sto feilen fortsatt
    på i kilden. Vår payload ga likevel `anyLive: false` og
    `matches[0].finished: true`, og /live-HTML-en sa «Ingen kamper pågår
    akkurat nå» uten pulseprikk. Med den gamle koden ville siden ha stått på
    «Kamper pågår» og pollet videre. Ødegaard — samme spiller som i den
    opprinnelige observasjonen — kom ut som
    `{"points":11,"bonusEst":0,"bonusPublished":3,"effective":11}`: bonusen
    vises, og «Effektivt» teller den ikke to ganger. Kolonneoverskriften er
    «Bonus».
  - **Utestående:** manuell verifisering av selve rendringen under neste
    kampvindu (bonuscellen fylles klientside og er utenfor testharnessen —
    `test/app-client.test.js` kjører skriptet i en vm der DOM-elementene er
    `null`). Stopp-testen fra sjekkpunkt C kan først bestås etter deploy.
    Begge står som åpne ROADMAP-punkter.
  - **Merge-rekkefølge (krever klarsignal fra Marius):**
    `fix/sanitize-brief` → `fix/lag-anbefalinger` → `main` (v1.2.2), deretter
    `fix/live-bonus` → `main` (v1.2.3). Aldri deploy torsdag 19–21.

- **Sjekkpunkt C: polling GRØNT, ett funn på bonuskolonnen.** (økt 17,
  2026-08-21 ~22:10, observert av Marius via Claude in Chrome på prod under
  Arsenal–Coventry.) Full analyse med rådata: `docs/sjekkpunkt-c-live.md`.
  - Polling: tre kall til `/api/live.json`, nøyaktig 60 s mellom hvert, ingen
    duplikater. Cachen tar støyten (5 raske curl → identisk payload, ~90 ms,
    `cf-cache-status: DYNAMIC`). Statustekst, pulseprikk og kampstillinger
    riktige, ingen konsollfeil. **Pollingintervall og fetch-logikk skal ikke
    røres.**
  - Gjenstår av C: stopp-testen når `anyLive` blir false etter siste
    kampslutt (forventning: null nye `live.json`-kall).
  - **Funn:** bonuskolonnen står tom hele kampen. Rotårsak verifisert mot
    FPL-API-et: FPL publiserer bonus provisorisk MENS kampen pågår, så
    `hasConfirmedBonus()` (`analysis.js:371`) slår til og `live.js:51`
    hopper over kampen — `estimateBonus()` kjører aldri. Bonusen ligger
    allerede i `total_points` (FPLs egen `explain` for Ødegaard: bonus +3 av
    11 poeng), så vakten mot dobbelttelling er riktig; det er kolonnen som er
    død. Løsning besluttet, se ROADMAP v1.2.3. **Ikke implementert** — Marius
    stoppet utførelsen og ba om at funnene ble skrevet ned først.
    **Plan GODKJENT av Marius (økt 18): `docs/plan-live-bonus.md`** —
    branch `fix/live-bonus` (fra `fix/lag-anbefalinger`), 0 AI-kall.
    UTVIDET 22. aug etter stopp-testen: FPL setter `finished` først ved
    rundeprosesseringen (`finished_provisional` settes ved fløyta), så
    /live sa «Kamper pågår» og pollet hele natten. Begge C-funnene fikses
    i samme plan: 8 nye tester, 242 → 250. Utførelsesprompt:
    `docs/neste-okt-prompt-live-bonus-utforelse.md`. Stopp-testen kan
    først bestås etter deploy — åpent punkt under sjekkpunkt D.
  - Avklart uten funn: Tzolis 5→4 poeng (vi leser `total_points` rått hvert
    kall, ingen akkumulering — FPL reviderte selv) og van Ewijk 51'/0 poeng
    (appearance +1, goals_conceded −1 = 0; korrekt).

- **B-1…B-3 riktige anbefalinger på /lag: UTFØRT på branch
  `fix/lag-anbefalinger` — IKKE merget, IKKE pushet.** (økt 17,
  2026-08-21, Opus 5. Planen `docs/plan-lag-anbefalinger.md` fulgt; ett
  avvik lagt fram og avklart, se under.)
  - Commits: `6ede6eb` (B-1: ep_next-fallback + tomtilstand + helperen
    `nextOpponents`), `8d1ed23` (B-2: runde/deadline/kaptein/motstandere i
    rådgiver-prompten + anti-spekulasjon om gratis bytter), `883909b`
    (B-3: «Anbefalinger for Runde N» + kriterie-/tomtilstand i viewet),
    og siste commit på branchen (røyktestbevis + denne oppdateringen).
  - Rørt: `src/services/analysis.js`, `src/services/prompts.js`,
    `src/routes/api.js`, `src/routes/team.js`, `views/team.ejs`, tester og
    docs. IKKE rørt: `public/app.js`, `notify.js`, `brief.js`,
    `gameUpdating`/banner i `fplClient.js` — alt sjekkpunkt C/D observerer
    står urørt.
  - **Baseline-avvik (avklart):** planen anslo `npm test` = 228; faktisk
    målt **231/231 grønt**. Årsak: commit `0e507a4` la til 2 tester etter
    at anslaget ble skrevet, pluss 1 i historisk bokføring (HANDOVER-linjene
    om P3-4 sier 228, linja om `0e507a4` sier 229). Diffen mot
    `fix/sanitize-brief` var kun docs. Marius' valg: kjør videre med 231.
  - **Bevis, TDD-rødt observert før grønt hver gang:** B-1 → 235 tester,
    231 pass, **4 fail**; helper → import-feil (ingen `nextOpponents`);
    B-2 → 240 tester, 237 pass, **3 fail**; B-3 → 242 tester, 240 pass,
    **2 fail**. Sluttilstand `npm test` **242/242**, `npm run lint` exit 0.
    (242, ikke planens 241: `nextOpponents` fikk 2 tester der planen
    regnet 1 — hjemme/borte + tomt lag, og dobbeltrunde.)
  - **Røyktest port 3010 med tomme nøkler** (scratchpad-`.env`):
    `/health` = `{"status":"ok","features":{"ai":false,"aiModel":null,`
    `"discord":false,"teamId":true,"leagues":0}}`, alle 11 ruter 200,
    ukjent sti 404, **0 AI-kall**. /lag viste «Anbefalinger for Runde 2»
    nøyaktig én gang, ingen «undefined» i HTML-en, og kapteinsboksen kjørte
    i **form-modus** (Calafiori form 5.0 øverst) — ep_next-fallbacken er
    korrekt inaktiv nå som GW1-kampene er spilt. Fallbacken er derfor kun
    verifisert av testene, ikke observert i prod-data.
  - **Neste steg — krever klarsignal fra Marius:** 1 AI-kall («Spør AI om
    råd» lokalt) for ende-til-ende-verifisering ETTER sjekkpunkt D, så
    release v1.2.2 og merge i rekkefølgen `fix/sanitize-brief` →
    `fix/lag-anbefalinger` → `main`.

- **B-1…B-3 riktige anbefalinger på /lag: plan GODKJENT, klar for Opus 5.**
  (økt 16, 2026-08-21, Fable i plan mode.) Funnene kom fra sjekkpunkt B
  (fredag ~20:20): kapteinslista på /lag er pick-rekkefølge når alle har form
  0.0 (`captainSuggestions` mangler garden naboene har), AI-rådgiveren mangler
  runde/kaptein/kamper-kontekst, og siden sier «Runde 1» mens anbefalingene
  gjelder Runde 2. Plan: `docs/plan-lag-anbefalinger.md` — ep_next-fallback
  med merket kriterium + tomtilstand, rikere AI-prompt (runde, deadline,
  kaptein, motstander/FDR; gratis bytter utelates bevisst — `my-team/` krever
  auth, verifisert 403), «Anbefalinger for Runde N» én gang i viewet.
  10 nye tester, 228 → 238 (faktisk baseline var 231 → mål 241, se over).
  Utførelsen koster **1 AI-kall, først ETTER
  sjekkpunkt D**. Utførelsesprompt:
  `docs/neste-okt-prompt-lag-anbefalinger-utforelse.md`.
  **Beslutninger tatt av Marius 21. aug (IKKE re-spør):** ep_next-fallback;
  garde «alle scorer 0»; gratis bytter utelates + anti-spekulasjonsinstruks;
  rundetekst én gang øverst; release som v1.2.2; branch
  `fix/lag-anbefalinger` ut fra `fix/sanitize-brief` (denne HANDOVER-linjen
  er sannheten; merge-rekkefølge etter D: sanitize-brief → lag-anbefalinger
  → main). `brief.js`/`globalCaptains` røres IKKE (står som ROADMAP-kandidat).

- **P3-4 `sanitizeBriefText`-robusthet: UTFØRT på branch `fix/sanitize-brief`
  — IKKE merget, IKKE pushet.** (økt 14, Opus 5. Planen fulgt uten avvik.)
  - Commits: `28ab239` (forkortelses-/klokkeslett-maskering i
    setningssplittingen + 5 tester + CHANGELOG), `de2616d` (`TEAM_ALIASES` +
    ordgrense/genitiv-matching + 5 tester + CHANGELOG/ROADMAP),
    og siste commit på branchen (handover + røyktestbevis, denne).
  - Kun `src/services/prompts.js`, `test/prompts.test.js` og docs er rørt.
    Ingen oppførsel som sjekkpunkt A–D observerer er endret (ingen nettverk,
    ingen timere, ingen AI-prompt-endring).
  - Bevis: TDD-rødt observert først begge tasks — Task 1: 223 tester,
    219 pass, **4 fail** (nøyaktig de fire splitting-testene); Task 2:
    228 tester, 226 pass, **2 fail** (de to alias-testene). Deretter
    `npm test` **228/228** og `npm run lint` exit 0 etter hver commit.
    Utgangspunkt på `main` var 218/218.
  - Røyktest port 3010 med tomme nøkler (scratchpad-`.env`):
    `/health` = `{"status":"ok","features":{"ai":false,"aiModel":null,`
    `"discord":false,"teamId":true,"leagues":0}}` (`leagues:0` fordi
    scratchpad-env-en ikke setter `LEAGUE_IDS` — `/liga` svarte likevel 200),
    alle 11 ruter 200, ukjent sti 404, **0 AI-kall** i serverloggen.
  - **Neste steg — krever klarsignal fra Marius:** merge til `main` etter
    sjekkpunkt D (søndag/mandag), evt. som v1.2.2. Push av `main` +
    tag `v1.2.1` gjenstår fortsatt separat (se punktet under).
- **P3-4-planen (godkjent i økt 13, Fable i plan mode):**
  `docs/plan-sanitize-brief.md` —
  to delfunksjoner med TDD (forkortelses-maskering i setningssplittingen,
  lagnavn-alias + ordgrense/genitiv-matching), 10 nye tester, 218 → 228.
  Utførelsesprompt til Opus 5: `docs/neste-okt-prompt-sanitize-brief-utforelse.md`.
  Branch `fix/sanitize-brief`, ingen push, ingen merge før sjekkpunkt D.
  Verifisert i planøkten mot GW1-snapshotet: FPLs `teams.name` er selv
  kortform for flere klubber («Spurs», «Man Utd», «Nott'm Forest») og lang
  form for andre («Coventry City», «Hull City», «Ipswich Town») —
  alias-tabellen i planen dekker begge retninger; ROADMAP-punktets
  «kortnavn»-påstand korrigeres som del av utførelsen.
- **v1.2.0 «Overganger» er i prod** (2026-08-20 ~14:40, tag pushet).
  Ny side `/overganger`: historisk hva hvis-analyse av egne transfers.
  Verifisert i prod: alle 11 ruter 200, 404 OK, footer v1.2.0, tomtilstanden
  «Ingen overganger registrert ennå» vises (korrekt før sesongstart),
  `/health` = `ai:true, discord:true, teamId:true, leagues:1`.
  Lokalt: `npm test` 212/212, `npm run lint` 0.
  Plan med alle beslutninger og avvik: `docs/plan-hva-hvis-transfers.md`.
- **AKTIV økt 8: sesongstart-verifisering (M4)** — sjekkpunkter under.
  GW1-deadline fredag 21. august 19:30. **Ikke rør oppførsel den observerer
  (live-polling, auto-brief, banner) uten avtale. Aldri push/deploy torsdag
  19:00–21:00 (auto-brief ~19:30).**
- Prod kjører v1.2.0, ikke v1.1.3 som sjekkpunktplanen antok — ingen
  observert oppførsel er endret (getLive, notify, brief, banner urørt);
  synlig forskjell er footer-versjonen og det nye nav-punktet «Overganger».
- **v1.2.1 cache-backoff (P3-2) er MERGET TIL `main` LOKALT — IKKE PUSHET.**
  (økt 12, Opus 5. Marius valgte «merge + release + tag lokalt, ingen push».)
  `main` ligger foran `origin/main` (upushet); prod kjører fortsatt v1.2.0.
  Plan: `docs/plan-cache-backoff.md`
  (fulgt uten avvik). Innhold: 30 s backoff per nøkkel i `src/services/cache.js`
  etter mislykket bakgrunnsrevalidering — stale verdi serveres fortsatt
  umiddelbart, suksess nullstiller backoffen, `clear()` tømmer tilstanden.
  Kun cache.js + tester + docs er rørt; ingen observert oppførsel i
  sesongstart-verifiseringen er endret.
  - Commits: `a1f7a5d` (impl + 6 tester + CHANGELOG/ROADMAP/CLAUDE.md),
    `c302cd1` (handover + røyktestbevis), `7ccb754` (`chore: release v1.2.1`
    — package.json/lock 1.2.0 → 1.2.1, CHANGELOG `[1.2.1] - 2026-08-20`),
    `78d438e` (merge --no-ff til `main`). Tag **`v1.2.1`** (annotert) peker
    på `78d438e`. Branchen `fix/cache-backoff` står igjen lokalt.
  - Bevis: TDD-rødt observert først (218 tester, 216 pass, 2 fail — nøyaktig
    de to planen forutså), deretter `npm test` **218/218** og
    `npm run lint` exit 0. Røyktest på port 3010 med tomme nøkler:
    `/health` = `ai:false, discord:false`, alle 11 ruter 200, ukjent sti 404,
    0 AI-kall i serverloggen.
  - **Neste steg — kun push, krever klarsignal fra Marius:** push FØRST etter
    sjekkpunkt D (søndag/mandag), og aldri torsdag 19:00–21:00. Da:
    `git push origin main` og `git push origin v1.2.1`. Coolify deployer
    automatisk; verifiser prod med `/health` (`ai:true, discord:true`),
    11 ruter 200 og footer v1.2.1.
  - Alle 218 tester + lint 0 er verifisert på `main` etter merge.

## Sjekkpunkter for økt 8 (Marius pinger økten)

Plan: `C:\Users\mariu\.claude\plans\oppdrag-verifiser-sesongstarten-wise-puffin.md`

| Sjekkpunkt | Når | Hva |
| --- | --- | --- |
| 0 (FERDIG) | torsdag natt | prep + nullpunkt-snapshot (alle sider 200, tomtilstander bekreftet, data-brief-fasit i scratchpad `brief-foer-deadline.json`: «Runde 1», deadline «fredag 21. august kl. 19:30», kapteiner Raya/Gabriel/Calafiori) |
| A | torsdag ~19:45 | etterkontroll auto-brief: Discord-melding + Coolify-logg mot `/api/brief.json` |
| B | fredag ~20:30+ | tomtilstand → ekte data alle sider; **Marius klikker «Spør AI om råd» ÉN gang** (budsjettkall 1) |
| C | lørdag under kampene | live-polling ≤1 kall/60 s, stopp ved `anyLive=false`, cache-bevis |
| D | søndag/mandag | kostnadskontroll (`AI-kall:`-linjer), skjermbilder, mobilsjekk, v1.2.x-kandidater, avslutning |

**AI-kall-telleliste (budsjett ~3 utover automatiske):** brukt **1 av ~3**
(sjekkpunkt B, fredag 21. aug: Marius klikket «Spør AI om råd» én gang).
Planlagt: 1 kall til for B-2-verifiseringen ETTER sjekkpunkt D → blir 2 av ~3.
(P3-4-utførelsen i økt 14 gjorde **0 AI-kall** — tester bruker
hardkodet tekst, og røyktesten kjørte med tomme nøkler, `/health` `ai:false`.)
NB: 2 lokale AI-kall skjedde ved et uhell i økt 10s røyktest (se lærdommer) —
de vises i Anthropic-forbruket, IKKE i Coolify-loggen.

Nyanse for sjekkpunkt B: `transfers_*_event` kan legitimt være 0 hele GW1 —
tomtilstand på «Mest kjøpt/solgt» er da KORREKT. `topForm` krever spilte
minutter. Kveldens auto-brief er også første ekte test av `sanitizeBriefText`
og `filterSummaryPoints` mot en fersk AI-generering.

## «Overganger» (v1.2.0) — gjenstående oppfølging

Etter GW2, når første ekte transfer finnes (sjekkliste i planfilen):

1. Verifiser feltnavnene i `entry/5330646/transfers/` mot antakelsene
   (`element_in`, `element_out`, `event`, `time`, `event_transfers_cost`).
   Avvik → `fix:`-commit med oppdaterte fixtures.
2. Se `/overganger` med ekte data; mobil 390 px (scroll kun i `.table-scroll`).

## Versjonshistorikk (detaljer: CHANGELOG.md + git-tags)

- v0.1.0–v1.0.0: skjelett → spillere → lag → liga → brief → live → nyheter/AI
  → AI-brief/rådgiver → auto-brief → polish. Alle tagget, alt i prod.
- v1.0.1: AI + Discord i drift (anti-spam-guard, usage-logging, nøkler i Coolify).
- v1.1.0: UI-makeover «Matchday» + view-render-tester.
- v1.1.1/v1.1.2: QA-rettelser (asset-versjonering med innholdshash, sticky
  tabellhoder, tomtilstander, norske oversettelser, mobilmeny).
- v1.1.3: kvalitetspass, 29 funn rettet (se ROADMAP for lista).
- v1.2.0: «Overganger» — hva hvis-analyse av egne transfers.

## Driftslærdommer (ikke glem disse)

- **Lokal røyktest med prod-nøkler i repoets `.env`:** `config.js` kjører
  `process.loadEnvFile()` som leser repoets `.env` UANSETT `--env-file`.
  Riktig teknikk: sett `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` som
  TOMME i en scratchpad-.env — `--env-file` setter dem først, `loadEnvFile`
  overskriver ikke. Verifiser med `/health` → `ai:false, discord:false`.
  (Lært da økt 10s første røyktestkjøring gjorde 2 ekte AI-kall og armerte
  Discord-scheduleren; ingen melding gikk ut.)
- **Aldri push/deploy torsdag 19:00–21:00** — auto-briefen sendes ~19:30.
- **`/health` først** ved «virker lokalt, ikke i prod» — viser hvilke
  valgfrie funksjoner som er på, aldri verdiene.
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
- «Overganger» (økt 10): egen side på `/overganger` (ikke /bytter, ikke
  seksjon på /lag); uten AI-kommentar i v1.
- Økter stoppes ved ~95 % usage → oppdater denne filen grundig først.
- Alle beskjeder fra Marius loggføres i loggen nederst.
- ROADMAP/CHANGELOG/CLAUDE.md/HANDOVER oppdateres løpende, i samme commit
  som endringen.

## Miljø

- Windows 11, PowerShell. Node v24.11.1, npm 11.6.2, git 2.45.1.
- Arbeidsmappe: `c:\Users\mariu\Documents\Claude Code\FPL`.
- GitHub: privat repo `maskj2560/fpl-dashboard`. Coolify på dash.marsk.no,
  appen på https://fpl.marsk.no (bak Cloudflare).
- `FPL_TEAM_ID=5330646` («Marius Super Team») — satt i `.env` lokalt og i
  Coolify sammen med `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL`.

## Åpne punkter

- **B-1…B-3 er ferdig kodet** (branch `fix/lag-anbefalinger`, se Status).
  Gjenstår: 1 AI-kall for ende-til-ende-verifisering etter sjekkpunkt D, så
  release v1.2.2 og merge `fix/sanitize-brief` → `fix/lag-anbefalinger` →
  `main` — alt på klarsignal fra Marius.
- **P3-4 er ferdig kodet** (branch `fix/sanitize-brief`, se Status).
  Gjenstår: merge etter sjekkpunkt D på klarsignal fra Marius — samme
  klarsignal som push av `main` + tag `v1.2.1`.
- M5: skjermbilder til README + mobilbekreftelse (krever Marius).
- v1.2.x-kandidater i ROADMAP (P1-5b + P3-1…P3-5): fikses kun etter avtale.
  P3-2 har kjøreklar prompt (se Status). P3-3/P3-5 krever avklaring med
  Marius. P1-5b er en arkitekturbeslutning (persistens).
- Valgfritt i Cloudflare: Browser Cache TTL → «Respect Existing Headers».

## Logg over brukerbeskjeder (alle økter — føres løpende)

- 2026-08-22 (økt 19): ga Opus 5 utførelsesoppdraget for v1.2.3 med
  `docs/plan-live-bonus.md` som fasit — «følg planen NØYAKTIG, ikke re-spør,
  ikke re-planlegg», Task 0 er alt gjort av Fable (verifiser, ikke committ på
  nytt), TDD med rødt før grønt (baseline 242 → mål 250), 0 AI-kall, aldri
  push, ingen merge, aldri deploy torsdag 19–21, ikke rør
  polling-tilstandsmaskinen i `public/app.js`, og «avviker virkeligheten fra
  planens antakelser: stopp og legg det fram». Handling: hele planen utført
  på `fix/live-bonus` i tre kodecommits, 250/250, lint 0, røyktest med tomme
  nøkler (`ai:false`). Ingen avvik fra planen, ingen push, ingen merge.
- 2026-08-22 (økt 18, natt/morgen): limte inn stopp-test-rapporten fra
  Claude in Chrome — testen lot seg ikke kjøre, /live sa «Kamper pågår» i
  66+ min etter kampslutt (fire friske sidelaster, frosset innhold).
  Handling: rotårsak verifisert mot FPL-API-et (finished_provisional vs
  finished), cache-hypotesen avkreftet. Marius valgte «Utvid v1.2.3-planen»
  — plan, prompt, ROADMAP og sjekkpunkt-C-dokumentet oppdatert og
  committet. dataAlder bevisst utsatt (P3-2-rest). Ingen kode endret.
- 2026-08-21 (økt 17, kveld): limte inn sjekkpunkt C-observasjonene fra
  Claude in Chrome, avbrøt påbegynt implementering med «jeg ønsker bare at du
  oppdaterer all denne informasjonen i fil eller noe». Handling: alt skrevet
  til `docs/sjekkpunkt-c-live.md` + ROADMAP/HANDOVER, committet `30a8dab`.
  Ingen kode endret.
- 2026-08-21 (økt 18): «les gjennom hele chatten og lag en solid plan …
  du skal planlegge. opus skal gjennomføre» (byttet til Fable). Handling:
  plan for v1.2.3 skrevet og godkjent (`docs/plan-live-bonus.md`),
  utførelsesprompt levert, alt committet lokalt. Ingen push, 0 AI-kall.
- 2026-08-21 (økt 17): kjøreprompt «Oppdrag (Opus 5): utfør planen for riktige
  anbefalinger på /lag (B-1…B-3)». Handling: baseline målt til 231/231 (planen
  sa 228) → stoppet og la fram avviket med årsak i stedet for å improvisere.
  Marius svarte «Kjør videre, mål 241» og ba samtidig om at tallet rettes i
  plan- og handover-dokumentene. Utførelsen fortsetter etter planen.
- 2026-08-21 (økt 16, kveld): kjøreprompt «Oppdrag (Fable, plan mode): riktige
  anbefalinger på /lag ved sesongstart (B-1…B-3)» — planlegg, Opus 5 utfører.
  Handling: fakta re-verifisert mot kode + engangs GET-kall (`ep_next` > 0 for
  502/600 spillere ved sesongstart; `my-team/` gir 403 uten auth; fromGw = 2),
  seks beslutninger stilt og besvart — Marius valgte anbefalingen på alle seks
  (se Status). Plan godkjent og lagret som `docs/plan-lag-anbefalinger.md`,
  utførelsesprompt skrevet, oppdragsprompten arkivert til `docs/arkiv/`, alt
  committet lokalt på `fix/lag-anbefalinger` (base `fix/sanitize-brief`).
  Ingen push, **0 AI-kall i planøkten**.
- 2026-08-20 (økt 14, ~19:50): limte inn Coolify-loggen + «jeg er ikke hjemme
  … kan du sjekke det opp eller kanskje jeg kan sjekke fra github?» Handling:
  **sjekkpunkt A er LUKKET.** `/api/brief.json` hentet fra prod med curl
  (offentlig URL, ruten kaller kun `assembleBrief` → 0 AI-kall).
  GitHub kan ikke brukes til dette — det er live prod-data, og repoet er
  dessuten ikke pushet siden v1.2.0.
  Fasit mot briefen: `fixturesBeforeDeadline: []` ✅, `captains` = Raya 36,3 /
  Gabriel 29,6 / Calafiori 32,6, alle form 0.0 ✅, `injuries` = 1 (Bruno G.).
  Avvik funnet: briefen påsto «alle stiller friske» (feil), og skrev
  Calafiori 32,3 % mot dataenes 32,6 % — begge ført i ROADMAP.
  Loggen viste INGEN «AI-brief: fjernet …»-linje: gammel `sanitizeBriefText`
  kuttet ingenting, så fixturen er ubeskåret modelltekst.
  AI-kall torsdag: 3 × news-summary + 2 × ai-brief-gw1 (ett fra et
  /brief-besøk, ett fra auto-briefen > 1 t senere — forventet).
  Fikset underveis: «Unknown»-skadetypen, branch `fix/news-unknown`
  (`d88b913`, ut fra `main`), 218 → 219 tester, rødt observert først.

- 2026-08-20 (økt 14, ~19:35): limte inn hele Discord-meldingen fra
  auto-briefen + «hva gjøres videre?». Handling: sjekkpunkt A påbegynt.
  Briefen kom presis 19:30 — auto-brief-scheduleren virker i prod.
  Teksten er lagret uendret som `test/fixtures/brief-gw1.js` med to
  regresjonstester (229 → 231, grønt, lint 0, commit `0e507a4`).
  Bekreftet fra ekte tekst: P3-3-tidsfaktaene følges («samtlige kamper
  spilles etter at deadline har passert»), norske uttrykk brukes («holdt
  nullen», «runde»), og ny `sanitizeBriefText` lar teksten stå uendret.
  Nytt funn ført i ROADMAP: kapteinslista er vilkårlig ved sesongstart
  (form 0.0 → score 0 for alle). GJENSTÅR for Marius: Coolify-logg og
  `/api/brief.json` — se «Sjekkpunkt A».

- 2026-08-20 (økt 14, ~16:00): «kan du sørge for at discord webhooken sender
  en @everyone når den sender brief?» Handling: gjort på EGEN branch
  `feat/discord-everyone` (ut fra `main`, commit `75e1f96`) — holdes atskilt
  fra P3-4 så de kan merges uavhengig. `@everyone` legges på i
  `postToDiscord`, ikke i brief-teksten, så kanalen pinges nøyaktig én gang
  selv når briefen deles i flere meldinger. `allowed_mentions.parse` er satt
  til `['everyone']`, som samtidig slår av bruker-/rollementions fra
  AI-teksten. TDD: 228 → 231 tester, 3 rødt observert først, deretter
  231/231 + lint 0. Ikke pushet — kveldens brief (~19:30) går som før, uten
  ping. Får effekt først ved deploy etter sjekkpunkt D.
- 2026-08-20 (økt 14, etter P3-4): «går det fint om jeg nå venter til 1930
  med den briefen (i dag er torsdag). også fikser vi videre derfra. steg A».
  Handling: bekreftet — auto-briefen postes ~19:30 torsdag (24 t før
  GW1-deadline fredag 19:30), sjekkpunkt A gjøres ~19:45. Ingenting fra
  P3-4-økten påvirker den: branchen er ikke pushet, prod kjører v1.2.0 med
  den GAMLE `sanitizeBriefText`. Kveldens brief er derfor en gratis ekte test
  av dagens versjon — teksten bør tas vare på som fixture til P3-4/P3-5.
  Push-forbudet torsdag 19–21 er uansett ikke i veien (ingenting skal pushes).
- 2026-08-20 (økt 14): kjøreprompt «Oppdrag (Opus 5): utfør
  sanitize-brief-planen (P3-4)» — les HANDOVER (ikke forstyrr den aktive
  sesongstart-verifiseringen A–D), CLAUDE.md og `docs/plan-sanitize-brief.md`;
  følg planen nøyaktig task for task, ingen re-planlegging, ingen subagenter;
  branch `fix/sanitize-brief`, aldri push, ikke merge før sjekkpunkt D +
  klarsignal; ikke rør `main`s upushede commits/tag `v1.2.1`; ingen AI-kall;
  TDD med rødt observert først; røyktest med tomme nøkler på PORT=3010 der
  `/health` sjekkes først; bevis (kommando + output) for hver verifisering;
  loggføring; tiltale Marius. Handling: utført som beskrevet — tre commits
  (`28ab239`, `de2616d` + denne docs-commiten), 218 → 228 tester, lint 0,
  røyktest OK, 0 AI-kall, ingen push, ingen merge. Ingen avvik fra planen.
- 2026-08-20 (økt 13): kjøreprompt «Oppdrag (Fable, plan mode): robust
  sanitizeBriefText (P3-4)» — planlegg i plan mode, Opus 5 utfører; harde
  regler: branch `fix/sanitize-brief`, aldri push, ikke merge før sjekkpunkt
  D, aldri deploy torsdag 19–21, ingen AI-kall, TDD/node:test uten nettverk
  og ekte timere, ingen nye avhengigheter, bevis for alt, loggføring,
  tiltale Marius. Handling: plan godkjent i plan mode og lagret som
  `docs/plan-sanitize-brief.md`; Opus 5-prompt skrevet til
  `docs/neste-okt-prompt-sanitize-brief-utforelse.md` (+ limt i chatten);
  HANDOVER oppdatert; committet lokalt på `main` uten push. 0 AI-kall.
- 2026-08-20 (økt 12, ~15:20): kjøreprompt «Oppdrag (Opus 5): utfør
  cache-backoff-planen (P3-2)» — følg planen nøyaktig, branch
  `fix/cache-backoff`, TDD med rødt observert først, ingen push, ingen merge
  før sjekkpunkt D, røyktest med tomme nøkler, bevis for hver verifisering.
  Handling: utført som beskrevet, to commits lokalt (`a1f7a5d` + denne
  docs-commiten),
  212 → 218 tester, lint 0, røyktest OK. Ingen avvik fra planen.
- 2026-08-20 (økt 12, ~15:15): «Lag en ny prompt til claude med alle
  eksisterende regler … skal ikke stå i veien for sjekkpunktene A B C D, be
  fable også lage en prompt som skal sendes til opus 5». Handling:
  `docs/neste-okt-prompt-sanitize-brief.md` skrevet — planleggingsoppdrag til
  Fable for **P3-4 `sanitizeBriefText`-robusthet**, valgt fordi det er en ren
  tekstfunksjon (null nettverk, null AI-kall, rører ikke live-polling,
  auto-brief-scheduler eller banner). Prompten krever at Fable leverer en kort
  Opus 5-utførelsesprompt.
- 2026-08-20 (økt 12, ~15:05): «Og gjør alt i neste steg» → varslet om at
  push auto-deployer prod midt i sesongstart-verifiseringen, og at hans egen
  regel sier merge først etter sjekkpunkt D. Valgte **«merge + release + tag
  lokalt, ingen push»**. Handling: `chore: release v1.2.1` (7ccb754), merge
  `--no-ff` til `main` (78d438e), annotert tag `v1.2.1`. Push gjenstår og
  krever eget klarsignal.
- 2026-08-20 (økt 11, ~14:55): kjøreprompt for planlegging av cache-backoff
  (P3-2) gitt til Fable i plan mode; underveis: «Så nå lager du en prompt jeg
  kan sende til Opus? For å gjennomføre planen?» → bekreftet. Handling: plan
  godkjent og lagret som `docs/plan-cache-backoff.md`, kort Opus 5-prompt i
  `docs/neste-okt-prompt-cache-backoff-utforelse.md`, HANDOVER oppdatert,
  committet lokalt uten push.
- 2026-08-20 (økt 10, ~15:00): «Gå gjennom docs-filen, rydd — ikke poeng med
  masse historikk. Finn en oppgave som kan gjøres akkurat nå og lag en
  kopierbar prompt til en ny AI-agent.» Handling: HANDOVER.md ryddet (denne
  versjonen), P3-2 cache-backoff valgt som trygg oppgave under
  verifiseringen, prompt skrevet til `docs/neste-okt-prompt-cache-backoff.md`.
- 2026-08-20 (økt 10, ~15:05): «Prompten skal be Fable lage en kort
  overleveringsprompt når planen er ferdig — Fable planlegger, Opus 5
  gjennomfører.» Handling: prompten omskrevet som planleggingsoppdrag med
  leveransekrav om kort Opus 5-prompt.
- 2026-08-20 (økt 10, ~15:10): «Lag en oversiktlig, ikke-teknisk fil bare
  til meg om hva som skal implementeres videre.» Handling: `docs/VIDERE.md`
  opprettet (holdes oppdatert ved milepæler).
- 2026-08-20 (økt 10, ~14:40): «Hvor mye av planen er gjennomført?» Handling:
  statusrapport — alle 6 tasks ferdige, kun «Etter GW2»-sjekklisten igjen.
- 2026-08-20 (økt 10, ~14:33): «Jeg er klar for å merge» + spørsmål om
  skjemaverifiseringen. Handling: forklart; release v1.2.0 kuttet, merget
  `--no-ff`, pushet, prod verifisert ~14:40, tag pushet.
- 2026-08-20 (økt 10): kjøreprompt for hva hvis-analysen + plan godkjent +
  to valg (side «Overganger», uten AI). Handling: bygget med TDD på branch,
  212/212, røyktest OK. Uhell: 2 lokale AI-kall pga. `loadEnvFile()` — se
  lærdommer.
- 2026-08-20 (økt 9): kjøreprompt kvalitetspass v1.1.3 (29 funn) → rettet på
  branch; «Okay du kan pushe til main» → v1.1.3 i prod ~03:00, tag pushet;
  bestilte kjøreprompt for hva hvis-analysen (skrevet med API-verifisert
  datagrunnlag).
- 2026-08-20 (økt 8): kjøreprompt sesongstart-verifisering → plan godkjent,
  sjekkpunkt 0 utført; valg «Marius pinger økten per sjekkpunkt»; avklart at
  Discord-meldingen «kl 22» var onsdagens tvungne røyktest; Coolify-logg
  bekreftet scheduler armert; «noe å jobbe med i mellomtiden?» → valg
  «Kvalitetspass» → 29 funn → «lag detaljert prompt til Opus 5» →
  `docs/neste-okt-prompt-kvalitetspass.md`; «vent med A/B-greiene».
- 2026-08-20 (økt 7): deploy-kjøreprompt v1.1.1 utført; Cloudflare-purge
  bekreftet av Marius (via Claude in Chrome); retteordre fra visuell QA →
  `fix/qa-v1.1.2`; «push + lag god handover med prompt til ny sesjon» →
  v1.1.2 i prod, sesongstart-prompt skrevet.
- 2026-08-19 (økt 5): QA-rapport v1.1.0 som oppdrag → plan godkjent;
  «presenter planen som prompt til ny kodeagent» →
  `docs/neste-okt-prompt-qa-v111.md`; avklaringer: P1-5 strategi B,
  Playwright OK i scratchpad (aldri i repoet); «stopp her, gjør det du må
  før jeg sender prompten» → committet lokalt uten push.
- 2026-08-19 (økt 4): «Utfør HELE implementeringsplanen, ikke re-planlegg,
  ikke subagenter» → utført; tiltale-runden endte på **Marius** (permanent
  minne); `.env` med API-nøkkel → pre-flight grønn; FPL team-ID funnet og
  satt (5330646); webhook-URL gitt i klartekst (Marius varslet om at den kan
  regenereres); Discord-melding bekreftet mottatt; env-variabler lagt i
  Coolify → `/health` ai:true/discord:true.
- 2026-08-19 (økt 2–3): «lag prompt til Fable for planlegging — fullføre alt
  + full UI-makeover, clean» → `docs/neste-okt-prompt.md`; footer med
  versjon + sist oppdatert bestilt (implementert); AI-strategi avklart
  (Anthropic API, v0.8.0, data-brief alltid fallback); planlegging med
  avklaringer (nøkkel klar, Discord klar, én lokal fontfil OK, AI/Discord
  først, Opus 5 xhigh for utførelse).
- 2026-08-19 (økt 1): «Ikke limit deg — lag det så bra du kan»; «AI-en må
  være billig for én person»; «bruk brainstorming» → tre AI-funksjoner +
  Sonnet 5; usage-regel ~95 % → handover; GitHub-kobling (privat repo,
  Coolify på fpl.marsk.no); «ta notat av alt jeg sier» → denne loggen;
  «ROADMAP som løpende todo»; «fiks deploy til Coolify/GitHub først» →
  gjort; Claude in Chrome-prompt for Coolify-oppsett levert.
