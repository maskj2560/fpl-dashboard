# FPL-dashboard — Del A: verifisering i drift + Del B: UI-makeover «Matchday»

> **For agentic workers:** REQUIRED SUB-SKILL: Bruk superpowers:executing-plans
> (inline i økten — subagenter skal IKKE brukes til implementering, jf.
> `docs/neste-okt-prompt.md` §8). Steg hukes av med `- [ ]`.
> Ved UI-oppgavene (Milepæl 3): last `frontend-design`-skillen først i økten,
> og `dataviz`-skillen før rank-graf-oppgaven (Task 3.7).

**Mål:** Alle påbegynte funksjoner verifisert i ekte drift (AI, Discord,
sesongdata), og en helhetlig UI-makeover som gjør dashboardet ekstremt bra og
clean — uten å miste dagens tilgjengelighet, ytelse eller arkitektur.

**Arkitektur:** Ingen strukturendringer. Server-rendret Express 5 + EJS består.
Del A er config/verifisering + to små kodefikser (`notify.js`-guard,
usage-logging i `ai.js`). Del B er `public/style.css` (omskrives),
`views/*.ejs` (restruktureres varsomt), én lokal fontfil, og en liten
`analysis.js`-utvidelse (rank-graf-areal, TDD).

**Stack:** Node 22+ (kjører 24), Express 5, EJS, ren CSS, vanilla JS.
Fem avhengigheter — **ingen nye tillates**.

**Spec:** `docs/neste-okt-prompt.md` (oppdragsbriefen) + `CLAUDE.md` +
avviksnotatene i `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md`.

## Kontekst

v1.0.0 er i prod på https://fpl.marsk.no, men fire AI-funksjoner har aldri
kjørt mot ekte API (`ANTHROPIC_API_KEY` aldri satt), Discord-auto-briefen er
kun mock-testet, og halve appen (lag/liga/live) er kun verifisert med mockdata
fordi sesongen 2026/27 ikke har startet. GW1-deadline er
**torsdag 21. august 2026 kl. 19:30** (17:30Z). Designet er en førsteversjon
brukeren aldri har sett i nettleser og skal få full makeover.

**Brukerens avklaringer (2026-08-19, IKKE re-spør):**
- Anthropic API-nøkkel: **klar nå** — settes i Coolify når planen sier fra
- Discord-server/kanal: **klar** — webhook lages når planen sier fra
- Font: **én lokal fontfil er OK** (selvhostet, ingen CDN)
- Rekkefølge: **AI/Discord først**, deretter UI, deretter sesongverifisering

**Tidsvindu som styrer rekkefølgen:**
- Auto-briefen sender naturlig **onsdag 20. aug ~19:30** (24 t før deadline)
  hvis env-variablene er satt i Coolify før det → Milepæl 1 kjøres straks
- `notify.js` husker `lastSentEvent` kun i minnet → **hver deploy/restart i
  24-timersvinduet før deadline re-sender briefen til Discord**. UI-makeoverens
  hyppige pushes 20.–21. aug ville spamme kanalen → Task 1.1 fikser dette FØR
  UI-arbeidet starter.

## Globale rammer (gjelder hver oppgave)

- Ingen byggesteg, ingen nye npm-avhengigheter, ingen eksterne CDN-er
- Alle farger som CSS-variabler i `:root`; norsk UI-tekst (bokmål, sentence case)
- Dataflyt: routes → services → fplClient; aldri forretningslogikk i ruter/views
- TDD for all ren logikk; grønn `npm test` + `npm run lint` før hver push
- Push til `main` deployer rett i prod → verifiser prod etter hver push med
  `(Invoke-WebRequest https://fpl.marsk.no/<side> -UseBasicParsing).StatusCode`
- Conventional commits, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`,
  ingen æøå i commit-meldinger
- `ROADMAP.md`, `CHANGELOG.md`, `docs/HANDOVER.md` oppdateres ved hver delfunksjon
- Windows/PowerShell 5.1: bruk Edit/Write-verktøyene på filer med norsk tekst
  (aldri `Get-Content -Raw` + `Set-Content` — dobbeltkoder UTF-8)
- Tilgjengelighet skal IKKE forringes: synlig fokus, `aria-current` i nav,
  `aria-sort` på sorterbare kolonner, `prefers-reduced-motion` respekteres,
  tekstkontrast ≥ 4.5:1 (≥ 3:1 for stor/fet tekst)
- **Klassenavn-kontrakten:** `public/app.js` genererer markup med `.cap`,
  `.row-me`, `.card`, `.dim`, `.num`, `table.data`, `.table-scroll` og leser
  ID-ene `players-table`, `filter-*`, `live-*`, `ai-advice-*` — disse navnene
  beholdes. Nye klasser kan legges til; endres markup i `views/live.ejs`, må
  render-funksjonen i app.js modul 3 oppdateres i samme commit

## Milepælsoversikt

| Milepæl | Innhold | Blokkert av | Estimat | Når |
|---|---|---|---|---|
| M1 (v1.0.1) | AI + Discord i drift, anti-spam-guard, usage-logg | Bruker: nøkkel + webhook i Coolify | 1 kort økt | I dag/i morgen FØR 20. aug 19:30 |
| M2 | View-render-tester (sikkerhetsnett for makeoveren) | Ingen | ~30 min | Start av UI-økten |
| M3 (v1.1.0) | UI-makeover «Matchday», alle 11 views + CSS + font | Bruker: QA på telefon underveis | 1–2 økter | 20.–21. aug (pushes trygge etter Task 1.1) |
| M4 | Sesongstart-verifisering i tre sjekkpunkter | Kalenderen: 21.–24. aug | 3 × ~30 min | Etter deadline / kampdag / etter runden |
| M5 | Skjermbilder, mobilbekreftelse, opprydding | Bruker | ~30 min | Etter M3+M4 |

**Hva krever brukeren:** sette to env-variabler i Coolify (M1), lage
Discord-webhook (M1), legge nøkkel i lokal `.env` for pre-flight (M1),
åpne sider på telefon/desktop og rapportere per QA-checkliste (M3),
skjermbilder til README (M5). Alt annet gjør økten selv.

---

## Milepæl 1 — AI og Discord i drift (v1.0.1)

### Task 1.1: Anti-spam-guard i notify.js (TDD)

**Problem:** `check()` i `src/services/notify.js:22-36` setter timer med
`Math.max(delay, 0)` — er send-tidspunktet passert, sendes briefen umiddelbart
ved oppstart. `lastSentEvent` lever kun i minnet, så **hver Coolify-deploy i
vinduet [deadline − 24 t, deadline] re-sender briefen**. Fiks: send bare hvis
planlagt tidspunkt er mindre enn 1 time passert; ellers markér som håndtert og
logg.

**Files:**
- Modify: `src/services/notify.js`
- Test: `test/notify.test.js` (ny)

**Interfaces:**
- Produces: `sendDecision({ deadlineTime, hoursBefore, nowMs, checkIntervalMs })`
  → `{ action: 'wait' | 'schedule' | 'skip', delayMs }` — ren funksjon,
  eksportert fra `notify.js`, brukt av `check()`

- [x] **Steg 1 (RED):** Opprett `test/notify.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendDecision } from '../src/services/notify.js';

const H = 60 * 60_000;
const CHECK = 6 * H;
// Deadline 21. aug 2026 17:30Z, 24 t varsel → planlagt send 20. aug 17:30Z
const deadline = '2026-08-21T17:30:00Z';
const sendAt = Date.parse('2026-08-20T17:30:00Z');

test('mer enn 6 t til send-tidspunkt: vent til neste sjekk', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 10 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'wait');
});

test('innenfor sjekkintervallet: planlegg timer med riktig delay', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 2 * H);
});

test('inntil 1 t etter planlagt tid: send umiddelbart (delay 0)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 30 * 60_000, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 0);
});

test('mer enn 1 t etter planlagt tid: hopp over (anti-spam ved deploy)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'skip');
});
```

- [x] **Steg 2:** `npm test` → de fire nye testene FEILER med
      `does not provide an export named 'sendDecision'`. Se feilen selv.
- [x] **Steg 3 (GREEN):** I `src/services/notify.js`, legg til eksportert ren
      funksjon og bruk den i `check()`:

```js
const MAX_LATE_MS = 60 * 60_000; // sender ikke mer enn 1 t etter planlagt tid

