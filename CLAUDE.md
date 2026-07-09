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
- 2026-07-09: Home screen decluttered — removed Calendar & Settings buttons from the
  home list (still reachable via bottom nav). "+ New Post" dropped `.btn-xl` so it
  matches the other home buttons. Back buttons stripped to arrow-only with aria-label.
