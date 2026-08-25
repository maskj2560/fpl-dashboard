// Felles Claude API-service. Brukes av nyheter, AI-brief og transfer-rådgiver.
// Kostnadsdisiplin: hard cache med minimumsintervall per nøkkel + in-flight dedup.
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

export function isEnabled() {
  return Boolean(config.anthropicApiKey || injectedClient);
}

/**
 * Teksten som ligger i cachen for nøkkelen, uansett alder — eller null.
 * Gjør aldri nettverkskall: sidevisninger bruker denne, oppfriskeren
 * generate(). Slik kan ingen sidevisning blokkere på en Claude-rundtur.
 */
export function getCached(cacheKey) {
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
        lastFailureAt.set(cacheKey, now());
        return cached ?? null;
      }
      const entry = { text, generatedAt: now() };
      store.set(cacheKey, entry);
      lastFailureAt.delete(cacheKey);
      return entry;
    } catch (err) {
      console.error('AI-kall feilet:', err.message);
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

export function _reset() {
  store.clear();
  inFlight.clear();
  lastFailureAt.clear();
}
