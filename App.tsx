import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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
import { Board, Difficulty, GameMode, PlayerProgress } from './src/types';
import { getLevelConfig, COLORS, DIFFICULTY_CONFIGS, MODE_CONFIGS, ECONOMY, COLLECTION } from './src/constants';
import { AuthProvider } from './src/contexts/AuthContext';
import { EconomyProvider, useEconomy } from './src/contexts/EconomyContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { PlayerProvider, usePlayer } from './src/contexts/PlayerContext';
import { soundManager } from './src/services/sound';

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

// Tab icon component
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.surfaceLight,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="⌂" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="▶" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="◆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon="●" focused={focused} />,
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
        // Weekly uses a harder config
        board = generateBoard(DIFFICULTY_CONFIGS.hard, Date.now());
        navigation.navigate('Game', { board, level: 0, mode: 'weekly' });
        return;
      }

      // For other modes, use current level config
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

    // Record puzzle completion in PlayerContext
    const isPerfect = stars === 3;
    player.recordPuzzleComplete(level, score, stars, isPerfect);

    // Record mode play
    player.recordModePlay(mode, score, true);

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

    // Check for atlas word collection from the words found
    if (params.board) {
      const board = params.board as Board;
      board.words.forEach((wp: any) => {
        // Atlas words are checked against all pages
        // This is a simplified version - in production, we'd check against ATLAS_PAGES
        player.collectAtlasWord('animals', wp.word.toUpperCase());
      });
    }
  }, [params, player, economy]);

  const handleNextLevel = useCallback(() => {
    try {
      const currentLevel = params.level || 0;
      const nextLevel = currentLevel + 1;
      const config = getLevelConfig(nextLevel);
      const seed = nextLevel * 1337 + Date.now();
      const board = generateBoard(config, seed);
      const mode = (params.mode || 'classic') as GameMode;
      const modeConfig = MODE_CONFIGS[mode];

      // Navigate to new game with next level
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
  }, [params, navigation]);

  if (!params.board) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: COLORS.textMuted }}>No puzzle loaded</Text>
      </View>
    );
  }

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
    />
  );
}

// Home main screen wrapper - uses PlayerContext instead of legacy useStorage
function HomeMainScreen({ navigation }: any) {
  const player = usePlayer();
  const economy = useEconomy();
  const [loading, setLoading] = useState(false);

  // Check for comeback rewards on mount
  useEffect(() => {
    if (player.loaded) {
      const rewards = player.checkComebackRewards();
      if (rewards.length > 0) {
        // Award comeback bonus
        economy.addCoins(200);
        economy.addHintTokens(5);
        Alert.alert('Welcome Back!', 'We missed you! Here are some bonus coins and hints.');
      }
      // Update streak
      player.updateStreak();
      // Generate daily missions if needed
      player.generateDailyMissions();
    }
  }, [player.loaded]);

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

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
      setLoading(true);
      setTimeout(() => {
        try {
          const config = difficulty
            ? DIFFICULTY_CONFIGS[difficulty]
            : getLevelConfig(player.currentLevel);
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
    [player.currentLevel, navigation]
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
      />
    </View>
  );
}

// Root app with onboarding check
function AppContent() {
  const player = usePlayer();
  const [showOnboarding, setShowOnboarding] = useState(false);

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
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
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
  useEffect(() => {
    soundManager.init();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <EconomyProvider>
          <PlayerProvider>
            <AppContent />
          </PlayerProvider>
        </EconomyProvider>
      </SettingsProvider>
    </AuthProvider>
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
