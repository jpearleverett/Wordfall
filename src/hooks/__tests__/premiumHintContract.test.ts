/**
 * THE "NO ASSISTS" MODES MUST NOT SELL ASSISTS, AND THE PAID AUTO-SOLVE MUST
 * NOT LOSE THE PUZZLE.
 *
 * Two defects in the gem-priced close_finish_premium escalation:
 *
 * 1. USE_PREMIUM_HINT had no allowHints gate. Expert ("Minimal hints, harder
 *    boards") and Perfect Solve ("Zero mistakes, no assists") are defined by
 *    having no assists — that is the justification for their 2x score
 *    multiplier — and both were a 9-gem purchase away from a full word reveal.
 *
 * 2. The reveal selects the word and a timer submits it 400ms later so the
 *    player sees the trace. The board stays live for those 400ms, so a tap
 *    replaces the selection and the timer submits THAT instead. In Perfect
 *    Solve a non-list submission is an instant status='failed', and the mode
 *    grants zero undos — so a player one word from victory pays 9 gems and
 *    loses unrecoverably.
 *
 * The reducer now refuses the reveal where hints are disallowed, and the
 * caller re-asserts the hint immediately before submitting. USE_PREMIUM_HINT
 * is idempotent by design (no token spent, hintsUsed untouched), which is
 * what makes re-asserting safe.
 */
import { gameReducer, createInitialState } from '../useGame';
import { MODE_CONFIGS } from '../../constants';
import { generateBoard } from '../../engine/boardGenerator';
import type { BoardConfig, GameMode } from '../../types';

const CONFIG: BoardConfig = {
  rows: 6, cols: 5, wordCount: 3, minWordLength: 3, maxWordLength: 5, difficulty: 'medium',
};

const boardFor = (mode: GameMode) => generateBoard(CONFIG, 4242, mode);

describe('premium hint respects the mode contract', () => {
  it.each(['expert', 'perfectSolve'] as GameMode[])(
    '%s refuses the paid reveal', (mode) => {
      expect(MODE_CONFIGS[mode].rules.allowHints).toBe(false);
      const state = createInitialState(boardFor(mode), 50, mode);
      const next = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
      // Unchanged: no selection, and the perfect run is not silently spent.
      expect(next).toBe(state);
      expect(next.selectedCells).toEqual([]);
      expect(next.premiumHintUsed).toBe(false);
      expect(next.perfectRun).toBe(true);
    });

  it.each(['classic', 'relax', 'timePressure'] as GameMode[])(
    '%s still allows it', (mode) => {
      expect(MODE_CONFIGS[mode].rules.allowHints).toBe(true);
      const state = createInitialState(boardFor(mode), 50, mode);
      const next = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
      expect(next.selectedCells.length).toBeGreaterThan(0);
      expect(next.premiumHintUsed).toBe(true);
    });
});

describe('the paid auto-solve cannot be turned into a loss', () => {
  it('perfectSolve: submitting a stray tap instead of the hint is fatal', () => {
    // Documents the hazard the caller now guards against. classic is used to
    // obtain a hint (perfectSolve refuses one), then the same submission is
    // replayed under perfectSolve's fail rule.
    let state = createInitialState(boardFor('classic'), 50, 'classic');
    state = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
    expect(state.selectedCells.length).toBeGreaterThan(0);

    // A stray tap during the 400ms reveal window replaces the selection.
    const hinted = new Set(state.selectedCells.map((c) => `${c.row},${c.col}`));
    let stray: { row: number; col: number } | null = null;
    for (let r = 0; r < state.board.grid.length && !stray; r++) {
      for (let c = 0; c < state.board.grid[0].length; c++) {
        if (state.board.grid[r][c] && !hinted.has(`${r},${c}`)) { stray = { row: r, col: c }; break; }
      }
    }
    expect(stray).not.toBeNull();

    const perfect = { ...state, mode: 'perfectSolve' as GameMode };
    const tapped = gameReducer(perfect, { type: 'SELECT_CELL', position: stray! });
    expect(tapped.selectedCells).not.toEqual(state.selectedCells);
    const submitted = gameReducer(tapped, { type: 'SUBMIT_WORD' });
    expect(submitted.status).toBe('failed');
  });

  it('re-asserting the hint before submitting resolves the bought word', () => {
    // The caller's fix: dispatch USE_PREMIUM_HINT again, then SUBMIT_WORD.
    let state = createInitialState(boardFor('classic'), 50, 'classic');
    const wordsBefore = state.board.words.filter((w) => w.found).length;
    state = gameReducer(state, { type: 'USE_PREMIUM_HINT' });

    // Player taps elsewhere mid-reveal.
    const hinted = new Set(state.selectedCells.map((c) => `${c.row},${c.col}`));
    let stray: { row: number; col: number } | null = null;
    for (let r = 0; r < state.board.grid.length && !stray; r++) {
      for (let c = 0; c < state.board.grid[0].length; c++) {
        if (state.board.grid[r][c] && !hinted.has(`${r},${c}`)) { stray = { row: r, col: c }; break; }
      }
    }
    state = gameReducer(state, { type: 'SELECT_CELL', position: stray! });

    state = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
    state = gameReducer(state, { type: 'SUBMIT_WORD' });

    expect(state.status).not.toBe('failed');
    expect(state.board.words.filter((w) => w.found).length).toBe(wordsBefore + 1);
  });

  it('the reveal is idempotent, so re-asserting costs nothing', () => {
    let state = createInitialState(boardFor('classic'), 50, 'classic');
    const before = { hintsLeft: state.hintsLeft, hintsUsed: state.hintsUsed };
    state = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
    const once = state.selectedCells;
    state = gameReducer(state, { type: 'USE_PREMIUM_HINT' });
    expect(state.selectedCells).toEqual(once);
    expect(state.hintsLeft).toBe(before.hintsLeft);
    expect(state.hintsUsed).toBe(before.hintsUsed);
  });
});
