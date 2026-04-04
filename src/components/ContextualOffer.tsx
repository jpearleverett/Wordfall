import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';

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
  onAccept: () => void;
  onDismiss: () => void;
}

const OFFER_CONFIG: Record<OfferType, {
  ribbon: string;
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  accentColor: string;
  priceLabel: string;
}> = {
  // TODO: Add expiresInSeconds: 300 FOMO timer (5-minute countdown) to each offer config
  // and render a visible countdown in the modal UI to create purchase urgency
  hint_rescue: {
    ribbon: 'STUCK?',
    icon: '\u{1F4A1}',
    title: 'Hint Rescue Pack',
    description: 'Get 5 hints to help crack this level. You\'re closer than you think!',
    buttonText: 'GET 5 HINTS',
    accentColor: COLORS.accent,
    priceLabel: '5 gems',
  },
  life_refill: {
    ribbon: 'OUT OF LIVES',
    icon: '\u{2764}\u{FE0F}',
    title: 'Instant Refill',
    description: 'Don\'t wait! Get all 5 lives back instantly.',
    buttonText: 'REFILL NOW',
    accentColor: COLORS.coral,
    priceLabel: '10 gems',
  },
  streak_shield: {
    ribbon: 'STREAK AT RISK',
    icon: '\u{1F6E1}\u{FE0F}',
    title: 'Protect Your Streak',
    description: 'Your {streak}-day streak expires tonight. Shield it!',
    buttonText: 'ACTIVATE SHIELD',
    accentColor: COLORS.orange,
    priceLabel: '30 gems',
  },
  close_finish: {
    ribbon: 'SO CLOSE!',
    icon: '\u{1F525}',
    title: 'Just 1 Word Away',
    description: 'You\'re one word from victory! A hint could seal the deal.',
    buttonText: 'GET A HINT',
    accentColor: COLORS.green,
    priceLabel: '3 gems',
  },
  post_puzzle: {
    ribbon: 'LOW ON HINTS',
    icon: '\u{1F4A1}',
    title: 'Stock Up',
    description: 'Great solve! Grab hints for the next challenge.',
    buttonText: 'GET 10 HINTS',
    accentColor: COLORS.accent,
    priceLabel: '10 gems',
  },
  booster_pack: {
    ribbon: 'TOUGH LEVEL AHEAD',
    icon: '\u{26A1}',
    title: 'Power-Up Pack',
    description: 'Get Spotlight + Wildcard + Shuffle for this {difficulty} puzzle!',
    buttonText: 'GET 3 BOOSTERS',
    accentColor: COLORS.purple,
    priceLabel: '15 gems',
  },
};

export function ContextualOffer({
  type,
  context,
  onAccept,
  onDismiss,
}: ContextualOfferProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const config = OFFER_CONFIG[type];

  // Template variable replacement
  let description = config.description;
  if (context?.streakDays) {
    description = description.replace('{streak}', String(context.streakDays));
  }
  if (context?.difficulty) {
    description = description.replace('{difficulty}', context.difficulty);
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: fadeAnim },
      ]}
    >
      <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: config.accentColor }]}>{config.ribbon}</Text>

          <View style={[styles.iconContainer, { backgroundColor: config.accentColor + '20', borderColor: config.accentColor + '40' }]}>
            <Text style={styles.icon}>{config.icon}</Text>
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.description}>{description}</Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onAccept}
          >
            <LinearGradient
              colors={[config.accentColor, config.accentColor + 'CC']}
              style={[styles.button, SHADOWS.glow(config.accentColor)]}
            >
              <Text style={styles.buttonText}>{config.buttonText}</Text>
              <Text style={styles.priceText}>{config.priceLabel}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>No thanks</Text>
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
