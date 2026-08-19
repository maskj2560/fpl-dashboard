# Prompt til neste økt (planleggingsøkt med Fable)

> Lim inn alt under streken som første melding i en ny økt i
> `c:\Users\mariu\Documents\Claude Code\FPL`.
> Prompten ber om planlegging først — ikke implementering.

---

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — et selvhostet
Fantasy Premier League-dashboard som allerede er i produksjon på
https://fpl.marsk.no. Versjon v1.0.0 er tagget og deployet.

**Denne økten skal brukes til å planlegge, ikke til å kode.** Bruk god tid,
tenk grundig, og still meg spørsmål underveis. Ikke start implementering før
planen er ferdig og jeg har godkjent den.

Oppdraget har to deler:

- **A: Fullfør alt som er påbegynt.** Ingen funksjon skal stå halvferdig
  eller uverifisert når vi er ferdige.
- **B: Full UI-makeover.** Alt skal se ekstremt bra ut, og det skal se
  *clean* ut.

---

## 1. Oppstart — gjør dette først, i denne rekkefølgen

1. Les disse fire, de er autoritative:
   - `CLAUDE.md` — arkitektur, konvensjoner, FPL-API-regler, AI-kostnadsregler
   - `docs/HANDOVER.md` — nøyaktig status, åpne oppgaver, logg over alt jeg
     har bedt om i tidligere økter
   - `ROADMAP.md` — milepæler, alle huket av til og med v1.0.0
   - `CHANGELOG.md` — hva som faktisk er levert i hver versjon
2. Les den forrige implementeringsplanen:
   `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`.
   Den er gjennomført i sin helhet. **Avviksnotatene i den er viktige** — de
   forteller hvor planens kode var feil eller utrygg og hva som ble gjort i
   stedet (bl.a. `rankGraph` med null-spenn, escaping av lagnavn i
   `<script>`-blokken på live-siden, og hvorfor AI-kallene ikke setter
   `thinking`/`effort`).
3. Kjør `git status` (skal være ren, på `main`), `npm test` (35 grønne),
   `npm run lint` (grønn). Se outputen selv før du stoler på tallene.
4. Bruk brainstorming-ferdigheten før du planlegger, frontend-design-
   ferdigheten for UI-delen, og writing-plans-ferdigheten når planen skrives.

## 2. Dokumentkart — du skal aldri lete

| Hva | Hvor |
|---|---|
| Denne prompten | `docs/neste-okt-prompt.md` |
| Arkitektur, konvensjoner, regler | `CLAUDE.md` |
| Levende status + logg over mine beskjeder | `docs/HANDOVER.md` |
| Milepæler (huk av her) | `ROADMAP.md` |
| Endringslogg (Keep a Changelog) | `CHANGELOG.md` |
| Forrige plan, med avviksnotater | `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` |
| Nye planer legges her | `docs/superpowers/plans/` |
| Deploy-oppskrift + env-tabell + side-tabell | `README.md` |
| Miljøvariabel-mal | `.env.example` (lokal `.env` finnes ikke og er gitignored) |
| Produksjon | https://fpl.marsk.no (Coolify på dash.marsk.no, bak Cloudflare) |
| GitHub | `maskj2560/fpl-dashboard`, privat, auto-deploy fra `main` |

## 3. Teknisk grunnlag

Node 22+ (kjører 24), Express 5, EJS, ingen byggesteg, ingen database,
ingen frontend-rammeverk, ingen eksterne CDN-er. Fem avhengigheter totalt:
`express`, `ejs`, `compression`, `@anthropic-ai/sdk`, `fast-xml-parser`.

