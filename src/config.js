// Leser .env (hvis den finnes) og eksporterer validert, frosset config.
import { readFileSync } from 'node:fs';

try {
  process.loadEnvFile();
} catch {
  // Ingen .env — helt ok, i prod settes variabler i miljøet (Coolify).
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value != null ? n : fallback;
}

function toList(value) {
  return value
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
}

// TZ må settes før første Date-bruk for at norsk tid skal vises riktig.
if (!process.env.TZ) process.env.TZ = 'Europe/Oslo';

const fplTeamId = toNumber(process.env.FPL_TEAM_ID, null);

// Appens versjon (package.json) — vises i footeren og merker den persisterte
// AI-cachen (v1.15.0): en annen versjon har kanskje andre prompter.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const config = Object.freeze({
  version,
  port: toNumber(process.env.PORT, 3000),
  fplTeamId,
  hasTeamId: fplTeamId != null && fplTeamId > 0,
  leagueIds: toList(process.env.LEAGUE_IDS)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0),
  newsFeeds: toList(process.env.NEWS_FEEDS),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  aiModel: process.env.AI_MODEL || 'claude-sonnet-5',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
  briefHoursBeforeDeadline: toNumber(process.env.BRIEF_HOURS_BEFORE_DEADLINE, 24),
  // Lagsjekken (v1.9.0): Discord-melding kun ved funn, X timer før deadline.
  deadlineCheckHoursBefore: toNumber(process.env.DEADLINE_CHECK_HOURS_BEFORE, 3),
  // Mappe for tilstand som skal overleve omstart (auto-briefens markør).
  // I prod er dette et persistent volum på /app/data.
  dataDir: process.env.DATA_DIR || 'data',
  tz: process.env.TZ,
});

export default config;
