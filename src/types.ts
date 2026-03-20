export interface Cell {
  letter: string;
  id: string;
}

export type Grid = (Cell | null)[][];

export type Direction = 'horizontal' | 'vertical';

export interface CellPosition {
  row: number;
  col: number;
}

export interface WordPlacement {
  word: string;
  positions: CellPosition[];
  direction: Direction;
  found: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface BoardConfig {
  rows: number;
  cols: number;
  wordCount: number;
  minWordLength: number;
  maxWordLength: number;
  difficulty: Difficulty;
}

export interface Board {
  grid: Grid;
  words: WordPlacement[];
  config: BoardConfig;
}

export interface LevelConfig {
  level: number;
  difficulty: Difficulty;
  boardConfig: BoardConfig;
  stars3Threshold: number;
  stars2Threshold: number;
}

export type GameStatus = 'playing' | 'won' | 'paused';

export interface GameState {
  board: Board;
  selectedCells: CellPosition[];
  selectionDirection: Direction | null;
  score: number;
  moves: number;
  hintsLeft: number;
  undosLeft: number;
  history: { grid: Grid; words: WordPlacement[] }[];
  status: GameStatus;
  level: number;
  combo: number;
  maxCombo: number;
}

export type GameAction =
  | { type: 'SELECT_CELL'; position: CellPosition }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SUBMIT_WORD' }
  | { type: 'USE_HINT' }
  | { type: 'UNDO_MOVE' }
  | { type: 'NEW_GAME'; board: Board; level: number }
  | { type: 'RESET_COMBO' };

export interface PlayerProgress {
  currentLevel: number;
  highestLevel: number;
  totalScore: number;
  puzzlesSolved: number;
  perfectSolves: number;
  bestStreak: number;
  currentStreak: number;
  lastPlayedDate: string;
  dailyCompleted: string[];
  starsByLevel: Record<number, number>;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  currentLevel: 1,
  highestLevel: 1,
  totalScore: 0,
  puzzlesSolved: 0,
  perfectSolves: 0,
  bestStreak: 0,
  currentStreak: 0,
  lastPlayedDate: '',
  dailyCompleted: [],
  starsByLevel: {},
};
