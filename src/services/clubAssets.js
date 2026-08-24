import fs from 'node:fs';
import { IMG_VERSION } from '../middleware.js';

// Hvilke klubbbilder finnes i public/img/clubs/? Leses ÉN gang ved oppstart
// og legges på app.locals — partialene spør hasBadge/hasShirt/hasKeeper og
// skriver aldri <img> for en fil som ikke finnes (nyopprykket lag, glemt
// skriptkjøring). Filnavnene speiler FPL: t{code}.png, shirt_{code}.png,
// shirt_{code}_1.png (keeper).
const BADGE_RE = /^t(\d+)\.png$/;
const SHIRT_RE = /^shirt_(\d+)\.png$/;
const KEEPER_RE = /^shirt_(\d+)_1\.png$/;

/** Ren funksjon av en filliste — testes uten disk. */
export function clubAssetsFrom(fileNames, version = IMG_VERSION) {
  const codes = (re) =>
    new Set(
      fileNames
        .map((f) => re.exec(f)?.[1])
        .filter(Boolean)
        .map(Number),
    );
  const badges = codes(BADGE_RE);
  const shirts = codes(SHIRT_RE);
  const keepers = codes(KEEPER_RE);
  const has = (set) => (code) => code != null && code !== '' && set.has(Number(code));
  return {
    version,
    hasBadge: has(badges),
    hasShirt: has(shirts),
    hasKeeper: has(keepers),
    count: { badges: badges.size, shirts: shirts.size, keepers: keepers.size },
  };
}

/** Leser mappa; mangler den, startes appen likevel (alt blir tekst). */
export function loadClubAssets(dir) {
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    // Mappa finnes ikke — skriptet er ikke kjørt. Ikke en feil.
  }
  return clubAssetsFrom(files);
}
