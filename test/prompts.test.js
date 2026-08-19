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
