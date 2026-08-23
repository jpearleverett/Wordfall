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
});