/** Ren beslutning om auto-brief: vent, planlegg timer, eller hopp over. */
export function sendDecision({ deadlineTime, hoursBefore, nowMs, checkIntervalMs }) {
  const sendAt = new Date(deadlineTime).getTime() - hoursBefore * 60 * 60_000;
  const delayMs = sendAt - nowMs;
  if (delayMs > checkIntervalMs) return { action: 'wait', delayMs };
  if (delayMs < -MAX_LATE_MS) return { action: 'skip', delayMs };
  return { action: 'schedule', delayMs: Math.max(delayMs, 0) };
}
```

      og i `check()` erstattes linjene 27–32 (`const sendAt …` t.o.m.
      `timer.unref?.()`) med:

```js
    const d = sendDecision({
      deadlineTime: upcoming.deadline_time,
      hoursBefore: config.briefHoursBeforeDeadline,
      nowMs: Date.now(),
      checkIntervalMs: CHECK_INTERVAL,
    });
    if (d.action === 'wait') return; // neste sjekk tar den
    if (d.action === 'skip') {
      // Typisk en deploy/restart i sendevinduet — briefen er alt sendt (eller
      // toget har gaatt). Marker som haandtert saa vi ikke spammer kanalen.
      lastSentEvent = upcoming.id;
      console.log(`Auto-brief hoppet over for ${upcoming.name}: send-tidspunktet er passert`);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => send(upcoming), d.delayMs);
    timer.unref?.();
```

- [x] **Steg 4:** `npm test` → 39/39 grønne (35 + 4 nye). `npm run lint` → 0 feil.
- [x] **Steg 5:** Commit:

```
fix: auto-brief sendes ikke pa nytt ved deploy i sendevinduet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

### Task 1.2: Usage-logging i ai.js

Kostnadsestimatet skal bygge på tall, ikke antakelser. Én logglinje per
vellykket AI-kall.

**Files:**
- Modify: `src/services/ai.js`

- [x] **Steg 1:** I `generate()` i `src/services/ai.js`, rett etter at `text`
      er bygget og før tom-svar-sjekken (etter linje 48), legg til:

```js
      console.log(
        `AI-kall: ${cacheKey} modell=${res.model} inn=${res.usage?.input_tokens ?? '?'} ut=${res.usage?.output_tokens ?? '?'} tokens`
      );
```

- [x] **Steg 2:** `npm test` + `npm run lint` → grønne (ingen tester rører ai.js-nettverk).
- [x] **Steg 3:** Commit: `feat: logg tokenbruk per AI-kall`

### Task 1.3: Lokal pre-flight med ekte nøkkel (krever bruker)

Alle fire AI-funksjonene kjøres mot ekte API lokalt FØR noe settes i prod.

- [x] **Steg 1 (BRUKER):** Legg `ANTHROPIC_API_KEY=sk-ant-…` i `.env` i
      prosjektroten (filen er gitignored; opprett fra `.env.example` om den
      mangler, og sett også `FPL_TEAM_ID` hvis kjent — anbefalingsgrenene
      trenger den ikke før sesongstart).
- [x] **Steg 2:** Start `npm run dev`. Forventet i konsollen: ingen feil,
      `Auto-brief aktiv…` vises IKKE (webhook ikke satt lokalt).
- [x] **Steg 3 — AI-nyheter:** Åpne/curl `http://localhost:3000/nyheter`.
      Forventet: seksjonen med AI-oppsummering rendres med 5–8 norske punkter,
      og konsollen viser `AI-kall: news-summary modell=claude-sonnet-5 inn=… ut=…`.
      Punktene skal referere faktiske saker fra feed-listen under. Curl-sjekk:
      `(Invoke-WebRequest http://localhost:3000/nyheter -UseBasicParsing).Content -match 'AI'`.
- [x] **Steg 4 — AI-brief:** Åpne `http://localhost:3000/brief`. Forventet:
      AI-brief-seksjon øverst på norsk (deadline, kapteinsvalg, skadenytt),
      data-briefen under. Konsoll: `AI-kall: ai-brief-gw1 …`. Last siden på
      nytt → INGEN ny `AI-kall`-linje (cache, maks 1/time).
- [x] **Steg 5 — AI-rådgiver:**
      `Invoke-WebRequest http://localhost:3000/api/ai-rad -Method POST -UseBasicParsing`.
      Før sesongstart finnes ingen picks — forventet da et kontrollert
      feilsvar (4xx/5xx med norsk feilmelding i JSON), IKKE et krasj.
      Full verifisering av rådgiveren skjer i M4 sjekkpunkt A.
- [x] **Steg 6 — kvalitetsvurdering:** Les AI-tekstene fra steg 3–4 sammen med
      brukeren. Godkjenningskriterier: norsk bokmål, ingen hallusinerte
      spillere/kamper (kryssjekk mot rådataene på siden), handlingsorientert.
      Er svarene dårlige → juster promptbyggerne i `src/services/prompts.js`
      (testene i `test/prompts.test.js` låser strukturen) og gjenta. Er de
      dyre (se usage-loggen; forventning: nyheter ~2–3K inn / ~400 ut) →
      vurder `AI_MODEL=claude-haiku-4-5` (ca. 3× billigere).

      **Resultat av pre-flight (2026-08-19, ekte nøkkel, lokalt):**
      - `/nyheter` 200. Logg: `AI-kall: news-summary modell=claude-sonnet-5
        inn=1306 ut=824 tokens`. Sju norske punkter, alle sporet tilbake til
        faktiske overskrifter i feed-listen (Reijnders→Al-Qadsiah, Jones→Inter,
        Baleba/United, Konsa→Arsenal, Musiala). Ingen hallusinerte spillere.
      - `/brief` 200. Logg: `AI-kall: ai-brief-gw1 … inn=552 ut=796 tokens`.
        Andre sidelasting ga INGEN ny logglinje → timescachen virker.
        Innholdet stemmer mot rådataene på siden (Doku-skaden, kapteinstrioen
        Raya/Gabriel/Calafiori) og er handlingsorientert på norsk bokmål.
      - `POST /api/ai-rad` uten `FPL_TEAM_ID`: HTTP 400 med
        `{"error":"FPL_TEAM_ID er ikke satt."}` — kontrollert feil, ikke krasj.
      - Kvaliteten er god nok til å beholde `claude-sonnet-5`; ingen
        promptjustering nødvendig. Faktisk forbruk ligger under estimatet
        (~1,3K inn på nyheter mot antatt 2–3K).

      **Avvik fra planen (ukedager, ikke datoer):** FPL-dataen sier deadline
      **fredag 21. august kl. 19:30** (17:30Z), ikke torsdag. Verifisert:
      19. august 2026 = onsdag, 20. = torsdag, 21. = fredag. Datoene i planen
      er riktige, ukedagsnavnene er forskjøvet én dag. Konsekvens: den
      naturlige auto-briefen sender **torsdag 20. august ~19:30**, og
      Milepæl 1 må derfor være i prod før **torsdag 20. august ~19:00**.

### Task 1.4: Tvungen lokal test av auto-briefen mot ekte Discord (krever bruker)

- [ ] **Steg 1 (BRUKER):** Lag webhook i Discord: kanalinnstillinger →
      Integrasjoner → Webhooks → Ny webhook → kopier URL.
- [ ] **Steg 2 — rå webhook-røyk-test** (utenfor appen, beviser URL-en):

```powershell
Invoke-WebRequest -Uri "<WEBHOOK_URL>" -Method POST -ContentType "application/json" -Body '{"content":"Roik-test fra FPL-dashboard"}' -UseBasicParsing
```

      Forventet: HTTP 204 og meldingen synlig i kanalen.
- [ ] **Steg 3 — tvungen app-sending:** Beregn timer til deadline og sett
      varselet slik at send-tidspunktet er nå (innenfor 1-times-guarden):

```powershell
node -e "console.log(((Date.parse('2026-08-21T17:30:00Z') - Date.now())/3600000).toFixed(2))"
```

      Sett i `.env`: `DISCORD_WEBHOOK_URL=<URL>` og
      `BRIEF_HOURS_BEFORE_DEADLINE=<tallet fra kommandoen, rundet NED til to desimaler>`
      (verdien leses med `Number()` — desimaler er OK; verifiser i
      `src/config.js` før du stoler på dette). Restart `npm run dev`.
      Forventet konsoll: `Auto-brief aktiv: sender … t før deadline`, deretter
      innen ~1 min `AI-kall: ai-brief-gw1 …` og `Auto-brief sendt for Gameweek 1`.
