import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sendDecision,
  chunkDiscordText,
  reportDecision,
  dataReportText,
  getLeagueReport,
  _send,
  _checkReport,
  _checkDeadline,
  _setHooks,
  _reset,
  _initState,
} from '../src/services/notify.js';
import { clear } from '../src/services/cache.js';

const H = 60 * 60_000;
const CHECK = 6 * H;
// Deadline 21. aug 2026 17:30Z, 24 t varsel → planlagt send 20. aug 17:30Z
const deadline = '2026-08-21T17:30:00Z';
const sendAt = Date.parse('2026-08-20T17:30:00Z');

test('mer enn 6 t til send-tidspunkt: vent til neste sjekk', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 10 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'wait');
});

test('innenfor sjekkintervallet: planlegg timer med riktig delay', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 2 * H);
});

test('rett etter planlagt tid: send umiddelbart (delay 0)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 5 * 60_000, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 0);
});

test('lenge etter planlagt tid: hopp over (anti-spam ved deploy)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'skip');
});

// ---- P0-2: Discord-chunking ------------------------------------------------

test('chunkDiscordText lar kort tekst stå som én chunk', () => {
  assert.deepEqual(chunkDiscordText('Rundebrief\n\nHer er kapteinsvalget.'), [
    'Rundebrief\n\nHer er kapteinsvalget.',
  ]);
});

test('chunkDiscordText lager aldri tomme chunks', () => {
  assert.deepEqual(chunkDiscordText(''), []);
  assert.deepEqual(chunkDiscordText('\n\n\n'), []);
  // Første linje er lengre enn taket: tidligere ble en tom chunk pushet først.
  const chunks = chunkDiscordText('x'.repeat(60) + '\nhale', 50);
  assert.ok(chunks.every((c) => c.length > 0), 'ingen chunk skal være tom');
});

test('chunkDiscordText hard-splitter én lang linje til biter under taket', () => {
  const line = Array.from({ length: 500 }, (_, i) => `ord${i}`).join(' ');
  assert.ok(line.length > 2400, 'testdata må være lengre enn to chunks');
  const chunks = chunkDiscordText(line, 1900);
  assert.equal(chunks.length, 2);
  for (const c of chunks) assert.ok(c.length <= 1900, `chunk på ${c.length} tegn`);
  assert.equal(chunks.join(' '), line, 'ingen tegn skal gå tapt');
});

test('chunkDiscordText splitter uten mellomrom når ordet er lengre enn taket', () => {
  const chunks = chunkDiscordText('a'.repeat(120), 50);
  assert.deepEqual(chunks, ['a'.repeat(50), 'a'.repeat(50), 'a'.repeat(20)]);
});

test('chunkDiscordText deler på linjeskift og beholder innholdet', () => {
  const text = Array.from({ length: 40 }, (_, i) => `linje ${i} `.repeat(6)).join('\n');
  const chunks = chunkDiscordText(text, 300);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 300);
  assert.equal(chunks.join('\n'), text);
});

// ---- P1-5: kortere dublett-vindu etter redeploy -----------------------------

test('inntil 15 min etter planlagt tid: send fortsatt, og marker hvor sent', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 14 * 60_000, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 0);
  assert.equal(d.lateMs, 14 * 60_000);
});

test('mer enn 15 min etter planlagt tid: hopp over', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 16 * 60_000, checkIntervalMs: CHECK });
  assert.equal(d.action, 'skip');
});

test('før planlagt tid er lateMs 0', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.lateMs, 0);
});

// ---- P1-6: to samtidige sendinger skal gi én Discord-post -------------------

test('send poster bare én gang når to kall overlapper', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('testen skal aldri nå nettverket');
  };
  const posts = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  _reset();
  _setHooks({
    compose: async () => {
      await gate;
      return 'brief-tekst';
    },
    post: async (text) => {
      posts.push(text);
    },
  });
  try {
    const first = _send({ id: 5, name: 'Runde 5' });
    const second = _send({ id: 5, name: 'Runde 5' });
    release();
    await Promise.all([first, second]);
    assert.deepEqual(posts, ['brief-tekst']);
  } finally {
    _reset();
    globalThis.fetch = originalFetch;
  }
});

