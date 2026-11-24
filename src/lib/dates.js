// Date locali (niente fusi orari): il giorno e' sempre quello del telefono.

const pad = (n) => String(n).padStart(2, "0");

export const WEEKDAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
export const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const MONTHS_LABEL = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Lunedi della settimana che contiene la data. */
export function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function weekDays(date) {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysInYear(year) {
  return Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / 86400000);
}

export function formatDuration(minutes) {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

export function formatLongDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
