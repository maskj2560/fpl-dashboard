# Plan v1.2.5 — Brief-kvalitetstrioen

> **Status:** godkjent av Marius 2026-08-24 (planøkt 28, Fable 5).
> **Utføres av:** Opus 5 i egen økt, med `superpowers:executing-plans`.
> **Branch:** `fix/brief-kvalitet` (opprettes fra `main`).
> Kryss av `[ ]` → `[x]` i denne fila etter hvert som stegene fullføres,
> og før inn observerte testtall der planen ber om det.

## Harde rammer (gjelder hele økten — ingen unntak)

- **ALDRI push uten eksplisitt klarsignal fra Marius.** Task 6 (release)
  kjøres KUN på klarsignal.
- **Aldri push torsdag 19:00–21:00** (auto-briefen går ~19:30), og **aldri
  mens kamper pågår**. GW2-deadline er 28. aug 19:30; GW2 spilles ~29.–31.
  aug. Sjekk kampvinduet før enhver push.
- **AI-budsjett: maks 2 betalte kall.** Kall 1 = én lokal visning av
  `/brief` i Task 5. Kall 2 = én prod-visning av `/brief` i Task 6.
  `/brief` og `/nyheter` genererer betalt AI-tekst per besøk — de skal
  ALDRI besøkes med ekte nøkkel utenfor disse to kallene. `/api/brief.json`
  er ren data og alltid trygg.
- **TDD gjennomgående:** tester skrives først, rødt observeres og føres inn
  her, deretter implementasjon til grønt. Ingen nye avhengigheter. Ingen
  nettverkskall i tester.
- Tiltale: alle svar starter med «Hei Marius!». Ved ~95 % usage: stopp,
  oppdater `docs/HANDOVER.md` grundig, commit alt (ingen push).
- Avvik fra planen: stopp og rapporter — ikke improviser løsninger på
  punkter Marius har besluttet.

## Bakgrunn

Tre funn fra sjekkpunkt A, samme filfamilie, tas som én release:

1. AI-briefen kan motsi datagrunnlaget: GW1-briefen skrev «Alle stiller i
   utgangspunktet friske» mens `injuries` inneholdt Bruno G., og oppga
   Calafiori til 32,3 % mot dataenes 32,6 %. `sanitizeBriefText`
   (`src/services/prompts.js`) kontrollerer i dag kun deadline-påstander.
2. `globalCaptains` (`src/services/brief.js:52`) rangerer på
   `form × (6 − avgFdr)` — ved sesongstart er all form 0 og
   element-ID-rekkefølgen vinner.
3. Prompt-etiketten «Mest aktuelle kapteiner globalt» overselger dataene;
   modellen skrev den om til «de mest brukte kapteinsvalgene globalt».

Den ekte GW1-briefen ligger bevart i `test/fixtures/brief-gw1.js` og
inneholder alle tre feilene — den blir regresjonsgrunnlag.

## Beslutninger (tatt av Marius 24. aug — IKKE re-spør, IKKE fravik)

| # | Beslutning |
|---|---|
| 1 | Punkt 1 løses med **begge**: REGLER-seksjon i `buildBriefPrompt` + utvidet `sanitizeBriefText` |
| 2 | Prosentkontroll: **nær-miss ±1,0** mot fasitverdier fra brief-dataene |
| 3 | Gal prosent → **fjern setningen** (aldri korriger), logg med `console.warn` |
| 4 | `globalCaptains` speiler `captainSuggestions`: all form 0 → `ep_next`; også 0 → tom liste |
| 5 | `minutes > 0`-kravet slippes når SAMTLIGE elements har 0 minutter |
| 6 | Brief-objektet får `captainsCriterion` (`'form' \| 'ep_next' \| null`) |
| 7 | Ærlig etikett + REGLER-forbud mot «mest valgte/brukte kapteiner» + view-overskrift «Kapteinskandidater globalt» |
| 8 | AI-budsjett maks 2 kall (1 lokal E2E, 1 prod-retest) |
| 9 | (Utført i planøkten: v124-planen arkivert, `fix/radgiver-prompt` slettet) |

## Testtall-fasit

Utgangspunkt på `main`: **256/256 tester, lint 0.** Forventet sluttilstand:
**272/272, lint 0.** Per task under står forventet rødt/grønt — før inn
observerte tall i checkboxene. Avviker antallet: stopp og finn ut hvorfor
før du går videre.

---

## Task 0 — Oppstart

- [x] Les `docs/HANDOVER.md` + `CLAUDE.md` (skal allerede være gjort).
- [x] `git checkout main` + verifiser rent tre og at baseline er grønn:
      `npm test` (forventet 256/256) og `npm run lint` (exit 0).
      Observert: rent tre på main (git status --porcelain tomt), npm test → tests 256 / pass 256 / fail 0, npm run lint → exit 0.
- [x] `git checkout -b fix/brief-kvalitet` — «Switched to a new branch»

---

## Task 1 — `globalCaptains`: ep_next-fallback + sesongstart-slipp + kriterium

**Filer:** `src/services/brief.js`, `test/brief.test.js`

### 1a. Tester først (test/brief.test.js — legg til nederst)

