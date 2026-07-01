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

  let els = null; // cached DOM
  let src = null; // source HTMLImageElement
  let aspectKey = "1:1";
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
    };
    if (!els.canvas) return;

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
    } else {
      aspectKey = "1:1"; zoom = 1; filterKey = "original";
      adj = { brightness: 0, contrast: 0, warmth: 0, saturation: 0 };
    }
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
    pointers.set(e.pointerId, localXY(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { dist: dist(a, b), zoom };
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
  }
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
    return {
      dataUrl: canvas.toDataURL("image/png"),
      exportSize: { width: TW, height: TH },
      state: { aspectKey, zoom, filterKey, adj: Object.assign({}, adj), offset: { x: offX, y: offY } },
    };
  }

  return { init, open, getResult };
})();
