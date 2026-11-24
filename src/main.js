// Avvio dell'app: accesso, caricamento dati e navigazione tra le schermate.
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/screens.css";
import "./styles/sleep.css";
import "./styles/train.css";
import "./styles/stats.css";
import "./styles/notifications.css";

import { supabase } from "./lib/supabase.js";
import { getState, setState, subscribe } from "./lib/store.js";
import { loadAll } from "./lib/actions.js";
import { toISO, today } from "./lib/dates.js";
import { h } from "./ui/dom.js";
import { mountSprite } from "./ui/icons.js";
import { closeSheet } from "./ui/sheet.js";
import { renderAuth } from "./views/auth.js";
import { renderSetup } from "./views/setup.js";
import { renderHome } from "./views/home.js";
import { renderCalendar } from "./views/calendar.js";
import { renderStats } from "./views/stats.js";
import { renderNotifications } from "./views/notifications.js";
import { renderSleep } from "./views/sleep.js";
import { renderTrain } from "./views/train.js";
import { renderSession } from "./views/session.js";
import { buildShell, ROUTES, EXTRA_ROUTES } from "./views/shell.js";
import { openPicker } from "./views/log.js";

const app = document.getElementById("app");
let ui = null;
let unsubscribe = null;
let booted = null;
let lastLoad = 0;

function currentRoute() {
  const id = location.hash.replace("#", "");
  if (id === "obiettivi" || id === "sessione" || id === "notifiche") return id;
  return [...ROUTES, ...EXTRA_ROUTES].some((r) => r.id === id) ? id : "home";
}

/** Schermate che si aggiornano da sole quando cambiano i dati (le altre hanno moduli da non perdere). */
const LIVE = new Set(["home", "sonno", "allenati", "calendario", "statistiche"]);

function render() {
  if (!ui) return;
  const state = getState();
  if (state.categories.length === 0) {
    app.replaceChildren(h("div", { class: "main" }, h("div", { id: "setup" })));
    renderSetup(app.querySelector("#setup"), { first: true });
    ui = null;
    return;
  }
  const route = currentRoute();
  ui.setActive(route === "sessione" ? "allenati" : route);
  if (route === "home") renderHome(ui.main, state);
  else if (route === "sonno") renderSleep(ui.main, state);
  else if (route === "allenati") renderTrain(ui.main, state);
  else if (route === "sessione") renderSession(ui.main);
  else if (route === "calendario") renderCalendar(ui.main, state);
  else if (route === "statistiche") renderStats(ui.main, state);
  else if (route === "obiettivi") renderSetup(ui.main);
  else if (route === "notifiche") renderNotifications(ui.main, state);
}

function mountShell() {
  ui = buildShell(() => openPicker(getState().selectedDay));
  app.replaceChildren(ui.shell);
}

async function start(session) {
  setState({ session, selectedDay: toISO(today()) });
  app.replaceChildren(h("div", { class: "loading" }, "Carico i tuoi dati..."));
  try {
    await loadAll();
    lastLoad = Date.now();
  } catch (err) {
    app.replaceChildren(
      h("div", { class: "loading" }, h("div", { class: "fields", style: { textAlign: "center" } }, h("p", null, err.message), h("button", { class: "btn", type: "button", onClick: () => start(session) }, "Riprova"))),
    );
    return;
  }
  mountShell();
  render();
  unsubscribe?.();
  unsubscribe = subscribe(() => {
    if (!ui && getState().categories.length > 0) mountShell();
    if (LIVE.has(currentRoute())) render();
  });
}

function stop() {
  unsubscribe?.();
  unsubscribe = null;
  ui = null;
  booted = null;
  closeSheet();
  setState({ session: null, categories: [], archivedCategories: [], entries: [], templates: [], weights: [], reminders: [] });
  renderAuth(app);
}

window.addEventListener("hashchange", () => {
  closeSheet();
  if (!ui && getState().categories.length > 0) mountShell();
  render();
  window.scrollTo(0, 0);
});

// Quando l'app torna in primo piano: se e' un altro giorno riparti da oggi,
// e ricarica i dati se sono passati qualche minuto (magari hai segnato qualcosa da un altro dispositivo).
const RELOAD_AFTER_MS = 2 * 60 * 1000;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !getState().session) return;
  const now = toISO(today());
  if (getState().todayAtLoad !== now) setState({ todayAtLoad: now, selectedDay: now });
  if (ui && Date.now() - lastLoad > RELOAD_AFTER_MS && LIVE.has(currentRoute())) {
    lastLoad = Date.now();
    loadAll().catch(() => undefined);
  }
});

// Service worker: app offline e notifiche. Un tocco su una notifica porta alla schermata indicata.
if ("serviceWorker" in navigator) {
  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((err) => console.error("Service worker non registrato", err));
  navigator.serviceWorker.addEventListener("message", (ev) => {
    if (ev.data?.type === "navigate" && typeof ev.data.hash === "string" && /^#[a-z-]+$/.test(ev.data.hash)) location.hash = ev.data.hash;
  });
}

mountSprite();
setState({ todayAtLoad: toISO(today()) });

supabase.auth.onAuthStateChange((event, session) => {
  if (session && booted !== session.user.id) {
    booted = session.user.id;
    // Fuori dalla callback: evita blocchi interni di supabase-js.
    setTimeout(() => start(session), 0);
  } else if (!session) {
    stop();
  }
});
