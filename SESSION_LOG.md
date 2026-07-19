# Session Log

## 2026-07-19 (later) — Parked Fable's Instagram content plan for v2

**Done**
- Copied Fable's `instagram_content_plan_handover.md` into
  **`docs/V2_INSTAGRAM_CONTENT_PLAN.md`** — a July 2026 weekly-content plan for
  the stall's Instagram (Reels/Stories/Carousel roles, caption template, tag
  rules, batching). Put in `docs/` alongside AUDIT/META_SETUP so it doesn't read
  as live project state. **No app code touched, no version bump** — this is
  reference material only.

**Explicitly not started.** Owner: "put this for planning for v2, don't work on
it yet… I'll tell you when." Do not build from it unasked.

**For whoever picks it up.** Its §9 tooling list overlaps what's already shipped,
so it needs reconciling, not just implementing:
- *Caption generator* — largely exists (hook library + Generate brief). The
  plan's template is stricter: dish + market + area in the caption **body**.
- *Tag pool* — **conflicts with shipped behaviour.** The app seeds 34 hashtags;
  the plan caps posts at 5 and bans mega-tags (IG capped it at 5 in Dec 2025).
  That's a product decision, not a merge.
- *Weekly checklist / trading-day story beats* — new; the reminders module isn't
  wired to a trading cadence.
- *Insights logger* — new; Meta credentials are already stored.

## 2026-07-19 — Calendar circles, un-diverging main, stash picker (v0.75 → v0.78)

**Done**
- **Calendar day cells.** Owner disliked the rounded squares, and found the
  green ✓ "busy" and sharp-edged against everything else. Cells are circles now
  (one `--cal-cell-radius` token; flip to 20px for rounded squares — at 44px
  they're near-identical, a circle *is* r21.9). A plain day is just its number:
  the circle is earned by working / posted / today / selected. Dropped the ✓ and
  the duplicate encodings (working said itself twice, as fill AND dot; posted
  twice, as ring AND tick). Each state now owns its own css channel —
  background+border / outline / box-shadow — so a day that's all four renders
  right with no special-casing, retiring the `.posted.selected` hack. Gotcha:
  `posted` must use `outline`, not `border`; a `.working.posted` rule outranks
  plain `.selected` and swallows the selection ring.
- **Fixed the diverged main.** Local sat 5 ahead / 11 behind, conflicting in
  three files. Root cause: on 18 Jul this Mac committed v0.66–v0.70 and **never
  pushed**, so a parallel cloud session started from the last *pushed* commit
  (v0.65), read the same numbered plan out of this log, and rebuilt items 5–9 —
  both sides even numbered from v0.66.
- **Resolution: reset, don't merge.** A feature-by-feature check (not a line
  diff — that misleads) showed 4 of the 5 local commits were already upstream,
  several done better: confetti-once-per-batch as `keepersCelebrated`; ob-done
  copy counting the real stash rather than the in-memory pool; `openCalendar`
  landing on today with the panel open. So `main` was reset to `origin/main` and
  the one genuinely local-only item — today pre-selected in the **caption
  details** Day field (distinct from the brief, which already had it) — was
  re-applied as v0.76. The five commits are preserved on
  **`origin/archive/local-v0.66-v0.70`**, not deleted.

**Prevention (the actual point)**
- `.claude/hooks/check-repo-fresh.sh` now checks **ahead** as well as behind —
  unpushed commits were its blind spot, and that is exactly what bit. It also
  warns louder when both, since a divergence must be reconciled, not pulled.
- Global `~/.claude/CLAUDE.md` end-of-session rule gained step 3: **push**, with
  this incident recorded as the reason.
- ⚠️ **This log is a shared work queue.** Any session — local or cloud — will
  pick up a "Next" list from it. Push the log *with* the work it describes, or
  it advertises as pending things that are already built.

