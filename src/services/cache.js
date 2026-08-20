// Generisk TTL-cache med stale-while-revalidate og in-flight dedup.
// Utløpt verdi serveres umiddelbart mens ny hentes i bakgrunnen; N samtidige
// kall til samme nøkkel gir ett fetcher-kall. Etter en mislykket henting
// ventes FAILURE_BACKOFF_MS før ny revalidering av samme nøkkel — stale
// verdi serveres fortsatt umiddelbart i mellomtiden.

const FAILURE_BACKOFF_MS = 30_000;

const store = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise
const lastFailedAt = new Map(); // key -> tidspunkt for siste mislykkede henting

let now = () => Date.now();

export async function getOrFetch(key, fetcher, { ttl }) {
  const entry = store.get(key);

  if (entry && entry.expiresAt > now()) {
    return entry.value;
  }

  if (entry) {
    // Stale: server gammel verdi med en gang, oppdater i bakgrunnen —
    // men ikke før backoff-vinduet etter forrige feil er over.
    const failedAt = lastFailedAt.get(key);
    if (failedAt === undefined || now() - failedAt >= FAILURE_BACKOFF_MS) {
      fetchDeduped(key, fetcher, ttl).catch(() => {
        // Revalidering feilet — stale verdi beholdes.
      });
    }
    return entry.value;
  }

  return fetchDeduped(key, fetcher, ttl);
}

function fetchDeduped(key, fetcher, ttl) {
  let promise = inFlight.get(key);
  if (!promise) {
    promise = (async () => {
      try {
        const value = await fetcher();
        store.set(key, { value, expiresAt: now() + ttl });
        lastFailedAt.delete(key);
        return value;
      } catch (err) {
        lastFailedAt.set(key, now());
        throw err;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, promise);
  }
  return promise;
}

/** Venter på alle pågående bakgrunnsoppdateringer (for tester). */
export async function _flush() {
  await Promise.allSettled([...inFlight.values()]);
}

/** Overstyrer klokken (for tester). null = tilbake til Date.now. */
export function _setNow(fn) {
  now = fn ?? (() => Date.now());
}

export function clear() {
  store.clear();
  inFlight.clear();
  lastFailedAt.clear();
}
