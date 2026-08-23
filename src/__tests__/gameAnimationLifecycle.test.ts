import * as fs from 'fs';
import * as path from 'path';

const grid = fs.readFileSync(
  path.resolve(__dirname, '../components/Grid.tsx'),
  'utf8',
);
const playField = fs.readFileSync(
  path.resolve(__dirname, '../screens/game/PlayField.tsx'),
  'utf8',
);
const game = fs.readFileSync(
  path.resolve(__dirname, '../screens/GameScreen.tsx'),
  'utf8',
);
const flashes = fs.readFileSync(
  path.resolve(__dirname, '../screens/game/GameFlashes.tsx'),
  'utf8',
);

describe('gravity animation lifecycle ownership', () => {
  test('fall sequences and listeners have explicit owners and unmount cleanup', () => {
    expect(grid).toContain(
      'const activeFallsRef = useRef(new Map<string, Animated.CompositeAnimation>());',
    );
    expect(grid).toContain('activeFallsRef.current.set(f.id, sequence);');
    expect(grid).toContain(
      'activeFallsRef.current.forEach(animation => animation.stop());',
    );
    expect(grid).toContain(
      'for (const { value, handle } of listenerHandleRef.current.values())',
    );
    expect(grid).toContain('value.removeListener(handle);');
    expect(grid).toContain('fallRunIdRef.current += 1;');
  });

  test('ghost and glint native animations stop when their views unmount', () => {
    expect(grid.match(/return \(\) => animation\.stop\(\);/g)).toHaveLength(2);
  });
});

describe('puzzle effect lifecycle ownership', () => {
  test('delayed trace sounds are cancelled when PlayField unmounts', () => {
    expect(playField).toContain(
      'const tapSoundTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());',
    );
    expect(playField).toContain('tapSoundTimersRef.current.add(timer);');
    expect(playField).toContain(
      'tapSoundTimersRef.current.forEach(clearTimeout);',
    );
    expect(playField).toContain('tapSoundTimersRef.current.clear();');
  });

  test('undo and retry leave tile layout animation exclusively to Grid', () => {
    expect(game).not.toContain('LayoutAnimation');
  });

  test('unreachable invalid-word animation state and rendering are removed', () => {
    expect(game).not.toContain('showInvalidFlashAnim');
    expect(game).not.toContain('showInvalidFlash');
    expect(game).not.toContain('invalidFlashAnim');
    expect(flashes).not.toContain('showInvalidFlash');
    expect(flashes).not.toContain('invalidFlashAnim');
    expect(flashes).not.toContain('invalidFlashOverlay');
  });

  test('word-clear effect explicitly captures every changing dependency', () => {
    const start = game.indexOf('// Score popup when score changes');
    const end = game.indexOf('// Green flash + auto-submit', start);
    const effect = game.slice(start, end);
    const dependencyMatch = effect.match(/\n  \}, \[([^\]]+)\]\);\n/);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(dependencyMatch).not.toBeNull();

    const dependencies = new Set(
      dependencyMatch![1].split(',').map(dependency => dependency.trim()),
    );
    expect(dependencies).toEqual(new Set([
      'addCoins',
      'bigWordAnim',
      'bonusTile',
      'gridAreaHeight',
      'level',
      'mode',
      'reduceMotion',
      'score',
      'scorePopupAnim',
      'shakeAnim',
      'spawnClearRing',
      'spawnStarSparks',
      'spawnTileBloom',
      'status',
      'store',
      'trackTimeout',
    ]));
  });
});
