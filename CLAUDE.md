# CLAUDE.md — Project Memory

Living notes for working in this repo. Keep this file lean — it loads in full
every session. Durable facts, conventions, and hard-won gotchas go here; the
blow-by-blow per-version history lives in **`CHANGELOG.md`** (not auto-loaded)
and in `git log`. When you ship, add a terse line under "Recent changes" and a
fuller entry to `CHANGELOG.md`.

## What this is
"Chuckling Wings — Wingman": an offline-first PWA that helps a street-food trader
build social posts (single photo / collage / carousel), get a pre-written caption
with location & day filled in, and share via the system share sheet. No build step —
plain HTML/CSS/JS that runs by opening `index.html` directly (`file://`) or via a
static server. Currently **v1.00**.

The stall sells **chicken nuggets, chicken burgers and home-made sauces**, all
**100% gluten free** (it dropped wings — too slow to cook). The caption/sticker
copy in `data/streetfood_hooks.json` (mirrored to `.js`) is written around that.

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
  (editor, imaging, publish, store, photos, drafts, backup, sound, fx, mascot,
  weather, etc.), loaded via `<script>` tags at the bottom of `index.html`.
- Persistence: `Store` (localStorage) for text/config; `Photos` + `Drafts`
  (IndexedDB) for image blobs — the photo stash, queued posts, and history
  thumbnails.
- Bottom nav (`.bottomnav`) is persistent on hub screens: **Home / New / Generate /
  Calendar / Settings** (Generate is the dead-centre slot). It's the primary way to
  reach Calendar & Settings.

## Working style / release rules
- ⭐ **Don't let a cheap proxy stand in for the answer, and don't inherit
  load-bearing claims from these notes without re-checking.** Repeatedly, a quick
  proxy has told a tidier story than the evidence and nearly got working code
  rewritten: a line-by-line diff called local work "missing upstream" when it was
  the same feature renamed; `git stash apply --check` reported a phantom conflict;
  a scroll check measured the wrong element and invented a bug. When a claim
  decides whether code gets rewritten or thrown away, go look at the thing itself.
  This applies to CLAUDE.md/CHANGELOG.md too — they record what was true when written.
- ⭐ **Version bump (do automatically, never ask):** every shipped feature/
  enhancement MUST bump `#appVersion` in `index.html` in the *same* change, before
  committing. Increment the patch (v0.99 → v1.00). The one version source is that
  single line at the bottom of the home screen.
- ⭐ **The branch's version number is PROVISIONAL; reconcile at merge time.**
  Parallel sessions branch off `main` and each bumps to the same next number, so
  two branches routinely both claim e.g. v0.90. This is NOT a git conflict (both
  made the identical one-line edit), so a merge silently keeps one and the other
  feature gets no bump. **When merging a branch into `main`, re-check `#appVersion`
  by hand**: if main's version ≥ the branch's, set it to main's current + 1. Same
  trap hits the "latest" changelog entry — both branches prepend at the same spot,
  so hand-merge and keep BOTH.
- **Push at the end of every session** before switching devices, and **merge or
  bin branches promptly.** The owner works across Mac CLI (commits straight to
  `main`) and Claude web/mobile (isolated containers that can only push a `claude/*`
  branch + hand back a PR). That surface split is why branches accumulate and
  versions collide. Unpushed Mac work has caused a "never pushed → rebuilt"
  divergence before. ⚠️ Remote branch deletion is blocked here two ways
  (`git push --delete` → 403 proxy; no delete-branch MCP tool) — deleting branches
  is always the owner's job in the GitHub UI.
- **Service worker cache:** bump the `sw.js` cache version (e.g. `v10`→`v11`)
  **whenever a cached asset filename changes** (new/renamed fonts, icons, sounds,
  SVGs) so installs purge the old file. Pure JS/CSS/markup edits don't need it (SW
  is network-first). The SW fetches with `cache:"no-store"`, registers with
  `updateViaCache:"none"`, and a `controllerchange` listener reloads once on a new
  SW so deploys swap in without a manual hard-refresh.

## Conventions / gotchas
- **This app scrolls on `body`, not `documentElement`** (`body { overflow-y:auto }`).
  Verify scroll/clearance with `document.body.scrollTop`, NOT `window.scrollTo`/
  `documentElement` — measuring the wrong element has mis-read working fixes as broken.
- **Screen architecture is a `display`-toggle SPA**: exactly one `.screen` is
  `.is-active`; the outgoing one just `display:none`s. Transitions are *incoming-
  only* by design (`fx-wipe-fwd/back`). Do NOT rebuild these into true dual-screen
  slides without reworking `show()` — high white-screen-bug risk.
- **Route every screen change through `show(screen)`** — it pushes a history entry
  and a `popstate` listener re-shows it, so the phone's hardware/gesture back button
  stays in sync. Hand-rolling `.is-active` toggles reintroduces the old
  back-button-white-screens-the-app bug for that path.
