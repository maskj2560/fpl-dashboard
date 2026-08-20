// Sender gameweek-briefen til Discord-webhook X timer før deadline.
// Enkel deadline-scheduler uten cron-avhengighet: sjekker hver 6. time og
// setter en presis timer når send-tidspunktet er innenfor vinduet.
import config from '../config.js';
import { getBootstrap } from './fplClient.js';
import { nextEvent } from './analysis.js';
import { assembleBrief } from '../routes/brief.js';
import { buildBriefPrompt, sanitizeBriefText } from './prompts.js';
import * as ai from './ai.js';

const CHECK_INTERVAL = 6 * 60 * 60_000;
// Sender ikke mer enn 15 min etter planlagt tid. `lastSentEvent` lever bare i
// minnet, så en redeploy innenfor dette vinduet re-poster briefen. Vinduet er
// holdt kort for å begrense sjansen, og loggen sier fra når det inntreffer.
// Varig løsning krever persistens på tvers av containere — se ROADMAP.
const MAX_LATE_MS = 15 * 60_000;
let timer = null;
let lastSentEvent = null;
let sending = false;

/**
 * Ren beslutning om auto-brief: vent, planlegg timer, eller hopp over.
 * `lateMs` er hvor lenge siden sendetidspunktet passerte (0 om det er i framtiden).
 */
export function sendDecision({ deadlineTime, hoursBefore, nowMs, checkIntervalMs }) {
  const sendAt = new Date(deadlineTime).getTime() - hoursBefore * 60 * 60_000;
  const delayMs = sendAt - nowMs;
  const lateMs = Math.max(-delayMs, 0);
  if (delayMs > checkIntervalMs) return { action: 'wait', delayMs, lateMs };
  if (delayMs < -MAX_LATE_MS) return { action: 'skip', delayMs, lateMs };
  return { action: 'schedule', delayMs: Math.max(delayMs, 0), lateMs };
}

export function startScheduler() {
  if (!config.discordWebhookUrl) return;
  check();
  setInterval(check, CHECK_INTERVAL).unref?.();
  console.log(`Auto-brief aktiv: sender ${config.briefHoursBeforeDeadline} t før deadline`);
}

async function check() {
  try {
    if (sending) return; // en sending pågår — den setter lastSentEvent selv
    const { events } = await getBootstrap();
    const upcoming = nextEvent(events);
    if (!upcoming || upcoming.id === lastSentEvent) return;
    const d = sendDecision({
      deadlineTime: upcoming.deadline_time,
      hoursBefore: config.briefHoursBeforeDeadline,
      nowMs: Date.now(),
      checkIntervalMs: CHECK_INTERVAL,
    });
    if (d.action === 'wait') return; // neste sjekk tar den
    if (d.action === 'skip') {
      // Typisk en deploy/restart i sendevinduet — briefen er alt sendt (eller
      // toget har gått). Marker som håndtert så vi ikke spammer kanalen.
      lastSentEvent = upcoming.id;
      console.log(`Auto-brief hoppet over for ${upcoming.name}: send-tidspunktet er passert`);
      return;
    }
    if (d.lateMs > 0) {
      // Typisk en redeploy rett etter at briefen ble sendt fra forrige
      // container. Da kan meldingen bli en dublett — logg det så det er sporbart.
      console.log(
        `Auto-brief planlagt ved oppstart ${Math.round(d.lateMs / 60_000)} min etter sendetidspunktet for ${upcoming.name}`,
      );
    }
    clearTimeout(timer);
    timer = setTimeout(() => send(upcoming), d.delayMs);
    timer.unref?.();
  } catch (err) {
    console.error('Auto-brief-sjekk feilet:', err.message);
  }
}

async function send(event) {
  // 6-timers-sjekken kan tikke mens en sending pågår: AI-kallet og Discord-
  // posten tar sekunder, og lastSentEvent settes først etterpå. Uten dette
  // flagget slipper begge gjennom guarden og kanalen får to like meldinger.
  if (sending || event.id === lastSentEvent) return;
  sending = true;
  try {
    const message = await (hooks.compose ?? composeMessage)();
    await (hooks.post ?? postToDiscord)(message);
    lastSentEvent = event.id;
    console.log(`Auto-brief sendt for ${event.name}`);
  } catch (err) {
    console.error('Auto-brief-sending feilet:', err.message);
  } finally {
    sending = false;
  }
}

/** Hele Discord-meldingen: AI-briefen når den finnes, ellers data-briefen. */
async function composeMessage() {
  const brief = await assembleBrief();
  let text = null;
  if (ai.isEnabled()) {
    const aiBrief = await ai.generate({
      cacheKey: `ai-brief-gw${brief.gameweek?.id ?? 0}`,
      minIntervalMs: 60 * 60_000,
      system: 'Du er en norsk Fantasy Premier League-ekspert. Skriv presist og handlingsorientert.',
      prompt: buildBriefPrompt(brief),
      maxTokens: 4000,
    });
    text = aiBrief?.text ? sanitizeBriefText(aiBrief.text, brief) : null;
  }
  if (!text) text = dataBriefText(brief);

  const header = `**Rundebrief — ${brief.gameweek?.name ?? ''}**\nDeadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}\nhttps://fpl.marsk.no/brief\n\n`;
  return header + text;
}

// Test-hooks (samme mønster som _setNow i cache.js): lar send-stien kjøres
// uten nettverk. Aldri satt i produksjon.
const hooks = { compose: null, post: null };

export const _send = send;

export function _setHooks(overrides) {
  Object.assign(hooks, overrides);
}

export function _reset() {
  clearTimeout(timer);
  timer = null;
  lastSentEvent = null;
  sending = false;
  hooks.compose = null;
  hooks.post = null;
}

function dataBriefText(brief) {
  const lines = ['**Skadenytt:**'];
  for (const i of brief.injuries.slice(0, 6)) lines.push(`- ${i.name} (${i.team}): ${i.news}`);
  lines.push('', '**Kapteinsvalg:**');
  for (const c of brief.captains) lines.push(`- ${c.name} (${c.team}) — form ${c.form}, eid ${c.ownership} %`);
  return lines.join('\n');
}

/** Deler en linje som er lengre enn taket, helst på ordgrense. */
function splitLongLine(line, max) {
  if (line.length <= max) return [line];
  const parts = [];
  let rest = line;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut <= 0) cut = max; // ett langt ord uten mellomrom
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^ +/, '');
  }
  if (rest) parts.push(rest);
  return parts;
}

/**
 * Deler teksten i meldinger Discord godtar (maks 2000 tegn). Deler primært på
 * linjeskift; en enkeltlinje over taket hard-splittes. Tomme chunks oppstår
 * aldri — Discord avviser dem med 400, og da ville resten av briefen uteblitt.
 */
export function chunkDiscordText(text, max = 1900) {
  const chunks = [];
  let current = '';
  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };
  for (const line of String(text ?? '').split('\n')) {
    for (const piece of splitLongLine(line, max)) {
      if (current && current.length + piece.length + 1 > max) flush();
      current += (current ? '\n' : '') + piece;
    }
  }
  flush();
  return chunks;
}

async function postToDiscord(text) {
  for (const content of chunkDiscordText(text)) {
    const res = await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Discord svarte ${res.status}`);
  }
}
