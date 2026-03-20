import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { useStorage } from './src/hooks/useStorage';
import { generateBoard, generateDailyBoard } from './src/engine/boardGenerator';
import { Board, Difficulty } from './src/types';
import { getLevelConfig, COLORS, DIFFICULTY_CONFIGS } from './src/constants';

type Screen =
  | { type: 'home' }
  | { type: 'game'; board: Board; level: number; isDaily: boolean };

export default function App() {
  const { progress, loaded, recordPuzzleComplete, recordDailyComplete, resetProgress } =
    useStorage();
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [loading, setLoading] = useState(false);

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
      setLoading(true);
      // Use setTimeout to avoid blocking the UI during board generation
      setTimeout(() => {
        try {
          const config = difficulty
            ? DIFFICULTY_CONFIGS[difficulty]
            : getLevelConfig(progress.currentLevel);

          const level = difficulty ? 0 : progress.currentLevel;
          const board = generateBoard(config, level * 1337 + Date.now());

          setScreen({ type: 'game', board, level, isDaily: false });
        } catch (e) {
          Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 50);
    },
    [progress.currentLevel]
  );

  const startDaily = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const board = generateDailyBoard(today);
        setScreen({ type: 'game', board, level: 0, isDaily: true });
      } catch (e) {
        Alert.alert('Error', 'Failed to generate daily puzzle.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 50);
  }, []);

  const handleComplete = useCallback(
    async (stars: number, score: number) => {
      if (screen.type !== 'game') return;

      if (screen.isDaily) {
        const today = new Date().toISOString().split('T')[0];
        await recordDailyComplete(today);
      } else {
        await recordPuzzleComplete(screen.level, stars, score);
      }
    },
    [screen, recordPuzzleComplete, recordDailyComplete]
  );

  const handleNextLevel = useCallback(() => {
    if (screen.type !== 'game') return;
    const nextLevel = screen.level + 1;
    setLoading(true);
    setTimeout(() => {
      try {
        const config = getLevelConfig(nextLevel);
        const board = generateBoard(config, nextLevel * 1337 + Date.now());
        setScreen({ type: 'game', board, level: nextLevel, isDaily: false });
      } catch (e) {
        Alert.alert('Error', 'Failed to generate next puzzle.');
        setScreen({ type: 'home' });
      } finally {
        setLoading(false);
      }
    }, 50);
  }, [screen]);

  const handleHome = useCallback(() => {
    setScreen({ type: 'home' });
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Progress',
      'Are you sure? This will erase all saved progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => resetProgress(),
        },
      ]
    );
  }, [resetProgress]);

  if (!loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}

      {screen.type === 'home' && (
        <HomeScreen
          progress={progress}
          onPlay={startGame}
          onDaily={startDaily}
          onResetProgress={handleReset}
        />
      )}

      {screen.type === 'game' && (
        <GameScreen
          board={screen.board}
          level={screen.level}
          isDaily={screen.isDaily}
          onComplete={handleComplete}
          onNextLevel={handleNextLevel}
          onHome={handleHome}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 39, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
});
