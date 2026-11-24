// Peso corporeo: registrazione (uno al giorno), card con grafico e andamento.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";
import { lineChart } from "../ui/charts.js";
import { getState } from "../lib/store.js";
import { saveWeight, removeWeight } from "../lib/actions.js";
import { parseDecimal } from "../lib/run.js";
import { formatKg, dayLabel } from "../lib/summary.js";
import { toISO, addDays, today, fromISO, MONTHS_SHORT } from "../lib/dates.js";

const CHART_DAYS = 90;

export function openWeightSheet(day) {
  const { weights } = getState();
  const current = weights.find((w) => w.day === day);
  const last = weights.at(-1);
  const kg = h("input", { class: "input", id: "w-kg", inputmode: "decimal", value: current ? String(current.kg).replace(".", ",") : "", placeholder: last ? String(last.kg).replace(".", ",") : "75,5" });
  const error = h("div", { class: "error", role: "alert" });
  const onSubmit = async (ev) => {
    ev.preventDefault();
    const value = parseDecimal(kg.value);
    if (value == null || value < 20 || value > 400) return (error.textContent = "Scrivi il peso in kg, tra 20 e 400.");
    const saved = await saveWeight(day, Math.round(value * 10) / 10);
    if (saved) {
      toast("Peso salvato", "ok");
      closeSheet();
    }
  };
  const recent = [...weights].reverse().slice(0, 6);
  openSheet({
    title: "Peso",
    subtitle: dayLabel(day),
    content: h("form", { class: "fields", onSubmit, novalidate: true },
      h("div", { class: "field" }, h("label", { for: "w-kg" }, "Peso (kg)"), kg),
      error,
      h("button", { class: "btn block", type: "submit" }, icon("check"), current ? "Aggiorna" : "Salva"),
      recent.length ? h("div", { class: "list", style: { marginTop: "8px" } }, recent.map((w) =>
        h("div", { class: "item" },
          h("div", { class: "txt" }, h("div", null, `${formatKg(w.kg)} kg`), h("div", { class: "s" }, dayLabel(w.day))),
          h("button", { class: "icon-btn", type: "button", "aria-label": `Elimina peso del ${dayLabel(w.day)}`, onClick: async () => { if (await removeWeight(w.id)) openWeightSheet(day); } }, icon("trash")),
        ))) : null,
    ),
  });
}

function trend(weights) {
  const last = weights.at(-1);
  const ref = toISO(addDays(fromISO(last.day), -30));
  const before = [...weights].reverse().find((w) => w.day <= ref) ?? weights[0];
  if (before === last) return null;
  const diff = Math.round((Number(last.kg) - Number(before.kg)) * 10) / 10;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  return `${sign}${formatKg(Math.abs(diff))} kg da ${dayLabel(before.day)}`;
}

export function weightCard(state) {
  const { weights, selectedDay } = state;
  const from = toISO(addDays(today(), -CHART_DAYS));
  const points = weights.filter((w) => w.day >= from).map((w) => {
    const d = fromISO(w.day);
    return { label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, value: Number(w.kg) };
  });
  const last = weights.at(-1);
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" },
      h("h2", null, "Peso corporeo"),
      h("button", { class: "go", type: "button", onClick: () => openWeightSheet(selectedDay) }, icon("plus"), "Registra"),
    ),
    last
      ? h("div", { class: "night" },
          h("div", { class: "big num" }, `${formatKg(last.kg)}`, h("small", { class: "unit" }, " kg")),
          h("div", { class: "hint" }, trend(weights) ?? `Registrato ${dayLabel(last.day).toLowerCase()}`),
        )
      : h("div", { class: "empty" }, "Registra il tuo peso per vedere l'andamento."),
    points.length > 1 ? h("div", { class: "chart-wrap", style: { marginTop: "12px" } }, lineChart({ points, label: "Peso negli ultimi 90 giorni", format: (v) => formatKg(Math.round(v * 10) / 10) })) : null,
  );
}
