// @vitest-environment jsdom
// Prova di disegno: ogni schermata si costruisce con dati realistici senza errori.
import { describe, it, expect, beforeAll } from "vitest";
import { setState, getState } from "../lib/store.js";
import { toISO, addDays, today } from "../lib/dates.js";
import { saveSession, newSession, clearSession } from "../lib/session.js";
import { renderHome } from "./home.js";
import { renderSleep } from "./sleep.js";
import { renderTrain } from "./train.js";
import { renderCalendar } from "./calendar.js";
import { renderStats } from "./stats.js";
import { renderSession } from "./session.js";
import { renderSetup } from "./setup.js";
import { renderNotifications } from "./notifications.js";

const day = (n) => toISO(addDays(today(), -n));
const cat = (id, kind, name, weekly_goal, options = {}) => ({ id, kind, name, weekly_goal, options, position: 0 });

const categories = [
  cat("g", "gym", "Palestra", 4),
  cat("r", "run", "Corsa", 2),
  cat("f", "food", "Alimentazione", 5),
  cat("s", "study", "Studio", 10, { subjects: ["Analisi"] }),
  cat("p", "project", "Progetti", 5),
  cat("k", "check", "Skin Care", 7),
  cat("z", "sleep", "Sonno", 5, { target_hours: 8 }),
];

function sampleEntries() {
  const list = [];
  for (let n = 0; n < 400; n++) {
    const d = day(n);
    if (n % 2 === 0) list.push({ id: `g${n}`, category_id: "g", day: d, amount: 70, created_at: `${d}T18:00:00Z`, details: { template: "Push A", template_id: "t1", exercises: [{ name: "Panca piana", sets: [{ kg: 60 + (n % 10), reps: 8 }] }] } });
    if (n % 4 === 1) list.push({ id: `r${n}`, category_id: "r", day: d, amount: 5.2, created_at: `${d}T07:00:00Z`, details: { seconds: 1685 } });
    list.push({ id: `f${n}`, category_id: "f", day: d, amount: (n % 3) + 1, created_at: `${d}T21:00:00Z`, details: {} });
    if (n % 3 === 0) list.push({ id: `s${n}`, category_id: "s", day: d, amount: 90, created_at: `${d}T15:00:00Z`, details: { label: "Analisi" } });
    if (n % 5 === 0) list.push({ id: `p${n}`, category_id: "p", day: d, amount: 60, created_at: `${d}T22:00:00Z`, details: { label: "Locked In" } });
    if (n % 2 === 1) list.push({ id: `k${n}`, category_id: "k", day: d, amount: 1, created_at: `${d}T22:30:00Z`, details: {} });
    list.push({ id: `z${n}`, category_id: "z", day: d, amount: 420 + (n % 5) * 20, created_at: `${d}T08:00:00Z`, details: { bed: "23:40", wake: "07:10" } });
  }
  return list.sort((a, b) => (a.day < b.day ? -1 : 1));
}

beforeAll(() => {
  globalThis.requestAnimationFrame ??= (cb) => setTimeout(cb, 0);
  setState({
    categories,
    entries: sampleEntries(),
    templates: [{ id: "t1", name: "Push A", exercises: [{ name: "Panca piana", sets: 4, reps: 8 }, { name: "Military press", sets: 3, reps: 10 }] }],
    weights: [{ id: "w1", day: day(40), kg: 76.2 }, { id: "w2", day: day(10), kg: 75.4 }, { id: "w3", day: day(1), kg: 75.1 }],
    selectedDay: day(0),
    session: { user: { email: "prova@example.com" } },
  });
});

const mount = () => document.body.appendChild(document.createElement("div"));

describe("schermate", () => {
  it("Home", () => {
    const root = mount();
    renderHome(root, getState());
    expect(root.textContent).toContain("Obiettivi della settimana");
    expect(root.querySelectorAll(".dots i").length).toBeGreaterThan(360);
  });

  it("Sonno", () => {
    const root = mount();
    renderSleep(root, getState());
    expect(root.textContent).toContain("Statistiche");
    expect(root.querySelectorAll("svg.chart").length).toBe(2);
  });

  it("Allenati", () => {
    const root = mount();
    renderTrain(root, getState());
    expect(root.textContent).toContain("Push A");
    expect(root.textContent).toContain("Record personali");
    expect(root.textContent).toContain("Peso corporeo");
  });

  it("Calendario con piu' anni", () => {
    const root = mount();
    renderCalendar(root, getState());
    expect(root.querySelectorAll(".yr").length).toBeGreaterThanOrEqual(2);
    setState({ calendarCategory: "z" });
    renderCalendar(root, getState());
    expect(root.textContent).toContain("notti a obiettivo");
  });

  it("Statistiche per ogni periodo", () => {
    [4, 13, 52].forEach((weeks) => {
      setState({ statsWeeks: weeks });
      const root = mount();
      renderStats(root, getState());
      expect(root.textContent).toContain("Costanza");
      expect(root.textContent).toContain("Passo migliore");
      expect(root.textContent).toContain("Analisi");
    });
  });

  it("Allenamento in corso", () => {
    const history = getState().entries.filter((e) => e.category_id === "g");
    saveSession(newSession({ categoryId: "g", day: day(0), template: getState().templates[0], history }));
    const root = mount();
    renderSession(root);
    expect(root.textContent).toContain("Ultima volta");
    expect(root.querySelectorAll(".set-row").length).toBeGreaterThanOrEqual(4);
    clearSession();
  });

  it("Notifiche", () => {
    setState({ reminders: [{ id: "r1", kind: "streak_risk", category_id: null, time: "20:00", days: [1, 2, 3, 4, 5, 6, 7], enabled: true }] });
    const root = mount();
    renderNotifications(root, getState());
    expect(root.textContent).toContain("Streak a rischio");
    expect(root.querySelectorAll(".rem").length).toBe(2 + categories.length);
    expect(root.querySelector('.rem [aria-checked="true"]')).not.toBeNull();
  });

  it("Categorie e obiettivi", () => {
    const root = mount();
    renderSetup(root);
    expect(root.textContent).toContain("Ore di sonno a notte");
  });
});
