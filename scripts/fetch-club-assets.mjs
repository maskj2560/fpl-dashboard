// Laster ned klubbgrafikk for alle lag i bootstrap-static til
// public/img/clubs/: merke 70 px (t{code}.png), drakt 110 px
// (shirt_{code}.png) og keeperdrakt 110 px (shirt_{code}_1.png).
// Kjøres for hånd én gang per sesong: `npm run fetch-clubs`. Ingen
// avhengigheter (Node ≥ 22 har fetch). Ny sesong = nye drakter på samme
// URL-er → bump IMG_VERSION i src/middleware.js i samme commit.
// Dette er det eneste nettverkskallet utenfor fplClient.js — det er et
// CLI-verktøy, ikke app-kode (CLAUDE.md-unntaket).
import fs from 'node:fs/promises';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const OUT = path.resolve('public/img/clubs');
const BOOTSTRAP = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const sources = (code) => [
  [`t${code}.png`, `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`],
  [
    `shirt_${code}.png`,
    `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${code}-110.png`,
  ],
  [
    `shirt_${code}_1.png`,
    `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${code}_1-110.png`,
  ],
];

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const { teams } = await (await fetch(BOOTSTRAP, { headers: { 'User-Agent': UA } })).json();
await fs.mkdir(OUT, { recursive: true });
let ok = 0;
const failed = [];
for (const team of teams) {
  for (const [file, url] of sources(team.code)) {
    try {
      await fs.writeFile(path.join(OUT, file), await get(url));
      ok += 1;
    } catch (err) {
      failed.push(`${team.short_name} ${file}: ${err.message}`);
    }
  }
}
console.log(`Lagret ${ok} av ${teams.length * 3} filer i ${OUT}`);
if (failed.length) {
  console.error(`Feilet:\n  ${failed.join('\n  ')}`);
  process.exit(1);
}
