/*
 * notify.js — post reminders.
 *
 * V1 uses the browser's Notification API. Important honesty: a plain web app
 * can only fire a reminder while it has been opened around the reminder time —
 * it can't wake itself in the background. So this shows a reminder when the app
 * is opened (or left open) on a working day after the chosen time. When the app
 * is wrapped with Capacitor, swap `show()` for the @capacitor/local-notifications
 * plugin to get true scheduled notifications — nothing else here needs to change.
 *
 * On a TRADING day it now nudges the plan's three Story beats — morning
 * ("we're on"), midday (proof of life), late ("last chance") — firing the most
 * recent one that's due (and quietly consuming any earlier one it skipped past,
 * so a stale morning beat can't pop at 4pm). Non-trading days keep the single
 * "you've got posts queued" nudge.
 */
const Notify = (() => {
  function supported() {
    return typeof Notification !== "undefined";
  }
  function permission() {
    return supported() ? Notification.permission : "denied";
  }
  async function request() {
    if (!supported()) return "denied";
    try { return await Notification.requestPermission(); }
    catch (e) { return "denied"; }
  }
  function show(title, body) {
    try {
      if (permission() === "granted") {
        const n = new Notification(title, { body });
        n.onclick = () => { try { window.focus(); } catch (e) {} };
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function todayStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function postedToday(posts) {
    const t = todayStr();
    return posts.some((p) => p.status === "shared" && (p.created || "").slice(0, 10) === t);
  }

  // Called on app open (and periodically while open). Fires at most one
  // reminder per day, only on a working day, only after the chosen time, and
  // only if nothing has been shared today.
  // Queued posts whose day has arrived (or slipped past) and aren't done yet.
  function dueQueue(t) {
    const q = (typeof Store !== "undefined" && Store.getQueue) ? Store.getQueue() : [];
    return q.filter((it) => !it.done && it.date && it.date <= t);
  }

  function toMin(hhmm) {
    const [h, m] = (hhmm || "0:0").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  function minutesNow(d = new Date()) {
    return d.getHours() * 60 + d.getMinutes();
  }
  // The three trading-day Story beats, in order. Times come from the notify
  // config (morning = the existing `time` picker; midday/late default sensibly).
  function beats(n) {
    return [
      { key: "morning", time: n.time || "09:00", title: "Story: we're on 📣",
        body: (place) => `Post a “we’re at ${place}” story — a setup or prep shot, and add the location sticker.` },
      { key: "midday", time: n.midday || "13:00", title: "Story: proof of life 🍗",
        body: (place) => `Snap the queue or a box going out at ${place}. This is the social-proof beat.` },
      { key: "late", time: n.late || "16:00", title: "Story: last chance ⏳",
        body: () => `Post a “1 hour left / nearly sold out” story — urgency converts the fence-sitters.` },
    ];
  }

  function maybeRemind() {
    const n = Store.getNotify();
    if (!n.enabled || permission() !== "granted") return false;
    const t = todayStr();
    const wd = Store.getWorkday(t);

    if (wd) {
      // Trading day → Story beats. Reset the per-day log when the date rolls.
      let fired = (n.beatsDate === t && Array.isArray(n.beatsFired)) ? n.beatsFired.slice() : [];
      const now = minutesNow();
      const passed = beats(n).filter((b) => toMin(b.time) <= now && !fired.includes(b.key));
      if (passed.length === 0) return false;
      const beat = passed[passed.length - 1]; // the most recent due beat
      if (show(beat.title, beat.body((wd && wd.location) || "your pitch"))) {
        // Consume the fired beat AND any earlier ones we skipped past, so a
        // missed morning beat doesn't surface hours later.
        passed.forEach((b) => fired.push(b.key));
        n.beatsDate = t;
        n.beatsFired = fired;
        Store.setNotify(n);
        return true;
      }
      return false;
    }

    // Non-trading day → the single queue-due nudge (once per day).
    if (n.lastNotified === t) return false;
    const due = dueQueue(t);
    if (due.length === 0) return false;
    if (show("Time to post 🐔", `You've got ${due.length} post${due.length > 1 ? "s" : ""} queued for today — fire them out.`)) {
      n.lastNotified = t;
      Store.setNotify(n);
      return true;
    }
    return false;
  }

  return { supported, permission, request, show, maybeRemind, todayStr, postedToday };
})();