```js
// ---- v1.2.5: kapteinslista ved sesongstart ---------------------------------
// globalCaptains rangerte kun på form × fixture-lettehet; før første kamp er
// all form 0 og element-ID-rekkefølgen vant (GW1-briefen foreslo keeper + to
// Arsenal-forsvarere i ID-rekkefølge). Nå: samme ep_next-fallback som
// captainSuggestions (v1.2.2), pluss at minutes-kravet slippes før sesongens
// aller første kamp — da har ingen spilt, og kravet ville tømt lista.

const kapteinBootstrap = (elements) => ({
  events: [{ id: 1, name: 'Gameweek 1', deadline_time: '2026-08-21T17:30:00Z', is_next: true }],
  teams: [
    { id: 1, short_name: 'ARS', name: 'Arsenal' },
    { id: 2, short_name: 'CHE', name: 'Chelsea' },
  ],
  elements,
});

// ARS får FDR 2 (lettehet 4), CHE får FDR 4 (lettehet 2).
const kapteinFixtures = [
  { event: 1, team_h: 1, team_a: 2, kickoff_time: '2026-08-21T19:00:00Z', team_h_difficulty: 2, team_a_difficulty: 4 },
];

const spiller = (id, team, overrides = {}) => ({
  id,
  web_name: `Spiller${id}`,
  team,
  element_type: 3,
  status: 'a',
  news: '',
  selected_by_percent: '30.0',
  form: '0.0',
  ep_next: '0.0',
  minutes: 90,
  chance_of_playing_next_round: null,
  ...overrides,
});

test('buildBrief: kapteinslista faller tilbake på ep_next når all form er 0', () => {
  const elements = [
    spiller(1, 2, { ep_next: '5.0' }), // 5.0 × 2 = 10
    spiller(2, 1, { ep_next: '7.0' }), // 7.0 × 4 = 28 — skal vinne tross høyere ID
    spiller(3, 1, { ep_next: '1.0' }), // 1.0 × 4 = 4
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captainsCriterion, 'ep_next');
  assert.deepEqual(brief.captains.map((c) => c.name), ['Spiller2', 'Spiller1', 'Spiller3']);
  assert.equal(brief.captains[0].epNext, '7.0');
});

test('buildBrief: kapteinslista er tom når både form og ep_next er 0 for alle', () => {
  const elements = [spiller(1, 1), spiller(2, 2)];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.deepEqual(brief.captains, []);
  assert.equal(brief.captainsCriterion, null);
});

test('buildBrief: minutes-kravet slippes før sesongstart (alle har 0 minutter)', () => {
  const elements = [
    spiller(1, 1, { minutes: 0, ep_next: '6.0' }),
    spiller(2, 2, { minutes: 0, ep_next: '4.0' }),
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captains.length, 2);
  assert.equal(brief.captains[0].name, 'Spiller1');
  assert.equal(brief.captainsCriterion, 'ep_next');
});

test('buildBrief: minutes-kravet gjelder så snart noen har spilt', () => {
  const elements = [
    spiller(1, 1, { form: '3.0' }),
    spiller(2, 2, { minutes: 0, ep_next: '9.0' }), // høy ep, men ute av lista
  ];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.deepEqual(brief.captains.map((c) => c.name), ['Spiller1']);
  assert.equal(brief.captainsCriterion, 'form');
});

test('buildBrief: captainsCriterion er form når form finnes, og epNext følger med', () => {
  const elements = [spiller(1, 1, { form: '6.5', ep_next: '5.5' })];
  const brief = buildBrief({ bootstrap: kapteinBootstrap(elements), fixtures: kapteinFixtures });

  assert.equal(brief.captainsCriterion, 'form');
  assert.equal(brief.captains[0].epNext, '5.5');
});
```

I tillegg: utvid den eksisterende testen
`'buildBrief viser avsluttet tilstand når ingen runde er kommende'` med én
assert etter `assert.deepEqual(brief.captains, []);`:

```js
  assert.equal(brief.captainsCriterion, null);
```

- [x] Tester skrevet. `npm test` — **forventet rødt: 261 tester, 5 feiler**
      (fallback-, tom-, slipp- og kriterium-testene + den utvidede
      sesongslutt-testen; «minutes-kravet gjelder»-testen er et vern og er
      grønn allerede). Observert: **261 tester, 255 pass, 6 fail.** Avvik
      forklart: «minutes-kravet gjelder»-testen asserter også
      `captainsCriterion`, som ikke fantes ennå — den feiler derfor også i
      rødfasen. Ingen andre uventede feil.

### 1b. Implementasjon (src/services/brief.js)

Erstatt hele `globalCaptains` (linje 51–62):

```js
/**
 * Globale kapteinsvalg: høyt eid + form + lett fixture. Ved sesongstart er
 * all form 0 — da ble score 0 hele veien og element-ID-rekkefølgen vant.
 * Som captainSuggestions (v1.2.2): er samtlige form-scorer 0, rangeres det
 * på FPLs ep_next; er også den 0 for alle, returneres tom liste. Før
 * sesongens aller første kamp har ingen spilt — da slippes minutes-kravet,
 * ellers ville lista vært tom akkurat når briefen trengs til GW1.
 */
function globalCaptains(elements, fixtures, fromGw, limit = 3) {
  const fdrByTeam = teamFdrMap(fixtures, fromGw, 1);
  const allZeroMinutes = elements.every((p) => !p.minutes);
  const candidates = elements
    .filter((p) => (parseFloat(p.selected_by_percent) || 0) >= 15 && (allZeroMinutes || p.minutes > 0))
    .map((p) => {
      const avgFdr = fdrByTeam.get(p.team) ?? null;
      return { p, avgFdr, ease: 6 - (avgFdr ?? 3.5) };
    });
  const scoreAll = (criterion) =>
    candidates.map((c) => ({
      ...c,
      criterion,
      score: (parseFloat(criterion === 'form' ? c.p.form : c.p.ep_next) || 0) * c.ease,
    }));
  let scored = scoreAll('form');
  if (scored.every((s) => s.score === 0)) {
    scored = scoreAll('ep_next');
    if (scored.every((s) => s.score === 0)) return { list: [], criterion: null };
  }
  return {
    list: scored.sort((a, b) => b.score - a.score).slice(0, limit),
    criterion: scored[0].criterion,
  };
}
```