```
src/server.js        oppstart, middleware, res.renderPage(view, data),
                     404- og feilhåndtering, versjonsfooter, startScheduler()
src/config.js        env: PORT, FPL_TEAM_ID, LEAGUE_IDS, TZ, NEWS_FEEDS,
                     ANTHROPIC_API_KEY, AI_MODEL, DISCORD_WEBHOOK_URL,
                     BRIEF_HOURS_BEFORE_DEADLINE
src/routes/          index.js (dashboard), health.js, players.js, team.js,
                     league.js, brief.js, live.js, news.js, api.js
src/services/        fplClient.js  eneste modul med nettverkskall mot FPL
                     cache.js      TTL + stale-while-revalidate + dedup
                     analysis.js   all ren analyselogikk (testet)
                     brief.js      setter sammen data-briefen (testet)
                     prompts.js    promptbyggere (testet)
                     ai.js         felles Claude API-service med kostnadscache
                     news.js       RSS + valgfri AI-oppsummering (testet)
                     notify.js     deadline-scheduler + Discord-webhook
                     format.js     norsk dato/tall
views/               layout.ejs, dashboard.ejs, players.ejs, team.ejs,
                     league.ejs, brief.ejs, live.ejs, news.ejs,
                     no-team.ejs, 404.ejs, error.ejs
public/              style.css (alle farger som variabler i :root),
                     app.js (4 IIFE-moduler: nedtelling, spillertabell-
                     sortering/filter, live-polling, AI-rådgiver)
test/                analysis, cache, brief, news, prompts — 35 tester,
                     ingen nettverkskall
```

Dataflyt: routes → services → fplClient → FPL-API. Aldri forretningslogikk i
ruter eller views. Kommandoer: `npm run dev`, `npm start`, `npm test`,
`npm run lint`.

### Sider som finnes i dag

`/` dashboard (deadline-nedtelling, skadeflagg, toppform, mest kjøpt/solgt,
FDR-matrise, AI-nyhetspanel), `/spillere` (full tabell, klientside-sortering
og filtrering), `/lag` (oppstilling, benk, statstripe, rank-graf,
kaptein-/transferanbefalinger, AI-rådgiverknapp), `/liga` (miniligatabeller,
differensialer), `/brief` (AI-brief + data-brief), `/live` (live-poeng,
bonusestimat, kamper, miniliga-topp), `/nyheter` (RSS + AI-oppsummering),
`/health`, `/api/brief.json`, `/api/live.json`, `POST /api/ai-rad`.

## 4. Del A — fullfør alt som er påbegynt

Alt under er kodet og lintet, men **ikke verifisert i drift**. Planen må
lukke hvert punkt, med konkrete verifiseringssteg og forventet output.

### 4.1 Ingen AI-funksjon har noen gang kjørt mot ekte API

`ANTHROPIC_API_KEY` er aldri satt — hverken lokalt eller i Coolify. Fire
funksjoner er derfor aldri sett i drift:

1. AI-nyhetsoppsummering i `news.js` (maks én generering per 30 min)
2. AI-brief på `/brief` (maks én per time per gameweek, data-brief som fallback)
3. AI-rådgiver på `/lag` via `POST /api/ai-rad` (kun ved klikk, cachet 1 time)
4. Auto-briefen til Discord i `notify.js` (1–2 kall per uke)

De er verifisert med mock-rendring og med at feilstiene svarer riktig uten
nøkkel. Det er alt. Modell settes med `AI_MODEL`, standard `claude-sonnet-5`,
billig-alternativ `claude-haiku-4-5`. Merk at `ai.js` bevisst ikke sender
`thinking` eller `output_config.effort` — `effort` gir feil på Haiku 4.5 — og
at `max_tokens` er satt romslig fordi adaptiv tenkning på Sonnet 5 trekker fra
samme budsjett.

Planen må dekke: trygg påslåing, hva vi sjekker først, forventet kostnad per
uke, og hva vi gjør hvis svarene blir dårlige (promptjustering) eller dyre
(modellbytte).

### 4.2 Discord auto-brief er kun mock-testet

`notify.js` er verifisert mot en lokal HTTP-mock: én POST, riktig header,
297 tegn, under Discords 2000-tegnsgrense. Aldri sendt til ekte Discord.
`DISCORD_WEBHOOK_URL` er ikke satt. Vi vet ikke hvordan meldingen faktisk ser
ut i en kanal, eller om oppdelingen på lange AI-brief fungerer i praksis.

### 4.3 Sesongen har ikke startet — halve appen er aldri sett med ekte data

Sesongen 2026/27 starter med GW1, deadline **21. august 2026 kl. 19:30**.
Før den er passert har FPL ingen picks, ingen historikk og ingen
ligatabeller. Disse er derfor kun verifisert med mockdata-rendring:

- oppstilling, benk, kaptein-/visekapteinmerker og rank-graf på `/lag`
- anbefalingene (kaptein, salgskandidater, erstattere) med ekte tropp
- ligatabeller og differensialer på `/liga`
- hele `/live`: live-poeng, bonusestimat fra BPS, kaptein- og benkvekting,
  «sist oppdatert»-pulsen, og pollingen som kun skal kjøre mens kamper pågår

