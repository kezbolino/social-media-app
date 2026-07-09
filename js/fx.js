/*
 * fx.js — the "juice" layer. Duolingo-style feedback: confetti on a win, a
 * pop on fresh content, and a light haptic buzz on taps. Pure vanilla, no
 * deps, offline-safe. Everything here is best-effort and degrades silently;
 * the app works fine if it does nothing. Honours prefers-reduced-motion.
 */
(() => {
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Brand-ish confetti palette (blue, orange, white, a fresh green, gold).
  const COLORS = ["#0a4da1", "#f58b1f", "#ffffff", "#3fbf6f", "#ffd23f"];

  /* ---- light haptic (Android/Chrome; iOS Safari ignores it) ---- */
  function buzz(ms = 8) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  /* ---- celebratory chime: a bright two-note bell (a fifth apart), each note
     layered with a quiet octave-up shimmer for a metallic "ding" character.
     Synthesised on the fly so it needs no audio file (stays offline). Kicks
     off from a tap, so autoplay policies are happy. ---- */
  let audioCtx;
  function bellTone(f, t, peak, dur) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  function chime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = [880, 1318.51]; // A5, E6 — a bright bell fifth
      notes.forEach((f, i) => {
        const t = now + i * 0.12;
        bellTone(f, t, 0.2, 0.55); // fundamental
        bellTone(f * 2, t, 0.05, 0.35); // quiet octave shimmer
      });
    } catch (_) {}
  }

  /* ---- pop: re-trigger a one-shot bounce on an element ---- */
  function pop(el) {
    if (!el || reduceMotion) return;
    el.classList.remove("fx-pop");
    void el.offsetWidth; // reflow so the animation restarts
    el.classList.add("fx-pop");
  }

  /* ---- confetti burst ---- */
  let canvas, ctx;
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.className = "fx-confetti";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function confetti(opts = {}) {
    // quiet mode = a small everyday sparkle: light buzz, no chime — the full
    // fanfare (chime + big burst) is saved for real wins like sharing a post.
    buzz(opts.quiet ? 10 : 18);
    if (!opts.quiet) chime(); // the win sound — plays even if motion is reduced
    if (reduceMotion) return;
    ensureCanvas();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    const count = opts.count || 55;
    const power = opts.power || 1; // <1 = a gentler, smaller burst
    // Launch from a point — default just below top-centre, like a party popper.
    const ox = (opts.x != null ? opts.x : window.innerWidth / 2) * dpr;
    const oy = (opts.y != null ? opts.y : window.innerHeight * 0.32) * dpr;

    const bits = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (4 + Math.random() * 9) * dpr * power;
      bits.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6 * dpr * power, // bias upward on burst
        size: (6 + Math.random() * 7) * dpr * Math.max(power, 0.7),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        life: 1,
      });
    }

    const gravity = 0.32 * dpr;
    const drag = 0.985;
    let raf;

    function frame() {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const b of bits) {
        b.vx *= drag;
        b.vy = b.vy * drag + gravity;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y < H + 40 * dpr) b.life = Math.max(0, b.life - 0.006);
        else b.life = 0;
        if (b.life <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.min(1, b.life * 1.4);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    cancelAnimationFrame(raf);
    frame();
  }

  /* ---- sparkle: a small, quiet confetti puff from an element — everyday
     delight for little wins (marking a working day, adding a pitch). Also
     bounces the element itself so the tap feels rewarded. ---- */
  function sparkle(el, opts = {}) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    confetti({
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      count: opts.count || 16,
      power: opts.power || 0.55,
      quiet: true,
    });
    pop(el);
  }

  /* ---- wiggle: a cheeky one-shot shimmy (removals, "look here" nudges) ---- */
  function wiggle(el) {
    if (!el || reduceMotion) return;
    el.classList.remove("fx-wiggle");
    void el.offsetWidth; // reflow so the animation restarts
    el.classList.add("fx-wiggle");
  }

  /* ---- global light haptic on any tappable press ---- */
  document.addEventListener(
    "pointerdown",
    (e) => {
      const t = e.target.closest(".btn, .tile, .chip, .gen-card, .tag-chip, .navbtn, .cal-cell, .slot, .back, .etab");
      if (t && !t.disabled) buzz(6);
    },
    { passive: true }
  );

  window.FX = { confetti, sparkle, pop, wiggle, buzz };
})();
