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

  /* ---- celebratory chime: a short rising C-major arpeggio, synthesised on
     the fly so it needs no audio file (stays offline). Kicks off from a tap,
     so autoplay policies are happy. ---- */
  let audioCtx;
  function chime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        const t = now + i * 0.075;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
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
    buzz(18);
    chime(); // the win sound — plays even if motion is reduced
    if (reduceMotion) return;
    ensureCanvas();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    const count = opts.count || 55;
    // Launch from a point — default just below top-centre, like a party popper.
    const ox = (opts.x != null ? opts.x : window.innerWidth / 2) * dpr;
    const oy = (opts.y != null ? opts.y : window.innerHeight * 0.32) * dpr;

    const bits = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (4 + Math.random() * 9) * dpr;
      bits.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6 * dpr, // bias upward on burst
        size: (6 + Math.random() * 7) * dpr,
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

  /* ---- global light haptic on any tappable press ---- */
  document.addEventListener(
    "pointerdown",
    (e) => {
      const t = e.target.closest(".btn, .tile, .chip, .gen-card, .tag-chip");
      if (t && !t.disabled) buzz(6);
    },
    { passive: true }
  );

  window.FX = { confetti, pop, buzz };
})();
