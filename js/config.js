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
    SCHEDULE: "sfp.schedule",
    NOTIFY: "sfp.notify",
    HASHTAGS: "sfp.hashtags",
    META: "sfp.meta",
    USER_HOOKS: "sfp.userHooks",
    INSTAGRAM: "sfp.instagram",
    QUEUE: "sfp.queue",
    WEATHER: "sfp.weatherCache",
    ONBOARDED: "sfp.onboarded",
    FONT: "sfp.font",
    BTNSTYLE: "sfp.btnstyle",
  },

  // App-wide UI font choices (Settings → 🔤 App font). `id` matches the
  // `data-font` attribute value in css/styles.css (see the --font-family
  // overrides there) — add a matching @font-face + override block if you add
  // an option here. "visuelt" is the built-in default (no override needed).
  // NB the `label` doubles as the font-family name in the picker chip preview
  // (renderFontPicker sets style="font-family:'<label>'"), so it must match the
  // @font-face family name exactly — hence "Visuelt Pro", not "Visuelt".
  FONTS: [
    { id: "visuelt", label: "Visuelt Pro", blurb: "Crisp & grown-up (default)" },
    { id: "poppins", label: "Poppins", blurb: "Clean & modern" },
    { id: "fredoka", label: "Fredoka", blurb: "Round & bubbly" },
    { id: "baloo2", label: "Baloo 2", blurb: "Bold & playful" },
    { id: "nunito", label: "Nunito", blurb: "Soft & friendly" },
    { id: "quicksand", label: "Quicksand", blurb: "Light & breezy" },
  ],

  // App-wide button look (Settings → 🎨 Appearance → Button style). `id`
  // matches the `data-btn` attribute value on <html> (see the
  // html[data-btn="ios"] override block in css/styles.css). "default" is the
  // built-in chunky-pill look (no attribute set, no override needed).
  BUTTON_STYLES: [
    { id: "default", label: "Chunky", blurb: "Bold 3D pills (default)" },
    { id: "ios", label: "iOS", blurb: "Flat, minimal & rounded" },
  ],

  // Locations pre-loaded the first time the app runs. The user can add/remove
  // these in Settings.
  DEFAULT_LOCATIONS: ["Greenwich", "Crystal Palace", "Leadenhall Market"],

  // Menu items ("Best sellers & sauces") pre-loaded the first time the app
  // runs — the words that fill the {item} placeholder in captions/stickers.
  // Despite the "Chuckling Wings" name, the stall now sells nuggets & burgers
  // (wings took too long to cook); editable in Settings.
  DEFAULT_MENU: ["nuggets", "chicken burgers", "home-made sauces"],

  // Hashtags, grouped into sets so a post can be tagged with a small, relevant
  // spread rather than a generic dump. Curated for a London gluten-free chicken
  // (nuggets & burgers) street-food trader.
  //
  // ⚠️ Instagram capped posts at 5 hashtags (Dec 2025) and now treats tags as a
  // minor topic signal, not a reach lever — big generic "discovery" tags
  // (#foodie / #instafood / #food …) read as spam and no longer help. So these
  // sets deliberately hold only branded, dish, and local/scene tags; the app
  // composes at most 5 per post (see buildHashtagBlock). The old flat pool's
  // eight food-discovery mega-tags were dropped here on 2026-07-22.
  HASHTAG_SETS: {
    // Always leads a block.
    brand: ["#chucklingwings"],
    // Match the dish in the post (dish-aware selection is a follow-up).
    dish: [
      "#chickennuggets", "#chickenburger", "#friedchicken", "#chickenshop",
      "#glutenfree", "#glutenfreelondon", "#loadedfries", "#comfortfood",
    ],
    // London / local — pairs with the pitch location tag.
    local: [
      "#london", "#londonfood", "#londoneats", "#londonfoodie", "#eatlondon",
      "#timeoutlondon", "#secretlondon", "#londonlife",
    ],
    // Street-food scene.
    scene: [
      "#streetfood", "#streetfoodlondon", "#londonstreetfood", "#streetfoodmarket",
      "#streeteats", "#foodtruck", "#foodstall", "#streetfoodie", "#traderlife",
    ],
  },

  // Flattened seed for the editable Settings pool (Store/backup consume this).
  // Built from HASHTAG_SETS below so the two never drift.
  get DEFAULT_HASHTAGS() {
    const s = this.HASHTAG_SETS;
    return [...s.brand, ...s.dish, ...s.local, ...s.scene];
  },
};
