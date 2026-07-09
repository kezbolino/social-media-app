# Street Food Post — V1

A dead-simple app that turns a photo into a finished social post in seconds. Pick
**a single photo** or **a branded collage**, the app hands you a **cheeky
pre-written caption** with the location and day filled in, you tweak it if you
like, then **share it yourself** to Instagram or Facebook via the phone's normal
share sheet.

It's a **templating app, not an AI app**: every caption was written by a human, it
works **offline**, there's no server, no accounts, no logins, and nothing to pay
for. (See `streetfoodpostappV1spec.md` for the full brief this was built from.)

---

## How to run it right now (the easy way — no Terminal)

1. Download the project as a ZIP (on GitHub: green **Code** button → **Download
   ZIP**), or use this direct link to the current branch:
   `https://github.com/kezbolino/social-media-app/archive/refs/heads/claude/new-session-wq4q6o.zip`
2. **Double-click the ZIP** to unzip it (you'll get a `social-media-app` folder).
3. Open that folder and **double-click `index.html`**.

That's it — it opens in your browser and works. No install, no Terminal, no
developer tools. It runs entirely offline. (Drag the browser window narrow to see
it phone-shaped.)

To try the **share** button properly you need a real phone — desktop browsers
can't open the share sheet, so on a Mac it falls back to copying the caption and
downloading the image instead.

### Optional: running it through a local server

You don't need this, but if you ever prefer to serve it (e.g. while editing the
`.json` data files and wanting changes to load live), run `npm start` and open
**http://localhost:5173**.

---

## The flow (what your brother does)

1. **New Post**
2. **Single photo**, **Collage**, or **Carousel**
3. Add the photo(s). For a collage, tap a layout, drop photos into the slots,
   or hit **Try another layout** to cycle. For a carousel, pick **2–10 photos**
   (the first is the cover) — they post as a swipeable Instagram carousel.
4. **One quick question** — is the post about *where you are*, *brand hype*, or
   *something else* (weather/last day/weekend)?
5. **Fill the blanks** it needs — usually just **location**, sometimes **day**.
6. **Caption appears**, already filled in. **Shuffle** for a different line, or
   **tap to edit** it.
7. **Review** the finished image + caption together.
8. **Share** → the phone's share sheet opens → pick Instagram or Facebook. Or
   use **Copy caption** / **Save image** on the Review screen to grab them
   manually if the share sheet is being fiddly (carousels save every frame).

**Menu & Settings** lets you add best sellers / sauces once; food captions pick
from that list at random. Leave it empty and food captions are simply skipped.
It also holds an editable **hashtag** bank (curated for London street food) — a
shuffled, relevant mix (plus your pitch location and the brand tag) is added to
every caption automatically; tap **Remove hashtags** on the caption screen if
you'd rather post without them (tap again to put them back).

**Work calendar** (home → 📅) — tap the days you're trading and set where you'll
be. **Generate posts** (home → ✨) uses that day's location, your photo folder,
and the hook library to hand you **3 ready-made posts**; tap the one you like to
tweak and share. **Post reminders** (Settings → 🔔) nudge you to post on working
days.

**Post queue** (home → 🗓) — line up posts for the days ahead (a day, optional
pitch, and a caption/note). On the day, the reminder nudges you that posts are
queued; tap **Make** to turn a queued item into a live post with the location
and note pre-filled. **Run it back** (home → 🔁) lists posts you've already
shared — tap one to rebuild it with today's photo and a fresh, shuffleable
caption in the same vein.

A **sticky bottom nav** (New Post / Calendar / Generate / Settings — minimal
Heroicons) sits on the hub screens for quick jumps between them; it's hidden
during the guided New Post flow so it doesn't crowd that screen's own **Next**
button.

> **Reminder limitation (important):** a plain web app can only fire a reminder
> while it has been *opened* around the reminder time — it can't wake itself in
> the background. So on the web the nudge appears when the app is open on a
> working day after your chosen time. True scheduled/background reminders come
> with the phone build: swap `Notify.show()` in `js/notify.js` for the
> `@capacitor/local-notifications` plugin — nothing else changes.

---

## What's in the box

```
index.html              The app shell (all the screens)
css/styles.css          Styling (dark, big buttons, phone-first)
js/config.js            The few settings you might tweak (export size, cooldown)
js/store.js             Saves menu items / recent hooks / posts on the device
js/hooks.js             The caption engine (filter, recency, fill-in-the-blanks)
js/imaging.js           Photo fitting, collage building, burnt-in text, PNG export
js/share.js             Hands image + caption to the share sheet
js/app.js               Ties the screens together
data/streetfood_hooks.json   The caption library (73 hand-written hooks)
templates/templates.json     The collage layouts
docs/TEMPLATE_FORMAT.md      How to add your own collage layout (no coding)
```

