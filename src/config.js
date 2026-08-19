// Leser .env (hvis den finnes) og eksporterer validert, frosset config.
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

const config = Object.freeze({
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
  tz: process.env.TZ,
});

export default config;
