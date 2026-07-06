#!/usr/bin/env node
/**
 * ig-caption-scraper
 *
 * Pulls captions (and basic post metadata) for a list of public Instagram
 * handles and writes them to JSON + CSV.
 *
 * Runs on YOUR machine, where the internet is open. It reuses your logged-in
 * Instagram session cookie so Instagram serves it the same data your browser
 * would — this is the reliable way past the login wall. No password is ever
 * sent or stored; only the sessionid cookie you paste in is used, and only to
 * talk to instagram.com.
 *
 * Zero dependencies — needs Node 18+ (uses built-in fetch). You have v22, good.
 *
 * Usage:
 *   IG_SESSIONID="<your sessionid cookie>" node scrape.js handles.txt
 *   node scrape.js --sessionid "<cookie>" natgeo bonappetitmag
 *   node scrape.js handles.txt --max 60 --delay 4000 --out ./out
 *
 * See README.md for how to grab your sessionid cookie (30 seconds).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP_ID = '936619743392459'; // Instagram web app id (public, sent by the site itself)
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    handles: [],
    sessionid: process.env.IG_SESSIONID || '',
    max: 50,
    delay: 3000,
    out: path.join(process.cwd(), 'output'),
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
    } else {
      // Either a file of handles or a bare handle
      if (fs.existsSync(a) && fs.statSync(a).isFile()) {
        opts.handles.push(...readHandlesFile(a));
      } else {
        opts.handles.push(a);
      }
    }
  }
  // De-dupe + normalise (strip @, urls, whitespace)
  opts.handles = [...new Set(opts.handles.map(normaliseHandle).filter(Boolean))];
  return opts;
}

function readHandlesFile(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function normaliseHandle(raw) {
  let h = String(raw).trim();
  if (!h) return '';
  // Accept full profile URLs too
  const urlMatch = h.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, '').replace(/\/+$/, '');
  return h.toLowerCase();
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jitter(base) {
  // +/- 40% so requests don't look metronomic
  return Math.round(base * (0.6 + Math.random() * 0.8));
}

function headers(sessionid, referer) {
  const h = {
    'User-Agent': UA,
    'x-ig-app-id': APP_ID,
    'x-requested-with': 'XMLHttpRequest',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: referer || 'https://www.instagram.com/',
  };
  if (sessionid) h.Cookie = `sessionid=${sessionid}`;
  return h;
}

async function getJSON(url, { sessionid, referer, retries = 4 } = {}) {
  let attempt = 0;
  let wait = 2000;
  while (true) {
    attempt++;
    let res;
    try {
      res = await fetch(url, { headers: headers(sessionid, referer) });
    } catch (err) {
      if (attempt > retries) throw new Error(`network error: ${err.message}`);
      await sleep(wait);
      wait *= 2;
      continue;
    }
    if (res.status === 200) {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('got a non-JSON response (login wall / checkpoint?).');
      }
    }
    if (res.status === 404) throw new Error('not found (bad handle or removed).');
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `HTTP ${res.status} — session cookie missing/expired, or this account is private.`
      );
    }
    if ((res.status === 429 || res.status >= 500) && attempt <= retries) {
      // Rate limited or server hiccup: back off hard.
      const backoff = res.status === 429 ? wait * 2 : wait;
      console.warn(`   … HTTP ${res.status}, backing off ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
      wait *= 2;
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Normalising posts from the two endpoint shapes into one record
// ---------------------------------------------------------------------------

function fromTimelineNode(handle, node) {
  const caption =
    node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
  return {
    handle,
    shortcode: node.shortcode || '',
    url: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
    timestamp: node.taken_at_timestamp
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : '',
    is_video: !!node.is_video,
    likes:
      node.edge_liked_by?.count ??
      node.edge_media_preview_like?.count ??
      null,
    comments: node.edge_media_to_comment?.count ?? null,
    caption,
  };
}

function fromFeedItem(handle, item) {
  const code = item.code || '';
  return {
    handle,
    shortcode: code,
    url: code ? `https://www.instagram.com/p/${code}/` : '',
    timestamp: item.taken_at
      ? new Date(item.taken_at * 1000).toISOString()
      : '',
    is_video: item.media_type === 2,
    likes: item.like_count ?? null,
    comments: item.comment_count ?? null,
    caption: item.caption?.text ?? '',
  };
}

// ---------------------------------------------------------------------------
// Per-handle scrape
// ---------------------------------------------------------------------------

async function scrapeHandle(handle, opts) {
  const referer = `https://www.instagram.com/${handle}/`;
  const profileUrl =
    `https://www.instagram.com/api/v1/users/web_profile_info/` +
    `?username=${encodeURIComponent(handle)}`;

  const data = await getJSON(profileUrl, { sessionid: opts.sessionid, referer });
  const user = data?.data?.user;
  if (!user) throw new Error('no user object in response (rate limited or changed API).');

  const meta = {
    handle,
    full_name: user.full_name || '',
    user_id: user.id,
    is_private: !!user.is_private,
    followers: user.edge_followed_by?.count ?? null,
    total_posts: user.edge_owner_to_timeline_media?.count ?? null,
  };

  if (user.is_private) {
    return { meta, posts: [], note: 'private account — no posts visible' };
  }

  const posts = [];
  const timeline = user.edge_owner_to_timeline_media;
  for (const edge of timeline?.edges ?? []) {
    posts.push(fromTimelineNode(handle, edge.node));
  }

  // Paginate the rest via the user-feed endpoint (more stable than GraphQL hashes)
  let maxId =
    timeline?.page_info?.has_next_page ? timeline.page_info.end_cursor : null;
  let more = !!maxId;
  // The timeline cursor and the feed max_id are different systems; switch to the
  // feed endpoint which paginates cleanly with next_max_id.
  maxId = null;
  more = posts.length < opts.max && (meta.total_posts ?? 0) > posts.length;

  while (more && posts.length < opts.max) {
    await sleep(jitter(opts.delay));
    const feedUrl =
      `https://www.instagram.com/api/v1/feed/user/${meta.user_id}/` +
      `?count=33${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ''}`;
    let feed;
    try {
      feed = await getJSON(feedUrl, { sessionid: opts.sessionid, referer });
    } catch (err) {
      console.warn(`   … pagination stopped: ${err.message}`);
      break;
    }
    const items = feed?.items ?? [];
    // First feed page overlaps the timeline; de-dupe by shortcode.
    const seen = new Set(posts.map((p) => p.shortcode));
    for (const it of items) {
      const rec = fromFeedItem(handle, it);
      if (rec.shortcode && !seen.has(rec.shortcode)) {
        posts.push(rec);
        seen.add(rec.shortcode);
      }
    }
    more = !!feed?.more_available && items.length > 0;
    maxId = feed?.next_max_id || null;
    if (!maxId) more = false;
  }

  return { meta, posts: posts.slice(0, opts.max) };
}

// ---------------------------------------------------------------------------
// Output writers
// ---------------------------------------------------------------------------

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeOutputs(outDir, allPosts, perHandle) {
  fs.mkdirSync(outDir, { recursive: true });

  // Combined JSON
  fs.writeFileSync(
    path.join(outDir, 'captions.json'),
    JSON.stringify(allPosts, null, 2)
  );

  // Combined CSV
  const cols = [
    'handle',
    'shortcode',
    'url',
    'timestamp',
    'is_video',
    'likes',
    'comments',
    'caption',
  ];
  const lines = [cols.join(',')];
  for (const p of allPosts) lines.push(cols.map((c) => csvCell(p[c])).join(','));
  fs.writeFileSync(path.join(outDir, 'captions.csv'), lines.join('\n'));

  // Per-handle JSON (full, incl. meta)
  const byHandleDir = path.join(outDir, 'by-handle');
  fs.mkdirSync(byHandleDir, { recursive: true });
  for (const [handle, result] of Object.entries(perHandle)) {
    fs.writeFileSync(
      path.join(byHandleDir, `${handle}.json`),
      JSON.stringify(result, null, 2)
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const HELP = `
ig-caption-scraper — pull captions for a list of public Instagram handles.

USAGE
  IG_SESSIONID="<cookie>" node scrape.js <handles.txt | handle...> [options]

OPTIONS
  --sessionid <cookie>   Your IG sessionid cookie (or set IG_SESSIONID env var)
  --max <n>              Max posts per handle (default 50)
  --delay <ms>           Base delay between requests (default 3000; jittered)
  --out <dir>            Output directory (default ./output)
  -h, --help             Show this help

EXAMPLES
  IG_SESSIONID="abc123" node scrape.js handles.txt
  node scrape.js --sessionid "abc123" natgeo bonappetitmag --max 30
  node scrape.js handles.txt --out ./captions --delay 5000

OUTPUT
  <out>/captions.json          all posts, combined
  <out>/captions.csv           all posts, combined (spreadsheet-friendly)
  <out>/by-handle/<handle>.json  per-account, with profile metadata

See README.md for how to get your sessionid cookie.
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help || opts.handles.length === 0) {
    console.log(HELP);
    process.exit(opts.handles.length === 0 ? 1 : 0);
  }

  if (!opts.sessionid) {
    console.warn(
      '⚠️  No sessionid set. Instagram will likely block or return empty data.\n' +
        '   Set IG_SESSIONID or pass --sessionid. See README.md.\n'
    );
  }

  console.log(`Scraping ${opts.handles.length} handle(s), up to ${opts.max} posts each.\n`);

  const allPosts = [];
  const perHandle = {};
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < opts.handles.length; i++) {
    const handle = opts.handles[i];
    process.stdout.write(`[${i + 1}/${opts.handles.length}] @${handle} … `);
    try {
      const result = await scrapeHandle(handle, opts);
      perHandle[handle] = result;
      allPosts.push(...result.posts);
      ok++;
      const note = result.note ? ` (${result.note})` : '';
      console.log(`${result.posts.length} posts${note}`);
    } catch (err) {
      failed++;
      perHandle[handle] = { meta: { handle }, posts: [], error: err.message };
      console.log(`FAILED — ${err.message}`);
    }
    // Be polite between accounts
    if (i < opts.handles.length - 1) await sleep(jitter(opts.delay));
  }

  writeOutputs(opts.out, allPosts, perHandle);

  console.log(
    `\nDone. ${ok} ok, ${failed} failed, ${allPosts.length} captions total.`
  );
  console.log(`Written to: ${opts.out}`);
  console.log(`  • captions.csv / captions.json`);
  console.log(`  • by-handle/<handle>.json`);
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
