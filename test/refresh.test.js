import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { refreshDecision, startAiRefresher, _tick, _setNow, _reset } from '../src/services/refresh.js';
import * as ai from '../src/services/ai.js';
import { briefCacheKey } from '../src/services/brief.js';
import { transferCommentCacheKey } from '../src/services/transfers.js';
import { clear as cacheClear } from '../src/services/cache.js';

// v1.13.0/v1.15.0: verken AI-statistikken eller AI-cachen rører ekte DATA_DIR i tester.
const diskOff = () => ai._setHooks({ load: () => null, save: () => {} });
diskOff();

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = Date.UTC(2026, 7, 25, 12, 0, 0);

// --- Den rene beslutningen ---------------------------------------------------

test('nyhetene friskes opp når de aldri er laget', () => {
  const d = refreshDecision({ nowMs: NOW, hasUpcoming: true, briefGeneratedAt: NOW });
  assert.equal(d.news, true);
});

test('nyhetene friskes opp hver 6. time, ikke oftere', () => {
  const base = { nowMs: NOW, hasUpcoming: true, briefGeneratedAt: NOW };
  assert.equal(refreshDecision({ ...base, newsGeneratedAt: NOW - 5 * HOUR }).news, false);
  assert.equal(refreshDecision({ ...base, newsGeneratedAt: NOW - 6 * HOUR }).news, true);
});

test('briefen friskes aldri opp etter siste runde', () => {
  const d = refreshDecision({ nowMs: NOW, hasUpcoming: false, briefGeneratedAt: null });
  assert.equal(d.brief, false, 'sesongslutt skal ikke koste ett kall i døgnet');
});

test('briefen friskes opp når den aldri er laget (kald cache etter deploy)', () => {
  const d = refreshDecision({
    nowMs: NOW,
    hasUpcoming: true,
    deadlineTime: new Date(NOW + 5 * 24 * HOUR).toISOString(),
  });
  assert.equal(d.brief, true);
});

test('briefen friskes opp én gang i døgnet utenfor deadlinevinduet', () => {
  const base = {
    nowMs: NOW,
    hasUpcoming: true,
    deadlineTime: new Date(NOW + 5 * 24 * HOUR).toISOString(),
  };
  assert.equal(refreshDecision({ ...base, briefGeneratedAt: NOW - 23 * HOUR }).brief, false);
  assert.equal(refreshDecision({ ...base, briefGeneratedAt: NOW - 24 * HOUR }).brief, true);
});

test('briefen friskes opp i hele 6-timersvinduet før deadline', () => {
  const inWindow = (hoursToDeadline) =>
    refreshDecision({
      nowMs: NOW,
      hasUpcoming: true,
      briefGeneratedAt: NOW - 5 * MIN, // helt fersk
      deadlineTime: new Date(NOW + hoursToDeadline * HOUR).toISOString(),
    }).brief;
  assert.equal(inWindow(7), false, 'utenfor vinduet gjelder døgnregelen');
  assert.equal(inWindow(6), true);
  assert.equal(inWindow(1), true);
  // 60-minutters-gulvet i ai.js hindrer at 30-minutters-tikken dobler kallene.
});

test('en passert deadline faller tilbake til døgnregelen', () => {
  const base = {
    nowMs: NOW,
    hasUpcoming: true,
    deadlineTime: new Date(NOW - 2 * HOUR).toISOString(), // kampene er i gang
  };
  assert.equal(refreshDecision({ ...base, briefGeneratedAt: NOW - 2 * HOUR }).brief, false);
  assert.equal(refreshDecision({ ...base, briefGeneratedAt: NOW - 25 * HOUR }).brief, true);
});

// --- Tikken ------------------------------------------------------------------

const BOOTSTRAP = {
  events: [
    {
      id: 2,
      name: 'Gameweek 2',
      is_next: true,
      finished: false,
      deadline_time: new Date(NOW + 5 * 24 * HOUR).toISOString(),
    },
  ],
  teams: [],
  elements: [],
};

const originalFetch = globalThis.fetch;
const quiet = { log: console.log, warn: console.warn, error: console.error };
let aiCalls;

