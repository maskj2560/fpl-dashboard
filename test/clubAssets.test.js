import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clubAssetsFrom, loadClubAssets } from '../src/services/clubAssets.js';
import { IMG_VERSION } from '../src/middleware.js';

// Serveren vet hvilke bilder som finnes — partialene spør her i stedet for
// å skrive <img> i blinde. Ren funksjon av en filliste: ingen disk i testene.

test('clubAssetsFrom kjenner igjen merke, drakt og keeperdrakt per klubbkode', () => {
  const a = clubAssetsFrom(['t3.png', 'shirt_3.png', 'shirt_3_1.png', 'shirt_14.png', 'README.txt']);
  assert.equal(a.hasBadge(3), true);
  assert.equal(a.hasShirt(3), true);
  assert.equal(a.hasKeeper(3), true);
  assert.equal(a.hasBadge(14), false);
  assert.equal(a.hasShirt(14), true);
  assert.equal(a.hasKeeper(14), false);
  assert.deepEqual(a.count, { badges: 1, shirts: 2, keepers: 1 });
});

test('clubAssetsFrom svarer nei for ukjent kode, streng-kode uten fil og søppel', () => {
  const a = clubAssetsFrom(['t3.png']);
  assert.equal(a.hasBadge(99), false);
  assert.equal(a.hasBadge('3'), true, 'kode som streng (fra data-attributt) skal treffe');
  assert.equal(a.hasBadge(undefined), false);
  assert.equal(a.hasBadge(null), false);
  assert.equal(a.hasShirt('t3.png'), false);
});

test('clubAssetsFrom eksponerer IMG_VERSION som version', () => {
  assert.equal(clubAssetsFrom([]).version, IMG_VERSION);
});

test('loadClubAssets tåler at mappa mangler — alt faller tilbake på tekst', () => {
  const a = loadClubAssets('/finnes/ikke/' + Date.now());
  assert.equal(a.hasBadge(3), false);
  assert.deepEqual(a.count, { badges: 0, shirts: 0, keepers: 0 });
});
