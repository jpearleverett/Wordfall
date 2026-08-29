/**
 * Play a long session of Wordfall in a headless browser — levels plus the
 * metagame around them — and write a structured log of everything that
 * happened.
 *
 * Where scripts/play-web.mjs proves a level can be won, this plays a SESSION:
 * it chains levels through the victory screen's own "Next level" button
 * instead of reloading, and every few levels it stops to do what a player
 * would do — claim the free-reward timers, spin the Mystery Wheel, play the
 * daily challenge, look at the live event, claim season-pass tiers, open the
 * shop, and walk the tab bar. Everything it sees is recorded, so the output is
 * evidence rather than an impression.
 *
 * Usage:
 *   bash scripts/build-web.sh 8080        # in one shell
 *   LEVELS=100 node scripts/play-session.mjs
 *
 * Env:
 *   WORDFALL_URL  default http://localhost:8080
 *   LEVELS        how many levels to play (default 20)
 *   ACTIVITY_EVERY  do an activity round every N levels (default 10)
 *   SHOT_DIR      screenshots (default ./web-play-shots)
 *   LOG_FILE      JSON session log (default ./web-play-shots/session.json)
 *
 * Input is real: every word is traced by dragging across cells with CDP touch
 * events through the app's own gesture handler. `?e2e=1` exposes the zustand
 * store, which is used to READ state only (GameScreen.tsx:1700-1710).
 */
import { createRequire } from 'module';
import * as fs from 'fs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try { return require(id); } catch { /* next */ }
  }
  throw new Error('Playwright not found.');
}
const { chromium } = loadPlaywright();

const URL_BASE = process.env.WORDFALL_URL || 'http://localhost:8080';
const LEVELS = Number(process.env.LEVELS || 20);
const ACTIVITY_EVERY = Number(process.env.ACTIVITY_EVERY || 10);
const SHOT_DIR = process.env.SHOT_DIR || 'web-play-shots';
const LOG_FILE = process.env.LOG_FILE || `${SHOT_DIR}/session.json`;
fs.mkdirSync(SHOT_DIR, { recursive: true });

const log = {
  startedAt: new Date().toISOString(),
  levels: [],
  activities: [],
  ceremonies: [],
  errors: [],
  energyWalls: [],
  notes: [],
};
const note = (s) => { log.notes.push(s); console.log(`  · ${s}`); };

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

const IGNORABLE = [/no supported source was found/, /didn't interact with the document/, /play\(\) failed/];
const record = (msg) => {
  if (IGNORABLE.some((re) => re.test(msg))) return;
  const key = msg.slice(0, 160);
  const hit = log.errors.find((e) => e.msg === key);
  if (hit) hit.count++; else log.errors.push({ msg: key, count: 1 });
};
page.on('pageerror', (e) => record(`[pageerror] ${String(e)}`));
page.on('console', (m) => { if (m.type() === 'error') record(`[console] ${m.text()}`); });

const touch = (type, x = 0, y = 0) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 5, radiusY: 5, force: 1, id: 1 }],
});
const tapAt = async (x, y, settle = 1200) => {
  await touch('touchStart', x, y); await page.waitForTimeout(60);
  await touch('touchEnd'); await page.waitForTimeout(settle);
};
const shot = (name) => page.screenshot({ path: `${SHOT_DIR}/${name}.png` }).catch(() => {});

/**
 * Tap the first VISIBLE element whose aria-label matches. Returns the label.
 *
 * Visibility is the whole point. Both navigators keep inactive screens
 * mounted, so the Home screen's "Play level 6" button is still in the DOM —
 * with a perfectly good bounding box — while the Profile tab is showing.
 * Tapping it does nothing, and the runner concludes the game is broken.
 * offsetParent is null inside a display:none subtree, which is how
 * react-navigation hides them.
 */
async function tapAria(re, settle = 1300) {
  // A match below the fold is SCROLLED TO, not skipped. Profile's "Open
  // Clubs" and "Open Mastery Pass" sit far down a long screen, so a
  // viewport-only search reports them as missing and the runner concludes
  // Clubs is unreachable — which is a harness bug that reads exactly like a
  // product bug.
  const found = await page.evaluate(async (src) => {
    const rx = new RegExp(src);
    const visible = (el) => el.offsetParent || getComputedStyle(el).position === 'fixed';
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return r.width >= 4 && r.height >= 4 ? r : null;
    };
    let offscreen = null;
    for (const el of document.querySelectorAll('[aria-label]')) {
      const label = el.getAttribute('aria-label') || '';
      if (!rx.test(label) || !visible(el)) continue;
      const r = box(el);
      if (!r) continue;
      if (r.bottom >= 0 && r.top <= window.innerHeight) {
        return { label, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      offscreen = offscreen || { el, label };
    }
    if (!offscreen) return null;
    offscreen.el.scrollIntoView({ block: 'center' });
    await new Promise((done) => setTimeout(done, 350));
    const r = box(offscreen.el);
    if (!r || r.bottom < 0 || r.top > window.innerHeight) return null;
    return { label: offscreen.label, x: r.x + r.width / 2, y: r.y + r.height / 2, scrolled: true };
  }, re.source);
  if (!found) return null;
  await tapAt(found.x, found.y, settle);
  return found.label;
}

async function tapText(label, timeout = 2500, settle = 1300) {
  const el = page.getByText(label, { exact: false }).first();
  try { await el.waitFor({ state: 'visible', timeout }); } catch { return false; }
  const b = await el.boundingBox().catch(() => null);
  if (!b) return false;
  await tapAt(b.x + b.width / 2, b.y + b.height / 2, settle);
  return true;
}

const ariaLabels = () => page.evaluate(() =>
  [...new Set([...document.querySelectorAll('[aria-label]')]
    .filter((e) => e.offsetParent || getComputedStyle(e).position === 'fixed')
    .map((e) => e.getAttribute('aria-label')).filter((a) => a && !/^Letter /.test(a)))]);

const visibleText = () => page.evaluate(() =>
  [...new Set([...document.querySelectorAll('div,span')]
    .filter((e) => !e.children.length && e.offsetParent)
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight; })
    .map((e) => (e.textContent || '').trim())
    .filter((t) => t.length > 1 && t.length < 60))]);

