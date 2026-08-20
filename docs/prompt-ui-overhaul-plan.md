# Oppdrag (Fable, plan mode): full UI-overhaling — KUN PLANLEGGING

Du skal **planlegge**, ikke bygge. Leveransen er en plan-fil pluss oppdaterte
prosjektdokumenter. Ingen linje produksjonskode skal endres i denne økten.

## Les i denne rekkefølgen

1. `docs/HANDOVER.md` — nåtilstand, aktive økter, driftslærdommer
2. `CLAUDE.md` — gjelder foran alt annet, også foran denne prompten
3. `ROADMAP.md` — særlig «Senere / idéer» og v1.1.0-seksjonen (forrige
   UI-makeover, «Matchday»)
4. `docs/plan-cache-backoff.md` og `docs/plan-sanitize-brief.md` — **malen**.
   Planen din skal ha samme form: «Verifiserte fakta», task-for-task med
   eksakte kodesnutter, forventede testtall, verifiseringstabell.

## Absolutte forbud

- **Ingen implementering.** Ingen endringer i `public/`, `views/`, `src/`.
  Kodesnutter hører hjemme *inne i planfilen*, ikke i repoets filer.
- **Aldri push.** Push auto-deployer prod via Coolify.
- **Ingen merge.** Tre branches venter allerede på klarsignal (under).
- **Ingen AI-kall** (ingen `/brief`-besøk som trigger generering, ingen
  «Spør AI om råd»). Marius har et budsjett på ~3 manuelle kall og har
  brukt 0 av dem.
- **Ikke forstyrr sesongstart-verifiseringen.** Sjekkpunkt B (fredag
  ~20:30+), C (lørdag under kampene) og D (søndag/mandag) kjører i en annen
  økt. Ikke rør live-polling, auto-brief eller bannerlogikk.

## Branch og commits

Jobb på **`docs/plan-ui-overhaul`** ut fra `main`. `main` ligger 10 commits
foran `origin/main` med en upushet tag `v1.2.1` — ikke rør noe av det.

Disse tre branchene venter på merge etter sjekkpunkt D og skal ikke røres:

| Branch | Innhold |
| --- | --- |
| `fix/sanitize-brief` | P3-4 + GW1-fixture + sjekkpunkt A-docs |
| `feat/discord-everyone` | `@everyone`-ping på auto-briefen |
| `fix/news-unknown` | «Unknown» → «Uavklart» i skadetekster |

Planlegg mot `main` **slik den blir etter at de tre er merget** — UI-arbeidet
starter uansett først etter D.

## Hva Marius har bedt om (hans ord, ikke omskriv dem bort)

> «Full UI-overhaul. Jeg vil at det skal gi meg følelsen av at jeg er på FPL
> sin side. Inkluder klubblogoer, klubbdrakter som det er på FPL, osv. Alt
> skal se clean ut og være lett å bruke. Kanskje mulighet til å bytte mellom
> mørk og lys, og automatisk basert på nettleserinnstillinger.»

Fire krav å lande konkret: **FPL-gjenkjennelse**, **klubbgrafikk (logoer +
drakter)**, **clean og lett å bruke**, **tema mørk/lys/auto**.

## Verifiserte fakta om dagens tilstand (målt 2026-08-20, ikke gjenverifiser)

- `views/` har 12 EJS-filer, flat struktur: `layout.ejs`, `dashboard.ejs`,
  `players.ejs`, `team.ejs`, `league.ejs`, `brief.ejs`, `live.ejs`,
  `news.ejs`, `transfers.ejs`, `no-team.ejs`, `error.ejs`, `404.ejs`.
  **Merk:** `CLAUDE.md` sier «EJS med layout + partials», men det finnes
  ingen `views/partials/`-mappe. Enten opprett den som del av planen, eller
  rett CLAUDE.md — ikke la avviket stå.
- `public/style.css`: 1202 linjer, 45 CSS-variabler.
- `public/app.js`: 308 linjer vanilla JS.
- `public/fonts/`: lokal Archivo (ingen eksterne CDN-er).
- `test/views.test.js`: 11 render-tester. De låser blant annet
  XSS-escapingen i live/news/brief. **En overhaling vil brekke dem** —
  planen må si hvordan testene oppdateres uten at escapingen mistes.
- **`teams.code` brukes ikke noe sted i koden i dag.** Det er feltet
  FPL-ens bilde-URL-er er bygget på, så det må mappes gjennom fra
  `bootstrap-static` til viewene. Dette er en ekte kodeendring, ikke bare CSS.

## Åpne spørsmål planen MÅ avgjøre (ikke la dem stå ubesvarte)

### 1. Klubbgrafikk — kilde, lisens, hosting

`CLAUDE.md` forbyr eksterne CDN-er. Å peke `<img src>` rett mot
`resources.premierleague.com` eller `fantasy.premierleague.com` bryter den
regelen. Planen må velge og begrunne:

- last ned én gang og selvhost under `public/`, eller
- proxy gjennom serveren med cache, eller
- endre regelen i CLAUDE.md bevisst.

Antatte URL-mønstre (**du må verifisere dem mot ekte data før planen fester
dem** — jeg har ikke sjekket dem i denne økten):

```
drakt:  https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}-66.png
keeper: https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}_1-66.png
merke:  https://resources.premierleague.com/premierleague/badges/{størrelse}/t{code}.png
```

Avklar også:

- **Opphavsrett.** Klubbmerker er varemerker. Selvhostet privat dashbord er
  vanlig praksis blant FPL-verktøy, men det er Marius' beslutning — legg den
  fram nøkternt med et anbefalt valg, ikke som en blokker.
