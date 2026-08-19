# FPL-dashboard v0.2.0 → v1.0.0 — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) eller superpowers:subagent-driven-development for å utføre planen oppgave for oppgave. Steg bruker `- [ ]`-avkrysning.

**Mål:** Fullføre FPL-dashboardet fra dagens deployede v0.1.0 til v1.0.0: spillertabell, mitt lag med anbefalinger, miniliga, brief, live-visning, nyheter med AI, AI-brief/rådgiver og auto-brief til Discord.

**Arkitektur:** Server-rendret Express 5 + EJS uten byggesteg. Dataflyt: routes → services → fplClient → FPL-API. All FPL-nettverkstrafikk kun i `src/services/fplClient.js`, all cache via `src/services/cache.js` (TTL + stale-while-revalidate + dedup). Ren, testet logikk i `src/services/analysis.js`. AI (valgfri) via felles `src/services/ai.js`.

**Tech stack:** Node 22+ (kjører 24), Express 5, EJS, compression, node:test, ESLint flat config. Nye avhengigheter KUN: `fast-xml-parser` (v0.7.0) og `@anthropic-ai/sdk` (v0.7.0). Ingen andre.

**Spec:** `CLAUDE.md` (arkitektur/konvensjoner) + `ROADMAP.md` (milepæler) + `docs/HANDOVER.md` (levende status). Les alle tre FØR første oppgave.

---

## Oppstartsprosedyre for utførende AI (ny økt — gjør dette først)

1. Les `CLAUDE.md`, `docs/HANDOVER.md`, `ROADMAP.md`, `CHANGELOG.md` i prosjektroten
2. Kjør `git status` (skal være ren, på `main`), `npm test` (18 tester grønne), `npm run lint` (grønn)
3. **KRITISK å forstå:** push til `main` → GitHub → Coolify auto-deployer RETT I PROD på https://fpl.marsk.no. Aldri push uten grønn `npm test` + `npm run lint`. Commit lokalt så ofte du vil; push ved milepæl-slutt (eller når noe deploybart er komplett).
4. Miljøet er Windows 11 + PowerShell 5.1 (ikke `&&` — bruk `;`). Node 24, npm 11, git 2.45, gh CLI innlogget (bruker `maskj2560`), Docker tilgjengelig.
5. **Modellvalg (brukerens ønske):** økten kjøres på **Claude Opus 5 med effort high**. Bruk subagenter sparsomt; når du gjør det, sett `model: "sonnet"` på Agent-kallet. IKKE bruk subagenter til selve implementeringen — gjør arbeidet inline, oppgavene er ferdig spesifisert.

### Faste regler for HELE planen (gjelder implisitt i hver oppgave)

- **Norsk UI-tekst overalt.** Bokmål, sentence case, klare verb.
- **Conventional commits** med trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (behold denne uansett hvilken modell som utfører — historikk-konsistens). I PowerShell: bruk here-string `@'...'@` for flerlinjers meldinger, og unngå æøå i commit-meldinger (PowerShell 5.1 kan mangle UTF-8; bruk a/o/aa).
- **Dokumenter kontinuerlig** (brukerkrav): ved hver delfunksjon/commit → huk av i `ROADMAP.md`, før inn i `CHANGELOG.md` under `[Unreleased]`, oppdater `docs/HANDOVER.md` (status + neste steg). Ved milepæl-slutt → flytt Unreleased til `[X.Y.0] - <dagens dato>`, bump `version` i `package.json`, commit `docs: release vX.Y.0`, tag `vX.Y.0`, push `git push origin main --tags`.
- **Logg alle brukerbeskjeder** i «Logg over brukerbeskjeder» i `docs/HANDOVER.md` (dato, essens, → handling).
- **Fortell brukeren hvor todo-listen er:** i FØRSTE svar i økten, si eksplisitt: «Live todo-liste: åpne `ROADMAP.md` i VS Code og trykk Ctrl+Shift+V (markdown-preview) — jeg huker av fortløpende. Detaljert fremdrift per oppgave: `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` (samme visning).» Huk av `- [ ]`-stegene i plan-filen etter hvert som de fullføres, i samme commit som endringen.
- **Ved ~95 % av brukerens usage-vindu:** stopp, oppdater HANDOVER grundig (nøyaktig WIP, gjenstående steg), commit + push alt.
- **TDD for all logikk** i `analysis.js`, `cache.js` og prompt-byggere: skriv test → se den feile (`npm test`) → implementer → se grønn. Views/routes/CSS testes med røyk-test.
- **Røyk-test-kommando** (tilpass sti/side):
  ```powershell
  $p = Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 2; (Invoke-WebRequest http://localhost:3000/SIDEN -UseBasicParsing).StatusCode; Stop-Process $p.Id -Force
  ```
  For sider som krever team-ID: opprett lokal `.env` med `FPL_TEAM_ID=<verdi>` — verdien står allerede i Coolify (spør bruker hvis ukjent; IKKE gjett). Uten `.env` skal sidene vise «sett FPL_TEAM_ID»-tilstanden — test begge.
- **AI-kostnadsdisiplin:** modell fra `config.aiModel` (default `claude-sonnet-5`), alt cachet med minimumsintervall, `max_tokens` ≤ 600 (nyheter) / ≤ 1500 (brief/råd). AI alltid valgfri — appen fungerer 100 % uten nøkkel.
- **Design:** gjenbruk tokens i `public/style.css` `:root` (--bg, --surface, --surface-2, --border, --text, --text-dim, --accent, --accent-2, --negative, --warn-*, --fdr-1..5, --font-body, --font-mono, --radius). Ingen nye farger utenom tokens; nye tokens legges i `:root`.

### Eksisterende kode utføreren bygger på (eksakte grensesnitt)

- `src/services/cache.js`: `getOrFetch(key, fetcher, {ttl}) → Promise<verdi>` (SWR + dedup), `clear()`, `_setNow(fn)`, `_flush()` (testhjelpere)
- `src/services/fplClient.js`: `getBootstrap()`, `getFixtures(gw?)`, `getElementSummary(id)`, `getEntry(teamId)`, `getEntryHistory(teamId)`, `getPicks(teamId, gw)`, `getLive(gw)`, `getLeagueStandings(leagueId, page=1)` — alle `→ Promise<json>`; `isGameUpdating() → boolean`; `FplError` med `.status`
- `src/services/analysis.js`: `POSITIONS` {1:'Keeper',2:'Forsvar',3:'Midtbane',4:'Angrep'}, `POSITIONS_SHORT` {1:'K',2:'F',3:'M',4:'A'}, `nextEvent(events)`, `currentEvent(events)`, `formatPrice(nowCost) → '5.5'`, `flaggedPlayers(elements, limit=10)`, `topForm(elements, limit=10)`, `mostTransferredIn/Out(elements, limit=10)`, `fdrMatrix(teams, fixtures, fromGw, count=5) → {gameweeks:[gw...], rows:[{team, cells:[[{opponent,home,difficulty}]], avgDifficulty}]}`
- `src/services/format.js`: `formatDateTime(iso)` (nb-NO «fredag 21. august kl. 19:30»-stil), `formatNumber(n)` (nb-NO tusenskille)
- `src/config.js`: default-eksport frosset objekt `{port, fplTeamId, hasTeamId, leagueIds[], newsFeeds[], anthropicApiKey, aiModel, discordWebhookUrl, briefHoursBeforeDeadline, tz}`
- `src/server.js`: `res.renderPage(view, data)` — rendrer view og pakker i `views/layout.ejs` (variabler: `body`, `title`, `path`, `gameUpdating`). Ruter monteres FØR 404-handleren. Feil-middleware finnes.
- Views: `layout.ejs` (nav her!), `dashboard.ejs`, `404.ejs`, `error.ejs`. CSS-klasser i bruk: `.card`, `.grid`, `.table-scroll`, `table.data`, `.num`, `.accent`, `.negative`, `.dim`, `.status .status-{a,d,i,s,u,n}`, `.fdr .fdr-1..5 .fdr-blank`, `.hero`, `.countdown`, `.eyebrow`, `.empty-state`, `.banner`, `.legend`, `.hint`, `.news`, `.chance`
- `public/app.js`: IIFE med deadline-nedtelling (leser `[data-deadline]`)

### FPL-API-referanse (felter utføreren trenger — verifisert sesong 2026/27)

- `entry/{id}/`: `name` (lagnavn), `player_first_name/last_name`, `summary_overall_points`, `summary_overall_rank`, `summary_event_points`, `last_deadline_bank` (tideler), `last_deadline_value` (tideler, inkl. bank), `leagues.classic[]` med `{id, name, league_type ('s'=global/offentlig, 'x'=privat), entry_rank, entry_last_rank}`
- `entry/{id}/event/{gw}/picks/`: `entry_history {event, points, total_points, rank, overall_rank, bank, value, event_transfers, points_on_bench}`, `active_chip` (null|'bboost'|'3xc'|'freehit'|'wildcard'), `picks[] {element, position (1–15; 12–15=benk), multiplier (0 ved benk-only-chip, 2=kaptein, 3=trippel), is_captain, is_vice_captain}`
- `entry/{id}/history/`: `current[] {event, points, total_points, rank, overall_rank, bank, value}`, `chips[] {name, event}`, `past[]`
- `event/{gw}/live/`: `elements[] {id, stats {minutes, goals_scored, assists, clean_sheets, saves, bonus, bps, total_points, …}}`
- `fixtures/?event={gw}`: per kamp `{id, event, team_h, team_a, team_h_score, team_a_score, started, finished, finished_provisional, minutes, kickoff_time, stats[], team_h_difficulty, team_a_difficulty}`. `stats[]` = `[{identifier, h:[{value, element}], a:[{value, element}]}]` — `identifier === 'bps'` gir BPS per spiller for bonusestimat
- `leagues-classic/{id}/standings/?page_standings=N`: `{league {id, name}, standings {has_next, page, results[] {entry, entry_name, player_name, rank, last_rank, total, event_total}}}`
- Bonusregel for estimat: i hver kamp får topp 3 BPS 3/2/1 bonuspoeng. Ved likhet deles plassen (to på topp → 3+3, neste får 1; tre på topp → 3+3+3; likhet på 2. → 2+2; likhet på 3. → 1+1).

### Kart over alle dokumenter (utføreren skal ALDRI lete)

| Hva | Hvor (relativt til repo-rot `c:\Users\mariu\Documents\Claude Code\FPL`) |
|---|---|
| Denne planen | `docs/superpowers/plans/2026-08-19-fpl-dashboard-v02-v10.md` |
| Levende status + brukerbeskjed-logg + WIP | `docs/HANDOVER.md` |
| Arkitektur/konvensjoner/regler | `CLAUDE.md` |
| Milepæl-sjekklister (huk av her) | `ROADMAP.md` |
| Endringslogg (Keep a Changelog) | `CHANGELOG.md` |
| Deploy-oppskrift + env-tabell | `README.md` |
| Miljøvariabel-mal | `.env.example` (lokal `.env` er gitignored) |
| Produksjon | https://fpl.marsk.no (Coolify på dash.marsk.no, auto-deploy fra `main`, GitHub: `maskj2560/fpl-dashboard` privat) |

---

## MILEPÆL v0.2.0 — /spillere (WIP: rute + view ER SKREVET, ligger i repoet)

`src/routes/players.js` og `views/players.ejs` finnes allerede (commit `ebce516`). IKKE skriv dem på nytt. Gjenstår: montering, nav, JS, CSS, verifisering, release.

### Task 2.1: Monter ruten og nav-lenken

**Files:** Modify: `src/server.js`, `views/layout.ejs`

- [x] **Steg 1:** I `src/server.js`: legg til import under de andre rute-importene:
```js
import playersRouter from './routes/players.js';
```
og monter etter `app.use('/', indexRouter);` (rekkefølgen ellers uendret, alltid FØR 404-handleren):
```js
app.use('/spillere', playersRouter);
```
- [x] **Steg 2:** I `views/layout.ejs`, i `<nav aria-label="Hovedmeny">`, rett etter Dashboard-lenken:
```ejs
      <a href="/spillere" <%= path.startsWith('/spillere') ? 'aria-current="page"' : '' %>>Spillere</a>
```
- [x] **Steg 3:** Røyk-test: `/spillere` skal gi 200 (kommando i faste regler). Sjekk også at HTML-en inneholder `players-table`.
- [x] **Steg 4:** Commit `feat: monter /spillere-rute og nav-lenke`

### Task 2.2: Sortering og filtrering i public/app.js

**Files:** Modify: `public/app.js` (ERSTATT hele filen med innholdet under — nedtellingen er beholdt uendret som modul 1)

