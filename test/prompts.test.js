import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefPrompt, buildAdvicePrompt, sanitizeBriefText } from '../src/services/prompts.js';
import { briefTextGw1, briefGw1 } from './fixtures/brief-gw1.js';

test('buildBriefPrompt tar med deadline, skader og kapteiner', () => {
  const prompt = buildBriefPrompt({
    gameweek: { id: 2, name: 'Runde 2', deadlineFormatted: 'fredag 21. august kl. 19:30' },
    injuries: [{ name: 'Haaland', team: 'MCI', ownership: '55.1', news: 'Kne — 75 %', status: 'd' }],
    captains: [{ name: 'Salah', team: 'LIV', form: '8.5', ownership: '45.0', avgFdr: 2 }],
    fixturesByDay: [{ day: 'fredag 21. august', matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00' }] }],
    mine: null,
  });
  assert.match(prompt, /Runde 2/);
  assert.match(prompt, /fredag 21\. august kl\. 19:30/);
  assert.match(prompt, /Haaland/);
  assert.match(prompt, /Salah/);
  assert.match(prompt, /norsk/i);
  // P4 (QA v1.1.1): prompten skal kreve norske fotballuttrykk.
  assert.match(prompt, /holdt nullen/);
  assert.match(prompt, /aldri «gameweek»/);
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

// ---- P1-4: tidsfakta og etterkontroll ----------------------------------
// Modellen påsto at kamper ble spilt før deadline når de faktisk lå etter.
// Fasiten beregnes nå i briefen, sendes med i prompten, og påstander som
// motsier den fjernes fra teksten før den vises.

const briefMedTidsfakta = {
  gameweek: { id: 1, name: 'Runde 1', deadlineFormatted: 'fredag 21. august kl. 19:30' },
  injuries: [],
  captains: [],
  fixturesByDay: [
    {
      day: 'fredag 21. august',
      matches: [
        { home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false },
        { home: 'Arsenal', away: 'Chelsea', kickoff: '18:00', beforeDeadline: true },
      ],
    },
  ],
  fixturesBeforeDeadline: ['Arsenal–Chelsea (18:00)'],
  mine: null,
};

test('buildBriefPrompt sender med forhåndsberegnede tidsfakta', () => {
  const prompt = buildBriefPrompt(briefMedTidsfakta);
  assert.match(prompt, /Forhåndsberegnede tidsfakta/);
  assert.match(prompt, /FØR deadline: Arsenal–Chelsea \(18:00\)/);
  assert.match(prompt, /Utled aldri tidsforhold selv/);
});

test('buildBriefPrompt sier tydelig fra når ingen kamper er før deadline', () => {
  const prompt = buildBriefPrompt({ ...briefMedTidsfakta, fixturesBeforeDeadline: [] });
  assert.match(prompt, /Ingen kamper starter før deadline/);
});

test('sanitizeBriefText fjerner uriktig påstand om kamp før deadline', () => {
  const text = [
    '### Kamper å følge med på',
    '**Liverpool**–Bournemouth spilles før deadline. Sjekk laget ditt.',
  ].join('\n');

  const ut = sanitizeBriefText(text, briefMedTidsfakta);

  assert.ok(!ut.includes('spilles før deadline'), 'uriktig setning ble stående');
  assert.ok(ut.includes('Sjekk laget ditt.'), 'resten av linjen forsvant');
  assert.ok(ut.includes('### Kamper å følge med på'), 'overskriften forsvant');
});

test('sanitizeBriefText beholder korrekt påstand om kamp før deadline', () => {
  const text = '**Arsenal**–Chelsea spilles før deadline, så bestem deg tidlig.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText beholder korrekt påstand om kamp etter deadline', () => {
  const text = 'Liverpool–Bournemouth spilles etter deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText fjerner «før deadline» når ingen kamper er før deadline', () => {
  const utenTidlige = {
    ...briefMedTidsfakta,
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false }],
    }],
    fixturesBeforeDeadline: [],
  };
  const text = 'Flere kamper starter før deadline denne runden.';

  assert.equal(sanitizeBriefText(text, utenTidlige), '');
});

test('sanitizeBriefText rører ikke tekst uten deadline-påstander', () => {
  const text = '**Salah** er i god form og eies av 45 %.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText er en no-op når kampdataene mangler beforeDeadline', () => {
  const gammel = { fixturesByDay: [{ day: 'fredag', matches: [{ home: 'A', away: 'B', kickoff: '20:00', beforeDeadline: null }] }] };
  const text = 'Alle kamper spilles før deadline.';

  assert.equal(sanitizeBriefText(text, gammel), text);
});

// Regresjon: begge disse sto i en ekte AI-brief og var korrekte, men ble
// fjernet av den første versjonen av kontrollen. Den første er en negasjon,
// den andre bruker «før deadline» som tidspunkt, ikke som påstand om en kamp.
test('sanitizeBriefText beholder negerte utsagn om deadline', () => {
  const utenTidlige = {
    ...briefMedTidsfakta,
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false }],
    }],
    fixturesBeforeDeadline: [],
  };
  const text = 'Ingen kamper starter før deadline — samtlige oppgjør spilles etter at fristen har passert.';

  assert.equal(sanitizeBriefText(text, utenTidlige), text);
});

