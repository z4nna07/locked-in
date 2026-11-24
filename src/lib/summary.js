// Testi brevi che descrivono una registrazione.
import { formatDuration, fromISO, toISO, today, WEEKDAYS_SHORT, MONTHS_SHORT } from "./dates.js";
import { formatKm, formatClock, formatPace } from "./run.js";
import { workoutVolume } from "./workout.js";

const KG = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

/** 8450 -> "8.450", 72.5 -> "72,5" */
export function formatKg(value) {
  return KG.format(value);
}

export const SCORE_LABEL = { 1: "Schifezze", 2: "Così così", 3: "Pulito" };

export const LABEL_KEY = { study: "subjects", project: "projects" };

export function entrySummary(kind, entry) {
  const amount = Number(entry.amount);
  const d = entry.details || {};
  switch (kind) {
    case "gym": {
      const volume = workoutVolume(d);
      return [d.template, formatDuration(amount), volume > 0 ? `${formatKg(volume)} kg` : null, d.note].filter(Boolean).join(" · ");
    }
    case "run":
      return [`${formatKm(amount)} km`, d.seconds ? formatClock(d.seconds) : null, formatPace(amount, d.seconds)].filter(Boolean).join(" · ");
    case "study":
    case "project":
      return [formatDuration(amount), d.label].filter(Boolean).join(" · ");
    case "food":
      return SCORE_LABEL[amount] ?? "";
    case "sleep":
      return [formatDuration(amount), d.bed && d.wake ? `${d.bed} → ${d.wake}` : null].filter(Boolean).join(" · ");
    default:
      return "Fatto";
  }
}

/** Riassunto della giornata di una categoria per la Home. */
export function daySummary(kind, entries) {
  if (entries.length === 0) {
    return { gym: "Nessun allenamento", run: "Nessuna corsa", study: "Niente studio", project: "Nessuna sessione", food: "Com'è andata?", sleep: "Quanto hai dormito stanotte?" }[kind] ?? "Da fare";
  }
  if (kind === "study" || kind === "project") {
    const total = entries.reduce((s, en) => s + Number(en.amount), 0);
    const labels = [...new Set(entries.map((en) => en.details?.label).filter(Boolean))];
    return [formatDuration(total), labels.join(", ")].filter(Boolean).join(" · ");
  }
  if (entries.length > 1 && kind !== "food") return `${entries.length} registrazioni`;
  return entrySummary(kind, entries[entries.length - 1]);
}

export function dayLabel(day) {
  if (day === toISO(today())) return "Oggi";
  const d = fromISO(day);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
