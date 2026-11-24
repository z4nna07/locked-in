// Frequenza delle abitudini personalizzate (categorie "check"), salvata in options.schedule.
//   daily  : una volta al giorno, tutti i giorni          -> streak in giorni
//   perDay : N volte al giorno (contatore), tutti i giorni -> streak in giorni
//   days   : una volta nei giorni scelti (1 = lun ... 7 = dom) -> streak in giorni
//   weekly : X volte a settimana, quando vuoi             -> streak in settimane

export const MODES = ["daily", "perDay", "days", "weekly"];
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** Frequenza normalizzata; le abitudini create prima di questa funzione valgono come "weekly". */
export function scheduleOf(options) {
  const s = options?.schedule ?? {};
  const mode = MODES.includes(s.mode) ? s.mode : "weekly";
  const raw = s.perDay == null ? 2 : Number(s.perDay);
  const perDay = Math.min(20, Math.max(1, Math.round(Number.isFinite(raw) ? raw : 2)));
  const days = Array.isArray(s.days) && s.days.length ? [...new Set(s.days.map(Number))].filter((d) => d >= 1 && d <= 7).sort() : ALL_DAYS;
  return { mode, perDay: mode === "perDay" ? perDay : 1, days: mode === "days" ? days : ALL_DAYS };
}

export const isDayBased = (schedule) => schedule.mode !== "weekly";

export const isScheduled = (schedule, isoDow) => schedule.days.includes(isoDow);

/** Giorno ISO (1 = lunedi) di una data "YYYY-MM-DD". */
export function isoDowOf(day) {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Quante volte l'hai fatta in un giorno (il contatore e' la somma). */
export function countOf(entriesOfDay) {
  return entriesOfDay.reduce((s, en) => s + Number(en.amount || 0), 0);
}

export function isDone(schedule, entriesOfDay) {
  return countOf(entriesOfDay) >= schedule.perDay;
}

/** Obiettivo settimanale implicito per le frequenze quotidiane (giorni da completare). */
export function weeklyTarget(schedule, weeklyGoal) {
  if (schedule.mode === "weekly") return Number(weeklyGoal) || 0;
  return schedule.days.length;
}

export function describeSchedule(schedule, weeklyGoal) {
  switch (schedule.mode) {
    case "daily": return "Ogni giorno";
    case "perDay": return `${schedule.perDay} volte al giorno`;
    case "days": return schedule.days.length === 7 ? "Ogni giorno" : schedule.days.map((d) => DAY_SHORT[d - 1]).join(", ");
    default: return `${weeklyGoal} ${Number(weeklyGoal) === 1 ? "volta" : "volte"} a settimana`;
  }
}

/** Valore della settimana: giorni completati (quotidiane) o volte fatte (settimanali). */
export function habitWeekValue(schedule, entries) {
  const byDay = new Map();
  entries.forEach((en) => byDay.set(en.day, [...(byDay.get(en.day) ?? []), en]));
  let value = 0;
  byDay.forEach((list, day) => {
    if (!isScheduled(schedule, isoDowOf(day))) return;
    if (isDone(schedule, list)) value += 1;
  });
  return value;
}

/** Livello del pallino: 3 completata, 2 iniziata (contatore a meta'), 0 niente. */
export function habitLevel(schedule, entriesOfDay) {
  const count = countOf(entriesOfDay);
  if (count <= 0) return 0;
  return count >= schedule.perDay ? 3 : 2;
}

const shift = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function doneDays(schedule, entries) {
  const byDay = new Map();
  entries.forEach((en) => byDay.set(en.day, [...(byDay.get(en.day) ?? []), en]));
  return new Set([...byDay].filter(([, list]) => isDone(schedule, list)).map(([day]) => day));
}

/**
 * Giorni consecutivi (solo quelli previsti) in cui l'hai completata.
 * Oggi non ancora fatta non interrompe la serie; i giorni non previsti si saltano.
 */
export function dayStreak(schedule, entries, todayIso) {
  const done = doneDays(schedule, entries);
  if (done.size === 0) return 0;
  const first = [...done].sort()[0];
  let count = 0;
  for (let day = todayIso; day >= first; day = shift(day, -1)) {
    if (!isScheduled(schedule, isoDowOf(day))) continue;
    if (done.has(day)) count += 1;
    else if (day !== todayIso) break;
  }
  return count;
}

export function bestDayStreak(schedule, entries) {
  const done = doneDays(schedule, entries);
  if (done.size === 0) return 0;
  const sorted = [...done].sort();
  let best = 0;
  let run = 0;
  for (let day = sorted[0]; day <= sorted[sorted.length - 1]; day = shift(day, 1)) {
    if (!isScheduled(schedule, isoDowOf(day))) continue;
    run = done.has(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
