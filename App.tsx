import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import NeonTabBar from './src/components/navigation/NeonTabBar';
import { BoardGenBanner } from './src/components/BoardGenBanner';
import { NotSyncedBanner } from './src/components/NotSyncedBanner';
import { emitBoardGenNotice } from './src/utils/boardGenNotice';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import ModesScreen from './src/screens/ModesScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/screens/ShopScreen';
import CosmeticStoreScreen from './src/screens/CosmeticStoreScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ClubScreen from './src/screens/ClubScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import EventScreen from './src/screens/EventScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MasteryScreen from './src/screens/MasteryScreen';
import SeasonPassScreen from './src/screens/SeasonPassScreen';
import { ConsentGate } from './src/components/ConsentGate';
import { hasAcceptedTos } from './src/services/consent';
import { generateBoard, generateDailyBoard } from './src/engine/boardGenerator';
import { Board, CeremonyItem, Difficulty, GameMode, PlayerProgress } from './src/types';
import { getLevelConfig, COLORS, DIFFICULTY_CONFIGS, MODE_CONFIGS, ECONOMY, ENERGY, FONTS, SHADOWS } from './src/constants';
import { getBreatherConfig } from './src/constants';
import { getAdjustedConfig } from './src/engine/difficultyAdjuster';
import { useAuth } from './src/contexts/AuthContext';
import { useEconomy } from './src/contexts/EconomyContext';
import { useSettings } from './src/contexts/SettingsContext';
import { usePlayer } from './src/contexts/PlayerContext';
import { useHardEnergy } from './src/hooks/useHardEnergy';
import { NoLivesModal } from './src/components/NoLivesModal';
import { soundManager } from './src/services/sound';
import { setHapticsEnabled } from './src/services/haptics';
// ATLAS_PAGES and generateShareText moved to useRewardWiring
import { notificationManager } from './src/services/notifications';
import { installGlobalFontScaleClamp } from './src/components/common/Typography';
import { initI18n } from './src/i18n';
import { Providers } from './src/App/Providers';

// Clamp system font scaling once at module init so large-text settings can't
// break tight layouts (grid, HUD, shop pricing). See Typography.tsx for why.
installGlobalFontScaleClamp();

// Bootstrap i18n from device locale. Resolves to EN fallback for unsupported
// device languages. Fire-and-forget: errors land in the crash reporter.
void initI18n().catch(() => { /* fallback EN is already active */ });
import { CeremonyRouter } from './src/App/CeremonyRouter';
import { SessionEndReminder } from './src/components/SessionEndReminder';
import { MysteryWheel } from './src/components/MysteryWheel';
import { WheelSegment, MysteryWheelState, SPIN_COST_GEMS, SPIN_BUNDLE_COUNT } from './src/data/mysteryWheel';
import { analytics } from './src/services/analytics';
import { crashReporter } from './src/services/crashReporting';
import { funnelTracker } from './src/services/funnelTracker';
import { useDeepLinks } from './src/App/useDeepLinks';
import {
  triggerStreakReminder,
  triggerEventNotifications,
  triggerDailyChallengeReminder,
  triggerComebackReminder,
  cancelComebackReminder,
  triggerWinStreakMilestoneNotification,
} from './src/services/notificationTriggers';
import { eventManager } from './src/services/eventManager';
import { getRemoteBoolean } from './src/services/remoteConfig';
import { getChapterExtended, getLevelConfigExtended } from './src/engine/puzzleGenerator';
import {
  getPersonalizedHomeContent,
  getPersonalizedNotifications,
  getPersonalizedDifficulty,
  getRecommendedMode,
  getWelcomeBackMessage,
} from './src/services/playerSegmentation';
import { firestoreService, FirestoreGift } from './src/services/firestore';

// Extracted modules for decomposition
import { useRewardWiring, playerStageFromPuzzles } from './src/hooks/useRewardWiring';
import { useCeremonyQueue } from './src/hooks/useCeremonyQueue';
import { getLoginCalendarDay } from './src/data/loginCalendar';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const PlayStack = createNativeStackNavigator();
const CollectionsStack = createNativeStackNavigator();
const LibraryStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  // native-stack uses `contentStyle` for the screen background (JS stack
  // used `cardStyle`). Same effect, different field name.
  contentStyle: { backgroundColor: COLORS.bg },
  // Freeze screens that are pushed behind the current one. Without this, every
  // previous screen keeps running its backdrop animations, setIntervals, and
  // effects in the background — a 5-screen stack = 5x animation load.
  freezeOnBlur: true,
};

// Home Tab Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeMainScreen} />
      <HomeStack.Screen name="Shop" component={ShopScreen} />
      <HomeStack.Screen name="CosmeticStore" component={CosmeticStoreScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
      <HomeStack.Screen name="SeasonPass">
        {({ navigation }) => <SeasonPassScreen onBack={() => navigation.goBack()} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="Game" component={GameScreenWrapper} />
    </HomeStack.Navigator>
  );
}

// Play Tab Stack
// Event screen wrapper — wires navigation callbacks for Play and Shop buttons
function EventScreenWrapperNav({ navigation }: any) {
  const player = usePlayer();
  const economy = useEconomy();

  const handlePlayEventPuzzle = useCallback(() => {
    const mode: GameMode = 'classic';

    // Energy check (same pattern as ModesScreenWrapper)
    const isFreeMode = ENERGY.FREE_MODES.includes(mode);
    if (!isFreeMode) {
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        const minutesUntilNext = Math.ceil(player.getTimeUntilNextEnergy() / 60000);
        Alert.alert(
          'Take a Break!',
          `You've played a lot today! Your next energy refills in ${minutesUntilNext} minute${minutesUntilNext !== 1 ? 's' : ''}.\n\nOr refill all energy now:`,
          [
            { text: 'Wait', style: 'cancel' },
            { text: 'Watch Ad (+5)', onPress: () => { player.refillEnergy('ad'); } },
            {
              text: `Refill (${ENERGY.GEM_REFILL_COST} gems)`,
              onPress: () => {
                if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
                  player.refillEnergy('gems');
                } else {
                  Alert.alert('Not Enough Gems', 'Visit the shop to get more gems.');
                }
              },
            },
          ]
        );
        return;
      }
    }

    player.useEnergy(mode);

    try {
      const modeLevel = player.currentLevel;
      let config = getLevelConfig(modeLevel);
      const adjusted = getAdjustedConfig(config, player.performanceMetrics);
      config = adjusted.config;

      const seed = Date.now() + modeLevel * 1337;
      let board = generateBoard(config, seed, mode);
      const modeConfig = MODE_CONFIGS[mode];

      navigation.navigate('Game', {
        board,
        level: modeLevel,
        mode,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e: any) {
      if (e?.message?.includes('timed out')) {
        crashReporter.captureMessage(
          `board_gen_timeout mode=${mode} level=${player.currentLevel}`,
          'warning',
        );
        try {
          const easyConfig = { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' as const };
          const board = generateBoard(easyConfig, Date.now());
          const modeConfig = MODE_CONFIGS[mode];
          emitBoardGenNotice();
          navigation.navigate('Game', {
            board, level: player.currentLevel, mode,
            maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
            timeLimit: modeConfig.rules.timerSeconds || 0,
          });
        } catch (fallbackError) {
          crashReporter.captureException(
            fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            { tags: { step: 'board_gen_fallback' }, mode, level: player.currentLevel },
          );
          Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
        }
      } else {
        crashReporter.captureException(
          e instanceof Error ? e : new Error(String(e?.message ?? e)),
          { tags: { step: 'board_gen' }, mode, level: player.currentLevel },
        );
        Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      }
    }
  }, [player, economy, navigation]);

  return (
    <EventScreen
      onPlayEventPuzzle={handlePlayEventPuzzle}
      onOpenEventShop={() => navigation.navigate('Home', { screen: 'Shop' })}
    />
  );
}

function PlayStackScreen() {
  return (
    <PlayStack.Navigator screenOptions={screenOptions}>
      <PlayStack.Screen name="Modes" component={ModesScreenWrapper} />
      <PlayStack.Screen name="Game" component={GameScreenWrapper} />
      <PlayStack.Screen name="Event" component={EventScreenWrapperNav} />
      <PlayStack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </PlayStack.Navigator>
  );
}

// Collections Tab Stack
function CollectionsStackScreen() {
  return (
    <CollectionsStack.Navigator screenOptions={screenOptions}>
      <CollectionsStack.Screen name="CollectionsMain" component={CollectionsScreen} />
    </CollectionsStack.Navigator>
  );
}

// Library Tab Stack
function LibraryStackScreen() {
  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
    </LibraryStack.Navigator>
  );
}

