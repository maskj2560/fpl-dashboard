// Ren forretningslogikk: tar FPL-data inn, returnerer resultater.
// Ingen nettverkskall, ingen sideeffekter — full testdekning i test/.

export const POSITIONS = Object.freeze({
  1: 'Keeper',
  2: 'Forsvar',
  3: 'Midtbane',
  4: 'Angrep',
});

export const POSITIONS_SHORT = Object.freeze({ 1: 'K', 2: 'F', 3: 'M', 4: 'A' });

/** FPL-ens `status`-koder på norsk. Delt av dashbordet og spillerlista. */
export const STATUS_LABELS = Object.freeze({
  a: 'Klar',
  d: 'Usikker',
  i: 'Skadet',
  s: 'Suspendert',
  u: 'Ute',
  n: 'Utilgjengelig',
});

/** Oppslag id → objekt. Brukes på alle bootstrap-listene. */
export function byId(list) {
  return new Map(list.map((x) => [x.id, x]));
}

export function nextEvent(events) {
  return events.find((e) => e.is_next) ?? null;
}

/**
 * Runden vi henter lagdata for: den aktive når den finnes, ellers runden før
 * neste (før sesongstart er neste 1 → 0). Ingen aktiv og ingen neste runde
 * (etter sesongslutt) gir også 0. 0 betyr «ingen runde å hente picks for» —
 * kallstedene gater på `gw >= 1`.
 */
export function resolvedGw(events) {
  const current = currentEvent(events);
  if (current) return current.id;
  const upcoming = nextEvent(events);
  return upcoming ? upcoming.id - 1 : 0;
}

export function currentEvent(events) {
  return events.find((e) => e.is_current) ?? null;
}

/** Pris i tideler → «5.5» (£m). */
export function formatPrice(nowCost) {
  return (nowCost / 10).toFixed(1);
}

/**
 * Kobler picks mot bootstrap-elementene: `[{ pick, player }]`.
 * Picks (5 min TTL) og bootstrap (15 min TTL) kan komme i utakt, og en spiller
 * kan være fjernet fra spillet. Pick-er uten element droppes med en advarsel —
 * resten av troppen vises som normalt i stedet for at siden svarer 500.
 */
export function resolvePicks(picks, elementsById) {
  const resolved = [];
  for (const pick of picks ?? []) {
    const player = elementsById.get(pick.element);
    if (!player) {
      console.warn('Pick-element %d mangler i bootstrap', pick.element);
      continue;
    }
    resolved.push({ pick, player });
  }
  return resolved;
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
// De tre listene under returnerer tom liste når datagrunnlaget er null — før
// sesongstart har alle spillere form 0 og 0 overganger, og en sortering på
// bare nuller ga en vilkårlig «rangering» som så ut som ekte data (QA-funn P1-1).

export function topForm(elements, limit = 10) {
  const ranked = elements
    .filter((p) => p.minutes > 0 && parseFloat(p.form) > 0)
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form));
  return ranked.slice(0, limit);
}

export function mostTransferredIn(elements, limit = 10) {
  return [...elements]
    .filter((p) => p.transfers_in_event > 0)
    .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
    .slice(0, limit);
}

