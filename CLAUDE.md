# CLAUDE.md — Project Memory

Living notes for working in this repo. Update as decisions and gotchas accumulate.

## What this is
"Chuckling Wings — Wingman": an offline-first PWA that helps a street-food trader
build social posts (single photo / collage / carousel), get a pre-written caption
with location & day filled in, and share via the system share sheet. No build step —
plain HTML/CSS/JS that runs by opening `index.html` directly (`file://`) or via a
static server.

## Run / preview
- `npm start` — serves the folder at http://localhost:5173 (via `serve@14`).
- Opening `index.html` directly also works; service worker / installability only
  activate over https or localhost.

## Layout
- `index.html` — all screens live here as `<section class="screen" data-screen="...">`.
  Navigation is data-attribute driven: `data-action`, `data-nav`, `data-back`.
- `css/styles.css` — all styling. Button system: `.btn` + variants
  (`.btn-primary/-secondary/-accent/-ghost`, `.btn-xl` = hero size, `.btn-sm`).
- `js/app.js` — main app logic/router. Other `js/*.js` are focused modules
  (editor, imaging, publish, store, weather, etc.), loaded via `<script>` tags at
  the bottom of `index.html`.
- Bottom nav (`.bottomnav`) is persistent across screens: New post, Calendar,
  Generate, Settings. It is the primary way to reach Calendar & Settings.

## Conventions / gotchas
- Home screen buttons animate in via `.home .btn:nth-of-type(n)` delays — adding/
  removing home buttons shifts those, but it's cosmetic only.
- Back buttons use `class="back"` with just the `‹` glyph (no "Back" text); they
  carry `aria-label="Back"` for screen readers and a 44px min tap target.
- `data-back` value is the screen to return to (empty string = default/home flow).
- Every `show(screen)` call also pushes a browser history entry (see the
  History API gotcha below) — don't bypass `show()` to toggle `.is-active`
  directly, or the hardware/gesture back button will desync from what's on
  screen.
