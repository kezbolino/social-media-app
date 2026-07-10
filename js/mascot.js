/*
 * mascot.js — the Chuckling Wings chicken's many moods.
 *
 * A tiny helper around a set of transparent PNG poses in assets/mascot/ (sliced
 * from the owner's sprite sheet). It's pure presentation: hand back an <img> (or
 * its HTML) for a named state so the rest of the app can drop a bit of character
 * into loading spinners, empty screens and win moments without repeating markup.
 *
 * States: idle, loading, thinking, celebrate, sleeping, relaxing, singing,
 *         confused, thumbsup, sad, excited, waving.
 * Animation classes (CSS, all tamed under prefers-reduced-motion): bob, float,
 * sway, spin, pop.
 *
 * Offline-safe: the images are local files, no network, no deps.
 */
const Mascot = (() => {
  const BASE = "assets/mascot/";
  const STATES = [
    "idle", "loading", "thinking", "celebrate", "sleeping", "relaxing",
    "singing", "confused", "thumbsup", "sad", "excited", "waving",
  ];
  // Friendly, screen-reader-appropriate descriptions.
  const ALT = {
    idle: "Wingman the chicken, standing by",
    loading: "Wingman cooking up posts on a laptop",
    thinking: "Wingman having an idea",
    celebrate: "Wingman celebrating",
    sleeping: "Wingman fast asleep",
    relaxing: "Wingman relaxing with a drink",
    singing: "Wingman singing happily",
    confused: "Wingman looking puzzled",
    thumbsup: "Wingman giving a thumbs up",
    sad: "Wingman looking a bit glum",
    excited: "Wingman looking thrilled",
    waving: "Wingman waving hello",
  };

  function url(state) {
    return BASE + (STATES.includes(state) ? state : "idle") + ".png";
  }

  // Build the class list from options: { anim, size, className }.
  function classes(opts = {}) {
    const cls = ["mascot"];
    if (opts.anim) cls.push("mascot-" + opts.anim); // bob | float | sway | spin | pop
    if (opts.size) cls.push("mascot-" + opts.size); // sm | lg
    if (opts.className) cls.push(opts.className);
    return cls.join(" ");
  }

  // HTML string — handy when composing an innerHTML block.
  function html(state, opts = {}) {
    const alt = opts.alt != null ? opts.alt : (ALT[state] || "Chuckling Wings mascot");
    return (
      `<img class="${classes(opts)}" src="${url(state)}" alt="${alt}" ` +
      `loading="lazy" decoding="async" draggable="false" />`
    );
  }

  // Live element — handy when appending to a node.
  function el(state, opts = {}) {
    const img = new Image();
    img.className = classes(opts);
    img.src = url(state);
    img.alt = opts.alt != null ? opts.alt : (ALT[state] || "Chuckling Wings mascot");
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    return img;
  }

  // Swap the pose on an existing <img> (selector or element).
  function set(target, state) {
    const img = typeof target === "string" ? document.querySelector(target) : target;
    if (img) { img.src = url(state); if (ALT[state]) img.alt = ALT[state]; }
    return img;
  }

  window.Mascot = { STATES, url, html, el, set };
  return window.Mascot;
})();
