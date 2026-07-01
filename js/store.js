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

  /* ---- Saved locations (regular pitches) ---- */
  function getLocations() {
    // First run: seed with the defaults from config.
    const stored = read(K.LOCATIONS, null);
    if (stored == null) {
      const seed = (window.APP_CONFIG.DEFAULT_LOCATIONS || []).slice();
      write(K.LOCATIONS, seed);
      return seed;
    }
    return stored;
  }
  function setLocations(items) {
    write(K.LOCATIONS, items);
  }
  // Add a location if it's new (case-insensitive); returns the updated list.
  function addLocation(name) {
    const trimmed = name.trim();
    if (!trimmed) return getLocations();
    const items = getLocations();
    if (!items.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      items.push(trimmed);
      setLocations(items);
    }
    return items;
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

  /* ---- Work schedule: { "YYYY-MM-DD": { location } } (key present = working) ---- */
  function getSchedule() {
    return read(K.SCHEDULE, {});
  }
  function setSchedule(s) {
    write(K.SCHEDULE, s);
  }
  function getWorkday(dateStr) {
    return getSchedule()[dateStr] || null;
  }
  // location=null clears the day; otherwise marks it a working day at location.
  function setWorkday(dateStr, location) {
    const s = getSchedule();
    if (location === null) delete s[dateStr];
    else s[dateStr] = { location: location || "" };
    setSchedule(s);
    return s;
  }

  /* ---- Notification settings ---- */
  function getNotify() {
    return read(K.NOTIFY, { enabled: false, time: "09:00", lastNotified: null });
  }
  function setNotify(n) {
    write(K.NOTIFY, n);
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
    getLocations,
    setLocations,
    addLocation,
    getSchedule,
    setSchedule,
    getWorkday,
    setWorkday,
    getNotify,
    setNotify,
    getRecencyLog,
    recordHookUse,
    recentHookIds,
    getPosts,
    savePost,
  };
})();