- [x] **Steg 1:** Skriv hele `public/app.js`:
```js
// Modul 1: Nedtelling til neste deadline. Leser ISO-tidspunkt fra data-deadline.
(function () {
  'use strict';

  const box = document.querySelector('[data-deadline]');
  if (!box) return;

  const deadline = new Date(box.dataset.deadline).getTime();
  if (!Number.isFinite(deadline)) return;

  const fields = {
    d: box.querySelector('[data-unit="d"]'),
    h: box.querySelector('[data-unit="h"]'),
    m: box.querySelector('[data-unit="m"]'),
    s: box.querySelector('[data-unit="s"]'),
  };

  const pad = (n) => String(n).padStart(2, '0');

  function tick() {
    const diff = deadline - Date.now();

    if (diff <= 0) {
      box.innerHTML = '<p class="deadline-passed">Deadline er passert — lykke til!</p>';
      clearInterval(timer);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    fields.d.textContent = String(Math.floor(totalSec / 86400));
    fields.h.textContent = pad(Math.floor((totalSec % 86400) / 3600));
    fields.m.textContent = pad(Math.floor((totalSec % 3600) / 60));
    fields.s.textContent = pad(totalSec % 60);
  }

  tick();
  const timer = setInterval(tick, 1000);
})();

// Modul 2: Sortering og filtrering av spillertabellen (/spillere).
(function () {
  'use strict';

  const table = document.getElementById('players-table');
  if (!table) return;

  const tbody = table.tBodies[0];
  const headers = [...table.tHead.rows[0].cells];

  // Sortering: klikk på kolonneoverskrift, toggle retning.
  headers.forEach((th, index) => {
    th.tabIndex = 0;
    th.addEventListener('click', () => sortBy(th, index));
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sortBy(th, index);
      }
    });
  });

  function sortBy(th, index) {
    const type = th.dataset.type || 'text';
    const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
    headers.forEach((h) => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir);

    const rows = [...tbody.rows];
    rows.sort((a, b) => {
      const av = a.cells[index].textContent.trim();
      const bv = b.cells[index].textContent.trim();
      const cmp =
        type === 'num'
          ? (parseFloat(av) || 0) - (parseFloat(bv) || 0)
          : av.localeCompare(bv, 'nb');
      return dir === 'descending' ? -cmp : cmp;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }

  // Filtrering uten sidelasting.
  const search = document.getElementById('filter-search');
  const position = document.getElementById('filter-position');
  const team = document.getElementById('filter-team');
  const price = document.getElementById('filter-price');
  const reset = document.getElementById('filter-reset');
  const count = document.getElementById('filter-count');

  function applyFilters() {
    const q = search.value.trim().toLowerCase();
    const pos = position.value;
    const teamId = team.value;
    const maxPrice = parseFloat(price.value);
    let shown = 0;
    const total = tbody.rows.length;

    for (const row of tbody.rows) {
      const ok =
        (!q || row.dataset.name.includes(q)) &&
        (!pos || row.dataset.pos === pos) &&
        (!teamId || row.dataset.team === teamId) &&
        (!Number.isFinite(maxPrice) || parseFloat(row.dataset.price) <= maxPrice);
      row.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = 'Viser ' + shown + ' av ' + total + ' spillere';
  }

  search.addEventListener('input', applyFilters);
  position.addEventListener('change', applyFilters);
  team.addEventListener('change', applyFilters);
  price.addEventListener('input', applyFilters);
  reset.addEventListener('click', () => {
    search.value = '';
    position.value = '';
    team.value = '';
    price.value = '';
    applyFilters();
  });

  applyFilters();
})();
```
- [x] **Steg 2:** `npm run lint` → grønn (public/-filer lintes med browser-globals).
- [x] **Steg 3:** Commit `feat: sortering og filtrering av spillertabell uten sidelasting`

### Task 2.3: CSS for filtre og sorterbare kolonner

**Files:** Modify: `public/style.css` (APPEND nederst, før `/* ---------- Bevegelse ---------- */`-blokken)

- [x] **Steg 1:** Legg til:
```css
/* ---------- Sidehode og filtre (/spillere) ---------- */

.page-head {
  margin-bottom: 1rem;
}

.page-head h1 {
  margin: 0;
  font-size: 1.4rem;
}

.page-head p {
  margin: 0.25rem 0 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem var(--pad);
  margin-bottom: 1rem;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  font-weight: 600;
}

.filters input,
.filters select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.4rem 0.6rem;
  font: inherit;
  font-size: 0.9rem;
  min-width: 9rem;
}

.filters input:focus,
.filters select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.filters button {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 0.45rem 0.9rem;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.filters button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

table.sortable th {
  cursor: pointer;
  user-select: none;
}

table.sortable th:hover {
  color: var(--text);
}

table.sortable th[aria-sort='descending']::after {
  content: ' ↓';
  color: var(--accent);
}

table.sortable th[aria-sort='ascending']::after {
  content: ' ↑';
  color: var(--accent);
}
```
- [x] **Steg 2:** Røyk-test `/spillere` (200) + åpne gjerne i nettleser og sjekk at sortering/filter virker.
- [x] **Steg 3:** Commit `feat: stiler for filtre og sorterbare tabeller`

### Task 2.4: Release v0.2.0

- [x] **Steg 1:** `npm test` (18 grønne) + `npm run lint` (grønn)
- [x] **Steg 2:** `CHANGELOG.md`: under `## [Unreleased]` legg `## [0.2.0] - <dagens dato>` med `### Added`-punkter: spillertabell med alle kolonner (navn, lag, pos, pris, form, poeng, ppg, eierandel, xG, xA, status); klientside-sortering på alle kolonner; filtrering på posisjon/lag/maks pris + tekstsøk uten sidelasting
- [x] **Steg 3:** `ROADMAP.md`: huk av begge punktene under v0.2.0
- [x] **Steg 4:** `package.json`: `"version": "0.2.0"`
- [x] **Steg 5:** `docs/HANDOVER.md`: oppdater status (v0.2.0 ferdig, neste v0.3.0), fjern WIP-seksjonen for v0.2.0
- [x] **Steg 6:** Commit `docs: release v0.2.0`; `git tag v0.2.0`; `git push origin main --tags`
- [x] **Steg 7:** Verifiser prod etter ~2 min: `(Invoke-WebRequest https://fpl.marsk.no/spillere -UseBasicParsing).StatusCode` → 200
      ✅ 200 bekreftet — Coolify auto-deploy fra `main` fungerer.

---

## MILEPÆL v0.3.0 — /lag med anbefalinger

### Task 3.1: Analysefunksjoner for anbefalinger (TDD)

**Files:** Modify: `src/services/analysis.js` (append nederst), Test: `test/analysis.test.js` (append nederst)

**Interfaces (produseres — brukes av Task 3.2, 4.2, 5.1, 8.1):**
- `averageFdr(fixtures, teamId, fromGw, count=3) → number|null`
- `playProbability(p) → 0..1`
- `captainSuggestions(squad, fixtures, fromGw, limit=3) → [{player, score, avgFdr, probability, reasons: string[]}]`
- `transferOutCandidates(squad, fixtures, fromGw) → [{player, reasons: string[]}]`
- `transferInCandidates(outPlayer, elements, squadIds:Set, bankTenths, fixtures, fromGw, limit=3) → [{player, score}]`
- `rankGraph(historyCurrent, width=600, height=140) → {points: 'x,y x,y …', min, max, first, last}|null`

- [x] **Steg 1 (RED):** Append i `test/analysis.test.js` (gjenbruk eksisterende `player()`-hjelper i filen; utvid import-listen øverst med de nye funksjonene):
```js
test('averageFdr regner snitt for lagets kamper i vinduet', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 5, team_a_difficulty: 4 },
    { event: 9, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 5 },
  ];
  assert.equal(averageFdr(fixtures, 1, 3, 3), 3); // (2+4)/2
  assert.equal(averageFdr(fixtures, 1, 9, 1), 5);
  assert.equal(averageFdr([], 1, 3, 3), null);
});

test('playProbability bruker chance og status', () => {
  assert.equal(playProbability(player({ status: 'a', chance_of_playing_next_round: null })), 1);
  assert.equal(playProbability(player({ status: 'd', chance_of_playing_next_round: 75 })), 0.75);
  assert.equal(playProbability(player({ status: 'i', chance_of_playing_next_round: null })), 0);
  assert.equal(playProbability(player({ status: 's', chance_of_playing_next_round: 0 })), 0);
});

test('captainSuggestions rangerer på form x fixture-lettehet x spilletid', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 5 },
  ];
  const squad = [
    player({ id: 1, web_name: 'LettKamp', team: 1, form: '5.0', minutes: 900 }),
    player({ id: 2, web_name: 'ToffKamp', team: 2, form: '5.0', minutes: 900 }),
    player({ id: 3, web_name: 'Skadet', team: 1, form: '9.0', minutes: 900, status: 'i', chance_of_playing_next_round: 0 }),
    player({ id: 4, web_name: 'Keeper', team: 1, element_type: 1, form: '9.9', minutes: 900 }),
  ];
  const top = captainSuggestions(squad, fixtures, 3, 3);
  assert.equal(top[0].player.id, 1, 'lett kamp vinner ved lik form');
  assert.equal(top[1].player.id, 2);
  assert.equal(top.length, 3);
  assert.equal(top[2].score, 0, 'skadet spiller får score 0');
  assert.ok(top.every((t) => t.player.element_type !== 1), 'keeper foreslas ikke');
  assert.ok(top[0].reasons.length >= 2, 'begrunnelse folger med');
});

test('transferOutCandidates flagger skade, lav form og toff fixture-run', () => {
  const fixtures = [
    { event: 3, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
    { event: 4, team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 2 },
  ];
  const squad = [
    player({ id: 1, team: 2, form: '6.0', minutes: 900 }), // frisk, god form, lette kamper
    player({ id: 2, team: 2, status: 'i', chance_of_playing_next_round: 25, minutes: 900 }),
    player({ id: 3, team: 2, form: '1.2', minutes: 900 }),
    player({ id: 4, team: 1, form: '6.0', minutes: 900 }), // FDR-snitt 5
  ];
  const out = transferOutCandidates(squad, fixtures, 3);
  const ids = out.map((o) => o.player.id);
  assert.ok(!ids.includes(1));
  assert.ok(ids.includes(2) && ids.includes(3) && ids.includes(4));
  assert.ok(out.find((o) => o.player.id === 2).reasons[0].length > 3);
});

test('transferInCandidates: samme posisjon, innenfor budsjett, ikke i troppen', () => {
  const fixtures = [];
  const out = player({ id: 1, element_type: 3, now_cost: 80 });
  const elements = [
    out,
    player({ id: 2, element_type: 3, now_cost: 85, form: '7.0', total_points: 60, minutes: 900 }),
    player({ id: 3, element_type: 3, now_cost: 95, form: '9.0', total_points: 90, minutes: 900 }), // for dyr (budsjett 90)
    player({ id: 4, element_type: 2, now_cost: 50, form: '8.0', total_points: 70, minutes: 900 }), // feil posisjon
    player({ id: 5, element_type: 3, now_cost: 60, form: '2.0', total_points: 30, minutes: 900 }),
    player({ id: 6, element_type: 3, now_cost: 70, form: '6.0', total_points: 55, minutes: 900 }), // i troppen
    player({ id: 7, element_type: 3, now_cost: 75, form: '6.5', total_points: 50, minutes: 0 }),   // aldri spilt
  ];
  const inn = transferInCandidates(out, elements, new Set([1, 6]), 10, fixtures, 3, 3);
  const ids = inn.map((c) => c.player.id);
  assert.ok(ids.includes(2) && ids.includes(5));
  assert.ok(!ids.includes(3) && !ids.includes(4) && !ids.includes(6) && !ids.includes(7) && !ids.includes(1));
  assert.equal(ids[0], 2, 'hoyest form/verdi forst');
});

test('rankGraph lager polyline-punkter, lav rank overst', () => {
  const history = [
    { event: 1, overall_rank: 1000000 },
    { event: 2, overall_rank: 500000 },
    { event: 3, overall_rank: 750000 },
  ];
  const g = rankGraph(history, 600, 140);
  assert.equal(g.min, 500000);
  assert.equal(g.max, 1000000);
  assert.equal(g.last, 750000);
  const pts = g.points.split(' ').map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 3);
  assert.equal(pts[0][0], 0);
  assert.equal(pts[2][0], 600);
  assert.ok(pts[1][1] < pts[0][1], 'bedre rank tegnes hoyere (lavere y)');
  assert.equal(rankGraph([], 600, 140), null);
  assert.equal(rankGraph([{ event: 1, overall_rank: 5 }], 600, 140).points, '0,70');
});
```
- [x] **Steg 2:** `npm test` → de nye testene FEILER med «is not a function»/import-feil. Ikke gå videre før du har sett feilene.
      (Sett: `SyntaxError: … does not provide an export named 'averageFdr'`.)
- [x] **Steg 3 (GREEN):** Append i `src/services/analysis.js`:
      **Avvik fra planen:** planens `rankGraph` (`span = max - min || 1`) gir `'0,0'` for ett
      datapunkt, mens planens egen test krever `'0,70'`. Implementert med `span === 0` →
      `y = height / 2`, som er det testen (og en flat graf) faktisk ber om.