function stubEnv() {
  aiCalls = [];
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.includes('bootstrap-static')) {
      return { ok: true, status: 200, json: async () => BOOTSTRAP };
    }
    if (path.includes('/fixtures/')) return { ok: true, status: 200, json: async () => [] };
    if (path.includes('/picks/')) return { ok: false, status: 404, json: async () => ({}) };
    // Nyhetsfeeden: én sak, nok til at oppsummeringen har noe å jobbe med.
    return {
      ok: true,
      status: 200,
      text: async () =>
        '<?xml version="1.0"?><rss><channel><title>Test</title><item><title>Haaland ute</title><link>https://eksempel.no/1</link><description>d</description></item></channel></rss>',
    };
  };
  ai._setClient({
    messages: {
      create: async () => {
        aiCalls.push(Date.now());
        return { model: 'fake', usage: {}, content: [{ type: 'text', text: '- **Haaland** er ute.' }] };
      },
    },
  });
}

beforeEach(() => {
  cacheClear();
  ai._reset();
  _reset();
  _setNow(() => NOW);
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  stubEnv();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  ai._setClient(null);
  ai._setNow(null);
  ai._reset();
  diskOff();
  _reset();
  _setNow(null);
  cacheClear();
  cacheClear();
  console.log = quiet.log;
  console.warn = quiet.warn;
  console.error = quiet.error;
});

test('_tick varmer begge tekstene når cachen er tom', async () => {
  await _tick();
  assert.equal(aiCalls.length, 2, 'én brief + én nyhetsoppsummering');
});

test('to tikk etter hverandre gir én generering per nøkkel', async () => {
  await _tick();
  await _tick();
  await ai._flush();
  assert.equal(aiCalls.length, 2, 'ingenting er utgått ved andre tikk');
});

// Oppstartsvarmingen er poenget med det første tikket: etter en deploy er
// AI-cachen enten lastet fra disk (samme versjon, v1.15.0) eller tom — tikket
// avgjør hva som faktisk må genereres. (At startAiRefresher er en no-op uten
// nøkkel kan ikke testes her — `npm test` kjøres med utviklerens `.env`, der
// nøkkelen finnes. Røyktesten med tomme nøkler dekker det.)
test('startAiRefresher varmer begge tekstene med en gang når cachen er tom', async () => {
  startAiRefresher();
  for (let i = 0; i < 100 && aiCalls.length < 2; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.equal(aiCalls.length, 2, 'ett tikk kjøres ved oppstart, ikke først etter 30 min');
});

// v1.15.0: hver restart kostet tre betalte kall fordi cachen bare bodde i
// minnet. Med ferske tekster på disk (samme appVersion) koster tikket ingenting.
test('persistert fersk cache gir 0 kall ved oppstartstikket', async () => {
  const fresh = (text) => ({ text, generatedAt: NOW - 5 * MIN });
  ai._setHooks({
    load: () => null,
    save: () => {},
    loadCache: () => ({
      entries: {
        [briefCacheKey({ gameweek: { id: 2 } })]: fresh('brief fra disk'),
        'news-summary': fresh('- **Haaland** er ute.'),
        [transferCommentCacheKey()]: fresh('kommentar fra disk'),
      },
    }),
  });
  await _tick();
  await ai._flush();
  assert.equal(aiCalls.length, 0, 'ingenting er utgått — deployen kostet 0 kall');
  assert.equal(ai.getCached('news-summary').text, '- **Haaland** er ute.');
});

test('overgangskommentaren friskes opp én gang i døgnet, aldri etter sesongslutt', () => {
  const base = { nowMs: NOW, hasUpcoming: true, briefGeneratedAt: NOW, newsGeneratedAt: NOW };
  assert.equal(refreshDecision({ ...base, transferGeneratedAt: NOW - 23 * HOUR }).transferComment, false);
  assert.equal(refreshDecision({ ...base, transferGeneratedAt: NOW - 24 * HOUR }).transferComment, true);
  assert.equal(refreshDecision({ ...base }).transferComment, true, 'kald cache etter deploy');
  assert.equal(refreshDecision({ nowMs: NOW, hasUpcoming: false }).transferComment, false);
});

test('_tick overlever at overgangskommentaren feiler', async () => {
  // Stubben mangler transfers-endepunktet — kommentar-forsøket feiler stille,
  // og brief + nyheter genereres som før.
  await _tick();
  assert.equal(aiCalls.length, 2);
});

test('_tick kaster ikke når FPL-kallet feiler', async () => {
  globalThis.fetch = async () => {
    throw new Error('nede');
  };
  await _tick();
  assert.equal(aiCalls.length, 0);
});
