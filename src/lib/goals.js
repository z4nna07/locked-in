// Calcolo di obiettivi settimanali, livelli dei pallini e streak a settimane.
import { toISO, fromISO, startOfWeek, addDays } from "./dates.js";
import { sleepLevel } from "./sleep.js";

/** Come si misura l'obiettivo settimanale di ogni tipo di categoria. */
const METRIC = {
  gym: "days",
  run: "days",
  check: "days",
  food: "cleanDays",
  study: "hours",
  project: "hours",
  sleep: "goodNights",
};

const UNIT = { days: "volte", cleanDays: "giorni puliti", hours: "ore" };

export const CLEAN_SCORE = 3;
export const DEFAULT_SLEEP_HOURS = 8;

const targetHours = (opts) => Number(opts?.target_hours) || DEFAULT_SLEEP_HOURS;

export function goalUnit(kind, opts = {}) {
  if (kind === "sleep") return `notti da ${String(targetHours(opts)).replace(".", ",")} h`;
  return UNIT[METRIC[kind] ?? "days"];
}

function lastScorePerDay(entries) {
  const byDay = new Map();
  entries.forEach((en) => byDay.set(en.day, Number(en.amount)));
  return byDay;
}

/** Valore raggiunto in un insieme di registrazioni (tipicamente una settimana). */
export function weekValue(kind, entries, opts = {}) {
  const metric = METRIC[kind] ?? "days";
  if (metric === "goodNights") {
    const minutes = targetHours(opts) * 60;
    const perDay = new Map();
    entries.forEach((en) => perDay.set(en.day, (perDay.get(en.day) ?? 0) + Number(en.amount)));
    return [...perDay.values()].filter((m) => m >= minutes).length;
  }
  if (metric === "hours") {
    const minutes = entries.reduce((sum, en) => sum + Number(en.amount || 0), 0);
    return Math.round((minutes / 60) * 100) / 100;
  }
  if (metric === "cleanDays") {
    return [...lastScorePerDay(entries).values()].filter((s) => s >= CLEAN_SCORE).length;
  }
  return new Set(entries.map((en) => en.day)).size;
}

/** Intensita' del pallino di un giorno: 0 vuoto, 1-3 colore. */
export function dayLevel(kind, entriesOfDay, opts = {}) {
  if (entriesOfDay.length === 0) return 0;
  if (METRIC[kind] === "goodNights") {
    const total = entriesOfDay.reduce((s, en) => s + Number(en.amount), 0);
    return sleepLevel(total, targetHours(opts));
  }
  if (METRIC[kind] === "cleanDays") {
    const score = entriesOfDay[entriesOfDay.length - 1].amount;
    return Math.max(1, Math.min(3, Number(score)));
  }
  return 3;
}

function groupByWeek(entries) {
  const weeks = new Map();
  entries.forEach((en) => {
    const key = toISO(startOfWeek(fromISO(en.day)));
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(en);
  });
  return weeks;
}

/**
 * Settimane consecutive con obiettivo raggiunto.
 * La settimana in corso conta solo se gia' raggiunta; se non lo e' ancora non interrompe la serie.
 */
export function streak(kind, goal, entries, today, opts = {}) {
  if (!goal || goal <= 0) return 0;
  const weeks = groupByWeek(entries);
  const met = (monday) => weekValue(kind, weeks.get(toISO(monday)) ?? [], opts) >= goal;

  let monday = startOfWeek(today);
  let count = met(monday) ? 1 : 0;
  monday = addDays(monday, -7);
  while (met(monday)) {
    count += 1;
    monday = addDays(monday, -7);
  }
  return count;
}
