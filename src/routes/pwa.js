// PWA (v1.12.0): GET /sw.js (service worker med ekte asset-hash, no-store —
// nettleseren henter alltid fersk kilde, og cache-navnet følger deployen) og
// GET /offline (frakoblet-siden SW-en precacher). Ingen FPL-kall, 0 AI-kall.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const swPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pwa', 'sw.js');

/** Handler-fabrikk: kilden leses én gang ved oppstart, plassholderen byttes. */
export function createSwHandler({ assetVersion, source = fs.readFileSync(swPath, 'utf8') }) {
  const body = source.replaceAll('__ASSET_VERSION__', String(assetVersion));
  return (req, res) => {
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.send(body);
  };
}

/** Frakoblet-siden. no-store mot HTTP-cachen; SW-ens Cache API lagrer den likevel. */
export function offlineHandler(req, res) {
  res.set({ 'Cache-Control': 'no-store' });
  res.renderPage('offline', { title: 'Frakoblet' });
}
