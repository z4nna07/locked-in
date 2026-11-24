// Schermata di accesso con email e password (le nuove registrazioni sono chiuse sul server).
import { supabase } from "../lib/supabase.js";
import { h } from "../ui/dom.js";
import { icon } from "../ui/icons.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(error) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("invalid login")) return "Email o password sbagliate.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Troppi tentativi. Aspetta qualche minuto e riprova.";
  if (msg.includes("fetch") || msg.includes("network")) return "Connessione assente. Riprova quando sei online.";
  return "Qualcosa è andato storto. Riprova.";
}

export function renderAuth(root) {
  const email = h("input", { class: "input", id: "auth-email", type: "email", autocomplete: "email", inputmode: "email", required: true });
  const password = h("input", { class: "input", id: "auth-password", type: "password", autocomplete: "current-password", required: true });
  const error = h("div", { class: "error", role: "alert" });
  const submit = h("button", { class: "btn block", type: "submit" }, "Accedi");

  async function onSubmit(ev) {
    ev.preventDefault();
    const mail = email.value.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return (error.textContent = "Scrivi un'email valida.");
    if (!password.value) return (error.textContent = "Scrivi la password.");
    submit.disabled = true;
    error.textContent = "";
    const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password: password.value });
    submit.disabled = false;
    if (err) error.textContent = friendlyError(err);
  }

  root.replaceChildren(
    h(
      "div",
      { class: "auth" },
      h(
        "form",
        { class: "auth-box", onSubmit, novalidate: true },
        h(
          "div",
          { class: "auth-brand" },
          h("div", { class: "logo-lg" }, icon("flame", "")),
          h("h1", null, "Locked In"),
          h("p", null, "Palestra, alimentazione, studio, progetti e sonno. Una settimana alla volta."),
        ),
        h(
          "div",
          { class: "fields" },
          h("div", { class: "field" }, h("label", { for: "auth-email" }, "Email"), email),
          h("div", { class: "field" }, h("label", { for: "auth-password" }, "Password"), password),
          error,
        ),
        submit,
      ),
    ),
  );
}