const gameState = () => page.evaluate(() => {
  const s = window.__wfStore?.getState?.();
  if (!s) return null;
  return {
    level: s.level, mode: s.mode, status: s.status, score: s.score, moves: s.moves,
    hintsUsed: s.hintsUsed, undosUsed: s.undosUsed, shufflesUsed: s.shufflesUsed,
    perfectRun: s.perfectRun,
    remaining: (s.board?.words || []).filter((w) => !w.found).map((w) => w.word),
    found: (s.board?.words || []).filter((w) => w.found).map((w) => w.word),
    rows: s.board?.grid?.length ?? 0, cols: s.board?.grid?.[0]?.length ?? 0,
  };
});

const readCells = () => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('[aria-label]')) {
    const m = (el.getAttribute('aria-label') || '').match(/^Letter ([A-Z]), row (\d+) column (\d+)/);
    if (!m) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    out.push({ letter: m[1], row: Number(m[2]) - 1, col: Number(m[3]) - 1, x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }
  return out;
});

function toGrid(cells) {
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const g = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const c of cells) g[c.row][c.col] = c;
  return g;
}

// 8-directional, matching src/engine/solver.ts DIRS.
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** Paths spelling `word`, fewest diagonal steps first (diagonals are harder to drive). */
function findPaths(grid, word) {
  const R = grid.length, C = grid[0].length, found = [];
  const seen = grid.map((r) => r.map(() => false));
  const go = (r, c, i, path, diag) => {
    if (found.length > 60) return;
    if (r < 0 || r >= R || c < 0 || c >= C || seen[r][c]) return;
    const cell = grid[r][c];
    if (!cell || cell.letter !== word[i]) return;
    seen[r][c] = true; path.push([r, c]);
    if (i === word.length - 1) found.push({ path: [...path], diag });
    else for (const [dr, dc] of DIRS) go(r + dr, c + dc, i + 1, path, diag + (dr && dc ? 1 : 0));
    seen[r][c] = false; path.pop();
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) go(r, c, 0, [], 0);
  return found.sort((a, b) => a.diag - b.diag);
}

/**
 * Simulate a classic clear: remove the traced cells, then compact each column
 * downward. Only the letters matter for planning.
 */
function lettersAfterClear(grid, path, mode = 'classic') {
  const R = grid.length, C = grid[0].length;
  if (mode === 'noGravity') {
    // noGravity clears in place: the hole stays a hole and nothing moves.
    const gone = new Set(path.map(([r, c]) => `${r},${c}`));
    return grid.map((row, r) => row.map((cell, c) =>
      (!cell || gone.has(`${r},${c}`)) ? null : { letter: cell.letter }));
  }
  const cleared = new Set(path.map(([r, c]) => `${r},${c}`));
  const cols = Array.from({ length: C }, () => []);
  for (let c = 0; c < C; c++) {
    for (let r = 0; r < R; r++) {
      const cell = grid[r][c];
      if (cell && !cleared.has(`${r},${c}`)) cols[c].push(cell.letter);
    }
  }
  const out = Array.from({ length: R }, () => Array(C).fill(null));
  for (let c = 0; c < C; c++) {
    const stack = cols[c];
    for (let i = 0; i < stack.length; i++) {
      out[R - stack.length + i][c] = { letter: stack[i] };
    }
  }
  return out;
}

/** Is `word` traceable anywhere on this letter grid? */
function existsIn(grid, word) {
  return findPaths(grid, word).length > 0;
}

/**
 * FULL SOLVE, not a heuristic.
 *
 * One-ply lookahead is the policy the repo benchmarks as "a player who has
 * learned the rule", and it is the right model for measuring difficulty — but
 * it is the wrong driver for a 100-level run. It loses ~3% of boards, a retry
 * hands back the SAME board (handleRetry re-uses the board object), and a
 * deterministic policy re-loses it identically. That is how every earlier
 * session wedged.
 *
 * Boards top out around eight words, so the whole ordering space is tiny:
 * depth-first over (grid, remaining), memoised on the state signature. If the
 * board is solvable this returns a complete winning order; the generator only
 * ships solvable boards (engine/__tests__/modeSolvability), so in practice the
 * runner should never dead-end for reasons of its own.
 */
const SOLVE_NODE_BUDGET = 40000;

function sig(grid, remaining) {
  return grid.map((row) => row.map((c) => (c ? c.letter : '.')).join('')).join('/') +
    '#' + [...remaining].sort().join(',');
}

