#!/usr/bin/env node
'use strict';

/**
 * Local web UI for ig-caption-scraper.
 *
 * Starts a tiny HTTP server on 127.0.0.1 (localhost only — nothing is exposed
 * to the network), serves the UI in public/, and does the Instagram fetching
 * server-side (so there's no browser CORS/login-wall problem). It opens your
 * default browser automatically.
 *
 * You never type commands here — the double-click launcher runs this for you.
 * Zero dependencies, Node 18+.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { parseHandles, scrapeAll, toCSV } = require('./lib/scraper');

const PUBLIC = path.join(__dirname, 'public');
const HOST = '127.0.0.1';
const START_PORT = 4785;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // Prevent path traversal
  const filePath = path.join(PUBLIC, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 5_000_000) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleScrape(req, res) {
  let cfg;
  try {
    cfg = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'bad request body' }));
    return;
  }

  const handles = parseHandles(cfg.handles || '');
  const opts = {
    sessionid: String(cfg.sessionid || '').trim(),
    max: Math.max(1, Math.min(200, parseInt(cfg.max, 10) || 50)),
    delay: Math.max(500, Math.min(30000, parseInt(cfg.delay, 10) || 3000)),
  };

  // NDJSON stream: one JSON object per line, flushed as we go.
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  const send = (obj) => res.write(JSON.stringify(obj) + '\n');

  if (handles.length === 0) {
    send({ type: 'fatal', error: 'No valid handles provided.' });
    res.end();
    return;
  }
  if (!opts.sessionid) {
    send({ type: 'fatal', error: 'No sessionid cookie provided.' });
    res.end();
    return;
  }

  try {
    const { allPosts, perHandle } = await scrapeAll(handles, opts, send);
    send({ type: 'result', posts: allPosts, csv: toCSV(allPosts), perHandle });
  } catch (err) {
    send({ type: 'fatal', error: err.message });
  }
  res.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/scrape') return handleScrape(req, res);
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, node: process.version }));
  }
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405).end('Method not allowed');
});

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function listen(port, attempt = 0) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 10) {
      listen(port + 1, attempt + 1); // try next port
    } else {
      console.error('Could not start server:', err.message);
      process.exit(1);
    }
  });
  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}/`;
    console.log('\n  Instagram Caption Grabber is running.');
    console.log(`  Opening ${url} in your browser…`);
    console.log('\n  Keep this window open while you use it.');
    console.log('  When you\'re done, just close this window.\n');
    openBrowser(url);
  });
}

listen(START_PORT);
