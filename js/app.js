/*
 * app.js — the controller. Moves between screens and holds the post the user
 * is building. Each post is a draft until it's shared (draft -> approved ->
 * shared); that status field is the seam where auto-posting could bolt on later
 * without changing the rest of the app.
 */
(() => {
  let templatesDoc = null; // { canvas, templates: [...] }

  // The post currently being built.
  let post = freshPost();

  function freshPost() {
    return {
      id: "p_" + Date.now(),
      type: null, // 'single' | 'collage'
      templateId: null,
      templateIndex: 0,
      singleImage: null, // HTMLImageElement
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
      const res = await fetch(window.APP_CONFIG.TEMPLATES_URL);
      templatesDoc = await res.json();
      // Give templates their shared canvas size.
      templatesDoc.templates.forEach((t) => (t.canvas = templatesDoc.canvas));
    } catch (e) {
      alert("Couldn't load the app data.\n\n" + e.message +
        "\n\nTip: open the app through a local server (npm start), not by double-clicking the file.");
      return;
    }
    wireEvents();
  }

  /* ---------- event wiring (delegated) ---------- */
  function wireEvents() {
    document.addEventListener("click", (e) => {
      const back = e.target.closest("[data-back]");
      if (back) return handleBack(back.dataset.back);

      const tag = e.target.closest("[data-tag]");
      if (tag) return chooseTag(tag.dataset.tag);

      const a = e.target.closest("[data-action]");
      if (a) return handleAction(a.dataset.action, a);
    });

    $("#singleInput").addEventListener("change", onSinglePhoto);
    $("#collageInput").addEventListener("change", onCollagePhoto);
    $("#captionText").addEventListener("input", (e) => (post.captionText = e.target.value));
    $("#menuInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addMenuItem();
    });
  }

  function handleBack(target) {
    if (target === "") return show(lastQuizBack); // quiz back is dynamic
    show(target);
  }

  function handleAction(action, el) {
    switch (action) {
      case "new-post": post = freshPost(); show("type"); break;
      case "open-settings": renderMenu(); show("settings"); break;
      case "choose-single": startSingle(); break;
      case "choose-collage": startCollage(); break;
      case "pick-single": $("#singleInput").click(); break;
      case "single-next": lastQuizBack = "single"; show("quiz"); break;
      case "cycle-template": cycleTemplate(); break;
      case "collage-next": lastQuizBack = "collage"; show("quiz"); break;
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
    show("single");
  }

  async function onSinglePhoto(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      post.singleImage = await Imaging.loadImageFromFile(file);
      const img = $("#singlePreview");
      img.src = post.singleImage.src;
      img.hidden = false;
      $("#singleEmpty").hidden = true;
      $("#singleNext").disabled = false;
    } catch (err) {
      alert(err.message);
    }
  }

  /* ---------- COLLAGE ---------- */
  function currentTemplate() {
    return templatesDoc.templates[post.templateIndex];
  }

  function startCollage() {
    post.type = "collage";
    post.templateIndex = 0;
    applyTemplate();
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
    const burn = burnText();
    const canvas = Imaging.renderCollage(tpl, post.collageImages, null, burn);
    const dest = $("#collagePreview");
    dest.width = canvas.width;
    dest.height = canvas.height;
    dest.getContext("2d").drawImage(canvas, 0, 0);
  }

  /* ---------- QUIZ + DETAILS ---------- */
  function chooseTag(tag) {
    post.tag = tag;
    renderDetailFields();
    show("details");
  }

  function renderDetailFields() {
    const vars = Hooks.inputVarsForTag(post.tag);
    const wrap = $("#detailFields");
    wrap.innerHTML = "";
    const labels = {
      location: { label: "Location", hint: "Where you're pitched, e.g. Brick Lane", ph: "Brick Lane" },
      day: { label: "Day (optional)", hint: "The day you're there til, e.g. Sunday", ph: "Sunday" },
    };
    vars.forEach((v) => {
      const meta = labels[v];
      const field = document.createElement("div");
      field.className = "field";
      field.innerHTML =
        `<label>${meta.label} <small>${meta.hint}</small></label>` +
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

  function detailsNext() {
    const vars = Hooks.inputVarsForTag(post.tag);
    vars.forEach((v) => {
      const el = $("#field_" + v);
      post[v] = el ? el.value.trim() : "";
    });

    const ctx = {
      location: post.location,
      day: post.day,
      menuItems: Store.getMenuItems(),
    };
    const result = Hooks.choose(post.tag, ctx);
    if (!result) {
      const err = $("#detailsError");
      err.hidden = false;
      err.textContent = vars.includes("location") && !post.location
        ? "Add a location to get a caption for this kind of post."
        : "No caption fits those details — try a different answer or add a location.";
      return;
    }
    setCaption(result);
    show("caption");
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
    if (result) setCaption(result);
  }

  /* ---------- REVIEW + SHARE ---------- */
  function burnText() {
    if (post.location && post.day) return `${post.location} · til ${post.day}`;
    return post.location || post.day || "";
  }

  async function buildReview() {
    post.captionText = $("#captionText").value;
    let canvas;
    if (post.type === "single") {
      canvas = Imaging.renderSingle(post.singleImage);
    } else {
      const tpl = currentTemplate();
      let overlay = null;
      if (tpl.overlay) {
        try { overlay = await Imaging.loadImageFromUrl(tpl.overlay); } catch (e) { overlay = null; }
      }
      canvas = Imaging.renderCollage(tpl, post.collageImages, overlay, burnText());
    }
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

  /* ---------- utils ---------- */
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
