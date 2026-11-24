import { h } from "./dom.js";

let current = null;
let timer = null;

/** Messaggio breve in basso. kind: "ok" | "err" | "" */
export function toast(message, kind = "") {
  if (current) current.remove();
  clearTimeout(timer);
  current = h("div", { class: `toast ${kind}`, role: kind === "err" ? "alert" : "status" }, message);
  document.body.appendChild(current);
  timer = setTimeout(() => {
    current?.remove();
    current = null;
  }, kind === "err" ? 5000 : 2600);
}
