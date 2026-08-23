import * as fs from 'fs';
import * as path from 'path';

function readSource(relativePath: string): string {
  const sourcePath = path.resolve(__dirname, relativePath);
  return fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';
}

const gameScreenSource = readSource('../screens/GameScreen.tsx');
const useGameSource = readSource('../hooks/useGame.ts');
const gameHeaderSource = readSource('../components/GameHeader.tsx');
const timerSource = readSource('../screens/game/TimerMovesBars.tsx');
const playFieldSource = readSource('../screens/game/PlayField.tsx');
const gridSource = readSource('../components/Grid.tsx');
const letterCellSource = readSource('../components/LetterCell.tsx');
const wordBankSource = readSource('../components/WordBank.tsx');
const puzzleCompleteSource = readSource('../components/PuzzleComplete.tsx');

describe('gameplay render isolation', () => {
  it('keeps authoritative timer ticks out of GameScreen and GameHeader', () => {
    expect(gameScreenSource).not.toContain(
      'useStore(store, s => s.timeRemaining)',
    );
    expect(useGameSource).not.toContain(
      'const timeRemaining = useStore(store, s => s.timeRemaining)',
    );
    expect(gameScreenSource).not.toContain('timeRemaining={timeRemaining}');
    expect(gameHeaderSource).not.toContain('timeRemaining?: number');
    expect(timerSource).toContain(
      'useGameStore((state) => state.timeRemaining)',
    );
  });

  it('shares last-word tension eligibility across gameplay surfaces', () => {
    expect(playFieldSource).toContain('isLastWordTensionActive');
    expect(gameScreenSource).toContain('isLastWordTensionActive');
  });

  it('connects gameplay surfaces to the tested motion policies', () => {
    expect(wordBankSource).toContain('getWordBankMotionPolicy');
    expect(puzzleCompleteSource).toContain('getPuzzleCompleteMotionPolicy');
  });

  it('latches PuzzleComplete motion from the full preference snapshot', () => {
    expect(puzzleCompleteSource).toContain('useMotionPreference');
    expect(puzzleCompleteSource).toContain('transitionMotionEligibility');
    expect(puzzleCompleteSource).not.toContain('useReduceMotion');
  });

  it('resolves motion once in Grid and passes a stable boolean to each cell', () => {
    expect(gridSource).toContain('reduceMotion={reduceMotion}');
    expect(letterCellSource).toContain('reduceMotion: boolean');
    expect(letterCellSource).not.toContain('useReduceMotion');
  });
});
