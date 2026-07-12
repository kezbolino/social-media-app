/*
 * backup.js — export/import everything the app has saved on this device.
 *
 * Bundles Store's localStorage data plus the Photos stash and any queued
 * "Queue for later" Drafts into one portable JSON file, so a cleared browser
 * or a new phone doesn't mean starting from zero. Blobs are inlined as base64
 * data URLs — there's no zip library here (no build step, offline-first), and
 * this keeps a backup a single file the owner can drop anywhere.
 *
 * Meta (Facebook/Instagram) credentials are deliberately left out: store.js
 * already treats that access token as device-only ("never leaves the phone
 * except in calls to Meta itself"), so a backup file — which might get
 * emailed or dropped in cloud storage — shouldn't carry it. The owner
 * re-enters those after a restore.
 */
const Backup = (() => {
  const FORMAT = "wingman-backup";
  const VERSION = 1;

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // Build the full backup object (JSON-serialisable — blobs become data URLs).
  async function build() {
    const photos = window.Photos && Photos.supported ? await Photos.all() : [];
    const queue = Store.getQueue();
    const drafts = [];
    for (const q of queue) {
      if (!q.draftId || !window.Drafts) continue;
      const rec = await Drafts.get(q.draftId);
      if (rec && rec.blob) {
        drafts.push({ id: q.draftId, type: rec.type, dataUrl: await blobToDataUrl(rec.blob) });
      }
    }
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      store: {
        menuItems: Store.getMenuItems(),
        locations: Store.getLocations(),
        recencyLog: Store.getRecencyLog(),
        hashtags: Store.getHashtags(),
        userHooks: Store.getUserHooks(),
        schedule: Store.getSchedule(),
        notify: Store.getNotify(),
        queue,
        posts: Store.getPosts(),
      },
      photos: await Promise.all(
        photos.map(async (p) => ({ type: p.type, dataUrl: await blobToDataUrl(p.blob) }))
      ),
      drafts,
    };
  }

  // Build the backup and trigger a file download. Resolves the data (so the
  // caller can summarise what was saved).
  async function exportFile() {
    const data = await build();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wingman-backup-${data.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return data;
  }

  // Parse + apply a backup file, replacing current data. Callers should
  // confirm with the user first — this overwrites what's on the device now.
  // Resolves a short summary of what was restored.
  async function restoreFile(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (e) {
      throw new Error("That file isn't valid — couldn't be read as a backup.");
    }
    if (!data || data.format !== FORMAT || !data.store) {
      throw new Error("That doesn't look like a Wingman backup file.");
    }
    const s = data.store;
    if (s.menuItems) Store.setMenuItems(s.menuItems);
    if (s.locations) Store.setLocations(s.locations);
    if (s.recencyLog) Store.setRecencyLog(s.recencyLog);
    if (s.hashtags) Store.setHashtags(s.hashtags);
    if (s.userHooks) Store.setUserHooks(s.userHooks);
    if (s.schedule) Store.setSchedule(s.schedule);
    if (s.notify) Store.setNotify(s.notify);
    if (s.queue) Store.setQueue(s.queue);
    if (s.posts) Store.setPosts(s.posts);

    if (window.Photos && Photos.supported) {
      await Photos.clear();
      if (data.photos && data.photos.length) {
        await Photos.add(data.photos.map((p) => Imaging.dataUrlToBlob(p.dataUrl)));
      }
    }
    if (window.Drafts && Drafts.supported) {
      await Drafts.clear();
      for (const d of data.drafts || []) {
        await Drafts.save({ id: d.id, blob: Imaging.dataUrlToBlob(d.dataUrl), type: d.type || "image/png" });
      }
    }
    return {
      posts: (s.posts || []).length,
      queue: (s.queue || []).length,
      photos: (data.photos || []).length,
    };
  }

  return { build, exportFile, restoreFile };
})();
window.Backup = Backup;
