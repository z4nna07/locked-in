// Card delle statistiche per tipo di categoria.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { columnChart } from "../ui/charts.js";
import { goalOf } from "../lib/selectors.js";
import { iconFor } from "../lib/kinds.js";
import { goalUnit } from "../lib/goals.js";
import { totalsByLabel, scoreDistribution, runStats } from "../lib/stats.js";
import { workoutVolume } from "../lib/workout.js";
import { formatKg, SCORE_LABEL } from "../lib/summary.js";
import { formatDuration, fromISO, toISO, addDays, today, MONTHS_SHORT } from "../lib/dates.js";
import { scheduleOf, isScheduled, isoDowOf } from "../lib/habits.js";
import { formatKm } from "../lib/run.js";

const fmt1 = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
const weekLabel = (iso, last) => {
  if (last) return "Ora";
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const tile = (label, value, sub) =>
  h("div", { class: "tile" }, h("div", { class: "lbl" }, label), h("div", { class: "val num" }, value), sub ? h("div", { class: "sub" }, sub) : null);

/** Barre orizzontali in HTML: [{ label, value, text }] */
export function hbars(rows, cls = "") {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h("div", { class: "hbars" }, rows.map((r) =>
    h("div", { class: `hbar ${cls}` },
      h("div", { class: "hbar-top" }, h("span", null, r.label), h("span", { class: "num" }, r.text)),
      h("div", { class: "bar" }, h("i", { style: { width: `${(r.value / max) * 100}%` } })),
    )));
}

/** Grafico settimanale. values: [{ start, value }]; i valori gia' nell'unita' da mostrare. */
function weeklyChart(series, { target, format, label }) {
  const items = series.map((w, i) => ({
    label: weekLabel(w.start, i === series.length - 1),
    value: w.value,
    cls: target && w.value >= target ? "hit" : i === series.length - 1 ? "cur" : "",
  }));
  return h("div", { class: "chart-wrap" }, columnChart({ items, target, format, label }));
}

function sumByWeek(series, entries, fn) {
  return series.map((w, i) => {
    const end = series[i + 1]?.start ?? "9999-12-31";
    const inWeek = entries.filter((en) => en.day >= w.start && en.day < end);
    return { start: w.start, value: fn(inWeek) };
  });
}

function extras(category, entries, series) {
  switch (category.kind) {
    case "gym": {
      const minutes = entries.reduce((s, en) => s + Number(en.amount), 0);
      const volume = entries.reduce((s, en) => s + workoutVolume(en.details), 0);
      return h("div", { class: "tiles three" },
        tile("Allenamenti", String(entries.length)),
        tile("Durata media", entries.length ? formatDuration(minutes / entries.length) : "–"),
        tile("Volume", `${formatKg(volume)} kg`));
    }
    case "run": {
      const r = runStats(entries);
      const pace = r.bestPace ? `${Math.floor(r.bestPace / 60)}'${String(r.bestPace % 60).padStart(2, "0")}"` : "–";
      return h("div", { class: "tiles" },
        tile("Km totali", formatKm(r.km)), tile("Corse", String(r.runs)),
        tile("Più lunga", r.longest ? `${formatKm(r.longest)} km` : "–"), tile("Passo migliore", pace, "al km"));
    }
    case "food": {
      const dist = scoreDistribution(entries);
      const total = dist[1] + dist[2] + dist[3];
      return total
        ? hbars([3, 2, 1].map((v) => ({ label: SCORE_LABEL[v], value: dist[v], text: `${dist[v]} gg · ${Math.round((dist[v] / total) * 100)}%` })), "food")
        : null;
    }
    case "study":
    case "project": {
      const rows = totalsByLabel(entries).slice(0, 8);
      return rows.length ? hbars(rows.map((r) => ({ label: r.label, value: r.minutes, text: formatDuration(r.minutes) }))) : null;
    }
    case "sleep": {
      const avg = sumByWeek(series, entries, (list) => (list.length ? list.reduce((s, en) => s + Number(en.amount), 0) / list.length / 60 : 0));
      return h("div", { class: "fields" },
        h("div", { class: "hint" }, "Media delle ore dormite a settimana"),
        weeklyChart(avg, { target: Number(category.options?.target_hours) || 8, format: (v) => `${fmt1(v)}h`, label: "Media ore di sonno per settimana" }),
        h("a", { class: "link", href: "#sonno" }, "Apri la schermata Sonno"));
    }
    default: {
      // Giorni completati (per "N volte al giorno" solo quelli in cui sei arrivato a N).
      const days = series.reduce((s, w) => s + w.value, 0);
      const schedule = scheduleOf(category.options);
      // Solo i giorni gia' trascorsi (oggi compreso) e, per i giorni precisi, solo quelli previsti.
      let total = 0;
      for (let d = fromISO(series[0].start); d <= today(); d = addDays(d, 1)) {
        if (isScheduled(schedule, isoDowOf(toISO(d)))) total += 1;
      }
      const tiles = [
        tile("Giorni completati", String(days)),
        tile("Frequenza", `${Math.round((days / Math.max(1, total)) * 100)}%`, schedule.mode === "days" ? "dei giorni previsti" : "dei giorni del periodo"),
      ];
      return h("div", { class: "tiles" }, tiles);
    }
  }
}

export function categoryCard(category, entries, series) {
  const goal = goalOf(category);
  const runKm = category.kind === "run" ? sumByWeek(series, entries, (list) => list.reduce((s, en) => s + Number(en.amount), 0)) : null;
  const chart = runKm
    ? weeklyChart(runKm, { format: (v) => `${fmt1(v)}`, label: "Km di corsa per settimana" })
    : category.kind === "sleep"
      ? null
      : weeklyChart(series, { target: goal || undefined, format: (v) => fmt1(v), label: `${category.name}: ${goalUnit(category.kind, category.options)} per settimana` });
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" },
      h("h2", { class: "with-ic" }, icon(iconFor(category)), category.name),
      h("span", { class: "meta" }, runKm ? "km a settimana" : category.kind === "sleep" ? "" : `${goalUnit(category.kind, category.options)} a settimana`),
    ),
    chart,
    extras(category, entries, series),
  );
}
