// Editor di una categoria: nome, icona, frequenza (abitudini) o obiettivo (categorie fisse).
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { ICON_CHOICES, KIND_ICON, SLEEP_TARGET, goalLimits } from "../lib/kinds.js";
import { goalUnit } from "../lib/goals.js";
import { scheduleOf, describeSchedule, isDayBased } from "../lib/habits.js";

const MAX_NAME = 40;
const DAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"];
const DAY_NAMES = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

const MODES = [
  { mode: "daily", title: "Ogni giorno", text: "Una spunta al giorno, tutti i giorni." },
  { mode: "perDay", title: "Più volte al giorno", text: "Un contatore: es. lavare i denti 2 volte." },
  { mode: "days", title: "Giorni precisi", text: "Solo nei giorni che scegli, gli altri sono riposo." },
  { mode: "weekly", title: "Volte a settimana", text: "Quando vuoi, basta arrivare al numero." },
];

export function stepper(label, value, onChange, limits) {
  let current = value;
  const show = (v) => String(v).replace(".", ",");
  const out = h("output", null, show(current));
  const set = (v) => {
    current = Math.round(Math.max(limits.min ?? 0, Math.min(limits.max, v)) * 10) / 10;
    out.textContent = show(current);
    onChange(current);
  };
  return h(
    "div",
    { class: "cat-goal" },
    h("span", null, label),
    h("div", { class: "stepper" },
      h("button", { type: "button", "aria-label": `Diminuisci: ${label}`, onClick: () => set(current - limits.step) }, icon("minus")),
      out,
      h("button", { type: "button", "aria-label": `Aumenta: ${label}`, onClick: () => set(current + limits.step) }, icon("plus")),
    ),
  );
}

/** Riassunto di una categoria per l'elenco (es. "2 volte al giorno", "4 volte a settimana"). */
export function categorySummary(item) {
  if (item.kind === "check") return describeSchedule(scheduleOf(item.options), item.weekly_goal);
  if (item.kind === "sleep") return `${String(Number(item.options?.target_hours) || 8).replace(".", ",")} h a notte · ${item.weekly_goal} notti a settimana`;
  return `${String(item.weekly_goal).replace(".", ",")} ${goalUnit(item.kind)} a settimana`;
}

function iconPicker(current, onPick) {
  const buttons = ICON_CHOICES.map(([name, label]) => {
    const b = h("button", { type: "button", class: "icon-choice", "aria-pressed": String(name === current), "aria-label": label, title: label }, icon(name));
    b.addEventListener("click", () => {
      buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      onPick(name);
    });
    return b;
  });
  return h("div", { class: "icon-grid", role: "group", "aria-label": "Icona" }, buttons);
}

