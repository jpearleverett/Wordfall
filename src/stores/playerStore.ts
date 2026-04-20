/**
 * playerStore.ts — zustand vanilla store mirror of PlayerContext state.
 *
 * Why: PlayerContext today stores ~60 fields in a single useState. Every
 * setData call re-renders every screen that called usePlayer(), even if the
 * screen only reads `currentLevel`. With this store, screens subscribe via
 * `usePlayerStore(selectCurrentLevel)` and only re-render when that slice
 * changes — same pattern as src/stores/gameStore.ts.
 *
 * Source of truth remains the Provider's useState. The Provider mirrors data
 * into this store via `useEffect([data])` so the existing 300ms/5s debounce,
 * AppState flush, mode-unlock reconciliation, and referral-init effects all
 * keep their `[data, loaded, user]` semantics intact. One extra Provider-
 * level render per setData is negligible compared to the consumer savings.
 */
import { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import type { PlayerData, PlayerContextType } from '../contexts/PlayerContext';

// ── Store ────────────────────────────────────────────────────────────────────

export type PlayerStore = ReturnType<typeof createPlayerStore>;

export const createPlayerStore = (initial: PlayerData) =>
  createStore<PlayerData>()(() => initial);

export const PlayerStoreContext = createContext<PlayerStore | null>(null);

export function usePlayerStore<T>(selector: (s: PlayerData) => T): T {
  const store = useContext(PlayerStoreContext);
  if (!store) {
    throw new Error('usePlayerStore must be used inside <PlayerProvider>');
  }
  return useStore(store, selector);
}

// ── Actions ──────────────────────────────────────────────────────────────────
// All ~45 PlayerContext methods + meta (loaded, cloudSyncStatus). Identity is
// stable because the Provider's useMemo over the same dependency list is
// already stable. Consumers grab actions without subscribing to state.

export type PlayerActions = Omit<PlayerContextType, keyof PlayerData>;

export const PlayerActionsContext = createContext<PlayerActions | null>(null);

export function usePlayerActions(): PlayerActions {
  const a = useContext(PlayerActionsContext);
  if (!a) {
    throw new Error('usePlayerActions must be used inside <PlayerProvider>');
  }
  return a;
}

// ── Pre-built selectors ──────────────────────────────────────────────────────
// Hot reads identified from greppping src/screens + src/components callers.
// Each is a pure function so React holds a stable reference.

export const selectCurrentLevel       = (s: PlayerData) => s.currentLevel;
export const selectHighestLevel       = (s: PlayerData) => s.highestLevel;
export const selectTotalScore         = (s: PlayerData) => s.totalScore;
export const selectPuzzlesSolved      = (s: PlayerData) => s.puzzlesSolved;
export const selectPerfectSolves      = (s: PlayerData) => s.perfectSolves;
export const selectCurrentChapter     = (s: PlayerData) => s.currentChapter;
export const selectStarsByLevel       = (s: PlayerData) => s.starsByLevel;
export const selectTotalStars         = (s: PlayerData) => s.totalStars;

export const selectDailyCompleted     = (s: PlayerData) => s.dailyCompleted;
export const selectLoginCycleDay      = (s: PlayerData) => s.loginCycleDay;

export const selectStreaks            = (s: PlayerData) => s.streaks;
export const selectCurrentStreak      = (s: PlayerData) => s.streaks.currentStreak;
export const selectBestStreak         = (s: PlayerData) => s.streaks.bestStreak;

export const selectCollections        = (s: PlayerData) => s.collections;

export const selectClubId             = (s: PlayerData) => s.clubId;
export const selectFriendIds          = (s: PlayerData) => s.friendIds;
export const selectFriendChallenges   = (s: PlayerData) => s.friendChallenges;

export const selectEquippedTheme      = (s: PlayerData) => s.equippedTheme;
export const selectEquippedFrame      = (s: PlayerData) => s.equippedFrame;
export const selectEquippedTitle      = (s: PlayerData) => s.equippedTitle;
export const selectUnlockedCosmetics  = (s: PlayerData) => s.unlockedCosmetics;

export const selectRestoredWings      = (s: PlayerData) => s.restoredWings;
export const selectPlacedDecorations  = (s: PlayerData) => s.placedDecorations;
export const selectOwnedDecorations   = (s: PlayerData) => s.ownedDecorations;

export const selectUnlockedModes      = (s: PlayerData) => s.unlockedModes;
export const selectModeStats          = (s: PlayerData) => s.modeStats;
export const selectModeLevels         = (s: PlayerData) => s.modeLevels;

export const selectTutorialComplete   = (s: PlayerData) => s.tutorialComplete;
export const selectFeaturesUnlocked   = (s: PlayerData) => s.featuresUnlocked;
export const selectOnboardingMilestones = (s: PlayerData) => s.onboardingMilestones;

export const selectAchievementIds     = (s: PlayerData) => s.achievementIds;
export const selectWeeklyGoals        = (s: PlayerData) => s.weeklyGoals;
export const selectPendingCeremonies  = (s: PlayerData) => s.pendingCeremonies;
export const selectTooltipsShown      = (s: PlayerData) => s.tooltipsShown;

export const selectFailCountByLevel   = (s: PlayerData) => s.failCountByLevel;
export const selectMysteryWheel       = (s: PlayerData) => s.mysteryWheel;
export const selectWinStreak          = (s: PlayerData) => s.winStreak;
export const selectFlawlessStreak     = (s: PlayerData) => s.flawlessStreak;
export const selectEventProgress      = (s: PlayerData) => s.eventProgress;
export const selectPuzzleEnergy       = (s: PlayerData) => s.puzzleEnergy;
export const selectSegments           = (s: PlayerData) => s.segments;
export const selectReferralCode       = (s: PlayerData) => s.referralCode;
export const selectReferralCount      = (s: PlayerData) => s.referralCount;
export const selectReferralMilestonesClaimed = (s: PlayerData) => s.referralMilestonesClaimed;
export const selectPrestige           = (s: PlayerData) => s.prestige;
export const selectSeasonalQuest      = (s: PlayerData) => s.seasonalQuest;
