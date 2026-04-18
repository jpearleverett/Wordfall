import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { analytics } from '../services/analytics';

const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * Contextual Offer — Monetization pressure point that appears at moments of tension.
 *
 * Triggered when:
 * 1. Player fails a level 2+ times (offer hints bundle)
 * 2. Player runs out of lives (offer life refill or gem pack)
 * 3. Player is 1 word away from winning with 0 hints left (offer hints)
 * 4. Player's streak is about to expire (offer streak shield)
 * 5. Post-puzzle with empty hint inventory (soft upsell)
 *
 * These are NOT aggressive paywalls — they are contextual, dismissible,
 * and positioned as helpful offers rather than gatekeeping.
 */

export type OfferType =
  | 'hint_rescue'    // Offered after 2+ fails on same level
  | 'life_refill'    // Offered when lives hit 0
  | 'streak_shield'  // Offered when streak is about to expire
  | 'close_finish'   // Offered when 1 word away with no hints
  | 'post_puzzle'    // Soft hint upsell after completing with 0 hints left
  | 'booster_pack';  // Offered when entering a hard/expert level

interface ContextualOfferProps {
  type: OfferType;
  /** Additional context for dynamic messaging */
  context?: {
    failCount?: number;
    streakDays?: number;
    levelNumber?: number;
    difficulty?: string;
    wordsRemaining?: number;
    hintsUsed?: number;
    livesRemaining?: number;
  };
  /** Countdown duration in seconds before auto-dismiss (default 300 = 5 min) */
  expiresInSeconds?: number;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Non-string structural config (icon + color). User-facing copy lives in
 * `src/locales/*.json` under the `offer.*` namespace; the component looks it
 * up at render time via `useTranslation`.
 */
const OFFER_VISUAL: Record<OfferType, { icon: string; accentColor: string; i18nKey: string }> = {
  hint_rescue: { icon: '\u{1F4A1}', accentColor: COLORS.accent, i18nKey: 'hintRescue' },
  life_refill: { icon: '\u{2764}\u{FE0F}', accentColor: COLORS.coral, i18nKey: 'lifeRefill' },
  streak_shield: { icon: '\u{1F6E1}\u{FE0F}', accentColor: COLORS.orange, i18nKey: 'streakShield' },
  close_finish: { icon: '\u{1F525}', accentColor: COLORS.green, i18nKey: 'closeFinish' },
  post_puzzle: { icon: '\u{1F4A1}', accentColor: COLORS.accent, i18nKey: 'postPuzzle' },
  booster_pack: { icon: '\u{26A1}', accentColor: COLORS.purple, i18nKey: 'boosterPack' },
};

export function ContextualOffer({
  type,
  context,
  expiresInSeconds = 300,
  onAccept,
  onDismiss,
}: ContextualOfferProps) {
  const { t } = useTranslation();
  const fade = useSharedValue(0);
  const slideY = useSharedValue(40);
  const pulse = useSharedValue(1);

  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);

  const visual = OFFER_VISUAL[type];
  const ribbon = t(`offer.${visual.i18nKey}.ribbon`);
  const title = t(`offer.${visual.i18nKey}.title`);
  const buttonText = t(`offer.${visual.i18nKey}.button`);
  const priceLabel = t(`offer.${visual.i18nKey}.price`);
  const description = t(`offer.${visual.i18nKey}.description`, {
    streak: context?.streakDays ?? '',
    difficulty: context?.difficulty ?? '',
  });

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void analytics.logEvent('offer_expired', { offerType: type });
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [type, onDismiss]);

  // Pulse animation when under 60 seconds
  useEffect(() => {
    if (secondsLeft > 0 && secondsLeft < 60) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
      );
      return () => cancelAnimation(pulse);
    }
  }, [secondsLeft < 60]);

  // Format seconds as MM:SS
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  useEffect(() => {
    fade.value = withTiming(1, { duration: 250 });
    slideY.value = withSpring(0, { damping: 14, stiffness: 100 });
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View
      style={[
        styles.overlay,
        overlayStyle,
      ]}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: visual.accentColor }]}>{ribbon}</Text>

          <View style={[styles.iconContainer, { backgroundColor: visual.accentColor + '20', borderColor: visual.accentColor + '40' }]}>
            <Text style={styles.icon}>{visual.icon}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {/* FOMO countdown timer */}
          <View style={styles.timerContainer} accessibilityRole="timer" accessibilityLabel={`${t('offer.expiresIn')} ${minutes} minutes and ${seconds} seconds`}>
            <Text style={styles.timerLabel}>{t('offer.expiresIn')}</Text>
            <AnimatedText
              style={[
                styles.timerText,
                secondsLeft < 60 && styles.timerTextUrgent,
                pulseStyle,
              ]}
            >
              {timerText}
            </AnimatedText>
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel={`${buttonText} for ${priceLabel}`}
          >
            <LinearGradient
              colors={[visual.accentColor, visual.accentColor + 'CC']}
              style={[styles.button, SHADOWS.glow(visual.accentColor)]}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
              <Text style={styles.priceText}>{priceLabel}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.dismissButton} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('offer.dismissA11y')}>
            <Text style={styles.dismissText}>{t('offer.noThanks')}</Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 190,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbon: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 260,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  timerText: {
    color: COLORS.coral,
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 2,
  },
  timerTextUrgent: {
    textShadowColor: COLORS.coralGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  priceText: {
    color: COLORS.bg + 'CC',
    fontSize: 11,
    marginTop: 2,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  dismissText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
