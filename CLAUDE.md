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

## Notable changes
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