**Tidy-up**
- Pruned **14 fully-merged** `origin/claude/*` branches. **8 were kept** — they
  hold commits not in main, notably `app-audit-ui-colors-erbail` (a "Posted!"
  success screen with a weekly goal ring, v0.66, never merged), the ElevenLabs
  and Fable sound packs, and the parked Lottie wave spec. Worth a proper triage
  session; don't delete them blind.
- `stash@{1}` (stall.svg, audit #16) **resolved and dropped**: the redraw had
  already landed on 18 Jul, so only its cropped viewBox was still worth having →
  applied as v0.77.

- **Stash picker shipped (v0.78)** — audit #10, the last parked stash. Ported
  from `stash@{0}` rather than rebuilt: it applied to v0.77 **cleanly, with no
  conflicts**, and every function it called still existed, so a rewrite would
  have been wasted work. (My earlier "it conflicts" call came from a bad
  `git stash apply --check` reading — the real apply was clean.) Verified for
  the first time on all three photo screens: grid renders, single sets the
  photo, collage fills the next slot, carousel appends, empty pool hides the
  picker, 20 photos still scroll with every button reachable. No console errors.
  Stash dropped; both stashes are now cleared.

**Ended clean**: main = origin/main at v0.78, 0 stashes, both hooks silent.

**⚠️ Two confident wrong calls in this session — re-check before trusting these
notes.** Both times a quick check told a tidier story than the evidence did, and
both were stated to the owner as fact before being corrected:
1. *"Local `main` holds work upstream lacks."* Based on a line-by-line diff,
   which flagged the same feature under a different variable name
   (`trayCelebrated` vs upstream's `keepersCelebrated`) as missing. A
   feature-by-feature check found 4 of 5 commits already upstream. Had this gone
   unchecked, the "salvage" would have re-introduced duplicates of code that was
   already there.
2. *"`stash@{0}` conflicts with main and needs rebuilding."* From a bad
   `git stash apply --check` reading. The real apply was clean, so the approved
   rewrite would have been wasted work.
   (Also, mid-verification: *"nothing scrolls at 20 photos"* — I'd measured
   `documentElement` and `.pad`; the scroll container is `body`. No bug.)

The pattern: a cheap proxy (line diff, `--check`, wrong scroll element) was
treated as the answer instead of as a hint to go and look. Where this log or
CLAUDE.md asserts something load-bearing about repo state, verify it still holds
rather than inheriting it.

**Pending / next**
1. **Triage the 8 kept `origin/claude/*` branches.** Top of the list:
   `app-audit-ui-colors-erbail` holds a **"Posted!" success screen with a weekly
   goal ring**, committed 17 Jul as v0.66 and never merged — v0.66 is exactly
   where the divergence collided, so it may be collateral damage from it. Also
   unmerged: the ElevenLabs + Fable sound packs and the parked Lottie wave spec.
   Check each is genuinely wanted or genuinely dead before deleting.
2. **Copy nit on the photo screens** — the pool note still says "N photos loaded
   — tap shuffle for random picks", which now points at the weaker option since
   the stash picker (v0.78) is the direct way to a specific photo. One line.
3. Untracked art at the repo root (`chicken-*.svg`, `stall.svg`, the PNGs,
   `Chicken-Duo.ai`) is the owner's source, deliberately not committed — it just
   makes `git status` noisy. A `.gitignore` entry would quieten it.
4. Remaining audit items from the 18 Jul plan: 11 keeper tray compact rows · 12
   44px targets + undo snackbar · 13 finish SVG icon set · 14 type-scale +
   colour-role rules · 15 "same as yesterday" brief shortcut · 17 dish tagging ·
   18 Meta publishing: connect or delete.

⚠️ **Read the prevention note above before starting work here.** If a parallel
cloud session is running, pull first and push when you finish — that is what
went wrong on 18 Jul.

## 2026-07-18 (pm) — New stall.svg (v0.67 → v0.68)
**Done** — owner supplied a redrawn `stall.svg` (clean Illustrator vector export,
not a trace). Swapped it into `assets/mascot/stall.svg`: **76KB → 24KB**, crisp
vectors. New art is 250×250 square (old was cropped landscape). Renders as a
~288px scene on the onboarding "Where do you trade?" step via `.ob-scene`; the
white-outline drop-shadow treatment (for blue-on-blue) stays. Verified in the
real ob-places screen — renders, sticker edge visible, no console errors. Bumped
version → v0.68 and SW cache v5→v6 so installs pick up the new asset. Also
refreshed the SVG asset-sheet artifact so it shows the new stall.

## 2026-07-18 (pm) — Audit punch-list items 8–9 (v0.66 → v0.67)
**Done** — verified in real Chromium (375×812), no console errors.
- **#8 nav labels + Home tab.** Bottom nav is now 5 tabs with labels: Home /
  New / Calendar / Generate / Settings. Added a Home tab (`go-home`), wrapped
  each icon in `.navbtn-icon` so the active pill (`::before`) stays anchored to
  the icon with a label beneath, added `.navbtn-label`, bumped `--navh` 64→80.
  Fixed a latent bug: a normal boot never ran `show("home")` (home is
  statically active), so the nav's active-tab logic didn't fire until the first
  navigation — added a suppressed `show("home")` on boot so Home lights
  immediately.
- **#9 smart defaults.** (a) Calendar opens on today with its day panel already
  open (`openCalendar` → `selectCalDay(today)`). (b) Honest ob-done copy —
  `renderObDone()` drops the "got your photos" claim when the stash is empty
  (photos step is skippable). (c) Empty-state CTAs — `mascotEmpty()` takes an
  optional CTA button; History + Queue empties link to Generate, the Generate
  no-photos empty links to Settings → Add photos. (d) Today already pre-selected
  in the brief — verified, no change needed.
- Version → v0.67. SW cache untouched (network-first; no new assets).

**Next** — structural items still queued: #10 stash picker grid on photo
screens, #11 keeper tray compact rows, #12 44px tap targets + undo snackbar,
#13 finish SVG icon set, then #14–18. Homework #1 (delete old wings hashtags on
the phone) and #4 (brand-line decision) still owner-side.

## 2026-07-18 (pm) — Audit punch-list items 5–7 (v0.65 → v0.66)
**Done** — first three code items off the agreed list; owner confirmed homework
2 & 3 (backup / Visuelt licence) already sorted. All verified in real Chromium
(375×812), no console errors.
- **#5 confetti once-per-batch.** `showKeepers()` fired `FX.confetti({quiet})`
  on *every* visit to the keeper tray — so it re-celebrated each time you came
  back after posting/customising/queueing a keeper. New `keepersCelebrated`
  flag: reset in `runGenerate()` (start of a batch), set + confetti on the
  first `showKeepers()` render, skipped thereafter. `returnToKeepers` /
  `saveCustomiseToKeeper` re-render the tray without re-firing.
- **#6 swipe-cap clip + fade.** `.swipe-cap` used `-webkit-line-clamp: 3` +
  `overflow: hidden`, guillotining the caption mid-line. The card is a
  pointer-drag target (a scrollable caption would fight the swipe), so instead
  of scroll it now fills the area and fades out at the bottom via a
  `mask-image` linear-gradient (opaque to 76%, transparent at 100%) — softer,
  reads as "there's more" (full caption is baked on the image + shown at Post).
- **#7 home hierarchy — one orange hero.** Home had *two* orange heroes: New
  Post (`btn-primary`, overridden orange on home) and Generate (`btn-accent`).
  Now Generate is the single orange hero (kept `btn-accent`, moved to the top,
  and the `fx-pulse-ring` pseudo-element moved onto `.home .btn-accent`); New
  Post demoted to a plain white `.btn-secondary` beneath it. Dropped the
  `🧪 View onboarding (debug)` button (Settings → Run setup again still exists).
  Removed the now-dead `.home .btn-primary` orange overrides (bg/active/edge)
  and the `.home .btn-primary` half of the edge-accent + reduced-motion rules.
- Version → v0.66. SW cache untouched (network-first; no new assets).

**Next** — continue the list: #8 nav labels + Home tab, #9 remaining smart
defaults (today pre-selected, honest ob-done copy, empty-state CTAs, calendar
today). Then structural #10–15. Homework #1 (delete old wings hashtags on the
phone) and #4 (brand-line decision → new caption hooks) still owner-side.

