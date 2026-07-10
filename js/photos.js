/*
 * photos.js — a persistent "photo stash" kept on the device.
 *
 * The trader adds their chicken photos once and they're saved in IndexedDB
 * (which, unlike localStorage, can hold image blobs). Every post can then grab
 * random ones without re-picking each time. Phone browsers can't bind to a live
 * folder for privacy/security reasons, so this saved stash is the offline-first
 * stand-in: "point the app at my chicken pics, grab at random."
 *
 * IndexedDB gotcha baked in below: a transaction goes inactive as soon as
 * control returns to the event loop, so every transaction is created and has
 * all its requests issued synchronously (no await in between), and we resolve
 * on the transaction's own completion so the data is guaranteed committed.
 */
const Photos = (() => {
  const DB = "wingman-photos";
  const STORE = "photos";
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

  // Save image files/blobs; resolves with how many were actually stored.
  async function add(files) {
    if (!supported) return 0;
    const imgs = Array.from(files).filter((f) => f.type && f.type.startsWith("image/"));
    if (!imgs.length) return 0;
    const db = await open();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      let n = 0;
      tx.oncomplete = () => resolve(n);
      tx.onerror = () => resolve(n);
      tx.onabort = () => resolve(n);
      imgs.forEach((f) => {
        const id = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
        const req = st.add({ id, blob: f, type: f.type });
        req.onsuccess = () => { n++; };
      });
    });
  }

  // [{ id, blob, type }] — insertion order (newest last).
  async function all() {
    if (!supported) return [];
    const db = await open();
    return new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function count() {
    if (!supported) return 0;
    const db = await open();
    return new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  }

  async function remove(id) {
    if (!supported) return;
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

  return { add, all, count, remove, clear, supported };
})();

// Expose on window so feature guards (`if (window.Photos)`) see it — a top-level
// `const` in a classic script is a lexical global, not a property of window.
window.Photos = Photos;
