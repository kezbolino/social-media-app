# Session Log

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