- **Fallback** når et lag mangler bilde (nyopprykkede lag, endret `code`).
  UI-et skal aldri vise brutt bilde.
- **Total filstørrelse** for 20 lag × (merke + hjemmedrakt + keeperdrakt),
  og hvordan de lastes (`loading="lazy"`, sprite, `<img>` vs CSS).
- **Cache-strategi.** Cloudflare setter `max-age=14400` på uversjonerte
  assets. Innholdshash-mønsteret `?v=<hash>` finnes allerede for CSS/JS
  (P1-10) — gjelder det bildene også, eller er de stabile nok uten?

### 2. Tema mørk/lys/auto

- `prefers-color-scheme` for auto + manuell overstyring som overlever
  sidelast (localStorage).
- **FOUC:** appen er server-rendret uten byggesteg. Temaet må være satt før
  første paint — typisk et lite inline-script i `<head>` som setter
  `data-theme` på `<html>`. Planen må si hvor det skal ligge og hvordan det
  påvirker asset-hashingen.
- Alle 45 variabler må finnes i begge paletter. Ingen hardkodede farger.
- **Kontrastkravet fra v1.1.1 gjelder fortsatt: 4,5:1.** Den lyse paletten
  må gjennom samme verifisering (8/8 par ble målt sist).
- Hvor sitter bryteren, og hvordan ser den ut på 390 px?

### 3. FPL-gjenkjennelse uten å bli en kopi

FPL-ens visuelle signatur er dyp lilla (#37003C), knallgrønn (#00FF87) og
cyan (#04F5FF). Planen må lande en palett som treffer den følelsen **og**
består kontrastkravet i begge temaer — den grønne på hvitt er notorisk
vanskelig. Vis de faktiske kontrasttallene i planen.

### 4. Etappeinndeling

En full overhaling i én commit er ikke reviewbar og ikke trygg å deployere.
Del i etapper som hver for seg er grønn (`npm test` + `npm run lint`) og
kan merges alene. Foreslå rekkefølge, og si hvordan prod unngår å stå med
halvferdig UI mellom etappene.

## Planen skal dekke

1. **Verifiserte fakta** — alt du har sjekket selv, med kommando/kilde.
2. **Visuell retning** — palett (begge temaer, med kontrasttall),
   typografi, spacing-skala, komponentspråk. Referanser til hva på FPL som
   gjenskapes og hva som bevisst gjøres annerledes.
3. **Klubbgrafikk** — beslutningene fra punkt 1 over, med filplassering,
   navnekonvensjon, nedlastingsskript (hvis valgt) og fallback.
4. **Temasystem** — variabelkart, toggle, persistens, FOUC-håndtering.
5. **Per side** — `/`, `/spillere`, `/lag`, `/liga`, `/brief`, `/live`,
   `/nyheter`, `/overganger`, pluss `no-team`, `error`, `404`. Hva endres,
   hvor kommer drakter/logoer inn, hva er tomtilstanden.
6. **Datakobling** — hvordan `teams.code` mappes fram til viewene uten å
   legge forretningslogikk i routes eller views (CLAUDE.md-regel).
7. **Tilgjengelighet** — kontrast, tastaturnavigasjon, fokusmarkering,
   `prefers-reduced-motion`, alt-tekster på klubbgrafikk.
8. **Mobil** — 390 px er referansebredden. Sticky tabellhoder,
   `.table-scroll` og mobilmenyens scroll-snap finnes allerede og skal ikke
   regrederes.
9. **Testing** — hvordan de 11 view-testene oppdateres, hvilke nye tester
   som trengs, forventede testtall per etappe (rødt → grønt, som i de
   tidligere planene). Playwright-QA er brukt før (103 sjekker på fire
   viewports) — si om det skal gjentas.
10. **Ytelse** — CSS-størrelse etter overhaling, antall bilderequests,
    ingen byggesteg, ingen nye avhengigheter uten eksplisitt begrunnelse.
11. **Risiko og rollback** — hva som kan gå galt i prod og hvordan man går
    tilbake.
12. **Åpne beslutninger til Marius** — samlet til slutt, med din anbefaling
    per punkt.

## Dokumenter som skal oppdateres i samme økt

- **`docs/plan-ui-overhaul.md`** — planen (ny fil).
- **`ROADMAP.md`** — ny milepæl **v1.3.0 — UI-overhaling**, med avhukbare
  punkter per etappe. Legg den etter v1.2.1-seksjonen. Ikke rør
  v1.2.0-kandidatene.
- **`CLAUDE.md`** — «Design»-seksjonen må reflektere lys/mørk tema og
  klubbgrafikk. Hvis CDN-regelen endres, endre den *der*, eksplisitt.
  Rett også partials-avviket nevnt over.
- **`docs/HANDOVER.md`** — status + logglinje for denne beskjeden fra
  Marius (dato + hva som ble gjort). Handover-filen er den levende
  overleveringen; en ny økt skal kunne starte på planen uten mer kontekst.
- **`CHANGELOG.md`** — *ikke* rør. Ingen brukersynlig endring har skjedd ennå.

## Akseptkriterier

Planen er ferdig når en Opus 5-økt kan utføre den task for task uten å ta
en eneste designbeslutning selv. Konkret:

- Hver task har eksakt kode eller eksakt beskrivelse av markup/CSS.
- Hver task har en verifiseringskommando og et forventet resultat.
- Alle fire kravene fra Marius er dekket med et konkret svar.
- Alle åpne spørsmål over er besvart eller eksplisitt løftet til Marius med
  en anbefaling.

Rapporter til slutt: filsti til planen, hvilke dokumenter du endret, hvilke
beslutninger du tok på egen hånd, og hvilke som venter på Marius.
