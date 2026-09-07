// Deadline-sjekken (v1.9.0): «Lagsjekk» tre timer før deadline. Rene
// funksjoner (buildDeadlineCheck, deadlineCheckText) delt av Discord-timeren
// i notify.js og kortet på /brief; assembleDeadlineCheck henter via fplClient.
// 0 AI-kall.
//
// Grunnlag: FPL gir ikke ut picks for kommende runde før deadline har
// passert, så troppen er picks fra forrige runde med byttene for kommende
// runde påført (entry/transfers ER synlig før deadline). Roller (starter,
// kaptein) arves fra forrige runde.

import config from '../config.js';
import {
  getBootstrap,
  getFixtures,
  getPicks,
  getEntryHistory,
  getEntryTransfers,
  FplError,
} from './fplClient.js';
import { byId, currentEvent, nextEvent, STATUS_LABELS, translateFplNews } from './analysis.js';
import { buildFtLedger } from './scenarios.js';
import { CHIP_LABELS } from './chips.js';
import { formatDay, formatEventName, formatTime } from './format.js';

const OUT_STATUSES = new Set(['i', 's', 'u', 'n']);
const DOUBTFUL_MAX_CHANCE = 50;

/**
 * Påfører byttene på picks: den solgte spillerens plass (posisjon, C/V,
 * multiplier) arves av den kjøpte. Bytter som ikke treffer troppen ignoreres.
 * Muterer ikke input.
 */
export function applyTransfers(picks, transfersForGw = []) {
  const list = (picks?.picks ?? []).map((p) => ({ ...p }));
  for (const t of transfersForGw) {
    if (!Number.isInteger(t?.element_in)) continue;
    const slot = list.find((p) => p.element === t.element_out);
    if (slot) slot.element = t.element_in;
  }
  return { ...picks, picks: list };
}

function playerRef(el, teamsById) {
  const team = teamsById.get(el.team);
  return { id: el.id, name: el.web_name, teamShort: team?.short_name ?? '?', teamCode: team?.code ?? null };
}

function statusDetail(el) {
  const label = STATUS_LABELS[el.status] ?? el.status;
  const news = translateFplNews(el.news);
  if (!news) return label;
  // Når nyheten ble meldt sier hvor fersk den er — en skade meldt i juli er
  // noe annet enn en meldt i går. Datoen finnes kun sammen med teksten.
  const naar = el.news_added ? ` (meldt ${formatDay(el.news_added)})` : '';
  return `${label} — ${news}${naar}`;
}

/**
 * Låneklausulen for denne runden, om den finnes. FPLs `notes` er upålitelig
 * (Dansos tekst sa «Gameweek 12» for både runde 12 og 23 den 4. sep 2026) —
 * `gameweek`-feltet er fasit, og teksten skriver vi selv.
 */
function loanRiskFor(el, gw) {
  return (el.scout_risks ?? []).find((r) => r?.property === 'loan_ineligible' && r.gameweek === gw);
}

/**
 * Funnene i troppen for `event`. Rekkefølge: kaptein, visekaptein, så
 * starterne etter posisjon. Én spiller kan gi flere funn av ulik type
 * (kaptein OG skadet), aldri to av samme type.
 */
