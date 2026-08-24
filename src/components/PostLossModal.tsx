import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { useCeremonyTransition } from '../hooks/useCeremonyTransition';
import { analytics } from '../services/analytics';
import { errorHaptic, wordFoundHaptic } from '../services/haptics';
import GameIcon, { GameIconName } from './icons/GameIcon';

/**
 * Loss variants.
 *
 * - 'stuck'          — Generic dead-end / ran-out-of-moves. "So Close!" +
 *                       gold accent. Default for backward compatibility.
 * - 'timeout'        — timePressure mode timer hit zero. "Time's Up!" +
 *                       red accent + stopwatch icon.
 * - 'perfect_broken' — perfectSolve mode violation (player used hint /
 *                       undo / picked a wrong word). "Perfect Broken" +
 *                       gold→grey fade + cracked-gem icon.
 *
 * All three share the same CTA layout (watch-ad-for-hint, buy-hints,
 * dismiss) so the conversion surface is consistent — only the header
 * art, copy, and haptic differ.
 */
export type PostLossVariant = 'stuck' | 'timeout' | 'perfect_broken';

interface PostLossModalProps {
  wordsFound: number;
  totalWords: number;
  onWatchAd: () => void;
  onBuyHints: () => void;
  onDismiss: () => void;
  variant?: PostLossVariant;
}

const AUTO_DISMISS_MS = 8000;

interface VariantTheme {
  icon: GameIconName;
  title: string;
  subtitleStuck: (wordsRemaining: number, totalWords: number, percent: number) => string;
  accentColor: string;
  titleColor: string;
  titleGlow: string;
  haptic: () => Promise<void>;
  analyticsOfferType: string;
}

const VARIANTS: Record<PostLossVariant, VariantTheme> = {
  stuck: {
    icon: 'target',
    title: 'So Close!',
    subtitleStuck: (wordsRemaining, _total, percent) =>
      wordsRemaining === 1
        ? 'Just 1 word away from victory!'
        : `Only ${wordsRemaining} words left — ${percent}% complete!`,
    accentColor: COLORS.gold,
    titleColor: COLORS.gold,
    titleGlow: COLORS.goldGlow,
    haptic: wordFoundHaptic,
    analyticsOfferType: 'post_loss',
  },
  timeout: {
    icon: 'hourglass',
    title: "Time's Up!",
    subtitleStuck: (wordsRemaining, _total, percent) =>
      `${percent}% done when the clock ran out — ${wordsRemaining} word${
        wordsRemaining === 1 ? '' : 's'
      } away. Keep your streak alive?`,
    accentColor: '#E94B4B',
    titleColor: '#E94B4B',
    titleGlow: 'rgba(233, 75, 75, 0.55)',
    haptic: errorHaptic,
    analyticsOfferType: 'post_loss_timeout',
  },
  perfect_broken: {
    icon: 'gem',
    title: 'Perfect Broken',
    subtitleStuck: (wordsRemaining, _total, percent) =>
      `One slip. ${percent}% solved, ${wordsRemaining} word${
        wordsRemaining === 1 ? '' : 's'
      } to go. Run it back for a flawless?`,
    accentColor: '#A48B3E',
    titleColor: '#A48B3E',
    titleGlow: 'rgba(164, 139, 62, 0.45)',
    haptic: errorHaptic,
    analyticsOfferType: 'post_loss_perfect_broken',
  },
};

export function PostLossModal({
  wordsFound,
  totalWords,
  onWatchAd,
  onBuyHints,
  onDismiss,
  variant = 'stuck',
}: PostLossModalProps) {
  const theme = VARIANTS[variant];
  // Shared ceremony policy: overlay fades, card scales, instant settle +
  // instant dismiss under reduced motion, finished-guarded exit.
  const { overlayStyle, cardStyle, requestDismiss } = useCeremonyTransition(onDismiss);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(AUTO_DISMISS_MS / 1000));

  useEffect(() => {
    void analytics.logEvent('offer_shown', {
      offer_type: theme.analyticsOfferType,
      words_found: wordsFound,
      total_words: totalWords,
    });
    void theme.haptic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pure countdown tick — side effects live in the timeLeft === 0 effect
  // below, never inside the state updater.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      requestDismiss();
    }
  }, [timeLeft, requestDismiss]);

  const handleWatchAd = useCallback(() => {
    void analytics.logEvent('offer_accepted', {
      offer_type: theme.analyticsOfferType,
      action: 'watch_ad',
    });
    onWatchAd();
  }, [onWatchAd, theme.analyticsOfferType]);

  const handleBuyHints = useCallback(() => {
    void analytics.logEvent('offer_accepted', {
      offer_type: theme.analyticsOfferType,
      action: 'buy_hints',
    });
    onBuyHints();
  }, [onBuyHints, theme.analyticsOfferType]);

  const handleDismiss = useCallback(() => {
    void analytics.logEvent('offer_dismissed', { offer_type: theme.analyticsOfferType });
    requestDismiss();
  }, [requestDismiss, theme.analyticsOfferType]);

  const wordsRemaining = Math.max(0, totalWords - wordsFound);
  const progressPercent = totalWords > 0 ? Math.round((wordsFound / totalWords) * 100) : 0;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.bgLight]}
          style={styles.gradient}
        >
          <View style={styles.icon}>
            <GameIcon name={theme.icon} size={48} accent={theme.accentColor} />
          </View>
          <Text
            style={[
              styles.title,
              {
                color: theme.titleColor,
                textShadowColor: theme.titleGlow,
              },
            ]}
          >
            {theme.title}
          </Text>
          <Text style={styles.subtitle}>
            {theme.subtitleStuck(wordsRemaining, totalWords, progressPercent)}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: theme.accentColor,
                },
              ]}
            />
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
      </Animated.View>
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
  icon: {
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    marginBottom: 8,
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
