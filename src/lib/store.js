// Stato globale minimo: ogni aggiornamento crea un nuovo oggetto (niente mutazioni).
import { toISO, today } from "./dates.js";

let state = {
  session: null,
  categories: [],
  archivedCategories: [],
  entries: [],
  templates: [],
  weights: [],
  reminders: [],
  selectedDay: toISO(today()),
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
