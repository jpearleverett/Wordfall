import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  textMuted: '#4a5280',
  accent: '#00d4ff',
  accentGlow: 'rgba(0, 212, 255, 0.3)',
  gold: '#ffd700',
  green: '#4caf50',
  coral: '#ff6b6b',
};

interface ShopItemProps {
  name: string;
  description: string;
  price: string;
  icon: string;
  bestValue?: boolean;
  onPurchase: () => void;
  purchased?: boolean;
}

export default function ShopItem({
  name,
  description,
  price,
  icon,
  bestValue = false,
  onPurchase,
  purchased = false,
}: ShopItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={purchased ? undefined : onPurchase}
      onPressIn={purchased ? undefined : handlePressIn}
      onPressOut={purchased ? undefined : handlePressOut}
      disabled={purchased}
    >
      <Animated.View
        style={[
          styles.card,
          bestValue && styles.bestValueCard,
          purchased && styles.purchasedCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Best Value badge */}
        {bestValue && (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
        )}

        {/* Icon area */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        </View>

        {/* Price / purchased button */}
        <View
          style={[
            styles.priceButton,
            purchased ? styles.purchasedButton : styles.activeButton,
          ]}
        >
          {purchased ? (
            <Text style={styles.purchasedText}>{'\u2713'} Owned</Text>
          ) : (
            <Text style={styles.priceText}>{price}</Text>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginBottom: 12,
  },
  bestValueCard: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  purchasedCard: {
    opacity: 0.65,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  bestValueText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  priceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  activeButton: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  purchasedButton: {
    backgroundColor: COLORS.surfaceLight,
  },
  priceText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  purchasedText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
});
