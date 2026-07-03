/*
 * imaging.js — all the picture work, done on an HTML5 <canvas>.
 *
 * This is the same technique as the thumbnail compositor: load photos, fit
 * them into boxes (centre-crop), draw branding/text on top, export a PNG.
 * No server, no upload — it all happens on the phone.
 */
const Imaging = (() => {
  const FONT_FAMILY = "Poppins, Arial, sans-serif";

  // The canvas can only draw a web font once the browser has actually loaded
  // it — otherwise it silently falls back to a default. Call (and await) this
  // before any canvas text so burnt-in captions use Montserrat.
  let fontsReady = null;
  function ensureFonts() {
    if (fontsReady) return fontsReady;
    if (!document.fonts || !document.fonts.load) {
      fontsReady = Promise.resolve();
      return fontsReady;
    }
    fontsReady = Promise.all([
      document.fonts.load("800 80px Poppins"),
      document.fonts.load("700 40px Poppins"),
      document.fonts.load("600 32px Poppins"),
    ])
      .then(() => document.fonts.ready)
      .catch(() => {});
    return fontsReady;
  }

  // Phone cameras produce 12MP+ images; baking those out as full-size PNG data
  // URLs eats hundreds of MB and can crash a mobile browser. Anything above
  // this (longest side, px) is downscaled on load — still double the 1080
  // export, so quality is untouched.
  const MAX_SOURCE_PX = 2160;

  // Turn a file the user picked into an <img> we can both draw and preview.
  // We resolve to an <img> whose src is a data URL, so it stays valid for the
  // whole session (a blob URL would have to be revoked, which kills the
  // preview). Phone photos carry EXIF rotation metadata; we honour it via
  // createImageBitmap so they don't load sideways onto the canvas.
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const finishWithDataUrl = (dataUrl) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("That image couldn't be loaded"));
        img.src = dataUrl;
      };

      // Bake a drawable (bitmap or img) to a right-sized JPEG data URL.
      const bake = (source, w, h) => {
        const scale = Math.min(1, MAX_SOURCE_PX / Math.max(w, h));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        const ctx = c.getContext("2d");
        ctx.drawImage(source, 0, 0, c.width, c.height);
        // JPEG: photos only, no transparency needed, ~10x smaller than PNG.
        return c.toDataURL("image/jpeg", 0.92);
      };

      // Fallback: read as a data URL, then still downscale (no orientation fix).
      const readAsDataUrl = () => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("That image couldn't be read"));
        reader.onload = () => {
          const probe = new Image();
          probe.onload = () =>
            finishWithDataUrl(bake(probe, probe.width, probe.height));
          probe.onerror = () => reject(new Error("That image couldn't be loaded"));
          probe.src = reader.result;
        };
        reader.readAsDataURL(file);
      };

      // Preferred: decode with EXIF orientation applied, then bake the
      // corrected pixels back out so both preview and export are upright.
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: "from-image" })
          .then((bmp) => {
            const dataUrl = bake(bmp, bmp.width, bmp.height);
            if (bmp.close) bmp.close();
            finishWithDataUrl(dataUrl);
          })
          .catch(readAsDataUrl);
      } else {
        readAsDataUrl();
      }
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
    const family = "800 {size}px Poppins, Arial, sans-serif";

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

  // SINGLE PHOTO: one image fitted to the export square. If `captionText` is
  // given, draw it onto the photo in a branded bottom panel (full caption,
  // wrapped to fit — never cut off).
  function renderSingle(img, captionText) {
    const { width, height } = window.APP_CONFIG.EXPORT;
    const canvas = newCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, img, { x: 0, y: 0, width, height });
    if (captionText) drawCaptionPanel(ctx, captionText, width, height);
    return canvas;
  }

  // Draw the whole caption in a semi-transparent brand panel across the bottom.
  // The text is word-wrapped and the font shrinks until every line fits inside
  // a panel no taller than ~half the image, so the full caption always shows.
  function drawCaptionPanel(ctx, text, W, H, opts = {}) {
    if (!text) return;
    const weight = opts.weight || 800;
    const padX = Math.round(W * 0.06);
    const padY = Math.round(H * 0.04);
    const maxTextW = W - padX * 2;
    const maxPanelH = Math.round(H * (opts.maxHeightFrac || 0.5));
    const maxTextH = maxPanelH - padY * 2;
    const maxFont = opts.maxFont || Math.round(W * 0.072);
    const minFont = opts.minFont || Math.round(W * 0.028);
    const lineRatio = 1.18;

    const wrap = (fontSize) => {
      ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
      const lines = [];
      let line = "";
      for (const word of text.split(/\s+/)) {
        const trial = line ? line + " " + word : word;
        if (ctx.measureText(trial).width <= maxTextW || !line) line = trial;
        else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
      return lines;
    };

    let fontSize = maxFont;
    let lines = wrap(fontSize);
    for (; fontSize > minFont; fontSize -= 2) {
      lines = wrap(fontSize);
      if (lines.length * fontSize * lineRatio <= maxTextH) break;
    }
    const lineH = fontSize * lineRatio;
    const textH = lines.length * lineH;
    const panelH = Math.min(maxPanelH, Math.round(textH + padY * 2));
    const y = H - panelH;

    const grad = ctx.createLinearGradient(0, y, 0, H);
    grad.addColorStop(0, "rgba(10,77,161,0)");
    grad.addColorStop(0.22, "rgba(10,77,161,0.82)");
    grad.addColorStop(1, "rgba(10,77,161,0.94)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, panelH);
    ctx.fillStyle = "#f58b1f";
    ctx.fillRect(0, y, W, Math.max(6, Math.round(H * 0.008)));

    ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = opts.color || "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Math.max(3, fontSize * 0.08);
    const startY = y + panelH / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));
    ctx.restore();
  }

  // PREPARED IMAGE: an already-cropped/filtered image (from the editor) drawn
  // at its own size, with the caption overlaid.
  function renderPrepared(baseImg, captionText) {
    const w = baseImg.naturalWidth || baseImg.width;
    const h = baseImg.naturalHeight || baseImg.height;
    const canvas = newCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImg, 0, 0, w, h);
    if (captionText) drawCaptionPanel(ctx, captionText, w, h);
    return canvas;
  }

  // COLLAGE: photos into the template's boxes, branding on top, optional text.
  // `images` is an array aligned to template.boxes (some entries may be null).
  // `overlayImg` is the pre-loaded branded PNG (or null for placeholder chrome).
  // `captionText`, if given, is drawn full in a bottom panel like single photos.
  function renderCollage(template, images, overlayImg, captionText) {
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

    if (captionText) {
      drawCaptionPanel(ctx, captionText, width, height);
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
    ensureFonts,
    loadImageFromFile,
    loadImageFromUrl,
    renderSingle,
    renderPrepared,
    renderCollage,
    drawCaptionPanel,
    toBlob,
    toDataURL,
  };
})();
