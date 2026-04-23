import React, { useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../../constants';

const INDICATOR_WIDTH = 20;
const INDICATOR_HEIGHT = 3;
const TAB_BAR_HEIGHT = 64;

const NeonTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const tabCount = state.routes.length;
  const tabWidth = screenWidth / tabCount;

  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const toValue =
      tabWidth * state.index + tabWidth / 2 - INDICATOR_WIDTH / 2;
    Animated.spring(indicatorX, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [state.index, tabWidth, indicatorX]);

  // Honor `tabBarStyle: { display: 'none' }` set by the focused screen via
  // `navigation.getParent()?.setOptions(...)`. The default React Navigation
  // tab bar respects this automatically; this is a custom tab bar, so we
  // have to opt in. Used by `useHideTabBarOnFocus` to hide the bar during
  // gameplay. This check MUST come after every hook (Rules of Hooks) —
  // doing the early-return first drops the useRef/useEffect from the
  // render tree and React throws "Rendered fewer hooks than expected".
  const focusedDescriptor = descriptors[state.routes[state.index]?.key];
  const focusedTabBarStyle = focusedDescriptor?.options?.tabBarStyle as
    | { display?: 'flex' | 'none' }
    | undefined;
  if (focusedTabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <LinearGradient
      colors={GRADIENTS.tabBar as unknown as readonly [string, string, ...string[]]}
      style={[
        styles.container,
        { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom },
      ]}
    >
      {/* Neon top edge line */}
      <View style={[styles.topEdge, SHADOWS.neonGlow(COLORS.accent)]} />

      {/* Sliding neon indicator */}
      <Animated.View
        style={[
          styles.indicator,
          SHADOWS.neonGlow(COLORS.accent),
          { transform: [{ translateX: indicatorX }] },
        ]}
      />

      {/* Tab items */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? COLORS.accent : COLORS.textMuted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as any).tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 24,
              })}
              <Animated.Text
                style={[
                  styles.label,
                  {
                    color,
                    ...(isFocused && {
                      textShadowColor: COLORS.accentGlow,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 12,
                    }),
                  },
                ]}
                numberOfLines={1}
              >
                {typeof label === 'string' ? label : route.name}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.accent,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    backgroundColor: COLORS.accent,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  tabRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 4,
  },
});

export default NeonTabBar;
