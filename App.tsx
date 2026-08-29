import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Animated,
  InteractionManager,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationContainerRef,
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createStackNavigator,
  type StackNavigationEventMap,
  type StackNavigationProp,
} from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, loadAsync as loadFontAsync } from 'expo-font';
import { markRoundedFontReady } from './src/services/fontReady';
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
import { generateBoard, generateDailyBoard, generateLevelBoard, generateWeeklyBoard } from './src/engine/boardGenerator';
import { getWeekId } from './src/utils/weekId';
import { getChapterForLevel } from './src/data/chapters';
import { getCurrentEvent, getEventPlayConfig } from './src/data/events';
import { DAILY_REWARD_TIMERS, canClaimTimer, rollBonusChestReward } from './src/data/dailyRewardTimers';
import { claimMeteredGems } from './src/data/economyTuning';
import { Board, CeremonyItem, Difficulty, GameMode, PlayerProgress } from './src/types';
import { COLORS, DIFFICULTY_CONFIGS, MODE_CONFIGS, ECONOMY, ENERGY, FONTS, SHADOWS, isPinchLevel } from './src/constants';
import { getAdjustedConfig } from './src/engine/difficultyAdjuster';
import { useAuth } from './src/contexts/AuthContext';
import { useEconomy } from './src/contexts/EconomyContext';
import {
  EconomyStoreContext,
  useEconomyActions,
  useEconomyStore,
  selectGems,
} from './src/stores/economyStore';
import {
  PlayerStoreContext,
  usePlayerActions,
  usePlayerStore,
  selectFeaturesUnlocked,
  selectCurrentLevel,
} from './src/stores/playerStore';
import { makeContextFacade } from './src/utils/contextFacade';
import { useSettings } from './src/contexts/SettingsContext';
import { usePlayer } from './src/contexts/PlayerContext';
import { useHardEnergy } from './src/hooks/useHardEnergy';
import { NoLivesModal } from './src/components/NoLivesModal';
import { OutOfEnergyModal } from './src/components/OutOfEnergyModal';
import { MiniPackSheet } from './src/components/MiniPackSheet';
import PostStreakBreakOffer, {
  RESTORE_GEM_COST,
  RESTORE_WINDOW_MS,
} from './src/components/PostStreakBreakOffer';
import { soundManager } from './src/services/sound';
import { setHapticsEnabled, successHaptic } from './src/services/haptics';
// ATLAS_PAGES and generateShareText moved to useRewardWiring
import { notificationManager, setNotificationSegments } from './src/services/notifications';
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
import { LEVEL_SKIP_COST_COINS } from './src/components/monetizationModel';
import { SessionEndReminder } from './src/components/SessionEndReminder';
import { MysteryWheel } from './src/components/MysteryWheel';
import { WheelSegment, MysteryWheelState, SPIN_COST_GEMS, SPIN_BUNDLE_COUNT, checkDailyFreeSpin } from './src/data/mysteryWheel';
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
import { getRemoteBoolean, initRemoteConfig } from './src/services/remoteConfig';
import { getLevelConfigExtended, getBreatherConfigExtended } from './src/engine/puzzleGenerator';
import {
  getPersonalizedHomeContent,
  getPersonalizedNotifications,
  getPersonalizedDifficulty,
  getRecommendedMode,
  getWelcomeBackMessage,
} from './src/services/playerSegmentation';
import { firestoreService, FirestoreGift } from './src/services/firestore';
import { applyGiftGrant } from './src/utils/giftGrants';
import { comebackAmounts } from './src/utils/comebackRewards';

// Extracted modules for decomposition
import { useRewardWiring, playerStageFromPuzzles } from './src/hooks/useRewardWiring';
import { useCeremonyQueue } from './src/hooks/useCeremonyQueue';
import { useRewardInboxClaim } from './src/hooks/useRewardInbox';
import { useReduceMotion } from './src/hooks/useReduceMotion';
import { ceremonyEconomyGrant } from './src/utils/ceremonyGrants';
import { getLoginCalendarDay } from './src/data/loginCalendar';
import {
  getGameRouteMotion,
  getStackMotionOptions,
  getTabAnimation,
  shouldResetGameRouteMarker,
} from './src/navigation/motionOptions';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const PlayStack = createStackNavigator();
const CollectionsStack = createStackNavigator();
const LibraryStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const RootStack = createStackNavigator();

type GameRouteParams = { sameRouteTransition?: boolean };

// React Navigation 7 exposes `transitionEnd` on stack screens. Clear the
// replacement-only marker after the opening transition so its fade options
// stay stable in flight, then normal stack options resume for a later back.
function getGameRouteListeners({
  navigation,
  route,
}: {
  navigation: StackNavigationProp<ParamListBase>;
  route: RouteProp<ParamListBase>;
}) {
  return {
    transitionEnd: ({
      data,
    }: {
      data: StackNavigationEventMap['transitionEnd']['data'];
    }) => {
      const sameRouteTransition =
        (route.params as GameRouteParams | undefined)?.sameRouteTransition === true;
      if (shouldResetGameRouteMarker(sameRouteTransition, data.closing)) {
        navigation.setParams({ sameRouteTransition: undefined });
      }
    },
  };
}

