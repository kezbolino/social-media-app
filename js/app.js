/*
 * app.js — the controller. Moves between screens and holds the post the user
 * is building. Each post is a draft until it's shared (draft -> approved ->
 * shared); that status field is the seam where auto-posting could bolt on later
 * without changing the rest of the app.
 */
(() => {
  let templatesDoc = null; // { canvas, templates: [...] }

  // A session "photo folder": image File objects the user loaded once, that
  // the Shuffle buttons pull random pictures from. Cleared when the app reloads.
  let photoPool = [];
  let folderTarget = "single"; // which screen asked to load a folder

  // The post currently being built.
  let post = freshPost();

  function freshPost() {
    return {
      id: "p_" + Date.now(),
      type: null, // 'single' | 'collage'
      templateId: null,
      templateIndex: 0,
      singleImage: null, // HTMLImageElement (raw pick)
      baseImage: null, // HTMLImageElement (cropped + filtered by the editor)
      exportSize: null, // { width, height } chosen in the editor
      editState: null, // saved editor settings, so Back re-opens where you left
      collageImages: [], // aligned to template.boxes
      tag: null, // 'location' | 'brand' | 'other'
      location: "",
      day: "",
      item: null,
      caption: null, // { hook, filledText, item }
      captionText: "",
      status: "draft",
      finalBlob: null,
      created: new Date().toISOString(),
    };
  }

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  let lastQuizBack = "type"; // where the quiz "Back" should go

  function show(screen) {
    $$(".screen").forEach((s) =>
      s.classList.toggle("is-active", s.dataset.screen === screen)
    );
    window.scrollTo(0, 0);
  }

  /* ---------- boot ---------- */
  async function boot() {
    try {
      await Hooks.init();
      // Prefer the embedded templates (runs from a plain file); fall back to
      // fetching the JSON when served over http.
      if (window.COLLAGE_TEMPLATES) {
        templatesDoc = window.COLLAGE_TEMPLATES;
      } else {
        const res = await fetch(window.APP_CONFIG.TEMPLATES_URL);
        templatesDoc = await res.json();
      }
      // Give templates their shared canvas size.
      templatesDoc.templates.forEach((t) => (t.canvas = templatesDoc.canvas));
    } catch (e) {
      alert("Couldn't load the app data.\n\n" + e.message);
      return;
    }
    wireEvents();
    Editor.init();
  }

  /* ---------- event wiring (delegated) ---------- */
  function wireEvents() {
    document.addEventListener("click", (e) => {
      const back = e.target.closest("[data-back]");
      if (back) return handleBack(back.dataset.back);

      const loc = e.target.closest("[data-loc]");
      if (loc) return pickChip("location", loc.dataset.loc);

      const day = e.target.closest("[data-day]");
      if (day) return pickChip("day", day.dataset.day);

      const tag = e.target.closest("[data-tag]");
      if (tag) return chooseTag(tag.dataset.tag);

      const a = e.target.closest("[data-action]");
      if (a) return handleAction(a.dataset.action, a);
    });

    $("#singleInput").addEventListener("change", onSinglePhoto);
    $("#collageInput").addEventListener("change", onCollagePhoto);
    $("#folderInput").addEventListener("change", onFolderPicked);
    $("#captionText").addEventListener("input", (e) => {
      post.captionText = e.target.value;
      schedulePreviewRefresh();
    });
    $("#menuInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addMenuItem();
    });
    $("#locationInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addLocationItem();
    });
  }

  function handleBack(target) {
    if (target === "") return show(lastQuizBack); // quiz back is dynamic
    show(target);
  }

  function handleAction(action, el) {
    switch (action) {
      case "new-post": post = freshPost(); show("type"); break;
      case "open-settings": renderLocations(); renderMenu(); show("settings"); break;
      case "choose-single": startSingle(); break;
      case "choose-collage": startCollage(); break;
      case "pick-single": $("#singleInput").click(); break;
      case "pick-folder-single": folderTarget = "single"; $("#folderInput").click(); break;
      case "shuffle-single": shuffleSinglePhoto(); break;
      case "single-next": openEditor(); break;
      case "editor-next": editorNext(); break;
      case "cycle-template": cycleTemplate(); break;
      case "pick-folder-collage": folderTarget = "collage"; $("#folderInput").click(); break;
      case "shuffle-collage": shuffleCollagePhotos(); break;
      case "collage-next": openCollageTextEditor(); break;
      case "add-location": addLocationItem(); break;
      case "details-next": detailsNext(); break;
      case "shuffle": shuffleCaption(); break;
      case "caption-next": buildReview(); break;
      case "share": doShare(); break;
      case "go-home": post = freshPost(); show("home"); break;
      case "add-menu": addMenuItem(); break;
    }
  }

  /* ---------- SINGLE ---------- */
  function startSingle() {
    post.type = "single";
    post.singleImage = null;
    $("#singlePreview").hidden = true;
    $("#singleEmpty").hidden = false;
    $("#singleNext").disabled = true;
    refreshPoolUi();
    show("single");
  }

  async function onSinglePhoto(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    await setSingleImageFromFile(file);
  }

  async function setSingleImageFromFile(file) {
    try {
      post.singleImage = await Imaging.loadImageFromFile(file);
      post.baseImage = null; // a new photo resets any previous crop/filter
      post.editState = null;
      const img = $("#singlePreview");
      img.src = post.singleImage.src;
      img.hidden = false;
      $("#singleEmpty").hidden = true;
      $("#singleNext").disabled = false;
    } catch (err) {
      alert(err.message);
    }
  }

  /* ---------- PHOTO EDITOR ---------- */
  function setEditorChrome(backTo, title) {
    const back = document.querySelector('[data-screen="editor"] .back');
    if (back) back.dataset.back = backTo;
    const h2 = document.querySelector('[data-screen="editor"] h2');
    if (h2) h2.textContent = title;
  }

  // Single photos: full editor (crop / filter / adjust / text).
  function openEditor() {
    setEditorChrome("single", "Edit photo");
    Editor.open(post.singleImage, post.editState);
    lastQuizBack = "editor"; // the quiz's Back returns to the editor
    show("editor");
  }

  // Collages: compose the layout, then a text-only editor to add captions on it.
  async function openCollageTextEditor() {
    await Imaging.ensureFonts();
    const tpl = currentTemplate();
    let overlay = null;
    if (tpl.overlay) {
      try { overlay = await Imaging.loadImageFromUrl(tpl.overlay); } catch (e) { overlay = null; }
    }
    const canvas = Imaging.renderCollage(tpl, post.collageImages, overlay, null);
    let bg;
    try { bg = await Imaging.loadImageFromUrl(canvas.toDataURL("image/png")); }
    catch (e) { bg = null; }
    if (!bg) { lastQuizBack = "collage"; return show("quiz"); }
    setEditorChrome("collage", "Add text");
    Editor.open(bg, post.editState, { mode: "text" });
    lastQuizBack = "editor";
    show("editor");
  }

  async function editorNext() {
    await Editor.fontsReady();
    const r = Editor.getResult();
    post.exportSize = r.exportSize;
    post.editState = r.state;
    try {
      post.baseImage = await Imaging.loadImageFromUrl(r.dataUrl);
    } catch (e) {
      post.baseImage = null; // fall back if anything fails
    }
    show("quiz");
  }

  /* ---------- PHOTO FOLDER + SHUFFLE ---------- */
  function onFolderPicked(e) {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (!files.length) {
      alert("That folder didn't have any photos in it.");
      return;
    }
    photoPool = files;
    refreshPoolUi();
    // Immediately drop random photos in so they see it work.
    if (folderTarget === "single") shuffleSinglePhoto();
    else shuffleCollagePhotos();
  }

  function refreshPoolUi() {
    const has = photoPool.length > 0;
    const label = has ? `📁 ${photoPool.length} photos loaded — tap shuffle for random picks` : "";
    [["#singleShuffle", "#singlePoolNote"], ["#collageShuffle", "#collagePoolNote"]].forEach(
      ([btnSel, noteSel]) => {
        const btn = $(btnSel);
        if (btn) btn.disabled = !has;
        const note = $(noteSel);
        if (note) { note.hidden = !has; note.textContent = label; }
      }
    );
  }

  function randomFiles(n) {
    const pool = photoPool.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  async function shuffleSinglePhoto() {
    if (!photoPool.length) return;
    const [file] = randomFiles(1);
    if (file) await setSingleImageFromFile(file);
  }

  async function shuffleCollagePhotos() {
    if (!photoPool.length) return;
    const tpl = currentTemplate();
    const picks = randomFiles(tpl.boxes.length);
    for (let i = 0; i < tpl.boxes.length; i++) {
      if (picks[i]) {
        try { post.collageImages[i] = await Imaging.loadImageFromFile(picks[i]); }
        catch (err) { /* skip a bad file */ }
      }
    }
    renderCollageSlots();
    drawCollagePreview();
    updateCollageNext();
  }

  /* ---------- COLLAGE ---------- */
  function currentTemplate() {
    return templatesDoc.templates[post.templateIndex];
  }

  function startCollage() {
    post.type = "collage";
    post.templateIndex = 0;
    post.baseImage = null;
    post.editState = null;
    applyTemplate();
    refreshPoolUi();
    show("collage");
  }

  function applyTemplate() {
    const tpl = currentTemplate();
    post.templateId = tpl.id;
    post.collageImages = new Array(tpl.boxes.length).fill(null);
    $("#templateName").textContent = tpl.name;
    renderCollageSlots();
    drawCollagePreview();
    $("#collageNext").disabled = true;
  }

  function cycleTemplate() {
    // Keep photos already chosen; carry as many as the new layout has slots.
    const existing = post.collageImages.slice();
    post.templateIndex = (post.templateIndex + 1) % templatesDoc.templates.length;
    const tpl = currentTemplate();
    post.templateId = tpl.id;
    post.collageImages = new Array(tpl.boxes.length)
      .fill(null)
      .map((_, i) => existing[i] || null);
    $("#templateName").textContent = tpl.name;
    renderCollageSlots();
    drawCollagePreview();
    updateCollageNext();
  }

  let activeSlot = 0;
  function renderCollageSlots() {
    const tpl = currentTemplate();
    const wrap = $("#collageSlots");
    wrap.innerHTML = "";
    tpl.boxes.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.className = "slot" + (post.collageImages[i] ? " filled" : "");
      btn.textContent = post.collageImages[i] ? `Photo ${i + 1} ✓` : `+ Photo ${i + 1}`;
      btn.addEventListener("click", () => {
        activeSlot = i;
        $("#collageInput").click();
      });
      wrap.appendChild(btn);
    });
  }

  async function onCollagePhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      post.collageImages[activeSlot] = await Imaging.loadImageFromFile(file);
      renderCollageSlots();
      drawCollagePreview();
      updateCollageNext();
    } catch (err) {
      alert(err.message);
    }
  }

  function updateCollageNext() {
    const any = post.collageImages.some((x) => x);
    $("#collageNext").disabled = !any;
  }

  function drawCollagePreview() {
    const tpl = currentTemplate();
    // No caption yet at the layout stage — just show the photos in the boxes.
    const canvas = Imaging.renderCollage(tpl, post.collageImages, null, null);
    const dest = $("#collagePreview");
    dest.width = canvas.width;
    dest.height = canvas.height;
    dest.getContext("2d").drawImage(canvas, 0, 0);
  }

  /* ---------- QUIZ + DETAILS ---------- */
  function chooseTag(tag) {
    post.tag = tag;
    // If this kind of post needs no typed details, skip the (empty) details
    // screen and go straight to the caption.
    if (Hooks.inputVarsForTag(tag).length === 0 && resolveCaption("quiz")) return;
    renderDetailFields();
    show("details");
  }

  // Pick a caption from the current post context and move to the caption
  // screen. backTarget sets where that screen's Back button returns to —
  // "quiz" when we skipped the details screen, "details" otherwise. Returns
  // false if nothing fits so the caller can show the right fallback.
  function resolveCaption(backTarget) {
    const ctx = {
      location: post.location,
      day: post.day,
      menuItems: Store.getMenuItems(),
    };
    const result = Hooks.choose(post.tag, ctx);
    if (!result) return false;
    setCaption(result);
    renderCaptionPreview();
    const back = document.querySelector('[data-screen="caption"] .back');
    if (back) back.dataset.back = backTarget;
    show("caption");
    return true;
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function renderDetailFields() {
    const vars = Hooks.inputVarsForTag(post.tag);
    const wrap = $("#detailFields");
    wrap.innerHTML = "";
    const labels = {
      location: { label: "Location", hint: "Tap a saved spot, or type a new one", ph: "Brick Lane" },
      day: { label: "Day (optional)", hint: "Tap a day, or type one", ph: "Sunday" },
    };
    vars.forEach((v) => {
      const meta = labels[v];
      const field = document.createElement("div");
      field.className = "field";
      const chips =
        v === "location"
          ? Store.getLocations().map((l) => chipHtml("loc", l, post.location)).join("")
          : DAYS.map((d) => chipHtml("day", d, post.day)).join("");
      field.innerHTML =
        `<label>${meta.label} <small>${meta.hint}</small></label>` +
        `<div class="chips">${chips}</div>` +
        `<input class="text-input" id="field_${v}" type="text" placeholder="${meta.ph}" value="${escapeAttr(post[v] || "")}" />`;
      wrap.appendChild(field);
    });

    // Note about food captions if the menu drives any.
    const menuItems = Store.getMenuItems();
    const note = $("#menuNote");
    if (menuItems.length) {
      note.hidden = false;
      note.textContent = `Food captions will pick from your menu (${menuItems.length} item${menuItems.length > 1 ? "s" : ""}).`;
    } else {
      note.hidden = true;
    }
    $("#detailsError").hidden = true;
  }

  function chipHtml(kind, value, current) {
    const sel = current && value.toLowerCase() === current.toLowerCase() ? " selected" : "";
    return `<button class="chip${sel}" data-${kind}="${escapeAttr(value)}">${escapeAttr(value)}</button>`;
  }

  // Tapping a saved location / day chip fills the matching field.
  function pickChip(field, value) {
    const input = document.getElementById("field_" + field);
    if (input) input.value = value;
    post[field] = value;
    const attr = field === "location" ? "loc" : "day";
    document.querySelectorAll("[data-" + attr + "]").forEach((el) => {
      el.classList.toggle(
        "selected",
        el.getAttribute("data-" + attr).toLowerCase() === value.toLowerCase()
      );
    });
  }

  function detailsNext() {
    const vars = Hooks.inputVarsForTag(post.tag);
    vars.forEach((v) => {
      const el = $("#field_" + v);
      post[v] = el ? el.value.trim() : "";
    });
    // Remember a freshly-typed location for next time.
    if (post.location) Store.addLocation(post.location);

    if (resolveCaption("details")) return;

    const err = $("#detailsError");
    err.hidden = false;
    err.textContent = vars.includes("location") && !post.location
      ? "Add a location to get a caption for this kind of post."
      : "No caption fits those details — try a different answer or add a location.";
  }

  // Compose the post image (with the location/day text overlaid) for the
  // live preview on the caption screen.
  async function renderCaptionPreview() {
    const img = $("#captionPreview");
    try {
      await Imaging.ensureFonts();
      const canvas = await composePostImage();
      if (canvas) img.src = Imaging.toDataURL(canvas);
      else img.removeAttribute("src");
    } catch (e) {
      /* preview is best-effort */
    }
  }

  // Build the finished image (photo[s] + the full caption overlaid). Shared by
  // the live caption preview and the final export so they always match.
  async function composePostImage() {
    // The editor bakes crop/filter/text into the base image; the caption is
    // just the post text now (pasted when sharing), never burned on.
    if (post.baseImage) return Imaging.renderPrepared(post.baseImage, null);
    if (post.type === "single") {
      if (!post.singleImage) return null;
      return Imaging.renderSingle(post.singleImage, null);
    }
    const tpl = currentTemplate();
    let overlay = null;
    if (tpl.overlay) {
      try { overlay = await Imaging.loadImageFromUrl(tpl.overlay); } catch (e) { overlay = null; }
    }
    return Imaging.renderCollage(tpl, post.collageImages, overlay, null);
  }

  // Re-render the preview a beat after the user stops editing the caption.
  let previewTimer = null;
  function schedulePreviewRefresh() {
    if ($("#captionText").closest(".screen").dataset.screen !== "caption") return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderCaptionPreview, 250);
  }

  /* ---------- CAPTION ---------- */
  function setCaption(result) {
    post.caption = result;
    post.item = result.item;
    post.captionText = result.filledText;
    $("#captionText").value = result.filledText;
  }

  function shuffleCaption() {
    const ctx = {
      location: post.location,
      day: post.day,
      menuItems: Store.getMenuItems(),
    };
    const excludeId = post.caption ? post.caption.hook.id : null;
    const result = Hooks.choose(post.tag, ctx, excludeId);
    if (result) {
      setCaption(result);
      renderCaptionPreview();
    }
  }

  /* ---------- REVIEW + SHARE ---------- */
  async function buildReview() {
    post.captionText = $("#captionText").value;
    await Imaging.ensureFonts();
    const canvas = await composePostImage();
    post.finalBlob = await Imaging.toBlob(canvas);
    post.status = "approved";

    $("#reviewImage").src = Imaging.toDataURL(canvas);
    $("#reviewCaption").textContent = post.captionText;
    $("#shareNote").hidden = true;
    $("#doneHome").hidden = true;
    show("review");
  }

  async function doShare() {
    if (!post.finalBlob) return;
    const result = await Sharing.share(post.finalBlob, post.captionText, "streetfood-post.png");
    if (result.cancelled) return; // user backed out of the share sheet

    // Record the post as shared and log the hook so it rests for the cooldown.
    post.status = "shared";
    if (post.caption) Store.recordHookUse(post.caption.hook.id);
    Store.savePost({
      id: post.id,
      type: post.type,
      templateId: post.templateId,
      caption: post.captionText,
      location: post.location,
      day: post.day,
      item: post.item,
      status: "shared",
      created: post.created,
    });

    const note = $("#shareNote");
    note.hidden = false;
    note.textContent =
      result.method === "fallback"
        ? (result.captionCopied
            ? "Caption copied & image downloaded — paste the caption into Instagram or Facebook."
            : "Image downloaded — copy your caption above into Instagram or Facebook.")
        : "Shared! Pick Instagram or Facebook to finish posting.";
    $("#doneHome").hidden = false;
  }

  /* ---------- SETTINGS / MENU ---------- */
  function renderMenu() {
    const items = Store.getMenuItems();
    const list = $("#menuList");
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<p class="menu-empty">No items yet.</p>';
      return;
    }
    items.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "menu-item";
      const span = document.createElement("span");
      span.textContent = item;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + item);
      del.addEventListener("click", () => {
        const next = Store.getMenuItems();
        next.splice(i, 1);
        Store.setMenuItems(next);
        renderMenu();
      });
      row.appendChild(span);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addMenuItem() {
    const input = $("#menuInput");
    const val = input.value.trim();
    if (!val) return;
    const items = Store.getMenuItems();
    items.push(val);
    Store.setMenuItems(items);
    input.value = "";
    renderMenu();
  }

  function renderLocations() {
    const items = Store.getLocations();
    const list = $("#locationList");
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<p class="menu-empty">No saved locations yet.</p>';
      return;
    }
    items.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "menu-item";
      const span = document.createElement("span");
      span.textContent = item;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + item);
      del.addEventListener("click", () => {
        const next = Store.getLocations();
        next.splice(i, 1);
        Store.setLocations(next);
        renderLocations();
      });
      row.appendChild(span);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addLocationItem() {
    const input = $("#locationInput");
    const val = input.value.trim();
    if (!val) return;
    Store.addLocation(val);
    input.value = "";
    renderLocations();
  }

  /* ---------- utils ---------- */
  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
