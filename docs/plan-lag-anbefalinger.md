# Plan: riktige anbefalinger på /lag ved sesongstart (B-1…B-3) → v1.2.2

## Kontekst

Sjekkpunkt B (fredag 21. aug ~20:20, første runde med låst tropp) avdekket at
/lag viser falske anbefalinger ved sesongstart: kapteinslista var pick-rekkefølge
forkledd som rangering (Shaw/Gvardiol/Calafiori, alle «Form 0.0», Haaland unevnt),
AI-rådgiveren manglet runde/kaptein/kamper-kontekst og hedget seg gjennom svaret,
og siden sier «Runde 1» mens alle anbefalinger gjelder Runde 2. Fable planlegger
(denne fila), **Opus 5 utfører** i egen økt.

**Alle fakta re-verifisert i planøkten** (kode lest + engangs GET mot FPL-API-et
21. aug):

- `analysis.js:230`: `score = form × ease × probability` → alle 0 ved sesongstart;
  stabil V8-sort bevarer pick-rekkefølge. Naboene (`transferOutCandidates:252`
  `minutes > 0`-garde, `transferInCandidates:273` filter) er trygge; kommentaren
  ved `analysis.js:94` (QA-funn P1-1) beskriver akkurat dette mønsteret.
- API nå: 502/600 spillere har `ep_next > 0` (Haaland 4.0, Gvardiol 2.5, Shaw 1.7)
  mens `form`/`points_per_game`/`minutes` alle er 0 → `ep_next` er brukbart
  fallback-kriterium som ville satt Haaland øverst.
- Gratis bytter: `entry/{id}/` har IKKE feltet; `my-team/{id}/` gir **403** uten
  innlogging. Ikke gratis tilgjengelig.
- `fromGw = 2` bekreftet (GW1 `is_current`, GW2 `is_next`); `team.js` sender ikke
  `fromGw` til viewet; `views/team.ejs:3` skriver «Runde 1».
- P3-4 (utført på `fix/sanitize-brief`) endret `src/services/prompts.js` +
  `test/prompts.test.js` — samme filer som B-2 rører → basere seg på den branchen
  fjerner merge-konflikten.

## Beslutninger (tatt av Marius i planøkten 21. aug — IKKE re-spør)

1. **B-1-atferd:** fallback-rangering på `ep_next` med merket kriterium.
2. **B-1-garde:** «alle scorer 0» (to-trinns, selvhelende — fanger også
   GW20-tropp der alle er skadet; da blir også ep_next-scoren 0 → tomtilstand).
3. **B-2 gratis bytter:** utelates. Prompten instruerer modellen eksplisitt om å
   ikke spekulere (4-poengskostnad kun som forbehold).
4. **B-3:** «Anbefalinger for Runde N» én gang, over hele anbefalingsseksjonen.
5. **Versjon:** v1.2.2 (egen liten release etter sjekkpunkt D, før v1.3.0).
6. **Branch-base/HANDOVER-sannhet:** `fix/lag-anbefalinger` ut fra
   **`fix/sanitize-brief`** (nyeste HANDOVER/ROADMAP er sannheten der; avvik fra
   oppdragsprompten «ut fra main» er godkjent). Merge-rekkefølge etter D:
   `fix/sanitize-brief` → `fix/lag-anbefalinger` → `main`.

## Endringer

### B-1 — `captainSuggestions` (src/services/analysis.js:222–240)

To-trinns scoring, uendret signatur `(squad, fixtures, fromGw, limit = 3)`:

1. Beregn form-score for ALLE kandidater (utespillere) som i dag.
2. Er samtlige scorer 0 → beregn fallback-score
   `(parseFloat(p.ep_next) || 0) × ease × probability` i stedet.
   Begrunnelser da: `Forventet poeng (FPL): ${p.ep_next}` (ikke «Form 0.0»),
   samme FDR- og spilletidslinjer som før.
3. Er også samtlige fallback-scorer 0 → returner `[]` (viewet viser tomtilstand).
4. Hvert element får nytt felt `criterion: 'form' | 'ep_next'` så viewet kan
   forklare kriteriet. Normal drift (minst én med form > 0): identisk med i dag,
   `criterion: 'form'`.