/** A complete winning order for `remaining` on `grid`, or null. */
function solveOrder(grid, remaining, mode = 'classic') {
  const seen = new Set();
  let nodes = 0;
  const go = (g, rest) => {
    if (!rest.length) return [];
    if (nodes++ > SOLVE_NODE_BUDGET) return null;
    const k = sig(g, rest);
    if (seen.has(k)) return null;
    seen.add(k);
    // Try the word that leaves the most others alive first: the same
    // heuristic as before, now used only to ORDER the search.
    const cands = [];
    for (const w of rest) {
      const paths = findPaths(g, w);
      if (!paths.length) return null;   // this word is already unreachable
      cands.push({ w, paths });
    }
    cands.sort((a, b) => a.w.length - b.w.length);
    for (const { w, paths } of cands) {
      for (const hit of paths.slice(0, 6)) {
        const after = lettersAfterClear(g, hit.path, mode);
        const tail = go(after, rest.filter((x) => x !== w));
        if (tail) return [{ word: w, path: hit.path }, ...tail];
      }
    }
    return null;
  };
  return go(grid, [...remaining]);
}

/**
 * ONE-PLY LOOKAHEAD — clear the word that leaves the most others findable,
 * breaking ties toward the shorter word.
 *
 * Choosing greedily is the naive policy the repo's own benchmarks measure at
 * roughly 12% stuck early and 62% mid-game: clearing order is the game, and a
 * bot that ignores it walks into dead ends that are the player's fault, not
 * the board's. This is the same policy skilledPlay.test.ts models as "a player
 * who has learned the rule".
 */
function chooseWord(grid, remaining, mode = 'classic') {
  let best = null, bestSurvivors = -1;
  for (const word of remaining) {
    const paths = findPaths(grid, word);
    if (!paths.length) continue;
    const after = lettersAfterClear(grid, paths[0].path, mode);
    const survivors = remaining.filter((w) => w !== word && existsIn(after, w)).length;
    if (survivors > bestSurvivors ||
        (survivors === bestSurvivors && best && word.length < best.length)) {
      bestSurvivors = survivors;
      best = word;
    }
  }
  return best;
}

/** One touch stream across the path — the app's real gesture handler. */
async function trace(grid, path) {
  const pts = path.map(([r, c]) => grid[r][c]);
  await touch('touchStart', pts[0].x, pts[0].y);
  await page.waitForTimeout(70);
  await touch('touchMove', pts[0].x + 6, pts[0].y);  // onBegin does not hit-test on web
  await page.waitForTimeout(120);
  for (const p of pts.slice(1)) {
    await touch('touchMove', p.x, p.y);
    await page.waitForTimeout(95);
  }
  await touch('touchEnd');
  await page.waitForTimeout(1050);
}

/** Park on a far cell so a lifted trace can't absorb the next one. */
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

/**
 * The soft-energy wall.
 *
 * OutOfEnergyModal blocks play with "Next point recharges in 9 minutes — or
 * jump straight back in": watch an ad, spend gems for a full refill, or take
 * a break. It is a hard stop for a runner and a genuine pacing beat for a
 * player, so every occurrence is recorded with the level it interrupted.
 *
 * Refill with gems — the ad path resolves to nothing on web, and by this
 * point a normal player is sitting on hundreds of gems from the reward
 * timers, so paying is what they would actually do.
 */
async function handleEnergyWall(tag) {
  if (!(await isVisible(/^Refill all energy for/))) return false;
  const gems = await tapAria(/^Refill all energy for/, 2000);
  log.energyWalls.push({ tag, at: new Date().toISOString(), via: gems || 'unknown' });
  console.log(`  · OUT OF ENERGY (${tag}) — refilled with gems`);
  await page.waitForTimeout(1500);
  return true;
}

/**
 * Dismiss whatever celebration, reward sheet or offer is covering the screen.
 * Records each one so the session log shows what a player is actually shown.
 */
/*
 * Dismissal labels only.
 *
 * CLAIM, COLLECT and NEXT are deliberately NOT here. They are permanent home
 * screen controls (reward timers, season pass, the victory screen's own Next
 * level), not overlay dismissals — treating them as such made the runner tap
 * CLAIM 309 times in one session without anything going away, which burned
 * the clock and masked the modal that was actually blocking it.
 */
const CTA = ['AMAZING', 'CONTINUE', 'GOT IT', 'NICE', 'AWESOME', "LET'S GO",
  'SWEET', 'THANKS', 'NO THANKS', 'MAYBE LATER', 'SKIP', 'DONE', 'OK', 'CLOSE'];

/**
 * Tap a call-to-action button by its EXACT label.
 *
 * Substring matching is unusable here: getByText('OK', {exact:false}) matches
 * any element merely containing those letters, which on a live board includes
 * letter tiles and word chips — the runner ends up tracing garbage into the
 * puzzle it is supposed to be playing. Match leaf elements whose whole text is
 * the label, and require a button-sized box.
 */
