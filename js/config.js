/*
 * config.js — the handful of settings you might want to tweak later.
 * Everything here is a plain value. Change a number, save, reload the app.
 */
window.APP_CONFIG = {
  // Final exported image size, in pixels. Square works on both Instagram
  // and Facebook feeds. If you ever want tall/portrait posts, change height
  // to 1350 (and design your collage templates at that size to match).
  EXPORT: { width: 1080, height: 1080 },

  // How many days a hook "rests" after being used, so the same caption
  // doesn't come round again too soon. Posting ~once or twice a week with
  // 70+ hooks, 60 days makes repeats effectively invisible.
  COOLDOWN_DAYS: 60,

  // Where the hook library and collage templates are loaded from.
  HOOKS_URL: "data/streetfood_hooks.json",
  TEMPLATES_URL: "templates/templates.json",

  // Keys used to save things on the device. No need to touch these.
  STORAGE: {
    MENU: "sfp.menuItems",
    RECENCY: "sfp.recencyLog",
    POSTS: "sfp.posts",
    LOCATIONS: "sfp.locations",
  },

  // Locations pre-loaded the first time the app runs. The user can add/remove
  // these in Settings.
  DEFAULT_LOCATIONS: ["Greenwich", "Brick Lane", "Camden Market"],
};