Garden sjekkes over alle kandidater FØR `slice(0, limit)`. `brief.js`
(`globalCaptains`) røres IKKE — det sjekkpunkt A-funnet står som åpen
ROADMAP-kandidat (auto-briefen observeres av sjekkpunkt C/D).

### B-2 — AI-rådgiver-kontekst

**Ny ren helper i analysis.js** (med tester): `nextOpponents(fixtures, fromGw)` →
`Map<teamId, [{opponent, home, difficulty}]>` for kamper i `fromGw` (håndterer
dobbeltrunde = flere innslag, og lag uten kamp = mangler i mappen).

**src/routes/api.js (36–72)** — kun datasammenstilling, null nye nettverkskall:
- Kaptein/vise fra `picks.picks` (`is_captain`/`is_vice_captain`) → navn via
  `elementsById`.
- Tropplinjene utvides med motstandersegment fra `nextOpponents` + `teamsById`:
  `… form 0.0, mot BOU (hjemme, FDR 2)` / «ingen kamp» / « og »-join ved
  dobbeltrunde.
- Deadline-tekst: finn event med id `fromGw` i `bootstrap.events`, formatér med
  eksisterende `formatDateTime` (src/services/format.js:15).

**`buildAdvicePrompt` (src/services/prompts.js:40–52)** — utvidet parameterobjekt
`{ entryName, bank, fromGw, deadlineText, captainName, viceName, squadLines, outs }`:
- Åpning: «Rådet gjelder Runde N (deadline …).»
- Ny linje: «Nåværende kaptein: X (visekaptein: Y).» + be modellen si eksplisitt
  om kapteinen bør beholdes eller byttes.
- Ny instruksjon: antall gratis bytter er ukjent — ikke anta at bytte er gratis;
  nevn 4-poengskostnaden kun som forbehold.
- Resten (tropp, salgskandidater, norsk, ~250 ord, fet skrift) uendret.

### B-3 — rundetekst

- **src/routes/team.js:76–88**: send `fromGw` til viewet (beregnes alt på linje 47).
- **views/team.ejs**: over `<div class="grid">` (linje 70): overskrift
  «Anbefalinger for Runde <%= fromGw %>» (gjenbruk eksisterende
  overskrift/klasse-mønster fra style.css — ingen nye hardkodede farger).
  Teksten er korrekt også når `fromGw === gw`.
- Kapteinsboksen (linje 71–81) får to nye grener:
  - tom liste → `<p class="empty">Ingen aktuelle kapteiner — ingen i troppen er
    spilleklare.</p>` (`.empty` brukes alt på linje 85)
  - `captains[0].criterion === 'ep_next'` → `<p class="hint">Ingen formdata ennå —
    rangert på FPLs forventede poeng.</p>` (`.hint` brukes alt på linje 65)

## TDD (rødt observert før grønt — `node:test`, ingen nettverk, ingen ekte timere)

Baseline først: `npm test` på fersk branch skal gi **228** (P3-4-nivået).
Avvik → stopp og rapporter. 10 nye tester, **228 → 238**:

`test/analysis.test.js` (+5; `player()`-fixturen mangler `ep_next` — settes per
test via overrides, koden skal tåle at feltet mangler):
1. Alle form 0, ulik `ep_next` → rangerer på ep_next, `criterion: 'ep_next'`,
   begrunnelse inneholder «Forventet poeng (FPL)» og IKKE «Form».
2. Fallback respekterer fixture-lettehet og spilletid (lik ep_next, ulik FDR →
   lett kamp vinner; skadet → score 0).
3. Alle form 0 OG alle ep_next 0/mangler → `[]`.
4. Minst én med form > 0 → dagens oppførsel, `criterion: 'form'` på alle.
5. `nextOpponents`: hjemme/borte + difficulty, dobbeltrunde gir to innslag,
   lag uten kamp mangler i mappen.

`test/prompts.test.js` (+3):
6. Prompten inneholder rundelinje med deadline-tekst og kapteinslinje.
7. Prompten inneholder gratis bytter-instruksjonen og «behold/bytt kaptein»-kravet.
8. Snapshot av full prompt (stabil streng — låser formatet, som P3-4-testene).

`test/views.test.js` (+2; utvid `fx.team`-fixturen med `fromGw` + `criterion`):
9. team.ejs viser «Anbefalinger for Runde 2» og kriterielinjen ved ep_next-fallback.
10. Tom kapteinsliste → «Ingen aktuelle kapteiner»-teksten.