// Home Tab Stack
function HomeStackScreen() {
  const reduceMotion = useReduceMotion();

  return (
    <HomeStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
      <HomeStack.Screen name="HomeMain" component={HomeMainScreen} />
      <HomeStack.Screen name="Shop" component={ShopScreen} />
      <HomeStack.Screen name="CosmeticStore" component={CosmeticStoreScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
      <HomeStack.Screen name="SeasonPass">
        {({ navigation }) => <SeasonPassScreen onBack={() => navigation.goBack()} />}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Game"
        component={GameScreenWrapper}
        listeners={getGameRouteListeners}
        options={({ route }) =>
          getGameRouteMotion(
            (route.params as { sameRouteTransition?: boolean } | undefined)
              ?.sameRouteTransition === true,
            reduceMotion,
          )
        }
      />
    </HomeStack.Navigator>
  );
}

/**
 * Stable player/economy handles for navigation wrappers.
 *
 * The context values from usePlayer()/useEconomy() rebuild on every state
 * write, so wrappers that only need actions plus tap-time state reads were
 * re-rendering (and re-minting their callbacks) 15+ times per puzzle
 * completion. These facades have permanent identity: actions resolve to
 * the stable action bags, state reads resolve to the store snapshot at
 * call time (see src/utils/contextFacade.ts). Render-time reads must NOT
 * go through them — subscribe narrowly via usePlayerStore/useEconomyStore.
 */
function useStableContextFacades() {
  const playerActions = usePlayerActions();
  const economyActions = useEconomyActions();
  const playerStoreApi = useContext(PlayerStoreContext);
  const economyStoreApi = useContext(EconomyStoreContext);
  if (!playerStoreApi || !economyStoreApi) {
    throw new Error('useStableContextFacades must render inside player/economy providers');
  }
  const player = useMemo(
    () => makeContextFacade(playerStoreApi.getState, playerActions),
    [playerStoreApi, playerActions],
  );
  const economy = useMemo(
    () => makeContextFacade(economyStoreApi.getState, economyActions),
    [economyStoreApi, economyActions],
  );
  return { player, economy };
}

// Play Tab Stack
// Event screen wrapper — wires navigation callbacks for Play and Shop buttons
function EventScreenWrapperNav({ navigation }: any) {
  const { player, economy } = useStableContextFacades();
  const [energyWallMinutes, setEnergyWallMinutes] = useState<number | null>(null);

  const handlePlayEventPuzzle = useCallback(() => {
    // Events run in the mode their rules describe (speedSolve → timer,
    // perfectClear/expertGauntlet → perfect-solve, gravity championship →
    // gravityFlip, theme week → themed word list). This used to hardcode
    // classic and ignore rules entirely — see getEventPlayConfig.
    const eventPlay = getEventPlayConfig(getCurrentEvent());
    const mode: GameMode = eventPlay.mode;

    // Energy check (same pattern as ModesScreenWrapper) — designed modal,
    // not a bare OS Alert: this is the game's only true hard block and it
    // needed branding, analytics, and A/B-ability.
    const isFreeMode = ENERGY.FREE_MODES.includes(mode);
    if (!isFreeMode) {
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        setEnergyWallMinutes(Math.ceil(player.getTimeUntilNextEnergy() / 60000));
        return;
      }
    }

    player.useEnergy(mode);

    try {
      const modeLevel = player.currentLevel;
      let config = getLevelConfigExtended(modeLevel);
      const adjusted = getAdjustedConfig(config, player.performanceMetrics);
      config = adjusted.config;
      if (eventPlay.difficulty) {
        // Expert gauntlet: the event promises expert boards.
        config = { ...config, difficulty: eventPlay.difficulty };
      }

      const seed = Date.now() + modeLevel * 1337;
      // `modeLevel` is the player's classic level here for every event mode,
      // so the chapter matches the config built from it. The event's own
      // authored themeWords still win below.
      const chapter = getChapterForLevel(modeLevel);
      let board = generateBoard(
        config,
        seed,
        mode,
        chapter?.profile,
        eventPlay.themeWords ?? chapter?.themeWords,
      );
      const modeConfig = MODE_CONFIGS[mode];

      navigation.navigate('Game', {
        board,
        level: modeLevel,
        mode,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: eventPlay.timeLimitSeconds ?? modeConfig.rules.timerSeconds ?? 0,
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
    // `player`/`economy` are stable facades (call-time reads) — not deps.
  }, [navigation]);

  return (
    <>
      <EventScreen
        onPlayEventPuzzle={handlePlayEventPuzzle}
        onOpenEventShop={() => navigation.navigate('Home', { screen: 'Shop' })}
      />
      <OutOfEnergyModal
        visible={energyWallMinutes !== null}
        minutesUntilNext={energyWallMinutes ?? 0}
        gemCost={ENERGY.GEM_REFILL_COST}
        playerGems={economy.gems}
        source="event"
        onWatchAd={() => {
          setEnergyWallMinutes(null);
          void watchAdForEnergyRefill(player);
        }}
        onGemRefill={() => {
          setEnergyWallMinutes(null);
          if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
            player.refillEnergy('gems');
          } else {
            navigation.navigate('Home', { screen: 'Shop' });
          }
        }}
        onClose={() => setEnergyWallMinutes(null)}
      />
    </>
  );
}

function PlayStackScreen() {
  const reduceMotion = useReduceMotion();

  return (
    <PlayStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
      <PlayStack.Screen name="Modes" component={ModesScreenWrapper} />
      <PlayStack.Screen
        name="Game"
        component={GameScreenWrapper}
        listeners={getGameRouteListeners}
        options={({ route }) =>
          getGameRouteMotion(
            (route.params as { sameRouteTransition?: boolean } | undefined)
              ?.sameRouteTransition === true,
            reduceMotion,
          )
        }
      />
      <PlayStack.Screen name="Event" component={EventScreenWrapperNav} />
      <PlayStack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </PlayStack.Navigator>
  );
}

// Collections Tab Stack
function CollectionsStackScreen() {
  const reduceMotion = useReduceMotion();

  return (
    <CollectionsStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
      <CollectionsStack.Screen name="CollectionsMain" component={CollectionsScreen} />
    </CollectionsStack.Navigator>
  );
}

// Library Tab Stack
function LibraryStackScreen() {
  const reduceMotion = useReduceMotion();

  return (
    <LibraryStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
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
      onOpenClub={() => navigation.navigate('Club')}
    />
  );
}

function MasteryScreenWrapper({ navigation }: any) {
  return <MasteryScreen onBack={() => navigation.goBack()} />;
}

// Profile Tab Stack
function ProfileStackScreen() {
  const reduceMotion = useReduceMotion();

  return (
    <ProfileStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
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

// Shared "Watch Ad (+5)" handler for the three out-of-energy dialogs. The
// button used to grant the refill instantly without showing anything —
// bypassing the soft-scarcity system, the gem refill, and every ad
// impression. Now the rewarded ad must actually complete (same adManager
// convention as the hard-energy path in GameScreenWrapper): refill only on
// `result.rewarded`, never on error/unavailability. `life_reward` is the
// closest existing AdRewardType with a strict daily cap
// (AD_CONFIG.MAX_LIFE_ADS_PER_DAY); the grant itself is applied here by the
// caller, not by processAdReward, so no lives are credited.
async function watchAdForEnergyRefill(player: {
  refillEnergy: (method: 'ad') => boolean;
}): Promise<void> {
  try {
    const { adManager } = await import('./src/services/ads');
    const result = await adManager.showRewardedAd('life_reward');
    if (result.rewarded) {
      player.refillEnergy('ad');
    }
  } catch (err) {
    if (__DEV__) console.warn('[Energy] rewarded ad failed:', err);
  }
}

// Hide the global tab bar whenever the focused nested route inside a tab
// stack is 'Game'. This is the documented React-Navigation pattern for
// custom tab bars — see `NeonTabBar` which reads the resolved tabBarStyle
// off the descriptor options. Gated by the `hideTabBarDuringPlayEnabled`
// Remote Config flag so production can disable the behavior remotely.
function hideTabBarOnGame({ route }: { route: { name: string; state?: any } }) {
  if (!getRemoteBoolean('hideTabBarDuringPlayEnabled')) return {};
  const focused = getFocusedRouteNameFromRoute(route as any);
  if (focused === 'Game') {
    return { tabBarStyle: { display: 'none' as const } };
  }
  return {};
}

// Main Tab Navigator with progressive tab unlocking
function MainTabs() {
  const insets = useSafeAreaInsets();
  // Narrow subscription: the root tab navigator reads exactly one player
  // field. A full usePlayer() re-rendered the whole Tab.Navigator (and the
  // inline NeonTabBar render prop) on every one of the 15+ player writes a
  // puzzle completion makes — concurrent with victory animations.
  const featuresUnlocked = usePlayerStore(selectFeaturesUnlocked);
  const reduceMotion = useReduceMotion();

  const hasFeature = (id: string) => featuresUnlocked.includes(id);

  return (
    <Tab.Navigator
      tabBar={(props) => <NeonTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: getTabAnimation(reduceMotion),
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
        options={({ route }) => ({
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'home' : 'home-outline'} focused={focused} />,
          ...hideTabBarOnGame({ route }),
        })}
      />
      <Tab.Screen
        name="Play"
        component={PlayStackScreen}
        options={({ route }) => ({
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon iconName={focused ? 'game-controller' : 'game-controller-outline'} focused={focused} />,
          ...hideTabBarOnGame({ route }),
        })}
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
function ModesScreenWrapper({ navigation, route }: any) {
  const { player, economy } = useStableContextFacades();
  const [energyWallMinutes, setEnergyWallMinutes] = useState<number | null>(null);

  // Warm the shared-board caches while the player is reading the mode list.
  //
  // Daily and weekly shop through many candidates for the fairest board, and
  // that search is bounded in wall-clock rather than being free — the weekly's
  // is up to ~700ms. Paying it here, after interactions have settled, means
  // the tap itself is a cache hit. Best-effort: a failure just leaves the tap
  // to generate synchronously as before.
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      try {
        generateDailyBoard(new Date().toISOString().split('T')[0]);
        generateWeeklyBoard(getWeekId());
      } catch {
        // Warming is opportunistic; tap-time generation is the source of truth.
      }
    });
    return () => handle.cancel();
  }, []);

  const handleSelectMode = useCallback((modeId: string) => {
    const mode = modeId as GameMode;

    // Energy check — free modes (daily, endless, relax) cost 0 energy.
    // Designed modal, not a bare OS Alert (see OutOfEnergyModal).
    const isFreeMode = ENERGY.FREE_MODES.includes(mode);
    if (!isFreeMode) {
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        setEnergyWallMinutes(Math.ceil(player.getTimeUntilNextEnergy() / 60000));
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
        // Deterministic from the week id — weekly scores go to a shared
        // leaderboard, so a per-entry board meant players were ranked on
        // different puzzles and could re-enter to reroll for an easy one.
        board = generateWeeklyBoard(getWeekId());
        navigation.navigate('Game', { board, level: 0, mode: 'weekly' });
        return;
      }

      // Each mode has its own independent level progression.
      // Classic uses the global player level; all other modes track their own.
      modeLevel = mode === 'classic'
        ? player.currentLevel
        : player.getModeLevel(mode);

      let config = getLevelConfigExtended(modeLevel);

      // Apply adaptive difficulty adjustment (pinch slots exempt — the
      // easer would defuse the authored low-forgiveness board on retry)
      if (!(mode === 'classic' && isPinchLevel(modeLevel))) {
        const adjusted = getAdjustedConfig(config, player.performanceMetrics);
        config = adjusted.config;
      }

      const seed = Date.now() + modeLevel * 1337;
      // A chapter theme for EVERY mode, not just classic.
      //
      // The alternate modes drew their find-lists straight from the generic
      // dictionary, so Relax served WAXY / GIRL / SLAG and Shrinking Board
      // served HELM / DREG / FAX — every one a real word, and every one
      // reading like a Scrabble hand next to the themed ladder.
      //
      // Only `themeWords` crosses over. The chapter PROFILE stays
      // classic-only: it carries length clamps, dictionaryTier,
      // emptyCellDensity and introduced mechanics — difficulty, in other
      // words, which each mode's benchmarks are pinned against. Theme words
      // change which words are OFFERED, not how hard the board is, and they
      // are resolved from the chapter matching THIS mode's own level, so the
      // authored words fall inside the same length window `config` was built
      // from.
      const chapter = getChapterForLevel(modeLevel);
      const profile = mode === 'classic' ? chapter?.profile : undefined;
      board = generateLevelBoard(modeLevel, config, seed, mode, profile, chapter?.themeWords);

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
    // `player`/`economy` are stable facades read at tap time — keeping
    // player.currentLevel out of deps also stops the autoStart effect
    // below from re-running on every level change.
  }, [navigation]);

  // R8: Home's "Try X Mode" recommendation deep-links straight into the
  // recommended mode instead of dropping the player on the grid to find it
  // again. Param cleared before starting so back-nav can't re-trigger.
  const autoStartHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const autoStartMode = route?.params?.autoStartMode;
    if (!autoStartMode || autoStartHandledRef.current === autoStartMode) return;
    autoStartHandledRef.current = autoStartMode;
    navigation.setParams({ autoStartMode: undefined });
    handleSelectMode(autoStartMode);
  }, [route?.params?.autoStartMode, handleSelectMode, navigation]);

  return (
    <>
      <ModesScreen onSelectMode={handleSelectMode} onOpenLeaderboard={() => navigation.navigate('Leaderboard')} />
      <OutOfEnergyModal
        visible={energyWallMinutes !== null}
        minutesUntilNext={energyWallMinutes ?? 0}
        gemCost={ENERGY.GEM_REFILL_COST}
        playerGems={economy.gems}
        source="modes"
        onWatchAd={() => {
          setEnergyWallMinutes(null);
          void watchAdForEnergyRefill(player);
        }}
        onGemRefill={() => {
          setEnergyWallMinutes(null);
          if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
            player.refillEnergy('gems');
          } else {
            navigation.navigate('Home' as never, { screen: 'Shop' } as never);
          }
        }}
        onClose={() => setEnergyWallMinutes(null)}
      />
    </>
  );
}

