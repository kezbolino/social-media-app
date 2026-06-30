# Street Food Post App — V1 Build Spec

**For:** Claude Code
**From:** Kesbo (non-developer — explain choices, avoid unexplained jargon, break steps down)
**Build machine:** M2 Max Mac. **Target device:** Android phone.
**Spelling/locale:** British English.

---

## 1. What we're building (and why)

A dead-simple phone app that helps one user — Kesbo's brother, a London street food trader — create a finished social media post in seconds. Its entire job is to **kill the blank page**. He shouldn't have to think about what to write or how to lay out a photo.

The core loop:

1. He starts a new post.
2. Picks **single photo** or **collage**.
3. Adds his photo(s).
4. The app produces the image (resized, or arranged into a branded collage template).
5. The app serves a **pre-written cheeky caption** ("hook") with the location and day filled in.
6. He reviews, tweaks if he wants, and **shares it himself** via the phone's normal share sheet.

It posts to **Instagram and Facebook only**.

**This is a templating app, not an AI app.** There is no AI model, no API calls, no server, no accounts, no payments in V1. The captions come from a fixed library of hand-written hooks (already built — see section 7). This is deliberate: it guarantees caption quality (a human wrote every line), it's instant, it works offline, and it costs nothing to run.

---

## 2. Scope — read this before anything else

### IN for V1
- Single-photo posts (auto-resized for the platform).
- Collage posts using 3–4 fixed templates (designed by Kesbo, branding baked in).
- A hook library with location/day/menu-item variables filled in automatically.
- A short quiz to pick the right *kind* of hook.
- Recency tracking so recently-used hooks don't repeat.
- Optional burnt-in text on collage templates (location/day rendered onto the image).
- An optional menu list (best sellers / sauces) the user sets once.
- Manual sharing via the device share sheet.

### OUT for V1 (parked — see section 10)
- **Auto-posting.** The user shares manually. This is the single biggest scope-saver. Do NOT build account connections, credential storage, or Meta API integration in V1.
- AI-written captions.
- Scheduling.
- Analytics / post performance.
- A full Canva-style editor (drag, resize, free positioning, layering).
- Auto-zoom / smart crop variants of a single photo.
- Multi-user / product-for-other-traders mode.

> **Guiding principle:** every feature that sounds essential but explodes scope (auto-posting, AI, a real editor) has been deliberately cut. Resist re-adding them. If something feels like it's growing into one of the OUT items, stop and flag it.

---

## 3. Recommended build approach

This is a recommendation, not a mandate — Claude Code should confirm it makes sense before starting.

- **Build it as a web app** (HTML / CSS / JavaScript, framework optional and probably unnecessary). This matches tools Kesbo has built before (a standalone HTML thumbnail compositor that renders text onto images and exports PNGs — the collage and burnt-in-text features are the *same technique*).
- **Use an HTML5 `<canvas>`** for all image work: arranging photos into collage templates, drawing burnt-in text, and exporting the final image as a PNG. This is proven ground from the thumbnail compositor.
- **Wrap it with Capacitor** to produce an installable Android app (APK). This gives a proper home-screen icon, reliable access to the photo library, and a native share sheet. (A plain browser PWA would also work but Capacitor is cleaner for photo access and sharing.)
- **All data stays on the device.** No server. Use device-local storage (Capacitor Preferences / Filesystem, or IndexedDB) for: the hook library, the recency log, the menu items, and saved posts.
- **Sharing:** use the Capacitor Share plugin (or Web Share API) to hand the finished image + caption text to Instagram/Facebook via the system share sheet.

Keep it offline-first. The app should work with no internet connection.

---

## 4. The user flow, step by step

