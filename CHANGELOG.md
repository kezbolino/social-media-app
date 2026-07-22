# CHANGELOG — Chuckling Wings / Wingman

Full per-version history, moved out of CLAUDE.md on 2026-07-21 to keep the
auto-loaded project memory lean. This file is NOT auto-loaded into sessions —
read it (or `git log`) when you need the detail behind a past change. Newest first.

## Version history
- 2026-07-22: **v1.02 — Hashtags: max 5, curated sets, mega-tags dropped.**
  First slice of the parked v2 Instagram content plan
  (`docs/V2_INSTAGRAM_CONTENT_PLAN.md` §6/§9). Instagram capped posts at 5
  hashtags (Dec 2025) and now treats them as a minor topic signal, so the old
  behaviour — `buildHashtagBlock` appending **~14** tags (12 random of a flat
  34-tag pool + brand + location) — actively read as spam. Now
  `buildHashtagBlock` composes **at most 5** (`MAX_HASHTAGS`): brand
  (`#chucklingwings`) always leads, the pitch location comes second, and the
  remaining slots are a shuffled fill from the trader's pool. `DEFAULT_HASHTAGS`
  in `js/config.js` was restructured from a flat array into named
  `HASHTAG_SETS` (`brand` / `dish` / `local` / `scene`) with the eight generic
  food-discovery mega-tags removed (`#foodie #instafood #foodstagram
  #foodphotography #eeeeeats #forkyeah #feedfeed #hungry`) — 34 → 26 seed tags;
  a `get DEFAULT_HASHTAGS()` getter flattens the sets so `Store`/backup/the
  Settings editor are untouched. The 5-cap applies to **everyone immediately**
  (it's enforced at compose time); the cleaner pool only reaches existing
  installs if they reset (we don't silently wipe a trader's curated tags).
  **Not done, deliberately:** true per-post *dish matching* (pick dish tags that
  match what's actually in the photo) — the post doesn't know its dish yet; that
  waits on the roadmap's "tag stash photos by dish". The `HASHTAG_SETS.dish`
  group is the data model it'll hang off. Verified headless: config getter,
  clean 26-tag seed, composed block = exactly 5 brand-led, 0 console errors.
- 2026-07-21: **v1.01 — Generate resumes where you left off instead of
  restarting.** Symptom (owner): start Generate, tap over to Calendar (or any hub
  screen), tap Generate again → forced to redo the whole brief + swipe. Root
  cause: the batch was never actually lost — `genDeck`, `deckCursor`, `keepers`
  are module-level state that survives a nav hop untouched (nothing clears them
  outside `runGenerate`), and the panels keep their `.hidden` state too. The only
  bug was the bottom-nav Generate button always calling `openGenerate(null)` →
  `openBrief()`, which force-reset the visible panel back to the brief. Fix: added
  `genBatchLive()` (true while cooking, cards left to swipe, or keepers sat in the
  tray) and made `openGenerate(null)` short-circuit to a bare `show("generate")`
  when a batch is live — so returning from anywhere resumes the exact panel. Once
  the batch is fully dealt with (all swiped AND every keeper posted/queued/binned)
  it briefs fresh again; mid-brief (not yet cooked) still restarts at question 1,
  per owner. Added `genStartOver()` — the deliberate re-brief escape hatch — wired
  to a subtle inline "↺ Start over" on the deck hint line (kept inline so it adds
  no height to the scroll-locked deck) and a ghost "↺ Start over" button under the
  keepers tray; it wipes the batch and reopens the brief at step 1 (brief answers
  persist by design). Calendar's dated `openGenerate(date)` deliberately still
  briefs fresh — it's an explicit "plan THIS day" action. No SW cache bump (no
  asset filenames changed); no reduced-motion entry (no new animation). Verified
  headless at 390: 0 console errors, generate screen + all panels present, the
  inline start-over renders on a single 17px hint line (deck bottoms at 603px,
  fits the locked viewport) with no sideways scroll.
- 2026-07-21: **Split the history out of CLAUDE.md → this CHANGELOG.md (dev
  tooling — no app version bump).** Adopted the lean-project-memory restructure
  from `claude/skills-feature-usage-nhb5xo`: `CLAUDE.md` dropped from ~2330 lines
  to ~200 (durable facts, conventions, hard-won gotchas, a short "Recent changes"
  list) and the full per-version blow-by-blow moved here (not auto-loaded, so it
  no longer costs context every session). Done *properly* rather than merging the
  stale branch file: the branch's slim CLAUDE.md was current only through v0.99,
  so it was brought to v1.00, and this CHANGELOG was built from main's **complete**
  Notable-changes list (verified byte-identical to the branch's CHANGELOG body
  from the v0.99 entry down, then the v1.00 + skill-install entries prepended) so
  **zero history was lost**. Restored the skill's `SKILL.md` to the branch's
  original wording (step 5 → "Recent changes" in CLAUDE.md + fuller entry here),
  which now matches this structure. The reorg touched only `.md` files — no app
  code, so no version bump and no headless drive (the app already verified clean
  at v1.00 when the heart fix shipped).
- 2026-07-21: **Installed the `ship-and-verify` project skill (dev tooling — no
  app version bump).** Salvaged the two skill files from
  `claude/skills-feature-usage-nhb5xo` (`.claude/skills/ship-and-verify/SKILL.md`
  + `scripts/verify.mjs`) — the release ritual for this repo (bump `#appVersion`,
  decide on the SW cache, add reduced-motion entries, drive the real app headless
  via the bundled `verify.mjs`, record the change, commit). Now it auto-triggers
  on "commit/ship/push this", "verify", "drive it headless". The CLAUDE.md→
  CHANGELOG.md restructure from the same branch was initially deferred, then done
  right afterwards (see the entry above). Verified: the skill's own `verify.mjs`
  drives main to the Generate screen, 0 console errors, reads v1.00. The
  superseded `claude/post-creation-defaults-ui-ehfn4k` branch (v0.94–v0.97, all
  already on main) was NOT merged — left for the owner to delete.
- 2026-07-21: **Swipe-deck ♥/✕ buttons → inline SVG icons (v1.00).** Owner: the
  heart icon on the Generate swipe cards was misaligned. Root cause: the two
  round action buttons (`.swipe-btn.like`/`.nope`, index.html) used the **text
  glyphs** ♥ (U+2665) and ✕ (U+2715), but the bundled fonts are **Latin-subset
  only** (see the v0.59/v0.95 font notes) — those code points aren't in the
  font, so they fell back to a system/emoji font whose vertical metrics sit the
  heart off-centre inside the circle, differently per device. Replaced both
  glyphs with **inline `<svg>` icons** (a filled heart path + a 2-line X),
  `fill/stroke: currentColor` so the existing `.like { color: --success }` /
  `.nope { color: --error }` tinting is unchanged; new `.swipe-ico { display:
  block }` rule. Icons are geometry-centred (24-viewBox, both centred on 12,12)
  and render identically everywhere — no font dependency. Same class of fix the
  app already uses for the nav/post-type icons. Verified headless: heart ink
  centres at Y=121/X=119.5, ✕ at 119.5/119.5 (of a 240px box, i.e. dead centre),
  tint computes to the success green / error red, 0 console errors. No SW cache
  bump (no asset filenames changed — the SVGs are inline in index.html).
- 2026-07-21: **Motion polish pass 2 — the rest of the animation backlog (v0.99).**
  Owner: "do all of them" (the outstanding items from the v0.98 survey). Built the
  genuine gaps; several survey items turned out to be **already implemented** and
  were left as-is (verified, not rebuilt). Same benchmarks (Apple HIG / Material
  Motion / Duolingo).
  - **Deck settle-bounce** — the card promoted to the top after a swipe now lands
    with a small overshoot (`fx-deck-settle` keyframe, one-shot `.fx-settle` class
    added in `advanceDeck`, removed on `animationend`). Replaced the old plain
    `transform` transition on the promote. Reduced-motion skips it.
  - **Goal-ring pop** — on the Posted screen, when the weekly goal is hit the ring
    turns celebratory green (`--success`) and pops once (`fx-ring-pop`), fired
    ~950ms after the fill sweep lands (guarded to only fire if still on the
    `posted` screen); also pops `#postedCount`. `goPosted` clears/re-adds
    `.is-smashed` each entry. Reduced-motion → green, no pop.
  - **Keeper cards join the list stagger** — added `.keeper` to the `fx-rise`
    stagger `:is(...)` group (history's `.gen-card` and the day panel's
    `.cal-sched-item` were already covered).
  - **Settings `<details>` close animation** — native `<details>` animates open
    (`sg-reveal`) but snaps closed; new `wireSettingsCollapse()` intercepts the
    summary click on a close, height-animates `.sg-body` to 0, then commits
    `open=false` (`transitionend` on height + a setTimeout safety net). Opening is
    still the native/CSS path. Skipped under reduced motion.
  - **Pending button spinner** — `FX.busy(el, on)` injects a spinning ring
    (`.btn-spin`, inherits the button's text colour via `currentColor`) before the
    label and blocks re-taps (`.btn.is-busy`). Wired into **Share** (`doShare(btn)`
    — now takes the button; the `case "share"` passes `el`) and **backup Export**
    (try/finally). The spinner deliberately keeps spinning under reduced motion
    (essential progress feedback).
  - **Thumbnail shimmer + fade-in** — history & keeper images fade in on load
    (`markImagesIn` adds `.img-in`; `img.complete` images get it immediately so
    nothing is left invisible) over a CSS shimmer placeholder scoped to
    `.gen-card:has(img):not(:has(img.img-in))` (and `.keeper`) — text-only cards
    never match, and the shimmer clears once the image lands. `:has()` degrades
    gracefully (no shimmer, fade-in still runs). **Safety**: a reduced-motion rule
    forces `.gen-card img,.keeper img { opacity:1 !important }` so images can never
    get stuck hidden if a load handler is delayed.
  - **Touch ripple (iOS/flat button mode only)** — a Material ripple from the
    touch point (`.btn-ripple`, `fx-ripple`), gated in fx.js to
    `html[data-btn="ios"]` so the default chunky buttons keep their 3D
    press-plunge (which already reads as feedback). `html[data-btn="ios"] .btn`
    gets `position:relative; overflow:hidden`.
  - **Type-tile launch press** — the whole tile now scales on `:active` (its icon
    already tilted) so tapping reads as launching, which then wipes in via the
    shared-axis transition.
  - **Already done — left as-is (honest audit):** *in-place add animations*
    (collage `.slot.filled { fx-pop }`, hashtag/day/location chips `fx-chip-in`,
    carousel thumbs) already existed; *calendar grow-in* (`.cal-cell.selected {
    fx-pop }` + chip bounce) already existed; *fade-through on tab switches* is
    already provided by the incoming screen wipe (it fades opacity 0→1); *empty-
    state mascot idle* already animates (`float`/`snooze`/`mope` by mood). A true
    **container-transform** on the type tiles and a **dual-screen slide** are still
    NOT done — both fight the one-screen `display`-toggle architecture (high
    white-screen-bug risk); the tile press + shared-axis wipe is the safe ceiling.
  - All new keyframes/classes added to the reduced-motion disable list. Verified
    headless (Chromium 390×844, playwright-core): `FX.busy` injects/removes the
    spinner; ripple fires only in iOS mode; details close animates then commits
    `open=false`; a real swipe gives the new top card `fx-deck-settle`; keepers
    render with `fx-rise` + `.img-in`; history image gets `.img-in`; the smashed
    ring computes green (`#2b8a3e`) with `fx-ring-pop`; all 5 new keyframes
    present; 0 console errors across every run. No new assets → no SW cache bump.
- 2026-07-21: **Motion polish pass — top 3 from a UI-animation survey (v0.98).**
  Owner asked (after a survey of where animation could make the app "feel" nice,
  benchmarked to Apple HIG / Material Motion / Duolingo) to build the top three.
  - **#1 Screen transitions strengthened (shared-axis X).** These already
    existed as a one-sided "wipe" (`fx-wipe-fwd`/`fx-wipe-back`, incoming screen
    only — the outgoing one just `display:none`s, since only one `.screen` is
    ever `.is-active`; a true dual-screen slide would fight the display-toggle
    architecture the repo warns against bypassing). Refined the keyframes:
    travel 38→46px + a subtle `scale(0.985)→1` so the incoming screen reads as a
    layer *settling in* (a touch of Material container-depth), duration 0.46→
    0.42s. Direction still flips on `#app.nav-back`. `.screen.is-active` was
    already in the reduced-motion disable list. **NB it's incoming-only by
    design** — don't "fix" it into a two-screen slide without reworking
    `show()`'s display toggling (high white-screen-bug risk).
  - **#2 Swipe-deck colour wash + stronger tilt.** The Generate cards already
    tracked the drag (translate + rotate) with KEEP/NOPE badges fading in; added
    a `.swipe-wash` overlay (`buildSwipeCard`) that tints the whole card toward
    the pending decision — green (`.keep`→`var(--success)`) dragging right, red
    (`.nope`→`var(--error)`) left — opacity driven live from drag distance
    (`t*0.45`) in `attachDrag`, cleared on release/flyOff. Rotation nudged
    `dx*0.05`→`0.06` so intent reads sooner. Wash sits above the image, below the
    badges (CSS after `.swipe-badge.nope`). Reduced-motion never attaches drag,
    so the wash is inert there — no extra guard needed.
  - **#3 Animated removal (FLIP-lite) — "the gap closes" instead of snapping.**
    Two new FX helpers (js/fx.js, both reduced-motion-guarded → call `done()`
    unanimated): `FX.collapse(el, done)` shrinks a vertical list row's height/
    margin/padding to 0 while fading + sliding out, so rows below follow it up
    (used for **queue** items — `.queue-item`); `FX.shrink(el, done)` scale+fades
    an element out for **grid cells / wrapping chips** where a height collapse
    wouldn't close the horizontal gap (used for **stash thumbnails**
    `.stash-thumb` and **calendar workday chips** `.chip`). Wired at the three
    delete sites in app.js: the `data-q-del` handler collapses then does the
    Store removal + `renderQueue`; `removeStashPhoto(id, el)` and
    `removeWorkday(key, el)` gained an element param and shrink-then-commit. The
    animation runs *before* the existing re-render, so it's strictly additive
    (the re-render already replayed entrance staggers; now the exit is smooth
    too). `done()` fires on `transitionend` (height for collapse) with a
    setTimeout safety net.
  - Verified headless (Chromium 390×844, localhost, playwright-core): active
    screen uses `fx-wipe-fwd`; a right-drag gives `.swipe-wash.keep` @0.315
    opacity + `rotate(4.2deg)`; deleting 1 of 2 queue items collapses the row
    (`height:0`, transition set) then re-renders to 1; 0 console errors across
    all runs. **Verification note**: this env has no bundled Playwright — install
    `playwright-core` transiently (`npm i --no-save`, it's gitignored) and launch
    with `executablePath:/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; run
    the script with `NODE_PATH=<repo>/node_modules` if it lives in the scratchpad.
- 2026-07-21: **"Run it back" (history) now shows post thumbnails (v0.97).**
  Owner: "why does it not show the pictures?" It never could — `markPostShared`
  only saved the *text* (caption/location/day/tag), never the composed image
  (the roadmap's "visual history" gap: the composite is a blob at share time but
  was discarded). Now:
  - **Save at share time**: `markPostShared` stashes `post.finalBlob` (the
    composed image, already set by `buildReview` for single/collage/carousel-
    cover) into the **Drafts** IndexedDB store (the same one the queue uses),
    keyed `"hist-" + post.id`, and records that key as `imageId` on the
    `Store.savePost` record. Guarded by `if (window.Drafts && post.finalBlob)`
    so it degrades to text-only if IndexedDB/blob is unavailable.
  - **Render**: `renderHistory` is now async and, per card, does
    `Drafts.get(p.imageId)` → object URL → `<img>` (revoking the previous batch
    via a `historyUrls` array, same pattern as `queueUrls`/`stashUrls`). The
    `.gen-card img` 96×96 cover style already existed (Generate/keeper cards use
    it), so no new CSS. `openHistory` calls it without await, same as
    `openQueue`/`renderQueue`.
  - **Graceful gaps**: posts shared *before* this change (no `imageId`), and any
    post whose blob is missing after a **backup restore** (restore does
    `Drafts.clear()` and only re-adds *queue* drafts — history images are NOT in
    the backup, to keep backup files lean), simply render text-only. Verified:
    seed-render test + a full New Post → Share → Run-it-back drive both show the
    thumbnail with the blob actually persisted, 0 console errors.
  - ⚠️ **Storage note (flagged to owner)**: there's no history pruning — one PNG
    per shared post accumulates in IndexedDB (history shows the latest 40, but
    blobs for all shared posts are kept). Fine for a single trader; add an
    N-cap + `Drafts.remove` on eviction if it ever grows too big.
- 2026-07-21: **Removed the New Post flow progress bar (v0.96).** Owner: the
  progress bar "pushes everything down so there's less space." Removed the whole
  Duolingo-style row (v0.90) from the New Post flow — the ✕ exit-to-home button,
  the progress track, AND the green completion tick — since keeping just the row
  wouldn't reclaim the vertical space that was the point. Exiting a post is still
  possible via the header's `‹` back arrow (steps back through the flow); the
  one-tap ✕-to-home is gone (flagged to owner — easy to re-add just the ✕ if
  wanted).
  - **index.html**: dropped the `.quiz-track` block from the type screen (kept
    the `.quiz-ask` mascot + speech-bubble header).
  - **js/app.js**: deleted `FLOW_STEPS`/`FLOW_TOTAL`/`lastFlowPct`,
    `updateFlowProgress()` (+ its call in `show()`), `initFlowBars()` (+ its call
    in `boot()`), and the now-dead `.flow-track` hide logic in
    `setEditorChrome` (the Generate-keeper side-trip no longer needs to hide a
    bar that isn't there).
  - **css/styles.css**: removed all flow-bar rules — `.quiz-track`,
    `.flow-track`, `.flow-x`, `.flow-progress`, `.flow-bar`(+`::after`),
    `.flow-done`(+ring/tick + `.is-complete`) — and their `.flow-x`/`.flow-done`
    entries from the reduced-motion list. `.ob-bar`/`.ob-progress`/
    `.gen-brief-track` (onboarding + Generate-brief bars) are untouched — this
    only removed the New Post flow bar, as asked.
  - Verified headless: New Post lands on `type` with no `.flow-bar`/`.quiz-track`
    present, no injected bars on single/editor/caption/review, mascot bubble
    intact, 0 console errors; screenshot eyeballed (tiles sit higher, more room).
- 2026-07-21: **Text-tool fonts re-matched to Instagram Story styles
  (v0.95).** Owner asked to "add Instagram fonts." IG's real Story typefaces
  are proprietary/undistributable, so — like the rest of the repo — we bundle
  free **OFL** faces chosen to look *close* to each IG style, not IG's actual
  files. Swapped all 5 `TEXT_STYLES` families (js/editor.js):
  - Classic: Poppins → **Inter 600** (neutral humanist, IG Classic is a clean
    neutral sans, not round-geometric).
  - Modern: Oswald caps/condensed → **Jost 400** (thin elegant geometric; IG
    Modern is light/wide, so dropped `upper` + eased `spacing` 0.06→0.04 — the
    old condensed-CAPS was the worst mismatch).
  - Neon: Pacifico → **Dancing Script 700** (flowing handwritten signature;
    glow unchanged, still only shows when fill = none).
  - Type: Space Mono → **Courier Prime 700** (true typewriter ≈ IG's American
    Typewriter, vs the old techy geometric mono).
  - Strong: Poppins 800 → **Archivo Black** (single weight 400 = black; heavy
    neo-grotesque; still `highlightDefault: "solid"`).
  - **Files**: `assets/fonts/{inter-600,jost-400,dancingscript-700,
    courierprime-700,archivoblack-400}.woff2` — grabbed as the already-subset
    **latin** woff2 straight off the Google Fonts css2 API (browser UA → take
    the `/* latin */` block's URL), no fonttools needed. Added matching
    `@font-face` blocks in styles.css and updated `ensureTextFonts()`'s
    `document.fonts.load` preload list to the 5 new specs. Multi-word families
    are quoted in the `family` string (`"'Dancing Script'"` etc.) so
    `ctx.font`/the chip preview stay valid.
  - **Removed** the now-unused Oswald/Pacifico/Space Mono `@font-face` blocks +
    their 3 woff2 files (grepped: 0 remaining refs anywhere). SW cache
    `v9`→`v10` so installs purge the old fonts and fetch the new ones.
  - Verified headless: `document.fonts.check` true for all 5 new specs, every
    style chip applies with no render error, 0 console errors, 0 failed
    requests; rendered a 5-style sample PNG and eyeballed the glyphs (each
    face distinct + on-look).
- 2026-07-21: **Text tool: fill-by-default + removed the 🎯 eyedropper
  (v0.94).** Owner: new text should come with a fill already on, and the
  colour-picker bullseye "does nothing."
  - **Default fill on new text**: `createOverlay` (js/editor.js) now seeds
    `highlight: "solid"` instead of `"none"`, so `addOverlay`/the "add" text
    action drops in a filled box straight away (white box + auto-contrast dark
    text at the default white colour). The Fill button still cycles
    none→solid→semi as before — this only changes the starting state. Verified
    headless: adding text shows `#txtHighlight` = "▣ Colour fill".
  - **Removed the eyedropper** (`data-eyedrop` 🎯 swatch): deleted the button
    from `buildTextControls`, its branch in the `txtSwatches` click handler, the
    `sampleMode` state var + its reset in `open()`, the sample-tap branch in
    `onPointerDown`, the `sampleColourAt()` helper, and the dead
    `#editorCanvas.sampling` CSS rule. The 🎨 custom-colour picker and the preset
    swatches are untouched. Verified headless: no `[data-eyedrop]` in the DOM,
    0 console errors.
  - **Re: "where are the fonts classic/modern/neon from?"** — they're NOT
    Instagram's actual fonts (those are proprietary). `TEXT_STYLES`
    (js/editor.js) is *named* to mimic IG Stories' text styles and maps to
    bundled free Google Fonts. (The specific faces were re-matched closer to IG
    in v0.95 above — see that entry for the current mapping.)
- 2026-07-21: **Branch cleanup — all stale branches deleted, only `main`
  remains.** After the v0.92/v0.93 work merged straight to `main`, the owner
  cleared out every leftover `claude/*` and `archive/*` branch in the GitHub
  UI. Verified each against `main` first: 7 were fully merged (byte-identical),
  and `archive/progress-bar-design-bt56dd` was the *superseded alternate* v0.90
  progress-bar impl (main kept the chosen one) — deleted with the rest, nothing
  lost. Context for future sessions: the owner works across Mac CLI (commits
  straight to `main`) and Claude web/mobile (isolated containers that can only
  push to a `claude/*` branch + hand back a PR). That surface split is why
  branches accumulate and why versions collide — merge + delete promptly to
  keep it tidy. ⚠️ This session confirmed **remote branch deletion is blocked
  two ways**: `git push --delete` → 403 (proxy), and the GitHub MCP has no
  delete-branch tool — so branch deletion is always the owner's job in the UI.
- 2026-07-21: **Generate moved to the middle nav slot (v0.93).**
  Owner wanted Generate in the centre again — but as a *plain icon* this time,
  not the raised mascot button that was just parked (v0.92). Pure markup
  reorder in index.html: tab order is now **Home / New / Generate / Calendar /
  Settings** (Generate is 3rd of 5 = dead centre). No CSS/JS change — the nav
  has no position-dependent styling (the active pill is class-driven via
  `show()` marking `.navbtn[data-nav]` against the current screen, order-
  independent), so swapping the Generate and Calendar `<button>` blocks is the
  whole change. No SW cache bump (no asset filenames changed). Verified
  headless (Chromium, 390×844, file://): order correct, tapping the middle tab
  opens Generate + lights the tab, 0 console errors.
- 2026-07-20: **Bottom nav centre reverted back to a plain icon
  button (v0.92) — mascot-in-nav idea parked.** Owner: "I don't think the
  mascot is quite right yet. I might need to park that idea." This undoes the
  whole v0.86→v0.89 mascot-nav arc (raised disc → free-floating mascot + AI
  sparkles → tightened cluster + halo → blue pulse glow), not just the latest
  tweak — the owner wants the *idea* shelved, not the last iteration polished.
  - index.html: the `.navbtn-center` Generate button (disc/mascot img/3 sparkle
    SVGs) is gone; Generate is a normal `.navbtn` again with its original
    `.navbtn-icon` sparkles-in-a-badge SVG (the same icon it had pre-v0.86,
    restored verbatim from git history at `6c1b845^`). Tab order reverted too
    — **Home / New / Calendar / Generate / Settings** (was Home / New /
    **Generate** / Calendar / Settings once it became the raised centre tab).
  - css/styles.css: deleted the whole "Raised centre Generate button" block —
    `.navbtn-center`, `.navbtn-disc` (+ `::before` glow), `.navbtn-mascot`,
    `.navbtn-star`/`.star-a/b/c`, and the `nav-glow-pulse`/`nav-star-twinkle`
    keyframes — plus their entries in the `prefers-reduced-motion` disable
    list. `mascot-breathe` itself was NOT touched — it's a shared keyframe
    used by other mascot placements (e.g. the Review-screen celebrate mascot),
    just no longer referenced from the nav.
  - Nothing else changed: `assets/mascot/happy.svg` stays in the repo (still
    used elsewhere — e.g. onboarding/empty-states), `#appVersion` alone is the
    version source (bumped v0.91→v0.92, no SW cache bump needed — no cached
    asset filenames changed). If the mascot-in-nav idea is revisited later,
    the removed block is easy to find in git history (commits `6c1b845`,
    `d09a505`, `112ce18`, `7ea052c`) — but per the owner, don't re-add it
    without a fresh ask.
  - Verified headless (Chromium, 390×844, localhost): all 5 tabs render as
    plain `.navbtn-icon` buttons in the restored order, Generate's icon has no
    mascot/disc/star elements, tapping it navigates to the Generate screen
    with no console errors, version reads v0.92. Screenshot eyeballed.
- 2026-07-20: **`claude/pwa-icon-mascot-hzt8j7` merged and deleted —
  verified fully superseded, no app-facing change.** Owner asked to merge this
  branch (the mascot-transparency PWA-icon fix) and shut it down. Checked
  feature-by-feature before merging (the CLAUDE.md rule at the top of this
  file, re-earned again): the branch forked off `a838829` (pre-v0.84) and its
  only 3 commits' real payload — the `main.svg` underlay-path deletion and the
  regenerated `icon-{180,192,512}.png` — were **byte-identical** to what main
  already had (hashes matched exactly); `sw.js`'s cache bump target (`v9`) also
  already matched main's. The only textual conflicts on merge were the
  `#appVersion` line (branch carried a stale v0.85; kept main's v0.91 — no
  bump, since nothing new landed) and a duplicate "Mascot underlay removed…"
  CLAUDE.md entry (branch had it tagged `(latest)`; kept HEAD's copy and
  header, dropped the duplicate). Net diff from this merge: zero functional
  change. Branch deleted on origin after merging.
- 2026-07-20: **Merged the auto-CLAUDE.md-upkeep SessionStart hook
  (dev tooling — no app version bump).** Salvaged from
  `claude/code-workflow-optimization-76srlc`. Adds a third `SessionStart` hook to
  `.claude/settings.json`: a pure `echo` that injects the "keep CLAUDE.md as
  living project memory / update it at session end" house rule as
  `additionalContext`. Inert (no file writes, no auto-commit) — it just reminds
  the agent. Hand-merged the settings.json add/add conflict to keep all four
  hooks: main's `check-repo-fresh` + `check-unmerged-branches` (SessionStart) and
  `warn-unpushed` (Stop), plus this reminder. Makes the CLAUDE.md-upkeep norm
  travel with the repo (fires on any clone), where before it relied on a global/
  managed hook. **No `#appVersion` bump** — `.claude/` tooling isn't a user-facing
  app change (same as when main's other three hooks landed). The two superseded
  branches found this session (`progress-bar-design`, `pwa-icon-mascot`) were
  archived under `archive/*` and left for the owner to delete in the GitHub UI —
  their work was already on main byte-for-byte.
- 2026-07-20: **Full-app UI audit + two fixes it surfaced (v0.91).**
  Ran a whole-UI sweep — all 19 screens driven live in headless Chromium at
  390/375/320px (findings artifact rendered for the owner). Result: structurally
  healthy — **0 console errors, 0 horizontal overflow** at any width. Five
  findings; the owner asked to fix the two "should-fix" ones:
  - **Caption screen: helper text was trapped behind the sticky `.actionbar`.**
    The bar is `position: sticky; bottom: 0` with `margin: 14px -16px -40px` —
    the `-40px` eats `.pad`'s bottom padding, so there was **zero scroll runway**
    below the pinned bar and the hint's last line ("…use the editor's Text tab.")
    could never be scrolled clear (measured 22px permanent overlap on 390×844).
    Fix: `[data-screen="caption"] .pad { padding-bottom: 130px; }` (styles.css,
    right after `.actionbar`) — the `-40px` still cancels the original 40px,
    leaving runway so a body-scroll lifts the hint above the bar. ⚠️ **This app
    scrolls on `body`** (`body { overflow-y:auto }`, `documentElement` does NOT
    scroll) — verify caption clearance with `document.body.scrollTop`, NOT
    `window.scrollTo`/`documentElement` (a verify pass mis-read the fix as broken
    because it scrolled the wrong element). Other `.actionbar` screens (review/
    editor/…) share the -40px pattern but have enough slack not to trigger it;
    left scoped to caption.
  - **Queue "Caption or note" textarea rendered in monospace.** `textarea` was
    missing from the `font-family: inherit` rule (styles.css:294 listed only
    `button, input, select, optgroup`) and `.text-input` sets no font, so
    `#queueNote` fell back to the UA mono. Same miss as the v0.42 input fix.
    Fix: added `textarea` to that one selector — `#queueNote` now inherits
    Visuelt Pro like every other field. (`.caption-box`/`.text-entry` were fine
    already — they each set `inherit` themselves.)
  - **Audit gotcha worth keeping:** the automated contrast check first reported
    the home greeting/version at 2.17:1 / 1.12:1 — both **false**.
    `getComputedStyle().backgroundColor` returns transparent for gradient
    backgrounds, so it measured text against the light page colour behind the
    **blue hero** instead of the hero. Re-sampled real pixels (hero blue =
    `rgb(11,83,174)`): actual values are 3.00:1 / 3.02:1 (just under AA, brand-
    driven, left as-is). Also **the CLAUDE.md "white raised hand" mascot artifact
    does NOT reproduce** on ob-welcome — the wave pose renders correctly orange.
    Both are the "don't let a cheap proxy stand in for the answer" rule biting.
  - Not fixed (flagged to owner): sub-44px tap targets on Settings (hashtag/
    location/stash remove ✕, picker chips), editor filter-label contrast 2.72:1.
    Coverage gap: the `posted` success screen needs a real share to reach, so it
    wasn't driven.
  - **Version bump chain:** these two fixes were built on v0.89 and originally
    committed as v0.90, but main had meanwhile taken the progress-bar v0.90
    (below). To avoid two features sharing v0.90, this merge bumps the app to
    **v0.91**. The `claude/progress-bar-design-bt56dd` branch holds a
    *superseded* alternate implementation of the same progress bar main already
    has — left on its branch for the owner to delete, not merged.
  - Verified headless: caption hint clears the bar on body-scroll (helper bottom
    662 ≤ bar top 676), `#queueNote` computes to "Visuelt Pro", 0 console errors.
- 2026-07-20: **New Post progress bar restyled Duolingo-lesson-style
  (v0.90).** Owner shared a reference screenshot (X — glossy progress bar —
  badge, from a Duolingo lesson header) and asked for that treatment on "the
  progress bar," a light-line highlight on the orange fill, and a completion
  icon (asked for 10 icon suggestions since they hadn't picked one — offered
  🏁✅🎉🏆⭐📤🐔🔥🎯🍗 in chat; owner picked **a green tick**). Applied to the
  **New Post flow bar** specifically (`FLOW_STEPS`/`.flow-bar`, the one that
  actually advances 25/50/75/100% across single/collage/carousel → editor →
  caption → review) — the onboarding (`.ob-progress`) and Generate-brief
  (`.gen-brief-track`) bars were deliberately left untouched, since the ask
  referenced one bar and touching those risks re-litigating settled decisions
  (esp. the 2026-07-16 "no glossy gradient" call, see below).
  - **⚠️ Judgement call made without owner confirmation** (the AskUserQuestion
    tool errored out twice — "Tool permission stream closed" — before this
    could be run past the owner first): the reference image's X is a
    Duolingo-style **quit-the-lesson** button, semantically different from
    this app's existing `‹` back arrow (steps back one screen via
    `data-back`). Rather than guess which behaviour the owner wanted on a
    single control, both now coexist: the header's `‹` is completely
    untouched (still steps back), and a **new, additional** `✕` sits at the
    start of the progress-bar row itself with `data-action="go-home"` (exits
    the whole flow to Home, resetting the in-progress post via the existing
    `freshPost()` call already wired to that action). If the owner actually
    wanted the `‹` replaced rather than a second control added, that's a
    one-line swap (drop the header back button, point `data-back` handling at
    the new `.flow-x` instead) — flagged here rather than baked in silently.
  - **Structure**: `.quiz-track` (type screen, static HTML) and `.flow-track`
    (the other 8 flow screens, injected by `initFlowBars()`) are now flex rows
    — `.flow-x` (✕) — `.flow-progress` (the actual track div, `role=
    progressbar`, carries what `.quiz-track`/`.flow-track` used to hold
    directly: height/bg/inset-shadow/overflow) — `.flow-done` (the completion
    badge). `updateFlowProgress()` now also toggles `.is-complete` on the row
    (`bar.closest(".flow-track, .quiz-track")`) when `step === FLOW_TOTAL`
    (Review); CSS dims the badge to 32% opacity + grayscale until then,
    scales/colours in on completion. `setEditorChrome`'s existing
    `track.hidden = backTo === "generate"` (hides the bar during a
    Generate-keeper editor side-trip) needed no change — it still hides the
    same `.flow-track` element, which is now the whole row incl. the ✕/badge,
    which is correct (no orphaned controls with no bar).
  - **Completion badge is an inline SVG, not an emoji** — a circle + tick
    path (`.flow-done-ring`/`.flow-done-tick`, both in index.html's static
    markup and `initFlowBars()`'s template string). The ring fills with
    `var(--success)`, the same green already used everywhere else for
    "posted"/"kept" (calendar posted ring, swipe-keep badge/heart) — not an
    emoji, so it doesn't depend on the platform's emoji font rendering a
    convincing green tick, and it retints for free if a `--success`-changing
    theme is ever switched on (the 5 candidate themes from 2026-07-16 each
    already define their own `--success`). The existing dim/greyscale→full-
    colour `.flow-done` transition needed no change — `filter: grayscale(1)`
    works on the SVG exactly like it did on the emoji.
  - **Light line, not a gradient**: `.flow-bar::after` — a single inset
    `rgba(255,255,255,0.55)` 3px stripe near the top of the fill, scoped to
    `.flow-bar` only (not the shared `.ob-bar` base class other bars also use)
    so onboarding/Generate-brief stay exactly as the owner left them on
    2026-07-16 ("owner liked the fat bar + shaded track but NOT a glossy
    gradient on the fill" — a thin single highlight is a different, more
    restrained effect than the full top-to-bottom gradient that was rejected
    then, but scoping it away from `.ob-bar` avoids the question entirely).
  - Verified headless (Chromium, 390×844, localhost): row renders correctly on
    both the hand-authored type screen and an injected screen (single); ✕
    correctly navigates to home via the existing `go-home` action; the
    highlight pseudo-element renders; forcing `.is-complete` confirmed the
    badge transitions from 32%-opacity greyscale to full colour/scale after
    the 0.3s transition settles; 0 console errors. Screenshot eyeballed.
- 2026-07-20: **Bottom nav centre — glow is now a slow blue pulse
  (v0.89).** Owner liked the subtle motion but wanted the halo a more obvious
  colour — blue at low opacity, glowing slowly. `.navbtn-disc::before` fill
  changed from a near-invisible panel tint to `color-mix(var(--blue) 34%,
  transparent)` (blue, translucent, reads on the white bar), and it now runs
  `nav-glow-pulse` (3.4s ease-in-out): opacity 0.5→1 + scale 0.9→1.1, so it
  breathes in/out. The pulse transform keeps the `translate(-50%,-50%)`
  centring in every keyframe (drop it and the glow drifts). Added
  `.navbtn-disc::before` to the reduced-motion disable list. Verified headless
  (peak vs trough frames visibly differ; 0 console errors).
- 2026-07-20: **Bottom nav centre — tightened the mascot cluster + soft
  button halo (v0.88).** Owner: bring the mascot closer to the "Generate" label,
  make it slightly bigger, pull the stars in so it feels contained, and still
  read as a button.
  - Mascot 48→52px; disc box 54→52px, lift `margin-top:-26px`→`-20px` (sits
    lower, closer to the label), label `margin-top:3px`→`0`.
  - Stars pulled in tight against the mascot (offsets now small positive values
    instead of negative — they hug rather than splay).
  - **Button affordance without a hard circle**: a `.navbtn-disc::before`
    feathered radial-gradient halo (`color-mix(var(--blue) 13%, --panel)` →
    transparent at 68%), z-index 0 behind the sparkles/mascot. Soft glow, no
    ring edge — reads as tappable without reintroducing the disc the owner
    removed in v0.87.
  - Verified headless (390×844×3): mascot centred & bigger, stars contained,
    halo visible but soft, both states eyeballed, 0 console errors.
- 2026-07-20: **Bottom nav centre button — dropped the blue disc, added
  yellow AI sparkles (v0.87).** Owner wanted the mascot to sit free (no blue
  background, no circle) with yellow "AI stars" around it like the old Generate
  sparkles icon.
  - `.navbtn-disc` stripped of its `--hero-bg` gradient, `--panel` ring border,
    circular `border-radius`, box-shadow and `overflow:hidden` — it's now just a
    54px positioning box that lifts the mascot above the bar (`margin-top:-26px`).
    Mascot bumped 46→48px.
  - Three yellow (`#fdce0a`) sparkle SVGs (the Heroicons single-sparkle path,
    `viewBox="2 5 14 14"`) sit `position:absolute` around the mascot (top-right
    15px, top-left 11px, bottom-right 9px), twinkling on `nav-star-twinkle`
    (opacity+scale+rotate, staggered delays). Added to the reduced-motion
    disable list.
  - ⚠️ **Specificity gotcha (cost a debug pass):** the base `.navbtn svg` rule
    (`position:relative; width/height:24px`, 0,1,1) out-specifies a bare
    `.navbtn-star`/`.star-a` (0,1,0), so the stars rendered as 24px *relative*
    boxes in the grid flow and shoved the mascot 70px down out of the disc. Fix:
    scope every star selector under `.navbtn-center` (`.navbtn-center .star-a`,
    0,2,0) so they win. Mascot got `position:relative; z-index:2` to sit above
    the sparkles. **Any new decorative `<svg>` inside a `.navbtn` needs the same
    scoping** or `.navbtn svg` will resize/reposition it.
  - Active = mascot cluster lifts (`translateY(-2px)`) + label blue; press =
    `scale(0.94)`. No disc shadow anymore.
  - Verified headless (Chromium, 390×844×3, `file://`, onboarded): mascot centred
    in the disc box (not escaping), 3 stars at 13/10/9px, both states eyeballed,
    0 console errors.
- 2026-07-20: **Bottom nav — Generate is now a raised centre button
  with the mascot embedded (v0.86).** Owner referenced the Ahead app's raised
  centre mascot tab and wanted Generate in the middle with the mascot in it.
  - **Reordered** the 5 tabs to Home / New / **Generate** / Calendar / Settings
    so Generate is the middle slot (index.html). `data-nav`/`data-action`
    unchanged, so `show()`'s active-tab marking still works untouched.
  - The Generate button got a `navbtn-center` class: a `.navbtn-disc` circular
    `--hero-bg` gradient disc (62px) that **lifts above the bar** (`margin-top:
    -30px`) with a `--panel` cut-out ring + brand-blue drop shadow, and an
    `<img class="navbtn-mascot" src="assets/mascot/happy.svg">` (46px) inside
    it, gently breathing via `mascot-breathe`. It has **no `.navbtn-icon`**, so
    the standard active-pill (`.navbtn-icon::before`) and svg rules don't touch
    it — active/press states are handled on `.navbtn-disc` instead (is-active =
    lift + stronger shadow; :active = scale 0.94). The label ("Generate") turns
    blue when active like the others.
  - `mascot-breathe` owns the img's `transform`, so DON'T also set a base
    `transform` on `.navbtn-mascot` (it'd be clobbered mid-animation) — the disc
    grid-centres it instead. Disc `overflow:hidden` clips the mascot to the
    circle. All motion is already in the reduced-motion disable list
    (`mascot-breathe` + the disc's transition).
  - Verified headless (Chromium, 390×844, `file://`, onboarded): disc renders
    dead-centre (x 164–226 of 390), raised above the bar, order reads
    Home/New/Generate/Calendar/Settings, tapping it opens Generate and lights
    the label blue; 0 console errors. Both states eyeballed.
- 2026-07-20: **Mascot underlay removed → transparent between the legs
  (v0.85), PWA icons regenerated.** Owner: the space between the mascot's legs
  is white on the icon, should be transparent. Root cause: `main.svg`'s **first
  drawn path** (`class="st0"`, cream `#FBF8F4`) is a solid full-silhouette
  *underlay* of the whole chicken sitting behind every coloured layer. The
  coloured parts cover it everywhere EXCEPT the gap between the legs (no shape
  there), so the cream underlay peeked through — invisible on the app's light
  backgrounds, a white blob on the blue icon. Deleted that one path (was lines
  21–40 of main.svg); verified the coloured layers cover the whole chicken with
  no holes and the eye-whites (also `st0`, but separate later paths) are intact.
  Regenerated `icon-{180,192,512}.png` from the fixed SVG (same
  headless-Chromium script as v0.84). The ground-shadow ellipse (`st5`, under
  the feet) is a separate shape and was deliberately kept. SW cache `v8`→`v9`.
  ⚠️ **Every pose SVG in `assets/mascot/` has the SAME underlay** (shape index
  0, full-canvas cream) — on the blue onboarding gradient this shows as white
  artifacts: confirmed the **wave** pose (welcome screen) renders a **white
  raised hand** that should be orange, and the underlay would show between the
  legs on any full-body pose. NOT fixed here (task was scoped to the icon) —
  flagged to owner as a follow-up; the fix is the same one-path deletion per
  file but needs per-pose verification before mass-editing.
- 2026-07-20: **Owner approved deleting 3 stale branches** (verified
  superseded, safe to delete; session git policy blocks branch deletion, so
  the owner deletes them in the GitHub UI — if they still exist, that's why):
  `claude/bottom-nav-full-width-eo0vi0` (empty diff vs main — its commit IS
  PR #21), `claude/fable-sound-effects-8gyl6e` (the 5 playing softened WAVs
  are hash-identical on main since v0.83; rest is an ancient fork),
  `claude/image-text-overlay-move-79zmom` (movable sticker text shipped in
  v0.19/v0.43). NOT approved for deletion: `claude/code-workflow-optimization-
  76srlc` (owner hasn't ruled on it).
- 2026-07-20: **PWA icon remade with the brand mascot (v0.84).**
  Owner: the home-screen icon should be the main SVG mascot. The old
  `assets/icons/icon-{180,192,512}.png` were a *generic clipart chicken head*
  (not the brand art) with rounded corners baked in — wrong for a maskable
  icon, where the OS applies its own mask. Regenerated all three from
  `assets/mascot/main.svg` rendered on the `--hero-bg` gradient (160deg,
  `--blue`→`--blue-2`), full-bleed square, mascot centred at **65% of icon
  height** so it stays inside the maskable safe zone (80%-diameter circle) —
  `icon-512.png` serves BOTH `purpose: any` and `purpose: maskable` in the
  manifest, so the one design must survive circular masking. Manifest and
  `<link>` tags untouched (same filenames). Rendered via headless Chromium
  (script in the session scratchpad, not the repo); main.svg's viewBox is
  tight to the art (checked `getBBox()` — no crop needed, unlike camera/stall).
  SW cache `v7`→`v8` so installed PWAs purge the old icons; re-add to the home
  screen (or reopen once) to see the new icon. Verified headless: manifest +
  all three PNGs 200 at correct dimensions, 0 console errors.
- 2026-07-19: **Sounds switched back on, with a Settings toggle
  (v0.83).** The sound layer was unplugged on 2026-07-12 (module + assets left
  in the repo, just no `<script>` tag). Owner asked to bring it back with an
  on/off control.
  - Re-added `<script src="js/sound.js">` (before lottie/fx). `js/sound.js` was
    already complete on main (`window.Sound`: play/setMuted/isMuted/toggleMuted,
    mute persisted to `sfp.soundMuted`, `file://`-safe HTML5 Audio). The
    `Sound.play(...)` calls were also already in `js/app.js`, guarded by
    `if (window.Sound)` — so loading the module is what actually re-arms them.
  - **Triggers stay sparing** (the documented design — a sound on every tap was
    previously judged too much): `big-win` on share (`markPostShared`) and
    `swipe-keep`/`swipe-nope` on Generate swipe decisions (`decideCard`,
    `postKeeper`). Nothing else makes noise.
  - **Toggle**: Settings → 🎨 Appearance → "Sound effects" (`#soundEnabled`).
    `openSettings` sets `checked = !Sound.isMuted()`; the change handler calls
    `Sound.setMuted(!checked)`. Sound owns its own persistence, so there's no
    Store getter/setter — the checkbox just flips its mute. **Defaults ON.**
  - **Swapped in the softened WAVs** ("lower, woodier, no sparkle — less
    casino-like") from the unmerged `claude/fable-sound-effects-8gyl6e` branch,
    but only the clips that actually play (`big-win`, `swipe-keep-1/2`,
    `swipe-nope-1/2`) — grabbed the files alone, NOT the branch (it's forked off
    an ancient main and would revert months of work). SW cache `v6`→`v7` so
    installs pick up the new audio.
  - Verified headless: module loads (0 errors), the 3 playing clips decode, the
    toggle defaults checked and flips `Sound.isMuted()` both ways and persists
    across reload, and a real swipe fires `swipe-keep`/`swipe-nope`.
- 2026-07-19: **"Posted!" success screen with a weekly goal ring
  (v0.82).** Salvaged from the unmerged `claude/app-audit-ui-colors-erbail`
  branch (built at v0.66) and cherry-picked onto v0.81. After a real share or
  direct publish the flow now lands on a dedicated `posted` screen instead of
  a "Done" button on Review.
  - `goPosted(noteText)` (js/app.js) renders it and is called from `doShare`
    and `doPublish` (both after `markPostShared`). The old `showDoneButton` is
    now unused (left in place, harmless).
  - **Weekly goal ring**: goal = the trading days you set on the calendar this
    week (`workdaysThisWeek`), falling back to a soft 5 if none are marked;
    progress = posts shared since Monday (`postsThisWeek`). The SVG arc
    (`#postedRingArc`) animates from empty via the park-reflow-rAF trick, and
    jumps instead under reduced motion. Title switches to "Week smashed! 🎉"
    once the goal is hit; also shows a queued-count tile and a next-workday
    nudge. `#postedHome`/`#postedKeepers` mirror the old done buttons (keeper
    posts return to the tray, everything else goes home).
  - The v0.66 version of this commit still carried the old home "🧪 View
    onboarding (debug)" button; that was dropped during the merge (main removed
    it long ago) — do NOT re-add it.
  - Verified headless (real keeper Post → Review → Share): lands on `posted`,
    ring renders (offset reflects progress), weekly count = 1, note + "Back to
    my kept posts" shown; 0 console errors.
- 2026-07-19: **Customise a keeper saves straight from the caption screen
  (v0.81).** Salvaged from the unmerged `claude/bro-wcsnt0` branch. Editing a
  Generate keeper used to run caption → an extra Review/preview whose only CTA
  was "✓ Save & back to my posts". That preview added nothing (the caption
  screen already shows a live preview), so it's cut.
  - `caption-next` branches on `post.fromGenerate`: keeper edit →
    `saveCustomiseFromCaption()` (composes the final image, then
    `saveCustomiseToKeeper()` back to the tray); everything else →
    `buildReview()`. The caption CTA reads **"✓ Save"** on the customise path,
    "Review ›" otherwise (set in `renderCaptionPreview`).
  - Same version also **hides the New Post progress bar when editing a keeper**:
    `setEditorChrome` toggles `track.hidden = backTo === "generate"`, so the
    flow bar shows on a real New Post but not on the Generate → keep → ✏️ Edit
    side-trip.
  - Verified headless: Generate → keep → Edit → editor → caption CTA reads
    "✓ Save"; tapping it returns to the keepers tray (no Review shown); 0
    console errors.
- 2026-07-19: **Generate brief reordered to When → Where → Vibe
  (v0.80).** Owner wanted the questions in the order "When's it going out? /
  Where are we at? / What's the vibe?" (was Where → When → Vibe).
  - Swapped the `genBriefStep === 0` and `=== 1` branches in `renderBriefStep`:
    step 0 is now the **When** content (date chips, `brief-when`), step 1 the
    **Where** content (location chips, `brief-loc`). Vibe (step 2) unchanged.
  - Back buttons follow position, not content: the new first step (When) drops
    its "‹ Back a step" button; the new second step (Where) gains one. Vibe
    keeps its back button. `brief-back` is `goBriefStep(genBriefStep - 1)` —
    index-based, so it needed no change.
  - Each mascot travels with its question (When = thinking, Where = walk, Vibe
    = excited). Dropped the "Right —" opener from Where since it's no longer the
    first question ("Right — where are we at?" → "Where are we at?").
  - Follow-up in the same version: picking a day on the **When** step now
    pre-selects that day's planned workday pitch on the **Where** step, via
    `setBriefDate()` — mirrors `openGenerate`'s precedence, so a pitch-less day
    leaves an already-picked location intact.
  - Safe because both answers are seeded up front in `openGenerate`
    (`genBrief.date` then `genBrief.location` from that day's workday), and every
    advance (`briefSelectAndAdvance`, `briefAddLoc`, `briefDayNext`) is
    `goBriefStep(genBriefStep + 1)` — position-based. The only literal step-index
    checks in the code are the two render branches, both updated.
  - Verified headless (Chromium, 390×844): step 0 = "When's it going out?"
    (no back, 25%), step 1 = "Where are we at?" (back present, 50%), Back returns
    to When, step 2 = "What's the vibe?" (cook + back), cooking still yields a
    deck; 0 console errors.
- 2026-07-19: **Stash picker on the photo screens (v0.78)** — audit
  item #10 (#3 in the audit artifact). The saved photo stash used to be
  browsable only in Settings, so at the moment of actually choosing a photo you
  got a blind 🔀 Shuffle or the OS picker — to use one *specific* saved photo you
  shuffled and hoped.
  - Each photo screen now renders `photoPool` as a tappable grid:
    `PICKER_IDS` maps screen → `[wrapId, gridId]`, `renderPickerGrid(screen)`
    builds it, `pickFromStash(idx, el)` handles the tap. Called from
    `startSingle`/`startCollage`/`startCarousel`, plus `refreshPoolUi()` so a
    folder pick made *while* a photo screen is open refreshes the grid.
  - Per-screen behaviour differs: single sets the photo (and rings the tapped
    thumb via `.picker-thumb.selected`); collage fills the next empty slot;
    carousel appends. Collage-full and carousel-at-`CAROUSEL_MAX` `FX.wiggle`
    rather than silently doing nothing.
  - Object URLs are tracked in `pickerUrls` and revoked on every re-render —
    same pattern as `stashUrls`/`queueUrls`. Empty pool hides the wrap entirely
    rather than showing an empty box.
  - Written 18 Jul against v0.70, parked in a git stash through the divergence,
    then applied to v0.77 — **cleanly, no conflicts**, and every symbol it
    referenced still existed. Verified for the first time on all three screens.
  - Note the naming collision: "stash" here means the **app's saved photo
    stash**, not `git stash`. It spent a day being both.
- 2026-07-19: **Calendar day cells → earned circles (v0.75); caption
  details pre-selects today (v0.76).** Owner: the rounded squares were wrong and
  the green ✓ read "busy" and sharp-edged.
  - `--cal-cell-radius: 50%` is the one dial (20px = very-rounded squares; at
    the 44px cell size these are near-indistinguishable — a circle *is* r21.9).
  - **A plain day is bare** — no plate, no ring, transparent border kept only so
    the box size never changes. The circle is EARNED: working / posted / today /
    selected. Removed the ✓ (the only sharp-cornered shape in the app) and the
    double-encodings — working used to say itself twice (fill AND dot), posted
    twice (ring AND tick).
  - ⚠️ **Each state owns a different css channel on purpose**: working =
    background+border, posted = **outline**, today/selected = box-shadow. That's
    what lets a day be all four at once with no combination rules (the old
    `.posted.selected` double-inset hack is gone). Posted MUST stay on outline —
    as a border it needs a `.working.posted` rule, which outranks plain
    `.selected` and swallows the selection ring. `selected` deliberately beats
    `today` (same specificity, declared later).
  - v0.76: `renderDetailFields` pre-fills the Day field with today when blank.
    Distinct from the Generate brief, which already did this.
- 2026-07-19: **`main` had diverged; resolved by reset + salvage, not merge.**
  Local was 5 ahead / 11 behind, conflicting in three files. Cause: v0.66–v0.70
  were committed on the Mac on 18 Jul and **never pushed**, so a parallel cloud
  session started from the last *pushed* commit (v0.65), read the numbered plan
  out of `SESSION_LOG.md`, and rebuilt the same items 5–9.
  - **Lesson for diagnosing this class of thing: a line-by-line diff lies.** It
    flagged local work as "missing upstream" when it was the same feature under
    another name (`trayCelebrated` vs upstream's `keepersCelebrated`). Only a
    feature-by-feature check was trustworthy: 4 of 5 commits were already
    upstream, several done better. `main` was reset to `origin/main` and the one
    genuinely local-only item re-applied. Old commits are preserved on
    `origin/archive/local-v0.66-v0.70`.
  - **Prevention**: `.claude/hooks/check-repo-fresh.sh` now checks **ahead**
    (unpushed) as well as behind — that was its blind spot — and flags a
    both-ways divergence separately, since that needs reconciling rather than
    pulling. The global end-of-session rule now says push, not just commit.
  - ⚠️ **`SESSION_LOG.md`'s "Next" list behaves as a shared work queue**: any
    session, local or cloud, may pick it up. Push the log *with* the work it
    describes or it advertises finished work as pending.
- 2026-07-19: **iOS button style now covers the Generate screen's
  non-`.btn` controls, v0.74.** Follow-up to v0.73 — owner noticed the flat iOS
  look "wasn't there on the Generate screen". Its standard `.btn`s (Cook 'em up,
  keeper Post/Edit) already flattened, but two Generate-only controls aren't
  `.btn`, so they kept the chunky look: the brief's stacked question pills
  (`.brief-opt`) and the round ♥/✕ swipe buttons (`.swipe-btn`). Extended the
  same `html[data-btn="ios"]` block: `.brief-opt` → flat 15px/600 like the iOS
  buttons (selected pill stays blue); `.swipe-btn` **stays circular** (they're
  icon buttons) but sheds the `0 4px 0` edge + `translateY` plunge for the iOS
  soft `0 1px 3px` shadow + dim/scale. Both new selectors are `html[data-btn=
  "ios"] .x` (0,2,1), one step above the base `.brief-opt`/`.swipe-btn` (0,1,0),
  so they win without `!important`. Verified headless on the real Generate
  screen (seeded a stash photo, reloaded so `photoPool` seeds, walked to the
  brief + deck): brief pill reads 15px/600 in iOS vs 999px/700 default;
  `.swipe-btn` reads `50%` radius + soft `0 1px 3px` (not `0 4px 0`); 0 console
  errors. Chips (aspect/sticker/font pickers) deliberately left alone — they're
  selection filters, not CTA buttons, and weren't part of the ask.
- 2026-07-19: **App-wide iOS button-style toggle (Settings → 🎨
  Appearance), v0.73.** Owner wasn't happy with the button shape, asked what
  iOS uses and for a way to switch. (Mockup first — an Artifact comparing the
  current chunky pill vs "iOS Classic" flat-rounded vs iOS 26 Liquid Glass;
  owner picked Classic.) Built as a second picker in the existing Appearance
  group, mirroring the **font picker pattern exactly** (attribute-swap on
  `<html>` + FOUC inline script + Store getter/setter):
  - **Mechanism**: `html[data-btn="ios"]` override block in css/styles.css
    (right after the `.btn-xl` breathe block, with the button system). Additive
    only — no attribute = the default chunky pill, untouched. Every selector is
    one step more specific than the base `.btn` / `.home .btn` rules (the
    `html[data-btn=…]` prefix adds an attribute + type selector, so
    `html[data-btn="ios"] .btn` is 0,2,1 vs `.home .btn`'s 0,2,0), so the iOS
    rules win **without `!important`** regardless of source order. Flattens the
    `0 6px 0` 3D edge → soft `0 1px 2px` shadow, weight 700→600, pill 999px →
    15px rounded rect, and swaps the translateY press-plunge for an iOS dim
    (`brightness(0.94)`) + `scale(0.98)`.
  - **Secondary buttons are background-dependent** — the one real subtlety of
    going app-wide (the home mockup only had them on the blue hero). `.btn-
    secondary` appears both on light surfaces (Settings/editor) and the blue
    gradient hero, so two scoped rules: on light bg → clean white fill +
    hairline `--line` border (iOS "bordered"); on `.home` → translucent
    `rgba(255,255,255,0.16)` "glass" so the gradient shows through. **Accent
    text left as `--ink-on-accent` (dark), NOT flipped to white** — white on the
    light `--orange` fails contrast; dark-on-orange is the accessible choice
    even if my mockup showed white.
  - **Wiring** (all copied from the font picker): `APP_CONFIG.BUTTON_STYLES`
    (js/config.js, `default`/`ios`) + `K.BTNSTYLE = "sfp.btnstyle"`;
    `Store.getButtonStyle()/setButtonStyle()` (default `"default"`);
    `applyButtonStyle()` sets/clears `data-btn`; `renderButtonStylePicker()`
    into `#btnStyleChips`; `pickButtonStyle()` on the delegated
    `[data-btn-option]` handler. Called from `boot()` (apply) and
    `openSettings()` (render). FOUC: index.html head script also reads
    `sfp.btnstyle` and sets `data-btn` before first paint (same as the font one)
    so the choice doesn't flash on launch.
  - Deliberately **not** in Backup & restore (device display preference, like
    the font — same reasoning). Liquid Glass NOT built: leans on
    `backdrop-filter` (heavier on old phones) and pulls toward a full iOS 26
    redesign; Classic keeps the brand blue/orange and is a pure additive layer.
  - Verified headless (Chromium, 390×844, localhost) driving the **real UI**
    (bottom-nav → Settings → tap iOS chip → home): default reads 999px/700/
    `0 6px 0` chunky edge; after the flip reads 15px/600/flat `0 1px 2px` with
    the home secondary going translucent white; `data-btn="ios"` persists across
    a full reload (FOUC script); picker chip reflects the selection; 0 console
    errors. Both home screenshots eyeballed.
- 2026-07-18: **Keeper tray "Customise" button → "Edit", v0.72.**
  Owner: the ✏️ Customise / 📤 Post pair looked unbalanced — two `flex: 1`
  equal-width buttons where one label is a 4-letter word and the other a
  9-letter word behind an emoji, so Post read sparse and Customise crammed.
  Renamed the keeper-card button `✏️ Customise` → `✏️ Edit` (js/app.js
  showKeepers) — two short verbs balance the pills, and "Edit" is more honest
  since v0.43 (the button opens the FULL editor: reframe/filters/sticker, not
  just a caption tweak). Also changed the editor header it opens from
  `setEditorChrome("generate", "Customise post")` → `"Edit post"` so the
  chrome matches the button. Internal identifiers (customiseKeeper,
  save-customise, g.customised, etc.) left as-is — code-only, not user-facing.
  Verified headless: keeper tray renders `📤 Post` (114px) + `✏️ Edit` (118px)
  at equal 44px height (no wrap), tapping Edit opens the editor titled "Edit
  post", no console errors. Screenshot eyeballed.
- 2026-07-18: **All Settings groups collapsed by default, v0.71.**
  Owner: collapse all the folders. The two everyday-content groups (📸 Photos
  & pitches, ✍️ Captions & hashtags) had `open` on their `<details>` since the
  v0.50 Settings regroup; dropped both attributes so all 6 groups
  (Photos & pitches / Captions & hashtags / Reminders / Appearance / Backup &
  setup / Auto-posting) now start closed — no JS change, `<details>` handles
  it natively. Verified headless: all 6 report `open: false` on landing in
  Settings, tapping a header still expands it, no console errors.
- 2026-07-18: **Swipe deck (Generate) scroll locked in place, v0.70.**
  Owner: don't let the "tinder section" scroll down. The app has no per-screen
  scroll container — the whole document is the scroller (body, `height:100%`,
  no `overflow-y` set) — so a tall generate screen could scroll behind the
  swipe deck and fight the drag gesture. New `body.scroll-lock` CSS rule
  (`overflow: hidden; height: 100%`, right next to the existing `html,body`
  horizontal hard-lock) plus `updateGenScrollLock()` in js/app.js, which
  toggles that class based on `screen === "generate" && !#genDeckWrap.hidden`.
  Called from both `show()` (handles navigating screens, incl. browser-back
  landing back on a screen where the deck was already the visible panel) and
  `genShow()` (handles switching panels — brief/loading/deck/keepers/empty —
  without a `show()` call, since they're all the same `generate` screen).
  Only the deck panel locks; brief/keepers/empty scroll normally. Verified
  headless (Chromium, 390×700): `body.scroll-lock` + `overflow-y:hidden` while
  the deck shows, `window.scrollTo` a no-op, stays locked across a swipe
  (deck→deck), and clears on every other panel/screen (brief, home). No
  console errors.
- 2026-07-18: **New stall.svg (owner re-draw, v0.68).**
  Owner supplied a fresh hand-vectored `stall.svg` (a proper Illustrator export,
  not a trace) to replace the auto-traced 76KB file. Swapped it into
  `assets/mascot/stall.svg` — now **24KB** (a third the size) and clean vectors.
  New art is a **250×250 square** viewBox (the old was cropped landscape
  247×186), so on ob-places it renders as a ~288px square scene via `.ob-scene`
  (width-sized). The canopy blue is `#0252C5` — brighter/more saturated than the
  onboarding gradient's `#0a4da1`, so it separates from the background on its own.
  **Because of that the old `.ob-scene` white-outline drop-shadow treatment (four
  zero-blur white drop-shadows tracing the alpha silhouette) was removed (v0.69)
  — the owner saw it as an unwanted outline around the whole stall. Only the soft
  lift shadow remains.** Verified in the real ob-places screen (renders clean, no
  outline, no console errors). SW cache `v5`→`v6` so installs purge the old asset.
  **The old traced pipeline notes below (2026-07-14 stall entry) are now
  historical — this is a clean source, so don't re-trace it, and don't re-add the
  white outline.**
- 2026-07-18: **Audit punch-list #8–9 (v0.67).**
  - **#8 nav labels + Home tab.** The floating capsule nav gained a **5th tab
    (Home**, `data-nav="home" data-action="go-home"`, first) and **text labels**
    under every icon (Home/New/Calendar/Generate/Settings). Each icon is now
    wrapped in a `.navbtn-icon` box and the active pill moved from
    `.navbtn::before` → `.navbtn-icon::before` so it stays anchored to the icon
    regardless of the label beneath. Added `.navbtn-label` (0.63rem/700).
    `--navh` 64→80px so hub-screen content still clears the taller bar. The New
    button stays the only `data-nav`-less navbtn (still lit on `type` via
    show()); Home has `data-nav` so the `:not([data-nav])` post-button selector
    is unaffected. **Gotcha:** a non-first-run boot never called `show("home")`
    (home is is-active in static HTML), so the nav's active-tab marking — which
    lives in show() — never ran; the Home tab wouldn't light until the first
    navigation. Fixed with a suppressed `show("home")` in boot's else branch.
    Reduced-motion selector updated to `.navbtn-icon::before`.
  - **#9 smart defaults.**
    - *Calendar opens on today:* `openCalendar()` now calls
      `selectCalDay(todayStr())` instead of leaving `selectedDate = null`, so
      the day panel + today's schedule show straight away (the `.today`/
      `.selected` cell styling already existed).
    - *Honest ob-done copy:* the photos step is skippable, so `renderObDone()`
      (called from `obGo` on ob-done) swaps the sign-off — "got your photos"
      only when the stash is non-empty, else a "add a photo when you're ready"
      line. Hint got `id="obDoneHint"`.
    - *Empty-state CTAs:* `mascotEmpty()` gained an optional `cta {label,action}`
      arg that appends a `.btn` (data-action, so the delegated handler wires it).
      History + Queue empties now offer "✨ Generate posts"; the Generate
      no-photos empty offers "📸 Add photos" (→ open-settings).
    - *Today pre-selected in the brief* was already the case (openGenerate sets
      `genBrief.date = today`; the Today chip matches) — verified, left as is.
- 2026-07-18: **Audit punch-list #5–7 (v0.66).**
  - **#5 confetti once-per-batch.** `showKeepers()` fired the quiet confetti on
    every keeper-tray visit (so it re-celebrated on each return from posting/
    customising a keeper). New `keepersCelebrated` flag — reset in
    `runGenerate()`, set + confetti on the batch's first `showKeepers()` render,
    skipped after. `returnToKeepers`/`saveCustomiseToKeeper` re-render silently.
  - **#6 swipe-cap fade.** `.swipe-cap` was `-webkit-line-clamp: 3` (hard
    mid-line cut). The card is a pointer-drag target, so a scrollable caption
    would fight the swipe — instead it now fills the area and fades out at the
    bottom via `mask-image` gradient (opaque→76%, transparent→100%). Full
    caption is still baked on the image + shown at Post.
  - **#7 home hierarchy — one orange hero.** Home had two orange heroes (New
    Post's `.home .btn-primary` was overridden orange, plus Generate's
    `btn-accent`). Now Generate is the sole orange hero (top of the stack; the
    `fx-pulse-ring` `::after` moved from `.home .btn-primary` to
    `.home .btn-accent`), New Post demoted to a white `.btn-secondary`. Dropped
    the `🧪 View onboarding (debug)` home button (Settings → Run setup again
    still uses `ob-restart`). Removed the dead `.home .btn-primary` orange bg/
    active/edge rules + its half of the edge-accent & reduced-motion selectors.
    ⚠️ The home nth-of-type stagger delays for slots 3/4 are now dead (only two
    direct `.home > .btn` remain) but harmless.
- 2026-07-17: **Generate brief → Stoic-style stacked pill options.**
  Owner liked the Stoic onboarding's pills + minimal look, wanted it on the
  Generate brief (NOT onboarding), keeping the brand blue/orange (not Stoic's
  mono). Version → v0.65.
  - The three brief steps (Where / When / Vibe) render their options as
    full-width **stacked pills** (`.brief-opts` column + `.brief-opt`) instead
    of the old wrapping `.chips`. Selected = solid `--blue` fill + white text;
    the add variants (＋ Somewhere new / 📅 Another day) get `.brief-opt-add`
    (dashed border, muted). `briefChip()` (js/app.js) now emits `.brief-opt`;
    the three `renderBriefStep` containers became `.brief-opts`; and
    `briefSelectAndAdvance`'s selector was updated `.chip`→`.brief-opt` (it's
    what clears the other pills' selected state — miss it and auto-advance
    leaves every tapped option highlighted).
  - Multi-select (Vibe) still toggles via `briefToggleVibe` (class-agnostic, no
    change); auto-advance (Where/When) unchanged. Pills are full-width to line
    up with the orange "Cook 'em up" `.btn` below them.
  - Verified headless: walked Where→When→Vibe — pills render (radius 999px), no
    `.chip` left, tap selects + auto-advances, Vibe multi-select keeps 3
    preselected, no console errors. Screenshots eyeballed.
- 2026-07-17: **Custom SVG post-type icons (replaced the emoji).**
  Owner approved a hand-drawn flat set (previewed first). Version → v0.64.
  - `assets/icons/{single,collage,carousel}.svg` — flat, solid, blue-primary +
    orange-accent to match the brand look (single = sun+mountains photo card;
    collage = big pane + 2 small panes; carousel = centre card + peek cards +
    page dots). 48×48 viewBox, tiny, offline-safe.
  - The three `.tile-icon` badges now hold `<img src="assets/icons/…svg"
    alt="" width="32" height="32">` instead of the emoji 🖼️/🔲/🎠. New CSS
    `.tile-icon img { width:32px; height:32px; display:block }`. The 54×54 badge
    (`--panel-2` bg) stays — it still frames the icon uniformly. The old
    `.tile-icon { font-size:28px }` is now dead but harmless.
  - SW cache `v4`→`v5` so installs pick up the new assets.
  - Verified headless: all three load (`naturalWidth>0`), 32px, no failed
    requests, no console errors. Screenshot eyeballed in situ.
- 2026-07-17: **New Post progress bar now advances across the whole
  flow.** Follow-up to the v0.62 static bar. Version → v0.63.
  - `FLOW_STEPS` (js/app.js) maps the flow screens onto 4 milestones — Type
    (25%) → Photo/Edit (single/collage/carousel/editor, 50%) → Caption (quiz/
    details/caption, 75%) → Review (100%). `updateFlowProgress(screen)` is
    called from `show()` and drives the bar; `lastFlowPct` tracks the width to
    animate FROM, so forward steps sweep up, Back shrinks, and leaving the flow
    (any non-flow screen) resets to 0 for the next post.
  - Every flow screen carries a `.flow-bar`. The type screen's lives under its
    mascot (its `<span>` gained `flow-bar`); the other seven are **injected at
    boot** by `initFlowBars()` (a `.flow-track` prepended to each screen's
    `.pad`) so the markup isn't duplicated. `.flow-track` shares `.quiz-track`'s
    visual (light rgba-blue track + `.ob-bar` orange fill).
  - Animation reuses the park-reflow-set trick (transition off → set to
    `lastFlowPct` → force reflow → transition on → set target), same as `obGo`;
    the `.ob-bar { transition: none }` reduced-motion rule makes it jump instead.
  - Verified headless: bars injected on all 9 flow screens; walking type→single
    →editor measured 25%→50%→50% (photo+edit share a milestone); editor layout
    uncrowded; no console errors.
- 2026-07-17: **"What kind of post?" screen → mascot + speech bubble
  + progress bar (Brilliant-app reference).** Owner liked Brilliant's question
  header. Version → v0.62. (Progress bar was static at first — wired to advance
  across the flow in v0.63 above.)
  - Added inside the type screen's `.pad` (kept the blue "New Post" `.bar` for
    nav consistency — same arrangement the Generate brief already uses: blue bar
    + a progress bar & mascot below it): a `.quiz-track` progress bar (reuses the
    `.ob-bar` orange fill on a light rgba-blue track, **static at 25%** = step 1
    of the New Post flow), then a `.quiz-ask` row — the **thinking** mascot
    (`assets/mascot/thinking.svg`, `mascot-breathe`) on the left with a new
    `.speech` bubble ("What kind of post?") whose left-pointing tail (two stacked
    triangles, outer=`--blue` border, inner=`--panel` fill) points at it.
    Dropped the old `.lead` "What kind of post?" text (the bubble replaces it).
  - The progress bar started **static at 25%** here; v0.63 (above) wired it to
    advance across the whole New Post flow.
  - Icons kept as-is (emoji 🖼️/🔲/🎠 in the `.tile-icon` badges) — Brilliant's
    are custom flat illustrations; swapping ours to bespoke icons would be a
    separate art task.
  - Verified headless: bubble + tail render, mascot = thinking pose, bar = 25%,
    no horizontal overflow, no console errors. Screenshot eyeballed.
- 2026-07-17: **Pill buttons + clean tile boxes (Brilliant-app
  reference).** Owner liked Brilliant's button *shape* and option-box *shape*.
  Version → v0.61. Colour scheme deliberately left as-is (owner reviewed the
  6-theme round-1 gallery and chose to keep the current blue/orange).
  - **Buttons are now full pills/stadiums.** New `--btn-radius: 999px` token
    (kept separate from `--radius: 16px`, which still governs cards/tiles/
    previews/inputs); `.btn` uses it. All variants inherit, so primary/secondary/
    accent/ghost/sm/xl are all pills. The 3D edge is a solid `box-shadow: 0 4px 0`
    (home: `0 6px 0`) which follows border-radius, so the raised edge became a
    pill edge for free — matches Brilliant's raised-pill look with no extra work.
    The *only* visual gap between our buttons and theirs was the radius (ours
    were 16px rounded-rects); everything else (bold text, solid fill, chunky
    edge, press-down) already matched.
  - **Type/quiz tiles → clean uniform-bordered boxes.** Dropped the `border-left:
    5px solid var(--orange)` accent stripe on `.tile`; now one `1.5px var(--line)`
    border all round (border colour → `--blue` on `:active`). Shared by the type
    ("What kind of post?") AND quiz screens, so both match. The `.tile-icon`
    54×54 badge stays (it's what keeps the 3 mismatched emoji looking uniform —
    see 2026-07-16 note; Brilliant's icons are custom-consistent so they need no
    badge, ours do).
  - Verified headless (Chromium, localhost): `.btn` computes `border-radius:
    999px`; home pills render with the raised edge following the curve; type-
    screen tiles show uniform border (no stripe), r16; no console errors.
- 2026-07-17: **Bottom nav → floating capsule + active pill (Alan-app
  reference).** Owner shared the Alan app's nav and liked "the shape around the
  icons" + the tap animation. Version → v0.60.
  - **Capsule**: `.bottomnav` detached from the screen edges — `bottom: 10px +
    safe-area`, `width: calc(100% - 24px)` / `max-width: 460px`, `border-radius:
    26px`, all-round soft shadow (was an edge-to-edge bar with `border-top` and
    a top-only shadow). `--navh` 54→64px so the hub/home content padding still
    clears the now-floating bar (both use `calc(... + var(--navh) + safe)`).
  - **Active pill** replaces the old 6px dot: a `.navbtn::before` soft rounded
    rect (48×34, r13) sits *behind* the active icon and **springs in** (scale
    0.55→1 on `--spring`) when you land on the tab — that's the "shape around
    the icons" + the tap animation in one. Tint is `color-mix(in srgb,
    var(--blue) 15%, var(--panel))` so it **re-colours with whatever theme is
    active** (no hardcoded value). Same `is-active` semantics as before — the
    post button (no `data-nav`) only lights on the `type` screen via show().
    The icon keeps its `fx-nav-pop` bounce + `:active` press-scale.
  - Reduced-motion: the pill still appears but **snaps** (transform transition
    dropped, only bg/opacity fade) — added a `.navbtn::before` override in the
    reduced-motion block.
  - ⚠️ **Kept icon-only** (no text labels) to match the app's existing nav —
    the Alan reference HAS labels; owner was asked whether to add them as a
    follow-up. If added: New/Calendar/Generate/Settings labels, bump `--navh`
    again + revisit pill geometry (it'd wrap icon+label).
  - Uses **`color-mix()`** — first use in the app; fine for the modern
    mobile/PWA target. If an ancient webview ever matters, the fallback is a
    flat `--accent-soft`-style token.
  - Verified headless (Chromium, 390×844, localhost): capsule floats 10px up,
    12px inset each side, r26; active pill opacity 1 + tinted bg only on the
    current tab and moves correctly on tab change (calendar→settings); no
    console errors. Screenshot eyeballed.
- 2026-07-17: **Visuelt Pro is now the default app font (owner brand
  face).** Owner supplied the Visuelt Pro family (commercial — Colophon
  Foundry) and asked to use it. Wired into the existing font-picker system, made
  the default. Version → v0.59.
  - ⚠️ **LICENSING**: Visuelt Pro is a **commercial** font, NOT under the OFL
    that covers the other bundled faces (`assets/fonts/OFL.txt` does not apply
    to it). The uploaded files were **desktop TTFs**; serving it as a webfont in
    a PWA is a *separate* licence class. The owner is responsible for holding a
    webfont/app licence for it — flagged to them. If that's ever a problem, the
    swap-out is trivial: change the `:root --font-family` default back to
    Poppins + revert the 4 "visuelt"-vs-"poppins" default flips below.
  - **Files**: `assets/fonts/visuelt-{400,500,700}.woff2` (~74KB each) —
    converted from the TTFs with fonttools+brotli, **subset to Latin** (UI emoji
    come from the system emoji font, not this face). Visuelt ships only
    Regular/Medium/Bold, so the `@font-face` declares **Medium over
    `font-weight: 500 600`** and **Bold over `700 800`** — this keeps the app's
    600 (emphasis) rendering as Medium and distinctly lighter than 700+ headings,
    instead of collapsing 600 into Bold. Regular=400 covers body.
  - **Made the built-in default the proper way** (kept the "default = no
    `data-font` attribute" invariant, just repointed it): `:root --font-family`
    → Visuelt; **added an `html[data-font="poppins"]` override block** so Poppins
    stays selectable; flipped the hardcoded `"poppins"` default sentinel to
    `"visuelt"` in all **four** spots — `applyFont()` (js/app.js), the FOUC
    inline script (index.html, both the `||'"visuelt"'` fallback AND the
    `!== "visuelt"` guard), and `getFont()`'s default (js/store.js). FONTS list
    (js/config.js) gained the `visuelt` entry first (label **"Visuelt Pro"** —
    must match the @font-face family exactly, since the picker chip previews
    itself via `style="font-family:'<label>'"`); Poppins demoted to a normal
    option.
  - SW cache `v3`→`v4` so existing installs purge and pick up the new font.
  - Verified headless (Chromium, localhost): all five requested weights
    (400/500/600/700/800) resolve via `document.fonts.check`; body + buttons
    compute to "Visuelt Pro" with **no** `data-font` attribute on a fresh device;
    picker lists all 6 (visuelt first); selecting Poppins sets
    `data-font="poppins"` and switching back clears it (invariant holds); no
    console errors. Home screenshot eyeballed — Visuelt renders on greeting +
    buttons, logo lockup unaffected (baked into logo.svg).
- 2026-07-17: **Colour tokenise pass + 5 candidate themes (exploration,
  inert).** First step of a colour-scheme revamp the owner is picking by
  reaction ("know it when I see it"), Mobbin links from the owner incoming as
  extra candidates. Version → v0.58.
  - **Tokenise pass (zero visual change, verified):** every hardcoded colour in
    css/styles.css now routes through `:root` tokens — new ones: `--success`
    (the keep/posted green, was `#2b8a3e` ×9), `--ink-on-accent` (text on
    orange surfaces), `--accent-soft` (calendar working-day fill), `--stage`
    (dark editor stage), `--edge-accent`/`--edge-neutral` (home 3D button
    edges), `--blue-2` + `--hero-bg` (the home/onboarding gradient, now one
    token). Whites deliberately NOT tokenised — all themes keep light-on-dark
    heroes so the rgba(255,…) tints stay valid. Every non-white hex now
    appears exactly once, in `:root`.
  - **5 candidate themes** as `html[data-theme=…]` blocks right after the
    `data-font` blocks — same mechanism as the font picker: `duo` (bright
    green/yellow), `ember` (cream/paprika/mustard), `midnight` (dark),
    `poster` (chalkboard + hot red), `pastel` (lavender/coral). **Inert until
    something sets the attribute — nothing in the app does yet**; they exist
    for the round-1 comparison gallery (screenshotted all 6 incl. current
    across home/generate/calendar/settings/onboarding, headless, no console
    errors). NB semantics: `--blue` = "primary", `--orange` = "accent/CTA";
    themes reassign what those hold. `--ink-on-accent` exists because poster's
    red CTA needs white text where the others use near-black.
  - ⚠️ **These are tasting-menu candidates, NOT approved looks** — don't wire a
    picker or default any of them without the owner choosing. Known quirks for
    the eventual winner's polish pass: logo.svg's blue plate + mascot/Lottie
    colours are baked into artwork (CSS can't retheme them), and a handful of
    rgba brand-blue tints (shadows/glows, e.g. `.gen-brief-track`) still read
    blue in every theme — convert via color-mix() or per-theme values then.
- 2026-07-16: **Progress-bar step markers tried, then reverted.**
  Circle+tick step markers were added to both bars (v0.55), then the empty
  upcoming circles were hidden (v0.56) — but the owner decided against markers
  entirely and asked for the plain bar back. Fully removed: the `.pb-step`
  spans (index.html), the `.pb-step` CSS + the `pb-tick` keyframe, the
  `paintSteps()` helper and its calls in `obGo`/`goBriefStep`/`briefCook`
  (js/app.js), and the reduced-motion additions; the two track wrappers
  (`.ob-progress`, `.gen-brief-track`) restored to `overflow:hidden`. Net state:
  the fat, flat-orange, groove-shaded bars from v0.54 (no markers). If markers
  are ever revisited, the implementation is in git history around v0.55.
  Version → v0.57. **(Don't re-add step markers without an explicit ask — the
  owner tried them and preferred without.)**
- 2026-07-16: **Onboarding welcome logo removed + overflow-clip fix.**
  Owner: drop the Chuckling Wings logo on ob-welcome (keep just the chicken);
  also flagged the orange bar "covering" the photos on ob-photos. Version → v0.54.
  - Removed the `<img class="brand-logo ob-logo" src="assets/logo.svg">` from
    ob-welcome — the waving mascot is the only mark there now. `.ob-logo` CSS
    left in place (harmless, unused).
  - **The "bar covers the photos" was a real bug, not cosmetic.** `.ob-body` is
    a scrolling flex column that was `justify-content: center`. When the content
    overflows (e.g. a full photo grid), centering pushes the TOP of the column
    *above* the scroll area, where it can't be scrolled to — measured the mascot
    at `top:-68px` with `scrollTop` already pinned at 0, i.e. genuinely
    unreachable, tucked under the bar. Fixed with **`justify-content: safe
    center`**: centres when the content fits (short screens keep the nice
    vertical centering), falls back to top-aligned when it overflows so nothing
    clips. Verified: with 20 photos the mascot now sits at `top:+38px` (below the
    bar, reachable) and the body scrolls normally. Applies to every `.ob` screen
    (welcome/photos/places/done) since they share `.ob-body` — also protects
    ob-places with many pitches and small screens generally.
- 2026-07-16: **Progress-bar fill flattened back to minimal.** Owner
  liked the fat bar + the recessed-track shading but not the glossy gradient on
  the fill itself. Dropped the gradient + inset highlight/shade on `.ob-bar` —
  it's now a flat solid `var(--orange)` pill again. The track groove
  (`.ob-progress` / `.gen-brief-track` inset `box-shadow`), the 14px height and
  the 0.8s sweep all stay. Version → v0.53.
- 2026-07-16: **Both progress bars: fatter, shaded, slower.** Owner
  wanted them chunkier, with shading, and a longer sweep so the animation is
  actually visible. Applies to BOTH bars (they share the `.ob-bar` fill): the
  onboarding `.ob-progress` and the Generate-brief `.gen-brief-track`. Height
  6px → **14px**; tracks got an inset `box-shadow` groove; the `.ob-bar` fill is
  now a vertical orange gradient (`#ffb662 → --orange → #e07d10`) with a top
  white highlight + bottom shade (glossy pill); transition `0.45s → 0.8s`. The
  brief's "Cook 'em up" delay bumped `480ms → 850ms` so the sweep to 100% is
  seen before the deck cooks. Reduced-motion still disables the transition
  (`.ob-bar { transition: none }`). Verified headless: both tracks measure 14px,
  fill carries the gradient, and a mid-sweep width sample (105px) differs from
  the settled width (178px), confirming it animates; no console errors.
  Version → v0.52. **Open idea from owner**: a tick + circle marker at each step
  on the bar (not built yet — discussed).
- 2026-07-16: **One confetti look — the full-screen burst is always the
  Lottie now.** Owner: "there's 2 confetti effects, only use the lottie file
  one." There were two full-screen confetti visuals: the owner's DC-confetti
  **Lottie** (`playLottieConfetti`, fired on the real win in `markPostShared`)
  and the code-drawn **canvas** burst (`FX.confetti({quiet:true})` when landing
  on the keepers tray). `FX.confetti` used to gate the Lottie on `!opts.quiet`,
  so the quiet keepers-tray burst fell through to canvas — the mismatched second
  effect. Now the gate is `!localized` (localized = an x/y origin was passed):
  **every full-screen burst uses the Lottie** (quiet or loud — `quiet` only
  silences the chime), and the canvas is reached solely by the small localized
  `sparkle()` puffs (marking a workday, adding a pitch/hashtag — a full-screen
  Lottie can't originate from a tapped element) or as a fallback if the Lottie
  runtime/data isn't loaded. Verified headless: keepers tray now mounts
  `.fx-lottie` with no canvas `.fx-confetti` painted; no console errors.
  Version → v0.51. **Note**: the tiny per-tap sparkle puffs are still canvas by
  necessity — if the owner wants those gone too they'd become a plain `pop()`
  bounce (flagged to them).
- 2026-07-16: **Settings grouped into collapsible sections + New Post
  icon badges.** Owner: Settings "all a bit messy now"; New Post buttons
  "inconsistent... maybe rounded squares". Version → v0.50.
  - **Settings was 10 flat `.lead` sections in one long scroll.** Regrouped into
    **6 collapsible cards** (native `<details>`/`<summary>` — accessible, zero JS
    state, works offline): ① 📸 Photos & pitches (locations, my photos), ② ✍️
    Captions & hashtags (best sellers, hashtags, my captions), ③ 🔔 Reminders,
    ④ 🎨 Appearance (app font), ⑤ 💾 Backup & setup (backup/restore, run setup
    again), ⑥ 🚀 Auto-posting (Meta). The two everyday-content groups open by
    default; config/advanced start collapsed so the screen is short. **No JS
    change** — `openSettings()` still renders into the same inner IDs
    (`#locationList`, `#stashGrid`, `#menuList`, `#hashtagList`, `#userHookList`,
    `#fontChips`, notify/meta fields); only the wrapping markup moved. The dead
    inline `style="margin-top:28px"` per-section spacing was removed — `.sg-body
    > .lead` handles it now.
  - **Styling**: `.settings-group` card + `.sg-head` summary (flex; default
    disclosure triangle hidden via `list-style:none` + `::-webkit-details-marker`)
    with `.sg-title`/`.sg-sub` and a `.sg-chevron` that rotates 180° on `[open]`.
    Body reveals with a gentle `sg-reveal` slide/fade (close snaps — native
    `<details>` can't animate its own collapse without JS; a snap-shut is fine).
    `.settings-group[open] .sg-body` added to the reduced-motion disable list.
    `.sg-tag` is the small "advanced" pill on the Auto-posting title.
  - **New Post tiles looked "inconsistent"** because the three emoji (🖼️ framed
    pic / 🔲 plain square / 🎠 ornate horse) are wildly different in style and
    visual weight — the *buttons* were already identical rounded rectangles (all
    92px). Fix: `.tile-icon` is now a fixed **54×54 rounded-square badge**
    (`var(--panel-2)` bg, 14px radius, centred emoji) so all three present
    uniformly — the badge is the consistent shape, the emoji just sits inside.
  - Verified headless (Chromium, 390×844, localhost): all 6 settings groups
    render, every dynamic list still populates (locations 3, menu 3, hashtags
    34, fonts 5, etc.), tapping a header toggles `[open]` and rotates the
    chevron, no console errors; New Post tiles equal size with matching icon
    badges (screenshotted at 390/375/320). Version → v0.50.
- 2026-07-16: **Two consistency fixes on the brief + review.** Version → v0.49.
  - **Brief chips were centre-justified** (`.chips chips-centre`), which wrapped
    into a ragged centred block unlike every other chip screen in the app
    (Settings font picker, editor aspect picker — all left-aligned). Dropped
    `chips-centre` on all three brief steps so they wrap left-aligned from the
    container edge; mascot/title/hint stay centred (the fun onboarding feel).
  - **"Copy caption" / "Save image" on Ready-to-share were unequal.** They sit
    in a flex `.row` (`flex:1`, so equal *width*), but on a narrow/large-text
    screen "Copy caption" wrapped to two lines while "Save image" stayed one →
    different heights. Two-part fix: (1) `#reviewShareControls .row .btn {
    white-space: nowrap }` so neither wraps → equal height; (2) shortened the
    labels to **📋 Copy** / **⬇️ Save** — "Copy caption" (nowrap) is wider than
    half a 375px screen, so flex couldn't equalise the widths (172 vs 161);
    the short labels fit the half-slot, so flex makes them exactly equal at
    every width (verified 139/139 @320, 167/167 @375, 174/174 @390). The 📋/⬇️
    icons carry the meaning. Verified headless, no console errors.
- 2026-07-16: **Generate now starts with "the brief"** — three quick
  questions (owner: "at the moment there's no input and the posts are generated
  with Leadenhall"; wanted location/date/type input, made fun, with an
  onboarding-style progress bar and satisfying easing). Version → v0.48.
  - **Opening Generate no longer runs a batch immediately.** `openGenerate()`
    shows a `#genBrief` panel (new `genShow("brief")` state) with a progress
    bar + one question at a time, rendered into `#genBriefStep` by
    `renderBriefStep()` (steps need live data — saved pitches, real dates — so
    they're JS-built, not static HTML). Exception: an empty photo pool skips
    the brief straight to the existing add-photos empty state (no point
    briefing a batch that can't cook).
  - **The three steps**: ① Where — chips from `Store.getLocations()`, workday
    pitch (or last answer) preselected, plus a dashed "＋ Somewhere new" chip
    revealing an add row (saves via `Store.addLocation`, so it sticks
    app-wide); ② When — Today / Tomorrow chips (+ a chip for a calendar-passed
    or previously-picked other day) and a "📅 Another day" native date row;
    sets `{day}` in captions; ③ Vibe — **multi-select** chips (chips, not
    checkboxes — same tap pattern as the font/aspect pickers) mapping straight
    onto hook tags: location/brand/other/events, first three preselected to
    match the old hardcoded behaviour. The last selected vibe refuses to
    deselect (wiggles instead) — a batch needs ≥1 tag. `weather` deliberately
    not offered (weather-pinned hooks need a live condition Generate doesn't
    supply — roadmap).
  - **Answers live in the session `genBrief` object** (location/date/tags) so
    "Generate more" re-rolls the same brief and reopening Generate resumes
    last time's answers. `buildGeneratedPosts` now reads its tag list from
    `genBrief.tags` (both the main pick loop AND the relaxed fallback — the
    old fallback hardcoded brand/location, which would have polluted an
    events-only brief). The keepers zero-state gained a second ghost button
    "🎛 Change the brief" (`gen-brief` action) next to Generate more.
  - **Fun/easing mechanics**: steps 1–2 auto-advance off a single chip tap
    (`briefSelectAndAdvance` — pop plays, then ~380ms later the next step
    slides in; guarded by a `briefAdvancing` flag against double-taps).
    `.gen-q` slides in with `--ease-premium` from the right (`.from-back`
    variant from the left for "‹ Back a step"). The bar is a real `.ob-bar`
    inside a light-background `.gen-brief-track` (rgba blue, vs the
    onboarding's white-on-gradient), so it inherits the 0.45s premium-ease
    width sweep and the reduced-motion jump for free — 25/50/75%, then "✨
    Cook 'em up" sweeps it to 100% and waits ~480ms before `runGenerate()`.
    Same park-at-zero + forced-reflow trick as `obGo` when the panel unhides.
    Mascot per step: walk(sway) / thinking(breathe) / excited(breathe).
    `.gen-q` added to the reduced-motion disable list.
  - **Gotcha dodged**: the delegated click handler checks `[data-tag]` BEFORE
    `[data-action]` (it's the caption quiz's hook), so the vibe chips carry
    their tag in `data-val`, never `data-tag`.
  - Bonus: keeper cards' queue date now defaults to the brief's day when it's
    in the future (was always tomorrow) — queueing for the day you briefed for
    is the obvious intent.
  - Verified headless (Chromium, 390×844, localhost, seeded stash photo):
    32-check Playwright run — bar hits 25/50/75/100 with the park trick
    animating each move, chips preselect correctly, back-step slides from the
    left, an events-only vibe narrows the batch, both cook runs produce a
    10-card deck whose `#genInfo` names the picked day+pitch, "Change the
    brief" reopens step 1 with answers intact, "Somewhere new" saves and
    auto-advances, keeper queue date = the brief's future day. Screenshots
    eyeballed; no console errors.
- 2026-07-16: **"Generate more" — but only once there's nothing left
  to act on.** Follow-up to the swipe-deck declutter below: after removing the
  always-on "New batch" button, the owner clarified they don't want a reshuffle
  offered while there's still a card to swipe or a kept post sitting unposted
  in the tray — only once the batch is genuinely finished (nothing kept, or
  everything kept has been posted). Version → v0.47.
  - New `keptTotal` counter (js/app.js, alongside `keepers`) tracks how many
    cards were swiped right **this batch**, independent of `keepers.length`
    shrinking as each one gets posted (`returnToKeepers` splices the posted
    item out). Reset to 0 in `runGenerate()`, incremented in `decideCard()`.
  - `showKeepers()`'s zero-keepers branch (hit both when nothing was kept AND
    after the last keeper is posted, since both leave `keepers` empty) now
    branches on `keptTotal` for the message — "None kept this round — no
    worries." vs "All posted — nice work! 🎉" — and both render a
    "🔀 Generate more" button (`data-action="gen-regenerate"`, the same action
    the old always-on button used, still wired from the previous change) inside
    a `.gen-empty`-classed wrapper (existing empty-state styling: centred flex
    column, auto-width button) so it doesn't stretch full width like a bare
    `.btn` would.
  - **Deliberately NOT shown**: mid-deck (there's always a next card to swipe,
    the deck reshuffling itself isn't meaningful), or with unposted keepers
    still in the tray (`keepers.length > 0` — Post/Customise/Queue are still
    the point). Queueing a keeper does NOT remove it from `keepers` (only
    posting does, via `returnToKeepers`), so a tray that's fully queued-but-
    not-posted correctly stays on the action list, not the "generate more"
    empty state — matches the owner's framing of "posts complete."
  - Verified headless (Chromium, 390×844, localhost, real swipe-deck runs
    against a seeded stash photo — not just DOM inspection): binning all 10
    cards → "None kept this round — no worries." + one Generate-more button;
    tapping it re-rolls a fresh 10-card batch; keeping 1 card → tray shows
    "You kept 1 🎉" (no Generate-more button while it's sitting there) →
    Post → Share → "← Back to my kept posts" → tray now shows "All posted —
    nice work! 🎉" + Generate-more button. No console errors either pass.
- 2026-07-16: **Generate swipe deck decluttered.** Owner wanted the
  Tinder-style deck simpler. Version → v0.46.
  - **Like heart turned green** (was orange, `--orange`): `.swipe-btn.like`
    now uses `#2b8a3e` — the same green already used for the `.swipe-badge.keep`
    "KEEP" stamp and the calendar's `posted` state, so this just makes the ♥
    button consistent with a green that was already in use elsewhere, not a
    new brand colour. `.swipe-btn.nope` (✕, `--error` red) untouched. NB this
    is the round ♥/✕ button pair, not the red heart-burst Lottie
    (`assets/lottie/heart.js`, `FX.heart()`) that pops on a keep swipe — the
    owner's ask was specifically "the heart on the tinder bit", i.e. the
    button, and the Lottie asset's colour is baked into its animation JSON
    (not a CSS-swappable value) so it stays red.
  - **Removed "Swipe right to keep, left to bin — or tap the buttons."** →
    now just "Swipe right to keep, left to bin." The ♥/✕ buttons
    (`gen-like`/`gen-nope`) are unchanged in the DOM/JS — still the
    reduced-motion/no-drag fallback path — only the hint sentence fragment
    calling them out was cut.
  - **Removed the `#genFolderRow` buttons** ("📁 Photo folder" / "🖼️ Pick
    photos" on touch devices, per `adaptPhotoPickers`; and "🔀 New batch")
    **and `#genPoolNote`** ("📸 N photos loaded" / "No photos loaded — add
    some in Settings…") from the Generate screen entirely (index.html).
    `refreshPoolUi()` (js/app.js) still updates the single/collage pickers'
    pool notes (`#singlePoolNote`/`#collagePoolNote`) — only the Generate-
    specific `genNote` block was dead-code-removed since its target element
    no longer exists.
    - **Net effect: no in-panel way to start a fresh batch or re-pick photos
      from Generate.** ⚠️ Partly superseded by v0.48: opening Generate now
      lands on the brief (not an auto-run batch), and the keepers zero-state
      offers "🎛 Change the brief" — but re-picking photos from Generate is
      still gone, as decided here. The underlying JS/DOM the buttons drove — `data-action=
      "gen-folder"` case, `#genFolderInput` (hidden file input),
      `onGenFolderPicked` — were deliberately left wired but now unreachable
      from Generate (same "leave the plumbing, drop the UI" call as the
      2026-07-12 sound-layer removal) in case the owner wants a way back in
      later; nothing else on Generate references them.
    - The stale code comment on `showKeepers()`'s zero-keepers branch
      ("`#genFolderRow` already shows one on every Generate panel") was
      removed along with the row it referred to.
  - Verified headless (Chromium, 390×844, localhost): `#genFolderRow` and
    `#genPoolNote` both absent from the DOM, the deck hint reads the trimmed
    text, `.swipe-btn.like` computes to `rgb(43, 138, 62)`, no console errors.
- 2026-07-16: **Menu pivot — the stall no longer sells wings.** Owner
  kept the "Chuckling Wings" name but stopped doing wings (too slow to cook); it
  now sells **chicken nuggets, chicken burgers and home-made sauces**, all still
  **100% gluten free**. Three linked changes, all verified in-browser. Version → v0.45.
  - **The caption/sticker generator (aka "the hook library",
    `data/streetfood_hooks.json`) said WINGS ~48 times as the food** — 22
    captions + 26 overlays (e.g. "NO GIMMICKS, JUST WINGS", "THE CURE IS HOT
    WINGS"). All rewritten to **nuggets** (primary short word — mirrors the
    all-caps punch of WINGS on stickers) with **burgers** worked into several
    captions. Gluten-free claims (51 of them) **kept verbatim** — owner confirmed
    the new items are all certified GF. The two "swing by" lines were NOT touched
    (regex must exclude `swing`). Done via an explicit phrase-map script (each
    old string asserted to appear an expected N times before replacing — no blind
    global `WINGS→NUGGETS`, which would corrupt "swing" and could hit the brand
    name). Script lives in the session scratchpad, not the repo.
  - **`data/streetfood_hooks.js` is a generated mirror** (`window.HOOK_LIBRARY =
    <the JSON>;` + a 3-line header) — regenerated from the JSON in the same
    script. Verified byte-for-byte equal payload via `json.loads` on both.
  - **Menu items now seed from config.** `getMenuItems()` (js/store.js) used to
    return `[]` with no seeding; it now seeds `APP_CONFIG.DEFAULT_MENU`
    (`["nuggets", "chicken burgers", "home-made sauces"]`, new in js/config.js)
    on first run, exactly like `getLocations()`. These fill the `{item}`
    placeholder — but only **6 of 130 hooks** use `{item}`, so the item list
    barely drives captions; the wings→nuggets hook rewrite above is what actually
    changes the output.
  - **Seeded hashtags de-winged**: `DEFAULT_HASHTAGS` swapped `#chickenwings /
    #wings / #wingwednesday` for `#chickennuggets / #chickenburger / #glutenfree
    / #glutenfreelondon` (gluten-free is a strong discovery niche for him).
  - ⚠️ **Owner's existing device keeps the OLD seeded menu/hashtags** — both seed
    only on first run (null check), and his phone seeded long ago. The new
    DEFAULT_MENU *will* appear for him only because menuItems was never written
    before (it seeds on next read); but his hashtags are already stored, so the
    old wings tags stay until he removes them in Settings by hand. New installs
    get everything fresh.
- 2026-07-15: **Reframe/re-crop in Customise mode** (owner: "I cannot
  reframe the images when in customise mode"). Customising a Generate keeper now
  opens the **full editor** on the RAW photo instead of the text-only editor on a
  pre-composed square, so the aspect chips (Square/Portrait/Landscape/Story),
  zoom and pan all work — you can genuinely re-crop the original photo, not just
  zoom into an already-squared one. Filters/Adjust come along for free too. The
  sticker is still a movable overlay and the Text tab is where you land, so the
  primary sticker-move gesture is unchanged.
  - **`customiseKeeper` (js/app.js)** dropped `mode: "text"` + the
    `renderSingle(g.rawImg, null)` pre-compose; it now passes `g.rawImg` straight
    to `Editor.open(..., { startTab: "text", selectFirst: true })`. With no
    editState the editor defaults to Square/zoom 1/centred, which cover-fits the
    photo **identically to the card's default bake** (both are `drawCover` into
    1080² = `APP_CONFIG.EXPORT` = `ASPECTS["1:1"].export`), so nothing shifts
    until you actually reframe. Re-customise restores the full editState (aspect
    + zoom + offset + filter + overlays), so a reframe survives a re-open.
  - **New `opts.startTab` on `Editor.open` (js/editor.js)** — full mode now honours
    it (`showTab(modeText ? "text" : (opts.startTab || "filters"))`); collages
    still force text via `modeText`. Landing on the Text tab keeps `textMode()`
    true so the seeded sticker shows selected and single-finger drags IT; to pan
    the photo you switch to Filters/Adjust (same established single-editor UX).
  - **Re-square bug fixed along the way**: a reframed keeper is now a non-square
    export, but the tray's **Post** (`postKeeper` → `seedPostFromGen`) and the
    **queue draft** (`postFromDraft`) both fed the image through `renderSingle`,
    which cover-fits back into 1080² and would have squared a Portrait/Story post
    on the way out. Fixed by routing already-composed images through
    `composePostImage`'s `post.baseImage` branch (`renderPrepared`, draws at the
    image's own size): `saveCustomiseToKeeper` sets `g.customised = true`,
    `seedPostFromGen` does `if (g.customised && g.img) post.baseImage = g.img`,
    and `postFromDraft` sets `post.baseImage = img` (the draft blob is ALWAYS a
    finished composite, so drawing it as-is is strictly more correct — a default
    square keeper is byte-identical either way). Un-customised keepers keep the
    `renderSingle` path so the rare raw-image fallback still gets squared.
  - Verified headless (Chromium, 390×844, localhost): Generate → keep →
    Customise opens the full editor (aspect chips + zoom visible, `mode-text`
    absent, Text tab active, panel in `sticker-mode`); reframing to Portrait
    yields a 1080×1350 customise preview; Save → Post-from-tray stays 1080×1350
    (1.25), i.e. NOT re-squared; no console errors. Version → v0.43.
- 2026-07-15: **Font-picker follow-up: buttons weren't changing font +
  Settings header renamed.** Owner-reported bugs from the v0.41 font picker.
  - **Buttons/inputs/selects stayed on Arial regardless of the picked font.**
    Root cause: browser UA stylesheets give `button`/`input`/`select` their
    own system font rather than inheriting the page's — the v0.41 CLAUDE.md
    note claiming "every other element already used `font-family: inherit` or
    nothing" was wrong for form controls specifically (it held for plain text
    elements like `<p>`/`<span>`, which really do inherit). Fixed with one
    rule right after the `*` box-sizing reset: `button, input, select,
    optgroup { font-family: inherit; }`. The `.font-chip` previews in the font
    picker itself are unaffected (each sets its own font via a higher-
    specificity inline `style`, which is the point — they preview a font
    other than the active one).
  - **Settings header "Menu & Settings" → "Settings"** (owner: drop "Menu").
  - Verified headless: `getComputedStyle` on `.btn`, `<select>`, `<input>` all
    report the active picked font (tested with Baloo 2) instead of Arial;
    font-picker chips still preview their own font correctly; Settings header
    reads "Settings"; no console errors. Version → v0.42.
- 2026-07-14: **App-wide font picker** (Settings → 🔤 App font, owner
  request for "a fun friendly Duolingo feel"). Five options: Poppins (existing
  default), Fredoka, Baloo 2, Nunito, Quicksand — all rounded/friendly Google
  Fonts, bundled locally as static woff2 (same offline-first reasoning as the
  existing Poppins/Oswald/Pacifico/Space Mono @font-faces; SIL OFL, see
  `assets/fonts/OFL.txt`). Weights fetched match what the app already uses
  (500/600/700, +800 for Baloo 2/Nunito which have it — Fredoka/Quicksand cap
  at 700, so a 800-weight rule just renders their 700 face, no error).
  - **One CSS variable is the whole mechanism**: `--font-family` in `:root`
    (default Poppins stack) is the only thing `html,body`'s `font-family`
    reads; every other element in the app already used `font-family: inherit`
    or nothing, so flipping this one variable reskins the entire UI with no
    per-component changes. `html[data-font="fredoka"]` (etc.) override blocks
    swap it; `applyFont(id)` (js/app.js) sets/clears that attribute.
  - **Not the same font system as the editor's text tool** (Oswald/Pacifico/
    Space Mono in `TEXT_STYLES`, `js/editor.js`) — that's per-post caption
    styling baked into exported images; this is the live app chrome (menus,
    buttons, headings). Deliberately kept separate; don't merge them.
  - Settings renders `#fontChips` (`.chips`/`.chip`, the same reusable "pick
    one" pattern as the editor's aspect-ratio chips) via `renderFontPicker()`,
    each chip's label set in its own font via inline `style="font-family:…"`
    — same trick `.style-chip` already used for text-style previews — so the
    picker doubles as a live sample. Choice saved via `Store.getFont()/
    setFont()` (key `sfp.font`, default `"poppins"`); the option list lives in
    `APP_CONFIG.FONTS` (js/config.js) — adding a 6th font means a font entry
    there + an `@font-face`/`html[data-font=...]` pair in styles.css.
  - **FOUC fix**: a small inline `<script>` in `index.html`'s `<head>` (before
    the stylesheet's owner reads anything else) reads `sfp.font` straight out
    of `localStorage` and sets `data-font` before first paint — `Store` isn't
    loaded yet at that point in the parse, so it can't go through the normal
    API. `boot()` also calls `applyFont(Store.getFont())` once app.js is up,
    so the attribute is never dependent on the inline script alone.
  - **Deliberately left out of Backup & restore**: this is a device display
    preference, not trader content (same class of thing as "don't sync theme
    across devices"), so `backup.js` wasn't touched — a restore leaves
    whatever font the new device already had.
  - Verified headless (Chromium, 390×844, `http://localhost:5173`): all 5
    families report `document.fonts.check(...) === true`; picking a chip
    changes `getComputedStyle(document.body).fontFamily` immediately and
    re-renders the whole Settings screen in the new font (screenshotted);
    `localStorage.sfp.font` and the `data-font` attribute agree after a
    reload, with the attribute already correct before `boot()` runs (no
    flash); no console errors. Version → v0.41.
- 2026-07-14 (later still): **Fixed queue/history buttons rendering unequal
  width** (~122px each instead of the intended half-screen split) — the v0.39
  change below wrapped them in `.row`, but `.home` is a `flex-direction:
  column; align-items: center` container, which shrink-wraps any
  intrinsic-width child to its content size instead of stretching it to the
  column's full width. `.row` has no explicit width, so it shrank to fit its
  two buttons' natural content size, and `flex:1` on the buttons only ever
  divided up *that* shrunk space rather than the available ~half-screen
  width. Fixed with `.home .row { width: 100%; }` — same trap `.ob-add {
  width: 100%; }` already works around for the onboarding add-place row (see
  the History API / flexbox gotchas above), so this is the second time it's
  bitten a `.row` nested in a centred flex column. **Any future `.row` (or
  other intrinsic-width flex child) dropped inside a `align-items: center`
  flex column needs an explicit `width: 100%` or it'll silently shrink-wrap.**
  Verified headless: both buttons now measure equal width (166px each on a
  390px viewport, ~48.5% of the available column width). Version → v0.40.
- 2026-07-14 (later): **Home screen: half-width queue/history buttons +
  debug onboarding entry point.** Owner request. `🗓 Post queue` and
  `🔁 Run it back` were both full-width `.btn-secondary` stacked; now wrapped
  in the existing `.row` div (flex, already used elsewhere for side-by-side
  buttons) with `.btn-sm` added, so they sit side by side at half width/
  smaller padding. Added `🧪 View onboarding (debug)` below them — a
  `.btn-ghost.btn-sm` reusing the **existing** `data-action="ob-restart"`
  (same action Settings → 🧭 Setup → "Run setup again" already used, no new
  JS), so tapping it calls `startOnboarding()` straight from home. **Owner
  said they'll remove this later — it's a temporary test button, don't design
  around it staying.**
  - **Stagger gotcha hit immediately**: `.home .btn:nth-of-type(n)` (the
    entrance-animation delays noted below) counts position among same-type
    siblings *of the same parent* — wrapping the two buttons in `.row` resets
    their counting to that div's children, so without a fix they'd collide
    with new-post/generate's delays (both landing on 0.20s/0.28s) instead of
    continuing the sequence. Added explicit `.home .row .btn:nth-of-type(1)/
    (2)` and `.home > .btn:nth-of-type(3)` overrides so the debug button
    stays last in the stagger. Confirms the existing gotcha note below is
    real and not just theoretical.
  - Verified headless (Chromium, 390×844, `file://`): queue/history render
    side by side at half width, debug button reaches `ob-welcome` with no
    console errors, screenshot confirms layout. Version → v0.39.
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
  - **Optimised 134.8KB → 76.4KB (43%)**, rendering unchanged. The export was an
    **auto-traced raster**, not hand-drawn vectors — the tell is 199 distinct
    fills across 337 paths, where clusters like `#062035/#072033/#082134/…` are
    eight names for one navy (the flat poses use 4–8 brand colours). Pipeline,
    in order: drop `display:none` leftovers (one invisible path was shipping its
    full `d` data); quantise fills within 8/255 to one representative (199 → 73);
    merge **consecutive** same-fill sibling paths only (337 → 232 — merging
    non-adjacent ones would hoist a path over whatever sits between and change
    z-order); then `npx svgo@3 --multipass -p 2`.
    - **Where the win actually comes from**: SVGO alone gets 41% — the bulk is
      path coordinate data, so the colour work is worth only ~3KB. Its real
      value is cleanliness, not bytes.
    - Verified by pixel-diffing both against each other on the real background:
      SVGO's change is 0.007% of pixels (edge antialiasing), the quantiser's is
      1.05% but bounded at delta ≤7/255 by construction, and path-merging adds
      exactly zero. **Check SVGO keeps the viewBox** — it's cropped here and a
      rewrite would silently rescale the art.
  - **The stall is the same blue as the screen it sits on — fixed in CSS.**
    Measured: stall body/canopy `rgb(9,76,160)` vs the `.ob` gradient's
    `rgb(10,77,161)` — one value per channel apart, i.e. identical (the trace
    approximated `--blue` #0a4da1 and missed). The canopy and counter dissolved
    into the backdrop and the tent's peak was invisible entirely. Fixed with
    **four zero-blur `drop-shadow()`s on `.ob-scene`** that trace the alpha
    silhouette into a white "sticker" outline, plus one soft shadow to lift it.
    Works off the alpha channel, so it survives an SVG→PNG swap. Lesson for any
    future art on the onboarding gradient: check the fill palette against
    `--blue` before dropping it on there.
  - **If this art is ever re-exported, ship the RASTER, not a trace.** Measured
    at the 288px display size: traced SVG 74.6KB, vs 3x PNG (900x681) 69.4KB and
    3x WebP 35.2KB — the raster is *smaller than the trace and pixel-exact to the
    original*, since the trace is a lossy approximation that invented 199
    colours. Tracing a raster to "get a vector" is a net loss here.
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
