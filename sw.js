/*
 * sw.js — offline support.
 *
 * Strategy: network-first with a cache fallback. Online you always get the
 * freshest files; offline you get the last copy that worked. Calls to other
 * origins (Meta, Cloudinary) are left alone entirely.
 *
 * IMPORTANT (why updates kept showing stale): a plain `fetch(request)` inside
 * the SW still goes through the browser's HTTP cache, so "network-first" could
 * return a stale-but-cached file. We now fetch with `cache: "no-store"` so the
 * network copy is genuinely fresh. Paired with `updateViaCache: "none"` on
 * registration (so the SW script itself is never HTTP-cached) and a
 * controllerchange auto-reload in index.html, a new deploy now reaches the
 * device promptly instead of getting stuck on an old build.
 */
const CACHE = "wingman-cache-v7";

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
  // Bypass the HTTP cache so the network copy is truly fresh; fall back to a
  // fresh same-origin GET if the browser rejects overriding a Request's cache.
  let freshReq;
  try { freshReq = new Request(e.request, { cache: "no-store" }); }
  catch (_) { freshReq = new Request(url.href, { cache: "no-store" }); }
  e.respondWith(
    fetch(freshReq)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
