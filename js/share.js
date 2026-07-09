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
  // `blobOrBlobs` may be a single Blob or an array (a carousel of images). One
  // caption applies to the whole set.
  async function share(blobOrBlobs, caption, filename = "post.png") {
    const blobs = Array.isArray(blobOrBlobs) ? blobOrBlobs : [blobOrBlobs];
    const files = blobs.map((b, i) => {
      const name = blobs.length > 1
        ? filename.replace(/(\.\w+)?$/, `-${i + 1}$1`)
        : filename;
      return new File([b], name, { type: "image/png" });
    });

    // Preferred path: native share sheet with the image(s) attached.
    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({ files, text: caption });
        return { method: "share", ok: true };
      } catch (e) {
        if (e && e.name === "AbortError") return { method: "share", ok: false, cancelled: true };
        // fall through to the fallback below
      }
    }

    // Fallback: copy caption + download the image(s).
    let copied = false;
    try {
      await navigator.clipboard.writeText(caption);
      copied = true;
    } catch (e) {
      /* clipboard may be blocked; not fatal */
    }
    files.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      // Stagger a touch so browsers don't drop rapid multi-downloads.
      setTimeout(() => { a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }, i * 150);
    });
    return { method: "fallback", ok: true, captionCopied: copied };
  }

  return { share };
})();
