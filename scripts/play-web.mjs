/**
 * Play a real level of Wordfall in a headless browser.
 *
 * `scripts/build-web.sh` gets the game running in a browser; this drives it.
 * It boots the served web build, clears the consent gate and onboarding,
 * opens level 1, then reads the board off the DOM, solves it, and traces the
 * words with synthetic pointer input — the same path a finger takes. Useful
 * as a smoke test that the whole stack (bundle, navigation, gestures, the
 * reducer, gravity, the victory ceremony) still works end to end, which no
 * unit test covers.
 *
 * For the engine WITHOUT the UI, use the much faster
 * `PLAY_VERBOSE=1 npx jest playthrough` instead.
 *
 * KNOWN LIMIT — diagonal steps are unreliable. To move a pointer from a cell
 * to its diagonal neighbour you must cross the corner they share, and the
 * pan's hit-test is a plain stride box, so the drag often picks up one of the
 * two orthogonal cells in between: SUN comes out as SURN and no word
 * resolves. The search below prefers straight paths and retries alternatives,
 * which clears most level-1 boards outright, but a word with no straight
 * occurrence can stall the run. That is a limitation of driving the gesture
 * synthetically, NOT a reproduction of what a finger does — a real touch
 * stream samples differently. Treat a stall as "this harness could not trace
 * it", not as a game bug.
 *
 * Usage:
 *   bash scripts/build-web.sh 8080          # in one shell (leaves it serving)
 *   node scripts/play-web.mjs               # in another
 *
 * Requires Playwright with a Chromium build available (`npx playwright install
 * chromium`, or a global install — this resolves either).
 *
 * Env:
 *   WORDFALL_URL   default http://localhost:8080
 *   SHOT_DIR       screenshots are written here (default ./web-play-shots)
 *   HEADED=1       watch it play
 */
import { createRequire } from 'module';
import * as fs from 'fs';

const require = createRequire(import.meta.url);

/** Playwright may be a project dep or a global install; accept either. */
function loadPlaywright() {
  const candidates = [
    'playwright',
    'playwright-core',
    '/opt/node22/lib/node_modules/playwright/index.js',
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    'Playwright not found. Install it with `npm i -D playwright && npx playwright install chromium`.',
  );
}

const { chromium } = loadPlaywright();
const URL_BASE = process.env.WORDFALL_URL || 'http://localhost:8080';
const SHOT_DIR = process.env.SHOT_DIR || 'web-play-shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300));
});

await page.goto(`${URL_BASE}/`, { waitUntil: 'load', timeout: 60_000 });
await page.waitForTimeout(12_000); // bundle mount + font load