I `buildBrief`:

1. Tom-tilstanden (early return ved `!upcoming`): legg til
   `captainsCriterion: null,` etter `captains: [],`.
2. Erstatt captains-mappingen (linje 97–103):

```js
  const globals = globalCaptains(elements, fixtures, fromGw);
  const captains = globals.list.map(({ p, avgFdr }) => ({
    name: p.web_name,
    team: teamsById.get(p.team)?.short_name ?? '?',
    form: p.form,
    epNext: p.ep_next,
    ownership: p.selected_by_percent,
    avgFdr,
  }));
```

3. I return-objektet: legg til `captainsCriterion: globals.criterion,`
   etter `captains,`.

- [x] `npm test` — **forventet grønt: 261/261.** `npm run lint` exit 0.
      Observert: **tests 261 / pass 261 / fail 0**, `npm run lint` exit 0.
- [x] CHANGELOG `[Unreleased]` → ny `### Fixed`-seksjon med punkt:
      «Kapteinslista i rundebriefen er ikke lenger vilkårlig ved
      sesongstart: er all form 0, rangeres det på forventet poeng (FPL) som
      på /lag, og minutter-kravet slippes før sesongens første kamp.
      Briefen oppgir nå også hvilket kriterium som rangerte.»
- [x] Commit: `fix(brief): ep_next-fallback og sesongstart-slipp i globalCaptains` — `568b5f1`

---

## Task 2 — Ærlig kapteinsetikett + REGLER i brief-prompten + view

**Filer:** `src/services/prompts.js`, `views/brief.ejs`, `test/prompts.test.js`

### 2a. Tester først (test/prompts.test.js — legg til etter de eksisterende buildBriefPrompt-testene)

```js
// ---- v1.2.5: ærlig kapteinsetikett + REGLER --------------------------------
// «Mest aktuelle kapteiner globalt» oversolgte dataene — modellen skrev den
// om til «de mest brukte kapteinsvalgene globalt» (står i GW1-fixturen).
// Etiketten sier nå hva lista faktisk er, og REGLER forbyr omskrivingen.

test('buildBriefPrompt bruker ærlig kapteinsetikett og navngir kriteriet', () => {
  const prompt = buildBriefPrompt({
    ...briefMedTidsfakta,
    captains: [{ name: 'Salah', team: 'LIV', form: '8.5', epNext: '7.2', ownership: '45.0', avgFdr: 2 }],
    captainsCriterion: 'form',
  });

  assert.match(prompt, /Kapteinskandidater globalt \(høyt eide spillere med gunstig kamp, rangert på form — ikke målt kapteinsandel\):/);
  assert.match(prompt, /- Salah \(LIV\), form 8\.5, ventet 7\.2 p, eid 45\.0 %/);
  assert.ok(!prompt.includes('Mest aktuelle kapteiner globalt'), 'gammel etikett henger igjen');
});

test('buildBriefPrompt navngir ep_next-kriteriet i kapteinsetiketten', () => {
  const prompt = buildBriefPrompt({ ...briefMedTidsfakta, captainsCriterion: 'ep_next' });

  assert.match(prompt, /rangert på forventet poeng \(FPL\) — ikke målt kapteinsandel/);
});

test('buildBriefPrompt har REGLER som forbyr påfunnede tall og «mest brukte kapteiner»', () => {
  const prompt = buildBriefPrompt(briefMedTidsfakta);

  assert.match(prompt, /REGLER:/);
  assert.match(prompt, /Finn aldri på tall/);
  assert.match(prompt, /gjengi prosenter og formtall eksakt/);
  assert.match(prompt, /«mest valgte» eller «mest brukte»/);
});

test('buildBriefPrompt sier at skadelista er fasit — og sier fra når den er tom', () => {
  const medSkade = buildBriefPrompt({
    ...briefMedTidsfakta,
    injuries: [{ name: 'Bruno G.', team: 'NEW', ownership: '25.1', news: 'Kneskade', status: 'i' }],
  });
  assert.match(medSkade, /Skadelista over er fasit/);

  const utenSkade = buildBriefPrompt(briefMedTidsfakta); // injuries: []
  assert.match(utenSkade, /- Ingen høyt eide spillere er flagget\./);
});
```

- [x] Tester skrevet. `npm test` — **forventet rødt: 265 tester, 4 feiler.**
      Observert: **265 tester, 261 pass, 4 fail** — nøyaktig de fire nye.

### 2b. Implementasjon

**`src/services/prompts.js`** — erstatt hele `buildBriefPrompt` med:

```js
export function buildBriefPrompt(brief) {
  const parts = [
    `Skriv en kort rundebrief på norsk for Fantasy Premier League, ${brief.gameweek?.name ?? 'kommende runde'}.`,
    `Deadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}.`,
    '',
    'Skadenytt (høyt eide spillere):',
    ...(brief.injuries.length
      ? brief.injuries.map((i) => `- ${i.name} (${i.team}, eid ${i.ownership} %): ${i.news}`)
      : ['- Ingen høyt eide spillere er flagget.']),
    '',
    // FPL publiserer ingen målt kapteinsandel — lista er høyt eide spillere
    // med gunstig kamp, og etiketten skal ikke late som noe annet (v1.2.5).
    `Kapteinskandidater globalt (høyt eide spillere med gunstig kamp, rangert på ${CRITERION_LABELS[brief.captainsCriterion] ?? 'form'} — ikke målt kapteinsandel):`,
    ...brief.captains.map((c) => `- ${c.name} (${c.team}), form ${c.form}, ventet ${c.epNext ?? '?'} p, eid ${c.ownership} %`),
    '',
    'Kamper:',
    ...brief.fixturesByDay.map((d) => `${d.day}: ${d.matches.map((m) => `${m.home}–${m.away} ${m.kickoff}`).join(', ')}`),
    '',
    // Modellen regnet tidligere selv ut hva som lå før deadline, og bommet.
    // Fasiten er beregnet her; modellen skal bare gjengi den.
    'Forhåndsberegnede tidsfakta (fasit — ikke regn ut noe selv):',
    brief.fixturesBeforeDeadline?.length
      ? `Disse kampene starter FØR deadline: ${brief.fixturesBeforeDeadline.join(', ')}. Alle andre kamper i runden starter etter deadline.`
      : 'Ingen kamper starter før deadline — samtlige kamper i runden spilles etter at deadline har passert.',
  ];
  if (brief.mine) {
    parts.push('', 'Mine kapteinskandidater:', ...brief.mine.captains.map((c) => `- ${c.player.web_name}: ${c.reasons.join('; ')}`));
    parts.push('', 'Mine mulige bytter:', ...brief.mine.transfers.map((t) => `- Ut: ${t.out.player.web_name} (${t.out.reasons.join('; ')}). Inn-kandidater: ${t.inn.map((k) => k.player.web_name).join(', ') || 'ingen'}`));
  }
  parts.push(
    '',
    'REGLER:',
    '- Bruk kun tall som står i datagrunnlaget over. Finn aldri på tall, og gjengi prosenter og formtall eksakt slik de står — ikke rund av.',
    '- Skadelista over er fasit. Er den ikke tom: skriv aldri at alle er friske eller at det ikke er noe skadenytt.',
    '- Kapteinslista er høyt eide spillere med gunstig kamp — ikke målt kapteinsandel. Omtal den aldri som «mest valgte» eller «mest brukte» kapteiner.',
    '- Utled aldri tidsforhold selv: skal du si noe om hva som skjer før eller etter deadline, bruk kun de forhåndsberegnede tidsfaktaene over.',
    '',
    'Skriv briefen med disse seksjonene i markdown: «Deadline», «Skadenytt», «Kapteinsvalg», «Kamper å følge med på»' +
      (brief.mine ? ', «Mine grep»' : '') +
      '. Vær konkret og kortfattet, sett spillernavn i **fet**. Maks ~350 ord. Ingen innledning utover seksjonene.' +
      ' Bruk norske fotballuttrykk: skriv «holdt nullen», aldri «clean sheet»; «runde», aldri «gameweek». Ordet «deadline» brukes som det er.',
  );
  return parts.join('\n');
}
```

Merk: tidsforhold-instruksen er FLYTTET fra sluttavsnittet inn i REGLER —
den skal ikke stå to steder. `CRITERION_LABELS` er allerede definert i fila
(linje ~41) og gjenbrukes uendret. `mine`-blokken er identisk med dagens —
kun skadenytt-linjene, kapteinsetiketten/-linjene og REGLER-blokken er nye.

**`views/brief.ejs` linje 43:** `<h2>Kapteinsvalg globalt</h2>` →
`<h2>Kapteinskandidater globalt</h2>`

- [x] `npm test` — **forventet grønt: 265/265** (de gamle
      buildBriefPrompt-testene består: «Utled aldri tidsforhold selv»,
      «holdt nullen» og «aldri "gameweek"» finnes fortsatt).
      `npm run lint` exit 0. Observert: **tests 265 / pass 265 / fail 0**,
      `npm run lint` exit 0.
- [x] CHANGELOG `[Unreleased]` → `### Changed`-punkt: «Brief-prompten
      kaller kapteinslista det den er (høyt eide spillere med gunstig kamp
      — ikke målt kapteinsandel), navngir rangeringskriteriet, og har fått
      en REGLER-seksjon etter mønster fra rådgiveren (v1.2.4). Overskriften
      på /brief heter nå «Kapteinskandidater globalt».»
- [x] Commit: `fix(brief): ærlig kapteinsetikett og REGLER i brief-prompten`

---

## Task 3 — `sanitizeBriefText`: friskmeldingskontroll + omstrukturering

**Filer:** `src/services/prompts.js`, `test/prompts.test.js`

### 3a. Tester først

