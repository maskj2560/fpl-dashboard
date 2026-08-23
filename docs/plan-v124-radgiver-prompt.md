# v1.2.4 — AI-rådgiverens promptstruktur på /lag — implementeringsplan

> Planlagt av Fable 5 i plan mode, 2026-08-24 (økt 26). Brainstormet med
> Marius — fire beslutninger tatt (se Designbeslutninger). Utføres av Opus 5
> i egen økt. **For agentiske utførere:** PÅKREVD UNDER-SKILL:
> `superpowers:executing-plans` — utfør taskene i rekkefølge, følg planen
> nøyaktig, avvik rapporteres eksplisitt. Steg bruker checkbox-syntaks for
> sporing. Etter godkjenning kopieres planen til
> `docs/plan-v124-radgiver-prompt.md` (Fable-øktens egne steg, nederst).

**Mål:** Rådgiver-prompten (/lag → «Spør AI om råd») skal sende fullt
datagrunnlag per spiller (form, `ep_next`, minutter, totalpoeng, skadestatus)
pluss sidens egne beregninger, strukturert i tydelige seksjoner
(datagrunnlag / sidens beregninger / regler / oppgave), slik at modellen
aldri mer dikter begrunnelser av typen «Haaland … formscore 0.0 (kun én
runde spilt)» om en spiller med `minutes: 0` (B-2-funnet, prod 2026-08-22).

**Arkitektur:** All promptbygging flyttes til `buildAdvicePrompt` i
`src/services/prompts.js` (ren funksjon, ny kontrakt: strukturerte
spillerobjekter inn, ikke ferdigformaterte linjer). `src/routes/api.js`
blir ren datainnsamler. Ingen endring i `ai.js`, `analysis.js`, views eller
`public/app.js`. Ingen nye FPL-kall — alt bygges fra data ruta allerede
laster.

**Teknologi:** Node 22+ ESM, `node:test`, ESLint flat config. Ingen nye
avhengigheter.

**Spec:** ROADMAP kø-punkt 1 (v1.2.4) + B-2-funnet i
`docs/arkiv/HANDOVER-historikk.md`.

## Kontekst (hvorfor)