### Things you can change without coding

- **`js/config.js`** — export image size (currently **1080 × 1080 square**) and the
  **60-day cooldown** that stops captions repeating too soon.
- **`data/streetfood_hooks.json`** — add or edit captions. Each needs a unique
  `id`. Use `{location}`, `{day}`, `{item}` where you want the blanks filled.
- **`templates/templates.json`** — add collage layouts. See
  **`docs/TEMPLATE_FORMAT.md`** for the copy-paste guide.
- **The app font** is **Poppins** (a popular modern social-media sans), bundled in
  `assets/fonts/` so it works offline. To switch to another (e.g. Montserrat or
  Bebas Neue), drop the `.woff2` files in that folder, update the `@font-face`
  blocks at the top of `css/styles.css`, and change the `FONT_FAMILY` constant
  at the top of `js/imaging.js`.
- **The photo editor** mimics Instagram's create flow: crop / reposition / zoom,
  aspect ratio (square / portrait / landscape), filter presets, adjust sliders,
  and a **Stories-style Text tool** — draggable text boxes with the Classic /
  Modern / Neon / Typewriter / Strong styles (bundled Poppins, Oswald, Pacifico,
  Space Mono fonts), colour swatches, a full colour picker and an **eyedropper**
  (sample a colour from the photo), alignment, highlight modes, and **two-finger
  pinch to scale + rotate** the text. Single photos get the full editor;
  collages get a **text-only editor** to caption the finished layout. On-image
  text is baked into the exported photo; the pre-written hook stays as the
  separate post caption.

> **Note on editing the captions/templates:** the double-click (no-server) version
> reads embedded copies — `data/streetfood_hooks.js` and `templates/templates.js`.
> Those files are just `window.HOOK_LIBRARY = { ... }` / `window.COLLAGE_TEMPLATES
> = { ... }` wrapped around the exact same content as the `.json` files, so if
> you're editing by hand, change the matching `.js` file (everything after the
> `=` is identical to the JSON). The `.json` files remain the tidy source of
> truth and are what the server version loads.

The four collage templates included are **placeholders** (a simple orange frame)
so the whole flow works today. When you've designed your real branded templates,
drop in the PNGs and point each template at them — `docs/TEMPLATE_FORMAT.md`
explains exactly how.

---

## How the captions stay fresh (recency)

Every time you share, the app notes which caption it used. For the next **60
days** it won't offer that one again, so lines don't come round too soon. With
70+ captions and ~one or two posts a week, you cycle the whole library about once
a year — repeats are effectively invisible, and the pool never runs dry. If you
ever did run it dry, the app quietly relaxes the rule rather than leaving you with
no caption. Change the window in `js/config.js` (`COOLDOWN_DAYS`).

---

## Turning this into an installable Android app (later, on your Mac)

V1 runs in the browser. To get a proper home-screen icon, reliable photo access,
and the native share sheet, wrap it with **Capacitor**. The app was built so this
is a clean, additive step — none of the app code changes. Outline:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/share
npx cap init "Street Food Post" com.kesbo.streetfood --web-dir .
npx cap add android
npx cap sync
npx cap open android      # opens Android Studio to build the APK
```

Two small wiring tweaks at that point (both isolated on purpose):

- In **`js/share.js`**, swap the `navigator.share(...)` call for the
  `@capacitor/share` plugin. Everything else stays the same.
- Confirm the app loads its data files inside the Capacitor webview (it serves
  from a local origin, so the normal `fetch` used here works).

You'll need Android Studio installed for the final build — that part happens on
your Mac, not here.

---

## Auto-posting (Meta) — now built in, optional

The review screen can post **directly to Instagram and Facebook** once a
one-time Meta setup is done — see **`docs/META_SETUP.md`** for the plain-English
walkthrough (Development-Mode app, Page token, linked Instagram account, and a
free Cloudinary account to host the image for Instagram). Until it's configured,
the app behaves exactly as before (share sheet only). Credentials are stored
only on the device.

## Installable app + offline

The app is a **PWA**: hosted over https (e.g. GitHub Pages), the browser's
**Add to Home Screen** installs it with the Chuckling Wings icon, fullscreen,
and it keeps working offline (service worker, network-first so new deploys
always win when online).

A full code audit lives in **`docs/AUDIT.md`**.

## What's deliberately NOT in V1

Auto-posting, AI captions, scheduling, analytics, a full drag-and-drop editor,
and multi-trader mode are all **parked on purpose** (see the spec, sections 2 &
10). The biggest one is **auto-posting**: V1 shares manually, which avoids Meta's
multi-week app-review process and keeps everything on-device. The post's
`draft → approved → shared` status is the seam where auto-posting could slot in
later without a rebuild.
