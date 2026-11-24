// Foglio a scomparsa dal basso (su PC diventa una finestra centrata).
import { h } from "./dom.js";
import { icon } from "./icons.js";

let open = null;

export function closeSheet() {
  if (!open) return;
  open.back.remove();
  document.removeEventListener("keydown", open.onKey);
  document.body.style.overflow = "";
  const { onClose } = open;
  open = null;
  onClose?.();
}

/** Apre un foglio con titolo, sottotitolo e contenuto. Ritorna la funzione per chiuderlo. */
export function openSheet({ title, subtitle, content, onClose }) {
  closeSheet();
  const titleId = `sheet-${Date.now()}`;
  const sheet = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId },
    h("div", { class: "grab" }),
    h(
      "div",
      { class: "sheet-h" },
      h("div", null, h("h2", { id: titleId }, title), subtitle ? h("div", { class: "sub" }, subtitle) : null),
      h("button", { class: "x", type: "button", "aria-label": "Chiudi", onClick: closeSheet }, icon("x")),
    ),
    content,
  );
  const back = h("div", { class: "sheet-back" }, sheet);
  back.addEventListener("click", (ev) => {
    if (ev.target === back) closeSheet();
  });
  const onKey = (ev) => {
    if (ev.key === "Escape") closeSheet();
  };
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  document.body.appendChild(back);
  open = { back, onKey, onClose };
  const first = sheet.querySelector("input, select, textarea");
  if (first && window.matchMedia("(min-width: 640px)").matches) first.focus();
  return closeSheet;
}
