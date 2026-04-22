/**
 * Visual harness screenshot runner.
 *
 * 1. Builds `web-harness/harness.bundle.js` via esbuild.
 * 2. Starts a tiny static HTTP server over the web-harness/ directory.
 * 3. Launches puppeteer, visits each entry URL with ?shot=1 (hides
 *    sidebar), grabs a PNG into `.artifacts/screenshots/<id>.png`.
 * 4. Shuts everything down.
 *
 * Exit codes:
 *   0 — all screenshots captured
 *   1 — build, server, or capture failed
 *   2 — any captured page logged a console error (non-fatal: screenshots
 *       are still saved; CI can grep for the note)
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const harnessDir = resolve(root, 'web-harness');
const outDir = resolve(root, '.artifacts', 'screenshots');
const PORT = 4488;

// ── 1. Build ──────────────────────────────────────────────────────────
async function runBuild() {
  return new Promise((res, rej) => {
    const p = spawn(
      'node',
      [join(harnessDir, 'esbuild.config.mjs')],
      { stdio: 'inherit' },
    );
    p.on('exit', (code) =>
      code === 0 ? res() : rej(new Error(`esbuild exit ${code}`)),
    );
  });
}

// ── 2. Tiny static server ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.map': 'application/json',
};

function startServer() {
  return new Promise((res) => {
    const srv = createServer(async (req, _url) => {});
    // Manually wire the request handler so we can await file reads.
    srv.on('request', async (req, reply) => {
      const urlPath = new URL(
        req.url ?? '/',
        `http://localhost:${PORT}`,
      ).pathname;
      const safePath =
        urlPath === '/' ? '/index.html' : urlPath.replace(/\.\./g, '');
      const filePath = join(harnessDir, safePath);
      try {
        const body = await readFile(filePath);
        const mime = MIME[extname(filePath)] ?? 'application/octet-stream';
        reply.writeHead(200, { 'content-type': mime });
        reply.end(body);
      } catch {
        reply.writeHead(404);
        reply.end('not found');
      }
    });
    srv.listen(PORT, () => res(srv));
  });
}

// ── 3. Load the entries registry without going through bundler ────────
async function loadEntries() {
  // entries.tsx imports real components from src/, which would try to
  // resolve react-native → react-native-web in a Node context and fail.
  // We instead scrape the IDs out of the source file using a regex so
  // the script doesn't need to evaluate the module.
  const src = await readFile(join(harnessDir, 'entries.tsx'), 'utf8');
  const re = /id:\s*'([a-z0-9-]+)'[\s\S]+?label:\s*'([^']+)'/g;
  const entries = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    entries.push({ id: m[1], label: m[2] });
  }
  return entries;
}

// ── 4. Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('[shots] building harness bundle…');
  await runBuild();

  await mkdir(outDir, { recursive: true });

  console.log('[shots] starting local server on :%d', PORT);
  const server = await startServer();

  const entries = await loadEntries();
  console.log('[shots] %d entries to capture', entries.length);

  let hadConsoleErrors = false;
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    for (const entry of entries) {
      const page = await browser.newPage();
      // iPhone 14 Pro-ish viewport (matches harness-frame CSS).
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

      page.on('pageerror', (err) => {
        console.error(`[shots][${entry.id}] pageerror:`, err.message);
        hadConsoleErrors = true;
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.error(`[shots][${entry.id}] console error:`, msg.text());
          hadConsoleErrors = true;
        }
      });

      const url = `http://localhost:${PORT}/?entry=${entry.id}&shot=1`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      // Wait for harness-frame to actually render.
      await page
        .waitForSelector('[data-testid="harness-frame"]', { timeout: 5000 })
        .catch(() => {});
      // Let springs / withRepeat animations settle.
      await new Promise((r) => setTimeout(r, 600));

      const shotPath = join(outDir, `${entry.id}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`[shots]  ✓ ${entry.id}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(
    '[shots] done. output: %s',
    pathToFileURL(outDir).href,
  );
  process.exit(hadConsoleErrors ? 2 : 0);
}

main().catch((e) => {
  console.error('[shots] fatal:', e);
  process.exit(1);
});
