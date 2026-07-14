/*
 * mascot.js — the Chuckling Wings chicken's many moods.
 *
 * A tiny helper around a set of vector poses (SVG) in assets/mascot/. It's pure
 * presentation: hand back an <img> (or its HTML) for a named state so the rest
 * of the app can drop a bit of character into loading spinners, empty screens
 * and win moments without repeating markup.
 *
 * The art is 15 crisp vector poses (owner-supplied SVGs). We keep TWO sets of
 * names:
 *   - POSES: the canonical pose names, one per SVG file.
 *   - ALIAS: the app's older semantic state names (idle, loading, celebrate…)
 *     mapped onto a pose, so existing callers keep working unchanged.
 * `url()` resolves either kind.
 *
 * Animation classes (CSS, all tamed under prefers-reduced-motion): bob, float,
 * sway, spin, pop, breathe.
 *
 * Offline-safe: the images are local SVG files, no network, no deps. SVG scales
 * crisply at any size and animates smoothly via CSS transforms on the <img>.
 */
const Mascot = (() => {
  const BASE = "assets/mascot/";

  // Canonical pose files (assets/mascot/<pose>.svg).
  const POSES = [
    "camera",
    "main", "run", "thinking", "excited", "sleep", "happy", "laughing",
    "surprised", "wink", "sad", "jump", "wave", "angry", "dance", "walk",
  ];

  // App's semantic state names → a canonical pose. Keeps old call-sites working.
  const ALIAS = {
    idle: "main",
    loading: "run",
    celebrate: "excited",
    sleeping: "sleep",
    relaxing: "happy",
    singing: "laughing",
    confused: "surprised",
    thumbsup: "wink",
    waving: "wave",
    // thinking, excited, sad already match a pose name 1:1
  };

  // Friendly, screen-reader-appropriate descriptions (keyed by canonical pose).
  const ALT = {
    main: "Wingman the chicken, standing by",
    run: "Wingman dashing about",
    thinking: "Wingman having a think",
    excited: "Wingman thrilled and wide-eyed",
    sleep: "Wingman fast asleep",
    happy: "Wingman looking happy",
    laughing: "Wingman laughing away",
    surprised: "Wingman looking surprised",
    wink: "Wingman winking with a thumbs up",
    sad: "Wingman looking a bit glum",
    jump: "Wingman jumping for joy",
    wave: "Wingman waving hello",
    angry: "Wingman looking cross",
    dance: "Wingman having a dance",
    walk: "Wingman strolling along",
    camera: "Wingman ready with a camera",
  };

  // Resolve any state (pose or alias) → canonical pose, defaulting to "main".
  function pose(state) {
    if (POSES.includes(state)) return state;
    if (ALIAS[state]) return ALIAS[state];
    return "main";
  }

  function url(state) {
    return BASE + pose(state) + ".svg";
  }

  function altFor(state, opts) {
    if (opts && opts.alt != null) return opts.alt;
    return ALT[pose(state)] || "Chuckling Wings mascot";
  }

  // Build the class list from options: { anim, size, className }.
  function classes(opts = {}) {
    const cls = ["mascot"];
    if (opts.anim) cls.push("mascot-" + opts.anim); // bob|float|sway|spin|pop | wave|breathe|jog|win|snooze|mope
    if (opts.size) cls.push("mascot-" + opts.size); // sm | lg
    if (opts.className) cls.push(opts.className);
    return cls.join(" ");
  }

  // HTML string — handy when composing an innerHTML block.
  function html(state, opts = {}) {
    return (
      `<img class="${classes(opts)}" src="${url(state)}" alt="${altFor(state, opts)}" ` +
      `loading="lazy" decoding="async" draggable="false" />`
    );
  }

  // Live element — handy when appending to a node.
  function el(state, opts = {}) {
    const img = new Image();
    img.className = classes(opts);
    img.src = url(state);
    img.alt = altFor(state, opts);
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    return img;
  }

  // Swap the pose on an existing <img> (selector or element).
  function set(target, state) {
    const img = typeof target === "string" ? document.querySelector(target) : target;
    if (img) { img.src = url(state); img.alt = altFor(state); }
    return img;
  }

  // STATES exposes everything callable (canonical poses + semantic aliases).
  const STATES = POSES.concat(Object.keys(ALIAS));

  window.Mascot = { STATES, POSES, url, html, el, set };
  return window.Mascot;
})();
