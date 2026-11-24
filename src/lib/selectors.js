// Letture derivate dallo stato: registrazioni per categoria, giorno e settimana.
import { toISO, weekDays, fromISO } from "./dates.js";
import { dayLevel, weekValue, streak } from "./goals.js";

export function byCategory(entries, categoryId) {
  return entries.filter((en) => en.category_id === categoryId);
}

export function onDay(entries, day) {
  return entries.filter((en) => en.day === day);
}

export function levelOn(category, entries, day) {
  return dayLevel(category.kind, onDay(byCategory(entries, category.id), day), category.options);
}

/** Indice veloce: "categoria|giorno" -> registrazioni. */
export function indexByDay(entries) {
  const map = new Map();
  entries.forEach((en) => {
    const key = `${en.category_id}|${en.day}`;
    map.set(key, [...(map.get(key) ?? []), en]);
  });
  return map;
}

export function weekProgress(category, entries, refDay) {
  const days = new Set(weekDays(fromISO(refDay)).map(toISO));
  const inWeek = byCategory(entries, category.id).filter((en) => days.has(en.day));
  return weekValue(category.kind, inWeek, category.options);
}

export function categoryStreak(category, entries, todayDate) {
  return streak(category.kind, Number(category.weekly_goal), byCategory(entries, category.id), todayDate, category.options);
}
