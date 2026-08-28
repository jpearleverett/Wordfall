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
 * KNOWN LIMIT — diagonal steps are unreliable, so a run may stall short of a
 * win. To move a pointer from a cell to its diagonal neighbour you must cross
 * the corner they share, and the pan's hit-test is a plain stride box, so the
 * drag can pick up one of the two orthogonal cells in between: SUN traces as
 * SURN and nothing resolves. The search below prefers straight paths and
 * retries alternatives, and diagonals often do land — measured over five
 * level-1 runs: 2 outright wins (2/2, PERFECT CLEAR), 2 partial (1/2), 1
 * stalled (0/2). A stall means THIS HARNESS could not trace the word, not
 * that the game is broken; a real touch stream samples differently from
 * synthetic pointer moves. The failure line prints what actually got lit, so
 * a corner-clipped diagonal is visible as the intended word with an extra
 * letter wedged into it.
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
 * Read the rendered board from the cells' accessibility labels.
 *
 * LetterCell publishes `Letter S, row 3 column 1[, selected, position 2]`
 * (buildA11yLabel, 1-INDEXED for screen readers), which react-native-web
 * emits as aria-label. That gives exact coordinates and live selection state,
 * so none of this has to be inferred from pixel clustering. The element's
 * rect is still used for aiming; LetterCell is pointerEvents="none", so a
 * pointer at those coordinates falls through to the grid's gesture handler,
 * which is what we want.
 */
const readCells = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[aria-label]')) {
      const label = el.getAttribute('aria-label') || '';
      const m = label.match(/^Letter ([A-Z]), row (\d+) column (\d+)(.*)$/);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      out.push({
        letter: m[1],
        row: Number(m[2]) - 1,
        col: Number(m[3]) - 1,
        selected: /\bselected\b/.test(m[4]),
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        size: r.width,
      });
    }
    return out;
  });

/** What the player currently has lit, in trace order. */
const readSelection = () =>
  page.evaluate(() => {
    const picks = [];
    for (const el of document.querySelectorAll('[aria-label]')) {
      const m = (el.getAttribute('aria-label') || '').match(
        /^Letter ([A-Z]), row (\d+) column (\d+).*?\bposition (\d+)/,
      );
      if (m) picks.push({ letter: m[1], pos: Number(m[4]) });
    }
    return picks.sort((a, b) => a.pos - b.pos).map((p) => p.letter).join('');
  });

/** The find-list chips. */
const readWords = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div,span')) {
      const txt = (el.textContent || '').trim();
      if (!/^[A-Z]{3,8}$/.test(txt)) continue;
      // True leaves only. A chip's parent View concatenates its siblings'
      // text, so "SUN" + "ORC" reads back as the nonexistent word "SUNORC".
      if (el.children.length) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 60 || r.height < 10) continue;
      if (!out.some((o) => o.word === txt)) out.push({ word: txt });
    }
    return out.map((o) => o.word);
  });

/** Place cells straight into a lattice using their reported row/col. */
function toGrid(cells) {
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const c of cells) grid[c.row][c.col] = c;
  return grid;
}

const render = (g) => g.map((r) => r.map((c) => (c ? ` ${c.letter} ` : ' . ')).join('')).join('\n');

const strideOf = (grid) => {
  const any = grid.flat().find(Boolean);
  return any ? any.size : 90;
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
      // Reading back what got lit says WHY: a corner-clipped diagonal shows
      // up as the intended word with an extra letter wedged into it.
      console.log(`  ...${w} did not resolve — traced "${await readSelection()}"`);
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
