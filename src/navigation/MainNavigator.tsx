import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import NeonTabBar from '../components/navigation/NeonTabBar';
import { HomeScreen } from '../screens/HomeScreen';
import ModesScreen from '../screens/ModesScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShopScreen from '../screens/ShopScreen';
import ClubScreen from '../screens/ClubScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import EventScreen from '../screens/EventScreen';
import { usePlayer } from '../contexts/PlayerContext';
import { COLORS, FONTS } from '../constants';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const PlayStack = createStackNavigator();
const CollectionsStack = createStackNavigator();
const LibraryStack = createStackNavigator();
const ProfileStack = createStackNavigator();

export const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.bg },
};

// ── Tab icon styles (extracted to avoid object creation on every render) ──

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

// ── Stack screens ──
// These accept injected screen components for Game and ModesWrapper,
// since those wrappers live in App.tsx and need handleComplete / energy wiring.

interface StackScreensProps {
  GameScreenWrapper: React.ComponentType<any>;
  ModesScreenWrapper: React.ComponentType<any>;
  HomeMainScreen: React.ComponentType<any>;
}

export function createHomeStackScreen(HomeMainScreen: React.ComponentType<any>, GameScreenWrapper: React.ComponentType<any>) {
  return function HomeStackScreen() {
    return (
      <HomeStack.Navigator screenOptions={screenOptions}>
        <HomeStack.Screen name="HomeMain" component={HomeMainScreen} />
        <HomeStack.Screen name="Shop" component={ShopScreen} />
        <HomeStack.Screen name="Settings" component={SettingsScreen} />
        <HomeStack.Screen name="Game" component={GameScreenWrapper} />
      </HomeStack.Navigator>
    );
  };
}

function EventScreenWrapper({ navigation }: any) {
  return (
    <EventScreen
      onPlayEventPuzzle={() => navigation.navigate('Game', { mode: 'classic' })}
      onOpenEventShop={() => navigation.navigate('Modes')}
    />
  );
}

export function createPlayStackScreen(ModesScreenWrapper: React.ComponentType<any>, GameScreenWrapper: React.ComponentType<any>) {
  return function PlayStackScreen() {
    return (
      <PlayStack.Navigator screenOptions={screenOptions}>
        <PlayStack.Screen name="Modes" component={ModesScreenWrapper} />
        <PlayStack.Screen name="Game" component={GameScreenWrapper} />
        <PlayStack.Screen name="Event" component={EventScreenWrapper} />
        <PlayStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      </PlayStack.Navigator>
    );
  };
}

export function CollectionsStackScreen() {
  return (
    <CollectionsStack.Navigator screenOptions={screenOptions}>
      <CollectionsStack.Screen name="CollectionsMain" component={CollectionsScreen} />
    </CollectionsStack.Navigator>
  );
}

export function LibraryStackScreen() {
  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
    </LibraryStack.Navigator>
  );
}

function ProfileMainScreen({ navigation }: any) {
  return (
    <ProfileScreen
      onOpenSettings={() => navigation.navigate('Settings')}
      onEditProfile={() => navigation.navigate('Settings')}
    />
  );
}

export function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileMainScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Club" component={ClubScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Main Tab Navigator with progressive tab unlocking ──

interface MainTabsProps {
  HomeStackScreen: React.ComponentType<any>;
  PlayStackScreen: React.ComponentType<any>;
}

export function MainTabs({ HomeStackScreen, PlayStackScreen }: MainTabsProps) {
  const player = usePlayer();

  const hasFeature = (id: string) => player.featuresUnlocked.includes(id);

  return (
    <Tab.Navigator
      tabBar={(props) => <NeonTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
