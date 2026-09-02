import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { encodePng, paintIcon, PURPLE, GREEN } from '../scripts/make-pwa-icons.mjs';

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
