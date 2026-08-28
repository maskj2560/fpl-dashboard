import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefPrompt, buildAdvicePrompt, buildTransferCommentPrompt, sanitizeBriefText } from '../src/services/prompts.js';
import { briefTextGw1, briefGw1, briefGw1MedData } from './fixtures/brief-gw1.js';

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

// ---- B-2/v1.2.4: rådgiveren får fullt datagrunnlag og strukturert prompt ----

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
      'Ferdigspilte runder denne sesongen: 1.',
      '',
      'DATAGRUNNLAG — troppen (lag, posisjon, pris, form, ventet poeng neste runde (FPL), spilletid, totalpoeng, motstander):',
      '- Haaland (MCI, A, 14.2, form 8.0, ventet 7.5 p neste runde, 90 min, 12 p totalt, mot BOU (hjemme, FDR 2))',
      '- Doku (MCI, M, 6.5, form 0.0, ventet 2.1 p neste runde, 0 min, 0 p totalt, mot BOU (hjemme, FDR 2)) — SKADET/USIKKER: Kneskade — ventes tilbake 15. sep (spillesjanse 25 %)',
      '',
      'SIDENS BEREGNINGER (det brukeren ser på /lag):',
      'Kapteinsforslag, rangert på form:',
      '- Haaland: Form 8.0; FDR 2.0 neste kamp; Full spilletid ventet',
      '',
      'Salgskandidater med sidens innkjøpskandidater:',
      '- Ut: Doku (Skadet/usikker: Kneskade — ventes tilbake 15. sep). Inn-kandidater: Saka (ARS, 8.7, form 6.2, ventet 5.8 p)',
      '',
      'REGLER:',
      '- 0 minutter spilt betyr «ingen data ennå» — omtal det aldri som svak eller dårlig form.',
      '- Bruk kun tall som står i datagrunnlaget over. Finn aldri på formtall, poeng eller annen statistikk.',
      '- Anbefal aldri en spiller merket SKADET/USIKKER som kaptein, og nevn spillesjansen når du omtaler en flagget spiller.',
      '- Du vet ikke hvor mange gratis bytter laget har. Anta aldri at et bytte er gratis, og bruk aldri antall gratis bytter som argument. Nevn kostnaden på 4 poeng kun som forbehold.',
      '',
      'OPPGAVE — gi på norsk: 1) beste kaptein denne runden med begrunnelse — si eksplisitt om nåværende kaptein bør beholdes eller byttes, 2) anbefalt bytte (ut/inn) hvis noe gir mening — ellers si at man bør spare bytte, 3) én ting å følge med på før deadline. Avviker rådet ditt fra sidens beregninger, si kort hvorfor. Sett spillernavn i **fet**. Maks ~250 ord.',
    ].join('\n'),
  );
});

// ---- v1.2.4: rådgiveren får fullt datagrunnlag -----------------------------

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

test('overgangskommentar-prompten har sesongtall og spilte bytter, aldri pending', () => {
  const analysis = {
    rows: [
      { event: 2, chip: null, inn: { name: 'Haaland', points: 11 }, ut: { name: 'Watkins', points: 1 }, diff: 10, netto: 6, window: { from: 2, to: 3 }, played: true, pending: false, after5: { diff: 10, gws: 2, complete: false } },
      { event: 5, chip: null, inn: { name: 'Isak', points: 0 }, ut: { name: 'Salah', points: 0 }, diff: 0, netto: 0, window: null, played: false, pending: true, after5: null },
    ],
    season: { played: 1, wins: 1, hitRate: 1, hitsPaid: 1 },
    totals: { diff: 10, cost: 4, netto: 6, count: 2, skipped: 0 },
    bestIndex: null,
    worstIndex: null,
    maxGw: 3,
  };
  const p = buildTransferCommentPrompt(analysis, {
    baseline: { simTotal: 100, actualTotal: 106, diff: 6 },
  });
  assert.match(p, /netto 6 poeng/);
  assert.match(p, /Watkins ut, Haaland inn/);
  assert.ok(!p.includes('Isak'), 'pending bytter skal aldri med i grunnlaget');
  assert.match(p, /Laget uten bytter: 100/);
  assert.match(p, /REGLER/);
  assert.match(p, /120 ord/);
});
