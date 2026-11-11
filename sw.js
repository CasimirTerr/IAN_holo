// Offline shell for the IAN app. Network first for pages (so updates show up),
// cache first for static files. Requests to the brain worker are never cached.
const CACHE = "ian-v4";
const SHELL = [
  "./", "index.html", "app/index.html", "base.css", "config.js", "brain.js", "chat.js", "bg.js", "fx.js",
  "assets/fonts/archivo.woff2", "assets/fonts/jetbrains-mono.woff2", "assets/ian-float.webp", "assets/ian-face.jpg", "assets/icon-192.png", "assets/icon-180.png", "manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                 // fonts, worker, APIs: straight to network
  const page = req.mode === "navigate" || /\.(html|js|css)$/.test(url.pathname);
  if (page) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req).then(r => r || caches.match("app/index.html"))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
  }
});