- [ ] **Steg 4 — verifiser i Discord:** header med `**Gameweek-brief — Gameweek 1**`,
      deadline-linje, lenke til https://fpl.marsk.no/brief, AI-briefen under.
      Sjekk spesielt: **fet skrift** rendres (Discord tolker `**`), ingen
      avkuttede setninger, og hvis briefen er > 1900 tegn: den er delt i flere
      meldinger med hele avsnitt (oppdelingen i `postToDiscord` deler på linjeskift).
- [ ] **Steg 5:** Fjern `BRIEF_HOURS_BEFORE_DEADLINE` fra `.env` (tilbake til
      default 24) og noter i HANDOVER at lokal auto-brief er verifisert mot
      ekte Discord med dato og resultat.

### Task 1.5: Slå på i prod (krever bruker) + release v1.0.1

- [x] **Steg 1:** Push Task 1.1+1.2 (grønn test/lint først). Verifiser prod:
      alle ti ruter svarer 200, footer viser fortsatt v1.0.0.
- [ ] **Steg 2:** Release v1.0.1: flytt `[Unreleased]` til `[1.0.1]` med dato i
      CHANGELOG, bump `version` i `package.json`, commit `docs: release v1.0.1`,
      `git tag v1.0.1`, `git push origin main --tags`. Verifiser at footeren i
      prod viser v1.0.1 etter deploy.
- [ ] **Steg 3 (BRUKER):** Sett i Coolify (Environment Variables for appen):
      `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK_URL`. IKKE sett
      `BRIEF_HOURS_BEFORE_DEADLINE` (default 24 er riktig). Redeploy appen.
- [ ] **Steg 4:** Verifiser prod: `https://fpl.marsk.no/nyheter` viser
      AI-oppsummering; `https://fpl.marsk.no/brief` viser AI-brief;
      dashboardet viser AI-nyhetspanelet. Coolify-loggen viser
      `Auto-brief aktiv: sender 24 t før deadline` og `AI-kall: …`-linjer.
- [ ] **Steg 5:** Oppdater ROADMAP (ny seksjon v1.0.1, avhuket), HANDOVER
      (status + brukerbeskjed-logg), commit `docs: …`.

### Task 1.6: Naturlig auto-brief onsdag 20. aug ~19:30 (kalenderstyrt)

- [ ] **Steg 1:** Onsdag kveld: sjekk Discord-kanalen. Forventet: én (1)
      brief-melding ca. 19:30, med AI-innhold.
- [ ] **Steg 2:** Sjekk Coolify-loggen for `Auto-brief sendt for Gameweek 1`.
      Deployes appen senere samme kveld: forventet logglinje
      `Auto-brief hoppet over for Gameweek 1: send-tidspunktet er passert` —
      og INGEN ny Discord-melding. Det er beviset på at Task 1.1 virker i drift.
- [ ] **Steg 3:** Noter resultatet i HANDOVER.

### Task 1.7: Kostnadskontroll (løpende)

- [ ] **Steg 1:** Etter 2–3 dager med nøkkel i prod: les `AI-kall:`-linjene i
      Coolify-loggen og summer tokens.
      **Estimat på forhånd** (Sonnet 5: $3/M inn, $15/M ut; intro-pris $2/$10
      ut august): nyheter ~10 gen/dag à ~3K inn + 400 ut, brief ~5–10/uke à
      ~2K + 1K, rådgiver ~5/uke, auto-brief 1–2/uke →
      **realistisk ~$1–1.5/uke, tak ~$3–4/uke**. Haiku 4.5 ($1/$5) deler på ~3.
- [ ] **Steg 2:** Over ~$4/uke ELLER dårlig kvalitet som promptjustering ikke
      løser: sett `AI_MODEL=claude-haiku-4-5` i Coolify og sammenlign kvalitet
      på /nyheter og /brief. Modellbytte er kun en env-endring + redeploy.

---

## Milepæl 2 — Sikkerhetsnett: view-render-tester

Makeoveren endrer alle 11 views. En test som rendrer hvert view med mockdata
fanger EJS-brekkasje (manglende locals, syntaksfeil) FØR push — `main` går
rett i prod. Null nye avhengigheter: `ejs` er alt en dependency.

### Task 2.1: test/views.test.js + fixtures

**Files:**
- Create: `test/fixtures/views.js`, `test/views.test.js`

**Interfaces:**
- Produces: `renderView(name, locals)` — intern hjelper i testen;
  fixtures-modulen eksporterer ett locals-objekt per view

- [x] **Steg 1:** Les hvert view i `views/` og lag `test/fixtures/views.js`
      med ett komplett locals-objekt per view. Formatfunksjonene gjenbrukes
      fra `src/services/format.js` (ikke mock dem). Start slik (dashboard og
      team er ferdige her — de øvrige avledes av view-kildene på samme måte):

```js
// Mock-locals for view-render-testene. Ingen nettverkskall.
import { formatDateTime, formatNumber, formatPrice } from '../../src/services/format.js';

const teamsById = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS' }],
  [2, { id: 2, name: 'Liverpool', short_name: 'LIV' }],
]);
const POSITIONS_SHORT = { 1: 'K', 2: 'F', 3: 'M', 4: 'A' };
const STATUS_LABELS = { a: 'Tilgjengelig', d: 'Tvilsom', i: 'Skadet', s: 'Utestengt', u: 'Utilgjengelig', n: 'Ikke med' };
const player = (id, name, extra = {}) => ({
  id, web_name: name, team: 1, element_type: 3, now_cost: 55, form: '5.5',
  total_points: 42, selected_by_percent: '12.3', status: 'a', news: '',
  chance_of_playing_next_round: null, transfers_in_event: 1000,
  transfers_out_event: 500, ...extra,
});

export const dashboard = {
  deadlineEvent: { name: 'Gameweek 1', deadline_time: '2026-08-21T17:30:00Z' },
  flagged: [player(1, 'Saka', { status: 'i', news: 'Kneskade', chance_of_playing_next_round: 25 })],
  inForm: [player(2, 'Salah', { team: 2 })],
  boughtMost: [player(3, 'Haaland')],
  soldMost: [player(4, 'Watkins')],
  matrix: {
    gameweeks: [1, 2],
    rows: [{
      team: teamsById.get(1),
      cells: [[{ difficulty: 2, opponent: 'LIV', home: true }], []],
      avgDifficulty: 2,
    }],
  },
  newsPoints: ['**Salah** i storform før GW1'],
  teamsById, STATUS_LABELS, POSITIONS_SHORT, formatDateTime, formatPrice, formatNumber,
};

export const team = {
  entry: {
    name: 'Marius XI', player_first_name: 'Marius', player_last_name: 'S.',
    summary_overall_points: 100, summary_overall_rank: 500000,
  },
  gw: 1,
  squadView: {
    activeChip: null,
    entryHistory: { points: 60, value: 1002, bank: 15 },
    byLine: {
      1: [{ pick: { is_captain: false, is_vice_captain: false }, player: player(1, 'Raya', { element_type: 1 }) }],
      2: [{ pick: { is_captain: false, is_vice_captain: true }, player: player(2, 'Gabriel', { element_type: 2 }) }],
      3: [{ pick: { is_captain: true, is_vice_captain: false }, player: player(3, 'Saka') }],
      4: [{ pick: { is_captain: false, is_vice_captain: false }, player: player(4, 'Haaland', { element_type: 4 }) }],
    },
    bench: [{ pick: {}, player: player(5, 'Turner', { element_type: 1 }) }],
  },
  graph: { points: '0,0 600,140', area: '0,0 600,140 600,140 0,140', min: 400000, last: 500000 },
  recommendations: {
    captains: [{ player: player(3, 'Saka'), reasons: ['Form 5.5', 'Lett kamp'] }],
    transfers: [{
      out: { player: player(4, 'Watkins'), reasons: ['Ute av form'] },
      inn: [{ player: player(6, 'Isak'), }],
    }],
  },
  teamsById, POSITIONS_SHORT, formatNumber, formatPrice,
};

// Samme mønster for: players, league, brief, live, news, noTeam (ingen locals),
// error404 (ingen locals), error (locals: { message }) — les hvert view og
// dekk ALLE locals viewet refererer, inkl. grener (tomme lister, null-verdier).
```

      NB fra forrige plans avviksnotater: `graph`-fixturen over inkluderer
      `area` — feltet legges til i Task 3.7; skriv fixturen med feltet fra
      start så testen ikke må endres. `live`-fixturen må ha lagnavn med `<`
      i seg for å bevise at escapingen i `views/live.ejs` består
      (f.eks. `name: 'Lag <script>'`).
