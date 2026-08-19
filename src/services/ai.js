// Felles Claude API-service. Brukes av nyheter, AI-brief og transfer-rådgiver.
// Kostnadsdisiplin: hard cache med minimumsintervall per nøkkel + in-flight dedup.
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const store = new Map(); // cacheKey -> {text, generatedAt}
const inFlight = new Map();
let client = null;

export function isEnabled() {
  return Boolean(config.anthropicApiKey);
}

function getClient() {
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

/**
 * Genererer tekst med cache: samme cacheKey regenereres tidligst etter
 * minIntervalMs uansett antall besøkende. Returnerer {text, generatedAt}
 * eller null (AI av / første kall feilet).
 *
 * Merk om max_tokens: på Sonnet 5 er adaptiv tenkning på som standard, og
 * tenketokens trekkes fra max_tokens. Taket er derfor satt romslig nok til at
 * svaret ikke blir avkortet — lengden styres av instruksjonene i prompten, og
 * ubrukte tokens koster ingenting. Kallet holdes ellers minimalt (ingen
 * `thinking`/`effort`) så det virker likt på både Sonnet 5 og Haiku 4.5.
 */
export async function generate({ cacheKey, minIntervalMs, system, prompt, maxTokens = 2000 }) {
  if (!isEnabled()) return null;
  const cached = store.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < minIntervalMs) return cached;
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

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
      if (!text) return cached ?? null; // tomt svar (f.eks. avkortet) — behold forrige
      const entry = { text, generatedAt: Date.now() };
      store.set(cacheKey, entry);
      return entry;
    } catch (err) {
      console.error('AI-kall feilet:', err.message);
      return cached ?? null; // behold gammel oppsummering ved feil
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, p);
  return p;
}