Eksisterende tester (223, 487 m.fl.) skal bestå uendret — de har form > 0.

## AI-kall-regnskap (kostnadsgate)

- **Under implementering: 0.** Prompt-strengen er ren funksjon → snapshot-testes.
  Røyktest kjøres med tomme nøkler (lærdommen i HANDOVER: tomme
  `ANTHROPIC_API_KEY=`/`DISCORD_WEBHOOK_URL=` i scratchpad-.env, verifiser
  `/health` → `ai:false`).
- **Etter sjekkpunkt D: 1 kall** — ett klikk «Spør AI om råd» (lokal server, ekte
  nøkkel) for ende-til-ende-verifisering: svaret skal nevne riktig runde, ta
  stilling til nåværende kaptein, og ikke spekulere i gratis bytter.
  Budsjett: 1 av ~3 brukt (sjekkpunkt B) → blir 2 av ~3.

## Harde regler (fra oppdraget — gjelder utførelsen)

- Branch `fix/lag-anbefalinger` (opprettes av Fable fra `fix/sanitize-brief`).
  **Aldri push. Ingen merge før sjekkpunkt D + klarsignal.** Aldri deploy
  torsdag 19–21.
- Ikke rør: live-polling (`public/app.js`), `notify.js`, `gameUpdating`/banner
  (`fplClient.js`), `brief.js`.
- Ingen nye avhengigheter. All UI-tekst norsk bokmål.
- `npm test` + `npm run lint` grønt før hver commit; conventional commits;
  bevis (kommando + output) for alt.

## Docs (i samme commits som endringene)

- **CHANGELOG `[Unreleased]`**: Fixed B-1 (vilkårlig kapteinsliste → ep_next-
  fallback + tomtilstand), Changed B-2 (rådgiver får runde/deadline/kaptein/
  motstandere; instrueres mot bytte-spekulasjon), Fixed B-3 (rundetekst).
- **ROADMAP** (sanitize-brief-versjonen er basis): ny v1.2.2-seksjon med B-1…B-3;
  kryssnotat på sjekkpunkt A-punktet om `globalCaptains` (brief-varianten står
  igjen som kandidat, /lag-varianten fikses her).
- **HANDOVER**: status + beslutningene over + loggføring av Marius' beskjeder.

## Rekkefølge for utførelsen (Opus 5)

1. `npm test` baseline (forvent 228) + `npm run lint`.
2. B-1: tester 1–4 rødt → implementer → grønt.
3. Helper: test 5 rødt → implementer `nextOpponents` → grønt. Commit B-1.
4. B-2: tester 6–8 rødt → `buildAdvicePrompt` + api.js → grønt. Commit.
5. B-3: tester 9–10 rødt → team.js + team.ejs → grønt. Commit.
6. Røyktest med tomme nøkler (port 3010): /lag 200, «Anbefalinger for Runde N»
   synlig, kapteinsboks viser ep_next-begrunnelser ELLER normal form-rangering
   (etter lørdagskampene kan form > 0 — da er fallback legitimt inaktiv; noter
   hvilken modus som ble observert).
7. Oppdater HANDOVER, final commit. **Ingen push.**
8. (Etter sjekkpunkt D, eget klarsignal:) 1 AI-kall-verifisering, deretter
   release v1.2.2 + merge i rekkefølgen sanitize-brief → lag-anbefalinger → main.

## Fables leveranser rett etter plangodkjenning (kun docs, ingen produksjonskode)

1. Opprett `fix/lag-anbefalinger` fra `fix/sanitize-brief`.
2. Skriv denne planen til `docs/plan-lag-anbefalinger.md`.
3. Skriv kort utførelsesprompt til
   `docs/neste-okt-prompt-lag-anbefalinger-utforelse.md` (peker på planfila,
   gjentar den ikke) + lim den i chatten.
4. Oppdater `docs/HANDOVER.md` (sanitize-brief-versjonen som basis) med B-1…B-3,
   beslutningene og loggføring.
5. Arkiver den konsumerte oppdragsprompten
   `docs/neste-okt-prompt-lag-anbefalinger.md` → `docs/arkiv/` (utracked i dag).
6. Commit alt lokalt på `fix/lag-anbefalinger`. **Ingen push.**
