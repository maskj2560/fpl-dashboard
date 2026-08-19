// Generisk TTL-cache med stale-while-revalidate og in-flight dedup.
// Utløpt verdi serveres umiddelbart mens ny hentes i bakgrunnen; N samtidige
// kall til samme nøkkel gir ett fetcher-kall.

const store = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise

let now = () => Date.now();

export async function getOrFetch(key, fetcher, { ttl }) {
  const entry = store.get(key);

  if (entry && entry.expiresAt > now()) {
    return entry.value;
  }

  if (entry) {
    // Stale: server gammel verdi med en gang, oppdater i bakgrunnen.
    fetchDeduped(key, fetcher, ttl).catch(() => {
      // Revalidering feilet — stale verdi beholdes.
    });
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
        return value;
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
}
