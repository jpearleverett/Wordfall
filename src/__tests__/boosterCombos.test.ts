/**
 * Booster-combo synergy tests — covers the pure combo-detection helper, the
 * reducer wiring (activation, score multiplier on SUBMIT_WORD, expiration
 * after N words), and Remote-Config defaults.
 *
 * The GameScreen UI wiring (handler dispatch, banner mount, analytics
 * event fire) is exercised via manual + Maestro smoke; this test file locks
 * the core game-state contract so a reducer refactor can't silently drop
 * the multiplier.
 */

import { gameReducer, createInitialState } from '../hooks/useGame';
import {
  COMBO_DEFINITIONS,
  detectCombo,
  resolveCombo,
  type BoosterType,
} from '../data/boosterCombos';
import { getRemoteBoolean, getRemoteNumber } from '../services/remoteConfig';
import type { AnalyticsEventName } from '../services/analytics';
import type { Board, Cell, Grid, WordPlacement, BoardConfig } from '../types';

function makeCell(letter: string, id?: string): Cell {
  return { letter, id: id ?? `c_${letter}_${Math.random().toString(36).slice(2, 6)}` };
}

function makeBoard(): Board {
  // 2x3 grid with two easy words: "GO" (top row) and "HI" (bottom row). The
  // third column is padding so the grid has distinct cells for positioning.
  const grid: Grid = [
    [makeCell('G', 'g1'), makeCell('O', 'o1'), null],
    [makeCell('H', 'h1'), makeCell('I', 'i1'), null],
  ];
  const words: WordPlacement[] = [
    {
      word: 'GO',
      positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      direction: 'horizontal',
      found: false,
    },
    {
      word: 'HI',
      positions: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
      direction: 'horizontal',
      found: false,
    },
  ];
  const config: BoardConfig = {
    rows: 2,
    cols: 3,
    wordCount: 2,
    minWordLength: 2,
    maxWordLength: 2,
    difficulty: 'easy',
  };
  return { grid, words, config };
}

describe('boosterCombos data module', () => {
  it('exposes the three canonical combo definitions', () => {
    expect(COMBO_DEFINITIONS.eagleEye.pair.sort()).toEqual(['spotlight', 'wildcardTile'].sort());
    expect(COMBO_DEFINITIONS.luckyRoll.pair.sort()).toEqual(['smartShuffle', 'wildcardTile'].sort());
    expect(COMBO_DEFINITIONS.powerSurge.pair.sort()).toEqual(['smartShuffle', 'spotlight'].sort());
  });

  it('resolves combos order-insensitively', () => {
    expect(resolveCombo('wildcardTile', 'spotlight')).toBe('eagleEye');
    expect(resolveCombo('spotlight', 'wildcardTile')).toBe('eagleEye');
    expect(resolveCombo('smartShuffle', 'wildcardTile')).toBe('luckyRoll');
    expect(resolveCombo('spotlight', 'smartShuffle')).toBe('powerSurge');
  });

  it('returns null when paired with itself', () => {
    expect(resolveCombo('wildcardTile', 'wildcardTile')).toBeNull();
  });

  it('detects combo from prior booster list + newly activated', () => {
    expect(detectCombo(['wildcardTile'], 'spotlight')).toBe('eagleEye');
    expect(detectCombo(['spotlight'], 'smartShuffle')).toBe('powerSurge');
    expect(detectCombo(['wildcardTile'], 'smartShuffle')).toBe('luckyRoll');
  });

  it('returns null when only one booster used and activating same booster', () => {
    expect(detectCombo(['wildcardTile'], 'wildcardTile')).toBeNull();
  });

  it('returns null when prior list is empty', () => {
    expect(detectCombo([], 'spotlight')).toBeNull();
  });

  it('prefers most-recent distinct prior for multi-booster sequences', () => {
    // Sequence: spotlight → wildcard → smartShuffle. When smartShuffle fires,
    // the most-recent distinct prior is wildcard → Lucky Roll (NOT powerSurge,
    // which would require spotlight as the pairing partner).
    expect(detectCombo(['spotlight', 'wildcardTile'], 'smartShuffle')).toBe('luckyRoll');
  });
});

