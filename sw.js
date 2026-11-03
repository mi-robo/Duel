// Robo Duel service worker: works offline for practice, always tries fresh code first.
const CACHE = "robo-duel-v2";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./data/bio.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Firebase live data must never be cached
  if (url.hostname.includes("firebasedatabase.app") || url.hostname.includes("firebaseio.com")) return;
  // Question banks: cache first (big files, rarely change)
  if (url.pathname.includes("/data/")) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return res; })));
    return;
  }
  // Everything else: network first, fall back to cache when offline
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});

// Tap on a notification: open or focus the app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();
    return clients.openWindow("./");
  }));
});