- [x] **Steg 2:** Opprett `test/views.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import ejs from 'ejs';
import * as fx from './fixtures/views.js';

const VIEWS = path.resolve('views');
function renderView(name, locals) {
  return ejs.renderFile(path.join(VIEWS, `${name}.ejs`), locals, { async: false });
}

const cases = [
  ['dashboard', fx.dashboard, 'Neste deadline'],
  ['team', fx.team, 'Marius XI'],
  ['players', fx.players, 'players-table'],
  ['league', fx.league, 'Differensialer'],
  ['brief', fx.brief, 'Gameweek'],
  ['live', fx.live, 'live-root'],
  ['news', fx.news, 'FPL-nyheter'],
  ['no-team', {}, 'FPL_TEAM_ID'],
  ['404', {}, '404'],
  ['error', fx.error, 'feil'],
];

for (const [name, locals, marker] of cases) {
  test(`views/${name}.ejs rendrer med mockdata og inneholder «${marker}»`, async () => {
    const html = await renderView(name, locals);
    assert.ok(html.includes(marker), `${name}: fant ikke «${marker}»`);
  });
}

test('live.ejs escaper < i lagnavn inne i script-blokken', async () => {
  const html = await renderView('live', fx.live);
  assert.ok(!html.includes('<script>Lag'), 'lagnavn brøt ut av script-taggen');
  assert.ok(html.includes('\\u003c'), 'forventet escapet <');
});
```

      Markørstrengene og locals-navnene VERIFISERES mot faktisk view-kilde når
      fixtures skrives — juster markører til tekst som faktisk finnes i viewet.
      `layout.ejs` testes ikke isolert (krever `body`-sammensetting fra
      `renderPage`); den dekkes indirekte av røyk-testen i Task 3.12.
- [x] **Steg 3:** `npm test` → alle view-testene grønne (39 + ~11 nye).
      Feiler noen: fiks FIXTUREN (viewet er fasit), ikke viewet.
- [x] **Steg 4:** `npm run lint` → 0 feil. Commit:
      `test: render-tester for alle views med mockdata`

      **Avvik fra planen (fire, alle fordi viewene/kildene er fasit):**
      1) `formatPrice` ligger i `analysis.js`, ikke `format.js` (som bare har
      `formatDateTime` og `formatNumber`), og `STATUS_LABELS` er ikke eksportert
      i det hele tatt — den er definert lokalt i både `routes/index.js` og
      `routes/players.js`. Fixturen importerer derfor `formatPrice`,
      `POSITIONS` og `POSITIONS_SHORT` fra `analysis.js` og definerer
      `STATUS_LABELS` selv.
      2) `views/error.ejs` tar ingen locals og inneholder ikke ordet «feil».
      Case-en er derfor `['error', {}, 'Noe gikk galt']`.
      3) Escaping-testen er skjerpet: fixturens lagnavn er
      `Lag </script><img src=x onerror=alert(1)>`, og testen sjekker både at
      `</script><img` IKKE finnes i HTML-en, at `</script` finnes, og at
      JSON-en fortsatt parses tilbake til det opprinnelige navnet. I tillegg
      er det lagt til tre tester som låser escapingen i `news.ejs` og
      `brief.ejs` (`**fet**` bevares, `<script>` og `&` escapes,
      `javascript:`-lenker blir `#`) — avviksnotatene i forrige plan sier
      eksplisitt at denne escapingen ikke skal fjernes.
      4) 17 render-cases i stedet for ~11: hvert view med tomtilstand
      (dashboard uten deadline, team uten tropp, liga uten ligaer + tom
      differensial, brief uten AI og uten FPL_TEAM_ID, live uten gameweek,
      nyheter uten saker) rendres som egen case, slik at makeoveren ikke kan
      brekke en gren som ikke vises i prod før sesongstart.
      Resultat: `npm test` 61/61 grønne (39 + 22 nye), `npm run lint` 0 feil.

---

## Milepæl 3 — UI-makeover «Matchday» (v1.1.0)

### Designretning (forpliktende — foreslått og begrunnet, ikke åpent)

**Grunnlag:** Dette er et FPL-verktøy som brukes mest på telefon, på kampkvelder
og i timene før deadline. Den visuelle verdenen er Premier Leagues egen:
dyp fiolett, gressgrønn, broadcast-grafikk, scoreboards. Dagens palett er
riktig verden, men utførelsen er generisk («mørk flate + grønn aksent» er
standardsvaret alle AI-genererte mørke temaer gir). Det som skal gjøre dette
distinkt er IKKE en ny palett — det er:

1. **Typografien**: Archivo (variabel, lokal) som display-snitt for tall og
   titler gir scoreboard-karakter; brødtekst forblir systemfont
2. **Signaturen**: deadline-heroen som broadcast-scoreboard (GW-«bug»,
   store kondenserte sifre, gradient-hairline grønn→magenta i bunnkant)
   — dét er stedet dristigheten brukes; alt annet holdes stramt
3. **Aksent-økonomi**: grønn = handling/positivt, magenta = KUN kaptein,
   live-puls og negative varsler. Aldri begge på samme element
4. **Rytme**: én spacing-skala, ett korthode-mønster, én tabellstil —
   gjennomført identisk på alle 11 views

**Mørkt tema beholdes** (kampkveld + telefon = mørkt er riktig, og det er
identiteten fra v1). Ingen lys-modus — det er utenfor scope og dobler
vedlikeholdet for én bruker.

**Beholdes uendret:** all tilgjengelighet (se Globale rammer), alle
eksisterende klassenavn og ID-er (kontrakten med app.js), FDR-fargekonvensjonen
1→5, all norsk tekst, `renderPage`-mekanismen.

**Rekkefølgen er én side per commit** — hver commit er deploybar og QA-es av
brukeren på telefon før neste side startes (se Task 3.12).

### Task 3.1: Lokal font — Archivo (variabel, OFL)

**Files:**
- Create: `public/fonts/archivo-var.woff2`, `public/fonts/OFL.txt`
- Modify: `views/layout.ejs` (preload-lenke)

- [x] **Steg 1:** Hent Google Fonts-CSS-en med nettleser-UA og finn
      latin-subsettets woff2-URL:

```powershell
(Invoke-WebRequest "https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&display=swap" -Headers @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36" } -UseBasicParsing).Content
```

      I svaret: finn `/* latin */`-blokken og kopier `src: url(…woff2)`.
- [x] **Steg 2:** Last ned til `public/fonts/archivo-var.woff2` og sjekk
      størrelsen: `(Get-Item public/fonts/archivo-var.woff2).Length / 1KB`.
      **Budsjett: ≤ 100 KB.** Over budsjett → snevre inn til
      `wght@500..800` i steg 1-URL-en og gjenta.
- [x] **Steg 3:** Hent lisensen til `public/fonts/OFL.txt`:

```powershell
Invoke-WebRequest "https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/OFL.txt" -OutFile public/fonts/OFL.txt -UseBasicParsing
```

- [x] **Steg 4:** Øverst i ny `public/style.css` (Task 3.2):

```css
@font-face {
  font-family: 'Archivo';
  src: url('/fonts/archivo-var.woff2') format('woff2-variations');
  font-weight: 400 900;
  font-display: swap;
}
```

      og i `views/layout.ejs` `<head>`, før stilarket:

```html
  <link rel="preload" href="/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
```

- [x] **Steg 5:** Commit: `feat: lokal Archivo-font for display og tall (OFL)`
      (kan committes sammen med Task 3.2 hvis CSS-en skrives i samme sleng).

      **Avvik fra planen (to små):** 1) `@font-face` fikk også
      `font-stretch: 100%`, slik Google Fonts selv deklarerer Archivo — fonten
      har en wdth-akse, og uten deklarasjonen kan nettleseren velge en annen
      bredde-instans enn den vi har kontrastvurdert. 2) Latin-subsettet
      (`U+0000–00FF`) dekker æøå, så `wght@400..900` kunne beholdes:
      **34,1 KB**, godt under budsjettet på 100 KB — ingen innsnevring nødvendig.
      Committet sammen med Task 3.2.

### Task 3.2: Token-fornyelse + base

**Files:**
- Modify: `public/style.css` (`:root` + base-reglene; resten av filen
  skrives om side-for-side i 3.3–3.10)