test('sanitizeBriefText beholder råd der «før deadline» er et tidspunkt', () => {
  const text = 'Sjekk pressemeldinger og lagoppstillinger rett før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

// ---- P3-4: setningssplitting som tåler forkortelser ---------------------
// `line.match(/[^.!?]+[.!?]*/g)` delte på ethvert punktum — også i «kl.» og
// «21.00» — så halve setninger ble vurdert hver for seg. Da kan halvparten
// mangle lagnavnet eller negasjonen som gjør helheten korrekt.

const briefUtenTidligeKamper = {
  ...briefMedTidsfakta,
  fixturesByDay: [{
    day: 'fredag 21. august',
    matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false }],
  }],
  fixturesBeforeDeadline: [],
};

test('sanitizeBriefText: tom tekst og manglende brief er uendret', () => {
  assert.equal(sanitizeBriefText('', briefMedTidsfakta), '');
  assert.equal(sanitizeBriefText('Alt spilles før deadline.', undefined), 'Alt spilles før deadline.');
});

test('sanitizeBriefText splitter ikke på «kl.» — korrekt sammensatt setning beholdes', () => {
  const text = '**Arsenal**–Chelsea (kl. 18:00) spilles før deadline, mens Liverpool–Bournemouth går etter deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText: negasjon overlever «f.eks.» i samme setning', () => {
  const text = 'Ingen av kampene, f.eks. Liverpool–Bournemouth, starter før deadline.';

  assert.equal(sanitizeBriefText(text, briefUtenTidligeKamper), text);
});

test('sanitizeBriefText splitter ikke på klokkeslett med punktum', () => {
  const text = 'Liverpool spiller først 21.00 — det er etter deadline, mens Arsenal–Chelsea (18.00) går før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), text);
});

test('sanitizeBriefText fjerner uriktig påstand selv med forkortelse i setningen', () => {
  const text = 'Kampen starter kl. 21:00 før deadline.';

  assert.equal(sanitizeBriefText(text, briefUtenTidligeKamper), '');
});

// ---- P3-4: lagnavn-alias og ordgrenser ----------------------------------
// FPLs `teams.name` er selv kortform for flere klubber («Spurs», «Man Utd»),
// mens modellen gjerne skriver «Tottenham»/«Manchester United». Uten alias
// slapp uriktige påstander gjennom. Ordgrensen hindrer samtidig treff inni
// ord, og genitiv-støtten bevarer treffene substring-matchingen ga oss.

const briefMedSpurs = {
  fixturesByDay: [{
    day: 'fredag 21. august',
    matches: [
      { home: 'Spurs', away: 'Newcastle', kickoff: '21:00', beforeDeadline: false },
      { home: 'Man Utd', away: 'Everton', kickoff: '20:00', beforeDeadline: false },
      { home: 'Arsenal', away: 'Chelsea', kickoff: '18:00', beforeDeadline: true },
    ],
  }],
};

test('sanitizeBriefText fjerner uriktig påstand når modellen skriver «Tottenham» og dataene «Spurs»', () => {
  const text = 'Tottenham spiller sin kamp før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedSpurs), '');
});

test('sanitizeBriefText fjerner uriktig påstand med «Manchester United» for «Man Utd»', () => {
  const text = 'Manchester United spiller før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedSpurs), '');
});

test('sanitizeBriefText beholder korrekt påstand skrevet med kallenavn', () => {
  const briefMedSpursFoer = {
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [
        { home: 'Spurs', away: 'Newcastle', kickoff: '18:00', beforeDeadline: true },
        { home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false },
      ],
    }],
  };
  const text = '**Tottenham** spiller før deadline, så velg kaptein tidlig.';

  assert.equal(sanitizeBriefText(text, briefMedSpursFoer), text);
});

