/**
 * Play real levels of Wordfall in a headless browser.
 *
 * `scripts/build-web.sh` gets the game running in a browser; this drives it.
 * It boots the served web build, clears the consent gate and onboarding, then
 * plays level after level: reads the board, solves it, and traces each word
 * with real touch input. Useful as a smoke test of the whole stack — bundle,
 * navigation, gestures, reducer, gravity, ceremonies, level chaining — which
 * no unit test covers.
 *
 * For the engine WITHOUT the UI, use the much faster
 * `PLAY_VERBOSE=1 npx jest playthrough` instead.
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
 *   LEVELS         how many levels to play in one run (default 3)
 *   SHOT_DIR       screenshots are written here (default ./web-play-shots)
 *   HEADED=1       watch it play
 *
 * TWO THINGS MAKE THIS WORK, both learned the hard way:
 *
 * 1. TOUCH, NOT MOUSE. Playwright's mouse API drives the pan handler
 *    erratically — an in-cell drag selects nothing, and a cell-to-cell drag
 *    picks up cells it never aimed at. CDP `Input.dispatchTouchEvent` produces
 *    a real touch stream and selects exactly one cell per move, diagonals
 *    included. Everything below goes through `touch()`.
 *
 * 2. `?e2e=1`. GameScreen publishes its zustand store as `window.__wfStore`
 *    when the query string contains "e2e" (GameScreen.tsx:1700-1710). That is
 *    used here for READING state only — level, status, selection, remaining
 *    words. Input still goes through the real gesture handler, so this is
 *    genuine play, not a scripted reducer.
 */
import { createRequire } from 'module';
import * as fs from 'fs';

const require = createRequire(import.meta.url);

/** Playwright may be a project dep or a global install; accept either. */
function loadPlaywright() {
  for (const id of ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try {
      return require(id);
    } catch {
      /* try the next */
    }
  }
  throw new Error('Playwright not found. `npm i -D playwright && npx playwright install chromium`.');
}

const { chromium } = loadPlaywright();
const URL_BASE = process.env.WORDFALL_URL || 'http://localhost:8080';
const SHOT_DIR = process.env.SHOT_DIR || 'web-play-shots';
const LEVELS = Number(process.env.LEVELS || 3);
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
const cdp = await ctx.newCDPSession(page);

const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e).slice(0, 300)}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text().slice(0, 300)}`);
});

const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` });

/** Real touch stream. `type` is touchStart | touchMove | touchEnd. */
const touch = (type, x = 0, y = 0) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 5, radiusY: 5, force: 1, id: 1 }],
  });

/** Tap a piece of UI chrome by its visible text (buttons, not grid cells). */
async function tapText(label, timeout = 6000) {
  const el = page.getByText(label, { exact: false }).first();
  try {
    await el.waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  const b = await el.boundingBox();
  if (!b) return false;
  await touch('touchStart', b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(60);
  await touch('touchEnd');
  await page.waitForTimeout(2200);
  return true;
}

/**
 * Read the board from the cells' accessibility labels.
 *
 * LetterCell publishes `Letter S, row 3 column 1[, selected, position 2]`
 * (buildA11yLabel, 1-INDEXED for screen readers), which react-native-web
 * emits as aria-label — exact coordinates, no pixel guessing. The element is
 * pointerEvents="none", so a touch at its centre falls through to the grid's
 * gesture handler, which is what we want.
 */
const readCells = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[aria-label]')) {
      const m = (el.getAttribute('aria-label') || '').match(/^Letter ([A-Z]), row (\d+) column (\d+)/);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) continue;
      out.push({
        letter: m[1],
        row: Number(m[2]) - 1,
        col: Number(m[3]) - 1,
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
      });
    }
    return out;
  });

/** Live game state, straight from the store `?e2e=1` exposes. */
const gameState = () =>
  page.evaluate(() => {
    const s = window.__wfStore?.getState?.();
    if (!s) return null;
    return {
      level: s.level,
      mode: s.mode,
      status: s.status,
      score: s.score,
      selected: (s.selectedCells || []).map((c) => `${c.row},${c.col}`),
      remaining: (s.board?.words || []).filter((w) => !w.found).map((w) => w.word),
      found: (s.board?.words || []).filter((w) => w.found).map((w) => w.word),
    };
  });

