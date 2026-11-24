// Menu profilo e pannello notifiche.
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";
import { openSheet, closeSheet } from "../ui/sheet.js";
import { getState } from "../lib/store.js";
import { supabase } from "../lib/supabase.js";
import { disablePush } from "../lib/push.js";
import { clearSession } from "../lib/session.js";

function menuRow(iconName, text, sub, onClick) {
  return h(
    "button",
    { class: "row", type: "button", onClick },
    h("span", { class: "ic" }, icon(iconName)),
    h("div", { class: "txt" }, h("div", { class: "t" }, text), sub ? h("div", { class: "s" }, sub) : null),
    h("span", { class: "go" }, icon("chev")),
  );
}

export function openProfile() {
  const email = getState().session?.user?.email ?? "";
  openSheet({
    title: "Profilo",
    subtitle: email,
    content: h(
      "div",
      { class: "rows" },
      menuRow("target", "Categorie e obiettivi", "Attiva, rinomina, cambia gli obiettivi", () => {
        closeSheet();
        location.hash = "#obiettivi";
      }),
      menuRow("bell", "Notifiche", "Promemoria e avvisi streak a rischio", () => {
        closeSheet();
        location.hash = "#notifiche";
      }),
      menuRow("logout", "Esci", "Disattiva anche le notifiche su questo dispositivo", async () => {
        closeSheet();
        // Su un dispositivo condiviso non devono restare notifiche ne' bozze di allenamento.
        await disablePush().catch(() => undefined);
        clearSession();
        await supabase.auth.signOut();
      }),
    ),
  });
}

export function openNotifications() {
  location.hash = "#notifiche";
}