export function mostTransferredOut(elements, limit = 10) {
  return [...elements]
    .filter((p) => p.transfers_out_event > 0)
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

/**
 * Snitt-FDR for ALLE lag i samme vindu, i én gjennomgang av kamplista.
 * averageFdr skanner hele lista per spiller; med hundrevis av kandidater ble
 * det unødvendig mange runder over de samme kampene for 20 lagverdier.
 * Lag uten kamper i vinduet mangler i mappet (samme som averageFdr sin null).
 */
export function teamFdrMap(fixtures, fromGw, count = 3) {
  const sums = new Map(); // teamId -> [sum, antall]
  const add = (teamId, difficulty) => {
    const entry = sums.get(teamId) ?? [0, 0];
    entry[0] += difficulty;
    entry[1] += 1;
    sums.set(teamId, entry);
  };
  for (const f of fixtures) {
    if (f.event == null || f.event < fromGw || f.event >= fromGw + count) continue;
    add(f.team_h, f.team_h_difficulty);
    add(f.team_a, f.team_a_difficulty);
  }
  return new Map([...sums].map(([teamId, [sum, n]]) => [teamId, sum / n]));
}

/** Sannsynlighet (0–1) for at spilleren får spilletid neste runde. */
export function playProbability(p) {
  if (p.chance_of_playing_next_round != null) return p.chance_of_playing_next_round / 100;
  // FPL flagger ofte 'd' (tvilsom) før prosenten publiseres. 0,75 er FPL-ens
  // egen konvensjon for «doubtful» — uten den scorer spilleren som sikker
  // starter, både i kapteinsforslag og i innkjøpsfilteret (≥ 0,75).
  if (p.status === 'd') return 0.75;
  return p.status === 'a' ? 1 : 0;
}

/**
 * Kapteinsforslag: score = form × fixture-lettehet (6 − snitt-FDR) × spilletidssannsynlighet.
 * Keepere utelates. Returnerer topp `limit` med begrunnelser.
 */
export function captainSuggestions(squad, fixtures, fromGw, limit = 3) {
  const fdrByTeam = teamFdrMap(fixtures, fromGw, 1);
  return squad
    .filter((p) => p.element_type !== 1)
    .map((p) => {
      const avgFdr = fdrByTeam.get(p.team) ?? null;
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
  const fdrByTeam = teamFdrMap(fixtures, fromGw, 3);
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
      const ease = 6 - (fdrByTeam.get(p.team) ?? 3.5);
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
  // Lukket polygon for arealfyll under linjen. Ett punkt gir ingen flate.
  const area = ranks.length > 1 ? `${points} ${width},${height} 0,${height}` : null;
  return { points, area, min, max, first: values[0], last: values[values.length - 1] };
}

/**
 * Bonusestimat fra BPS i en pågående kamp. Topp 3 BPS får 3/2/1.
 * Likhet deler plassen etter FPL-reglene (3,3→1 · 3,2,2 · 3,3,3 · 3,2,1,1).
 */
/**
 * Har kampen fått bekreftet bonus? Da ligger poengene allerede i spillerens
 * total_points, og et estimat på toppen ville telt dem to ganger.
 */
export function hasConfirmedBonus(fixture) {
  return (fixture.stats ?? []).some(
    (s) => s.identifier === 'bonus' && (s.h?.length ?? 0) + (s.a?.length ?? 0) > 0,
  );
}

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

// --- P2-2: FPL-ens engelske statustekster på norsk -------------------------
// `news`-feltet fra FPL er alltid engelsk. Resten av grensesnittet er norsk,
// så tekstene oversettes ved visning. Ukjente mønstre vises som de er.

const INJURY_TYPES = {
  achilles: 'Akillesskade',
  ankle: 'Ankelskade',
  arm: 'Armskade',
  back: 'Ryggskade',
  calf: 'Leggskade',
  concussion: 'Hjernerystelse',
  elbow: 'Albueskade',
  finger: 'Fingerskade',
  foot: 'Fotskade',
  groin: 'Lyskeskade',
  hamstring: 'Hamstringskade',
  head: 'Hodeskade',
  heel: 'Hælskade',
  hip: 'Hofteskade',
  illness: 'Sykdom',
  knee: 'Kneskade',
  knock: 'Smell',
  'lack of match fitness': 'Mangler kamptrening',
  leg: 'Beinskade',
  muscle: 'Muskelskade',
  muscular: 'Muskelskade',
  neck: 'Nakkeskade',
  rib: 'Ribbeinsskade',
  shin: 'Skinnebensskade',
  shoulder: 'Skulderskade',
  suspended: 'Utestengt',
  thigh: 'Lårskade',
  toe: 'Tåskade',
  unspecified: 'Uspesifisert skade',
  virus: 'Virussykdom',
  wrist: 'Håndleddsskade',
};

const MONTHS = {
  jan: 'jan.', feb: 'feb.', mar: 'mars', apr: 'april', may: 'mai', jun: 'juni',
  jul: 'juli', aug: 'aug.', sep: 'sep.', oct: 'okt.', nov: 'nov.', dec: 'des.',
};

/** «Ankle injury» → «Ankelskade». Ukjent type gir null. */
function translateType(type) {
  const key = type.toLowerCase().replace(/\s+injury$/, '').trim();
  return INJURY_TYPES[key] ?? null;
}

/** «21 Aug» → «21. aug.» — engelsk kortdato til norsk. */
function translateDate(s) {
  return s.replace(
    /(\d+)\s+([A-Za-z]{3})[a-z]*/,
    (_m, day, mon) => `${day}. ${MONTHS[mon.toLowerCase()] ?? mon}`,
  );
}

/** «Expected back 21 Aug» → «ventes tilbake 21. aug.». Ukjent detalj gir null. */
function translateDetail(detail) {
  const d = detail.trim();
  const chance = d.match(/^(\d+)%\s*chance of playing/i);
  if (chance) return `${chance[1]} % sjanse for spilletid`;
  if (/^unknown/i.test(d)) return 'uavklart';
  const back = d.match(/^expected back\s+(.*)$/i);
  if (back) return `ventes tilbake ${translateDate(back[1])}`;
  return null;
}

// Hver ukjent tekst varsles én gang per prosess — logg, ikke loggspam.
const warnedNews = new Set();

/**
 * Nye engelske fraser skal oppdages der de faktisk dukker opp. Prod ser
 * FPL-ens nye strenger først, så varselet gjelder alle miljøer.
 */
function warnUnmatched(text) {
  if (warnedNews.has(text)) return;
  warnedNews.add(text);
  console.warn(`FPL-news uten oversettelsesmønster: «${text}»`);
}

/**
 * Oversetter FPL-ens `news`-tekst til norsk. Mønstrene dekker alle unike
 * `news`-verdier i bootstrap-static per 2026-08-20:
 * «<type> - <n>% chance of playing», «<type> - Unknown return date»,
 * «<type> - Expected back <dato>», «Has joined <klubb> permanently»,
 * «Has joined <klubb> on loan [until <dato> | for the rest of the season]»,
 * «Loaned to <klubb>», «Suspended until <dato>», «has returned to <klubb>».
 * Ukjente mønstre vises uendret, med console.warn (én gang per tekst).
 */
export function translateFplNews(news) {
  const text = String(news ?? '').trim();
  if (!text) return '';

  const joined = text.match(
    /^Has joined (.+?)(?:\s+(permanently|on loan(?:\s+(?:until\s+.+|for the rest of the season))?))?\.?$/i,
  );
  if (joined) {
    const raw = (joined[2] ?? '').toLowerCase();
    let how = 'permanent';
    if (raw.startsWith('on loan')) {
      const until = raw.match(/until\s+(.+)$/);
      if (until) how = `på lån til ${translateDate(until[1])}`;
      else if (raw.includes('for the rest of the season')) how = 'på lån ut sesongen';
      else how = 'på lån';
    }
    return `Overgang til ${joined[1]} (${how})`;
  }

  const loaned = text.match(/^Loaned (?:out )?to (.+?)\.?$/i);
  if (loaned) return `Lånt ut til ${loaned[1]}`;

  const returned = text.match(/^has returned to (.+?)\.?$/i);
  if (returned) return `Tilbake hos ${returned[1]}`;

  const suspendedUntil = text.match(/^Suspended until\s+(.+?)\.?$/i);
  if (suspendedUntil) return `Utestengt til ${translateDate(suspendedUntil[1])}`;

  const parts = text.split(' - ');
  if (parts.length >= 2) {
    const type = translateType(parts[0]);
    const detail = translateDetail(parts.slice(1).join(' - '));
    if (type == null || detail == null) warnUnmatched(text);
    const typeText = type ?? parts[0].trim();
    const detailText = detail ?? parts.slice(1).join(' - ').trim();
    return detailText ? `${typeText} – ${detailText}` : typeText;
  }

  const single = translateType(text);
  if (single == null) warnUnmatched(text);
  return single ?? text;
}
