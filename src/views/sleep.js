// Schermata Sonno: ultima notte, statistiche, grafici, griglia annuale e storico.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { barChart, rangeChart } from "../ui/charts.js";
import { toISO, fromISO, addDays, today, formatDuration, WEEKDAYS_SHORT } from "../lib/dates.js";
import { parseClock, sleepLevel, sleepStats, minutesToClock } from "../lib/sleep.js";
import { DEFAULT_SLEEP_HOURS } from "../lib/goals.js";
import { byCategory } from "../lib/selectors.js";
import { entrySummary, dayLabel } from "../lib/summary.js";
import { openLogSheet } from "./log.js";
import { yearGrid } from "./year-grid.js";

const NIGHTS = 14;
const LEVEL_CLS = { 3: "ok", 2: "near", 1: "low" };

export function sleepCategory(categories) {
  return categories.find((c) => c.kind === "sleep");
}

export function targetOf(category) {
  return Number(category.options?.target_hours) || DEFAULT_SLEEP_HOURS;
}

/** Minuti per notte, sommando eventuali pisolini dello stesso giorno. */
function totalsByDay(entries) {
  const map = new Map();
  entries.forEach((en) => map.set(en.day, (map.get(en.day) ?? 0) + Number(en.amount)));
  return map;
}

function lastNight(category, entries, target) {
  const last = entries.at(-1);
  if (!last) return null;
  const minutes = totalsByDay(entries).get(last.day);
  const missing = target * 60 - minutes;
  const status = missing <= 0
    ? h("span", { class: "pill ok" }, "Obiettivo raggiunto")
    : h("span", { class: "pill low" }, `Mancano ${formatDuration(missing)}`);
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, `Ultima notte · ${dayLabel(last.day)}`), status),
    h("div", { class: "night" },
      h("div", { class: "big num" }, formatDuration(minutes)),
      h("div", { class: "night-times" },
        h("span", null, icon("moon"), last.details?.bed ?? "–"),
        h("span", null, icon("sun"), last.details?.wake ?? "–"),
      ),
    ),
  );
}

function tile(labelText, value, sub) {
  return h("div", { class: "tile" }, h("div", { class: "lbl" }, labelText), h("div", { class: "val num" }, value), sub ? h("div", { class: "sub" }, sub) : null);
}

function statsCard(entries, target) {
  const s = sleepStats(entries, target, toISO(today()));
  const dash = "–";
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Statistiche"), h("span", { class: "meta" }, `obiettivo ${String(target).replace(".", ",")} h`)),
    h("div", { class: "tiles" },
      tile("Media 7 giorni", s.avg7 != null ? formatDuration(s.avg7) : dash, `${s.nights7} notti registrate`),
      tile("Media 30 giorni", s.avg30 != null ? formatDuration(s.avg30) : dash),
      tile("Debito settimana", s.nights7 ? formatDuration(s.debt7) : dash, "ore sotto l'obiettivo"),
      tile("A letto in media", s.bedtime != null ? minutesToClock(s.bedtime) : dash),
      tile("Sveglia in media", s.wake != null ? minutesToClock(s.wake) : dash),
      tile("Regolarità", s.spread != null ? `± ${s.spread} min` : dash, "scarto sull'ora di letto"),
    ),
  );
}

