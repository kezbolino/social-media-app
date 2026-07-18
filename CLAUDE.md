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
- 2026-07-18 (latest): **New stall.svg (owner re-draw, v0.68).**
  Owner supplied a fresh hand-vectored `stall.svg` (a proper Illustrator export,
  not a trace) to replace the auto-traced 76KB file. Swapped it into
  `assets/mascot/stall.svg` — now **24KB** (a third the size) and clean vectors.
  New art is a **250×250 square** viewBox (the old was cropped landscape
  247×186), so on ob-places it renders as a ~288px square scene via `.ob-scene`
  (width-sized). The canopy blue is `#0252C5` — brighter/more saturated than the
  onboarding gradient's `#0a4da1`, so the old blue-on-blue dissolve is less of an
  issue, but the `.ob-scene` white-outline drop-shadow treatment stays (helps and
  doesn't hurt; works off alpha so it survives an SVG→PNG swap). Verified in the
  real ob-places screen (renders, white sticker-edge visible, no console errors).
  SW cache `v5`→`v6` so installs purge the old asset. **The old traced pipeline
  notes below (2026-07-14 stall entry) are now historical — this is a clean
  source, so don't re-trace it.**
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
