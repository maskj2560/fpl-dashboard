// Formatering for visning — norsk tid og tall.
import config from '../config.js';

const dateTime = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: config.tz,
});

const number = new Intl.NumberFormat('nb-NO');

export function formatDateTime(iso) {
  return dateTime.format(new Date(iso));
}

export function formatNumber(n) {
  return number.format(n);
}

/** FPL-ens eventnavn på norsk: «Gameweek 1» → «Runde 1». Annet uendret. */
export function formatEventName(name) {
  return String(name ?? '').replace(/^Gameweek\s+/i, 'Runde ');
}

const day = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: config.tz,
});

const time = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: config.tz,
});

/** «fredag 21. august» */
export function formatDay(iso) {
  return day.format(new Date(iso));
}

/** «19:30» */
export function formatTime(iso) {
  return time.format(new Date(iso));
}
