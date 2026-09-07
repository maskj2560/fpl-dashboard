// Ren kostnadsmodell for `/health → aiStats` (sjekkpunkt D, v1.15.0).
// Importerer INGENTING — brukes av scripts/ai-kostnad.mjs og testene.
// Priser per 1M tokens, live-verifisert 7. sep 2026 mot platform.claude.com
// (models-overview) og claude.com/pricing: ingen intro-/kampanjepris, ingen
// datert prisendring. Oppdater PRICES_VERIFIED når prisene sjekkes på nytt.

export const PRICES_VERIFIED = '2026-09-07';
export const PRICES = Object.freeze({
  'claude-sonnet-5': Object.freeze({ input: 2, output: 10 }),
  'claude-haiku-4-5': Object.freeze({ input: 1, output: 5 }),
});
// Planens terskler i $/uke: under `watch` = ingen tiltak, `watch`–`switch` =
// se hvilken funksjon som drar, over `switch` = bytt AI_MODEL til Haiku.
export const THRESHOLDS = Object.freeze({ watch: 1, switch: 4 });
// Oppstartstikket i refresh.js genererer brief + nyheter + overgangskommentar
// når cachen er kald — før v1.15.0 gjaldt det hver restart.
export const CALLS_PER_RESTART = 3;

const DEFAULT_MODEL = 'claude-sonnet-5';
const DAY_MS = 24 * 60 * 60_000;
const MIN_DAYS = 1 / 24; // since = nå skal ikke gi deling på null

const LABELS = [
  ['ai-brief-', 'AI-brief (/brief + auto-brief)'],
  ['news-summary', 'Nyhetsoppsummering (/nyheter)'],
  ['transfer-comment:', 'Overgangskommentar (/overganger)'],
  ['ai-rad-', 'AI-rådgiver (/lag)'],
  ['league-report:', 'Rundens rapport (/liga + Discord)'],
];

/** cacheKey → AI-funksjonen slik CLAUDE.md navngir dem. */
export function labelFor(key) {
  const hit = LABELS.find(([prefix]) => key.startsWith(prefix));
  return hit ? hit[1] : `ukjent (${key})`;
}

const costOf = (inputTokens, outputTokens, price) =>
  (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output;

const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);

/**
 * Summerer aiStats (fra ai.getStats() / `/health`) til kostnad per nøkkel og
 * per funksjon, ukestakt, alternativ modell, andel ut-tokens, organisk anslag
 * (brutto minus `restarts` × CALLS_PER_RESTART) og planens verdict. null uten
 * `since` (AI av eller ingen kall ennå).
 */
