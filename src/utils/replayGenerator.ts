import { SolveStep, ReplayData, GameMode } from '../types';

/**
 * Prepare replay data from solve steps.
 */
export function generateReplayData(
  steps: SolveStep[],
  level: number,
  mode: GameMode,
  totalScore: number,
  stars: number,
  perfectRun: boolean,
): ReplayData {
  const totalTime = steps.length > 0
    ? steps[steps.length - 1].timestamp
    : 0;

  return {
    level,
    mode,
    steps,
    totalScore,
    stars,
    totalTime,
    perfectRun,
  };
}

/**
 * Generate a text-based replay summary showing each solve step.
 *
 * Example output:
 *   Wordfall Level 42 -- Solved in 3 moves!
 *   1. CRANE (gravity shift!)
 *   2. BOLD  CHAIN!
 *   3. SWIFT  Perfect!
 *   Score: 1,250 | Stars: 3/3
 */
export function generateReplayText(
  steps: SolveStep[],
  level: number,
  stars: number,
  totalScore: number,
  isDaily: boolean,
): string {
  const starEmojis = '\u2B50'.repeat(stars);
  const header = isDaily
    ? `Wordfall Daily ${new Date().toISOString().split('T')[0]} -- Solved in ${steps.length} move${steps.length !== 1 ? 's' : ''}!`
    : `Wordfall Level ${level} -- Solved in ${steps.length} move${steps.length !== 1 ? 's' : ''}!`;

  const numberEmojis = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3', '5\uFE0F\u20E3', '6\uFE0F\u20E3', '7\uFE0F\u20E3', '8\uFE0F\u20E3', '9\uFE0F\u20E3', '\uD83D\uDD1F'];

  const moveLines = steps.map((step, index) => {
    const num = index < numberEmojis.length ? numberEmojis[index] : `${index + 1}.`;
    const word = step.wordFound;

    // Detect gravity shift: compare gridStateAfter with what a simple removal would produce
    const hadGravity = detectGravityShift(step);
    const isChain = step.combo > 1;
    const isLast = index === steps.length - 1;

    const annotations: string[] = [];
    if (hadGravity) annotations.push('\u2B07\uFE0F');
    if (isChain) annotations.push(`\uD83D\uDD17 ${step.combo}x`);
    if (isLast && stars >= 3) annotations.push('\u2B50 Perfect!');

    const suffix = annotations.length > 0 ? ' ' + annotations.join(' ') : '';
    return `${num} ${word}${suffix}`;
  });

  const footer = `Score: ${totalScore.toLocaleString()} | ${starEmojis}`;

  return [header, ...moveLines, footer, '', '#Wordfall'].join('\n');
}

/**
 * Generate an emoji grid showing the solve sequence.
 * Each step shows which cells were selected (highlighted) on the grid.
 */
export function generateReplayEmoji(
  steps: SolveStep[],
  level: number,
  stars: number,
  totalScore: number,
  isDaily: boolean,
): string {
  const starEmojis = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
  const header = isDaily
    ? `WORDFALL Daily ${new Date().toISOString().split('T')[0]} ${starEmojis}`
    : `WORDFALL Level ${level} ${starEmojis}`;

  const grids: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const grid = step.gridStateBefore;
    const selectedSet = new Set(
      step.cellPositions.map(([r, c]) => `${r},${c}`)
    );

    const gridEmoji = grid.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        if (!cell || cell === '') return '\u2B1B'; // empty
        if (selectedSet.has(`${rowIdx},${colIdx}`)) return '\uD83D\uDFE9'; // selected = green
        return '\u2B1C'; // filled but not selected = white
      }).join('')
    ).join('\n');

    const wordLabel = `${step.wordFound}${step.combo > 1 ? ` (${step.combo}x)` : ''}`;
    grids.push(`${wordLabel}\n${gridEmoji}`);
  }

  // Show gravity result after last step
  if (steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const finalGrid = lastStep.gridStateAfter;
    const allEmpty = finalGrid.every(row => row.every(cell => !cell || cell === ''));
    if (allEmpty) {
      grids.push('\uD83C\uDF1F Board Clear!');
    }
  }

  const footer = `Score: ${totalScore.toLocaleString()}`;

  return [header, '', ...grids, '', footer, '#Wordfall'].join('\n');
}

/**
 * Detect if gravity shifted any cells (gridStateAfter differs from simple removal).
 */
function detectGravityShift(step: SolveStep): boolean {
  const { gridStateBefore, gridStateAfter, cellPositions } = step;

  // Count non-empty cells before and after
  let beforeCount = 0;
  let afterCount = 0;
  for (const row of gridStateBefore) {
    for (const cell of row) {
      if (cell && cell !== '') beforeCount++;
    }
  }
  for (const row of gridStateAfter) {
    for (const cell of row) {
      if (cell && cell !== '') afterCount++;
    }
  }

  // If cells moved (not just removed), there was gravity
  const removedCount = cellPositions.length;
  if (afterCount !== beforeCount - removedCount) return false;

  // Check if any remaining cell changed position
  // Build a map of letters by position before removal
  const removedSet = new Set(cellPositions.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < gridStateBefore.length; r++) {
    for (let c = 0; c < (gridStateBefore[r]?.length ?? 0); c++) {
      const before = gridStateBefore[r][c];
      const after = gridStateAfter[r]?.[c] ?? '';
      if (removedSet.has(`${r},${c}`)) continue;
      if (before !== after) return true; // cell content changed = gravity moved things
    }
  }

  return false;
}