1. **Home screen** → "New Post" button. (Plus a small "Settings" for the menu list.)
2. **Single or Collage?** — two big buttons.
3a. **Single:** user picks one photo → app fits it to the export size (see section 8).
3b. **Collage:** user picks a template (or lets the app auto-arrange and offers a "Try another" button to cycle templates) → user drops photos into the slots → app fits each photo into its box → branding is already part of the template.
4. **The quiz** (1–3 quick taps) to choose the hook category:
   - *Posting about location/dates?*
   - *Brand awareness?*
   - *Other?* (weather, last-chance, weekend, etc.)
   The quiz answer maps to a **tag** in the hook library (see section 7).
5. **Fill the details** the chosen hook needs — typically **location** and **day** (e.g. "Brick Lane", "Sunday"). Only ask for what that hook actually uses (each hook declares this — see `uses` in section 7). If it's a food hook and the menu list is set, the app picks a menu item at random; if the menu list is empty, food hooks are skipped entirely.
6. **Caption shown.** The app displays one filled-in hook with a **"Shuffle"** button to get a different eligible one, and the caption is **editable inline**.
7. **(If a collage template has a text box)** the location/day is rendered onto the image itself.
8. **Review** → the user sees the final image + final caption together.
9. **Share** → opens the system share sheet with the image and caption. The user posts to Instagram or Facebook themselves.

---

## 5. Features in detail

### 5.1 Menu list (Settings)
- A simple settings screen where the user adds best sellers / signature dishes / sauces as a list of short text items.
- Used only to fill the `{item}` slot in food hooks (picked at random).
- **Optional.** If empty, the app simply doesn't use food hooks. No empty slots, no errors.

### 5.2 Collage
- **3–4 fixed templates**, designed and supplied by Kesbo as image assets. Each template has:
  - A defined number of **image slots** (boxes) with positions/sizes (e.g. 2-up side-by-side, 3-up, 4-square grid, one-big-plus-two).
  - **Branding baked in** (logo, frame) — part of the template image, never moved or edited in-app.
  - Optionally, a **text box** where location/day can be rendered (see 5.4).
- The app places each chosen photo into its slot and **auto-fits/crops** it to fill the box (centre-crop is fine for V1).
- Kesbo will provide each template plus the coordinates/dimensions of its image boxes (and text box, if any). **Claude Code should define a clear, simple format for Kesbo to specify a template** (e.g. a small JSON per template listing box positions). Keep this easy for a non-developer to fill in.

### 5.3 Single photo
- One photo, fitted to the chosen export dimensions.

### 5.4 Burnt-in text (optional, per template)
- Some collage templates have a text box; some don't. It's a property of the template.
- Where present, the app renders the location/day (the same info used by the hook) onto the image, exported as part of the PNG.
- This is the thumbnail-compositor technique reused. Handle long location names gracefully (shrink-to-fit or wrap within the box).
- Templates without a text box stay as clean photo-only images; the words live only in the caption.

### 5.5 Hook engine
- Loads the hook library (section 7).
- Filters hooks by the quiz tag (`location` / `brand` / `other`).
- Excludes any hook whose ID is in the recent-use log (section 6).
- Picks one at random from what's left; "Shuffle" picks another.
- Fills in `{location}`, `{day}`, `{item}` from user input / menu list.
- On share/approve, records the hook ID + date to the recency log.

### 5.6 Recency tracking
- Store a log of used hook IDs with the date used.
- When picking a hook, exclude any used within the **cooldown window**.
- **Posting frequency is once or twice a week** (~50/year), and the library has 70+ hooks, so the user cycles the whole library roughly once a year. A cooldown of around **60 days** makes repeats effectively invisible while never running the pool dry. Make the cooldown a simple constant that's easy to change.

### 5.7 Sharing
- Final image + caption handed to the system share sheet.
- The user picks Instagram or Facebook and posts manually.

---

## 6. Data model (keep it simple, all local)

Design posts so that **sharing is the last, separable step** — this is what lets auto-posting bolt on later (section 10) without a rebuild. A post moves: `draft → approved → shared`. In V1 the user moves it to `shared` by sharing manually; in a future version the app could do it automatically at that same point.

Suggested local records:

