// «Spiller-pakka» (v1.8.0): spillerkort, differensialer og dødballtakere.
// Rene funksjoner + én assemble som henter. Importerer ALDRI ai.js —
// hele pakka koster 0 AI-kall i alle tilstander.
import { getBootstrap, getElementSummary } from './fplClient.js';
import {
  POSITIONS,
  POSITIONS_SHORT,
  STATUS_LABELS,
  formatPrice,
  teamFdrMap,
  translateFplNews,
} from './analysis.js';
import { formatDay } from './format.js';

const SISTE_KAMPER = 5;
const KOMMENDE_KAMPER = 3;

// Posisjonen i flertall — «nr. 2 av 78 spisser» leser bedre enn «av 78 Angrep».
const POSISJON_FLERTALL = Object.freeze({
  1: 'keepere',
  2: 'forsvarere',
  3: 'midtbanespillere',
  4: 'spisser',
});

// Statistikken som faktisk sier noe om posisjonen. Keepere måles på redninger,
// forsvarere på nullere, midt/spiss på involvering — resten er støy i kortet.
const STATS_ANGREPENDE = [
  ['xGI', 'expected_goal_involvements'], ['Bonus', 'bonus'], ['BPS', 'bps'],
  ['Gule', 'yellow_cards'], ['Røde', 'red_cards'], ['Straffebom', 'penalties_missed'],
];
const STATS_PER_POSISJON = Object.freeze({
  1: [['Redninger', 'saves'], ['Nullere', 'clean_sheets'], ['Baklengs', 'goals_conceded'], ['xGC', 'expected_goals_conceded'], ['Straffer reddet', 'penalties_saved'], ['Bonus', 'bonus']],
  2: [['Nullere', 'clean_sheets'], ['Baklengs', 'goals_conceded'], ['xGC', 'expected_goals_conceded'], ['Bonus', 'bonus'], ['Gule', 'yellow_cards'], ['Røde', 'red_cards']],
  3: STATS_ANGREPENDE,
  4: STATS_ANGREPENDE,
});

// Felles for alle posisjoner, etter posisjonsstatistikken.
const STATS_FELLES = Object.freeze([
  ['ICT', 'ict_index'],
  ['Drømmelag', 'dreamteam_count'],
  ['Verdi', 'value_season'],
]);

/**
 * Statraden i kortet. Strengtall (xGC, ICT, Verdi) sendes videre SOM STRENGER,
 * som resten av payloaden. 0 er en ekte verdi — `penalties_saved` var 0 for
 * alle 652 spillere 4. sep 2026, og skal vises som 0, ikke skjules.
 */
function posisjonsStats(element) {
  const felt = STATS_PER_POSISJON[element.element_type] ?? STATS_PER_POSISJON[3];
  return [...felt, ...STATS_FELLES].map(([navn, key]) => ({ navn, verdi: element[key] ?? 0 }));
}

/**
 * «Form nr. 2 av 78 spisser». FPL rangerer alle spillere innen posisjonen
 * (`*_rank_type`); antallet står i `element_types[].element_count`. Uten
 * `elementTypes` finnes ikke nevneren — da er hele blokka null.
 */
function rangeringAv(element, elementTypes) {
  const type = (elementTypes ?? []).find((t) => t.id === element.element_type);
  if (!type?.element_count) return null;
  return {
    posisjonFlertall: POSISJON_FLERTALL[element.element_type] ?? 'spillere',
    form: { nr: element.form_rank_type ?? null, av: type.element_count },
    poengPerKamp: element.points_per_game_rank_type ?? null,
    eid: element.selected_rank_type ?? null,
    pris: element.now_cost_rank_type ?? null,
  };
}

/** Eierandelene brukeren kan veksle mellom på /spillere. 10 % er default. */
export const DIFF_TERSKLER = Object.freeze([5, 10, 15]);
const DIFF_TOPP = 10;
const DIFF_VINDU = 3;
// Lag uten kamper i vinduet mangler i teamFdrMap — midt på skalaen er den
// ærligste antakelsen: verken bonus eller straff for ukjent program.
const FDR_FALLBACK = 3.5;

/** Motstanderens korte navn ut fra kampen og hvem spilleren spiller for. */
function opponentShort(fixture, teamsById) {
  const opponentId = fixture.is_home ? fixture.team_a : fixture.team_h;
  return teamsById.get(opponentId)?.short_name ?? null;
}

/**
 * Payloaden bak `GET /api/spiller/:id`. Ren: tar bootstrap-elementet,
 * lagoppslaget og element-summary inn, gir norske feltnavn ut.
 * Strengtall (form, xG, eid …) sendes videre SOM STRENGER — de er
 * visningsverdier fra FPL og skal aldri reformateres her.
 * `dataAlder` legges på av ruta, ikke her.
 */
