#!/usr/bin/env node
'use strict';

/**
 * ig-caption-scraper — command-line version (advanced/optional).
 *
 * Most people should use the double-click app instead (Start-Mac.command /
 * Start-Windows.bat) which opens a friendly UI in the browser. This CLI is here
 * for scripting and power users. It shares the same engine (lib/scraper.js).
 *
 * Usage:
 *   IG_SESSIONID="<cookie>" node scrape.js handles.txt
 *   node scrape.js --sessionid "<cookie>" natgeo bonappetitmag --max 30
 *
 * See README.md for how to grab your sessionid cookie.
 */

const fs = require('fs');
const path = require('path');
const { parseHandles, scrapeAll, toCSV } = require('./lib/scraper');

function parseArgs(argv) {
  const opts = {
    handleInputs: [],
    sessionid: process.env.IG_SESSIONID || '',
    max: 50,
    delay: 3000,
    out: path.join(process.cwd(), 'output'),
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sessionid') opts.sessionid = argv[++i];
    else if (a === '--max') opts.max = parseInt(argv[++i], 10);
    else if (a === '--delay') opts.delay = parseInt(argv[++i], 10);
    else if (a === '--out') opts.out = path.resolve(argv[++i]);
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--')) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else if (fs.existsSync(a) && fs.statSync(a).isFile()) {
      opts.handleInputs.push(fs.readFileSync(a, 'utf8'));
    } else {
      opts.handleInputs.push(a);
    }
  }
  opts.handles = parseHandles(opts.handleInputs.join('\n'));
  return opts;
}

function writeOutputs(outDir, allPosts, perHandle) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'captions.json'), JSON.stringify(allPosts, null, 2));
  fs.writeFileSync(path.join(outDir, 'captions.csv'), toCSV(allPosts));
  const byHandleDir = path.join(outDir, 'by-handle');
  fs.mkdirSync(byHandleDir, { recursive: true });
  for (const [handle, result] of Object.entries(perHandle)) {
    fs.writeFileSync(path.join(byHandleDir, `${handle}.json`), JSON.stringify(result, null, 2));
  }
}

const HELP = `
ig-caption-scraper (CLI) — pull captions for public Instagram handles.
Tip: for a no-typing experience, double-click Start-Mac.command / Start-Windows.bat instead.

USAGE
  IG_SESSIONID="<cookie>" node scrape.js <handles.txt | handle...> [options]

OPTIONS
  --sessionid <cookie>   Your IG sessionid cookie (or set IG_SESSIONID env var)
  --max <n>              Max posts per handle (default 50)
  --delay <ms>           Base delay between requests (default 3000; jittered)
  --out <dir>            Output directory (default ./output)
  -h, --help             Show this help

OUTPUT
  <out>/captions.json, <out>/captions.csv, <out>/by-handle/<handle>.json
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || opts.handles.length === 0) {
    console.log(HELP);
    process.exit(opts.handles.length === 0 && !opts.help ? 1 : 0);
  }
  if (!opts.sessionid) {
    console.warn(
      '⚠️  No sessionid set — Instagram will likely block or return empty data.\n' +
        '   Set IG_SESSIONID or pass --sessionid. See README.md.\n'
    );
  }

  console.log(`Scraping ${opts.handles.length} handle(s), up to ${opts.max} posts each.\n`);

  const { allPosts, perHandle } = await scrapeAll(
    opts.handles,
    { sessionid: opts.sessionid, max: opts.max, delay: opts.delay },
    (ev) => {
      if (ev.type === 'handle-done') {
        const note = ev.note ? ` (${ev.note})` : '';
        console.log(`[${ev.index + 1}/${ev.total}] @${ev.handle} — ${ev.count} posts${note}`);
      } else if (ev.type === 'handle-error') {
        console.log(`[${ev.index + 1}/${ev.total}] @${ev.handle} — FAILED: ${ev.error}`);
      }
    }
  );

  writeOutputs(opts.out, allPosts, perHandle);
  console.log(`\nDone. ${allPosts.length} captions total. Written to: ${opts.out}`);
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
