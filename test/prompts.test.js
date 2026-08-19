import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefPrompt, buildAdvicePrompt, sanitizeBriefText } from '../src/services/prompts.js';

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

// ---- P1-4: tidsfakta og etterkontroll ----------------------------------
// Modellen påsto at kamper ble spilt før deadline når de faktisk lå etter.
// Fasiten beregnes nå i briefen, sendes med i prompten, og påstander som
// motsier den fjernes fra teksten før den vises.

const briefMedTidsfakta = {
  gameweek: { id: 1, name: 'Gameweek 1', deadlineFormatted: 'fredag 21. august kl. 19:30' },
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
    fixturesByDay: [
      {
        day: 'fredag 21. august',
        matches: [{ home: 'Liverpool', away: 'Bournemouth', kickoff: '21:00', beforeDeadline: false }],
      },
    ],
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
