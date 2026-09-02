import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Stilarket er et API: hver fargetoken finnes i begge temaer, ingen farger
// utenfor tokenblokkene, og kontrastparene består WCAG i begge temaer.
// Erstatter engangsskriptet kontrast.mjs fra v1.1.0 med en varig test.
const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

function tokensIn(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `fant ikke blokken «${selector} {»`);
  const end = css.indexOf('\n}', start);
  const out = new Map();
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

const dark = tokensIn(':root');
const light = tokensIn(':root[data-theme="light"]');
const isColor = (v) => /^(#|rgba?\(|0 2px 8px)/.test(v);

test('style.css: hver fargetoken i :root finnes også i lyst tema, og omvendt', () => {
  const darkColors = [...dark].filter(([, v]) => isColor(v)).map(([k]) => k);
  const lightKeys = [...light.keys()];
  assert.deepEqual(lightKeys.filter((k) => !dark.has(k)), [], 'lys-token uten mørk motpart');
  assert.deepEqual(darkColors.filter((k) => !light.has(k)), [], 'mørk fargetoken mangler i lyst tema');
  assert.ok(darkColors.length >= 40, `for få fargetokens: ${darkColors.length}`);
});

test('style.css: ingen hardkodede farger utenfor tokenblokkene', () => {
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:root(\[data-theme="light"\])? \{[\s\S]*?\n\}/g, '')
    .split('\n')
    .filter((line) => !line.includes('mask-image')) // #000 i masken er alfa, ikke farge
    .join('\n');
  const hits = stripped.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [];
  assert.deepEqual(hits, [], `hardkodede farger: ${hits.join(', ')}`);
});

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [forgrunn, bakgrunn, krav] — 4.5 tekst, 3 grafikk. Kun hex-tokens.
const PAIRS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text', 'surface-3', 4.5],
  ['text-dim', 'bg', 4.5], ['text-dim', 'surface', 4.5], ['text-dim', 'surface-2', 4.5], ['text-dim', 'surface-3', 4.5],
  ['dim-strong', 'surface', 4.5], ['dim-strong', 'surface-3', 4.5],
  ['accent-text', 'bg', 4.5], ['accent-text', 'surface', 4.5], ['accent-text', 'surface-2', 4.5],
  ['accent-ink', 'accent', 4.5],
  ['accent-2-text', 'surface', 4.5], ['accent-2-text', 'surface-2', 4.5],
  ['accent-2-ink', 'accent-2', 4.5],
  ['cyan-text', 'surface', 4.5], ['cyan-text', 'surface-2', 4.5],
  ['negative', 'surface', 4.5], ['negative', 'surface-2', 4.5],
  ['warn-text', 'warn-bg', 4.5],
  ['topbar-text', 'topbar-bg', 4.5], ['topbar-dim', 'topbar-bg', 4.5], ['accent-ink', 'accent', 4.5],
  ['hero-text', 'hero-from', 4.5], ['hero-text', 'hero-to', 4.5], ['hero-dim', 'hero-from', 4.5], ['hero-dim', 'hero-to', 4.5],
  // QA-funn 3 (v1.12.1): lenker på hero-gradienten fikk --accent-text (1,85:1 i lyst tema).
  ['hero-link', 'hero-from', 4.5], ['hero-link', 'hero-to', 4.5],
  ['fdr-ink-light', 'fdr-1', 3], ['fdr-ink-dark', 'fdr-2', 3], ['fdr-ink-dark', 'fdr-3', 3],
  // QA-funn 11 (v1.12.1): FDR-4 bærer 12 px-tekst («COV (h)»), ikke bare farge — 4,5.
  ['fdr-ink-light', 'fdr-4', 4.5], ['fdr-ink-light', 'fdr-5', 3],
  ['focus', 'bg', 3], ['focus', 'surface', 3],
];