export function buildPlayerCard({ element, teamsById, summary, elementTypes }) {
  const team = teamsById.get(element.team) ?? null;
  const history = Array.isArray(summary?.history) ? summary.history : [];
  const fixtures = Array.isArray(summary?.fixtures) ? summary.fixtures : [];
  const past = Array.isArray(summary?.history_past) ? summary.history_past : [];

  // Nyeste først. Dobbeltrunde gir to innslag med samme `round` — begge vises.
  const sisteKamper = history
    .slice(-SISTE_KAMPER)
    .reverse()
    .map((h) => ({
      runde: h.round,
      motstander: teamsById.get(h.opponent_team)?.short_name ?? null,
      hjemme: typeof h.was_home === 'boolean' ? h.was_home : null,
      poeng: h.total_points,
      minutter: h.minutes,
      mal: h.goals_scored,
      assists: h.assists,
      xg: h.expected_goals,
      xa: h.expected_assists,
      bonus: h.bonus,
      pris: h.value == null ? null : formatPrice(h.value),
    }));

  // Tidligere sesonger, nyeste først. Prisreisen er start_cost → end_cost.
  const sesonger = [...past].reverse().map((s) => ({
    sesong: s.season_name,
    poeng: s.total_points,
    minutter: s.minutes,
    mal: s.goals_scored,
    assists: s.assists,
    nullere: s.clean_sheets,
    bonus: s.bonus,
    prisStart: s.start_cost == null ? null : formatPrice(s.start_cost),
    prisSlutt: s.end_cost == null ? null : formatPrice(s.end_cost),
  }));

  // Blank runde (`event: null`) og allerede spilte kamper hoppes over.
  const kommende = fixtures
    .filter((f) => f.event != null && !f.finished)
    .slice(0, KOMMENDE_KAMPER)
    .map((f) => ({
      runde: f.event,
      motstander: opponentShort(f, teamsById),
      hjemme: Boolean(f.is_home),
      fdr: f.difficulty,
    }));

  const nytt = translateFplNews(element.news);

  return {
    id: element.id,
    navn: element.web_name,
    fulltNavn: `${element.first_name} ${element.second_name}`.trim(),
    lag: team
      ? { navn: team.name, kort: team.short_name, kode: team.code, id: team.id }
      : null,
    posisjon: POSITIONS[element.element_type] ?? null,
    posKort: POSITIONS_SHORT[element.element_type] ?? null,
    erKeeper: element.element_type === 1,
    pris: formatPrice(element.now_cost),
    eid: element.selected_by_percent,
    form: element.form,
    totalPoeng: element.total_points,
    poengPerKamp: element.points_per_game,
    xg: element.expected_goals,
    xa: element.expected_assists,
    minutter: element.minutes,
    status: element.status,
    statusTekst: STATUS_LABELS[element.status] ?? element.status,
    nytt: nytt || null,
    // 57 spillere hadde news_added uten nyhet 4. sep — datoen betyr ingenting
    // uten teksten. Kilden er en klubbside; kun https slipper gjennom.
    nyttMeldt: nytt && element.news_added ? formatDay(element.news_added) : null,
    nyttKilde: String(element.scout_news_link ?? '').startsWith('https://') ? element.scout_news_link : null,
    spillesjanse: element.chance_of_playing_next_round ?? null,
    stats: posisjonsStats(element),
    rangering: rangeringAv(element, elementTypes),
    sesonger,
    // Rundene spilleren ikke kan møte moderklubben sin. FPLs `notes` er feil
    // for minst én spiller — `gameweek` er fasit. 7 av 652 hadde dette 4. sep.
    klausuler: (element.scout_risks ?? [])
      .filter((r) => r?.property === 'loan_ineligible' && Number.isInteger(r.gameweek))
      .map((r) => r.gameweek)
      .sort((a, b) => a - b),
    dodball: {
      straffer: element.penalties_order ?? null,
      hjorner: element.corners_and_indirect_freekicks_order ?? null,
      frispark: element.direct_freekicks_order ?? null,
    },
    // Forsvarsbidrag (poenggivende fra 2025/26): summen og delene den er
    // bygget av. Under halvparten av spillerne har verdi — 0 er en ekte
    // tilstand, ikke manglende data, så feltene er alltid tall.
    forsvar: {
      dc: element.defensive_contribution ?? 0,
      cbi: element.clearances_blocks_interceptions ?? 0,
      rec: element.recoveries ?? 0,
      tk: element.tackles ?? 0,
      per90: element.defensive_contribution_per_90 ?? 0,
    },
    sisteKamper,
    kommende,
  };
}

/** Spillbar spiller med målt form — grunnkravet for å være differensial. */
function erAktuell(element) {
  return element.status === 'a' && element.minutes > 0 && parseFloat(element.form) > 0;
}

