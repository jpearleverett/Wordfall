/**
 * Board-generation performance benchmark.
 *
 * WHY THIS EXISTS: `generateBoard` runs SYNCHRONOUSLY on the JS thread at
 * every level load (App.tsx), and its internal budget is
 * GENERATION_TIMEOUT_MS = 5000. Anything approaching even a fraction of
 * that is a visible freeze between tapping "Play" and seeing the board —
 * no spinner, no input, on the single most repeated transition in the
 * game. Jest and tsc cannot catch a regression here, so this pins it.
 *
 * The thresholds below are deliberately generous relative to CI hardware
 * (a dev container is typically FASTER than the low-end Android soft-launch
 * target, so treat these numbers as a floor, not a promise). They exist to
 * catch a step-change regression — e.g. a profile or dictionary change that
 * pushes a whole band of levels into retry loops.
 *
 * Run `BENCH_VERBOSE=1 npx jest boardGen.perf` to print the full profile.
 */
import { generateBoard } from '../boardGenerator';
import { getLevelConfigExtended, generateProceduralChapter } from '../puzzleGenerator';
import { getChapterForLevel } from '../../data/chapters';

const VERBOSE = !!process.env.BENCH_VERBOSE;

interface Sample {
  level: number;
  ms: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(label: string, samples: Sample[]) {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const worst = [...samples].sort((a, b) => b.ms - a.ms).slice(0, 8);
  const stats = {
    label,
    count: samples.length,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    p99: percentile(times, 99),
    max: times[times.length - 1],
    total: times.reduce((a, b) => a + b, 0),
  };
  if (VERBOSE) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[${label}] n=${stats.count} p50=${stats.p50.toFixed(1)}ms ` +
        `p95=${stats.p95.toFixed(1)}ms p99=${stats.p99.toFixed(1)}ms max=${stats.max.toFixed(1)}ms`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `  worst levels: ${worst.map((w) => `L${w.level}:${w.ms.toFixed(0)}ms`).join('  ')}`,
    );
  }
  return stats;
}

/** Deterministic seed per level so the benchmark is reproducible. */
function seedFor(level: number): number {
  return level * 31 + 7;
}

describe('board generation performance', () => {
  it('curated range (levels 1-600, every 7th) stays well inside the frame budget', () => {
    const samples: Sample[] = [];
    for (let level = 1; level <= 600; level += 7) {
      const config = getLevelConfigExtended(level);
      const chapter = getChapterForLevel(level);
      const t0 = Date.now();
      generateBoard(config, seedFor(level), 'classic', chapter?.profile, chapter?.themeWords);
      samples.push({ level, ms: Date.now() - t0 });
    }
    const stats = summarize('curated 1-600', samples);

    // No single level may come anywhere near the 5s internal timeout —
    // that would be a multi-second frozen screen on the level-load path.
    expect(stats.max).toBeLessThan(1500);
    // Headroom raised from 600ms when the forgiveness gate landed: the
    // generator now samples candidate boards for fairness before accepting
    // one (see MIN_FORGIVENESS_BY_DIFFICULTY), which is a deliberate trade
    // of some generation time for a far lower stuck rate. Still bounded so
    // level load never reads as a freeze.
    expect(stats.p95).toBeLessThan(900);
  }, 180_000);

  it('procedural tail (levels 601-1500, every 13th) does not degrade', () => {
    const samples: Sample[] = [];
    for (let level = 601; level <= 1500; level += 13) {
      const config = getLevelConfigExtended(level);
      const chapterId = 41 + Math.floor((level - 601) / 15);
      const chapter = generateProceduralChapter(chapterId);
      const t0 = Date.now();
      generateBoard(config, seedFor(level), 'classic', chapter.profile, chapter.themeWords);
      samples.push({ level, ms: Date.now() - t0 });
    }
    const stats = summarize('procedural 601-1500', samples);

    expect(stats.max).toBeLessThan(1500);
    expect(stats.p95).toBeLessThan(900);
  }, 180_000);

  it('non-classic modes generate within budget', () => {
    const modes = ['shrinkingBoard', 'gravityFlip', 'noGravity', 'timePressure'] as const;
    for (const mode of modes) {
      const samples: Sample[] = [];
      for (let level = 10; level <= 300; level += 29) {
        const config = getLevelConfigExtended(level);
        const t0 = Date.now();
        generateBoard(config, seedFor(level), mode);
        samples.push({ level, ms: Date.now() - t0 });
      }
      const stats = summarize(`mode:${mode}`, samples);
      // shrinkingBoard does the most solver work (shrink-aware validation).
      expect(stats.max).toBeLessThan(2500);
    }
  }, 240_000);
});