test('send hopper over runde som allerede er sendt', async () => {
  const posts = [];
  _reset();
  _setHooks({ compose: async () => 'tekst', post: async (t) => posts.push(t) });
  try {
    await _send({ id: 7, name: 'Runde 7' });
    await _send({ id: 7, name: 'Runde 7' });
    assert.equal(posts.length, 1);
  } finally {
    _reset();
  }
});

// ---- v1.3.7: «brief sendt»-markøren overlever redeploy -------------------

test('brief-markøren leses ved oppstart og hindrer re-sending', async () => {
  const posts = [];
  _reset();
  _setHooks({
    loadState: () => 2,
    compose: async () => 'melding',
    post: async (m) => posts.push(m),
  });
  try {
    _initState();
    await _send({ id: 2, name: 'Gameweek 2' });
    assert.equal(posts.length, 0, 'runde 2 var alt sendt før omstarten');
  } finally {
    _reset();
  }
});

test('vellykket sending lagrer markøren', async () => {
  const saved = [];
  _reset();
  _setHooks({
    loadState: () => null,
    compose: async () => 'melding',
    post: async () => {},
    saveState: (id) => saved.push(id),
  });
  try {
    _initState();
    await _send({ id: 3, name: 'Gameweek 3' });
    assert.deepEqual(saved, [3]);
  } finally {
    _reset();
  }
});

test('feil ved lagring stopper ikke sendingen', async () => {
  const posts = [];
  const originalError = console.error;
  console.error = () => {};
  _reset();
  _setHooks({
    loadState: () => null,
    compose: async () => 'melding',
    post: async (m) => posts.push(m),
    saveState: () => {
      throw new Error('disk borte');
    },
  });
  try {
    _initState();
    await _send({ id: 3, name: 'Gameweek 3' });
    assert.equal(posts.length, 1);
  } finally {
    console.error = originalError;
    _reset();
  }
});

test('en tom markør lar briefen gå ut som normalt', async () => {
  const posts = [];
  _reset();
  _setHooks({
    loadState: () => null,
    compose: async () => 'melding',
    post: async (m) => posts.push(m),
    saveState: () => {},
  });
  try {
    _initState();
    await _send({ id: 4, name: 'Gameweek 4' });
    assert.equal(posts.length, 1);
  } finally {
    _reset();
  }
});

// ---- v1.6.0: Rundens rapport (liga) --------------------------------------

const reportEvents = (overrides = {}) => [
  { id: 1, name: 'Runde 1', finished: true, data_checked: true, ...overrides[1] },
  { id: 2, name: 'Runde 2', finished: false, data_checked: false, ...overrides[2] },
];

test('reportDecision: ingen ferdig og data_checked runde gir none', () => {
  assert.equal(
    reportDecision({ events: reportEvents({ 1: { data_checked: false } }), lastReportedEvent: null }).action,
    'none',
  );
  assert.equal(reportDecision({ events: [], lastReportedEvent: null }).action, 'none');
});

test('reportDecision velger nyeste ferdige runde og hopper over alt rapportert', () => {
  const events = [
    { id: 1, name: 'Runde 1', finished: true, data_checked: true },
    { id: 2, name: 'Runde 2', finished: true, data_checked: true },
    { id: 3, name: 'Runde 3', finished: false, data_checked: false },
  ];
  const d = reportDecision({ events, lastReportedEvent: null });
  assert.equal(d.action, 'report');
  assert.equal(d.event.id, 2, 'var serveren nede i to runder rapporteres kun den nyeste');
  assert.equal(reportDecision({ events, lastReportedEvent: 2 }).action, 'none');
});

function mockBootstrapFetch(events) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /bootstrap-static\/$/, `uventet URL: ${url}`);
    return { ok: true, status: 200, json: async () => ({ events }) };
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

// ---- v1.9.0: deadline-sjekken («Lagsjekk») ------------------------------------

test('sendDecision godtar egen maxLateMs', () => {
  const sendAt3 = Date.parse(deadline) - 3 * H;
  const late = sendDecision({ deadlineTime: deadline, hoursBefore: 3, nowMs: sendAt3 + 60 * 60_000, checkIntervalMs: CHECK });
  assert.equal(late.action, 'skip', 'standard: 15 min er grensen');
  const tolerant = sendDecision({
    deadlineTime: deadline, hoursBefore: 3, nowMs: sendAt3 + 60 * 60_000, checkIntervalMs: CHECK, maxLateMs: 2 * H,
  });
  assert.equal(tolerant.action, 'schedule');
  assert.equal(tolerant.delayMs, 0);
});