## 2026-07-18 — UI/UX audit (10 enhancements) + repo sync to v0.65
**Done** — audit only, nothing built in the app.
- Full design audit: walked every flow on a 375×812 viewport + code read.
  Report with before/after mockups (private artifact, per-finding status):
  https://claude.ai/code/artifact/f71d215e-93ab-46e6-88f2-5a70bb8816a4
- **Caught a stale checkout**: this Mac was 21 commits behind origin/main
  (v0.45 local vs v0.65 live) — audit was re-validated against v0.65.
  At v0.65 the standing items are: confetti re-fires on every keeper-tray
  visit; no stash picker on photo screens; two equal orange heroes on home;
  keeper cards too tall; delete targets 20–27px with no undo; nav still
  icon-only/no Home; swipe-card captions clip mid-line.
- Synced: `git stash` of orphaned local work ("pre-v0.65-sync" — a stall.svg
  rework from Jul 17 + a v0.46 bump, never committed; still in the stash),
  then fast-forwarded main to origin/main (v0.65).
- Added a SessionStart hook (.claude/settings.json) that fetches origin and
  warns when the checkout is behind or the tree is dirty — so no session
  works on stale code again.

**Next — agreed numbered list (owner wants to go through it in order; full
detail + mockups in the audit artifact):**
- Homework, no code: 1 delete old wings hashtags on the phone · 2 export a
  backup · 3 confirm Visuelt Pro webfont licence · 4 decide the brand line
  (Chuckling Wings name vs no-wings menu) → new caption hooks.
