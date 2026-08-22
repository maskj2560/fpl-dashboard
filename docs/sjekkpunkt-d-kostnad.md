# Sjekkpunkt D — kostnadskontroll og restpunkter

Sjekkpunkt D er Del 5 (kostnadskontroll) + Del 6 (restpunkter) i
sesongstart-verifiseringen, M4.
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

## Resultat — målt 23. august 2026

Datagrunnlag: Anthropic-konsollens Usage- og Cost-visning (org-nivå), samt
Coolify-loggen. **Ikke** den planlagte per-funksjon-oppdelingen — se
metodefeilen under.

### Fakturert

| Måling | Verdi |
| --- | --- |
| Total kostnad, siste 7 døgn | **0,94 USD** |
| Tokens inn (17.–23. aug) | 108 948 |
| Tokens ut (17.–23. aug) | 76 689 |
| Web-søk / kodekjøring | 0 USD — ingen servertjenester i bruk |
| Modell | `claude-sonnet-5` alene |

**Introduksjonsprisen er bekreftet av fakturaen, ikke bare av
dokumentasjonen.** Egen utregning på konsollens tokentall:
$2/$10 gir **$0,985**, $3/$15 gir **$1,477**. Fakturert er $0,94 — og de to
visningene dekker litt ulike døgn (Cost: 16.–22., Usage: 17.–23.). Det er
intro-prisen som treffer; ordinærprisen er 57 % unna.

### Vurdering mot planens terskler

**Under $1/uke → planens verdict er «ingen tiltak».** Men marginen er tynn,
og to ting flytter den:

1. **Etter 31. august koster nøyaktig samme bruk $1,48/uke** — altså rett
   inn i $1–4-båndet der planen sier «se hvilken funksjon som drar».
2. **Ut-tokens står for 77,9 % av kostnaden.** Prompten er allerede kort;
   det er svarlengden som betaler regningen. Den reelle knappen er derfor
   instruksjonene om lengde i prompten, ikke modellbytte.

Til sammenligning: samme forbruk på `claude-haiku-4-5` ville kostet
**$0,49/uke**, altså omtrent halvparten. Ikke nødvendig nå.

### Metodefeil: per-funksjon-oppdeling lar seg ikke gjøre i etterkant

Planen forutsatte at `AI-kall:`-linjene i Coolify-loggen kunne summeres per
funksjon. Det går ikke retroaktivt: loggvinduet er på 100 linjer per
container, og containeren startes på nytt ved hver deploy — 22. august alene
ble det fire deployer. Det som overlevde er to linjer:

```
AI-kall: news-summary  modell=claude-sonnet-5 inn=1481 ut=773 tokens
AI-kall: ai-brief-gw2  modell=claude-sonnet-5 inn=1192 ut=885 tokens
```

De beviser at loggformatet virker og at begge funksjonene fyrer i prod, men
ikke fordelingen. **Skal fordelingen måles, må loggen samles løpende** — for
eksempel ved å hente `AI-kall:`-linjene fra Coolify før hver deploy.

### Hva de 185 637 tokenene sannsynligvis er

Med snittet fra de to linjene (~1 337 inn / ~829 ut per kall) tilsvarer
ukens tokentall **82–93 kall**. Fordelingen per døgn peker på at mye av det
ikke er organisk prod-trafikk:

- **19. aug: $0,41 — 44 % av hele uken.** To døgn før GW1-deadline, altså før
  siden hadde reell trafikk. Stemmer med den lokale pre-flight-testingen av
  alle fire AI-funksjonene mot ekte API (dokumentert i HANDOVER, v1.0.1).
- 20. aug: $0,22 — auto-brief-vinduet for GW1 åpnet denne kvelden.
- 21. aug: $0,12 — laveste døgn.
- 22. aug: $0,19 — deploy-dagen.

**Forbehold:** konsollen måler hele organisasjonen og inkluderer Console-bruk,
ikke bare dashbordet. Tallene over er derfor et tak for dashbordets kostnad,
ikke et presist mål.

### Korreksjon: «0 AI-kall fra Opus» var upresist

Opus utførte aldri et bevisst AI-kall og klikket aldri «Spør AI om råd». Men
`GET /brief` kaller `generateAiBrief()` ved hvert besøk (`routes/brief.js:9`),
og `/nyheter` genererer tilsvarende — og begge rutene inngikk i planens
prod-rutesveip i port 1, 5, 6 og 7. Med 1-timesintervallet på briefen og
30-minutters på nyhetene utløste sveipene anslagsvis **6 betalte kall,
~$0,07**.

`/api/brief.json` er derimot ren data (`assembleBrief()` uten AI), og port
3-røyktesten kjørte uten nøkler med `ai:false` — der var det faktisk null.

**Dette er en motsetning i planen selv:** den forbød AI-kall og foreskrev
samtidig sveip over AI-genererende ruter. En framtidig deploy-plan bør enten
utelate `/brief` og `/nyheter` fra prod-sveipet, eller budsjettere for dem.

### Konklusjon

Ingen tiltak nå — $0,94/uke er under terskelen, og ingen enkeltfunksjon er
åpenbart løpsk. **Måles på nytt i uken etter 31. august**, når ordinærprisen
slår inn og GW2–GW3 gir et bilde av organisk trafikk uten
utviklings-støy. Blir det da over $4/uke, er `AI_MODEL=claude-haiku-4-5` én
env-endring unna; mellom $1 og $4 er kortere svar den billigere knappen.

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