// Profile screen wrapper — wires navigation callbacks for Settings gear and Edit Profile
function ProfileMainScreen({ navigation }: any) {
  return (
    <ProfileScreen
      onOpenSettings={() => navigation.navigate('Settings')}
      onEditProfile={() => navigation.navigate('EditProfile')}
      onOpenMastery={() => navigation.navigate('Mastery')}
    />
  );
}

function MasteryScreenWrapper({ navigation }: any) {
  return <MasteryScreen onBack={() => navigation.goBack()} />;
}

// Profile Tab Stack
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileMainScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Club" component={ClubScreen} />
      <ProfileStack.Screen name="Mastery" component={MasteryScreenWrapper} />
    </ProfileStack.Navigator>
  );
}

// Tab icon component — Neon Intelligence design: vector icons with precision glow
// Styles extracted to avoid creating new objects on every render
const tabIconFocusedText = {
  textShadowColor: COLORS.accentGlow,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
} as const;

const tabIconIndicator = {
  width: 20,
  height: 3,
  borderRadius: 1.5,
  backgroundColor: COLORS.accent,
  marginTop: 4,
  shadowColor: COLORS.accent,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.9,
  shadowRadius: 6,
  elevation: 4,
} as const;

const tabIconContainer = { alignItems: 'center' as const };

function TabIcon({ iconName, focused }: { iconName: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={tabIconContainer}>
      <Ionicons
        name={iconName}
        size={22}
        color={focused ? COLORS.accent : COLORS.textMuted}
        style={focused ? tabIconFocusedText : undefined}
      />
      {focused && <View style={tabIconIndicator} />}
    </View>
  );
}

// Helper: get difficulty name for a level
function getDifficultyForLevel(level: number): string {
  if (level <= 5) return 'Easy';
  if (level <= 15) return 'Medium';
  if (level <= 30) return 'Hard';
  return 'Expert';
}

// Helper: detect difficulty transition between two levels
function detectDifficultyTransition(oldLevel: number, newLevel: number): { from: string; to: string } | null {
  const thresholds = [
    { at: 6, from: 'Easy', to: 'Medium' },
    { at: 16, from: 'Medium', to: 'Hard' },
    { at: 31, from: 'Hard', to: 'Expert' },
  ];
  for (const t of thresholds) {
    if (oldLevel < t.at && newLevel >= t.at) {
      return { from: t.from, to: t.to };
    }
  }
  return null;
}