Planen bør si konkret hva vi sjekker rett etter deadline, under første
kampdag, og etter at runden er ferdig.

### 4.4 Testdekning

All ren logikk er testet (35 tester). Ruter og views har ingen automatiske
tester — kun manuelle røyk-tester og mock-rendringer kjørt fra hånden.
Vurder om noe av dette bør formaliseres, uten å blåse opp prosjektet eller
legge til avhengigheter.

### 4.5 Oppgaver som krever meg

- Sette `ANTHROPIC_API_KEY` og `DISCORD_WEBHOOK_URL` i Coolify
- Bekrefte visningen på ekte telefon
- Ta skjermbilder til README

Spør meg om disse tidlig, så planen kan ta høyde for svarene mine.

## 5. Del B — full UI-makeover

Jeg vil at dashboardet skal se **ekstremt bra ut**, og at det skal se
**clean** ut. Dagens design er funksjonelt, men det er en førsteversjon jeg
aldri har sett i en nettleser. Du skal gjøre en helhetlig makeover — ikke
pynte på enkeltelementer.

### Dagens utgangspunkt

Mørkt tema med alle farger som variabler i `public/style.css` `:root`:

```
--bg #110e19   --surface #1a1626   --surface-2 #221d33   --border #2f2945
--text #ece9f6 --text-dim #9c94b8
--accent #00e58c (gressgrønn)     --accent-2 #ff3d81 (FPL-magenta)
--accent-soft, --negative, --warn-bg/-border/-text
--fdr-1..5 + --fdr-blank (FPL-konvensjon: 1 lett grønn → 5 vanskelig rød)
--font-body (systemfonter)  --font-mono  --radius 10px  --pad 1rem
```

Klasser i bruk i dag: `.card`, `.card-wide`, `.grid`, `.table-scroll`,
`table.data`, `table.sortable`, `.num`, `.accent`, `.negative`, `.dim`,
`.status .status-{a,d,i,s,u,n}`, `.fdr .fdr-1..5 .fdr-blank`, `.hero`,
`.countdown`, `.eyebrow`, `.empty`, `.empty-state`, `.banner`, `.legend`,
`.hint`, `.chance`, `.page-head`, `.filters`, `.stat-strip`, `.stat`,
`.pitch`, `.pitch-row`, `.chip`, `.cap`, `.bench`, `.rank-graph`,
`.rec-list`, `.reasons`, `.transfer-block`, `.row-me`, `.sub-head`,
`.news-list`, `.pulse`, `.btn-accent`, `.ai-result`, `.version`.

Det finnes én media query for skjermer under 480 px (topbar ikke sticky,
strammere marger, ordbryting). Ingen andre breakpoints.

### Rammer makeoveren må holde seg innenfor

- **Ingen byggesteg og ingen nye avhengigheter.** Ren CSS og vanilla JS.
- **Ingen eksterne CDN-er.** Vil du ha en annen font enn systemfonter, må den
  legges lokalt i `public/` — og da vil jeg vite hva det koster i lastetid.
- **Server-rendret EJS består.** Ingen SPA, ingen hydrering.
- **Alle farger som variabler i `:root`.** Nye farger blir nye tokens.
- **Norsk UI-tekst overalt**, bokmål, sentence case.
- **Mobil først i praksis** — jeg bruker dette mest på telefon.
- **Tilgjengelighet:** kontrast som holder, synlig fokusmarkering,
  `aria-current` i navigasjonen, `aria-sort` på sorterbare kolonner,
  `prefers-reduced-motion` respekteres. Alt dette finnes i dag — ikke mist det.
- **Ytelse:** siden skal fortsatt være rask og lett.

### Hva jeg forventer at planen tar stilling til

- En tydelig visuell retning (mørkt tema beholdes? typografiskala?
  romfølelse? hvor mye aksentfarge?) — foreslå og begrunn, ikke spør meg om
  alt
- Layoutsystem og rytme: sidebredder, kortstruktur, mellomrom, tabellstil
- Navigasjonen: sju lenker i topbaren blir trangt på mobil — foreslå noe bedre
- Datavisningene som bærer appen: nedtellingen på forsiden, FDR-matrisen,
  oppstillingen på `/lag`, rank-grafen, live-tabellen
