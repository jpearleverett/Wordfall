import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import ModesScreen from './src/screens/ModesScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/screens/ShopScreen';
import ClubScreen from './src/screens/ClubScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import EventScreen from './src/screens/EventScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { generateBoard, generateDailyBoard } from './src/engine/boardGenerator';
import { Board, CeremonyItem, Difficulty, GameMode, PlayerProgress } from './src/types';
import { getLevelConfig, COLORS, DIFFICULTY_CONFIGS, MODE_CONFIGS, ECONOMY, COLLECTION, FEATURE_UNLOCK_SCHEDULE, FONTS, TYPOGRAPHY } from './src/constants';
import { getBreatherConfig } from './src/constants';
import { AuthProvider } from './src/contexts/AuthContext';
import { EconomyProvider, useEconomy } from './src/contexts/EconomyContext';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';
import { PlayerProvider, usePlayer } from './src/contexts/PlayerContext';
import { soundManager } from './src/services/sound';
import { setHapticsEnabled } from './src/services/haptics';
import { ATLAS_PAGES } from './src/data/collections';
import { generateShareText } from './src/utils/shareGenerator';
import { FeatureUnlockCeremony } from './src/components/FeatureUnlockCeremony';
import { ModeUnlockCeremony } from './src/components/ModeUnlockCeremony';
import { AchievementCeremony } from './src/components/AchievementCeremony';
import { StreakMilestoneCeremony } from './src/components/StreakMilestoneCeremony';
import { CollectionCompleteCeremony } from './src/components/CollectionCompleteCeremony';
import { SessionEndReminder } from './src/components/SessionEndReminder';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const PlayStack = createStackNavigator();
const CollectionsStack = createStackNavigator();
const LibraryStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const RootStack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.bg },
};

// Home Tab Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeMainScreen} />
      <HomeStack.Screen name="Shop" component={ShopScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
      <HomeStack.Screen name="Game" component={GameScreenWrapper} />
    </HomeStack.Navigator>
  );
}

// Play Tab Stack
function PlayStackScreen() {
  return (
    <PlayStack.Navigator screenOptions={screenOptions}>
      <PlayStack.Screen name="Modes" component={ModesScreenWrapper} />
      <PlayStack.Screen name="Game" component={GameScreenWrapper} />
      <PlayStack.Screen name="Event" component={EventScreen} />
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

// Profile Tab Stack
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Club" component={ClubScreen} />
    </ProfileStack.Navigator>
  );
}

