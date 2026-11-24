// Fogli di registrazione: scelta categoria (+) e dettaglio di una categoria in un giorno.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";
import { getState } from "../lib/store.js";
import { iconFor } from "../lib/kinds.js";
import { entrySummary, dayLabel, SCORE_LABEL } from "../lib/summary.js";
import { addEntry, removeEntry, setScore, toggleCheck, rememberOption, saveNight, stepCount } from "../lib/actions.js";
import { scheduleOf, describeSchedule } from "../lib/habits.js";
import { formFor } from "./log-forms.js";
import { loadSession } from "../lib/session.js";
import { startWorkout } from "./session.js";
import { openWeightSheet } from "./weight.js";

function entriesOf(categoryId, day) {
  return getState().entries.filter((en) => en.category_id === categoryId && en.day === day);
}

function deleteButton(entry, onDone) {
  const btn = h("button", { class: "icon-btn", type: "button", "aria-label": "Elimina" }, icon("trash"));
  btn.addEventListener("click", async () => {
    if (!btn.classList.contains("confirm")) {
      btn.classList.add("confirm");
      btn.replaceChildren("Elimina?");
      return;
    }
    btn.disabled = true;
    if (await removeEntry(entry.id)) onDone();
  });
  return btn;
}

function existingList(category, day, onChange) {
  const list = entriesOf(category.id, day);
  if (list.length === 0) return null;
  return h(
    "div",
    { class: "list" },
    list.map((en) => h("div", { class: "item" }, h("div", { class: "txt" }, entrySummary(category.kind, en)), deleteButton(en, onChange))),
  );
}

function scorePicker(category, day) {
  const current = entriesOf(category.id, day).at(-1);
  return h(
    "div",
    { class: "fields" },
    h("div", { class: "hint" }, "Come hai mangiato? Tocca di nuovo il voto per toglierlo."),
    h(
      "div",
      { class: "score", role: "group", "aria-label": "Voto alimentazione", style: { gap: "10px" } },
      [3, 2, 1].map((v) =>
        h(
          "button",
          {
            type: "button", "data-v": v, "aria-pressed": String(Number(current?.amount) === v),
            style: { width: "auto", flex: "1", height: "54px" },
            onClick: async () => {
              await setScore(category.id, day, v);
              closeSheet();
            },
          },
          `${v} · ${SCORE_LABEL[v]}`,
        ),
      ),
    ),
  );
}

export function openLogSheet(category, day) {
  const reopen = () => openLogSheet(category, day);
  const subtitle = dayLabel(day);

  if (category.kind === "food") {
    openSheet({ title: category.name, subtitle, content: scorePicker(category, day) });
    return;
  }
  if (category.kind === "gym") {
    openGymSheet(category, day, reopen);
    return;
  }
  if (category.kind === "check" && scheduleOf(category.options).mode === "perDay") {
    const schedule = scheduleOf(category.options);
    const count = entriesOf(category.id, day).reduce((s, en) => s + Number(en.amount || 0), 0);
    const step = (delta) => async () => {
      await stepCount(category.id, day, delta);
      openLogSheet(category, day);
    };
    openSheet({
      title: category.name,
      subtitle: `${subtitle} · ${describeSchedule(schedule)}`,
      content: h("div", { class: "big-counter" },
        h("button", { class: "btn ghost", type: "button", "aria-label": "Togli una volta", disabled: count === 0, onClick: step(-1) }, icon("minus")),
        h("div", { class: `big num${count >= schedule.perDay ? " full" : ""}` }, `${count}/${schedule.perDay}`),
        h("button", { class: "btn", type: "button", "aria-label": "Aggiungi una volta", onClick: step(1) }, icon("plus")),
      ),
    });
    return;
  }
  if (category.kind === "check") {
    const done = entriesOf(category.id, day).length > 0;
    const btn = h("button", { class: done ? "btn ghost block" : "btn block", type: "button" }, done ? "Segna come non fatto" : "Segna come fatto");
    btn.addEventListener("click", async () => {
      await toggleCheck(category.id, day);
      closeSheet();
    });
    openSheet({ title: category.name, subtitle, content: h("div", { class: "fields" }, btn) });
    return;
  }

  // Sonno: una notte per giorno. Se esiste gia' si modifica, partendo dai suoi orari.
  const night = category.kind === "sleep" ? entriesOf(category.id, day).at(0) : null;
  const last = night ?? getState().entries.filter((en) => en.category_id === category.id).sort((a, b) => (a.day < b.day ? -1 : 1)).at(-1);
  const form = formFor(category, day, last);
  const error = h("div", { class: "error", role: "alert" });
  const save = h("button", { class: "btn block", type: "submit" }, icon("check"), night ? "Aggiorna" : "Salva");
  const onSubmit = async (ev) => {
    ev.preventDefault();
    let data;
    try {
      data = form.read();
    } catch (err) {
      error.textContent = err.message;
      return;
    }
    save.disabled = true;
    const saved = category.kind === "sleep"
      ? await saveNight(category.id, day, data.amount, data.details)
      : await addEntry(category.id, day, data.amount, data.details);
    if (saved && data.option) await rememberOption(category, data.option.key, data.option.value);
    save.disabled = false;
    if (saved) {
      toast("Salvato", "ok");
      closeSheet();
    }
  };
  openSheet({
    title: category.name,
    subtitle,
    content: h("form", { onSubmit, novalidate: true }, existingList(category, day, reopen), form.el, h("div", { class: "fields", style: { marginTop: "16px" } }, error, save)),
  });
}