- Tomtilstander, lastetilstander og feilsider som del av designet, ikke
  ettertanke
- En rekkefølge som gjør at hver commit er deploybar — `main` går rett i prod

### En viktig praktisk begrensning

Verken du eller jeg har en nettleser i økten. Du kan rendre EJS med mockdata
og lese HTML-en, men **du kan ikke se resultatet**. Planen må derfor si
hvordan vi kvalitetssikrer utseendet: hva jeg skal se etter når jeg åpner
sidene, i hvilken rekkefølge, og hva jeg skal rapportere tilbake.

## 6. Faste regler (sammendrag av CLAUDE.md — les originalen)

- Conventional commits med trailer
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
  Commit hyppig, minst én per delfunksjon.
- `ROADMAP.md`, `CHANGELOG.md` og `docs/HANDOVER.md` oppdateres ved **hver**
  delfunksjon, ikke bare ved milepæler. Alle beskjeder fra meg loggføres i
  «Logg over brukerbeskjeder» i HANDOVER med dato og hvilken handling de førte til.
- Ved milepæl: flytt Unreleased til versjonert seksjon med dato, bump
  `version` i `package.json`, commit `docs: release vX.Y.0`, tag, push
  `git push origin main --tags`. Footeren viser versjon og oppstartstidspunkt
  automatisk, så versjonsbumpen er det eneste manuelle.
- TDD for all ren logikk: skriv test, se den feile, implementer, se den grønn.
- Push til `main` deployer rett i prod. Aldri push uten grønn `npm test` +
  `npm run lint`. Verifiser prod etterpå.
- Ikke påstå at noe virker uten å ha kjørt kommandoen og sett outputen. Kunne
  du ikke kjøre den, si det eksplisitt.
- Nærmer økten seg usage-grensen (~95 %): stopp, oppdater HANDOVER grundig,
  commit og push alt.

## 7. FPL-API — det du trenger å vite

Base `https://fantasy.premierleague.com/api/`, åpent, ingen nøkkel.
Nettleser-lignende `User-Agent` kreves. Priser (`now_cost`) er i tideler.
`bootstrap-static/` er hovedkilden. Under kampoppdateringer kan API-et svare
503 «The game is being updated» — serveren viser da et banner og sist kjente
data i stedet for å krasje. TTL-er i `fplClient.js`: bootstrap og fixtures
15 min, element-summary 30 min, entry/history/picks/league 5 min, live 1 min.
Frontend poller kun mens kamper pågår, og all polling går via serverens cache.

## 8. Miljø og feller

Windows 11, PowerShell 5.1 (`;` ikke `&&`), Node 24, npm 11, git, gh CLI
innlogget som `maskj2560`, Docker tilgjengelig. Ingen nettleser i økten.

- **Ikke** les og skriv tilbake filer med `Get-Content -Raw` + `Set-Content` i
  PowerShell 5.1 — det dobbeltkoder UTF-8 og ødelegger æøå. Bruk
  Edit/Write-verktøyene på alt som inneholder norsk tekst.
- Unngå æøå i commit-meldinger (bruk a/o/aa) — PowerShell 5.1 kan mangle UTF-8.
- Bruk gjerne subagenter til utforsking, men ikke til selve implementeringen.
- Vil du teste en side som krever lagdata før sesongstart: rendre viewet med
  mockdata via `ejs.renderFile` fra et midlertidig script i prosjektroten
  (node finner ikke `ejs` utenfor prosjektet), og slett scriptet etterpå.
  Forrige økt gjorde dette for `/lag`, `/liga`, `/live`, `/brief` og `/nyheter`.

## 9. Leveranse jeg vil ha ut av økten

En plan i `docs/superpowers/plans/` med samme detaljnivå som den forrige:
nummererte oppgaver med `- [ ]`-avkryssing, konkrete filer, ferdig kode der
det gir mening, og eksplisitte verifiseringssteg med forventet output. Planen
skal kunne utføres av en ny økt uten å måtte gjette på noe.

Del den i milepæler, prioriter etter hva som gir meg mest verdi først, og si
tydelig hva som er blokkert av meg og hva du kan gjøre selv. Si også hvor
lang tid / hvor mange økter du tror hver milepæl tar.

Still meg spørsmålene du trenger svar på før du begynner å skrive planen.
