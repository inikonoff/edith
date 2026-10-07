#!/usr/bin/env node
// Zero-dependency static server for running Edith locally without any dev
// tooling in the loop — this is what start.command/start.cmd/start.sh invoke.
// Deliberately uses only Node's built-ins so a downloaded, unzipped copy of
// this repo can serve itself with nothing but Node installed.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'packages', 'app', 'dist');
const INDEX_HTML = join(DIST, 'index.html');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

// This repo ships a pre-built dist/ precisely so a downloaded zip works with
// no network at all. If it's missing (e.g. you're running from a fresh git
// checkout that never had one committed), try to build one — that does need
// a network connection the first time, for pnpm install.
function ensureBuilt() {
  if (existsSync(INDEX_HTML)) return;
  console.log(
    'No build found in packages/app/dist — building Edith (needs internet this one time)...\n',
  );
  if (!run('pnpm', ['install']) || !run('pnpm', ['build'])) {
    console.error(
      '\nBuild failed. If you are offline, this repo should have shipped a ready-made build —',
    );
    console.error('something is missing. Otherwise check the error above.');
    process.exitCode = 1;
    process.exit(1);
  }
  console.log('');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// Resolves a request path to a file under DIST, falling back to index.html
// for both directory requests and anything outside DIST (SPA routing, and a
// cheap guard against '..' traversal — this only ever serves localhost).
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0] ?? '/');
  const candidate = resolve(DIST, '.' + decoded);
  if (candidate === DIST || candidate.startsWith(DIST + sep)) {
    if (existsSync(candidate) && statIsFile(candidate)) {
      return candidate;
    }
  }
  return INDEX_HTML;
}

function statIsFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') spawnSync('open', [url], { stdio: 'ignore' });
    else if (platform === 'win32')
      spawnSync('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', shell: true });
    else spawnSync('xdg-open', [url], { stdio: 'ignore' });
  } catch {
    // Best-effort only — the printed URL below is the real fallback.
  }
}

ensureBuilt();

const server = createServer((req, res) => {
  try {
    const filePath = resolveFile(req.url ?? '/');
    const data = readFileSync(filePath);
    const type = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `Edith's local server hit an error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// A fixed port (rather than letting the OS assign a random one) means
// relaunching Edith reuses the same http://localhost:PORT/ origin — and
// therefore the same IndexedDB storage (My Pages, autosave) and the same
// service worker cache — instead of starting over empty on every launch.
// Falls back to an OS-assigned port only if that one's genuinely taken
// (e.g. by another running copy of Edith).
const PREFERRED_PORT = 47890;

function onListening() {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : PREFERRED_PORT;
  const url = `http://localhost:${port}/`;
  console.log(`Edith is running at ${url}`);
  console.log('Keep this window open while you use Edith. Press Ctrl+C to stop.\n');
  openBrowser(url);
}

server.once('error', (error) => {
  if (error.code !== 'EADDRINUSE') throw error;
  console.log(
    `Port ${PREFERRED_PORT} is busy (maybe Edith is already running?) — picking another one.`,
  );
  server.listen(0, '127.0.0.1');
});
server.once('listening', onListening);
server.listen(PREFERRED_PORT, '127.0.0.1');
