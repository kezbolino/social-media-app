'use strict';

/**
 * Core Instagram caption scraping logic, shared by the CLI (scrape.js) and the
 * local web UI (server.js). Zero dependencies — Node 18+ (global fetch).
 */

const APP_ID = '936619743392459'; // Instagram web app id (public, sent by the site itself)
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jitter(base) {
  return Math.round(base * (0.6 + Math.random() * 0.8)); // ±40%
}

function normaliseHandle(raw) {
  let h = String(raw || '').trim();
  if (!h) return '';
  const urlMatch = h.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, '').replace(/\/+$/, '');
  return h.toLowerCase();
}

function parseHandles(text) {
  const list = String(text || '')
    .split(/[\r\n,]+/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(normaliseHandle)
    .filter(Boolean);
  return [...new Set(list)];
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
      const backoff = res.status === 429 ? wait * 2 : wait;
      await sleep(backoff);
      wait *= 2;
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}

function fromTimelineNode(handle, node) {
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
  return {
    handle,
    shortcode: node.shortcode || '',
    url: node.shortcode ? `https://www.instagram.com/p/${node.shortcode}/` : '',
    timestamp: node.taken_at_timestamp
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : '',
    is_video: !!node.is_video,
    likes:
      node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? null,
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
    timestamp: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : '',
    is_video: item.media_type === 2,
    likes: item.like_count ?? null,
    comments: item.comment_count ?? null,
    caption: item.caption?.text ?? '',
  };
}

/**
 * Scrape a single handle. opts: { sessionid, max, delay }.
 * Returns { meta, posts, note? }.
 */
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

  let maxId = null;
  let more = posts.length < opts.max && (meta.total_posts ?? 0) > posts.length;

  while (more && posts.length < opts.max) {
    await sleep(jitter(opts.delay));
    const feedUrl =
      `https://www.instagram.com/api/v1/feed/user/${meta.user_id}/` +
      `?count=33${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ''}`;
    let feed;
    try {
      feed = await getJSON(feedUrl, { sessionid: opts.sessionid, referer });
    } catch {
      break; // pagination hiccup: keep what we have
    }
    const items = feed?.items ?? [];
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

/**
 * Scrape many handles with progress callbacks.
 * onEvent({ type, ... }) is called with:
 *   { type:'start', total }
 *   { type:'handle-start', handle, index, total }
 *   { type:'handle-done', handle, index, total, count, note }
 *   { type:'handle-error', handle, index, total, error }
 *   { type:'done', ok, failed, totalPosts }
 * Returns { allPosts, perHandle }.
 */
async function scrapeAll(handles, opts, onEvent = () => {}) {
  const allPosts = [];
  const perHandle = {};
  let ok = 0;
  let failed = 0;

  onEvent({ type: 'start', total: handles.length });

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    onEvent({ type: 'handle-start', handle, index: i, total: handles.length });
    try {
      const result = await scrapeHandle(handle, opts);
      perHandle[handle] = result;
      allPosts.push(...result.posts);
      ok++;
      onEvent({
        type: 'handle-done',
        handle,
        index: i,
        total: handles.length,
        count: result.posts.length,
        note: result.note || null,
      });
    } catch (err) {
      failed++;
      perHandle[handle] = { meta: { handle }, posts: [], error: err.message };
      onEvent({
        type: 'handle-error',
        handle,
        index: i,
        total: handles.length,
        error: err.message,
      });
    }
    if (i < handles.length - 1) await sleep(jitter(opts.delay));
  }

  onEvent({ type: 'done', ok, failed, totalPosts: allPosts.length });
  return { allPosts, perHandle };
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(posts) {
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
  for (const p of posts) lines.push(cols.map((c) => csvCell(p[c])).join(','));
  return lines.join('\n');
}

module.exports = {
  normaliseHandle,
  parseHandles,
  scrapeHandle,
  scrapeAll,
  toCSV,
  csvCell,
};
