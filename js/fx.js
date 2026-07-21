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

  /* ---- Lottie confetti (owner's DC confetti) for the big win ---- */
  // Played full-screen once on a real win (sharing a post). Falls back to the
  // canvas burst below if the runtime or animation data isn't loaded. The small
  // localized `sparkle()` puffs keep using the canvas — a full-screen Lottie
  // can't originate from a tapped element.
  let lottieAnim = null;
  function playLottieConfetti() {
    if (!window.lottie || !window.CONFETTI_LOTTIE) return false;
    try {
      // Tear down any in-flight burst so rapid wins don't stack overlays.
      if (lottieAnim) { try { lottieAnim.destroy(); } catch (_) {} lottieAnim = null; }
      const prev = document.querySelector(".fx-lottie");
      if (prev) prev.remove();
      const host = document.createElement("div");
      host.className = "fx-lottie";
      document.body.appendChild(host);
      lottieAnim = window.lottie.loadAnimation({
        container: host,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: window.CONFETTI_LOTTIE,
      });
      const cleanup = () => {
        try { lottieAnim && lottieAnim.destroy(); } catch (_) {}
        lottieAnim = null;
        host.remove();
      };
      lottieAnim.addEventListener("complete", cleanup);
      // Safety net in case "complete" never fires.
      setTimeout(cleanup, 8000);
      return true;
    } catch (_) {
      return false;
    }
  }

  /* ---- swipe-right "like" heart (owner's Lottie) ---- */
  // A quick heart pop + burst, centred on screen, played once when a Generate
  // card is swiped/kept right. Best-effort: does nothing if the runtime or the
  // animation data isn't loaded, or under reduced motion.
  //
  // The source file runs 181 frames @60fps (3.0s), but we only want the front
  // half: the heart pops, bursts (~frame 45), and the particles are gone by
  // ~frame 75 — after which it holds a static heart, then swaps to an outline
  // heart at frame 118 that lingers to the end. Stopping at HEART_END_FRAME
  // drops both the dead hold and the outline heart (owner's call), and we fade
  // the overlay out so it leaves rather than snapping off.
  const HEART_END_FRAME = 84;
  const HEART_FADE_MS = 200;
  function heart() {
    if (reduceMotion || !window.lottie || !window.HEART_LOTTIE) return;
    try {
      const prev = document.querySelector(".fx-heart");
      if (prev) prev.remove();
      const host = document.createElement("div");
      host.className = "fx-heart";
      document.body.appendChild(host);
      const anim = window.lottie.loadAnimation({
        container: host,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: window.HEART_LOTTIE,
        initialSegment: [0, HEART_END_FRAME],
      });
      const cleanup = () => { try { anim.destroy(); } catch (_) {} host.remove(); };
      const fadeOut = () => {
        host.style.transition = `opacity ${HEART_FADE_MS}ms linear`;
        host.style.opacity = "0";
        setTimeout(cleanup, HEART_FADE_MS + 40);
      };
      anim.addEventListener("complete", fadeOut);
      setTimeout(cleanup, 2500); // safety net if "complete" never fires
    } catch (_) {}
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
    // One confetti look across the whole app: every FULL-SCREEN burst uses the
    // owner's DC confetti Lottie (quiet or loud — `quiet` only silences the
    // chime, not the visual). Only the small localized sparkles (which pass an
    // x/y origin from a tapped element) stay on the canvas, since a full-screen
    // Lottie can't originate from a point. The canvas burst below is also the
    // fallback if the Lottie runtime/data isn't loaded.
    const localized = opts.x != null || opts.y != null;
    if (!localized && playLottieConfetti()) return;
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

  /* ---- collapse: smoothly retire a vertical list row so the gap CLOSES rather
     than snapping shut (FLIP-lite). The row shrinks its own height/margin to 0
     while fading + sliding out, and because it's in normal flow the rows below
     follow it up. For stacked lists (the queue). Calls done() on finish (and
     immediately, unanimated, under reduced motion). ---- */
  function collapse(el, done) {
    const finish = () => { try { done && done(); } catch (_) {} };
    if (!el || reduceMotion) return finish();
    const h = el.offsetHeight;
    el.style.height = h + "px";
    el.style.overflow = "hidden";
    void el.offsetWidth; // lock the start height before transitioning
    el.style.transition =
      "height .3s var(--ease-premium), opacity .22s ease, margin .3s var(--ease-premium), padding .3s var(--ease-premium), transform .3s var(--ease-premium)";
    el.style.height = "0px";
    el.style.opacity = "0";
    el.style.marginTop = "0px";
    el.style.marginBottom = "0px";
    el.style.paddingTop = "0px";
    el.style.paddingBottom = "0px";
    el.style.transform = "translateX(-28px)";
    let called = false;
    const end = () => { if (!called) { called = true; finish(); } };
    el.addEventListener("transitionend", (e) => { if (e.propertyName === "height") end(); });
    setTimeout(end, 360); // safety net if transitionend never fires
  }

  /* ---- shrink: scale + fade an element out of existence, for GRID cells and
     wrapping chips (stash thumbnails, calendar workday chips) where a height
     collapse wouldn't close the horizontal gap the item leaves behind. ---- */
  function shrink(el, done) {
    const finish = () => { try { done && done(); } catch (_) {} };
    if (!el || reduceMotion) return finish();
    el.style.transformOrigin = "center";
    el.style.transition = "transform .24s var(--ease-premium), opacity .24s ease";
    void el.offsetWidth;
    el.style.transform = "scale(0.4)";
    el.style.opacity = "0";
    let called = false;
    const end = () => { if (!called) { called = true; finish(); } };
    el.addEventListener("transitionend", end, { once: true });
    setTimeout(end, 300); // safety net
  }

  /* ---- busy: put a button into a pending/loading state while async work runs
     (share, export, restore). Injects a spinning ring before the label and
     blocks re-taps; call busy(el, false) to restore. The spinner inherits the
     button's text colour (white on filled, dark on bordered) via currentColor.
     Safe to call repeatedly. ---- */
  function busy(el, on) {
    if (!el) return;
    const existing = el.querySelector(":scope > .btn-spin");
    if (on) {
      el.classList.add("is-busy");
      el.setAttribute("aria-busy", "true");
      if (!existing) {
        const s = document.createElement("span");
        s.className = "btn-spin";
        s.setAttribute("aria-hidden", "true");
        el.insertBefore(s, el.firstChild);
      }
    } else {
      el.classList.remove("is-busy");
      el.removeAttribute("aria-busy");
      if (existing) existing.remove();
    }
  }

  /* ---- Material-style touch ripple, but only in the flat "iOS" button mode
     (the default chunky buttons keep their 3D press-plunge, which already reads
     as touch feedback — a ripple there would fight it). Emanates from the touch
     point and cleans itself up. ---- */
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (reduceMotion) return;
      if (document.documentElement.getAttribute("data-btn") !== "ios") return;
      const btn = e.target.closest(".btn");
      if (!btn || btn.disabled) return;
      const r = btn.getBoundingClientRect();
      const d = Math.max(r.width, r.height);
      const rip = document.createElement("span");
      rip.className = "btn-ripple";
      rip.style.width = rip.style.height = d + "px";
      rip.style.left = e.clientX - r.left - d / 2 + "px";
      rip.style.top = e.clientY - r.top - d / 2 + "px";
      btn.appendChild(rip);
      rip.addEventListener("animationend", () => rip.remove());
      setTimeout(() => rip.remove(), 700); // safety net
    },
    { passive: true }
  );

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

  window.FX = { confetti, sparkle, pop, wiggle, buzz, heart, collapse, shrink, busy };
})();
