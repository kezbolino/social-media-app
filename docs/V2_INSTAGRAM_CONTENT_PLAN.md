# Instagram Weekly Content Plan: Street Food Stall (Handover for Claude Code)

**Purpose:** Reference document for building any tooling, templates, or scheduling automation around the stall's Instagram content. Written July 2026, based on current Instagram algorithm behaviour.

**Business context:** London street food stall (fried chicken, burgers, fries) trading at markets. Instagram run part-time by the owner alongside cooking and trading. Content is filmed/edited with help from a professional video editor (Premiere Pro / After Effects background). Goal is local footfall, not vanity reach.

---

## 1. Current Instagram landscape (July 2026)

These are the constraints and priorities everything below is built on:

- **Hashtags are now a minor topic signal, not a reach lever.** Max 5 per post (cap rolled out Dec 2025). Following hashtags was removed Dec 2024. Use 3-5 accurate, niche tags. Do not spend time researching tags.
- **Ranking is behavioural:** watch time, shares, saves, comments. The first second of a Reel decides its fate.
- **Captions are search text.** Instagram reads captions like a search engine. Write naturally using the words people actually search: the dish name, the market name, the area.
- **Originality Score:** recycled clips and TikTok/CapCut watermarks tank reach. Every clip needs its own edit per platform.
- **Local beats loud.** For a market stall, 3,000 local views beat 50,000 irrelevant ones. Always tag location, name the market, film recognisable landmarks.

## 2. Format roles

| Format | Job | Frequency |
|---|---|---|
| Reels | Acquisition. Reach non-followers. | 2-3 per week |
| Stories | Conversion. Turn followers into footfall. | Every trading day |
| Carousels | Depth. Saves, shares, menu reference. | 1 per week (or fortnight) |

## 3. The weekly plan

Assumes 2-3 trading days per week. Adjust day names to actual trading schedule.

### Trading days (every one, non-negotiable)
**Stories, 3 beats:**
1. **Morning ("we're on"):** setup shot or prep shot + text: "At [market name] today until [time]". Add location sticker.
2. **Midday (proof of life):** the queue, food going out, a happy customer. This is the social proof beat.
3. **Late ("last chance"):** "1 hour left" / "nearly sold out of X". Urgency converts fence-sitters.

Each beat is one 10-second phone clip. No editing. Total effort: under 5 minutes per day.

### Reel 1: The Hero (weekly)
- The best-looking 15-30 seconds of the week. Sizzle, sauce, cheese pull, box close-up.
- **Hook rule:** food action in frame at 0.0 seconds. No logo, no title card, no "hey guys".
- 60-90 seconds only if there is genuine content to fill it; otherwise short is fine.
- Caption: natural language with dish + market + area, e.g. "Buttermilk fried chicken burger at [market], [area], every Saturday."
- 3-5 tags: e.g. #londonstreetfood #[market]market #[area] #friedchicken + one branded tag.

### Reel 2: The Human (weekly)
- Behind the counter: prep, banter, a regular customer, a mistake, the 5am start.
- This is the share-driver. People share personality, not just food.
- Filmed on the phone, rough is fine. Authenticity outperforms polish for this slot.

### Reel 3: The Opportunist (when it happens, not forced)
- Rain, sunshine rush, a celebrity nearby, a new menu item test, market event.
- Zero pressure slot. Skip it in a bad week.

### Carousel (weekly or fortnightly)
- Rotating themes: full menu with prices / "how the [signature item] is made" in 6 slides / this month's markets and dates / best customer photos.
- Carousels get saved. A menu carousel becomes the thing people check before visiting.

## 4. Batching (this is what makes it sustainable)

- **Film everything on trading days.** 10-15 phone clips per trading day: prep, cooking, serving, crowd, product close-ups. Never film on non-trading days.
- **One edit session per week** (60-90 min): cut both weekly Reels, build the carousel if due.
- **Stories are never batched.** They are live, in the moment, from the stall.

## 5. Caption template

```
[One-line hook or description in plain English]

📍 [Market name], [Area] — [trading days/hours]

[Optional: one line of personality or CTA]

#tag1 #tag2 #tag3 #tag4 #tag5
```

Rules:
- Dish name, market name, and area appear in the caption body, not just tags.
- Tags at the end, separated by white space, max 5, all directly relevant.
- Tags go in the caption, not a comment (comment tags are indexed separately/later).

## 6. Standing tag pool (pick 3-5 per post)

- Branded: #[businessname]
- Food: #friedchicken #smashburger #chickenburger (match the actual dish in the post)
- Local: #[marketname] #[area]food #londonstreetfood #londonfoodie
- Never use generic mega-tags (#food #yum #instafood).

## 7. What NOT to do

- No 30-tag blocks (capped at 5 anyway, and it reads as spam).
- No cross-posting with watermarks. Re-export clean per platform.
- No intro cards or logos at the start of Reels.
- No posting for the sake of it on a bad week. Two good Reels beat four rushed ones.
- No chasing trends that don't fit. Trending audio only if it genuinely suits the clip.

## 8. Weekly review (5 minutes, once a week)

Check Insights for:
1. Which Reel had the best **watch-through** (not likes).
2. Which post got the most **shares and saves**.
3. Follower location split (are new followers actually London-based?).

Do more of whatever wins on 1 and 2. Ignore like counts.

## 9. Possible tooling (for Claude Code, if building anything)

Ideas in rough priority order, none committed yet:
- **Caption generator:** input dish + market + day, output caption using the template above with tag pool selection.
- **Weekly checklist app/reminder:** trading-day story beats + edit-session reminder.
- **Insights logger:** manual weekly entry of watch-through/shares/saves per post to spot patterns over time.
- Existing related asset: a social media tool has already been built for this business previously; check whether this plan should integrate with it rather than duplicate.

---

*End of handover.*
