/*
 * hooks.js — the caption engine.
 *
 * Job: given a quiz tag (location / brand / other) and the details the user
 * typed (location, day) plus the saved menu list, hand back a ready-to-use
 * caption with the blanks filled in — avoiding any hook used recently, and
 * letting the user "Shuffle" to a different eligible one.
 */
const Hooks = (() => {
  let library = null; // { variables, categories, hooks: [...] }
  let userHooks = []; // the trader's own lines, added in Settings

  async function init() {
    // Prefer the embedded copy (lets the app run by just opening the file,
    // no server). Fall back to fetching the JSON when served over http.
    if (window.HOOK_LIBRARY) {
      library = window.HOOK_LIBRARY;
    } else {
      const res = await fetch(window.APP_CONFIG.HOOKS_URL);
      if (!res.ok) throw new Error("Could not load the hook library");
      library = await res.json();
    }
    reloadUserHooks();
    return library;
  }

  // Re-read the user's own captions from storage (call after they add/remove
  // one so it's available immediately, no reload needed).
  function reloadUserHooks() {
    try {
      userHooks =
        typeof Store !== "undefined" && Store.getUserHooks
          ? Store.getUserHooks() || []
          : [];
    } catch (e) {
      userHooks = [];
    }
  }

  // Built-in library + the trader's own lines, treated as one pool.
  function allHooks() {
    return (library ? library.hooks : []).concat(userHooks);
  }

  // Fill {location} / {day} / {item} placeholders.
  function fillText(text, vars) {
    return text.replace(/\{(location|day|item)\}/g, (m, key) => {
      return vars[key] != null && vars[key] !== "" ? vars[key] : m;
    });
  }

  // A hook is eligible for this post if:
  //  - it carries the chosen quiz tag, and
  //  - every variable it 'uses' can actually be supplied.
  // (Recency is handled separately so we can relax it if the pool runs dry.)
  function isSatisfiable(hook, ctx) {
    // A hook can be pinned to one place (e.g. the Crystal Palace dinosaurs
    // line) — only eligible when the chosen location matches.
    if (hook.location) {
      const here = String(ctx.location || "").trim().toLowerCase();
      if (here !== String(hook.location).trim().toLowerCase()) return false;
    }
    // A hook can be pinned to a weather condition (sun / rain / cold …) — only
    // eligible when weather mode has supplied a matching current condition.
    if (hook.weather) {
      if (!ctx.weather) return false;
      const conds = Array.isArray(hook.weather) ? hook.weather : [hook.weather];
      if (!conds.includes(ctx.weather)) return false;
    }
    for (const v of hook.uses) {
      if (v === "location" && !ctx.location) return false;
      if (v === "day" && !ctx.day) return false;
      if (v === "item" && (!ctx.menuItems || ctx.menuItems.length === 0)) return false;
    }
    return true;
  }

  // The full eligible pool for a tag + context, before recency is applied.
  function basePool(tag, ctx) {
    return allHooks().filter(
      (h) => h.tags.includes(tag) && isSatisfiable(h, ctx)
    );
  }

  // Which input fields the details screen should show for a tag: the union of
  // variables used by hooks in that tag, minus 'item' (which comes from the
  // menu, not a text box).
  function inputVarsForTag(tag) {
    const vars = new Set();
    for (const h of allHooks()) {
      if (!h.tags.includes(tag)) continue;
      for (const v of h.uses) if (v === "location" || v === "day") vars.add(v);
    }
    // Stable, sensible order.
    return ["location", "day"].filter((v) => vars.has(v));
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Choose a hook. excludeId lets "Shuffle" avoid repeating the current one.
  // Returns { hook, filledText, item } or null if nothing fits at all.
  function choose(tag, ctx, excludeId = null) {
    const pool = basePool(tag, ctx);
    if (pool.length === 0) return null;

    const recent = Store.recentHookIds();
    let candidates = pool.filter((h) => !recent.has(h.id));
    // If recency emptied the pool, ignore recency rather than fail — better a
    // slightly-recent caption than none.
    if (candidates.length === 0) candidates = pool.slice();
    // For a shuffle, drop the current hook unless it's the only option.
    if (excludeId && candidates.length > 1) {
      candidates = candidates.filter((h) => h.id !== excludeId);
    }

    const hook = pickRandom(candidates);
    // Food hooks pull a random menu item.
    const item =
      hook.uses.includes("item") && ctx.menuItems && ctx.menuItems.length
        ? pickRandom(ctx.menuItems)
        : null;
    const vars = { location: ctx.location, day: ctx.day, item };
    return { hook, filledText: fillText(hook.text, vars), item };
  }

  function getLibrary() {
    return library;
  }

  return { init, choose, inputVarsForTag, fillText, basePool, getLibrary, reloadUserHooks };
})();
