---
name: ship-and-verify
description: >-
  The release checklist for the Chuckling Wings / Wingman PWA — run it whenever
  you finish a feature, enhancement, or fix and are about to commit. Use this
  ANY time you're wrapping up a change to this repo (index.html / css / js /
  assets), even if the user just says "commit this", "ship it", "that works,
  save it", or "push it" without naming a checklist. It bumps #appVersion,
  decides whether the service-worker cache needs bumping, verifies the change by
  driving the real app headless in Chromium (bundled verify.mjs), and updates the
  changelog — the steps that are easy to half-do from memory and have silently
  shipped an un-bumped version or a stale SW cache before. Also trigger it when
  asked to "verify", "check it works in the app", or "drive it headless".
---

# Ship & verify (Wingman PWA)

This app has no build step and no test suite — the safety net is a short release
ritual plus a headless drive of the real app. The failure modes this guards
against have all actually happened: a feature shipped without a version bump (so
the "latest" tag was wrong), a renamed asset shipped without an SW cache bump (so
installed PWAs kept the old file), and a "good fix" that looked broken because the
verify measured the wrong thing. Work the checklist in order; skip a step only
when you can say why.

## 1. Bump the version (always, never ask)
Every shipped feature/enhancement/fix bumps `#appVersion` in `index.html` in the
**same** commit, before committing. It's the single version source (one `<p
id="appVersion">` line near the bottom of the home screen). Increment the patch:
`v0.99 → v1.00`. This is automatic — the owner should never have to ask.

If you're merging a branch rather than shipping fresh, the version is
**provisional**: re-check by hand, because parallel branches make the identical
bump and a merge silently keeps one. See the "version is PROVISIONAL" rule in
`CLAUDE.md`.

## 2. Decide on the service-worker cache
Bump `CACHE` in `sw.js` (e.g. `wingman-cache-v10` → `v11`) **only if a cached
asset filename changed** — a new/renamed font, icon, sound, or SVG. Pure JS / CSS
/ markup edits do **not** need it (the SW is network-first). When unsure, list
what the change touched: new file in `assets/`? → bump. Edited existing code? →
leave it. A needless bump is harmless; a missing one strands old assets on
installed PWAs, so err toward bumping when a filename is genuinely new.

## 3. Reduced motion
If the change added any keyframe / animation / transition, add it to the
`prefers-reduced-motion` disable list at the bottom of `css/styles.css`. The only
deliberate exception is essential progress feedback (e.g. the busy-button spinner).

## 4. Verify by driving the real app (headless Chromium)
Don't trust a proxy for "it works" — drive the actual app and assert on real DOM /
computed state. Use the bundled script; don't re-improvise a driver (that's where
verify bugs creep in).

```bash
# one-time per session — transient, gitignored:
npm i --no-save playwright-core

# then, from the repo root:
NODE_PATH="$PWD/node_modules" node .claude/skills/ship-and-verify/scripts/verify.mjs \
  --onboard --nav generate --width 390 \
  --shot /tmp/gen.png \
  --eval "return { active: document.querySelector('.screen.is-active')?.dataset.screen };"
```

The script prints a JSON report; **`consoleErrors` should be 0**. Read `scripts/
verify.mjs`'s header comment for every flag. Key ones: `--onboard` (lands on home
past the ob-welcome gate), `--nav home|generate|calendar|settings` (the only
single-click screens — reach deeper screens by dispatching clicks inside
`--eval`), `--width` (drive **390** and, for layout changes, **375** and **320**),
`--shot` (write a PNG — actually look at it), and `--eval` (assert whatever this
change touched).

House rules the script already encodes so you don't re-learn them:
- **This app scrolls on `body`, not `documentElement`** — measure clearance with
  `document.body.scrollTop` / `document.body.scrollWidth`, never `documentElement`.
- **`show()` is unreachable from `evaluate`** (nested in an IIFE) — navigate by
  clicking, never by calling `show()` or hand-toggling `.is-active`.
- Lexical globals like `Store` are reachable by **bare name**, not as `window.X`.
- The in-app preview tab is `visibility:hidden` with rAF paused — verify by
  asserting bounds/config, not by watching an animation advance.
- If a fix looks broken over `npm start`, suspect **stale-JS caching** (browser
  runs a cached `js/*.js`); the file:// default the script uses sidesteps it.

Report the console-error count and what you asserted. If you eyeballed a
screenshot, say what you saw.

## 5. Record the change
- Add a terse one-liner under `## Recent changes` in `CLAUDE.md` (keep it lean —
  it loads every session).
- Add the fuller entry (what/why/how, verification notes, any follow-ups) to the
  top of `CHANGELOG.md` under `## Version history`. If merging, expect the
  "latest" entry to collide the same way the version does — hand-merge and keep
  BOTH sides.

## 6. Commit (and push at end of session)
Commit with the version bump included. Push before switching devices — unpushed
work has caused a "never pushed → rebuilt" divergence across the owner's Mac/web
surface split. Don't open a PR unless asked. Branch deletion is the owner's job in
the GitHub UI (blocked here two ways).