const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` });

async function tapText(label) {
  const el = page.getByText(label, { exact: false }).first();
  try {
    await el.waitFor({ state: 'visible', timeout: 6000 });
  } catch {
    return false;
  }
  const b = await el.boundingBox();
  if (!b) return false;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(2800);
  return true;
}

/**
 * Read the rendered board.
 *
 * Aims at the CELL box, not the glyph box: a letter's own ink box is as wide
 * as the letter ("I" is a sliver next to "W"), so its centre is not the cell
 * centre and a pointer aimed there lands in the neighbouring cell.
 */
const readCells = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div,span')) {
      const txt = (el.textContent || '').trim();
      if (!/^[A-Z]$/.test(txt)) continue;
      if (el.querySelector('div,span')) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 18) continue;
      let box = el;
      let br = r;
      for (let up = 0; up < 6 && box.parentElement; up++) {
        box = box.parentElement;
        const pr = box.getBoundingClientRect();
        if (pr.width >= 40 && pr.height >= 40) {
          br = pr;
          break;
        }
      }
      out.push({ letter: txt, x: br.x + br.width / 2, y: br.y + br.height / 2 });
    }
    return out;
  });

/** The find-list chips. */
const readWords = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div,span')) {
      const txt = (el.textContent || '').trim();
      if (!/^[A-Z]{3,8}$/.test(txt)) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 60 || r.height < 10) continue;
      if (!out.some((o) => o.word === txt)) out.push({ word: txt });
    }
    return out.map((o) => o.word);
  });

/** Cluster cell centres onto a row/col lattice. */
function toGrid(cells) {
  const band = (vals) =>
    [...vals]
      .sort((a, b) => a - b)
      .reduce((acc, v) => {
        const last = acc[acc.length - 1];
        if (!last || v - last[last.length - 1] > 20) acc.push([v]);
        else last.push(v);
        return acc;
      }, [])
      .map((g) => g.reduce((a, b) => a + b, 0) / g.length);
  const rows = band(cells.map((c) => c.y));
  const cols = band(cells.map((c) => c.x));
  const near = (v, arr) =>
    arr.reduce((best, t, i) => (Math.abs(t - v) < Math.abs(arr[best] - v) ? i : best), 0);
  const grid = rows.map(() => cols.map(() => null));
  for (const c of cells) grid[near(c.y, rows)][near(c.x, cols)] = c;
  return grid;
}

const render = (g) => g.map((r) => r.map((c) => (c ? ` ${c.letter} ` : ' . ')).join('')).join('\n');

const strideOf = (grid) => {
  const xs = grid[0]
    .map((_, i) => grid.map((r) => r[i]).find(Boolean))
    .filter(Boolean)
    .map((c) => c.x);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 90;
};

// 8-directional adjacency, matching src/engine/solver.ts DIRS.
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * All paths spelling `word`, fewest diagonal steps first.
 *
 * Diagonals matter for INPUT, not legality. To move a pointer from a cell to
 * its diagonal neighbour you must cross the corner the two share, and the
 * pan's hit-test is a plain stride box (hitTestGridGeometry), so the drag
 * tends to pick up one of the two orthogonal cells in between and the traced
 * word comes out wrong. Words are placed horizontally or vertically
 * (WordPlacement.direction), so a straight path usually survives gravity —
 * preferring it makes the drag unambiguous.
 */
function findPaths(grid, word) {
  const R = grid.length;
  const C = grid[0].length;
  const found = [];
  const seen = grid.map((r) => r.map(() => false));
  const go = (r, c, i, path, diag) => {
    if (found.length > 200) return;
    if (r < 0 || r >= R || c < 0 || c >= C || seen[r][c]) return;
    const cell = grid[r][c];
    if (!cell || cell.letter !== word[i]) return;
    seen[r][c] = true;
    path.push([r, c]);
    if (i === word.length - 1) found.push({ path: [...path], diag });
    else for (const [dr, dc] of DIRS) go(r + dr, c + dc, i + 1, path, diag + (dr && dc ? 1 : 0));
    seen[r][c] = false;
    path.pop();
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) go(r, c, 0, [], 0);
  return found.sort((a, b) => a.diag - b.diag);
}

/**
 * One continuous drag along the path, opened with a nudge inside the first
 * cell.
 *
 * Two web quirks shape this. Gesture.Tap never wins the Race against a Pan
 * with minDistance(0), so discrete clicks select nothing; and the Pan's
 * onBegin reports unusable coordinates under react-native-gesture-handler on
 * web, so the cell under the finger at press time is dropped and only
 * onUpdate hit-tests. Pressing near one edge of the first cell and moving to
 * its far edge produces an onUpdate while still inside that cell, which is
 * what selects it; the drag then continues cell to cell.
 */
async function trace(grid, path, stride) {
  const d = Math.max(8, Math.round(stride * 0.3));
  const pts = path.map(([r, c]) => grid[r][c]);
  await page.mouse.move(pts[0].x - d, pts[0].y);
  await page.mouse.down();
  await page.mouse.move(pts[0].x + d, pts[0].y, { steps: 4 });
  for (const p of pts.slice(1)) {
    await page.mouse.move(p.x, p.y, { steps: 6 });
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(2600); // 50ms auto-submit + the clear cascade
}

const adj = (a, b) => Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;

/**
 * A lifted trace stays lit on purpose (Grid.tsx's onFinalize note), so a
 * failed attempt leaves cells selected. Selecting a cell NOT adjacent to the
 * last resets the selection to just that cell, so parking on a far cell first
 * guarantees the next trace starts clean.
 */
async function park(grid, path, stride) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) continue;
      if (adj([r, c], path[0])) continue;
      if (path.some((q) => q[0] === r && q[1] === c)) continue;
      await trace(grid, [[r, c]], stride);
      return;
    }
  }
}

const status = () =>
  page.evaluate(() => {
    const m = (document.body.innerText || '').match(/(\d+)\s*\/\s*(\d+)\s*WORDS/);
    return m ? `${m[1]}/${m[2]}` : '?';
  });

// ── Drive it ────────────────────────────────────────────────────────────────
await tapText('I AGREE');
await tapText('Skip tutorial');
await page.waitForTimeout(1500);
await tapText('PLAY NOW');
await page.waitForTimeout(4000);
await shot('00-board');

let words = await readWords();
console.log('find-list:', words.join(', ') || '(none read)');

for (let move = 0; move < 12 && words.length; move++) {
  const grid = toGrid(await readCells());
  const before = await status();
  console.log(`\n--- move ${move + 1} | ${before} ---\n${render(grid)}`);

  let played = null;
  outer: for (const w of words) {
    for (const hit of findPaths(grid, w).slice(0, 4)) {
      const stride = strideOf(grid);
      await park(grid, hit.path, stride);
      console.log(`tracing ${w} (${hit.diag} diagonal)`);
      await trace(grid, hit.path, stride);
      if ((await status()) !== before) {
        played = w;
        break outer;
      }
      console.log(`  ...${w} did not resolve on that path`);
    }
  }

  if (!played) {
    console.log('no word resolved — stopping');
    break;
  }
  words = words.filter((w) => w !== played);
  console.log(`FOUND ${played} -> ${await status()}`);
  await shot(`0${move + 1}-after-${played}`);
}

await page.waitForTimeout(2500);
await shot('99-final');
const final = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n').trim());
console.log(`\n=== FINAL ===\n${final.slice(0, 600)}`);
console.log(`\nscreenshots: ${SHOT_DIR}/`);

const real = [...new Set(errors)].filter((e) => !e.includes('no supported source was found'));
console.log(`\nerrors: ${real.length}`);
real.slice(0, 8).forEach((e) => console.log('  ' + e));

await browser.close();
process.exit(final.includes('PERFECT') || /\b(\d+)\/\1\b/.test(final) ? 0 : 1);
