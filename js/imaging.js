/*
 * imaging.js — all the picture work, done on an HTML5 <canvas>.
 *
 * This is the same technique as the thumbnail compositor: load photos, fit
 * them into boxes (centre-crop), draw branding/text on top, export a PNG.
 * No server, no upload — it all happens on the phone.
 */
const Imaging = (() => {
  // Turn a file the user picked into an <img> we can both draw and preview.
  // We read it as a data URL so the image's src stays valid for the whole
  // session (a blob URL would have to be revoked, which kills the preview).
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("That image couldn't be read"));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("That image couldn't be loaded"));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't load " + url));
      img.src = url;
    });
  }

  // Draw `img` to fill `box` (x,y,width,height), cropping the overflow —
  // centre-crop, so the middle of the photo is always kept.
  function drawCover(ctx, img, box) {
    const scale = Math.max(box.width / img.width, box.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const dx = box.x + (box.width - w) / 2;
    const dy = box.y + (box.height - h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();
  }

  // Draw text centred in a box, shrinking the font until it fits the width,
  // and wrapping onto a second line if needed. Used for burnt-in location/day.
  function drawTextInBox(ctx, text, box, opts = {}) {
    if (!text) return;
    const color = opts.color || "#ffffff";
    const align = opts.align || "center";
    const maxFont = opts.maxFont || Math.floor(box.height * 0.55);
    const minFont = opts.minFont || 24;
    const family = "800 {size}px Arial, sans-serif";

    const fits = (lines, size) => {
      ctx.font = family.replace("{size}", size);
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const totalH = lines.length * size * 1.12;
      return widest <= box.width && totalH <= box.height;
    };

    // Try one line, shrinking; if it never fits, try two lines, shrinking.
    let chosen = null;
    for (const lineCount of [1, 2]) {
      const lines = lineCount === 1 ? [text] : wrapToLines(ctx, text, 2);
      for (let size = maxFont; size >= minFont; size -= 2) {
        if (fits(lines, size)) {
          chosen = { lines, size };
          break;
        }
      }
      if (chosen) break;
    }
    if (!chosen) chosen = { lines: wrapToLines(ctx, text, 2), size: minFont };

    ctx.save();
    ctx.font = family.replace("{size}", chosen.size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    // Subtle shadow so text stays legible over busy photos.
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(4, chosen.size * 0.12);
    const x =
      align === "center"
        ? box.x + box.width / 2
        : align === "right"
        ? box.x + box.width
        : box.x;
    const lineH = chosen.size * 1.12;
    const startY = box.y + box.height / 2 - ((chosen.lines.length - 1) * lineH) / 2;
    chosen.lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));
    ctx.restore();
  }

  // Split text roughly evenly across up to `maxLines` lines on word breaks.
  function wrapToLines(ctx, text, maxLines) {
    const words = text.split(/\s+/);
    if (words.length <= 1 || maxLines <= 1) return [text];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }

  function newCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // SINGLE PHOTO: one image fitted to the export square.
  function renderSingle(img) {
    const { width, height } = window.APP_CONFIG.EXPORT;
    const canvas = newCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, img, { x: 0, y: 0, width, height });
    return canvas;
  }

  // COLLAGE: photos into the template's boxes, branding on top, optional text.
  // `images` is an array aligned to template.boxes (some entries may be null).
  // `overlayImg` is the pre-loaded branded PNG (or null for placeholder chrome).
  function renderCollage(template, images, overlayImg, burnText) {
    const { width, height } = template.canvas;
    const canvas = newCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = template.background || "#111";
    ctx.fillRect(0, 0, width, height);

    template.boxes.forEach((box, i) => {
      const img = images[i];
      if (img) {
        drawCover(ctx, img, box);
      } else {
        // Empty slot — show a faint placeholder so it's obvious it's blank.
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.restore();
      }
    });

    if (overlayImg) {
      // Real branded template: the PNG carries the logo/frame.
      ctx.drawImage(overlayImg, 0, 0, width, height);
    } else {
      drawPlaceholderChrome(ctx, template, width, height);
    }

    if (template.textBox && burnText) {
      drawTextInBox(ctx, burnText, template.textBox, {
        color: template.textBox.color,
        align: template.textBox.align,
      });
    }
    return canvas;
  }

  // Simple frame + "placeholder" mark so the starter templates look intentional
  // until Kesbo drops in real branded overlay PNGs.
  function drawPlaceholderChrome(ctx, template, width, height) {
    const accent = template.accent || "#ff7a18";
    ctx.save();
    ctx.lineWidth = 14;
    ctx.strokeStyle = accent;
    ctx.strokeRect(7, 7, width - 14, height - 14);
    ctx.fillStyle = accent;
    ctx.font = "700 22px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.globalAlpha = 0.85;
    ctx.fillText("PLACEHOLDER TEMPLATE", width - 28, height - 22);
    ctx.restore();
  }

  function toBlob(canvas) {
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
  }
  function toDataURL(canvas) {
    return canvas.toDataURL("image/png");
  }

  return {
    loadImageFromFile,
    loadImageFromUrl,
    renderSingle,
    renderCollage,
    drawTextInBox,
    toBlob,
    toDataURL,
  };
})();
