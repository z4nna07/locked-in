// Categorie e obiettivi: elenco con interruttori; un tocco apre l'editor (category-editor.js).
// Primo avvio: le scelte restano in bozza fino a "Inizia". Dopo: ogni modifica si salva subito.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { PRESETS, CUSTOM, KIND_ICON } from "../lib/kinds.js";
import { scheduleOf, weeklyTarget, isDayBased } from "../lib/habits.js";
import * as api from "../lib/api.js";
import { getState, setState } from "../lib/store.js";
import { openCategoryEditor, categorySummary } from "./category-editor.js";

const fromCategory = (c, enabled) => ({ id: c.id, kind: c.kind, name: c.name, icon: c.icon, weekly_goal: Number(c.weekly_goal), options: c.options ?? {}, enabled });
const fromPreset = (p, enabled) => ({ kind: p.kind, name: p.name, icon: KIND_ICON[p.kind], weekly_goal: p.weekly_goal, options: p.options ?? {}, enabled });

function initialDraft(categories, archived) {
  const known = [...categories, ...archived];
  if (known.length === 0) return PRESETS.map((p) => fromPreset(p, true));
  // Le disattivate tornano con il loro id (e quindi con lo storico); le proposte mai usate compaiono spente.
  const missing = PRESETS.filter((p) => !known.some((c) => c.kind === p.kind)).map((p) => fromPreset(p, false));
  return [...categories.map((c) => fromCategory(c, true)), ...archived.map((c) => fromCategory(c, false)), ...missing];
}

/** Campi da salvare; per le abitudini quotidiane l'obiettivo settimanale deriva dai giorni previsti. */
function rowOf(d, position) {
  const schedule = d.kind === "check" ? scheduleOf(d.options) : null;
  const weeklyGoal = schedule && isDayBased(schedule) ? weeklyTarget(schedule, d.weekly_goal) : d.weekly_goal;
  return {
    name: d.name.trim() || "Senza nome",
    icon: d.icon || KIND_ICON[d.kind],
    weekly_goal: weeklyGoal,
    options: d.options ?? {},
    archived: !d.enabled,
    position,
  };
}

function applySaved(saved) {
  setState((s) => {
    const all = [...s.categories, ...s.archivedCategories].filter((c) => c.id !== saved.id);
    const sorted = [...all, saved].sort((a, b) => a.position - b.position);
    return { categories: sorted.filter((c) => !c.archived), archivedCategories: sorted.filter((c) => c.archived) };
  });
}

/** Salva subito una categoria (modalita' modifica). */
async function persistOne(d, position) {
  try {
    const row = rowOf(d, position);
    const saved = d.id ? await api.updateCategory(d.id, row) : (await api.insertCategories([{ kind: d.kind, ...row }]))[0];
    applySaved(saved);
    return saved;
  } catch (err) {
    toast(err.message, "err");
    return null;
  }
}

/** Primo avvio: salva tutte le categorie attive insieme. */
async function persistAll(draft) {
  const active = draft.filter((d) => d.enabled);
  if (active.length === 0) throw new Error("Tieni attiva almeno una categoria.");
  const toCreate = draft.map((d, i) => ({ d, i })).filter(({ d }) => d.enabled && !d.id).map(({ d, i }) => ({ kind: d.kind, ...rowOf(d, i) }));
  const created = toCreate.length ? await api.insertCategories(toCreate) : [];
  const updated = await Promise.all(draft.map((d, i) => ({ d, i })).filter(({ d }) => d.id).map(({ d, i }) => api.updateCategory(d.id, rowOf(d, i))));
  const all = [...updated, ...created].sort((a, b) => a.position - b.position);
  setState({ categories: all.filter((c) => !c.archived), archivedCategories: all.filter((c) => c.archived) });
}

export function renderSetup(root, { first = false } = {}) {
  let draft = initialDraft(getState().categories, getState().archivedCategories ?? []);
  const list = h("div", { class: "cat-list" });

  /** Applica una modifica: in bozza al primo avvio, salvata subito dopo. */
  async function commit(idx, next) {
    if (first) {
      draft = draft.map((d, i) => (i === idx ? next : d));
      paint();
      return true;
    }
    if (!next.enabled && draft.filter((d) => d.enabled).length <= 1 && draft[idx]?.enabled) {
      toast("Tieni attiva almeno una categoria.");
      paint();
      return false;
    }
    const saved = await persistOne(next, idx);
    if (!saved) {
      paint();
      return false;
    }
    draft = draft.map((d, i) => (i === idx ? fromCategory(saved, !saved.archived) : d));
    paint();
    return true;
  }

  function row(item, idx) {
    const toggle = h("button", { class: "toggle", type: "button", role: "switch", "aria-checked": String(item.enabled), "aria-label": `Traccia ${item.name}` });
    toggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggle.disabled = true;
      commit(idx, { ...item, enabled: !item.enabled });
    });
    const open = () => openCategoryEditor(item, { onSave: (next) => commit(idx, next) });
    return h("div", { class: `cat-row${item.enabled ? "" : " off"}` },
      h("button", { class: "cat-open", type: "button", onClick: open, "aria-label": `Modifica ${item.name}` },
        h("span", { class: "ic" }, icon(item.icon && item.icon !== "check" ? item.icon : KIND_ICON[item.kind])),
        h("span", { class: "txt" }, h("span", { class: "t" }, item.name), h("span", { class: "s" }, categorySummary(item))),
        icon("chev", "i chev"),
      ),
      toggle,
    );
  }

  function paint() {
    list.replaceChildren(...draft.map(row));
  }

  const addHabit = h("button", { class: "btn ghost block", type: "button" }, icon("plus"), "Nuova abitudine");
  addHabit.addEventListener("click", () => {
    const blank = { kind: CUSTOM.kind, name: "", icon: "checkbox", weekly_goal: CUSTOM.weekly_goal, options: { schedule: { mode: "daily" } }, enabled: true };
    openCategoryEditor(blank, {
      isNew: true,
      onSave: async (next) => {
        draft = [...draft, next];
        const ok = await commit(draft.length - 1, next);
        if (!ok && !first) draft = draft.slice(0, -1);
        if (ok) toast(`${next.name} aggiunta`, "ok");
        paint();
        return ok;
      },
    });
  });

  const actions = [];
  if (first) {
    const start = h("button", { class: "btn block", type: "button" }, "Inizia");
    start.addEventListener("click", async () => {
      start.disabled = true;
      try {
        await persistAll(draft);
        toast("Pronto! Buona settimana.", "ok");
        location.hash = "#home";
      } catch (err) {
        toast(err.message, "err");
      } finally {
        start.disabled = false;
      }
    });
    actions.push(h("div", { class: "setup-actions" }, start));
  }

  paint();
  root.replaceChildren(
    h("div", { class: `setup${first ? " setup-first" : ""}` },
      h("div", { class: "setup-h" },
        h("h1", null, first ? "Cosa vuoi tracciare?" : "Categorie e obiettivi"),
        h("p", null, first
          ? "Accendi quello che vuoi tracciare e tocca una categoria per cambiarne obiettivo e icona. Puoi aggiungere abitudini tue."
          : "Tocca una categoria per modificarla. Le modifiche si salvano subito; spegnendo una categoria il suo storico resta."),
      ),
      list,
      addHabit,
      ...actions,
    ),
  );
}
