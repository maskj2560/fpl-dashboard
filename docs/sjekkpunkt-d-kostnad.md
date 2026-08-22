# Sjekkpunkt D — kostnadskontroll og restpunkter

Sjekkpunkt D er Del 5 + Del 6 i `docs/neste-okt-prompt-sesongstart.md`.
Startet 23. august 2026, tre dager etter at AI-funksjonene gikk i prod med
v1.2.0 (20. aug) — innenfor planens «søndag/mandag, etter 2–3 dager».

## Priser (hentet fra `claude-api`-referansen 2026-08-23, ikke fra hukommelsen)

| Modell | Inn $/1M | Ut $/1M | Merknad |
| --- | --- | --- | --- |
| `claude-sonnet-5` | **2.00** | **10.00** | introduksjonspris **t.o.m. 2026-08-31** |
| `claude-sonnet-5` | 3.00 | 15.00 | ordinær pris fra 2026-09-01 |
| `claude-haiku-4-5` | 1.00 | 5.00 | billig-alternativet, byttes med én env-endring |

**Tidskritisk:** prod kjører `AI_MODEL=claude-sonnet-5` (bekreftet i
`/health`: `"aiModel":"claude-sonnet-5"`). Prisen stiger 50 % 1. september.
En måling gjort nå undervurderer altså framtidig ukeskostnad med en tredel —
derfor regner verktøyet under ut begge deler.

## Terskler (planens Del 5, punkt 3)

- Under **$1/uke** — ingen tiltak.
- **$1–4/uke** — se hvilken funksjon som drar, vurder lengre cache før
  modellbytte.
- Over **$4/uke** — bytt `AI_MODEL=claude-haiku-4-5` i Coolify (én
  env-endring + redeploy, ingen kodeendring).

## Datagrunnlag — hentes av Marius

`ai.js:59-60` logger én linje per faktiske API-kall:

```
AI-kall: <cacheKey> modell=<modell> inn=<N> ut=<N> tokens
```

Cachede svar logger ingenting, så hver linje er et betalt kall. Nøklene
grupperes til tre funksjoner: `ai-rad-*` (rådgiveren på /lag, min. 1 t
mellom kall), `ai-brief-gw*` (/brief og auto-briefen deler nøkkel, min. 1 t)
og `news-summary` (nyhetene, min. 30 min).

**Slik hentes de:** dash.marsk.no → applikasjonen → Logs → søk/filtrer på
`AI-kall:` → kopier alle treff siden 20. august.

## Analyseverktøyet

Leser loggutdraget på stdin, grupperer per funksjon, regner kostnad med
begge Sonnet-prisene og med Haiku til sammenligning, og ekstrapolerer til
uke. Argumentet er antall døgn utdraget dekker.

```
node aikost.js 3 < aikall.txt
```

Kilden ligger i scratchpad som `aikost.js`; hele skriptet er limt inn nederst
i denne fila slik at det kan gjenskapes.

## Resultat

_Fylles inn når loggutdraget foreligger. Sjekkpunkt D er ikke lukket før
denne seksjonen har faktiske tall, og ROADMAP-punktet «Kostnadskontroll
etter 2–3 dager i drift» hukes ikke av før da._

## Restpunkter i Del 6

- [ ] **[Marius]** Skjermbilder til README (dashbord, /spillere, /lag i
      desktop + 390 px) — legges der README forventer dem.
- [ ] **[Marius]** Mobilvisning på ekte telefon: de fem QA-sjekkene
      (vannrett scroll, sticky hode, footer, norsk, AI-merke).
- [x] «v1.2.0-kandidater» samlet under «Senere / idéer» i ROADMAP.md.
- [x] HANDOVER/ROADMAP/CHANGELOG oppdatert fortløpende, grønn test + lint
      før hver commit.

## Åpent fra sjekkpunkt A

- [ ] **[Marius]** «Naturlig auto-brief torsdag 20. aug ~19:30 verifisert» —
      samme loggutdrag dekker dette: en `AI-kall: ai-brief-gw1`-linje rundt
      det tidspunktet, og en post i Discord-kanalen.

## Skriptet

