import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRICES,
  THRESHOLDS,
  CALLS_PER_RESTART,
  labelFor,
  summarizeAiCost,
  formatReport,
} from '../src/services/aiCost.js';

// v1.15.0: ren kostnadsmodell for `/health → aiStats` (sjekkpunkt D). Fixturen
// er prod-svaret 7. sep 2026 12:00Z — samme tall som i docs/sjekkpunkt-d-kostnad.md,
// så tabellen der kan gjenskapes med `npm run ai-kostnad`.

const NOW = Date.UTC(2026, 8, 7, 12, 0, 0);

const PROD = {
  since: '2026-09-02T18:59:20.694Z',
  totals: { calls: 52, inputTokens: 65906, outputTokens: 37857, failures: 0 },
  byKey: {
    'ai-brief-gw3': { calls: 14, inputTokens: 19012, outputTokens: 13038, failures: 0, lastAt: '2026-09-04T16:01:23.158Z', model: 'claude-sonnet-5' },
    'news-summary': { calls: 27, inputTokens: 35887, outputTokens: 17676, failures: 0, lastAt: '2026-09-07T11:40:08.091Z', model: 'claude-sonnet-5' },
    'ai-brief-gw4': { calls: 5, inputTokens: 6428, outputTokens: 4166, failures: 0, lastAt: '2026-09-07T11:39:53.803Z', model: 'claude-sonnet-5' },
    'transfer-comment:5330646': { calls: 5, inputTokens: 2512, outputTokens: 1520, failures: 0, lastAt: '2026-09-07T11:40:16.596Z', model: 'claude-sonnet-5' },
    'ai-rad-5330646-gw4': { calls: 1, inputTokens: 2067, outputTokens: 1457, failures: 0, lastAt: '2026-09-07T11:55:44.631Z', model: 'claude-sonnet-5' },
  },
};

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} forventet ≈ ${expected}, fikk ${actual}`);

test('prisene er de live-verifiserte per 1M tokens, tersklene $1/$4 og 3 kall per restart', () => {
  assert.deepEqual(PRICES['claude-sonnet-5'], { input: 2, output: 10 });
  assert.deepEqual(PRICES['claude-haiku-4-5'], { input: 1, output: 5 });
  assert.deepEqual(THRESHOLDS, { watch: 1, switch: 4 });
  assert.equal(CALLS_PER_RESTART, 3);
});

test('labelFor grupperer cacheKey-ene til de seks AI-funksjonene', () => {
  assert.equal(labelFor('ai-brief-gw4'), 'AI-brief (/brief + auto-brief)');
  assert.equal(labelFor('news-summary'), 'Nyhetsoppsummering (/nyheter)');
  assert.equal(labelFor('transfer-comment:5330646'), 'Overgangskommentar (/overganger)');
  assert.equal(labelFor('ai-rad-5330646-gw4'), 'AI-rådgiver (/lag)');
  assert.equal(labelFor('league-report:4'), 'Rundens rapport (/liga + Discord)');
  assert.equal(labelFor('foo'), 'ukjent (foo)');
});

test('uten aiStats eller uten since finnes det ingenting å summere', () => {
  assert.equal(summarizeAiCost(null, { nowMs: NOW }), null);
  assert.equal(summarizeAiCost({ since: null, totals: PROD.totals, byKey: {} }, { nowMs: NOW }), null);
});

test('prod-fixturen 7. sep: 4,71 døgn, $0,510 totalt, $0,76/uke på Sonnet, $0,38 på Haiku', () => {
  const s = summarizeAiCost(PROD, { nowMs: NOW });
  near(s.days, 4.71, 0.01, 'døgn');
  assert.equal(s.model, 'claude-sonnet-5');
  assert.equal(s.priceAssumed, false);
  assert.equal(s.totals.calls, 52);
  near(s.totals.cost, 0.5104, 0.001, 'totalkost');
  near(s.costPerWeek, 0.759, 0.005, 'ukeskost');
  near(s.alternatives['claude-haiku-4-5'], 0.379, 0.005, 'haiku/uke');
  near(s.outputShare, 0.742, 0.005, 'ut-andel');
  assert.equal(s.organic, null);
  assert.equal(s.verdict, 'ok');
});

test('rader sorteres på kost, og byFunction slår brief-nøklene for gw3 og gw4 sammen', () => {
  const s = summarizeAiCost(PROD, { nowMs: NOW });
  assert.equal(s.rows[0].key, 'news-summary');
  assert.equal(s.rows.at(-1).key, 'ai-rad-5330646-gw4');
  const brief = s.byFunction.find((f) => f.label === 'AI-brief (/brief + auto-brief)');
  assert.equal(brief.calls, 19);
  near(brief.cost, 0.2229, 0.001, 'brief-kost');
  assert.equal(s.byFunction[0].label, 'Nyhetsoppsummering (/nyheter)');
});

test('restarts trekker 3 kall hver fra brutto og gir et organisk ukesanslag', () => {
  const s = summarizeAiCost(PROD, { nowMs: NOW, restarts: 10 });
  assert.deepEqual({ noiseCalls: s.organic.noiseCalls, calls: s.organic.calls }, { noiseCalls: 30, calls: 22 });
  near(s.organic.costPerWeek, 0.321, 0.01, 'organisk/uke');
  assert.equal(s.verdict, 'ok');
});

test('verdict følger tersklene: $1–4/uke = watch, over $4 = switch', () => {
  const week = (outputTokens) => ({
    since: new Date(NOW - 7 * 24 * 60 * 60_000).toISOString(),
    totals: { calls: 1, inputTokens: 0, outputTokens, failures: 0 },
    byKey: { 'news-summary': { calls: 1, inputTokens: 0, outputTokens, failures: 0, lastAt: null, model: 'claude-sonnet-5' } },
  });
  assert.equal(summarizeAiCost(week(50_000), { nowMs: NOW }).verdict, 'ok'); // $0,50
  assert.equal(summarizeAiCost(week(200_000), { nowMs: NOW }).verdict, 'watch'); // $2,00
  assert.equal(summarizeAiCost(week(500_000), { nowMs: NOW }).verdict, 'switch'); // $5,00
});

test('ukjent modell regnes med Sonnet-priser og flagges; since = nå gir minst én time', () => {
  const stats = {
    since: new Date(NOW).toISOString(),
    totals: { calls: 1, inputTokens: 1_000_000, outputTokens: 0, failures: 0 },
    byKey: { 'news-summary': { calls: 1, inputTokens: 1_000_000, outputTokens: 0, failures: 0, lastAt: null, model: 'claude-x' } },
  };
  const s = summarizeAiCost(stats, { nowMs: NOW });
  assert.equal(s.priceAssumed, true);
  near(s.totals.cost, 2, 0.0001, 'sonnet-inn');
  near(s.days, 1 / 24, 0.0001, 'gulv');
});

test('formatReport skriver ukeskost med norsk komma og planens verdict', () => {
  const text = formatReport(summarizeAiCost(PROD, { nowMs: NOW, restarts: 10 }));
  assert.match(text, /Nyhetsoppsummering/);
  assert.match(text, /\$0,76\/uke/);
  assert.match(text, /organisk/i);
  assert.match(text, /ingen tiltak/i);
});