- Quick app fixes: 5 confetti once-per-batch · 6 swipe-cap clip + scroll
  fades · 7 home hierarchy (one orange hero, demote New Post, drop debug
  btn) · 8 nav labels + Home tab · 9 remaining smart defaults (today
  pre-selected, honest ob-done copy, empty-state CTAs, calendar today).
- Structural: 10 stash picker grid on photo screens · 11 keeper tray
  compact rows · 12 44px targets + undo snackbar · 13 finish SVG icon set ·
  14 type-scale + colour-role rules · 15 "same as yesterday" brief shortcut.
- Repo/product: 16 resolve the stall.svg stash · 17 dish tagging (finish or
  revert the Jul 14 groundwork) · 18 Meta publishing: connect or delete.

## 2026-07-14 — Bug-fix session: nav dot, calendar confetti, heart, keeper tray
**Done** — v0.26 → v0.33, all verified in a real browser. Shipped to `main`
(live at kezbolino.github.io/social-media-app, confirmed serving the new build).
- **Post dot**: now lit only on the `type` screen (`show()` hand-sets
  `is-active`; the post button has no `data-nav` to match on). Went through all
  three states today — always-on (v0.24, read as "you are here" everywhere) →
  removed → on `type` only, which is what the owner wanted. One line, because
  `type` is the only post-flow screen in HUB_SCREENS; everything deeper hides
  the nav.
- **Calendar**: no confetti when picking a market. `celebrateWorkday` →
  `bounceWorkdayCell`, `FX.sparkle` → `FX.pop` (sparkle = confetti *plus* pop,
  so the cell still acknowledges the tap). Both callers share the helper.
- **Heart**: ~3.0s → ~1.6s. The Lottie holds a static heart from ~f75 then swaps
  to an *outline* heart at f118 that lingers to f181 — now plays
  `initialSegment: [0, HEART_END_FRAME=84]` + a 200ms fade, cutting the outline
  and ~0.7s of dead air. One constant to nudge (≤117 stays clear of the outline).