Dagens prompt ([api.js:85-88](src/routes/api.js#L85-L88) →
`buildAdvicePrompt`, [prompts.js:49](src/services/prompts.js#L49)) sender per
spiller kun navn, lag, posisjon, pris, `form` og motstander+FDR. Modellen kan
derfor ikke skille «ingen data» (0 minutter) fra «dårlig form» — og dikter.
I tillegg: UI-et rangerer på `ep_next` når all form er 0
([analysis.js:289-293](src/services/analysis.js#L289-L293)), men prompten får
aldri `ep_next` — siden og rådgiveren resonnerer fra ulike signaler, og
sidens kapteinsforslag (`captainSuggestions`) og innkjøpskandidater
(`transferInCandidates`) sendes ikke med i det hele tatt.

## Designbeslutninger (Marius' valg 24. aug — IKKE re-vurder)

1. **Fullt signalsett per spiller:** + `minutes`, `total_points`, `ep_next`,
   skadestatus (`status`/`news`/`chance_of_playing_next_round`), pluss
   «ferdigspilte runder» som global kontekst. (Ikke xG/ownership — valgt bort.)
2. **Sidens beregninger sendes med:** kapteinstopp 3 med kriterium
   (`form`/`ep_next`) og innkjøpskandidater per salgskandidat — rådgiveren
   ser det brukeren ser og bes si fra når den avviker.
3. **Ingen mekanisk etterkontroll i v1.2.4:** harde REGLER i prompten i
   stedet. Dikter prod fortsatt: etterkontroll blir eget kø-punkt.
4. **Databygging flyttes til `prompts.js`:** `buildAdvicePrompt` tar
   strukturert data og formaterer selv; api.js blir tynn.

**Edge-beslutninger (tatt i planøkten):**

- Skadeflagg per spiller: flagget når `status !== 'a'` ELLER
  `chance_of_playing_next_round != null && < 100` — samme logikk som
  dashbordets skadefilter ([analysis.js:85-87](src/services/analysis.js#L85-L87)).
  Flagget spiller får ` — SKADET/USIKKER: <news|skadet/usikker> (spillesjanse X %)`.
- `form`/`ep_next` sendes rått som FPL-strengene (som i dag for `form`) —
  ingen parsing i prompten.
- Kriterium-etikett: `form` → «form», `ep_next` → «forventet poeng (FPL)».
  Tom kapteinsliste (guarden i `captainSuggestions`) → eksplisitt linje
  «Siden har ingen kapteinsforslag ennå (mangler datagrunnlag).»
- `roundsPlayed` = `bootstrap.events.filter((e) => e.finished).length`.
- Defaults i signaturen (`squad = []`, `transfers = []`,
  `pageCaptains = null`) så tomme tilstander aldri krasjer.

## Ny kontrakt for `buildAdvicePrompt`

```js
buildAdvicePrompt({
  entryName, bank, fromGw, deadlineText, captainName, viceName, // som i dag
  roundsPlayed,                    // antall ferdigspilte runder (heltall)
  squad: [{                        // ett objekt per spiller i troppen
    name, team, pos, price,        // web_name, short_name, POSITIONS_SHORT, now_cost (tideler)
    form, epNext,                  // FPL-strenger ('8.0', '7.5')
    minutes, totalPoints,          // heltall
    status, news, chance,          // status-kode, news-tekst, chance_of_playing_next_round
    opponents: [{ team, home, fdr }], // [] = ingen kamp
  }],
  pageCaptains: { criterion, list: [{ name, reasons }] } | null,
  transfers: [{ outName, reasons, inn: [{ name, team, price, form, epNext }] }],
})
```

## Målimplementasjon — `buildAdvicePrompt` i `src/services/prompts.js` (komplett erstatning)

Dagens funksjon (linje 40–87 inkl. doc-kommentar) erstattes i sin helhet.
Resten av fila (`buildBriefPrompt`, maskering, alias, `sanitizeBriefText`)
røres IKKE. Ny doc-kommentar over funksjonen:

```js
/**
 * Rådgiver-prompten (/lag → «Spør AI om råd»).
 *
 * Fullt signalsett per spiller (form, ep_next, minutter, totalpoeng,
 * skadestatus) skiller «ingen data» fra «dårlig form» — uten det diktet
 * modellen begrunnelser om spillere med 0 minutter (B-2, prod 22. aug 2026).
 * Sidens egne beregninger (kapteinstopp med kriterium, innkjøpskandidater)
 * sendes med så rådgiveren og /lag resonnerer fra samme rangering — UI-et
 * faller tilbake på ep_next når all form er 0. Runde, deadline og nåværende
 * kaptein er med fordi modellen ellers ikke vet hvilken runde rådet gjelder.
 * Antall gratis bytter er ikke tilgjengelig uten innlogging (`my-team/` gir
 * 403), så modellen instrueres eksplisitt om ikke å spekulere i det.
 */
```

Selve funksjonen:

```js
// Kriterienavn fra captainSuggestions (analysis.js) → norsk etikett.
const CRITERION_LABELS = { form: 'form', ep_next: 'forventet poeng (FPL)' };

export function buildAdvicePrompt({
  entryName,
  bank,
  fromGw,
  deadlineText,
  captainName,
  viceName,
  roundsPlayed,
  squad = [],
  pageCaptains = null,
  transfers = [],
}) {
  const opponentText = (opponents) =>
    opponents.length
      ? opponents.map((o) => `mot ${o.team} (${o.home ? 'hjemme' : 'borte'}, FDR ${o.fdr})`).join(' og ')
      : 'ingen kamp';
  const injuryNote = (p) => {
    if (p.status === 'a' && (p.chance == null || p.chance >= 100)) return '';
    const cause = p.news?.trim() || 'skadet/usikker';
    const chance = p.chance != null ? ` (spillesjanse ${p.chance} %)` : '';
    return ` — SKADET/USIKKER: ${cause}${chance}`;
  };
  const playerLine = (p) =>
    `- ${p.name} (${p.team}, ${p.pos}, ${formatPrice(p.price)}, form ${p.form}, ventet ${p.epNext} p neste runde, ${p.minutes} min, ${p.totalPoints} p totalt, ${opponentText(p.opponents)})${injuryNote(p)}`;
  const innText = (inn) =>
    inn.length
      ? inn.map((k) => `${k.name} (${k.team}, ${formatPrice(k.price)}, form ${k.form}, ventet ${k.epNext} p)`).join(', ')
      : 'ingen';

  const parts = [`Du er FPL-rådgiver. Laget «${entryName}» har ${formatPrice(bank)} £m i banken.`];
  if (fromGw != null) {
    parts.push(
      deadlineText
        ? `Rådet gjelder Runde ${fromGw} (deadline ${deadlineText}).`
        : `Rådet gjelder Runde ${fromGw}.`,
    );
  }
  if (captainName) {
    parts.push(
      viceName
        ? `Nåværende kaptein: ${captainName} (visekaptein: ${viceName}).`
        : `Nåværende kaptein: ${captainName}.`,
    );
  }
  if (roundsPlayed != null) parts.push(`Ferdigspilte runder denne sesongen: ${roundsPlayed}.`);

  parts.push(
    '',
    'DATAGRUNNLAG — troppen (lag, posisjon, pris, form, ventet poeng neste runde (FPL), spilletid, totalpoeng, motstander):',
    ...squad.map(playerLine),
    '',
    'SIDENS BEREGNINGER (det brukeren ser på /lag):',
    pageCaptains?.list?.length
      ? `Kapteinsforslag, rangert på ${CRITERION_LABELS[pageCaptains.criterion] ?? pageCaptains.criterion}:`
      : 'Siden har ingen kapteinsforslag ennå (mangler datagrunnlag).',
    ...(pageCaptains?.list ?? []).map((c) => `- ${c.name}: ${c.reasons.join('; ')}`),
    '',
    transfers.length
      ? 'Salgskandidater med sidens innkjøpskandidater:'
      : 'Ingen automatisk flaggede salgskandidater.',
    ...transfers.map((t) => `- Ut: ${t.outName} (${t.reasons.join('; ')}). Inn-kandidater: ${innText(t.inn)}`),
    '',
    'REGLER:',
    '- 0 minutter spilt betyr «ingen data ennå» — omtal det aldri som svak eller dårlig form.',
    '- Bruk kun tall som står i datagrunnlaget over. Finn aldri på formtall, poeng eller annen statistikk.',
    '- Anbefal aldri en spiller merket SKADET/USIKKER som kaptein, og nevn spillesjansen når du omtaler en flagget spiller.',
    '- Du vet ikke hvor mange gratis bytter laget har. Anta aldri at et bytte er gratis, og bruk aldri antall gratis bytter som argument. Nevn kostnaden på 4 poeng kun som forbehold.',
    '',
    'OPPGAVE — gi på norsk: 1) beste kaptein denne runden med begrunnelse — si eksplisitt om nåværende kaptein bør beholdes eller byttes, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Avviker rådet ditt fra sidens beregninger, si kort hvorfor. Sett spillernavn i **fet**. Maks ~250 ord.',
  );
  return parts.join('\n');
}
```

## Målendring — `/ai-rad`-handleren i `src/routes/api.js`

**Import-blokken fra analysis.js erstattes med** (alfabetisk; `formatPrice`
UT — brukes ikke lenger i ruta og feiler ellers på `no-unused-vars`;
`formatDateTime`-importen fra format.js beholdes):

```js
import {
  byId,
  captainSuggestions,
  currentEvent,
  nextEvent,
  nextOpponents,
  POSITIONS_SHORT,
  resolvePicks,
  transferInCandidates,
  transferOutCandidates,
} from '../services/analysis.js';
```

**Diff-oversikt i handleren:** behold alt til og med
`const fromGw = nextEvent(...)` (linje 43–55) og `deadline`/`nameOf`/
`opponentsByTeam` (linje 60–62). SLETT `opponentText`-hjelperen (linje
63–72) og dagens `squadLines`/`outs`-bygging inne i `ai.generate`-kallet.
Kommentaren på linje 57–59 («Kontekst modellen ellers gjetter på …»)
erstattes med: `// Fullt datagrunnlag + sidens egne beregninger — se
buildAdvicePrompt for hvorfor.` Kallet bygges slik (system-melding,
`cacheKey`, `minIntervalMs`, `maxTokens` er UENDRET):

```js
    const deadline = bootstrap.events.find((e) => e.id === fromGw)?.deadline_time;
    const nameOf = (pick) => elementsById.get(pick?.element)?.web_name ?? null;
    const opponentsByTeam = nextOpponents(fixtures, fromGw);
    const squadIds = new Set(squad.map((p) => p.id));
    const bank = picks.entry_history.bank;
    const outs = transferOutCandidates(squad, fixtures, fromGw);
    const captains = captainSuggestions(squad, fixtures, fromGw);
    const shortName = (teamId) => teamsById.get(teamId)?.short_name ?? '?';

    const result = await ai.generate({
      cacheKey: `ai-rad-${config.fplTeamId}-gw${fromGw}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-rådgiver. Vær konkret.',
      prompt: buildAdvicePrompt({
        entryName: entry.name,
        bank,
        fromGw,
        deadlineText: deadline ? formatDateTime(deadline) : null,
        captainName: nameOf(picks.picks.find((p) => p.is_captain)),
        viceName: nameOf(picks.picks.find((p) => p.is_vice_captain)),
        roundsPlayed: bootstrap.events.filter((e) => e.finished).length,
        squad: squad.map((p) => ({
          name: p.web_name,
          team: shortName(p.team),
          pos: POSITIONS_SHORT[p.element_type],
          price: p.now_cost,
          form: p.form,
          epNext: p.ep_next,
          minutes: p.minutes,
          totalPoints: p.total_points,
          status: p.status,
          news: p.news,
          chance: p.chance_of_playing_next_round,
          opponents: (opponentsByTeam.get(p.team) ?? []).map((m) => ({
            team: shortName(m.opponent),
            home: m.home,
            fdr: m.difficulty,
          })),
        })),
        pageCaptains: {
          criterion: captains[0]?.criterion ?? null,
          list: captains.map((c) => ({ name: c.player.web_name, reasons: c.reasons })),
        },
        transfers: outs.map((o) => ({
          outName: o.player.web_name,
          reasons: o.reasons,
          inn: transferInCandidates(o.player, bootstrap.elements, squadIds, bank, fixtures, fromGw).map((k) => ({
            name: k.player.web_name,
            team: shortName(k.player.team),
            price: k.player.now_cost,
            form: k.player.form,
            epNext: k.player.ep_next,
          })),
        })),
      }),
      maxTokens: 4000,
    });
```

(`squad` er som i dag `resolvePicks(...).map((s) => s.player)`.
`transferInCandidates` er ren over allerede lastet `bootstrap.elements` —
fortsatt ingen nye nettverkskall.)

## Globale rammer (gjelder alle tasks)

- Branch **`fix/radgiver-prompt`** fra `main`. **ALDRI push** uten eksplisitt
  klarsignal fra Marius (push til `main` auto-deployer prod). Aldri
  push/deploy torsdag 19:00–21:00 (auto-brief ~19:30), aldri mens kamper
  pågår — **NB: GW2 spilles ~29.–31. aug.**
- `npm test` og `npm run lint` grønne etter HVER commit. Utgangspunkt:
  **250/250, lint 0**. TDD: rødt observeres i økten, test + implementasjon i
  samme commit.
- Ingen nettverkskall i tester. **AI-budsjett: maks 2 kall totalt** (1 lokal
  E2E i Task 2, 1 prod-retest i Task 3). Kallene loggføres i HANDOVER.
- **Med ekte nøkkel lokalt: besøk ALDRI `/brief` eller `/nyheter`** — de
  genererer betalt AI-tekst per besøk. Full rutesveip kjøres kun i
  tomme-nøkler-passet.
- Conventional commits; docs i samme commit som endringen. Tiltale «Hei
  Marius!». Stopp ved ~95 % usage: HANDOVER grundig + commit alt (uten push).

---

### Task 1: Ny prompt + api-databygging + tester + docs (én commit)

**Filer:**
- Endre: `src/services/prompts.js` (målimplementasjonen), `src/routes/api.js`
  (målendringen)
- Test: `test/prompts.test.js` (4 eksisterende advice-tester skrives om, 6 nye)
- Docs: `CHANGELOG.md`, `ROADMAP.md`, `CLAUDE.md`

- [x] **Steg 1: Branch**

```powershell
git -C "c:\Users\mariu\Documents\Claude Code\FPL" status
git checkout -b fix/radgiver-prompt main
```

- [x] **Steg 2: Skriv om `RAD_ARGS` og de 4 advice-testene, legg til 6 nye**

Nytt `RAD_ARGS` (erstatter dagens på linje ~269):

```js
const RAD_ARGS = {
  entryName: 'Mitt Lag FC',
  bank: 15,
  fromGw: 2,
  deadlineText: 'lørdag 22. august kl. 13:30',
  captainName: 'Haaland',
  viceName: 'Salah',
  roundsPlayed: 1,
  squad: [
    { name: 'Haaland', team: 'MCI', pos: 'A', price: 142, form: '8.0', epNext: '7.5', minutes: 90, totalPoints: 12, status: 'a', news: '', chance: null, opponents: [{ team: 'BOU', home: true, fdr: 2 }] },
    { name: 'Doku', team: 'MCI', pos: 'M', price: 65, form: '0.0', epNext: '2.1', minutes: 0, totalPoints: 0, status: 'i', news: 'Kneskade — ventes tilbake 15. sep', chance: 25, opponents: [{ team: 'BOU', home: true, fdr: 2 }] },
  ],
  pageCaptains: { criterion: 'form', list: [{ name: 'Haaland', reasons: ['Form 8.0', 'FDR 2.0 neste kamp', 'Full spilletid ventet'] }] },
  transfers: [{ outName: 'Doku', reasons: ['Skadet/usikker: Kneskade — ventes tilbake 15. sep'], inn: [{ name: 'Saka', team: 'ARS', price: 87, form: '6.2', epNext: '5.8' }] }],
};
```

De 4 eksisterende skrives om slik:
- Testen «tar med tropp, bank og salgskandidater» (linje 24) erstattes
  ordrett med (viser samtidig at utelatt `fromGw`/kaptein/`roundsPlayed`/
  `pageCaptains` håndteres, og at tom `opponents` gir «ingen kamp»):

```js
test('buildAdvicePrompt tar med tropp, bank og salgskandidater', () => {
  const prompt = buildAdvicePrompt({
    entryName: 'Mitt Lag FC',
    bank: 15,
    squad: [{ name: 'Haaland', team: 'MCI', pos: 'A', price: 142, form: '8.0', epNext: '7.5', minutes: 90, totalPoints: 12, status: 'a', news: '', chance: null, opponents: [] }],
    transfers: [{ outName: 'Spiller X', reasons: ['Skadet'], inn: [] }],
  });
  assert.match(prompt, /Mitt Lag FC/);
  assert.match(prompt, /1\.5/); // bank i £m
  assert.match(prompt, /Haaland/);
  assert.match(prompt, /Spiller X/);
  assert.match(prompt, /ingen kamp/); // tom opponents-liste
  assert.match(prompt, /Siden har ingen kapteinsforslag ennå/); // pageCaptains utelatt
});
```

- «oppgir hvilken runde …» (linje 280): kun `RAD_ARGS`-byttet — assertene
  holder som de står (runde-, kaptein- og «mot BOU»-linjene finnes fortsatt).
- «forbyr spekulasjon …» (linje 287): uendrede asserts — regelteksten om
  gratis bytter/4 poeng og «beholdes eller byttes» finnes fortsatt.
- Seksjonskommentaren over `RAD_ARGS` (linje 267) oppdateres til
  `// ---- B-2/v1.2.4: rådgiveren får fullt datagrunnlag og strukturert prompt ----`.
- **Snapshot-testen (linje 295): erstatt forventningsstrengen med nøyaktig
  output av målimplementasjonen på nye `RAD_ARGS`.** Linjene er (join med
  `\n`; tomme strenger = blanklinjer):

```
Du er FPL-rådgiver. Laget «Mitt Lag FC» har 1.5 £m i banken.
Rådet gjelder Runde 2 (deadline lørdag 22. august kl. 13:30).
Nåværende kaptein: Haaland (visekaptein: Salah).
Ferdigspilte runder denne sesongen: 1.

DATAGRUNNLAG — troppen (lag, posisjon, pris, form, ventet poeng neste runde (FPL), spilletid, totalpoeng, motstander):
- Haaland (MCI, A, 14.2, form 8.0, ventet 7.5 p neste runde, 90 min, 12 p totalt, mot BOU (hjemme, FDR 2))
- Doku (MCI, M, 6.5, form 0.0, ventet 2.1 p neste runde, 0 min, 0 p totalt, mot BOU (hjemme, FDR 2)) — SKADET/USIKKER: Kneskade — ventes tilbake 15. sep (spillesjanse 25 %)

SIDENS BEREGNINGER (det brukeren ser på /lag):
Kapteinsforslag, rangert på form:
- Haaland: Form 8.0; FDR 2.0 neste kamp; Full spilletid ventet

Salgskandidater med sidens innkjøpskandidater:
- Ut: Doku (Skadet/usikker: Kneskade — ventes tilbake 15. sep). Inn-kandidater: Saka (ARS, 8.7, form 6.2, ventet 5.8 p)

REGLER:
- 0 minutter spilt betyr «ingen data ennå» — omtal det aldri som svak eller dårlig form.
- Bruk kun tall som står i datagrunnlaget over. Finn aldri på formtall, poeng eller annen statistikk.
- Anbefal aldri en spiller merket SKADET/USIKKER som kaptein, og nevn spillesjansen når du omtaler en flagget spiller.
- Du vet ikke hvor mange gratis bytter laget har. Anta aldri at et bytte er gratis, og bruk aldri antall gratis bytter som argument. Nevn kostnaden på 4 poeng kun som forbehold.

OPPGAVE — gi på norsk: 1) beste kaptein denne runden med begrunnelse — si eksplisitt om nåværende kaptein bør beholdes eller byttes, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Avviker rådet ditt fra sidens beregninger, si kort hvorfor. Sett spillernavn i **fet**. Maks ~250 ord.
```

De 6 nye testene (nederst i fila, seksjonskommentar «---- v1.2.4:
rådgiveren får fullt datagrunnlag ----»), alle på `buildAdvicePrompt(RAD_ARGS)`
med mindre annet sies:

```js
test('buildAdvicePrompt tar med ep_next, minutter og totalpoeng per spiller', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /ventet 7\.5 p neste runde, 90 min, 12 p totalt/);
});

test('buildAdvicePrompt merker skadet spiller med årsak og spillesjanse', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /Doku .* — SKADET\/USIKKER: Kneskade — ventes tilbake 15\. sep \(spillesjanse 25 %\)/);
});

test('buildAdvicePrompt oppgir ferdigspilte runder og ingen-data-regelen', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /Ferdigspilte runder denne sesongen: 1\./);
  assert.match(prompt, /0 minutter spilt betyr «ingen data ennå»/);
  assert.match(prompt, /Finn aldri på formtall/);
});

test('buildAdvicePrompt navngir sidens kriterium — også ep_next-fallbacken', () => {
  const prompt = buildAdvicePrompt({
    ...RAD_ARGS,
    pageCaptains: { criterion: 'ep_next', list: [{ name: 'Haaland', reasons: ['Forventet poeng (FPL) 7.5'] }] },
  });
  assert.match(prompt, /Kapteinsforslag, rangert på forventet poeng \(FPL\):/);
});

test('buildAdvicePrompt sier eksplisitt fra når siden ikke har kapteinsforslag', () => {
  const prompt = buildAdvicePrompt({ ...RAD_ARGS, pageCaptains: { criterion: null, list: [] } });
  assert.match(prompt, /Siden har ingen kapteinsforslag ennå \(mangler datagrunnlag\)\./);
});

test('buildAdvicePrompt lister innkjøpskandidater med data, og «ingen» når lista er tom', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /Inn-kandidater: Saka \(ARS, 8\.7, form 6\.2, ventet 5\.8 p\)/);
  const uten = buildAdvicePrompt({
    ...RAD_ARGS,
    transfers: [{ outName: 'Doku', reasons: ['Skadet'], inn: [] }],
  });
  assert.match(uten, /Inn-kandidater: ingen/);
});
```

- [x] **Steg 3: Observer rødt**

```powershell
npm test
```

Forvent: **256 tester, 246 pass, 10 fail** — de 4 omskrevne + 6 nye (gammel
implementasjon leser `squadLines` som nå er `undefined` → TypeError). Vis
talllinjene.

- [x] **Steg 4: Implementer** målimplementasjonen i `prompts.js` og
  målendringen i `api.js`. Sjekk at `formatPrice` fjernes fra api.js-importen
  hvis ubrukt.

- [x] **Steg 5: Observer grønt + lint**

```powershell
npm test
npm run lint
```

Forvent: **256/256**, lint 0. (De øvrige prompts-testene, inkl.
sanitize-testene, urørte og grønne.)

- [x] **Steg 6: Docs i samme commit**

  - `CHANGELOG.md` under `## [Unreleased]`, ny `### Fixed`:

    ```markdown
    ### Fixed

    - **AI-rådgiveren på /lag dikter ikke lenger begrunnelser.** Prompten
      sender nå fullt datagrunnlag per spiller (form, forventet poeng,
      minutter, totalpoeng, skadestatus med spillesjanse), antall
      ferdigspilte runder, og sidens egne kaptein- og innkjøpsforslag med
      rangeringskriterium — strukturert i seksjoner med harde regler:
      0 minutter = «ingen data ennå», aldri påfunnede tall, aldri flagget
      spiller som kaptein (B-2-funnet fra prod 22. aug).
    ```

  - `ROADMAP.md`: i køen erstattes innholdet i «### 1. AI-rådgiverens
    promptstruktur på /lag (v1.2.4)» med kort status + sjekkliste:

    ```markdown
    _Plan: `docs/plan-v124-radgiver-prompt.md`. På branch
    `fix/radgiver-prompt` — release etter klarsignal fra Marius._

    - [x] Fullt datagrunnlag + strukturert prompt + sidens beregninger (TDD, 6 nye tester)
    - [ ] Røyktest lokalt + 1 lokal E2E-verifisering av AI-svaret
    - [ ] Release v1.2.4 (bump, tag, merge, push, prod-retest) — KUN på klarsignal
    ```

  - `CLAUDE.md`: legg til linje i filkartet under `src/services/` (rett
    etter `brief.js`-blokken, før `live.js`):

    ```
      prompts.js       rene promptbyggere (brief + rådgiver) og
                       sanitizeBriefText (etterkontroll av AI-briefen)
    ```

- [x] **Steg 7: Commit**

```powershell
git add src/services/prompts.js src/routes/api.js test/prompts.test.js CHANGELOG.md ROADMAP.md CLAUDE.md
git commit -m "fix(ai): radgiveren far fullt datagrunnlag og strukturert prompt"
```

---

### Task 2: Røyktest + 1 lokal E2E-verifisering + handover (én commit)

- [x] **Steg 1: Røyktest med TOMME nøkler** (teknikk fra HANDOVER-lærdommen:
  `loadEnvFile` overskriver ikke variabler `--env-file` alt har satt)

```powershell
Set-Content "$env:TEMP\fpl-smoke.env" "PORT=3010`nFPL_TEAM_ID=5330646`nANTHROPIC_API_KEY=`nDISCORD_WEBHOOK_URL=" -Encoding ascii
node --env-file="$env:TEMP\fpl-smoke.env" src/server.js   # i bakgrunn
(Invoke-WebRequest "http://localhost:3010/health" -UseBasicParsing).Content
```

**Forvent `"ai":false` og `"discord":false` — ellers STOPP serveren og
feilsøk.** Deretter alle 11 ruter → 200 og ukjent sti → 404 (sløyfa fra
`docs/arkiv/plan-cache-backoff.md` Task 2 steg 3). I tillegg:
`Invoke-WebRequest -Method POST http://localhost:3010/api/ai-rad` skal gi
**400** («AI er ikke aktivert»). Stopp serveren.

- [x] **Steg 2: Lokal E2E med EKTE Anthropic-nøkkel (AI-kall 1 av 2)**

Ny env-fil UTEN `ANTHROPIC_API_KEY`-linje (repoets `.env` fyller den via
`loadEnvFile`), men med TOM `DISCORD_WEBHOOK_URL=`:

```powershell
Set-Content "$env:TEMP\fpl-e2e.env" "PORT=3010`nFPL_TEAM_ID=5330646`nDISCORD_WEBHOOK_URL=" -Encoding ascii
node --env-file="$env:TEMP\fpl-e2e.env" src/server.js   # i bakgrunn
(Invoke-WebRequest "http://localhost:3010/health" -UseBasicParsing).Content
```

Forvent `"ai":true` og `"discord":false`. **Besøk IKKE `/brief` eller
`/nyheter`.** Så:

```powershell
(Invoke-WebRequest -Method POST "http://localhost:3010/api/ai-rad" -UseBasicParsing).Content
```

Vurder svaret mot B-2-kriteriene og noter i HANDOVER: (a) norsk, tre
nummererte punkter, spillernavn i **fet**; (b) eksplisitt om kapteinen
beholdes/byttes; (c) **ingen påfunnede tall** — stikkprøv 2–3 formtall/poeng
i svaret mot `/lag`-siden eller serverloggens datagrunnlag; (d) omtales en
0-minutterspiller, skal det stå «ingen data», ikke «svak form». Stopp
serveren. Feiler kriteriene: rapporter til Marius FØR release — ikke
«fiks» prompten på egen hånd.

- [x] **Steg 3: HANDOVER + ROADMAP, commit**

  - `docs/HANDOVER.md`: «Sist oppdatert», status (branch ferdig lokalt,
    256/256, lint 0, røyktest OK, E2E-vurderingen med sitat av de viktigste
    svarlinjene, 1 AI-kall brukt), loggfør Marius' beskjeder fra økten.
  - `ROADMAP.md`: huk av røyktest/E2E-punktet i v1.2.4-sjekklista.

```powershell
git add docs/HANDOVER.md ROADMAP.md
git commit -m "docs: handover og roeyktest for radgiver-prompten"
```

Deretter: sluttrapport til Marius og **VENT på klarsignal**. Task 3 kjøres
kun etter eksplisitt «kjør release»/tilsvarende fra Marius (kan skje i samme
økt eller senere).

---

### Task 3: Release v1.2.4 (KUN etter klarsignal fra Marius)

- [ ] **Steg 1: Sjekk tidsvindu** — ikke torsdag 19–21, ingen kamper pågår
  (GW2 ~29.–31. aug; sjekk kampstart på `/` eller fixtures før push).
- [ ] **Steg 2: Bump + CHANGELOG på branchen**

```powershell
npm version 1.2.4 --no-git-tag-version
```

  - `CHANGELOG.md`: flytt `[Unreleased]`-innholdet til ny seksjon
    `## [1.2.4] — <dagens dato>`.
  - `ROADMAP.md`: huk av release-punktet; marker v1.2.4-raden i
    versjonsplan-tabellen som utført; flytt v1.2.4 til utført-historikken
    (samme mønster som v1.2.3).
  - Commit: `chore(release): v1.2.4`.

- [ ] **Steg 3: Merge, tag, push**

```powershell
git checkout main
git merge --no-ff fix/radgiver-prompt
npm test          # 256/256 på main
git tag -a v1.2.4 -m "AI-radgiveren far fullt datagrunnlag og strukturert prompt"
git push origin main --follow-tags
```

- [ ] **Steg 4: Prod-verifisering** — Coolify auto-deployer. Sjekk
  `https://fpl.marsk.no/health` (200, `ai:true`) og at `/lag` laster. Så
  **prod-retest av B-2 (AI-kall 2 av 2):** Marius klikker «Spør AI om råd»
  på /lag (eller økten POST-er `/api/ai-rad` i prod) og svaret vurderes mot
  kriteriene fra Task 2 steg 2. **Ikke sveip `/brief`/`/nyheter` i prod.**
- [ ] **Steg 5: HANDOVER-oppdatering** (prod verifisert, AI-kall-telling: 2)
  + commit + push av docs (utenfor kampvindu).

## Bevisst utelatt (ikke gjør dette)

- **Mekanisk etterkontroll av rådsvaret** — Marius valgte promptregler i
  v1.2.4; etterkontroll blir eget kø-punkt hvis prod fortsatt dikter.
- **Endringer i `buildBriefPrompt`/`sanitizeBriefText`** — briefen er
  v1.2.5-arbeid (brief-kvalitetstrioen).
- **Endringer i `ai.js`** (cache, backoff, maxTokens, modell) og i
  UI/`public/app.js` — knappen og visningen er uendret.
- **xG/xA/ownership i prompten** — valgt bort i brainstormingen.
- **Nye FPL-kall eller endringer i `analysis.js`** — alt bygges fra data som
  alt lastes; `captainSuggestions`/`transferInCandidates` brukes som de er.

## Verifisering (oppsummert)

| Punkt | Kommando | Forventet |
| --- | --- | --- |
| Utgangspunkt på main | `npm test` | 250/250 |
| Task 1 rødt | `npm test` | 256 tester, 10 fail |
| Task 1 grønt | `npm test` + `npm run lint` | 256/256, lint 0 |
| Røyktest (tomme nøkler) | `/health` først, 11 ruter, 404, POST `/api/ai-rad` | `ai:false`, alle 200, 404, POST → 400 |
| E2E lokalt (ekte nøkkel) | `/health` + POST `/api/ai-rad` | `ai:true, discord:false`; svar består B-2-kriteriene |
| Branch før klarsignal | `git log --oneline main..fix/radgiver-prompt` | 2 commits, ingen push |
| Release (etter klarsignal) | tag + push + `/health` i prod + prod-retest | v1.2.4 i prod, svar består B-2 |

## Etter godkjenning (Fable-øktens egne steg — ikke Opus)

1. Kopier denne planen uendret til `docs/plan-v124-radgiver-prompt.md`.
2. Oppdater `docs/HANDOVER.md`: «Sist oppdatert»-linja, status-punktet om
   v1.2.4 (fra «Ikke påbegynt» til «plan klar og godkjent — neste:
   utførelsesøkt med Opus»), og loggfør Marius' to beskjeder fra planøkten
   (kjøreprompten + «gjør planen så detaljert som mulig, kopierbar
   Opus-prompt i chatten, ikke fil»).
3. Oppdater `ROADMAP.md` kø-punkt 1: «Eier detaljene:
   `docs/plan-v124-radgiver-prompt.md` (godkjent 24. aug)» i stedet for
   «plan mangler».
4. Commit docs lokalt på `main` (`docs: plan for v1.2.4 radgiver-prompt`)
   — **ingen push**.
5. Lever den kopierbare Opus-utførelsesprompten **i chatten, IKKE som fil**
   (Marius' beslutning 24. aug). Prompten skal peke på
   `docs/plan-v124-radgiver-prompt.md`, kreve `superpowers:executing-plans`,
   lesing av `docs/HANDOVER.md` + `CLAUDE.md` først, checkbox-sporing i
   plandokumentet, og gjenta de harde rammene (aldri push uten klarsignal,
   Task 3 kun på klarsignal, maks 2 AI-kall, aldri /brief //nyheter med ekte
   nøkkel, tiltale «Hei Marius!», handover ved ~95 % usage).
