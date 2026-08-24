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

// Intl grupperer med NBSP. Vanlige mellomrom lar lange tall brekke MELLOM
// siffergruppene i stedet for å sprenge kortet, og `white-space: nowrap`
// på `.num` holder tabellcellene hele.
const groupSpace = (s) => s.replace(/[\u00A0\u202F]/g, ' ');

export function formatNumber(n) {
  return groupSpace(number.format(n));
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

/** Poengdifferanse med fortegn og norsk komma: +10, −4, −1,3. */
export function formatSigned(n) {
  const rounded = Math.round(n * 10) / 10;
  const abs = groupSpace(Math.abs(rounded).toLocaleString('nb-NO'));
  if (rounded > 0) return `+${abs}`;
  if (rounded < 0) return `−${abs}`;
  return '0';
}
