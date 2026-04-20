import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import { useCommerce } from '../hooks/useCommerce';
import { usePlayer } from '../contexts/PlayerContext';
import { analytics } from '../services/analytics';
import { getProductById } from '../data/shopProducts';
import { logger } from '../utils/logger';

/**
 * First-purchase hard-modal offer. Fires once post-puzzle for non-payers
 * at levels 5–6 (see useRewardWiring dispatch). Pairs strikethrough anchor
 * price with the $0.49 impulse tier product `first_purchase_special`.
 *
 * The "shown once" guard (PlayerData.firstPurchaseModalShownAt) is set in
 * an effect on mount so a network interruption mid-render still counts as
 * "shown" — we never want to re-surface after the first interrupt.
 */

const PRODUCT_ID = 'first_purchase_special';
const ACCENT = COLORS.gold;

interface FirstPurchaseOfferModalProps {
  onDismiss: () => void;
}

export function FirstPurchaseOfferModal({ onDismiss }: FirstPurchaseOfferModalProps) {
  const { purchaseProduct } = useCommerce();
  const { updateProgress, currentLevel } = usePlayer();
  const product = getProductById(PRODUCT_ID);

  const fade = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const decorationsMounted = useDeferredMount(280);

  const [purchasing, setPurchasing] = useState(false);
  const shownReported = useRef(false);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 15, stiffness: 180 });
  }, []);

  // Fire shown analytics + mark the one-time guard exactly once on mount.
  useEffect(() => {
    if (shownReported.current) return;
    shownReported.current = true;
    void analytics.logEvent('first_purchase_modal_shown', {
      product_id: PRODUCT_ID,
      level: currentLevel,
      segment: 'non_payer',
    });
    updateProgress({ firstPurchaseModalShownAt: Date.now() });
  }, [currentLevel, updateProgress]);

  const handleAccept = async () => {
    if (purchasing) return;
    void analytics.logEvent('first_purchase_modal_accepted', { product_id: PRODUCT_ID });
    setPurchasing(true);
    try {
      const result = await purchaseProduct(PRODUCT_ID);
      if (!result.success) {
        // Non-cancel failures surface an alert; user stays on the modal so
        // they can retry. Cancels dismiss silently.
        if (result.error && !/cancel/i.test(result.error)) {
          Alert.alert('Purchase Failed', result.error);
        }
        setPurchasing(false);
        return;
      }
      // Success — fulfillment already applied via useCommerce. Dismiss.
      onDismiss();
    } catch (err) {
      logger.warn('[FirstPurchaseOfferModal] purchase error:', err);
      setPurchasing(false);
    }
  };

  const handleDismiss = (reason: 'user_dismiss' | 'timeout' = 'user_dismiss') => {
    if (purchasing) return;
    void analytics.logEvent('first_purchase_modal_dismissed', { reason });
    onDismiss();
  };

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const priceLabel = product?.fallbackPrice ?? '$0.49';
  const originalPriceLabel = product?.originalPrice ?? '$1.99';

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {decorationsMounted && (
        <SparkleField count={18} intensity="medium" colors={[ACCENT, COLORS.gold, '#fff']} />
      )}
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: ACCENT }]}>WELCOME GIFT</Text>

          <View style={[styles.iconBg, { backgroundColor: ACCENT + '20', borderColor: ACCENT + '40' }]}>
            <Text style={styles.icon}>{product?.icon ?? '🎁'}</Text>
          </View>

          <Text style={[styles.title, { color: ACCENT }]}>First Purchase — 75% off</Text>
          <Text style={styles.description}>
            {product?.description ?? '200 Coins + 25 Gems + 5 Hints'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.strikePrice}>{originalPriceLabel}</Text>
            <Text style={[styles.price, { color: ACCENT }]}>{priceLabel}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={() => void handleAccept()}
            disabled={purchasing}
            accessibilityRole="button"
            accessibilityLabel={`Claim welcome gift for ${priceLabel}`}
            accessibilityState={{ busy: purchasing }}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT + 'CC']}
              style={[styles.button, SHADOWS.glow(ACCENT)]}
            >
              {purchasing ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text style={styles.buttonText}>{`CLAIM FOR ${priceLabel}`}</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.dismissButton}
            onPress={() => handleDismiss('user_dismiss')}
            disabled={purchasing}
            accessibilityRole="button"
            accessibilityLabel="No thanks"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
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
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
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
  iconBg: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  icon: { fontSize: 38 },
  title: {
    fontSize: 20,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 260,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 22,
  },
  strikePrice: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 200,
    ...SHADOWS.medium,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  dismissButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    textDecorationLine: 'underline',
  },
});
