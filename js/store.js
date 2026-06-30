/*
 * store.js — saves things on the device so they survive closing the app.
 *
 * V1 uses the browser's localStorage. It's simple, synchronous, and offline.
 * Everything is namespaced under the keys in config.js. When this is wrapped
 * with Capacitor later, this is the one file to swap for Capacitor Preferences
 * if you ever outgrow localStorage — nothing else needs to change.
 */
const Store = (() => {
  const K = window.APP_CONFIG.STORAGE;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn("Store read failed for", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Store write failed for", key, e);
    }
  }

  /* ---- Menu items (best sellers / sauces) ---- */
  function getMenuItems() {
    return read(K.MENU, []);
  }
  function setMenuItems(items) {
    write(K.MENU, items);
  }

  /* ---- Recency log: [{ hookId, dateUsed (ISO date string) }] ---- */
  function getRecencyLog() {
    return read(K.RECENCY, []);
  }
  function recordHookUse(hookId, date = new Date()) {
    const log = getRecencyLog();
    log.push({ hookId, dateUsed: date.toISOString() });
    // Keep the log from growing forever — entries older than the cooldown
    // can never affect a future pick, so prune them.
    const cutoff = Date.now() - cooldownMs();
    const pruned = log.filter((e) => new Date(e.dateUsed).getTime() >= cutoff);
    write(K.RECENCY, pruned);
  }
  function cooldownMs() {
    return window.APP_CONFIG.COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  }
  // Set of hook IDs still inside the cooldown window (should be skipped).
  function recentHookIds() {
    const cutoff = Date.now() - cooldownMs();
    const recent = new Set();
    for (const e of getRecencyLog()) {
      if (new Date(e.dateUsed).getTime() >= cutoff) recent.add(e.hookId);
    }
    return recent;
  }

  /* ---- Saved posts: draft -> approved -> shared ---- */
  function getPosts() {
    return read(K.POSTS, []);
  }
  function savePost(post) {
    const posts = getPosts();
    const idx = posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.push(post);
    write(K.POSTS, posts);
    return post;
  }

  return {
    getMenuItems,
    setMenuItems,
    getRecencyLog,
    recordHookUse,
    recentHookIds,
    getPosts,
    savePost,
  };
})();
