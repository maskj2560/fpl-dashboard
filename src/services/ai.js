// Felles Claude API-service. Brukes av nyheter, AI-brief og transfer-rådgiver.
// Kostnadsdisiplin: hard cache med minimumsintervall per nøkkel + in-flight dedup.
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const store = new Map(); // cacheKey -> {text, generatedAt}
const inFlight = new Map();
const lastFailureAt = new Map(); // cacheKey -> tidspunkt for siste mislykkede kall
// Feiler kallet (ugyldig nøkkel, tom kreditt, avkortet svar), ventes det så
// lenge før neste forsøk. Uten dette fyrer hvert sidebesøk et nytt betalt kall.
const FAILURE_BACKOFF_MS = 5 * 60_000;
let client = null;
let injectedClient = null; // kun satt av tester via _setClient
let now = () => Date.now();

// AI-statistikk (v1.13.0): teller per cacheKey, persistert i DATA_DIR/ai-stats.json
// så tallene overlever deploy (Coolify-loggen er 100 linjer og nullstilles).
// Leses lazy ved første bruk; getStats() er synkron og leser aldri disk per
// kall (Docker-healthchecken poller /health hvert 30. sekund). En diskfeil
// velter aldri en generering. Aldri Discord, aldri nye AI-kall.
const STATS_VERSION = 1;
// Kun tester (_setHooks). `active` = en test har koblet fra disken: da brukes
// hook-funksjonene (eller ingenting) for BÅDE stats- og cache-fila.
const hooks = { active: false, load: null, save: null, loadCache: null, saveCache: null };
let stats = null; // { since, byKey } — null = ikke lest ennå

// AI-cache (v1.15.0): tekstene persisteres i DATA_DIR/ai-cache.json så en
// restart ikke koster tre betalte kall (brief + nyheter + overgangskommentar
// fra oppstartstikket i refresh.js — 24–36 av 52 kall i sjekkpunkt D-målingen
// 7. sep 2026 var deploystøy). Fila merkes med appens versjon: en annen
// versjon kan ha andre prompter og forkastes. Leses lazy ved første
// getCached/generate (kun med AI på), skrives etter hver vellykkede
// generering. En diskfeil velter aldri en generering.
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60_000; // rydder ai-rad-*/ai-brief-gw* fra gamle runder
let storeLoaded = false;

const emptyEntry = () => ({ calls: 0, inputTokens: 0, outputTokens: 0, failures: 0, lastAt: null, model: null });
const toCount = (v) => (Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0);

export function statsFile() {
  return path.join(config.dataDir, 'ai-stats.json');
}

/** Leser ai-stats.json-innhold. null ved ugyldig JSON, feil versjon eller manglende byKey. */
export function parseStatsFile(text) {
  try {
    const raw = JSON.parse(text);
    if (raw?.version !== STATS_VERSION || !raw.byKey || typeof raw.byKey !== 'object') return null;
    const byKey = {};
    for (const [key, e] of Object.entries(raw.byKey)) {
      byKey[key] = {
        calls: toCount(e?.calls),
        inputTokens: toCount(e?.inputTokens),
        outputTokens: toCount(e?.outputTokens),
        failures: toCount(e?.failures),
        lastAt: typeof e?.lastAt === 'string' ? e.lastAt : null,
        model: typeof e?.model === 'string' ? e.model : null,
      };
    }
    return { since: typeof raw.since === 'string' ? raw.since : null, byKey };
  } catch {
    return null;
  }
}

function readStatsFile() {
  try {
    return parseStatsFile(fs.readFileSync(statsFile(), 'utf8'));
  } catch {
    return null;
  }
}

function writeStatsFile(file) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(statsFile(), JSON.stringify(file));
}

export function cacheFile() {
  return path.join(config.dataDir, 'ai-cache.json');
}

/**
 * Leser ai-cache.json-innhold → { entries } eller null (ugyldig JSON, feil
 * version, annen appVersion, manglende entries). Entries uten tekst, med
 * tidsstempel i framtida eller eldre enn CACHE_MAX_AGE_MS droppes.
 */
