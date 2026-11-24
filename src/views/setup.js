// Categorie e obiettivi settimanali: primo avvio e modifica successiva.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { PRESETS, CUSTOM, KIND_ICON, SLEEP_TARGET, goalLimits } from "../lib/kinds.js";
import { goalUnit } from "../lib/goals.js";
import * as api from "../lib/api.js";
import { getState, setState } from "../lib/store.js";

const MAX_CUSTOM_NAME = 40;

const fromCategory = (c, enabled) => ({ id: c.id, kind: c.kind, name: c.name, weekly_goal: Number(c.weekly_goal), options: c.options ?? {}, enabled });
const fromPreset = (p, enabled) => ({ kind: p.kind, name: p.name, weekly_goal: p.weekly_goal, options: p.options ?? {}, enabled });

function initialDraft(categories, archived) {
  const known = [...categories, ...archived];
  if (known.length === 0) return PRESETS.map((p) => fromPreset(p, true));
  // Le disattivate tornano con il loro id (e quindi con lo storico); le proposte mai usate compaiono spente.
  const missing = PRESETS.filter((p) => !known.some((c) => c.kind === p.kind)).map((p) => fromPreset(p, false));
  return [...categories.map((c) => fromCategory(c, true)), ...archived.map((c) => fromCategory(c, false)), ...missing];
}

function stepper(label, value, onChange, limits) {
  let current = value;
  const show = (v) => String(v).replace(".", ",");
  const out = h("output", null, show(current));
  const set = (v) => {
    current = Math.round(Math.max(limits.min ?? 0, Math.min(limits.max, v)) * 10) / 10;
    out.textContent = show(current);
    onChange(current);
  };
  return h(
    "div",
    { class: "cat-goal" },
    h("span", null, label),
    h(
      "div",
      { class: "stepper" },
      h("button", { type: "button", "aria-label": `Diminuisci: ${label}`, onClick: () => set(current - limits.step) }, icon("minus")),
      out,
      h("button", { type: "button", "aria-label": `Aumenta: ${label}`, onClick: () => set(current + limits.step) }, icon("plus")),
    ),
  );
}

function goalSteppers(item, update) {
  const limits = goalLimits(item.kind);
  if (item.kind !== "sleep") {
    return [stepper(`Obiettivo a settimana (${goalUnit(item.kind)})`, item.weekly_goal, (v) => update({ weekly_goal: v }), limits)];
  }
  const target = Number(item.options?.target_hours) || 8;
  return [
    stepper("Ore di sonno a notte", target, (v) => update({ options: { ...item.options, target_hours: v } }), SLEEP_TARGET),
    stepper("Notti a obiettivo a settimana", item.weekly_goal, (v) => update({ weekly_goal: v }), limits),
  ];
}

function catCard(item, update) {
  const toggle = h("button", { class: "toggle", type: "button", role: "switch", "aria-checked": String(item.enabled), "aria-label": `Traccia ${item.name}` });
  const card = h("div", { class: `cat${item.enabled ? "" : " off"}` });
  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", String(enabled));
    card.classList.toggle("off", !enabled);
    update({ enabled });
  });
  const name = h("input", { class: "cat-name", value: item.name, maxlength: MAX_CUSTOM_NAME, "aria-label": "Nome categoria" });
  name.addEventListener("input", () => update({ name: name.value }));
  card.append(
    h("span", { class: "ic" }, icon(KIND_ICON[item.kind])),
    h(
      "div",
      { class: "cat-main" },
      h("div", { class: "cat-top" }, name, toggle),
      goalSteppers(item, update),
    ),
  );
  return card;
}

async function persist(draft) {
  const active = draft.filter((d) => d.enabled);
  if (active.length === 0) throw new Error("Tieni attiva almeno una categoria.");
  if (active.some((d) => !d.name.trim())) throw new Error("Dai un nome a ogni categoria attiva.");
  const positioned = draft.map((d, position) => ({ ...d, position }));
  const toCreate = positioned.filter((d) => !d.id && d.enabled).map((d) => ({
    kind: d.kind, name: d.name.trim(), weekly_goal: d.weekly_goal, icon: KIND_ICON[d.kind], options: d.options ?? {}, position: d.position,
  }));
  const created = toCreate.length > 0 ? await api.insertCategories(toCreate) : [];
  const updated = await Promise.all(
    positioned.filter((d) => d.id).map((d) =>
      api.updateCategory(d.id, { name: d.name.trim() || "Senza nome", weekly_goal: d.weekly_goal, options: d.options ?? {}, archived: !d.enabled, position: d.position }),
    ),
  );
  const all = [...updated, ...created].sort((a, b) => a.position - b.position);
  setState({ categories: all.filter((c) => !c.archived), archivedCategories: all.filter((c) => c.archived) });
}

export function renderSetup(root, { first = false } = {}) {
  let draft = initialDraft(getState().categories, getState().archivedCategories ?? []);
  const list = h("div", { class: "cat-list" });
  const paintList = () =>
    list.replaceChildren(
      ...draft.map((item, idx) =>
        catCard(item, (patch) => {
          draft = draft.map((d, i) => (i === idx ? { ...d, ...patch } : d));
        }),
      ),
    );

  const newName = h("input", { class: "input", id: "new-habit", placeholder: "Es. Lettura, Sonno, Meditazione", maxlength: MAX_CUSTOM_NAME });
  const addBtn = h("button", { class: "btn ghost", type: "button" }, icon("plus"), "Aggiungi");
  addBtn.addEventListener("click", () => {
    const name = newName.value.trim();
    if (!name) return toast("Scrivi il nome dell'abitudine.");
    draft = [...draft, { kind: CUSTOM.kind, name, weekly_goal: CUSTOM.weekly_goal, options: {}, enabled: true }];
    newName.value = "";
    paintList();
  });

  const save = h("button", { class: "btn block", type: "button" }, first ? "Inizia" : "Salva");
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      await persist(draft);
      toast(first ? "Pronto! Buona settimana." : "Salvato", "ok");
      location.hash = "#home";
    } catch (err) {
      toast(err.message, "err");
    } finally {
      save.disabled = false;
    }
  });

  paintList();
  root.replaceChildren(
    h(
      "div",
      { class: `setup${first ? " setup-first" : ""}` },
      h(
        "div",
        { class: "setup-h" },
        h("h1", null, first ? "Cosa vuoi tracciare?" : "Categorie e obiettivi"),
        h("p", null, "Attiva le categorie e scegli l'obiettivo settimanale. La streak conta le settimane di fila in cui lo raggiungi."),
      ),
      list,
      h("div", { class: "field" }, h("label", { for: "new-habit" }, "Aggiungi un'abitudine (sì/no al giorno)"), h("div", { class: "add-row" }, newName, addBtn)),
      h("div", { class: "setup-actions" }, save),
    ),
  );
}
