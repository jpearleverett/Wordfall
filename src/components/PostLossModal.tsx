import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { analytics } from '../services/analytics';

interface PostLossModalProps {
  wordsFound: number;
  totalWords: number;
  onWatchAd: () => void;
  onBuyHints: () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export function PostLossModal({
  wordsFound,
  totalWords,
  onWatchAd,
  onBuyHints,
  onDismiss,
}: PostLossModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [timeLeft, setTimeLeft] = useState(Math.ceil(AUTO_DISMISS_MS / 1000));

  useEffect(() => {
    void analytics.logEvent('offer_shown', { offer_type: 'post_loss', words_found: wordsFound, total_words: totalWords });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDismiss]);

  const handleWatchAd = useCallback(() => {
    void analytics.logEvent('offer_accepted', { offer_type: 'post_loss', action: 'watch_ad' });
    onWatchAd();
  }, [onWatchAd]);

  const handleBuyHints = useCallback(() => {
    void analytics.logEvent('offer_accepted', { offer_type: 'post_loss', action: 'buy_hints' });
    onBuyHints();
  }, [onBuyHints]);

  const handleDismiss = useCallback(() => {
    void analytics.logEvent('offer_dismissed', { offer_type: 'post_loss' });
    onDismiss();
  }, [onDismiss]);

  const wordsRemaining = totalWords - wordsFound;
  const progressPercent = Math.round((wordsFound / totalWords) * 100);

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.card}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.bgLight]}
          style={styles.gradient}
        >
          <Text style={styles.title}>So Close!</Text>
          <Text style={styles.subtitle}>
            {wordsRemaining === 1
              ? 'Just 1 word away from victory!'
              : `Only ${wordsRemaining} words left — ${progressPercent}% complete!`}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {wordsFound}/{totalWords} words found
          </Text>

          {/* CTA buttons */}
          <Pressable
            style={({ pressed }) => [styles.adButton, pressed && styles.buttonPressed]}
            onPress={handleWatchAd}
            accessibilityRole="button"
            accessibilityLabel="Watch an ad for a free hint and retry"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.adButtonText}>Watch Ad for Hint + Retry</Text>
            <Text style={styles.adButtonSubtext}>FREE</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.buyButton, pressed && styles.buttonPressed]}
            onPress={handleBuyHints}
            accessibilityRole="button"
            accessibilityLabel="Buy 5 hints for 99 cents"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.buyButtonText}>Get 5 Hints — $0.99</Text>
          </Pressable>

          <Pressable
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss offer. Auto-dismisses in ${timeLeft} seconds.`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissText}>No thanks ({timeLeft}s)</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
  },
  card: {
    width: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.strong,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.gold,
    marginBottom: 8,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  adButton: {
    width: '100%',
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  adButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.bg,
  },
  adButtonSubtext: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.bg,
    opacity: 0.8,
    marginTop: 2,
  },
  buyButton: {
    width: '100%',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buyButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
