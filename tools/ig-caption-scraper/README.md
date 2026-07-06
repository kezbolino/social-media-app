# ig-caption-scraper

Pull **captions** (plus post URL, date, like/comment counts) for a list of
**public** Instagram handles into tidy **JSON + CSV**.

Built to run **on your own machine** (a Mac, say), where the internet is open —
not inside a locked-down cloud box. Zero dependencies, one file, Node 18+.

---

## Why it needs your session cookie

Instagram shows almost nothing to logged-out visitors — profiles hit a login
wall. The reliable fix is to let the script reuse **your own logged-in browser
session** by pasting in one cookie (`sessionid`). Instagram then serves the
script exactly what your browser sees.

- Your **password is never used, sent, or stored** — only the `sessionid` cookie.
- The cookie only ever goes to `instagram.com`.
- Treat the cookie like a password while it's valid: don't paste it into random
  places or commit it to git (this folder's `.gitignore` already blocks the
  common filenames).

---

## Get your `sessionid` cookie (about 30 seconds)

1. Open **instagram.com** in a browser and make sure you're **logged in**.
2. Open DevTools: **⌥⌘I** (Mac) / **F12** (Windows).
3. Go to the **Application** tab → left sidebar **Storage → Cookies →
   `https://www.instagram.com`**.
4. Find the row named **`sessionid`** and copy its **Value** (a long string).

> Tip: the cookie expires when you log out or after a while — if the script
> starts returning "session expired", grab a fresh one.

---

## Run it

From this folder:

```bash
# 1. put your handles in a file (one per line)
cp handles.example.txt handles.txt
#    …then edit handles.txt

# 2. run, passing your cookie via env var (keeps it out of your shell history
#    if you use a leading space, and out of the args list)
IG_SESSIONID="paste_your_sessionid_here" node scrape.js handles.txt
```

Or pass handles directly and the cookie as a flag:

```bash
node scrape.js --sessionid "paste_here" natgeo bonappetitmag --max 30
```

### Options

| Flag                | Default    | Meaning                                        |
| ------------------- | ---------- | ---------------------------------------------- |
| `--sessionid <c>`   | `$IG_SESSIONID` | Your sessionid cookie                     |
| `--max <n>`         | `50`       | Max posts to pull per handle                   |
| `--delay <ms>`      | `3000`     | Base pause between requests (jittered ±40%)    |
| `--out <dir>`       | `./output` | Where to write results                         |
| `-h`, `--help`      |            | Show help                                      |

Handles can be bare (`natgeo`), `@`-prefixed, or full profile URLs — all fine.

---

## What you get

```
output/
  captions.csv          all posts from all handles — open in Excel/Sheets
  captions.json         same data as JSON
  by-handle/
    natgeo.json         per-account: profile metadata + that account's posts
    bonappetitmag.json
```

Each post record:

```json
{
  "handle": "bonappetitmag",
  "shortcode": "C1abcDefGhi",
  "url": "https://www.instagram.com/p/C1abcDefGhi/",
  "timestamp": "2026-05-14T16:03:11.000Z",
  "is_video": false,
  "likes": 4210,
  "comments": 88,
  "caption": "The crispiest smashed potatoes you'll ever make…"
}
```

---

## Being a good citizen (please read)

- This pulls **public** posts only. **Private** accounts return nothing — the
  script says so and moves on.
- Bulk collection is **against Instagram's Terms of Service**, public data or
  not. Use this on accounts you own or have permission to analyse, keep volumes
  modest, and don't republish other people's captions as your own.
- The default delays are deliberately slow and jittered so you don't hammer
  Instagram (and don't get your account rate-limited or flagged). If you're
  scraping more than a handful of accounts, **raise `--delay`**, don't lower it.
- Instagram changes its private web endpoints without notice. If a run suddenly
  returns errors or empty data, the endpoint shape probably moved — that's the
  nature of this approach, and the fully-stable alternative is the official
  **Graph API Business Discovery** route (see `docs/META_SETUP.md` in this repo).

---

## Feeding results into the Street Food Post app

The app's caption library lives in `data/streetfood_hooks.json` (each hook has a
unique `id` and a `text` with `{location}` / `{day}` / `{item}` placeholders).
The scraper's `captions.csv` is a good **research input** — skim it for phrasing
you like, then hand-write your own hooks. Don't paste other vendors' captions in
verbatim; use them as inspiration for original lines.

---

## Troubleshooting

| Symptom                                  | Likely cause / fix                                    |
| ---------------------------------------- | ----------------------------------------------------- |
| `HTTP 401/403` or "session expired"      | Cookie missing/stale → grab a fresh `sessionid`.      |
| `got a non-JSON response (login wall)`   | Not logged in / checkpoint → re-login, new cookie.    |
| Only ~12 posts returned                  | Pagination got blocked; raise `--delay`, retry later. |
| `HTTP 429`, slow crawl                   | You're rate-limited — the script backs off; wait it out or raise `--delay`. |
| `not found`                              | Handle is wrong, renamed, or deleted.                 |
| Empty result, account is real            | It's **private**, or IG changed the endpoint shape.   |
