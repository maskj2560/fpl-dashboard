import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ejs from 'ejs';
import * as fx from './fixtures/views.js';

// Tilgjengelighetslåser (v1.8.3) på tvers av views, klient-JS og stilark.
// Egen fil: hver test her er en regel som gjelder hele appen, ikke én modul.

const VIEWS = path.resolve('views');
const render = (name, locals) =>
  ejs.renderFile(path.join(VIEWS, `${name}.ejs`), locals, { async: false });

const PAGES = [
  ['dashboard', fx.dashboard],
  ['team', fx.team],
  ['players', fx.players],
  ['league', fx.league],
  ['brief', fx.brief],
  ['live', fx.live],
  ['news', fx.news],
  ['transfers', fx.transfers],
  ['innsikt', fx.insights],
];

/** Har feltet en etikett: aria-label(ledby), <label for=id>, eller ligger inni <label>? */
function harEtikett(html, tag, at) {
  if (/aria-label(ledby)?="[^"]+"/.test(tag)) return true;
  if (/type="hidden"/.test(tag)) return true;
  const id = tag.match(/\bid="([^"]+)"/)?.[1];
  if (id && html.includes(`for="${id}"`)) return true;
  const before = html.slice(0, at);
  return before.lastIndexOf('<label') > before.lastIndexOf('</label>');
}

test('ingen input eller select uten label, aria-label eller aria-labelledby', async () => {
  let felt = 0;
  for (const [name, locals] of PAGES) {
    const html = await render(name, locals);
    for (const m of html.matchAll(/<(input|select)\b[^>]*>/g)) {
      felt += 1;
      assert.ok(harEtikett(html, m[0], m.index), `${name}.ejs: felt uten etikett: ${m[0].slice(0, 80)}`);
    }
  }
  assert.ok(felt >= 8, `fant bare ${felt} skjemafelt — mønsteret matcher ikke lenger`);
});

test('klientrendrede skjemafelt har aria-label eller ligger i label', () => {
  const src = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const tags = [...src.matchAll(/<(input|select)\b[^>]*>/g)];
  assert.ok(tags.length >= 4, `fant bare ${tags.length} felt i app.js`);
  for (const m of tags) {
    const before = src.slice(Math.max(0, m.index - 160), m.index);
    const ok = /aria-label(ledby)?=/.test(m[0]) || before.lastIndexOf('<label') > before.lastIndexOf('</label>');
    assert.ok(ok, `app.js: felt uten etikett: ${m[0].slice(0, 80)}`);
  }
});

const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');

/** Fjerner innholdet i alle @media (prefers-reduced-motion: no-preference)-blokker. */
function utenBevegelsesblokker(text) {
  let out = '';
  let i = 0;
  const marker = '@media (prefers-reduced-motion: no-preference)';
  while (i < text.length) {
    const at = text.indexOf(marker, i);
    if (at === -1) { out += text.slice(i); break; }
    out += text.slice(i, at);
    let depth = 0;
    let j = text.indexOf('{', at);
    for (; j < text.length; j++) {
      if (text[j] === '{') depth += 1;
      if (text[j] === '}') { depth -= 1; if (depth === 0) break; }
    }
    i = j + 1;
  }
  return out;
}

test('style.css: all animation og transition ligger bak prefers-reduced-motion', () => {
  const rest = utenBevegelsesblokker(css);
  assert.ok(css.includes('@media (prefers-reduced-motion: no-preference)'), 'ingen bevegelsesblokk i stilarket');
  // Fanger også deklarasjoner på samme linje som selektoren (`.x { transition: … }`).
  const motion = rest.match(/\b(animation|transition)\s*:[^;{}]+;/g) ?? [];
  assert.deepEqual(motion, [], `bevegelse utenfor prefers-reduced-motion: ${motion.join(' | ')}`);
});

test('style.css: global :focus-visible med synlig outline', () => {
  const start = css.indexOf('\n:focus-visible {');
  assert.notEqual(start, -1, 'global :focus-visible-regel mangler');
  const block = css.slice(start, css.indexOf('}', start));
  assert.match(block, /outline: 2px solid var\(--focus\)/);
  assert.doesNotMatch(css, /outline:\s*none\s*;?\s*\}/, 'outline: none uten erstatning fjerner fokusringen');
});
