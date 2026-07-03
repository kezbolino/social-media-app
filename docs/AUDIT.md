# Full audit — 3 July 2026

A front-to-back review of every file in the app, done at the point the app went
live on GitHub Pages / a real phone. Format: what was found, whether it's fixed,
and what's deliberately left as-is.

## Fixed in this pass

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | **High (crash risk)** | Photos were baked out as full-resolution PNG data URLs. A modern phone camera shot is ~12MP; as a PNG data URL that's tens of MB of string *per photo*, held in memory for previews, the editor, collages and the pool. Three or four of them could kill the tab on a phone. | `Imaging.loadImageFromFile` now downscales anything over **2160px** (longest side — still 2× the 1080 export, so zero visible quality loss) and re-encodes as **JPEG 0.92** instead of PNG (~10× smaller). |
| 2 | **High (feature broken on phone)** | "📁 Use a folder" used `webkitdirectory`, which phone browsers don't support — on Android/iOS the picker either does nothing or can't select a folder. That silently broke folder-shuffle *and* Generate posts on the device it's actually for. | On touch devices the folder inputs drop `webkitdirectory` and become **multi-photo pickers** ("🖼️ Pick photos") — same pool, same shuffle, selected from the gallery. Desktop keeps real folder picking. |
| 3 | Medium | The app wasn't installable and didn't work offline when hosted (GitHub Pages) — plain browser tab, no icon, dead without signal. | Added a **PWA manifest**, brand **icons** (192/512/180), and a **service worker** (network-first with cache fallback: always fresh online, still opens offline). "Add to Home Screen" now gives a real app icon and fullscreen launch. |
| 4 | Low (brand) | Shared image file was still named `streetfood-post.png` (pre-rename leftover flagged in the design review). | Now `chuckling-wings-post.png`. |
| 5 | Housekeeping | Share bookkeeping (status → shared, hook recency, post history) lived inline in the share-sheet handler, so a second sharing path would have duplicated it. | Extracted `markPostShared(via)`; used by the share sheet **and** the new direct-publish path, and it now records *how* a post went out (`share-sheet` / `instagram-api` / `facebook-api`). |

## Built in this pass (requested)

- **Direct Meta publishing** (`js/publish.js`): 📸 Instagram and 📘 Facebook
  buttons on the review screen, shown only once credentials are configured in
  Settings. Facebook posts by direct file upload; Instagram hosts the image on
  Cloudinary (unsigned upload) then publishes via the Graph API with a
  processing-retry. Errors are translated to plain English. Setup walkthrough:
  `docs/META_SETUP.md`.
- Settings section for the five credentials (saved on-device only), with a
  **Test connection** button that verifies the token against Meta.

## Reviewed and OK (no action)

- **Hook engine**: tag filtering, recency exclusion + prune, dry-pool fallback,
  `{item}` handling — checked against 600-pick fuzz from earlier testing.
- **Editor**: crop maths (source-rect export at full res), overlay hit-boxes
  (live-render only — the earlier export-corruption bug stays fixed), pinch
  guards, text-mode isolation for collages.
- **escapeAttr** used consistently at every innerHTML seam that carries user
  text (locations, menu, hashtags, captions, calendar chips).
- **Calendar**: Monday-first offset, month boundaries, schedule persistence.
- **localStorage growth**: post history stores text/metadata only (no images);
  recency log self-prunes past the cooldown window.

## Known limitations (deliberate, documented)

- **Reminders on the web fire only while the app is open** around the chosen
  time (browser limitation). True background reminders arrive with the
  Capacitor build (`js/notify.js` is structured for a one-call swap). On iOS
  Safari, web notifications only work at all once installed to the home screen.
- **Meta access token lives in localStorage.** Acceptable for a single-user
  personal tool on his own phone; called out in `docs/META_SETUP.md`. Don't
  reuse this pattern for a multi-user product — that's when a server holds
  tokens.
- **Long-lived Page tokens expire (~60 days)** — refreshing is a 2-minute
  manual job, documented. Can be upgraded to a permanent token later.
- **Hashtag re-roll heuristic**: if the caption is hand-edited *after* adding
  hashtags, a following re-roll may append rather than replace (the marker
  text changed). Cosmetic; user just deletes the extra block.
- **Emoji as icons** render slightly differently across Android versions
  (design-review note). Cosmetic; a custom SVG icon set is the eventual fix.
- **Editor text boxes hit-test as unrotated rectangles** — selecting a heavily
  rotated text box needs a tap near its centre. Minor.