/** Palestra: allenamenti del giorno, avvio da scheda o libero, oppure solo durata. */
function openGymSheet(category, day, reopen) {
  const { templates } = getState();
  const ongoing = loadSession();
  const simple = formFor(category, day);
  const error = h("div", { class: "error", role: "alert" });
  const quickSave = h("button", { class: "btn block", type: "submit" }, icon("check"), "Salva");
  const quick = h("form", { class: "fields", hidden: true, novalidate: true, onSubmit: async (ev) => {
    ev.preventDefault();
    let data;
    try {
      data = simple.read();
    } catch (err) {
      error.textContent = err.message;
      return;
    }
    quickSave.disabled = true;
    const saved = await addEntry(category.id, day, data.amount, data.details);
    quickSave.disabled = false;
    if (saved) {
      toast("Salvato", "ok");
      closeSheet();
    }
  } }, simple.el, error, quickSave);

  const row = (label, sub, onClick, iconName = "dumbbell") =>
    h("button", { class: "row", type: "button", onClick },
      h("span", { class: "ic" }, icon(iconName)),
      h("div", { class: "txt" }, h("div", { class: "t" }, label), sub ? h("div", { class: "s" }, sub) : null),
      h("span", { class: "go" }, icon("chev")),
    );

  const starts = ongoing
    ? [row(`Riprendi: ${ongoing.templateName}`, "Allenamento in corso", () => { closeSheet(); location.hash = "#sessione"; }, "clock")]
    : [
        ...templates.map((t) => row(t.name, `${t.exercises.length} esercizi`, () => startWorkout(category.id, day, t))),
        row("Allenamento libero", "Aggiungi gli esercizi mentre ti alleni", () => startWorkout(category.id, day, null), "plus"),
      ];
  const toggleQuick = h("button", { class: "link", type: "button", onClick: () => { quick.hidden = !quick.hidden; } }, "Oppure segna solo durata e nota");

  openSheet({
    title: category.name,
    subtitle: dayLabel(day),
    content: h("div", { class: "fields" },
      existingList(category, day, reopen),
      h("div", { class: "rows" }, starts),
      templates.length === 0 && !ongoing ? h("p", { class: "hint" }, "Crea le tue schede dalla sezione Allenati.") : null,
      toggleQuick,
      quick,
    ),
  });
}

/** Pulsante +: scegli cosa registrare per il giorno selezionato. */
export function openPicker(day) {
  const { categories } = getState();
  const row = (iconName, name, onClick) =>
    h(
      "button",
      { class: "row", type: "button", onClick },
      h("span", { class: "ic" }, icon(iconName)),
      h("div", { class: "txt" }, h("div", { class: "t" }, name)),
      h("span", { class: "go" }, icon("chev")),
    );
  const rows = [
    ...categories.map((c) => row(iconFor(c), c.name, () => openLogSheet(c, day))),
    row("scale", "Peso corporeo", () => openWeightSheet(day)),
  ];
  openSheet({ title: "Registra", subtitle: dayLabel(day), content: h("div", { class: "rows" }, rows) });
}
