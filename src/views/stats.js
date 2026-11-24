// Statistiche: periodo, costanza sugli obiettivi, una card per categoria, peso.
import { h } from "../ui/dom.js";
import { lineChart } from "../ui/charts.js";
import { setState } from "../lib/store.js";
import { today, toISO, fromISO, MONTHS_SHORT } from "../lib/dates.js";
import { byCategory, goalOf } from "../lib/selectors.js";
import { weeklySeries, goalRate, startWeek } from "../lib/stats.js";
import { formatKg } from "../lib/summary.js";
import { categoryCard, hbars } from "./stats-cards.js";

const PERIODS = [
  { weeks: 4, label: "4 settimane" },
  { weeks: 13, label: "3 mesi" },
  { weeks: 52, label: "1 anno" },
];

function periodTabs(weeks) {
  return h("div", { class: "streaks", role: "tablist", "aria-label": "Periodo" },
    PERIODS.map((p) => h("button", {
      class: `chip${p.weeks === weeks ? " on" : ""}`, type: "button", role: "tab", "aria-selected": String(p.weeks === weeks),
      onClick: () => setState({ statsWeeks: p.weeks }),
    }, p.label)));
}

function consistencyCard(rows) {
  if (!rows.length) return null;
  const met = rows.reduce((s, r) => s + r.rate.met, 0);
  const weeks = rows.reduce((s, r) => s + r.rate.weeks, 0);
  return h("section", { class: "card span2" },
    h("div", { class: "card-h" },
      h("h2", null, "Costanza"),
      h("span", { class: "meta" }, weeks ? h("b", null, `${Math.round((met / weeks) * 100)}%`) : "–", " degli obiettivi settimanali"),
    ),
    weeks === 0
      ? h("p", { class: "hint" }, "La costanza si calcola sulle settimane concluse da quando hai iniziato: torna qui da lunedì prossimo.")
      : hbars(rows.filter((r) => r.rate.weeks > 0).map((r) => ({ label: r.category.name, value: r.rate.met, text: `${r.rate.met} su ${r.rate.weeks} settimane` }))),
  );
}

function weightCard(weights, from) {
  const points = weights.filter((w) => w.day >= from).map((w) => {
    const d = fromISO(w.day);
    return { label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, value: Number(w.kg) };
  });
  if (points.length < 2) return null;
  const diff = Math.round((points.at(-1).value - points[0].value) * 10) / 10;
  return h("section", { class: "card" },
    h("div", { class: "card-h" }, h("h2", null, "Peso corporeo"), h("span", { class: "meta" }, `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${formatKg(Math.abs(diff))} kg nel periodo`)),
    h("div", { class: "chart-wrap" }, lineChart({ points, label: "Andamento del peso", format: (v) => formatKg(Math.round(v * 10) / 10) })),
  );
}

export function renderStats(root, state) {
  const weeks = state.statsWeeks ?? 4;
  const now = today();
  const withData = state.categories.map((c) => {
    const series = weeklySeries(c, byCategory(state.entries, c.id), now, weeks);
    const from = series[0].start;
    return { category: c, series, entries: byCategory(state.entries, c.id).filter((en) => en.day >= from && en.day <= toISO(now)), from };
  });
  const rates = withData
    .filter((d) => goalOf(d.category) > 0)
    .map((d) => ({
      category: d.category,
      rate: goalRate(d.series, goalOf(d.category), startWeek(d.category, byCategory(state.entries, d.category.id))),
    }));
  const from = withData[0]?.from ?? toISO(now);

  root.replaceChildren(
    h("header", { class: "page-h" }, h("div", null, h("span", { class: "eyebrow" }, "Andamento"), h("h1", null, "Statistiche"))),
    periodTabs(weeks),
    h("div", { class: "grid" },
      consistencyCard(rates),
      ...withData.map((d) => categoryCard(d.category, d.entries, d.series)),
      weightCard(state.weights, from),
    ),
  );
}