function chartsCards(entries, target) {
  const totals = totalsByDay(entries);
  const lastByDay = new Map(entries.map((en) => [en.day, en]));
  const days = Array.from({ length: NIGHTS }, (_, i) => addDays(today(), i - (NIGHTS - 1)));
  const label = (d) => (toISO(d) === toISO(today()) ? "Oggi" : WEEKDAYS_SHORT[d.getDay()].slice(0, 2));
  const items = days.map((d) => {
    const value = totals.get(toISO(d)) ?? 0;
    return { label: label(d), value, cls: value ? LEVEL_CLS[sleepLevel(value, target)] : "" };
  });
  const nights = days.flatMap((d) => {
    const en = lastByDay.get(toISO(d));
    const bed = parseClock(en?.details?.bed ?? "");
    if (!en || bed == null) return [];
    const start = bed < 720 ? bed + 1440 : bed;
    return [{ label: label(d), start, end: start + Number(en.amount), cls: LEVEL_CLS[sleepLevel(Number(en.amount), target)] }];
  });
  return [
    h("section", { class: "card" },
      h("div", { class: "card-h" }, h("h2", null, "Ore dormite"), h("span", { class: "meta" }, `ultime ${NIGHTS} notti`)),
      h("div", { class: "chart-wrap" }, barChart({ items, target: target * 60, label: "Ore dormite nelle ultime due settimane" })),
      h("div", { class: "chart-legend" }, h("span", null, h("i", { class: "ok" }), "Raggiunto"), h("span", null, h("i", { class: "near" }), "Manca meno di 1 h"), h("span", null, h("i", { class: "low" }), "Poco"), h("span", null, h("i", { class: "line" }), "Obiettivo")),
    ),
    h("section", { class: "card" },
      h("div", { class: "card-h" }, h("h2", null, "Orari"), h("span", { class: "meta" }, "da letto a sveglia")),
      nights.length
        ? h("div", { class: "chart-wrap" }, rangeChart({ nights, label: "Orari di sonno nelle ultime due settimane" }))
        : h("div", { class: "empty" }, "Ancora nessuna notte con orari."),
    ),
  ];
}

function historyCard(category, entries) {
  const recent = [...entries].reverse().slice(0, 30);
  return h(
    "section",
    { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Storico"), h("span", { class: "meta" }, "tocca per modificare")),
    h("div", { class: "list", style: { marginBottom: "0" } },
      recent.map((en) =>
        h("button", { class: "item", type: "button", onClick: () => openLogSheet(category, en.day) },
          h("div", { class: "txt" }, h("div", null, dayLabel(en.day)), h("div", { class: "s" }, entrySummary("sleep", en))),
          icon("chev"),
        ),
      ),
    ),
  );
}

export function renderSleep(root, state) {
  const category = sleepCategory(state.categories);
  const todayIso = toISO(today());
  if (!category) {
    root.replaceChildren(
      h("section", { class: "card soon" },
        h("h2", null, "Sonno"),
        h("p", null, "Attiva la categoria Sonno per registrare a che ora vai a letto e ti svegli."),
        h("a", { class: "btn", href: "#obiettivi" }, "Categorie e obiettivi"),
      ),
    );
    return;
  }
  const target = targetOf(category);
  const entries = byCategory(state.entries, category.id).sort((a, b) => (a.day === b.day ? 0 : a.day < b.day ? -1 : 1));
  const header = h("header", { class: "page-h" },
    h("div", null, h("span", { class: "eyebrow" }, "Riposo"), h("h1", null, category.name)),
    h("button", { class: "btn", type: "button", onClick: () => openLogSheet(category, todayIso) }, icon("plus"), "Registra notte"),
  );
  if (entries.length === 0) {
    root.replaceChildren(header, h("section", { class: "card empty" }, "Registra la tua prima notte: ora in cui sei andato a letto e ora della sveglia. Grafici e medie compaiono da soli."));
    return;
  }
  root.replaceChildren(
    header,
    h("div", { class: "grid" },
      lastNight(category, entries, target),
      statsCard(entries, target),
      ...chartsCards(entries, target),
      h("section", { class: "card span2" }, yearGrid(category, state.entries, fromISO(todayIso).getFullYear())),
      historyCard(category, entries),
    ),
  );
}

/** Card compatta per la Home: ultima notte e media, porta alla schermata Sonno. */
export function sleepHomeCard(state) {
  const category = sleepCategory(state.categories);
  if (!category) return null;
  const target = targetOf(category);
  const entries = byCategory(state.entries, category.id).sort((a, b) => (a.day < b.day ? -1 : 1));
  const s = sleepStats(entries, target, toISO(today()));
  const last = entries.at(-1);
  return h(
    "a",
    { class: "card sleep-link", href: "#sonno" },
    h("span", { class: "ic" }, icon("moon")),
    h("div", { class: "txt" },
      h("div", { class: "t" }, category.name),
      h("div", { class: "s" }, last ? `Ultima notte ${formatDuration(totalsByDay(entries).get(last.day))} · media 7 gg ${s.avg7 != null ? formatDuration(s.avg7) : "–"}` : "Apri per vedere grafici e medie"),
    ),
    icon("chev"),
  );
}
