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
  },

  // App-wide UI font choices (Settings → 🔤 App font). `id` matches the
  // `data-font` attribute value in css/styles.css (see the --font-family
  // overrides there) — add a matching @font-face + override block if you add
  // an option here. "poppins" is the built-in default (no override needed).
  FONTS: [
    { id: "poppins", label: "Poppins", blurb: "Clean & modern (default)" },
    { id: "fredoka", label: "Fredoka", blurb: "Round & bubbly" },
    { id: "baloo2", label: "Baloo 2", blurb: "Bold & playful" },
    { id: "nunito", label: "Nunito", blurb: "Soft & friendly" },
    { id: "quicksand", label: "Quicksand", blurb: "Light & breezy" },
  ],

  // Locations pre-loaded the first time the app runs. The user can add/remove
  // these in Settings.
  DEFAULT_LOCATIONS: ["Greenwich", "Crystal Palace", "Leadenhall Market"],

  // Hashtags pre-loaded the first time the app runs (editable in Settings).
  // Curated for a London street-food / chicken-wings trader: a mix of
  // street-food scene, London/local, wings-specific, and food-discovery tags
  // that actually surface posts on Instagram. Keep a spread of big-reach and
  // niche tags — niche ones are easier to rank in.
  DEFAULT_HASHTAGS: [
    // Street-food scene
    "#streetfood", "#streetfoodlondon", "#londonstreetfood", "#streetfoodmarket",
    "#streeteats", "#foodtruck", "#foodstall", "#streetfoodie", "#traderlife",
    // London / local
    "#london", "#londonfood", "#londoneats", "#londonfoodie", "#eatlondon",
    "#timeoutlondon", "#secretlondon", "#londonlife",
    // Wings / chicken
    "#chickenwings", "#wings", "#friedchicken", "#chickenshop", "#wingwednesday",
    "#loadedfries", "#comfortfood",
    // Food discovery / engagement
    "#foodie", "#instafood", "#foodstagram", "#foodphotography", "#eeeeeats",
    "#forkyeah", "#feedfeed", "#hungry", "#supportsmallbusiness",
  ],
};
