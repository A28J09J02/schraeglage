// Schräglage – App-Hülle offline bereithalten, damit der Start sofort geht
const CACHE = "schraeglage-v7";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("schraeglage-") && k !== CACHE && k !== "schraeglage-tiles").map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  // Seite selbst: erst Netz (immer neueste Version), offline aus dem Speicher
  if (r.mode === "navigate") { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); return res; }).catch(() => caches.match("./index.html"))); return; }
  // Kartenkacheln: aus dem Speicher, sonst laden und merken (max. ~600)
  if (u.hostname === "tile.openstreetmap.org") {
    e.respondWith(caches.open("schraeglage-tiles").then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r); if (res.ok) { c.put(r, res.clone()); c.keys().then(ks => { if (ks.length > 600) ks.slice(0, ks.length - 600).forEach(k => c.delete(k)); }); }
      return res;
    }));
    return;
  }
  // Bibliotheken, Schriften, Icons: Speicher zuerst
  if (u.hostname === "cdnjs.cloudflare.com" || u.hostname.endsWith("gstatic.com") || u.hostname === "fonts.googleapis.com" || (u.origin === location.origin && /\.(png|json)$/.test(u.pathname))) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })));
  }
});
