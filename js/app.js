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
  let stashUrls = []; // object URLs for stash thumbnails, revoked on re-render
  let obUrls = []; // same, for the onboarding photo grid
  let obRestoring = false; // true while #backupInput was opened from onboarding

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
      tag: null, // 'location' | 'brand' | 'other' | 'events' | 'weather'
      location: "",
      day: "",
      weather: null, // current condition bucket for a weather post
      weatherLabel: "", // human-readable weather status for the note
      item: null,
      caption: null, // { hook, filledText, item }
      captionText: "",
      hashtagBlock: "", // the appended hashtag block, if any
      fromHistory: false, // seeded from a past post / queue item (skip the quiz)
      fromGenerate: false, // customising a Generate keeper (sticker already placed in editor)
      keeperRef: null, // the Generate keeper this post came from (to return to the tray)
      status: "draft",
      finalBlob: null, // the (first) exported image
      finalBlobs: null, // all exported images (carousel); single => [finalBlob]
      finalDataUrl: null, // the composed preview as a data URL (for keeper thumbs)
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

  // New Post flow progress bar: the screens collapse into 4 milestones the bar
  // fills through — Type (25%) → Photo/Edit (50%) → Caption (75%) → Review
  // (100%). Every flow screen carries a .flow-bar (injected at boot by
  // initFlowBars, except the type screen which already has one under its
  // mascot); updateFlowProgress() drives them from show().
  const FLOW_STEPS = { type: 1, single: 2, collage: 2, carousel: 2, editor: 2, quiz: 3, details: 3, caption: 3, review: 4 };
  const FLOW_TOTAL = 4;
  let lastFlowPct = 0; // width the bar animates FROM on the next flow screen

  // Direction of the next screen wipe: "back" slides in from the left, anything
  // else from the right. Set by handleBack / go-home just before they show().
  let navDir = "fwd";
  // The app never navigates the browser itself (no other pages exist), so it
  // never pushed any history entries — meaning the phone's own back button/
  // gesture (as opposed to the in-app "‹" arrows) tried to navigate *away*
  // from the page and left a blank white screen. Every show() now also pushes
  // a history entry mirroring the screen, and a popstate listener (below)
  // re-shows whichever screen that entry belongs to, so the hardware back
  // button behaves exactly like the in-app back arrow instead of exiting.
  let suppressHistoryPush = false;

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
    // The post button has no data-nav (it starts a flow rather than opening a
    // hub screen), so it needs marking active by hand. "type" is the flow's
    // first screen and the only one of its screens in HUB_SCREENS — the rest
    // hide the bottom nav altogether, so there's nowhere else a dot could show.
    const postBtn = $(".navbtn:not([data-nav])");
    if (postBtn) postBtn.classList.toggle("is-active", screen === "type");
    updateFlowProgress(screen);
    if (screen === "home") rollGreeting();
    window.scrollTo(0, 0);
    if (!suppressHistoryPush) {
      try { history.pushState({ screen }, "", ""); } catch (e) { /* ignore */ }
    }
  }

  // The phone's back button/gesture fires this instead of unloading the page.
  window.addEventListener("popstate", (e) => {
    navDir = "back";
    suppressHistoryPush = true;
    show((e.state && e.state.screen) || "home");
    suppressHistoryPush = false;
  });

  // Advance the New Post progress bar as the user moves through the flow. Each
  // flow screen has its own .flow-bar; we park the incoming screen's bar at the
  // width we left the previous step on, force a reflow to commit it with no
  // animation, then set the target so the fill sweeps (the same park-reflow
  // trick obGo uses). Going back shrinks it; leaving the flow (any non-flow
  // screen) resets to 0 so the next post starts empty.
  function updateFlowProgress(screen) {
    const step = FLOW_STEPS[screen];
    if (!step) { lastFlowPct = 0; return; }
    const pct = (step / FLOW_TOTAL) * 100;
    const sec = document.querySelector('[data-screen="' + screen + '"]');
    const bar = sec && sec.querySelector(".flow-bar");
    if (!bar) { lastFlowPct = pct; return; }
    bar.style.transition = "none";
    bar.style.width = lastFlowPct + "%";
    void bar.offsetWidth; // commit the parked width before re-enabling the sweep
    bar.style.transition = "";
    bar.style.width = pct + "%";
    lastFlowPct = pct;
  }

  // Give every New Post flow screen its own progress bar at boot (the type
  // screen already has one under its mascot, so skip it). Kept in JS so the
  // markup isn't duplicated across seven screens.
  function initFlowBars() {
    Object.keys(FLOW_STEPS).forEach((screen) => {
      if (screen === "type") return;
      const sec = document.querySelector('[data-screen="' + screen + '"]');
      const pad = sec && sec.querySelector(".pad");
      if (!pad || pad.querySelector(".flow-bar")) return;
      const track = document.createElement("div");
      track.className = "flow-track";
      const bar = document.createElement("span");
      bar.className = "ob-bar flow-bar";
      track.appendChild(bar);
      pad.insertBefore(track, pad.firstChild);
    });
  }

  // Drop a fresh random greeting onto the home screen.
  function rollGreeting() {
    const el = document.getElementById("homeGreeting");
    if (el && window.pickGreeting) {
      el.textContent = window.pickGreeting();
      if (window.FX) FX.pop(el);
    }
  }

  // Fill an empty-state <p> with a mascot pose + message, so blank screens feel
  // charming rather than dead. Text is set via textContent (never innerHTML).
  function mascotEmpty(el, state, text) {
    if (!el) return;
    el.classList.add("mascot-empty");
    el.innerHTML = "";
    // Match the motion to the mood: sleepers snooze, sad droops, rest floats.
    const anim = { sleeping: "snooze", sad: "mope" }[state] || "float";
    if (window.Mascot) el.appendChild(Mascot.el(state, { anim, size: "lg" }));
    const span = document.createElement("span");
    span.className = "mascot-empty-msg";
    span.textContent = text;
    el.appendChild(span);
    el.hidden = false;
  }

  /* ---------- boot ---------- */
  async function boot() {
    // Tag the page's own initial history entry with whichever screen actually
    // opens (replace, not push — it already exists) so the very first popstate
    // has a screen to resolve. Hardcoding "home" here would desync the back
    // button on a first run, where onboarding is what's on screen.
    const firstRun = !Store.getOnboarded();
    try {
      history.replaceState({ screen: firstRun ? "ob-welcome" : "home" }, "", "");
    } catch (e) { /* ignore */ }
    // Swap to onboarding BEFORE the awaits below: home is is-active in the
    // static HTML, so waiting until after Hooks.init() lets a slow phone paint
    // home first and then snap setup over the top of it.
    if (firstRun) {
      suppressHistoryPush = true;
      startOnboarding();
      suppressHistoryPush = false;
    }
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
    initFlowBars();
    applyFont(Store.getFont());
    rollGreeting();
    adaptPhotoPickers();
    loadPhotoStash();
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

      const kPost = e.target.closest("[data-keeper-post]");
      if (kPost) return postKeeper(+kPost.dataset.keeperPost);

      const kEdit = e.target.closest("[data-keeper-edit]");
      if (kEdit) return customiseKeeper(+kEdit.dataset.keeperEdit);

      const kQueue = e.target.closest("[data-keeper-queue]");
      if (kQueue) {
        const dateInput = kQueue.closest(".keeper-queue").querySelector(".keeper-date");
        return queueKeeper(+kQueue.dataset.keeperQueue, dateInput ? dateInput.value : "", kQueue);
      }

      const stashRemove = e.target.closest("[data-stash-remove]");
      if (stashRemove) return removeStashPhoto(stashRemove.dataset.stashRemove);

      const calRemove = e.target.closest("[data-cal-remove]");
      if (calRemove) return removeWorkday(calRemove.dataset.calRemove);

      const calJump = e.target.closest("[data-cal-day]");
      if (calJump) return selectCalDay(calJump.dataset.calDay);

      const calLoc = e.target.closest("[data-cal-loc]");
      if (calLoc) return pickCalLocation(calLoc.dataset.calLoc);

      const fontOpt = e.target.closest("[data-font-option]");
      if (fontOpt) return pickFont(fontOpt.dataset.fontOption);

      const qMake = e.target.closest("[data-q-make]");
      if (qMake) return makeFromQueue(Store.getQueue().find((x) => x.id === qMake.dataset.qMake));

      const qDel = e.target.closest("[data-q-del]");
      if (qDel) {
        const it = Store.getQueue().find((x) => x.id === qDel.dataset.qDel);
        if (it && it.draftId && window.Drafts) Drafts.remove(it.draftId);
        Store.removeQueueItem(qDel.dataset.qDel);
        return renderQueue();
      }

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
    $("#calDayAddLoc").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addCalDayLocation();
    });
    $("#hashtagInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addHashtagItem();
    });
    $("#genFolderInput").addEventListener("change", onGenFolderPicked);
    $("#stashInput").addEventListener("change", onStashPicked);
    $("#backupInput").addEventListener("change", onBackupPicked);
    $("#obPhotoInput").addEventListener("change", onObPhotosPicked);
    $("#obPlaceInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addObPlace(); }
    });
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

  /* ---------- ONBOARDING (first run) ---------- */
  // The order of setup. Screens are in index.html; none are in HUB_SCREENS, so
  // the bottom nav stays hidden for the whole flow.
  const OB_STEPS = ["ob-welcome", "ob-photos", "ob-places", "ob-done"];

  function obPct(i) {
    return ((i + 1) / OB_STEPS.length) * 100;
  }

  function obGo(screen) {
    const i = OB_STEPS.indexOf(screen);
    if (i < 0) return;
    const cur = $(".screen.is-active");
    const from = OB_STEPS.indexOf(cur ? cur.dataset.screen : "");
    const sec = $(`.screen[data-screen="${screen}"]`);
    const bar = sec && sec.querySelector(".ob-bar");
    // Each step owns its own bar, and a width set while the section is still
    // display:none lands with no transition — so park it at the PREVIOUS step's
    // width, reveal the screen, then move it. Without the park the fill never
    // animates, it only ever appears at its final width.
    if (bar) {
      bar.style.transition = "none";
      bar.style.width = (from >= 0 ? obPct(from) : obPct(i)) + "%";
    }
    if (screen === "ob-photos") renderObPhotos();
    if (screen === "ob-places") renderObPlaces();
    show(screen);
    if (bar) {
      // Reading offsetWidth once the screen is visible forces a synchronous
      // reflow, so the parked width is the painted "from" value and the line
      // below has something to transition out of. Deliberately NOT rAF: that
      // would leave the bar stuck on the old step whenever frames are paused
      // (background tab), making the correct value depend on an animation
      // callback. This way the final width is always set, animation or not.
      void bar.offsetWidth;
      bar.style.transition = ""; // back to the stylesheet (none under reduced motion)
      bar.style.width = obPct(i) + "%";
    }
  }

  function obNext() {
    const cur = $(".screen.is-active");
    const i = OB_STEPS.indexOf(cur ? cur.dataset.screen : "");
    const next = OB_STEPS[i + 1];
    if (next) obGo(next);
    else finishOnboarding("home");
  }

  function startOnboarding() {
    obGo("ob-welcome");
  }

  // Every exit from setup runs through here, so the flag can't be missed and
  // strand someone in onboarding on every launch.
  function finishOnboarding(target) {
    Store.setOnboarded(true);
    obUrls.forEach((u) => URL.revokeObjectURL(u));
    obUrls = [];
    if (target === "generate") openGenerate(null);
    else show("home");
  }

  async function renderObPhotos() {
    const grid = $("#obPhotoGrid");
    const note = $("#obPhotoNote");
    const next = $("#obPhotosNext");
    if (!grid) return;
    obUrls.forEach((u) => URL.revokeObjectURL(u));
    obUrls = [];
    if (!window.Photos || !Photos.supported) {
      // No IndexedDB — the stash can't work, so don't gate setup on it.
      grid.innerHTML = "";
      if (note) note.textContent = "This phone can't save photos in the app — you can still pick one per post.";
      if (next) next.disabled = false;
      return;
    }
    const items = await Photos.all();
    grid.innerHTML = items
      .map((it) => {
        const url = URL.createObjectURL(it.blob);
        obUrls.push(url);
        return `<div class="stash-thumb"><img src="${url}" alt="" /></div>`;
      })
      .join("");
    if (note) note.textContent = items.length ? `${items.length} photo${items.length === 1 ? "" : "s"} saved. 📸` : "";
    // Soft gate: Next needs one photo, but "Skip for now" is always live.
    if (next) next.disabled = items.length === 0;
  }

  async function onObPhotosPicked(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const note = $("#obPhotoNote");
    if (note) note.textContent = "Saving…";
    await Photos.add(files);
    await loadPhotoStash();
    await renderObPhotos();
    const btn = $('[data-action="ob-add-photos"]');
    if (window.FX && FX.sparkle && btn) FX.sparkle(btn);
  }

  function renderObPlaces() {
    const list = $("#obPlaceList");
    if (!list) return;
    const items = Store.getLocations();
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<p class="ob-hint">No pitches saved — add one below.</p>';
      return;
    }
    items.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "ob-place";
      const span = document.createElement("span");
      span.textContent = item;
      const del = document.createElement("button");
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + item);
      del.addEventListener("click", () => {
        const next = Store.getLocations();
        next.splice(i, 1);
        Store.setLocations(next);
        renderObPlaces();
      });
      row.appendChild(span);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addObPlace() {
    const input = $("#obPlaceInput");
    const val = input.value.trim();
    if (!val) {
      if (window.FX) FX.wiggle(input);
      return;
    }
    Store.addLocation(val);
    input.value = "";
    renderObPlaces();
    if (window.FX) FX.pop($("#obPlaceList").lastElementChild);
  }

  function handleAction(action, el) {
    switch (action) {
      case "new-post": post = freshPost(); show("type"); break;
      case "open-settings": openSettings(); break;
      case "open-calendar": openCalendar(); break;
      case "open-generate": openGenerate(null); break;
      case "open-queue": openQueue(); break;
      case "open-history": openHistory(); break;
      case "queue-add": queueAdd(el); break;
      case "cal-prev": shiftMonth(-1); break;
      case "cal-next": shiftMonth(1); break;
      case "cal-clear": clearCalDay(); break;
      case "cal-add-loc": addCalDayLocation(); break;
      case "cal-generate": openGenerate(selectedDate); break;
      case "gen-folder": $("#genFolderInput").click(); break;
      case "stash-add": $("#stashInput").click(); break;
      case "stash-clear": clearStash(); break;
      case "ob-next": obNext(); break;
      case "ob-skip": obNext(); break;
      case "ob-add-photos": $("#obPhotoInput").click(); break;
      case "ob-add-place": addObPlace(); break;
      case "ob-finish": finishOnboarding("generate"); break;
      case "ob-home": finishOnboarding("home"); break;
      case "ob-restart": startOnboarding(); break;
      case "ob-restore": obRestoring = true; $("#backupInput").click(); break;
      case "backup-export": exportBackup(el); break;
      // Both openers of #backupInput must state which one they are: cancelling
      // a file picker fires no event, so a flag that's only cleared on success
      // would stay set and hijack the next restore (skipping its confirm).
      case "backup-import": obRestoring = false; $("#backupInput").click(); break;
      case "gen-regenerate": runGenerate(); break;
      case "gen-brief": openBrief(); break;
      case "brief-loc": briefSelectAndAdvance(el, () => { genBrief.location = el.dataset.val; }); break;
      case "brief-new-loc": $("#briefAddRow").hidden = false; $("#briefLocInput").focus(); break;
      case "brief-add-loc": briefAddLoc(); break;
      case "brief-when": briefSelectAndAdvance(el, () => { genBrief.date = el.dataset.val; }); break;
      case "brief-pick-day": $("#briefDayRow").hidden = false; break;
      case "brief-day-next": briefDayNext(); break;
      case "brief-vibe": briefToggleVibe(el); break;
      case "brief-back": goBriefStep(genBriefStep - 1, "back"); break;
      case "brief-cook": briefCook(el); break;
      case "gen-like": flyOff("right"); break;
      case "gen-nope": flyOff("left"); break;
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
      case "back-to-keepers": returnToKeepers(); break;
      case "save-customise": saveCustomiseToKeeper(); break;
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
    // Customising a Generate keeper: caption + hashtags are already set (by
    // seedPostFromGen), so go straight to the caption screen WITHOUT re-running
    // applyHashtags (which would append a second hashtag block). Back returns to
    // the editor so the sticker can be re-dragged.
    if (post.fromGenerate) {
      $("#captionText").value = post.captionText;
      updateHashtagBtnLabel();
      const back = document.querySelector('[data-screen="caption"] .back');
      if (back) back.dataset.back = "editor";
      renderCaptionPreview();
      return show("caption");
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
    // Also save these into the permanent stash so they're still here next
    // time the app opens — a folder pick alone only lasts this session
    // (browsers won't let a web app keep a live link to a device folder).
    if (window.Photos && Photos.supported) Photos.add(files);
    // Immediately drop random photos in so they see it work.
    if (folderTarget === "single") shuffleSinglePhoto();
    else shuffleCollagePhotos();
  }

  function refreshPoolUi() {
    const n = photoPool.length;
    const has = n > 0;
    const label = has ? `📁 ${n} photos loaded — tap shuffle for random picks` : "";
    [["#singleShuffle", "#singlePoolNote"], ["#collageShuffle", "#collagePoolNote"]].forEach(
      ([btnSel, noteSel]) => {
        const btn = $(btnSel);
        if (btn) btn.disabled = !has;
        const note = $(noteSel);
        if (note) { note.hidden = !has; note.textContent = label; }
      }
    );
  }

  /* ---------- SAVED PHOTO STASH (persistent chicken photos) ---------- */
  // Seed the in-memory pool from the device's saved stash so shuffle/generate
  // work the moment the app opens — no re-picking every session.
  async function loadPhotoStash() {
    if (!window.Photos || !Photos.supported) return;
    try {
      const items = await Photos.all();
      if (!items.length) return;
      photoPool = items.map((it) => it.blob);
      refreshPoolUi();
    } catch (e) { /* the stash is a nicety — never block boot on it */ }
  }

  async function onStashPicked(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const note = $("#stashNote");
    if (note) note.textContent = "Saving…";
    const added = await Photos.add(files);
    await loadPhotoStash();
    await renderStash();
    if (note) note.textContent = added ? `Added ${added} photo${added === 1 ? "" : "s"}. 📸` : "";
    const btn = $('[data-action="stash-add"]');
    if (window.FX && FX.sparkle && btn) FX.sparkle(btn);
  }

  async function removeStashPhoto(id) {
    await Photos.remove(id);
    await loadPhotoStash();
    await renderStash();
  }

  async function clearStash() {
    const n = await Photos.count();
    if (!n) return;
    if (!confirm(`Remove all ${n} saved photo${n === 1 ? "" : "s"}?`)) return;
    await Photos.clear();
    photoPool = [];
    refreshPoolUi();
    await renderStash();
  }

  async function exportBackup(btn) {
    const status = $("#backupStatus");
    status.textContent = "Building your backup…";
    try {
      const data = await Backup.exportFile();
      const n = data.photos.length + data.drafts.length;
      status.textContent =
        `Downloaded — ${data.store.posts.length} posts, ${data.store.queue.length} queued, ` +
        `${n} photo${n === 1 ? "" : "s"} saved. Keep that file somewhere safe. 💾`;
      if (window.FX && btn) FX.sparkle(btn, { count: 12 });
    } catch (e) {
      status.textContent = "Couldn't build a backup — try again.";
      if (window.FX) FX.wiggle(status);
    }
  }

  async function onBackupPicked(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    // Restoring from onboarding writes to the welcome screen's own status line.
    const status = obRestoring ? $("#obRestoreStatus") : $("#backupStatus");
    // The confirm is skipped ONLY on a genuine first run, where there's nothing
    // but seeded defaults to lose. It can't hang off obRestoring alone: "Run
    // setup again" walks an already-loaded phone back to the same restore
    // button, and that device has months of queue, history and photos to wipe.
    const firstRunRestore = obRestoring && !Store.getOnboarded();
    if (!firstRunRestore && !confirm(
      "Restoring will overwrite your current locations, hashtags, captions, calendar, queue, " +
      "post history and saved photos on this phone with what's in that file. Continue?"
    )) { obRestoring = false; return; }
    status.textContent = "Restoring…";
    try {
      const summary = await Backup.restoreFile(file);
      status.textContent =
        `Restored — ${summary.posts} posts, ${summary.queue} queued, ${summary.photos} photo${summary.photos === 1 ? "" : "s"} back on this phone. 🎉`;
      photoPool = [];
      await loadPhotoStash();
      refreshPoolUi(); // loadPhotoStash skips this when the stash is empty
      if (obRestoring) {
        // A restored phone is already set up — no point walking them through it.
        obRestoring = false;
        finishOnboarding("home");
        // sparkle, not confetti: the full-screen Lottie is reserved for the big
        // win (sharing a post), and this matches the Settings restore's feedback.
        if (window.FX) FX.sparkle(status, { count: 16 });
      } else {
        openSettings(); // re-render every list on this screen from the restored data
        if (window.FX) FX.sparkle(status, { count: 16 });
      }
    } catch (err) {
      status.textContent = err.message || "That file couldn't be restored.";
      if (window.FX) FX.wiggle(status);
      obRestoring = false;
    }
  }

  async function renderStash() {
    const grid = $("#stashGrid");
    const note = $("#stashNote");
    if (!grid) return;
    // Revoke the previous batch of object URLs so thumbnails don't leak memory.
    stashUrls.forEach((u) => URL.revokeObjectURL(u));
    stashUrls = [];
    if (!window.Photos || !Photos.supported) {
      grid.innerHTML = '<p class="stash-empty">This phone can’t save photos in the app, sorry.</p>';
      if (note) note.textContent = "";
      return;
    }
    const items = await Photos.all();
    if (!items.length) {
      grid.innerHTML =
        '<div class="stash-empty mascot-empty">' +
        (window.Mascot ? Mascot.html("relaxing", { anim: "float", size: "lg" }) : "") +
        '<span class="mascot-empty-msg">No photos saved yet — tap “Add photos”.</span></div>';
      if (note) note.textContent = "";
      return;
    }
    grid.innerHTML = items.map((it) => {
      const url = URL.createObjectURL(it.blob);
      stashUrls.push(url);
      return `<div class="stash-thumb"><img src="${url}" alt="" />` +
        `<button class="stash-x" data-stash-remove="${it.id}" aria-label="Remove photo">✕</button></div>`;
    }).join("");
    if (note) note.textContent = `${items.length} photo${items.length === 1 ? "" : "s"} saved — every post can grab these at random.`;
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
    if (tag === "weather") return chooseWeather();
    // If this kind of post needs no typed details, skip the (empty) details
    // screen and go straight to the caption.
    if (Hooks.inputVarsForTag(tag).length === 0 && resolveCaption("quiz")) return;
    renderDetailFields();
    show("details");
  }

  // Weather mode: look up the current conditions, then pick a weather-matched
  // line. Degrades gracefully — if we can't read the weather (offline, location
  // blocked, desktop), fall back to the generic cheeky lines so there's always
  // a caption.
  async function chooseWeather() {
    post.tag = "weather";
    if (!post.location) post.location = Store.getLocations()[0] || "";
    const tile = document.querySelector('[data-tag="weather"]');
    if (tile) tile.classList.add("is-loading");
    const w = await Weather.getCurrent();
    if (tile) tile.classList.remove("is-loading");

    post.weather = w ? w.condition : null;
    post.weatherLabel = w ? `${w.emoji} ${Math.round(w.tempC)}° · ${w.label} right now` : "";

    const ctx = {
      location: post.location,
      day: post.day,
      menuItems: Store.getMenuItems(),
      weather: post.weather,
    };
    let result = Hooks.choose("weather", ctx);
    if (!result) {
      // No live weather (or nothing matched) — use the general lines instead.
      post.tag = "other";
      post.weatherLabel = w ? post.weatherLabel : "Couldn't check the weather — here's a general line. (Allow location, or you may be offline.)";
      result = Hooks.choose("other", ctx) || Hooks.choose("brand", ctx);
    }
    if (!result) return;
    setCaption(result);
    renderCaptionPreview();
    const back = document.querySelector('[data-screen="caption"] .back');
    if (back) back.dataset.back = "quiz";
    show("caption");
  }

  function updateWeatherNote() {
    const el = $("#weatherNote");
    if (!el) return;
    if (post.weatherLabel) { el.hidden = false; el.textContent = post.weatherLabel; }
    else el.hidden = true;
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
    if (window.FX) FX.wiggle(err); // a friendly "oi, look here" shimmy
  }

  // The preview boxes default to a square via CSS; a non-square export (e.g.
  // a 9:16 Story) would otherwise get letterboxed tiny inside that square.
  // Set the box's own ratio to match the actual image so it fills properly.
  function fitPreviewBox(imgEl, w, h) {
    const wrap = imgEl && imgEl.closest(".preview-wrap");
    if (wrap && w && h) wrap.style.aspectRatio = w + " / " + h;
  }

  // Compose the post image (with the location/day text overlaid) for the
  // live preview on the caption screen.
  async function renderCaptionPreview() {
    const img = $("#captionPreview");
    try {
      await Imaging.ensureFonts();
      const canvas = await composePostImage();
      if (canvas) { img.src = Imaging.toDataURL(canvas); fitPreviewBox(img, canvas.width, canvas.height); }
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
    updateWeatherNote();
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

  function buildHashtagBlock(loc = post.location) {
    const chosen = shuffleArr(Store.getHashtags()).slice(0, 12);
    // Auto-tag the pitch location, if we know it.
    if (loc) {
      const locTag = "#" + loc.toLowerCase().replace(/[^a-z0-9]/g, "");
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
    if (window.FX) FX.pop($("#hashtagList").lastElementChild); // fresh tag bounces
  }

  function shuffleCaption() {
    const ctx = {
      location: post.location,
      day: post.day,
      menuItems: Store.getMenuItems(),
      weather: post.weather,
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
    // Default the back arrow to the caption screen; keeper "Post" overrides after.
    const rvBack = document.querySelector('[data-screen="review"] .back');
    if (rvBack) rvBack.dataset.back = "caption";
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
      const coverUrl = Imaging.toDataURL(coverCanvas);
      post.finalDataUrl = coverUrl;
      $("#reviewImage").src = coverUrl;
      fitPreviewBox($("#reviewImage"), coverCanvas.width, coverCanvas.height);
      badge.hidden = false;
      badge.textContent = `1 / ${post.finalBlobs.length}`;
    } else {
      const canvas = await composePostImage();
      post.finalBlob = await Imaging.toBlob(canvas);
      post.finalBlobs = [post.finalBlob];
      const url = Imaging.toDataURL(canvas);
      post.finalDataUrl = url;
      $("#reviewImage").src = url;
      fitPreviewBox($("#reviewImage"), canvas.width, canvas.height);
      badge.hidden = true;
    }
    post.status = "approved";

    $("#reviewCaption").textContent = post.captionText;
    $("#shareNote").hidden = true;
    $("#publishNote").hidden = true;
    $("#doneHome").hidden = true;
    $("#doneKeepers").hidden = true;
    const cm = $("#celebrateMascot");
    if (cm) cm.hidden = true; // reset the win mascot until this post is shared
    // Customise-preview mode (a Generate keeper being edited): the endpoint is
    // "save back to my posts", not share — sharing/scheduling happens from the
    // keepers tray. Everything else keeps the normal share controls.
    const customising = !!post.fromGenerate;
    $("#reviewShareControls").hidden = customising;
    $("#saveCustomise").hidden = !customising;
    const rvTitle = document.querySelector('[data-screen="review"] h2');
    if (rvTitle) rvTitle.textContent = customising ? "Preview" : "Ready to share";
    renderPublishButtons();
    show("review");
  }

  // Record the post as shared and log the hook so it rests for the cooldown.
  // Used by both the share sheet and the direct Meta publish buttons.
  function markPostShared(via) {
    post.status = "shared";
    if (window.Sound) Sound.play("big-win"); // 🔊 the fanfare
    if (window.FX) FX.confetti(); // 🎉 the win
    const cm = $("#celebrateMascot"); // the mascot joins the party
    if (cm) cm.hidden = false; // its own .mascot-win handles the pop+settle
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

  // After a post is shared/published, offer the right "what next" button:
  // a keeper returns to its tray (so the rest can be posted); anything else
  // goes back to the start.
  function showDoneButton() {
    if (post.keeperRef) $("#doneKeepers").hidden = false;
    else $("#doneHome").hidden = false;
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
    showDoneButton();
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
      showDoneButton();
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
    renderStash();
    renderLocations();
    renderMenu();
    renderHashtags();
    renderUserHooks();
    renderNotifySettings();
    renderMetaSettings();
    renderFontPicker();
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
    if (window.FX) FX.pop($("#menuList").lastElementChild); // fresh row bounces
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
    if (window.FX) FX.pop($("#locationList").lastElementChild); // fresh row bounces
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
    if (window.FX) FX.pop(err);
  }

  /* ---------- WORK CALENDAR ---------- */
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    renderWorkdaysList();
  }

  // Quick list of the shown month's working days, each removable with one tap —
  // so you don't have to hunt for a day on the grid to un-mark it.
  function renderWorkdaysList() {
    const wrap = $("#calWorkdays");
    if (!wrap) return;
    const year = calView.getFullYear(), month = calView.getMonth();
    const schedule = Store.getSchedule();
    const keys = Object.keys(schedule)
      .filter((k) => {
        const [y, m] = k.split("-").map(Number);
        return y === year && m - 1 === month;
      })
      .sort();
    if (!keys.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML =
      `<p class="cal-workdays-title">Working days in ${MONTHS[month]}</p>` +
      `<div class="chips">` +
      keys.map((k) => {
        const [y, m, d] = k.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        const wd = schedule[k];
        const where = wd && wd.location ? ` · ${escapeAttr(wd.location)}` : "";
        const label = `${SHORT_WEEKDAYS[dt.getDay()]} ${d}`;
        return `<span class="chip cal-wchip${k === selectedDate ? " selected" : ""}" data-cal-day="${k}">` +
          `${label}${where}` +
          `<button class="cal-wx" data-cal-remove="${k}" aria-label="Remove ${label}">✕</button></span>`;
      }).join("") +
      `</div>`;
  }

  function removeWorkday(key) {
    Store.setWorkday(key, null);
    if (selectedDate === key) { selectedDate = null; $("#calDay").hidden = true; }
    renderCalendar();
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
    const addInput = $("#calDayAddLoc");
    if (addInput) addInput.value = "";
    renderCalDaySchedule(key);
    $("#calDay").hidden = false;
  }

  // Show what's lined up for the tapped day: queued plans and anything already
  // posted that day.
  function renderCalDaySchedule(key) {
    const wrap = $("#calDaySchedule");
    if (!wrap) return;
    const queued = Store.getQueue().filter((q) => q.date === key);
    const posted = Store.getPosts().filter(
      (p) => p.status === "shared" && p.created && dateKey(new Date(p.created)) === key
    );
    let html = "";
    for (const q of queued) {
      const loc = q.location ? ` · ${escapeAttr(q.location)}` : "";
      const cap = q.caption ? `<div class="cal-sched-cap">${escapeAttr(q.caption)}</div>` : "";
      const ready = q.draftId ? " · 📸 ready to post" : "";
      html += `<div class="cal-sched-item"><div class="cal-sched-when">🗓 Queued${loc}${ready}</div>${cap}</div>`;
    }
    for (const p of posted) {
      const loc = p.location ? ` · ${escapeAttr(p.location)}` : "";
      const cap = p.caption ? `<div class="cal-sched-cap">${escapeAttr(p.caption)}</div>` : "";
      html += `<div class="cal-sched-item is-posted"><div class="cal-sched-when">✓ Posted${loc}</div>${cap}</div>`;
    }
    if (!html) html = `<p class="cal-sched-empty">Nothing scheduled for this day yet.</p>`;
    wrap.innerHTML = html;
  }

  // Add a one-off / new pitch straight from the day panel, then select it for
  // this day so it's set in one go.
  function addCalDayLocation() {
    const input = $("#calDayAddLoc");
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    Store.addLocation(val);
    input.value = "";
    if (selectedDate) {
      Store.setWorkday(selectedDate, val);
      selectCalDay(selectedDate);
      bounceWorkdayCell(selectedDate);
    }
  }

  function pickCalLocation(loc) {
    if (!selectedDate) return;
    Store.setWorkday(selectedDate, loc);
    selectCalDay(selectedDate);
    bounceWorkdayCell(selectedDate);
  }

  // Setting a day's pitch is routine admin, not a win — the cell just bounces
  // to acknowledge the tap. No confetti here (owner's call); the sparkle/
  // confetti stay for the things worth celebrating, like sharing a post.
  function bounceWorkdayCell(key) {
    if (!window.FX) return;
    const cell = document.querySelector(`.cal-cell[data-date="${key}"]`);
    if (cell) FX.pop(cell);
  }
  function clearCalDay() {
    if (!selectedDate) return;
    Store.setWorkday(selectedDate, null);
    selectCalDay(selectedDate);
  }

  /* ---------- GENERATE POSTS ---------- */
  // Each item: { img, dataUrl, filledText, hook, hashtags }
  let genDeck = [];        // the whole generated batch
  let deckCursor = 0;      // index of the current top card
  let keepers = [];        // items swiped right
  let keptTotal = 0;       // how many were kept this batch, even once posted out of `keepers`
  const binnedHookIds = new Set(); // captions binned this session — don't resurface
  let genBusy = false;
  let genLocation = "";
  let genDay = "";
  let genDateLabel = "";
  const GEN_TARGET = 10;   // how many posts a batch aims for
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // On-brand caption looks, rotated across a batch so the deck isn't samey.
  // Drawn as solid, slightly-tilted sticker labels (see drawCaptionSticker in
  // imaging.js). `angle`/`sizeScale` are base values; each card jitters them so
  // even two cards of the same style differ.
  const CAPTION_STYLES = [
    { fillRGB: [10, 77, 161], color: "#ffffff", accent: null, angle: -4, sizeScale: 1.0 },  // brand blue
    { fillRGB: [245, 139, 31], color: "#1a1208", accent: null, angle: 5, sizeScale: 1.15 }, // orange block
    { fillRGB: [255, 250, 242], color: "#0a4da1", accent: null, angle: -3, sizeScale: 0.9 }, // cream, blue text
    { fillRGB: [21, 35, 49], color: "#ffffff", accent: null, angle: 3, sizeScale: 1.1 },    // charcoal
    { fillRGB: [17, 24, 39], color: "#f58b1f", accent: null, angle: -5, sizeScale: 1.0 },   // near-black, orange text
  ];

  /* ---- the brief: three quick questions before a batch is cooked ---- */
  // Answers live for the whole session so "Generate more" re-rolls the same
  // brief and reopening Generate starts from last time's choices.
  const genBrief = {
    location: "",
    date: "", // ISO yyyy-mm-dd the posts are for (drives {day} in captions)
    tags: new Set(["location", "brand", "other"]), // hook tags = the "vibe"
  };
  let genBriefStep = 0;
  let briefAdvancing = false; // a chip tap is mid auto-advance — ignore repeats
  const GEN_BRIEF_STEPS = 3; // where / when / vibe; the bar's 4th stop = cooking
  // The vibe chips map straight onto the hook library's tags. `weather` is
  // deliberately not offered — weather-pinned hooks need a live condition the
  // Generate flow doesn't supply yet (see the roadmap note in CLAUDE.md).
  const GEN_VIBES = [
    { tag: "location", label: "📍 Shout the pitch" },
    { tag: "brand", label: "🐔 Big brand energy" },
    { tag: "other", label: "😜 Fun & FOMO" },
    { tag: "events", label: "🎉 Events & catering" },
  ];

  function openGenerate(dateStr) {
    // No photos = nothing to brief about; runGenerate shows the add-photos
    // empty state without touching the brief's answers.
    if (!photoPool.length) {
      show("generate");
      runGenerate();
      return;
    }
    genBrief.date = dateStr || Notify.todayStr();
    const wd = Store.getWorkday(genBrief.date);
    // That day's planned pitch wins; otherwise keep the session's last answer.
    genBrief.location = (wd && wd.location) || genBrief.location || Store.getLocations()[0] || "";
    show("generate");
    openBrief();
  }

  // Show exactly one of the generate panels.
  function genShow(which) {
    $("#genBrief").hidden = which !== "brief";
    $("#genLoading").hidden = which !== "loading";
    $("#genDeckWrap").hidden = which !== "deck";
    $("#genKeepers").hidden = which !== "keepers";
    $("#genEmpty").hidden = which !== "empty";
  }

  function briefPct(i) {
    return ((i + 1) / (GEN_BRIEF_STEPS + 1)) * 100;
  }

  function openBrief() {
    $("#genInfo").textContent = "";
    const bar = $("#genBriefBar");
    // Same trap as the onboarding bar: a width set while the panel is hidden
    // lands with no transition — park it at zero first, reveal, reflow, move.
    bar.style.transition = "none";
    bar.style.width = "0%";
    genShow("brief");
    void bar.offsetWidth;
    bar.style.transition = "";
    goBriefStep(0);
  }

  function goBriefStep(i, dir) {
    genBriefStep = Math.max(0, Math.min(GEN_BRIEF_STEPS - 1, i));
    briefAdvancing = false;
    const bar = $("#genBriefBar");
    bar.style.width = briefPct(genBriefStep) + "%";
    const track = bar.parentElement;
    if (track) track.setAttribute("aria-valuenow", String(genBriefStep + 1));
    renderBriefStep(dir === "back");
  }

  // Stoic-style stacked pill option (full-width, fills blue when selected).
  function briefChip(action, val, label, selected) {
    return (
      `<button class="brief-opt${selected ? " selected" : ""}" data-action="${action}" ` +
      `data-val="${escapeAttr(val)}">${escapeAttr(label)}</button>`
    );
  }

  function renderBriefStep(fromBack) {
    const el = $("#genBriefStep");
    let html = "";
    if (genBriefStep === 0) {
      const locs = Store.getLocations();
      html =
        (window.Mascot ? Mascot.html("walk", { anim: "sway", size: "lg", className: "mascot-center" }) : "") +
        `<h3 class="gen-q-title">Right — where are we at?</h3>` +
        `<p class="hint">The captions will shout about this pitch.</p>` +
        `<div class="brief-opts">` +
        locs.map((l) => briefChip("brief-loc", l, l, l === genBrief.location)).join("") +
        `<button class="brief-opt brief-opt-add" data-action="brief-new-loc">＋ Somewhere new</button>` +
        `</div>` +
        `<div class="row gen-brief-add" id="briefAddRow" ${locs.length ? "hidden" : ""}>` +
        `<input id="briefLocInput" class="text-input" type="text" placeholder="e.g. Greenwich Market" />` +
        `<button class="btn btn-secondary" data-action="brief-add-loc">Add</button>` +
        `</div>`;
    } else if (genBriefStep === 1) {
      const today = Notify.todayStr();
      const tomorrow = Notify.todayStr(new Date(Date.now() + 86400000));
      const chips = [
        { val: today, label: `Today · ${weekdayName(today).slice(0, 3)}` },
        { val: tomorrow, label: `Tomorrow · ${weekdayName(tomorrow).slice(0, 3)}` },
      ];
      // A calendar-picked (or previously picked) day that isn't today/tomorrow
      // gets its own chip so the current answer is always visible.
      if (genBrief.date && genBrief.date !== today && genBrief.date !== tomorrow) {
        chips.push({ val: genBrief.date, label: fmtQueueDate(genBrief.date) });
      }
      html =
        (window.Mascot ? Mascot.html("thinking", { anim: "breathe", size: "lg", className: "mascot-center" }) : "") +
        `<h3 class="gen-q-title">When's it going out?</h3>` +
        `<p class="hint">Sets the day the captions mention.</p>` +
        `<div class="brief-opts">` +
        chips.map((c) => briefChip("brief-when", c.val, c.label, c.val === genBrief.date)).join("") +
        `<button class="brief-opt brief-opt-add" data-action="brief-pick-day">📅 Another day</button>` +
        `</div>` +
        `<div class="row gen-brief-add" id="briefDayRow" hidden>` +
        `<input id="briefDayInput" class="text-input" type="date" min="${today}" value="${escapeAttr(genBrief.date || today)}" aria-label="Post day" />` +
        `<button class="btn btn-secondary" data-action="brief-day-next">That day ›</button>` +
        `</div>` +
        `<button class="btn btn-ghost btn-sm gen-step-back" data-action="brief-back">‹ Back a step</button>`;
    } else {
      html =
        (window.Mascot ? Mascot.html("excited", { anim: "breathe", size: "lg", className: "mascot-center" }) : "") +
        `<h3 class="gen-q-title">What's the vibe?</h3>` +
        `<p class="hint">Tick as many as you fancy — mix it up.</p>` +
        `<div class="brief-opts" id="briefVibes">` +
        GEN_VIBES.map((v) => briefChip("brief-vibe", v.tag, v.label, genBrief.tags.has(v.tag))).join("") +
        `</div>` +
        `<button class="btn btn-accent gen-cook" data-action="brief-cook">✨ Cook 'em up</button>` +
        `<button class="btn btn-ghost btn-sm gen-step-back" data-action="brief-back">‹ Back a step</button>`;
    }
    el.innerHTML = `<div class="gen-q${fromBack ? " from-back" : ""}">${html}</div>`;
  }

  // Steps 1 & 2 auto-advance off a single tap: mark the chip picked, let its
  // pop play, then move on — Duolingo-style, no Next button needed.
  function briefSelectAndAdvance(el, apply) {
    if (briefAdvancing) return;
    briefAdvancing = true;
    apply();
    $$("#genBriefStep .brief-opt").forEach((c) => c.classList.toggle("selected", c === el));
    setTimeout(() => goBriefStep(genBriefStep + 1), reduceMotion ? 0 : 380);
  }

  function briefAddLoc() {
    const input = $("#briefLocInput");
    const val = (input.value || "").trim();
    if (!val) {
      if (window.FX) FX.wiggle(input);
      return;
    }
    Store.addLocation(val); // saved for good, same list Settings/calendar use
    input.value = "";
    briefSelectAndAdvance(null, () => { genBrief.location = val; });
  }

  function briefDayNext() {
    const input = $("#briefDayInput");
    const val = input.value;
    if (!val) {
      if (window.FX) FX.wiggle(input);
      return;
    }
    briefSelectAndAdvance(null, () => { genBrief.date = val; });
  }

  function briefToggleVibe(el) {
    const tag = el.dataset.val;
    if (genBrief.tags.has(tag)) {
      // Never let the last vibe go — a batch needs at least one kind of post.
      if (genBrief.tags.size === 1) {
        if (window.FX) FX.wiggle(el);
        return;
      }
      genBrief.tags.delete(tag);
    } else {
      genBrief.tags.add(tag);
    }
    el.classList.toggle("selected", genBrief.tags.has(tag));
  }

  function briefCook(el) {
    const key = genBrief.date || Notify.todayStr();
    genLocation = genBrief.location;
    genDay = weekdayName(key);
    genDateLabel = `${genDay}${genLocation ? " at " + genLocation : ""}`;
    if (el && window.FX) FX.pop(el);
    // The satisfying bit: the bar sweeps its last quarter to full, THEN the
    // cooking starts — same premium ease the steps use.
    $("#genBriefBar").style.width = "100%";
    const track = $("#genBriefBar").parentElement;
    if (track) track.setAttribute("aria-valuenow", "4");

    // Wait out the bar's fill sweep (0.8s in CSS) so you actually see it reach
    // 100% before the deck starts cooking.
    setTimeout(() => runGenerate(), reduceMotion ? 0 : 850);
  }

  async function runGenerate() {
    if (genBusy) return;
    refreshPoolUi(); // keep the single/collage "photos loaded" notes current
    keepers = [];
    keptTotal = 0;
    deckCursor = 0;
    const info = $("#genInfo");
    if (!photoPool.length) {
      info.textContent = "";
      $("#genEmpty").innerHTML =
        (window.Mascot ? Mascot.html("relaxing", { size: "lg", className: "mascot-center" }) : "") +
        '<p class="hint">Add some chicken photos first — Settings → 📸 My chicken photos — then come back for a fresh batch.</p>';
      genShow("empty");
      return;
    }
    genBusy = true;
    info.textContent = "";
    $("#genLoading").innerHTML =
      (window.Mascot ? Mascot.html("loading", { anim: "jog", size: "lg", className: "mascot-center" }) : "") +
      '<p class="hint" style="text-align:center">Cooking up posts…</p>';
    genShow("loading");
    genDeck = await buildGeneratedPosts();
    genBusy = false;
    if (!genDeck.length) {
      info.textContent = "";
      $("#genEmpty").innerHTML =
        (window.Mascot ? Mascot.html("confused", { size: "lg", className: "mascot-center" }) : "") +
        '<p class="hint">Couldn\'t whip any up — add a few more photos or captions in Settings and try again.</p>';
      genShow("empty");
      return;
    }
    info.textContent = `${genDeck.length} fresh posts for ${genDateLabel}. Swipe to sort.`;
    genShow("deck");
    renderDeck();
  }

  async function buildGeneratedPosts() {
    await Imaging.ensureFonts();
    const ctx = { location: genLocation, day: genDay, menuItems: Store.getMenuItems() };
    // The vibe picked in the brief decides which hook tags feed the batch.
    const tags = genBrief.tags.size ? [...genBrief.tags] : ["location", "other", "brand"];
    const usedHookIds = [];
    const out = [];
    // Decode a handful of distinct photos once (decoding is the slow bit), then
    // reuse them across the batch — the caption is what makes each card different.
    const imgs = [];
    for (const f of shuffleArr(photoPool).slice(0, GEN_TARGET)) {
      try { imgs.push(await Imaging.loadImageFromFile(f)); } catch (e) { /* skip a bad file */ }
    }
    if (!imgs.length) return out;
    const styleOrder = shuffleArr(CAPTION_STYLES); // varied but every style shows
    let guard = 0;
    while (out.length < GEN_TARGET && guard < GEN_TARGET * 4) {
      guard++;
      const img = imgs[out.length % imgs.length];
      let picked = null;
      for (const tag of shuffleArr(tags)) {
        const r = Hooks.choose(tag, ctx, usedHookIds[usedHookIds.length - 1]);
        if (r && !usedHookIds.includes(r.hook.id) && !binnedHookIds.has(r.hook.id)) { picked = r; break; }
      }
      if (!picked) {
        // Relaxed retry (no exclude-last) — but only within the picked vibes,
        // so an events-only brief never gets padded out with brand hype.
        for (const tag of tags) {
          const r = Hooks.choose(tag, ctx);
          if (r && !usedHookIds.includes(r.hook.id) && !binnedHookIds.has(r.hook.id)) { picked = r; break; }
        }
      }
      if (!picked) break; // out of fresh captions — stop with what we have
      usedHookIds.push(picked.hook.id);
      // The image gets a SHORT overlay line (locked pair from the hook's
      // `overlays` in streetfood_hooks.json) while the full caption + hashtags
      // go underneath — same joke, two parts, so the post reads as one thought.
      const ovs = picked.hook.overlays;
      const overlayRaw = ovs && ovs.length ? ovs[Math.floor(Math.random() * ovs.length)] : picked.filledText;
      const overlayText = Hooks.fillText(overlayRaw, { location: ctx.location, day: ctx.day, item: picked.item });
      // Burn it on as a solid, tilted sticker in a rotating on-brand style
      // (per-card angle/size jitter). The captioned image is kept as the post's
      // source so the sticker stays baked in when shared.
      const base = styleOrder[out.length % styleOrder.length];
      const style = {
        ...base,
        sticker: true,
        angle: (base.angle || 0) + (Math.random() * 3 - 1.5),
        sizeScale: (base.sizeScale || 1) * (0.95 + Math.random() * 0.12),
      };
      const canvas = Imaging.renderSingle(img, overlayText, style);
      const dataUrl = Imaging.toDataURL(canvas);
      let composite = img;
      try { composite = await Imaging.loadImageFromUrl(dataUrl); } catch (e) { /* fall back to raw */ }
      out.push({
        img: composite,
        rawImg: img, // the photo WITHOUT the sticker (for repositioning in Customise)
        style,       // the per-card jittered sticker style (to re-seed the overlay)
        dataUrl,
        overlayText,
        filledText: picked.filledText,
        hook: picked.hook,
        hashtags: "\n\n" + buildHashtagBlock(genLocation),
      });
    }
    return out;
  }

  /* ---- swipe deck ---- */
  function buildSwipeCard(g, depth) {
    const card = document.createElement("div");
    card.className = "swipe-card depth-" + depth;
    card.innerHTML =
      `<img src="${g.dataUrl}" alt="Generated post with caption" draggable="false" />` +
      `<div class="swipe-cap">${escapeAttr(g.filledText + " " + (g.hashtags || "").trim())}</div>` +
      `<span class="swipe-badge keep">KEEP</span>` +
      `<span class="swipe-badge nope">NOPE</span>`;
    return card;
  }

  // Full (re)build — used on the first render and "New batch".
  function renderDeck() {
    const deck = $("#genDeck");
    deck.innerHTML = "";
    const total = genDeck.length;
    if (deckCursor >= total) return showKeepers();
    $("#genProgress").textContent = `${deckCursor + 1} / ${total}`;
    // Render up to three stacked cards; appended last = on top.
    const end = Math.min(total, deckCursor + 3);
    for (let i = end - 1; i >= deckCursor; i--) {
      const card = buildSwipeCard(genDeck[i], i - deckCursor);
      deck.appendChild(card);
      if (i - deckCursor === 0) attachDrag(card);
    }
  }

  // After a swipe decision: instead of tearing the deck down and rebuilding it
  // (which snaps the next card in at full size), reuse the existing card
  // elements and PROMOTE them up one level. Because each promoted card keeps
  // its identity, changing its depth class animates its transform — so the new
  // top card scales up from the stacked size into place with premium easing.
  function advanceDeck() {
    const deck = $("#genDeck");
    const total = genDeck.length;
    const gone = deck.querySelector(".swipe-card.depth-0");
    const d1 = deck.querySelector(".swipe-card.depth-1");
    const d2 = deck.querySelector(".swipe-card.depth-2");
    if (gone) gone.remove();
    if (deckCursor >= total) return showKeepers();
    $("#genProgress").textContent = `${deckCursor + 1} / ${total}`;
    if (!d1) return renderDeck(); // fewer than 2 were showing — safe rebuild
    if (d2) d2.className = "swipe-card depth-1";
    d1.className = "swipe-card depth-0";
    // Premium scale-up reveal (skipped under reduced motion — the class-driven
    // transform change would otherwise use the bouncier default spring).
    if (!reduceMotion) d1.style.transition = "transform 0.32s var(--ease-premium)";
    attachDrag(d1);
    // Bring a fresh card in at the back (first child = furthest back) if any left.
    const backIndex = deckCursor + 2;
    if (backIndex < total) deck.insertBefore(buildSwipeCard(genDeck[backIndex], 2), deck.firstChild);
  }

  function attachDrag(card) {
    if (reduceMotion) return; // buttons are the swipe replacement under reduced motion
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
    const keepB = card.querySelector(".swipe-badge.keep");
    const nopeB = card.querySelector(".swipe-badge.nope");
    card.addEventListener("pointerdown", (e) => {
      dragging = true; startX = e.clientX; startY = e.clientY; dx = dy = 0;
      card.style.transition = "none";
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX; dy = e.clientY - startY;
      card.style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx * 0.05}deg)`;
      const t = Math.min(1, Math.abs(dx) / 100);
      keepB.style.opacity = dx > 0 ? t : 0;
      nopeB.style.opacity = dx < 0 ? t : 0;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = "";
      if (dx > 90) return flyOff("right");
      if (dx < -90) return flyOff("left");
      card.style.transform = "";
      keepB.style.opacity = 0; nopeB.style.opacity = 0;
    };
    card.addEventListener("pointerup", release);
    card.addEventListener("pointercancel", release);
  }

  function flyOff(dir) {
    const top = $("#genDeck").querySelector(".swipe-card.depth-0");
    if (!top || reduceMotion) return decideCard(dir);
    top.style.transition = "transform .3s var(--spring), opacity .3s ease";
    const x = dir === "right" ? window.innerWidth : -window.innerWidth;
    top.style.transform = `translate(${x}px, 40px) rotate(${dir === "right" ? 18 : -18}deg)`;
    top.style.opacity = "0";
    setTimeout(() => decideCard(dir), 250);
  }

  function decideCard(dir) {
    const g = genDeck[deckCursor];
    if (!g) return;
    if (window.Sound) Sound.play(dir === "right" ? "swipe-keep" : "swipe-nope");
    if (dir === "right") { keepers.push(g); keptTotal++; if (window.FX) { FX.buzz(6); FX.heart(); } }
    else { binnedHookIds.add(g.hook.id); }
    deckCursor++;
    advanceDeck();
  }

  // A native <input type="date"> always renders in the browser/OS locale and
  // always includes the year — that's not restylable, so the keeper cards show
  // our own short "15/7" label with the real input sitting invisibly on top of
  // it (which keeps the native picker and the value). Queueing is a near-term
  // thing, so the year is noise (owner's call); the picker still shows it.
  // Hiding the native input also hid its built-in calendar indicator, so the
  // field draws its own — same outline glyph as the bottom-nav calendar rather
  // than a second 🗓 emoji next to the queue button's.
  const KEEPER_DATE_ICON =
    '<svg class="keeper-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" ' +
    'd="M7 3v3M17 3v3M3.5 9.5h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 ' +
    '1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Z"/></svg>';

  function fmtKeeperDate(iso) {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y || !m || !d) return "Pick a day";
    return `${d}/${m}`;
  }
  function syncKeeperDateLabel(inp) {
    const field = inp.closest(".keeper-date-field");
    const label = field && field.querySelector(".keeper-date-label");
    if (label) label.textContent = fmtKeeperDate(inp.value);
  }

  function showKeepers() {
    genShow("keepers");
    $("#genInfo").textContent = "";
    const wrap = $("#genKeepers");
    if (!keepers.length) {
      // Only offer a fresh batch once there's nothing left to act on — either
      // nothing was kept this round, or everything kept has now been posted.
      const message = keptTotal
        ? "All posted — nice work! 🎉"
        : "None kept this round — no worries.";
      wrap.innerHTML =
        `<div class="gen-empty">` +
        (window.Mascot ? Mascot.html("sad", { size: "lg", className: "mascot-center" }) : "") +
        `<p class="hint">${message}</p>` +
        `<button class="btn btn-accent" data-action="gen-regenerate">🔀 Generate more</button>` +
        `<button class="btn btn-ghost btn-sm" data-action="gen-brief">🎛 Change the brief</button>` +
        `</div>`;
      return;
    }
    const today = Notify.todayStr();
    const tomorrow = Notify.todayStr(new Date(Date.now() + 86400000));
    // If the brief was for a future day, that's the natural queue date too.
    const queueDefault = genBrief.date && genBrief.date > today ? genBrief.date : tomorrow;
    let html = `<p class="lead">You kept ${keepers.length} 🎉</p>` +
      `<p class="hint">Post one now, tweak it, or queue it for a day at the pitch.</p><div class="keeper-list">`;
    keepers.forEach((g, i) => {
      const cap = (g.filledText || "").split("\n")[0];
      html +=
        `<div class="keeper">` +
        `<img src="${g.dataUrl}" alt="Kept post" />` +
        `<div class="keeper-body"><p class="keeper-cap">${escapeAttr(cap)}</p>` +
        `<div class="keeper-actions">` +
        `<button class="btn btn-primary btn-sm" data-keeper-post="${i}">📤 Post</button>` +
        `<button class="btn btn-secondary btn-sm" data-keeper-edit="${i}">✏️ Customise</button>` +
        `</div>` +
        `<div class="keeper-queue">` +
        `<label class="keeper-date-field">` +
        KEEPER_DATE_ICON +
        `<span class="keeper-date-label" aria-hidden="true">${fmtKeeperDate(queueDefault)}</span>` +
        `<input type="date" class="keeper-date" min="${today}" value="${queueDefault}" aria-label="Queue for date" />` +
        `</label>` +
        `<button class="btn btn-secondary btn-sm" data-keeper-queue="${i}">🗓 Queue for later</button>` +
        `</div></div></div>`;
    });
    html += `</div>`;
    wrap.innerHTML = html;
    // The invisible native input supplies the picker + value; our own label is
    // what's actually read, so keep it in step with whatever day they pick.
    wrap.querySelectorAll(".keeper-date").forEach((inp) =>
      inp.addEventListener("change", () => syncKeeperDateLabel(inp))
    );
    if (window.FX) FX.confetti({ quiet: true });
  }

  // After sharing a keeper, come back to the tray to handle the rest (the
  // just-posted one is dropped so it doesn't invite a double-post). Keeps the
  // other keepers intact — reopening Generate would re-roll a fresh batch.
  function returnToKeepers() {
    const ref = post.keeperRef;
    if (ref) {
      const idx = keepers.indexOf(ref);
      if (idx >= 0) keepers.splice(idx, 1);
    }
    post = freshPost();
    navDir = "back";
    show("generate");
    showKeepers();
  }

  // Seed the live `post` from a generated item (shared by Post & Customise).
  function seedPostFromGen(g) {
    post = freshPost();
    post.type = "single";
    post.singleImage = g.img;
    // A customised keeper's g.img is the editor's finished export (already the
    // right aspect — it may have been reframed to Portrait/Story). Feed it in as
    // the prepared base so composePostImage draws it AS-IS instead of re-cropping
    // it back to a square via renderSingle. Default (un-customised) keepers keep
    // the renderSingle path so the rare raw-image fallback still gets squared.
    if (g.customised && g.img) post.baseImage = g.img;
    post.tag = "location";
    post.location = genLocation;
    post.day = genDay;
    post.caption = { hook: g.hook, filledText: g.filledText, item: null };
    post.captionText = g.filledText + (g.hashtags || "");
    post.hashtagBlock = g.hashtags || "";
    post.keeperRef = g; // so Review can offer "back to my kept posts" after sharing
  }

  // Customise a kept post: open the RAW photo in the FULL editor with the
  // sticker as a MOVABLE overlay (not baked on). The owner can drag/recolour the
  // sticker AND reframe the photo — the aspect chips (Square/Portrait/Landscape/
  // Story), zoom and pan crop the original photo, so this is a real re-crop, not
  // a zoom into an already-squared image (which is why the background is the raw
  // photo here, not a pre-composed square). Filters/adjust come along too. We
  // land on the Text tab so the sticker stays the primary focus; the crop
  // controls sit right above it. On "Save", the customised image + caption go
  // back into the keeper (see saveCustomiseToKeeper) and you return to the tray
  // to post/schedule from there. Falls back to the plain caption screen for
  // older keepers that predate rawImg/style (e.g. a restored session).
  async function customiseKeeper(i) {
    const g = keepers[i];
    if (!g) return;
    if (!g.rawImg || !g.style) return customiseKeeperCaption(g);
    seedPostFromGen(g);
    post.fromGenerate = true;
    await Imaging.ensureFonts();
    setEditorChrome("generate", "Customise post");
    show("editor"); // show first so the editor can measure its real width
    // Background = the raw photo itself (no baked sticker). With no state the
    // editor defaults to Square / zoom 1 / centred, which cover-fits the photo
    // identically to the card's default bake, so nothing shifts until you reframe.
    if (g.editState) {
      // Re-customising: restore the sticker AND the last reframe exactly.
      Editor.open(g.rawImg, g.editState, { hookProvider: makeHookProvider(), selectFirst: true, startTab: "text" });
      return;
    }
    // First customise: seed the sticker overlay at the EXACT default bake
    // position by measuring it once off-screen, so it opens where the card showed it.
    const mctx = document.createElement("canvas").getContext("2d");
    const pos = Imaging.paintSticker(mctx, 1080, 1080, {
      text: g.overlayText, fillRGB: g.style.fillRGB, color: g.style.color,
      angle: g.style.angle, scale: g.style.sizeScale,
    });
    const seed = {
      id: "ov_sticker", kind: "sticker", text: g.overlayText,
      fillRGB: g.style.fillRGB, color: g.style.color,
      cx: pos ? pos.cx : 0.5, cy: pos ? pos.cy : 0.82,
      size: 9 * (g.style.sizeScale || 1), rot: g.style.angle || 0,
    };
    Editor.open(g.rawImg, { overlays: [seed] }, { hookProvider: makeHookProvider(), selectFirst: true, startTab: "text" });
  }

  // "✓ Save & back to my posts" on the customise-preview Review: write the
  // customised image + caption (and the editor state, so a later re-customise
  // resumes where you left off) back into the keeper, then return to the tray.
  function saveCustomiseToKeeper() {
    const g = post.keeperRef;
    if (g) {
      if (post.baseImage) g.img = post.baseImage; // reframed photo + repositioned sticker
      if (post.finalDataUrl) g.dataUrl = post.finalDataUrl; // tray thumbnail / queue draft
      g.customised = true; // g.img is now a finished export (possibly non-square) — post it as-is
      g.filledText = post.captionText; // full edited caption…
      g.hashtags = "";                 // …with hashtags already folded in
      if (post.editState) g.editState = post.editState;
    }
    post = freshPost();
    navDir = "back";
    show("generate");
    showKeepers();
  }

  // The old customise path — straight to the caption screen (no repositioning).
  function customiseKeeperCaption(g) {
    seedPostFromGen(g);
    $("#captionText").value = post.captionText;
    updateHashtagBtnLabel();
    const back = document.querySelector('[data-screen="caption"] .back');
    if (back) back.dataset.back = "generate";
    renderCaptionPreview();
    show("caption");
  }

  async function postKeeper(i) {
    const g = keepers[i];
    if (!g) return;
    if (window.Sound) Sound.play("swipe-keep");
    seedPostFromGen(g);
    $("#captionText").value = post.captionText; // buildReview reads the textarea
    await buildReview();
    const rb = document.querySelector('[data-screen="review"] .back');
    if (rb) rb.dataset.back = "generate";
  }

  // Park a keeper on the calendar for a future day — unlike the notes-only
  // queue-add flow (queueAdd), this saves the fully composed image (caption
  // already baked on, same as Post) as a Blob in Drafts so "Make" on the
  // queue/calendar can hand back a ready-to-share post, not just a reminder.
  async function queueKeeper(i, dateStr, btn) {
    const g = keepers[i];
    const row = btn && btn.closest(".keeper-queue");
    if (!g || !dateStr) {
      if (window.FX && row) FX.wiggle(row);
      return;
    }
    let draftId = null;
    if (window.Drafts && Drafts.supported) {
      draftId = "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
      const ok = await Drafts.save({ id: draftId, blob: Imaging.dataUrlToBlob(g.dataUrl), type: "image/png" });
      if (!ok) draftId = null;
    }
    Store.addQueueItem({
      id: "q_" + Date.now(),
      date: dateStr,
      location: genLocation || "",
      caption: g.filledText,
      hashtags: g.hashtags || "",
      hookId: g.hook.id,
      draftId,
      created: new Date().toISOString(),
      done: false,
    });
    if (btn) { btn.disabled = true; btn.textContent = "✓ Queued"; }
    if (window.FX && btn) FX.sparkle(btn, { count: 10 });
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
    // Also save these into the permanent stash — see onFolderPicked.
    if (window.Photos && Photos.supported) Photos.add(files);
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
    if (!posts.length) {
      mascotEmpty(empty, "sad", "No posts yet — once you share a few, they'll show up here to reuse.");
      return;
    }
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

  let queueUrls = []; // object URLs for queue thumbnails, revoked on re-render

  async function renderQueue() {
    const today = Notify.todayStr();
    const items = Store.getQueue().slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const list = $("#queueList");
    const empty = $("#queueEmpty");
    queueUrls.forEach((u) => URL.revokeObjectURL(u));
    queueUrls = [];
    list.innerHTML = "";
    if (!items.length) {
      mascotEmpty(empty, "sleeping", "Nothing queued yet — add one below.");
      return;
    }
    empty.hidden = true;
    for (const it of items) {
      const row = document.createElement("div");
      const due = it.date && it.date <= today;
      row.className = "queue-item" + (due ? " is-due" : "");
      const loc = it.location ? ` · <span class="queue-loc">${escapeAttr(it.location)}</span>` : "";
      const cap = it.caption ? `<div class="queue-cap">${escapeAttr(it.caption)}</div>` : "";
      let thumb = "";
      if (it.draftId && window.Drafts) {
        const rec = await Drafts.get(it.draftId);
        if (rec && rec.blob) {
          const url = URL.createObjectURL(rec.blob);
          queueUrls.push(url);
          thumb = `<img class="queue-thumb" src="${url}" alt="Queued post" />`;
        }
      }
      row.innerHTML =
        thumb +
        `<div class="queue-body"><div class="queue-when">${fmtQueueDate(it.date)}${due ? " · today" : ""}${loc}</div>${cap}</div>` +
        `<div class="queue-actions">` +
        `<button class="btn btn-primary btn-sm" data-q-make="${it.id}">${it.draftId ? "📤 Post" : "Make"}</button>` +
        `<button class="queue-x" data-q-del="${it.id}" aria-label="Remove">✕</button></div>`;
      list.appendChild(row);
    }
  }

  function queueAdd(btn) {
    const date = $("#queueDate").value;
    const err = $("#queueError");
    if (!date) {
      err.textContent = "Pick a day first.";
      if (window.FX) FX.wiggle(err);
      return;
    }
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
    if (window.FX && btn) FX.sparkle(btn, { count: 14 }); // little reward puff
  }

  // Turn a queued item into a live post. A plain note-only item still goes
  // through the full photo/caption flow; a keeper queued with "Queue for
  // later" already has a composed image saved in Drafts, so it jumps
  // straight to review instead — the whole point of queuing it that way.
  async function makeFromQueue(item) {
    if (!item) return;
    if (item.draftId) return postFromDraft(item);
    post = freshPost();
    post.fromHistory = true;
    post.location = item.location || "";
    post.tag = item.location ? "location" : "brand";
    post.day = weekdayName(item.date);
    post.captionText = item.caption || "";
    post.caption = null;
    startSingle();
  }

  async function postFromDraft(item) {
    const rec = window.Drafts && (await Drafts.get(item.draftId));
    if (!rec || !rec.blob) {
      // The draft vanished (cleared storage, etc.) — fall back to the
      // notes-only flow so the queue item still isn't a dead end.
      post = freshPost();
      post.fromHistory = true;
      post.location = item.location || "";
      post.tag = item.location ? "location" : "brand";
      post.day = weekdayName(item.date);
      post.captionText = item.caption || "";
      post.caption = null;
      startSingle();
      return;
    }
    const url = URL.createObjectURL(rec.blob);
    let img;
    try { img = await Imaging.loadImageFromUrl(url); } finally { URL.revokeObjectURL(url); }
    post = freshPost();
    post.type = "single";
    post.singleImage = img;
    // The draft blob is already a finished, composed post (caption/sticker baked
    // on, at whatever aspect it was reframed to) — draw it AS-IS rather than
    // letting composePostImage re-crop it back to a square via renderSingle.
    post.baseImage = img;
    post.fromHistory = true;
    post.tag = item.location ? "location" : "brand";
    post.location = item.location || "";
    post.day = weekdayName(item.date);
    post.caption = item.hookId ? { hook: { id: item.hookId }, filledText: item.caption, item: null } : null;
    post.captionText = (item.caption || "") + (item.hashtags || "");
    post.hashtagBlock = item.hashtags || "";
    $("#captionText").value = post.captionText;
    await buildReview();
    const rb = document.querySelector('[data-screen="review"] .back');
    if (rb) rb.dataset.back = "queue";
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
    if (window.FX) FX.pop(note);
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
    if (window.FX) FX.pop(note);
  }

  /* ---------- APP FONT ---------- */
  // Swaps the `data-font` attribute on <html>, which flips --font-family in
  // css/styles.css — every element inherits from html,body, so this one
  // attribute change reskins the whole app. "poppins" is the built-in
  // default (no override rule needed, so clearing the attribute is enough).
  function applyFont(id) {
    if (id && id !== "visuelt") document.documentElement.setAttribute("data-font", id);
    else document.documentElement.removeAttribute("data-font");
  }

  function renderFontPicker() {
    const wrap = $("#fontChips");
    if (!wrap) return;
    const current = Store.getFont();
    wrap.innerHTML = (window.APP_CONFIG.FONTS || [])
      .map(
        (f) =>
          `<button type="button" class="chip font-chip${f.id === current ? " selected" : ""}" data-font-option="${f.id}" style="font-family:'${f.label}'" title="${f.blurb}">${f.label}</button>`
      )
      .join("");
  }

  function pickFont(id) {
    Store.setFont(id);
    applyFont(id);
    renderFontPicker();
    if (window.FX) FX.pop($(`[data-font-option="${id}"]`));
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
