/*
 * notify.js — post reminders.
 *
 * V1 uses the browser's Notification API. Important honesty: a plain web app
 * can only fire a reminder while it has been opened around the reminder time —
 * it can't wake itself in the background. So this shows a reminder when the app
 * is opened (or left open) on a working day after the chosen time, if nothing's
 * been posted yet. When the app is wrapped with Capacitor, swap `show()` for the
 * @capacitor/local-notifications plugin to get true scheduled notifications —
 * nothing else here needs to change.
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

  function maybeRemind() {
    const n = Store.getNotify();
    if (!n.enabled || permission() !== "granted") return false;
    const t = todayStr();
    if (n.lastNotified === t) return false;
    const [hh, mm] = (n.time || "09:00").split(":").map(Number);
    const trigger = new Date();
    trigger.setHours(hh || 0, mm || 0, 0, 0);
    if (new Date() < trigger) return false;
    if (postedToday(Store.getPosts())) return false;

    // Two reasons to nudge: it's a working day, or there are posts queued for
    // today. Queued items take priority in the wording.
    const wd = Store.getWorkday(t);
    const due = dueQueue(t);
    if (!wd && due.length === 0) return false;

    const body = due.length
      ? `You've got ${due.length} post${due.length > 1 ? "s" : ""} queued for today — fire them out.`
      : `You're at ${(wd && wd.location) || "your pitch"} today — fire out a post before the lunch rush.`;
    if (show("Time to post 🐔", body)) {
      n.lastNotified = t;
      Store.setNotify(n);
      return true;
    }
    return false;
  }

  return { supported, permission, request, show, maybeRemind, todayStr, postedToday };
})();