const checkEvents = () => [
  { id: 2, name: 'Gameweek 2', is_current: true, is_next: false, deadline_time: '2026-08-14T17:30:00Z' },
  { id: 3, name: 'Gameweek 3', is_current: false, is_next: true, deadline_time: deadline },
];
const checkAt = Date.parse(deadline) - 3 * H;

async function runCheck({ nowMs, compose, loadCheck = () => null }) {
  const restoreFetch = mockBootstrapFetch(checkEvents());
  const posts = [];
  const saved = [];
  let composed = 0;
  _reset();
  clear();
  _setHooks({
    webhook: true,
    now: () => nowMs,
    loadCheck,
    saveCheck: (id) => saved.push(id),
    checkCompose: async () => { composed += 1; return compose(); },
    post: async (t) => posts.push(t),
  });
  try {
    _initState();
    await _checkDeadline();
    return { posts, saved, composed: () => composed };
  } finally {
    _reset();
    restoreFetch();
  }
}

const funn = () => ({
  gw: 3, gwName: 'Runde 3', deadline, basis: 'laget fra runde 2 + byttene dine for runde 3', ok: false,
  findings: [{ type: 'ute', player: { id: 1, name: 'Saka', teamShort: 'ARS', teamCode: 3 }, detail: 'Skadet' }],
  footer: { freeTransfers: 1, transfersMade: 0, activeChip: null },
});
const rent = () => ({ ...funn(), ok: true, findings: [] });

test('checkDeadline poster kun ved funn og lagrer markøren uansett', async () => {
  const med = await runCheck({ nowMs: checkAt + 60_000, compose: funn });
  assert.equal(med.posts.length, 1);
  assert.ok(med.posts[0].includes('**Lagsjekk — Runde 3**'), med.posts[0]);
  assert.ok(med.posts[0].includes('- Saka (ARS) er Skadet'));
  assert.deepEqual(med.saved, [3]);

  const uten = await runCheck({ nowMs: checkAt + 60_000, compose: rent });
  assert.equal(uten.posts.length, 0, 'ren tropp skal ikke poste');
  assert.deepEqual(uten.saved, [3], 'markøren lagres likevel');
});

test('checkDeadline hopper over runde som alt er sjekket', async () => {
  const r = await runCheck({ nowMs: checkAt + 60_000, compose: funn, loadCheck: () => 3 });
  assert.equal(r.composed(), 0, 'grunnlaget skal ikke hentes');
  assert.equal(r.posts.length, 0);
  assert.deepEqual(r.saved, []);
});

test('checkDeadline kjører sent etter omstart men aldri etter deadline − 15 min', async () => {
  // 2 t etter planlagt tid (1 t før deadline): fortsatt nyttig — kjør.
  const sen = await runCheck({ nowMs: checkAt + 2 * H, compose: funn });
  assert.equal(sen.posts.length, 1);
  // 10 min før deadline: for sent — hopp over, men marker runden.
  const forSent = await runCheck({ nowMs: Date.parse(deadline) - 10 * 60_000, compose: funn });
  assert.equal(forSent.composed(), 0);
  assert.equal(forSent.posts.length, 0);
  assert.deepEqual(forSent.saved, [3]);
});

test('checkReport poster en gang og lagrer markor + tekst', async () => {
  const restoreFetch = mockBootstrapFetch(reportEvents());
  const posts = [];
  const saved = [];
  _reset();
  clear();
  _setHooks({
    leagues: async () => [99],
    webhook: true,
    reportCompose: async (event) => ({ text: `rapport for ${event.name}`, source: 'ai' }),
    post: async (t) => posts.push(t),
    saveReport: (state) => saved.push(state),
  });
  try {
    await _checkReport();
    await _checkReport(); // markoren stopper nummer to
    assert.equal(posts.length, 1);
    assert.ok(posts[0].includes('rapport for Runde 1'));
    assert.ok(posts[0].includes('Rundens rapport'));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].lastReportedEvent, 1);
    assert.equal(saved[0].source, 'ai');
    assert.equal(getLeagueReport().text, 'rapport for Runde 1');
  } finally {
    _reset();
    restoreFetch();
  }
});