```javascript
// Sjekkpunkt D / Del 5 — kostnadskontroll.
// Leser AI-kall:-linjer fra stdin. Format fra ai.js:59-60:
//   AI-kall: <cacheKey> modell=<modell> inn=<N> ut=<N> tokens
// Priser per 1M tokens (claude-api-referansen, hentet 2026-08-23):
const PRIS = {
  'claude-sonnet-5':  { inn: 2.00, ut: 10.00, note: 'intropris t.o.m. 2026-08-31' },
  'claude-sonnet-5-standard': { inn: 3.00, ut: 15.00, note: 'fra 2026-09-01' },
  'claude-haiku-4-5': { inn: 1.00, ut: 5.00,  note: '' },
};
const FUNK = (k) =>
  k.startsWith('ai-rad-') ? 'AI transfer-rådgiver (/lag)'
  : k.startsWith('ai-brief-') ? 'AI-brief (/brief + auto-brief)'
  : k === 'news-summary' ? 'Nyhetsoppsummering (/nyheter)'
  : `ukjent (${k})`;

let s = '';
process.stdin.on('data', (d) => (s += d)).on('end', () => {
  const re = /AI-kall:\s+(\S+)\s+modell=(\S+)\s+inn=(\d+)\s+ut=(\d+)/g;
  const rows = [...s.matchAll(re)].map((m) => ({
    key: m[1], modell: m[2], inn: +m[3], ut: +m[4],
  }));
  if (!rows.length) {
    console.log('Fant ingen AI-kall:-linjer. Sjekk at loggutdraget er limt inn ufiltrert.');
    return;
  }
  const per = new Map();
  for (const r of rows) {
    const f = FUNK(r.key);
    const a = per.get(f) ?? { n: 0, inn: 0, ut: 0, modeller: new Set() };
    a.n++; a.inn += r.inn; a.ut += r.ut; a.modeller.add(r.modell);
    per.set(f, a);
  }
  const kost = (inn, ut, p) => (inn / 1e6) * p.inn + (ut / 1e6) * p.ut;
  const modell = rows[0].modell;
  const p = PRIS[modell] ?? PRIS['claude-sonnet-5'];
  let tI = 0, tU = 0, tN = 0;
  console.log(`Modell(er) i loggen: ${[...new Set(rows.map(r => r.modell))].join(', ')}`);
  console.log(`Pris brukt: $${p.inn}/1M inn, $${p.ut}/1M ut ${p.note ? '(' + p.note + ')' : ''}\n`);
  console.log('Funksjon'.padEnd(34) + 'kall'.padStart(5) + 'inn-tok'.padStart(10) + 'ut-tok'.padStart(9) + 'kost'.padStart(10));
  console.log('-'.repeat(68));
  for (const [f, a] of [...per].sort((x, y) => kost(y[1].inn, y[1].ut, p) - kost(x[1].inn, x[1].ut, p))) {
    tI += a.inn; tU += a.ut; tN += a.n;
    console.log(f.padEnd(34) + String(a.n).padStart(5) + a.inn.toLocaleString('nb-NO').padStart(10) + a.ut.toLocaleString('nb-NO').padStart(9) + ('$' + kost(a.inn, a.ut, p).toFixed(4)).padStart(10));
  }
  console.log('-'.repeat(68));
  const tot = kost(tI, tU, p);
  console.log('SUM'.padEnd(34) + String(tN).padStart(5) + tI.toLocaleString('nb-NO').padStart(10) + tU.toLocaleString('nb-NO').padStart(9) + ('$' + tot.toFixed(4)).padStart(10));
  const dager = +(process.argv[2] || 3);
  const uke = tot / dager * 7;
  console.log(`\nPeriode: ${dager} dager  ->  ekstrapolert $${uke.toFixed(3)}/uke`);
  if (modell === 'claude-sonnet-5') {
    const std = kost(tI, tU, PRIS['claude-sonnet-5-standard']) / dager * 7;
    console.log(`Etter 31. aug (standardpris $3/$15): $${std.toFixed(3)}/uke`);
  }
  const haiku = kost(tI, tU, PRIS['claude-haiku-4-5']) / dager * 7;
  console.log(`Med AI_MODEL=claude-haiku-4-5:        $${haiku.toFixed(3)}/uke`);
  console.log(`\nTerskler fra planen: under $1/uke = fint | $1-4 = se hvilken funksjon som drar | over $4 = bytt til haiku`);
  console.log(uke > 4 ? '>>> OVER $4/uke — planen sier bytt modell' : uke > 1 ? '>>> $1-4/uke — se toppen av tabellen' : '>>> Under $1/uke — ingen tiltak');
});
```
