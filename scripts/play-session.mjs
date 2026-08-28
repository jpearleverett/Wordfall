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
  const found = await page.evaluate((src) => {
    const rx = new RegExp(src);
    for (const el of document.querySelectorAll('[aria-label]')) {
      const label = el.getAttribute('aria-label') || '';
      if (!rx.test(label)) continue;
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      return { label, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
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

/** One touch stream across the path — the app's real gesture handler. */
async function trace(grid, path) {
  const pts = path.map(([r, c]) => grid[r][c]);
  await touch('touchStart', pts[0].x, pts[0].y);
  await page.waitForTimeout(70);
  await touch('touchMove', pts[0].x + 6, pts[0].y);  // onBegin does not hit-test on web
  await page.waitForTimeout(120);
  for (const p of pts.slice(1)) {
    await touch('touchMove', p.x, p.y);
    await page.waitForTimeout(130);
  }
  await touch('touchEnd');
  await page.waitForTimeout(1500);
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
 * Dismiss whatever celebration, reward sheet or offer is covering the screen.
 * Records each one so the session log shows what a player is actually shown.
 */
const CTA = ['AMAZING', 'CONTINUE', 'COLLECT', 'CLAIM', 'GOT IT', 'NICE', 'AWESOME', "LET'S GO",
  'SWEET', 'THANKS', 'NO THANKS', 'MAYBE LATER', 'SKIP', 'DONE', 'OK', 'CLOSE', 'NEXT'];

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
  for (let i = 0; i < 14; i++) {
    const closed = await tapAria(/^(Close|Dismiss)/i, 800);
    if (closed) { log.ceremonies.push({ tag, via: closed }); continue; }
    const cta = await tapExactCTA();
    if (!cta) return;
    log.ceremonies.push({ tag, via: cta });
  }
}

/** Play the level currently on screen to a win (or give up). */
async function playLevel(index) {
  const start = await gameState();
  if (!start) return { index, ok: false, why: 'not on a game screen' };
  const entry = {
    index, level: start.level, mode: start.mode, size: `${start.rows}x${start.cols}`,
    words: [...start.remaining], moves: [], stalls: [], t0: Date.now(),
  };

  for (let move = 0; move < 20; move++) {
    const s = await gameState();
    if (!s || s.remaining.length === 0) break;
    if (s.status !== 'playing') { entry.stalls.push(`status=${s.status} with ${s.remaining.length} left`); break; }
    const grid = toGrid(await readCells());

    let played = null;
    outer: for (const w of s.remaining) {
      for (const hit of findPaths(grid, w).slice(0, 4)) {
        await park(grid, hit.path);
        await trace(grid, hit.path);
        const after = await gameState();
        if (after && after.found.includes(w)) { played = w; break outer; }
      }
    }
    if (!played) {
      const s2 = await gameState();
      entry.stalls.push(`could not trace: ${s2?.remaining.join(', ')}`);
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
for (let i = 1; i <= LEVELS; i++) {
  const r = await playLevel(i);
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
    const how = await nextLevel(r.level);
    if (!how) { note(`could not advance past level ${r.level}`); await shot(`stuck-at-L${r.level}`); break; }
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

await shot('99-final');
log.finishedAt = new Date().toISOString();
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

const won = log.levels.filter((l) => l.won).length;
console.log(`\n════ SESSION ════`);
console.log(`levels played ${log.levels.length}, won ${won}`);
console.log(`activity rounds ${log.activities.length}, ceremonies dismissed ${log.ceremonies.length}`);
console.log(`distinct errors ${log.errors.length}`);
log.errors.slice(0, 15).forEach((e) => console.log(`  x${e.count} ${e.msg}`));
console.log(`log: ${LOG_FILE}`);
await browser.close();