- **Cross-script modules use the `const X = (()=>{})()` IIFE pattern.** A top-level
  `const` in a classic `<script>` is a lexical global (reachable by bare name, e.g.
  `Store`, `Photos`) but is NOT a `window` property — so any `if (window.X)` guard
  needs the module to also do `window.X = X` (see tails of `js/photos.js`, `js/fx.js`).
- **IndexedDB transactions go inactive** once control returns to the event loop.
  Create each transaction and issue all its requests synchronously (no `await`
  between), and resolve on `tx.oncomplete` — don't `await` a store handle then write
  to it. (See `js/photos.js` / `js/drafts.js`.)
- **Reduced motion:** every new keyframe/animation/transition MUST be added to the
  `prefers-reduced-motion` disable list at the bottom of `styles.css`. Essential
  progress feedback (e.g. the busy-button spinner) is the deliberate exception.
- **Entrance animations must use `animation-fill-mode: backwards`, NOT `both`** — a
  forwards fill keeps overriding `transform` after the animation ends and froze the
  home buttons' 3D press-down.
- **Flexbox traps (bitten several times):** (a) a text input in a flex row needs
  `min-width: 0` or the row overflows and focusing it scrolls `#app` sideways; (b) a
  `.row` or other intrinsic-width child dropped inside an `align-items:center` flex
  column shrink-wraps — give it `width: 100%` (same fix `.ob-add` uses); (c) any
  scrollable box needs explicit `overflow-x: hidden` or the x-axis computes to `auto`
  and hands it a sideways scrollbar the html/body lock can't reach.
- **`.navbtn svg` specificity trap:** the base `.navbtn svg` rule out-specifies a
  bare decorative-SVG class, resizing/repositioning it. Any new `<svg>` inside a
  `.navbtn` must be scoped (e.g. `.navbtn-center .star-a`) to win.
- **Home button entrance stagger** (`.home .btn:nth-of-type(n)` delays) counts
  position among same-type siblings of the same parent — adding/removing/wrapping
  home buttons shifts it. Cosmetic only, but wrapping buttons in a `.row` resets the
  count and needs explicit `nth-of-type` overrides.
- **Back buttons** use `class="back"` with just the `‹` glyph (no "Back" text),
  `aria-label="Back"`, 44px min tap target. `data-back` value = the screen to return
  to (empty string = default/home flow).

## Verification (headless Chromium)
The house standard is to verify UI changes by driving the real app headless at
390×844 (and 375/320 for layout), asserting DOM/computed state, and eyeballing a
screenshot — reporting console-error count (target 0). **A bundled driver now
exists** — the `ship-and-verify` skill (`.claude/skills/ship-and-verify/`) carries
`scripts/verify.mjs` (the tested drive) and the release checklist; prefer it over
re-improvising, and let it fire when wrapping up a change.
- This env has **no bundled Playwright**. Install transiently: `npm i --no-save
  playwright-core` (gitignored), launch with `executablePath:
  /opt/pw-browsers/chromium-1194/chrome-linux/chrome`, and run a scratchpad script
  with `NODE_PATH=<repo>/node_modules`.
- **Verify by asserting bounds/config, not by watching animations:** the in-app
  preview tab is `visibility:hidden` with rAF paused, so Lottie/confetti/CSS-
  transition timing never advances there.
- **Stale-JS caching (cost real time twice):** `npm start`/`python http.server`
  send no cache headers, so browsers heuristically cache `js/*.js` and silently run
  stale code — a good fix can look broken. Tell: the resource's `transferSize` is 0
  in `performance.getEntriesByType("resource")`. Clear by `fetch(url,{cache:"reload"})`
  over every `script[src]`/stylesheet, then reload. Preview-only; the live SW is
  network-first.

## Feature systems (where things live)
- **Appearance pickers** (Settings → 🎨), all attribute-swap on `<html>` + a FOUC
  inline script in `<head>` + a `Store` getter/setter: **font** (`data-font`,
  default **Visuelt Pro** — ⚠️ commercial licence, owner's responsibility; others
  are OFL) and **button style** (`data-btn="ios"` for flat iOS look vs the default
  chunky 3D pill). Five `data-theme` colour candidates exist in CSS but are **inert
  and unapproved** — don't wire a picker without an explicit ask.
- **Editor text tool** (`TEXT_STYLES` in `js/editor.js`) — 5 IG-Story-style presets
  mapped to bundled OFL fonts; separate from the app-chrome font picker, keep them so.
- **Generate** opens on "the brief" (When → Where → Vibe, `genBrief` session
  object), then a Tinder-style swipe deck of up to 10 posts; kept cards land in a
  tray to Post/Edit/Queue. Sticker overlay is movable in the editor.
- **Queue for later** & **history** persist composed image blobs in the `Drafts`
  IndexedDB store; **backup/restore** (`js/backup.js`) exports everything as one JSON
  (blobs inlined) but deliberately excludes Meta credentials and history images.
