// Creazione e modifica di una scheda: nome ed esercizi con serie e ripetizioni.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";
import { CATALOG } from "../lib/exercises.js";
import { saveTemplate, removeTemplate } from "../lib/actions.js";

const LIMITS = { sets: [1, 20], reps: [1, 100] };

/** Menu a tendina con gli esercizi comuni divisi per gruppo muscolare. */
export function exerciseSelect(id, extraNames = []) {
  const known = new Set(Object.values(CATALOG).flat().map((n) => n.toLowerCase()));
  const mine = extraNames.filter((n) => !known.has(n.toLowerCase()));
  return h(
    "select",
    { class: "input", id },
    h("option", { value: "" }, "Scegli dall'elenco..."),
    mine.length ? h("optgroup", { label: "I tuoi esercizi" }, mine.map((n) => h("option", { value: n }, n))) : null,
    Object.entries(CATALOG).map(([group, names]) => h("optgroup", { label: group }, names.map((n) => h("option", { value: n }, n)))),
  );
}

function numberInput(value, label, onInput) {
  const input = h("input", { class: "input sm", type: "number", inputmode: "numeric", min: 1, value: String(value), "aria-label": label });
  input.addEventListener("input", () => onInput(input.value));
  return input;
}

function validate(name, exercises) {
  if (!name.trim() || name.trim().length > 40) return "Dai un nome alla scheda (massimo 40 caratteri).";
  if (exercises.length === 0) return "Aggiungi almeno un esercizio.";
  for (const ex of exercises) {
    if (!ex.name.trim()) return "Ogni esercizio deve avere un nome.";
    const sets = Number(ex.sets);
    const reps = Number(ex.reps);
    if (!Number.isInteger(sets) || sets < LIMITS.sets[0] || sets > LIMITS.sets[1]) return `${ex.name}: le serie vanno da 1 a 20.`;
    if (!Number.isInteger(reps) || reps < LIMITS.reps[0] || reps > LIMITS.reps[1]) return `${ex.name}: le ripetizioni vanno da 1 a 100.`;
  }
  return null;
}

export function openTemplateEditor(template, usedNames = []) {
  let exercises = (template?.exercises ?? []).map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps }));
  const name = h("input", { class: "input", id: "t-name", maxlength: 40, value: template?.name ?? "", placeholder: "Es. Push A" });
  const list = h("div", { class: "ex-list" });
  const error = h("div", { class: "error", role: "alert" });

  const patch = (idx, change) => {
    exercises = exercises.map((ex, i) => (i === idx ? { ...ex, ...change } : ex));
  };
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= exercises.length) return;
    const next = [...exercises];
    [next[idx], next[target]] = [next[target], next[idx]];
    exercises = next;
    paint();
  };

  function paint() {
    list.replaceChildren(
      ...exercises.map((ex, idx) => {
        const nameInput = h("input", { class: "input", value: ex.name, maxlength: 60, "aria-label": "Nome esercizio" });
        nameInput.addEventListener("input", () => patch(idx, { name: nameInput.value }));
        return h(
          "div",
          { class: "ex-edit" },
          h("div", { class: "ex-edit-top" },
            h("span", { class: "ex-n num" }, String(idx + 1)),
            nameInput,
          ),
          h("div", { class: "ex-edit-bottom" },
            h("label", { class: "mini" }, "Serie", numberInput(ex.sets, `Serie di ${ex.name}`, (v) => patch(idx, { sets: v }))),
            h("label", { class: "mini" }, "Ripetizioni", numberInput(ex.reps, `Ripetizioni di ${ex.name}`, (v) => patch(idx, { reps: v }))),
            h("div", { class: "ex-tools" },
              h("button", { class: "icon-btn", type: "button", "aria-label": "Sposta su", onClick: () => move(idx, -1), disabled: idx === 0 }, icon("chev", "i up")),
              h("button", { class: "icon-btn", type: "button", "aria-label": "Sposta giù", onClick: () => move(idx, 1), disabled: idx === exercises.length - 1 }, icon("chev", "i down")),
              h("button", { class: "icon-btn", type: "button", "aria-label": `Togli ${ex.name}`, onClick: () => { exercises = exercises.filter((_, i) => i !== idx); paint(); } }, icon("trash")),
            ),
          ),
        );
      }),
    );
  }

  const picker = exerciseSelect("t-pick", usedNames);
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    exercises = [...exercises, { name: picker.value, sets: 3, reps: 10 }];
    picker.value = "";
    paint();
  });
  const custom = h("button", { class: "btn ghost", type: "button", onClick: () => { exercises = [...exercises, { name: "", sets: 3, reps: 10 }]; paint(); list.lastElementChild?.querySelector("input")?.focus(); } }, icon("plus"), "Esercizio mio");

  const save = h("button", { class: "btn block", type: "button" }, icon("check"), "Salva scheda");
  save.addEventListener("click", async () => {
    const problem = validate(name.value, exercises);
    if (problem) return (error.textContent = problem);
    save.disabled = true;
    const data = {
      name: name.value.trim(),
      exercises: exercises.map((ex) => ({ name: ex.name.trim(), sets: Number(ex.sets), reps: Number(ex.reps) })),
    };
    const saved = await saveTemplate(template?.id, data);
    save.disabled = false;
    if (saved) {
      toast("Scheda salvata", "ok");
      closeSheet();
    }
  });

  let del = null;
  if (template?.id) {
    del = h("button", { class: "btn danger block", type: "button" }, icon("trash"), "Elimina scheda");
    del.addEventListener("click", async () => {
      if (!del.classList.contains("armed")) {
        del.classList.add("armed");
        del.replaceChildren("Tocca di nuovo per eliminare");
        return;
      }
      if (await removeTemplate(template.id)) {
        toast("Scheda eliminata");
        closeSheet();
      }
    });
  }

  paint();
  openSheet({
    title: template ? "Modifica scheda" : "Nuova scheda",
    content: h(
      "div",
      { class: "fields" },
      h("div", { class: "field" }, h("label", { for: "t-name" }, "Nome"), name),
      list,
      h("div", { class: "field" }, h("label", { for: "t-pick" }, "Aggiungi esercizio"), h("div", { class: "add-row" }, picker, custom)),
      error,
      save,
      del,
    ),
  });
}
