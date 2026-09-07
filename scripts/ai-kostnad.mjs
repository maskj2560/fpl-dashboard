// AI-kostnad (v1.15.0, sjekkpunkt D): leser `/health`-svaret og skriver
// kostnaden per AI-funksjon, ukestakt, alternativ modell og planens
// terskelverdict (docs/sjekkpunkt-d-kostnad.md).
//   curl -s https://fpl.marsk.no/health | npm run ai-kostnad
//   npm run ai-kostnad -- health.json
//   npm run ai-kostnad -- https://fpl.marsk.no/health --restarts 10
// `--restarts N` trekker N × 3 kall (oppstartstikket) fra brutto: deploystøy.
// CLI-verktøy, aldri kjøretid — URL-varianten er nettverkskallet CLAUDE.md
// unntar som for fetch-clubs. All regning bor i src/services/aiCost.js (testet).
import fs from 'node:fs';
import { summarizeAiCost, formatReport } from '../src/services/aiCost.js';

const args = process.argv.slice(2);
let restarts = 0;
const flag = args.indexOf('--restarts');
if (flag !== -1) {
  restarts = Number(args[flag + 1]);
  if (!Number.isFinite(restarts) || restarts < 0) {
    console.error('--restarts trenger et tall ≥ 0, f.eks. --restarts 10');
    process.exit(1);
  }
  args.splice(flag, 2);
}
const source = args[0];

async function readInput() {
  if (source && /^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`${res.status} ${source}`);
    return res.text();
  }
  if (source) return fs.readFileSync(source, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin
}

let health;
try {
  health = JSON.parse(await readInput());
} catch (err) {
  console.error('Kunne ikke lese /health-JSON:', err.message);
  process.exit(1);
}

// Godtar både hele /health-svaret og et rent aiStats-objekt.
const summary = summarizeAiCost(health?.aiStats ?? health, { restarts });
if (!summary) {
  console.error('Ingen aiStats i svaret — AI er av (ANTHROPIC_API_KEY mangler) eller ingen kall er gjort ennå.');
  process.exit(1);
}
console.log(formatReport(summary));
