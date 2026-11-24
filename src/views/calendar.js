// Calendario: scelta della categoria e griglie a pallini di tutti gli anni, dal piu' recente.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { setState } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { iconFor } from "../lib/kinds.js";
import { byCategory, categoryStreak } from "../lib/selectors.js";
import { bestStreak, firstYear } from "../lib/stats.js";
import { dayLevel } from "../lib/goals.js";
import { yearGrid } from "./year-grid.js";

function doneDays(category, entries) {
  const byDay = new Map();
  entries.forEach((en) => byDay.set(en.day, [...(byDay.get(en.day) ?? []), en]));
  let count = 0;
  byDay.forEach((list) => {
    const level = dayLevel(category.kind, list, category.options);
    if (category.kind === "food" || category.kind === "sleep" ? level === 3 : level > 0) count += 1;
  });
  return count;
}

function tabs(categories, selected) {
  return h(
    "div",
    { class: "streaks", role: "tablist", "aria-label": "Categoria" },
    categories.map((c) =>
      h("button", {
        class: `chip${c.id === selected.id ? " on" : ""}`, type: "button", role: "tab", "aria-selected": String(c.id === selected.id),
        onClick: () => setState({ calendarCategory: c.id }),
      }, icon(iconFor(c)), c.name),
    ),
  );
}

function summary(category, entries) {
  const current = categoryStreak(category, entries, today());
  const best = bestStreak(category.kind, Number(category.weekly_goal), entries, category.options);
  const noun = { food: "giorni puliti", sleep: "notti a obiettivo", gym: "allenamenti" }[category.kind] ?? "giorni fatti";
  const tile = (label, value, flame) =>
    h("div", { class: "tile" }, h("div", { class: "lbl" }, label), h("div", { class: `val num${flame ? " flame" : ""}` }, flame ? icon("flame", "") : null, value));
  return h(
    "section",
    { class: "card" },
    h("div", { class: "tiles three" },
      tile("Streak attuale", `${current} sett.`, true),
      tile("Migliore", `${best} sett.`),
      tile("Totale", `${doneDays(category, entries)} ${noun}`),
    ),
  );
}

export function renderCalendar(root, state) {
  const { categories } = state;
  const selected = categories.find((c) => c.id === state.calendarCategory) ?? categories[0];
  const own = byCategory(state.entries, selected.id);
  const year = today().getFullYear();
  const years = [];
  for (let y = year; y >= firstYear(own, year); y--) years.push(y);

  root.replaceChildren(
    h("header", { class: "page-h" }, h("div", null, h("span", { class: "eyebrow" }, "Storico"), h("h1", null, "Calendario"))),
    tabs(categories, selected),
    summary(selected, own),
    ...years.map((y) => h("section", { class: "card" }, yearGrid(selected, state.entries, y))),
  );
}