- **Keeper tray**: dropped the duplicate "New batch" (`#genFolderRow` already
  shows one on every Generate panel); fixed the truncated date (queue button was
  `flex: 0 0 auto` at 149px in a 240px row, starving the date to 83px → "2026/").
- **Keeper date** now reads "15/7" with its own calendar glyph, content-sized.
  A native date input renders in the OS locale and **can't be reformatted**, so
  the visible text is our `fmtKeeperDate` label with the real input invisible on
  top (overlay, not `showPicker()` — that needs newer iOS). Keeps the native
  picker + `.keeper-date`.value, so `queueKeeper` is untouched. Round trip
  verified: "3/8" saved `2026-08-03` with its draft blob.

**Notes**
- Local preview kept serving **stale JS**: `python http.server` sends no cache
  headers, so the browser heuristically caches `app.js`/`fx.js` and silently
  runs old code — it faked a "fix didn't work" twice. `transferSize: 0` in the
  perf entries is the tell; `fetch(url, {cache:'reload'})` then reload clears it.
  Preview-only — the live site is network-first via the SW.
- The preview tab reports `visibility: hidden` and rAF is fully paused, so
  Lottie/confetti never animate and **CSS transitions never advance** there —
  `getComputedStyle` on a transitioned property returns the pre-transition
  value, which faked a second false negative on the nav dot. Assert on classes
  and config, not computed transitioned values.
- Sandbox has **no general network egress** (`curl` → 000, even github.com), but
  git push works and the in-app Browser pane has real network — that's how the
  live deploy was verified. Don't reach for curl to check the live site.
- Live deploy confirmed: `https://kezbolino.github.io/social-media-app/` served
  v0.31 with all five fixes present in the deployed assets (checked the files,
  not just the version string).

**Next**
- `js/photos.js` has uncommitted, inert dish-tagging groundwork (a `tag` field +
  `Photos.setTag`, nothing calls it) — either finish tagging stash photos by
  dish (fixes Generate pairing a wings caption with a fries photo) or revert it.
  Deliberately kept out of both commits: it's an unused API, dead code until the
  feature lands.
- Backlog otherwise unchanged (recurring workdays, hashtag sets per location,
  visual history/grid preview).

## 2026-07-08 (pm) — Fixed the dead deploy + Duolingo-style animations
**Done**
- **Live-site bug found & fixed.** GitHub Pages was silently deploying the stale
  `claude/new-session-wq4q6o` branch, NOT `main` — so every "merge to main = live"
  session since 2026-07-07 was a no-op (site frozen pre-logo, pre-greetings).
  Diagnosed via WebFetch fingerprint (greetings.js 404 + 🐔 home) vs branch trees.
  Ke repointed Settings → Pages → source `main` / root. Now merges actually go live.
- **New animation layer (`js/fx.js`)** — Duolingo feel: chunky 3D buttons that
  press into a coloured edge, springy screen transitions, staggered home entrance,
  a gently breathing hero CTA, pops on caption Shuffle + new greeting, light
  haptics, canvas confetti + a WebAudio chime on the share "win". CSS appended to
  `styles.css`; hooks in `app.js` (rollGreeting / setCaption / markPostShared);
  `fx.js` loaded in `index.html`. Honours `prefers-reduced-motion`.
- **Tuning per Ke:** bouncier spring (overshoot 1.8), confetti trimmed 110→55,
  added the celebratory chime.
- Built an interactive Artifact demo (phone mockup, real logo/colours) so the
  motion + sound could be felt before shipping.
- Added `.claude/launch.json` (python http.server on 8123) for local preview.

**Notes**
- Confetti + chime fire from `markPostShared`, the single seam both the share
  sheet and direct Meta publish flow through — so every share celebrates.