/** Frequenza delle abitudini: quattro scelte e i campi che dipendono dalla scelta. */
function frequencyFields(draft, update) {
  const details = h("div", { class: "freq-details" });
  const hint = h("p", { class: "hint" });
  const schedule = () => scheduleOf(draft().options);
  const setSchedule = (patch) => update({ options: { ...draft().options, schedule: { ...schedule(), ...patch } } });

  function paintDetails() {
    const s = schedule();
    const parts = [];
    if (s.mode === "perDay") {
      parts.push(stepper("Volte al giorno", s.perDay, (v) => { setSchedule({ perDay: v }); paintHint(); }, { min: 2, max: 20, step: 1 }));
    } else if (s.mode === "days") {
      parts.push(h("div", { class: "days-pick", role: "group", "aria-label": "Giorni" },
        DAY_LABELS.map((label, i) => {
          const iso = i + 1;
          const b = h("button", { type: "button", "aria-pressed": String(s.days.includes(iso)), "aria-label": DAY_NAMES[i] }, label);
          b.addEventListener("click", () => {
            const cur = schedule().days;
            const next = cur.includes(iso) ? cur.filter((d) => d !== iso) : [...cur, iso].sort();
            if (next.length === 0) return;
            b.setAttribute("aria-pressed", String(next.includes(iso)));
            setSchedule({ days: next });
            paintHint();
          });
          return b;
        })));
    } else if (s.mode === "weekly") {
      parts.push(stepper("Volte a settimana", Number(draft().weekly_goal) || 3, (v) => { update({ weekly_goal: v }); paintHint(); }, { min: 1, max: 7, step: 1 }));
    }
    details.replaceChildren(...parts);
  }

  function paintHint() {
    const s = schedule();
    hint.replaceChildren(
      h("b", null, describeSchedule(s, draft().weekly_goal)),
      isDayBased(s) ? " · la streak conta i giorni di fila" : " · la streak conta le settimane di fila",
    );
  }

  const options = MODES.map((m) => {
    const b = h("button", { type: "button", class: "freq", "aria-pressed": String(schedule().mode === m.mode) },
      h("span", { class: "t" }, m.title), h("span", { class: "s" }, m.text));
    b.addEventListener("click", () => {
      options.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      const prev = schedule();
      setSchedule({ mode: m.mode, perDay: m.mode === "perDay" ? Math.max(2, prev.perDay) : prev.perDay, days: m.mode === "days" && prev.days.length === 7 ? [1, 3, 5] : prev.days });
      paintDetails();
      paintHint();
    });
    return b;
  });

  paintDetails();
  paintHint();
  return h("div", { class: "fields" }, h("div", { class: "freq-grid", role: "group", "aria-label": "Frequenza" }, options), details, hint);
}

function goalFields(draft, update) {
  const item = draft();
  const limits = goalLimits(item.kind);
  if (item.kind === "sleep") {
    return h("div", { class: "fields" },
      stepper("Ore di sonno a notte", Number(item.options?.target_hours) || 8, (v) => update({ options: { ...draft().options, target_hours: v } }), SLEEP_TARGET),
      stepper("Notti a obiettivo a settimana", item.weekly_goal, (v) => update({ weekly_goal: v }), limits));
  }
  return h("div", { class: "fields" }, stepper(`Obiettivo a settimana (${goalUnit(item.kind)})`, item.weekly_goal, (v) => update({ weekly_goal: v }), limits));
}

/**
 * Apre l'editor. onSave(item) riceve la categoria modificata e ritorna true se e' stata salvata.
 */
export function openCategoryEditor(initial, { isNew = false, onSave }) {
  let item = { ...initial, options: { ...(initial.options ?? {}) } };
  if (item.kind === "check" && !item.options.schedule) item = { ...item, options: { ...item.options, schedule: { mode: isNew ? "daily" : "weekly" } } };
  const draft = () => item;
  const update = (patch) => { item = { ...item, ...patch }; };

  const name = h("input", { class: "input", id: "cat-name", maxlength: MAX_NAME, value: item.name, placeholder: "Es. Lavare i denti" });
  name.addEventListener("input", () => update({ name: name.value }));
  const error = h("div", { class: "error", role: "alert" });
  const save = h("button", { class: "btn block", type: "button" }, icon("check"), isNew ? "Aggiungi" : "Salva");
  save.addEventListener("click", async () => {
    if (!item.name.trim()) return (error.textContent = "Dai un nome all'abitudine.");
    save.disabled = true;
    const ok = await onSave({ ...item, name: item.name.trim() });
    save.disabled = false;
    if (ok) closeSheet();
  });

  openSheet({
    title: isNew ? "Nuova abitudine" : item.name || "Categoria",
    content: h("div", { class: "fields" },
      h("div", { class: "field" }, h("label", { for: "cat-name" }, "Nome"), name),
      h("div", { class: "field" }, h("span", { class: "lbl" }, "Icona"), iconPicker(item.icon && item.icon !== "check" ? item.icon : KIND_ICON[item.kind], (v) => update({ icon: v }))),
      h("div", { class: "field" }, h("span", { class: "lbl" }, item.kind === "check" ? "Frequenza" : "Obiettivo"),
        item.kind === "check" ? frequencyFields(draft, update) : goalFields(draft, update)),
      error,
      save,
    ),
  });
}