// Main Tab Navigator with progressive tab unlocking
function MainTabs() {
  const insets = useSafeAreaInsets();
  const player = usePlayer();

  const hasFeature = (id: string) => player.featuresUnlocked.includes(id);

  return (
    <Tab.Navigator
      tabBar={(props) => <NeonTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Freeze inactive tabs so their timers, animations, and effects pause.
        // This is the single biggest perf win in a multi-tab app — without it
        // every tab keeps running its AmbientBackdrop reanimated loops, video
        // backgrounds, and setInterval timers in the background.
        freezeOnBlur: true,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontFamily: FONTS.bodySemiBold,
          fontSize: 10,
          letterSpacing: 0.6,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'game-controller' : 'game-controller-outline'} focused={focused} />,
        }}
      />
      {hasFeature('tab_collections') && (
        <Tab.Screen
          name="Collections"
          component={CollectionsStackScreen}
          options={{
            tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'diamond' : 'diamond-outline'} focused={focused} />,
          }}
        />
      )}
      {hasFeature('tab_library') && (
        <Tab.Screen
          name="Library"
          component={LibraryStackScreen}
          options={{
            tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'library' : 'library-outline'} focused={focused} />,
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Modes screen wrapper - wires navigation to start game in selected mode
function ModesScreenWrapper({ navigation }: any) {
  const player = usePlayer();
  const economy = useEconomy();

  const handleSelectMode = useCallback((modeId: string) => {
    const mode = modeId as GameMode;

    // Energy check — free modes (daily, endless, relax) cost 0 energy
    const isFreeMode = ENERGY.FREE_MODES.includes(mode);
    if (!isFreeMode) {
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        const minutesUntilNext = Math.ceil(player.getTimeUntilNextEnergy() / 60000);
        Alert.alert(
          'Take a Break!',
          `You've played a lot today! Your next energy refills in ${minutesUntilNext} minute${minutesUntilNext !== 1 ? 's' : ''}.\n\nOr refill all energy now:`,
          [
            { text: 'Wait', style: 'cancel' },
            { text: 'Watch Ad (+5)', onPress: () => { player.refillEnergy('ad'); } },
            {
              text: `Refill (${ENERGY.GEM_REFILL_COST} gems)`,
              onPress: () => {
                if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
                  player.refillEnergy('gems');
                } else {
                  Alert.alert('Not Enough Gems', 'Visit the shop to get more gems.');
                }
              },
            },
          ]
        );
        return;
      }
    }

    // Spend energy (free modes handled internally — returns true immediately)
    player.useEnergy(mode);

    // Declared outside the try so the catch-block fallback path can reassign them.
    let board: Board | undefined;
    let modeLevel = 0;

    try {
      void analytics.logEvent('mode_started', {
        modeId,
        playerLevel: player.currentLevel,
      });

      if (mode === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        board = generateDailyBoard(today);
        navigation.navigate('Game', { board, level: 0, mode: 'daily', isDaily: true });
        return;
      }

      if (mode === 'weekly') {
        board = generateBoard(DIFFICULTY_CONFIGS.hard, Date.now());
        navigation.navigate('Game', { board, level: 0, mode: 'weekly' });
        return;
      }

      // Each mode has its own independent level progression.
      // Classic uses the global player level; all other modes track their own.
      modeLevel = mode === 'classic'
        ? player.currentLevel
        : player.getModeLevel(mode);

      let config = getLevelConfig(modeLevel);

      // Apply adaptive difficulty adjustment
      const adjusted = getAdjustedConfig(config, player.performanceMetrics);
      config = adjusted.config;

      const seed = Date.now() + modeLevel * 1337;
      board = generateBoard(config, seed, mode);

      const modeConfig = MODE_CONFIGS[mode];
      navigation.navigate('Game', {
        board,
        level: modeLevel,
        mode,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e: any) {
      if (e?.message?.includes('timed out')) {
        crashReporter.captureMessage(
          `board_gen_timeout (mode-select) mode=${mode} level=${modeLevel}`,
          'warning',
        );
        try {
          const easyConfig = { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' as const };
          board = generateBoard(easyConfig, Date.now());
          const modeConfig = MODE_CONFIGS[mode];
          emitBoardGenNotice();
          navigation.navigate('Game', {
            board, level: modeLevel, mode,
            maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
            timeLimit: modeConfig.rules.timerSeconds || 0,
          });
        } catch (fallbackError) {
          crashReporter.captureException(
            fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            { tags: { step: 'board_gen_fallback_mode_select' }, mode, level: modeLevel },
          );
          Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
        }
      } else {
        crashReporter.captureException(
          e instanceof Error ? e : new Error(String(e?.message ?? e)),
          { tags: { step: 'board_gen_mode_select' }, mode, level: modeLevel },
        );
        Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
      }
    }
  }, [player.currentLevel, navigation, player, economy]);

  return <ModesScreen onSelectMode={handleSelectMode} onOpenLeaderboard={() => navigation.navigate('Leaderboard')} />;
}

// Wrapper to pass navigation params to GameScreen with full context wiring
function GameScreenWrapper({ route, navigation }: any) {
  const params = route.params || {};
  const { user } = useAuth();
  const player = usePlayer();
  const economy = useEconomy();
  const hardEnergy = useHardEnergy();
  const [showSpinPrompt, setShowSpinPrompt] = useState(false);
  const [earnedNewSpin, setEarnedNewSpin] = useState(false);
  const spinsBeforeComplete = useRef(0);
  const [pendingNavAction, setPendingNavAction] = useState<'home' | 'next' | null>(null);

  // Phase 4B hard-energy gate. When the Remote Config flag is on and the
  // player is out of lives, block the board from loading and show
  // NoLivesModal. One debit per level load (tracked by route key + level).
  const [showNoLives, setShowNoLives] = useState(false);
  const debitedLevelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hardEnergy.enabled) return;
    const key = `${params.mode ?? 'classic'}:${params.level ?? 0}:${route.key}`;
    if (debitedLevelRef.current === key) return;
    debitedLevelRef.current = key;
    if (!hardEnergy.canPlay) {
      setShowNoLives(true);
      return;
    }
    const { started } = hardEnergy.startLevel();
    if (!started) setShowNoLives(true);
  }, [hardEnergy, params.mode, params.level, route.key]);

  const handleNoLivesClose = useCallback(() => {
    setShowNoLives(false);
    navigation.goBack();
  }, [navigation]);

  const handleNoLivesWatchAd = useCallback(async () => {
    try {
      const { adManager } = await import('./src/services/ads');
      const result = await adManager.showRewardedAd('life_reward');
      if (result.rewarded) {
        hardEnergy.creditAdLife();
        setShowNoLives(false);
      }
    } catch (err) {
      if (__DEV__) console.warn('[HardEnergy] rewarded ad failed:', err);
    }
  }, [hardEnergy]);

  const handleNoLivesSpendGems = useCallback(() => {
    const ok = hardEnergy.refillWithGems();
    if (ok) setShowNoLives(false);
  }, [hardEnergy]);

  // Delegate reward wiring to extracted hook
  const handleCompleteInner = useRewardWiring({
    player,
    economy,
    userId: user?.uid || '',
    params,
    navigation,
  });

  const handleComplete = useCallback((stars: number, score: number, maxCombo: number) => {
    // Track spins before completion to detect if a new one is awarded
    spinsBeforeComplete.current = player.mysteryWheel.spinsAvailable;
    handleCompleteInner(stars, score, maxCombo);
  }, [handleCompleteInner, player.mysteryWheel.spinsAvailable]);

  const handleNextLevel = useCallback(() => {
    try {
      // Spend energy for next level (free modes handled internally)
      const mode = (params.mode || 'classic') as GameMode;
      player.useEnergy(mode);

      // Each mode has its own level progression (classic uses global level)
      // advanceModeLevel was already called in handleComplete on win,
      // so getModeLevel returns the new (incremented) level
      const modeLevel = mode === 'classic'
        ? (params.level || 0) + 1  // classic uses params.level which is global
        : player.getModeLevel(mode);

      // Check if player needs a breather level
      const useBreather = player.needsBreather();
      let config = useBreather ? getBreatherConfig(modeLevel) : getLevelConfig(modeLevel);

      // Apply adaptive difficulty (only when not in breather mode)
      if (!useBreather) {
        const adjusted = getAdjustedConfig(config, player.performanceMetrics);
        config = adjusted.config;
      }

      const seed = modeLevel * 1337 + Date.now();
      let board = generateBoard(config, seed, mode);
      const modeConfig = MODE_CONFIGS[mode];

      navigation.replace('Game', {
        board,
        level: modeLevel,
        mode,
        isDaily: false,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e: any) {
      const fallbackMode = (params.mode || 'classic') as GameMode;
      const fallbackLevel = fallbackMode === 'classic' ? (params.level || 0) + 1 : player.getModeLevel(fallbackMode);
      if (e?.message?.includes('timed out')) {
        crashReporter.captureMessage(
          `board_gen_timeout (next-puzzle) mode=${fallbackMode} level=${fallbackLevel}`,
          'warning',
        );
        try {
          const easyConfig = { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' as const };
          const board = generateBoard(easyConfig, Date.now());
          const modeConfig = MODE_CONFIGS[fallbackMode];
          emitBoardGenNotice();
          navigation.replace('Game', {
            board, level: fallbackLevel, mode: fallbackMode, isDaily: false,
            maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
            timeLimit: modeConfig.rules.timerSeconds || 0,
          });
        } catch (fallbackError) {
          crashReporter.captureException(
            fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            { tags: { step: 'board_gen_fallback_next' }, mode: fallbackMode, level: fallbackLevel },
          );
          Alert.alert('Error', 'Failed to generate next puzzle.');
          navigation.goBack();
        }
      } else {
        crashReporter.captureException(
          e instanceof Error ? e : new Error(String(e?.message ?? e)),
          { tags: { step: 'board_gen_next' }, mode: fallbackMode, level: fallbackLevel },
        );
        Alert.alert('Error', 'Failed to generate next puzzle.');
        navigation.goBack();
      }
    }
  }, [params, navigation, player]);

  const handleSkipLevel = useCallback(() => {
    const SKIP_COST = 200;
    if (!economy.spendCoins(SKIP_COST)) return;
    // Hoisted so the timeout-fallback catch can reuse the same target level.
    let nextModeLevel = 0;
    try {
      const mode = (params.mode || 'classic') as GameMode;
      const currentLevel = params.level || 1;

      // Advance past the current level (recordPuzzleComplete sets currentLevel = level + 1)
      if (mode === 'classic') {
        player.recordPuzzleComplete(currentLevel, 0, 0, false);
      } else {
        player.advanceModeLevel(mode);
      }

      nextModeLevel = mode === 'classic'
        ? currentLevel + 1
        : player.getModeLevel(mode);

      const config = getLevelConfig(nextModeLevel);
      const seed = nextModeLevel * 1337 + Date.now();
      let board = generateBoard(config, seed, mode);
      const modeConfig = MODE_CONFIGS[mode];

      navigation.replace('Game', {
        board,
        level: nextModeLevel,
        mode,
        isDaily: false,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e: any) {
      const fallbackMode = (params.mode || 'classic') as GameMode;
      if (e?.message?.includes('timed out')) {
        crashReporter.captureMessage(
          `board_gen_timeout (retry) mode=${fallbackMode} level=${nextModeLevel}`,
          'warning',
        );
        try {
          const easyConfig = { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' as const };
          const board = generateBoard(easyConfig, Date.now());
          const modeConfig = MODE_CONFIGS[fallbackMode];
          emitBoardGenNotice();
          navigation.replace('Game', {
            board, level: nextModeLevel, mode: fallbackMode, isDaily: false,
            maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
            timeLimit: modeConfig.rules.timerSeconds || 0,
          });
        } catch (fallbackError) {
          crashReporter.captureException(
            fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            { tags: { step: 'board_gen_fallback_retry' }, mode: fallbackMode, level: nextModeLevel },
          );
          Alert.alert('Error', 'Failed to generate next puzzle.');
          navigation.goBack();
        }
      } else {
        crashReporter.captureException(
          e instanceof Error ? e : new Error(String(e?.message ?? e)),
          { tags: { step: 'board_gen_retry' }, mode: fallbackMode, level: nextModeLevel },
        );
        Alert.alert('Error', 'Failed to generate next puzzle.');
        navigation.goBack();
      }
    }
  }, [params, navigation, player, economy]);

  if (!params.board) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: COLORS.textMuted }}>No puzzle loaded</Text>
      </View>
    );
  }

  // Extract completion data from params (set by handleComplete)
  const completionData = params.completionData || {};

  // Detect when a new spin is earned during puzzle completion
  useEffect(() => {
    if (player.mysteryWheel.spinsAvailable > spinsBeforeComplete.current) {
      setEarnedNewSpin(true);
    }
  }, [player.mysteryWheel.spinsAvailable]);

  // Only show spin prompt when a NEW spin was earned this puzzle, not for old spins
  const handleHomeWithPrompt = useCallback(() => {
    if (earnedNewSpin) {
      setPendingNavAction('home');
      setShowSpinPrompt(true);
    } else {
      navigation.goBack();
    }
  }, [earnedNewSpin, navigation]);

  const handleNextWithPrompt = useCallback(() => {
    if (earnedNewSpin) {
      setPendingNavAction('next');
      setShowSpinPrompt(true);
    } else {
      handleNextLevel();
    }
  }, [earnedNewSpin, handleNextLevel]);

  const handleSpinPromptAccept = useCallback(() => {
    setShowSpinPrompt(false);
    setEarnedNewSpin(false);
    setPendingNavAction(null);
    // Navigate to Home tab, then to HomeMain screen with openWheel param
    navigation.navigate('Home', { screen: 'HomeMain', params: { openWheel: true } });
  }, [navigation]);

  const handleSpinPromptDismiss = useCallback(() => {
    setShowSpinPrompt(false);
    setEarnedNewSpin(false);
    if (pendingNavAction === 'home') {
      navigation.goBack();
    } else if (pendingNavAction === 'next') {
      handleNextLevel();
    }
    setPendingNavAction(null);
  }, [pendingNavAction, navigation, handleNextLevel]);

  // Memoised so GameScreen (wrapped in React.memo) doesn't receive a fresh
  // callback identity on every GameScreenWrapper render.
  const handleNavigate = useCallback((screen: string, params?: Record<string, unknown>) => {
    const screenRoutes: Record<string, { tab: string; screen: string }> = {
      Mastery: { tab: 'Profile', screen: 'Mastery' },
      Library: { tab: 'Library', screen: 'LibraryMain' },
    };
    const route = screenRoutes[screen];
    if (route) {
      navigation.navigate(route.tab as never, {
        screen: route.screen,
        ...(params ? { params } : {}),
      } as never);
    } else {
      navigation.navigate(screen as never);
    }
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      <GameScreen
        board={params.board}
        level={params.level || 0}
        isDaily={params.isDaily || false}
        mode={params.mode || 'classic'}
        maxMoves={params.maxMoves || 0}
        timeLimit={params.timeLimit || 0}
        onComplete={handleComplete}
        onNextLevel={handleNextWithPrompt}
        onHome={handleHomeWithPrompt}
        isFirstWin={completionData.isFirstWin}
        leveledUp={completionData.leveledUp}
        newLevel={completionData.newLevel}
        difficultyTransition={completionData.difficultyTransition}
        nextLevelPreview={completionData.nextLevelPreview}
        shareText={completionData.shareText}
        friendComparison={completionData.friendComparison}
        eventMultiplierLabel={completionData.eventMultiplierLabel}
        showTomorrowPreview={completionData.showTomorrowPreview}
        summaryItems={completionData.summaryItems}
        totalCoinsAwarded={completionData.totalCoinsAwarded}
        totalGemsAwarded={completionData.totalGemsAwarded}
        nextUnlockPreview={completionData.nextUnlockPreview}
        onNavigate={handleNavigate}
      />

      {/* Post-puzzle spin prompt */}
      {showSpinPrompt && (
        <View style={spinPromptStyles.overlay}>
          <View style={spinPromptStyles.card}>
            <Text style={spinPromptStyles.icon}>{'\u{1F3B0}'}</Text>
            <Text style={spinPromptStyles.title}>Free Spin Available!</Text>
            <Text style={spinPromptStyles.subtitle}>
              You have {player.mysteryWheel.spinsAvailable} spin{player.mysteryWheel.spinsAvailable !== 1 ? 's' : ''} on the Mystery Wheel
            </Text>
            <Pressable
              style={({ pressed }) => [spinPromptStyles.spinButton, pressed && { transform: [{ scale: 0.96 }], opacity: 0.88 }]}
              onPress={handleSpinPromptAccept}
            >
              <Text style={spinPromptStyles.spinButtonText}>SPIN NOW</Text>
            </Pressable>
            <Pressable
              style={spinPromptStyles.skipButton}
              onPress={handleSpinPromptDismiss}
            >
              <Text style={spinPromptStyles.skipText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Phase 4B hard-energy: shown only when Remote Config flag is on */}
      <NoLivesModal
        visible={showNoLives}
        livesRemaining={hardEnergy.livesRemaining}
        gemsAvailable={economy.gems}
        gemRefillCost={hardEnergy.gemRefillCost}
        nextLifeAtMs={hardEnergy.nextLifeAtMs}
        onClose={handleNoLivesClose}
        onWatchAd={handleNoLivesWatchAd}
        onSpendGems={handleNoLivesSpendGems}
      />
    </View>
  );
}

// Home main screen wrapper - uses PlayerContext instead of legacy useStorage
function HomeMainScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const player = usePlayer();
  const economy = useEconomy();
  const [loading, setLoading] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [comebackCoins, setComebackCoins] = useState(0);
  const [comebackHints, setComebackHints] = useState(0);
  const welcomeAnim = React.useRef(new Animated.Value(0)).current;

  // Ceremony queue moved to AppContent level so modals overlay all screens

  // Pending gifts from Firestore
  const [pendingGifts, setPendingGifts] = useState<FirestoreGift[]>([]);
  const [claimingGift, setClaimingGift] = useState(false);

  // Session end reminder
  const [showSessionReminder, setShowSessionReminder] = useState(false);

  // Mystery Wheel state
  const [showMysteryWheel, setShowMysteryWheel] = useState(false);
  const [freeSpinToast, setFreeSpinToast] = useState(false);
  const prevSpinsRef = React.useRef(player.mysteryWheel.spinsAvailable);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for comeback rewards and process ceremonies on mount
  useEffect(() => {
    if (player.loaded) {
      // Initialize event manager with saved progress
      eventManager.init(player.eventProgress);

      void analytics.startSession('app_launch');
      void analytics.trackAppOpen();
      // hard_energy_enabled lets Firebase A/B Testing slice retention/revenue
      // by the Remote Config flag the client actually observed at boot.
      const hardEnergyOn = (() => {
        try { return getRemoteBoolean('hardEnergyEnabled'); } catch { return false; }
      })();
      void analytics.updateUserProperties({
        player_level: player.currentLevel,
        total_puzzles_solved: player.puzzlesSolved,
        days_since_install: analytics.getDaysSinceInstall(),
        player_stage: playerStageFromPuzzles(player.puzzlesSolved),
        is_payer: false, // Updated when IAP completes
        total_spend: 0,
        hard_energy_enabled: hardEnergyOn,
      });
      void analytics.logEvent('streak_count', {
        currentStreak: player.streaks.currentStreak,
        bestStreak: player.streaks.bestStreak,
      });
      const rewards = player.checkComebackRewards();
      if (rewards.length > 0) {
        const is7day = rewards.some(r => r.includes('7day'));
        const is14day = rewards.some(r => r.includes('14day'));
        const coins = is14day ? 500 : is7day ? 350 : 200;
        const hints = is14day ? 15 : is7day ? 10 : 5;
        setComebackCoins(coins);
        setComebackHints(hints);
        economy.addCoins(coins);
        economy.addHintTokens(hints);
        setShowWelcomeBack(true);
        Animated.spring(welcomeAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }
      player.updateStreak();
      player.generateDailyMissions();
      player.initWeeklyGoals();

      // Check for any feature/mode unlocks the player has earned but not yet seen
      const level = player.currentLevel || 1;
      const featureCeremonies = player.checkFeatureUnlocks(level);
      for (const ceremony of featureCeremonies) {
        player.queueCeremony(ceremony);
      }
      for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
        if (config.unlockLevel <= level && !player.unlockedModes.includes(modeId)) {
          player.unlockMode(modeId);
          player.queueCeremony({
            type: 'mode_unlock',
            data: {
              modeId,
              modeName: config.name,
              modeIcon: config.icon,
              modeDescription: config.description,
              modeColor: config.color,
            },
          });
        }
      }

      // Recompute player segments on session start
      const totalSpendCents = economy.purchaseHistory.reduce(
        (sum: number, p: { amount: number }) => sum + Math.round(p.amount * 100), 0,
      );
      player.recomputeSegments(totalSpendCents, 0);

      // Initialize notifications with segment-personalized scheduling
      void notificationManager.init().then(() => {
        const notifConfig = getPersonalizedNotifications(player.segments);
        // Streak reminder at 8 PM daily (if player has a streak)
        if (notifConfig.enabledCategories.includes('streak_reminder')) {
          void triggerStreakReminder(player.streaks.currentStreak);
        }
        // Daily challenge reminder at 9 AM
        if (notifConfig.enabledCategories.includes('daily_challenge')) {
          void triggerDailyChallengeReminder();
        }
        // Event ending reminders for any active events
        void triggerEventNotifications();
        // Cancel any pending comeback reminder since the player is active now
        void cancelComebackReminder();
      });

      // ── Firestore social: sync profile + check gifts on app open ──
      const userId = user?.uid || '';
      if (userId && firestoreService.isAvailable()) {
        void firestoreService.syncPlayerProfile(userId, {
          displayName: player.equippedTitle || 'Player',
          level: player.currentLevel,
          puzzlesSolved: player.puzzlesSolved,
          totalScore: player.totalScore,
          currentStreak: player.streaks.currentStreak,
          equippedFrame: player.equippedFrame,
          equippedTitle: player.equippedTitle,
        }).catch((e: unknown) => {
          if (__DEV__) console.warn('Firestore profile sync failed:', e);
        });
        void firestoreService.generateFriendCode(userId).catch((e: unknown) => {
          if (__DEV__) console.warn('Firestore friend code generation failed:', e);
        });
        void firestoreService.getPendingGifts(userId).then((gifts) => {
          if (gifts.length > 0) setPendingGifts(gifts);
        }).catch((e: unknown) => {
          if (__DEV__) console.warn('Firestore gift check failed:', e);
        });
      }

      // Ceremony processing is now handled by useCeremonyQueue hook
    }
  }, [player.loaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void analytics.startSession('foreground');
        // Player returned — cancel any pending comeback reminder
        void cancelComebackReminder();
      } else if (state === 'background') {
        void analytics.endSession('background');
        // Player left — schedule comeback reminder for 3 days from now
        void triggerComebackReminder();
      }
    });
    return () => {
      sub.remove();
      analytics.destroy();
    };
  }, []);

  // Auto-open wheel when navigating back from post-puzzle spin prompt
  useEffect(() => {
    if (route?.params?.openWheel) {
      wheelTimerRef.current = setTimeout(() => setShowMysteryWheel(true), 400);
      // Clear the param so it doesn't re-trigger
      navigation.setParams({ openWheel: undefined });
    }
    return () => {
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [route?.params?.openWheel, navigation]);

  // Detect when a free spin is awarded and show toast
  useEffect(() => {
    if (player.loaded && player.mysteryWheel.spinsAvailable > prevSpinsRef.current) {
      setFreeSpinToast(true);
      toastTimerRef.current = setTimeout(() => setFreeSpinToast(false), 3500);
    }
    prevSpinsRef.current = player.mysteryWheel.spinsAvailable;
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [player.mysteryWheel.spinsAvailable, player.loaded]);

  // Mystery Wheel handlers
  const handleWheelSpin = useCallback(({ segment, updatedState, mysteryBoxReward }: { segment: WheelSegment; updatedState: MysteryWheelState; mysteryBoxReward?: { label: string; icon: string; reward: any } }) => {
    // Update wheel state in player context
    player.updateMysteryWheel(updatedState);

    // Award rewards from the spin result
    const reward = segment.reward;
    if (reward.coins) economy.addCoins(reward.coins);
    if (reward.gems) economy.addGems(reward.gems);
    if (reward.hints) economy.addHintTokens(reward.hints);
    if (reward.rareTile) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      player.addRareTile(randomLetter);
    }
    if (reward.booster) {
      economy.addHintTokens(3);
    }

    // Award mystery box contents if the spin landed on a mystery box
    if (mysteryBoxReward) {
      const mbReward = mysteryBoxReward.reward;
      if (mbReward.coins) economy.addCoins(mbReward.coins);
      if (mbReward.gems) economy.addGems(mbReward.gems);
      if (mbReward.hints) economy.addHintTokens(mbReward.hints);
      if (mbReward.rareTile) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        player.addRareTile(letters[Math.floor(Math.random() * letters.length)]);
      }
    }

    // Queue jackpot ceremony for rare+ results
    if (segment.rarity === 'rare' || segment.rarity === 'epic' || segment.rarity === 'legendary') {
      player.queueCeremony({
        type: 'mystery_wheel_jackpot',
        data: {
          icon: segment.icon,
          label: segment.label,
          rewardLabel: segment.label,
        },
      });
    }
  }, [player, economy]);

  const handleWheelBuySpin = useCallback((cost: number, count: number) => {
    const spent = economy.spendGems(cost);
    if (spent) {
      player.updateMysteryWheel({
        spinsAvailable: player.mysteryWheel.spinsAvailable + count,
      });
    }
  }, [economy, player]);

  const handleWheelDismiss = useCallback(() => {
    setShowMysteryWheel(false);
  }, []);

  // ── Gift claiming ──
  const handleClaimAllGifts = useCallback(async () => {
    if (pendingGifts.length === 0 || claimingGift) return;
    setClaimingGift(true);
    let totalHints = 0;
    let totalTiles = 0;
    for (const gift of pendingGifts) {
      const claimed = await firestoreService.claimGift(gift.id);
      if (claimed || !firestoreService.isAvailable()) {
        if (gift.type === 'hint') {
          totalHints += gift.amount;
        } else {
          totalTiles += gift.amount;
        }
      }
    }
    if (totalHints > 0) economy.addHintTokens(totalHints);
    if (totalTiles > 0) {
      for (let i = 0; i < totalTiles; i++) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        player.addRareTile(letters[Math.floor(Math.random() * letters.length)]);
      }
    }
    setPendingGifts([]);
    setClaimingGift(false);
    const parts: string[] = [];
    if (totalHints > 0) parts.push(`${totalHints} hint${totalHints > 1 ? 's' : ''}`);
    if (totalTiles > 0) parts.push(`${totalTiles} rare tile${totalTiles > 1 ? 's' : ''}`);
    if (parts.length > 0) {
      Alert.alert('Gifts Claimed!', `You received ${parts.join(' and ')} from friends!`);
    }
  }, [pendingGifts, claimingGift, economy, player]);

  // Ceremony tracking & dismissal now handled by useCeremonyQueue hook

  // Convert PlayerContext data to PlayerProgress for HomeScreen
  const progress: PlayerProgress = {
    currentLevel: player.currentLevel,
    highestLevel: player.highestLevel,
    totalScore: player.totalScore,
    puzzlesSolved: player.puzzlesSolved,
    perfectSolves: player.perfectSolves,
    bestStreak: player.streaks.bestStreak,
    currentStreak: player.streaks.currentStreak,
    lastPlayedDate: player.streaks.lastPlayDate,
    dailyCompleted: player.dailyCompleted,
    starsByLevel: player.starsByLevel,
  };

  // Determine player stage for progressive disclosure
  const playerStage = player.puzzlesSolved <= 2 ? 'new'
    : player.puzzlesSolved <= 10 ? 'early'
    : player.puzzlesSolved <= 30 ? 'established'
    : 'veteran';

  // Segment-driven personalized home content
  const segmentHomeContent = React.useMemo(
    () => getPersonalizedHomeContent(player.segments),
    [player.segments],
  );

  // Segment-driven welcome back message for at-risk/lapsed/returned
  const segmentWelcomeMessage = React.useMemo(
    () => getWelcomeBackMessage(player.segments),
    [player.segments],
  );

  // Personalized recommendation (segment-aware)
  const recommendation = React.useMemo(() => {
    if (playerStage === 'new') return null;

    // Use segment-recommended mode as primary suggestion
    const segmentMode = getRecommendedMode(player.segments);
    const segmentConfig = MODE_CONFIGS[segmentMode];

    // Suggest untried modes (prefer segment-recommended if untried)
    const untriedModes = player.unlockedModes.filter(
      (m: string) => !player.modeStats[m] || player.modeStats[m].played === 0
    );

    // If segment-recommended mode is unlocked and untried, suggest it first
    if (untriedModes.includes(segmentMode) && segmentConfig) {
      return {
        icon: segmentConfig.icon || '🎮',
        title: `Try ${segmentConfig.name} Mode`,
        subtitle: player.segments.motivations.includes('competitor')
          ? 'Compete against others in this mode!'
          : player.segments.motivations.includes('achiever')
          ? 'Perfect for earning stars and achievements!'
          : 'You unlocked this mode — give it a go!',
        action: () => navigation.navigate('Play'),
      };
    }

    // Fallback: any untried mode
    if (untriedModes.length > 0) {
      const modeId = untriedModes[0];
      const config = MODE_CONFIGS[modeId as GameMode];
      return {
        icon: config?.icon || '🎮',
        title: `Try ${config?.name || modeId} Mode`,
        subtitle: 'You unlocked this mode — give it a go!',
        action: () => navigation.navigate('Play'),
      };
    }

    // Suggest daily if not done
    const today = new Date().toISOString().split('T')[0];
    if (!player.dailyCompleted.includes(today)) {
      return {
        icon: '☀️',
        title: 'Daily Challenge',
        subtitle: player.segments.motivations.includes('competitor')
          ? "Beat your friends on today's puzzle!"
          : 'Same puzzle for everyone — compete globally!',
        action: () => navigation.navigate('Play' as never),
      };
    }

    // Segment-driven default recommendation
    if (player.segments.motivations.includes('completionist')) {
      return {
        icon: '📚',
        title: 'Complete Your Collection',
        subtitle: "Check your atlas for words you haven't found yet!",
        action: () => navigation.navigate('Collections' as never),
      };
    }

    // Default: suggest harder difficulty
    return {
      icon: '⚡',
      title: 'Push Your Limits',
      subtitle: 'Try a harder difficulty to earn more stars!',
      action: () => navigation.navigate('Play' as never),
    };
  }, [playerStage, player.segments, player.unlockedModes, player.modeStats, player.dailyCompleted, navigation]);

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
      // Energy check — classic mode costs 1 energy
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        // Truly out of energy + bonus plays — show friendly "take a break" prompt
        const minutesUntilNext = Math.ceil(player.getTimeUntilNextEnergy() / 60000);
        Alert.alert(
          'Take a Break!',
          `You've played a lot today! Your next energy refills in ${minutesUntilNext} minute${minutesUntilNext !== 1 ? 's' : ''}.\n\nOr refill all energy now:`,
          [
            { text: 'Wait', style: 'cancel' },
            { text: 'Watch Ad (+5)', onPress: () => { player.refillEnergy('ad'); } },
            {
              text: `Refill (${ENERGY.GEM_REFILL_COST} gems)`,
              onPress: () => {
                if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
                  player.refillEnergy('gems');
                } else {
                  Alert.alert('Not Enough Gems', 'Visit the shop to get more gems.');
                }
              },
            },
          ]
        );
        return;
      }

      // Spend energy (handles free modes, bonus plays internally)
      player.useEnergy('classic');

      setLoading(true);
      setTimeout(() => {
        try {
          let config;
          if (difficulty) {
            config = DIFFICULTY_CONFIGS[difficulty];
          } else if (player.needsBreather()) {
            config = getBreatherConfig(player.currentLevel);
          } else {
            config = getLevelConfig(player.currentLevel);
            // Apply adaptive difficulty adjustment (invisible to player)
            const adjusted = getAdjustedConfig(config, player.performanceMetrics);
            config = adjusted.config;
          }
          const level = difficulty ? 0 : player.currentLevel;
          const board = generateBoard(config, level * 1337 + Date.now());
          setLoading(false);
          navigation.navigate('Game', { board, level, mode: 'classic', isDaily: false });
        } catch (e: any) {
          if (e?.message?.includes('timed out')) {
            try {
              const easyConfig = { rows: 5, cols: 5, wordCount: 2, minWordLength: 3, maxWordLength: 3, difficulty: 'easy' as const };
              const board = generateBoard(easyConfig, Date.now());
              setLoading(false);
              emitBoardGenNotice();
              navigation.navigate('Game', { board, level: player.currentLevel, mode: 'classic', isDaily: false });
            } catch {
              Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
              setLoading(false);
            }
          } else {
            Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
            setLoading(false);
          }
        }
      }, 50);
    },
    [player.currentLevel, navigation, player, economy]
  );

  const startDaily = useCallback(() => {
    // Daily mode is free — no energy cost (per ENERGY.FREE_MODES)
    // Just track the use for analytics
    player.useEnergy('daily');

    setLoading(true);
    setTimeout(() => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const board = generateDailyBoard(today);
        setLoading(false);
        navigation.navigate('Game', { board, level: 0, mode: 'daily', isDaily: true });
      } catch (e) {
        Alert.alert('Error', 'Failed to generate daily puzzle.');
        setLoading(false);
      }
    }, 50);
  }, [navigation, economy, player]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Local Data',
      'This clears on-device progress only. Your account and purchases are preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            player.updateProgress({
              currentLevel: 1,
              highestLevel: 1,
              totalScore: 0,
              puzzlesSolved: 0,
              perfectSolves: 0,
              starsByLevel: {},
              totalStars: 0,
            });
          },
        },
      ]
    );
  }, [player]);

  const today = new Date().toISOString().split('T')[0];
  const claimedLoginToday = player.lastLoginRewardClaimDate === today;

  const handleClaimLoginReward = useCallback(() => {
    const claimDate = new Date().toISOString().split('T')[0];
    if (player.lastLoginRewardClaimDate === claimDate) return;

    const dayReward = getLoginCalendarDay(player.loginCycleDay);
    const rewards = dayReward.rewards;
    if (rewards.coins) economy.addCoins(rewards.coins);
    if (rewards.gems) economy.addGems(rewards.gems);
    if (rewards.hints) economy.addHintTokens(rewards.hints);
    if (rewards.rareTile) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      player.addRareTile(letters[Math.floor(Math.random() * letters.length)]);
    }
    if (rewards.cosmetic) {
      player.unlockCosmetic(rewards.cosmetic);
    }
    player.updateProgress({
      loginCycleDay: player.loginCycleDay + 1,
      lastLoginRewardClaimDate: claimDate,
    });
    Alert.alert('Reward Claimed!', dayReward.label);
    void analytics.logEvent('login_reward_claimed', { day: player.loginCycleDay });
  }, [player, economy]);

  if (!player.loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}
      {/* Pending gifts banner */}
      {pendingGifts.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.giftBanner,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleClaimAllGifts}
        >
          <Text style={styles.giftBannerIcon}>{'🎁'}</Text>
          <View style={styles.giftBannerTextContainer}>
            <Text style={styles.giftBannerTitle}>
              You have {pendingGifts.length} gift{pendingGifts.length > 1 ? 's' : ''}!
            </Text>
            <Text style={styles.giftBannerSubtext}>Tap to claim</Text>
          </View>
        </Pressable>
      )}
      <HomeScreen
        progress={progress}
        onPlay={startGame}
        onDaily={startDaily}
        onResetProgress={handleReset}
        onOpenShop={() => navigation.navigate('Shop')}
        onOpenSettings={() => navigation.navigate('Settings')}
        onOpenSeasonPass={() => navigation.navigate('SeasonPass')}
        onOpenWheel={() => setShowMysteryWheel(true)}
        mysteryWheelSpins={player.mysteryWheel.spinsAvailable}
        freeSpinToast={freeSpinToast}
        onBuyDeal={(deal) => {
          const canAfford = economy.canAfford(deal.currency, deal.salePrice);
          if (!canAfford) {
            Alert.alert('Not Enough ' + (deal.currency === 'coins' ? 'Coins' : 'Gems'),
              `You need ${deal.salePrice} ${deal.currency} for this deal.`);
            return;
          }
          const spent = deal.currency === 'coins'
            ? economy.spendCoins(deal.salePrice)
            : economy.spendGems(deal.salePrice);
          if (spent) {
            if (deal.contents.coins) economy.addCoins(deal.contents.coins);
            if (deal.contents.gems) economy.addGems(deal.contents.gems);
            if (deal.contents.hintTokens) economy.addHintTokens(deal.contents.hintTokens);
            Alert.alert('Deal Purchased!', `${deal.name} has been delivered!`);
          }
        }}
        currencies={{
          coins: economy.coins,
          gems: economy.gems,
          hintTokens: economy.hintTokens,
          libraryPoints: economy.libraryPoints,
        }}
        currentChapter={player.currentChapter}
        loginCycleDay={player.loginCycleDay}
        playerStage={playerStage}
        weeklyGoals={player.weeklyGoals}
        dailyMissions={player.missions.dailyMissions}
        recommendation={recommendation}
        segmentHomeContent={segmentHomeContent}
        segmentWelcomeMessage={segmentWelcomeMessage}
        activeEventBanners={eventManager.getActiveEvents().map(e => ({
          id: e.id,
          name: e.name,
          icon: e.icon,
          label: e.type === 'weekend_blitz' ? 'WEEKEND BLITZ' : e.type === 'mini' ? 'MINI EVENT' : 'EVENT',
          color: e.type === 'weekend_blitz' ? COLORS.orange : e.type === 'mini' ? COLORS.teal : COLORS.accent,
        }))}
        onOpenEvents={() => navigation.navigate('Play', { screen: 'Event' })}
        onOpenFriendLeaderboard={() =>
          navigation.navigate('Play', { screen: 'Leaderboard', params: { scope: 'friends' } })
        }
        claimedLoginToday={claimedLoginToday}
        onClaimLoginReward={handleClaimLoginReward}
      />
      {/* Welcome Back Modal */}
      {showWelcomeBack && (
        <View style={styles.welcomeOverlay}>
          <Animated.View style={[
            styles.welcomeCard,
            {
              transform: [
                { scale: welcomeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { translateY: welcomeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
              ],
              opacity: welcomeAnim,
            },
          ]}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>WELCOME BACK!</Text>
            <Text style={styles.welcomeSubtext}>We missed you! Here are some gifts:</Text>
            <View style={styles.welcomeRewards}>
              <View style={styles.welcomeRewardItem}>
                <Text style={styles.welcomeRewardIcon}>🪙</Text>
                <Text style={styles.welcomeRewardAmount}>+{comebackCoins}</Text>
                <Text style={styles.welcomeRewardLabel}>Coins</Text>
              </View>
              <View style={styles.welcomeRewardItem}>
                <Text style={styles.welcomeRewardIcon}>💡</Text>
                <Text style={styles.welcomeRewardAmount}>+{comebackHints}</Text>
                <Text style={styles.welcomeRewardLabel}>Hints</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.welcomeButton, pressed && { transform: [{ scale: 0.96 }] }]}
              onPress={() => {
                Animated.timing(welcomeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                  setShowWelcomeBack(false);
                });
              }}
            >
              <Text style={styles.welcomeButtonText}>LET'S PLAY!</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Mystery Wheel Overlay */}
      {showMysteryWheel && (
        <MysteryWheel
          wheelState={player.mysteryWheel}
          gems={economy.gems}
          onSpin={handleWheelSpin}
          onBuySpin={handleWheelBuySpin}
          onDismiss={handleWheelDismiss}
        />
      )}

      {/* Ceremony modals rendered at AppContent level for global overlay */}

      {/* Session end reminder */}
      {showSessionReminder && (
        <SessionEndReminder
          type="daily"
          message="Don't forget your daily puzzle!"
          onDismiss={() => setShowSessionReminder(false)}
        />
      )}
    </View>
  );
}

