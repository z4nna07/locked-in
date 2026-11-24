// Griglia annuale a pallini stile Symmetry: colonne = settimane, righe = Lun..Dom.
import { h } from "../ui/dom.js";
import { toISO, addDays, daysInYear, today, MONTHS_LABEL } from "../lib/dates.js";
import { dayLevel } from "../lib/goals.js";
import { indexByDay } from "../lib/selectors.js";

const LEGEND = {
  food: [["l3", "Pulito"], ["l2", "Così così"], ["l1", "Schifezze"]],
  sleep: [["l3", "Obiettivo"], ["l2", "Quasi"], ["l1", "Poco"]],
  default: [["", "Riposo"], ["l3", "Fatto"]],
};

const NOUN = { food: "giorni puliti", gym: "allenamenti", sleep: "notti a obiettivo" };
const countsAsDone = (kind, level) => ((kind === "food" || kind === "sleep") ? level === 3 : level > 0);

export function yearGrid(category, entries, year) {
  const jan1 = new Date(year, 0, 1);
  const lead = (jan1.getDay() + 6) % 7;
  const total = daysInYear(year);
  const cols = Math.ceil((lead + total) / 7);
  const now = today();
  const index = indexByDay(entries);
  const template = `repeat(${cols}, 1fr)`;

  const months = h("div", { class: "months", "aria-hidden": "true", style: { gridTemplateColumns: template } },
    MONTHS_LABEL.map((label, m) => {
      const doy = Math.round((new Date(year, m, 1) - jan1) / 86400000);
      return h("span", { style: { gridColumnStart: String(Math.floor((lead + doy) / 7) + 1) } }, label);
    }),
  );

  let count = 0;
  const dots = [];
  for (let c = 0; c < cols * 7; c++) {
    const n = c - lead;
    if (n < 0 || n >= total) {
      dots.push(h("i", { class: "pad" }));
      continue;
    }
    const date = addDays(jan1, n);
    const iso = toISO(date);
    const level = dayLevel(category.kind, index.get(`${category.id}|${iso}`) ?? [], category.options);
    if (countsAsDone(category.kind, level)) count += 1;
    const cls = [date > now ? "fut" : "", level ? `l${level}` : "", iso === toISO(now) ? "now" : ""].filter(Boolean).join(" ");
    dots.push(h("i", { class: cls || null, title: iso }));
  }

  const legend = (LEGEND[category.kind] ?? LEGEND.default).map(([cls, text]) => h("span", null, h("i", { class: cls || null }), text));
  const noun = NOUN[category.kind] ?? "giorni";

  return h(
    "div",
    null,
    h("div", { class: "year-h" },
      h("div", null, h("div", { class: "cat" }, category.name), h("h2", { class: "yr" }, String(year))),
      h("div", { class: "legend" }, legend),
    ),
    months,
    h("div", { class: "dots", role: "img", "aria-label": `${category.name} ${year}: ${count} ${noun}`, style: { gridTemplateColumns: template } }, dots),
    h("div", { class: "year-foot" }, h("b", null, String(count)), ` ${noun} nel ${year}`),
  );
}
