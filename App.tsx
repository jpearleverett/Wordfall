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
import { useStorage } from './src/hooks/useStorage';
import { generateBoard, generateDailyBoard } from './src/engine/boardGenerator';
import { Board, Difficulty, GameMode } from './src/types';
import { getLevelConfig, COLORS, DIFFICULTY_CONFIGS, MODE_CONFIGS } from './src/constants';
import { AuthProvider } from './src/contexts/AuthContext';
import { EconomyProvider } from './src/contexts/EconomyContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { PlayerProvider } from './src/contexts/PlayerContext';
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
      <PlayStack.Screen name="Modes" component={ModesScreen} />
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
          tabBarIcon: ({ focused }) => <TabIcon icon="⌂" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayStackScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="▶" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsStackScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="◆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="●" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Wrapper to pass navigation params to GameScreen
function GameScreenWrapper({ route, navigation }: any) {
  const params = route.params || {};
  return (
    <GameScreen
      board={params.board}
      level={params.level || 0}
      isDaily={params.isDaily || false}
      mode={params.mode || 'classic'}
      maxMoves={params.maxMoves || 0}
      timeLimit={params.timeLimit || 0}
      onComplete={(stars: number, score: number) => {
        // Handle completion
      }}
      onNextLevel={() => {
        // Navigate to next level
        navigation.goBack();
      }}
      onHome={() => navigation.goBack()}
    />
  );
}

// Home main screen wrapper
function HomeMainScreen({ navigation }: any) {
  const { progress, loaded, recordPuzzleComplete, recordDailyComplete, resetProgress } =
    useStorage();
  const [loading, setLoading] = useState(false);

  const startGame = useCallback(
    (difficulty?: Difficulty) => {
      setLoading(true);
      setTimeout(() => {
        try {
          const config = difficulty
            ? DIFFICULTY_CONFIGS[difficulty]
            : getLevelConfig(progress.currentLevel);
          const level = difficulty ? 0 : progress.currentLevel;
          const board = generateBoard(config, level * 1337 + Date.now());
          setLoading(false);
          navigation.navigate('Game', { board, level, mode: 'classic', isDaily: false });
        } catch (e) {
          Alert.alert('Error', 'Failed to generate puzzle. Please try again.');
          setLoading(false);
        }
      }, 50);
    },
    [progress.currentLevel, navigation]
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
        { text: 'Reset', style: 'destructive', onPress: () => resetProgress() },
      ]
    );
  }, [resetProgress]);

  if (!loaded) {
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

export default function App() {
  useEffect(() => {
    soundManager.init();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <EconomyProvider>
          <PlayerProvider>
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
                <RootStack.Screen name="MainTabs" component={MainTabs} />
                <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
              </RootStack.Navigator>
            </NavigationContainer>
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
