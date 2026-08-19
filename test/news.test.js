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