- **Onboarding** (`ob-welcome → ob-photos → ob-places → ob-done`) gates on
  `Store.getOnboarded()`; re-run via Settings → Run setup again.
- **Mascot** — vector poses in `assets/mascot/*.svg`, served via `js/mascot.js`
  (semantic state names alias to pose files). ⚠️ Every pose SVG still has a cream
  full-silhouette underlay (shape index 0) that shows as white artifacts on the blue
  onboarding gradient — an unfixed follow-up (one-path deletion per file, needs
  per-pose verification).

## Roadmap ideas (from a competitor review, 2026-07-12)
Benchmarked against Buffer/Later/Planoly/Meta Business Suite/Canva + the 2026
food-truck playbook (short-form video + Google Business Profile). **Built since:**
Story export (9:16), Queue for later, backup/restore, visual history thumbnails.
**Not yet built, roughly prioritized:**
- Quick wins: recurring workdays ("every Friday = Greenwich"), hashtag sets per
  location, tag stash photos by dish (fixes Generate photo/caption mismatch),
  static best-time-to-post nudge.
- Medium: basic video/Reels sharing (pick clip → caption → share sheet), post
  insights via the Meta Graph API (credentials already stored), carousel parity
  (per-frame edit + direct publish), open-when-due auto-publish for due queue items,
  weather-aware nudges (weather buckets, weather-pinned hooks, reminders all exist
  but aren't linked), a Google Business Profile helper workflow.
- Bigger bets: a Capacitor wrap (anticipated in `notify.js`/`share.js` comments —
  unlocks real background reminders), branded collage overlays (the `renderCollage`
  overlay-PNG system exists and is unused), optional online-only AI caption assist
  (off by default), a menu/price board generator reusing the imaging pipeline.
- Deliberately NOT recommended: team features, cloud sync, true background
  auto-publish, multi-account management — all need a server or native wrap
  disproportionate to a single trader's app.

## Recent changes
Full history (v0.01 → present) is in **`CHANGELOG.md`**. Most recent:
- **v1.03** — Captions now carry a **📍 location line** in the body (`📍 Market
  · here till <day>`), via `locationLine()`, injected only where a hook's
  `filledText` becomes the caption body (`setCaption` + Generate's `out.push`) —
  NOT into `filledText` itself, which is reused as the sticker / Text-tool line
  and must stay pure. Owner chose lightweight over adding area/hours fields.
- **v1.02** — Hashtags now cap at **5 per post** (`MAX_HASHTAGS` in
  `buildHashtagBlock`): brand + pitch location lead, rest a shuffled fill. Flat
  34-tag `DEFAULT_HASHTAGS` → named `HASHTAG_SETS` (brand/dish/local/scene) with
  8 generic mega-tags dropped (34→26); a getter flattens them so Store/backup/
  Settings are untouched. First slice of the parked v2 IG plan; per-post *dish
  matching* deliberately deferred (post doesn't know its dish — waits on "tag
  stash photos by dish"). The 5-cap hits everyone; the cleaner pool only reaches
  existing installs on reset (curated tags aren't silently wiped).
- **v1.01** — Generate now *resumes* instead of restarting: the batch (deck +
  keepers) already survived a nav hop in memory; the bug was the nav button
  always calling `openBrief()`. `openGenerate(null)` now short-circuits to
  `show("generate")` while a batch is live (`genBatchLive()` = cooking / cards
  left / keepers in tray), so hopping to Calendar/Settings/etc. and back drops
  you where you left off. New `genStartOver()` (↺ on the deck hint + keepers
  tray) is the explicit re-brief. Calendar's dated `openGenerate(date)` still
  briefs fresh (deliberate "plan this day").
- **v1.00** — Swipe-deck ♥/✕ buttons → inline SVG icons (the ♥/✕ text glyphs
  aren't in the Latin-subset fonts, so they fell back per-device and sat the heart
  off-centre; SVGs are geometry-centred, `currentColor` keeps the tinting).
- **tooling** — Installed the `ship-and-verify` project skill (`.claude/skills/`);
  no app version bump (`.claude/` isn't user-facing). CLAUDE.md→CHANGELOG.md split
  landed here too.
- **v0.99** — Motion polish 2: deck settle-bounce, goal-ring pop, `FX.busy` button
  spinner, thumbnail shimmer+fade-in, iOS-mode touch ripple, type-tile launch press.
- **v0.98** — Motion polish: shared-axis screen transitions, swipe-deck colour wash
  + stronger tilt, FLIP-lite animated removal (`FX.collapse`/`FX.shrink`).
- **v0.97** — "Run it back" history now shows post thumbnails (blob saved to `Drafts`
  at share time, keyed `hist-<id>`); graceful text-only fallback for old/missing.
- **v0.96** — Removed the New Post flow progress bar (owner: it ate vertical space).
