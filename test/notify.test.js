import test from 'node:test';
import assert from 'node:assert/strict';
import { sendDecision } from '../src/services/notify.js';

const H = 60 * 60_000;
const CHECK = 6 * H;
// Deadline 21. aug 2026 17:30Z, 24 t varsel → planlagt send 20. aug 17:30Z
const deadline = '2026-08-21T17:30:00Z';
const sendAt = Date.parse('2026-08-20T17:30:00Z');

test('mer enn 6 t til send-tidspunkt: vent til neste sjekk', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 10 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'wait');
});

test('innenfor sjekkintervallet: planlegg timer med riktig delay', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt - 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 2 * H);
});

test('inntil 1 t etter planlagt tid: send umiddelbart (delay 0)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 30 * 60_000, checkIntervalMs: CHECK });
  assert.equal(d.action, 'schedule');
  assert.equal(d.delayMs, 0);
});

test('mer enn 1 t etter planlagt tid: hopp over (anti-spam ved deploy)', () => {
  const d = sendDecision({ deadlineTime: deadline, hoursBefore: 24, nowMs: sendAt + 2 * H, checkIntervalMs: CHECK });
  assert.equal(d.action, 'skip');
});
