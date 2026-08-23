import React, { useRef, useEffect, useState } from 'react';
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
import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  getTabIndicatorPlan,
  getTabVisibilityPlan,
  shouldUnmountTabBar,
  TAB_INDICATOR_WIDTH,
} from '../../navigation/motionOptions';

const INDICATOR_HEIGHT = 3;
const TAB_BAR_HEIGHT = 64;

const NeonTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width: screenWidth } = useWindowDimensions();
  const tabCount = state.routes.length;
  const tabWidth = screenWidth / tabCount;

  const initialIndicator = getTabIndicatorPlan(tabWidth, state.index, reduceMotion);
  const indicatorX = useRef(new Animated.Value(initialIndicator.target)).current;

  useEffect(() => {
    const plan = getTabIndicatorPlan(tabWidth, state.index, reduceMotion);
    if (!plan.animate) {
      indicatorX.setValue(plan.target);
      return;
    }

    const animation = Animated.spring(indicatorX, {
      toValue: plan.target,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    });
    animation.start();
    return () => animation.stop();
  }, [indicatorX, reduceMotion, state.index, tabWidth]);

  const focusedDescriptor = descriptors[state.routes[state.index]?.key];
  const focusedTabBarStyle = focusedDescriptor?.options?.tabBarStyle as
    | { display?: 'flex' | 'none' }
    | undefined;
  const hidden = focusedTabBarStyle?.display === 'none';
  const visibilityPlan = getTabVisibilityPlan(hidden, reduceMotion);
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const [mounted, setMounted] = useState(!hidden);
  const visibility = useRef(new Animated.Value(visibilityPlan.target)).current;

  useEffect(() => {
    const plan = getTabVisibilityPlan(hidden, reduceMotion);
    if (plan.ensureMounted) setMounted(true);
    if (plan.duration === 0) {
      visibility.setValue(plan.target);
      setMounted(!plan.unmountOnFinish);
      return;
    }

    const animation = Animated.timing(visibility, {
      toValue: plan.target,
      duration: plan.duration,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (
        shouldUnmountTabBar(
          finished,
          plan.unmountOnFinish,
          hiddenRef.current,
        )
      ) {
        setMounted(false);
      }
    });
    return () => animation.stop();
  }, [hidden, reduceMotion, visibility]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={visibilityPlan.pointerEvents}
      style={[
        styles.container,
        { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom },
        {
          opacity: visibility,
          transform: [
            {
              translateY: visibility.interpolate({
                inputRange: [0, 1],
                outputRange: [TAB_BAR_HEIGHT + insets.bottom, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={GRADIENTS.tabBar as unknown as readonly [string, string, ...string[]]}
        style={StyleSheet.absoluteFillObject}
      />
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
    </Animated.View>
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
    width: TAB_INDICATOR_WIDTH,
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
