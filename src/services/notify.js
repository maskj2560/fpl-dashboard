// Sender gameweek-briefen til Discord-webhook X timer før deadline.
// Enkel deadline-scheduler uten cron-avhengighet: sjekker hver 6. time og
// setter en presis timer når send-tidspunktet er innenfor vinduet.
import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import { getBootstrap } from './fplClient.js';
import { nextEvent } from './analysis.js';
import { assembleBrief, generateAiBrief } from './brief.js';
import { assembleDeadlineCheck, deadlineCheckText } from './deadline.js';
import * as ai from './ai.js';
import { buildLeagueReportPrompt } from './prompts.js';
import { assembleLeagueReportData } from './league-insights.js';
import { resolveLeagueIds } from './leagues.js';

const CHECK_INTERVAL = 6 * 60 * 60_000;
// Sender ikke mer enn 15 min etter planlagt tid. `lastSentEvent` speiles til
// DATA_DIR/brief-state.json og lastes ved oppstart, så en redeploy innenfor
// vinduet kan ikke re-poste briefen. Uten skrivbar mappe faller vi tilbake til
// ren minne-oppførsel, og loggen sier fra når et sent tilfelle inntreffer.
const MAX_LATE_MS = 15 * 60_000;
let timer = null;
let interval = null;
let lastSentEvent = null;
let sending = false;

// «Rundens rapport» (v1.6.0): én melding etter rundeslutt. Markør OG tekst
// persisteres til DATA_DIR/report-state.json så webvisningen på /liga
// overlever redeploy og rapporten aldri dobbel-postes.
let reportState = null;
let reporting = false;

// «Lagsjekk» (v1.9.0): X timer før deadline, Discord kun ved funn. Markøren
// (DATA_DIR/check-state.json) settes uansett funn, så en ren tropp ikke
// sjekkes på nytt hver 6. time.
let lastCheckedEvent = null;
let checkTimer = null;
let checking = false;

// Markøren overlever redeploy: uten den re-poster en deploy innenfor
// 15-min-vinduet briefen til Discord (P1-5b). Fila ligger i DATA_DIR (volum
// i prod); mangler den eller er den uskrivbar, oppfører appen seg som før —
// aldri krasj.
const stateFile = () => path.join(config.dataDir, 'brief-state.json');

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    return Number.isInteger(raw.lastSentEvent) ? raw.lastSentEvent : null;
  } catch {
    return null;
  }
}

function saveState(eventId) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify({ lastSentEvent: eventId }));
}

function persistState(eventId) {
  try {
    (hooks.saveState ?? saveState)(eventId);
  } catch (err) {
    console.error('Klarte ikke å lagre brief-markøren:', err.message);
  }
}

const checkFile = () => path.join(config.dataDir, 'check-state.json');

function loadCheckState() {
  try {
    const raw = JSON.parse(fs.readFileSync(checkFile(), 'utf8'));
    return Number.isInteger(raw.lastCheckedEvent) ? raw.lastCheckedEvent : null;
  } catch {
    return null;
  }
}

function saveCheckState(eventId) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(checkFile(), JSON.stringify({ lastCheckedEvent: eventId }));
}

function persistCheckState(eventId) {
  try {
    (hooks.saveCheck ?? saveCheckState)(eventId);
  } catch (err) {
    console.error('Klarte ikke å lagre lagsjekk-markøren:', err.message);
  }
}

const reportFile = () => path.join(config.dataDir, 'report-state.json');

function loadReportState() {
  try {
    const raw = JSON.parse(fs.readFileSync(reportFile(), 'utf8'));
    if (!Number.isInteger(raw.lastReportedEvent) || typeof raw.text !== 'string') return null;
    return {
      lastReportedEvent: raw.lastReportedEvent,
      text: raw.text,
      generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : null,
      source: raw.source === 'ai' ? 'ai' : 'data',
    };
  } catch {
    return null;
  }
}

function saveReportState(state) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(reportFile(), JSON.stringify(state));
}

function persistReportState(state) {
  try {
    (hooks.saveReport ?? saveReportState)(state);
  } catch (err) {
    console.error('Klarte ikke å lagre rapport-markøren:', err.message);
  }
}

/** Leser markørene fra disk. Kalles av startScheduler og av testene. */
export function _initState() {
  lastSentEvent = (hooks.loadState ?? loadState)();
  if (lastSentEvent != null) {
    console.log(`Brief-markør lastet: runde ${lastSentEvent} er alt sendt`);
  }
  reportState = (hooks.loadReport ?? loadReportState)();
  if (reportState != null) {
    console.log(`Rapport-markør lastet: runde ${reportState.lastReportedEvent} er alt rapportert`);
  }
  lastCheckedEvent = (hooks.loadCheck ?? loadCheckState)();
  if (lastCheckedEvent != null) {
    console.log(`Lagsjekk-markør lastet: runde ${lastCheckedEvent} er alt sjekket`);
  }
}