```js
/** Snitt-FDR for et lags kamper i [fromGw, fromGw+count). null hvis ingen kamper. */
export function averageFdr(fixtures, teamId, fromGw, count = 3) {
  const diffs = [];
  for (const f of fixtures) {
    if (f.event == null || f.event < fromGw || f.event >= fromGw + count) continue;
    if (f.team_h === teamId) diffs.push(f.team_h_difficulty);
    else if (f.team_a === teamId) diffs.push(f.team_a_difficulty);
  }
  if (diffs.length === 0) return null;
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
}

/** Sannsynlighet (0–1) for at spilleren får spilletid neste runde. */
export function playProbability(p) {
  if (p.chance_of_playing_next_round != null) return p.chance_of_playing_next_round / 100;
  return p.status === 'a' || p.status === 'd' ? 1 : 0;
}

/**
 * Kapteinsforslag: score = form × fixture-lettehet (6 − snitt-FDR) × spilletidssannsynlighet.
 * Keepere utelates. Returnerer topp `limit` med begrunnelser.
 */
export function captainSuggestions(squad, fixtures, fromGw, limit = 3) {
  return squad
    .filter((p) => p.element_type !== 1)
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 1);
      const ease = 6 - (avgFdr ?? 3.5);
      const probability = playProbability(p);
      const score = (parseFloat(p.form) || 0) * ease * probability;
      const reasons = [
        `Form ${p.form}`,
        avgFdr == null ? 'Ingen kamp funnet' : `FDR ${avgFdr.toFixed(1)} neste kamp`,
        probability < 1 ? `Spilletid ${(probability * 100).toFixed(0)} %` : 'Full spilletid ventet',
      ];
      return { player: p, score, avgFdr, probability, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Spillere i troppen som bør vurderes solgt, med begrunnelser. */
export function transferOutCandidates(squad, fixtures, fromGw) {
  return squad
    .map((p) => {
      const reasons = [];
      const probability = playProbability(p);
      if (p.status !== 'a' || probability < 0.75) {
        reasons.push(p.news?.trim() ? `Skadet/usikker: ${p.news}` : 'Skadet/usikker eller lav spilletidssjanse');
      }
      const form = parseFloat(p.form) || 0;
      if (form < 2.5 && p.minutes > 0) reasons.push(`Lav form (${p.form})`);
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 3);
      if (avgFdr != null && avgFdr >= 4) reasons.push(`Tøff fixture-run (snitt-FDR ${avgFdr.toFixed(1)} neste 3)`);
      return { player: p, reasons };
    })
    .filter((c) => c.reasons.length > 0);
}

/**
 * Beste erstattere: samme posisjon, ikke i troppen, pris ≤ utgående + bank,
 * ventet spilletid, har spilt. Score = form × fixture-lettehet + poeng per pris.
 */
export function transferInCandidates(outPlayer, elements, squadIds, bankTenths, fixtures, fromGw, limit = 3) {
  const budget = outPlayer.now_cost + bankTenths;
  return elements
    .filter(
      (p) =>
        p.element_type === outPlayer.element_type &&
        !squadIds.has(p.id) &&
        p.now_cost <= budget &&
        p.minutes > 0 &&
        playProbability(p) >= 0.75,
    )
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 3);
      const ease = 6 - (avgFdr ?? 3.5);
      const score = (parseFloat(p.form) || 0) * ease + (p.total_points / p.now_cost) * 2;
      return { player: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** SVG-polyline for overall rank per GW. Lavere rank = bedre = høyere i grafen. */
export function rankGraph(historyCurrent, width = 600, height = 140) {
  const ranks = historyCurrent.filter((h) => h.overall_rank != null);
  if (ranks.length === 0) return null;
  const values = ranks.map((h) => h.overall_rank);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = ranks.length > 1 ? width / (ranks.length - 1) : 0;
  const points = ranks
    .map((h, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(((h.overall_rank - min) / span) * height);
      return `${x},${y}`;
    })
    .join(' ');
  return { points, min, max, first: values[0], last: values[values.length - 1] };
}
```
- [x] **Steg 4:** `npm test` → ALT grønt (18 gamle + 6 nye = 24). `npm run lint` → grønn.
- [x] **Steg 5:** Commit `feat: analyse for kaptein, transfers og rank-graf`

### Task 3.2: /lag-rute

**Files:** Create: `src/routes/team.js`; Modify: `src/server.js` (import + `app.use('/lag', teamRouter);`), `views/layout.ejs` (nav-lenke `Lag` → `/lag`, samme mønster som Task 2.1)

- [x] **Steg 1:** Opprett `src/routes/team.js`:
```js
import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getFixtures, getEntry, getEntryHistory, getPicks, FplError } from '../services/fplClient.js';
import {
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  rankGraph,
  formatPrice,
  nextEvent,
  currentEvent,
  POSITIONS_SHORT,
} from '../services/analysis.js';
import { formatNumber } from '../services/format.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) {
    return res.renderPage('no-team', { title: 'Mitt lag' });
  }
  try {
    const [bootstrap, fixtures, entry, history] = await Promise.all([
      getBootstrap(),
      getFixtures(),
      getEntry(config.fplTeamId),
      getEntryHistory(config.fplTeamId),
    ]);
    const { events, elements, teams } = bootstrap;
    const current = currentEvent(events);
    const upcoming = nextEvent(events);
    const gw = current?.id ?? (upcoming ? upcoming.id - 1 : 0);

    let picks = null;
    if (gw >= 1) {
      try {
        picks = await getPicks(config.fplTeamId, gw);
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
        // 404 = ingen picks for denne GW-en ennå (f.eks. før sesongstart)
      }
    }

    const elementsById = new Map(elements.map((e) => [e.id, e]));
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const fromGw = upcoming?.id ?? gw;

    let squadView = null;
    let recommendations = null;
    if (picks) {
      const squad = picks.picks.map((pk) => ({ pick: pk, player: elementsById.get(pk.element) }));
      const starters = squad.filter((s) => s.pick.position <= 11);
      const bench = squad.filter((s) => s.pick.position >= 12);
      const byLine = {
        1: starters.filter((s) => s.player.element_type === 1),
        2: starters.filter((s) => s.player.element_type === 2),
        3: starters.filter((s) => s.player.element_type === 3),
        4: starters.filter((s) => s.player.element_type === 4),
      };
      squadView = { byLine, bench, entryHistory: picks.entry_history, activeChip: picks.active_chip };

      const squadPlayers = squad.map((s) => s.player);
      const squadIds = new Set(squadPlayers.map((p) => p.id));
      const bank = picks.entry_history.bank;
      const outs = transferOutCandidates(squadPlayers, fixtures, fromGw);
      recommendations = {
        captains: captainSuggestions(squadPlayers, fixtures, fromGw),
        transfers: outs.map((o) => ({
          out: o,
          inn: transferInCandidates(o.player, elements, squadIds, bank, fixtures, fromGw),
        })),
      };
    }

    res.renderPage('team', {
      title: 'Mitt lag',
      entry,
      gw,
      squadView,
      recommendations,
      graph: rankGraph(history.current),
      chips: history.chips,
      teamsById,
      POSITIONS_SHORT,
      formatPrice,
      formatNumber,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 2:** Opprett `views/no-team.ejs`:
```ejs
<section class="empty-state">
  <h1>Sett FPL_TEAM_ID for å se laget ditt</h1>
  <p>
    Denne siden trenger team-ID-en din. Finn den ved å logge inn på
    fantasy.premierleague.com og gå til «Points» — tallet i adressen er ID-en:
    <code>/entry/<strong>DIN_ID</strong>/event/1</code>.
  </p>
  <p>Lokalt: legg <code>FPL_TEAM_ID=dinId</code> i <code>.env</code>. I produksjon: sett variabelen i Coolify og redeploy.</p>
</section>
```
- [x] **Steg 3:** Monter rute + nav (som Task 2.1: import `teamRouter`, `app.use('/lag', teamRouter);`, nav-lenke `Lag`).
- [x] **Steg 4:** Commit `feat: /lag-rute med picks, historikk og anbefalingsdata`
      (Røyk-testet uten `.env`: `/lag` → 200 med «Sett FPL_TEAM_ID»-tilstanden.
      Lokal `.env` finnes ikke og FPL_TEAM_ID er ukjent for meg — tilstanden med
      lag verifiseres mot prod, der variabelen er satt i Coolify.)

### Task 3.3: /lag-view med oppstilling, graf og anbefalinger

**Files:** Create: `views/team.ejs`; Modify: `public/style.css` (append)

- [x] **Steg 1:** Opprett `views/team.ejs`:
```ejs
<section class="page-head">
  <h1><%= entry.name %></h1>
  <p class="dim"><%= entry.player_first_name %> <%= entry.player_last_name %> · Gameweek <%= gw || '–' %><% if (squadView?.activeChip) { %> · Chip: <%= squadView.activeChip %><% } %></p>
</section>

<div class="stat-strip">
  <div class="stat"><span class="stat-val"><%= squadView ? squadView.entryHistory.points : '–' %></span><span class="stat-lbl">GW-poeng</span></div>
  <div class="stat"><span class="stat-val"><%= formatNumber(entry.summary_overall_points) %></span><span class="stat-lbl">Totalt</span></div>
  <div class="stat"><span class="stat-val"><%= formatNumber(entry.summary_overall_rank) %></span><span class="stat-lbl">Overall rank</span></div>
  <div class="stat"><span class="stat-val"><%= squadView ? formatPrice(squadView.entryHistory.value - squadView.entryHistory.bank) : '–' %></span><span class="stat-lbl">Lagverdi (£m)</span></div>
  <div class="stat"><span class="stat-val"><%= squadView ? formatPrice(squadView.entryHistory.bank) : '–' %></span><span class="stat-lbl">Bank (£m)</span></div>
</div>

<% if (!squadView) { %>
  <section class="card"><p class="empty">Fant ingen lagoppstilling ennå — sesongen har kanskje ikke startet.</p></section>
<% } else { %>
  <section class="card card-wide">
    <h2>Oppstilling</h2>
    <div class="pitch">
      <% for (const line of [1, 2, 3, 4]) { %>
        <div class="pitch-row">
          <% for (const s of squadView.byLine[line]) { %>
            <div class="chip<%= s.pick.is_captain ? ' chip-captain' : '' %>">
              <span class="chip-name"><%= s.player.web_name %><% if (s.pick.is_captain) { %> <b class="cap">C</b><% } else if (s.pick.is_vice_captain) { %> <b class="cap vice">V</b><% } %></span>
              <span class="chip-meta"><%= teamsById.get(s.player.team)?.short_name %> · <%= formatPrice(s.player.now_cost) %></span>
            </div>
          <% } %>
        </div>
      <% } %>
    </div>
    <div class="bench">
      <span class="bench-label">Benk</span>
      <% for (const s of squadView.bench) { %>
        <div class="chip chip-bench">
          <span class="chip-name"><%= s.player.web_name %></span>
          <span class="chip-meta"><%= POSITIONS_SHORT[s.player.element_type] %> · <%= formatPrice(s.player.now_cost) %></span>
        </div>
      <% } %>
    </div>
  </section>
<% } %>

<% if (graph) { %>
  <section class="card card-wide">
    <h2>Overall rank per gameweek</h2>
    <svg class="rank-graph" viewBox="-8 -8 616 156" preserveAspectRatio="none" role="img" aria-label="Rankutvikling">
      <polyline points="<%= graph.points %>" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
    <p class="hint">Best: <%= formatNumber(graph.min) %> · Nå: <%= formatNumber(graph.last) %> (lavere er bedre — toppen av grafen er best)</p>
  </section>
<% } %>

<% if (recommendations) { %>
  <div class="grid">
    <section class="card">
      <h2>Kapteinsvalg</h2>
      <ol class="rec-list">
        <% for (const c of recommendations.captains) { %>
          <li>
            <strong><%= c.player.web_name %></strong> <span class="dim"><%= teamsById.get(c.player.team)?.short_name %></span>
            <ul class="reasons"><% for (const r of c.reasons) { %><li><%= r %></li><% } %></ul>
          </li>
        <% } %>
      </ol>
    </section>
    <section class="card">
      <h2>Vurder å selge</h2>
      <% if (recommendations.transfers.length === 0) { %>
        <p class="empty">Ingen åpenbare salgskandidater — troppen ser sunn ut.</p>
      <% } else { %>
        <% for (const t of recommendations.transfers) { %>
          <div class="transfer-block">
            <p class="transfer-out"><strong><%= t.out.player.web_name %></strong> <span class="dim">(<%= formatPrice(t.out.player.now_cost) %>)</span></p>
            <ul class="reasons"><% for (const r of t.out.reasons) { %><li><%= r %></li><% } %></ul>
            <% if (t.inn.length > 0) { %>
              <p class="dim">Erstattere innenfor budsjett:</p>
              <ul class="reasons">
                <% for (const k of t.inn) { %>
                  <li><strong><%= k.player.web_name %></strong> <%= teamsById.get(k.player.team)?.short_name %> · <%= formatPrice(k.player.now_cost) %> · form <%= k.player.form %></li>
                <% } %>
              </ul>
            <% } %>
          </div>
        <% } %>
      <% } %>
    </section>
  </div>
<% } %>
```
- [x] **Steg 2:** Append i `public/style.css` (før Bevegelse-blokken):
```css
/* ---------- Mitt lag (/lag) ---------- */

.stat-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  text-align: center;
}

.stat-val {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 1.35rem;
  font-weight: 700;
}

.stat-lbl {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-dim);
}

.pitch {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: linear-gradient(180deg, rgba(0, 229, 140, 0.06), rgba(0, 229, 140, 0.02));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem 0.5rem;
}

