// Sonno: orari, durata, medie che attraversano la mezzanotte, statistiche.
import { fromISO, addDays, toISO } from "./dates.js";

const DAY = 1440;
const NOON = 720;
const pad = (n) => String(n).padStart(2, "0");

/** "23:40" -> 1420 minuti dalla mezzanotte; null se non valido. */
export function parseClock(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

export function minutesToClock(minutes) {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Minuti dormiti tra ora di letto e sveglia (se la sveglia e' prima, e' il giorno dopo). */
export function sleepMinutes(bed, wake) {
  const diff = parseClock(wake) - parseClock(bed);
  return diff > 0 ? diff : diff + DAY;
}

export function sleepLevel(minutes, targetHours) {
  const target = targetHours * 60;
  if (minutes >= target) return 3;
  if (minutes >= target - 60) return 2;
  return 1;
}

/** Orari serali spostati dopo la mezzanotte: 00:30 diventa 24:30, cosi' le medie hanno senso. */
function bedOffset(clock) {
  const m = parseClock(clock);
  return m < NOON ? m + DAY : m;
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function averageBedtime(clocks) {
  return clocks.length ? mean(clocks.map(bedOffset)) % DAY : null;
}

export function averageClock(clocks) {
  return clocks.length ? mean(clocks.map(parseClock)) : null;
}

function stdDev(xs) {
  const avg = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - avg) ** 2)));
}

function lastDays(entries, endDay, days) {
  const from = toISO(addDays(fromISO(endDay), -(days - 1)));
  return entries.filter((en) => en.day >= from && en.day <= endDay);
}

/**
 * Una notte per giorno: minuti sommati, orari presi dalla registrazione piu' lunga
 * (cosi' un eventuale pisolino non sposta l'ora media di letto).
 */
export function nightsByDay(entries) {
  const map = new Map();
  entries.forEach((en) => {
    const prev = map.get(en.day);
    const amount = Number(en.amount);
    if (!prev) map.set(en.day, { day: en.day, amount, details: en.details ?? {}, longest: amount });
    else {
      const longer = amount > prev.longest;
      map.set(en.day, { day: en.day, amount: prev.amount + amount, details: longer ? en.details ?? {} : prev.details, longest: Math.max(amount, prev.longest) });
    }
  });
  return [...map.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Statistiche: medie 7 e 30 giorni, debito della settimana, orari medi e regolarita' (deviazione in minuti). */
export function sleepStats(entries, targetHours, endDay) {
  const nights = nightsByDay(entries);
  const week = lastDays(nights, endDay, 7);
  const month = lastDays(nights, endDay, 30);
  const beds = month.map((en) => en.details?.bed).filter(Boolean);
  const wakes = month.map((en) => en.details?.wake).filter(Boolean);
  const minutes = (list) => list.map((en) => Number(en.amount));
  return {
    nights7: week.length,
    avg7: week.length ? Math.round(mean(minutes(week))) : null,
    avg30: month.length ? Math.round(mean(minutes(month))) : null,
    debt7: week.reduce((s, en) => s + Math.max(0, targetHours * 60 - Number(en.amount)), 0),
    bedtime: averageBedtime(beds),
    wake: averageClock(wakes),
    spread: beds.length > 1 ? Math.round(stdDev(beds.map(bedOffset))) : null,
    best: month.length ? Math.max(...minutes(month)) : null,
  };
}
