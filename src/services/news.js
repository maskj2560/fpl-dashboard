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
  const channel = xml?.rss?.channel;
  if (!channel) return [];
  const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);
  return items.map((i) => ({
    title: String(i.title ?? ''),
    link: String(i.link ?? ''),
    description: String(i.description ?? '').replace(/<[^>]*>/g, '').slice(0, 300),
    published: i.pubDate ? new Date(i.pubDate).toISOString() : null,
    source: String(channel.title ?? url),
  }));
}

export function getNewsItems() {
  const feeds = config.newsFeeds.length ? config.newsFeeds : DEFAULT_FEEDS;
  return getOrFetch(
    'news-items',
    async () => {
      const results = await Promise.allSettled(feeds.map(fetchFeed));
      return results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .sort((a, b) => new Date(b.published ?? 0) - new Date(a.published ?? 0))
        .slice(0, 25);
    },
    { ttl: 15 * MIN },
  );
}

export function buildNewsPrompt(items) {
  const lines = items
    .slice(0, 15)
    .map((i) => `- ${i.title}${i.description ? ` — ${i.description}` : ''}`);
  return `Her er dagens fotballnyheter fra britiske kilder:\n\n${lines.join('\n')}\n\nOppsummer det som er relevant for Fantasy Premier League på norsk, som maks 8 korte punkter. Start hvert punkt med «- ». Sett spillernavn i fet med **navn**. Fokuser på skader, form, overganger og startplass-nytt. Ingen innledning eller avslutning — kun punktene.`;
}

export async function getNews() {
  const items = await getNewsItems();
  let summary = null;
  if (ai.isEnabled() && items.length > 0) {
    summary = await ai.generate({
      cacheKey: 'news-summary',
      minIntervalMs: 30 * MIN,
      system: 'Du er en norsk Fantasy Premier League-ekspert. Svar kort og presist.',
      prompt: buildNewsPrompt(items),
      maxTokens: 2000,
    });
  }
  return { items, summary };
}

/** '- **Haaland** er tilbake' → [{html-sikre segmenter}] gjøres i view; her: del i punkter. */
export function summaryPoints(summary) {
  if (!summary?.text) return [];
  return summary.text
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}
