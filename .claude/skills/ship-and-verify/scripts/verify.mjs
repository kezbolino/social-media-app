// verify.mjs — house-standard headless drive for the Wingman PWA.
//
// Why this exists: every session used to re-improvise a Playwright drive from
// scratch, and a re-improvised script is where "a good fix looks broken" bugs
// creep in (wrong scroll element, stale JS, watching a paused-rAF preview). This
// is the one tested driver. Extend it per task via --eval; don't rewrite it.
//
// Setup (transient, gitignored — see .gitignore):
//   npm i --no-save playwright-core
// Run (NODE_PATH lets a scratchpad copy find the transient install):
//   NODE_PATH=/home/user/social-media-app/node_modules \
//     node .claude/skills/ship-and-verify/scripts/verify.mjs --screen home --shot out.png
//
// Flags:
//   --nav <name>      click the bottom-nav tab for a hub screen: home | generate |
//                     calendar | settings (these are the only single-click screens;
//                     deeper screens are reached by flows — drive those with --eval
//                     dispatching the clicks a user would make). NB routing goes
//                     through the app's delegated click handler, NOT show() — show()
//                     is nested in an IIFE and is not reachable from evaluate.
//   --width <px>      viewport width (default 390; also drive 375 & 320 for layout)
//   --height <px>     viewport height (default 844)
//   --onboard         mark setup complete via Store then reload, so boot() lands on
//                     home instead of ob-welcome (most screens need this).
//   --shot <path>     write a screenshot (PNG) — eyeball it, don't trust code alone
//   --eval "<js>"     run JS in the page AFTER routing; its (JSON-able) return
//                     value is printed under "eval". Runs in the page's main world:
//                     bare lexical globals (Store, Photos, FX...) ARE reachable;
//                     window.X is NOT unless the module assigned it. show() is not
//                     reachable at all — navigate by dispatching clicks.
//   --url <url>       override the page URL (default: file://.../index.html)
//
// Always prints a JSON report: { width, screen, consoleErrors, errors[], eval }.
// consoleErrors is the number that matters — the house target is 0.

import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true; // bare flag => true
}

const width = Number(arg("width", 390));
const height = Number(arg("height", 844));
const nav = arg("nav", null);
const onboard = arg("onboard", false) !== false;
const shot = arg("shot", null);
const evalJs = arg("eval", null);
const url = arg("url", `file://${resolve(REPO, "index.html")}`);

const errors = [];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width, height } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle" });
// Let boot()'s first show() settle.
await page.waitForTimeout(300);

// Onboarding: don't guess the raw localStorage key/encoding — set it through
// Store's OWN setter (Store is a reachable lexical global; the key lives in
// APP_CONFIG.STORAGE and is JSON-encoded), then RELOAD so boot() re-reads the flag
// and routes to home instead of ob-welcome.
if (onboard) {
  await page.evaluate(() => Store.setOnboarded(true));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

// Route to a hub screen by clicking its nav tab — the same delegated click handler
// a real tap hits, so history/active-screen stay consistent. show() itself is
// nested in an IIFE and unreachable from evaluate, so we navigate like a user.
if (nav) {
  const sel = `.navbtn[data-nav="${nav}"]`;
  const found = await page.$(sel);
  if (!found) {
    errors.push(`--nav "${nav}": no ${sel} (hub screens: home|generate|calendar|settings)`);
  } else {
    await page.click(sel);
    await page.waitForTimeout(300);
  }
}

let evalResult = null;
if (evalJs) {
  try {
    evalResult = await page.evaluate(`(async () => { ${evalJs} })()`);
  } catch (e) {
    evalResult = { evalError: String(e) };
  }
}

if (shot) await page.screenshot({ path: resolve(process.cwd(), shot) });

await browser.close();

console.log(
  JSON.stringify(
    { width, height, nav, consoleErrors: errors.length, errors, eval: evalResult },
    null,
    2
  )
);