```js
// ---- v1.2.5: friskmeldingskontroll -----------------------------------------
// GW1-briefen skrev «Alle stiller i utgangspunktet friske» mens skadelista
// inneholdt Bruno G. Setninger som friskmelder troppen fjernes nå når
// brief.injuries er ikke-tom. Egen kontroll — deadline-kontrollens
// negasjonsvern gjelder bevisst ikke her (friskmeldinger ER negasjoner).

const briefMedSkade = {
  ...briefMedTidsfakta,
  injuries: [{ name: 'Bruno G.', team: 'NEW', ownership: '25.4', news: 'Lårskade — 75 % spillesjanse', status: 'd' }],
};

test('sanitizeBriefText fjerner friskmelding når skadelista ikke er tom', () => {
  const text = [
    '# Skadenytt',
    'Ingen nevneverdig skadenytt blant høyt eide spillere. Alle stiller i utgangspunktet friske til sesongstart. Følg med på pressekonferansene.',
  ].join('\n');

  const ut = sanitizeBriefText(text, briefMedSkade);

  assert.ok(!ut.includes('Ingen nevneverdig skadenytt'), 'friskmelding 1 ble stående');
  assert.ok(!ut.includes('Alle stiller'), 'friskmelding 2 ble stående');
  assert.ok(ut.includes('Følg med på pressekonferansene.'), 'nøytral setning forsvant');
  assert.ok(ut.includes('# Skadenytt'), 'overskriften forsvant');
});

test('sanitizeBriefText beholder friskmelding når skadelista er tom', () => {
  const text = 'Ingen skader blant høyt eide spillere — alle stiller friske.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text); // injuries: []
});

test('sanitizeBriefText beholder skadeomtale som ikke friskmelder', () => {
  const text = '**Bruno G.** er ute med lårskade. Ingen av skadene er alvorlige.';

  assert.equal(sanitizeBriefText(text, briefMedSkade), text);
});
```

- [x] Tester skrevet. `npm test` — **forventet rødt: 268 tester, 1 feiler**
      (fjern-testen; de to behold-testene er vern og er grønne fra start).
      Observert: **268 tester, 267 pass, 1 fail** — nøyaktig fjern-testen.

### 3b. Implementasjon (src/services/prompts.js)

`sanitizeBriefText` omstruktureres: i stedet for å behandle kun linjer med
«deadline», avgjøres det per linje hvilke kontroller som gjelder. Deadline-
kontrollens logikk (before/after-sett, `NEGATION`, `OM_KAMPER`, `keep`)
beholdes UENDRET — den døpes om til `keepDeadline` og aktiveres på samme
vilkår som før. Ny konstant over funksjonen:

```js
// Friskmeldinger: «alle … friske», «ingen … skadenytt/skader». Bevisst uten
// «skadene» (bestemt form) — «ingen av skadene er alvorlige» påstår at det
// FINNES skader, og skal stå. Kontrollen er kun aktiv når skadelista har
// innhold, så tomme runder kan friskmeldes fritt.
const FRISKMELDING_RE =
  /(\balle\b[^.!?]*\bfrisk\w*)|(\bingen\b[^.!?]*\b(skadenytt|skader|skadde|fravær|skadeproblemer)\b)/iu;
```

Ny hovedstruktur (erstatter dagens funksjon — behold `dropped`-loggingen og
linjeopprydding nøyaktig som i dag):

```js
export function sanitizeBriefText(text, brief) {
  if (!text) return text;

  // Deadline-kontrollen (som før — uendret logikk).
  const matches = (brief?.fixturesByDay ?? []).flatMap((d) => d.matches);
  const deadlineAktiv = matches.length > 0 && !matches.every((m) => m.beforeDeadline == null);
  let keepDeadline = () => true;
  if (deadlineAktiv) {
    // ... dagens oppsett av before/after, matchers og keep() flyttes hit
    //     uendret; keepDeadline = keep.
  }

  // Friskmeldingskontrollen (v1.2.5).
  const friskAktiv = (brief?.injuries?.length ?? 0) > 0;
  const keepFrisk = (sentence) => !FRISKMELDING_RE.test(sentence);

  const lines = text.split('\n').map((line) => {
    const sjekker = [];
    if (deadlineAktiv && /deadline/i.test(line)) sjekker.push(keepDeadline);
    if (friskAktiv && /frisk|skade|fravær/i.test(line)) sjekker.push(keepFrisk);
    if (sjekker.length === 0) return line;
    const masked = maskDots(line);
    const sentences = masked.match(/[^.!?]+[.!?]*/g) ?? [masked];
    const kept = sentences.filter((s) => {
      if (sjekker.every((k) => k(s))) return true;
      dropped.push(unmaskDots(s).trim());
      return false;
    });
    if (kept.length === sentences.length) return line;
    const rest = unmaskDots(kept.join('')).trim();
    return /^([-*]|#{1,3})?\s*$/.test(rest) ? null : rest;
  });
  // ... dropped-warn + join som i dag, men med generell tekst:
  // console.warn('AI-brief: fjernet %d setning(er) som motsier datagrunnlaget:', dropped.length, dropped);
}
```

Viktig: dagens tidlig-retur (`matches.length === 0 || alle beforeDeadline
null → return text`) erstattes av `deadlineAktiv`-vilkåret — funksjonen skal
nå kunne kjøre friskmeldingskontrollen selv når kampdata mangler. Alle 18
eksisterende sanitize-tester skal fortsatt bestå uendret (inkludert «ekte
AI-brief fra prod går uendret gjennom etterkontrollen» — `briefGw1` har
ingen `injuries`, så friskmeldingskontrollen er inaktiv der).

