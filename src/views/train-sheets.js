// Fogli della palestra: dettaglio di un allenamento e progressi di un esercizio.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { toast } from "../ui/toast.js";
import { lineChart } from "../ui/charts.js";
import { removeEntry } from "../lib/actions.js";
import { exerciseHistory, bestSet, estimate1RM, workoutVolume, setCount } from "../lib/workout.js";
import { formatKg, dayLabel } from "../lib/summary.js";
import { formatDuration, fromISO, MONTHS_SHORT } from "../lib/dates.js";

export function openWorkoutDetail(gym, entry) {
  const d = entry.details ?? {};
  const exercises = d.exercises ?? [];
  const del = h("button", { class: "btn danger block", type: "button" }, icon("trash"), "Elimina allenamento");
  del.addEventListener("click", async () => {
    if (!del.classList.contains("armed")) {
      del.classList.add("armed");
      del.replaceChildren("Tocca di nuovo per eliminare");
      return;
    }
    if (await removeEntry(entry.id)) {
      toast("Allenamento eliminato");
      closeSheet();
    }
  });
  openSheet({
    title: d.template ?? gym.name,
    subtitle: dayLabel(entry.day),
    content: h("div", { class: "fields" },
      h("div", { class: "tiles" },
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Durata"), h("div", { class: "val num" }, formatDuration(Number(entry.amount)))),
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Serie"), h("div", { class: "val num" }, String(setCount(d)))),
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Volume"), h("div", { class: "val num" }, `${formatKg(workoutVolume(d))} kg`)),
      ),
      exercises.length
        ? h("div", { class: "list" }, exercises.map((ex) =>
            h("div", { class: "item" },
              h("div", { class: "txt" }, h("div", null, ex.name), h("div", { class: "s" }, ex.sets.map((s) => `${formatKg(s.kg)} kg × ${s.reps}`).join(" · "))),
            )))
        : h("p", { class: "hint" }, "Registrato solo con durata e nota."),
      d.note ? h("p", { class: "hint" }, `Nota: ${d.note}`) : null,
      del,
    ),
  });
}

export function openExerciseProgress(history, name) {
  const rows = exerciseHistory(history, name);
  const best = bestSet(history, name);
  const points = rows.map((r) => {
    const d = fromISO(r.day);
    return { label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, value: r.maxKg };
  });
  openSheet({
    title: name,
    subtitle: `${rows.length} allenamenti`,
    content: h("div", { class: "fields" },
      best ? h("div", { class: "tiles" },
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Record"), h("div", { class: "val num" }, `${formatKg(best.kg)} kg × ${best.reps}`), h("div", { class: "sub" }, dayLabel(best.day))),
        h("div", { class: "tile" }, h("div", { class: "lbl" }, "Massimale stimato"), h("div", { class: "val num" }, `${formatKg(estimate1RM(best.kg, best.reps))} kg`)),
      ) : null,
      points.length > 1
        ? h("div", { class: "chart-wrap" }, lineChart({ points, label: `Carico massimo di ${name} nel tempo`, format: (v) => formatKg(Math.round(v)) }))
        : h("p", { class: "hint" }, "Il grafico compare dal secondo allenamento con questo esercizio."),
      h("div", { class: "list" }, [...rows].reverse().slice(0, 12).map((r) =>
        h("div", { class: "item" },
          h("div", { class: "txt" }, h("div", null, dayLabel(r.day)), h("div", { class: "s" }, `Volume ${formatKg(r.volume)} kg`)),
          h("span", { class: "rec num" }, `${formatKg(r.maxKg)} kg`),
        ))),
    ),
  });
}
