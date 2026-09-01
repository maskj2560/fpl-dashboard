// Kalenderabonnement (v1.9.0): /kalender.ics med alle deadlines (VALARM 3 t
// før) og troppens klubbers kamper fra og med neste runde. Rene funksjoner —
// ruta i routes/calendar.js henter grunnlaget via fplClient. RFC 5545: CRLF,
// linjer foldet på 75 oktetter (ikke tegn — æøå er to byte), UTC-tidsstempler
// med Z, ingen VTIMEZONE. 0 AI-kall.

import { formatEventName } from './format.js';

const MAX_OCTETS = 75;

/** ISO-tidspunkt → iCalendar UTC-form: '2026-10-24T10:00:00Z' → '20261024T100000Z'. */
export function icsDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Escaper TEXT-verdier: bakstrek, semikolon, komma og linjeskift. */
export function escapeText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folder en linje til ≤ 75 oktetter; fortsettelseslinjer starter med mellomrom. */
export function foldLine(line) {
  const parts = [];
  let current = '';
  let octets = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (octets + size > MAX_OCTETS) {
      parts.push(current);
      current = ' ';
      octets = 1;
    }
    current += ch;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function lookup(teamsById, id) {
  return teamsById instanceof Map ? teamsById.get(id) : teamsById?.[id];
}

/**
 * Bygger hele kalenderen. squadTeamIds tom → kun deadlines. fromGw avgrenser
 * kampene (deadlines tas alltid med for hele sesongen — UID-ene er stabile,
 * så kalenderklienter oppdaterer i stedet for å duplisere).
 */
export function buildCalendar({
  events,
  fixtures = [],
  squadTeamIds = [],
  teamsById,
  now = Date.now(),
  fromGw = 1,
  siteUrl = 'https://fpl.marsk.no',
  version = '1.9.0',
}) {
  const stamp = icsDate(new Date(now).toISOString());
  const withDeadline = events.filter((e) => e.deadline_time);
  const seasonYear = new Date(withDeadline[0]?.deadline_time ?? now).getUTCFullYear();
  const squad = new Set(squadTeamIds);
  const gwName = new Map(events.map((e) => [e.id, formatEventName(e.name)]));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//FPL-dashboard//v${version}//NB`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FPL-dashboard',
    'X-PUBLISHED-TTL:PT6H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];

  for (const ev of withDeadline) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:fpl-deadline-${ev.id}-${seasonYear}@fpl-dashboard`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(ev.deadline_time)}`,
      `SUMMARY:${escapeText(`FPL deadline – ${gwName.get(ev.id) ?? `Runde ${ev.id}`}`)}`,
      `URL:${siteUrl}/brief`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:FPL deadline om 3 timer',
      'TRIGGER:-PT3H',
      'END:VALARM',
      'END:VEVENT',
    );
  }

  const squadFixtures = fixtures
    .filter(
      (f) =>
        f.kickoff_time && f.event != null && f.event >= fromGw && (squad.has(f.team_h) || squad.has(f.team_a)),
    )
    .sort((a, b) => a.kickoff_time.localeCompare(b.kickoff_time) || a.id - b.id);

  for (const f of squadFixtures) {
    const home = lookup(teamsById, f.team_h);
    const away = lookup(teamsById, f.team_a);
    const round = gwName.get(f.event) ?? `Runde ${f.event}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:fpl-fixture-${f.id}-${seasonYear}@fpl-dashboard`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(f.kickoff_time)}`,
      'DURATION:PT2H',
      `SUMMARY:${escapeText(`${home?.short_name ?? '?'} – ${away?.short_name ?? '?'} (${round})`)}`,
      `DESCRIPTION:${escapeText(`${home?.name ?? '?'} mot ${away?.name ?? '?'}\nFDR ${f.team_h_difficulty ?? '?'}/${f.team_a_difficulty ?? '?'}`)}`,
      `URL:${siteUrl}/`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
