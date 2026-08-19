import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getOrFetch, clear, _setNow, _flush } from '../src/services/cache.js';

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
