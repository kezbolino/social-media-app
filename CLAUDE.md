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

## Notable changes
- 2026-07-11: **Movable sticker text on generated posts.** Keeper "Customise"
  (`customiseKeeper` in app.js) now opens the photo EDITOR (was: caption screen)
  on the clean un-baked photo, with the burned-in sticker recreated as a movable
  text overlay — drag / pinch-scale / rotate / size & rotate sliders all move
  the WHOLE sticker (solid rounded box + text + tilt) as one unit; the editor's
  `getResult()` re-bakes it wherever it lands, so the moved sticker is what gets
  shared (review uses `post.baseImage` via `composePostImage`).
  - `js/editor.js`: overlays gained an optional `sticker` field
    `{bg,color,accent,shadow}`. `drawTextOverlay` routes such overlays to a new
    `drawStickerOverlay` that faithfully ports `Imaging.drawCaptionSticker`'s
    look (W-relative pads/radius/shadow, wrap to ≤3 lines within 0.84·W, accent
    bar) but honours `cx/cy/rot/size` — `ov.size` is the target font (% of W),
    shrinking proportionally only if needed to keep ≤3 lines, so preview and
    export render identically. Sets `ov._box` for hit-testing and draws the
    dashed selection rect, so all existing drag/pinch/slider/delete machinery
    just works. Colour swatches/eyedropper/colour-picker set `ov.sticker.color`
    when a sticker overlay is selected. `Editor.open` gained back-compatible
    `opts.startTab` + `opts.selectFirst` so Customise lands on the Text tab with
    the sticker pre-selected.
  - `js/app.js`: `buildGeneratedPosts` items now also carry `baseImg` (the raw
    decoded photo) and `sticker: {text, style}` (the spec that was baked), so
    Customise doesn't double-bake. `customiseKeeper` maps that into
    `post.editState.overlays[0]` (cy 0.82 ≈ the baked bottom spot, size
    `9.5·sizeScale` ≈ maxFont W·0.095), sets `post.fromHistory = true` so editor
    Next → seeded caption → review (no quiz), and seeds `captionText` with the
    BARE line (`goToSeededCaption` re-applies a fresh hashtag block — keeping
    `g.hashtags` on it would double-append). Caption Back → editor → generate.
    Version → v0.13.
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
