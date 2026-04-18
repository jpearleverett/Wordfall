import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { subscribeBoardGenNotice } from '../utils/boardGenNotice';

/**
 * Non-blocking inline banner that replaces the system Alert previously used
 * on the 4 board-gen timeout fallback paths (App.tsx ~186/498/639/708).
 * A system Alert steals focus and breaks flow; this slides down from the
 * top, auto-hides after 2.5s, and does not gate any UI.
 */
export function BoardGenBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(-60)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = subscribeBoardGenNotice(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(slide, {
          toValue: -60,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 2500);
    });
    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [slide]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { top: insets.top + 8, transform: [{ translateY: slide }] },
      ]}
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