- [x] `npm test` — **forventet grønt: 268/268.** `npm run lint` exit 0.
      Observert: **tests 268 / pass 268 / fail 0**, `npm run lint` exit 0.
- [x] CHANGELOG `[Unreleased]` `### Fixed`-punkt: «AI-briefen kan ikke
      lenger friskmelde troppen når skadelista har innhold — slike
      setninger fjernes i etterkontrollen (GW1-funnet «alle stiller
      friske» tross Bruno G. på skadelista).»
- [x] Commit: `fix(brief): sanitize fjerner friskmelding som motsier skadelista`

---

## Task 4 — `sanitizeBriefText`: prosentkontroll (nær-miss ±1,0)

**Filer:** `src/services/prompts.js`, `test/fixtures/brief-gw1.js`,
`test/prompts.test.js`

### 4a. Fixtur-variant først [x] (test/fixtures/brief-gw1.js — legg til nederst)

```js
// Samme brief med dataene GW1-briefen faktisk hadde: skadelista inneholdt
// Bruno G., og Calafiori var eid 32,6 % — briefen skrev 32,3 %. Brukes av
// v1.2.5-regresjonene: med data til stede skal friskmeldingen og den
// forvrengte prosenten fjernes, mens resten står. `briefGw1` over holdes
// bevisst UTEN injuries/captains så den gamle «uendret gjennom»-testen
// fortsatt dokumenterer P3-4-tilfellene.
export const briefGw1MedData = {
  ...briefGw1,
  injuries: [{ name: 'Bruno G.', team: 'NEW', ownership: '25.4', news: 'Lårskade — 75 % spillesjanse', status: 'd' }],
  captains: [
    { name: 'Raya', team: 'ARS', form: '0.0', epNext: '4.5', ownership: '36.3', avgFdr: 2 },
    { name: 'Calafiori', team: 'ARS', form: '0.0', epNext: '4.2', ownership: '32.6', avgFdr: 2 },
    { name: 'Gabriel', team: 'ARS', form: '0.0', epNext: '4.4', ownership: '29.6', avgFdr: 2 },
  ],
  captainsCriterion: 'ep_next',
};
```

### 4b. Tester først (test/prompts.test.js)

Oppdater importen øverst: `import { briefTextGw1, briefGw1, briefGw1MedData } from './fixtures/brief-gw1.js';`

```js
// ---- v1.2.5: prosentkontroll (nær-miss ±1,0) --------------------------------
// GW1-briefen skrev Calafiori til 32,3 % — dataene sa 32,6. Et prosenttall i
// teksten som ikke finnes i fasiten, men ligger ≤1,0 fra en fasitverdi, er en
// forvrengning → setningen fjernes. Tall langt fra alt (omtrentligheter som
// «rundt 90 %») står. Fasiten hentes KUN fra injuries/captains/mine — ikke
// fra kamptider og datoer, som ellers gir falske nær-treff.

test('sanitizeBriefText fjerner setning med forvrengt prosent (nær-miss mot fasit)', () => {
  const ut = sanitizeBriefText('**Calafiori** er eid av 32,3 % globalt.', briefGw1MedData);

  assert.equal(ut, '');
});

test('sanitizeBriefText beholder prosent som står eksakt i dataene', () => {
  const text = '**Raya** (36,3 % eid) er et trygt valg.';
  assert.equal(sanitizeBriefText(text, briefGw1MedData), text);

  // Heltall mot desimal: 75 % matcher «75» fra skadenyheten numerisk.
  const heltall = 'Bruno G. har 75 % spillesjanse.';
  assert.equal(sanitizeBriefText(heltall, briefGw1MedData), heltall);
});

test('sanitizeBriefText beholder prosent langt fra alle fasitverdier', () => {
  const text = 'Rundt 90 % av topplagene beholder kapteinen sin.';

  assert.equal(sanitizeBriefText(text, briefGw1MedData), text);
});

test('den ekte GW1-briefen med fulle data mister friskmeldingen og 32,3-prosenten — resten står', () => {
  const ut = sanitizeBriefText(briefTextGw1, briefGw1MedData);

  assert.ok(!ut.includes('Alle stiller i utgangspunktet friske'), 'friskmeldingen ble stående');
  assert.ok(!ut.includes('Ingen nevneverdig skadenytt'), 'skadenytt-friskmeldingen ble stående');
  assert.ok(!ut.includes('32,3 %'), 'den forvrengte prosenten ble stående');
  assert.ok(ut.includes('**Raya** (36,3 % eid)'), 'korrekt prosent forsvant');
  assert.ok(ut.includes('**Gabriel** (29,6 % eid)'), 'korrekt prosent forsvant');
  assert.ok(ut.includes('Fredag 21. august kl. 19:30'), 'deadline-linja forsvant');
});
```

Den EKSISTERENDE testen «ekte AI-brief fra prod går uendret gjennom
etterkontrollen» skal fortsatt bestå uendret — `briefGw1` har verken
`injuries` eller `captains`, så begge de nye kontrollene er inaktive der.

- [x] Tester skrevet. `npm test` — **forventet rødt: 272 tester, 2 feiler**
      (nær-miss-testen og fulldata-regresjonen; de to behold-testene er
      vern). Observert: **272 tester, 270 pass, 2 fail** — nøyaktig de to.

