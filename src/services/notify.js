// Sender gameweek-briefen til Discord-webhook X timer før deadline.
// Enkel deadline-scheduler uten cron-avhengighet: sjekker hver 6. time og
// setter en presis timer når send-tidspunktet er innenfor vinduet.
import config from '../config.js';
import { getBootstrap } from './fplClient.js';
import { nextEvent } from './analysis.js';
import { assembleBrief } from '../routes/brief.js';
import { buildBriefPrompt } from './prompts.js';
import * as ai from './ai.js';

const CHECK_INTERVAL = 6 * 60 * 60_000;
let timer = null;
let lastSentEvent = null;

export function startScheduler() {
  if (!config.discordWebhookUrl) return;
  check();
  setInterval(check, CHECK_INTERVAL).unref?.();
  console.log(`Auto-brief aktiv: sender ${config.briefHoursBeforeDeadline} t før deadline`);
}

async function check() {
  try {
    const { events } = await getBootstrap();
    const upcoming = nextEvent(events);
    if (!upcoming || upcoming.id === lastSentEvent) return;
    const sendAt = new Date(upcoming.deadline_time).getTime() - config.briefHoursBeforeDeadline * 60 * 60_000;
    const delay = sendAt - Date.now();
    if (delay > CHECK_INTERVAL) return; // neste sjekk tar den
    clearTimeout(timer);
    timer = setTimeout(() => send(upcoming), Math.max(delay, 0));
    timer.unref?.();
  } catch (err) {
    console.error('Auto-brief-sjekk feilet:', err.message);
  }
}

async function send(event) {
  try {
    if (event.id === lastSentEvent) return;
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
      text = aiBrief?.text ?? null;
    }
    if (!text) text = dataBriefText(brief);

    const header = `**Gameweek-brief — ${brief.gameweek?.name ?? ''}**\nDeadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}\nhttps://fpl.marsk.no/brief\n\n`;
    await postToDiscord(header + text);
    lastSentEvent = event.id;
    console.log(`Auto-brief sendt for ${event.name}`);
  } catch (err) {
    console.error('Auto-brief-sending feilet:', err.message);
  }
}

function dataBriefText(brief) {
  const lines = ['**Skadenytt:**'];
  for (const i of brief.injuries.slice(0, 6)) lines.push(`- ${i.name} (${i.team}): ${i.news}`);
  lines.push('', '**Kapteinsvalg:**');
  for (const c of brief.captains) lines.push(`- ${c.name} (${c.team}) — form ${c.form}, eid ${c.ownership} %`);
  return lines.join('\n');
}

async function postToDiscord(text) {
  // Discord tillater maks 2000 tegn per melding — del opp på avsnitt.
  const chunks = [];
  let current = '';
  for (const paragraph of text.split('\n')) {
    if (current.length + paragraph.length + 1 > 1900) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + paragraph;
  }
  if (current) chunks.push(current);

  for (const content of chunks) {
    const res = await fetch(config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Discord svarte ${res.status}`);
  }
}
