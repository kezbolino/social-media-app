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

  /* ---- First-run setup ---- */
  // False/absent means the setup flow hasn't been completed on this device, so
  // boot() opens onboarding instead of home. Only finishOnboarding() sets it —
  // every exit from setup routes through there, including a backup restore
  // (that phone is already set up) and skipping the photo step.
  function getOnboarded() {
    return read(K.ONBOARDED, false) === true;
  }
  function setOnboarded(v) {
    write(K.ONBOARDED, v === true);
  }

  /* ---- Menu items (best sellers / sauces) ---- */
  function getMenuItems() {
    // First run: seed with the defaults from config (like getLocations).
    const stored = read(K.MENU, null);
    if (stored == null) {
      const seed = (window.APP_CONFIG.DEFAULT_MENU || []).slice();
      write(K.MENU, seed);
      return seed;
    }
    return stored;
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
  function setRecencyLog(log) {
    write(K.RECENCY, log);
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

  /* ---- Hashtags (curated, editable; seeded on first run) ---- */
  function getHashtags() {
    const stored = read(K.HASHTAGS, null);
    if (stored == null) {
      const seed = (window.APP_CONFIG.DEFAULT_HASHTAGS || []).slice();
      write(K.HASHTAGS, seed);
      return seed;
    }
    return stored;
  }
  function setHashtags(items) {
    write(K.HASHTAGS, items);
  }
  function addHashtag(tag) {
    let t = tag.trim().replace(/\s+/g, "");
    if (!t) return getHashtags();
    if (t[0] !== "#") t = "#" + t;
    const items = getHashtags();
    if (!items.some((x) => x.toLowerCase() === t.toLowerCase())) {
      items.push(t);
      setHashtags(items);
    }
    return items;
  }

  /* ---- User's own caption hooks: [{ id, tags, text, uses, location? }] ---- */
  function getUserHooks() {
    return read(K.USER_HOOKS, []);
  }
  function setUserHooks(hooks) {
    write(K.USER_HOOKS, hooks);
  }
  function addUserHook(hook) {
    const hooks = getUserHooks();
    hooks.push(hook);
    setUserHooks(hooks);
    return hooks;
  }
  function removeUserHook(id) {
    const hooks = getUserHooks().filter((h) => h.id !== id);
    setUserHooks(hooks);
    return hooks;
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

  /* ---- Meta (Facebook/Instagram) publishing credentials ----
   * Saved only on this device. The access token is sensitive — it never
   * leaves the phone except in calls to Meta itself. */
  function getMeta() {
    return read(K.META, {
      accessToken: "",
      pageId: "",
      igUserId: "",
      cloudName: "",
      uploadPreset: "",
    });
  }
  function setMeta(m) {
    write(K.META, m);
  }

  /* ---- Instagram profile (public @handle, for the quick-open nav button) ---- */
  function getInstagram() {
    return read(K.INSTAGRAM, { handle: "" });
  }
  function setInstagram(v) {
    write(K.INSTAGRAM, v);
  }

  /* ---- Post queue: [{ id, date (YYYY-MM-DD), location, caption, created, done }]
   * Lightweight plans — "post something at this pitch on this day" — not full
   * posts (no image blobs; localStorage would choke on those). The reminder
   * engine nudges when an item's date has arrived. ---- */
  function getQueue() {
    return read(K.QUEUE, []);
  }
  function setQueue(q) {
    write(K.QUEUE, q);
  }
  function addQueueItem(item) {
    const q = getQueue();
    q.push(item);
    setQueue(q);
    return q;
  }
  function updateQueueItem(id, patch) {
    const q = getQueue().map((it) => (it.id === id ? { ...it, ...patch } : it));
    setQueue(q);
    return q;
  }
  function removeQueueItem(id) {
    const q = getQueue().filter((it) => it.id !== id);
    setQueue(q);
    return q;
  }

  /* ---- App-wide UI font (Settings → 🔤 App font) ---- */
  function getFont() {
    return read(K.FONT, "visuelt");
  }
  function setFont(id) {
    write(K.FONT, id);
  }

  /* ---- App-wide button style (Settings → 🎨 Appearance) ---- */
  function getButtonStyle() {
    return read(K.BTNSTYLE, "default");
  }
  function setButtonStyle(id) {
    write(K.BTNSTYLE, id);
  }

  /* ---- Saved posts: draft -> approved -> shared ---- */
  function getPosts() {
    return read(K.POSTS, []);
  }
  function setPosts(posts) {
    write(K.POSTS, posts);
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
    getHashtags,
    setHashtags,
    addHashtag,
    getSchedule,
    setSchedule,
    getWorkday,
    setWorkday,
    getNotify,
    setNotify,
    getMeta,
    setMeta,
    getRecencyLog,
    setRecencyLog,
    recordHookUse,
    recentHookIds,
    getPosts,
    setPosts,
    savePost,
    getUserHooks,
    setUserHooks,
    addUserHook,
    removeUserHook,
    getInstagram,
    setInstagram,
    getQueue,
    setQueue,
    addQueueItem,
    updateQueueItem,
    removeQueueItem,
    getOnboarded,
    setOnboarded,
    getFont,
    setFont,
    getButtonStyle,
    setButtonStyle,
  };
})();
