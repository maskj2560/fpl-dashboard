// Liga-innsikt (v1.6.0): rene analysefunksjoner for /liga — ligaintern
// rank per runde, flerserie-graf, rival-radar og kaptein-liga.
// Ingen nettverkskall her utenom assemble-funksjonene, som kun bruker
// fplClient. Se docs/plan-liga-v160.md.

/** Maks antall managere som analyseres (side 1 av standings kuttes hit). */
export const MAX_MANAGERS = 20;

/**
 * Ligaintern plassering per runde, rekonstruert fra hver managers
 * entry-history: sortér kumulativ total per runde, likhet → lavest
 * entry-id. Manager uten historikkrad for en runde får null (hull i
 * serien, ikke 0 poeng).
 *
 * @param {object} p
 * @param {Array} p.results standings.results (alt kuttet til MAX_MANAGERS)
 * @param {Map<number, Array>} p.histories entry → history.current-rader
 * @param {number} p.maxGw siste ferdige runde
 * @returns {{gws: number[], series: Array}|null} null uten ferdige runder
 */
export function leagueRanksByGw({ results, histories, maxGw }) {
  if (!Array.isArray(results) || results.length === 0 || !maxGw || maxGw < 1) return null;

  const gws = [];
  for (let gw = 1; gw <= maxGw; gw++) gws.push(gw);

  const totalByEntryGw = new Map();
  for (const r of results) {
    const rows = histories?.get(r.entry) ?? [];
    const byGw = new Map();
    for (const row of rows) {
      if (row?.event >= 1 && row.event <= maxGw && Number.isFinite(row.total_points)) {
        byGw.set(row.event, row.total_points);
      }
    }
    totalByEntryGw.set(r.entry, byGw);
  }

  // Rank per runde: alle med data den runden, total desc, likhet → lavest entry.
  const rankByGwEntry = new Map();
  for (const gw of gws) {
    const contenders = results
      .filter((r) => totalByEntryGw.get(r.entry).has(gw))
      .map((r) => ({ entry: r.entry, total: totalByEntryGw.get(r.entry).get(gw) }))
      .sort((a, b) => b.total - a.total || a.entry - b.entry);
    contenders.forEach((c, i) => rankByGwEntry.set(`${gw}:${c.entry}`, i + 1));
  }

  const series = results.map((r) => ({
    entry: r.entry,
    entryName: r.entry_name ?? '',
    playerName: r.player_name ?? '',
    points: gws.map((gw) => {
      const total = totalByEntryGw.get(r.entry).get(gw);
      if (total === undefined) return null;
      return { gw, total, rank: rankByGwEntry.get(`${gw}:${r.entry}`) };
    }),
  }));

  return { gws, series };
}

/**
 * Flerserie-SVG-grunnlag fra leagueRanksByGw: polylinje-punkter per
 * manager. rank 1 = y 0 (øverst). me/rival legges SIST i arrayen så de
 * tegnes over de andre. Én runde → single (viewet tegner punkter).
 */
export function buildLeagueGraph({ ranks, myEntry, rivalEntry = null, width = 600, height = 140 }) {
  if (!ranks || !Array.isArray(ranks.series) || ranks.series.length === 0) return null;

  const managers = ranks.series.length;
  const n = ranks.gws.length;
  const single = n === 1;
  const stepX = single ? 0 : width / (n - 1);
  const xAt = (i) => (single ? width / 2 : Math.round(i * stepX));
  const yAt = (rank) => (managers === 1 ? 0 : Math.round(((rank - 1) / (managers - 1)) * height));

  const series = ranks.series.map((s) => {
    const pts = [];
    let lastRank = null;
    s.points.forEach((p, i) => {
      if (!p) return;
      pts.push(`${xAt(i)},${yAt(p.rank)}`);
      lastRank = p.rank;
    });
    return {
      entry: s.entry,
      name: s.entryName || s.playerName,
      points: pts.join(' '),
      me: s.entry === myEntry,
      rival: rivalEntry !== null && s.entry === rivalEntry,
      lastRank,
    };
  });

  // Øvrige først (original rekkefølge), så rival, meg aller sist.
  series.sort((a, b) => (a.me ? 2 : a.rival ? 1 : 0) - (b.me ? 2 : b.rival ? 1 : 0));

  return {
    width,
    height,
    gwFirst: ranks.gws[0],
    gwLast: ranks.gws[n - 1],
    managers,
    single,
    series,
  };
}
