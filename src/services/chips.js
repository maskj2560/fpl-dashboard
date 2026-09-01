// Chip-planleggeren (v1.9.0): rene funksjoner over sesongens kampprogram.
// Ingen nettverk, ingen AI — alt regnes fra bootstrap (teams, chips, events),
// fixtures/ (hele sesongen) og troppens klubbfordeling.

/** FPL-navnene slik de står i entry-history `chips[].name`. */
export const CHIPS = ['bboost', '3xc', 'freehit', 'wildcard'];

export const CHIP_LABELS = {
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
  freehit: 'Free Hit',
  wildcard: 'Wildcard',
};

const isGw = (n) => Number.isInteger(n) && n >= 1 && n <= 38;

/**
 * Chip-halvdelene. Siden 2024/25 gir FPL ett sett chips per halvdel, og
 * bootstrap `chips[]` bærer `start_event`/`stop_event` per chip. Halvdelene
 * er de distinkte (start, stop)-parene sortert på start. Uten gyldige
 * felter: 1–19 og 20–38.
 */
export function chipHalves(bootstrapChips, lastGw = 38) {
  const ranges = new Map();
  for (const c of Array.isArray(bootstrapChips) ? bootstrapChips : []) {
    if (!isGw(c?.start_event) || !isGw(c?.stop_event) || c.stop_event < c.start_event) continue;
    ranges.set(`${c.start_event}-${c.stop_event}`, { from: c.start_event, to: c.stop_event });
  }
  const list = [...ranges.values()].sort((a, b) => a.from - b.from);
  if (list.length === 0) {
    const mid = Math.floor(lastGw / 2);
    return [
      { half: 1, from: 1, to: mid },
      { half: 2, from: mid + 1, to: lastGw },
    ];
  }
  return list.map((r, i) => ({ half: i + 1, ...r }));
}

/**
 * Dobbel- og blankrunder i [fromGw, toGw] fra fixtureGrid-en. En runde
 * teller bare når minst ett lag har kamp der — runder FPL ikke har satt
 * opp ennå er ikke «blanke» for alle.
 */
export function specialGws(grid, teams, fromGw, toGw) {
  const dgw = [];
  const bgw = [];
  for (let gw = fromGw; gw <= toGw; gw++) {
    const counts = teams.map((t) => [t, grid.get(t.id)?.get(gw)?.length ?? 0]);
    if (!counts.some(([, n]) => n > 0)) continue;
    const doubles = counts.filter(([, n]) => n >= 2).map(([t]) => t.short_name);
    const blanks = counts.filter(([, n]) => n === 0).map(([t]) => t.short_name);
    if (doubles.length) dgw.push({ gw, teams: doubles });
    if (blanks.length) bgw.push({ gw, teams: blanks });
  }
  return { dgw, bgw };
}
