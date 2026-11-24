// Home: intestazione, striscia dei giorni, streak, giornata, settimana e anno.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { setState } from "../lib/store.js";
import { toISO, fromISO, addDays, today, WEEKDAYS, WEEKDAYS_SHORT, formatLongDate } from "../lib/dates.js";
import { dayLevel } from "../lib/goals.js";
import { indexByDay, categoryStreak } from "../lib/selectors.js";
import { iconFor } from "../lib/kinds.js";
import { dayCard, weekCard } from "./home-cards.js";
import { yearGrid } from "./year-grid.js";
import { openProfile, openNotifications } from "./menus.js";
import { sleepHomeCard } from "./sleep.js";

const STRIP_DAYS = 21;

function header(day) {
  const d = fromISO(day);
  return h(
    "header",
    { class: "top" },
    h("button", { class: "circle", type: "button", "aria-label": "Profilo e impostazioni", onClick: openProfile }, icon("user")),
    h("div", { class: "top-title" }, h("span", { class: "eyebrow" }, WEEKDAYS[d.getDay()]), h("h1", null, formatLongDate(d))),
    h("button", { class: "circle", type: "button", "aria-label": "Notifiche", onClick: openNotifications }, icon("bell")),
  );
}

function dayStrip(categories, index, selected) {
  const now = today();
  const todayIso = toISO(now);
  const strip = h("div", { class: "days", role: "tablist", "aria-label": "Scegli il giorno" });
  for (let i = -(STRIP_DAYS - 1); i <= 0; i++) {
    const date = addDays(now, i);
    const iso = toISO(date);
    const filled = categories.filter((c) => dayLevel(c.kind, index.get(`${c.id}|${iso}`) ?? [], c.options) > 0).length;
    const cls = ["day", iso === selected ? "sel" : "", iso === todayIso ? "today" : ""].filter(Boolean).join(" ");
    strip.append(
      h(
        "button",
        { class: cls, type: "button", role: "tab", "aria-selected": String(iso === selected), onClick: () => setState({ selectedDay: iso }) },
        h("span", { class: "wd" }, iso === todayIso ? "Oggi" : WEEKDAYS_SHORT[date.getDay()]),
        h("span", { class: "n" }, String(date.getDate())),
        h("span", { class: "pips" }, Array.from({ length: Math.min(filled, 5) }, () => h("i"))),
      ),
    );
  }
  requestAnimationFrame(() => {
    const sel = strip.querySelector(".sel");
    if (sel) strip.scrollLeft = sel.offsetLeft - strip.clientWidth / 2 + sel.clientWidth / 2;
  });
  return strip;
}

function streakChips(categories, entries) {
  const now = today();
  return h(
    "div",
    { class: "streaks", "aria-label": "Streak in settimane" },
    categories.filter((c) => Number(c.weekly_goal) > 0).map((c) => {
      const n = categoryStreak(c, entries, now);
      return h(
        "span",
        { class: "chip", title: `${n} settimane di fila` },
        icon(iconFor(c)),
        c.name,
        h("span", { class: `flame${n ? "" : " off"}` }, icon("flame", ""), String(n)),
      );
    }),
  );
}

export function renderHome(root, state) {
  const { categories, entries, selectedDay } = state;
  const index = indexByDay(entries);
  const main = categories.find((c) => c.kind === "gym") ?? categories[0];
  root.replaceChildren(
    header(selectedDay),
    dayStrip(categories, index, selectedDay),
    streakChips(categories, entries),
    h(
      "div",
      { class: "grid" },
      dayCard(categories, index, selectedDay),
      h("div", { class: "stack" }, weekCard(categories, entries, selectedDay), sleepHomeCard(state)),
      main ? h("section", { class: "card span2" }, yearGrid(main, entries, today().getFullYear())) : null,
    ),
  );
}
