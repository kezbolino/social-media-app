/*
 * sound.js — tiny UI sound layer for the app's taps, wins and swipes.
 *
 * Plays the WAV pack in assets/sounds/. Design notes:
 *  - Uses HTML5 `Audio` (not fetch + Web Audio) so it still works when the app
 *    is opened straight off disk (`file://`), where fetch of local files is
 *    blocked. `Audio` with a relative src is fine there.
 *  - One cached base `Audio` per clip (for buffering); each play clones the node
 *    so rapid re-triggers (taps) overlap instead of cutting each other off.
 *  - Muteable and persisted (localStorage). Independent of reduced-motion —
 *    that setting is about motion, not audio.
 *  - A delegated click listener maps common controls to sounds. It ignores
 *    synthetic clicks (`isTrusted === false`) so programmatic `input.click()`
 *    calls (opening file pickers) don't chirp.
 *
 * Exposes `window.Sound`: play(name), setMuted(b), isMuted(), toggleMuted().
 */
const Sound = (() => {
  const DIR = "assets/sounds/";
  const MUTE_KEY = "sfp.soundMuted";

  // Groups pick a random variant each play; single clips play as-is.
  const GROUPS = {
    tap: ["tap-1", "tap-2", "tap-3"],
    "small-win": ["small-win-1", "small-win-2", "small-win-3"],
    "swipe-keep": ["swipe-keep-1", "swipe-keep-2"],
    "swipe-nope": ["swipe-nope-1", "swipe-nope-2"],
  };
  // Per-clip volume (base name → 0..1). Default 0.5.
  const VOL = {
    "big-win": 0.7,
    "gen-start": 0.6,
    "error": 0.55,
    "tap-1": 0.4, "tap-2": 0.4, "tap-3": 0.4,
    "toggle": 0.45, "nav-switch": 0.45, "back": 0.45,
  };

  const cache = {}; // base name → HTMLAudioElement (buffer source)
  let muted = read();

  function read() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; }
  }
  function persist() {
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
  }

  function base(name) {
    const g = GROUPS[name];
    return g ? g[Math.floor(Math.random() * g.length)] : name;
  }

  function get(file) {
    if (!cache[file]) {
      const a = new Audio(DIR + file + ".wav");
      a.preload = "auto";
      cache[file] = a;
    }
    return cache[file];
  }

  // Play a clip (or a random variant of a group). Safe to over-call.
  function play(name) {
    if (muted || !name) return;
    const file = base(name);
    let node;
    try {
      node = get(file).cloneNode(); // overlap-friendly; original stays a buffer
      node.volume = VOL[file] != null ? VOL[file] : 0.5;
      const p = node.play();
      if (p && p.catch) p.catch(() => {}); // ignore autoplay/gesture rejections
    } catch (e) { /* audio unsupported — stay silent */ }
  }

  function setMuted(b) { muted = !!b; persist(); }
  function isMuted() { return muted; }
  function toggleMuted() { setMuted(!muted); return muted; }

  // ---- delegated UI sounds -------------------------------------------------
  // Actions handled elsewhere (app.js) so we don't double-fire:
  const ACTION_SILENT = new Set(["gen-like", "gen-nope"]);
  // Actions with a specific sound; anything else on a button falls back to tap.
  const ACTION_SOUND = {
    "add-hashtag": "small-win", "add-menu": "small-win",
    "add-userhook": "small-win", "add-location": "small-win",
    "cal-add-loc": "small-win", "queue-add": "small-win",
    "gen-regenerate": "gen-start",
    "open-settings": "nav-switch", "open-calendar": "nav-switch",
    "open-generate": "nav-switch", "open-queue": "nav-switch",
    "open-history": "nav-switch",
  };

  function pickForEvent(e) {
    const t = e.target;
    if (t.closest(".switch-row") || (t.matches && t.matches('input[type="checkbox"]')))
      return "toggle";
    if (t.closest("[data-back]")) return "back";
    if (t.closest(".navbtn[data-nav]")) return "nav-switch";
    const a = t.closest("[data-action]");
    if (a) {
      const act = a.dataset.action;
      if (ACTION_SILENT.has(act)) return null;
      return ACTION_SOUND[act] || "tap";
    }
    if (t.closest("[data-loc],[data-day],[data-tag],[data-cal-day]")) return "tap";
    if (t.closest(".btn")) return "tap";
    return null;
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!e.isTrusted) return; // skip programmatic clicks (file pickers etc.)
      play(pickForEvent(e));
    },
    true // capture: fire before app.js navigates the screen away
  );

  return { play, setMuted, isMuted, toggleMuted };
})();
window.Sound = Sound;
