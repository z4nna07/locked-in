// Card della Home: giornata selezionata e obiettivi della settimana.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { iconFor } from "../lib/kinds.js";
import { goalUnit, dayLevel } from "../lib/goals.js";
import { weekProgress, goalOf } from "../lib/selectors.js";
import { daySummary, dayLabel } from "../lib/summary.js";
import { fromISO, weekDays, MONTHS_SHORT } from "../lib/dates.js";
import { setScore, toggleCheck, stepCount } from "../lib/actions.js";
import { scheduleOf, isScheduled, isoDowOf, countOf, describeSchedule } from "../lib/habits.js";
import { openLogSheet } from "./log.js";

const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

function scoreButtons(category, day, current) {
  return h(
    "div",
    { class: "score", role: "group", "aria-label": `Voto ${category.name}` },
    [1, 2, 3].map((v) =>
      h("button", {
        type: "button", "data-v": v, "aria-pressed": String(current === v), "aria-label": `Voto ${v}`,
        onClick: (ev) => { ev.stopPropagation(); setScore(category.id, day, v); },
      }, String(v)),
    ),
  );
}

function counter(category, day, entries, schedule) {
  const count = countOf(entries);
  const step = (delta) => (ev) => {
    ev.stopPropagation();
    stepCount(category.id, day, delta);
  };
  return h(
    "div",
    { class: "counter", role: "group", "aria-label": `${category.name}: ${count} di ${schedule.perDay}` },
    h("button", { type: "button", "aria-label": "Togli una volta", disabled: count === 0, onClick: step(-1) }, icon("minus")),
    h("span", { class: `num${count >= schedule.perDay ? " full" : ""}` }, `${count}/${schedule.perDay}`),
    h("button", { type: "button", class: "plus-one", "aria-label": "Aggiungi una volta", onClick: step(1) }, icon("plus")),
  );
}

function action(category, day, entries, done) {
  if (category.kind === "food") return scoreButtons(category, day, Number(entries.at(-1)?.amount));
  if (category.kind === "check" && scheduleOf(category.options).mode === "perDay") {
    return counter(category, day, entries, scheduleOf(category.options));
  }
  if (category.kind === "check" || done) {
    const onClick = (ev) => {
      ev.stopPropagation();
      if (category.kind === "check") toggleCheck(category.id, day);
      else openLogSheet(category, day);
    };
    return h("button", { class: `tick${done ? " on" : ""}`, type: "button", "aria-pressed": String(done), "aria-label": `${category.name}: ${done ? "fatto" : "da fare"}`, onClick }, icon("check"));
  }
  return h("span", { class: "go" }, "Registra", icon("chev"));
}

/** Riga di una abitudine personalizzata: giorno di riposo, contatore o spunta. */
function habitSummary(category, day, entries) {
  const schedule = scheduleOf(category.options);
  if (!isScheduled(schedule, isoDowOf(day))) return countOf(entries) > 0 ? "Fatto (giorno di riposo)" : "Riposo oggi";
  if (schedule.mode === "perDay") {
    const left = schedule.perDay - countOf(entries);
    return left <= 0 ? "Completato" : `${describeSchedule(schedule)} · ne ${left === 1 ? "manca 1" : `mancano ${left}`}`;
  }
  return countOf(entries) > 0 ? "Fatto" : describeSchedule(schedule, category.weekly_goal);
}

const isRestDay = (c, day) => c.kind === "check" && !isScheduled(scheduleOf(c.options), isoDowOf(day));

export function dayCard(categories, index, day) {
  let doneCount = 0;
  let dueCount = 0;
  const rows = categories.map((c) => {
    const entries = index.get(`${c.id}|${day}`) ?? [];
    const level = dayLevel(c.kind, entries, c.options);
    const done = c.kind === "sleep" ? level > 0 : level === 3;
    const rest = isRestDay(c, day);
    if (!rest) dueCount += 1;
    if (done && !rest) doneCount += 1;
    const open = () => openLogSheet(c, day);
    const summary = c.kind === "check" ? habitSummary(c, day, entries) : daySummary(c.kind, entries);
    const row = h(
      "div",
      { class: `row${done ? " done" : ""}${rest && !done ? " rest" : ""}`, role: "button", tabindex: 0, onClick: open,
        onKeydown: (ev) => { if (ev.key === "Enter" && ev.target === row) open(); } },
      h("span", { class: "ic" }, icon(iconFor(c))),
      h("div", { class: "txt" }, h("div", { class: "t" }, c.name), h("div", { class: "s" }, summary)),
      action(c, day, entries, done),
    );
    return row;
  });
  return h(
    "section",
    { class: "card", "aria-labelledby": "h-day" },
    h("div", { class: "card-h" }, h("h2", { id: "h-day" }, dayLabel(day)), h("span", { class: "meta" }, h("b", null, String(doneCount)), ` di ${dueCount} fatte`)),
    h("div", { class: "rows" }, rows),
  );
}

export function weekCard(categories, entries, day) {
  const days = weekDays(fromISO(day));
  const first = days[0];
  const last = days[6];
  const range = `${first.getDate()} ${MONTHS_SHORT[first.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
  const goals = categories.filter((c) => goalOf(c) > 0).map((c) => {
    const value = weekProgress(c, entries, day);
    const goal = goalOf(c);
    const pct = Math.min(100, (value / goal) * 100);
    return h(
      "div",
      { class: `goal${value >= goal ? " hit" : ""}` },
      icon(iconFor(c)),
      h("span", { class: "name" }, c.name),
      h("span", { class: "val" }, h("b", null, fmt(value)), ` / ${fmt(goal)} ${goalUnit(c.kind, c.options)}`),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": goal, "aria-valuenow": value, "aria-label": c.name }, h("i", { style: { width: `${pct}%` } })),
    );
  });
  return h(
    "section",
    { class: "card", "aria-labelledby": "h-week" },
    h("div", { class: "card-h" }, h("h2", { id: "h-week" }, "Obiettivi della settimana"), h("span", { class: "meta" }, range)),
    goals.length ? h("div", { class: "goals" }, goals) : h("div", { class: "empty" }, "Nessun obiettivo impostato."),
  );
}