test('sanitizeBriefText matcher ikke lagnavn inni ord (ordgrense)', () => {
  const briefMedForest = {
    fixturesByDay: [{
      day: 'fredag 21. august',
      matches: [
        { home: "Nott'm Forest", away: 'Sunderland', kickoff: '21:00', beforeDeadline: false },
        { home: 'Arsenal', away: 'Chelsea', kickoff: '18:00', beforeDeadline: true },
      ],
    }],
  };
  const text = 'Forestill deg: flere kamper starter før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedForest), text);
});

test('sanitizeBriefText matcher genitiv («Liverpools») også etter ordgrense-endringen', () => {
  const text = 'Liverpools kamp spilles før deadline.';

  assert.equal(sanitizeBriefText(text, briefMedTidsfakta), '');
});

// ---- Regresjon mot ekte prod-brief (GW1, 2026-08-20) -----------------------

test('ekte AI-brief fra prod går uendret gjennom etterkontrollen', () => {
  assert.equal(sanitizeBriefText(briefTextGw1, briefGw1), briefTextGw1);
});

test('den ekte briefen inneholder tilfellene P3-4 ble laget for', () => {
  // Feiler denne, har fixturen mistet det som gjorde den verdt å ta vare på.
  assert.match(briefTextGw1, /kl\. 19:30/); // punktum midt i setning
  assert.match(briefTextGw1, /mot Coventry\b/); // alias for FPLs «Coventry City»
  assert.match(briefTextGw1, /Spurs' nye sesong/); // genitiv med apostrof
});

// ---- B-2: rådgiveren får runde, deadline, kaptein og motstandere -----------

const RAD_ARGS = {
  entryName: 'Mitt Lag FC',
  bank: 15,
  fromGw: 2,
  deadlineText: 'lørdag 22. august kl. 13:30',
  captainName: 'Haaland',
  viceName: 'Salah',
  squadLines: ['Haaland (MCI, A, 14.2, form 0.0, mot BOU (hjemme, FDR 2))'],
  outs: ['Spiller X: Skadet'],
};

test('buildAdvicePrompt oppgir hvilken runde rådet gjelder og hvem som er kaptein', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /Rådet gjelder Runde 2 \(deadline lørdag 22\. august kl\. 13:30\)\./);
  assert.match(prompt, /Nåværende kaptein: Haaland \(visekaptein: Salah\)\./);
  assert.match(prompt, /mot BOU \(hjemme, FDR 2\)/);
});

test('buildAdvicePrompt forbyr spekulasjon om gratis bytter og krever svar om kapteinen', () => {
  const prompt = buildAdvicePrompt(RAD_ARGS);
  assert.match(prompt, /gratis bytter/i);
  assert.match(prompt, /aldri at et bytte er gratis/i);
  assert.match(prompt, /4 poeng/);
  assert.match(prompt, /beholdes eller byttes/i);
});

test('buildAdvicePrompt har stabilt format (snapshot)', () => {
  assert.equal(
    buildAdvicePrompt(RAD_ARGS),
    [
      'Du er FPL-rådgiver. Laget «Mitt Lag FC» har 1.5 £m i banken.',
      'Rådet gjelder Runde 2 (deadline lørdag 22. august kl. 13:30).',
      'Nåværende kaptein: Haaland (visekaptein: Salah).',
      '',
      'Troppen (navn, lag, posisjon, pris, form, motstander):',
      '- Haaland (MCI, A, 14.2, form 0.0, mot BOU (hjemme, FDR 2))',
      '',
      'Automatisk flaggede salgskandidater:',
      '- Spiller X: Skadet',
      '',
      'Du vet ikke hvor mange gratis bytter laget har. Anta aldri at et bytte er gratis, og bruk aldri antall gratis bytter som argument. Nevn kostnaden på 4 poeng kun som forbehold.',
      '',
      'Gi på norsk: 1) beste kaptein denne runden med begrunnelse — si eksplisitt om nåværende kaptein bør beholdes eller byttes, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Sett spillernavn i **fet**. Maks ~250 ord.',
    ].join('\n'),
  );
});
