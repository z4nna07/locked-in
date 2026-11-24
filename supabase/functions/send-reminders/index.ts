// Invia le notifiche push.
// - Chiamata da pg_cron ogni 5 minuti con l'header x-cron-secret: manda i promemoria dovuti.
// - Chiamata dall'app con { "test": true } e il token dell'utente: manda una notifica di prova.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import webpush from "npm:web-push@3.6.7";
import { localNow, isDue, mondayOf, buildMessages, safeTimeZone } from "../_shared/reminders.js";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

// Solo l'app pubblicata e il server di sviluppo possono chiamare la funzione dal browser.
const ALLOWED_ORIGINS = new Set(["https://z4nna07.github.io", "http://localhost:5173"]);
let corsOrigin = "https://z4nna07.github.io";

const cors = () => ({
  "Access-Control-Allow-Origin": corsOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(), "Content-Type": "application/json" } });

// Stessa regola del vincolo nel database: solo i servizi push reali.
const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)\//;

type Sub = { id: string; endpoint: string; p256dh: string; auth: string; timezone: string };
type Payload = { title: string; body: string; tag?: string; url?: string };

/** Invia a tutti i dispositivi; quelli non piu' validi (404/410) vengono rimossi. */
async function sendTo(subs: Sub[], payload: Payload): Promise<number> {
  let sent = 0;
  for (const sub of subs) {
    if (!PUSH_HOST.test(sub.endpoint)) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 3600, urgency: "normal", timeout: 10000 },
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("invio fallito", status, (err as Error).message);
      }
    }
  }
  return sent;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function runReminders() {
  const { data: reminders, error } = await admin.from("reminders").select("*").eq("enabled", true);
  if (error) throw error;
  const byUser = new Map<string, typeof reminders>();
  reminders.forEach((r) => byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]));

  let notifications = 0;
  for (const [userId, list] of byUser) {
    const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, timezone").eq("user_id", userId);
    if (!subs?.length) continue;
    const local = localNow(safeTimeZone(subs[0].timezone));
    const due = list.filter((r) => isDue(r, local));
    if (!due.length) continue;

    const monday = mondayOf(local.date, local.isoDow);
    const [{ data: categories }, { data: entries }] = await Promise.all([
      admin.from("categories").select("id, kind, name, weekly_goal, options, archived").eq("user_id", userId).eq("archived", false),
      admin.from("entries").select("category_id, day, amount").eq("user_id", userId).gte("day", monday).lte("day", local.date),
    ]);
    const { sends, markSent } = buildMessages(due, categories ?? [], entries ?? [], local);
    for (const payload of sends) notifications += await sendTo(subs, payload);
    await admin.from("reminders").update({ last_sent_on: local.date }).in("id", markSent);
  }
  return { users: byUser.size, notifications };
}

async function sendTest(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: "Accesso richiesto" }, 401);
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, timezone").eq("user_id", data.user.id);
  if (!subs?.length) return json({ error: "Nessun dispositivo iscritto alle notifiche" }, 404);
  const sent = await sendTo(subs, { title: "Locked In", body: "Le notifiche funzionano. Restiamo concentrati 🔥", tag: "test", url: "#home" });
  return json({ sent });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  corsOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://z4nna07.github.io";
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const body = await req.json().catch(() => ({}));
  try {
    if (body?.test === true) return await sendTest(req);
    const secret = Deno.env.get("CRON_SECRET") ?? "";
    if (!secret || !timingSafeEqual(req.headers.get("x-cron-secret") ?? "", secret)) return json({ error: "Non autorizzato" }, 401);
    return json(await runReminders());
  } catch (err) {
    console.error("send-reminders", err);
    return json({ error: "Errore interno" }, 500);
  }
});
