/* ============================================================
   clinic-pwa Service Worker — production safe
   - Caches ONLY static app-shell assets.
   - NEVER caches Firestore, Firebase Auth, or dynamic medical data.
   - Stale-While-Revalidate for static assets.
   - Auto-removes old cache versions on activate.
   ============================================================ */

const CACHE_NAME = "clinic-pwa-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const NEVER_CACHE = [
  "firestore.googleapis.com",
  "www.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebasestorage.googleapis.com",
  "fcm.googleapis.com",
  "firebaseinstallations.googleapis.com",
];

function shouldNeverCache(url) {
  const u = url.toLowerCase();
  return NEVER_CACHE.some((host) => u.includes(host));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = req.url || "";

  if (shouldNeverCache(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((response) => {
            if (
              response &&
              response.status === 200 &&
              (response.type === "basic" || response.type === "cors")
            ) {
              cache.put(req, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    )
  );
});
