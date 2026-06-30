/*
 * share.js — hands the finished image + caption to the phone's share sheet.
 *
 * On a phone (and inside the Capacitor app) this opens the native share sheet,
 * where the user taps Instagram or Facebook and posts it themselves. On a
 * desktop browser that can't share files, it falls back to copying the caption
 * and downloading the image so nothing is ever lost.
 *
 * When this is wrapped with Capacitor, swap the navigator.share call for the
 * @capacitor/share plugin — the rest of the app doesn't change.
 */
const Sharing = (() => {
  async function share(blob, caption, filename = "post.png") {
    const file = new File([blob], filename, { type: "image/png" });

    // Preferred path: native share sheet with the image attached.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        return { method: "share", ok: true };
      } catch (e) {
        if (e && e.name === "AbortError") return { method: "share", ok: false, cancelled: true };
        // fall through to the fallback below
      }
    }

    // Fallback: copy caption + download image.
    let copied = false;
    try {
      await navigator.clipboard.writeText(caption);
      copied = true;
    } catch (e) {
      /* clipboard may be blocked; not fatal */
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { method: "fallback", ok: true, captionCopied: copied };
  }

  return { share };
})();