export function parseCacheFile(text, { appVersion, nowMs }) {
  try {
    const raw = JSON.parse(text);
    if (raw?.version !== CACHE_VERSION || raw.appVersion !== appVersion) return null;
    if (!raw.entries || typeof raw.entries !== 'object') return null;
    const entries = {};
    for (const [key, e] of Object.entries(raw.entries)) {
      const entryText = typeof e?.text === 'string' ? e.text.trim() : '';
      const at = e?.generatedAt;
      if (!entryText || !Number.isFinite(at) || at > nowMs || nowMs - at > CACHE_MAX_AGE_MS) continue;
      entries[key] = { text: entryText, generatedAt: at };
    }
    return { entries };
  } catch {
    return null;
  }
}

function readCacheFile() {
  try {
    const text = fs.readFileSync(cacheFile(), 'utf8');
    return parseCacheFile(text, { appVersion: config.version, nowMs: now() });
  } catch {
    return null;
  }
}

function writeCacheFile(file) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(cacheFile(), JSON.stringify(file));
}

const noop = () => null;

/** Fyller `store` fra disk én gang per prosess — kun med AI på, aldri via en rute uten AI. */
function ensureStore() {
  if (storeLoaded || !isEnabled()) return;
  storeLoaded = true;
  let loaded = null;
  try {
    loaded = (hooks.active ? (hooks.loadCache ?? noop) : readCacheFile)();
  } catch (err) {
    console.error('AI-cache: klarte ikke å lese ai-cache.json:', err.message);
  }
  let n = 0;
  for (const [key, entry] of Object.entries(loaded?.entries ?? {})) {
    if (store.has(key)) continue;
    store.set(key, entry);
    n += 1;
  }
  if (n > 0) console.log(`AI-cache lastet fra disk: ${n} tekster`);
}

/** Skriver hele `store` til disk. Kaster aldri. */
function persistStore() {
  const file = { version: CACHE_VERSION, appVersion: config.version, entries: Object.fromEntries(store) };
  try {
    (hooks.active ? (hooks.saveCache ?? noop) : writeCacheFile)(file);
  } catch (err) {
    console.error('AI-cache: klarte ikke å lagre ai-cache.json:', err.message);
  }
}

function ensureStats() {
  if (stats) return stats;
  let loaded = null;
  try {
    loaded = (hooks.load ?? readStatsFile)();
  } catch {
    loaded = null;
  }
  stats = loaded ?? { since: null, byKey: {} };
  return stats;
}

/** Registrerer ett kall (ok = vellykket svar med tekst) og lagrer. Kaster aldri. */
function record(cacheKey, { ok, model, usage }) {
  const s = ensureStats();
  const at = new Date(now()).toISOString();
  s.since ??= at;
  const e = (s.byKey[cacheKey] ??= emptyEntry());
  if (ok) {
    e.calls += 1;
    e.inputTokens += toCount(usage?.input_tokens);
    e.outputTokens += toCount(usage?.output_tokens);
  } else {
    e.failures += 1;
  }
  e.lastAt = at;
  if (model) e.model = model;
  try {
    (hooks.save ?? writeStatsFile)({ version: STATS_VERSION, ...s });
  } catch (err) {
    console.error('AI-statistikk: klarte ikke å lagre ai-stats.json:', err.message);
  }
}

/** Synkron kopi av statistikken — for /health. Leser disk kun første gang. */
export function getStats() {
  const s = ensureStats();
  const totals = { calls: 0, inputTokens: 0, outputTokens: 0, failures: 0 };
  const byKey = {};
  for (const [key, e] of Object.entries(s.byKey)) {
    byKey[key] = { ...e };
    totals.calls += e.calls;
    totals.inputTokens += e.inputTokens;
    totals.outputTokens += e.outputTokens;
    totals.failures += e.failures;
  }
  return { since: s.since, totals, byKey };
}

export function isEnabled() {
  return Boolean(config.anthropicApiKey || injectedClient);
}

/**
 * Teksten som ligger i cachen for nøkkelen, uansett alder — eller null.
 * Gjør aldri nettverkskall: sidevisninger bruker denne, oppfriskeren
 * generate(). Slik kan ingen sidevisning blokkere på en Claude-rundtur.
 */
export function getCached(cacheKey) {
  ensureStore();
  return store.get(cacheKey) ?? null;
}

