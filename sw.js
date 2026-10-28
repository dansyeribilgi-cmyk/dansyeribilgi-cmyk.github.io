/* Antrenörlük Eğitimi service worker: çevrimdışı açılış + arka plan bildirimleri */
const VER = "1f8b2aeacf";
const CACHE = "ae-" + VER;
const SHELL = ["/", "/manifest.webmanifest", "/firebase-config.js", "/fb.js", "/icon-192.png", "/icon-512.png", "/apple-180.png"];

importScripts("/firebase-config.js");
if (self.FB_READY) {
  try {
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
                  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
    firebase.initializeApp(self.FB_CONFIG);
    firebase.messaging(); // "notification" içerikli mesajları SDK kendisi gösterir
  } catch (e) { /* bildirim kurulamasa da uygulama açılsın */ }
}

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ae-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Önce ağ, olmazsa önbellek: yeni sürüm hemen gelsin, internet yokken de açılsın
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/__/")) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === "navigate" ? "/" : r, cp)); }
    return res;
  }).catch(() => caches.match(r.mode === "navigate" ? "/" : r).then(m => m || caches.match("/"))));
});
// Bildirime dokununca uygulamayı aç (açıksa öne getir)
self.addEventListener("notificationclick", e => {
  const link = (e.notification.data && (e.notification.data.link || (e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.notification && e.notification.data.FCM_MSG.notification.click_action))) || "/#gunluk";
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (new URL(c.url).origin === location.origin) { c.navigate(link).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(link);
  }));
});