- **Post:** id, type (single/collage), template id (if collage), image (the exported PNG or its data), caption (final text), location, day, item (if used), status (draft/approved/shared), created date.
- **Menu items:** a simple list of strings.
- **Recency log:** list of { hookId, dateUsed }.
- **Hook library:** loaded from `streetfood_hooks.json` (section 7).

---

## 7. The hook library (already built — input asset)

File: `streetfood_hooks.json` (Kesbo will provide; ~73 hooks). Structure:

```json
{
  "variables": { "location": "...", "day": "...", "item": "..." },
  "categories": { "location": "...", "brand": "...", "other": "..." },
  "hooks": [
    {
      "id": "loc_001",
      "tags": ["location"],
      "text": "Right then, we've parked up at {location}. Come and get fed.",
      "uses": ["location"]
    }
  ]
}
```

- **`id`** — stable, unique. Used by the recency log.
- **`tags`** — maps to the quiz answer (`location` / `brand` / `other`). Some hooks also carry a `"london"` tag (see note below).
- **`text`** — the caption, with `{location}` / `{day}` / `{item}` placeholders.
- **`uses`** — which variables this hook needs. The app should only prompt for the variables listed here. A hook with `"uses": []` needs no input.

**The `"london"` tag:** many hooks are London/cockney-flavoured and tagged `london` in addition to their category. V1 uses all hooks normally. The tag exists so that a future "product for other traders" version could toggle regional flavour off (a Manchester trader wouldn't want London references). No action needed in V1 beyond preserving the tag.

---

## 8. Export image dimensions

The user posts the same content to both Instagram and Facebook. To keep V1 simple:

- **Default export: 1080 × 1080 (square).** Looks fine on both Instagram and Facebook feeds.
- Optionally offer **1080 × 1350 (portrait)** for Instagram if easy.
- Collage templates should be designed at the export resolution so branding stays crisp.

Confirm with Kesbo whether square-only is acceptable for V1 (simplest) or whether portrait is wanted too.

---

## 9. Assets Kesbo will provide

- `streetfood_hooks.json` — the hook library (done).
- 3–4 **collage template images** with branding baked in.
- For each template: the **image-box positions/sizes** (and text-box position, if it has one), in whatever simple format Claude Code defines.
- His **logo** / brand colours if needed for any app chrome.
- His **menu items** (entered in-app, not a build dependency).

---

## 10. Parked for later (V2+)

Built so these can be added without tearing V1 down:

- **Auto-posting to Instagram/Facebook.** This is the big one and the reason V1 shares manually. It requires Meta developer app approval (Instagram Professional accounts linked to a Facebook Page, an app-review process of several weeks, and the image hosted at a public URL rather than read off the phone). The `draft → approved → shared` status field is the seam: auto-posting slots in at the `shared` step. If/when this is built, note Meta wants the image at a public web address, so a storage choice that can also host images (e.g. Supabase) avoids a later migration.
- **AI-written captions.** The existing hook file becomes the *style examples* fed to a model, for fresh variations and novelty ("new menu this week"). Templating stays as the reliable fallback.
- **Scheduling** (post later / queue).
- **Analytics** (what performed).
- **Auto-zoom / smart-crop variants** of a single photo (drifts toward a photo editor — kept out deliberately).
- **Multi-trader product mode** + the regional-flavour toggle (the `london` tag is already in place for this).

---

## 11. Open questions for Claude Code to confirm with Kesbo

1. Square-only export for V1, or portrait too?
2. The simplest format for Kesbo to specify a collage template's image/text boxes (he's not a developer — make it copy-paste easy).
3. Capacitor-wrapped APK vs plain installable PWA — confirm the install/run experience Kesbo wants on his brother's Android phone.

---

## 12. One-line summary

A fast, offline, no-frills Android app: pick a photo or build a branded collage, the app hands over a cheeky pre-written caption with the location and day filled in, and the user shares it to Instagram/Facebook himself — built so that automatic posting can be added later without a rebuild.
