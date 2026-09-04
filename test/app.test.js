// Rute-tester (v1.13.1): hele stacken på loopback mot en falsk FPL-verden.
// Miljøet settes FØR enhver import fra src/ — config.js fryser konfigurasjonen
// ved første import, og `process.loadEnvFile()` overskriver ikke variabler som
// allerede finnes i process.env. Derfor er alle src/-importer dynamiske.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpl-app-test-'));

process.env.FPL_TEAM_ID = '42';
process.env.LEAGUE_IDS = '';
process.env.NEWS_FEEDS = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.DISCORD_WEBHOOK_URL = '';
process.env.DATA_DIR = dataDir;

let createApp;

before(async () => {
  ({ createApp } = await import('../src/app.js'));
});

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {});

test('createApp() er en fabrikk som bygger appen uten å lytte', () => {
  assert.equal(typeof createApp, 'function');
});
