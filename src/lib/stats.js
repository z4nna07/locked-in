// Statistiche: serie settimanali, costanza, ripartizioni per materia/progetto, voti, corsa, streak migliore.
import { toISO, fromISO, addDays, startOfWeek } from "./dates.js";
import { weekValue } from "./goals.js";
import { scheduleOf, isDayBased, bestDayStreak } from "./habits.js";

function groupByWeek(entries) {
  const map = new Map();
  entries.forEach((en) => {
    const key = toISO(startOfWeek(fromISO(en.day)));
    map.set(key, [...(map.get(key) ?? []), en]);
  });
  return map;
}

/** Valore dell'obiettivo per ciascuna delle ultime `weeks` settimane (l'ultima e' quella in corso). */
export function weeklySeries(category, entries, endDate, weeks) {
  const byWeek = groupByWeek(entries);
  const monday = startOfWeek(endDate);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(monday, -7 * (weeks - 1 - i));
    const key = toISO(start);
    return { start: key, value: weekValue(category.kind, byWeek.get(key) ?? [], category.options) };
  });
}

/**
 * Settimane concluse (esclusa l'ultima, in corso) in cui l'obiettivo e' stato raggiunto.
 * since: lunedi da cui contare (prima di allora la categoria non esisteva).
 */
export function goalRate(series, goal, since = "0000-01-01") {
  const done = series.slice(0, -1).filter((w) => !w.start || w.start >= since);
  return { met: done.filter((w) => w.value >= goal).length, weeks: done.length };
}

/** Lunedi della settimana in cui una categoria e' iniziata: creazione o prima registrazione, la piu' vecchia. */
export function startWeek(category, entries) {
  const created = String(category.created_at ?? "").slice(0, 10);
  const first = entries.reduce((min, en) => (en.day < min ? en.day : min), created || "9999-12-31");
  return /^\d{4}-\d{2}-\d{2}$/.test(first) && first !== "9999-12-31" ? toISO(startOfWeek(fromISO(first))) : "0000-01-01";
}

export function totalsByLabel(entries) {
  const map = new Map();
  entries.forEach((en) => {
    const label = en.details?.label?.trim() || "Senza nome";
    map.set(label, (map.get(label) ?? 0) + Number(en.amount));
  });
  return [...map.entries()].map(([label, minutes]) => ({ label, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export function scoreDistribution(entries) {
  const byDay = new Map();
  entries.forEach((en) => byDay.set(en.day, Number(en.amount)));
  const dist = { 1: 0, 2: 0, 3: 0 };
  byDay.forEach((score) => {
    if (dist[score] != null) dist[score] += 1;
  });
  return dist;
}

export function runStats(entries) {
  const km = Math.round(entries.reduce((s, en) => s + Number(en.amount), 0) * 100) / 100;
  const longest = entries.reduce((m, en) => Math.max(m, Number(en.amount)), 0);
  const paces = entries
    .filter((en) => Number(en.amount) >= 1 && en.details?.seconds)
    .map((en) => Math.round(en.details.seconds / Number(en.amount)));
  return { km, runs: entries.length, longest, bestPace: paces.length ? Math.min(...paces) : null };
}

/** Serie piu' lunga: giorni per le abitudini quotidiane, settimane con obiettivo raggiunto per il resto. */
export function bestStreak(kind, goal, entries, opts = {}) {
  if (kind === "check" && isDayBased(scheduleOf(opts))) return bestDayStreak(scheduleOf(opts), entries);
  if (!goal || goal <= 0 || entries.length === 0) return 0;
  const byWeek = groupByWeek(entries);
  const keys = [...byWeek.keys()].sort();
  let best = 0;
  let run = 0;
  let monday = fromISO(keys[0]);
  const last = fromISO(keys[keys.length - 1]);
  while (monday <= last) {
    const met = weekValue(kind, byWeek.get(toISO(monday)) ?? [], opts) >= goal;
    run = met ? run + 1 : 0;
    best = Math.max(best, run);
    monday = addDays(monday, 7);
  }
  return best;
}

export function firstYear(entries, currentYear) {
  if (entries.length === 0) return currentYear;
  return Math.min(currentYear, ...entries.map((en) => Number(en.day.slice(0, 4))));
}
