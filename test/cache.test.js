import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getOrFetch, clear, _setNow, _flush, ageOf } from '../src/services/cache.js';

let clock;
beforeEach(() => {
  clear();
  clock = 0;
  _setNow(() => clock);
});

test('henter verdi via fetcher og cacher den innenfor TTL', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return 'verdi';
  };

  const first = await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 500;
  const second = await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(first, 'verdi');
  assert.equal(second, 'verdi');
  assert.equal(calls, 1);
});

test('utløpt verdi returneres umiddelbart (stale) og oppdateres i bakgrunnen', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;

  const stale = await getOrFetch('k', fetcher, { ttl: 1000 });
  assert.equal(stale, 'verdi-1', 'stale verdi serveres umiddelbart');

  await _flush();
  const fresh = await getOrFetch('k', fetcher, { ttl: 1000 });
  assert.equal(fresh, 'verdi-2', 'bakgrunnsoppdatering er lagret');
  assert.equal(calls, 2);
});

test('samtidige kall til samme nøkkel dedupliseres til ett fetcher-kall', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return 'verdi';
  };

  const [a, b, c] = await Promise.all([
    getOrFetch('k', fetcher, { ttl: 1000 }),
    getOrFetch('k', fetcher, { ttl: 1000 }),
    getOrFetch('k', fetcher, { ttl: 1000 }),
  ]);

  assert.equal(a, 'verdi');
  assert.equal(b, 'verdi');
  assert.equal(c, 'verdi');
  assert.equal(calls, 1);
});

test('ulike nøkler dedupliseres ikke mot hverandre', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return calls;
  };

  const a = await getOrFetch('a', fetcher, { ttl: 1000 });
  const b = await getOrFetch('b', fetcher, { ttl: 1000 });

  assert.equal(a, 1);
  assert.equal(b, 2);
});

test('fetcher-feil uten cachet verdi kastes videre', async () => {
  const fetcher = async () => {
    throw new Error('nede');
  };

  await assert.rejects(() => getOrFetch('k', fetcher, { ttl: 1000 }), /nede/);
});

test('feilet kall caches ikke — neste kall prøver på nytt', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 1) throw new Error('nede');
    return 'ok';
  };

  await assert.rejects(() => getOrFetch('k', fetcher, { ttl: 1000 }));
  const second = await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(second, 'ok');
  assert.equal(calls, 2);
});

test('feilet bakgrunnsoppdatering beholder stale verdi', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('nede');
    return 'gammel';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;

  const stale = await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  const still = await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(stale, 'gammel');
  assert.equal(still, 'gammel', 'stale beholdes når revalidering feiler');
});

test('clear() tømmer cachen', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return 'verdi';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clear();
  await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(calls, 2);
});

test('mislykket revalidering: nytt forsøk innen 30 s undertrykkes, stale serveres', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('nede');
    return 'gammel';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // stale + revalidering feiler (calls=2)
  await _flush();

  clock = 20_000; // 18,5 s etter feilen — innenfor vinduet
  const value = await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();

  assert.equal(value, 'gammel');
  assert.equal(calls, 2, 'ingen ny revalidering innenfor backoff-vinduet');
});

test('etter 30 s backoff prøves revalidering igjen, og suksess lagres', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();

  clock = 31_500; // nøyaktig 1500 + 30 000 — retry er lov
  const stale = await getOrFetch('k', fetcher, { ttl: 1000 }); // trigger retry (calls=3)
  await _flush();
  const fresh = await getOrFetch('k', fetcher, { ttl: 1000 });

  assert.equal(stale, 'verdi-1', 'stale serveres mens retry pågår');
  assert.equal(fresh, 'verdi-3', 'vellykket retry er lagret');
  assert.equal(calls, 3);
});

test('hver mislykket revalidering starter nytt backoff-vindu', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls > 1) throw new Error('nede');
    return 'gammel';
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();
  clock = 31_500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // retry feiler (calls=3), backoff fra 31 500
  await _flush();

  clock = 60_000; // 28,5 s etter SISTE feil — fortsatt i vinduet
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 3, 'ingen retry før 30 s etter siste feil');

  clock = 61_500; // 30 s etter siste feil
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 4);
});

test('vellykket revalidering nullstiller backoffen', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();
  clock = 31_500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // suksess (calls=3), utløper 32 500
  await _flush();

  clock = 33_000; // ny verdi utløpt — ingen backoff skal gjelde
  await getOrFetch('k', fetcher, { ttl: 1000 });
  await _flush();
  assert.equal(calls, 4, 'suksess fjernet backoffen — revalidering skjer straks');
});

test('backoff gjelder per nøkkel', async () => {
  let aCalls = 0;
  let bCalls = 0;
  const failA = async () => {
    aCalls++;
    if (aCalls > 1) throw new Error('nede');
    return 'a';
  };
  const okB = async () => {
    bCalls++;
    return `b-${bCalls}`;
  };

  await getOrFetch('a', failA, { ttl: 1000 });
  await getOrFetch('b', okB, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('a', failA, { ttl: 1000 }); // a feiler → backoff kun for a
  await _flush();

  clock = 2000;
  await getOrFetch('b', okB, { ttl: 1000 }); // b er stale og revaliderer fritt
  await _flush();

  assert.equal(bCalls, 2, 'backoff på a blokkerer ikke b');
  assert.equal(aCalls, 2);
});

test('clear() nullstiller backoff-tilstanden', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    if (calls === 2) throw new Error('nede');
    return `verdi-${calls}`;
  };

  await getOrFetch('k', fetcher, { ttl: 1000 });
  clock = 1500;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // feiler (calls=2), backoff fra 1500
  await _flush();

  clear();
  await getOrFetch('k', fetcher, { ttl: 1000 }); // førstegang etter clear (calls=3), utløper 2500
  clock = 3000;
  await getOrFetch('k', fetcher, { ttl: 1000 }); // stale — må revalidere selv om 3000−1500 < 30 000
  await _flush();

  assert.equal(calls, 4, 'gammel backoff overlever ikke clear()');
});

// ---- v1.4.0: ageOf — alderen på cachede verdier ---------------------------

test('ageOf gir alderen på en cachet verdi', async () => {
  await getOrFetch('nokkel', async () => 'verdi', { ttl: 1000 });
  clock = 400;

  assert.equal(ageOf('nokkel'), 400);
});

test('ageOf er null for ukjent nøkkel', () => {
  assert.equal(ageOf('finnes-ikke'), null);
});

test('ageOf nullstilles når verdien revalideres', async () => {
  await getOrFetch('n2', async () => 'a', { ttl: 100 });
  clock = 200; // utløpt → SWR-henting i bakgrunnen
  await getOrFetch('n2', async () => 'b', { ttl: 100 });
  await _flush();

  assert.equal(ageOf('n2'), 0);
});
