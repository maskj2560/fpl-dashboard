# FPL-dashboard

Selvhostet Fantasy Premier League-dashboard på norsk. Server-rendret
Express 5 + EJS, ingen database, ingen byggesteg. All data hentes fra det
åpne FPL-API-et — ingen innlogging eller API-nøkkel trengs for kjernen.

## Skjermbilder

Mørkt tema er standard; lyst tema og auto følger systemvalget.

| Dashbord | Spillere | Mitt lag |
| --- | --- | --- |
| ![Dashbord](docs/img/dashbord-desktop.png) | ![Spillere](docs/img/spillere-desktop.png) | ![Mitt lag](docs/img/lag-desktop.png) |

Mobil (390 px): [dashbord](docs/img/dashbord-mobil.png) ·
[spillere](docs/img/spillere-mobil.png) · [lag](docs/img/lag-mobil.png)

## Sider

| Side | Innhold | Status |
|---|---|---|
| `/` | Deadline-nedtelling, ukens flagg, toppform, mest kjøpt/solgt, FDR-matrise | ✅ |
| `/spillere` | Full spillertabell med sortering, filtrering og søk (viser 100 rader om gangen) | ✅ |
| `/lag` | Mitt lag, kaptein- og transferanbefalinger, chip-planlegger | ✅ |
| `/liga` | Miniliga-tabeller, differensial-analyse, liga-innsikt og «Rundens rapport» | ✅ |
| `/overganger` | Regnskap for byttene, prisgevinst, «laget uten bytter», hva hvis-planlegger, prisendringer i natt | ✅ |
| `/innsikt` | Sesonginnsikt: FPL-karrieren, merkedager, benkesløsing, kapteinsfasit, flaks, rundens XI | ✅ |
| `/live` | Live-poeng under pågående gameweek + bonuskamp (BPS) per kamp; mellom runder vises neste avspark | ✅ |
| `/brief` | Gameweek-brief (data + valgfri AI) + «Lagsjekk» før deadline | ✅ |
| `/nyheter` | FPL-nyheter fra RSS + valgfri AI-oppsummering | ✅ |
| `/api/brief.json` | Briefen som JSON | ✅ |
| `/api/live.json` | Live-data som JSON (polles kun under kamper) | ✅ |
| `/kalender.ics` | Kalenderabonnement (webcal): alle deadlines med varsel + troppens kamper | ✅ |
| `POST /api/ai-rad` | AI-råd for laget ditt (krever `ANTHROPIC_API_KEY`) | ✅ |
| `/health` | Helsesjekk: `status`, `features` (hvilke valgfrie funksjoner som er på — aldri verdiene) og `aiStats` (AI-kall og tokens per funksjon siden `since`; `null` uten AI) | ✅ |

Pluss `/kalender.ics` (kalenderabonnement), `/offline` (frakoblet-side) og
`/sw.js` (service worker). Appen er en PWA fra v1.12.0: «Legg til på
hjemskjerm» gir eget ikon og standalone-visning; dataene caches aldri
(alltid ferske fra FPL), kun stil, script, font og ikoner.

Se `ROADMAP.md` for full plan og fremdrift.

## Lokal kjøring

Krever Node 22+.

```bash
npm install
cp .env.example .env   # fyll inn FPL_TEAM_ID m.m. (valgfritt for / og /spillere)
npm run dev            # utvikling med auto-restart
npm start              # produksjon
npm test               # tester (node:test)
npm run lint           # ESLint
npm run hooks          # aktiver pre-push-hooken (test + lint før push) — én gang per maskin
```

## Miljøvariabler

| Variabel | Påkrevd | Beskrivelse |
|---|---|---|
| `PORT` | nei (3000) | Port serveren lytter på |
| `FPL_TEAM_ID` | for /lag, /liga, /live | Din team-ID — tallet i URL-en på «Points»-siden: `/entry/DIN_ID/event/1` |
| `LEAGUE_IDS` | nei | Kommaseparerte miniliga-ID-er. Tomt = hentes fra laget ditt |
| `NEWS_FEEDS` | nei | Kommaseparerte RSS-URL-er. Tomt = BBC/Sky-defaults |
| `ANTHROPIC_API_KEY` | nei | Aktiverer AI-funksjoner (nyheter, brief, rådgiver) |
| `AI_MODEL` | nei (`claude-sonnet-5`) | Claude-modell. Billig-alternativ: `claude-haiku-4-5` |
| `DISCORD_WEBHOOK_URL` | nei | Aktiverer Discord: auto-brief, Lagsjekk (kun ved funn), rundens rapport og prisvarsler (maks én per natt) |
| `BRIEF_HOURS_BEFORE_DEADLINE` | nei (24) | Timer før deadline auto-briefen sendes |
| `DEADLINE_CHECK_HOURS_BEFORE` | nei (3) | Timer før deadline «Lagsjekk» kjøres — Discord-melding kun ved funn (skadet/suspendert starter, flagget kaptein, spiller uten kamp) |
| `TZ` | nei (`Europe/Oslo`) | Tidssone for visning |

Appen starter og viser `/` uten noen av disse satt.

## Deploy på Coolify

1. **Ny ressurs** → koble Git-repoet, velg **Dockerfile** som build pack
2. **Port**: 3000
3. **Health check**: path `/health` (Dockerfilen har også innebygd `HEALTHCHECK`)
4. **Env-variabler**: sett minst `FPL_TEAM_ID` (og `ANTHROPIC_API_KEY` for AI) i
   Coolify — aldri i repoet
5. Aktiver **auto-deploy** (webhook) — hver push til `main` går rett i prod

## Arkitektur

```
src/app.js         createApp(): monterer middleware, ruter og feilhåndtering
src/server.js      oppstart: lytt, SIGTERM/SIGINT, schedulere
src/config.js      env-variabler med validering og defaults
src/routes/        tynne ruter, én per side
src/services/      fplClient (eneste FPL-nettverkskall), cache (TTL+SWR),
                   analysis (ren logikk), format
views/             EJS-views med felles layout
public/            style.css, app.js (vanilla)
test/              node:test — ren logikk + rute-tester, ingen nettverkskall
```

Hver push kjøres gjennom GitHub Actions (`.github/workflows/ci.yml`): `npm ci`,
lint og tester på Node 22 og 24. Lokalt gjør pre-push-hooken det samme.

FPL-API-et caches server-side (bootstrap 15 min, live 1 min osv.), med
stale-while-revalidate og deduplisering — mange besøkende gir få API-kall.
Ved 503 fra FPL («game is being updated») serveres sist kjente data med et
banner i stedet for feil.
