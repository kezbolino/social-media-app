# How to add a collage template

You don't need to write code to add a layout. A template is just a small block
of text in **`templates/templates.json`**. Copy an existing one, change the
numbers, done.

Everything is measured in **pixels on a 1080 × 1080 square** (top-left corner is
`0, 0`). So an `x` of `540` is halfway across; a `y` of `540` is halfway down.

## The fields

```json
{
  "id": "two_up",                 // a short unique name, no spaces
  "name": "Two side by side",     // what you'll see in the app
  "overlay": null,                // your branded PNG, or null (see below)
  "background": "#161616",        // colour shown in the gaps between photos
  "accent": "#ff7a18",            // colour of the placeholder frame
  "boxes": [                      // one box per photo slot
    { "x": 30,  "y": 30, "width": 502, "height": 1020 },
    { "x": 548, "y": 30, "width": 502, "height": 1020 }
  ],
  "textBox": {                    // where location/day get printed (or null)
    "x": 60, "y": 470, "width": 960, "height": 140,
    "color": "#ffffff", "align": "center"
  }
}
```

- **`boxes`** — each photo slot. `x`/`y` is the top-left corner; `width`/`height`
  is its size. Photos are centre-cropped to fill the box, so the middle of each
  photo is always kept. Add as many boxes as you want photos.
- **`textBox`** — optional. If present, the location (and day) is printed onto the
  image inside this box, shrinking to fit. Set it to `null` for a clean,
  photo-only template where the words live only in the caption.

## Using your real branding (the `overlay`)

The starter templates draw a simple orange placeholder frame so the app works
today. To use your real logo and frame:

1. Design your branding (logo, border, etc.) as a **1080 × 1080 PNG** with a
   **transparent window** wherever a photo should show through.
2. Save it in the `templates/` folder, e.g. `templates/two_up.png`.
3. Set `"overlay": "templates/two_up.png"` in that template.

The app draws the photos first, then lays your PNG on top, then prints the
text — so your branding always sits above the photos.

## Tips

- Leave a small gap between boxes (e.g. 18 px) so the background colour shows as
  a clean divider.
- Keep `id` unique — it's how the app tells templates apart.
- Want portrait posts later? Change the `canvas` size at the top of the file to
  `1080 × 1350` and design boxes/overlays to match.