export function buildDeadlineCheck({
  picks,
  transfersForGw = [],
  elementsById,
  fixturesForGw = [],
  teamsById,
  entryHistory,
  chips = [],
  event,
}) {
  const gw = event.id;
  const applied = applyTransfers(picks, transfersForGw);

  const teamsPlaying = new Set();
  for (const f of fixturesForGw) {
    if (f?.event !== gw) continue;
    teamsPlaying.add(f.team_h);
    teamsPlaying.add(f.team_a);
  }

  const findings = [];
  const seen = new Set();
  const add = (type, el, detail) => {
    const key = `${type}:${el.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ type, player: playerRef(el, teamsById), detail });
  };

  const rows = applied.picks
    .map((pick) => ({ pick, el: elementsById.get(pick.element) }))
    .filter((r) => r.el);
  const captain = rows.find((r) => r.pick.is_captain);
  const vice = rows.find((r) => r.pick.is_vice_captain);
  if (captain && captain.el.status !== 'a') add('kaptein', captain.el, statusDetail(captain.el));
  if (vice && vice.el.status !== 'a') add('vise', vice.el, statusDetail(vice.el));

  const starters = rows.filter((r) => r.pick.position <= 11).sort((a, b) => a.pick.position - b.pick.position);
  for (const { el } of starters) {
    if (OUT_STATUSES.has(el.status)) {
      add('ute', el, statusDetail(el));
    } else if (
      el.status === 'd' &&
      el.chance_of_playing_next_round != null &&
      el.chance_of_playing_next_round <= DOUBTFUL_MAX_CHANCE
    ) {
      add('tvilsom', el, `${STATUS_LABELS.d} — ${el.chance_of_playing_next_round} % sjanse for spilletid`);
    }
    // Ukjent kampprogram (ingen kamper i lista) er ikke det samme som blank.
    if (teamsPlaying.size > 0 && !teamsPlaying.has(el.team)) {
      add('blank', el, 'har ingen kamp i runden');
    }
    if (loanRiskFor(el, gw)) {
      add('klausul', el, 'kan ikke møte moderklubben i runden (låneklausul)');
    }
  }

  const ledger = buildFtLedger({ history: entryHistory, chips });
  const transfersMade = transfersForGw.length;
  const freeTransfers = ledger.valid ? Math.max(ledger.next - transfersMade, 0) : null;

  return {
    gw,
    gwName: event.name ? formatEventName(event.name) : `Runde ${gw}`,
    deadline: event.deadline_time,
    basis: `laget fra runde ${gw - 1} + byttene dine for runde ${gw}`,
    findings,
    footer: { freeTransfers, transfersMade, activeChip: applied.active_chip ?? null },
    ok: findings.length === 0,
  };
}

const FINDING_PREFIX = { kaptein: 'Kaptein: ', vise: 'Visekaptein: ' };

function findingLine(f) {
  const who = `${FINDING_PREFIX[f.type] ?? ''}${f.player.name} (${f.player.teamShort})`;
  // «blank» og «klausul» er formulert som hele setninger — de får ikke «er».
  return f.type === 'blank' || f.type === 'klausul' ? `- ${who} ${f.detail}` : `- ${who} er ${f.detail}`;
}

/** Discord-teksten. Ren — samme innhold som kortet på /brief. */
export function deadlineCheckText(check, hoursBefore) {
  const when = check.deadline ? `, ${formatDay(check.deadline)} kl. ${formatTime(check.deadline)}` : '';
  const ft = check.footer.freeTransfers == null ? 'ukjent' : String(check.footer.freeTransfers);
  const chip = check.footer.activeChip ? (CHIP_LABELS[check.footer.activeChip] ?? check.footer.activeChip) : 'ingen';
  const lines = [
    `**Lagsjekk — ${check.gwName}** (deadline om ${hoursBefore} t${when})`,
    'https://fpl.marsk.no/brief',
    `Grunnlag: ${check.basis}.`,
    '',
    ...(check.ok ? ['- Alt klart — ingen funn.'] : check.findings.map(findingLine)),
    '',
    `_Gratisbytter igjen: ${ft} (${check.footer.transfersMade} brukt) · Chip: ${chip}_`,
  ];
  return lines.join('\n');
}

/**
 * Henter grunnlaget og bygger sjekken for kommende runde. null uten team-id,
 * uten kommende runde, eller før første runde er spilt (ingen picks).
 */
export async function assembleDeadlineCheck({ teamId = config.fplTeamId } = {}) {
  if (!teamId) return null;
  const bootstrap = await getBootstrap();
  const upcoming = nextEvent(bootstrap.events);
  const current = currentEvent(bootstrap.events);
  if (!upcoming || !current || current.id === upcoming.id) return null;

  const [fixtures, picks, history, transfers] = await Promise.all([
    getFixtures(),
    getPicks(teamId, current.id).catch((err) => {
      if (err instanceof FplError && err.status === 404) return null;
      throw err;
    }),
    getEntryHistory(teamId),
    getEntryTransfers(teamId).catch(() => []),
  ]);
  if (!picks) return null;

  return buildDeadlineCheck({
    picks,
    transfersForGw: (Array.isArray(transfers) ? transfers : []).filter((t) => t?.event === upcoming.id),
    elementsById: byId(bootstrap.elements),
    fixturesForGw: fixtures.filter((f) => f.event === upcoming.id),
    teamsById: byId(bootstrap.teams),
    entryHistory: history,
    chips: history.chips ?? [],
    event: upcoming,
  });
}
