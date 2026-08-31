// «Spiller-pakka» (v1.8.0): spillerkort, differensialer og dødballtakere.
// Rene funksjoner + én assemble som henter. Importerer ALDRI ai.js —
// hele pakka koster 0 AI-kall i alle tilstander.
import {
  POSITIONS,
  POSITIONS_SHORT,
  STATUS_LABELS,
  formatPrice,
  translateFplNews,
} from './analysis.js';

const SISTE_KAMPER = 5;
const KOMMENDE_KAMPER = 3;

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
export function buildPlayerCard({ element, teamsById, summary }) {
  const team = teamsById.get(element.team) ?? null;
  const history = Array.isArray(summary?.history) ? summary.history : [];
  const fixtures = Array.isArray(summary?.fixtures) ? summary.fixtures : [];

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
    spillesjanse: element.chance_of_playing_next_round ?? null,
    dodball: {
      straffer: element.penalties_order ?? null,
      hjorner: element.corners_and_indirect_freekicks_order ?? null,
      frispark: element.direct_freekicks_order ?? null,
    },
    sisteKamper,
    kommende,
  };
}
