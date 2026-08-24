import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { useSyncStatusSelector } from '../services/syncStatus';

/**
 * Surfaces a small banner when recent Firestore writes keep failing
 * (failureCount > 0 and state === 'failed'). Auto-hides on the next
 * successful sync. Non-blocking and pointer-transparent so it never
 * gates gameplay.
 *
 * Threshold is conservative — one transient blip shouldn't alarm the
 * user, so we wait for ≥2 consecutive failures before showing.
 */
const SHOW_AFTER_N_FAILURES = 2;

export function NotSyncedBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const opacity = React.useRef(new Animated.Value(0)).current;

  // Derived boolean — the hook only re-renders when THIS predicate's
  // value flips, not on every pendingOps tick.
  const shouldShow = useSyncStatusSelector(
    (s) => s.state === 'failed' && s.failureCount >= SHOW_AFTER_N_FAILURES,
  );

  // Stay mounted through the fade-out: the old `if (!shouldShow) return
  // null` unmounted the banner on the same render the 220ms exit fade
  // started, so the exit animation never actually displayed.
  const [rendered, setRendered] = React.useState(false);
  useEffect(() => {
    if (shouldShow) setRendered(true);
    const anim = Animated.timing(opacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished && !shouldShow) setRendered(false);
    });
    return () => anim.stop();
  }, [shouldShow, opacity]);

  if (!rendered) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        { bottom: insets.bottom + 12, opacity },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={2}>
        {t('common.notSynced')}
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
    borderColor: 'rgba(255,120,120,0.35)',
    zIndex: 9998,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
    marginRight: 8,
  },
  text: {
    color: COLORS.textPrimary ?? '#fff',
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    textAlign: 'center',
  },
});
