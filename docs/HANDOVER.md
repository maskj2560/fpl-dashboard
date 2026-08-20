# HANDOVER — FPL-dashboard

> Levende overleveringsfil. Oppdateres ved hver milepæl og ved arbeidsstans.
> Ny AI-økt: les denne + CLAUDE.md + ROADMAP.md, fortsett der «Status» sier.
> Versjonshistorikk og detaljer ligger i CHANGELOG.md, ROADMAP.md og git —
> denne filen holder kun nåtilstand, aktive økter og lærdommer.

**Sist oppdatert:** 2026-08-20 ~14:55 (cache-backoff-plan godkjent; sesongstart-verifisering aktiv)

## Status akkurat nå

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
- **P3-2 cache-backoff er PLANLAGT og godkjent** (økt 11, Fable i plan mode):
  plan i `docs/plan-cache-backoff.md`, kjøreprompt for Opus 5-utførelsen i
  `docs/neste-okt-prompt-cache-backoff-utforelse.md`. Utføres på branch
  `fix/cache-backoff` — aldri push uten klarsignal, merges først etter
  sjekkpunkt D. Trygg under verifiseringen (rører kun cache.js + tester).

## Sjekkpunkter for økt 8 (Marius pinger økten)

Plan: `C:\Users\mariu\.claude\plans\oppdrag-verifiser-sesongstarten-wise-puffin.md`

| Sjekkpunkt | Når | Hva |
| --- | --- | --- |
| 0 (FERDIG) | torsdag natt | prep + nullpunkt-snapshot (alle sider 200, tomtilstander bekreftet, data-brief-fasit i scratchpad `brief-foer-deadline.json`: «Runde 1», deadline «fredag 21. august kl. 19:30», kapteiner Raya/Gabriel/Calafiori) |
| A | torsdag ~19:45 | etterkontroll auto-brief: Discord-melding + Coolify-logg mot `/api/brief.json` |
| B | fredag ~20:30+ | tomtilstand → ekte data alle sider; **Marius klikker «Spør AI om råd» ÉN gang** (budsjettkall 1) |
| C | lørdag under kampene | live-polling ≤1 kall/60 s, stopp ved `anyLive=false`, cache-bevis |
| D | søndag/mandag | kostnadskontroll (`AI-kall:`-linjer), skjermbilder, mobilsjekk, v1.2.x-kandidater, avslutning |

**AI-kall-telleliste (budsjett ~3 utover automatiske):** brukt **0 av ~3**.
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

- M5: skjermbilder til README + mobilbekreftelse (krever Marius).
- v1.2.x-kandidater i ROADMAP (P1-5b + P3-1…P3-5): fikses kun etter avtale.
  P3-2 har kjøreklar prompt (se Status). P3-3/P3-5 krever avklaring med
  Marius. P1-5b er en arkitekturbeslutning (persistens).
- Valgfritt i Cloudflare: Browser Cache TTL → «Respect Existing Headers».

## Logg over brukerbeskjeder (alle økter — føres løpende)

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