// Tab icon component — Neon Intelligence design: vector icons with precision glow
function TabIcon({ iconName, focused }: { iconName: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons
        name={iconName}
        size={22}
        color={focused ? COLORS.accent : COLORS.textMuted}
        style={focused ? {
          textShadowColor: COLORS.accentGlow,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        } : undefined}
      />
      {focused && (
        <View style={{
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
        }} />
      )}
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0f28',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          height: 64 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 8,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
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

  const handleSelectMode = useCallback((modeId: string) => {
    const mode = modeId as GameMode;
    try {
      let board: Board;
      const config = getLevelConfig(player.currentLevel);

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

      const seed = Date.now() + player.currentLevel * 1337;
      board = generateBoard(config, seed);

      const modeConfig = MODE_CONFIGS[mode];
      navigation.navigate('Game', {
        board,
        level: player.currentLevel,
        mode,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
    }
  }, [player.currentLevel, navigation]);

  return <ModesScreen onSelectMode={handleSelectMode} />;
}

// Wrapper to pass navigation params to GameScreen with full context wiring
function GameScreenWrapper({ route, navigation }: any) {
  const params = route.params || {};
  const player = usePlayer();
  const economy = useEconomy();

  const handleComplete = useCallback((stars: number, score: number) => {
    const level = params.level || 0;
    const mode = (params.mode || 'classic') as GameMode;
    const isDaily = params.isDaily || false;

    // Capture pre-complete state for level-up detection
    const prevLevel = player.currentLevel;
    const prevHighest = player.highestLevel;
    const isFirstWin = player.puzzlesSolved === 0;

    // Record puzzle completion in PlayerContext
    const isPerfect = stars === 3;
    player.recordPuzzleComplete(level, score, stars, isPerfect);

    // Record mode play
    player.recordModePlay(mode, score, true);

    // Reset consecutive failures on success
    if (player.consecutiveFailures > 0) {
      player.updateProgress({ consecutiveFailures: 0, lastLevelStars: stars });
    }

    // Award coins based on difficulty
    const difficulty: Difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
    const coinReward = ECONOMY.puzzleCompleteCoins[difficulty] + (stars * ECONOMY.starBonus);
    economy.addCoins(coinReward);

    // Award gems for perfect clears
    if (isPerfect) {
      economy.addGems(ECONOMY.perfectClearGems);
    }

    // Award library points
    economy.addLibraryPoints(stars * 5);

    // Handle daily completion
    if (isDaily) {
      const today = new Date().toISOString().split('T')[0];
      player.recordDailyComplete(today);
      economy.addCoins(ECONOMY.dailyCompleteCoins);
      economy.addGems(ECONOMY.dailyCompleteGems);
      player.updateStreak();
    }

    // Check for rare tile drop
    const dropChance = COLLECTION.rareTileBaseChance
      + (difficulty === 'hard' || difficulty === 'expert' ? COLLECTION.rareTileHardBonus : 0)
      + (isPerfect ? COLLECTION.rareTilePerfectBonus : 0);
    if (Math.random() < dropChance) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      player.addRareTile(randomLetter);
    }

    // Check for atlas word collection from the words found (all pages)
    if (params.board) {
      const board = params.board as Board;
      board.words.forEach((wp: any) => {
        const word = wp.word.toLowerCase();
        for (const page of ATLAS_PAGES) {
          if (page.words.includes(word)) {
            player.collectAtlasWord(page.id, word);
          }
        }
      });

      // Check for collection completions
      for (const page of ATLAS_PAGES) {
        const collected = player.collections.atlasPages[page.id] || [];
        if (collected.length === page.words.length && collected.length > 0) {
          // Check if we just completed it (wasn't complete before this puzzle)
          const wordsFromThisPuzzle = board.words.map((wp: any) => wp.word.toLowerCase());
          const newlyCollected = wordsFromThisPuzzle.some(
            (w: string) => page.words.includes(w) && !collected.includes(w)
          );
          if (newlyCollected) {
            player.queueCeremony({
              type: 'collection_complete',
              data: { icon: page.icon, name: page.category, reward: page.reward },
            });
          }
        }
      }
    }

    // Update mission progress
    player.missions.dailyMissions.forEach((mission) => {
      if (mission.completed) return;
      if (mission.id === 'solve_3_puzzles' || mission.id === 'earn_3_stars') {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'earn_500_score') {
        player.updateMissionProgress(mission.id, mission.progress + score);
      }
      if (mission.id === 'solve_without_hints' && isPerfect) {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'get_perfect_solve' && isPerfect) {
        player.updateMissionProgress(mission.id, mission.progress + 1);
      }
      if (mission.id === 'complete_daily' && isDaily) {
        player.updateMissionProgress(mission.id, 1);
      }
    });

    // Update weekly goal progress
    player.updateWeeklyGoalProgress('puzzles_solved', 1);
    player.updateWeeklyGoalProgress('total_score', score);
    player.updateWeeklyGoalProgress('stars_earned', stars);
    if (isPerfect) player.updateWeeklyGoalProgress('perfect_solves', 1);
    if (isDaily) player.updateWeeklyGoalProgress('daily_completed', 1);

    // Detect level-up
    const newLevel = Math.max(level + 1, prevLevel);
    const leveledUp = newLevel > prevHighest;

    // Detect difficulty transition
    const difficultyTransition = leveledUp ? detectDifficultyTransition(prevHighest, newLevel) : null;
    if (difficultyTransition) {
      player.queueCeremony({
        type: 'difficulty_transition',
        data: { from: difficultyTransition.from, to: difficultyTransition.to },
      });
    }

    // Check feature unlocks based on new level
    const featureUnlocks = player.checkFeatureUnlocks(newLevel);
    for (const ceremony of featureUnlocks) {
      player.queueCeremony(ceremony);
    }

    // Check achievements
    const board = params.board as Board | undefined;
    const maxCombo = board ? board.words.length : 0; // Approximate; actual combo tracked in GameScreen
    const achievementCeremonies = player.checkAchievements({ maxCombo });
    for (const ceremony of achievementCeremonies) {
      player.queueCeremony(ceremony);
    }

    // Auto-unlock modes based on level progression and queue ceremonies
    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
      if (config.unlockLevel <= newLevel && !player.unlockedModes.includes(modeId)) {
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

    // Generate share text
    const grid = params.board ? (params.board as Board).grid : null;
    const shareText = grid
      ? generateShareText(grid, level, stars, score, 0, isDaily)
      : '';

    // Store completion metadata in route params for GameScreen to pick up
    navigation.setParams({
      completionData: {
        isFirstWin,
        leveledUp,
        newLevel,
        difficultyTransition,
        nextLevelPreview: !isDaily ? {
          level: newLevel,
          difficulty: getDifficultyForLevel(newLevel),
        } : null,
        shareText,
        friendComparison: { beaten: Math.floor(Math.random() * 4) + 1, total: 5 },
      },
    });
  }, [params, player, economy, navigation]);

  const handleNextLevel = useCallback(() => {
    try {
      const currentLevel = params.level || 0;
      const nextLevel = currentLevel + 1;

      // Check if player needs a breather level
      const useBreather = player.needsBreather();
      const config = useBreather ? getBreatherConfig(nextLevel) : getLevelConfig(nextLevel);

      const seed = nextLevel * 1337 + Date.now();
      const board = generateBoard(config, seed);
      const mode = (params.mode || 'classic') as GameMode;
      const modeConfig = MODE_CONFIGS[mode];

      navigation.replace('Game', {
        board,
        level: nextLevel,
        mode,
        isDaily: false,
        maxMoves: modeConfig.rules.hasMoveLimit ? board.words.length : 0,
        timeLimit: modeConfig.rules.timerSeconds || 0,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate next puzzle.');
      navigation.goBack();
    }
  }, [params, navigation, player]);

  if (!params.board) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: COLORS.textMuted }}>No puzzle loaded</Text>
      </View>
    );
  }

  // Extract completion data from params (set by handleComplete)
  const completionData = params.completionData || {};

  return (
    <GameScreen
      board={params.board}
      level={params.level || 0}
      isDaily={params.isDaily || false}
      mode={params.mode || 'classic'}
      maxMoves={params.maxMoves || 0}
      timeLimit={params.timeLimit || 0}
      onComplete={handleComplete}
      onNextLevel={handleNextLevel}
      onHome={() => navigation.goBack()}
      isFirstWin={completionData.isFirstWin}
      leveledUp={completionData.leveledUp}
      newLevel={completionData.newLevel}
      difficultyTransition={completionData.difficultyTransition}
      nextLevelPreview={completionData.nextLevelPreview}
      shareText={completionData.shareText}
      friendComparison={completionData.friendComparison}
    />
  );
}

// Home main screen wrapper - uses PlayerContext instead of legacy useStorage
function HomeMainScreen({ navigation }: any) {
  const player = usePlayer();
  const economy = useEconomy();
  const [loading, setLoading] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [comebackCoins, setComebackCoins] = useState(0);
  const [comebackHints, setComebackHints] = useState(0);
  const welcomeAnim = React.useRef(new Animated.Value(0)).current;

  // Ceremony queue state
  const [activeCeremony, setActiveCeremony] = useState<CeremonyItem | null>(null);

  // Session end reminder
  const [showSessionReminder, setShowSessionReminder] = useState(false);

  // Check for comeback rewards and process ceremonies on mount
  useEffect(() => {
    if (player.loaded) {
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

      // Process pending ceremonies
      if (!showWelcomeBack && player.pendingCeremonies.length > 0) {
        const next = player.popCeremony();
        if (next) setActiveCeremony(next);
      }
    }
  }, [player.loaded]);

  // Process next ceremony when current one is dismissed
  const handleDismissCeremony = useCallback(() => {
    setActiveCeremony(null);
    // Check for more ceremonies after a short delay
    setTimeout(() => {
      const next = player.popCeremony();
      if (next) setActiveCeremony(next);
    }, 300);
  }, [player]);

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

  // Personalized recommendation
  const recommendation = React.useMemo(() => {
    if (playerStage === 'new') return null;

    // Suggest untried modes
    const untriedModes = player.unlockedModes.filter(
      (m: string) => !player.modeStats[m] || player.modeStats[m].played === 0
    );
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
        subtitle: 'Same puzzle for everyone — compete globally!',
        action: () => navigation.navigate('Play' as never),
      };
    }

    // Default: suggest harder difficulty
    return {
      icon: '⚡',
      title: 'Push Your Limits',
      subtitle: 'Try a harder difficulty to earn more stars!',
      action: () => navigation.navigate('Play' as never),
    };
  }, [playerStage, player.unlockedModes, player.modeStats, player.dailyCompleted, navigation]);

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
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
          }
          const level = difficulty ? 0 : player.currentLevel;
          const board = generateBoard(config, level * 1337 + Date.now());
          setLoading(false);
          navigation.navigate('Game', { board, level, mode: 'classic', isDaily: false });
        } catch (e) {
          Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
          setLoading(false);
        }
      }, 50);
    },
    [player.currentLevel, navigation, player]
  );

  const startDaily = useCallback(() => {
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
  }, [navigation]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Progress',
      'Are you sure? This will erase all saved progress.',
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
      <HomeScreen
        progress={progress}
        onPlay={startGame}
        onDaily={startDaily}
        onResetProgress={handleReset}
        onOpenShop={() => navigation.navigate('Shop')}
        onOpenSettings={() => navigation.navigate('Settings')}
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
                  // Process ceremonies after welcome-back
                  const next = player.popCeremony();
                  if (next) setActiveCeremony(next);
                });
              }}
            >
              <Text style={styles.welcomeButtonText}>LET'S PLAY!</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Ceremony modals */}
      {activeCeremony?.type === 'feature_unlock' && (
        <FeatureUnlockCeremony
          icon={activeCeremony.data.icon}
          title={activeCeremony.data.title}
          description={activeCeremony.data.description}
          accentColor={activeCeremony.data.accentColor}
          onDismiss={handleDismissCeremony}
        />
      )}
      {activeCeremony?.type === 'mode_unlock' && (
        <ModeUnlockCeremony
          modeName={activeCeremony.data.modeName}
          modeIcon={activeCeremony.data.modeIcon}
          modeDescription={activeCeremony.data.modeDescription}
          modeColor={activeCeremony.data.modeColor}
          onDismiss={handleDismissCeremony}
        />
      )}
      {activeCeremony?.type === 'achievement' && (
        <AchievementCeremony
          icon={activeCeremony.data.icon}
          name={activeCeremony.data.name}
          description={activeCeremony.data.description}
          tier={activeCeremony.data.tier}
          reward={activeCeremony.data.reward}
          onDismiss={handleDismissCeremony}
        />
      )}
      {activeCeremony?.type === 'streak_milestone' && (
        <StreakMilestoneCeremony
          milestone={activeCeremony.data.streakCount}
          onDismiss={handleDismissCeremony}
        />
      )}
      {activeCeremony?.type === 'collection_complete' && (
        <CollectionCompleteCeremony
          collectionIcon={activeCeremony.data.icon}
          collectionName={activeCeremony.data.name}
          reward={activeCeremony.data.reward}
          onDismiss={handleDismissCeremony}
        />
      )}

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

// Root app with onboarding check
function AppContent() {
  const player = usePlayer();
  const settings = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!settings.loaded) return;
    soundManager.setSfxVolume(settings.sfxVolume);
    soundManager.setMusicVolume(settings.musicVolume);
    soundManager.setMuted(settings.sfxVolume <= 0 && settings.musicVolume <= 0);
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.loaded, settings.sfxVolume, settings.musicVolume, settings.hapticsEnabled]);

  useEffect(() => {
    if (player.loaded && !player.tutorialComplete) {
      setShowOnboarding(true);
    }
  }, [player.loaded, player.tutorialComplete]);

  if (!player.loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
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
                  // Unlock default features for new players
                  player.unlockFeature('tab_play');
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
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SettingsProvider>
            <EconomyProvider>
              <PlayerProvider>
                <AppContent />
              </PlayerProvider>
            </EconomyProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
});
