import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { encodePng, paintIcon, PURPLE, GREEN, ICONS } from '../scripts/make-pwa-icons.mjs';

const publicDir = new URL('../public/', import.meta.url);
const readPublic = (file) => fs.readFileSync(new URL(file, publicDir), 'utf8');

// ---- v1.12.0 T3: service worker + ruter -------------------------------------

const swSource = () => fs.readFileSync(new URL('../src/pwa/sw.js', import.meta.url), 'utf8');

test('sw.js cacher aldri /api, /kalender.ics, /health eller seg selv', () => {
  const sw = swSource();
  const block = sw.slice(sw.indexOf('NEVER_CACHE'), sw.indexOf(']', sw.indexOf('NEVER_CACHE')));
  for (const path of ['\\/api\\/', 'kalender\\.ics', '\\/health', 'sw\\.js']) {
    assert.ok(block.includes(path), `NEVER_CACHE mangler ${path}`);
  }
  assert.ok(/request\.method !== 'GET'/.test(sw), 'kun GET går gjennom SW-en');
  assert.ok(/url\.origin !== (self\.)?location\.origin/.test(sw), 'kun same-origin');
});

test('sw.js er nett-først for navigasjon og cache-først kun for ?v=', () => {
  const sw = swSource();
  const nav = sw.slice(sw.indexOf("mode === 'navigate'"));
  assert.ok(nav.length > 0, 'ingen navigasjonsgren');
  assert.ok(nav.indexOf('fetch(') < nav.indexOf('caches.match'), 'navigasjon skal prøve nettet før cachen');
  assert.ok(nav.includes("'/offline'"), 'navigasjon uten nett faller tilbake på /offline');
  const versioned = sw.slice(sw.indexOf("searchParams.has('v')"));
  assert.ok(versioned.length > 0, 'ingen ?v=-gren');
  assert.ok(versioned.indexOf('caches.match') < versioned.indexOf('fetch('), '?v= skal leses fra cachen først');
  assert.ok(/cache\.put\(/.test(versioned), '?v=-svar legges i cachen');
});

test('sw.js bytter cache-navn med asset-versjonen og rydder gamle', () => {
  const sw = swSource();
  assert.ok(sw.includes("'fpl-__ASSET_VERSION__'"), 'cache-navnet skal bære plassholderen');
  assert.ok(/skipWaiting\(\)/.test(sw) && /clients\.claim\(\)/.test(sw), 'skipWaiting + clients.claim');
  const activate = sw.slice(sw.indexOf("'activate'"));
  assert.ok(/caches\.keys\(\)/.test(activate) && /caches\.delete\(/.test(activate), 'gamle cacher slettes ved activate');
  assert.ok(/startsWith\('fpl-'\)/.test(activate), 'kun våre egne fpl-*-cacher røres');
  assert.ok(sw.includes("'/offline'"), 'offline-siden precaches ved install');
});

test('sw-ruta setter no-store, riktig type og bytter inn asset-versjonen', async () => {
  const { createSwHandler, offlineHandler } = await import('../src/routes/pwa.js');
  const handler = createSwHandler({ assetVersion: 'abc12345', source: "const CACHE = 'fpl-__ASSET_VERSION__';\n" });
  const headers = {};
  let body = null;
  const res = { set(h) { Object.assign(headers, h); return this; }, send(b) { body = b; } };
  handler({}, res);
  assert.equal(headers['Content-Type'], 'application/javascript; charset=utf-8');
  assert.equal(headers['Cache-Control'], 'no-store');
  assert.ok(body.includes("'fpl-abc12345'"), 'asset-versjonen er ikke byttet inn');
  assert.ok(!body.includes('__ASSET_VERSION__'), 'plassholderen står igjen');

  const real = createSwHandler({ assetVersion: 'deadbeef' });
  let realBody = null;
  real({}, { set() { return this; }, send(b) { realBody = b; } });
  assert.ok(realBody.includes("'fpl-deadbeef'"), 'standardkilden er src/pwa/sw.js');

  const offlineHeaders = {};
  let rendered = null;
  offlineHandler({}, { set(h) { Object.assign(offlineHeaders, h); return this; }, renderPage(view, data) { rendered = [view, data]; } });
  assert.equal(offlineHeaders['Cache-Control'], 'no-store');
  assert.deepEqual(rendered, ['offline', { title: 'Frakoblet' }]);
});

test('app.js monterer /sw.js og /offline før 404', () => {
  const server = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const sw = server.indexOf("app.get('/sw.js'");
  const offline = server.indexOf("app.get('/offline'");
  const notFound = server.indexOf('res.status(404)');
  assert.ok(sw > 0 && offline > 0, '/sw.js og /offline mangler i app.js');
  assert.ok(sw < notFound && offline < notFound, 'rutene må ligge før 404-handleren');
  assert.ok(server.includes('createSwHandler({ assetVersion })'), 'SW-ruta får den ekte asset-hashen');
});

// ---- v1.12.0 T2: manifest + ikoner på disk ---------------------------------

test('manifest.webmanifest har navn, short_name, start_url, display standalone og FPL-farger', () => {
  const manifest = JSON.parse(readPublic('manifest.webmanifest'));
  assert.equal(manifest.name, 'FPL-dashboard');
  assert.equal(manifest.short_name, 'FPL');
  assert.equal(manifest.lang, 'nb');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#37003C');
  assert.match(manifest.background_color, /^#[0-9a-fA-F]{6}$/);
  const css = readPublic('style.css');
  const bg = css.match(/:root\s*\{[^}]*--bg:\s*(#[0-9a-fA-F]{6})/)?.[1];
  assert.ok(bg, 'fant ikke --bg i :root');
  assert.equal(manifest.background_color.toLowerCase(), bg.toLowerCase(), 'background_color skal være mørkt --bg');
});

test('manifest-ikonene finnes i public/img og har 192, 512 og maskable', () => {
  const manifest = JSON.parse(readPublic('manifest.webmanifest'));
  const icons = manifest.icons;
  assert.ok(Array.isArray(icons) && icons.length >= 4, 'minst fire ikoner');
  for (const icon of icons) {
    assert.match(icon.src, /^\/img\/[a-z0-9-]+\.(png|svg)\?v=\d+$/, `${icon.src}: uversjonert eller feil sti`);
    const file = icon.src.replace(/^\//, '').split('?')[0];
    assert.ok(fs.existsSync(new URL(file, publicDir)), `${file} mangler på disk`);
  }
  const sizes = (purpose) => icons.filter((i) => (i.purpose ?? 'any') === purpose).map((i) => i.sizes);
  assert.ok(sizes('any').includes('192x192') && sizes('any').includes('512x512'), '192 og 512 «any»');
  assert.ok(sizes('maskable').includes('512x512'), '512 maskable');
  assert.ok(icons.some((i) => i.src.includes('icon.svg') && i.sizes === 'any'), 'SVG-ikon med sizes any');
  for (const { file, size } of ICONS) {
    const png = fs.readFileSync(new URL(`img/${file}`, publicDir));
    assert.equal(png.readUInt32BE(16), size, `${file}: bredde`);
    assert.equal(png.readUInt32BE(20), size, `${file}: høyde`);
  }
});

// ---- v1.12.0 T1: ikonskriptet (kun node:zlib) ------------------------------

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function chunksOf(png) {
  const out = [];
  let i = 8;
  while (i < png.length) {
    const len = png.readUInt32BE(i);
    const type = png.subarray(i + 4, i + 8).toString('ascii');
    const data = png.subarray(i + 8, i + 8 + len);
    const crc = png.readUInt32BE(i + 8 + len);
    out.push({ type, data, crc, crcExpected: zlib.crc32(png.subarray(i + 4, i + 8 + len)) });
    i += 12 + len;
  }
  return out;
}

test('encodePng gir gyldig signatur, IHDR og CRC', () => {
  const width = 4;
  const height = 3;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([i, 255 - i, 7, 255], i * 4);
  const png = encodePng({ width, height, rgba });

  assert.deepEqual([...png.subarray(0, 8)], SIGNATURE, 'PNG-signaturen mangler');
  const chunks = chunksOf(png);
  assert.deepEqual(chunks.map((c) => c.type), ['IHDR', 'IDAT', 'IEND']);
  for (const c of chunks) assert.equal(c.crc, c.crcExpected, `${c.type}: CRC stemmer ikke`);

  const ihdr = chunks[0].data;
  assert.equal(ihdr.readUInt32BE(0), width);
  assert.equal(ihdr.readUInt32BE(4), height);
  assert.deepEqual([...ihdr.subarray(8, 13)], [8, 6, 0, 0, 0], '8-bit RGBA, ingen interlace');

  const raw = zlib.inflateSync(chunks[1].data);
  assert.equal(raw.length, height * (1 + width * 4), 'én filterbyte + 4 byte per piksel per rad');
  for (let y = 0; y < height; y++) assert.equal(raw[y * (1 + width * 4)], 0, `rad ${y}: filterbyte skal være 0`);
  assert.deepEqual([...raw.subarray(1, 5)], [0, 255, 7, 255], 'første piksel er intakt');
  assert.equal(chunks[2].data.length, 0, 'IEND er tom');
});

test('paintIcon fyller senterpikselen grønn og hjørnet gjennomsiktig', () => {
  const size = 64;
  const px = (rgba, x, y) => [...rgba.subarray((y * size + x) * 4, (y * size + x) * 4 + 4)];

  const icon = paintIcon({ size });
  assert.equal(icon.length, size * size * 4);
  assert.deepEqual(px(icon, 32, 32), [...GREEN, 255], 'senter er FPL-grønn og dekkende');
  assert.equal(px(icon, 0, 0)[3], 0, 'hjørnet er gjennomsiktig (avrundet)');
  assert.deepEqual(px(icon, 32, 3), [...PURPLE, 255], 'bakgrunnen er FPL-lilla');

  const opaque = paintIcon({ size, opaque: true });
  assert.deepEqual(px(opaque, 0, 0), [...PURPLE, 255], 'opaque: hjørnet er lilla og dekkende');
  assert.deepEqual(px(opaque, 32, 32), [...GREEN, 255]);

  // Sirkelkanten ligger ved y = 32 − 19,2 = 12,8: rad 12 dekkes delvis av grønt.
  const edge = px(icon, 32, Math.floor(size / 2 - size * 0.3));
  assert.ok(edge[3] === 255 && edge[1] > 0 && edge[1] < 255, `sirkelkanten er antialiaset (supersampling): ${edge}`);
});
