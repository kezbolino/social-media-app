/*
 * sw.js — offline support.
 *
 * Strategy: network-first with a cache fallback. Online you always get the
 * freshest files (so a new deploy shows up on the next load, no version
 * bumping needed); offline you get the last copy that worked. Calls to other
 * origins (Meta, Cloudinary) are left alone entirely.
 */
const CACHE = "wingman-cache-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never intercept Meta/Cloudinary
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
