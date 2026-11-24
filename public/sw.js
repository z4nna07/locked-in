// Service worker di Locked In: funzionamento offline dell'interfaccia e notifiche push.
// I dati (Supabase) non passano mai dalla cache: servono sempre aggiornati.
const CACHE = "lockedin-v2";
const SCOPE = self.registration.scope;
const ASSET_RE = /(?:src|href)="([^"]*\/assets\/[^"]+)"/g;

/** File JS/CSS citati da una versione di index.html. */
function assetUrls(html) {
  return [...html.matchAll(ASSET_RE)].map((m) => new URL(m[1], SCOPE).href);
}

/**
 * Mette in cache la pagina e tutti i suoi file, e toglie quelli delle versioni vecchie.
 * Cosi' l'app funziona offline gia' dal primo avvio e la cache non cresce per sempre.
 */
async function syncAppShell(html) {
  const cache = await caches.open(CACHE);
  const wanted = new Set(assetUrls(html));
  const missing = [];
  for (const url of wanted) {
    if (!(await cache.match(url))) missing.push(url);
  }
  await cache.addAll(missing).catch(() => undefined);
  const keys = await cache.keys();
  await Promise.all(keys.filter((req) => req.url.includes("/assets/") && !wanted.has(req.url)).map((req) => cache.delete(req)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const response = await fetch(SCOPE, { cache: "no-cache" });
      if (response.ok) {
        const html = await response.clone().text();
        await cache.put(SCOPE, response);
        await cache.addAll([`${SCOPE}manifest.webmanifest`, `${SCOPE}icons/icon-192.png`]).catch(() => undefined);
        await syncAppShell(html);
      }
    } catch {
      // Offline durante l'installazione: si riprova alla prossima apertura online.
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("lockedin-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isFont = (url) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
const isAsset = (url) => url.origin === self.location.origin && (url.pathname.includes("/assets/") || url.pathname.includes("/icons/"));

/** Pagina: prima la rete (versione nuova), poi la copia salvata se sei offline. */
async function navigate(event) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      const html = await response.clone().text();
      await cache.put(SCOPE, response.clone());
      event.waitUntil(syncAppShell(html));
    }
    return response;
  } catch {
    return (await cache.match(SCOPE)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(navigate(event));
  } else if (isAsset(url) || isFont(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Locked In", {
      body: data.body || "",
      tag: data.tag,
      icon: `${SCOPE}icons/icon-192.png`,
      badge: `${SCOPE}icons/icon-192.png`,
      data: { url: data.url || "#home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "#home";
  const hash = /^#[a-z-]+$/.test(raw) ? raw : "#home";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((w) => w.url.startsWith(SCOPE));
    if (open) {
      await open.focus();
      open.postMessage({ type: "navigate", hash });
      return;
    }
    await self.clients.openWindow(`${SCOPE}${hash}`);
  })());
});
