// Guscio dell'app: menu laterale (PC), contenuto e barra in basso (telefono).
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";

export const ROUTES = [
  { id: "home", label: "Home", icon: "home" },
  { id: "calendario", label: "Calendario", icon: "cal" },
  { id: "allenati", label: "Allenati", icon: "dumbbell" },
  { id: "statistiche", label: "Statistiche", icon: "stats" },
];

/** Schermate raggiungibili dal menu laterale su PC e da collegamenti nella Home. */
export const EXTRA_ROUTES = [{ id: "sonno", label: "Sonno", icon: "moon" }];

const link = (r) => h("a", { class: "nav-i", href: `#${r.id}`, "data-route": r.id }, icon(r.icon), r.label);

export function buildShell(onPlus) {
  const main = h("main", { class: "main", id: "main" });
  const side = h(
    "aside",
    { class: "side", "aria-label": "Menu" },
    h("div", { class: "brand" }, h("span", { class: "logo" }, icon("flame", "")), "Locked In"),
    ROUTES.map(link),
    EXTRA_ROUTES.map(link),
    h("button", { class: "new", type: "button", onClick: onPlus }, icon("plus"), "Registra"),
  );
  const [r0, r1, r2, r3] = ROUTES;
  const bottom = h(
    "nav",
    { class: "bottom", "aria-label": "Navigazione" },
    link(r0),
    link(r1),
    h("button", { class: "plus", type: "button", "aria-label": "Registra", onClick: onPlus }, icon("plus")),
    link(r2),
    link(r3),
  );
  const shell = h("div", { class: "shell" }, side, main, bottom);

  function setActive(route) {
    shell.querySelectorAll("[data-route]").forEach((a) => {
      const on = a.dataset.route === route;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  return { shell, main, setActive };
}
