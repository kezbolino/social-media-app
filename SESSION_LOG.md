# Session Log

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
