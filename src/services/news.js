// RSS-nyheter (gratis) + valgfri AI-oppsummering via ai.js.
import { XMLParser } from 'fast-xml-parser';
import config from '../config.js';
import { getOrFetch } from './cache.js';
import * as ai from './ai.js';

const DEFAULT_FEEDS = [
  'https://feeds.bbci.co.uk/sport/football/rss.xml',
  'https://www.skysports.com/rss/12040',
];

const MIN = 60_000;
const parser = new XMLParser({ ignoreAttributes: false });

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fpl-dashboard/1.0 (RSS-leser)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Feed ${url} svarte ${res.status}`);
  const xml = parser.parse(await res.text());
  return parseFeedItems(xml?.rss?.channel, url);
}

/**
 * Plukker sakene ut av en RSS-kanal. En uparsebar `pubDate` gir `published:
 * null` — kaster vi her, forkaster Promise.allSettled hele feeden, og én rar
 * dato ville tømt nyhetslisten stille.
 */
export function parseFeedItems(channel, url) {
  if (!channel) return [];
  const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
  return items.map((i) => {
    const date = i.pubDate ? new Date(i.pubDate) : null;
    return {
      title: String(i.title ?? ''),
      link: String(i.link ?? ''),
      description: String(i.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
      published: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      source: String(channel.title ?? url),
    };
  });
}

export function getNewsItems() {
  const feeds = config.newsFeeds.length ? config.newsFeeds : DEFAULT_FEEDS;
  return getOrFetch(
    'news-items',
    async () => {
      const results = await Promise.allSettled(feeds.map(fetchFeed));
      const sorted = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .sort((a, b) => new Date(b.published ?? 0) - new Date(a.published ?? 0));
      return dedupeNewsItems(sorted).slice(0, 25);
    },
    { ttl: 15 * MIN },
  );
}

export function buildNewsPrompt(items) {
  const lines = items
    .slice(0, 15)
    .map((i) => `- ${i.title}${i.description ? ` — ${i.description}` : ''}`);
  return `Her er dagens fotballnyheter fra britiske kilder:\n\n${lines.join('\n')}\n\nOppsummer det som er relevant for Fantasy Premier League på norsk, som maks 8 korte punkter. Start hvert punkt med «- ». Sett spillernavn i fet med **navn**. Fokuser på skader, form, overganger og startplass-nytt. Bruk kun personer, klubber og hendelser som står i sakene over — ingen overgangstype, beløp, kontraktslengde eller andre detaljer som ikke er nevnt der. Er du usikker på et navn, utelat punktet. Ingen innledning eller avslutning — kun punktene.`;
}

export const NEWS_CACHE_KEY = 'news-summary';

// Hvor gammel oppsummeringen får bli før refresh.js lager en ny. Bor her
// (ikke i refresh.js) så både tikket og /nyheter-ruta leser samme fasit.
export const NEWS_MAX_AGE_MS = 6 * 60 * MIN;

/** Når neste AI-oppsummering tidligst kommer — null når ingen er laget. */
export function nextSummaryUpdateAt(generatedAt) {
  return generatedAt == null ? null : generatedAt + NEWS_MAX_AGE_MS;
}

const newsSummaryRequest = (items) => ({
  cacheKey: NEWS_CACHE_KEY,
  minIntervalMs: 30 * MIN,
  system: 'Du er en norsk Fantasy Premier League-ekspert. Svar kort og presist.',
  prompt: buildNewsPrompt(items),
  maxTokens: 2000,
});

/**
 * Sakene + oppsummeringen slik en sidevisning skal lese dem: RSS hentes som
 * før (billig og raskt), men AI-teksten tas KUN fra cachen. Uten cachet tekst
 * vises den rå feed-lista. Oppfriskingen gjøres av refresh.js på timer —
 * ellers ville forsiden og /nyheter ventet på en Claude-rundtur.
 */
export async function getNews() {
  const items = await getNewsItems();
  const summary = items.length > 0 ? ai.getCached(NEWS_CACHE_KEY) : null;
  const points = filterSummaryPoints(summaryPoints(summary), items);
  return { items, summary, points };
}

/** Genererer nyhetsoppsummeringen. Kalles kun av refresh.js. */
export async function refreshNewsSummary() {
  if (!ai.isEnabled()) return null;
  const items = await getNewsItems();
  if (items.length === 0) return null;
  return ai.generate(newsSummaryRequest(items));
}

/** '- **Haaland** er tilbake' → [{html-sikre segmenter}] gjøres i view; her: del i punkter. */
export function summaryPoints(summary) {
  if (!summary?.text) return [];
  return summary.text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}
// --- P1-6: RSS-duplikater --------------------------------------------------
// De samme sakene dukker opp flere ganger, dels fra to feeder, dels fra samme
// feed med ulike sporingsparametre i lenken.

const TRACKING = /^(utm_|at_|ns_|cmp$|CMP$)/;

/** Lenke uten hash og sporingsparametre, uten skråstrek til slutt. */
export function normalizeLink(link) {
  if (!link) return '';
  try {
    const url = new URL(link);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/+$/, '').toLowerCase();
  } catch {
    return link.trim().replace(/\/+$/, '').toLowerCase();
  }
}

const normalizeTitle = (title) => String(title ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Fjerner gjentakelser av samme sak. Første forekomst (nyeste) beholdes. */
export function dedupeNewsItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const link = normalizeLink(item.link);
    const title = normalizeTitle(item.title);
    if ((link && seen.has(`l:${link}`)) || (title && seen.has(`t:${title}`))) continue;
    if (link) seen.add(`l:${link}`);
    if (title) seen.add(`t:${title}`);
    out.push(item);
  }
  return out;
}

// --- P1-5: etterkontroll av AI-punktene ------------------------------------
// Modellen la til detaljer som ikke sto i sakene (overgangstype, beløp,
// kontraktslengde) og navn som ikke forekom noe sted. Et punkt beholdes bare
// når det deler minst ett egennavn med en av sakene som faktisk vises.

// Vanlige norske ord som også skrives med stor forbokstav i starten av en
// setning — de sier ingenting om hvilken sak punktet bygger på.
const NOT_A_NAME = new Set([
  'Han', 'Hun', 'Hans', 'Hennes', 'De', 'Den', 'Det', 'Dette', 'Disse', 'Der',
  'Etter', 'Før', 'Ingen', 'Flere', 'Ny', 'Nye', 'Mange', 'Ifølge', 'Ventes',
  'Ute', 'Inne', 'Sjekk', 'Vurder', 'Merk', 'Bekreftet', 'Usikker', 'Skadet',
  'Tilbake', 'Klar', 'Fortsatt', 'Ingenting', 'Både', 'Samtidig', 'Men', 'Og',
]);

/** Egennavnene i en tekst: **fet**-markerte navn og ord med stor forbokstav. */
export function properNames(text) {
  const bold = [...String(text).matchAll(/\*\*(.+?)\*\*/g)].flatMap((m) => m[1].split(/\s+/));
  const capitalised = String(text).match(/\p{Lu}[\p{L}'’-]{2,}/gu) ?? [];
  return [...new Set([...bold, ...capitalised])]
    .map((w) => w.replace(/[^\p{L}'’-]/gu, ''))
    .filter((w) => w.length > 2 && !NOT_A_NAME.has(w));
}

/** Navnet i småbokstaver + varianten uten genitiv-s («haalands» → «haaland»). */
function nameVariants(name) {
  const n = name.toLowerCase();
  const stripped = n.replace(/(?:['’]s|['’]|s)$/u, '');
  return stripped !== n && stripped.length > 2 ? [n, stripped] : [n];
}

/**
 * Beholder bare punkter som er etterprøvbare mot sakene på siden: minst ett
 * egennavn i punktet må forekomme i en tittel eller ingress. Punkter uten
 * egennavn er ikke etterprøvbare og forkastes også.
 */
export function filterSummaryPoints(points, items) {
  if (!items?.length) return points;
  const corpus = items.map((i) => `${i.title} ${i.description ?? ''}`).join(' ').toLowerCase();
  const dropped = [];
  const kept = points.filter((point) => {
    const names = properNames(point);
    if (names.some((n) => nameVariants(n).some((v) => corpus.includes(v)))) return true;
    dropped.push(point);
    return false;
  });
  if (dropped.length) {
    console.warn('Nyhetsoppsummering: forkastet %d punkt uten kilde:', dropped.length, dropped);
  }
  return kept;
}