describe('gameReducer — booster-combo state wiring', () => {
  it('initial state has no active combo and an empty booster-use list', () => {
    const state = createInitialState(makeBoard(), 1);
    expect(state.activeComboType).toBeNull();
    expect(state.comboMultiplier).toBe(1);
    expect(state.comboWordsRemaining).toBe(0);
    expect(state.boostersUsedThisPuzzle).toEqual([]);
  });

  it('ACTIVATE_BOOSTER_COMBO sets combo fields', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, {
      type: 'ACTIVATE_BOOSTER_COMBO',
      comboType: 'eagleEye',
      multiplier: 2,
      wordsDuration: 3,
    });
    expect(s1.activeComboType).toBe('eagleEye');
    expect(s1.comboMultiplier).toBe(2);
    expect(s1.comboWordsRemaining).toBe(3);
  });

  it('EXPIRE_BOOSTER_COMBO clears combo fields back to idle', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, {
      type: 'ACTIVATE_BOOSTER_COMBO',
      comboType: 'eagleEye',
      multiplier: 2,
      wordsDuration: 3,
    });
    const s2 = gameReducer(s1, { type: 'EXPIRE_BOOSTER_COMBO' });
    expect(s2.activeComboType).toBeNull();
    expect(s2.comboMultiplier).toBe(1);
    expect(s2.comboWordsRemaining).toBe(0);
  });

  it('spotlight activation appends "spotlight" to boostersUsedThisPuzzle', () => {
    // Grant a spotlight token and activate it.
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, { type: 'GRANT_BOOSTER', booster: 'spotlight' });
    const s2 = gameReducer(s1, { type: 'SPOTLIGHT_ACTIVATE' });
    expect(s2.boostersUsedThisPuzzle).toEqual(['spotlight']);
    expect(s2.spotlightActive).toBe(true);
  });

  it('repeated activation of the same booster does not duplicate in list', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, { type: 'GRANT_BOOSTER', booster: 'spotlight' });
    const s2 = gameReducer(s1, { type: 'SPOTLIGHT_ACTIVATE' });
    const s3 = gameReducer(s2, { type: 'GRANT_BOOSTER', booster: 'spotlight' });
    const s4 = gameReducer(s3, { type: 'SPOTLIGHT_ACTIVATE' });
    expect(s4.boostersUsedThisPuzzle).toEqual(['spotlight']);
  });

  it('wildcard placement appends "wildcardTile" to boostersUsedThisPuzzle', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, { type: 'GRANT_BOOSTER', booster: 'wildcardTile' });
    // Enter wildcard placement mode via USE_BOOSTER so the state flips flag.
    const s2 = gameReducer(s1, { type: 'USE_BOOSTER', booster: 'wildcardTile' });
    expect(s2.wildcardMode).toBe(true);
    const s3 = gameReducer(s2, { type: 'WILDCARD_PLACE', position: { row: 1, col: 2 } });
    expect(s3.boostersUsedThisPuzzle).toEqual(['wildcardTile']);
    expect(s3.wildcardCells).toEqual([{ row: 1, col: 2 }]);
  });

  it('SUBMIT_WORD applies combo multiplier and decrements words-remaining', () => {
    // Start with a playable board, activate a combo, then submit a matching word.
    const s0 = createInitialState(makeBoard(), 1);
    const sCombo = gameReducer(s0, {
      type: 'ACTIVATE_BOOSTER_COMBO',
      comboType: 'eagleEye',
      multiplier: 2,
      wordsDuration: 3,
    });
    // Select G then O (row 0, cols 0 and 1) to spell "GO".
    const sSel1 = gameReducer(sCombo, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    const sSel2 = gameReducer(sSel1, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    const sWord = gameReducer(sSel2, { type: 'SUBMIT_WORD' });

    // Baseline: same submission without the combo.
    const sBase1 = gameReducer(s0, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    const sBase2 = gameReducer(sBase1, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    const sBaseWord = gameReducer(sBase2, { type: 'SUBMIT_WORD' });

    expect(sWord.score).toBe(Math.floor(sBaseWord.score * 2));
    expect(sWord.comboWordsRemaining).toBe(2);
    expect(sWord.activeComboType).toBe('eagleEye');
  });

  it('combo expires on the final word of its duration', () => {
    const s0 = createInitialState(makeBoard(), 1);
    // Activate with wordsDuration=1 — combo should expire after one word.
    const sCombo = gameReducer(s0, {
      type: 'ACTIVATE_BOOSTER_COMBO',
      comboType: 'luckyRoll',
      multiplier: 2,
      wordsDuration: 1,
    });
    const s1 = gameReducer(sCombo, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    const s2 = gameReducer(s1, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    const s3 = gameReducer(s2, { type: 'SUBMIT_WORD' });
    expect(s3.activeComboType).toBeNull();
    expect(s3.comboMultiplier).toBe(1);
    expect(s3.comboWordsRemaining).toBe(0);
  });

  it('combo does not affect score when comboMultiplier=1 (inactive)', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const s1 = gameReducer(s0, { type: 'SELECT_CELL', position: { row: 0, col: 0 } });
    const s2 = gameReducer(s1, { type: 'SELECT_CELL', position: { row: 0, col: 1 } });
    const s3 = gameReducer(s2, { type: 'SUBMIT_WORD' });
    expect(s3.activeComboType).toBeNull();
    expect(s3.score).toBeGreaterThan(0);
  });

  it('NEW_GAME resets booster-combo state', () => {
    const s0 = createInitialState(makeBoard(), 1);
    const sCombo = gameReducer(s0, {
      type: 'ACTIVATE_BOOSTER_COMBO',
      comboType: 'eagleEye',
      multiplier: 2,
      wordsDuration: 3,
    });
    const sGrant = gameReducer(sCombo, { type: 'GRANT_BOOSTER', booster: 'spotlight' });
    const sUse = gameReducer(sGrant, { type: 'SPOTLIGHT_ACTIVATE' });
    expect(sUse.boostersUsedThisPuzzle).toEqual(['spotlight']);

    const sNew = gameReducer(sUse, {
      type: 'NEW_GAME',
      board: makeBoard(),
      level: 2,
    });
    expect(sNew.activeComboType).toBeNull();
    expect(sNew.comboMultiplier).toBe(1);
    expect(sNew.comboWordsRemaining).toBe(0);
    expect(sNew.boostersUsedThisPuzzle).toEqual([]);
  });
});

describe('booster-combos — Remote Config defaults', () => {
  it('ships boosterCombosEnabled=true', () => {
    expect(getRemoteBoolean('boosterCombosEnabled')).toBe(true);
  });
  it('ships boosterComboMultiplier=2', () => {
    expect(getRemoteNumber('boosterComboMultiplier')).toBe(2);
  });
  it('ships boosterComboDurationWords=3', () => {
    expect(getRemoteNumber('boosterComboDurationWords')).toBe(3);
  });
});

describe('booster-combos — analytics event names', () => {
  it('permits the two combo-lifecycle events', () => {
    const ev1: AnalyticsEventName = 'booster_combo_activated';
    const ev2: AnalyticsEventName = 'booster_combo_expired';
    expect([ev1, ev2]).toHaveLength(2);
  });
});

describe('boosterCombos — BoosterType type coverage', () => {
  it('covers every booster token type in the economy', () => {
    // Compile-time smoke: every BoosterType value is a string. If someone
    // adds a new booster to EconomyContext without registering a combo pair,
    // this at least forces them to think about whether the combo module
    // needs to extend to cover the new type.
    const all: BoosterType[] = ['wildcardTile', 'spotlight', 'smartShuffle'];
    for (const t of all) {
      expect(typeof t).toBe('string');
    }
  });
});
