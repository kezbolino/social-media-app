/*
 * drafts.js — persistent storage for a "queued for later" post image.
 *
 * When a keeper from Generate is queued for a future day, its fully-composed
 * image (caption already baked on, same as Post) is saved here as a Blob so
 * the queue can hand back a ready-to-share image later, not just a text note.
 * Blobs live in IndexedDB (like js/photos.js) rather than localStorage, which
 * can't hold binary data and would choke on a handful of PNGs anyway.
 *
 * Same IndexedDB gotcha as photos.js: a transaction goes inactive once control
 * returns to the event loop, so each transaction issues all its requests
 * synchronously and resolves on the transaction's own completion.
 */
const Drafts = (() => {
  const DB = "wingman-drafts";
  const STORE = "drafts";
  const supported = typeof indexedDB !== "undefined";
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  // Save { id, blob, type }; resolves true/false so callers can fall back
  // gracefully (e.g. queue a text-only note) if storage isn't available.
  async function save(record) {
    if (!supported) return false;
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  }

  async function get(id) {
    if (!supported || !id) return null;
    const db = await open();
    return new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function remove(id) {
    if (!supported || !id) return;
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  }

  async function clear() {
    if (!supported) return;
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  }

  return { save, get, remove, clear, supported };
})();

// Expose on window so feature guards (`if (window.Drafts)`) see it — a
// top-level `const` in a classic script is a lexical global, not a window prop.
window.Drafts = Drafts;