function getClient() {
  if (injectedClient) return injectedClient;
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

/**
 * Genererer tekst med cache: samme cacheKey regenereres tidligst etter
 * minIntervalMs uansett antall besøkende. Returnerer {text, generatedAt}
 * eller null (AI av / første kall feilet).
 *
 * Med `swr: true` blokkerer en utgått cache ikke: den gamle teksten
 * returneres med en gang og fornyes i bakgrunnen (som cache.js). Er cachen
 * kald, ventes det som før — da finnes det ingenting å svare med.
 *
 * Merk om max_tokens: på Sonnet 5 er adaptiv tenkning på som standard, og
 * tenketokens trekkes fra max_tokens. Taket er derfor satt romslig nok til at
 * svaret ikke blir avkortet — lengden styres av instruksjonene i prompten, og
 * ubrukte tokens koster ingenting. Kallet holdes ellers minimalt (ingen
 * `thinking`/`effort`) så det virker likt på både Sonnet 5 og Haiku 4.5.
 */
export async function generate({
  cacheKey,
  minIntervalMs,
  system,
  prompt,
  maxTokens = 2000,
  swr = false,
}) {
  if (!isEnabled()) return null;
  ensureStore();
  const cached = store.get(cacheKey);
  if (cached && now() - cached.generatedAt < minIntervalMs) return cached;

  if (cached && swr) {
    // Stale: svar med gammel tekst nå, forny i bakgrunnen — men ikke før
    // backoff-vinduet etter forrige feil er over.
    if (!inFailureBackoff(cacheKey)) {
      startGeneration({ cacheKey, system, prompt, maxTokens, cached });
    }
    return cached;
  }

  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
  if (inFailureBackoff(cacheKey)) return cached ?? null;
  return startGeneration({ cacheKey, system, prompt, maxTokens, cached });
}

function inFailureBackoff(cacheKey) {
  const failedAt = lastFailureAt.get(cacheKey);
  return failedAt != null && now() - failedAt < FAILURE_BACKOFF_MS;
}

/** Selve API-kallet, med in-flight dedup. Kaster aldri. */
function startGeneration({ cacheKey, system, prompt, maxTokens, cached }) {
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const p = (async () => {
    try {
      const res = await getClient().messages.create({
        model: config.aiModel,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      console.log(
        `AI-kall: ${cacheKey} modell=${res.model} inn=${res.usage?.input_tokens ?? '?'} ut=${res.usage?.output_tokens ?? '?'} tokens`
      );
      if (!text) {
        // Tomt svar (f.eks. avkortet) — behold forrige, og vent før nytt forsøk.
        record(cacheKey, { ok: false, model: res.model });
        lastFailureAt.set(cacheKey, now());
        return cached ?? null;
      }
      record(cacheKey, { ok: true, model: res.model, usage: res.usage });
      const entry = { text, generatedAt: now() };
      store.set(cacheKey, entry);
      lastFailureAt.delete(cacheKey);
      persistStore();
      return entry;
    } catch (err) {
      console.error('AI-kall feilet:', err.message);
      record(cacheKey, { ok: false, model: config.aiModel });
      lastFailureAt.set(cacheKey, now());
      return cached ?? null; // behold gammel oppsummering ved feil
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, p);
  return p;
}

// Test-hooks (samme mønster som cache.js). Aldri brukt i produksjon.

/** Injiserer en fake Anthropic-klient. null = tilbake til den ekte. */
export function _setClient(fake) {
  injectedClient = fake;
}

/** Venter på alle pågående bakgrunnsgenereringer (for tester). */
export async function _flush() {
  await Promise.allSettled([...inFlight.values()]);
}

/** Overstyrer klokken. null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}

/**
 * Overstyrer lese/skrive-funksjonene for ai-stats.json (load() → { since,
 * byKey } | null, save(file)) og ai-cache.json (loadCache() → { entries } |
 * null, saveCache(file)). Ethvert ikke-null-objekt kobler BEGGE filene fra
 * disken — utelatte hooks blir no-op (hvert kall erstatter hele settet, så
 * ingen hook henger igjen fra forrige test). null = tilbake til disk.
 * Nullstilles IKKE av _reset(), så en testfil kan koble fra én gang på modulnivå.
 */
export function _setHooks(overrides) {
  hooks.active = overrides != null;
  hooks.load = overrides?.load ?? null;
  hooks.save = overrides?.save ?? null;
  hooks.loadCache = overrides?.loadCache ?? null;
  hooks.saveCache = overrides?.saveCache ?? null;
}

export function _reset() {
  store.clear();
  inFlight.clear();
  lastFailureAt.clear();
  stats = null;
  storeLoaded = false;
}
