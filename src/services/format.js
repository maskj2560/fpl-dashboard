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
