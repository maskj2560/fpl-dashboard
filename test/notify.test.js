import test from 'node:test';
import assert from 'node:assert/strict';
import { sendDecision, chunkDiscordText, _send, _setHooks, _reset } from '../src/services/notify.js';

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