for (const [name, tokens] of [['mørkt', dark], ['lyst', light]]) {
  test(`style.css: kontrastparene består WCAG i ${name} tema`, () => {
    const feil = [];
    for (const [fg, bg, krav] of PAIRS) {
      const f = tokens.get(fg) ?? dark.get(fg);
      const b = tokens.get(bg) ?? dark.get(bg);
      assert.match(f, /^#[0-9a-f]{6}$/i, `${fg} er ikke hex i ${name}`);
      assert.match(b, /^#[0-9a-f]{6}$/i, `${bg} er ikke hex i ${name}`);
      const r = ratio(f, b);
      if (r < krav) feil.push(`${fg}/${bg} = ${r.toFixed(2)} (krav ${krav})`);
    }
    assert.deepEqual(feil, []);
  });
}

// Ankeret er linjestart: samme selektor kan finnes innrykket i en
// medieblokk lenger oppe i fila, og da vil et rent indexOf treffe den.
const block = (sel) => {
  const start = css.indexOf(`\n${sel} {`);
  assert.notEqual(start, -1, `fant ikke blokken «${sel} {»`);
  return css.slice(start + 1, css.indexOf('\n}', start + 1));
};

test('style.css: topbaren låses til --topbar-h', () => {
  assert.match(block('.topbar'), /height: var\(--topbar-h\)/);
  assert.ok(!block('.topbar').includes('padding: 0.7rem'), 'vertikal padding skal ikke styre høyden');
});

test('style.css: pinned-tabellen er en indre scrollboks uten egen sticky', () => {
  const b = block('.table-scroll--pinned');
  assert.ok(!b.includes('position: sticky'), 'sticky på boksen har ~0 reiserom inne i kortet og er død vekt');
  assert.match(b, /max-height: min\(75vh/);
  assert.match(block('.table-scroll--pinned table.data thead th'), /position: sticky/);
});

test('style.css: ingen opacity-demping på versjonslinja og benkeradene', () => {
  assert.ok(!block('footer .version').includes('opacity'));
  assert.ok(!block('.row-bench td').includes('opacity'));
});

test('style.css: orddeling er manuell i brødtekst og av i statistikkortene', () => {
  assert.match(css, /hyphens: manual/);
  assert.ok(!/hyphens: auto/.test(css));
  assert.match(block('.stat-lbl'), /hyphens: none/);
  assert.match(block('.stat-val'), /hyphens: none/);
  assert.match(block('.num'), /white-space: nowrap/);
});

test('style.css: tabellboksene har samme kantfade-mekanikk som menyen', () => {
  assert.match(block('.table-scroll'), /mask-image: linear-gradient\(90deg/);
  assert.match(css, /\.table-scroll\.table-fade-left \{ --fade-l: 28px; \}/);
  assert.match(css, /\.table-scroll\.table-fade-right \{ --fade-r: 28px; \}/);
});

// `table.data th` er mer spesifikk enn `.num`, så uten den egne regelen
// faller tallhodene tilbake til venstrestilling og peker på nabokolonnen.
test('style.css: tallkolonnens hode står til høyre, som tallene', () => {
  assert.match(block('table.data th.num'), /text-align: right/);
  assert.match(block('.num'), /text-align: right/);
});

// QA-funn (økt 51): filterraden ble stående på alle fanene på /spillere.
// `hidden` er en UA-regel og taper mot enhver display-regel med klasse.
test('style.css: hidden slår gjennom mot display-reglene', () => {
  assert.match(css, /\[hidden\]\s*\{\s*display: none !important;/);
});

// v1.8.3: hopp-lenken ligger utenfor skjermen til den får tastaturfokus, og
// bruker handlingsfargen med mørk tekst (kontrastparet er alt låst).
test('style.css: hopp-lenken er skjult til den får fokus', () => {
  assert.match(block('.skip-link'), /position: absolute/);
  assert.match(block('.skip-link'), /translateY\(-\d+%\)/);
  assert.match(block('.skip-link'), /background: var\(--accent\)/);
  assert.match(block('.skip-link'), /color: var\(--accent-ink\)/);
  assert.match(block('.skip-link:focus'), /transform: none/);
});

// QA-funn (økt 51): fylte hele cellehøyden og leste som et fargefelt.
test('style.css: score-søyla er en tynn stripe, ikke et fylt felt', () => {
  const b = block('.score-celle');
  assert.match(b, /background-size: 100% 0\.3rem/);
  assert.match(b, /background-position: left bottom/);
});

// QA-funn (økt 51): trendpila dyttet plassifferet til venstre for «#».
test('style.css: plassifferet reserverer plass til trendpila', () => {
  assert.match(css, /table\.data th\.rang,\s*table\.data td\.rang \{\s*padding-right: 2rem;/);
  assert.match(css, /\ntable\.data td\.rang \{\s*position: relative;/);
  assert.match(css, /td\.rang \.rank-same \{[\s\S]{0,80}position: absolute/);
});

// QA-funn (økt 51): duell-tabellen var 492 px i et 335 px kort på 390 px,
// så spiller 2 måtte dras fram sidelengs.
test('style.css: duellen deler bredden på mobil i stedet for å scrolle', () => {
  assert.match(css, /\.duell-panel table\.data \{\s*width: 100%;\s*table-layout: fixed;\s*white-space: normal;/);
});

// QA-funn 3 (v1.12.1): «Abonner på kalender» i nedtellingskortet arvet den
// globale lenkefargen — mørkegrønn på lilla gradient i lyst tema. Hero-en er
// lilla i BEGGE temaer, så lenken får en egen token (grønn som topbar-logoen).
test('style.css: lenker på hero-gradienten bruker --hero-link', () => {
  assert.match(block('.hero a'), /color: var\(--hero-link\)/);
});

// QA-funn 4 (v1.12.1): .chip { min-width: 7.5rem } × 4 + gap = 509 px i en
// ~330 px bred bane på 390 px → 3-4-3 ble 2+1 / 2+2 / 2+1. På mobil deler
// kortene raden likt og navnet får ellipse; benken (.bench) beholder wrap.
test('style.css: oppstillingen holder radene hele på mobil', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 480px)'));
  assert.match(mobile, /\.pitch-row \{[^}]*flex-wrap: nowrap;/);
  assert.match(mobile, /\.pitch-row \.chip \{[^}]*min-width: 0;/);
  assert.match(mobile, /\.pitch-row \.chip \{[^}]*flex: 1 1 0;/);
  assert.match(mobile, /\.pitch-row \.chip-name[^{]*\{[^}]*text-overflow: ellipsis;/);
});

// QA-funn 5 (v1.12.1): korthodet er flex uten wrap, og .h2-title { min-width: 0 }
// lot tittelen krympe under innholdet sitt — «AI Oppsummering» fløt over
// «generert 12:42 · neste tidligst 18:42» på 390 px. Lang meta faller nå ned.
test('style.css: korthodet bryter meta-teksten ned på egen linje ved plassmangel', () => {
  assert.match(block('.card h2'), /flex-wrap: wrap/);
});

// QA-funn 7 (v1.12.1): word-break: break-all delte webcal-adressen midt i
// ordet («fpl.marsk.n / o/kalender.ics») innenfor 78ch-taket på /brief.
// overflow-wrap: anywhere flytter hele adressen ned først.
test('style.css: webcal-adressen flyttes hel til neste linje før den deles', () => {
  const b = block('.hero-links code');
  assert.match(b, /overflow-wrap: anywhere/);
  assert.ok(!b.includes('break-all'), 'break-all deler midt i ordet selv når hele adressen får plass på neste linje');
});

// QA-funn 9 (v1.12.1): tre ~103 px-fliser på 390 px brakk «3 345 863» og
// «TOTALRANGERING». To fliser i bredden, den femte tar hele raden.
test('style.css: statflisene står to i bredden på mobil, og en odde siste tar raden', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 480px)'));
  assert.match(mobile, /\.stat-strip \{[^}]*minmax\(8\.5rem, 1fr\)/);
  assert.match(css, /\.stat-strip > \.stat:last-child:nth-child\(odd\) \{[^}]*grid-column: 1 \/ -1;/);
  assert.match(block('.stat-lbl'), /overflow-wrap: normal/);
});

test('style.css: smale tabeller krymper til innholdet', () => {
  assert.match(block('table.data.data--fit'), /width: auto/);
  assert.match(block('table.data.data--fit'), /min-width: min\(100%, 30rem\)/);
});
