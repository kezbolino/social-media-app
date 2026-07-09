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
      carouselImages: [], // ordered images for a carousel post
      tag: null, // 'location' | 'brand' | 'other'
      location: "",
      day: "",
      item: null,
      caption: null, // { hook, filledText, item }
      captionText: "",
      hashtagBlock: "", // the appended hashtag block, if any
      fromHistory: false, // seeded from a past post / queue item (skip the quiz)
      status: "draft",
      finalBlob: null, // the (first) exported image
      finalBlobs: null, // all exported images (carousel); single => [finalBlob]
      created: new Date().toISOString(),
    };
  }

  /* ---------- tiny DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  let lastQuizBack = "type"; // where the quiz "Back" should go

  // The bottom nav only shows on these hub screens — hidden during the
  // guided post-creation flow so it doesn't fight with that flow's own
  // sticky actionbar.
  const HUB_SCREENS = new Set(["home", "type", "calendar", "generate", "queue", "history", "settings"]);

  // Direction of the next screen wipe: "back" slides in from the left, anything
  // else from the right. Set by handleBack / go-home just before they show().
  let navDir = "fwd";
  function show(screen) {
    const app = $("#app");
    app.classList.toggle("nav-back", navDir === "back");
    navDir = "fwd"; // consumed — default forward until a Back sets it again
    $$(".screen").forEach((s) =>
      s.classList.toggle("is-active", s.dataset.screen === screen)
    );
    app.classList.toggle("has-bottomnav", HUB_SCREENS.has(screen));
    $$(".navbtn[data-nav]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.nav === screen)
    );
    if (screen === "home") rollGreeting();
    window.scrollTo(0, 0);
  }

  // Drop a fresh random greeting onto the home screen.
  function rollGreeting() {
    const el = document.getElementById("homeGreeting");
    if (el && window.pickGreeting) {
      el.textContent = window.pickGreeting();
      if (window.FX) FX.pop(el);
    }
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
    rollGreeting();
    adaptPhotoPickers();
    Editor.init();
    renderPublishButtons();
    // Post reminders: check on open, then every few minutes while open.
    Notify.maybeRemind();
    setInterval(() => Notify.maybeRemind(), 5 * 60 * 1000);
  }

  // Phones can't pick a whole folder (webkitdirectory is desktop-only), so on
  // touch devices the "folder" inputs become multi-photo pickers instead —
  // same pool, same shuffle, just selected from the gallery.
  function adaptPhotoPickers() {
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) return;
    ["#folderInput", "#genFolderInput"].forEach((sel) => {
      const el = $(sel);
      if (el) el.removeAttribute("webkitdirectory");
    });
    $$('[data-action="pick-folder-single"], [data-action="pick-folder-collage"], [data-action="gen-folder"]')
      .forEach((btn) => (btn.textContent = "🖼️ Pick photos"));
  }

  /* ---------- event wiring (delegated) ---------- */
  function wireEvents() {
    document.addEventListener("click", (e) => {
      const back = e.target.closest("[data-back]");
      if (back) return handleBack(back.dataset.back);

      const calLoc = e.target.closest("[data-cal-loc]");
      if (calLoc) return pickCalLocation(calLoc.dataset.calLoc);

      const qMake = e.target.closest("[data-q-make]");
      if (qMake) return makeFromQueue(Store.getQueue().find((x) => x.id === qMake.dataset.qMake));

      const qDel = e.target.closest("[data-q-del]");
      if (qDel) { Store.removeQueueItem(qDel.dataset.qDel); return renderQueue(); }

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
    $("#carouselInput").addEventListener("change", onCarouselPicked);
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
    $("#hashtagInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addHashtagItem();
    });
    $("#genFolderInput").addEventListener("change", onGenFolderPicked);
    saveMetaField("#metaToken", "accessToken");
    saveMetaField("#metaPageId", "pageId");
    saveMetaField("#metaIgId", "igUserId");
    saveMetaField("#metaCloud", "cloudName");
    saveMetaField("#metaPreset", "uploadPreset");
    $("#notifyEnabled").addEventListener("change", onNotifyToggle);
    $("#notifyTime").addEventListener("change", (e) => {
      const n = Store.getNotify();
      n.time = e.target.value || "09:00";
      Store.setNotify(n);
      renderNotifySettings();
    });
  }

  function handleBack(target) {
    navDir = "back";
    if (target === "") return show(lastQuizBack); // quiz back is dynamic
    show(target);
  }

  function handleAction(action, el) {
    switch (action) {
      case "new-post": post = freshPost(); show("type"); break;
      case "open-settings": openSettings(); break;
      case "open-calendar": openCalendar(); break;
      case "open-generate": openGenerate(null); break;
      case "open-queue": openQueue(); break;
      case "open-history": openHistory(); break;
      case "queue-add": queueAdd(); break;
      case "cal-prev": shiftMonth(-1); break;
      case "cal-next": shiftMonth(1); break;
      case "cal-clear": clearCalDay(); break;
      case "cal-generate": openGenerate(selectedDate); break;
      case "gen-folder": $("#genFolderInput").click(); break;
      case "gen-regenerate": runGenerate(); break;
      case "notify-test": notifyTest(); break;
      case "hashtags": toggleHashtags(); break;
      case "add-hashtag": addHashtagItem(); break;
      case "add-userhook": addUserHookItem(); break;
      case "publish-ig": doPublish("ig"); break;
      case "publish-fb": doPublish("fb"); break;
      case "meta-test": metaTest(); break;
      case "choose-single": startSingle(); break;
      case "choose-collage": startCollage(); break;
      case "choose-carousel": startCarousel(); break;
      case "pick-carousel": $("#carouselInput").click(); break;
      case "carousel-next": carouselNext(); break;
      case "copy-caption": copyCaption(); break;
      case "save-image": saveImage(); break;
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
      case "go-home": navDir = "back"; post = freshPost(); show("home"); break;
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

  // A cheeky-hook cycler for the editor's Text tool — behaves like the caption
  // Shuffle: each call returns a different pre-written line, filled with any
  // location/day we already know.
  function makeHookProvider() {
    let lastId = null;
    return () => {
      const ctx = { location: post.location, day: post.day, menuItems: Store.getMenuItems() };
      for (const tag of shuffleArr(["location", "other", "brand"])) {
        const r = Hooks.choose(tag, ctx, lastId);
        if (r) { lastId = r.hook.id; return r.filledText; }
      }
      return "Come and get fed.";
    };
  }

  // Single photos: full editor (crop / filter / adjust / text).
  function openEditor() {
    setEditorChrome("single", "Edit photo");
    lastQuizBack = "editor"; // the quiz's Back returns to the editor
    show("editor"); // show first so the editor can measure its real width
    Editor.open(post.singleImage, post.editState, { hookProvider: makeHookProvider() });
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
    lastQuizBack = "editor";
    show("editor"); // show first so the editor can measure its real width
    Editor.open(bg, post.editState, { mode: "text", hookProvider: makeHookProvider() });
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
    // Seeded from a past post / queue item: the line is already chosen, so skip
    // the quiz and drop straight onto the caption screen (still shuffleable).
    if (post.fromHistory && post.captionText) return goToSeededCaption("editor");
    show("quiz");
  }

  // Land on the caption screen with a pre-seeded line (Run it back / queue).
  function goToSeededCaption(backTarget) {
    post.hashtagBlock = "";
    applyHashtags();
    $("#captionText").value = post.captionText;
    updateHashtagBtnLabel();
    const back = document.querySelector('[data-screen="caption"] .back');
    if (back) back.dataset.back = backTarget;
    renderCaptionPreview();
    show("caption");
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

  /* ---------- CAROUSEL ---------- */
  const CAROUSEL_MAX = 10;

  function startCarousel() {
    post = freshPost();
    post.type = "carousel";
    post.carouselImages = [];
    renderCarouselStrip();
    show("carousel");
  }

  async function onCarouselPicked(e) {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (!files.length) return;
    const room = CAROUSEL_MAX - post.carouselImages.length;
    for (const file of files.slice(0, room)) {
      try { post.carouselImages.push(await Imaging.loadImageFromFile(file)); }
      catch (err) { /* skip a bad file */ }
    }
    renderCarouselStrip();
  }

  function renderCarouselStrip() {
    const strip = $("#carouselStrip");
    strip.innerHTML = "";
    post.carouselImages.forEach((img, i) => {
      const thumb = document.createElement("button");
      thumb.className = "carousel-thumb";
      thumb.setAttribute("aria-label", `Photo ${i + 1} — tap to remove`);
      thumb.innerHTML =
        `<img src="${img.src}" alt="Photo ${i + 1}" />` +
        `<span class="thumb-num">${i + 1}</span>` +
        `<span class="thumb-x">✕</span>`;
      thumb.addEventListener("click", () => {
        post.carouselImages.splice(i, 1);
        renderCarouselStrip();
      });
      strip.appendChild(thumb);
    });
    const n = post.carouselImages.length;
    const note = $("#carouselNote");
    note.hidden = n === 0;
    note.textContent = n
      ? `${n} photo${n > 1 ? "s" : ""} added${n >= CAROUSEL_MAX ? " (max)" : ""} — tap one to remove it.`
      : "";
    $("#carouselNext").disabled = n < 2;
  }

  function carouselNext() {
    if (post.carouselImages.length < 2) return;
    lastQuizBack = "carousel"; // the quiz's Back returns here (no editor step)
    show("quiz");
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
    if (post.type === "carousel") {
      // Cover (first) image drives the preview; the rest export in buildReview.
      const cover = post.carouselImages[0];
      return cover ? Imaging.renderSingle(cover, null) : null;
    }
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
    post.hashtagBlock = ""; // a new line drops any appended hashtags
    applyHashtags(); // hashtags are added automatically on every fresh line
    $("#captionText").value = post.captionText;
    updateHashtagBtnLabel();
    // Bounce the fresh line + preview so a Shuffle feels alive.
    if (window.FX) { FX.pop($("#captionText")); FX.pop($("#captionPreview")); }
  }

  /* ---------- HASHTAGS ---------- */
  // A relevant, shuffled hashtag block is appended automatically whenever a
  // caption is picked; this button just lets the trader take it back off (or
  // put it back on) for that post.
  function applyHashtags() {
    const block = buildHashtagBlock();
    post.hashtagBlock = "\n\n" + block;
    post.captionText = post.captionText + post.hashtagBlock;
  }

  function removeHashtags() {
    if (!post.hashtagBlock) return;
    post.captionText = post.captionText
      .slice(0, post.captionText.length - post.hashtagBlock.length)
      .replace(/\s+$/, "");
    post.hashtagBlock = "";
  }

  function toggleHashtags() {
    if (post.hashtagBlock) removeHashtags();
    else applyHashtags();
    $("#captionText").value = post.captionText;
    updateHashtagBtnLabel();
  }

  function updateHashtagBtnLabel() {
    const btn = $('[data-action="hashtags"]');
    if (btn) btn.textContent = post.hashtagBlock ? "🗑 Remove hashtags" : "#️⃣ Add hashtags";
  }

  function buildHashtagBlock() {
    const chosen = shuffleArr(Store.getHashtags()).slice(0, 12);
    // Auto-tag the pitch location, if we know it.
    if (post.location) {
      const locTag = "#" + post.location.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (locTag.length > 1 && !chosen.some((t) => t.toLowerCase() === locTag)) chosen.unshift(locTag);
    }
    const brand = "#chucklingwings";
    if (!chosen.some((t) => t.toLowerCase() === brand)) chosen.unshift(brand);
    return chosen.join(" ");
  }

  function renderHashtags() {
    const items = Store.getHashtags();
    const list = $("#hashtagList");
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<p class="menu-empty">No hashtags yet.</p>';
      return;
    }
    items.forEach((tag, i) => {
      const chip = document.createElement("button");
      chip.className = "tag-chip";
      chip.innerHTML = `${escapeAttr(tag)} <span class="tag-x">✕</span>`;
      chip.setAttribute("aria-label", "Remove " + tag);
      chip.addEventListener("click", () => {
        const next = Store.getHashtags();
        next.splice(i, 1);
        Store.setHashtags(next);
        renderHashtags();
      });
      list.appendChild(chip);
    });
  }

  function addHashtagItem() {
    const input = $("#hashtagInput");
    const val = input.value.trim();
    if (!val) return;
    Store.addHashtag(val);
    input.value = "";
    renderHashtags();
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

    const badge = $("#reviewBadge");
    if (post.type === "carousel") {
      // Export every frame; the cover drives the preview.
      post.finalBlobs = [];
      let coverCanvas = null;
      for (const img of post.carouselImages) {
        const c = Imaging.renderSingle(img, null);
        if (!coverCanvas) coverCanvas = c;
        post.finalBlobs.push(await Imaging.toBlob(c));
      }
      post.finalBlob = post.finalBlobs[0];
      $("#reviewImage").src = Imaging.toDataURL(coverCanvas);
      badge.hidden = false;
      badge.textContent = `1 / ${post.finalBlobs.length}`;
    } else {
      const canvas = await composePostImage();
      post.finalBlob = await Imaging.toBlob(canvas);
      post.finalBlobs = [post.finalBlob];
      $("#reviewImage").src = Imaging.toDataURL(canvas);
      badge.hidden = true;
    }
    post.status = "approved";

    $("#reviewCaption").textContent = post.captionText;
    $("#shareNote").hidden = true;
    $("#publishNote").hidden = true;
    $("#doneHome").hidden = true;
    renderPublishButtons();
    show("review");
  }

  // Record the post as shared and log the hook so it rests for the cooldown.
  // Used by both the share sheet and the direct Meta publish buttons.
  function markPostShared(via) {
    post.status = "shared";
    if (window.FX) FX.confetti(); // 🎉 the win
    if (post.caption) Store.recordHookUse(post.caption.hook.id);
    Store.savePost({
      id: post.id,
      type: post.type,
      templateId: post.templateId,
      caption: post.captionText,
      location: post.location,
      day: post.day,
      item: post.item,
      tag: post.tag, // remembered so "Run it back" can pick a fresh caption
      hookId: post.caption ? post.caption.hook.id : null,
      status: "shared",
      via: via || "share-sheet",
      created: post.created,
    });
  }

  async function doShare() {
    if (!post.finalBlob) return;
    const blobs = post.finalBlobs && post.finalBlobs.length ? post.finalBlobs : [post.finalBlob];
    const result = await Sharing.share(blobs, post.captionText, "chuckling-wings-post.png");
    if (result.cancelled) return; // user backed out of the share sheet

    markPostShared("share-sheet");

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

  /* ---------- DIRECT PUBLISH (Meta) ---------- */
  // Show/hide the direct-post buttons based on what's configured.
  function renderPublishButtons() {
    // Direct Meta publishing posts a single image; carousels go via the share
    // sheet only (Instagram builds the carousel from the multiple files).
    const carousel = post.type === "carousel";
    const fb = !carousel && Publish.isConfiguredFB();
    const ig = !carousel && Publish.isConfiguredIG();
    $("#pubIG").hidden = !ig;
    $("#pubFB").hidden = !fb;
    $("#publishRow").hidden = !(fb || ig);
  }

  async function doPublish(kind) {
    if (!post.finalBlob) return;
    const note = $("#publishNote");
    const btns = [$("#pubIG"), $("#pubFB"), $(".btn[data-action='share']")];
    btns.forEach((b) => b && (b.disabled = true));
    note.hidden = false;
    note.textContent = kind === "ig" ? "Posting to Instagram…" : "Posting to Facebook…";
    try {
      if (kind === "ig") await Publish.postToInstagram(post.finalBlob, post.captionText);
      else await Publish.postToFacebook(post.finalBlob, post.captionText);
      markPostShared(kind === "ig" ? "instagram-api" : "facebook-api");
      note.textContent = kind === "ig" ? "Posted to Instagram ✅" : "Posted to Facebook ✅";
      $("#doneHome").hidden = false;
    } catch (e) {
      note.textContent = "Couldn't post: " + e.message;
    }
    btns.forEach((b) => b && (b.disabled = false));
  }

  function renderMetaSettings() {
    const m = Store.getMeta();
    $("#metaToken").value = m.accessToken;
    $("#metaPageId").value = m.pageId;
    $("#metaIgId").value = m.igUserId;
    $("#metaCloud").value = m.cloudName;
    $("#metaPreset").value = m.uploadPreset;
    const s = $("#metaStatus");
    if (Publish.isConfiguredFB() && Publish.isConfiguredIG()) s.textContent = "Instagram + Facebook posting is set up.";
    else if (Publish.isConfiguredFB()) s.textContent = "Facebook posting is set up. Add the Instagram + Cloudinary bits for Instagram.";
    else if (Publish.isConfiguredIG()) s.textContent = "Instagram posting is set up. Add the Page ID for Facebook.";
    else s.textContent = "Not set up yet — the app works exactly as before without it.";
  }

  function saveMetaField(id, key) {
    $(id).addEventListener("change", (e) => {
      const m = Store.getMeta();
      m[key] = e.target.value.trim();
      Store.setMeta(m);
      renderMetaSettings();
      renderPublishButtons();
    });
  }

  async function metaTest() {
    const s = $("#metaStatus");
    s.textContent = "Testing…";
    try {
      const who = await Publish.testConnection();
      s.textContent = `Connected ✅ — token belongs to "${who.name}".`;
    } catch (e) {
      s.textContent = "Test failed: " + e.message;
    }
  }

  /* ---------- SETTINGS / MENU ---------- */
  function openSettings() {
    renderLocations();
    renderMenu();
    renderHashtags();
    renderUserHooks();
    renderNotifySettings();
    renderMetaSettings();
    show("settings");
  }

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

  /* ---------- MY CAPTIONS (user's own hooks) ---------- */
  const USER_TAG_LABELS = {
    brand: "Brand", location: "Where we are", other: "Something else", events: "Events",
  };

  function renderUserHooks() {
    // Keep the "only at" dropdown in step with the saved locations.
    const locSel = $("#userHookLoc");
    if (locSel) {
      const keep = locSel.value;
      locSel.innerHTML =
        '<option value="">Any location</option>' +
        Store.getLocations()
          .map((l) => `<option value="${escapeAttr(l)}">Only at ${escapeAttr(l)}</option>`)
          .join("");
      locSel.value = keep;
    }
    const list = $("#userHookList");
    if (!list) return;
    const hooks = Store.getUserHooks();
    list.innerHTML = "";
    if (!hooks.length) {
      list.innerHTML = '<p class="menu-empty">No captions of your own yet.</p>';
      return;
    }
    hooks.forEach((h) => {
      const row = document.createElement("div");
      row.className = "menu-item";
      const span = document.createElement("span");
      const where = h.location ? ` · ${h.location}` : "";
      span.textContent = `${h.text}  (${USER_TAG_LABELS[h.tags[0]] || h.tags[0]}${where})`;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove caption");
      del.addEventListener("click", () => {
        Store.removeUserHook(h.id);
        Hooks.reloadUserHooks();
        renderUserHooks();
      });
      row.appendChild(span);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addUserHookItem() {
    const textEl = $("#userHookText");
    const err = $("#userHookError");
    const text = textEl.value.trim();
    if (!text) { err.textContent = "Type a caption first."; return; }
    const tag = $("#userHookTag").value || "brand";
    const loc = $("#userHookLoc").value || "";
    // Work out which blanks the line needs from the placeholders it contains.
    const uses = [];
    if (/\{location\}/.test(text)) uses.push("location");
    if (/\{day\}/.test(text)) uses.push("day");
    if (/\{item\}/.test(text)) uses.push("item");
    const hook = { id: "user_" + Date.now(), tags: [tag], text, uses };
    if (loc) hook.location = loc;
    Store.addUserHook(hook);
    Hooks.reloadUserHooks();
    textEl.value = "";
    err.textContent = "Added — it's in the shuffle now.";
    renderUserHooks();
  }

  /* ---------- WORK CALENDAR ---------- */
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let calView = new Date(); // any date within the shown month
  let selectedDate = null; // "YYYY-MM-DD"

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function openCalendar() {
    calView = new Date();
    selectedDate = null;
    $("#calDay").hidden = true;
    renderCalendar();
    show("calendar");
  }
  function shiftMonth(delta) {
    calView = new Date(calView.getFullYear(), calView.getMonth() + delta, 1);
    renderCalendar();
  }

  function renderCalendar() {
    const year = calView.getFullYear(), month = calView.getMonth();
    $("#calTitle").textContent = `${MONTHS[month]} ${year}`;
    const first = new Date(year, month, 1);
    // Monday-first offset (getDay: 0=Sun..6=Sat).
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const schedule = Store.getSchedule();
    const postedDates = postedDateSet();
    const todayKey = Notify.todayStr();
    const grid = $("#calGrid");
    grid.innerHTML = "";
    for (let i = 0; i < lead; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-cell blank";
      grid.appendChild(blank);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cell = document.createElement("button");
      cell.className = "cal-cell";
      const posted = postedDates.has(key);
      if (schedule[key]) cell.classList.add("working");
      if (posted) cell.classList.add("posted");
      if (key === todayKey) cell.classList.add("today");
      if (key === selectedDate) cell.classList.add("selected");
      cell.dataset.date = key;
      const marker = posted
        ? `<span class="cal-tick" title="Posted">✓</span>`
        : (schedule[key] ? `<span class="cal-dot"></span>` : "");
      cell.innerHTML = `<span class="cal-num">${d}</span>` + marker;
      cell.addEventListener("click", () => selectCalDay(key));
      grid.appendChild(cell);
    }
  }

  // Local-date keys (YYYY-MM-DD) that have at least one shared post.
  function postedDateSet() {
    const set = new Set();
    for (const p of Store.getPosts()) {
      if (p.status !== "shared" || !p.created) continue;
      const d = new Date(p.created);
      if (!isNaN(d)) set.add(dateKey(d));
    }
    return set;
  }

  function selectCalDay(key) {
    selectedDate = key;
    renderCalendar();
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    $("#calDayTitle").textContent = `${WEEKDAYS[dt.getDay()]} ${d} ${MONTHS[m - 1]}`;
    const wd = Store.getWorkday(key);
    const locs = Store.getLocations();
    const wrap = $("#calDayLocs");
    if (locs.length) {
      wrap.innerHTML = locs.map((l) =>
        `<button class="chip${wd && wd.location === l ? " selected" : ""}" data-cal-loc="${escapeAttr(l)}">${escapeAttr(l)}</button>`
      ).join("");
    } else {
      wrap.innerHTML = `<button class="chip${wd ? " selected" : ""}" data-cal-loc="">Working</button>`;
    }
    $("#calDay").hidden = false;
  }

  function pickCalLocation(loc) {
    if (!selectedDate) return;
    Store.setWorkday(selectedDate, loc);
    selectCalDay(selectedDate);
  }
  function clearCalDay() {
    if (!selectedDate) return;
    Store.setWorkday(selectedDate, null);
    selectCalDay(selectedDate);
  }

  /* ---------- GENERATE POSTS ---------- */
  let genList = []; // [{ img, dataUrl, filledText, hook }]
  let genLocation = "";
  let genDay = "";
  let genDateLabel = "";

  function openGenerate(dateStr) {
    const key = dateStr || Notify.todayStr();
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    genDay = WEEKDAYS[dt.getDay()];
    const wd = Store.getWorkday(key);
    genLocation = (wd && wd.location) || Store.getLocations()[0] || "";
    genDateLabel = `${genDay}${genLocation ? " at " + genLocation : ""}`;
    show("generate");
    runGenerate();
  }

  async function runGenerate() {
    $("#genInfo").textContent = `3 ready-made posts for ${genDateLabel}.`;
    const empty = $("#genEmpty");
    if (!photoPool.length) {
      $("#genCards").innerHTML = "";
      empty.hidden = false;
      empty.textContent = "Load a photo folder to generate posts from your pictures.";
      return;
    }
    empty.hidden = true;
    $("#genCards").innerHTML = '<p class="hint">Cooking up posts…</p>';
    genList = await buildGeneratedPosts();
    renderGenCards();
  }

  async function buildGeneratedPosts() {
    await Imaging.ensureFonts();
    const ctx = { location: genLocation, day: genDay, menuItems: Store.getMenuItems() };
    const files = randomFiles(Math.min(3, photoPool.length));
    const tags = ["location", "other", "brand"];
    const usedHookIds = [];
    const out = [];
    for (let i = 0; i < files.length; i++) {
      let img;
      try { img = await Imaging.loadImageFromFile(files[i]); }
      catch (e) { continue; }
      // Try a few tags to get a varied, filled, non-repeating hook.
      let picked = null;
      for (const tag of shuffleArr(tags)) {
        const r = Hooks.choose(tag, ctx, usedHookIds[usedHookIds.length - 1]);
        if (r && !usedHookIds.includes(r.hook.id)) { picked = r; break; }
      }
      if (!picked) picked = Hooks.choose("brand", ctx) || Hooks.choose("location", ctx);
      if (!picked) continue;
      usedHookIds.push(picked.hook.id);
      const canvas = Imaging.renderSingle(img, null);
      out.push({ img, dataUrl: Imaging.toDataURL(canvas), filledText: picked.filledText, hook: picked.hook });
    }
    return out;
  }

  function renderGenCards() {
    const wrap = $("#genCards");
    if (!genList.length) {
      wrap.innerHTML = '<p class="hint">Couldn\'t generate any — check your photo folder and hooks.</p>';
      return;
    }
    wrap.innerHTML = "";
    genList.forEach((g, i) => {
      const card = document.createElement("button");
      card.className = "gen-card";
      card.innerHTML =
        `<img src="${g.dataUrl}" alt="Generated post ${i + 1}" />` +
        `<span class="gen-caption">${escapeAttr(g.filledText)}</span>`;
      card.addEventListener("click", () => useGeneratedPost(i));
      wrap.appendChild(card);
    });
  }

  function useGeneratedPost(i) {
    const g = genList[i];
    if (!g) return;
    post = freshPost();
    post.type = "single";
    post.singleImage = g.img;
    post.tag = "location";
    post.location = genLocation;
    post.day = genDay;
    post.caption = { hook: g.hook, filledText: g.filledText, item: null };
    post.captionText = g.filledText;
    post.hashtagBlock = "";
    applyHashtags();
    $("#captionText").value = post.captionText;
    updateHashtagBtnLabel();
    const back = document.querySelector('[data-screen="caption"] .back');
    if (back) back.dataset.back = "generate";
    renderCaptionPreview();
    show("caption");
  }

  function shuffleArr(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function onGenFolderPicked(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) { alert("That folder didn't have any photos in it."); return; }
    photoPool = files;
    refreshPoolUi();
    runGenerate();
  }

  /* ---------- RUN IT BACK (post history) ---------- */
  function inferTag(saved) {
    if (saved.tag) return saved.tag;
    return saved.location ? "location" : "brand";
  }

  function openHistory() {
    renderHistory();
    show("history");
  }

  function renderHistory() {
    // Most-recent first; only shared posts that carried a caption are reusable.
    const posts = Store.getPosts()
      .filter((p) => p.status === "shared" && p.caption)
      .slice()
      .reverse()
      .slice(0, 40);
    const list = $("#historyList");
    const empty = $("#historyEmpty");
    list.innerHTML = "";
    if (!posts.length) { empty.hidden = false; return; }
    empty.hidden = true;
    posts.forEach((p) => {
      const card = document.createElement("button");
      card.className = "gen-card";
      const when = p.created ? new Date(p.created) : null;
      const meta = [p.location, when && !isNaN(when) ? when.toLocaleDateString() : null]
        .filter(Boolean).join(" · ");
      card.innerHTML =
        `<span class="gen-caption">` +
        `<strong style="display:block;color:var(--muted);font-weight:600;font-size:.78rem;margin-bottom:3px;">${escapeAttr(meta || "Past post")}</strong>` +
        `${escapeAttr(p.caption)}</span>`;
      card.addEventListener("click", () => runItBack(p));
      list.appendChild(card);
    });
  }

  // Start a fresh single post pre-seeded from a past post: same tag/location/day
  // and its caption, dropping the user on the photo step for today's picture.
  function runItBack(saved) {
    post = freshPost();
    post.fromHistory = true;
    post.tag = inferTag(saved);
    post.location = saved.location || "";
    post.day = saved.day || "";
    post.captionText = saved.caption || "";
    post.caption = null; // no hook object — Shuffle will pick a fresh line by tag
    startSingle(); // resets the single-photo UI, keeps the seeded context
  }

  /* ---------- POST QUEUE ---------- */
  function weekdayName(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  }
  function fmtQueueDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return `${WEEKDAYS[dt.getDay()].slice(0, 3)} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
  }

  function openQueue() {
    const dateEl = $("#queueDate");
    if (!dateEl.value) dateEl.value = Notify.todayStr();
    const locSel = $("#queueLoc");
    locSel.innerHTML =
      '<option value="">Any location</option>' +
      Store.getLocations().map((l) => `<option value="${escapeAttr(l)}">${escapeAttr(l)}</option>`).join("");
    $("#queueError").textContent = "";
    renderQueue();
    show("queue");
  }

  function renderQueue() {
    const today = Notify.todayStr();
    const items = Store.getQueue().slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const list = $("#queueList");
    const empty = $("#queueEmpty");
    list.innerHTML = "";
    if (!items.length) {
      empty.hidden = false;
      empty.textContent = "Nothing queued yet — add one below.";
      return;
    }
    empty.hidden = true;
    items.forEach((it) => {
      const row = document.createElement("div");
      const due = it.date && it.date <= today;
      row.className = "queue-item" + (due ? " is-due" : "");
      const loc = it.location ? ` · <span class="queue-loc">${escapeAttr(it.location)}</span>` : "";
      const cap = it.caption ? `<div class="queue-cap">${escapeAttr(it.caption)}</div>` : "";
      row.innerHTML =
        `<div class="queue-body"><div class="queue-when">${fmtQueueDate(it.date)}${due ? " · today" : ""}${loc}</div>${cap}</div>` +
        `<div class="queue-actions">` +
        `<button class="btn btn-primary btn-sm" data-q-make="${it.id}">Make</button>` +
        `<button class="queue-x" data-q-del="${it.id}" aria-label="Remove">✕</button></div>`;
      list.appendChild(row);
    });
  }

  function queueAdd() {
    const date = $("#queueDate").value;
    const err = $("#queueError");
    if (!date) { err.textContent = "Pick a day first."; return; }
    Store.addQueueItem({
      id: "q_" + Date.now(),
      date,
      location: $("#queueLoc").value || "",
      caption: $("#queueNote").value.trim(),
      created: new Date().toISOString(),
      done: false,
    });
    $("#queueNote").value = "";
    err.textContent = "Added to the queue. 🗓";
    renderQueue();
  }

  // Turn a queued item into a live post: seed location/day (+ its note as the
  // caption, if any) and jump to the photo step.
  function makeFromQueue(item) {
    if (!item) return;
    post = freshPost();
    post.fromHistory = true;
    post.location = item.location || "";
    post.tag = item.location ? "location" : "brand";
    post.day = weekdayName(item.date);
    post.captionText = item.caption || "";
    post.caption = null;
    startSingle();
  }

  /* ---------- QUICK ACTIONS (review) ---------- */
  async function copyCaption() {
    const note = $("#shareNote");
    let ok = false;
    try { await navigator.clipboard.writeText(post.captionText); ok = true; }
    catch (e) {
      // Fallback: select a temporary textarea and execCommand copy.
      try {
        const ta = document.createElement("textarea");
        ta.value = post.captionText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch (e2) { ok = false; }
    }
    note.hidden = false;
    note.textContent = ok ? "Caption copied — paste it into Instagram or Facebook. 📋" : "Couldn't copy — select the caption above and copy it by hand.";
  }

  function saveImage() {
    const blobs = post.finalBlobs && post.finalBlobs.length ? post.finalBlobs : (post.finalBlob ? [post.finalBlob] : []);
    if (!blobs.length) return;
    blobs.forEach((b, i) => {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = blobs.length > 1 ? `chuckling-wings-post-${i + 1}.png` : "chuckling-wings-post.png";
      document.body.appendChild(a);
      setTimeout(() => { a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, i * 150);
    });
    const note = $("#shareNote");
    note.hidden = false;
    note.textContent = blobs.length > 1 ? `Saved ${blobs.length} images to your downloads. ⬇️` : "Image saved to your downloads. ⬇️";
  }

  /* ---------- NOTIFY SETTINGS ---------- */
  function renderNotifySettings() {
    const n = Store.getNotify();
    $("#notifyEnabled").checked = n.enabled;
    $("#notifyTime").value = n.time || "09:00";
    const status = $("#notifyStatus");
    if (!Notify.supported()) {
      status.textContent = "This browser doesn't support notifications. On the phone app they'll work fully.";
    } else if (n.enabled && Notify.permission() === "granted") {
      status.textContent = `On — you'll get a nudge at ${n.time} on your working days (while the app's open).`;
    } else if (Notify.permission() === "denied") {
      status.textContent = "Notifications are blocked in your browser settings — allow them to use reminders.";
    } else {
      status.textContent = "Off.";
    }
  }

  async function onNotifyToggle(e) {
    const n = Store.getNotify();
    if (e.target.checked) {
      const perm = await Notify.request();
      if (perm === "granted") { n.enabled = true; }
      else { n.enabled = false; e.target.checked = false; }
    } else {
      n.enabled = false;
    }
    Store.setNotify(n);
    renderNotifySettings();
  }

  async function notifyTest() {
    if (Notify.permission() !== "granted") await Notify.request();
    if (!Notify.show("Test 🐔", "Nice — reminders are working.")) {
      $("#notifyStatus").textContent = "Couldn't show a notification — check your browser's permission.";
    }
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