- [x] **Steg 1:** Erstatt `:root` med (dette er fasiten — nye farger som
      trengs senere legges til HER som tokens, aldri hardkodet):

```css
:root {
  /* Flater — dyp fiolett kampkveld, tre nivåer + hairline-kanter */
  --bg: #0d0a15;
  --surface: #151021;
  --surface-2: #1d172e;
  --surface-3: #262039;
  --border: rgba(160, 145, 220, 0.14);
  --border-strong: rgba(160, 145, 220, 0.3);

  /* Tekst */
  --text: #f0edfa;
  --text-dim: #a49bc4;
  --text-faint: #746b96; /* KUN dekor/store tall — ikke løpende tekst */

  /* Aksenter — grønn = handling/positivt, magenta = kaptein/live/negativt varsel */
  --accent: #00e58c;
  --accent-soft: rgba(0, 229, 140, 0.12);
  --accent-2: #ff3d81;
  --accent-2-soft: rgba(255, 61, 129, 0.12);
  --negative: #ff6b8a;
  --warn-bg: #352b12;
  --warn-border: #8a6d1f;
  --warn-text: #f5cf6b;

  /* FDR — FPL-konvensjon 1 lett → 5 vanskelig. 1–2 får mørk tekst, 4–5 hvit */
  --fdr-1: #0e8c4f;
  --fdr-2: #27a35f;
  --fdr-3: #4a4168;
  --fdr-4: #d24069;
  --fdr-5: #97183f;
  --fdr-blank: #221b36;

  /* Typografi */
  --font-display: 'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Mono', Consolas, 'SF Mono', monospace;

  /* Rytme */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2.5rem;
  --radius: 12px;
  --radius-sm: 8px;
  --pad: 1rem;
  --maxw: 1160px;
}
```

- [x] **Steg 2:** Kjør kontrastsjekken. Opprett midlertidig
      `kontrast.mjs` i scratchpad-mappen (IKKE i repoet):

```js
// WCAG-kontrast for tokenparene i den nye paletten.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2);
};
const pairs = [
  ['tekst pa bg', '#f0edfa', '#0d0a15', 4.5],
  ['tekst pa surface', '#f0edfa', '#151021', 4.5],
  ['dim pa surface', '#a49bc4', '#151021', 4.5],
  ['dim pa surface-2', '#a49bc4', '#1d172e', 4.5],
  ['accent pa bg', '#00e58c', '#0d0a15', 4.5],
  ['accent-2 pa surface', '#ff3d81', '#151021', 3.0],
  ['warn-tekst pa warn-bg', '#f5cf6b', '#352b12', 4.5],
  ['mork tekst pa fdr-1', '#0d0a15', '#0e8c4f', 3.0],
  ['mork tekst pa fdr-2', '#0d0a15', '#27a35f', 3.0],
  ['hvit pa fdr-4', '#ffffff', '#d24069', 3.0],
  ['hvit pa fdr-5', '#ffffff', '#97183f', 3.0],
];
for (const [navn, fg, bg, krav] of pairs) {
  const r = ratio(fg, bg);
  console.log(`${r >= krav ? 'OK  ' : 'FEIL'} ${navn}: ${r} (krav ${krav})`);
}
```

      Kjør `node kontrast.mjs`. **Alle par skal si OK.** Feiler et par:
      juster tokenet (mørkere flate / lysere tekst) til det passerer, og
      oppdater `:root`. FDR-merkene og magenta-status er små+fete → 3.0-kravet
      gjelder dem som grafiske objekter; løpende tekst krever 4.5.
- [x] **Steg 3:** Oppdater base-reglene: `body` får `font-family: var(--font-body)`,
      `h1`–`h2` og `.stat-val`/`.countdown .val` får `font-family: var(--font-display)`
      med `font-variant-numeric: tabular-nums` på tall-elementene. `main` og
      `footer` bruker `max-width: var(--maxw)`. FDR-regelen oppdateres:
      `.fdr-1, .fdr-2 { color: var(--bg); }` (mørk tekst på lys grønn).
- [x] **Steg 4:** `npm test` (view-testene fra M2 er sikkerhetsnettet) +
      `npm run lint` → grønne. Lokal røyk: `npm run dev`, curl `/` → 200.
- [x] **Steg 5:** Commit: `feat: nye designtokens, kontrastverifisert palett og typografi`

### Task 3.3: Topbar og navigasjon

**Files:**
- Modify: `views/layout.ejs`, `public/style.css`, `public/app.js`

Sju lenker brekker til 2–3 linjer på mobil i dag. Løsning: topbaren forblir
én linje overalt — på mobil blir nav-en horisontalt scrollbar med
edge-fade, og aktiv lenke scrolles inn ved lasting. Sticky gjeninnføres på
mobil (den er nå bare ~48 px høy). Ingen hamburger/JS-meny — null ekstra
tilstand, alt synlig med ett sveip.

- [x] **Steg 1:** CSS (erstatter dagens `.topbar`-blokk og mobil-unntaket):

```css
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0.7rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.wordmark {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: var(--text);
  flex: 0 0 auto;
}

.wordmark span { color: var(--accent); font-weight: 600; }

.topbar nav {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.topbar nav::-webkit-scrollbar { display: none; }

.topbar nav a {
  flex: 0 0 auto;
  color: var(--text-dim);
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  font-size: 0.92rem;
  font-weight: 500;
}

.topbar nav a:hover { color: var(--text); background: var(--surface-2); text-decoration: none; }

.topbar nav a[aria-current='page'] {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}

@media (max-width: 640px) {
  .topbar { gap: var(--space-3); padding: 0.55rem 0.9rem; }
  .topbar nav {
    mask-image: linear-gradient(90deg, transparent, #000 14px, #000 calc(100% - 14px), transparent);
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 14px, #000 calc(100% - 14px), transparent);
  }
}
```

      NB: `backdrop-filter`/`color-mix` har fallback — behold
      `background: var(--surface);` som egen linje FØR color-mix-linjen.
- [ ] **Steg 2:** Nytt i toppen av `public/app.js` (modul 0):

```js
// Modul 0: Scroll aktiv nav-lenke inn i syne pa smale skjermer.
(function () {
  'use strict';
  const active = document.querySelector('.topbar nav a[aria-current="page"]');
  if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
})();
```

- [ ] **Steg 3:** `npm test` + lint + lokal røyk (`/` 200, nav-markup intakt).
      Commit: `feat: en-linjes scrollbar navigasjon med sticky topbar`
- [ ] **Steg 4:** Push → verifiser prod 200 → **QA-runde 1 til bruker**
      (se checklisten i Task 3.12: topbar/nav på telefon).

### Task 3.4: Hero-scoreboard på dashboardet (signaturen)

**Files:**
- Modify: `views/dashboard.ejs` (hero-seksjonen), `public/style.css`

- [ ] **Steg 1:** Ny hero-markup i `views/dashboard.ejs` (grenen med deadline):

```ejs
<section class="hero">
  <p class="eyebrow"><span class="gw-badge"><%= deadlineEvent.name %></span> Neste deadline</p>
  <p class="hero-date"><%= formatDateTime(deadlineEvent.deadline_time) %></p>
  <div class="countdown" data-deadline="<%= deadlineEvent.deadline_time %>">
    <div class="unit"><span class="val" data-unit="d">–</span><span class="lbl">dager</span></div>
    <div class="unit"><span class="val" data-unit="h">–</span><span class="lbl">timer</span></div>
    <div class="unit"><span class="val" data-unit="m">–</span><span class="lbl">min</span></div>
    <div class="unit"><span class="val" data-unit="s">–</span><span class="lbl">sek</span></div>
  </div>
</section>
```

      (h1-en «Neste deadline» flyttes inn i eyebrow-linjen — sifrene ER
      overskriften. Behold en visuelt skjult h1 for skjermlesere:
      `<h1 class="sr-only">Neste deadline <%= deadlineEvent.name %></h1>`
      og legg `.sr-only`-hjelperen i CSS-en.)
- [ ] **Steg 2:** CSS:

```css
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 70%, #241a3d 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-6) var(--pad);
  margin-bottom: var(--space-5);
  text-align: center;
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.gw-badge {
  display: inline-block;
  background: var(--surface-3);
  border: 1px solid var(--border-strong);
  border-radius: 99px;
  padding: 0.15rem 0.7rem;
  margin-right: var(--space-2);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
}

.countdown .val {
  font-family: var(--font-display);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: clamp(2.6rem, 9vw, 4.2rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

      Behold `.eyebrow`, `.hero-date`, `.countdown`-flex og `.deadline-passed`
      fra i dag (juster farger til nye tokens). **Akseptkriterium:** sifrene
      tikker uten at bredden hopper (tabular-nums virker i Archivo) — hopper
      de, bytt `.countdown .val` til `var(--font-mono)` og noter avviket.
- [ ] **Steg 3:** `npm test` (dashboard-fixturen fanger markup-brekkasje) +
      lint + lokal røyk. Commit: `feat: hero som broadcast-scoreboard`
- [ ] **Steg 4:** I samme økt: restyle resten av dashboardet med
      kort-/tabellsystemet fra Task 3.5 (kommer i neste commit — 3.5 gjøres
      før dashboardets øvrige kort pushes). Push + **QA-runde 2** (hero +
      dashboard på telefon).

### Task 3.5: Kort- og tabellsystemet (gjelder alle sider)

**Files:**
- Modify: `public/style.css`

Ett mønster, brukt identisk overalt. Ingen view-endringer i denne tasken —
klassenavnene finnes alt.

- [ ] **Steg 1:** Erstatt dagens `.card`/`.grid`/tabell-regler:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad);
  min-width: 0;
}

.card h2 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}

table.data {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  white-space: nowrap;
}

table.data th {
  text-align: left;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  font-weight: 600;
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--border-strong);
}

table.data td {
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

table.data tbody tr:last-child td { border-bottom: none; }
table.data tbody tr:hover { background: var(--surface-2); }
```

      `th`-fargen `--text-faint` er under 4.5:1 med vilje — kolonneoverskrifter
      er korte, fete og repetitive; HOLDER de ikke 3:1 i kontrastsjekken,
      bruk `--text-dim`. `.num`, `.accent`, `.negative`, `.dim`, `.status-*`
      beholdes med nye token-verdier.
- [ ] **Steg 2:** Sticky tabellhode i scroll-containere (gjelder /spillere
      og FDR-matrisen):

```css
.table-scroll { overflow: auto; max-height: 75vh; }

.table-scroll table.data thead th {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}
```

- [ ] **Steg 3:** `npm test` + lint + lokal røyk på `/` og `/spillere`.
      Commit: `feat: enhetlig kort- og tabellsystem`

### Task 3.6: /spillere — filterpanel og tabell

**Files:**
- Modify: `views/players.ejs`, `public/style.css`

Direktiver (les viewet først; behold alle ID-er og `data-*`-attributter —
app.js modul 2 er kontrakten):

- Filterpanelet blir en `.card` med samme korthode-mønster; inputs får
  `--surface-2`-bakgrunn, `--radius-sm`, tydelig fokusring
- «Viser X av Y»-telleren (`#filter-count`) høyrestilles i panelhodet
- Sorteringsindikatorene ↑/↓ beholdes (aria-sort-CSS-en finnes); aktiv
  sortert kolonne får `color: var(--accent)` også på teksten
- Status-merkene (`.status-*`) beholdes som pills med nye tokens
- **Akseptkriterier:** sortering og filtrering virker (test i nettleser hos
  bruker — QA-runde 3), tabellhodet er sticky under scroll, ingen horisontal
  sidescroll på telefon (kun inne i `.table-scroll`)

- [ ] **Steg 1:** Les `views/players.ejs`, restyle per direktivene
- [ ] **Steg 2:** `npm test` + lint + lokal røyk (`/spillere` 200,
      `players-table` i HTML). Commit: `feat: spillersiden i nytt design`
- [ ] **Steg 3:** Push → prod-sjekk → **QA-runde 3** (filtrering+sortering på telefon)

### Task 3.7: /lag — pitch med banemerking + rank-graf (TDD på analysis)

**Files:**
- Modify: `views/team.ejs`, `public/style.css`,
  `src/services/analysis.js`, `test/analysis.test.js`

**Interfaces:**
- Produces: `rankGraph(...)` returnerer i tillegg `area: string | null` —
  lukket polygon for arealfyll (`null` ved < 2 punkter)

Last `dataviz`-skillen før denne tasken (rank-grafen er datavisualisering).

- [ ] **Steg 1 (RED):** I `test/analysis.test.js`, legg til:

```js
test('rankGraph gir lukket areal-polygon under linjen', () => {
  const g = rankGraph([{ event: 1, overall_rank: 100 }, { event: 2, overall_rank: 50 }], 600, 140);
  assert.equal(g.area, `${g.points} 600,140 0,140`);
});

test('rankGraph gir null-areal for ett punkt', () => {
  const g = rankGraph([{ event: 1, overall_rank: 5 }], 600, 140);
  assert.equal(g.area, null);
});
```

- [ ] **Steg 2:** `npm test` → de to nye FEILER (`area` er undefined).
- [ ] **Steg 3 (GREEN):** I `rankGraph` i `src/services/analysis.js`: utvid
      returobjektet med
      `area: n > 1 ? \`${points} ${width},${height} 0,${height}\` : null`
      (bruk funksjonens faktiske variabelnavn for antall punkter og
      points-strengen — les funksjonen først). `npm test` → grønn.
- [ ] **Steg 4:** Ny SVG i `views/team.ejs` (erstatter dagens `.rank-graph`-blokk):

```ejs
<svg class="rank-graph" viewBox="-8 -8 616 156" preserveAspectRatio="none" role="img" aria-label="Rankutvikling">
  <defs>
    <linearGradient id="rank-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity="0.22" />
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0" />
    </linearGradient>
  </defs>
  <% for (const y of [0, 70, 140]) { %>
    <line x1="0" y1="<%= y %>" x2="600" y2="<%= y %>" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke" />
  <% } %>
  <% if (graph.area) { %><polygon points="<%= graph.area %>" fill="url(#rank-fill)" /><% } %>
  <polyline points="<%= graph.points %>" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
</svg>
```

      Hint-linjen under beholdes («Best/Nå», lavere er bedre).
- [ ] **Steg 5:** Pitch med banemerking — erstatt `.pitch`-CSS-en:

```css
.pitch {
  --pitch-line: rgba(240, 253, 248, 0.09);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow: hidden;
  background:
    radial-gradient(circle 3.5rem at 50% 100%, transparent calc(3.5rem - 2px), var(--pitch-line) calc(3.5rem - 1px), transparent 3.5rem),
    repeating-linear-gradient(180deg, rgba(0, 229, 140, 0.055) 0 3rem, rgba(0, 229, 140, 0.03) 3rem 6rem),
    linear-gradient(180deg, rgba(0, 229, 140, 0.05), rgba(0, 229, 140, 0.015));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5) var(--space-2) var(--space-6);
}

/* 16-meteren overst (keeperens ende) */
.pitch::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(60%, 22rem);
  height: 3.2rem;
  border: 1px solid var(--pitch-line);
  border-top: none;
  border-radius: 0 0 6px 6px;
  pointer-events: none;
}
```

      Chips: `--surface`-bakgrunn med svak skygge, kaptein får
      magenta-ring (`box-shadow: 0 0 0 2px var(--accent-2)`), benken
      som egen dempet rad under (som i dag). Statstripen (`.stat`) får
      display-font på tallene og venstrestilt label.
- [ ] **Steg 6:** `npm test` (team-fixturen har `area`-feltet fra M2) + lint +
      mock-render-sjekk. Commit: `feat: lagsiden med banemerking og arealgraf`
- [ ] **Steg 7:** Push → prod-sjekk → **QA-runde 4** (pitch + graf; NB: prod
      viser tomtilstand til sesongstart — brukeren QA-er graf/pitch etter
      21. aug, resten av siden nå).

### Task 3.8: /live — scoreboard-modus

**Files:**
- Modify: `views/live.ejs`, `public/app.js` (modul 3), `public/style.css`

Direktiver (les viewet og app.js modul 3 samlet — **render-funksjonen i
app.js genererer samme markup som viewet; de endres i samme commit**):

