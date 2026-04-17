import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS } from '../constants';
import {
  getSyncStatus,
  subscribeSyncStatus,
  type SyncSnapshot,
} from '../services/syncStatus';

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
  const [snap, setSnap] = useState<SyncSnapshot>(() => getSyncStatus());
  const insets = useSafeAreaInsets();
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeSyncStatus(setSnap);
    return unsub;
  }, []);

  const shouldShow =
    snap.state === 'failed' && snap.failureCount >= SHOW_AFTER_N_FAILURES;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: shouldShow ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [shouldShow, opacity]);

  if (!shouldShow) return null;

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
