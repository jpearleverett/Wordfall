import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerProgress, DEFAULT_PROGRESS } from '../types';

const PROGRESS_KEY = '@wordfall_progress';

export function useStorage() {
  const [progress, setProgress] = useState<PlayerProgress>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const data = await AsyncStorage.getItem(PROGRESS_KEY);
      if (data) {
        setProgress({ ...DEFAULT_PROGRESS, ...JSON.parse(data) });
      }
    } catch (e) {
      console.warn('Failed to load progress:', e);
    } finally {
      setLoaded(true);
    }
  };

  const saveProgress = useCallback(async (updates: Partial<PlayerProgress>) => {
    try {
      const newProgress = { ...progress, ...updates };
      setProgress(newProgress);
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  }, [progress]);

  const recordPuzzleComplete = useCallback(
    async (level: number, stars: number, score: number) => {
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = progress.lastPlayedDate !== today;
      const newStreak = isNewDay
        ? progress.currentStreak + 1
        : progress.currentStreak;

      await saveProgress({
        currentLevel: Math.max(progress.currentLevel, level + 1),
        highestLevel: Math.max(progress.highestLevel, level + 1),
        totalScore: progress.totalScore + score,
        puzzlesSolved: progress.puzzlesSolved + 1,
        perfectSolves:
          stars === 3
            ? progress.perfectSolves + 1
            : progress.perfectSolves,
        currentStreak: newStreak,
        bestStreak: Math.max(progress.bestStreak, newStreak),
        lastPlayedDate: today,
        starsByLevel: {
          ...progress.starsByLevel,
          [level]: Math.max(progress.starsByLevel[level] ?? 0, stars),
        },
      });
    },
    [progress, saveProgress]
  );

  const recordDailyComplete = useCallback(
    async (dateString: string) => {
      if (progress.dailyCompleted.includes(dateString)) return;
      await saveProgress({
        dailyCompleted: [...progress.dailyCompleted, dateString],
      });
    },
    [progress, saveProgress]
  );

  const resetProgress = useCallback(async () => {
    setProgress(DEFAULT_PROGRESS);
    await AsyncStorage.removeItem(PROGRESS_KEY);
  }, []);

  return {
    progress,
    loaded,
    saveProgress,
    recordPuzzleComplete,
    recordDailyComplete,
    resetProgress,
  };
}