// Wrapper to pass navigation params to GameScreen with full context wiring
function GameScreenWrapper({ route, navigation }: any) {
  const params = route.params || {};
  const { user } = useAuth();
  // The wrapper sits directly above the perf-critical GameScreen, so it
  // must NOT subscribe to the full Player/Economy contexts (their values
  // rebuild on every one of the 15+ writes a completion makes, re-minting
  // every callback below and defeating GameScreen's memo mid-animation).
  // Reactive needs are exactly two narrow fields (subscribed below);
  // everything else goes through stable facades: actions resolve to the
  // stable action bags, state reads resolve to the store snapshot at
  // call time. See src/utils/contextFacade.ts.
  const { player, economy } = useStableContextFacades();
  const mysteryWheelSpins = usePlayerStore((s) => s.mysteryWheel.spinsAvailable);
  const gems = useEconomyStore(selectGems);
  const hardEnergy = useHardEnergy();
  const [showSpinPrompt, setShowSpinPrompt] = useState(false);
  const [earnedNewSpin, setEarnedNewSpin] = useState(false);
  const spinsBeforeComplete = useRef(0);
  // The baseline above is only meaningful once handleComplete has recorded
  // it. Without this guard the detection effect ran on mount and compared
  // preexisting unspent spins against the ref's initial 0 — so every level's
  // home exit was interrupted by the spin prompt until the spin was spent.
  const hasCompletedThisLevelRef = useRef(false);
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
    // While the modal is up the recovery handlers own the flow: closing it
    // re-runs this effect, which then performs the (exactly-once) debit.
    if (showNoLives) return;
    if (!hardEnergy.canPlay) {
      setShowNoLives(true);
      return;
    }
    const { started } = hardEnergy.startLevel();
    if (!started) {
      setShowNoLives(true);
      return;
    }
    // Claim the guard key only AFTER a successful debit. Claiming it before
    // the canPlay check burned the key on the out-of-lives path, so the
    // gated level played free after an ad or gem refill — each rewarded ad
    // effectively bought two level-plays; a gem refill under-charged by one.
    debitedLevelRef.current = key;
  }, [hardEnergy, params.mode, params.level, route.key, showNoLives]);

  const handleNoLivesClose = useCallback(() => {
    // Abandoning the level: claim the guard key so the debit effect can't
    // charge a life during the exit transition (e.g. a life regenerating
    // while the modal was open).
    debitedLevelRef.current = `${params.mode ?? 'classic'}:${params.level ?? 0}:${route.key}`;
    setShowNoLives(false);
    navigation.goBack();
  }, [navigation, params.mode, params.level, route.key]);

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

  // Broke case: the gem CTA routes here instead of sitting disabled. The
  // sheet uses 'modal' presentation so its native Modal stacks above
  // NoLivesModal's; NoLivesModal stays mounted underneath, and on sheet
  // close the (unchanged) canPlay state keeps it up for another try.
  const [showGemSheet, setShowGemSheet] = useState(false);
  const handleNoLivesGetGems = useCallback(() => {
    setShowGemSheet(true);
  }, []);

  // Delegate reward wiring to extracted hook
  const handleCompleteInner = useRewardWiring({
    player,
    economy,
    userId: user?.uid || '',
    params,
    navigation,
  });

  // ── Next-board prefetch ─────────────────────────────────────────────
  // generateBoard is synchronous JS-thread work (typically tens of ms,
  // worst-seed a few hundred). Running it on the "Next level" tap makes the
  // most common navigation in the game feel sticky. Instead we pre-generate
  // the next board while the victory screen is on display and reuse it at
  // tap time when the target (mode/level/config) still matches.
  const prefetchedNext = useRef<{ key: string; board: Board } | null>(null);
  // Handles for the deferred prefetch so unmount can cancel it — a bare
  // setTimeout here used to run synchronous generateBoard (p95 <900ms)
  // for an already-unmounted wrapper, janking the outgoing navigation.
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchInteractionRef = useRef<{ cancel: () => void } | null>(null);
  useEffect(
    () => () => {
      if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
      prefetchInteractionRef.current?.cancel();
    },
    [],
  );

  const computeNextTarget = useCallback(() => {
    const mode = (params.mode || 'classic') as GameMode;
    // advanceModeLevel was already called in handleComplete on win, so
    // getModeLevel returns the new (incremented) level. Classic uses the
    // global level carried in params.
    const modeLevel = mode === 'classic'
      ? (params.level || 0) + 1
      : player.getModeLevel(mode);
    // Pinch slots are exempt from the breather and the adaptive easer —
    // both would defuse the authored low-forgiveness board on retry, which
    // is exactly the state a pinch induces.
    const pinch = mode === 'classic' && isPinchLevel(modeLevel);
    const useBreather = !pinch && player.needsBreather();
    let config = useBreather ? getBreatherConfigExtended(modeLevel) : getLevelConfigExtended(modeLevel);
    if (!useBreather && !pinch) {
      const adjusted = getAdjustedConfig(config, player.performanceMetrics);
      config = adjusted.config;
    }
    // Theme words for every mode, profile for classic only — see the note in
    // handleSelectMode. `key` needs no new component: mode + modeLevel already
    // determine the chapter, so the prefetch cache stays correct.
    const chapter = getChapterForLevel(modeLevel);
    const profile = mode === 'classic' ? chapter?.profile : undefined;
    return { mode, modeLevel, config, chapter, profile, key: `${mode}:${modeLevel}:${JSON.stringify(config)}` };
    // `player` is a stable facade (call-time reads) — not a dependency.
  }, [params]);

  const handleComplete = useCallback((
    stars: number,
    score: number,
    perfectRun: boolean = false,
    completionTimeSeconds: number = 0,
    assists?: { hintsUsed: number; undosUsed: number },
  ) => {
    // Track spins before completion to detect if a new one is awarded
    spinsBeforeComplete.current = mysteryWheelSpins;
    hasCompletedThisLevelRef.current = true;
    handleCompleteInner(stars, score, perfectRun, completionTimeSeconds, assists);

    // Pre-generate the next board while the player is looking at the
    // victory screen. Best-effort: failures fall through to the sync
    // generation in handleNextLevel. The 600ms delay lets the victory
    // animation start without competing for the JS thread; the key check
    // at tap time guards against the target shifting (e.g. adaptive
    // difficulty settling after completion processing). Both handles are
    // tracked so leaving the screen right after completing cancels the
    // synchronous generateBoard instead of janking the exit navigation
    // for an unmounted wrapper.
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchTimeoutRef.current = null;
      prefetchInteractionRef.current = InteractionManager.runAfterInteractions(() => {
        prefetchInteractionRef.current = null;
        try {
          const target = computeNextTarget();
          if (prefetchedNext.current?.key === target.key) return;
          const board = generateLevelBoard(
            target.modeLevel,
            target.config,
            target.modeLevel * 1337 + Date.now(),
            target.mode,
            target.profile,
            target.chapter?.themeWords,
          );
          prefetchedNext.current = { key: target.key, board };
        } catch {
          // Prefetch is opportunistic — tap-time generation remains the source of truth.
        }
      });
    }, 600);
  }, [handleCompleteInner, mysteryWheelSpins, computeNextTarget]);

  const handleNextLevel = useCallback(() => {
    try {
      // Spend energy for next level (free modes handled internally)
      const mode = (params.mode || 'classic') as GameMode;
      player.useEnergy(mode);

      const target = computeNextTarget();
      const { modeLevel, config, chapter, profile } = target;

      // Reuse the board pre-generated during the victory screen when the
      // target still matches; otherwise generate now (original behavior).
      const cached = prefetchedNext.current;
      prefetchedNext.current = null;
      const board = cached && cached.key === target.key
        ? cached.board
        : generateLevelBoard(modeLevel, config, modeLevel * 1337 + Date.now(), mode, profile, chapter?.themeWords);
      const modeConfig = MODE_CONFIGS[mode];

      navigation.replace('Game', {
        board,
        level: modeLevel,
        mode,
        isDaily: false,
        sameRouteTransition: true,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        // Carry the current puzzle's clock forward. An event's authored limit
        // (Speed Blitz 60s) must survive Next rather than silently reverting to
        // the mode default from puzzle 2 onward. computeNextTarget keeps
        // `mode = params.mode`, so the carried value always belongs to the same
        // mode; classic/daily/weekly pass 0 or undefined and fall through.
        timeLimit: params.timeLimit || modeConfig.rules.timerSeconds || 0,
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
            sameRouteTransition: true,
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
    // `player` is a stable facade (call-time reads) — not a dependency.
  }, [params, navigation, computeNextTarget]);

  /**
   * Pay coins to leave a level that cannot be beaten — the churn valve for a
   * player staring at a dead board with undo and retry already spent.
   *
   * Four things about the order here are load-bearing:
   *
   *  - GENERATE, THEN CHARGE. The original took the coins first, so a board
   *    generation that threw left the player poorer and still on the dead
   *    board. Nothing is spent until there is a replacement board in hand.
   *  - ADVANCE LAST. `recordPuzzleComplete` moves the ladder; running it
   *    before generation meant a failure advanced progression past a level
   *    the player never received.
   *  - ONE STAR, NOT ZERO. The original recorded 0 stars. Every real win pays
   *    at least 1 (`computeStars` floors there), and the chapter star gate is
   *    non-binding *because* of that floor — a player who skipped enough
   *    levels at 0 stars could fall below a gate and be clamped, i.e. pay to
   *    get stuck. A skip is the ultimate assist, so it pays the
   *    heaviest-assist tier: one star.
   *  - CLASSIC, AT THE FRONTIER, ONE AT A TIME. Skipping a replay of an old
   *    level would advance the ladder for a level already beaten; the
   *    in-flight ref stops a double tap buying two skips.
   */
  const skipInFlight = useRef(false);
  const handleSkipLevel = useCallback(() => {
    const mode = (params.mode || 'classic') as GameMode;
    const currentLevel = params.level || 1;
    if (mode !== 'classic') return;
    if (skipInFlight.current) return;
    if (currentLevel !== player.currentLevel) return;
    if (economy.coins < LEVEL_SKIP_COST_COINS) return;
    skipInFlight.current = true;
    // Hoisted so the timeout-fallback catch can reuse the same target level.
    let nextModeLevel = 0;
    try {
      nextModeLevel = currentLevel + 1;

      const config = getLevelConfigExtended(nextModeLevel);
      const seed = nextModeLevel * 1337 + Date.now();
      const chapter = getChapterForLevel(nextModeLevel);
      const skipProfile = mode === 'classic' ? chapter?.profile : undefined;
      let board = generateLevelBoard(nextModeLevel, config, seed, mode, skipProfile, chapter?.themeWords);
      const modeConfig = MODE_CONFIGS[mode];

      // Board in hand — now it is safe to take the money and move the ladder.
      if (!economy.spendCoins(LEVEL_SKIP_COST_COINS)) {
        skipInFlight.current = false;
        return;
      }
      player.recordPuzzleComplete(currentLevel, 0, 1, false);

      navigation.replace('Game', {
        board,
        level: nextModeLevel,
        mode,
        isDaily: false,
        sameRouteTransition: true,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
      skipInFlight.current = false;
    } catch (e: any) {
      skipInFlight.current = false;
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
            sameRouteTransition: true,
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
    // `player`/`economy` are stable facades (call-time reads) — not deps.
  }, [params, navigation]);

  if (!params.board) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: COLORS.textMuted }}>No puzzle loaded</Text>
      </View>
    );
  }

  // Extract completion data from params (set by handleComplete)
  const completionData = params.completionData || {};

  // Detect when a new spin is earned during puzzle completion — only after
  // handleComplete has recorded the pre-completion baseline. A spin the
  // player already held on entry must NOT trigger the prompt (see the
  // "Only show spin prompt when a NEW spin was earned" note below).
  useEffect(() => {
    if (!hasCompletedThisLevelRef.current) return;
    if (mysteryWheelSpins > spinsBeforeComplete.current) {
      setEarnedNewSpin(true);
    }
  }, [mysteryWheelSpins]);

  // Only show spin prompt when a NEW spin was earned this puzzle, not for old spins
  const handleHomeWithPrompt = useCallback(() => {
    if (earnedNewSpin) {
      setPendingNavAction('home');
      setShowSpinPrompt(true);
    } else {
      navigation.goBack();
    }
  }, [earnedNewSpin, navigation]);

  // NEXT always gives the next puzzle. It used to divert through the spin
  // prompt whenever a spin was earned (every 5th win, plus the first) —
  // hijacking the most important button in the game at L1/L5/L10 and, on
  // accept, chaining the player out of the play loop into wheel → Home →
  // login calendar. The spin still surfaces via the prompt on the HOME path
  // (a deliberate exit) and the wheel badge on Home; momentum wins here.
  const handleNextWithPrompt = useCallback(() => {
    // earnedNewSpin deliberately NOT cleared — if the player later exits to
    // Home, the prompt still fires there, where it belongs.
    handleNextLevel();
  }, [handleNextLevel]);

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
        onSkipLevel={handleSkipLevel}
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
              You have {mysteryWheelSpins} spin{mysteryWheelSpins !== 1 ? 's' : ''} on the Mystery Wheel
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
        gemsAvailable={gems}
        gemRefillCost={hardEnergy.gemRefillCost}
        nextLifeAtMs={hardEnergy.nextLifeAtMs}
        onClose={handleNoLivesClose}
        onWatchAd={handleNoLivesWatchAd}
        onSpendGems={handleNoLivesSpendGems}
        onGetGems={handleNoLivesGetGems}
      />

      {/* Gem store bridge for the broke NoLivesModal case. Mounted AFTER
          NoLivesModal so its native Modal stacks on top (Android-first). */}
      {showGemSheet && (
        <MiniPackSheet
          need="gems"
          source="no_lives_modal"
          presentation="modal"
          onClose={() => setShowGemSheet(false)}
        />
      )}
    </View>
  );
}