/**
 * Ren beslutning om auto-brief: vent, planlegg timer, eller hopp over.
 * `lateMs` er hvor lenge siden sendetidspunktet passerte (0 om det er i framtiden).
 */
export function sendDecision({ deadlineTime, hoursBefore, nowMs, checkIntervalMs, maxLateMs = MAX_LATE_MS }) {
  const sendAt = new Date(deadlineTime).getTime() - hoursBefore * 60 * 60_000;
  const delayMs = sendAt - nowMs;
  const lateMs = Math.max(-delayMs, 0);
  if (delayMs > checkIntervalMs) return { action: 'wait', delayMs, lateMs };
  if (delayMs < -maxLateMs) return { action: 'skip', delayMs, lateMs };
  return { action: 'schedule', delayMs: Math.max(delayMs, 0), lateMs };
}

export function startScheduler() {
  const briefActive = Boolean(config.discordWebhookUrl);
  // Rapporten genereres også uten webhook (webvisningen på /liga), men
  // krever da AI. Helt uten begge er scheduleren død som før.
  const reportActive = briefActive || ai.isEnabled();
  if (!reportActive) return;
  _initState();
  const tick = () => {
    if (briefActive) check();
    if (briefActive) checkDeadline();
    checkReport();
  };
  tick();
  interval = setInterval(tick, CHECK_INTERVAL);
  interval.unref?.();
  if (briefActive) {
    console.log(`Auto-brief aktiv: sender ${config.briefHoursBeforeDeadline} t før deadline`);
    console.log(`Lagsjekk aktiv: sjekker ${config.deadlineCheckHoursBefore} t før deadline, poster kun ved funn`);
  }
  console.log(`Rundens rapport aktiv: ${briefActive ? 'Discord + web' : 'kun web'}`);
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
      persistState(upcoming.id);
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
    persistState(event.id);
    console.log(`Auto-brief sendt for ${event.name}`);
  } catch (err) {
    console.error('Auto-brief-sending feilet:', err.message);
  } finally {
    sending = false;
  }
}

// ---- Lagsjekk (v1.9.0) ----------------------------------------------------

async function checkDeadline() {
  try {
    if (checking) return;
    const { events } = await getBootstrap();
    const upcoming = nextEvent(events);
    if (!upcoming || upcoming.id === lastCheckedEvent) return;
    const hoursBefore = config.deadlineCheckHoursBefore;
    const d = sendDecision({
      deadlineTime: upcoming.deadline_time,
      hoursBefore,
      nowMs: (hooks.now ?? Date.now)(),
      checkIntervalMs: CHECK_INTERVAL,
      // En sen omstart skal fortsatt sjekke — men aldri de siste 15 min før deadline.
      maxLateMs: Math.max(hoursBefore * 60 - 15, 0) * 60_000,
    });
    if (d.action === 'wait') return;
    if (d.action === 'skip') {
      lastCheckedEvent = upcoming.id;
      persistCheckState(upcoming.id);
      console.log(`Lagsjekk hoppet over for ${upcoming.name}: for nær deadline`);
      return;
    }
    if (d.delayMs === 0) {
      await sendCheck(upcoming);
      return;
    }
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => sendCheck(upcoming), d.delayMs);
    checkTimer.unref?.();
  } catch (err) {
    console.error('Lagsjekk feilet:', err.message);
  }
}

async function sendCheck(event) {
  if (checking || event.id === lastCheckedEvent) return;
  checking = true;
  try {
    const result = await (hooks.checkCompose ?? assembleDeadlineCheck)();
    if (result && !result.ok) {
      await (hooks.post ?? postToDiscord)(deadlineCheckText(result, config.deadlineCheckHoursBefore));
      console.log(`Lagsjekk sendt for ${event.name}: ${result.findings.length} funn`);
    } else {
      console.log(`Lagsjekk: alt klart for ${event.name}${result ? '' : ' (intet grunnlag)'}`);
    }
    // Markøren settes uansett funn — feiler Discord, prøver neste tikk igjen.
    lastCheckedEvent = event.id;
    persistCheckState(event.id);
  } catch (err) {
    console.error('Lagsjekk-sending feilet:', err.message);
  } finally {
    checking = false;
  }
}

export const _checkDeadline = checkDeadline;

// ---- Rundens rapport (v1.6.0) --------------------------------------------

export function reportCacheKey(eventId) {
  return `league-report:${eventId}`;
}

/**
 * Ren beslutning: nyeste runde med `finished && data_checked` som er nyere
 * enn markøren. Var serveren nede i to runder rapporteres kun den nyeste —
 * en gammel roast av en glemt runde er støy, ikke innhold.
 */
