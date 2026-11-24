// Schermata Allenati: schede, allenamento in corso, volume, record, storico e peso.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { columnChart } from "../ui/charts.js";
import { loadSession } from "../lib/session.js";
import { exerciseNames, bestSet, estimate1RM, workoutVolume } from "../lib/workout.js";
import { formatKg, dayLabel, entrySummary } from "../lib/summary.js";
import { toISO, addDays, startOfWeek, today, MONTHS_SHORT } from "../lib/dates.js";
import { openTemplateEditor } from "./template-editor.js";
import { startWorkout } from "./session.js";
import { openWorkoutDetail, openExerciseProgress } from "./train-sheets.js";
import { weightCard } from "./weight.js";

const WEEKS = 8;
const RECORDS = 8;
const RECENT = 8;

function lastUse(history, template) {
  const days = history.filter((en) => en.details?.template_id === template.id).map((en) => en.day);
  return days.length ? dayLabel(days.reduce((max, d) => (d > max ? d : max))) : null;
}

function templatesCard(gym, templates, history, day, names) {
  const rows = templates.map((t) =>
    h("div", { class: "tpl" },
      h("button", { class: "tpl-main", type: "button", onClick: () => openTemplateEditor(t, names), "aria-label": `Modifica ${t.name}` },
        h("div", { class: "t" }, t.name),
        h("div", { class: "s" }, [`${t.exercises.length} esercizi`, lastUse(history, t) ? `ultima volta ${lastUse(history, t).toLowerCase()}` : "mai fatta"].join(" · ")),
      ),
      h("button", { class: "btn sm", type: "button", onClick: () => startWorkout(gym.id, day, t) }, "Inizia"),
    ),
  );
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Le tue schede"), h("button", { class: "go", type: "button", onClick: () => openTemplateEditor(null, names) }, icon("plus"), "Nuova")),
    rows.length ? h("div", { class: "tpl-list" }, rows) : h("div", { class: "empty" }, "Crea la tua prima scheda: per esempio Push, Pull e Legs."),
  );
}

function volumeCard(history) {
  const monday = startOfWeek(today());
  const items = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(monday, -7 * (WEEKS - 1 - i));
    const from = toISO(start);
    const to = toISO(addDays(start, 6));
    const value = history.filter((en) => en.day >= from && en.day <= to).reduce((s, en) => s + workoutVolume(en.details), 0);
    return { label: i === WEEKS - 1 ? "Ora" : `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`, value, cls: i === WEEKS - 1 ? "now" : "" };
  });
  if (items.every((i) => i.value === 0)) return null;
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Volume settimanale"), h("span", { class: "meta" }, "kg sollevati")),
    h("div", { class: "chart-wrap" }, columnChart({ items, label: "Volume sollevato nelle ultime 8 settimane", format: (v) => (v >= 1000 ? `${formatKg(v / 1000)}k` : formatKg(v)) })),
  );
}

function recordsCard(history, names) {
  const rows = names.slice(0, RECORDS).map((name) => {
    const best = bestSet(history, name);
    if (!best) return null;
    return h("button", { class: "item", type: "button", onClick: () => openExerciseProgress(history, name) },
      h("div", { class: "txt" }, h("div", null, name), h("div", { class: "s" }, `Massimale stimato ${formatKg(estimate1RM(best.kg, best.reps))} kg`)),
      h("span", { class: "rec num" }, `${formatKg(best.kg)} kg × ${best.reps}`),
    );
  }).filter(Boolean);
  if (!rows.length) return null;
  return h("section", { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Record personali"), h("span", { class: "meta" }, "tocca per i progressi")),
    h("div", { class: "list", style: { marginBottom: "0" } }, rows),
  );
}

function recentCard(gym, history) {
  const recent = [...history].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, RECENT);
  if (!recent.length) return null;
  return h("section", { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Ultimi allenamenti")),
    h("div", { class: "list", style: { marginBottom: "0" } }, recent.map((en) =>
      h("button", { class: "item", type: "button", onClick: () => openWorkoutDetail(gym, en) },
        h("div", { class: "txt" }, h("div", null, dayLabel(en.day)), h("div", { class: "s" }, entrySummary("gym", en))),
        icon("chev"),
      ))),
  );
}

function ongoingBanner() {
  const s = loadSession();
  if (!s) return null;
  const started = new Date(s.startedAt);
  return h("a", { class: "card ongoing", href: "#sessione" },
    h("span", { class: "dot-live" }),
    h("div", { class: "txt" }, h("div", { class: "t" }, `${s.templateName} in corso`), h("div", { class: "s" }, `Iniziato alle ${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`)),
    h("span", { class: "go" }, "Riprendi", icon("chev")),
  );
}

export function renderTrain(root, state) {
  const gym = state.categories.find((c) => c.kind === "gym");
  const day = state.selectedDay;
  if (!gym) {
    root.replaceChildren(
      h("section", { class: "card soon" }, h("h2", null, "Allenati"), h("p", null, "Attiva la categoria Palestra per creare schede e registrare gli allenamenti."), h("a", { class: "btn", href: "#obiettivi" }, "Categorie e obiettivi")),
      weightCard(state),
    );
    return;
  }
  const history = state.entries.filter((en) => en.category_id === gym.id);
  const names = exerciseNames(history);
  root.replaceChildren(
    h("header", { class: "page-h" },
      h("div", null, h("span", { class: "eyebrow" }, `Palestra · ${dayLabel(day)}`), h("h1", null, "Allenati")),
      h("button", { class: "btn", type: "button", onClick: () => startWorkout(gym.id, day, null) }, icon("plus"), "Allenamento libero"),
    ),
    ongoingBanner(),
    h("div", { class: "grid" },
      templatesCard(gym, state.templates, history, day, names),
      h("div", { class: "stack" }, volumeCard(history), weightCard(state)),
      recordsCard(history, names),
      recentCard(gym, history),
    ),
  );
}
