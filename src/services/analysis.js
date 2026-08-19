// Ren forretningslogikk: tar FPL-data inn, returnerer resultater.
// Ingen nettverkskall, ingen sideeffekter — full testdekning i test/.

export const POSITIONS = Object.freeze({
  1: 'Keeper',
  2: 'Forsvar',
  3: 'Midtbane',
  4: 'Angrep',
});

export const POSITIONS_SHORT = Object.freeze({ 1: 'K', 2: 'F', 3: 'M', 4: 'A' });

export function nextEvent(events) {
  return events.find((e) => e.is_next) ?? null;
}

export function currentEvent(events) {
  return events.find((e) => e.is_current) ?? null;
}

/** Pris i tideler → «5.5» (£m). */
export function formatPrice(nowCost) {
  return (nowCost / 10).toFixed(1);
}

function ownership(p) {
  return parseFloat(p.selected_by_percent) || 0;
}

/**
 * Spillere med skade-/suspensjonsnytt eller redusert sjanse for spilletid,
 * sortert på eierandel (mest eide først) — «ukens flagg».
 */
export function flaggedPlayers(elements, limit = 10) {
  return elements
    .filter(
      (p) =>
        p.status !== 'a' ||
        (p.news && p.news.trim() !== '') ||
        (p.chance_of_playing_next_round != null && p.chance_of_playing_next_round < 100),
    )
    .sort((a, b) => ownership(b) - ownership(a))
    .slice(0, limit);
}

/** Topp N på form. Spillere uten spilletid utelates (form-støy). */
export function topForm(elements, limit = 10) {
  return elements
    .filter((p) => p.minutes > 0)
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
    .slice(0, limit);
}

export function mostTransferredIn(elements, limit = 10) {
  return [...elements]
    .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
    .slice(0, limit);
}

export function mostTransferredOut(elements, limit = 10) {
  return [...elements]
    .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
    .slice(0, limit);
}

/**
 * FDR-matrise: alle lag × `count` gameweeks fra `fromGw` (maks GW 38).
 * Hver celle er en liste av kamper (0 = blank GW, 2 = dobbel GW):
 * { opponent, home, difficulty }. Rader sortert på snitt-difficulty,
 * lettest fixtures først.
 */
export function fdrMatrix(teams, fixtures, fromGw, count = 5) {
  const gameweeks = [];
  for (let gw = fromGw; gw <= Math.min(fromGw + count - 1, 38); gw++) {
    gameweeks.push(gw);
  }

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  // team-id -> gw -> [kamper]
  const perTeam = new Map(teams.map((t) => [t.id, new Map()]));

  for (const f of fixtures) {
    if (f.event == null || !gameweeks.includes(f.event)) continue;
    const home = teamsById.get(f.team_h);
    const away = teamsById.get(f.team_a);
    if (!home || !away) continue;

    addFixture(perTeam, f.team_h, f.event, {
      opponent: away.short_name,
      home: true,
      difficulty: f.team_h_difficulty,
    });
    addFixture(perTeam, f.team_a, f.event, {
      opponent: home.short_name,
      home: false,
      difficulty: f.team_a_difficulty,
    });
  }

  const rows = teams.map((team) => {
    const cells = gameweeks.map((gw) => perTeam.get(team.id).get(gw) ?? []);
    const difficulties = cells.flat().map((c) => c.difficulty);
    const avgDifficulty = difficulties.length
      ? difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length
      : null;
    return { team, cells, avgDifficulty };
  });

  // Lag uten kamper (avg null) nederst; ellers lettest først.
  rows.sort((a, b) => (a.avgDifficulty ?? 99) - (b.avgDifficulty ?? 99));

  return { gameweeks, rows };
}

function addFixture(perTeam, teamId, gw, entry) {
  const byGw = perTeam.get(teamId);
  if (!byGw.has(gw)) byGw.set(gw, []);
  byGw.get(gw).push(entry);
}