test('checkReport uten webhook genererer og lagrer, men poster aldri', async () => {
  const restoreFetch = mockBootstrapFetch(reportEvents());
  const posts = [];
  const saved = [];
  _reset();
  clear();
  _setHooks({
    leagues: async () => [99],
    webhook: false,
    reportCompose: async () => ({ text: 'kun web', source: 'data' }),
    post: async (t) => posts.push(t),
    saveReport: (state) => saved.push(state),
  });
  try {
    await _checkReport();
    assert.equal(posts.length, 0, 'aldri Discord-post uten webhook');
    assert.equal(saved.length, 1, 'webvisningen lagres likevel');
    assert.equal(getLeagueReport().source, 'data');
  } finally {
    _reset();
    restoreFetch();
  }
});

test('feilet Discord-post lagrer ikke markoren - neste tikk prover igjen', async () => {
  const restoreFetch = mockBootstrapFetch(reportEvents());
  const posts = [];
  const saved = [];
  let failFirst = true;
  _reset();
  clear();
  _setHooks({
    leagues: async () => [99],
    webhook: true,
    reportCompose: async () => ({ text: 'rapport', source: 'ai' }),
    post: async (t) => {
      if (failFirst) {
        failFirst = false;
        throw new Error('Discord svarte 500');
      }
      posts.push(t);
    },
    saveReport: (state) => saved.push(state),
  });
  try {
    await _checkReport(); // feiler - ingen markor
    assert.equal(saved.length, 0);
    await _checkReport(); // retry lykkes
    assert.equal(posts.length, 1);
    assert.equal(saved.length, 1);
  } finally {
    _reset();
    restoreFetch();
  }
});

test('to overlappende checkReport-kall poster bare en gang', async () => {
  const restoreFetch = mockBootstrapFetch(reportEvents());
  const posts = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  _reset();
  clear();
  _setHooks({
    leagues: async () => [99],
    webhook: true,
    reportCompose: async () => {
      await gate;
      return { text: 'rapport', source: 'ai' };
    },
    post: async (t) => posts.push(t),
    saveReport: () => {},
  });
  try {
    const first = _checkReport();
    const second = _checkReport();
    release();
    await Promise.all([first, second]);
    assert.equal(posts.length, 1);
  } finally {
    _reset();
    restoreFetch();
  }
});

test('rapportmarkoren leses ved oppstart og getLeagueReport gir teksten (redeploy)', async () => {
  const restoreFetch = mockBootstrapFetch(reportEvents());
  const posts = [];
  _reset();
  clear();
  _setHooks({
    leagues: async () => [99],
    loadReport: () => ({ lastReportedEvent: 1, text: 'gammel rapport', generatedAt: '2026-08-27T10:00:00Z', source: 'ai' }),
    webhook: true,
    reportCompose: async () => ({ text: 'ny rapport', source: 'ai' }),
    post: async (t) => posts.push(t),
    saveReport: () => {},
  });
  try {
    _initState();
    assert.equal(getLeagueReport().text, 'gammel rapport');
    await _checkReport();
    assert.equal(posts.length, 0, 'runde 1 var alt rapportert for omstarten');
  } finally {
    _reset();
    restoreFetch();
  }
});

test('dataReportText nevner vinner, taper og min plassering', () => {
  const text = dataReportText({
    event: { id: 2, name: 'Runde 2' },
    league: { name: 'Testligaen', size: 3 },
    winner: { entryName: 'Nykommer FC', playerName: 'Ny N.', eventTotal: 71 },
    loser: { entryName: 'Rival FC', playerName: 'Rival R.', eventTotal: 42 },
    movers: [],
    table: [],
    mine: { entryName: 'Marius XI', rank: 1, lastRank: 3, eventTotal: 60, total: 100, captain: { name: 'Haaland', points: 12, lost: 0, tc: false } },
    captains: [],
  });

  assert.ok(text.includes('Nykommer FC'));
  assert.ok(text.includes('Rival FC'));
  assert.ok(text.includes('1.'), 'min plassering mangler');
  assert.ok(text.includes('Haaland'));
});