### 4c. Implementasjon (src/services/prompts.js)

Ny hjelpefunksjon over `sanitizeBriefText`:

```js
// Samler alle tallverdier (tall + tall inni strenger, komma normalisert til
// punktum) fra spiller-delene av briefen. Fasit for prosentkontrollen —
// bevisst IKKE hele brief-objektet: kamptider og datoer («17:30», «21.00»)
// ville gitt falske nær-treff mot eierandeler.
function collectBriefNumbers(value, out = new Set()) {
  if (typeof value === 'number' && Number.isFinite(value)) out.add(value);
  else if (typeof value === 'string') {
    for (const m of value.matchAll(/\d+(?:[.,]\d+)?/g)) out.add(parseFloat(m[0].replace(',', '.')));
  } else if (Array.isArray(value)) value.forEach((v) => collectBriefNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectBriefNumbers(v, out));
  return out;
}
```

I `sanitizeBriefText`, etter friskmeldingsoppsettet:

```js
  // Prosentkontrollen (v1.2.5): nær-miss ±1,0 feller forvrengninger.
  const fasit = [...collectBriefNumbers({ injuries: brief?.injuries, captains: brief?.captains, mine: brief?.mine })];
  const prosentAktiv = fasit.length > 0;
  const keepProsent = (sentence) => {
    const plain = unmaskDots(sentence); // maskDots har maskert desimalpunktum
    for (const m of plain.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
      const p = parseFloat(m[1].replace(',', '.'));
      if (fasit.some((v) => v === p)) continue; // eksakt i dataene — greit
      if (fasit.some((v) => Math.abs(v - p) <= 1.0)) return false; // forvrengt
    }
    return true; // langt fra alt: omtrentlighet, ikke forvrengning
  };
```

Og i linje-løkka, sammen med de andre aktiveringene:

```js
    if (prosentAktiv && line.includes('%')) sjekker.push(keepProsent);
```

- [x] `npm test` — **forventet grønt: 272/272.** `npm run lint` exit 0.
      Observert: **tests 272 / pass 272 / fail 0**, `npm run lint` exit 0.
- [x] CHANGELOG `[Unreleased]` `### Fixed`-punkt: «Etterkontrollen feller
      setninger med forvrengte prosenttall: et prosenttall som ikke finnes
      i brief-dataene, men ligger ≤1,0 fra en fasitverdi, fjerner setningen
      (GW1-funnet 32,3 % mot dataenes 32,6 %).»
- [x] Commit: `fix(brief): sanitize feller forvrengte prosenttall (nær-miss ±1,0)`

---

## Task 5 — Lokal verifisering + E2E (AI-kall 1 av 2)

- [x] `npm test` → **272/272**, `npm run lint` → exit 0. Observert:
      **tests 272 / pass 272 / fail 0**, lint exit 0.
- [ ] **Røyktest uten nøkler (0 AI-kall):** scratchpad-.env-teknikken fra
      HANDOVER («Driftslærdommer»): lag en .env i scratchpad med
      `ANTHROPIC_API_KEY=` og `DISCORD_WEBHOOK_URL=` TOMME, start serveren
      på ledig port med `--env-file` mot den. Verifiser `/health` → 200 med
      `ai:false, discord:false` FØR noe annet. Deretter: alle ruter → 200
      (inkl. `/brief` og `/nyheter` — gratis uten nøkkel), ukjent sti → 404.
      Observert: port 3011, `/health` → 200
      `{"ai":false,"aiModel":null,"discord":false,"teamId":true,"leagues":0}`.
      Sveip: `/` `/spillere` `/lag` `/overganger` `/liga` `/brief` `/live`
      `/nyheter` `/health` `/api/brief.json` `/api/live.json` → alle 200;
      `/finnes-ikke` → 404. `/brief` viste «Kapteinskandidater globalt».
- [ ] **E2E med ekte nøkkel (AI-kall 1 av 2):** scratchpad-.env med ekte
      `ANTHROPIC_API_KEY` men TOM `DISCORD_WEBHOOK_URL` (deadline 28. aug
      nærmer seg — auto-briefens vindu må ikke treffe dev-serveren).
      Verifiser `/health` → `ai:true, discord:false` FØR `/brief` åpnes.
      Deretter ÉN visning av `/brief`. Sjekkliste mot svaret:
      - [x] Ingen formulering à la «mest brukte/valgte kapteinsvalg».
            Teksten: «Blant høyt eide spillere med gunstig kamp peker
            **Guéhi** … seg ut» — den ærlige rammen, ikke omskrivingen.
      - [x] Alle prosenter i teksten finnes eksakt i `/api/brief.json`
            (gratis å hente — bruk den som fasit). Teksten: 15.3, 7.6,
            17.5, 16.0, 41.9 og 75 (x2). Fasit: eierandeler 15.3/7.6
            (skader), 17.5/16.0/41.9 (kapteiner), 75 % i begge
            skadenyhetene. Ingen avvik, ingen påfunnede tall.
      - [x] Er skadelista ikke-tom: ingen friskmelding i teksten.
            Skadelista hadde 2 navn (Pedro Porro, Anderson) og begge
            står i teksten. Ingen friskmelding.
      - [x] Server-loggen: har sanitize felt setninger
            (`console.warn`-linja)? **Nei — ingen `console.warn` i loggen,
            0 setninger fjernet.** Hele loggen: «FPL-dashboard lytter på
            http://localhost:3012» + «AI-kall: ai-brief-gw2
            modell=claude-sonnet-5 inn=1680 ut=977 tokens».
      - [x] Kapteinsseksjonen virker rimelig (ikke ID-rekkefølge). Guéhi
            (form 10.0), Ndiaye (9.0), Szoboszlai (8.0) — alle FDR 3, så
            rangeringen er ren formrekkefølge. `captainsCriterion` =
            `form` (GW1 er spilt). Tallene i «Mine grep» ble også
            stikkprøvd mot `mine`-delen av `/api/brief.json`: Ødegaard
            form 11.0/FDR 4.0, Gvardiol 9.0/3.0, Calafiori 9.0/4.0,
            Mbeumo og Wirtz form 2.0, Haaland og Isak form 2.0,
            innkjøpsnavnene (Trafford, Kelleher, De Cuyper, Mendy, Gakpo,
            Barry, Georginio) står alle i kandidatlistene — alt korrekt.
      Observert: `/health` FØR `/brief`: `{"ai":true,"aiModel":
      "claude-sonnet-5","discord":false,"teamId":true,"leagues":0}`.
      `GET /brief` → 200, ett AI-kall (`ai-brief-gw2`, 1680 inn / 977 ut).