// Home main screen wrapper — reads PlayerContext (the legacy useStorage hook
// this replaced is deleted; it wrote currentLevel with no star-gate check)
function HomeMainScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const player = usePlayer();
  const economy = useEconomy();
  const [energyWallMinutes, setEnergyWallMinutes] = useState<number | null>(null);
  // Sweep the server-side reward inbox (weekly-leaderboard payouts,
  // personal club-goal completions) once per app run — these types had no
  // client reader, so the grants were invisible and unclaimable.
  useRewardInboxClaim(user?.uid, economy, player);
  const [loading, setLoading] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [comebackCoins, setComebackCoins] = useState(0);
  const [comebackHints, setComebackHints] = useState(0);
  const welcomeAnim = React.useRef(new Animated.Value(0)).current;

  // Ceremony queue moved to AppContent level so modals overlay all screens

  // Pending gifts from Firestore
  const [pendingGifts, setPendingGifts] = useState<FirestoreGift[]>([]);
  const [claimingGift, setClaimingGift] = useState(false);

  // Session end reminder — a 4s self-dismissing toast, previously dead code
  // (nothing ever set it true). Fires once per session, shortly after the
  // 3rd solve of the session, when today's daily is still unplayed: the
  // Daily is free, unlocked at level 1, and is what starts the streak — the
  // best possible "one more thing before you go" for a player who is
  // clearly engaged today but hasn't planted tomorrow's hook yet.
  const [showSessionReminder, setShowSessionReminder] = useState(false);
  const sessionStartPuzzlesRef = useRef<number | null>(null);
  const sessionReminderFiredRef = useRef(false);
  useEffect(() => {
    if (!player.loaded) return;
    if (sessionStartPuzzlesRef.current === null) {
      sessionStartPuzzlesRef.current = player.puzzlesSolved;
      return;
    }
    if (sessionReminderFiredRef.current) return;
    const solvedThisSession = player.puzzlesSolved - sessionStartPuzzlesRef.current;
    const today = new Date().toISOString().split('T')[0];
    if (solvedThisSession >= 3 && !player.dailyCompleted.includes(today)) {
      sessionReminderFiredRef.current = true;
      // Let the victory flow settle before the toast slides in.
      const timer = setTimeout(() => setShowSessionReminder(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [player.loaded, player.puzzlesSolved, player.dailyCompleted]);

  // Mystery Wheel state
  const [showMysteryWheel, setShowMysteryWheel] = useState(false);
  const [freeSpinToast, setFreeSpinToast] = useState(false);
  const prevSpinsRef = React.useRef(player.mysteryWheel.spinsAvailable);
  // Synchronous daily-deal purchase claim. The persisted one-per-day guard
  // below is read via AsyncStorage (async), so a fast double-tap passed it
  // twice and charged/delivered twice before either write landed. This ref
  // is claimed before the first await; released only on non-purchase exits.
  const dealPurchaseGuardRef = React.useRef<string | null>(null);
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
        // Tiers keyed to the ids checkComebackRewards actually emits
        // (3day/7day/30day). This used to branch on '14day' — which nothing
        // emits — so the 500/15 tier was unreachable and a 30+ day returner
        // was paid the bottom tier.
        const { coins, hints } = comebackAmounts(rewards);
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
      player.ensureDailyQuests(user?.uid);
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

      // Push segments into the notification scheduler so per-cohort caps +
      // reminder hours + enabledCategories apply to the next schedule() call.
      setNotificationSegments(player.segments);

      // Initialize notifications with segment-personalized scheduling
      void notificationManager.init().then(() => {
        const notifConfig = getPersonalizedNotifications(player.segments);
        // Streak reminder, aimed at the next evening the streak is actually
        // at risk — passing lastPlayDate is what keeps it from firing on a
        // day the player has already played.
        if (notifConfig.enabledCategories.includes('streak_reminder')) {
          // updateStreak() ran above in this same effect, but `player.streaks`
          // here is the pre-update render snapshot — lastPlayDate is still
          // yesterday, which schedules a "your streak expires tonight!" ping
          // for an evening the player already secured. Same stale-snapshot
          // bug fixed at useRewardWiring.ts's call site: pass today
          // explicitly (updateStreak unconditionally sets lastPlayDate to
          // today). The streak count floors at 1 because post-update it is
          // always ≥1 — a stale 0 would wrongly CANCEL tomorrow's reminder.
          void triggerStreakReminder(
            Math.max(1, player.streaks.currentStreak),
            new Date().toISOString().split('T')[0],
          );
        }
        // Daily challenge reminder, skipping mornings whose daily is done.
        if (notifConfig.enabledCategories.includes('daily_challenge')) {
          void triggerDailyChallengeReminder(player.dailyCompleted);
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

  // Latest puzzle count for the background handler below — the listener is
  // registered once, so it must read through a ref, not a stale closure.
  const puzzlesSolvedRef = useRef(player.puzzlesSolved);
  puzzlesSolvedRef.current = player.puzzlesSolved;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void analytics.startSession('foreground');
        // Player returned — cancel any pending comeback reminder
        void cancelComebackReminder();
      } else if (state === 'background') {
        void analytics.endSession('background');
        // Player left — schedule the comeback reminder (20h for brand-new
        // players with <10 puzzles, 3 days for everyone else).
        void triggerComebackReminder(puzzlesSolvedRef.current);
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

    // Award rewards from the spin result. Gems route through the shared
    // metered-faucet cap (claimMeteredGems): the wheel is a recurring
    // faucet, and together with quests/timers it pushed engaged players to
    // 12-25 gems/day against a 3/day design target.
    const reward = segment.reward;
    if (reward.coins) economy.addCoins(reward.coins);
    if (reward.gems) {
      const granted = claimMeteredGems(reward.gems, 'mystery_wheel');
      if (granted > 0) economy.addGems(granted);
    }
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
      if (mbReward.gems) {
        const granted = claimMeteredGems(mbReward.gems, 'mystery_wheel');
        if (granted > 0) economy.addGems(granted);
      }
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
  // Grants route through the shared applyGiftGrant mapper so this banner
  // delivers exactly what ClubScreen's GiftInbox delivers for the same gift
  // document. It used to convert 'tile' — and, via a bare else, even 'life' —
  // gifts into random rare collection letters, so the reward depended on
  // which screen the recipient happened to claim from.
  const handleClaimAllGifts = useCallback(async () => {
    if (pendingGifts.length === 0 || claimingGift) return;
    setClaimingGift(true);
    const totals = { hint: 0, tile: 0, life: 0 };
    for (const gift of pendingGifts) {
      const claimed = await firestoreService.claimGift(gift.id);
      if (claimed || !firestoreService.isAvailable()) {
        const granted = applyGiftGrant(gift, economy);
        if (granted) totals[granted.type] += granted.amount;
      }
    }
    setPendingGifts([]);
    setClaimingGift(false);
    const parts: string[] = [];
    if (totals.hint > 0) parts.push(`${totals.hint} hint${totals.hint > 1 ? 's' : ''}`);
    if (totals.tile > 0) parts.push(`${totals.tile} wildcard tile${totals.tile > 1 ? 's' : ''}`);
    if (totals.life > 0) parts.push(totals.life === 1 ? '1 life' : `${totals.life} lives`);
    if (parts.length > 0) {
      Alert.alert('Gifts Claimed!', `You received ${parts.join(' and ')} from friends!`);
    }
  }, [pendingGifts, claimingGift, economy]);

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
        // Deep-link into the recommended mode (R8) — landing on the grid to
        // hunt for the mode we just recommended made the card feel inert.
        action: () =>
          navigation.navigate('Play', {
            screen: 'Modes',
            params: { autoStartMode: segmentMode },
          }),
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
        action: () =>
          navigation.navigate('Play', {
            screen: 'Modes',
            params: { autoStartMode: modeId },
          }),
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
      // Energy check — classic mode costs 1 energy. Designed modal, not a
      // bare OS Alert (see OutOfEnergyModal).
      const energyInfo = player.getEnergyDisplay();
      if (energyInfo.current <= 0 && energyInfo.bonusPlaysLeft <= 0) {
        setEnergyWallMinutes(Math.ceil(player.getTimeUntilNextEnergy() / 60000));
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
          } else if (!isPinchLevel(player.currentLevel) && player.needsBreather()) {
            config = getBreatherConfigExtended(player.currentLevel);
          } else {
            config = getLevelConfigExtended(player.currentLevel);
            // Apply adaptive difficulty adjustment (invisible to player;
            // pinch slots exempt so the easer can't defuse them on retry)
            if (!isPinchLevel(player.currentLevel)) {
              const adjusted = getAdjustedConfig(config, player.performanceMetrics);
              config = adjusted.config;
            }
          }
          const level = difficulty ? 0 : player.currentLevel;
          const chapter = !difficulty ? getChapterForLevel(player.currentLevel) : undefined;
          const board = generateLevelBoard(
            level,
            config,
            level * 1337 + Date.now(),
            'classic',
            chapter?.profile,
            chapter?.themeWords,
          );
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

  // Daily reward timers (R9): DailyRewardTimers was fully built and
  // rendered nowhere. Claim = validate the cooldown, credit the reward,
  // stamp the claim time in the persisted player blob. Guarding with
  // canClaimTimer here (not just in the UI) means a double-tap or stale
  // render can't double-credit.
  const handleClaimRewardTimer = useCallback(
    (timerId: string) => {
      const lastClaimed = player.rewardTimerClaims[timerId] ?? 0;
      if (!canClaimTimer(timerId, lastClaimed)) return;
      const timer = DAILY_REWARD_TIMERS.find((t) => t.id === timerId);
      if (!timer) return;
      const reward: { coins?: number; gems?: number; hints?: number; spins?: number } =
        timer.reward.random ? rollBonusChestReward() : timer.reward;
      if (reward.coins) economy.addCoins(reward.coins);
      if (reward.gems) {
        const granted = claimMeteredGems(reward.gems, 'daily_timer');
        if (granted > 0) economy.addGems(granted);
      }
      if (reward.hints) economy.addHintTokens(reward.hints);
      if (reward.spins) player.awardFreeSpin();
      player.updateProgress({
        rewardTimerClaims: {
          ...player.rewardTimerClaims,
          [timerId]: Date.now(),
        },
      });
      void analytics.logEvent('reward_timer_claimed', {
        timer_id: timerId,
        coins: reward.coins ?? 0,
        gems: reward.gems ?? 0,
      });
    },
    [player, economy],
  );

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
    // In-world feedback instead of an OS alert: the calendar tile flips to
    // its claimed state, the claim chime plays, and the device taps back.
    void soundManager.playSound('loginClaim');
    void successHaptic();
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
        rewardTimerStates={player.rewardTimerClaims}
        onClaimRewardTimer={handleClaimRewardTimer}
        onOpenShop={() => navigation.navigate('Shop')}
        onOpenSettings={() => navigation.navigate('Settings')}
        onOpenSeasonPass={() => navigation.navigate('SeasonPass')}
        onOpenWheel={() => setShowMysteryWheel(true)}
        mysteryWheelSpins={player.mysteryWheel.spinsAvailable}
        dailyFreeSpinAvailable={checkDailyFreeSpin(player.mysteryWheel.lastDailySpinDate)}
        freeSpinToast={freeSpinToast}
        onBuyDeal={async (deal) => {
          // One purchase per day. Without this, the daily deal could be
          // re-bought on every tap — which for the Lucky Draw meant an
          // unbounded gem drain, since its delivery branch was also missing.
          const today = new Date().toISOString().slice(0, 10);
          const dealGuardKey = '@wordfall_daily_deal_purchase';
          const claim = `${deal.id}:${today}`;
          // Synchronous re-entry claim BEFORE the first await — the
          // AsyncStorage guard alone let a double-tap charge twice.
          if (dealPurchaseGuardRef.current === claim) return;
          dealPurchaseGuardRef.current = claim;
          try {
            const prior = await AsyncStorage.getItem(dealGuardKey);
            if (prior === claim) {
              Alert.alert('Already Purchased', "Today's deal is one per day — come back tomorrow!");
              return;
            }
          } catch {
            // Guard read failed — allow the purchase rather than block it.
          }
          const canAfford = economy.canAfford(deal.currency, deal.salePrice);
          if (!canAfford) {
            dealPurchaseGuardRef.current = null;
            Alert.alert('Not Enough ' + (deal.currency === 'coins' ? 'Coins' : 'Gems'),
              `You need ${deal.salePrice} ${deal.currency} for this deal.`);
            return;
          }
          const spent = deal.currency === 'coins'
            ? economy.spendCoins(deal.salePrice)
            : economy.spendGems(deal.salePrice);
          if (!spent) {
            dealPurchaseGuardRef.current = null;
          }
          if (spent) {
            if (deal.contents.coins) economy.addCoins(deal.contents.coins);
            if (deal.contents.gems) economy.addGems(deal.contents.gems);
            if (deal.contents.hintTokens) economy.addHintTokens(deal.contents.hintTokens);
            // The Lucky Draw declares ONLY this content, and there was no
            // branch for it: 25 gems bought an alert and nothing else, on 75
            // days of the year. A rare tile is what its copy promises.
            if (deal.contents.cosmetic === 'random_rare_tile') {
              const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              player.addRareTile(letters[Math.floor(Math.random() * letters.length)]);
            }
            try {
              await AsyncStorage.setItem(dealGuardKey, `${deal.id}:${today}`);
            } catch {
              // Non-fatal: worst case the guard doesn't persist this once.
            }
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
        dailyQuests={player.dailyQuests.quests}
        onClaimDailyQuest={(templateId) => {
          const reward = player.claimDailyQuest(templateId);
          if (!reward) return;
          if (reward.coins) economy.addCoins(reward.coins);
          if (reward.gems) {
            const granted = claimMeteredGems(reward.gems, 'daily_quest');
            if (granted > 0) economy.addGems(granted);
          }
          if (reward.hintTokens) economy.addHintTokens(reward.hintTokens);
          if (reward.boosterTokens) economy.addBoosterToken('wildcardTile', reward.boosterTokens);
          if (reward.xp) economy.addSeasonPassXp(reward.xp);
        }}
        recommendation={recommendation}
        segmentHomeContent={segmentHomeContent}
        segmentWelcomeMessage={segmentWelcomeMessage}
        activeEventBanners={eventManager.getActiveEvents().map(e => ({
          id: e.id,
          name: e.name,
          icon: e.icon,
          description: e.description,
          endMs: e.endTime,
          label: e.type === 'weekend_blitz' ? 'WEEKEND BLITZ' : e.type === 'mini' ? 'MINI EVENT' : 'EVENT',
          color: e.type === 'weekend_blitz' ? COLORS.orange : e.type === 'mini' ? COLORS.teal : COLORS.accent,
        }))}
        onOpenEvents={() => navigation.navigate('Play', { screen: 'Event' })}
        // The level-9 "EXPLORE the Grand Library" onboarding banner calls
        // this. Without it the banner rendered, the button took the press,
        // and nothing happened.
        onOpenLibrary={() => navigation.navigate('Library', { screen: 'LibraryMain' })}
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

      {/* Mystery Wheel Overlay.
          Gated here as well as on the HomeScreen entry: the wheel has a
          second entrance via the `openWheel` route param from the post-puzzle
          spin prompt, and a kill switch that closes one of two doors is not a
          kill switch. This render is the choke point every path passes
          through. */}
      {showMysteryWheel && getRemoteBoolean('mysteryWheelEnabled') && (
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

      {/* R5: restorative streak save. Shown once per break, within 24h. */}
      {(() => {
        const rb = player.streaks.recentBreak;
        const brokenRecently =
          !!rb && Date.now() - rb.brokenAtMs < RESTORE_WINDOW_MS;
        return (
          <PostStreakBreakOffer
            visible={brokenRecently}
            brokenStreakCount={rb?.prevStreak ?? 0}
            gemsAvailable={economy.gems}
            onRestore={() => {
              if (!economy.spendGems(RESTORE_GEM_COST)) return;
              const restored = player.restoreBrokenStreak();
              if (restored > 0) {
                void analytics.logEvent('streak_restored', {
                  restored_count: restored,
                  gem_cost: RESTORE_GEM_COST,
                });
              }
            }}
            onDismiss={() => {
              player.dismissStreakBreak();
              void analytics.logEvent('streak_restore_dismissed', {
                broken_count: rb?.prevStreak ?? 0,
              });
            }}
          />
        );
      })()}
      <OutOfEnergyModal
        visible={energyWallMinutes !== null}
        minutesUntilNext={energyWallMinutes ?? 0}
        gemCost={ENERGY.GEM_REFILL_COST}
        playerGems={economy.gems}
        source="home"
        onWatchAd={() => {
          setEnergyWallMinutes(null);
          void watchAdForEnergyRefill(player);
        }}
        onGemRefill={() => {
          setEnergyWallMinutes(null);
          if (economy.spendGems(ENERGY.GEM_REFILL_COST)) {
            player.refillEnergy('gems');
          } else {
            // HomeMainScreen lives in the Home stack, so Shop is a sibling.
            navigation.navigate('Shop' as never);
          }
        }}
        onClose={() => setEnergyWallMinutes(null)}
      />
    </View>
  );
}

// playerStageFromPuzzles moved to src/hooks/useRewardWiring.ts

// Root app with onboarding check
function AppContent() {
  const player = usePlayer();
  const economy = useEconomy();
  const settings = useSettings();
  const reduceMotion = useReduceMotion();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>();

  // Web-only test hook: the browser build (scripts/build-web.sh) is a QA
  // surface, not a shipping platform — expose the nav ref so screenshot
  // tooling can drive screens directly.
  useEffect(() => {
    if (Platform.OS === 'web') {
      (globalThis as any).__WORDFALL_NAV = navigationRef;
    }
  }, []);

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
  // Credit a ceremony's displayed reward the moment it is popped for
  // showing. Pop removes it from the persisted queue, so the grant is
  // exactly-once; granting anywhere later (dismiss, render) can re-fire if
  // the app dies mid-ceremony. Streak milestones, Atlas completions and
  // win-streak tiers all rendered coin/gem amounts that NO code path
  // credited — a full-screen celebration of currency the player never got.
  const popCeremonyWithGrant = useCallback((): CeremonyItem | null => {
    const ceremony = player.popCeremony();
    if (ceremony) {
      const grant = ceremonyEconomyGrant(ceremony);
      if (grant) {
        if (grant.coins > 0) economy.addCoins(grant.coins);
        if (grant.gems > 0) economy.addGems(grant.gems);
        if (grant.hintTokens > 0) economy.addHintTokens(grant.hintTokens);
        if (grant.rareTile) {
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          player.addRareTile(letters[Math.floor(Math.random() * letters.length)]);
        }
      }
    }
    return ceremony;
  }, [player.popCeremony, player.addRareTile, economy.addCoins, economy.addGems, economy.addHintTokens]);

  const { activeCeremony, handleDismissCeremony, resetBatchCounter } = useCeremonyQueue({
    popCeremony: popCeremonyWithGrant,
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

  useDeepLinks({ player, navigationRef });

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
      {/* While a full-screen ceremony is up, hide the entire navigation
          tree from screen readers so focus cannot escape to covered
          content. Android: importantForAccessibility; iOS:
          accessibilityElementsHidden. */}
      <View
        style={{ flex: 1 }}
        importantForAccessibility={activeCeremony ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={activeCeremony != null}
      >
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
        <RootStack.Navigator screenOptions={getStackMotionOptions(reduceMotion)}>
          {showOnboarding ? (
            <RootStack.Screen name="Onboarding">
              {(props: any) => (
                <OnboardingScreen
                  {...props}
                  onComplete={() => {
                    player.updateProgress({ tutorialComplete: true });

                    // Unlock features at current level. Baseline level-1
                    // unlocks (the Play tab, Classic/Daily modes) are NOT
                    // celebrated — the first modals a player ever sees must
                    // not congratulate them for having a Play button. State
                    // still gets set; only the ceremony is skipped.
                    const level = player.currentLevel || 1;
                    const featureCeremonies = player.checkFeatureUnlocks(level);
                    for (const ceremony of featureCeremonies) {
                      if ((ceremony.data?.unlockLevel ?? 0) <= 1) continue;
                      player.queueCeremony(ceremony);
                    }

                    // Auto-unlock modes at or below current level (mirrors
                    // useRewardWiring). Level-1 baselines unlock silently —
                    // same reasoning as the feature ceremonies above.
                    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
                      if (config.unlockLevel <= level && !player.unlockedModes.includes(modeId)) {
                        player.unlockMode(modeId);
                        if (config.unlockLevel <= 1) continue;
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

                    // The Tier 6 B2 "Day-1 starter bundle" queue that lived
                    // here is deliberately GONE (Aug 2026 fun audit): it
                    // fired a paywall modal before the player had played a
                    // single puzzle — the most reliable D0 churn trigger in
                    // mobile puzzle — and by stamping firstPurchaseModalShownAt
                    // it permanently cannibalized the well-timed L5-6 offer in
                    // useRewardWiring (which respects the non-payer guard AND
                    // offerPacing's min-level-6 rule this path bypassed). The
                    // L5-6 path is now the only first-purchase surface.

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
      </View>

      {/* Ceremony modals — rendered at app level to overlay all screens.
          Wrapped in a local boundary so a render error in any one ceremony
          dequeues cleanly instead of taking down the whole app. */}
      <CeremonyRouter
        activeCeremony={activeCeremony}
        onDismiss={handleDismissCeremony}
        onTryMode={(modeId) => {
          // Same route the Home "try a mode" card uses — land IN the mode,
          // not on the grid hunting for the one we just unlocked.
          (navigationRef.current as NavigationContainerRef<any> | null)?.navigate('Play', {
            screen: 'Modes',
            params: { autoStartMode: modeId },
          });
        }}
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

    // Remote Config had NO caller. Thirty-odd modules read values from it —
    // every kill switch, every A/B variant, the offer pacing knobs, the
    // chapter-override payload for chapters 41+ — and getRemoteValue returns
    // the compile-time default whenever `initialized` is false, which it
    // always was. The whole surface was inert: a feature that shipped broken
    // could only be turned off by a store release.
    //
    // Fire-and-forget on purpose. It must never gate first paint: this runs
    // before any screen mounts, and a device that is offline or on a bad
    // network would otherwise hold the app on a spinner. Fetched values apply
    // to reads that happen after activation (and, thanks to the 12h cache, to
    // the next cold start) — the standard Firebase Remote Config contract.
    void initRemoteConfig();

    // Post-mount rounded display font — not part of the hard-gated useFonts()
    // above, so a stalled fetch can't block the first render. Components
    // subscribe via useRoundedFontReady() and fall back to SpaceGrotesk until
    // this resolves (or forever, if the network is offline on cold start).
    loadFontAsync({
      Baloo2_700Bold: require('@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf'),
    })
      .then(() => markRoundedFontReady())
      .catch(() => {
        // swallow — the fallback font already renders fine
      });

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
