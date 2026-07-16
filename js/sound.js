/*
 * sound.js — sparing UI sound layer: only a post being shared and swipe
 * decisions get a sound. Everything else (taps, nav, toggles) stays silent —
 * kept minimal on purpose so sound doesn't nag on every tap.
 *
 * Plays the WAV pack in assets/sounds/. Design notes:
 *  - Uses HTML5 `Audio` (not fetch + Web Audio) so it still works when the app
 *    is opened straight off disk (`file://`), where fetch of local files is
 *    blocked. `Audio` with a relative src is fine there.
 *  - One cached base `Audio` per clip (for buffering); each play clones the node
 *    so rapid re-triggers overlap instead of cutting each other off.
 *  - Muteable and persisted (localStorage). Independent of reduced-motion —
 *    that setting is about motion, not audio.
 *
 * Exposes `window.Sound`: play(name), setMuted(b), isMuted(), toggleMuted().
 */
const Sound = (() => {
  const DIR = "assets/sounds/";
  const MUTE_KEY = "sfp.soundMuted";

  // Groups pick a random variant each play; single clips play as-is.
  const GROUPS = {
    "swipe-keep": ["swipe-keep-1", "swipe-keep-2"],
    "swipe-nope": ["swipe-nope-1", "swipe-nope-2"],
  };
  // Per-clip volume (base name → 0..1). Default 0.5.
  const VOL = {
    "big-win": 0.7,
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

  return { play, setMuted, isMuted, toggleMuted };
})();
window.Sound = Sound;
