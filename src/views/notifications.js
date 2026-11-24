// Notifiche: attivazione sul dispositivo e promemoria per categoria, giornata e streak a rischio.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { toast } from "../ui/toast.js";
import { getState } from "../lib/store.js";
import { iconFor } from "../lib/kinds.js";
import { saveReminder } from "../lib/actions.js";
import { pushSupport, currentSubscription, enablePush, disablePush, sendTestPush, isIOS } from "../lib/push.js";

const DAY_LABELS = ["L", "M", "M", "G", "V", "S", "D"];
const DAY_NAMES = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const DEFAULT_TIME = { gym: "18:00", run: "07:30", food: "21:00", study: "16:00", project: "21:30", sleep: "09:00", check: "22:00" };

/** Riquadro del dispositivo: lo stato cambia dopo controlli asincroni, quindi si ridisegna da solo. */
function deviceCard() {
  const body = h("div", { class: "fields" }, h("p", { class: "hint" }, "Controllo lo stato delle notifiche..."));

  const action = (label, cls, fn) => {
    const btn = h("button", { class: `btn ${cls}`, type: "button" }, label);
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await fn();
      } catch (err) {
        toast(err.message, "err");
      }
      btn.disabled = false;
      paint();
    });
    return btn;
  };

  async function paint() {
    const support = pushSupport();
    if (support === "install") {
      body.replaceChildren(
        h("p", null, "Su iPhone le notifiche arrivano solo dall'app installata sulla schermata Home."),
        h("ol", { class: "steps" },
          h("li", null, "Apri questa pagina in Safari."),
          h("li", null, "Tocca Condividi (il quadrato con la freccia in su)."),
          h("li", null, "Scegli \"Aggiungi alla schermata Home\"."),
          h("li", null, "Apri Locked In dall'icona e torna qui."),
        ),
      );
      return;
    }
    if (support === "unsupported") {
      body.replaceChildren(h("p", { class: "hint" }, "Questo browser non supporta le notifiche push. Usa Chrome, Edge, Firefox o l'app installata su iPhone."));
      return;
    }
    const sub = await currentSubscription().catch(() => null);
    if (Notification.permission === "denied") {
      body.replaceChildren(h("p", { class: "error" }, isIOS()
        ? "Le notifiche sono bloccate. Riattivale da Impostazioni → Notifiche → Locked In."
        : "Le notifiche sono bloccate per questo sito. Riattivale dalle impostazioni del browser (icona del lucchetto)."));
      return;
    }
    if (sub) {
      body.replaceChildren(
        h("p", { class: "status-on" }, icon("check"), "Notifiche attive su questo dispositivo"),
        h("div", { class: "btn-row" },
          action("Invia una prova", "", async () => {
            await sendTestPush();
            toast("Prova inviata: dovrebbe arrivare tra pochi secondi", "ok");
          }),
          action("Disattiva", "ghost", async () => {
            await disablePush();
            toast("Notifiche disattivate su questo dispositivo");
          }),
        ),
      );
      return;
    }
    body.replaceChildren(
      h("p", { class: "hint" }, "Attiva le notifiche su ogni dispositivo dove vuoi riceverle (telefono, PC...)."),
      action("Attiva notifiche", "", async () => {
        await enablePush();
        toast("Notifiche attivate", "ok");
      }),
    );
  }

  paint();
  return h("section", { class: "card" }, h("div", { class: "card-h" }, h("h2", null, "Questo dispositivo")), body);
}

/** Una riga promemoria: interruttore, orario e giorni. Salva a ogni modifica. */
function reminderRow({ title, sub, iconName, kind, categoryId, defaultTime }) {
  let current = getState().reminders.find((r) => r.kind === kind && (r.category_id ?? null) === (categoryId ?? null)) ?? null;
  let draft = { time: current?.time ?? defaultTime, days: current?.days ?? [1, 2, 3, 4, 5, 6, 7], enabled: current?.enabled ?? false };

  // I salvataggi della riga vanno in fila: due tocchi veloci non creano due promemoria.
  let queue = Promise.resolve();
  const save = () => {
    queue = queue.then(async () => {
      const saved = await saveReminder(current, { kind, category_id: categoryId ?? null, ...draft });
      if (saved) current = saved;
    });
    return queue;
  };

  const toggle = h("button", { class: "toggle", type: "button", role: "switch", "aria-checked": String(draft.enabled), "aria-label": `Promemoria ${title}` });
  const time = h("input", { class: "input sm time", type: "time", value: draft.time, "aria-label": `Orario ${title}` });
  const days = h("div", { class: "days-pick", role: "group", "aria-label": `Giorni ${title}` },
    DAY_LABELS.map((label, i) => {
      const iso = i + 1;
      const b = h("button", { type: "button", "aria-pressed": String(draft.days.includes(iso)), "aria-label": DAY_NAMES[i] }, label);
      b.addEventListener("click", () => {
        const on = !draft.days.includes(iso);
        const next = on ? [...draft.days, iso].sort() : draft.days.filter((d) => d !== iso);
        if (next.length === 0) return toast("Scegli almeno un giorno.");
        draft = { ...draft, days: next };
        b.setAttribute("aria-pressed", String(on));
        save();
      });
      return b;
    }),
  );
  const details = h("div", { class: "rem-details", hidden: !draft.enabled }, time, days);

  toggle.addEventListener("click", () => {
    draft = { ...draft, enabled: !draft.enabled };
    toggle.setAttribute("aria-checked", String(draft.enabled));
    details.hidden = !draft.enabled;
    save();
  });
  time.addEventListener("change", () => {
    if (!/^\d{2}:\d{2}$/.test(time.value)) return;
    draft = { ...draft, time: time.value };
    save();
  });

  return h("div", { class: "rem" },
    h("div", { class: "rem-top" },
      h("span", { class: "ic" }, icon(iconName)),
      h("div", { class: "txt" }, h("div", { class: "t" }, title), sub ? h("div", { class: "s" }, sub) : null),
      toggle,
    ),
    details,
  );
}

export function renderNotifications(root, state) {
  root.replaceChildren(
    h("header", { class: "page-h" }, h("div", null, h("span", { class: "eyebrow" }, "Promemoria"), h("h1", null, "Notifiche"))),
    h("div", { class: "grid" },
      h("div", { class: "stack" },
        deviceCard(),
        h("section", { class: "card" },
          h("div", { class: "card-h" }, h("h2", null, "Avvisi intelligenti")),
          h("div", { class: "rems" },
            reminderRow({ title: "Streak a rischio", sub: "Solo se saltando oggi rischi di non raggiungere l'obiettivo", iconName: "flame", kind: "streak_risk", defaultTime: "20:00" }),
            reminderRow({ title: "Segna la giornata", sub: "Solo se manca ancora qualcosa da segnare", iconName: "checkbox", kind: "daily_log", defaultTime: "21:30" }),
          ),
        ),
      ),
      h("section", { class: "card" },
        h("div", { class: "card-h" }, h("h2", null, "Per categoria"), h("span", { class: "meta" }, "saltati se l'hai già segnata")),
        h("div", { class: "rems" },
          state.categories.map((c) => reminderRow({ title: c.name, iconName: iconFor(c), kind: "category", categoryId: c.id, defaultTime: DEFAULT_TIME[c.kind] ?? "20:00" })),
        ),
        h("p", { class: "hint", style: { marginTop: "14px" } }, "Le notifiche arrivano entro 5 minuti dall'orario scelto, su tutti i dispositivi dove le hai attivate."),
      ),
    ),
  );
}
