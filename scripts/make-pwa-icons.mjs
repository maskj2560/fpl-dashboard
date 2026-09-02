// PWA-ikoner (v1.12.0): lager public/img/icon-192.png, icon-512.png,
// icon-512-maskable.png og apple-touch-icon.png uten avhengigheter — kun
// node:zlib (deflate + crc32, Node ≥ 22.2). Geometrien er den samme som i
// public/img/icon.svg: FPL-lilla flate med avrundede hjørner og en
// FPL-grønn sirkel i midten. Kjøres én gang og PNG-ene committes
// (Dockerfilen kopierer kun public/). CLI: `npm run make-icons`.
// Bump ICON_VERSION i src/middleware.js når ikonene endres.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const PURPLE = [0x37, 0x00, 0x3c];
export const GREEN = [0x00, 0xff, 0x87];

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

/** RGBA (Uint8Array, width*height*4) → PNG-buffer: 8-bit RGBA, filter 0, én IDAT. */
export function encodePng({ width, height, rgba }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bitdybde
  ihdr[9] = 6; // fargetype: RGBA
  ihdr[10] = 0; // komprimering
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filterbyte «None»
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Er punktet innenfor et rektangel 0..size med hjørneradius r? */
function insideRounded(x, y, size, r) {
  if (r <= 0) return x >= 0 && y >= 0 && x < size && y < size;
  const cx = x < r ? r : x > size - r ? size - r : x;
  const cy = y < r ? r : y > size - r ? size - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/**
 * Tegner ikonet som RGBA med supersampling (antialiasing på kantene).
 * opaque: hele flaten dekkes (maskable/apple-touch — ingen gjennomsiktige hjørner).
 */
export function paintIcon({
  size,
  radiusRatio = 0.2,
  circleRatio = 0.3,
  background = PURPLE,
  foreground = GREEN,
  opaque = false,
  supersample = 4,
}) {
  const out = new Uint8Array(size * size * 4);
  const radius = opaque ? 0 : radiusRatio * size;
  const center = size / 2;
  const circle = circleRatio * size;
  const samples = supersample * supersample;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let covered = 0;
      const sum = [0, 0, 0];
      for (let j = 0; j < supersample; j++) {
        for (let i = 0; i < supersample; i++) {
          const px = x + (i + 0.5) / supersample;
          const py = y + (j + 0.5) / supersample;
          if (!insideRounded(px, py, size, radius)) continue;
          covered += 1;
          const color = (px - center) ** 2 + (py - center) ** 2 <= circle * circle ? foreground : background;
          sum[0] += color[0];
          sum[1] += color[1];
          sum[2] += color[2];
        }
      }
      const o = (y * size + x) * 4;
      if (covered === 0) continue; // gjennomsiktig: 0,0,0,0
      out[o] = Math.round(sum[0] / covered);
      out[o + 1] = Math.round(sum[1] / covered);
      out[o + 2] = Math.round(sum[2] / covered);
      out[o + 3] = Math.round((covered / samples) * 255);
    }
  }
  return out;
}

export const ICONS = [
  { file: 'icon-192.png', size: 192, opaque: false },
  { file: 'icon-512.png', size: 512, opaque: false },
  { file: 'icon-512-maskable.png', size: 512, opaque: true },
  { file: 'apple-touch-icon.png', size: 180, opaque: true },
];

function main() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
  fs.mkdirSync(dir, { recursive: true });
  for (const icon of ICONS) {
    const rgba = paintIcon({ size: icon.size, opaque: icon.opaque });
    const png = encodePng({ width: icon.size, height: icon.size, rgba });
    fs.writeFileSync(path.join(dir, icon.file), png);
    console.log(`${icon.file}: ${icon.size}×${icon.size}, ${png.length} byte`);
  }
  console.log('Husk: bump ICON_VERSION i src/middleware.js hvis ikonene er endret.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
