// Notifiche push sul dispositivo: supporto, permesso, iscrizione e prova.
import { supabase } from "./supabase.js";
import { VAPID_PUBLIC_KEY } from "../config.js";

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

/** "ok" | "install" (iPhone: serve aggiungerla alla Home) | "unsupported" */
export function pushSupport() {
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (ok) return "ok";
  return isIOS() && !isStandalone() ? "install" : "unsupported";
}

function keyToBytes(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (pushSupport() !== "ok") return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Da chiamare dentro un tocco dell'utente: chiede il permesso e registra il dispositivo. */
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission === "denied") throw new Error("Hai bloccato le notifiche. Riattivale dalle impostazioni del telefono (Notifiche → Locked In).");
  if (permission !== "granted") throw new Error("Permesso non concesso. Riprova e tocca Consenti.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome",
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push_subscriptions", error);
    throw new Error("Non riesco a registrare il dispositivo. Riprova.");
  }
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke("send-reminders", { body: { test: true } });
  if (error) throw new Error("La prova non è partita. Riattiva le notifiche e riprova.");
  return data;
}
