import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

const COLORS = {
  bg: '#0a0e27',
  bgLight: '#111638',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  textMuted: '#4a5280',
  accent: '#00d4ff',
  accentGlow: 'rgba(0, 212, 255, 0.3)',
  gold: '#ffd700',
  green: '#4caf50',
  coral: '#ff6b6b',
  purple: '#a855f7',
  star: '#ffd700',
  buttonPrimary: '#00d4ff',
  buttonSecondary: '#252b5e',
  buttonDanger: '#ff6b6b',
};

// ---------------------------------------------------------------------------
// Navigation param types
// ---------------------------------------------------------------------------

export type HomeStackParamList = {
  HomeScreen: undefined;
  ShopScreen: undefined;
  SettingsScreen: undefined;
};

export type PlayStackParamList = {
  ModesScreen: undefined;
  GameScreen: { mode?: string };
  EventScreen: { eventId?: string };
  LeaderboardScreen: undefined;
};

export type CollectionsStackParamList = {
  CollectionsScreen: undefined;
};

export type LibraryStackParamList = {
  LibraryScreen: undefined;
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  SettingsScreen: undefined;
  ClubScreen: { clubId?: string };
};

export type RootTabParamList = {
  Home: undefined;
  Play: undefined;
  Collections: undefined;
  Library: undefined;
  Profile: undefined;
};

// ---------------------------------------------------------------------------
// Placeholder screen
// ---------------------------------------------------------------------------

function PlaceholderScreen({ route }: any) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>{route.name}</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});

// ---------------------------------------------------------------------------
// Shared stack screen options
// ---------------------------------------------------------------------------

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: COLORS.bg,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: {
    fontWeight: '700' as const,
    fontSize: 18,
  },
  cardStyle: { backgroundColor: COLORS.bg },
};

// ---------------------------------------------------------------------------
// Stack navigators
// ---------------------------------------------------------------------------

const HomeStackNav = createStackNavigator<HomeStackParamList>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <HomeStackNav.Screen name="HomeScreen" component={PlaceholderScreen} />
      <HomeStackNav.Screen name="ShopScreen" component={PlaceholderScreen} />
      <HomeStackNav.Screen name="SettingsScreen" component={PlaceholderScreen} />
    </HomeStackNav.Navigator>
  );
}

const PlayStackNav = createStackNavigator<PlayStackParamList>();
function PlayStack() {
  return (
    <PlayStackNav.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <PlayStackNav.Screen name="ModesScreen" component={PlaceholderScreen} />
      <PlayStackNav.Screen name="GameScreen" component={PlaceholderScreen} />
      <PlayStackNav.Screen name="EventScreen" component={PlaceholderScreen} />
      <PlayStackNav.Screen name="LeaderboardScreen" component={PlaceholderScreen} />
    </PlayStackNav.Navigator>
  );
}

const CollectionsStackNav = createStackNavigator<CollectionsStackParamList>();
function CollectionsStack() {
  return (
    <CollectionsStackNav.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <CollectionsStackNav.Screen name="CollectionsScreen" component={PlaceholderScreen} />
    </CollectionsStackNav.Navigator>
  );
}

const LibraryStackNav = createStackNavigator<LibraryStackParamList>();
function LibraryStack() {
  return (
    <LibraryStackNav.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <LibraryStackNav.Screen name="LibraryScreen" component={PlaceholderScreen} />
    </LibraryStackNav.Navigator>
  );
}

const ProfileStackNav = createStackNavigator<ProfileStackParamList>();
function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileScreen" component={PlaceholderScreen} />
      <ProfileStackNav.Screen name="SettingsScreen" component={PlaceholderScreen} />
      <ProfileStackNav.Screen name="ClubScreen" component={PlaceholderScreen} />
    </ProfileStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Tab icon component
// ---------------------------------------------------------------------------

interface TabIconProps {
  symbol: string;
  focused: boolean;
  color: string;
  size: number;
}

function TabIcon({ symbol, focused, color, size }: TabIconProps) {
  return (
    <View style={[tabIconStyles.wrapper, focused && tabIconStyles.focusedWrapper]}>
      <Text
        style={[
          tabIconStyles.icon,
          { color, fontSize: size },
          focused && tabIconStyles.focusedIcon,
        ]}
      >
        {symbol}
      </Text>
      {focused && <View style={[tabIconStyles.dot, { backgroundColor: color }]} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  focusedWrapper: {
    transform: [{ scale: 1.1 }],
  },
  icon: {
    fontWeight: '400',
  },
  focusedIcon: {
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});

// ---------------------------------------------------------------------------
// Bottom tab navigator
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<RootTabParamList>();

function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          height: Platform.OS === 'ios' ? 88 : 68,
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon symbol={'\u2302'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon symbol={'\u25B6'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon symbol={'\u25C6'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon symbol={'\uD83D\uDCDA'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon symbol={'\u25CF'} focused={focused} color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// App navigator (exported)
// ---------------------------------------------------------------------------

const navigationTheme = {
  dark: true,
  colors: {
    primary: COLORS.accent,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.textPrimary,
    border: COLORS.surfaceLight,
    notification: COLORS.coral,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <RootTabs />
    </NavigationContainer>
  );
}