function toGrid(cells) {
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const c of cells) grid[c.row][c.col] = c;
  return grid;
}

const render = (g) => g.map((r) => r.map((c) => (c ? ` ${c.letter} ` : ' . ')).join('')).join('\n');

// 8-directional adjacency, matching src/engine/solver.ts DIRS.
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** All paths spelling `word`, fewest diagonal steps first. */
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
 * Trace a word: one touch stream, one move per cell.
 *
 * The opening `touchMove` a few pixels inside the first cell is what gets that
 * cell selected — the pan's onBegin does not reliably hit-test on web, so only
 * onUpdate selects.
 */
async function trace(grid, path) {
  const pts = path.map(([r, c]) => grid[r][c]);
  await touch('touchStart', pts[0].x, pts[0].y);
  await page.waitForTimeout(90);
  await touch('touchMove', pts[0].x + 6, pts[0].y);
  await page.waitForTimeout(140);
  for (const p of pts.slice(1)) {
    await touch('touchMove', p.x, p.y);
    await page.waitForTimeout(150);
  }
  await touch('touchEnd');
  await page.waitForTimeout(1800); // 50ms auto-submit + the clear cascade
}

/**
 * A lifted trace stays lit on purpose (Grid.tsx's onFinalize note), so a
 * failed attempt leaves cells selected. Selecting a cell NOT adjacent to the
 * last resets the selection to just that cell, so parking on a far cell first
 * guarantees the next trace starts clean.
 */
async function park(grid, path) {
  const adj = (a, b) => Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c] || adj([r, c], path[0])) continue;
      if (path.some((q) => q[0] === r && q[1] === c)) continue;
      await trace(grid, [[r, c]]);
      return;
    }
  }
}

/** Play the level currently on screen. Returns a per-level report. */
async function playLevel(tag) {
  const start = await gameState();
  if (!start) return { tag, ok: false, why: 'store not exposed — is ?e2e=1 on the URL?' };

  const report = { tag, level: start.level, mode: start.mode, words: [...start.remaining], moves: [], stalls: [] };
  console.log(`\n=== level ${start.level} (${start.mode}) — find: ${start.remaining.join(', ')} ===`);

  for (let move = 0; move < 16; move++) {
    const s = await gameState();
    if (!s || s.remaining.length === 0) break;
    if (s.status !== 'playing') {
      report.stalls.push(`status became ${s.status} with ${s.remaining.length} left`);
      break;
    }

    const grid = toGrid(await readCells());
    console.log(`--- ${s.found.length}/${s.found.length + s.remaining.length} found ---\n${render(grid)}`);

    let played = null;
    outer: for (const w of s.remaining) {
      for (const hit of findPaths(grid, w).slice(0, 4)) {
        await park(grid, hit.path);
        await trace(grid, hit.path);
        const after = await gameState();
        if (after && after.found.includes(w)) {
          played = w;
          console.log(`  traced ${w} (${hit.diag} diagonal) -> found`);
          break outer;
        }
        const lit = (after?.selected || []).length;
        console.log(`  traced ${w} (${hit.diag} diagonal) -> no resolve (${lit} cells lit)`);
      }
    }

    if (!played) {
      const s2 = await gameState();
      report.stalls.push(`could not trace any of: ${s2?.remaining.join(', ')}`);
      break;
    }
    report.moves.push(played);
  }

  const end = await gameState();
  report.finalStatus = end?.status;
  report.remaining = end?.remaining ?? [];
  report.score = end?.score;
  report.won = (end?.remaining ?? []).length === 0;
  console.log(`  => ${report.won ? 'WON' : 'incomplete'} | score ${report.score} | left: ${report.remaining.join(', ') || 'none'}`);
  await shot(`${tag}-end`);
  return report;
}

