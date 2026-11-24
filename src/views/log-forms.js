// Moduli di registrazione per tipo di categoria. Ognuno ritorna { el, read } dove read()
// restituisce { amount, details } oppure lancia un Error con il messaggio per l'utente.
import { h } from "../ui/dom.js";
import { parseDuration, parseDecimal, formatPace } from "../lib/run.js";
import { LABEL_KEY } from "../lib/summary.js";
import { parseClock, sleepMinutes } from "../lib/sleep.js";
import { formatDuration, fromISO, addDays, WEEKDAYS_SHORT } from "../lib/dates.js";

const field = (id, label, input) => h("div", { class: "field" }, h("label", { for: id }, label), input);

function gymForm() {
  const minutes = h("input", { class: "input", id: "f-min", type: "number", inputmode: "numeric", min: 1, max: 600, placeholder: "75" });
  const note = h("input", { class: "input", id: "f-note", maxlength: 80, placeholder: "Es. Petto e tricipiti" });
  return {
    el: h("div", { class: "fields" }, field("f-min", "Durata (minuti)", minutes), field("f-note", "Nota (facoltativa)", note)),
    read() {
      const m = Number(minutes.value);
      if (!Number.isInteger(m) || m < 1 || m > 600) throw new Error("Scrivi la durata in minuti (da 1 a 600).");
      return { amount: m, details: note.value.trim() ? { note: note.value.trim() } : {} };
    },
  };
}

function runForm() {
  const km = h("input", { class: "input", id: "f-km", inputmode: "decimal", placeholder: "5,2" });
  const time = h("input", { class: "input", id: "f-time", inputmode: "numeric", placeholder: "28:30" });
  const pace = h("div", { class: "hint" }, "Il passo lo calcolo io.");
  const update = () => {
    const k = parseDecimal(km.value);
    const s = parseDuration(time.value);
    const p = k && s ? formatPace(k, s) : "";
    pace.replaceChildren(p ? h("span", null, "Passo: ", h("b", null, p)) : "Il passo lo calcolo io.");
  };
  km.addEventListener("input", update);
  time.addEventListener("input", update);
  return {
    el: h("div", { class: "fields" }, h("div", { class: "fields-row" }, field("f-km", "Distanza (km)", km), field("f-time", "Tempo (mm:ss)", time)), pace),
    read() {
      const k = parseDecimal(km.value);
      if (k == null || k <= 0 || k > 300) throw new Error("Scrivi i km percorsi, per esempio 5,2.");
      const s = parseDuration(time.value);
      if (!s) throw new Error("Scrivi il tempo come minuti:secondi (28:30) o ore:minuti:secondi.");
      return { amount: Math.round(k * 100) / 100, details: { seconds: s } };
    },
  };
}

function timedForm(category) {
  const key = LABEL_KEY[category.kind];
  const options = category.options?.[key] ?? [];
  const hours = h("input", { class: "input", id: "f-h", type: "number", inputmode: "numeric", min: 0, max: 24, placeholder: "1" });
  const mins = h("input", { class: "input", id: "f-m", type: "number", inputmode: "numeric", min: 0, max: 59, placeholder: "30" });
  const listId = `opts-${category.id}`;
  const label = h("input", { class: "input", id: "f-label", maxlength: 40, list: listId, placeholder: category.kind === "study" ? "Es. Analisi 2" : "Es. App Locked In" });
  const datalist = h("datalist", { id: listId }, options.map((o) => h("option", { value: o })));
  const labelText = category.kind === "study" ? "Materia" : "Progetto";
  return {
    el: h("div", { class: "fields" }, h("div", { class: "fields-row" }, field("f-h", "Ore", hours), field("f-m", "Minuti", mins)), field("f-label", labelText, label), datalist),
    read() {
      const hv = hours.value === "" ? 0 : Number(hours.value);
      const mv = mins.value === "" ? 0 : Number(mins.value);
      if (![hv, mv].every(Number.isInteger) || hv < 0 || hv > 24 || mv < 0 || mv > 59) throw new Error("Controlla ore (0-24) e minuti (0-59).");
      const total = hv * 60 + mv;
      if (total < 1) throw new Error("Scrivi quanto tempo hai dedicato.");
      const text = label.value.trim();
      return { amount: total, details: text ? { label: text } : {}, option: text ? { key, value: text } : null };
    },
  };
}

function sleepForm(day, last) {
  // Parte dagli orari dell'ultima notte registrata: di solito cambiano di poco.
  const bed = h("input", { class: "input", id: "f-bed", type: "time", value: last?.details?.bed ?? "23:30" });
  const wake = h("input", { class: "input", id: "f-wake", type: "time", value: last?.details?.wake ?? "07:30" });
  const total = h("div", { class: "hint" });
  const update = () => {
    const b = parseClock(bed.value);
    const w = parseClock(wake.value);
    total.replaceChildren(b != null && w != null ? h("span", null, "Hai dormito ", h("b", null, formatDuration(sleepMinutes(bed.value, wake.value)))) : "Inserisci i due orari.");
  };
  bed.addEventListener("input", update);
  wake.addEventListener("input", update);
  update();
  const prev = fromISO(day);
  const night = `Notte tra ${WEEKDAYS_SHORT[addDays(prev, -1).getDay()].toLowerCase()} e ${WEEKDAYS_SHORT[prev.getDay()].toLowerCase()} ${prev.getDate()}`;
  return {
    el: h("div", { class: "fields" }, h("div", { class: "hint" }, night),
      h("div", { class: "fields-row" }, field("f-bed", "A letto alle", bed), field("f-wake", "Sveglia alle", wake)), total),
    read() {
      if (parseClock(bed.value) == null || parseClock(wake.value) == null) throw new Error("Inserisci l'ora in cui sei andato a letto e quella della sveglia.");
      const minutes = sleepMinutes(bed.value, wake.value);
      if (minutes < 30 || minutes > 18 * 60) throw new Error("Controlla gli orari: la durata deve essere tra 30 minuti e 18 ore.");
      return { amount: minutes, details: { bed: bed.value, wake: wake.value } };
    },
  };
}

export function formFor(category, day, last) {
  if (category.kind === "sleep") return sleepForm(day, last);
  if (category.kind === "gym") return gymForm();
  if (category.kind === "run") return runForm();
  if (category.kind === "study" || category.kind === "project") return timedForm(category);
  return null;
}
