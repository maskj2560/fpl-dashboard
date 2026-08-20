import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewsPrompt,
  summaryPoints,
  dedupeNewsItems,
  filterSummaryPoints,
  properNames,
  parseFeedItems,
} from '../src/services/news.js';

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

// ---- P1-6: duplikater fra RSS ---------------------------------------------

test('dedupeNewsItems fjerner samme lenke med ulike sporingsparametre', () => {
  const items = [
    { title: 'Haaland ute', link: 'https://a.no/sak?utm_source=rss&at_medium=rss', description: '' },
    { title: 'Haaland ute igjen', link: 'https://a.no/sak/#kommentarer', description: '' },
    { title: 'Annen sak', link: 'https://a.no/annen', description: '' },
  ];

  const ut = dedupeNewsItems(items);

  assert.equal(ut.length, 2);
  assert.equal(ut[0].title, 'Haaland ute');
  assert.equal(ut[1].title, 'Annen sak');
});

test('dedupeNewsItems fjerner samme tittel fra to ulike feeder', () => {
  const items = [
    { title: 'Salah scoret hat trick', link: 'https://bbc.co.uk/1', description: '' },
    { title: '  salah  scoret   HAT TRICK ', link: 'https://skysports.com/2', description: '' },
  ];

  assert.deepEqual(dedupeNewsItems(items).map((i) => i.link), ['https://bbc.co.uk/1']);
});

test('dedupeNewsItems beholder rekkefølgen og dermed nyeste sak først', () => {
  const items = [
    { title: 'A', link: 'https://x.no/a', description: '' },
    { title: 'B', link: 'https://x.no/b', description: '' },
    { title: 'A', link: 'https://x.no/a', description: '' },
  ];

  assert.deepEqual(dedupeNewsItems(items).map((i) => i.title), ['A', 'B']);
});

// ---- P1-5: AI-punkter uten kilde ------------------------------------------

const items = [
  { title: 'Chelsea confirm Nkunku injury', description: 'The forward limped off at Stamford Bridge.' },
  { title: 'Arsenal beat Liverpool', description: 'Saka scored twice.' },
];

test('filterSummaryPoints beholder punkter som deler egennavn med sakene', () => {
  const points = ['**Nkunku** er skadet for Chelsea', '**Saka** scoret to mot Liverpool'];

  assert.deepEqual(filterSummaryPoints(points, items), points);
});

test('filterSummaryPoints forkaster punkter med navn som ikke står i sakene', () => {
  const points = [
    '**Saka** scoret to mot Liverpool',
    '**Mudryk** er solgt til Bayern for 40 millioner',
  ];

  assert.deepEqual(filterSummaryPoints(points, items), ['**Saka** scoret to mot Liverpool']);
});

test('filterSummaryPoints forkaster punkter helt uten egennavn', () => {
  assert.deepEqual(filterSummaryPoints(['Flere spillere er ute med skade'], items), []);
});

test('filterSummaryPoints lar punktene stå når det ikke finnes saker å måle mot', () => {
  const points = ['**Mudryk** til Bayern'];

  assert.deepEqual(filterSummaryPoints(points, []), points);
});

test('properNames finner både fete navn og ord med stor forbokstav', () => {
  const navn = properNames('**Nkunku** er ute for Chelsea. Han rekker ikke Arsenal.');

  assert.ok(navn.includes('Nkunku'));
  assert.ok(navn.includes('Chelsea'));
  assert.ok(navn.includes('Arsenal'));
  assert.ok(!navn.includes('Han'), 'vanlig setningsstart ble tolket som egennavn');
});

test('buildNewsPrompt forbyr detaljer som ikke står i sakene', () => {
  const prompt = buildNewsPrompt(items);

  assert.match(prompt, /Bruk kun personer, klubber og hendelser som står i sakene/);
  assert.match(prompt, /ingen overgangstype, beløp, kontraktslengde/);
});

// ---- P0-4: ugyldig pubDate skal ikke velte hele feeden ---------------------

test('parseFeedItems beholder saken når pubDate ikke lar seg tolke', () => {
  const items = parseFeedItems(
    {
      title: 'BBC Sport',
      item: [
        { title: 'Gyldig', link: 'https://a', pubDate: 'Wed, 20 Aug 2025 10:00:00 GMT' },
        { title: 'Rar dato', link: 'https://b', pubDate: 'ikke en dato' },
      ],
    },
    'https://feed',
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].published, '2025-08-20T10:00:00.000Z');
  assert.equal(items[1].published, null);
  assert.equal(items[1].title, 'Rar dato');
});

test('parseFeedItems takler manglende pubDate og enkeltstående item', () => {
  const items = parseFeedItems({ title: 'Sky', item: { title: 'Alene', link: 'https://c' } }, 'https://feed');
  assert.deepEqual(items.map((i) => [i.title, i.published, i.source]), [['Alene', null, 'Sky']]);
  assert.deepEqual(parseFeedItems(null, 'https://feed'), []);
});