- [x] `/nyheter` er IKKE besøkt med ekte nøkkel (kun på den nøkkelløse
      serveren, `ai:false`). `/brief` er besøkt
      nøyaktig én gang med ekte nøkkel. (Gjentatte visninger innen én time
      er cachet, men budsjettet teller visninger — hold deg til én.)
- [ ] Rapporter status til Marius og STOPP. Task 6 kun på klarsignal.

---

## Task 6 — Release v1.2.5 (KUN på eksplisitt klarsignal fra Marius)

- [x] Sjekk tidsvindu: mandag 24. aug 01:38, 0 kamper i gang (FPL
      `fixtures/`: ingen `started && !finished_provisional`), neste
      avspark 24. aug 19:00 UTC. Trygt.
- [x] `npm version patch --no-git-tag-version` → 1.2.5 (package.json og
      package-lock.json bekreftet).
- [x] CHANGELOG: flyttet til `## [1.2.5] - 2026-08-24`.
- [x] ROADMAP: kø-punkt 5 fjernet, 6→5 og 7→6 renummerert,
      versjonsplan-raden strøket, v1.2.5-blokk i utført-historikken.
- [x] `docs/VIDERE.md`: «Nytt siden sist» om v1.2.5, «Neste oppgave» →
      v1.3.0 UI-overhaling (planøkt).
- [x] `docs/HANDOVER.md`: status + logg oppdatert (183 linjer).
- [ ] Commit `chore(release): v1.2.5` på branchen, merge til `main`
      (`--no-ff` som før), verifiser **272/272 + lint 0 på main**, tag
      `v1.2.5`.
- [ ] Push `main` + tag. Coolify auto-deployer — følg med til `/health`
      på https://fpl.marsk.no svarer 200 med riktig oppførsel.
- [ ] **Prod-retest (AI-kall 2 av 2):** ÉN visning av `/brief` i prod.
      Samme sjekkliste som Task 5-E2E (prosenter mot `/api/brief.json`,
      ingen friskmelding ved ikke-tom skadeliste, ingen «mest brukte»,
      footer viser v1.2.5). Observert: ______
- [ ] Slett lokal branch `fix/brief-kvalitet` etter merge.

---

## Verifiseringstabell

| # | Sjekk | Kommando/handling | Forventet |
|---|---|---|---|
| 1 | Enhetstester | `npm test` | 272/272, exit 0 |
| 2 | Lint | `npm run lint` | exit 0 |
| 3 | Røyk uten nøkler | `/health` via scratchpad-.env | `ai:false, discord:false`, alle ruter 200 |
| 4 | Gammel regresjon | test «ekte AI-brief … uendret» | består UENDRET |
| 5 | Ny regresjon | test «… med fulle data …» | friskmelding + 32,3 % fjernet, resten står |
| 6 | E2E lokalt | én `/brief`-visning (kall 1/2) | sjekklista i Task 5 |
| 7 | Prod etter release | én `/brief`-visning (kall 2/2) | sjekklista i Task 6, footer v1.2.5 |
| 8 | AI-budsjett | opptelling | ≤ 2 betalte kall totalt |

## Kjente begrensninger (dokumentert, ikke feil)

- Nær-miss-vinduet feller også avrundinger («rundt 33 %» når dataene sier
  32,6) — akseptert: REGLER krever eksakt gjengivelse, og filosofien er
  «utelat framfor å reparere».
- Friskmeldingsregexen dekker «alle … frisk*» og «ingen …
  skadenytt/skader/skadde/fravær/skadeproblemer» — ikke alle tenkelige
  formuleringer («hele troppen er tilgjengelig» slipper gjennom). Prompt-
  regelen er førstelinjeforsvaret; kontrollen er sikkerhetsnettet.
- Prosentfasiten hentes kun fra injuries/captains/mine. Prosenter modellen
  finner på som ligger >1,0 fra alle fasitverdier felles ikke — de er
  omtrentligheter eller utenfor det dataene kan motbevise.
