/*
 * editor.js — an Instagram-style photo editor for single posts.
 *
 * Steps mirrored from Instagram's "new post" flow:
 *  - Crop: drag to reposition, pinch / slider to zoom, aspect-ratio toggle
 *    (Square 1:1, Portrait 4:5, Landscape 1.91:1).
 *  - Filters: a row of named one-tap presets (Tasty, Crisp, Warm, …).
 *  - Adjust: brightness / contrast / warmth / saturation sliders.
 *
 * It works purely on <canvas> (offline, no libraries). The crop is stored as a
 * source rectangle so the exported image is always full resolution, independent
 * of the on-screen preview size.
 */
const Editor = (() => {
  const ASPECTS = {
    "1:1": { ratio: 1, export: [1080, 1080], label: "Square" },
    "4:5": { ratio: 0.8, export: [1080, 1350], label: "Portrait" },
    "1.91:1": { ratio: 1.91, export: [1080, 566], label: "Landscape" },
  };

  // Named presets. Each is a CSS filter string applied while drawing.
  const FILTERS = [
    { key: "original", name: "Original", css: "" },
    { key: "tasty", name: "Tasty", css: "saturate(1.35) contrast(1.12) brightness(1.04) sepia(0.10)" },
    { key: "crisp", name: "Crisp", css: "contrast(1.12) saturate(1.12)" },
    { key: "warm", name: "Warm", css: "sepia(0.28) saturate(1.30) contrast(1.05) brightness(1.03)" },
    { key: "cool", name: "Cool", css: "hue-rotate(-12deg) saturate(1.12) brightness(1.02)" },
    { key: "punch", name: "Punch", css: "contrast(1.28) saturate(1.45)" },
    { key: "fade", name: "Fade", css: "contrast(0.90) brightness(1.10) saturate(0.85) sepia(0.12)" },
    { key: "mono", name: "Mono", css: "grayscale(1) contrast(1.12)" },
  ];

  // Text-tool styles, mimicking Instagram Stories' named text styles.
  const TEXT_STYLES = {
    classic: { name: "Classic", family: "Poppins", weight: 600, upper: false },
    modern: { name: "Modern", family: "Oswald", weight: 600, upper: true, spacing: 0.06 },
    neon: { name: "Neon", family: "Pacifico", weight: 400, upper: false, glow: true },
    typewriter: { name: "Type", family: "'Space Mono'", weight: 700, upper: false },
    strong: { name: "Strong", family: "Poppins", weight: 800, upper: false, highlightDefault: "solid" },
  };
  const STYLE_ORDER = ["classic", "modern", "neon", "typewriter", "strong"];
  const SWATCHES = ["#ffffff", "#111111", "#0a4da1", "#f58b1f", "#e23b2e", "#2b8a3e", "#ffd21e", "#ff5fa2"];
  const HIGHLIGHTS = ["none", "solid", "semi"];
  const ALIGNS = ["center", "left", "right"];

  let els = null; // cached DOM
  let src = null; // source HTMLImageElement
  let aspectKey = "1:1";
  let overlays = []; // text overlays: {id,text,style,color,align,highlight,cx,cy,size,rot}
  let selId = null; // selected overlay id
  let draggingOverlay = null;
  let textFontsReady = null;
  let uidCounter = 0;
  let zoom = 1; // 1..3
  let offX = 0, offY = 0; // image top-left within the frame, in CSS px
  let frameW = 0, frameH = 0; // preview frame size in CSS px
  let filterKey = "original";
  let adj = { brightness: 0, contrast: 0, warmth: 0, saturation: 0 };
  const pointers = new Map(); // active pointers for drag / pinch
  let pinchStart = null;

  function init() {
    els = {
      screen: document.querySelector('[data-screen="editor"]'),
      stage: document.getElementById("editorStage"),
      canvas: document.getElementById("editorCanvas"),
      zoom: document.getElementById("editorZoom"),
      aspectRow: document.getElementById("editorAspect"),
      tabs: document.getElementById("editorTabs"),
      filters: document.getElementById("editorFilters"),
      adjust: document.getElementById("editorAdjust"),
      textPanel: document.getElementById("editorText"),
      txtControls: document.getElementById("txtControls"),
      txtInput: document.getElementById("txtInput"),
      txtStyles: document.getElementById("txtStyles"),
      txtSwatches: document.getElementById("txtSwatches"),
      txtSize: document.getElementById("txtSize"),
      txtRotate: document.getElementById("txtRotate"),
      txtAlign: document.getElementById("txtAlign"),
      txtHighlight: document.getElementById("txtHighlight"),
      txtDelete: document.getElementById("txtDelete"),
      txtHint: document.getElementById("txtHint"),
    };
    if (!els.canvas) return;
    buildTextControls();

    els.aspectRow.addEventListener("click", (e) => {
      const b = e.target.closest("[data-aspect]");
      if (b) setAspect(b.dataset.aspect);
    });
    els.zoom.addEventListener("input", (e) => setZoom(parseFloat(e.target.value)));
    els.tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-etab]");
      if (b) showTab(b.dataset.etab);
    });
    els.filters.addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (b) selectFilter(b.dataset.filter);
    });
    els.adjust.addEventListener("input", (e) => {
      const s = e.target.closest("input[data-adj]");
      if (s) { adj[s.dataset.adj] = parseInt(s.value, 10); render(); }
    });

    // Text tool controls.
    els.textPanel.addEventListener("click", (e) => {
      const a = e.target.closest("[data-txt]");
      if (a) onTextAction(a.dataset.txt);
    });
    els.txtInput.addEventListener("input", (e) => {
      const ov = selectedOverlay();
      if (ov) { ov.text = e.target.value; render(); }
    });
    els.txtStyles.addEventListener("click", (e) => {
      const b = e.target.closest("[data-style]");
      if (b) setOverlayProp("style", b.dataset.style);
    });
    els.txtSwatches.addEventListener("click", (e) => {
      const b = e.target.closest("[data-swatch]");
      if (b) setOverlayProp("color", b.dataset.swatch);
    });
    els.txtSize.addEventListener("input", (e) => setOverlayProp("size", parseFloat(e.target.value)));
    els.txtRotate.addEventListener("input", (e) => setOverlayProp("rot", parseInt(e.target.value, 10)));

    // Drag to reposition + two-finger pinch to zoom.
    const c = els.canvas;
    c.style.touchAction = "none";
    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("pointermove", onPointerMove);
    c.addEventListener("pointerup", onPointerUp);
    c.addEventListener("pointercancel", onPointerUp);
    c.addEventListener("pointerleave", onPointerUp);
    window.addEventListener("resize", () => { if (src) { layout(); render(); } });
  }

  // Open the editor on an image, optionally restoring a previous edit state.
  function open(image, state) {
    src = image;
    if (state) {
      aspectKey = state.aspectKey || "1:1";
      zoom = state.zoom || 1;
      filterKey = state.filterKey || "original";
      adj = Object.assign({ brightness: 0, contrast: 0, warmth: 0, saturation: 0 }, state.adj || {});
      overlays = (state.overlays || []).map((o) => Object.assign({}, o));
    } else {
      aspectKey = "1:1"; zoom = 1; filterKey = "original";
      adj = { brightness: 0, contrast: 0, warmth: 0, saturation: 0 };
      overlays = [];
    }
    selId = null;
    ensureTextFonts().then(() => { if (src) render(); });
    els.zoom.value = zoom;
    syncAspectButtons();
    syncAdjustInputs();
    showTab("filters");
    layout();
    if (state && state.offset) { offX = state.offset.x; offY = state.offset.y; }
    else centreImage();
    clampOffsets();
    buildFilterThumbs();
    selectFilter(filterKey, true);
    syncTextPanel();
    render();
  }

  function coverScale() {
    return Math.max(frameW / src.width, frameH / src.height);
  }
  function drawScale() {
    return coverScale() * zoom;
  }

  function layout() {
    const stageW = Math.max(240, els.stage.clientWidth || 340);
    const maxH = Math.min(window.innerHeight * 0.5, 440);
    const ratio = ASPECTS[aspectKey].ratio;
    let w = stageW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    frameW = Math.round(w);
    frameH = Math.round(h);
    const dpr = window.devicePixelRatio || 1;
    els.canvas.style.width = frameW + "px";
    els.canvas.style.height = frameH + "px";
    els.canvas.width = Math.round(frameW * dpr);
    els.canvas.height = Math.round(frameH * dpr);
  }

  function centreImage() {
    const dw = src.width * drawScale();
    const dh = src.height * drawScale();
    offX = (frameW - dw) / 2;
    offY = (frameH - dh) / 2;
  }

  function clampOffsets() {
    const dw = src.width * drawScale();
    const dh = src.height * drawScale();
    offX = Math.min(0, Math.max(frameW - dw, offX));
    offY = Math.min(0, Math.max(frameH - dh, offY));
  }

  function combinedFilter() {
    const preset = FILTERS.find((f) => f.key === filterKey);
    let s = preset ? preset.css : "";
    const b = 1 + (adj.brightness / 100) * 0.4;
    const c = 1 + (adj.contrast / 100) * 0.4;
    const sat = 1 + (adj.saturation / 100) * 0.6;
    if (adj.brightness) s += ` brightness(${b.toFixed(3)})`;
    if (adj.contrast) s += ` contrast(${c.toFixed(3)})`;
    if (adj.saturation) s += ` saturate(${sat.toFixed(3)})`;
    if (adj.warmth > 0) s += ` sepia(${(adj.warmth / 100 * 0.5).toFixed(3)})`;
    else if (adj.warmth < 0) s += ` hue-rotate(${(adj.warmth / 100 * 25).toFixed(1)}deg)`;
    return s.trim();
  }

  function render() {
    const ctx = els.canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frameW, frameH);
    ctx.save();
    ctx.filter = combinedFilter() || "none";
    const dw = src.width * drawScale();
    const dh = src.height * drawScale();
    ctx.drawImage(src, offX, offY, dw, dh);
    ctx.restore();
    drawThirds(ctx);
    overlays.forEach((ov) => drawTextOverlay(ctx, ov, frameW, frameH, ov.id === selId && textMode()));
  }

  // Faint rule-of-thirds grid, like IG's crop overlay.
  function drawThirds(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = (frameW / 3) * i, y = (frameH / 3) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, frameH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(frameW, y); ctx.stroke();
    }
    ctx.restore();
  }

  function setAspect(key) {
    if (!ASPECTS[key]) return;
    aspectKey = key;
    syncAspectButtons();
    layout();
    centreImage();
    clampOffsets();
    render();
  }
  function syncAspectButtons() {
    els.aspectRow.querySelectorAll("[data-aspect]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.aspect === aspectKey)
    );
  }

  function setZoom(z, cx, cy) {
    z = Math.min(3, Math.max(1, z));
    cx = cx == null ? frameW / 2 : cx;
    cy = cy == null ? frameH / 2 : cy;
    const oldScale = drawScale();
    const srcX = (cx - offX) / oldScale;
    const srcY = (cy - offY) / oldScale;
    zoom = z;
    const newScale = drawScale();
    offX = cx - srcX * newScale;
    offY = cy - srcY * newScale;
    clampOffsets();
    els.zoom.value = zoom;
    render();
  }

  function showTab(name) {
    els.tabs.querySelectorAll("[data-etab]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.etab === name)
    );
    els.filters.hidden = name !== "filters";
    els.adjust.hidden = name !== "adjust";
    els.textPanel.hidden = name !== "text";
    render(); // toggles the selection outline on/off
  }
  function textMode() {
    return !els.textPanel.hidden;
  }

  function selectFilter(key, skipRender) {
    filterKey = key;
    els.filters.querySelectorAll("[data-filter]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.filter === key)
    );
    if (!skipRender) render();
  }

  function syncAdjustInputs() {
    els.adjust.querySelectorAll("input[data-adj]").forEach((s) => {
      s.value = adj[s.dataset.adj];
    });
  }

  // Build the little filter preview thumbnails from a small square crop.
  function buildFilterThumbs() {
    const size = 132;
    const thumb = document.createElement("canvas");
    thumb.width = size; thumb.height = size;
    const tctx = thumb.getContext("2d");
    const s = Math.max(size / src.width, size / src.height);
    const dw = src.width * s, dh = src.height * s;
    tctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh);

    els.filters.innerHTML = "";
    FILTERS.forEach((f) => {
      const cell = document.createElement("button");
      cell.className = "filter-cell" + (f.key === filterKey ? " selected" : "");
      cell.dataset.filter = f.key;
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 64;
      const cctx = cv.getContext("2d");
      cctx.filter = f.css || "none";
      cctx.drawImage(thumb, 0, 0, 64, 64);
      const label = document.createElement("span");
      label.textContent = f.name;
      cell.appendChild(cv);
      cell.appendChild(label);
      els.filters.appendChild(cell);
    });
  }

  /* ---- pointer drag + pinch ---- */
  function localXY(e) {
    const r = els.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onPointerDown(e) {
    els.canvas.setPointerCapture(e.pointerId);
    const pt = localXY(e);
    pointers.set(e.pointerId, pt);
    if (pointers.size === 2) {
      draggingOverlay = null; // two fingers = zoom the image, not the text
      const [a, b] = [...pointers.values()];
      pinchStart = { dist: dist(a, b), zoom };
    } else if (textMode()) {
      const hit = overlayAt(pt.x, pt.y);
      if (hit) { selId = hit.id; draggingOverlay = hit; syncTextPanel(); render(); }
      else draggingOverlay = null;
    }
  }
  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const now = localXY(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const d = dist(a, b);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      setZoom(pinchStart.zoom * (d / pinchStart.dist), cx, cy);
    } else if (pointers.size === 1 && draggingOverlay) {
      draggingOverlay.cx = clamp01(draggingOverlay.cx + (now.x - prev.x) / frameW);
      draggingOverlay.cy = clamp01(draggingOverlay.cy + (now.y - prev.y) / frameH);
      render();
    } else if (pointers.size === 1) {
      offX += now.x - prev.x;
      offY += now.y - prev.y;
      clampOffsets();
      render();
    }
  }
  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) draggingOverlay = null;
  }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Export the cropped + filtered image at full resolution.
  function getResult() {
    const [TW, TH] = ASPECTS[aspectKey].export;
    const canvas = document.createElement("canvas");
    canvas.width = TW; canvas.height = TH;
    const ctx = canvas.getContext("2d");
    const scale = drawScale();
    // Source rectangle currently visible in the frame.
    const sx = -offX / scale;
    const sy = -offY / scale;
    const sw = frameW / scale;
    const sh = frameH / scale;
    ctx.filter = combinedFilter() || "none";
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, TW, TH);
    ctx.filter = "none"; // text is not affected by the photo filter
    overlays.forEach((ov) => drawTextOverlay(ctx, ov, TW, TH, false));
    return {
      dataUrl: canvas.toDataURL("image/png"),
      exportSize: { width: TW, height: TH },
      state: {
        aspectKey, zoom, filterKey,
        adj: Object.assign({}, adj),
        offset: { x: offX, y: offY },
        overlays: overlays.map((o) => Object.assign({}, o)),
      },
    };
  }

  /* ---- Text tool ---- */
  function ensureTextFonts() {
    if (textFontsReady) return textFontsReady;
    if (!document.fonts || !document.fonts.load) {
      textFontsReady = Promise.resolve();
      return textFontsReady;
    }
    textFontsReady = Promise.all([
      document.fonts.load("600 40px Poppins"),
      document.fonts.load("800 40px Poppins"),
      document.fonts.load("600 40px Oswald"),
      document.fonts.load("400 40px Pacifico"),
      document.fonts.load('700 40px "Space Mono"'),
    ]).then(() => document.fonts.ready).catch(() => {});
    return textFontsReady;
  }

  function buildTextControls() {
    els.txtStyles.innerHTML = STYLE_ORDER.map((k) =>
      `<button class="style-chip" data-style="${k}" style="font-family:${TEXT_STYLES[k].family},sans-serif">${TEXT_STYLES[k].name}</button>`
    ).join("");
    els.txtSwatches.innerHTML = SWATCHES.map((c) =>
      `<button class="swatch" data-swatch="${c}" style="background:${c}" aria-label="colour ${c}"></button>`
    ).join("");
  }

  function selectedOverlay() {
    return overlays.find((o) => o.id === selId) || null;
  }

  function onTextAction(action) {
    if (action === "add") return addOverlay("");
    if (action === "hook") return insertHook();
    const ov = selectedOverlay();
    if (!ov) return;
    if (action === "delete") {
      overlays = overlays.filter((o) => o.id !== ov.id);
      selId = null;
      syncTextPanel();
      render();
    } else if (action === "align") {
      ov.align = ALIGNS[(ALIGNS.indexOf(ov.align) + 1) % ALIGNS.length];
      syncTextPanel(); render();
    } else if (action === "highlight") {
      ov.highlight = HIGHLIGHTS[(HIGHLIGHTS.indexOf(ov.highlight) + 1) % HIGHLIGHTS.length];
      syncTextPanel(); render();
    }
  }

  function addOverlay(text) {
    const ov = {
      id: "ov" + ++uidCounter, text: text || "", style: "classic",
      color: "#ffffff", align: "center", highlight: "none",
      cx: 0.5, cy: 0.5, size: 9, rot: 0,
    };
    overlays.push(ov);
    selId = ov.id;
    showTab("text");
    syncTextPanel();
    render();
    if (els.txtInput) els.txtInput.focus();
  }

  // Drop a ready-made cheeky hook onto the photo (variable-free ones so it
  // needs no location/day).
  function insertHook() {
    let text = "Come and get fed.";
    try {
      const lib = typeof Hooks !== "undefined" && Hooks.getLibrary ? Hooks.getLibrary() : null;
      if (lib && lib.hooks) {
        const noVar = lib.hooks.filter((h) => !h.uses || h.uses.length === 0);
        const pool = noVar.length ? noVar : lib.hooks;
        const h = pool[Math.floor(Math.random() * pool.length)];
        text = h.text.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
      }
    } catch (e) { /* fall back to default line */ }
    addOverlay(text);
  }

  function setOverlayProp(prop, value) {
    const ov = selectedOverlay();
    if (!ov) return;
    if (prop === "style") {
      ov.style = value;
      const st = TEXT_STYLES[value];
      if (st.highlightDefault && ov.highlight === "none") ov.highlight = st.highlightDefault;
    } else {
      ov[prop] = value;
    }
    syncTextPanel();
    render();
  }

  function syncTextPanel() {
    const ov = selectedOverlay();
    els.txtControls.hidden = !ov;
    els.txtDelete.hidden = !ov;
    els.txtHint.hidden = !!ov;
    if (!ov) return;
    els.txtInput.value = ov.text;
    els.txtSize.value = ov.size;
    els.txtRotate.value = ov.rot;
    els.txtStyles.querySelectorAll("[data-style]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.style === ov.style));
    els.txtSwatches.querySelectorAll("[data-swatch]").forEach((b) =>
      b.classList.toggle("selected", b.dataset.swatch.toLowerCase() === ov.color.toLowerCase()));
    els.txtAlign.textContent = ov.align === "center" ? "↔ Centre" : ov.align === "left" ? "⇤ Left" : "⇥ Right";
    els.txtHighlight.textContent = ov.highlight === "none" ? "▢ No fill" : ov.highlight === "solid" ? "▣ Colour fill" : "▨ Shade";
  }

  function wrapOverlayText(ctx, text, maxW) {
    const out = [];
    (text || "").split("\n").forEach((para) => {
      const words = para.split(" ");
      let line = "";
      words.forEach((word) => {
        const trial = line ? line + " " + word : word;
        if (ctx.measureText(trial).width <= maxW || !line) line = trial;
        else { out.push(line); line = word; }
      });
      out.push(line);
    });
    return out.length ? out : [""];
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function contrastColor(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111111" : "#ffffff";
  }

  function drawTextOverlay(ctx, ov, W, H, selected) {
    const st = TEXT_STYLES[ov.style] || TEXT_STYLES.classic;
    const fontPx = (ov.size / 100) * W;
    const raw = ov.text || "";
    if (!raw.trim() && !selected) { ov._box = null; return; }
    const display = st.upper ? raw.toUpperCase() : raw;

    ctx.save();
    ctx.translate(ov.cx * W, ov.cy * H);
    if (ov.rot) ctx.rotate((ov.rot * Math.PI) / 180);
    ctx.font = `${st.weight} ${fontPx}px ${st.family}, sans-serif`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = st.spacing ? (st.spacing * fontPx).toFixed(1) + "px" : "0px";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const lines = wrapOverlayText(ctx, display || " ", 0.92 * W);
    const widths = lines.map((l) => ctx.measureText(l || " ").width);
    const blockW = Math.max(1, ...widths);
    const lineH = fontPx * 1.3;
    const totalH = lines.length * lineH;
    const startY = -totalH / 2 + lineH / 2;
    const padX = fontPx * 0.3, padY = fontPx * 0.16;

    lines.forEach((line, i) => {
      const w = widths[i];
      const y = startY + i * lineH;
      const lineCX = ov.align === "left" ? -blockW / 2 + w / 2 : ov.align === "right" ? blockW / 2 - w / 2 : 0;
      if (ov.highlight !== "none") {
        ctx.fillStyle = ov.highlight === "solid" ? ov.color : "rgba(0,0,0,0.42)";
        roundRect(ctx, lineCX - w / 2 - padX, y - lineH / 2, w + 2 * padX, lineH, fontPx * 0.14);
        ctx.fill();
      }
      ctx.save();
      if (st.glow && ov.highlight === "none") { ctx.shadowColor = ov.color; ctx.shadowBlur = fontPx * 0.55; }
      else if (ov.highlight === "none") { ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = fontPx * 0.12; }
      ctx.fillStyle = ov.highlight === "solid" ? contrastColor(ov.color) : ov.color;
      ctx.fillText(line || " ", lineCX, y);
      ctx.restore();
    });

    if (selected) {
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.strokeRect(-blockW / 2 - padX, -totalH / 2 - padY, blockW + 2 * padX, totalH + 2 * padY);
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Axis-aligned hit box in frame space (used for tap-to-select / drag).
    ov._box = { cx: ov.cx * W, cy: ov.cy * H, w: blockW + 2 * padX, h: totalH + 2 * padY };
  }

  function overlayAt(x, y) {
    for (let i = overlays.length - 1; i >= 0; i--) {
      const b = overlays[i]._box;
      if (b && Math.abs(x - b.cx) <= b.w / 2 && Math.abs(y - b.cy) <= b.h / 2) return overlays[i];
    }
    return null;
  }

  return { init, open, getResult, fontsReady: ensureTextFonts };
})();