/** Tap the first element whose aria-label matches, if any is on screen. */
async function tapAriaPrefix(re) {
  const els = page.locator('[aria-label]');
  const n = Math.min(await els.count(), 200);
  for (let i = 0; i < n; i++) {
    const el = els.nth(i);
    const label = await el.getAttribute('aria-label').catch(() => null);
    if (!label || !re.test(label)) continue;
    const b = await el.boundingBox().catch(() => null);
    if (!b) continue;
    await touch('touchStart', b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(60);
    await touch('touchEnd');
    await page.waitForTimeout(1400);
    return label;
  }
  return null;
}

/**
 * Dismiss whatever celebration, reward sheet or offer is covering the screen.
 *
 * The home screen between levels is a gauntlet: the victory ceremony, the
 * login calendar (which opens by itself — a new player lands on day 6 by
 * design, see loginCalendarOffsetDays), daily-quest and streak popups, and
 * contextual offers. Text buttons alone are not enough; several of these
 * only offer an X, so close buttons are matched by aria-label too.
 */
async function clearOverlays() {
  const LABELS = ['AMAZING', 'CONTINUE', 'NEXT', 'CLAIM', 'COLLECT', 'GOT IT', 'NICE', 'AWESOME', 'NO THANKS', 'MAYBE LATER', 'SKIP'];
  for (let i = 0; i < 14; i++) {
    if (await tapAriaPrefix(/^(Close|Dismiss)/i)) continue;
    let hit = false;
    for (const l of LABELS) {
      if (await tapText(l, 900)) {
        hit = true;
        break;
      }
    }
    if (!hit) return;
  }
}

// ── Drive it ────────────────────────────────────────────────────────────────
await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60_000 });
await page.waitForTimeout(12_000); // bundle mount + font load

await tapText('I AGREE');
await tapText('Skip tutorial');
await page.waitForTimeout(1500);
await tapText('PLAY NOW');
await page.waitForTimeout(4000);
await shot('00-first-board');

const reports = [];
for (let n = 0; n < LEVELS; n++) {
  const st = await gameState();
  if (!st) {
    console.log('\nno game screen — stopping');
    break;
  }
  reports.push(await playLevel(`L${st.level}`));

  if (n < LEVELS - 1) {
    // Reload rather than fight the victory overlay for its Next button, then
    // re-enter from the home screen's play card.
    //
    // Re-entry RETRIES, because the home screen between levels is a gauntlet
    // of queued ceremonies that appear on their own timers — the win-streak
    // "Hat Trick" after three wins, the login calendar, daily-quest and
    // streak popups. Clearing once and tapping immediately loses the race
    // against whichever one is still arriving, which reads as "the game
    // stopped letting me play" when the game is fine.
    await page.waitForTimeout(2500);
    await clearOverlays();
    await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(11_000);

    let entered = false;
    for (let attempt = 0; attempt < 4 && !entered; attempt++) {
      await clearOverlays();
      if (!(await tapText('PLAY NOW', 4000))) await tapText('Play Level', 3000);
      await page.waitForTimeout(4000);
      entered = (await gameState()) !== null;
      if (!entered) console.log(`  (re-entry attempt ${attempt + 1} blocked by an overlay, retrying)`);
    }
    if (!entered) {
      await shot(`stuck-after-L${reports[reports.length - 1]?.level}`);
      console.log('\ncould not re-enter a level — stopping');
      break;
    }
  }
}

await shot('99-final');
console.log('\n════════ SUMMARY ════════');
for (const r of reports) {
  console.log(`level ${r.level} (${r.mode}): ${r.won ? 'WON' : 'INCOMPLETE'} score=${r.score} moves=[${r.moves.join(',')}]`);
  r.stalls.forEach((s) => console.log(`    stall: ${s}`));
}
const won = reports.filter((r) => r.won).length;
console.log(`\nwon ${won}/${reports.length} levels`);

const real = [...new Set(errors)].filter((e) => !e.includes('no supported source was found'));
console.log(`\nerrors: ${real.length}`);
real.slice(0, 12).forEach((e) => console.log('  ' + e));
console.log(`screenshots: ${SHOT_DIR}/`);

await browser.close();
process.exit(won === reports.length && reports.length > 0 ? 0 : 1);