export function reportDecision({ events, lastReportedEvent }) {
  const done = (events ?? []).filter((e) => e.finished && e.data_checked);
  const newest = done.at(-1);
  if (!newest || (lastReportedEvent != null && newest.id <= lastReportedEvent)) {
    return { action: 'none' };
  }
  return { action: 'report', event: newest };
}

/** Webvisningens kilde: persistert tilstand, aldri et AI-kall. */
export function getLeagueReport() {
  return reportState;
}

/** Fallback uten AI-nøkkel: nøktern datarapport. */
export function dataReportText(data) {
  const lines = [];
  if (data.winner) lines.push(`Rundens vinner: **${data.winner.entryName}** med ${data.winner.eventTotal} poeng.`);
  if (data.loser) lines.push(`Rundens taper: **${data.loser.entryName}** med ${data.loser.eventTotal} poeng.`);
  if (data.mine) {
    const cap = data.mine.captain
      ? ` Kaptein: **${data.mine.captain.name}** (${data.mine.captain.points} p, tapte ${data.mine.captain.lost} mot optimal).`
      : '';
    lines.push(`Mitt lag: ${data.mine.eventTotal} p, nr. ${data.mine.rank}. i ligaen.${cap}`);
  }
  for (const m of data.movers ?? []) lines.push(`${m.entryName}: ${m.from}. → ${m.to}. plass.`);
  return lines.join('\n');
}

/** Henter grunnlaget og skriver teksten. Byttes ut med hooks.reportCompose i tester. */
async function composeReport(event) {
  const leagueIds = await (hooks.leagues ?? resolveLeagueIds)();
  if (leagueIds.length === 0) return null;
  const data = await assembleLeagueReportData({ leagueId: leagueIds[0], event });
  const generated = await ai.generate({
    cacheKey: reportCacheKey(event.id),
    minIntervalMs: 7 * 24 * 60 * 60_000,
    system: 'Du er en vittig norsk Fantasy Premier League-kommentator. Roast med glimt i øyet — aldri ondsinnet.',
    prompt: buildLeagueReportPrompt(data),
    maxTokens: 3000,
  });
  if (generated?.text) return { text: generated.text, source: 'ai' };
  return { text: dataReportText(data), source: 'data' };
}

async function checkReport() {
  if (reporting) return;
  reporting = true;
  try {
    const { events } = await getBootstrap();
    const d = reportDecision({ events, lastReportedEvent: reportState?.lastReportedEvent ?? null });
    if (d.action !== 'report') return;

    const composed = await (hooks.reportCompose ?? composeReport)(d.event);
    if (!composed) return;

    if (hooks.webhook ?? Boolean(config.discordWebhookUrl)) {
      const header = `**Rundens rapport — ${d.event.name}**\nhttps://fpl.marsk.no/liga\n\n`;
      await (hooks.post ?? postToDiscord)(header + composed.text);
    }

    // Markøren settes FØRST etter vellykket post (eller rett etter
    // generering uten webhook): feiler Discord, prøver neste tikk igjen,
    // og ai-cachen (7 døgn per event) gjør retryen gratis.
    reportState = {
      lastReportedEvent: d.event.id,
      text: composed.text,
      generatedAt: new Date().toISOString(),
      source: composed.source,
    };
    persistReportState(reportState);
    console.log(`Rundens rapport klar for ${d.event.name} (${composed.source})`);
  } catch (err) {
    console.error('Rundens rapport feilet:', err.message);
  } finally {
    reporting = false;
  }
}

export const _checkReport = checkReport;

/** Hele Discord-meldingen: AI-briefen når den finnes, ellers data-briefen. */
async function composeMessage() {
  const brief = await assembleBrief();
  const text = (await generateAiBrief(brief))?.text || dataBriefText(brief);

  const header = `**Rundebrief — ${brief.gameweek?.name ?? ''}**\nDeadline: ${brief.gameweek?.deadlineFormatted ?? 'ukjent'}\nhttps://fpl.marsk.no/brief\n\n`;
  return header + text;
}

// Test-hooks (samme mønster som _setNow i cache.js): lar send-stien kjøres
// uten nettverk. Aldri satt i produksjon.
const hooks = {
  now: null,
  loadCheck: null,
  saveCheck: null,
  checkCompose: null,
  compose: null,
  post: null,
  loadState: null,
  saveState: null,
  reportCompose: null,
  loadReport: null,
  saveReport: null,
  leagues: null,
  webhook: null,
};

export const _send = send;

export function _setHooks(overrides) {
  Object.assign(hooks, overrides);
}

export function _reset() {
  clearTimeout(timer);
  timer = null;
  clearInterval(interval);
  interval = null;
  lastSentEvent = null;
  sending = false;
  reportState = null;
  reporting = false;
  clearTimeout(checkTimer);
  checkTimer = null;
  lastCheckedEvent = null;
  checking = false;
  for (const key of Object.keys(hooks)) hooks[key] = null;
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