.pitch-row {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.chip {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  min-width: 7.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.chip-captain {
  border-color: var(--accent-2);
}

.chip-name {
  font-weight: 600;
  font-size: 0.85rem;
}

.chip-meta {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.cap {
  display: inline-block;
  background: var(--accent-2);
  color: #fff;
  border-radius: 50%;
  width: 1.1rem;
  height: 1.1rem;
  line-height: 1.1rem;
  font-size: 0.7rem;
  text-align: center;
}

.cap.vice {
  background: var(--surface);
  color: var(--accent-2);
  border: 1px solid var(--accent-2);
}

.bench {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.bench-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-dim);
  font-weight: 600;
}

.chip-bench {
  opacity: 0.75;
  min-width: 6.5rem;
}

.rank-graph {
  width: 100%;
  height: 160px;
  display: block;
}

.rec-list {
  margin: 0;
  padding-left: 1.25rem;
}

.rec-list > li {
  margin-bottom: 0.6rem;
}

.reasons {
  margin: 0.2rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.transfer-block {
  border-top: 1px solid var(--border);
  padding-top: 0.6rem;
  margin-top: 0.6rem;
}

.transfer-block:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.transfer-out {
  margin: 0;
}
```
- [x] **Steg 3:** Røyk-test BEGGE tilstander: uten `.env` → `/lag` viser «Sett FPL_TEAM_ID» (200); med `.env` (FPL_TEAM_ID) → 200 med lagnavn i HTML.
      Uten team-ID: 200 + «Sett FPL_TEAM_ID» ✅. Med team-ID: 200, men sesongen
      2026/27 har ikke startet (neste GW = 1, deadline 2026-08-21T17:30Z), så
      FPL har ingen picks/historikk ennå → tomtilstanden vises (som forventet).
      Oppstilling/graf/anbefalinger er derfor verifisert ved å rendre
      `views/team.ejs` med mockdata: alle grener (pitch, C/V-merker, benk,
      lagverdi, bank, rank-graf, kapteinsliste, transferblokker) renderer uten feil.
- [x] **Steg 4:** `npm test` + `npm run lint` grønne. Commit `feat: /lag med oppstilling, rank-graf og anbefalinger`

### Task 3.4: Release v0.3.0

- [x] Samme prosedyre som Task 2.4: CHANGELOG `[0.3.0]` (lag-side med oppstilling/benk/kaptein/lagverdi/rank-graf; kapteinsanbefaling topp 3 med begrunnelse; transfers ut/inn innenfor budsjett; tester), ROADMAP-avkryssing, version 0.3.0, HANDOVER, commit `docs: release v0.3.0`, tag, push, verifiser https://fpl.marsk.no/lag (viser no-team-melding til FPL_TEAM_ID er satt i Coolify — den ER satt der, så forvent lagsiden)

---

## MILEPÆL v0.4.0 — /liga med differensial-analyse

### Task 4.1: differentials() i analysis.js (TDD)

**Files:** Modify: `src/services/analysis.js`, `test/analysis.test.js` (append i begge)

**Interfaces (produseres):** `differentials(myIds:Set, rivalIds:Set, elements) → {theirs: [element…], mine: [element…]}` — begge sortert på eierandel synkende.

- [x] **Steg 1 (RED):** Append test:
```js
test('differentials finner spillere kun den ene har, sortert paa eierandel', () => {
  const elements = [
    player({ id: 1, selected_by_percent: '50.0' }),
    player({ id: 2, selected_by_percent: '10.0' }),
    player({ id: 3, selected_by_percent: '30.0' }),
    player({ id: 4, selected_by_percent: '5.0' }),
  ];
  const d = differentials(new Set([1, 2]), new Set([1, 3, 4]), elements);
  assert.deepEqual(d.theirs.map((p) => p.id), [3, 4], 'de har, jeg mangler');
  assert.deepEqual(d.mine.map((p) => p.id), [2], 'jeg har, de mangler');
});
```
- [x] **Steg 2:** `npm test` → FEILER (ikke definert).
- [x] **Steg 3 (GREEN):** Append i analysis.js:
```js
/** Differensialer: spillere rivalen har som jeg mangler («theirs») og omvendt («mine»). */
export function differentials(myIds, rivalIds, elements) {
  const byOwnership = (a, b) =>
    (parseFloat(b.selected_by_percent) || 0) - (parseFloat(a.selected_by_percent) || 0);
  return {
    theirs: elements.filter((p) => rivalIds.has(p.id) && !myIds.has(p.id)).sort(byOwnership),
    mine: elements.filter((p) => myIds.has(p.id) && !rivalIds.has(p.id)).sort(byOwnership),
  };
}
```
- [x] **Steg 4:** `npm test` grønn (25/25). Commit `feat: differensial-analyse i analysis`

### Task 4.2: /liga-rute og view

**Files:** Create: `src/routes/league.js`, `views/league.ejs`; Modify: `src/server.js` (`app.use('/liga', leagueRouter);`), `views/layout.ejs` (nav `Liga`), `public/style.css` (kun hvis nødvendig — gjenbruk eksisterende klasser)

- [x] **Steg 1:** Opprett `src/routes/league.js`:
```js
import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getEntry, getLeagueStandings, getPicks, FplError } from '../services/fplClient.js';
import { currentEvent, nextEvent, differentials } from '../services/analysis.js';
import { formatNumber } from '../services/format.js';

const router = Router();

async function resolveLeagueIds() {
  if (config.leagueIds.length > 0) return config.leagueIds;
  const entry = await getEntry(config.fplTeamId);
  // 'x' = privat klassisk liga; 's' = globale gigaligaer (filtreres bort)
  return entry.leagues.classic.filter((l) => l.league_type === 'x').map((l) => l.id);
}

async function picksIdSet(entryId, gw) {
  try {
    const picks = await getPicks(entryId, gw);
    return new Set(picks.picks.map((p) => p.element));
  } catch (err) {
    if (err instanceof FplError && err.status === 404) return null;
    throw err;
  }
}

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Miniligaer' });
  try {
    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id ?? (nextEvent(bootstrap.events)?.id ?? 2) - 1;
    const leagueIds = await resolveLeagueIds();
    const leagues = await Promise.all(leagueIds.map((id) => getLeagueStandings(id)));

    // Differensial mot leder (eller valgt rival via ?rival=<entryId>&liga=<leagueId>)
    let diff = null;
    const rivalEntry = Number(req.query.rival) || null;
    const firstLeague = leagues[0];
    const leader =
      rivalEntry ??
      leagues
        .flatMap((l) => l.standings.results)
        .find((r) => r.rank === 1 && r.entry !== config.fplTeamId)?.entry ??
      null;

    if (leader && gw >= 1) {
      const [mine, theirs] = await Promise.all([
        picksIdSet(config.fplTeamId, gw),
        picksIdSet(leader, gw),
      ]);
      if (mine && theirs) {
        const d = differentials(mine, theirs, bootstrap.elements);
        const rivalRow = leagues
          .flatMap((l) => l.standings.results)
          .find((r) => r.entry === leader);
        diff = { ...d, rivalName: rivalRow?.entry_name ?? `Lag ${leader}`, rivalEntry: leader };
      }
    }

    res.renderPage('league', {
      title: 'Miniligaer',
      leagues,
      diff,
      myEntry: config.fplTeamId,
      firstLeague,
      formatNumber,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 2:** Opprett `views/league.ejs`:
```ejs
<section class="page-head">
  <h1>Miniligaer</h1>
  <p class="dim">Klikk på et lag i tabellen for å sammenligne tropper (differensialer).</p>
</section>

<% if (leagues.length === 0) { %>
  <section class="card"><p class="empty">Fant ingen private miniligaer. Sett LEAGUE_IDS i miljøvariablene hvis ligaene dine ikke dukker opp.</p></section>
<% } %>

<div class="grid">
  <% for (const l of leagues) { %>
    <section class="card">
      <h2><%= l.league.name %></h2>
      <div class="table-scroll">
        <table class="data">
          <thead><tr><th class="num">#</th><th>Lag</th><th class="num">GW</th><th class="num">Totalt</th></tr></thead>
          <tbody>
            <% for (const r of l.standings.results) { %>
              <tr class="<%= r.entry === myEntry ? 'row-me' : '' %>">
                <td class="num">
                  <%= r.rank %>
                  <% if (r.last_rank && r.last_rank !== r.rank) { %>
                    <span class="<%= r.rank < r.last_rank ? 'accent' : 'negative' %>"><%= r.rank < r.last_rank ? '▲' : '▼' %></span>
                  <% } %>
                </td>
                <td>
                  <% if (r.entry === myEntry) { %>
                    <strong><%= r.entry_name %></strong> <span class="dim">(meg)</span>
                  <% } else { %>
                    <a href="/liga?rival=<%= r.entry %>"><%= r.entry_name %></a> <span class="dim"><%= r.player_name %></span>
                  <% } %>
                </td>
                <td class="num"><%= r.event_total %></td>
                <td class="num"><strong><%= formatNumber(r.total) %></strong></td>
              </tr>
            <% } %>
          </tbody>
        </table>
      </div>
    </section>
  <% } %>
</div>

<% if (diff) { %>
  <section class="card card-wide">
    <h2>Differensialer mot <%= diff.rivalName %></h2>
    <div class="grid">
      <div>
        <h3 class="sub-head">De har — jeg mangler</h3>
        <% if (diff.theirs.length === 0) { %><p class="empty">Ingen.</p><% } else { %>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>Spiller</th><th class="num">Eid</th><th class="num">Form</th></tr></thead>
          <tbody><% for (const p of diff.theirs) { %>
            <tr><td><strong><%= p.web_name %></strong></td><td class="num"><%= p.selected_by_percent %> %</td><td class="num"><%= p.form %></td></tr>
          <% } %></tbody>
        </table></div>
        <% } %>
      </div>
      <div>
        <h3 class="sub-head">Jeg har — de mangler</h3>
        <% if (diff.mine.length === 0) { %><p class="empty">Ingen.</p><% } else { %>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>Spiller</th><th class="num">Eid</th><th class="num">Form</th></tr></thead>
          <tbody><% for (const p of diff.mine) { %>
            <tr><td><strong><%= p.web_name %></strong></td><td class="num"><%= p.selected_by_percent %> %</td><td class="num"><%= p.form %></td></tr>
          <% } %></tbody>
        </table></div>
        <% } %>
      </div>
    </div>
  </section>
<% } %>
```
- [x] **Steg 3:** Append i `public/style.css`:
```css
/* ---------- Miniliga (/liga) ---------- */

.row-me td {
  background: var(--accent-soft);
}

.sub-head {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin: 0 0 0.5rem;
}
```
- [x] **Steg 4:** Monter rute + nav-lenke `Liga`. Røyk-test `/liga` (med `.env`: 200 og liganavn i HTML; uten: no-team). `npm test` + lint grønne.
      Uten team-ID: 200 + no-team ✅. Med team-ID: 200 og ligatabell ✅ (25/25 tester, lint 0).
      Differensial-grenen kan ikke treffes før sesongstart (picks gir 404), så
      `views/league.ejs` er mock-rendret: liganavn, «(meg)»-markering, rival-lenke,
      opp/ned-piler, differensialtabeller og tomtilstand renderer uten feil.
      **Rettet underveis:** nav-lenken for `/lag` brukte `path.startsWith('/lag')`,
      som også traff `/liga` og markerte to lenker som aktive. Nå `path === '/lag' ||
      path.startsWith('/lag/')`.
- [x] **Steg 5:** Commit `feat: /liga med tabeller og differensial-analyse`

### Task 4.3: Release v0.4.0
- [x] Som Task 2.4: CHANGELOG `[0.4.0]` (miniliga-tabeller med rank-endring; differensial-analyse mot leder/valgt rival), ROADMAP, version, HANDOVER, `docs: release v0.4.0`, tag, push, verifiser prod /liga

---

## MILEPÆL v0.5.0 — Gameweek-brief (data, uten LLM)

### Task 5.1: services/brief.js

**Files:** Create: `src/services/brief.js`; Test: `test/brief.test.js`

**Interfaces (produseres — brukes av Task 5.2, 8.2, 9.1):**
- `buildBrief({bootstrap, fixtures, myTeam}) → brief` der `myTeam = {squadPlayers, elements, bank, fromGw} | null`, og brief =
  `{generatedAt, gameweek: {id, name, deadline, deadlineFormatted}|null, injuries: [{name, team, ownership, news, status}], captains: [{name, team, form, ownership, avgFdr}], fixturesByDay: [{day, matches: [{home, away, kickoff}]}], mine: {captains, transfers}|null}`
- `groupFixturesByDay(fixtures, teamsById) → [{day, matches: [{home, away, kickoff}]}]` (eksporteres for test)

- [x] **Steg 1 (RED):** Opprett `test/brief.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupFixturesByDay } from '../src/services/brief.js';

const teamsById = new Map([
  [1, { id: 1, short_name: 'ARS', name: 'Arsenal' }],
  [2, { id: 2, short_name: 'CHE', name: 'Chelsea' }],
]);

test('groupFixturesByDay grupperer kamper per dag i norsk tid, sortert', () => {
  const fixtures = [
    { team_h: 1, team_a: 2, kickoff_time: '2026-08-22T14:00:00Z' },
    { team_h: 2, team_a: 1, kickoff_time: '2026-08-21T17:30:00Z' },
    { team_h: 1, team_a: 2, kickoff_time: '2026-08-22T16:30:00Z' },
  ];
  const days = groupFixturesByDay(fixtures, teamsById);
  assert.equal(days.length, 2);
  assert.match(days[0].day, /21\./);
  assert.equal(days[1].matches.length, 2);
  assert.equal(days[1].matches[0].home, 'Arsenal');
  assert.match(days[1].matches[0].kickoff, /16[:.]00/);
});
```
(NB: 14:00Z = 16:00 norsk sommertid.)
- [x] **Steg 2:** `npm test` → FEILER. (`ERR_MODULE_NOT_FOUND: … src/services/brief.js`.)
- [x] **Steg 3 (GREEN):** Opprett `src/services/brief.js`:
```js
// Bygger gameweek-briefen fra rene data (ingen LLM her).
import config from '../config.js';
import {
  nextEvent,
  flaggedPlayers,
  captainSuggestions,
  transferOutCandidates,
  transferInCandidates,
  averageFdr,
} from './analysis.js';
import { formatDateTime } from './format.js';

const dayFmt = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: config.tz,
});
const timeFmt = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: config.tz,
});

export function groupFixturesByDay(fixtures, teamsById) {
  const sorted = [...fixtures]
    .filter((f) => f.kickoff_time)
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  const days = [];
  for (const f of sorted) {
    const date = new Date(f.kickoff_time);
    const day = dayFmt.format(date);
    let bucket = days.find((d) => d.day === day);
    if (!bucket) {
      bucket = { day, matches: [] };
      days.push(bucket);
    }
    bucket.matches.push({
      home: teamsById.get(f.team_h)?.name ?? '?',
      away: teamsById.get(f.team_a)?.name ?? '?',
      kickoff: timeFmt.format(date),
    });
  }
  return days;
}

/** Globale kapteinsvalg: høyt eid + form + lett fixture. */
function globalCaptains(elements, fixtures, fromGw, limit = 3) {
  return elements
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 15 && p.minutes > 0)
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 1);
      return { p, score: (parseFloat(p.form) || 0) * (6 - (avgFdr ?? 3.5)), avgFdr };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildBrief({ bootstrap, fixtures, myTeam = null }) {
  const { events, elements, teams } = bootstrap;
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const upcoming = nextEvent(events);
  const fromGw = upcoming?.id ?? 1;
  const gwFixtures = fixtures.filter((f) => f.event === fromGw);

  const injuries = flaggedPlayers(elements, 12)
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 5)
    .map((p) => ({
      name: p.web_name,
      team: teamsById.get(p.team)?.short_name ?? '?',
      ownership: p.selected_by_percent,
      news: p.news || 'Ingen detaljer',
      status: p.status,
    }));

  const captains = globalCaptains(elements, fixtures, fromGw).map(({ p, avgFdr }) => ({
    name: p.web_name,
    team: teamsById.get(p.team)?.short_name ?? '?',
    form: p.form,
    ownership: p.selected_by_percent,
    avgFdr,
  }));

  let mine = null;
  if (myTeam) {
    const { squadPlayers, elements: all, bank, fromGw: gw } = myTeam;
    const squadIds = new Set(squadPlayers.map((p) => p.id));
    const outs = transferOutCandidates(squadPlayers, fixtures, gw);
    mine = {
      captains: captainSuggestions(squadPlayers, fixtures, gw),
      transfers: outs.map((o) => ({
        out: o,
        inn: transferInCandidates(o.player, all, squadIds, bank, fixtures, gw),
      })),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    gameweek: upcoming
      ? {
          id: upcoming.id,
          name: upcoming.name,
          deadline: upcoming.deadline_time,
          deadlineFormatted: formatDateTime(upcoming.deadline_time),
        }
      : null,
    injuries,
    captains,
    fixturesByDay: groupFixturesByDay(gwFixtures, teamsById),
    mine,
  };
}
```
- [x] **Steg 4:** `npm test` grønn (26/26). Commit `feat: brief-service som bygger gameweek-brief fra data`

### Task 5.2: /brief-rute, /api/brief.json og view

**Files:** Create: `src/routes/brief.js`, `src/routes/api.js`, `views/brief.ejs`; Modify: `src/server.js` (monter `/brief` og `/api`), `views/layout.ejs` (nav `Brief`)

- [x] **Steg 1:** Opprett `src/routes/brief.js`:
```js
import { Router } from 'express';
import config from '../config.js';
import { getBootstrap, getFixtures, getPicks, FplError } from '../services/fplClient.js';
import { buildBrief } from '../services/brief.js';
import { currentEvent, nextEvent } from '../services/analysis.js';

const router = Router();

/** Delt av /brief (HTML) og /api/brief.json. Eksporteres for gjenbruk. */
export async function assembleBrief() {
  const [bootstrap, fixtures] = await Promise.all([getBootstrap(), getFixtures()]);
  let myTeam = null;
  if (config.hasTeamId) {
    const gw = currentEvent(bootstrap.events)?.id ?? (nextEvent(bootstrap.events)?.id ?? 2) - 1;
    if (gw >= 1) {
      try {
        const picks = await getPicks(config.fplTeamId, gw);
        const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
        myTeam = {
          squadPlayers: picks.picks.map((p) => byId.get(p.element)),
          elements: bootstrap.elements,
          bank: picks.entry_history.bank,
          fromGw: nextEvent(bootstrap.events)?.id ?? gw,
        };
      } catch (err) {
        if (!(err instanceof FplError && err.status === 404)) throw err;
      }
    }
  }
  return buildBrief({ bootstrap, fixtures, myTeam });
}

router.get('/', async (req, res, next) => {
  try {
    res.renderPage('brief', { title: 'Gameweek-brief', brief: await assembleBrief() });
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 2:** Opprett `src/routes/api.js`:
```js
import { Router } from 'express';
import { assembleBrief } from './brief.js';

const router = Router();

router.get('/brief.json', async (req, res, next) => {
  try {
    res.json(await assembleBrief());
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 3:** Opprett `views/brief.ejs` (bruk eksisterende klasser; struktur):
```ejs
<section class="page-head">
  <h1>Gameweek-brief<% if (brief.gameweek) { %> — <%= brief.gameweek.name %><% } %></h1>
  <% if (brief.gameweek) { %><p class="dim">Deadline: <strong><%= brief.gameweek.deadlineFormatted %></strong></p><% } %>
</section>

<div class="grid">
  <section class="card">
    <h2>Skader og suspensjoner (høyt eide)</h2>
    <% if (brief.injuries.length === 0) { %><p class="empty">Ingen viktige skader meldt.</p><% } else { %>
      <ul class="rec-list"><% for (const i of brief.injuries) { %>
        <li><strong><%= i.name %></strong> <span class="dim"><%= i.team %> · eid <%= i.ownership %> %</span><ul class="reasons"><li><%= i.news %></li></ul></li>
      <% } %></ul>
    <% } %>
  </section>
  <section class="card">
    <h2>Kapteinsvalg globalt</h2>
    <ol class="rec-list"><% for (const c of brief.captains) { %>
      <li><strong><%= c.name %></strong> <span class="dim"><%= c.team %> · form <%= c.form %> · eid <%= c.ownership %> %<% if (c.avgFdr != null) { %> · FDR <%= c.avgFdr.toFixed(1) %><% } %></span></li>
    <% } %></ol>
  </section>
</div>

<section class="card card-wide">
  <h2>Kamper i runden</h2>
  <% if (brief.fixturesByDay.length === 0) { %><p class="empty">Ingen kamper funnet.</p><% } %>
  <div class="grid">
    <% for (const d of brief.fixturesByDay) { %>
      <div>
        <h3 class="sub-head"><%= d.day %></h3>
        <ul class="reasons" style="padding-left: 0; list-style: none;">
          <% for (const m of d.matches) { %><li><strong><%= m.kickoff %></strong> <%= m.home %> – <%= m.away %></li><% } %>
        </ul>
      </div>
    <% } %>
  </div>
</section>

<% if (brief.mine) { %>
  <div class="grid">
    <section class="card">
      <h2>Mine kapteinsvalg</h2>
      <ol class="rec-list"><% for (const c of brief.mine.captains) { %>
        <li><strong><%= c.player.web_name %></strong><ul class="reasons"><% for (const r of c.reasons) { %><li><%= r %></li><% } %></ul></li>
      <% } %></ol>
    </section>
    <section class="card">
      <h2>Mine transferkandidater</h2>
      <% if (brief.mine.transfers.length === 0) { %><p class="empty">Ingen åpenbare bytter.</p><% } else { %>
        <% for (const t of brief.mine.transfers) { %>
          <p class="transfer-out"><strong>Ut:</strong> <%= t.out.player.web_name %><% if (t.inn.length) { %> · <strong>Inn:</strong> <%= t.inn.map((k) => k.player.web_name).join(', ') %><% } %></p>
        <% } %>
      <% } %>
    </section>
  </div>
<% } else { %>
  <section class="card"><p class="empty">Sett FPL_TEAM_ID for å få personlige anbefalinger i briefen.</p></section>
<% } %>
```
- [x] **Steg 4:** Monter i server.js: `app.use('/brief', briefRouter);` og `app.use('/api', apiRouter);` + nav `Brief`. Røyk-test `/brief` (200) og `/api/brief.json` (200, gyldig JSON med `gameweek`-felt). Test + lint grønne.
      Mot ekte FPL-data: `/brief` 200, `/api/brief.json` 200 med
      `gameweek.id = 1`, deadline «fredag 21. august kl. 19:30», 1 skade,
      3 kapteinsforslag og 4 kampdager. 26/26 tester, lint 0.
- [x] **Steg 5:** Commit `feat: gameweek-brief som side og JSON-API`

### Task 5.3: Release v0.5.0
- [x] Som Task 2.4: CHANGELOG `[0.5.0]`, ROADMAP, version, HANDOVER, `docs: release v0.5.0`, tag, push, verifiser prod /brief og /api/brief.json

---

## MILEPÆL v0.6.0 — /live

### Task 6.1: estimateBonus() i analysis.js (TDD)

**Files:** Modify: `src/services/analysis.js`, `test/analysis.test.js`

**Interfaces (produseres):** `estimateBonus(fixture) → Map<elementId, bonus>` — leser `fixture.stats` (identifier `bps`), FPL-bonusregler med delte plasser.

- [x] **Steg 1 (RED):** Append test:
```js
function fixtureWithBps(hs, as) {
  return {
    stats: [
      { identifier: 'bps', h: hs.map(([element, value]) => ({ element, value })), a: as.map(([element, value]) => ({ element, value })) },
    ],
  };
}

test('estimateBonus gir 3/2/1 til topp 3 BPS', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 25]], [[3, 28], [4, 10]]));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(3), 2);
  assert.equal(b.get(2), 1);
  assert.equal(b.get(4), undefined);
});

test('estimateBonus deler ved likhet: to paa topp gir 3+3 og deretter 1', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 30]], [[3, 20]]));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(2), 3);
  assert.equal(b.get(3), 1);
});

test('estimateBonus: likhet paa andreplass gir 2+2, ingen enerpoeng', () => {
  const b = estimateBonus(fixtureWithBps([[1, 30], [2, 25], [3, 25], [4, 20]], []));
  assert.equal(b.get(1), 3);
  assert.equal(b.get(2), 2);
  assert.equal(b.get(3), 2);
  assert.equal(b.get(4), undefined);
});

test('estimateBonus taaler manglende stats', () => {
  assert.equal(estimateBonus({ stats: [] }).size, 0);
  assert.equal(estimateBonus({}).size, 0);
});
```
- [x] **Steg 2:** `npm test` → FEILER.
- [x] **Steg 3 (GREEN):** Append i analysis.js:
```js
/**
 * Bonusestimat fra BPS i en pågående kamp. Topp 3 BPS får 3/2/1.
 * Likhet deler plassen etter FPL-reglene (3,3→1 · 3,2,2 · 3,3,3 · 3,2,1,1).
 */
export function estimateBonus(fixture) {
  const result = new Map();
  const bpsStat = fixture.stats?.find((s) => s.identifier === 'bps');
  if (!bpsStat) return result;
  const all = [...(bpsStat.h ?? []), ...(bpsStat.a ?? [])]
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  if (all.length === 0) return result;

  const awards = [3, 2, 1];
  let index = 0;
  let awardSlot = 0;
  while (index < all.length && awardSlot < 3) {
    const tied = all.filter((e) => e.value === all[index].value);
    const award = awards[awardSlot];
    for (const e of tied) result.set(e.element, award);
    awardSlot += tied.length;
    index += tied.length;
  }
  return result;
}
```
- [x] **Steg 4:** `npm test` grønn (30/30). Commit `feat: bonusestimat fra BPS`

### Task 6.2: /api/live.json og /live-side med betinget polling

**Files:** Create: `src/routes/live.js`, `views/live.ejs`; Modify: `src/routes/api.js` (live.json), `src/server.js` (`app.use('/live', liveRouter);`), `views/layout.ejs` (nav `Live`), `public/app.js` (modul 3), `public/style.css` (puls)

- [x] **Steg 1:** Opprett `src/routes/live.js`:
```js
import { Router } from 'express';
import config from '../config.js';
import { getBootstrap } from '../services/fplClient.js';
import { currentEvent } from '../services/analysis.js';
import { assembleLive } from './api.js';

const router = Router();

router.get('/', async (req, res, next) => {
  if (!config.hasTeamId) return res.renderPage('no-team', { title: 'Live' });
  try {
    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id ?? null;
    const live = gw ? await assembleLive() : null;
    res.renderPage('live', { title: 'Live', live, gw });
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 2:** I `src/routes/api.js` — legg til (og eksporter `assembleLive`):
```js
import config from '../config.js';
import { getBootstrap, getFixtures, getLive, getPicks, getLeagueStandings, getEntry, FplError } from '../services/fplClient.js';
import { currentEvent, estimateBonus, POSITIONS_SHORT } from '../services/analysis.js';

export async function assembleLive() {
  const bootstrap = await getBootstrap();
  const gw = currentEvent(bootstrap.events)?.id;
  if (!gw) return { updatedAt: new Date().toISOString(), anyLive: false, gameweek: null, myPlayers: [], matches: [], leagues: [] };

  const [fixtures, live] = await Promise.all([getFixtures(gw), getLive(gw)]);
  const anyLive = fixtures.some((f) => f.started && !f.finished);
  const liveById = new Map(live.elements.map((e) => [e.id, e.stats]));
  const elementsById = new Map(bootstrap.elements.map((e) => [e.id, e]));
  const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]));

  // Bonusestimat kun for kamper som ikke er ferdige (ferdige har ekte bonus i stats)
  const bonusEst = new Map();
  for (const f of fixtures) {
    if (f.started && !f.finished) {
      for (const [el, b] of estimateBonus(f)) bonusEst.set(el, b);
    }
  }

  let myPlayers = [];
  let totalLive = null;
  try {
    const picks = await getPicks(config.fplTeamId, gw);
    myPlayers = picks.picks.map((pk) => {
      const p = elementsById.get(pk.element);
      const stats = liveById.get(pk.element) ?? { total_points: 0, minutes: 0, bonus: 0 };
      const bonus = stats.bonus > 0 ? 0 : (bonusEst.get(pk.element) ?? 0);
      return {
        name: p.web_name,
        team: teamsById.get(p.team)?.short_name ?? '?',
        pos: POSITIONS_SHORT[p.element_type],
        isCaptain: pk.is_captain,
        multiplier: pk.multiplier,
        onBench: pk.position >= 12,
        minutes: stats.minutes,
        points: stats.total_points,
        bonusEst: bonus,
        effective: (stats.total_points + bonus) * (pk.multiplier || (pk.position >= 12 ? 0 : 1)),
      };
    });
    totalLive = myPlayers.reduce((sum, p) => sum + p.effective, 0);
  } catch (err) {
    if (!(err instanceof FplError && err.status === 404)) throw err;
  }

  const matches = fixtures.map((f) => ({
    home: teamsById.get(f.team_h)?.short_name ?? '?',
    away: teamsById.get(f.team_a)?.short_name ?? '?',
    homeScore: f.team_h_score,
    awayScore: f.team_a_score,
    started: f.started,
    finished: f.finished,
    minutes: f.minutes,
  }));

  let leagues = [];
  try {
    const ids = config.leagueIds.length
      ? config.leagueIds
      : (await getEntry(config.fplTeamId)).leagues.classic.filter((l) => l.league_type === 'x').map((l) => l.id);
    leagues = (await Promise.all(ids.map((id) => getLeagueStandings(id)))).map((l) => ({
      name: l.league.name,
      top: l.standings.results.slice(0, 8).map((r) => ({
        rank: r.rank,
        name: r.entry_name,
        gw: r.event_total,
        total: r.total,
        me: r.entry === config.fplTeamId,
      })),
    }));
  } catch {
    // Miniliga-feil skal ikke velte live-visningen.
  }

  return { updatedAt: new Date().toISOString(), anyLive, gameweek: gw, totalLive, myPlayers, matches, leagues };
}

router.get('/live.json', async (req, res, next) => {
  try {
    res.json(await assembleLive());
  } catch (err) {
    next(err);
  }
});
```
- [x] **Steg 3:** Opprett `views/live.ejs`:
      **Avvik fra planen (sikkerhet):** `<%- JSON.stringify(live) %>` skriver
      lagnavn fra andre FPL-brukere rått inn i `<script>`-elementet. Et lagnavn
      som inneholder `</script>` bryter da ut av taggen. Implementert som
      `JSON.stringify(live).replace(/</g, '\\u003c')`; verifisert at et navn med
      `</script><img src=x onerror=…>` ikke bryter ut og at JSON-en fortsatt
      parses tilbake til original streng.
```ejs
<section class="page-head">
  <h1>Live<% if (gw) { %> — Gameweek <%= gw %><% } %></h1>
  <p class="dim">
    <span id="live-status"><%= live && live.anyLive ? 'Kamper pågår' : 'Ingen kamper pågår akkurat nå' %></span>
    <span class="pulse<%= live && live.anyLive ? ' pulse-on' : '' %>" id="live-pulse" aria-hidden="true"></span>
    · <span id="live-updated">Sist oppdatert <%= new Date().toLocaleTimeString('nb-NO') %></span>
  </p>
</section>

<div id="live-root" data-live="<%= live && live.anyLive ? '1' : '0' %>">
  <% if (!live || !live.gameweek) { %>
    <section class="card"><p class="empty">Ingen aktiv gameweek — live-visningen våkner når runden starter.</p></section>
  <% } else { %>
    <div class="stat-strip">
      <div class="stat"><span class="stat-val" id="live-total"><%= live.totalLive ?? '–' %></span><span class="stat-lbl">Mine live-poeng</span></div>
    </div>
    <div class="grid">
      <section class="card">
        <h2>Mine spillere</h2>
        <div class="table-scroll"><table class="data" id="live-players">
          <thead><tr><th>Spiller</th><th class="num">Min</th><th class="num">Poeng</th><th class="num">Bonus-est.</th><th class="num">Effektivt</th></tr></thead>
          <tbody></tbody>
        </table></div>
      </section>
      <section class="card">
        <h2>Kamper</h2>
        <div class="table-scroll"><table class="data" id="live-matches">
          <thead><tr><th>Kamp</th><th class="num">Stilling</th><th>Status</th></tr></thead>
          <tbody></tbody>
        </table></div>
      </section>
    </div>
    <div class="grid" id="live-leagues"></div>
    <script id="live-data" type="application/json"><%- JSON.stringify(live) %></script>
  <% } %>
</div>
```
- [x] **Steg 4:** Append modul 3 i `public/app.js`:
```js
// Modul 3: Live-oppdatering (/live). Poller kun mens kamper pågår.
(function () {
  'use strict';

  const root = document.getElementById('live-root');
  const dataEl = document.getElementById('live-data');
  if (!root || !dataEl) return;

  const playersBody = document.querySelector('#live-players tbody');
  const matchesBody = document.querySelector('#live-matches tbody');
  const leaguesRoot = document.getElementById('live-leagues');
  const totalEl = document.getElementById('live-total');
  const statusEl = document.getElementById('live-status');
  const updatedEl = document.getElementById('live-updated');
  const pulseEl = document.getElementById('live-pulse');

  function esc(s) {
    const d = document.createElement('span');
    d.textContent = s;
    return d.innerHTML;
  }

  function render(live) {
    if (totalEl) totalEl.textContent = live.totalLive == null ? '–' : live.totalLive;
    playersBody.innerHTML = live.myPlayers
      .map(function (p) {
        return (
          '<tr' + (p.onBench ? ' style="opacity:.55"' : '') + '><td><strong>' + esc(p.name) + '</strong>' +
          (p.isCaptain ? ' <b class="cap">C</b>' : '') + ' <span class="dim">' + esc(p.team) + '</span></td>' +
          '<td class="num">' + p.minutes + "'</td>" +
          '<td class="num">' + p.points + '</td>' +
          '<td class="num">' + (p.bonusEst > 0 ? '+' + p.bonusEst : '–') + '</td>' +
          '<td class="num"><strong>' + p.effective + '</strong></td></tr>'
        );
      })
      .join('');
    matchesBody.innerHTML = live.matches
      .map(function (m) {
        const status = m.finished ? 'Slutt' : m.started ? m.minutes + "'" : 'Ikke startet';
        const score = m.homeScore == null ? '–' : m.homeScore + ' – ' + m.awayScore;
        return '<tr><td>' + esc(m.home) + ' – ' + esc(m.away) + '</td><td class="num">' + score + '</td><td>' + status + '</td></tr>';
      })
      .join('');
    leaguesRoot.innerHTML = live.leagues
      .map(function (l) {
        return (
          '<section class="card"><h2>' + esc(l.name) + '</h2><div class="table-scroll"><table class="data"><thead><tr><th class="num">#</th><th>Lag</th><th class="num">GW</th><th class="num">Totalt</th></tr></thead><tbody>' +
          l.top
            .map(function (r) {
              return '<tr' + (r.me ? ' class="row-me"' : '') + '><td class="num">' + r.rank + '</td><td>' + esc(r.name) + '</td><td class="num">' + r.gw + '</td><td class="num">' + r.total + '</td></tr>';
            })
            .join('') +
          '</tbody></table></div></section>'
        );
      })
      .join('');
    statusEl.textContent = live.anyLive ? 'Kamper pågår' : 'Ingen kamper pågår akkurat nå';
    updatedEl.textContent = 'Sist oppdatert ' + new Date().toLocaleTimeString('nb-NO');
    pulseEl.classList.toggle('pulse-on', live.anyLive);
    return live.anyLive;
  }

  let anyLive = render(JSON.parse(dataEl.textContent));

  async function poll() {
    try {
      const res = await fetch('/api/live.json');
      if (!res.ok) return;
      anyLive = render(await res.json());
      if (!anyLive) clearInterval(timer);
    } catch {
      // Nettverksglipp — prøver igjen neste tick.
    }
  }

  // Poll KUN mens kamper pågår — aldri utenfor kampvinduer.
  let timer = null;
  if (anyLive) timer = setInterval(poll, 60000);
})();
```
- [x] **Steg 5:** Append i `public/style.css`:
```css
/* ---------- Live-puls ---------- */

.pulse {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--border);
  margin-left: 0.35rem;
}

.pulse-on {
  background: var(--accent);
}

@media (prefers-reduced-motion: no-preference) {
  .pulse-on {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
}
```
- [x] **Steg 6:** Monter `/live` + nav. Røyk-test `/live` og `/api/live.json` (200; utenfor kampvindu skal `anyLive:false` og siden vise «Ingen kamper pågår»). Test + lint grønne.
      `/live` 200 med «Ingen aktiv gameweek», `/api/live.json` 200 med
      `anyLive:false` og ingen polling. Live-grenen mock-rendret: overskrift,
      puls, statstripe, tabeller, ligarot og innebygd JSON verifisert.
- [x] **Steg 7:** Commit `feat: /live med bonusestimat og betinget polling`

### Task 6.3: Release v0.6.0
- [x] Som Task 2.4: CHANGELOG `[0.6.0]`, ROADMAP, version, HANDOVER, `docs: release v0.6.0`, tag, push, verifiser prod /live

---

## MILEPÆL v0.7.0 — /nyheter med AI-oppsummering

### Task 7.1: Avhengigheter + ai.js

**Files:** Create: `src/services/ai.js`; Modify: `package.json` (via npm)

- [x] **Steg 1:** `npm install fast-xml-parser @anthropic-ai/sdk`
      (`@anthropic-ai/sdk@^0.119.0`, `fast-xml-parser@^5.11.0`, 0 sårbarheter.)
- [x] **Steg 2:** Opprett `src/services/ai.js`:
      **Avvik fra planen (to små):** 1) `maxTokens`-default hevet fra 600 til
      2000, og kallene bruker høyere tak (se Task 7.2/8.2) — på `claude-sonnet-5`
      er adaptiv tenkning på som standard og tenketokens trekkes fra `max_tokens`,
      så et tak på 600 kan gi avkortet eller tomt svar. Ubrukte tokens koster
      ingenting; lengden styres av prompten. 2) Tomt svar behandles som feil og
      beholder forrige cachede oppsummering. Kallet holdes bevisst minimalt
      (ingen `thinking`/`output_config.effort`) fordi `effort` gir feil på
      `claude-haiku-4-5`, som er det billige alternativet i `AI_MODEL`.
```js
// Felles Claude API-service. Brukes av nyheter, AI-brief og transfer-rådgiver.
// Kostnadsdisiplin: hard cache med minimumsintervall per nøkkel + in-flight dedup.
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const store = new Map(); // cacheKey -> {text, generatedAt}
const inFlight = new Map();
let client = null;

export function isEnabled() {
  return Boolean(config.anthropicApiKey);
}

function getClient() {
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

/**
 * Genererer tekst med cache: samme cacheKey regenereres tidligst etter
 * minIntervalMs uansett antall besøkende. Returnerer {text, generatedAt}
 * eller null (AI av / første kall feilet).
 */
export async function generate({ cacheKey, minIntervalMs, system, prompt, maxTokens = 600 }) {
  if (!isEnabled()) return null;
  const cached = store.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < minIntervalMs) return cached;
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const p = (async () => {
    try {
      const res = await getClient().messages.create({
        model: config.aiModel,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      const entry = { text, generatedAt: Date.now() };
      store.set(cacheKey, entry);
      return entry;
    } catch (err) {
      console.error('AI-kall feilet:', err.message);
      return cached ?? null; // behold gammel oppsummering ved feil
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, p);
  return p;
}
```
- [x] **Steg 3:** `npm run lint` grønn. Commit `feat: felles AI-service med kostnadscache`

### Task 7.2: news.js + /nyheter + dashboardpanel

**Files:** Create: `src/services/news.js`, `src/routes/news.js`, `views/news.ejs`; Modify: `src/server.js` (`/nyheter`), `views/layout.ejs` (nav `Nyheter`), `src/routes/index.js` + `views/dashboard.ejs` (panel), `README.md` (status-tabellen)

- [x] **Steg 1:** Opprett `src/services/news.js`:
```js
// RSS-nyheter (gratis) + valgfri AI-oppsummering via ai.js.
import { XMLParser } from 'fast-xml-parser';
import config from '../config.js';
import { getOrFetch } from './cache.js';
import * as ai from './ai.js';

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/sport/football/rss.xml',
  'https://www.skysports.com/rss/12040',
];

const MIN = 60_000;
const parser = new XMLParser({ ignoreAttributes: false });

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fpl-dashboard/1.0 (RSS-leser)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Feed ${url} svarte ${res.status}`);
  const xml = parser.parse(await res.text());
  const channel = xml?.rss?.channel;
  if (!channel) return [];
  const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
  return items.map((i) => ({
    title: String(i.title ?? ''),
    link: String(i.link ?? ''),
    description: String(i.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
    published: i.pubDate ? new Date(i.pubDate).toISOString() : null,
    source: String(channel.title ?? url),
  }));
}

export function getNewsItems() {
  const feeds = config.newsFeeds.length ? config.newsFeeds : DEFAULT_FEEDS;
  return getOrFetch(
    'news-items',
    async () => {
      const results = await Promise.allSettled(feeds.map(fetchFeed));
      return results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .sort((a, b) => new Date(b.published ?? 0) - new Date(a.published ?? 0))
        .slice(0, 25);
    },
    { ttl: 15 * MIN },
  );
}

export function buildNewsPrompt(items) {
  const lines = items
    .slice(0, 15)
    .map((i) => `- ${i.title}${i.description ? ` — ${i.description}` : ''}`);
  return `Her er dagens fotballnyheter fra britiske kilder:\n\n${lines.join('\n')}\n\nOppsummer det som er relevant for Fantasy Premier League på norsk, som maks 8 korte punkter. Start hvert punkt med «- ». Sett spillernavn i fet med **navn**. Fokuser på skader, form, overganger og startplass-nytt. Ingen innledning eller avslutning — kun punktene.`;
}

export async function getNews() {
  const items = await getNewsItems();
  let summary = null;
  if (ai.isEnabled() && items.length > 0) {
    summary = await ai.generate({
      cacheKey: 'news-summary',
      minIntervalMs: 30 * MIN,
      system: 'Du er en norsk Fantasy Premier League-ekspert. Svar kort og presist.',
      prompt: buildNewsPrompt(items),
      maxTokens: 600,
    });
  }
  return { items, summary };
}

/** '- **Haaland** er tilbake' → [{html-sikre segmenter}] gjøres i view; her: del i punkter. */
export function summaryPoints(summary) {
  if (!summary?.text) return [];
  return summary.text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}
```
- [x] **Steg 2 (TDD for ren logikk):** Opprett `test/news.test.js`:
      Servicen ble skrevet først, så bevisst brekkasje ble kjørt som verifisering:
      «maks 8» → «maks 9» ga `AssertionError: … did not match /maks 8/` (32 pass,
      1 fail), og etter tilbakestilling 33/33 grønne.
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNewsPrompt, summaryPoints } from '../src/services/news.js';

test('buildNewsPrompt tar med titler og krav om norsk + fete navn', () => {
  const prompt = buildNewsPrompt([
    { title: 'Haaland injury update', description: 'Out for two weeks' },
    { title: 'Salah in form', description: '' },
  ]);
  assert.match(prompt, /Haaland injury update/);
  assert.match(prompt, /Out for two weeks/);
  assert.match(prompt, /norsk/);
  assert.match(prompt, /\*\*navn\*\*/);
  assert.match(prompt, /maks 8/);
});

test('buildNewsPrompt begrenser til 15 saker', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ title: `Sak ${i}`, description: '' }));
  const prompt = buildNewsPrompt(items);
  assert.match(prompt, /Sak 14/);
  assert.doesNotMatch(prompt, /Sak 15\b/);
});

test('summaryPoints deler opp og renser punkter', () => {
  assert.deepEqual(
    summaryPoints({ text: '- **Haaland** tilbake\n- **Salah** i form\n\n' }),
    ['**Haaland** tilbake', '**Salah** i form'],
  );
  assert.deepEqual(summaryPoints(null), []);
});
```
Kjør `npm test` FØR news.js er ferdig skrevet hvis mulig (RED) — hvis du skrev service først: verifiser i det minste at testene består og at en bevisst brekkasje (endre «maks 8» til «maks 9» midlertidig) får testen til å feile, så gjenopprett. Testene skal IKKE kalle nettverket — kun de rene funksjonene.
- [x] **Steg 3:** Opprett `src/routes/news.js`:
```js
import { Router } from 'express';
import { getNews, summaryPoints } from '../services/news.js';
import * as ai from '../services/ai.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const news = await getNews();
    res.renderPage('news', {
      title: 'Nyheter',
      items: news.items,
      points: summaryPoints(news.summary),
      generatedAt: news.summary?.generatedAt ?? null,
      aiEnabled: ai.isEnabled(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
```
- [x] **Steg 4:** Opprett `views/news.ejs`.
      **Avvik fra planen:** escapingen er skrevet som to navngitte hjelpere
      (`esc()` + `bold()`) i stedet for planens inline-IIFE — samme oppførsel,
      lesbar. I tillegg slipper `safeLink()` bare `http(s)`-lenker gjennom, siden
      RSS-lenker er tredjepartsinnhold (`javascript:`-lenker blir `#`).
      Verifisert med mock-rendring: `<script>` i AI-teksten escapes, `&` escapes,
      `**navn**` blir `<strong>`, `javascript:`-lenke blokkeres.
      Planens opprinnelige XSS-regel: AI-tekst er utrygg — escape alt med `<%= %>`, og gjør SÅ fet-markering trygt i en hjelpefunksjon i viewet:
```ejs
<% function bold(escaped) { return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); } %>
<section class="page-head">
  <h1>FPL-nyheter</h1>
  <p class="dim"><%= aiEnabled ? 'AI-oppsummert med jevne mellomrom fra britiske kilder.' : 'Rå feed-liste. Sett ANTHROPIC_API_KEY for norsk AI-oppsummering.' %></p>
</section>

<% if (points.length > 0) { %>
  <section class="card card-wide">
    <h2>AI-oppsummering<% if (generatedAt) { %> <span class="dim">(generert <%= new Date(generatedAt).toLocaleTimeString('nb-NO') %>)</span><% } %></h2>
    <ul class="rec-list">
      <% for (const p of points) { %><li><%- bold((() => { const d = { v: '' }; d.v = p; return p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); })()) %></li><% } %>
    </ul>
  </section>
<% } %>

<section class="card card-wide">
  <h2>Siste saker</h2>
  <ul class="news-list">
    <% for (const i of items) { %>
      <li>
        <a href="<%= i.link %>" rel="noopener" target="_blank"><%= i.title %></a>
        <span class="dim"><%= i.source %><% if (i.published) { %> · <%= new Date(i.published).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' }) %><% } %></span>
      </li>
    <% } %>
  </ul>
</section>
```
og CSS-append:
```css
/* ---------- Nyheter ---------- */

.news-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.news-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.news-list li:last-child {
  border-bottom: none;
}
```
- [x] **Steg 5:** Dashboardpanel: i `src/routes/index.js` — importer `getNews, summaryPoints` fra news.js og `isEnabled` fra ai.js; hent nyheter parallelt i `Promise.all`; send `newsPoints: summaryPoints(news.summary).slice(0, 3)` til viewet (tåler feil: wrap news-kallet i try/catch → tomt panel). I `views/dashboard.ejs` legg til nederst:
```ejs
<% if (newsPoints && newsPoints.length > 0) { %>
  <section class="card card-wide">
    <h2>Siste FPL-nytt (AI)</h2>
    <ul class="rec-list"><% for (const p of newsPoints) { %><li><%= p.replace(/\*\*/g, '') %></li><% } %></ul>
    <p class="hint"><a href="/nyheter">Alle nyheter →</a></p>
  </section>
<% } %>
```
- [x] **Steg 6:** Monter `/nyheter` + nav. Røyk-test `/nyheter` uten nøkkel (rå liste, 200). Har du ANTHROPIC_API_KEY i lokal `.env`: test med (AI-seksjon vises). Test + lint grønne.
      `/nyheter` 200 med 25 ekte RSS-saker og «Rå feed-liste»-teksten (ingen
      nøkkel lokalt). Dashboardet 200 uten nyhetspanel, som forventet uten AI.
      33/33 tester, lint 0. AI-seksjonen er verifisert med mock-rendring.
- [x] **Steg 7:** Commit `feat: /nyheter med RSS og valgfri AI-oppsummering` + oppdater README side-tabell. **Si fra til bruker:** legg `ANTHROPIC_API_KEY` (og ev. `AI_MODEL`) inn i Coolify for AI i prod.
      → Sagt fra til bruker i svaret; `ANTHROPIC_API_KEY` mangler fortsatt i Coolify.

### Task 7.3: Release v0.7.0
- [x] Som Task 2.4: CHANGELOG `[0.7.0]`, ROADMAP (alle fem punkter), version, HANDOVER, `docs: release v0.7.0`, tag, push, verifiser prod /nyheter

---

## MILEPÆL v0.8.0 — AI-brief og transfer-rådgiver

### Task 8.1: Promptbyggere (TDD)

**Files:** Create: `src/services/prompts.js`; Test: `test/prompts.test.js`

**Interfaces (produseres):** `buildBriefPrompt(brief) → string`, `buildAdvicePrompt({entryName, bank, squadLines, outs}) → string` — rene funksjoner.

- [ ] **Steg 1 (RED):** Opprett `test/prompts.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefPrompt, buildAdvicePrompt } from '../src/services/prompts.js';

test('buildBriefPrompt tar med deadline, skader og kapteiner', () => {
  const prompt = buildBriefPrompt({
    gameweek: { id: 2, name: 'Gameweek 2', deadlineFormatted: 'fredag 21. august kl. 19:30' },
    injuries: [{ name: 'Haaland', team: 'MCI', ownership: '55.1', news: 'Kne — 75 %', status: 'd' }],
    captains: [{ name: 'Salah', team: 'LIV', form: '8.5', ownership: '45.0', avgFdr: 2 }],
    fixturesByDay: [{ day: 'fredag 21. august', matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00' }] }],
    mine: null,
  });
  assert.match(prompt, /Gameweek 2/);
  assert.match(prompt, /fredag 21\. august kl\. 19:30/);
  assert.match(prompt, /Haaland/);
  assert.match(prompt, /Salah/);
  assert.match(prompt, /norsk/i);
});

test('buildAdvicePrompt tar med tropp, bank og salgskandidater', () => {
  const prompt = buildAdvicePrompt({
    entryName: 'Mitt Lag FC',
    bank: 15,
    squadLines: ['Haaland (MCI, A, 14.2, form 8.0)'],
    outs: ['Spiller X: Skadet'],
  });
  assert.match(prompt, /Mitt Lag FC/);
  assert.match(prompt, /1\.5/); // bank i £m
  assert.match(prompt, /Haaland/);
  assert.match(prompt, /Spiller X/);
});
```
- [ ] **Steg 2:** `npm test` → FEILER.
- [ ] **Steg 3 (GREEN):** Opprett `src/services/prompts.js`:
```js
// Rene promptbyggere for AI-funksjonene. Ingen nettverkskall her.
import { formatPrice } from './analysis.js';

export function buildBriefPrompt(brief) {
  const parts = [
    `Skriv en kort gameweek-brief på norsk for Fantasy Premier League, ${brief.gameweek?.name ?? 'kommende runde'}.`,
    `Deadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}.`,
    '',
    'Skadenytt (høyt eide spillere):',
    ...brief.injuries.map((i) => `- ${i.name} (${i.team}, eid ${i.ownership} %): ${i.news}`),
    '',
    'Mest aktuelle kapteiner globalt:',
    ...brief.captains.map((c) => `- ${c.name} (${c.team}), form ${c.form}, eid ${c.ownership} %`),
    '',
    'Kamper:',
    ...brief.fixturesByDay.map((d) => `${d.day}: ${d.matches.map((m) => `${m.home}–${m.away} ${m.kickoff}`).join(', ')}`),
  ];
  if (brief.mine) {
    parts.push('', 'Mine kapteinskandidater:', ...brief.mine.captains.map((c) => `- ${c.player.web_name}: ${c.reasons.join('; ')}`));
    parts.push('', 'Mine mulige bytter:', ...brief.mine.transfers.map((t) => `- Ut: ${t.out.player.web_name} (${t.out.reasons.join('; ')}). Inn-kandidater: ${t.inn.map((k) => k.player.web_name).join(', ') || 'ingen'}`));
  }
  parts.push(
    '',
    'Skriv briefen med disse seksjonene i markdown: «Deadline», «Skadenytt», «Kapteinsvalg», «Kamper å følge med på»' +
      (brief.mine ? ', «Mine grep»' : '') +
      '. Vær konkret og kortfattet, sett spillernavn i **fet**. Maks ~350 ord. Ingen innledning utover seksjonene.',
  );
  return parts.join('\n');
}

export function buildAdvicePrompt({ entryName, bank, squadLines, outs }) {
  return [
    `Du er FPL-rådgiver. Laget «${entryName}» har ${formatPrice(bank)} £m i banken.`,
    '',
    'Troppen (navn, lag, posisjon, pris, form):',
    ...squadLines.map((l) => `- ${l}`),
    '',
    outs.length ? 'Automatisk flaggede salgskandidater:' : 'Ingen automatisk flaggede salgskandidater.',
    ...outs.map((o) => `- ${o}`),
    '',
    'Gi på norsk: 1) beste kaptein denne runden med begrunnelse, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Sett spillernavn i **fet**. Maks ~250 ord.',
  ].join('\n');
}
```
- [ ] **Steg 4:** `npm test` grønn. Commit `feat: promptbyggere for AI-brief og raadgiver`

### Task 8.2: AI-brief på /brief

**Files:** Modify: `src/routes/brief.js`, `views/brief.ejs`

- [ ] **Steg 1:** I `src/routes/brief.js`: importer `* as ai` og `buildBriefPrompt`. I GET-handleren, etter `assembleBrief()`:
```js
let aiBrief = null;
if (ai.isEnabled()) {
  aiBrief = await ai.generate({
    cacheKey: `ai-brief-gw${brief.gameweek?.id ?? 0}`,
    minIntervalMs: 60 * 60_000,
    system: 'Du er en norsk Fantasy Premier League-ekspert. Skriv presist og handlingsorientert.',
    prompt: buildBriefPrompt(brief),
    maxTokens: 1500,
  });
}
res.renderPage('brief', { title: 'Gameweek-brief', brief, aiBrief });
```
- [ ] **Steg 2:** I `views/brief.ejs`, øverst etter page-head: AI-seksjon (samme escape-så-fet-mønster som news.ejs; splitt på linjer, `##`-linjer → `<h3 class="sub-head">`):
```ejs
<% if (typeof aiBrief !== 'undefined' && aiBrief?.text) { %>
  <section class="card card-wide">
    <h2>AI-brief <span class="dim">(generert <%= new Date(aiBrief.generatedAt).toLocaleTimeString('nb-NO') %> — datagrunnlaget vises under)</span></h2>
    <% for (const line of aiBrief.text.split('\n')) { const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); %>
      <% if (/^#{1,3}\s/.test(line)) { %><h3 class="sub-head"><%- esc.replace(/^#{1,3}\s*/, '') %></h3>
      <% } else if (line.trim()) { %><p><%- esc.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') %></p><% } %>
    <% } %>
  </section>
<% } %>
```
- [ ] **Steg 3:** Røyk-test /brief med og uten nøkkel. Test + lint. Commit `feat: AI-skrevet gameweek-brief med datafallback`

### Task 8.3: Transfer-rådgiver på /lag

**Files:** Modify: `src/routes/api.js` (POST /api/ai-rad), `src/server.js` (`app.use(express.json());` — legg rett etter `app.use(compression());`), `views/team.ejs` (knapp + resultatboks), `public/app.js` (modul 4)

- [ ] **Steg 1:** I `src/routes/api.js`:
```js
import * as ai from '../services/ai.js';
import { buildAdvicePrompt } from '../services/prompts.js';
import { transferOutCandidates, nextEvent as nextEv, POSITIONS_SHORT as POS, formatPrice as fmtPrice } from '../services/analysis.js';

router.post('/ai-rad', async (req, res, next) => {
  try {
    if (!ai.isEnabled()) return res.status(400).json({ error: 'AI er ikke aktivert (mangler ANTHROPIC_API_KEY).' });
    if (!config.hasTeamId) return res.status(400).json({ error: 'FPL_TEAM_ID er ikke satt.' });

    const bootstrap = await getBootstrap();
    const gw = currentEvent(bootstrap.events)?.id;
    if (!gw) return res.status(400).json({ error: 'Ingen aktiv gameweek.' });

    const [entry, picks, fixtures] = await Promise.all([
      getEntry(config.fplTeamId),
      getPicks(config.fplTeamId, gw),
      getFixtures(),
    ]);
    const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
    const teamsById = new Map(bootstrap.teams.map((t) => [t.id, t]));
    const squad = picks.picks.map((p) => byId.get(p.element));
    const fromGw = nextEv(bootstrap.events)?.id ?? gw;

    const result = await ai.generate({
      cacheKey: `ai-rad-${config.fplTeamId}-gw${fromGw}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-rådgiver. Vær konkret.',
      prompt: buildAdvicePrompt({
        entryName: entry.name,
        bank: picks.entry_history.bank,
        squadLines: squad.map((p) => `${p.web_name} (${teamsById.get(p.team)?.short_name}, ${POS[p.element_type]}, ${fmtPrice(p.now_cost)}, form ${p.form})`),
        outs: transferOutCandidates(squad, fixtures, fromGw).map((o) => `${o.player.web_name}: ${o.reasons.join('; ')}`),
      }),
      maxTokens: 1500,
    });
    if (!result) return res.status(502).json({ error: 'AI-kallet feilet — prøv igjen senere.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```
- [ ] **Steg 2:** I `views/team.ejs`, nederst (kun når `recommendations` finnes):
```ejs
<section class="card card-wide" id="ai-advice-box">
  <h2>AI-rådgiver</h2>
  <p class="dim">Sender troppen og analysen til Claude og får begrunnede råd. Svar caches i én time.</p>
  <button type="button" id="ai-advice-btn" class="btn-accent">Spør AI om råd</button>
  <div id="ai-advice-result" class="ai-result" hidden></div>
</section>
```
- [ ] **Steg 3:** Append modul 4 i `public/app.js`:
```js
// Modul 4: AI-rådgiver på /lag.
(function () {
  'use strict';

  const btn = document.getElementById('ai-advice-btn');
  const out = document.getElementById('ai-advice-result');
  if (!btn || !out) return;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Tenker …';
    out.hidden = false;
    out.textContent = '';
    try {
      const res = await fetch('/api/ai-rad', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        out.textContent = data.error || 'Noe gikk galt.';
      } else {
        out.innerHTML = data.text
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => '<p>' + escapeHtml(l).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</p>')
          .join('');
      }
    } catch {
      out.textContent = 'Nettverksfeil — prøv igjen.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Spør AI om råd';
    }
  });
})();
```
og CSS-append:
```css
/* ---------- AI-rådgiver ---------- */

.btn-accent {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-accent:disabled {
  opacity: 0.6;
  cursor: wait;
}

.ai-result {
  margin-top: 0.75rem;
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  font-size: 0.92rem;
}
```
- [ ] **Steg 4:** Røyk-test: uten nøkkel → knappen gir feilmelding pent; med nøkkel → tekst kommer. Test + lint. Commit `feat: AI transfer-raadgiver paa /lag`

### Task 8.4: Release v0.8.0
- [ ] Som Task 2.4 (CHANGELOG `[0.8.0]`, ROADMAP v0.8.0-punktene, version, HANDOVER, tag, push, verifiser prod)

---

## MILEPÆL v0.9.0 — Auto-brief før deadline (Discord)

### Task 9.1: notify.js + oppstart

**Files:** Create: `src/services/notify.js`; Modify: `src/server.js` (start scheduler etter `app.listen`)

- [ ] **Steg 1:** Opprett `src/services/notify.js`:
```js
// Sender gameweek-briefen til Discord-webhook X timer før deadline.
// Enkel deadline-scheduler uten cron-avhengighet: sjekker hver 6. time og
// setter en presis timer når send-tidspunktet er innenfor vinduet.
import config from '../config.js';
import { getBootstrap } from './fplClient.js';
import { nextEvent } from './analysis.js';
import { assembleBrief } from '../routes/brief.js';
import { buildBriefPrompt } from './prompts.js';
import * as ai from './ai.js';

const CHECK_INTERVAL = 6 * 60 * 60_000;
let timer = null;
let lastSentEvent = null;

export function startScheduler() {
  if (!config.discordWebhookUrl) return;
  check();
  setInterval(check, CHECK_INTERVAL).unref?.();
  console.log(`Auto-brief aktiv: sender ${config.briefHoursBeforeDeadline} t før deadline`);
}

async function check() {
  try {
    const { events } = await getBootstrap();
    const upcoming = nextEvent(events);
    if (!upcoming || upcoming.id === lastSentEvent) return;
    const sendAt = new Date(upcoming.deadline_time).getTime() - config.briefHoursBeforeDeadline * 60 * 60_000;
    const delay = sendAt - Date.now();
    if (delay > CHECK_INTERVAL) return; // neste sjekk tar den
    clearTimeout(timer);
    timer = setTimeout(() => send(upcoming), Math.max(delay, 0));
    timer.unref?.();
  } catch (err) {
    console.error('Auto-brief-sjekk feilet:', err.message);
  }
}

async function send(event) {
  try {
    if (event.id === lastSentEvent) return;
    const brief = await assembleBrief();
    let text = null;
    if (ai.isEnabled()) {
      const aiBrief = await ai.generate({
        cacheKey: `ai-brief-gw${brief.gameweek?.id ?? 0}`,
        minIntervalMs: 60 * 60_000,
        system: 'Du er en norsk Fantasy Premier League-ekspert. Skriv presist og handlingsorientert.',
        prompt: buildBriefPrompt(brief),
        maxTokens: 1500,
      });
      text = aiBrief?.text ?? null;
    }
    if (!text) text = dataBriefText(brief);

    const header = `**Gameweek-brief — ${brief.gameweek?.name ?? ''}**\nDeadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}\nhttps://fpl.marsk.no/brief\n\n`;
    await postToDiscord(header + text);
    lastSentEvent = event.id;
    console.log(`Auto-brief sendt for ${event.name}`);
  } catch (err) {
    console.error('Auto-brief-sending feilet:', err.message);
  }
}

function dataBriefText(brief) {
  const lines = ['**Skadenytt:**'];
  for (const i of brief.injuries.slice(0, 6)) lines.push(`- ${i.name} (${i.team}): ${i.news}`);
  lines.push('', '**Kapteinsvalg:**');
  for (const c of brief.captains) lines.push(`- ${c.name} (${c.team}) — form ${c.form}, eid ${c.ownership} %`);
  return lines.join('\n');
}

async function postToDiscord(text) {
  // Discord tillater maks 2000 tegn per melding — del opp på avsnitt.
  const chunks = [];
  let current = '';
  for (const paragraph of text.split('\n')) {
    if (current.length + paragraph.length + 1 > 1900) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + paragraph;
  }
  if (current) chunks.push(current);

  for (const content of chunks) {
    const res = await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Discord svarte ${res.status}`);
  }
}
```
- [ ] **Steg 2:** I `src/server.js`: `import { startScheduler } from './services/notify.js';` og kall `startScheduler();` rett etter `app.listen(...)`-blokken.
- [ ] **Steg 3:** Test uten webhook-URL (scheduler inaktiv, server starter normalt — røyk-test /health). Lint + test grønne.
- [ ] **Steg 4:** Commit `feat: auto-brief til Discord foer deadline`. **Si fra til bruker:** lag Discord-webhook (Discord-kanal → Innstillinger → Integrasjoner → Webhooks) og sett `DISCORD_WEBHOOK_URL` (+ ev. `BRIEF_HOURS_BEFORE_DEADLINE`) i Coolify.

### Task 9.2: Release v0.9.0
- [ ] Som Task 2.4 (CHANGELOG `[0.9.0]`, ROADMAP, version, HANDOVER, tag, push)

---

## MILEPÆL v1.0.0 — Polish

### Task 10.1: Gjennomgang og herding

- [ ] **Mobil:** gå gjennom hver side i nettleser på 375 px bredde (DevTools). Krav: ingen horisontal scroll på `body` (tabeller scroller i `.table-scroll`), nav bryter pent, hero-nedtelling skalerer. Fiks det som ryker med media queries i style.css.
- [ ] **Tomtilstander:** verifiser tekstene som allerede finnes (ingen flagg, tom liga, ingen kamper, ingen picks). Mangler noen side en tom-tilstand → legg til `.empty`-avsnitt.
- [ ] **Feiltilstand:** stopp nettet (slå av wifi eller blokkér fantasy.premierleague.com i hosts midlertidig) → alle sider skal gi den norske 500-siden, ikke krasj. Start serveren uten `.env` → `/`, `/spillere`, `/brief`, `/nyheter` fungerer; `/lag`, `/liga`, `/live` viser no-team.
- [ ] **TTL-gjennomgang:** les gjennom TTL-ene i fplClient.js mot CLAUDE.md-tabellen (bootstrap/fixtures 15 min, element-summary 30 min, entry/picks/league 5 min, live 1 min) — de skal stemme allerede; rett avvik.
- [ ] **README:** oppdater side-tabellen (alle ✅), legg inn skjermbilder hvis mulig (ellers: be bruker ta dem og noter det i HANDOVER som åpen oppgave).
- [ ] **Full verifisering:** `npm test` + `npm run lint` + røyk-test alle 8 ruter lokalt + `docker build -t fpl-test .` OK.
- [ ] Commit `chore: polish og mobilgjennomgang for v1.0.0`

### Task 10.2: Release v1.0.0
- [ ] CHANGELOG `[1.0.0]`, ROADMAP alle punkter, version 1.0.0, HANDOVER («prosjekt levert, vedlikeholdsmodus»), commit `docs: release v1.0.0`, tag `v1.0.0`, push med tags, verifiser https://fpl.marsk.no

---

## Selvreview (kjørt av planlegger)

- Spec-dekning: alle ROADMAP-punkter v0.2→v1.0 har oppgaver ✔ (inkl. brukerens tre AI-tillegg i v0.8/v0.9)
- Ingen placeholders: all logikk, alle promptbyggere, all klient-JS og alle nye views har komplett kode ✔
- Typekonsistens: `getOrFetch(key, fetcher, {ttl})`, `renderPage(view, data)`, `FplError.status`, `estimateBonus → Map`, `generate({cacheKey, minIntervalMs, system, prompt, maxTokens}) → {text, generatedAt}|null` brukes likt overalt ✔
- Kjente skjøre punkter for utfører: (1) EJS-escaping av AI-tekst — bruk mønstrene ordrett; (2) `assembleLive`-importene i api.js må slås sammen med eksisterende importer fra Task 5.2 (én import per modul); (3) rekkefølge i server.js: express.json() før ruter, alle ruter før 404.
