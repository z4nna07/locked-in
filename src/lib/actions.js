// Azioni: salvano sul database e poi aggiornano lo stato (sempre con nuovi array).
import * as api from "./api.js";
import { getState, setState } from "./store.js";
import { toast } from "../ui/toast.js";

export async function loadAll() {
  const [allCategories, entries, templates, weights, reminders] = await Promise.all([
    api.fetchCategories(), api.fetchEntries(), api.fetchTemplates(), api.fetchWeights(), api.fetchReminders(),
  ]);
  setState({
    categories: allCategories.filter((c) => !c.archived),
    archivedCategories: allCategories.filter((c) => c.archived),
    entries,
    templates,
    weights,
    reminders,
  });
}

async function guarded(task) {
  try {
    return await task();
  } catch (err) {
    toast(err.message, "err");
    return null;
  }
}

/** Le operazioni con la stessa chiave vanno in fila: due tocchi rapidi non si sovrappongono. */
const queues = new Map();
function serialize(key, task) {
  const next = (queues.get(key) ?? Promise.resolve()).then(task, task);
  queues.set(key, next.catch(() => undefined));
  return next;
}

const withoutIds = (entries, ids) => entries.filter((en) => !ids.has(en.id));
const upsertById = (entries, saved) => [...entries.filter((en) => en.id !== saved.id), saved];

function entriesOf(categoryId, day) {
  return getState().entries.filter((en) => en.category_id === categoryId && en.day === day);
}

export function addEntry(categoryId, day, amount, details = {}) {
  return guarded(async () => {
    const saved = await api.insertEntry({ category_id: categoryId, day, amount, details });
    setState((s) => ({ entries: upsertById(s.entries, saved) }));
    return saved;
  });
}

export function editEntry(id, amount, details) {
  return guarded(async () => {
    const saved = await api.updateEntry(id, { amount, details });
    setState((s) => ({ entries: upsertById(s.entries, saved) }));
    return saved;
  });
}

export function removeEntry(id) {
  return guarded(async () => {
    await api.deleteEntry(id);
    setState((s) => ({ entries: s.entries.filter((en) => en.id !== id) }));
    return true;
  });
}

/** Alimentazione: un solo voto al giorno. Toccare di nuovo lo stesso voto lo cancella. */
export function setScore(categoryId, day, score) {
  return serialize(`${categoryId}|${day}`, () => guarded(async () => {
    const existing = entriesOf(categoryId, day);
    const ids = new Set(existing.map((en) => en.id));
    const [first, ...extra] = existing;
    await Promise.all(extra.map((en) => api.deleteEntry(en.id)));
    if (first && Number(first.amount) === score) {
      await api.deleteEntry(first.id);
      setState((s) => ({ entries: withoutIds(s.entries, ids) }));
      return null;
    }
    const saved = first
      ? await api.updateEntry(first.id, { amount: score })
      : await api.insertEntry({ category_id: categoryId, day, amount: score });
    setState((s) => ({ entries: [...withoutIds(s.entries, ids), saved] }));
    return saved;
  }));
}

/** Abitudini semplici: segna o togli il "fatto" del giorno. */
export function toggleCheck(categoryId, day) {
  return serialize(`${categoryId}|${day}`, () => guarded(async () => {
    const existing = entriesOf(categoryId, day);
    const ids = new Set(existing.map((en) => en.id));
    if (existing.length > 0) {
      await Promise.all(existing.map((en) => api.deleteEntry(en.id)));
      setState((s) => ({ entries: withoutIds(s.entries, ids) }));
      return null;
    }
    const saved = await api.insertEntry({ category_id: categoryId, day, amount: 1 });
    setState((s) => ({ entries: upsertById(s.entries, saved) }));
    return saved;
  }));
}

