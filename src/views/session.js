// Allenamento in corso: cronometro, esercizi con serie (kg x ripetizioni), salvataggio continuo sul dispositivo.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { getState } from "../lib/store.js";
import { loadSession, saveSession, clearSession, newSession, prefillSets, finalizeSession } from "../lib/session.js";
import { lastPerformance, bestSet, workoutVolume, setCount, newRecords, exerciseNames } from "../lib/workout.js";
import { formatKg, dayLabel } from "../lib/summary.js";
import { addEntry } from "../lib/actions.js";
import { exerciseSelect } from "./template-editor.js";

const pad = (n) => String(n).padStart(2, "0");

export function gymHistory(categoryId) {
  return getState().entries.filter((en) => en.category_id === categoryId);
}

/** Avvia un allenamento (da scheda o libero) e apre la schermata. */
export function startWorkout(categoryId, day, template) {
  const existing = loadSession();
  if (existing) {
    toast("Hai già un allenamento in corso: finiscilo o annullalo prima.");
    location.hash = "#sessione";
    return;
  }
  saveSession(newSession({ categoryId, day, template, history: gymHistory(categoryId) }));
  closeSheet();
  location.hash = "#sessione";
}

function elapsed(startedAt) {
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hh = Math.floor(s / 3600);
  return hh > 0 ? `${hh}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

const fmtSets = (sets) => sets.map((s) => `${formatKg(s.kg)}×${s.reps}`).join(", ");

export function renderSession(root) {
  let session = loadSession();
  if (!session) {
    location.hash = "#allenati";
    return;
  }
  const history = gymHistory(session.categoryId);
  const update = (fn) => {
    session = fn(session);
    saveSession(session);
  };
  const setPatch = (exIdx, setIdx, change) =>
    update((s) => ({
      ...s,
      exercises: s.exercises.map((ex, i) => (i !== exIdx ? ex : { ...ex, sets: ex.sets.map((st, j) => (j === setIdx ? { ...st, ...change } : st)) })),
    }));

  const timer = h("span", { class: "timer num" }, elapsed(session.startedAt));
  const tick = setInterval(() => {
    if (!timer.isConnected) return clearInterval(tick);
    timer.textContent = elapsed(session.startedAt);
  }, 1000);

  const list = h("div", { class: "session-list" });

  function setRow(exIdx, setIdx, set) {
    const kg = h("input", { class: "input sm", inputmode: "decimal", value: set.kg, placeholder: "kg", "aria-label": `Kg serie ${setIdx + 1}` });
    const reps = h("input", { class: "input sm", inputmode: "numeric", value: set.reps, placeholder: "rip", "aria-label": `Ripetizioni serie ${setIdx + 1}` });
    kg.addEventListener("input", () => setPatch(exIdx, setIdx, { kg: kg.value }));
    reps.addEventListener("input", () => setPatch(exIdx, setIdx, { reps: reps.value }));
    const done = h("button", { class: `tick${set.done ? " on" : ""}`, type: "button", "aria-pressed": String(!!set.done), "aria-label": `Serie ${setIdx + 1} fatta` }, icon("check"));
    done.addEventListener("click", () => {
      const on = done.getAttribute("aria-pressed") !== "true";
      done.classList.toggle("on", on);
      done.setAttribute("aria-pressed", String(on));
      setPatch(exIdx, setIdx, { done: on });
      if (on && navigator.vibrate) navigator.vibrate(30);
    });
    return h("div", { class: "set-row" }, h("span", { class: "set-n num" }, String(setIdx + 1)), kg, h("span", { class: "x-sign" }, "×"), reps, done);
  }

  function exerciseCard(ex, exIdx) {
    const last = lastPerformance(history, ex.name, session.day);
    const best = bestSet(history, ex.name);
    const addSet = () => {
      update((s) => ({
        ...s,
        exercises: s.exercises.map((e, i) => (i !== exIdx ? e : { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { kg: "", reps: "" }), done: false }] })),
      }));
      paint();
    };
    const removeSet = () => {
      update((s) => ({ ...s, exercises: s.exercises.map((e, i) => (i !== exIdx || e.sets.length <= 1 ? e : { ...e, sets: e.sets.slice(0, -1) })) }));
      paint();
    };
    const removeEx = () => {
      update((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== exIdx) }));
      paint();
    };
    return h(
      "section",
      { class: "card ex-card" },
      h("div", { class: "card-h" },
        h("h2", null, ex.name),
        h("button", { class: "icon-btn", type: "button", "aria-label": `Togli ${ex.name}`, onClick: removeEx }, icon("trash")),
      ),
      h("div", { class: "ex-hints" },
        h("span", null, "Ultima volta: ", h("b", null, last ? fmtSets(last) : "mai fatto")),
        best ? h("span", null, "Record: ", h("b", null, `${formatKg(best.kg)} kg × ${best.reps}`)) : null,
      ),
      h("div", { class: "sets" }, ex.sets.map((set, j) => setRow(exIdx, j, set))),
      h("div", { class: "set-tools" },
        h("button", { class: "go", type: "button", onClick: addSet }, icon("plus"), "Serie"),
        ex.sets.length > 1 ? h("button", { class: "go muted", type: "button", onClick: removeSet }, icon("minus"), "Togli l'ultima") : null,
      ),
    );
  }

  function addExercise(name) {
    const clean = name.trim();
    if (!clean) return;
    update((s) => ({ ...s, exercises: [...s.exercises, { name: clean, sets: prefillSets(history, clean, { sets: 3 }, s.day) }] }));
    paint();
  }

  function paint() {
    list.replaceChildren(...session.exercises.map(exerciseCard));
  }

  const picker = exerciseSelect("s-pick", exerciseNames(history));
  picker.addEventListener("change", () => {
    addExercise(picker.value);
    picker.value = "";
  });
  const customName = h("input", { class: "input", id: "s-custom", maxlength: 60, placeholder: "Oppure scrivi il nome" });
  const addCustom = h("button", { class: "btn ghost", type: "button", onClick: () => { addExercise(customName.value); customName.value = ""; } }, icon("plus"), "Aggiungi");
  const note = h("input", { class: "input", id: "s-note", maxlength: 120, value: session.note, placeholder: "Es. spalla un po' rigida" });
  note.addEventListener("input", () => update((s) => ({ ...s, note: note.value })));

  paint();
  root.replaceChildren(
    h("header", { class: "page-h" },
      h("div", null, h("span", { class: "eyebrow" }, `Allenamento in corso · ${dayLabel(session.day)}`), h("h1", null, session.templateName)),
      h("div", { class: "timer-box" }, icon("clock"), timer),
    ),
    list,
    h("section", { class: "card fields" },
      h("div", { class: "field" }, h("label", { for: "s-pick" }, "Aggiungi esercizio"), picker),
      h("div", { class: "add-row" }, customName, addCustom),
      h("div", { class: "field" }, h("label", { for: "s-note" }, "Nota (facoltativa)"), note),
    ),
    h("div", { class: "session-actions" },
      h("button", { class: "btn block", type: "button", onClick: () => openFinish(session) }, icon("check"), "Termina allenamento"),
      h("button", { class: "btn ghost block", type: "button", onClick: () => openCancel() }, "Annulla allenamento"),
    ),
  );
}

function openFinish(session) {
  let details;
  try {
    details = finalizeSession(session);
  } catch (err) {
    toast(err.message, "err");
    return;
  }
  const minutes = Math.min(600, Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)));
  const duration = h("input", { class: "input", id: "fin-min", type: "number", inputmode: "numeric", min: 1, max: 600, value: String(minutes) });
  const error = h("div", { class: "error", role: "alert" });
  const save = h("button", { class: "btn block", type: "button" }, icon("check"), "Salva allenamento");
  save.addEventListener("click", async () => {
    const m = Number(duration.value);
    if (!Number.isInteger(m) || m < 1 || m > 600) return (error.textContent = "La durata va da 1 a 600 minuti.");
    save.disabled = true;
    const previous = gymHistory(session.categoryId);
    const saved = await addEntry(session.categoryId, session.day, m, details);
    save.disabled = false;
    if (!saved) return;
    clearSession();
    closeSheet();
    const records = newRecords(previous, details);
    toast(records.length ? `Nuovo record: ${records.map((r) => `${r.name} ${formatKg(r.kg)} kg`).join(", ")}!` : "Allenamento salvato", "ok");
    location.hash = "#allenati";
  });
  openSheet({
    title: "Fine allenamento",
    subtitle: session.templateName,
    content: h("div", { class: "fields" },
      h("div", { class: "tiles" },
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Esercizi"), h("div", { class: "val num" }, String(details.exercises.length))),
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Serie"), h("div", { class: "val num" }, String(setCount(details)))),
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Volume"), h("div", { class: "val num" }, `${formatKg(workoutVolume(details))} kg`)),
      ),
      h("div", { class: "field" }, h("label", { for: "fin-min" }, "Durata (minuti)"), duration),
      error,
      save,
    ),
  });
}

function openCancel() {
  const confirm = h("button", { class: "btn danger block", type: "button" }, icon("trash"), "Sì, annulla e cancella");
  confirm.addEventListener("click", () => {
    clearSession();
    closeSheet();
    toast("Allenamento annullato");
    location.hash = "#allenati";
  });
  openSheet({
    title: "Annullare l'allenamento?",
    content: h("div", { class: "fields" }, h("p", { class: "hint" }, "Le serie inserite non verranno salvate."), confirm),
  });
}