- **History API gotcha**: this is a screen-switching SPA with no other pages,
  so it never used to touch `history` at all — meaning only the in-app "‹"
  arrows worked, and the phone's own back button/gesture tried to navigate
  the browser away from the page, landing on a blank white screen (see
  Notable changes, 2026-07-12). Fixed by having `show()` push a history entry
  per navigation and a `popstate` listener re-show whichever screen that
  entry belongs to. If you add a new way to change screens, route it through
  `show()` (don't hand-roll `.is-active` toggling) or it'll reintroduce the
  white-screen bug for that path.
- Cross-script modules use the `const X = (()=>{})()` IIFE pattern. A top-level
  `const` in a classic `<script>` is a lexical global (reachable by bare name,
  e.g. `Store`, `Photos`) but is NOT a property of `window` — so any
  `if (window.X)` guard needs the module to also do `window.X = X` (see the tail
  of `js/photos.js`, and `window.FX = …` in `js/fx.js`).
- App version string lives in one place: `#appVersion` at the bottom of the home
  screen in index.html (currently `v0.09`).
  - ⭐ **RULE (do this automatically, never ask):** every shipped feature or
    enhancement MUST bump `#appVersion` in the *same* change, before committing.
    Increment the patch (v0.03 → v0.04) for a normal feature/enhancement. The owner
    should never have to ask for a version bump — it just happens.

## Roadmap ideas (from a competitor review, 2026-07-12)
A pass benchmarking this app against Buffer/Later/Planoly/Meta Business Suite/
Canva and the 2026 food-truck marketing playbook (short-form video + Google
Business Profile) turned up gaps + a prioritized backlog. **Built so far:**
Story export (9:16), "Queue for later", backup/restore (see Notable changes
below). **Not yet built, roughly in priority order:**
- Quick wins: recurring workdays ("every Friday = Greenwich"), hashtag sets per
  location, tag stash photos by dish (fixes Generate photo/caption mismatch),
  static best-time-to-post nudge.
- Medium: basic video/Reels sharing (pick a clip → caption → share sheet, no
  editing), visual history + grid preview (the composite image is already a
  blob at share time, just isn't saved), post insights via the Meta Graph API
  (credentials already stored), carousel parity (per-frame edit + direct
  publish), open-when-due auto-publish for due queue items, weather-aware
  nudges (the pieces — weather buckets, weather-pinned hooks, reminders — all
  exist but aren't linked), a Google Business Profile helper workflow.
- Bigger bets: a Capacitor wrap (the code already anticipates this in
  `notify.js`/`share.js` comments — unlocks real background reminders/
  scheduling), real branded collage overlays (the overlay-PNG system in
  `renderCollage` exists and is unused — all 4 templates ship `overlay: null`),
  optional online-only AI caption assist (off by default — cuts against the
  app's offline/human-voice design, so low priority), a menu/price board
  generator reusing the imaging pipeline.
- Deliberately NOT recommended: team features, cloud sync, true background
  auto-publish, multi-account management — all need a server or a native wrap
  disproportionate to a single trader's app.

## Notable changes
- 2026-07-14: **Stall scene on the onboarding "Where do you trade?" step**
  (owner-supplied `chicken-stall.svg` → `assets/mascot/stall.svg`, replacing the
  `walk` pose). Registered as `stall` in js/mascot.js `POSES`/`ALT`. Version → v0.36.
  - **It's a SCENE, not a pose, and that changes three things:**
    - **Sized by width** via a new `.ob-scene` class, not `.mascot`. The artwork
      is landscape (247x186, aspect 1.33) and `.mascot` sizes by *height*
      (`height:140px; width:auto`), which rendered the whole stall — logo, text
      and all — as a ~139x104 thumbnail. `.ob-scene` uses `width: min(300px, 86%)`.
    - **Deliberately unanimated.** Every mascot animation is a whole-image
      transform (the SVG parts aren't grouped), and a rigid gazebo that sways,
      breathes or bobs is wrong physics. The waving chicken inside carries it.
    - viewBox cropped to the artwork (26% of its height was empty) — same
      `getBBox()`-vs-viewBox check as the `camera` pose. Owner's source is
      untouched at the repo root.
  - ⚠️ **Known issue — the stall is the same blue as the screen it sits on.**
    Measured: stall body/canopy `rgb(9,76,160)` vs the `.ob` gradient's
    `rgb(10,77,161)` — one value per channel apart, i.e. identical. The canopy
    and counter dissolve into the backdrop and the stall reads as floating
    poles; the tent's peak is invisible entirely. Mitigated with a
    `drop-shadow()` on `.ob-scene` which lifts the silhouette, but that's a
    patch — **the real fix is the artwork not being brand-blue on a brand-blue
    surface** (a lighter/cream stall, or an outline). Lesson for any future art
    on the onboarding gradient: check the fill palette against `--blue`
    (#0a4da1) before dropping it on there.
- 2026-07-14: **First-run onboarding** (`ob-welcome → ob-photos → ob-places →
  ob-done`, order driven by `OB_STEPS` in js/app.js). Fixes the first-run cliff:
  home's shiniest button is ✨ Generate, which with an empty stash dead-ended on
  "go to Settings → 📸 My chicken photos" — a screen the user hadn't found yet.
  - **Scope was set by measuring the hook library, not guessing**: photos are the
    only real unlock (Generate is dead without them); `{location}` drives 72/130
    hooks so pitches are worth a step (framed as *confirm* — they're already
    seeded from `DEFAULT_LOCATIONS`); `{item}` drives only 5/130 (4%), so best
    sellers did NOT earn a screen. Hashtags ship 30 seeded, Meta needs a token +
    Cloudinary + a doc, and reminders only fire while the app is open — all
    deliberately left out.
  - **Photos step is soft-gated**: Next enables at ≥1 photo, "Skip for now" is
    always live. Ends on "✨ Make my first posts" → straight into a working
    Generate (the payoff, not a "done" pat on the head).
  - **ob-welcome offers "I've got a backup file"** — new-phone path, reuses
    `#backupInput`/`Backup.restoreFile`, then marks onboarded and skips to home.
  - `Store.getOnboarded()/setOnboarded()` (key `sfp.onboarded`) gate it; only
    `finishOnboarding()` ever sets the flag, and every exit routes through it, so
    nobody can be stranded with `onboarded=false`. Settings → 🧭 Setup → "Run
    setup again" re-runs it (also how you test it).
  - **Gotchas hit, worth not re-learning:**
    - `boot()`'s `replaceState` must tag the entry with whichever screen actually
      opens — hardcoding `"home"` desyncs the back button on a first run (the
      documented History API trap). Onboarding also has to `show()` *before*
      `await Hooks.init()`, or home paints first and setup snaps over it.
    - **`.ob-body` needs explicit `overflow-x: hidden`** — setting only
      `overflow-y` makes the x axis compute to `auto`, handing it a sideways
      scrollbar the html/body lock can't reach (same trap as `.editor-scroll`).
    - **`.ob` uses `height`, not `min-height`** — with min-height the section
      grows on a short screen and the "pinned" bar/actions drift off it.
    - **`.ob-add .btn` needs `width: auto`** — `.btn` is `width:100%`, and with
      `flex: 0 0 auto` that becomes an unshrinkable 100% basis that shoves Add
      off a 320px screen (where `overflow-x:hidden` then clips it out of reach
      rather than scrolling to it). `min-width:0` on the input is not enough.
    - **Progress bar**: each step owns its own `.ob-bar`, and a width set while
      the section is `display:none` lands with no transition — so `obGo` parks
      the bar at the previous step's width, `show()`s, forces a reflow
      (`void bar.offsetWidth`), then sets the target. Deliberately not rAF: that
      makes the *correct final width* depend on frames running (it silently
      stuck on the old step in a throttled tab).
    - Both openers of `#backupInput` must set `obRestoring` explicitly —
      cancelling a file picker fires no event, so a flag only cleared on success
      stays set and hijacks the next restore.
    - The confirm-skip on restore is gated on `!Store.getOnboarded()` (a genuine
      first run), **not** on `obRestoring` — "Run setup again" walks a loaded
      phone back to the same restore button, and that device has real data.
  - Mascot poses per step: `wave` (mascot-wave), **`camera`** (mascot-breathe),
    `walk` (**mascot-sway**, not bob — bob is a translateY hover that reads as
    floating, wrong physics under a walking pose), `excited` (mascot-win, which
    hands off to breathe inside the class). All four already in the
    reduced-motion disable list.
  - **New 16th pose `camera`** (owner-supplied `chicken-camera.svg`, a winking
    chicken taking a photo) — added to `POSES` + `ALT` in js/mascot.js and used
    on ob-photos, where it invites the action instead of the `thinking` pose
    pondering it. `assets/mascot/camera.svg` is a straight copy of the owner's
    re-export (viewBox `0 0 250 250`); the source stays at the repo root.
  - **Two gotchas from that pose worth remembering for future art drops:**
    - The first export's canvas was 1333x1180 around only 542x728 of artwork
      (59% empty width), so it rendered small and shoved left — `.mascot` sizes
      by height with `width:auto`, so an oversized canvas silently shrinks the
      pose. **Check `getBBox()` against the viewBox on any new pose.**
    - The eyeball's white was *transparent*, which nothing catches on the light
      screens — but onboarding is on the blue gradient, so the page showed
      through and the eye rendered as a solid blue disc. **Any pose used on a
      dark/coloured background needs its whites actually filled**, not left as
      holes. Both were fixed by the owner in the re-export.
  - Reviewed by Fable, which caught the confirm-skip hole, the dead progress-bar
    transition and the walk/bob physics. Version → v0.35.
- 2026-07-14 (later): **Keeper date box tightened + post dot done properly.**
  Version → v0.33.
  - **Keeper date field** is now content-sized (`flex: 0 0 auto`) instead of
    stretching to fill the row, which had left dead space right of "15/7". Hiding
    the native input also hid its built-in picker indicator, so the field draws
    its own calendar glyph (`KEEPER_DATE_ICON`, the bottom-nav outline icon
    rather than a second 🗓 next to the button's). Net width barely moved
    (72→71px) — the icon reclaimed the dead space; it's now tight against
    icon+gap+text+padding, so it can't shrink much further while keeping an icon.
    `.keeper-date-icon` is `pointer-events:none` so taps still reach the input.
  - **Post-button dot, final rule** (this superseded the v0.31 bullet below —
    the owner *does* want a dot, just only when on the post screen):
    `show()` hand-toggles `is-active` on `.navbtn:not([data-nav])` when
    `screen === "type"`. Why that's the whole rule: the bottom nav only renders
    on `HUB_SCREENS`, and **`type` is the only post-flow screen in that set** —
    single/editor/collage/quiz/details/caption/review all hide the nav entirely,
    so there's nowhere else a post dot could show and no ambiguity with the
    Generate→Customise→editor path. Three revisions total: always-on (wrong —
    claimed "you are here" everywhere) → removed → lit on `type` only.
- 2026-07-14: **Five small fixes** (nav dot, calendar confetti, heart length,
  keeper tray). Version → v0.31.
  - **Post-button dot**: ⚠️ superseded by the v0.33 entry above — the dot is now
    lit on the `type` screen. What was removed here was the v0.24 "standing
    accent" rule (`.navbtn:not([data-nav])::after`), which lit the post dot
    unconditionally so it read as "you are here" on every screen. The dot is the
    you-are-here marker (`.navbtn.is-active::after`); `show()` matches
    `.navbtn[data-nav]` against the screen, and the post button has no
    `data-nav` (it launches a flow), so it needs setting by hand — it is NOT
    true that it can never be active.
  - **No confetti when setting a day's pitch**: `celebrateWorkday` →
    `bounceWorkdayCell`, `FX.sparkle` → `FX.pop`. NB `sparkle()` = a quiet
    confetti puff **plus** `pop()`, so dropping to `pop` keeps the cell's
    tap-acknowledgement and loses only the celebration. Both callers
    (`pickCalLocation`, `addCalDayLocation`) share the helper.
  - **Heart trimmed** ~3.0s → ~1.6s: the source Lottie is 181f@60fps — heart
    pops, bursts (~f45), particles gone by ~f75, then it **holds a static heart
    to f118** where an *outline* heart fades in and lingers to the end. `heart()`
    now loads with `initialSegment: [0, HEART_END_FRAME]` (84) + a 200ms fade-out,
    killing the outline **and** the dead hold. `HEART_END_FRAME` is the one dial
    (anything ≤117 stays clear of the outline).
  - **Keeper tray had two "New batch" buttons**: `#genFolderRow` (index.html) is
    outside all the gen panels so it shows on *every* Generate state and already
    carries one — `showKeepers` injected a second. Removed the injected copies.
    Don't re-add one to a gen panel.
  - **Keeper date truncated → now "15/7"**: the card body is only ~240px (an
    84px thumb eats the rest); the queue button was `flex: 0 0 auto` at 149px,
    starving the date to 83px so it clipped ("2026/"). Same flexbox trap as the
    calendar add-place input — see the `min-width: 0` note above.
    **A native `<input type="date">` renders in the browser/OS locale and cannot
    be reformatted or restyled**, so the visible text is now our own
    `fmtKeeperDate(iso)` → `d/M` label, with the real input `position:absolute;
    inset:0; opacity:0` on top inside a `<label class="keeper-date-field">`.
    That keeps the native picker (overlay, not `showPicker()` — the latter needs
    newer iOS) and `.keeper-date`.value, so `queueKeeper` is untouched. A
    `change` listener resyncs the label. Year is dropped deliberately (owner) —
    a date queued into another year reads ambiguously; the picker still shows it.
  - **Gotcha (cost real time twice)**: `npm start`/`python http.server` send **no
    cache headers**, so browsers heuristically cache `js/*.js` and silently run
    **stale code** — a fix can look broken when it isn't. Tell: the resource's
    `transferSize` is 0 in `performance.getEntriesByType("resource")`. Clear with
    `fetch(url, {cache:"reload"})` over every `script[src]`/stylesheet, then
    reload. Preview-only; the live site is network-first via the SW.
  - **Gotcha**: the in-app preview tab is `visibility: hidden` with rAF fully
    paused (0 ticks/500ms), so Lottie/confetti/CSS-transition timing never run
    there — `flyOff` only advances because it uses `setTimeout`, not
    `transitionend`. Verify animation by asserting bounds/config, not by watching.
- 2026-07-13: **Swipe-right "like" heart (owner Lottie).** A red heart pops +
  bursts, centred, when a Generate card is kept (swiped/tapped right). Same
  Lottie setup as the confetti: `assets/lottie/heart.js` wraps the animation
  JSON as `window.HEART_LOTTIE` (loads over file://), `<script>` after the
  confetti data. `FX.heart()` (js/fx.js) mounts a `.fx-heart` centred overlay
  (240px, `pointer-events:none` so swiping continues underneath), `loop:false`,
  self-destroys on `complete` + 4s safety timeout; skipped under reduced motion.
  Fired from `decideCard` on the right decision alongside `FX.buzz(6)`. Version
  → v0.26.
- 2026-07-13: Home white (secondary) buttons lost their blue 2px border
  (`.home .btn-secondary { border: none }`) — owner: "the grey ones shouldn't
  have a dark outline"; the grey bottom shadow gives the depth now. Version →
  v0.25.
- 2026-07-13: **Service-worker cache fix (stale-version bug) + bigger nav dot.**
  The owner kept seeing old builds after a deploy. Root cause: the SW's
  network-first `fetch(request)` still used the browser HTTP cache, so it could
  serve a stale-but-"network" file. Fixes: SW now fetches with
  `cache: "no-store"` (truly fresh), cache name `v2`→`v3`; registration uses
  `updateViaCache: "none"` so `sw.js` itself is never HTTP-cached; and a
  `controllerchange` listener in index.html reloads the page once when a new SW
  takes control, so a deploy swaps in without a manual hard-refresh. Also
  bumped the bottom-nav dot 4px→6px so the (already-correct) orange post-button
  dot is actually visible. Version → v0.24. (If a user is still stuck, it's a
  device/PWA that needs a full close-reopen once to pick up the new SW.)
- 2026-07-13: **Home declutter, chunkier home buttons, rounded post icon,
  Lottie confetti.**
  - **Home mascot removed** (owner: too cluttered). Deleted the `#homeMascot`
    `<img>` from index.html; no JS referenced it, and it's an `<img>` not a
    `.btn`, so the `.home .btn:nth-of-type` stagger is unaffected.
  - **Home button edges more pronounced**: `.home .btn` box-shadow 4px → 6px,
    with a darker-orange edge (`#b0590a`) under the orange primary/accent
    buttons and a grey edge (`#a9b2bf`) under the white secondary ones; press
    seats to `translateY(6px)`. (Values are a best guess — owner referenced a
    button image that didn't upload; tweak to match when it arrives.)
  - **Bottom-nav post button**: icon swapped from a plus-in-a-circle to a
    plus-in-a-rounded-square (`<rect rx=5>`), and its orange dot is now always
    lit — `.navbtn:not([data-nav])::after { background: var(--orange) }` (the
    post button is the only navbtn without `data-nav`, since it launches a flow
    rather than a hub screen).
  - **Lottie confetti** (owner-supplied `DC_Confetti.lottie`): this reverses
    the old "no Lottie/Rive" stance **for confetti only**. Vendored
    `lottie-web` light SVG build → `js/vendor/lottie.min.js` (fetched via `npm
    pack lottie-web`, since unpkg is proxy-blocked but `registry.npmjs.org`
    isn't). The `.lottie` is a zip (manifest + bodymovin JSON); unpacked the
    animation JSON and wrapped it as `window.CONFETTI_LOTTIE` in
    `assets/lottie/confetti.js` so it loads over `file://` with no fetch. Both
    are `<script>`-loaded before `js/fx.js`. `FX.confetti()` now plays the
    Lottie full-screen (`.fx-lottie` overlay, `loop:false`, self-destroys on
    `complete` + an 8s safety timeout) for the **big win only** (`!opts.quiet`);
    the small localized `sparkle()` puffs and the quiet keeper-tray burst keep
    the canvas confetti (a full-screen Lottie can't originate from a tapped
    element). Falls back to the canvas burst if the runtime/data isn't loaded.
  - Verified headless: page loads clean (lottie + data present, no errors),
    mascot gone, post icon is a `<rect>`, post dot computes to the orange, home
    orange/white edges are the darker-orange/grey at 6px, and `FX.confetti()`
    mounts a `.fx-lottie` overlay that renders an animating SVG. Version → v0.23.
- 2026-07-13: **Sticker box-fill colour + horizontal scroll hard-lock.**
  - **Box fill colour (Customise sticker)**: sticker overlays now have a
    Letters/Box-fill target toggle (`#stickerTargetRow`, `data-sticker-target`,
    `.sticker-only` — shown only in `sticker-mode`). `editor.js` routes every
    colour source (swatch, 🎯 eyedropper `sampleColourAt`, 🎨 custom
    `colorInput`) through `applyChosenColor(hex)`, which sets `ov.fillRGB`
    (via `hexToRgb`) when the fill target is active, else `ov.color`.
    `stickerFillActive()`/`activeColorHex()` gate it; `syncTextPanel` highlights
    the swatch matching whichever colour is being edited and resets the target
    to Letters for non-sticker overlays / on `open()`. Both colours flow into
    `Imaging.paintSticker` (fillRGB = box, color = letters) so the draggable and
    exported stickers stay identical.
  - **Horizontal scroll hard-lock** (owner: dragging the size/rotate sliders
    panned the page like a web browser): `input[type="range"] { touch-action:
    none }` so a slider drag moves its thumb instead of scrolling, plus
    `html,body { overflow-x: hidden; overscroll-behavior-x: none }` to forbid
    sideways drift/rubber-band globally. The intentional horizontal-scroll rows
    (filter row, style chips, carousel thumbs) keep their own `overflow-x:auto`
    — no `pan-y` on body, which would have broken them.
  - Verified headless: box-fill toggle recolours the sticker box (green box +
    blue letters screenshot) while Letters still recolours the text; slider
    `touch-action` computes to `none`; body `overflow-x` is `hidden`; full
    customise→save flow clean. Version → v0.22.
- 2026-07-13: **Customise = edit-in-place → back to the tray, + SW cache bump.**
  Owner's desired flow for a kept Generate post: *Customise → editor → caption →
  Review (preview) → back to the keepers tray, then post/schedule from there* —
  i.e. Customise is purely an EDIT step now, not a path to sharing.
  - `buildReview` gained a **customise-preview mode**: when `post.fromGenerate`
    is set, it hides the share controls (now wrapped in `#reviewShareControls`),
    shows a **"✓ Save & back to my posts"** button (`#saveCustomise`,
    action `save-customise`) and titles the screen "Preview". Also stashes the
    composed preview as `post.finalDataUrl` (used for the keeper thumbnail).
  - `saveCustomiseToKeeper` writes the customised result back into the keeper
    object `g`: `g.img` = the raw photo + repositioned/recoloured sticker
    (`post.baseImage`), `g.dataUrl` = `post.finalDataUrl` (tray thumb / queue
    draft), `g.filledText` = the full edited caption with `g.hashtags = ""`
    (so `seedPostFromGen` reconstructs the same text), and `g.editState` =
    `post.editState`. Then returns to the tray (`showKeepers`). The keeper
    STAYS in the tray (unlike post-share `returnToKeepers`, which removes it) —
    you then tap Post/Queue on the now-customised card.
  - **Re-customise resumes**: `customiseKeeper` opens the editor from
    `g.editState` when present (sticker where you left it), else seeds a fresh
    default sticker. Background is always `renderSingle(g.rawImg, null)` — the
    clean photo — so the sticker is never double-baked.
  - **Colour swatches were the missing piece the owner hit**: they only ship in
    v0.20 (v0.19 hid `.text-swatches` in `sticker-mode`). Bumped the service-
    worker cache `wingman-cache-v1` → `v2` so stale clients purge old assets and
    actually pick up new versions (network-first already, this is belt-and-braces).
  - Verified headless: Customise → recolour + drag sticker → caption edit →
    Preview (share hidden, Save shown) → Save returns to tray with the
    thumbnail + caption updated and the keeper still present; Post-from-tray
    gives the normal share Review; re-customise reopens in sticker-mode. No
    console errors. Version → v0.21.
- 2026-07-13: **Sticker text colour + one app-wide easing + return-to-keepers.**
  - **Sticker text colour (Customise)**: the editor's colour swatches are no
    longer hidden in `sticker-mode` (css) — tapping one sets `ov.color`, which
    `drawStickerOverlay` feeds to `Imaging.paintSticker` as the text colour, so
    the owner can recolour the sticker's letters. Font-style/align/highlight
    stay hidden (the brand shape is fixed); eyedropper + custom-colour picker
    work too since they route through the same `setOverlayProp("color")`.
  - **One easing for the whole app** (owner wanted consistency, willing to
    revert): `--spring` and `--spring-smooth` now just alias `--ease-premium`
    (`cubic-bezier(0.22,1,0.36,1)`), so every transition/animation uses the one
    premium decelerate instead of the old bouncy `linear()` springs. Done by
    redefining the three tokens in `:root` — the 28+ `var(--spring)` use-sites
    are untouched, so **reverting is a one-block change**: restore the old
    `linear()` curves in `:root` (see git history) and nothing else moves.
    Swipe reveal duration trimmed 0.5s → 0.32s ("make it quicker").
  - **Return to keepers after posting** (the "clunky" post-customise workflow):
    sharing/publishing a Generate keeper used to dump you Home via "Done — back
    to start", and reopening Generate re-rolls a fresh batch — so the other
    kept posts were effectively lost. Now `seedPostFromGen` tags the live post
    with `keeperRef`; after a successful share/publish, `showDoneButton` offers
    "← Back to my kept posts" (`#doneKeepers`) instead of Home for keeper
    posts. `returnToKeepers` drops the just-posted keeper from `keepers` (no
    double-post) and re-shows the tray with the rest intact. Non-keeper posts
    still get "Done — back to start". Version → v0.20.
- 2026-07-12: **Repositionable Generate sticker + premium swipe reveal.**
  - **Movable sticker (Customise)**: previously `buildGeneratedPosts` baked the
    overlay line into the card image immediately (`renderSingle`), so by the
    time you liked a post the text was just pixels — unmovable. Now each card
    also keeps `rawImg` (the photo *without* the sticker) and its per-card
    jittered `style`. **Post** is byte-identical to before (shares the default
    bake, `g.dataUrl`/`g.img`); **✏️ Customise** now opens the photo in the
    editor's text-only mode with the sticker as a *movable overlay* so it can
    be dragged off the subject, then continues to the caption screen.
  - **One source of truth for the sticker look**: `drawCaptionSticker` was
    refactored into `Imaging.paintSticker(ctx, W, H, opts)` — position-
    parameterised (`opts.cx/cy` as fractions; defaults to the classic bottom-
    centre) and returns `{cx, cy, boxW, boxH}`. Both the baked-on sticker and
    the editor's draggable one render through it, so they're pixel-identical
    (no drift, unlike reusing the editor's generic text style — which draws one
    pill *per line* and force-recolours text). `drawCaptionSticker` is now a
    thin wrapper over it.
  - **Editor sticker overlay**: `editor.js` gained a `kind:"sticker"` overlay
    branch (`drawStickerOverlay`) that delegates rendering to
    `Imaging.paintSticker`; `size` drives the sticker scale (÷9 so the editor's
    default text size 9 = scale 1.0), `rot` the tilt, `cx/cy` the centre — so
    the existing drag/pinch/size/rotate machinery works on it for free. A
    `sticker-mode` class hides the style/colour/align/highlight controls (the
    brand look is fixed); text/size/rotate stay. `Editor.open` gained a
    `selectFirst` opt to pre-select the seeded sticker.
  - **Double-hashtag trap avoided** (Fable flagged this): the customise flow
    uses a new `post.fromGenerate` flag, NOT `fromHistory` — `editorNext`
    branches on it straight to the caption screen *without* re-running
    `applyHashtags` (which would append a second hashtag block, since
    `seedPostFromGen` already set caption+hashtags). Caption back-target is
    `editor` so the sticker can be re-dragged. Older keepers with no
    `rawImg`/`style` (e.g. a restored session) fall back to the old caption-
    only customise path (`customiseKeeperCaption`).
  - **Premium swipe reveal**: the swipe deck used to fully rebuild on every
    decision (`renderDeck` → `innerHTML=""`), so the next card *snapped* in at
    full size. New `advanceDeck` instead REUSES the card elements and promotes
    them up one depth class — because each card keeps its identity, the depth
    change animates its `transform`, so the new top card scales up from the
    stacked size into place. Uses a new `--ease-premium`
    (`cubic-bezier(0.22,1,0.36,1)`) confident decelerate rather than the
    bouncier default `--spring`. `renderDeck` still does the full build for the
    first render / "New batch"; `buildSwipeCard` is the shared card factory.
    Skipped under reduced motion.
  - Verified headless (Chromium, 390×844, `file://`): Generate → keep →
    Customise opens the editor in sticker-mode with the sticker selected at the
    default position; dragging it then continuing yields a caption with exactly
    ONE hashtag block and a working Review; Post still uses the default bake;
    the swipe reveal reuses+promotes the same card element with the premium
    inline transition; a full keep/nope run through all 10 cards reaches the
    keepers tray; reduced-motion buttons-only path still advances. No console
    errors. Version → v0.19.
- 2026-07-12: **Fixed the "back button white-screens the app" bug.** Root
  cause: the app is a pure client-side screen-switcher (`show(screen)` just
  toggles `.is-active`) that never touched the History API, so it never
  pushed any entries — only the in-app "‹" arrows (`data-back` + `handleBack`)
  worked. The phone's own back button/gesture tried to navigate the browser
  itself *away* from the page (there's nothing else to navigate to), landing
  on a blank document. Verified headless with `page.goBack()`: before the fix,
  a single browser-back from any mid-flow screen (e.g. Review) immediately
  blanked the page; confirmed this reproduced the bug, not just a hunch.
  - Fix (js/app.js): `show()` now also calls `history.pushState({screen},
    "", "")` on every navigation (guarded by a `suppressHistoryPush` flag). A
    new `popstate` listener re-shows whichever screen the popped entry
    belongs to, so hardware/gesture back now does exactly what the in-app
    arrow does — confirmed the two mechanisms resolve to the same screen at
    every step, including the dynamic Review-screen back targets (`generate`/
    `queue`/`caption` — these fall out naturally: pushState always records
    whichever screen was actually shown right before, so it doesn't need its
    own copy of that logic). `boot()` tags the page's existing initial entry
    as `{screen:"home"}` via `replaceState` so the very first popstate has
    something to resolve to. Pressing back from Home now correctly exits the
    app (there's nothing to suppress there) — matches normal back-button
    expectations, not a regression.
  - Verified headless: walked a full New Post flow to Review, then pressed
    the *real* browser back 9 times in a row — each step landed on the exact
    previous screen in order (review→caption→details→quiz→editor→single→
    type→home), and only the 9th (back *from* home) exited, as expected. Also
    re-verified the Generate-keeper and Queue-draft flows' dynamic back
    targets under a real browser-back, and cross-checked the in-app arrow
    still resolves the same way afterward. No console errors in any run.
  - **Sounds turned off for now** (owner feedback: not quite right yet).
    `<script src="js/sound.js">` removed from index.html so nothing plays;
    the Settings "🔊 Sounds" toggle removed too (would've been a dead
    control with the module unloaded). `js/sound.js` and `assets/sounds/*`
    are untouched in the repo — re-add the `<script>` tag (and the Settings
    toggle markup + its two small wireEvents/openSettings lines, see git
    history around this commit) to bring it back once the clips are revised.
    Version → v0.18.
- 2026-07-12: Fixed a recurring-annoyance bug: photos picked via **"📁 Use a
  folder"** (single/collage) or **"📁 Photo folder"** (Generate) only ever
  lived in the session `photoPool` — never saved, so they vanished on every
  reload and the owner had to re-pick a folder each time they opened the app.
  `onFolderPicked` and `onGenFolderPicked` (js/app.js) now also call
  `Photos.add(files)` to persist picked photos into the same stash Settings'
  "📸 Add photos" uses, so any photo source now sticks around for next time.
  Trade-off: re-picking the same folder in a later session adds duplicates to
  the stash (no de-dupe by content) — the existing Settings "Clear all"/✕
  per-photo remove handles that if it happens. Verified headless: picked a
  folder, reloaded the whole page, confirmed the photos were still in the
  stash and the pool note showed them loaded with no re-pick. Version → v0.17.
- 2026-07-12: **Backup & restore**, the third item off the competitor-
  benchmarking pass and the one closing the app's biggest data-loss risk
  (everything lived only in one browser profile, no export).
  - New `js/backup.js` (`window.Backup`, loaded after imaging.js since it
    needs `Imaging.dataUrlToBlob`): `build()` gathers every `Store` list
    (locations, hashtags, user hooks, menu items, schedule, notify, recency
    log, queue, posts), the Photos stash, and any Drafts referenced by queue
    items, into one JSON-serialisable object — blobs inlined as base64 data
    URLs (no zip lib here, and it keeps the backup a single file).
    `exportFile()` downloads it as `wingman-backup-YYYY-MM-DD.json` via a
    throwaway `<a download>`. `restoreFile(file)` parses it back, applies
    every `Store` field with (new) bulk setters, and calls `Photos.clear()` /
    `Drafts.clear()` before re-adding so a restore is a full replace, not a
    merge — Drafts keep their **original IDs** (`Drafts.save` upserts by
    `id`) since queue items reference `draftId` directly; Photos don't need
    ID stability so `Photos.add` just re-generates them.
  - **Meta (Facebook/Instagram) credentials are deliberately excluded** — the
    access token is meant to stay device-only (see store.js's own comment on
    `getMeta`), and a backup file might get emailed or dropped in cloud
    storage. The owner re-enters those after a restore; Settings says so.
  - `Store` gained `setRecencyLog()` and `setPosts()` bulk setters (js/store.js)
    purely for this — everything else already had a matching `setX` for its
    `getX`. `Drafts` gained `clear()` (js/drafts.js), mirroring `Photos.clear()`.
  - Settings screen: new "💾 Backup & restore" section (between Post reminders
    and the Meta section) with Export/Restore buttons, a hidden file input
    (`#backupInput`, `accept="application/json"`), and a status line
    (`#backupStatus`). Restore runs through a native `confirm()` first (same
    pattern as `clearStash`) since it overwrites everything on the device;
    on success it calls `openSettings()` again so every list on screen
    reflects the restored data immediately, no reload needed.
  - Verified headless (Chromium, `file://`): exported a backup with a seeded
    location/hashtag/queue-item/stash-photo, wiped `localStorage` + both
    IndexedDB stores to simulate a cleared browser, restored, and confirmed
    everything came back (including the Settings UI re-rendering live). Also
    verified the harder path — a **Queue-for-later item with a real Drafts
    image** — round-trips with the same `draftId` and a working queue
    thumbnail after restore. No console errors either run. Version → v0.16.
- 2026-07-12: **Story export + "Queue for later"**, the first two items off a
  competitor-benchmarking pass (Buffer/Later/Planoly/Meta Business Suite/food-
  truck marketing playbooks) that also produced a longer backlog — see "Ideas
  not yet built" below.
  - **Story mode**: `Editor.ASPECTS` (js/editor.js) gained `"9:16"` (1080×1920,
    label "Story"), with a matching `📱 Story` chip in `#editorAspect`
    (index.html). No new rendering path needed — the editor's crop/filter/text
    tools and `getResult()` already worked off `ASPECTS[aspectKey]`, so Story is
    just another aspect choice. Fixed a latent side-effect this exposed: the
    review/caption preview boxes (`.preview-wrap`) are hardcoded `aspect-ratio:
    1/1` in CSS, which let a tall Story export shrink to a sliver inside a
    square box. New `fitPreviewBox(imgEl, w, h)` in app.js sets the wrap's own
    `aspect-ratio` inline to match the actual composed image; called from both
    `renderCaptionPreview` and `buildReview`. Benefits Landscape (1.91:1) too,
    which had the same pre-existing letterboxing issue.
  - **Queue for later**: each keeper card in the Generate tray (`showKeepers`)
    now has a date input + `🗓 Queue for later` button alongside Post/Customise.
    Unlike the plain `queueAdd` flow (date/location/text note only), this saves
    the fully composed image (caption already baked on, same bytes `Post` would
    use) so the queue item is a ready post, not just a reminder.
  - New `js/drafts.js` — an IndexedDB blob store (`wingman-drafts` DB, same
    pattern as `js/photos.js`) for these saved images, since localStorage can't
    hold blobs and a base64 data URL would bloat it ~33% for no reason. Loaded
    in index.html right after `js/photos.js`.
  - New `Imaging.dataUrlToBlob()` (js/imaging.js) — manual atob decode (not
    `fetch()`) so a generated card's `dataUrl` can become IndexedDB-storable
    bytes without depending on `fetch()` supporting the `data:` scheme on every
    engine.
  - Queue items (`Store.getQueue()`) gained optional fields: `hashtags`,
    `hookId`, `draftId` (the Drafts record's key). `renderQueue` (app.js) is now
    async: it resolves each item's draft blob to an object-URL thumbnail
    (`.queue-thumb`), revoking the previous batch on every re-render (same
    `queueUrls` pattern as the existing `stashUrls` for the photo stash). A
    queued item with an image shows a `📤 Post` button instead of `Make`; the
    calendar day panel (`renderCalDaySchedule`) shows "📸 ready to post" next to
    it.
  - `makeFromQueue` branches on `item.draftId`: a plain note-only item still
    goes through the full photo/caption flow as before; a queued-for-later
    keeper calls the new `postFromDraft`, which loads the saved blob straight
    into `post.singleImage` and jumps to Review (falls back to the notes-only
    flow if the draft ever went missing, e.g. cleared storage).
  - Deleting a queue item (`data-q-del`) now also calls `Drafts.remove()` on
    its `draftId` so no orphaned blobs accumulate in IndexedDB.
  - Verified headless (Chromium, 390×844, `file://`): Story chip resizes the
    editor canvas to the correct 9:16 ratio; a full Generate → swipe-keep →
    Queue for later → Queue screen (thumbnail renders) → Post → Review round
    trip carries the right image/caption/hashtags through; deleting the queue
    item removes the draft blob too (verified via `Drafts.get`); no console
    errors. Version → v0.15.
- 2026-07-12: The keeper tray's **📤 Post** button (`postKeeper` in app.js) now
  plays `swipe-keep` too — same chime as swiping right on the deck, since
  posting a keeper is the same "keep it" gesture one step later. Version →
  v0.14.
- 2026-07-12: **Sound layer scaled back to sparing use.** The full delegated
  click-sound system (tap/nav-switch/toggle/back/small-win on nearly every
  button) was overkill, so `js/sound.js` now only exposes `play()` for two
  triggers, both still called explicitly from `js/app.js`: `big-win` when a
  post is shared (`markPostShared`) and `swipe-keep`/`swipe-nope` on Generate
  swipe decisions (`decideCard`). Removed: the capture-phase delegated click
  listener, `ACTION_SOUND`/`ACTION_SILENT`/`pickForEvent`, the `tap`/
  `small-win` groups, the settings toggle-preview ping, and the two `error`
  dings (queue-add with no date, caption details with no match) — those now
  just wiggle (`FX.wiggle`) with no sound. Mute toggle (`#soundEnabled`)
  behavior unchanged. Version → v0.13.
- 2026-07-11: **Mascot motion pass** (CSS animations, authored by the Fable
  model). Replaced the placeholder motions with a physics-minded v2 set in
  `css/styles.css`, all whole-image transforms (SVG parts aren't grouped) with
  grounded pivots + gesture-then-rest timing:
  - `mascot-wave` (home hero) — two quick tilt-pulses toward the raised wing +
    a tiny hop, then a ~2.4s rest (not a constant metronome sway). Positive
    rotate leans toward the raised wing (viewer's right in `wave.svg`).
  - `mascot-jog` (Generate loading, `run` pose) — fast 0.62s cadence, launch
    decelerates / fall accelerates, contact-squash + forward lean.
  - `mascot-win` (`#celebrateMascot`) — 0.85s burst-from-below w/ overshoot →
    land-squash → rebound → settle, then hands off to infinite `mascot-breathe`
    so the win stays alive under the confetti. **Also removed the `FX.pop(cm)`
    call in `markPostShared`** — it fought `mascot-win` (two scale anims); the
    class now owns the entrance.
  - `mascot-breathe` — volume-preserving squash/stretch (reads as breathing).
  - `mascot-snooze` (sleep) / `mascot-mope` (sad) — `mascotEmpty()` in app.js
    now picks anim by mood (`{sleeping:"snooze", sad:"mope"}[state]||"float"`)
    instead of always floating.
  - All five new classes added to the `prefers-reduced-motion` disable list.
  - Verified headless (Chromium 390×844, `file://`): wave animates (7 distinct
    transforms/1.3s) and is frozen under reduced-motion (1 transform), win
    mascot runs win+breathe, no console errors, no horizontal overflow.
    Version → v0.12.
- 2026-07-11: **Mascot art swapped PNG → SVG** (owner-supplied vector poses).
  `assets/mascot/*.png` (12 sprite-sheet slices) removed; replaced with **15
  crisp vector poses** in `assets/mascot/*.svg`: `main, run, thinking, excited,
  sleep, happy, laughing, surprised, wink, sad, jump, wave, angry, dance, walk`
  (Adobe Illustrator exports, flat `<path>` sets, brand palette — `#F98904`
  orange / `#FDCE0A` yellow / `#EB4527` red / `#2E2D2B` outline). `js/mascot.js`
  now serves `.svg` and keeps back-compat via an **ALIAS map** so the app's
  semantic state names still resolve: idle→main, loading→run, celebrate→excited,
  sleeping→sleep, relaxing→happy, singing→laughing, confused→surprised,
  thumbsup→wink, waving→wave (thinking/excited/sad match a pose 1:1). Unknown
  states fall back to `main`. `#homeMascot` → `wave.svg`, `#celebrateMascot` →
  `excited.svg` (index.html). The 3 extra poses (`angry`, `dance`, `walk`) are
  now available too.
  - **Animation is pure CSS** (no Lottie/Rive — those need a runtime/binary
    editor and would break the no-build, offline-first, file:// model; and a
    from-scratch Lottie would throw away this art). SVG animates smoothly via
    CSS transforms on the `<img>`. NB the SVG parts aren't grouped/id'd, so only
    **whole-image** transforms are possible (no isolated wing/leg rigging).
    Added a `mascot-breathe` keyframe (grounded squash-stretch) alongside the
    existing bob/float/sway/spin/pop; all gated under `prefers-reduced-motion`.
  - Verified headless (Chromium, 390×844): home shows `wave.svg` (loaded),
    every alias resolves to the right file, bogus state → `main`, Generate
    empty-state renders `happy.svg`, no console errors, no horizontal overflow.
    Version → v0.11. (Motion polish per Fable's review may follow.)
- 2026-07-11: **UI sound layer** (`js/sound.js`, loaded before app.js; exposes
  `window.Sound`). Plays a 19-clip pack in `assets/sounds/` (`tap-1..3`,
  `small-win-1..3`, `big-win`, `error`, `swipe-keep/nope-1..2`, `nav-switch`,
  `back`, `slot-fill`, `toggle`, `panel-open`, `gen-start`, `empty-state`).
  - **These clips are locally-synthesised WAVs** (pure-Python additive synth of
    marimba/kalimba/wood-block/bell tones — script in the session scratchpad,
    not the repo), a placeholder for the ElevenLabs Sound-Effects pack. The
    real takes come from `tools/sound-pack-generator/generate.mjs` on the
    `claude/eleven-labs-sound-pack-3pnsru` branch once `api.elevenlabs.io` is
    allow-listed in the environment's network settings (egress is blocked in
    session; the generator can't run here). Swap same-named files into
    `assets/sounds/` to upgrade — no code change needed. WAV not MP3 because
    there's no ffmpeg/lame here; `Audio` plays WAV everywhere incl. `file://`.
  - `Sound` uses HTML5 `Audio` (not fetch+WebAudio) so it works off `file://`;
    caches one base `Audio` per clip and clones per play for overlap; mute is
    persisted (`sfp.soundMuted`) and independent of reduced-motion. A
    **capture-phase** delegated click listener maps controls → sounds (buttons
    →`tap`, `[data-back]`→`back`, `.navbtn`→`nav-switch`, switch-rows→`toggle`,
    add-* actions→`small-win`, `gen-regenerate`→`gen-start`); it ignores
    synthetic clicks (`e.isTrusted`) so programmatic `input.click()` file-picker
    opens stay silent. `gen-like`/`gen-nope` are excluded there and sounded in
    `decideCard` instead, so drag-swipes and the ♥/✕ buttons both fire
    `swipe-keep`/`swipe-nope`. `markPostShared`→`big-win`; validation failures
    →`error`. Groups (`tap`, `small-win`, `swipe-keep/nope`) pick a random
    variant per play. Settings has a "🔊 Sounds" mute toggle (`#soundEnabled`).
  - Verified headless (Chromium, 390×844): module loads, all clips decode over
    `file://`, clicks fire the right sounds, mute silences them, no console
    errors, no horizontal overflow. Version → v0.10.
- 2026-07-11: Dropped the orange accent line from the generate caption stickers
  (`CAPTION_STYLES` in app.js — all `accent` now null). The `accent` support in
  `drawCaptionSticker`/`drawCaptionPanel` stays for the manual/collage banner.
  Also scrubbed all "final/last day" wording — the pitches are recurring, so the
  5 `lst_*` hooks (captions + overlays) were rewritten as today-focused urgency
  (no finality). Audited: 0 finality phrases, 0 verbatim overlay/caption repeats
  across all 130 hooks. Version → v0.09.
- 2026-07-11: Image text and caption are now a **locked pair, not duplicates**.
  Every hook in `data/streetfood_hooks.json` gained `overlays`: 2-3 short punchy
  lines (mix of {location}-shouts and pure hype, may use {location}/{day}/{item})
  written to tee up that hook's caption without repeating it. `buildGeneratedPosts`
  burns a random overlay onto the image (sticker style) while the full caption +
  hashtags go underneath (`.swipe-cap` shows caption+tags again). The `.js` wrapper
  is regenerated from the JSON — edit the JSON, mirror to the wrapper. Sticker
  max font raised (W*0.095) since overlays are short. Version → v0.08.
- 2026-07-10: Generate screen shows a **"📸 N photos loaded"** note (`#genPoolNote`,
  updated in `refreshPoolUi`, refreshed on `runGenerate`) so the trader can see how
  many photos are in the pool. The "📁 Photo folder" button stays (one-off session
  pick); the saved stash is still the persistent source. Version → v0.07.
- 2026-07-10: Generate captions are now **solid, tilted "sticker" labels** (was a
  feathered bottom banner). New `drawCaptionSticker` in imaging.js draws a solid
  rounded-rect label with a slight rotation (`opts.angle`) and varying font
  (`opts.sizeScale`); `drawCaptionPanel` routes to it when `opts.sticker`. The old
  gradient/scrim banner stays for manual single/collage posts. `CAPTION_STYLES`
  became 5 solid looks; `buildGeneratedPosts` adds per-card angle/size jitter so
  even same-style cards differ. Version → v0.06.
- 2026-07-10: Caption looks now **vary across a batch** instead of always blue/white.
  `drawCaptionPanel` (imaging.js) is parametrised — `fill` (gradient|solid|scrim|none),
  `fillRGB`, `color`, `accent`, `shadow` — and `renderSingle(img, caption, styleOpts)`
  forwards them. `CAPTION_STYLES` in app.js holds 5 on-brand looks (brand-blue,
  orange block, cream/blue, charcoal, minimal scrim); `buildGeneratedPosts` shuffles
  them and rotates one per card. The chosen style is baked into each card's composite
  image, so it carries through to sharing. Version → v0.05.
- 2026-07-10: Swipe-deck posts now have the caption **burnt onto the image**
  (`buildGeneratedPosts` calls `Imaging.renderSingle(img, picked.filledText)` —
  the existing brand-blue panel + white text). The captioned canvas is turned back
  into an `<img>` (`loadImageFromUrl`) and stored as the item's `img`, so the caption
  stays baked in when the post is shared (Post → `buildReview` re-renders that
  composite). Swipe cards now show the whole **square** image (so the bottom caption
  panel isn't cropped — `.gen-deck` uses `aspect-ratio:1/1.14`, `.swipe-card img` is
  square) and only the hashtags sit under it. Version → v0.04.
- 2026-07-10: Generate posts → Tinder-style swipe deck (js/app.js, index.html, css):
  - `buildGeneratedPosts` now makes **up to 10** distinct posts (was 3), decoding a
    few stash photos once and reusing them across varied captions. Each item is
    `{ img, dataUrl, filledText, hook, hashtags }` with the **hashtag block baked in**
    (`buildHashtagBlock(loc)` gained a location arg so it works before a `post` exists).
  - Generate screen replaced the card list with a swipe deck: `#genDeck` renders up
    to 3 stacked `.swipe-card`s; the top card is drag-swipeable (`attachDrag`) —
    right = keep, left = bin — with KEEP/NOPE badges and a springy `flyOff`.
    `♥`/`✕` buttons (`gen-like`/`gen-nope`) do the same and are the reduced-motion /
    a11y path (drag isn't attached when `prefers-reduced-motion`). `#genProgress`
    shows "n / total". Loading uses the `loading` mascot; empty/None states use
    `relaxing`/`confused`/`sad` mascots. Panels toggled via `genShow(which)`.
  - Binned captions go in a session `binnedHookIds` set so "New batch" won't resurface
    them. Keepers pile into `keepers`; `showKeepers()` renders a tray where each has
    **Post** (`postKeeper` → `buildReview` → review/share) and **Customise**
    (`customiseKeeper` → caption editor). `seedPostFromGen` builds the live `post`
    for both. `buildReview` now resets the review back-arrow to `caption` (keeper Post
    overrides it to `generate`).
- 2026-07-10: Mascot moods — the Chuckling Wings chicken as dynamic feedback:
  - `assets/mascot/` — 12 transparent PNG poses sliced from the owner's 1024×1024
    sprite sheet (a 4×3 grid). Names match what each shows: `idle`, `loading`
    (laptop + coffee + checkmark bubbles), `thinking` (lightbulb), `celebrate`
    (wings up + confetti), `sleeping` (Zzz), `relaxing` (armchair), `singing`
    (music note), `confused` (?), `thumbsup`, `sad`, `excited` (sparkles),
    `waving`. Each ≤ ~272px longest side, ~50–95KB, ~816KB total.
  - Slicing was done offline in headless Chromium (no ImageMagick/PIL here): the
    sheet has NO alpha (opaque light/white bg), so background was removed by a
    border flood-fill (edge-connected bright/neutral pixels → transparent), which
    keeps enclosed light props (laptop, pillow, coffee, checkmark bubbles) intact.
    Then hand-tuned per-pose crop boxes (cut lines in the true gutters) so no
    neighbour bleeds in. Slice script lives in the session scratchpad, not the repo.
  - `js/mascot.js` — tiny `Mascot` helper (loaded before app.js, exposes
    `window.Mascot`): `Mascot.url/html/el/set`, friendly per-state alt text, and
    animation classes. Pure presentation, offline-safe.
  - Where states are wired: LOADING = Generate "Cooking up posts…" (bob);
    SUCCESS = `#celebrateMascot` on the Review screen, shown in `markPostShared`
    alongside `FX.confetti` and reset in `buildReview`; EMPTY STATES via the
    `mascotEmpty()` helper — Generate (relaxing), Queue (sleeping), Run-it-back
    (sad), and the photo-stash grid (relaxing); GREETING = `#homeMascot` waving
    above the home greeting (the logo.svg stays the main brand mark).
  - CSS (`css/styles.css`, mascot block before the reduced-motion block): sized
    by height with `width:auto` so varied pose aspect ratios never distort;
    motions `mascot-bob/float/sway/spin/pop` — all disabled in the
    `prefers-reduced-motion` block (extended to cover them).
- 2026-07-10: Persistent photo stash + version number:
  - `js/photos.js` — a small IndexedDB module (`Photos.add/all/count/remove/clear`,
    `Photos.supported`) storing image blobs on the device. localStorage can't hold
    blobs; IndexedDB can. Loaded before app.js in index.html; exposed via
    `window.Photos`.
  - Settings "📸 My chicken photos" section: add photos once (multi-select), saved
    on the device, shown as a thumbnail grid with ✕ remove + "Clear all"
    (`renderStash`, `onStashPicked`, `removeStashPhoto`, `clearStash`,
    `data-stash-remove`). On boot `loadPhotoStash()` seeds the in-memory `photoPool`
    from the stash so shuffle/generate work with no re-picking each session.
  - Why a stash and not a real folder: phone browsers can't bind to a live device
    folder (no persistent directory access on iOS Safari), so a saved stash is the
    offline-first stand-in for "point at my chicken pics, grab at random".
  - IndexedDB gotcha: a transaction goes inactive once control returns to the event
    loop, so `photos.js` creates each transaction and issues all its requests
    synchronously (no await between) and resolves on `tx.oncomplete` — don't
    `await` a store handle and then write to it.
  - Home screen shows `v0.01` (`.app-version`, `#appVersion`).
- 2026-07-09: Duolingo-style animation pass ("juice" layer, css/styles.css + js/fx.js):
- 2026-07-09: Duolingo-style animation pass ("juice" layer, css/styles.css + js/fx.js):
  - New FX helpers: `FX.sparkle(el)` (small quiet confetti puff + pop at an
    element — used for everyday wins) and `FX.wiggle(el)` (one-shot shimmy for
    errors/nudges). `FX.confetti` gained `quiet`/`power` opts; the full
    chime + big burst stays reserved for sharing a post.
  - Marking a working day / adding a place on the calendar sparkles the day's
    cell (`celebrateWorkday`); queue-add sparkles the button; new settings
    rows/hashtags pop in; validation errors wiggle.
  - CSS: staggered rise-ins for tiles, gen/history cards, queue & settings
    rows; chips bounce in with a stagger (`fx-chip-in`); calendar cells squash
    on press and the day panel springs up (`fx-spring-up`); bottom-nav icon
    bounces on tab change (`fx-nav-pop`); back arrows, editor tabs and collage
    slots got springy presses; home hero CTA has a soft pulse-ring on
    `::after` (a pseudo-element so it never fights the transform animations).
  - Gotcha fixed: entrance animations must use fill-mode `backwards`, NOT
    `both` — a forwards fill keeps overriding `transform` after the animation
    ends, which froze the buttons' 3D press-down on the home screen.
  - Pre-existing bug fixed: the calendar "Add another place…" input lacked
    `min-width: 0`, so its flex row overflowed 390px viewports and focusing it
    silently scrolled `#app` sideways; `#app` now also uses `overflow-x: clip`
    (with `hidden` as the fallback) so nothing can shove it off-axis.
  - All new animations are disabled in the `prefers-reduced-motion` block at
    the bottom of styles.css — keep adding new ones there.
- 2026-07-09: Home screen decluttered — removed Calendar & Settings buttons from the
  home list (still reachable via bottom nav). "+ New Post" dropped `.btn-xl` so it
  matches the other home buttons. Back buttons stripped to arrow-only with aria-label.
- 2026-07-09: Work calendar upgrades (`renderCalendar`/`selectCalDay` in app.js):
  - "Working days in <month>" quick-remove list under the grid (`#calWorkdays`,
    `renderWorkdaysList`) — each day is a chip; tap it to jump, tap its ✕ to
    un-mark (`removeWorkday`). data-attrs `data-cal-day` / `data-cal-remove`.
  - Tapping a day now shows what's lined up (`#calDaySchedule`,
    `renderCalDaySchedule`): queued plans (from `Store.getQueue()`, matched on
    `date`) and already-posted posts that day (shared posts matched on `created`).
  - Day panel has an inline "Add another place…" input (`#calDayAddLoc`,
    `addCalDayLocation`, action `cal-add-loc`) that saves a new pitch via
    `Store.addLocation` and sets it for the day in one go. Note: the location
    chips list only what's in `Store.getLocations()`; if a user only sees one, their
    saved list is short — the add-place input is how they grow it.