/** Abitudini "N volte al giorno": un'unica registrazione per giorno con il conteggio. */
export function stepCount(categoryId, day, delta, max = 20) {
  return serialize(`${categoryId}|${day}`, () => guarded(async () => {
    const existing = entriesOf(categoryId, day);
    const ids = new Set(existing.map((en) => en.id));
    const current = existing.reduce((s, en) => s + Number(en.amount || 0), 0);
    const next = Math.max(0, Math.min(max, current + delta));
    if (next === current) return null;
    const [first, ...extra] = existing;
    await Promise.all(extra.map((en) => api.deleteEntry(en.id)));
    if (next === 0) {
      if (first) await api.deleteEntry(first.id);
      setState((s) => ({ entries: withoutIds(s.entries, ids) }));
      return null;
    }
    const saved = first
      ? await api.updateEntry(first.id, { amount: next })
      : await api.insertEntry({ category_id: categoryId, day, amount: next });
    setState((s) => ({ entries: [...withoutIds(s.entries, ids), saved] }));
    return saved;
  }));
}

/** Sonno: una sola notte per giorno. Se c'e' gia' la aggiorna, altrimenti la crea. */
export function saveNight(categoryId, day, amount, details) {
  return serialize(`${categoryId}|${day}`, () => guarded(async () => {
    const [first, ...extra] = entriesOf(categoryId, day);
    const extraIds = new Set(extra.map((en) => en.id));
    await Promise.all(extra.map((en) => api.deleteEntry(en.id)));
    const saved = first
      ? await api.updateEntry(first.id, { amount, details })
      : await api.insertEntry({ category_id: categoryId, day, amount, details });
    setState((s) => ({ entries: upsertById(withoutIds(s.entries, extraIds), saved) }));
    return saved;
  }));
}

export function saveCategory(id, patch) {
  return guarded(async () => {
    const saved = await api.updateCategory(id, patch);
    setState((s) => ({ categories: s.categories.map((c) => (c.id === id ? saved : c)) }));
    return saved;
  });
}

export function saveTemplate(id, data) {
  return guarded(async () => {
    if (id) {
      const saved = await api.updateTemplate(id, data);
      setState((s) => ({ templates: s.templates.map((t) => (t.id === id ? saved : t)) }));
      return saved;
    }
    const saved = await api.insertTemplate({ ...data, position: getState().templates.length });
    setState((s) => ({ templates: [...s.templates, saved] }));
    return saved;
  });
}

export function removeTemplate(id) {
  return guarded(async () => {
    await api.deleteTemplate(id);
    setState((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
    return true;
  });
}

/**
 * Crea o aggiorna un promemoria. Solo se cambia l'orario puo' ripartire oggi
 * (cambiare i giorni o accenderlo non lo rimanda se e' gia' arrivato).
 */
export function saveReminder(existing, data) {
  return guarded(async () => {
    const patch = existing && existing.time !== data.time ? { ...data, last_sent_on: null } : data;
    const saved = existing ? await api.updateReminder(existing.id, patch) : await api.insertReminder(data);
    setState((s) => ({ reminders: [...s.reminders.filter((r) => r.id !== saved.id), saved] }));
    return saved;
  });
}

export function saveWeight(day, kg) {
  return guarded(async () => {
    const saved = await api.upsertWeight(day, kg);
    setState((s) => ({ weights: [...s.weights.filter((w) => w.day !== day), saved].sort((a, b) => (a.day < b.day ? -1 : 1)) }));
    return saved;
  });
}

export function removeWeight(id) {
  return guarded(async () => {
    await api.deleteWeight(id);
    setState((s) => ({ weights: s.weights.filter((w) => w.id !== id) }));
    return true;
  });
}

/** Aggiunge un nome (materia o progetto) alle opzioni della categoria, se nuovo. */
export async function rememberOption(category, key, value) {
  const fresh = getState().categories.find((c) => c.id === category.id) ?? category;
  const list = fresh.options?.[key] ?? [];
  if (!value || list.includes(value)) return;
  await saveCategory(fresh.id, { options: { ...fresh.options, [key]: [...list, value] } });
}
