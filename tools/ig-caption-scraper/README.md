# Instagram Caption Grabber

Grab the **captions** (plus date, likes, comments, link) from a list of
**public** Instagram accounts, and download them as a spreadsheet.

Made to be dead simple: **double-click to open, fill in two boxes, click a
button, download.** No commands to type.

---

## The easy way (no Terminal) 👇

### 1. One-time: install Node.js (the free engine this uses)

The tool needs Node.js installed once. If you're not sure whether you have it,
just try step 2 — the launcher will send you to the download page if it's
missing. Or grab it now from **[nodejs.org](https://nodejs.org/en/download)**
(install the big green **LTS** button).

### 2. Start it

- **Mac:** double-click **`Start-Mac.command`**
- **Windows:** double-click **`Start-Windows.bat`**

A small black window appears (that's the engine — **leave it open**) and your
web browser pops open with the tool. On a Mac, the very first time, if it says
*"cannot be opened because it is from an unidentified developer"*, **right-click
the file → Open → Open** once, and after that a normal double-click works.

### 3. Use it

The webpage walks you through three boxes:

1. **Connect your Instagram** — paste one code (`sessionid`) so the tool sees the
   same posts your browser does. There's a *"How do I find this code?"* helper
   right there — it's a 30-second copy-paste from your browser, and no password
   is ever involved. It's remembered so you only do it once.
2. **Which accounts** — type the handles, one per line.
3. **Grab them** — click the button, watch it work, then **Download spreadsheet
   (CSV)**. Opens straight in Numbers / Excel / Google Sheets.

When you're finished, just close the little black window.

---

## Is this safe / private?

- It runs **entirely on your own computer**. Nothing is uploaded to us or anyone
  else — the posts go straight from Instagram to your machine.
- Your **password is never used or stored**. The only thing you paste is the
  `sessionid` cookie, and it only ever gets sent to Instagram (to prove you're
  logged in). It's kept on your computer so you don't retype it.
- Don't share that cookie with anyone while it's valid — treat it like a
  password. This folder's `.gitignore` already stops it (and your results) from
  being committed to git by accident.

---

## Please use it kindly

- It only reads **public** posts. Private accounts return nothing.
- Bulk-collecting posts is **against Instagram's Terms of Service**, public or
  not. Keep the volumes modest, use it for **caption research** (inspiration for
  your own lines), and don't republish other people's captions as your own.
- The built-in pace is deliberately gentle so you don't get your account
  rate-limited. If you ever get blocked, raise the **Speed** value (a bigger
  pause), don't lower it.
- Instagram occasionally changes how its site works; if the tool suddenly returns
  errors, that's usually why. The fully-official, never-breaks alternative is the
  Meta **Graph API Business Discovery** route — see `docs/META_SETUP.md` in this
  repo.

---

## Feeding results into the Street Food Post app

The app's caption library lives in `data/streetfood_hooks.json` (each hook has a
unique `id` and `text` with `{location}` / `{day}` / `{item}` placeholders). The
downloaded CSV is a great **research input** — skim it for phrasing you like,
then hand-write your own original hooks.

---

## For power users: the command line (optional)

There's also a scriptable CLI that shares the same engine. You don't need this if
you're using the double-click app.

```bash
IG_SESSIONID="<your sessionid cookie>" node scrape.js handles.txt
node scrape.js --sessionid "<cookie>" natgeo bonappetitmag --max 30 --out ./output
```

Options: `--sessionid`, `--max` (posts per handle, default 50), `--delay` (ms
between requests, default 3000), `--out` (output folder). Writes
`captions.csv`, `captions.json`, and `by-handle/<handle>.json`.

---

## What's in this folder

```
Start-Mac.command      Double-click to run (Mac)
Start-Windows.bat      Double-click to run (Windows)
server.js              The little local engine that powers the web UI
public/index.html      The web UI you interact with
lib/scraper.js         The shared scraping engine (used by UI + CLI)
scrape.js              Optional command-line version
handles.example.txt    Example handle list (for the CLI)
```

---

## Troubleshooting

| Symptom                                   | Fix                                                       |
| ----------------------------------------- | -------------------------------------------------------- |
| Browser didn't open                       | Go to **http://127.0.0.1:4785** yourself.                |
| "session expired" / lots of failures      | Your code is stale — grab a fresh `sessionid` (Step 1 helper). |
| An account says "private"                 | It is private; there's nothing public to grab.           |
| Only ~12 posts came back                  | Instagram throttled paging — raise **Speed** and retry later. |
| Mac: "unidentified developer"             | Right-click `Start-Mac.command` → **Open** → **Open** (first time only). |
| Windows: "Windows protected your PC"      | Click **More info → Run anyway** (first time only).      |
| "node is not recognised / command not found" | Install Node.js from nodejs.org, then start it again. |
