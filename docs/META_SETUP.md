# Auto-posting setup (Meta) — plain-English walkthrough

This turns on the **📸 Instagram** and **📘 Facebook** buttons on the review
screen, so posts go up directly instead of through the share sheet. It's a
one-time setup, roughly 30–45 minutes. Nothing here needs App Review from
Meta, because a **Development Mode** app works fully for people who have a
role on the app — and that's exactly our case: one user, your brother.

## What you're collecting

By the end you'll have five values to paste into **Settings → Auto-posting**:

| Value | What it is |
|---|---|
| Page access token | The long-lived key that lets the app post |
| Facebook Page ID | The number for the Chuckling Wings Facebook Page |
| Instagram account ID | The number for the linked Instagram account |
| Cloudinary cloud name | Free image host (Instagram needs the photo at a public URL) |
| Cloudinary upload preset | The "allow uploads" switch for that host |

## Before you start (accounts)

1. The Instagram account must be a **Professional account** (Business or
   Creator). Instagram app → Settings → Account type → switch if needed. Free.
2. The Instagram account must be **linked to a Facebook Page** you admin
   (Chuckling Wings' Page). Instagram → Settings → Business tools → connect the
   Page, or from the Page's settings → Linked accounts.

## Part 1 — the Meta app (developers.facebook.com)

1. Go to **developers.facebook.com** → log in with the Facebook account that
   admins the Page → **My Apps → Create App**.
2. Pick **Business** as the app type. Name it anything (e.g. "Wingman"). You
   do **not** need to submit it for review — leave it in **Development Mode**.
3. In the app dashboard, open **Graph API Explorer** (under Tools).
4. In the Explorer:
   - Top right, pick **your app**.
   - Under **Permissions**, add: `pages_show_list`, `pages_read_engagement`,
     `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
   - Click **Generate Access Token** and approve. Choose the Chuckling Wings
     Page when asked.
   - Change the "User or Page" dropdown to **your Page** — the token shown is
     now a **Page access token**. Copy it.
5. That token expires in about an hour — swap it for a **long-lived** one
   (~60 days): Tools → **Access Token Debugger** → paste the token → **Extend
   Access Token** at the bottom. Copy the extended token. **That's the one you
   paste into the app.**
   - When it expires in ~2 months, you repeat steps 4–5 (two minutes) and paste
     the fresh one in. (A never-expiring Page token is possible via the
     long-lived *user* token route — happy to walk through it when you're set up.)

## Part 2 — the two IDs

- **Page ID:** your Facebook Page → About → scroll down, or in the Graph API
  Explorer run `me?fields=id,name` with the Page token selected.
- **Instagram account ID:** in the Explorer, with your Page selected, run:
  `me?fields=instagram_business_account` — the `id` inside
  `instagram_business_account` is the one you want (a number starting 178…).

## Part 3 — Cloudinary (Instagram only, ~5 minutes)

Instagram's API refuses direct file uploads — the photo must already be on the
web at a public URL. A free Cloudinary account does that invisibly:

1. Sign up at **cloudinary.com** (free plan is plenty: ~25k images/month).
2. Dashboard → note your **cloud name** (e.g. `dq1abcxyz`).
3. Settings (gear) → **Upload** → **Upload presets** → Add upload preset →
   set **Signing mode: Unsigned** → save → note the **preset name**.

Facebook doesn't need this — it takes the image straight from the phone.

## Part 4 — paste into the app

App → **Settings → 🚀 Auto-posting (Meta)** → paste all five values → tap
**🔌 Test connection**. It should say *Connected ✅ — token belongs to
"Chuckling Wings"* (your Page's name). From then on, the review screen shows
**📸 Instagram** and **📘 Facebook** buttons next to Share.

## Honest notes

- **The token is a key to your Page.** The app keeps it only on the phone
  (localStorage) and only ever sends it to Meta itself. Don't paste it
  anywhere else or send it to anyone.
- **Development Mode limits:** only people with a role on the app can use it.
  For one user, that's perfect. If this ever becomes a product for other
  traders, that's when Meta App Review enters the picture.
- **Instagram API limit:** max 100 API-published posts per 24h — you will
  never notice.
- If a post fails, the app shows Meta's reason in plain English (expired
  token, wrong ID, rate limit…). The share sheet always keeps working as the
  fallback.