- Kampstillinger som scoreboard-kort: lagnavn i display-font, poeng i stort
  mono/tabular, status («12'», «Slutt») som liten pill
- Egne spillere-tabellen: kapteinsmerket (`.cap`) og bonus-kolonnen (`+2`)
  med `--accent`, benkerader dempet som i dag (opacity via klasse
  `.row-bench` i stedet for inline-style — legg klassen i CSS og bruk den i
  app.js-render-funksjonen)
- «Sist oppdatert»-pulsen beholdes; `<` -escapingen i script-blokken
  beholdes (view-testen fra M2 låser den)
- **Akseptkriterium:** `npm test` grønn OG mock-render av live-viewet med
  fixture-data gir samme klassestruktur som app.js-render-funksjonen
  produserer (sammenlign manuelt de to markup-kildene felt for felt)

- [ ] **Steg 1:** Restyle view + synkroniser app.js modul 3
- [ ] **Steg 2:** `npm test` + lint + lokal røyk. Commit:
      `feat: live-siden som scoreboard`
- [ ] **Steg 3:** Push → prod-sjekk (full QA av live-innholdet skjer i M4
      sjekkpunkt B når kamper faktisk går)

### Task 3.9: /liga, /brief, /nyheter

**Files:**
- Modify: `views/league.ejs`, `views/brief.ejs`, `views/news.ejs`,
  `public/style.css`

Direktiver (én commit per side, samme kort-/tabellsystem):

- **/liga:** miniligatabeller med rank-pil i `--accent`/`--negative`,
  egen rad (`.row-me`) med `--accent-soft` + venstre kantstripe
  (`box-shadow: inset 3px 0 0 var(--accent)`); differensial-seksjonen med
  tydelig «deg vs. rival»-hode
- **/brief:** AI-briefen i eget kort med «AI»-merke i korthodet og
  `--accent-2`-hairline på venstre kant; data-briefen under med dagens
  struktur; deadline-linjen gjenbruker `.gw-badge`
- **/nyheter:** AI-punktene først (samme AI-merkede kort), feed-listen som
  ren liste med kilde + tid i `--text-dim`; eksterne lenker beholder
  `safeLink()`-escapingen
- **Akseptkriterier:** alle tre sider 200 lokalt og i prod, view-testene
  grønne, AI-merkingen gjør det tydelig hva som er AI-generert vs. rådata

- [ ] **Steg 1–3:** Én side per commit:
      `feat: ligasiden i nytt design` / `feat: briefsiden i nytt design` /
      `feat: nyhetssiden i nytt design`. Push + prod-sjekk etter hver.
      → **QA-runde 5** (alle tre på telefon)

### Task 3.10: Tom-, feil- og lastetilstander

**Files:**
- Modify: `views/404.ejs`, `views/error.ejs`, `views/no-team.ejs`,
  `public/style.css`, `public/app.js` (modul 4)

- [ ] **Steg 1:** Felles tomtilstands-mønster i CSS (dagens `.empty-state`
      beholdes som navn):

```css
.empty-state {
  text-align: center;
  padding: var(--space-6) var(--space-4);
  max-width: 34rem;
  margin: 0 auto;
}

.empty-code {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--accent-2);
  margin: 0;
  line-height: 1;
}

.empty-state h1 { font-size: 1.25rem; margin: var(--space-2) 0; }
.empty-state p { color: var(--text-dim); }
.empty-state a { font-weight: 600; }
```

      Hver tomtilstand skal si (1) hva som skjedde, (2) hva brukeren kan
      gjøre — aldri bare «ingen data». Gå gjennom ALLE `.empty`-tekster i
      views-ene og skjerp språket etter dette mønsteret (f.eks. «Fant ingen
      lagoppstilling ennå — sesongen starter 21. august kl. 19:30» i stedet
      for «sesongen har kanskje ikke startet»).
- [ ] **Steg 2:** AI-rådgiverens lastetilstand (app.js modul 4): erstatt
      «Henter råd …»-teksten med en animert tre-prikker-indikator
      (CSS-animasjon bak `prefers-reduced-motion: no-preference`; statisk
      «Henter råd …» ellers). Behold knappens `disabled`-håndtering.
- [ ] **Steg 3:** `npm test` + lint + lokal røyk på `/lag` uten FPL_TEAM_ID
      (no-team-siden) og ukjent sti (404). Commit:
      `feat: gjennomdesignede tom- og feiltilstander`

### Task 3.11: Mobil-finpuss + bevegelse

**Files:**
- Modify: `public/style.css`

- [ ] **Steg 1:** Gå gjennom media queries: 640px-brytpunktet fra Task 3.3 +
      behold 480px-justeringene (marger, ordbryting, filterbredder) mot nye
      tokens. `overflow-wrap: anywhere` på body under 480px beholdes.
- [ ] **Steg 2:** Bevegelse: alle transitions/animasjoner samles bak
      `@media (prefers-reduced-motion: no-preference)`. Tillatt: nav-hover,
      rad-hover, puls, tre-prikker. IKKE tillatt: scroll-animasjoner,
      parallax, innflygninger — «clean» betyr rolig.
- [ ] **Steg 3:** Død-CSS-sjekk: grep hver klasse i style.css mot `views/` og
      `public/app.js`; fjern regler ingen bruker. Forventet: null ubrukte
      klasser i den ferdige filen.
- [ ] **Steg 4:** `npm test` + lint. Commit: `chore: mobil-finpuss og css-opprydding`

### Task 3.12: QA-protokoll + release v1.1.0

Verken økten eller brukeren har nettleser i arbeidsflyten — kvalitetssikring
skjer ved at brukeren åpner prod på telefon (primært) og desktop (sekundært)
etter hver QA-runde og rapporterer per checkliste. **Rapportformat:**
`SIDE · ENHET · FUNN` (f.eks. «/spillere · iPhone · sticky-hodet hopper ved
scroll»), gjerne med skjermbilde.

- [ ] **Steg 1:** QA-runder underveis (definert i taskene over):
      1. Topbar/nav: én linje? Sveipbar på mobil? Aktiv side markert og synlig
         uten sveip? Sticky uten å dekke innhold?
      2. Dashboard: heroen — ser den ut som et scoreboard? Tikker sifrene uten
         hopp? FDR-matrisen lesbar på telefon? Gradient-linjen synlig?
      3. /spillere: filtrering/sortering virker? Sticky tabellhode? Ingen
         sidescroll på selve siden?
      4. /lag: banemerkingen synlig men diskret? Kapteinsringen tydelig?
         Grafen med arealfyll lesbar?
      5. /liga + /brief + /nyheter: AI-merkingen tydelig? Egen rad uthevet i
         ligatabellen?
- [ ] **Steg 2:** Sluttrøyk lokalt: alle ti ruter 200, 404 på ukjent sti,
      `npm test` + `npm run lint` grønne. Vis outputen.
- [ ] **Steg 3:** Release v1.1.0: CHANGELOG (flytt Unreleased → 1.1.0 med
      dato), ROADMAP (ny v1.1.0-seksjon avhuket), `package.json`-bump,
      `docs: release v1.1.0`, tag, push med tags. Verifiser footer i prod.
- [ ] **Steg 4:** Oppdater HANDOVER: status, QA-funn som gjenstår, neste steg.

---

## Milepæl 4 — Sesongstart-verifisering (kalenderstyrt, 21.–24. aug)

Tre sjekkpunkter. Funn som krever kodefiks blir egne
fix-commits (+ patch-release hvis brukersynlig). Husk fra HANDOVER: tomme
sider FØR deadline er tilsiktet — ikke tolk dem som feil.

### Sjekkpunkt A — rett etter deadline (torsdag 21. aug ~20:00)

- [ ] `/lag`: ekte oppstilling vises — 15 spillere fordelt på pitch + benk,
      C/V-merker riktig, statstripe med ekte GW-tall, ingen tomtilstand
- [ ] `/lag`: anbefalingene (kaptein topp 3 med begrunnelser, salgskandidater
      med erstattere innenfor budsjett) gir mening mot ekte tropp
- [ ] `/lag`: «Spør AI om råd» → svar på norsk innen ~20 s, begrunnet, uten
      hallusinerte spillere; andre klikk innen timen → samme svar (cache),
      ingen ny `AI-kall:`-linje i Coolify-loggen
- [ ] `/api/ai-rad` med curl: 200 + JSON med `text`
- [ ] `/brief`: «Mine anbefalinger»-delen er fylt (krever FPL_TEAM_ID satt i
      Coolify — sjekk at den er der samtidig med nøklene i Task 1.5)
- [ ] `/liga`: ligatabeller kan først fylles etter første kamper — noter
      hva som faktisk vises; tomtilstand her er OK fram til sjekkpunkt B

### Sjekkpunkt B — under første kampdag (fredag 22. / lørdag 23. aug)

- [ ] `/live` mens kamper pågår: live-poeng per spiller, minutter,
      bonusestimat (+1/+2/+3) på spillere med høy BPS, effektive poeng med
      kapteindobling, benkespillere dempet
- [ ] Pulsen lyser + «Kamper pågår»; siden oppdaterer seg selv hvert 60. s
      (se Network-fanen eller la telefonen ligge — «Sist oppdatert» tikker)
- [ ] Kampstillinger stemmer med virkeligheten (sammenlign med TV/livescore)
- [ ] Miniliga-toppen på `/live` viser GW-poeng som beveger seg
- [ ] Dashboard/`/spillere` under kampoppdatering: får FPL-API-et 503,
      vises banneret «FPL oppdaterer spillet …» i stedet for krasj
- [ ] Etter kampslutt (ingen kamper i gang): pollingen STOPPER (Network-fanen
      viser ingen nye `/api/live.json`-kall; pulsen slukker)

### Sjekkpunkt C — etter at runden er ferdig (søndag 24. aug / mandag 25.)

- [ ] `/lag`: rank-grafen har fått sitt første ekte punkt; «Best/Nå» stemmer
- [ ] `/liga`: tabellene fylt, rank-piler etter GW2 (første GW har ingen
      endring å vise — noter forventningen), egen rad uthevet, differensialer
      mot leder gir mening
- [ ] `/live` etter runden: «Ingen kamper pågår», ingen polling
- [ ] Bonusen i `/live`-estimatet vs. fasit: stemte 3/2/1-fordelingen i de
      fleste kampene? Noter avvik (delte plasser er kjent edge-case med test)
- [ ] Alle funn → HANDOVER + evt. fix-commits + `docs:`-oppdateringer

## Milepæl 5 — Avslutning

- [ ] **(BRUKER)** Bekreft mobilvisningen på ekte telefon — hele QA-listen i
      Task 3.12 er dekket når rundene 1–5 er rapportert
- [ ] **(BRUKER)** Skjermbilder til README: dashboard, /lag og /live (gjerne
      etter sjekkpunkt B så live-siden har ekte innhold), lagres i
      `docs/skjermbilder/` og lenkes fra README
- [ ] Legg skjermbildene inn i README (`![Dashboard](docs/skjermbilder/…)`),
      commit `docs: skjermbilder i README`
- [ ] Sluttoppdater ROADMAP/CHANGELOG/HANDOVER; evt. patch-release v1.1.x
      for fikser fra M4

---

## Blokkert av bruker vs. økten

| Hvem | Hva | Når |
|---|---|---|
| Bruker | Nøkkel i lokal `.env` (Task 1.3), webhook-URL (Task 1.4) | Straks økten ber om det |
| Bruker | `ANTHROPIC_API_KEY` + `DISCORD_WEBHOOK_URL` + `FPL_TEAM_ID` i Coolify (Task 1.5) | Før 20. aug ~19:00 for naturlig auto-brief-test |
| Bruker | QA-runder 1–5 på telefon/desktop (Task 3.12) | Etter hver push i M3 |
| Bruker | Skjermbilder + mobilbekreftelse (M5) | Etter M3/M4 |
| Økten | Alt annet: kode, tester, commits, pushes, prod-verifisering, docs | — |

## Kostnadsestimat AI (fra claude-api-skillens pristabell 2026)

Sonnet 5: $3/M inn, $15/M ut (intro $2/$10 t.o.m. 31. aug). Haiku 4.5: $1/$5.
Med dagens cache-regler (nyheter maks 1/30 min ved besøk, brief 1/t/GW,
rådgiver 1/t, auto-brief 1–2/uke) og én bruker:
**realistisk ~$1–1.5/uke, tak ~$3–4/uke.** Task 1.2 gir ekte tall i loggen;
Task 1.7 definerer tiltakstrappen (prompt → modellbytte).

## Estimater

| Milepæl | Økter | Kommentar |
|---|---|---|
| M1 | ~½ økt + venting | Må startes i dag/i morgen tidlig (tidsvinduet) |
| M2 | ~¼ økt | Første del av UI-økten |
| M3 | 1–2 økter | Størst; én side per commit, QA mellom |
| M4 | 3 × ~½ time | Kalenderstyrt 21.–24. aug |
| M5 | ~¼ økt | Mest bruker |

## Overlevering (gjøres av planleggingsøkten straks planen er godkjent)

Planen skal UTFØRES av en ny økt (Opus 5, effort xhigh). Planleggingsøkten
gjør derfor kun dette ved godkjenning, og stopper så:

1. Skriv hele denne planen til
   `docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`
2. Skriv kjøreprompten under til `docs/neste-okt-prompt-utforelse.md`
3. Oppdater `docs/HANDOVER.md`: status («plan for v1.0.1–v1.1.0 foreligger,
   utførelse ikke startet»), pekere til begge filene, og loggfør brukerens
   beskjeder fra planleggingsøkten (avklaringene + «kjøres i Opus 5 xhigh»)
4. Commit alt: `chore: implementeringsplan og kjoreprompt v1.0.1-v1.1.0`,
   push, verifiser at prod fortsatt svarer 200 (docs-endring, men main
   deployer)

### Kjørepromptens innhold (lagres som `docs/neste-okt-prompt-utforelse.md`)

```markdown
# Prompt til utførelsesøkten (Opus 5, effort xhigh)

> Lim inn alt under streken som første melding i en ny økt i
> `c:\Users\mariu\Documents\Claude Code\FPL`.

---

Du jobber i `c:\Users\mariu\Documents\Claude Code\FPL` — et selvhostet
Fantasy Premier League-dashboard i produksjon på https://fpl.marsk.no.
Push til `main` deployer rett i prod via Coolify.

**Oppdraget: utfør planen i
`docs/superpowers/plans/2026-08-19-fpl-v101-v110-verifisering-og-ui-makeover.md`
— hele, i rekkefølge, uten å hoppe over verifiseringssteg.**

1. **Les først, i denne rekkefølgen:** `docs/HANDOVER.md`, `CLAUDE.md`,
   deretter HELE planfilen. Kjør så `git status`, `npm test` og
   `npm run lint` og se selv at utgangspunktet er grønt før du endrer noe.
2. **Arbeidsform:** bruk superpowers:executing-plans. Ikke bruk subagenter
   til implementering. Last `frontend-design`-skillen når Milepæl 3 starter
   og `dataviz`-skillen før Task 3.7. TDD der planen sier det: se testen
   feile før du implementerer.
3. **Avkryssing og avvik:** huk av `- [ ]` i planfilen etter hvert steg.
   Stemmer ikke virkeligheten med planen (feil linjenummer, API-overraskelse,
   bedre løsning): gjør det riktige, og skriv et `**Avvik fra planen:**`-notat
   på steget — som i forrige plan. Avviksnotatene er dokumentasjon, ikke nederlag.
4. **Tidskritisk:** Milepæl 1 skal være i prod før onsdag 20. aug ~19:00 —
   auto-briefen sender naturlig 19:30. Spør brukeren om env-verdiene
   (Task 1.3/1.4/1.5) STRAKS du når de stegene; brukeren har nøkkel og
   Discord-kanal klare.
5. **Faste regler:** grønn `npm test` + `npm run lint` før hver push; etter
   hver push: verifiser prod med
   `(Invoke-WebRequest https://fpl.marsk.no/<side> -UseBasicParsing).StatusCode`;
   conventional commits uten æøå, med trailer
   `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` byttet til din
   egen modell; ROADMAP/CHANGELOG/HANDOVER oppdateres ved hver delfunksjon;
   bruk Edit/Write-verktøyene (aldri `Get-Content -Raw`+`Set-Content`) på
   filer med norsk tekst; påstå aldri at noe virker uten å ha kjørt
   kommandoen og sett outputen; nærmer økten seg ~95 % usage: stopp,
   oppdater HANDOVER grundig, commit og push alt.
6. **QA-sløyfen i Milepæl 3:** etter hver QA-merket push, be brukeren åpne
   siden på telefon og rapportere per checklisten i Task 3.12
   (format `SIDE · ENHET · FUNN`) før du starter neste side. Funn fikses
   før neste side påbegynnes.
7. Milepæl 4 er kalenderstyrt (21.–24. aug) og vil normalt tilhøre senere
   økter — avslutt økten ryddig når du når et kalenderstyrtventepunkt:
   HANDOVER oppdatert, alt committet og pushet, og si tydelig hva neste
   økt skal gjøre.
```
