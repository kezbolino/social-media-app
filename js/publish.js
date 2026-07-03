/*
 * publish.js — direct posting to Facebook & Instagram via Meta's Graph API.
 *
 * This is the auto-posting seam the spec parked for V2, built for the
 * "Meta API for 1 user" setup: a Meta app in Development Mode, used by an
 * admin of the Facebook Page — no App Review needed for that one user.
 * Full plain-English setup steps live in docs/META_SETUP.md.
 *
 * What it needs (entered once in Settings, saved only on this device):
 *   - accessToken : a long-lived PAGE access token
 *   - pageId      : the Facebook Page's ID           (for Facebook posts)
 *   - igUserId    : the linked Instagram account ID  (for Instagram posts)
 *   - cloudName + uploadPreset : a free Cloudinary account (Instagram only —
 *     Meta insists the image lives at a public URL before it will publish it;
 *     Facebook happily takes a direct file upload, so it needs no hosting)
 *
 * Both paths run entirely from the phone — still no app server.
 */
const Publish = (() => {
  const GRAPH = "https://graph.facebook.com/v21.0";

  function cfg() {
    return Store.getMeta();
  }
  function isConfiguredFB(c = cfg()) {
    return !!(c.pageId && c.accessToken);
  }
  function isConfiguredIG(c = cfg()) {
    return !!(c.igUserId && c.accessToken && c.cloudName && c.uploadPreset);
  }
  function isConfiguredAny() {
    const c = cfg();
    return isConfiguredFB(c) || isConfiguredIG(c);
  }

  // Translate Meta's error objects into something a human can act on.
  function plainError(err) {
    if (!err) return "Something went wrong talking to Meta.";
    const msg = err.message || "";
    if (err.code === 190) return "Your access token has expired or is invalid — grab a fresh one (see the Meta setup guide).";
    if (err.code === 200 || err.code === 10) return "The token doesn't have permission for this — check it's a PAGE token with the right permissions.";
    if (err.code === 100 && /instagram/i.test(msg)) return "Instagram account not found — double-check the Instagram user ID.";
    if (err.code === 100) return "Meta didn't recognise one of the IDs — double-check the Page / Instagram IDs.";
    if (err.code === 4 || err.code === 17 || err.code === 32) return "Meta's rate limit hit — wait a few minutes and try again.";
    return msg || "Meta returned an error.";
  }

  async function graphPost(path, params, form) {
    const fd = form || new FormData();
    Object.entries(params || {}).forEach(([k, v]) => fd.append(k, v));
    fd.append("access_token", cfg().accessToken);
    let res, json;
    try {
      res = await fetch(`${GRAPH}/${path}`, { method: "POST", body: fd });
      json = await res.json();
    } catch (e) {
      throw new Error("Couldn't reach Meta — check your internet connection.");
    }
    if (!res.ok || json.error) throw new Error(plainError(json.error));
    return json;
  }

  // Instagram needs the image at a public URL first. Cloudinary's unsigned
  // upload does that straight from the phone, no server, free tier.
  async function hostImage(blob) {
    const c = cfg();
    const fd = new FormData();
    fd.append("file", blob, "post.png");
    fd.append("upload_preset", c.uploadPreset);
    let res, json;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(c.cloudName)}/image/upload`, {
        method: "POST",
        body: fd,
      });
      json = await res.json();
    } catch (e) {
      throw new Error("Couldn't reach the image host — check your internet connection.");
    }
    if (!res.ok || !json.secure_url) {
      throw new Error(
        (json.error && json.error.message) ||
          "Image upload failed — check the Cloudinary cloud name and preset."
      );
    }
    return json.secure_url;
  }

  // Facebook Page photo post: direct file upload, one call.
  async function postToFacebook(blob, caption) {
    const c = cfg();
    if (!isConfiguredFB(c)) throw new Error("Facebook isn't set up yet — see Settings.");
    const fd = new FormData();
    fd.append("source", blob, "post.png");
    return graphPost(`${c.pageId}/photos`, { caption: caption || "" }, fd);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Instagram: host the image → create a media container → publish it.
  // The container can take a moment to process, so publishing retries briefly.
  async function postToInstagram(blob, caption) {
    const c = cfg();
    if (!isConfiguredIG(c)) throw new Error("Instagram isn't set up yet — see Settings.");
    const imageUrl = await hostImage(blob);
    const container = await graphPost(`${c.igUserId}/media`, {
      image_url: imageUrl,
      caption: caption || "",
    });
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await graphPost(`${c.igUserId}/media_publish`, { creation_id: container.id });
      } catch (e) {
        lastErr = e;
        // "Media not ready" style errors resolve themselves — wait and retry.
        if (!/not (yet )?(available|ready|finished)|in progress|9007|2207027/i.test(e.message)) throw e;
        await sleep(2000);
      }
    }
    throw lastErr || new Error("Instagram didn't finish processing the image — try again.");
  }

  // Quick sanity check for the Settings screen: whoami with the saved token.
  async function testConnection() {
    const c = cfg();
    if (!c.accessToken) throw new Error("Paste an access token first.");
    let res, json;
    try {
      res = await fetch(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(c.accessToken)}`);
      json = await res.json();
    } catch (e) {
      throw new Error("Couldn't reach Meta — check your internet connection.");
    }
    if (!res.ok || json.error) throw new Error(plainError(json.error));
    return json; // { id, name } — for a Page token, the Page's name
  }

  return {
    isConfiguredFB,
    isConfiguredIG,
    isConfiguredAny,
    postToFacebook,
    postToInstagram,
    testConnection,
  };
})();
