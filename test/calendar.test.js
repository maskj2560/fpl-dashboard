import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icsDate, escapeText, foldLine, buildCalendar } from '../src/services/calendar.js';

const NOW = Date.UTC(2026, 8, 1, 12, 0, 0); // 2026-09-01T12:00:00Z

function events38() {
  return Array.from({ length: 38 }, (_, i) => ({
    id: i + 1,
    name: `Gameweek ${i + 1}`,
    deadline_time: new Date(Date.UTC(2026, 7, 14 + i * 7, 17, 30)).toISOString(),
  }));
}

const teamsById = new Map([
  [1, { id: 1, name: 'Arsenal', short_name: 'ARS' }],
  [2, { id: 2, name: 'Man City', short_name: 'MCI' }],
  [3, { id: 3, name: 'Liverpool', short_name: 'LIV' }],
  [4, { id: 4, name: 'Chelsea', short_name: 'CHE' }],
  [5, { id: 5, name: 'Everton', short_name: 'EVE' }],
]);

const fixtures = [
  { id: 10, event: 1, kickoff_time: '2026-08-15T14:00:00Z', team_h: 1, team_a: 3, team_h_difficulty: 4, team_a_difficulty: 4 },
  { id: 11, event: 2, kickoff_time: '2026-08-22T14:00:00Z', team_h: 1, team_a: 2, team_h_difficulty: 4, team_a_difficulty: 2 },
  { id: 12, event: 2, kickoff_time: '2026-08-22T16:30:00Z', team_h: 4, team_a: 5, team_h_difficulty: 2, team_a_difficulty: 3 },
  { id: 13, event: 3, kickoff_time: null, team_h: 3, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 4 },
];

const unfold = (text) => text.replace(/\r\n[ \t]/g, '');
const lines = (text) => text.split('\r\n').filter(Boolean);

test('buildCalendar bruker CRLF på hver linje og aldri nakent LF', () => {
  const ics = buildCalendar({ events: events38(), fixtures: [], squadTeamIds: [], teamsById, now: NOW });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'starter ikke med BEGIN:VCALENDAR + CRLF');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'), 'slutter ikke med END:VCALENDAR + CRLF');
  assert.ok(!/(^|[^\r])\n/.test(ics), 'fant nakent LF');
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('METHOD:PUBLISH\r\n'));
});

test('buildCalendar folder ingen linje over 75 oktetter — også med æøå', () => {
  const longTeams = new Map([
    [1, { id: 1, name: 'Ærverdige Østlandske Ballspillere fra Ålesund og omegn', short_name: 'ÆØÅ' }],
    [2, { id: 2, name: 'Sørlandets Ørneklubb for Ærlige Fotballspillere i Ø', short_name: 'SØR' }],
  ]);
  const fx = [{ id: 1, event: 1, kickoff_time: '2026-08-15T14:00:00Z', team_h: 1, team_a: 2, team_h_difficulty: 5, team_a_difficulty: 5 }];
  const ics = buildCalendar({ events: events38().slice(0, 1), fixtures: fx, squadTeamIds: [1], teamsById: longTeams, now: NOW });
  for (const line of lines(ics)) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `linje over 75 oktetter: ${line}`);
  }
  const flat = unfold(ics);
  assert.ok(flat.includes('DESCRIPTION:Ærverdige Østlandske Ballspillere fra Ålesund og omegn mot Sørlandets Ørneklubb for Ærlige Fotballspillere i Ø\\nFDR 5/5'), 'utfoldet beskrivelse er ikke hel');
  assert.equal(foldLine('kort'), 'kort');
});

test('buildCalendar gir 38 deadline-hendelser med VALARM 3 timer før', () => {
  const ics = buildCalendar({ events: events38(), fixtures, squadTeamIds: [], teamsById, now: NOW });
  assert.equal((ics.match(/BEGIN:VEVENT\r\n/g) ?? []).length, 38);
  assert.equal((ics.match(/TRIGGER:-PT3H\r\n/g) ?? []).length, 38);
  assert.equal((ics.match(/BEGIN:VALARM\r\n/g) ?? []).length, 38);
  assert.ok(ics.includes('SUMMARY:FPL deadline – Runde 5\r\n'), 'mangler «FPL deadline – Runde 5»');
  assert.ok(ics.includes('UID:fpl-deadline-5-2026@fpl-dashboard\r\n'), 'mangler stabil UID');
  assert.ok(ics.includes('URL:https://fpl.marsk.no/brief\r\n'));
});

test('buildCalendar tar kun troppens klubbers kamper fra og med neste runde', () => {
  const ics = buildCalendar({ events: events38(), fixtures, squadTeamIds: [1], teamsById, now: NOW, fromGw: 2 });
  const fixtureUids = ics.match(/UID:fpl-fixture-\d+-2026@fpl-dashboard\r\n/g) ?? [];
  assert.deepEqual(fixtureUids, ['UID:fpl-fixture-11-2026@fpl-dashboard\r\n']);
  assert.ok(ics.includes('SUMMARY:ARS – MCI (Runde 2)\r\n'));
  assert.ok(unfold(ics).includes('DESCRIPTION:Arsenal mot Man City\\nFDR 4/2\r\n'));
  assert.ok(ics.includes('DTSTART:20260822T140000Z\r\n'));
  assert.ok(ics.includes('DURATION:PT2H\r\n'));
  assert.ok(!ics.includes('CHE – EVE'), 'kamp uten troppens klubber ble med');
  assert.ok(!ics.includes('ARS – LIV'), 'kamp før fromGw ble med');
});

test('escapeText escaper semikolon, komma, bakstrek og linjeskift', () => {
  assert.equal(escapeText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
  assert.equal(escapeText('ren tekst'), 'ren tekst');
  assert.equal(escapeText('vind\r\nuavh'), 'vind\\nuavh');
});

test('buildCalendar bruker Z-tidsstempler og DTSTAMP fra now', () => {
  assert.equal(icsDate('2026-10-24T10:00:00Z'), '20261024T100000Z');
  assert.equal(icsDate('2026-10-24T12:00:00+02:00'), '20261024T100000Z');
  const ics = buildCalendar({ events: events38().slice(0, 2), fixtures: [], squadTeamIds: [], teamsById, now: NOW });
  assert.equal((ics.match(/DTSTAMP:20260901T120000Z\r\n/g) ?? []).length, 2);
  assert.ok(ics.includes('DTSTART:20260814T173000Z\r\n'));
  assert.ok(!/DT(START|STAMP):\d{8}T\d{6}\r\n/.test(ics), 'fant tidsstempel uten Z');
});