export function summarizeAiCost(aiStats, { nowMs = Date.now(), restarts = 0 } = {}) {
  if (!aiStats?.since) return null;
  const sinceMs = Date.parse(aiStats.since);
  if (!Number.isFinite(sinceMs)) return null;
  const days = Math.max((nowMs - sinceMs) / DAY_MS, MIN_DAYS);

  const entries = Object.entries(aiStats.byKey ?? {});
  const model = entries.map(([, e]) => e?.model).find((m) => typeof m === 'string') ?? DEFAULT_MODEL;
  const priceAssumed = !(model in PRICES);
  const price = PRICES[model] ?? PRICES[DEFAULT_MODEL];

  const rows = entries
    .map(([key, e]) => {
      const calls = num(e?.calls);
      const inputTokens = num(e?.inputTokens);
      const outputTokens = num(e?.outputTokens);
      return {
        key,
        label: labelFor(key),
        calls,
        inputTokens,
        outputTokens,
        failures: num(e?.failures),
        cost: costOf(inputTokens, outputTokens, price),
        avgIn: calls ? Math.round(inputTokens / calls) : 0,
        avgOut: calls ? Math.round(outputTokens / calls) : 0,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const perFunction = new Map();
  const totals = { calls: 0, inputTokens: 0, outputTokens: 0, failures: 0, cost: 0 };
  for (const r of rows) {
    const f = perFunction.get(r.label) ?? { label: r.label, calls: 0, inputTokens: 0, outputTokens: 0, failures: 0, cost: 0 };
    for (const k of ['calls', 'inputTokens', 'outputTokens', 'failures', 'cost']) {
      f[k] += r[k];
      totals[k] += r[k];
    }
    perFunction.set(r.label, f);
  }
  const byFunction = [...perFunction.values()].sort((a, b) => b.cost - a.cost);

  const perWeek = (c) => (c / days) * 7;
  const costPerWeek = perWeek(totals.cost);
  const alternatives = Object.fromEntries(
    Object.entries(PRICES).map(([m, p]) => [m, perWeek(costOf(totals.inputTokens, totals.outputTokens, p))])
  );
  const outputShare = totals.cost > 0 ? ((totals.outputTokens / 1e6) * price.output) / totals.cost : 0;

  let organic = null;
  if (restarts > 0 && totals.calls > 0) {
    const noiseCalls = Math.min(restarts * CALLS_PER_RESTART, totals.calls);
    const calls = totals.calls - noiseCalls;
    organic = { restarts, noiseCalls, calls, costPerWeek: perWeek(calls * (totals.cost / totals.calls)) };
  }

  const basis = organic ? organic.costPerWeek : costPerWeek;
  const verdict = basis > THRESHOLDS.switch ? 'switch' : basis >= THRESHOLDS.watch ? 'watch' : 'ok';

  return {
    since: aiStats.since,
    days,
    model,
    priceAssumed,
    price,
    rows,
    byFunction,
    totals,
    callsPerWeek: perWeek(totals.calls),
    costPerWeek,
    alternatives,
    outputShare,
    organic,
    verdict,
  };
}

const usd = (v, decimals = 2) => `$${v.toFixed(decimals).replace('.', ',')}`;
const int = (v) => Math.round(v).toLocaleString('nb-NO');

const VERDICT_LINES = {
  ok: `>>> Under ${usd(THRESHOLDS.watch, 0)}/uke — ingen tiltak`,
  watch: `>>> ${usd(THRESHOLDS.watch, 0)}–${THRESHOLDS.switch}/uke — se hvilken funksjon som drar (øverst i tabellen); kortere svar er billigere enn modellbytte`,
  switch: `>>> Over ${usd(THRESHOLDS.switch, 0)}/uke — bytt AI_MODEL=claude-haiku-4-5 i Coolify (én env-endring + redeploy)`,
};

/** Tekstrapporten `npm run ai-kostnad` skriver. */
export function formatReport(s) {
  const lines = [];
  lines.push(`AI-kostnad fra /health → aiStats (siden ${s.since}, ${s.days.toFixed(2).replace('.', ',')} døgn)`);
  lines.push(
    `Modell: ${s.model} — $${s.price.input}/1M inn, $${s.price.output}/1M ut (priser verifisert ${PRICES_VERIFIED})` +
      (s.priceAssumed ? ' — ukjent modell, regnet med Sonnet 5-priser' : '')
  );
  lines.push('');
  const w = [36, 6, 10, 9, 9];
  lines.push('Funksjon'.padEnd(w[0]) + 'kall'.padStart(w[1]) + 'inn-tok'.padStart(w[2]) + 'ut-tok'.padStart(w[3]) + 'kost'.padStart(w[4]));
  lines.push('-'.repeat(w.reduce((a, b) => a + b)));
  for (const f of s.byFunction) {
    lines.push(
      f.label.padEnd(w[0]) + int(f.calls).padStart(w[1]) + int(f.inputTokens).padStart(w[2]) + int(f.outputTokens).padStart(w[3]) + usd(f.cost, 3).padStart(w[4])
    );
  }
  lines.push('-'.repeat(w.reduce((a, b) => a + b)));
  lines.push(
    'SUM'.padEnd(w[0]) + int(s.totals.calls).padStart(w[1]) + int(s.totals.inputTokens).padStart(w[2]) + int(s.totals.outputTokens).padStart(w[3]) + usd(s.totals.cost, 3).padStart(w[4])
  );
  if (s.totals.failures > 0) lines.push(`Feilede kall: ${s.totals.failures}`);
  lines.push('');
  lines.push(`Ukestakt: ${Math.round(s.callsPerWeek)} kall, ${usd(s.costPerWeek)}/uke (ut-tokens = ${Math.round(s.outputShare * 100)} % av kostnaden)`);
  for (const [m, c] of Object.entries(s.alternatives)) {
    if (m !== s.model) lines.push(`Med AI_MODEL=${m}: ${usd(c)}/uke`);
  }
  if (s.organic) {
    const o = s.organic;
    lines.push(
      `Deploystøy: ${o.restarts} restarts × ${CALLS_PER_RESTART} kall = ${o.noiseCalls} av ${s.totals.calls} → organisk ${o.calls} kall (${Math.round((o.calls / s.days) * 7)}/uke), ${usd(o.costPerWeek)}/uke`
    );
  }
  lines.push('');
  lines.push(`Terskler: under ${usd(THRESHOLDS.watch, 0)}/uke = ingen tiltak | ${usd(THRESHOLDS.watch, 0)}–${THRESHOLDS.switch} = se hvilken funksjon som drar | over ${usd(THRESHOLDS.switch, 0)} = bytt til haiku`);
  lines.push(VERDICT_LINES[s.verdict]);
  return lines.join('\n');
}
