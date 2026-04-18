import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { subscribeBoardGenNotice } from '../utils/boardGenNotice';

/**
 * Non-blocking inline banner that replaces the system Alert previously used
 * on the 4 board-gen timeout fallback paths (App.tsx ~186/498/639/708).
 * A system Alert steals focus and breaks flow; this slides down from the
 * top, auto-hides after 2.5s, and does not gate any UI.
 *
 * Slide-in uses Reanimated `withSpring({ damping: 15, stiffness: 180 })` —
 * same spring the ceremony cards use so the banner lands with the same
 * tactile "settle" the rest of the celebratory UI shares. Slide-out is
 * linear timing with a runOnJS completion to toggle the mount flag.
 */
export function BoardGenBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const slide = useSharedValue(-60);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = subscribeBoardGenNotice(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
      slide.value = withSpring(0, { damping: 15, stiffness: 180 });
      hideTimer.current = setTimeout(() => {
        slide.value = withTiming(
          -60,
          { duration: 220, easing: Easing.in(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(setVisible)(false);
          },
        );
      }, 2500);
    });
    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [slide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { top: insets.top + 8 }, animatedStyle]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text} numberOfLines={2}>
        {t('game.boardGenSlowBanner')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceGlass ?? 'rgba(22,24,36,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 9999,
    ...SHADOWS.medium,
  },
  text: {
    color: COLORS.textPrimary ?? '#fff',
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    textAlign: 'center',
  },
});