- Memory saved: Pages now serves from `main` (see agent memory `pages-deploy-source`).

**Next**
- Same backlog: Buffer-style **post queue + reminders** (the big one), content
  packs, post history "run it back", hashtag rotation, weather mode.
- Maybe a Settings toggle for sound / reduced motion.

## 2026-07-08 — Caption library expansion + user-editable hooks
**Done**
- Default locations → Greenwich, Crystal Palace, Leadenhall Market.
- +33 hooks (72 → 105): gluten-free USP lines (ALL food is GF — made it the
  headline, not a niche), place-locked lines (Greenwich tourists/locals,
  Crystal Palace dinosaurs, Leadenhall City/corporate), and a new **Events**
  category (weddings/private + corporate catering).
- Engine: hooks can pin to one place via an optional `location` field; new
  `events` quiz tile (needs no details → jumps straight to caption).
- **New "My captions" Settings screen**: trader adds/edits/deletes their own
  lines (category + optional "only at" location lock), saved on-device
  (`sfp.userHooks`), merged into the shuffle live via `Hooks.reloadUserHooks()`.
  `{location}`/`{day}`/`{item}` auto-detected into `uses`.
- Kept `streetfood_hooks.js` + `.json` in sync (105 hooks each). All verified in
  the browser (place-lock, events, add/delete round-trip). Merged to `main`.

**Notes**
- New default locations only seed on a FRESH install — existing phones keep the
  old ones (swap them in Settings → Saved locations).
- `sw.js` is network-first → deploys serve fresh code online, no version bump.

**Discussed / next (not built)**
- Buffer-style **post queue + reminder publishing** (the big one — mockup
  sketched). Then: content packs (toggle/boost caption sets), post history
  "run it back", hashtag-set rotation, weather mode. AI could later draft lines
  INTO a pack for approval (needs a Groq key; app stays offline-first).

## 2026-07-07 — Git setup + home-screen refresh
**Done**
- Turned `~/Documents/Work/Street Food Post/` into a real git repo tracking
  `origin/claude/whats-next-npcojg` (was an unzipped download before). Future
  edits are just add/commit/push from this folder.
- Home screen rebuild: dropped the 🐔 emoji + text heading, made the real logo
  the hero (`assets/logo.svg`, moved from an untracked `SVG/` folder), enlarged
  it, and added a letter-spaced **── WINGMAN ──** sub-label under it.
- Added **50 rotating greetings** (`js/greetings.js`) — Tommy / Boss man,
  occasional cheek; re-rolls on boot and every return to home. Wired via
  `rollGreeting()` in `js/app.js` + `.greeting` / `.tagline` styles.
- Tightened the logo (`logo.svg` viewBox had ~31% empty space below the text →
  cropped to the artwork) to kill the big gap; enlarged the WINGMAN label.
- Added `.gitignore` (.DS_Store).
- All committed + pushed, then **merged to `main` (live)**.

**Decisions**
- Logo font couldn't be identified (text is outlined vectors; WhatTheFont
  matches were all paid, likely *Bison*). Chose to keep the logo as-is (it's the
  brand "Chuckling Wings") and add a free WINGMAN sub-label rather than rebuild
  the wordmark in a mismatched font.

**Pending / next**
- Went live this session: `claude/whats-next-npcojg` fast-forward-merged into
  `main` and pushed (updates kezbolino.github.io/social-media-app/). New standing
  rule: **go live automatically on every session end.**
- GitHub Pages source branch not 100% confirmed — if the live site doesn't update
  in a few mins, check repo Settings → Pages is serving from `main`.

**Cross-project (other repos, this session)**
- Instagram Caption Grabber: moved to `~/Documents/Work/`, cleared Gatekeeper
  quarantine, restyled dark→light. Not git-tracked; source of truth is this
  repo's `tools/ig-caption-scraper`.
- project-hub `HUB.md`: filled in the scraper + this app, pushed.
