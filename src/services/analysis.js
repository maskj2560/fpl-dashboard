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

/** Snitt-FDR for et lags kamper i [fromGw, fromGw+count). null hvis ingen kamper. */
export function averageFdr(fixtures, teamId, fromGw, count = 3) {
  const diffs = [];
  for (const f of fixtures) {
    if (f.event == null || f.event < fromGw || f.event >= fromGw + count) continue;
    if (f.team_h === teamId) diffs.push(f.team_h_difficulty);
    else if (f.team_a === teamId) diffs.push(f.team_a_difficulty);
  }
  if (diffs.length === 0) return null;
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
}

/** Sannsynlighet (0–1) for at spilleren får spilletid neste runde. */
export function playProbability(p) {
  if (p.chance_of_playing_next_round != null) return p.chance_of_playing_next_round / 100;
  return p.status === 'a' || p.status === 'd' ? 1 : 0;
}

/**
 * Kapteinsforslag: score = form × fixture-lettehet (6 − snitt-FDR) × spilletidssannsynlighet.
 * Keepere utelates. Returnerer topp `limit` med begrunnelser.
 */
export function captainSuggestions(squad, fixtures, fromGw, limit = 3) {
  return squad
    .filter((p) => p.element_type !== 1)
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 1);
      const ease = 6 - (avgFdr ?? 3.5);
      const probability = playProbability(p);
      const score = (parseFloat(p.form) || 0) * ease * probability;
      const reasons = [
        `Form ${p.form}`,
        avgFdr == null ? 'Ingen kamp funnet' : `FDR ${avgFdr.toFixed(1)} neste kamp`,
        probability < 1 ? `Spilletid ${(probability * 100).toFixed(0)} %` : 'Full spilletid ventet',
      ];
      return { player: p, score, avgFdr, probability, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Spillere i troppen som bør vurderes solgt, med begrunnelser. */
export function transferOutCandidates(squad, fixtures, fromGw) {
  return squad
    .map((p) => {
      const reasons = [];
      const probability = playProbability(p);
      if (p.status !== 'a' || probability < 0.75) {
        reasons.push(p.news?.trim() ? `Skadet/usikker: ${p.news}` : 'Skadet/usikker eller lav spilletidssjanse');
      }
      const form = parseFloat(p.form) || 0;
      if (form < 2.5 && p.minutes > 0) reasons.push(`Lav form (${p.form})`);
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 3);
      if (avgFdr != null && avgFdr >= 4) reasons.push(`Tøff fixture-run (snitt-FDR ${avgFdr.toFixed(1)} neste 3)`);
      return { player: p, reasons };
    })
    .filter((c) => c.reasons.length > 0);
}

/**
 * Beste erstattere: samme posisjon, ikke i troppen, pris ≤ utgående + bank,
 * ventet spilletid, har spilt. Score = form × fixture-lettehet + poeng per pris.
 */
export function transferInCandidates(outPlayer, elements, squadIds, bankTenths, fixtures, fromGw, limit = 3) {
  const budget = outPlayer.now_cost + bankTenths;
  return elements
    .filter(
      (p) =>
        p.element_type === outPlayer.element_type &&
        !squadIds.has(p.id) &&
        p.now_cost <= budget &&
        p.minutes > 0 &&
        playProbability(p) >= 0.75,
    )
    .map((p) => {
      const avgFdr = averageFdr(fixtures, p.team, fromGw, 3);
      const ease = 6 - (avgFdr ?? 3.5);
      const score = (parseFloat(p.form) || 0) * ease + (p.total_points / p.now_cost) * 2;
      return { player: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** SVG-polyline for overall rank per GW. Lavere rank = bedre = høyere i grafen. */
export function rankGraph(historyCurrent, width = 600, height = 140) {
  const ranks = historyCurrent.filter((h) => h.overall_rank != null);
  if (ranks.length === 0) return null;
  const values = ranks.map((h) => h.overall_rank);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = ranks.length > 1 ? width / (ranks.length - 1) : 0;
  const points = ranks
    .map((h, i) => {
      const x = Math.round(i * stepX);
      // Uten spredning (én GW, eller lik rank hele veien) tegnes linjen midt i feltet.
      const y = span === 0 ? Math.round(height / 2) : Math.round(((h.overall_rank - min) / span) * height);
      return `${x},${y}`;
    })
    .join(' ');
  return { points, min, max, first: values[0], last: values[values.length - 1] };
}

/**
 * Bonusestimat fra BPS i en pågående kamp. Topp 3 BPS får 3/2/1.
 * Likhet deler plassen etter FPL-reglene (3,3→1 · 3,2,2 · 3,3,3 · 3,2,1,1).
 */
export function estimateBonus(fixture) {
  const result = new Map();
  const bpsStat = fixture.stats?.find((s) => s.identifier === 'bps');
  if (!bpsStat) return result;
  const all = [...(bpsStat.h ?? []), ...(bpsStat.a ?? [])]
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  if (all.length === 0) return result;

  const awards = [3, 2, 1];
  let index = 0;
  let awardSlot = 0;
  while (index < all.length && awardSlot < 3) {
    const tied = all.filter((e) => e.value === all[index].value);
    const award = awards[awardSlot];
    for (const e of tied) result.set(e.element, award);
    awardSlot += tied.length;
    index += tied.length;
  }
  return result;
}

/** Differensialer: spillere rivalen har som jeg mangler («theirs») og omvendt («mine»). */
export function differentials(myIds, rivalIds, elements) {
  const byOwnership = (a, b) =>
    (parseFloat(b.selected_by_percent) || 0) - (parseFloat(a.selected_by_percent) || 0);
  return {
    theirs: elements.filter((p) => rivalIds.has(p.id) && !myIds.has(p.id)).sort(byOwnership),
    mine: elements.filter((p) => myIds.has(p.id) && !rivalIds.has(p.id)).sort(byOwnership),
  };
}
