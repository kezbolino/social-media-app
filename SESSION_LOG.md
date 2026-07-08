# Session Log

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