function en1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Global differensial-finner: lavt eid, god form, snilt program.
 * Eierandelen er FPLs `selected_by_percent` (hele verden), ikke miniligaen —
 * `differentials()` i analysis.js er den ligavarianten og står urørt.
 *
 * Score = form × (6 − snitt-FDR neste 3 runder). Terskelen er STRENGT under:
 * en spiller eid av nøyaktig 10,0 % er ikke en 10 %-differensial.
 *
 * Har ingen spillbar spiller form ennå (sesongstart), finnes det ingen ærlig
 * rangering å vise — da returneres `null` og viewet sier fra i stedet for å
 * liste vilkårlige navn.
 */
export function buildDifferentials({ elements, fixtures, fromGw, teamsById }) {
  const aktuelle = elements.filter(erAktuell);
  if (aktuelle.length === 0) return null;

  const fdrByTeam = teamFdrMap(fixtures ?? [], fromGw, DIFF_VINDU);

  const scored = aktuelle.map((e) => {
    const fdr3 = en1(fdrByTeam.get(e.team) ?? FDR_FALLBACK);
    const team = teamsById?.get(e.team) ?? null;
    const score = en1(parseFloat(e.form) * (6 - fdr3));
    return {
      eidTall: parseFloat(e.selected_by_percent),
      score,
      row: {
        id: e.id,
        navn: e.web_name,
        lag: team ? { kort: team.short_name, kode: team.code, navn: team.name } : null,
        posKort: POSITIONS_SHORT[e.element_type] ?? null,
        pris: formatPrice(e.now_cost),
        form: e.form,
        eid: e.selected_by_percent,
        // Egne tall formateres her, ikke i viewet: «3.0» leser roligere enn «3»
        // ved siden av «3.5». FPLs egne strenger (form, eid) røres aldri.
        fdr3: fdr3.toFixed(1),
        score: score.toFixed(1),
      },
    };
  });

  return {
    terskler: DIFF_TERSKLER.map((prosent) => {
      // Sorter på tallet FØR formateringen — strengsortering ville satt
      // «9.0» over «36.0».
      const topp = scored
        .filter((s) => s.eidTall < prosent)
        .sort((a, b) => b.score - a.score)
        .slice(0, DIFF_TOPP);
      const maks = topp.length > 0 ? topp[0].score : 0;
      return {
        prosent,
        // andel = score i prosent av toppscoren i DENNE tabellen; viewet
        // tegner den som en diskret søylestripe bak tallet.
        rows: topp.map((s) => ({ ...s.row, andel: maks > 0 ? Math.round((s.score / maks) * 100) : 0 })),
      };
    }),
  };
}

const DODBALL_ROLLER = Object.freeze({
  straffer: 'penalties_order',
  hjorner: 'corners_and_indirect_freekicks_order',
  frispark: 'direct_freekicks_order',
});
const DODBALL_TOPP = 2;

/**
 * «Dødballtakere»: én rad per klubb med de to første i køen for hver av de
 * tre rollene. `*_text`-feltene hos FPL er målt tomme og brukes ALDRI —
 * ordenstallene (`*_order`) er den eneste kilden.
 * Klubber uten kjente takere beholder raden med tomme lister, så tabellen
 * alltid speiler hele serien.
 * Takerne er `{ id, navn }` og ikke bare navn: viewet gjør dem til knapper
 * som åpner det samme spillerkortet som tabellen over.
 */
export function buildSetPieceTable({ elements, teams }) {
  const perTeam = new Map(
    teams.map((t) => [
      t.id,
      {
        lag: { id: t.id, navn: t.name, kort: t.short_name, kode: t.code },
        straffer: [],
        hjorner: [],
        frispark: [],
      },
    ]),
  );

  for (const [rolle, felt] of Object.entries(DODBALL_ROLLER)) {
    const kandidater = elements
      .filter((e) => e[felt] != null && perTeam.has(e.team))
      .sort((a, b) => a[felt] - b[felt]);
    for (const e of kandidater) {
      const rad = perTeam.get(e.team);
      if (rad[rolle].length < DODBALL_TOPP) rad[rolle].push({ id: e.id, navn: e.web_name });
    }
  }

  return [...perTeam.values()].sort((a, b) => a.lag.navn.localeCompare(b.lag.navn, 'nb'));
}

/**
 * Henter grunnlaget for spillerkortet. Bootstrap sjekkes FØRST: en ukjent id
 * skal aldri koste et element-summary-kall. Returnerer null når spilleren
 * ikke finnes — ruta gjør det om til 404.
 */
export async function assemblePlayerCard(id) {
  const { elements, teams, element_types } = await getBootstrap();
  const element = elements.find((e) => e.id === id);
  if (!element) return null;

  const summary = await getElementSummary(id);
  return buildPlayerCard({
    element,
    teamsById: new Map(teams.map((t) => [t.id, t])),
    summary,
    elementTypes: element_types,
  });
}