// playerStageFromPuzzles moved to src/hooks/useRewardWiring.ts

// Root app with onboarding check
function AppContent() {
  const player = usePlayer();
  const economy = useEconomy();
  const settings = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>();

  // Check ToS / Privacy Policy acceptance on mount.
  useEffect(() => {
    let cancelled = false;
    hasAcceptedTos().then((accepted) => {
      if (cancelled) return;
      setConsentAccepted(accepted);
      setConsentLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ceremony queue — rendered at app level so modals overlay all screens
  const { activeCeremony, handleDismissCeremony, resetBatchCounter } = useCeremonyQueue({
    popCeremony: player.popCeremony,
    pendingCeremonyCount: player.pendingCeremonies.length,
    loaded: player.loaded,
    isBlocked: showOnboarding,
  });

  useEffect(() => {
    if (!settings.loaded) return;
    // Settings store volumes as 0–100 (percentages) from the UI control, while
    // the historical context default (0.8 / 0.5) was a 0–1 fraction. Normalize
    // defensively so both shapes route correctly.
    const toFraction = (v: number): number => (v > 1 ? v / 100 : v);
    const sfx = toFraction(settings.sfxVolume);
    const music = toFraction(settings.musicVolume);
    const ceremony = toFraction(settings.ceremonyVolume ?? 0.8);
    soundManager.setSfxVolume(sfx);
    soundManager.setMusicVolume(music);
    soundManager.setCeremonyVolume(ceremony);
    soundManager.setMuted(sfx <= 0 && music <= 0 && ceremony <= 0);
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.loaded, settings.sfxVolume, settings.musicVolume, settings.ceremonyVolume, settings.hapticsEnabled]);

  // Privacy: propagate user-chosen toggles to analytics + ads services.
  useEffect(() => {
    if (!settings.loaded) return;
    void analytics.setEnabled(settings.analyticsEnabled);
    import('./src/services/ads').then(({ adManager }) => {
      adManager.setAdConsent({ allowPersonalizedAds: settings.personalizedAdsEnabled });
    });
  }, [settings.loaded, settings.analyticsEnabled, settings.personalizedAdsEnabled]);

  useEffect(() => {
    if (player.loaded && !player.tutorialComplete) {
      setShowOnboarding(true);
    }
  }, [player.loaded, player.tutorialComplete]);

  // ── Deep link handling ──────────────────────────────────────────────────
  const pendingDeepLinkRef = useRef<string | null>(null);

  useDeepLinks({ player, navigationRef, pendingChallengeRef: pendingDeepLinkRef });

  // Track screen views on navigation state changes
  const handleNavigationReady = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    routeNameRef.current = currentRoute?.name;
    if (currentRoute?.name) {
      void analytics.trackScreenView(currentRoute.name);
    }
  }, []);

  const handleNavigationStateChange = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;
    const previousRouteName = routeNameRef.current;

    if (currentRouteName && currentRouteName !== previousRouteName) {
      void analytics.trackScreenView(currentRouteName);
      // Reset ceremony batch counter when returning to home-like screens
      // so deferred ceremonies from the previous puzzle can be shown
      if (currentRouteName === 'Home' || currentRouteName === 'HomeMain') {
        resetBatchCounter();
      }
    }
    routeNameRef.current = currentRouteName;
  }, [resetBatchCounter]);

  if (!player.loaded || !consentLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // ToS + Privacy Policy gate — mandatory before any data collection.
  if (!consentAccepted) {
    return (
      <View style={{ flex: 1 }}>
        <ConsentGate onAccept={() => setConsentAccepted(true)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}
        onStateChange={handleNavigationStateChange}
        theme={{
          dark: true,
          colors: {
            primary: COLORS.accent,
            background: COLORS.bg,
            card: COLORS.surface,
            text: COLORS.textPrimary,
            border: COLORS.surfaceLight,
            notification: COLORS.coral,
          },
          fonts: {
            regular: { fontFamily: FONTS.bodyRegular, fontWeight: '400' },
            medium: { fontFamily: FONTS.bodyMedium, fontWeight: '500' },
            bold: { fontFamily: FONTS.bodyBold, fontWeight: '700' },
            heavy: { fontFamily: FONTS.display, fontWeight: '700' },
          },
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <RootStack.Navigator screenOptions={screenOptions}>
          {showOnboarding ? (
            <RootStack.Screen name="Onboarding">
              {(props: any) => (
                <OnboardingScreen
                  {...props}
                  onComplete={() => {
                    player.updateProgress({ tutorialComplete: true });

                    // Unlock features at current level and queue ceremonies
                    const level = player.currentLevel || 1;
                    const featureCeremonies = player.checkFeatureUnlocks(level);
                    for (const ceremony of featureCeremonies) {
                      player.queueCeremony(ceremony);
                    }

                    // Auto-unlock modes at or below current level (mirrors useRewardWiring)
                    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
                      if (config.unlockLevel <= level && !player.unlockedModes.includes(modeId)) {
                        player.unlockMode(modeId);
                        player.queueCeremony({
                          type: 'mode_unlock',
                          data: {
                            modeId,
                            modeName: config.name,
                            modeIcon: config.icon,
                            modeDescription: config.description,
                            modeColor: config.color,
                          },
                        });
                      }
                    }

                    setShowOnboarding(false);
                  }}
                />
              )}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="MainTabs" component={MainTabs} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>

      {/* Ceremony modals — rendered at app level to overlay all screens.
          Wrapped in a local boundary so a render error in any one ceremony
          dequeues cleanly instead of taking down the whole app. */}
      <CeremonyRouter
        activeCeremony={activeCeremony}
        onDismiss={handleDismissCeremony}
        economy={economy}
      />
      <BoardGenBanner />
      <NotSyncedBanner />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  useEffect(() => {
    soundManager.init();
    crashReporter.init();
    analytics.initFirebase();
    funnelTracker.trackStep('app_open');

    return () => {
      void analytics.destroy();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

const spinPromptStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
    padding: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.purple + '30',
    maxWidth: 320,
    width: '100%',
    ...SHADOWS.strong,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: COLORS.gold,
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  spinButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  spinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 2,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});

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
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: COLORS.accent,
    letterSpacing: 3,
    marginBottom: 8,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  welcomeSubtext: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  welcomeRewards: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  welcomeRewardItem: {
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  welcomeRewardIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  welcomeRewardAmount: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  welcomeRewardLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  welcomeButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  welcomeButtonText: {
    fontFamily: FONTS.display,
    color: COLORS.bg,
    fontSize: 16,
    letterSpacing: 3,
  },
  giftBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: -52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    zIndex: 10,
  },
  giftBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  giftBannerTextContainer: {
    flex: 1,
  },
  giftBannerTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.purple,
  },
  giftBannerSubtext: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