async function tapExactCTA() {
  const found = await page.evaluate((labels) => {
    const wanted = new Set(labels.map((l) => l.toUpperCase()));
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length) continue;
      const txt = (el.textContent || '').trim().toUpperCase().replace(/[!.]+$/, '');
      if (!wanted.has(txt)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.height < 12 || r.y < 0 || r.y > 900) continue;
      return { txt, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, CTA);
  if (!found) return null;
  await tapAt(found.x, found.y, 1100);
  return found.txt;
}

/**
 * Dismiss whatever celebration, reward sheet or offer is covering the screen.
 * Records each one, so the log shows what a player is actually shown between
 * levels rather than just that something was in the way.
 */
async function clearOverlays(tag) {
  let lastSig = '';
  for (let i = 0; i < 12; i++) {
    if (await handleEnergyWall(tag)) continue;
    // The per-mode tutorial. Its backdrop is opaque to touch, so until it is
    // dismissed every trace lands on the backdrop instead of the board — a
    // mode with no timer then sits at status 'playing' forever. Four modes
    // have one (perfectSolve, gravityFlip, shrinkingBoard, timePressure) and
    // it shows once per mode per player.
    const tut = await tapAria(/^(Skip mode tutorial|Got it, close tutorial|Next step, \d+ of \d+)$/, 900);
    if (tut) { log.ceremonies.push({ tag, via: tut }); continue; }
    const sig = (await visibleText()).join('|');
    // If the previous tap changed nothing on screen, we are hammering a
    // permanent control rather than dismissing an overlay. Stop.
    if (sig === lastSig) return;
    lastSig = sig;
    const closed = await tapAria(/^(Close|Dismiss)/i, 800);
    if (closed) { log.ceremonies.push({ tag, via: closed }); continue; }
    const cta = await tapExactCTA();
    if (!cta) return;
    log.ceremonies.push({ tag, via: cta });
  }
}

/** Play the level currently on screen to a win (or give up). */
async function playLevel(index) {
  // Spike and pinch levels open behind PreLevelBoosterSheet, which covers the
  // board — its dismiss control is "Play the challenge level" (PLAY >). Any
  // other sheet queued on entry gets cleared the same way. Without this the
  // runner traces into a modal and scores nothing, which looks exactly like
  // an unwinnable board.
  if (await tapAria(/^Play the challenge level$/, 1200)) {
    log.ceremonies.push({ tag: `pre-level-${index}`, via: 'PreLevelBoosterSheet' });
    await page.waitForTimeout(1200);
  }
  await clearOverlays(`pre-level-${index}`);

  const start = await gameState();
  if (!start) return { index, ok: false, why: 'not on a game screen' };
  const entry = {
    index, level: start.level, mode: start.mode, size: `${start.rows}x${start.cols}`,
    words: [...start.remaining], moves: [], stalls: [], t0: Date.now(),
  };

  // Words that led into a dead end from the state we backtracked to. Undoing
  // and then re-picking the SAME word walks straight back into the trap,
  // which is what a player who undoes without changing their mind does.
  const avoid = new Set();
  // A retry hands back the SAME board. Three attempts is already more than a
  // player gives a level before walking away, and past that the runner is
  // just burning clock — level 10 spent 474 seconds on 30 of them.
  const MAX_RETRIES = 3;

  for (let move = 0; move < 34; move++) {
    const s = await gameState();
    if (!s || s.remaining.length === 0) break;
    if (s.status !== 'playing') { entry.stalls.push(`status=${s.status} with ${s.remaining.length} left`); break; }
    const grid = toGrid(await readCells());

    // Play like someone who has learned the rule: prefer the word whose
    // removal leaves the most others traceable, then fall back to the rest.
    const open = s.remaining.filter((w) => !avoid.has(w));
    const pool = open.length ? open : s.remaining;
    // Re-solve from the LIVE grid every move rather than following a plan.
    // The board on screen is the only authority — a shuffle, a hint, an undo
    // or a booster can all reshape it between moves, and a stale plan would
    // then be traced into a board it no longer describes.
    // The sim models column-compaction gravity and noGravity's in-place
    // clear. gravityFlip rotates its gravity a quarter turn per word and
    // shrinkingBoard eats the outer ring every two words — neither is
    // modelled, so on those the runner plays one-ply and any loss is the
    // HARNESS, not the game. Recorded as such.
    const modelled = s.mode !== 'gravityFlip' && s.mode !== 'shrinkingBoard';
    if (!modelled) entry.simUnmodelled = true;
    const win = modelled ? solveOrder(grid, pool, s.mode) : null;
    if (win) entry.solvedFrom = entry.solvedFrom ?? entry.moves.length;
    const preferred = win ? win[0].word : chooseWord(grid, pool, s.mode);
    const order = preferred ? [preferred, ...pool.filter((w) => w !== preferred)] : pool;

    // WHICH occurrence matters as much as which word. A word can usually be
    // traced several ways, and on a gravity board the choice changes what
    // falls where — clearing TREE down the left column and clearing it across
    // the middle leave two different boards. Following the plan's WORD but
    // tracing a different path is how a proven-winnable line still dead-ends,
    // which is exactly what happened on level 10: solved from move 0, then
    // stuck with one word left after four correct picks.
    let played = null;
    outer: for (const w of order) {
      const planned = win && win[0].word === w ? [win[0].path] : [];
      const paths = [...planned, ...findPaths(grid, w).map((h) => h.path)];
      for (const path of paths.slice(0, 4)) {
        await park(grid, path);
        await trace(grid, path);
        const after = await gameState();
        if (after && after.found.includes(w)) { played = w; break outer; }
      }
    }
    if (!played) {
      // Nothing traceable usually means something is COVERING the board, not
      // that the board is dead. Clear and retry the move once before giving up.
      await tapAria(/^Play the challenge level$/, 800);
      await clearOverlays(`stuck-${index}`);
      const grid2 = toGrid(await readCells());
      const s3 = await gameState();
      let recovered = null;
      if (s3 && s3.status === 'playing') {
        outer2: for (const w of s3.remaining) {
          for (const hit of findPaths(grid2, w).slice(0, 3)) {
            await park(grid2, hit.path);
            await trace(grid2, hit.path);
            const after = await gameState();
            if (after && after.found.includes(w)) { recovered = w; break outer2; }
          }
        }
      }
      if (recovered) { entry.moves.push(recovered); continue; }

      // Genuinely stuck. Escalate the way a player does, cheapest first, and
      // record which rescue was needed — an assisted win is a different
      // result from a clean one and the log should say so.
      //
      // Smart Shuffle first: it is the booster designed for exactly this, it
      // re-letters the board without moving any word's path, and it is free
      // to try from the inventory the game hands out.
      const before = await gameState();
      const grew = async () => {
        const now = await gameState();
        return now && (now.found.length > (before?.found.length ?? 0) ||
          JSON.stringify(now.remaining) !== JSON.stringify(before?.remaining));
      };

      let rescued = null;

      // The game's OWN guidance first. When a board dead-ends, GameBanners
      // shows a stuck banner that is itself the control: "tap to step back a
      // move" while undos remain, and "tap to retry this puzzle" once they are
      // spent. The header undo does the former, but only the banner offers the
      // retry — and a retry is the only thing that regenerates the board, so
      // without it a dead-ended level is resumed, still dead, forever.
      // The banner has two states and only ONE of them regenerates the board:
      // "tap to step back a move" while undos remain, then "tap to retry this
      // puzzle" once they are spent. A dead-ended level is RESUMED on
      // re-entry, not regenerated, so retry is the only real escape — and to
      // reach it the undos have to be spent first. Drain, then retry.
      let bannerRescue = null;
      for (let b = 0; b < 8 && !bannerRescue; b++) {
        if ((entry.retried || 0) < MAX_RETRIES && await tapBanner('tap to retry this puzzle')) {
          entry.retried = (entry.retried || 0) + 1;
          entry.moves.push('(retry)');
          // Do NOT clear `avoid`: handleRetry re-uses the same board object,
          // so a retry that forgets which openings dead-ended replays the
          // losing line verbatim. Level 10 retried 30 times that way.
          await page.waitForTimeout(2500);
          await clearOverlays(`retry-${index}`);
          bannerRescue = 'retry';
          break;
        }
        const lastPlayed = [...entry.moves].reverse().find((m) => !m.startsWith('('));
        if (!(await tapBanner('tap to step back a move'))) break;
        await page.waitForTimeout(1600);
        const now = await gameState();
        const gridNow = now ? toGrid(await readCells()) : null;
        if (now && gridNow && now.remaining.some((w) => findPaths(gridNow, w).length > 0)) {
          if (lastPlayed) avoid.add(lastPlayed);
          entry.rescues = entry.rescues || [];
          entry.rescues.push('banner-undo');
          entry.moves.push('(step-back)');
          bannerRescue = 'step-back';
        }
      }
      if (bannerRescue) continue;

      if (await tapAria(/^Shuffle booster, [1-9]/, 1800)) {
        await page.waitForTimeout(2200);
        await clearOverlays(`shuffle-${index}`);
        const g2 = toGrid(await readCells());
        const s4 = await gameState();
        if (s4 && s4.remaining.some((w) => findPaths(g2, w).length > 0)) rescued = 'shuffle';
      }
      // BACKTRACK, don't just undo. Undoing one move and then re-picking the
      // same word returns to the identical dead end — which is what happened
      // for five straight undos before this existed. Blacklist the word that
      // led here so the next choice is genuinely different, and keep walking
      // back while the only options are already-blacklisted.
      if (!rescued) {
        const lastPlayed = [...entry.moves].reverse().find((m) => !m.startsWith('('));
        if (await tapAria(/^Undo last move$/, 1500)) {
          await page.waitForTimeout(1800);
          if (await grew()) {
            if (lastPlayed) avoid.add(lastPlayed);
            rescued = 'undo';
          }
        }
      }
      if (!rescued && await tapAria(/^Use hint$/, 1500)) {
        await page.waitForTimeout(2500);
        await clearOverlays(`hint-${index}`);
        if (await grew()) rescued = 'hint';
      }
      if (rescued) {
        entry.rescues = entry.rescues || [];
        entry.rescues.push(rescued);
        entry.moves.push(`(${rescued})`);
        continue;
      }

      const s2 = await gameState();
      entry.stalls.push(`dead end with ${s2?.remaining.join(', ')} left after ${entry.moves.join(',')}`);
      break;
    }
    entry.moves.push(played);
  }

  const end = await gameState();
  entry.won = (end?.remaining ?? []).length === 0 && end?.status === 'won';
  entry.score = end?.score;
  entry.status = end?.status;
  entry.assists = { hints: end?.hintsUsed, undos: end?.undosUsed, shuffles: end?.shufflesUsed };
  entry.perfectRun = end?.perfectRun;
  entry.ms = Date.now() - entry.t0;
  delete entry.t0;
  log.levels.push(entry);
  console.log(`L${entry.level} ${entry.mode} ${entry.size} [${entry.words.join(',')}] -> ${entry.won ? 'WON' : 'INCOMPLETE'} ${entry.score ?? ''} (${(entry.ms / 1000).toFixed(0)}s)`);
  return entry;
}

/**
 * On a FRESH, PLAYABLE board?
 *
 * The store still answers after a win — GameScreen stays mounted under the
 * victory overlay — so "gameState() is non-null" is not evidence of having
 * advanced. It has to be a different level AND back in 'playing', or the
 * runner happily "plays" the same finished board forever.
 */
async function onFreshBoard(prevLevel) {
  const s = await gameState();
  return !!s && s.status === 'playing' && s.remaining.length > 0 && s.level !== prevLevel;
}

/**
 * Are we on the home screen?
 *
 * DOM presence is not the question — react-navigation keeps the inactive
 * screen mounted, so the Game screen's labels are still in the document while
 * Home is showing (and vice versa). Ask whether the element is actually
 * VISIBLE: laid out, non-zero, not inside a display:none subtree, and inside
 * the viewport.
 */
const isVisible = (labelRe) => page.evaluate((src) => {
  const rx = new RegExp(src);
  for (const el of document.querySelectorAll('[aria-label]')) {
    if (!rx.test(el.getAttribute('aria-label') || '')) continue;
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    return true;
  }
  return false;
}, labelRe.source);

async function onHome() {
  return (await isVisible(/^Open shop$/)) && (await isVisible(/^Play level \d+$/));
}

/** Tap a banner whose text contains `needle` (the stuck banner is a Pressable). */
async function tapBanner(needle) {
  const found = await page.evaluate((n) => {
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim();
      if (!t.toLowerCase().includes(n.toLowerCase())) continue;
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 8) continue;
      return { t, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, needle);
  if (!found) return null;
  await tapAt(found.x, found.y, 1800);
  return found.t;
}

/** Tap a bottom tab-bar entry by its exact label. */
async function tapTab(name) {
  const found = await page.evaluate((n) => {
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length) continue;
      if ((el.textContent || '').trim() !== n) continue;
      if (!el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      // The tab bar lives at the bottom of the viewport.
      if (r.top < window.innerHeight - 120) continue;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, name);
  if (!found) return false;
  await tapAt(found.x, found.y, 2000);
  return true;
}

/** Go home and start whatever level the play card offers. Verified. */
async function startLadderLevel(attempts = 4) {
  for (let a = 0; a < attempts; a++) {
    const home = await goHome();
    await clearOverlays('start-ladder');
    const tapped = await tapAria(/^Play level \d+$/, 3500);
    if (!tapped) {
      note(`startLadderLevel attempt ${a + 1}: home=${home}, no "Play level" button visible`);
      await shot(`debug-noplaybutton-${a}`);
      continue;
    }
    await page.waitForTimeout(4000);
    await clearOverlays('start-ladder-2');
    const s2 = await gameState();
    if (s2 && s2.status === 'playing' && s2.remaining.length > 0) return true;
    note(`startLadderLevel attempt ${a + 1}: tapped "${tapped}", state=${JSON.stringify(s2)}`);
    await shot(`debug-afterplay-${a}`);
  }
  return false;
}

/** Advance to the next level, preferring the victory screen's own button. */
async function nextLevel(prevLevel) {
  await clearOverlays('post-win');
  if (await tapAria(/^Next level$/, 4000)) {
    await page.waitForTimeout(3000);
    // Check FIRST: if we already landed on the next board, poking at overlays
    // would only tap into a live puzzle.
    if (await onFreshBoard(prevLevel)) return 'next-button';
    await clearOverlays('post-next');
    if (await onFreshBoard(prevLevel)) return 'next-button';
  }
  await clearOverlays('post-win-2');
  if (await tapAria(/^Play level \d+$/, 3000)) {
    await page.waitForTimeout(3500);
    if (await onFreshBoard(prevLevel)) return 'play-card';
  }
  // Reload is the reliable reset: the ceremony queue does not survive it.
  for (let i = 0; i < 3; i++) {
    await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(10000);
    if (await onFreshBoard(prevLevel)) return 'already-there';
    await clearOverlays('reentry');
    if (await tapAria(/^Play level \d+$/, 3500)) {
      await page.waitForTimeout(3500);
      if (await onFreshBoard(prevLevel)) return 'reload';
    }
  }
  return null;
}

/**
 * Get back to the home screen, and VERIFY we arrived.
 *
 * A reload is the reliable reset — the ceremony queue does not survive one and
 * the app always boots to Home — so it is used after one polite attempt
 * rather than as a last resort. Politeness costs a minute per activity round
 * across a long session.
 */
async function goHome() {
  if (await onHome()) return true;
  await clearOverlays('to-home');
  if (await onHome()) return true;
  if (await tapAria(/^Go to home screen$/, 1200)) {
    await page.waitForTimeout(1500);
    if (await onHome()) return true;
  }
  for (let i = 0; i < 3; i++) {
    await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(9500);
    await clearOverlays('to-home-reload');
    if (await onHome()) return true;
  }
  return false;
}

/**
 * Do what a player does between levels: claim the timers, spin the wheel,
 * play the daily, look at the event and the season pass, open the shop, walk
 * the tabs. Every surface visited is recorded with what it showed.
 */
async function activityRound(round) {
  const act = { round, visited: [], claimed: [], problems: [] };
  if (!(await goHome())) { act.problems.push('could not reach the home screen'); }
  await shot(`act${round}-00-home`);
  act.homeLabels = await ariaLabels();

  // 1. Free reward timers
  for (let i = 0; i < 5; i++) {
    const got = await tapAria(/ready to claim, tap to collect$/, 1600);
    if (!got) break;
    act.claimed.push(got);
    await clearOverlays(`act${round}-claim`);
  }

  // 2. Mystery Wheel
  if (await tapAria(/^Mystery Wheel/, 2500)) {
    act.visited.push('mystery-wheel');
    await page.waitForTimeout(1200);
    await shot(`act${round}-01-wheel`);
    if (!(await tapText('SPIN', 2500, 5000))) act.problems.push('wheel: no SPIN control found');
    await page.waitForTimeout(3500);
    await clearOverlays(`act${round}-wheel`);
    await goHome();
  } else act.problems.push('wheel: not reachable from home');

  // 3. Daily challenge
  const daily = await tapAria(/daily challenge/i, 2500);
  if (daily) {
    act.visited.push(`daily (${daily})`);
    await page.waitForTimeout(3500);
    if (await gameState()) {
      const r = await playLevel(`daily-${round}`);
      act.daily = { won: r.won, score: r.score, words: r.words, stalls: r.stalls };
      await clearOverlays(`act${round}-daily`);
    } else act.problems.push('daily: tapped but no game screen');
    await goHome();
  } else act.problems.push('daily: not reachable');

  // 4. Live event
  if (await tapAria(/^Event: /, 2500)) {
    act.visited.push('event');
    await page.waitForTimeout(2000);
    await shot(`act${round}-02-event`);
    act.eventText = (await visibleText()).slice(0, 40);
    await goHome();
  } else act.problems.push('event: not reachable');

  // 5. Season pass
  if (await tapAria(/^Season pass tier/, 2500)) {
    act.visited.push('season-pass');
    await page.waitForTimeout(2000);
    await shot(`act${round}-03-seasonpass`);
    act.seasonPassText = (await visibleText()).slice(0, 40);
    await clearOverlays(`act${round}-pass`);
    await goHome();
  } else act.problems.push('season pass: not reachable');

  // 6. Shop
  if (await tapAria(/^Open shop$/, 2500)) {
    act.visited.push('shop');
    await page.waitForTimeout(2500);
    await shot(`act${round}-04-shop`);
    act.shopText = (await visibleText()).slice(0, 50);
    await goHome();
  } else act.problems.push('shop: not reachable');

  // 7. Tab bar
  for (const tab of ['Play', 'Collections', 'Profile', 'Home']) {
    if (await tapTab(tab)) {
      act.visited.push(`tab:${tab}`);
      await shot(`act${round}-05-tab-${tab}`);
      const t = await visibleText();
      act[`tab${tab}`] = t.slice(0, 30);
      if (t.length < 5) act.problems.push(`tab ${tab}: rendered almost nothing`);
    } else act.problems.push(`tab ${tab}: not reachable`);
  }
  await goHome();

  log.activities.push(act);
  console.log(`\n== activity round ${round}: visited ${act.visited.length}, claimed ${act.claimed.length}, problems ${act.problems.length}`);
  act.problems.forEach((p) => console.log(`   ! ${p}`));
  return act;
}

/**
 * DEEP TOUR — every activity surface the game has, not just the ones on Home.
 *
 * The activity round covers what a player bumps into between levels. This goes
 * looking: every unlocked game MODE gets a level played in it, and the screens
 * that live two taps deep (Leaderboard under Play, Clubs and Mastery under
 * Profile, Collections, the Library) get opened and recorded. Run it after the
 * ladder has reached level 23, which is where the last mode unlocks.
 */
async function screenReport(name) {
  await page.waitForTimeout(1200);
  const labels = await ariaLabels();
  const text = await visibleText();
  await shot(`tour-${name}`);
  const rec = { screen: name, labels: labels.slice(0, 50), text: text.slice(0, 50) };
  if (!text.length) rec.problem = 'rendered nothing';
  log.tour.push(rec);
  console.log(`  tour: ${name} — ${labels.length} controls, ${text.length} text nodes${rec.problem ? ' !! ' + rec.problem : ''}`);
  return rec;
}

/**
 * Reach the Modes screen and PROVE it, rather than tapping once and hoping.
 *
 * Tapping the Play tab is not reliable on its own: an overlay that opens on a
 * timer after the last clearOverlays pass (the login calendar auto-opens 900ms
 * after a cold load) swallows the touch silently, and the runner then reports
 * every mode as missing from a screen it never reached. Retry, clearing
 * overlays between attempts, and only return once a mode card is actually on
 * screen.
 */
async function gotoModes(attempts = 5) {
  for (let a = 0; a < attempts; a++) {
    if (await isVisible(/ mode(, locked)?:/)) return true;
    await clearOverlays(`to-modes-${a}`);
    await tapTab('Play');
    await page.waitForTimeout(2200);
    if (await isVisible(/ mode(, locked)?:/)) return true;
    if (a === attempts - 2) {
      await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(9500);
    }
  }
  return false;
}

async function deepTour() {
  log.tour = log.tour || [];
  await goHome();
  await screenReport('home');

  // ── Every unlocked mode, actually played ────────────────────────────────
  if (!(await gotoModes())) log.tour.push({ screen: 'modes', problem: 'could not reach the Modes screen' });
  const modesScreen = await screenReport('play-modes');
  const modeLabels = modesScreen.labels.filter((l) => / mode(, locked)?:/.test(l));
  const unlocked = modeLabels.filter((l) => !/ mode, locked:/.test(l));
  log.modes = { offered: modeLabels.length, unlocked: unlocked.length, locked: modeLabels.filter((l) => / mode, locked:/.test(l)) };
  console.log(`  tour: ${unlocked.length}/${modeLabels.length} modes unlocked`);

  for (const label of unlocked) {
    const name = label.split(' mode')[0];
    // Reload first. The Play stack is Modes -> Game, so after playing one
    // mode the tab is still showing the finished GAME screen; tapping "Play"
    // focuses the stack but does not pop it, the mode cards are not mounted,
    // and every subsequent mode reports "could not open". That is what
    // happened on the first tour: one mode played, nine phantom failures.
    await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(9000);
    await clearOverlays(`mode-entry-${name}`);
    if (!(await gotoModes())) {
      log.tour.push({ screen: `mode:${name}`, problem: 'could not reach the Modes screen' });
      continue;
    }
    if (!(await tapAria(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} mode`), 2500))) {
      log.tour.push({ screen: `mode:${name}`, problem: 'could not open' });
      continue;
    }
    await page.waitForTimeout(3000);
    await clearOverlays(`mode-${name}`);
    if (!(await gameState())) {
      // Some modes land on their own lobby first.
      await tapAria(/^Play|^Start/i, 2500);
      await page.waitForTimeout(3000);
      await clearOverlays(`mode-${name}-2`);
    }
    if (await gameState()) {
      const r = await playLevel(`mode-${name}`);
      log.tour.push({ screen: `mode:${name}`, played: true, won: r.won, score: r.score, words: r.words, status: r.status, simUnmodelled: r.simUnmodelled, stalls: r.stalls });
    } else {
      log.tour.push({ screen: `mode:${name}`, problem: 'opened but never reached a board' });
      console.log(`  tour: mode ${name} — never reached a board`);
    }
    await clearOverlays(`mode-${name}-end`);
    await goHome();
  }

  // ── The screens that live two taps deep ─────────────────────────────────
  await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(9000);
  await clearOverlays('tour-deep');
  await gotoModes();
  if (await tapAria(/^Open leaderboard$/, 2500)) await screenReport('leaderboard');
  else log.tour.push({ screen: 'leaderboard', problem: 'no entry point on the Play tab' });
  await goHome();

  await tapTab('Profile');
  await page.waitForTimeout(1500);
  await screenReport('profile');
  if (await tapAria(/^Open Clubs$/, 2500)) await screenReport('clubs');
  else log.tour.push({ screen: 'clubs', problem: 'no entry point on the Profile tab' });
  await goHome();

  await tapTab('Profile');
  await page.waitForTimeout(1500);
  if (await tapAria(/^Open Mastery Pass$/, 2500)) await screenReport('mastery');
  else log.tour.push({ screen: 'mastery', problem: 'no entry point on the Profile tab' });
  await goHome();

  await tapTab('Collections');
  await screenReport('collections');
  await goHome();

  if (await tapTab('Library')) await screenReport('library');
  else log.tour.push({ screen: 'library', problem: 'no Library tab' });
  await goHome();

  // ── Home-screen surfaces the activity round only glances at ─────────────
  for (const [name, re] of [
    ['login-calendar', /^Login Calendar$/],
    ['season-pass', /^Season pass tier/],
    ['shop', /^Open shop$/],
    ['settings', /^Open settings$/],
  ]) {
    await goHome();
    if (await tapAria(re, 2500)) await screenReport(name);
    else log.tour.push({ screen: name, problem: 'not reachable from Home' });
    await clearOverlays(`tour-${name}`);
  }
  await goHome();
}

// ── Session ─────────────────────────────────────────────────────────────────
await page.goto(`${URL_BASE}/?e2e=1`, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(12000);
await tapText('I AGREE', 8000);
await tapText('Skip tutorial', 5000);
await page.waitForTimeout(1500);
await clearOverlays('onboarding');
await tapAria(/^Play level \d+$/, 6000);
await page.waitForTimeout(4000);
if (!(await gameState())) { console.log('could not start a level'); await browser.close(); process.exit(1); }
await shot('00-first-board');

let round = 0;
let stuckLevel = null;
let stuckRepeats = 0;
for (let i = 1; i <= LEVELS; i++) {
  const r = await playLevel(i);
  // The app RESUMES an unfinished level rather than regenerating it, so a
  // board that dead-ended comes back with the same words still missing.
  // Retrying it forever teaches nothing; record it once and stop.
  if (r.won) {
    stuckLevel = null;
    stuckRepeats = 0;
  } else {
    // Anything that is not a win counts, including "not on a game screen" —
    // otherwise a level that alternates between dead and unreachable resets
    // the counter every other pass and the session grinds forever.
    const lvl = r.level ?? stuckLevel;
    if (lvl === stuckLevel) stuckRepeats++; else { stuckLevel = lvl; stuckRepeats = 1; }
    if (stuckRepeats >= 4) {
      note(`level ${stuckLevel} could not be completed or escaped after ${stuckRepeats} attempts — ending the session here`);
      await shot(`dead-end-L${stuckLevel}`);
      break;
    }
  }
  if (!r.ok && r.why) { note(`stopped at level ${i}: ${r.why}`); break; }
  if (i % 10 === 0) await shot(`level-${r.level}-end`);

  if (i % ACTIVITY_EVERY === 0 && i < LEVELS) {
    round++;
    await activityRound(round);
    // Re-enter the ladder after the detour.
    const entered = await startLadderLevel(5);
    if (!entered) { note(`could not resume the ladder after activity round ${round}`); break; }
    continue;
  }

  if (i < LEVELS) {
    let how = await nextLevel(r.level);
    if (!how) {
      // An unfinished puzzle has no "Next level" — back out to Home and take
      // whatever the play card offers, the way a player would after a loss.
      note(`no next-level path from L${r.level}; backing out to the home screen`);
      how = (await startLadderLevel(4)) ? 'home-card' : null;
    }
    if (!how) { note(`could not advance past level ${r.level}`); await shot(`stuck-at-L${r.level}`); break; }
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

if (process.env.TOUR === '1') {
  console.log('\n══ deep tour ══');
  await deepTour();
}

await shot('99-final');
log.finishedAt = new Date().toISOString();
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

const won = log.levels.filter((l) => l.won).length;
console.log(`\n════ SESSION ════`);
console.log(`levels played ${log.levels.length}, won ${won}`);
console.log(`activity rounds ${log.activities.length}, ceremonies dismissed ${log.ceremonies.length}`);
console.log(`energy walls hit ${log.energyWalls.length}`);
console.log(`distinct errors ${log.errors.length}`);
log.errors.slice(0, 15).forEach((e) => console.log(`  x${e.count} ${e.msg}`));
console.log(`log: ${LOG_FILE}`);
await browser.close();
