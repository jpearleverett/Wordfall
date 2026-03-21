import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS } from '../../constants';

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
          styles.cardOuter,
          bestValue && styles.bestValueOuter,
          purchased && styles.purchasedCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={[GRADIENTS.surfaceCard[0], GRADIENTS.surfaceCard[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Subtle top highlight */}
          <View style={styles.cardTopHighlight} />

          {/* Best Value badge */}
          {bestValue && (
            <LinearGradient
              colors={['#ffe066', '#ffd700', '#f0a500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bestValueBadge}
            >
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </LinearGradient>
          )}

          {/* Icon area */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Text style={styles.icon}>{icon}</Text>
          </LinearGradient>

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
          {purchased ? (
            <View style={styles.purchasedButton}>
              <Text style={styles.purchasedText}>{'\u2713'} Owned</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[GRADIENTS.button.primary[0], GRADIENTS.button.primary[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.priceButton}
            >
              <Text style={styles.priceText}>{price}</Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  bestValueOuter: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  purchasedCard: {
    opacity: 0.65,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  bestValueText: {
    color: '#000',
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    fontFamily: FONTS.bodyBold,
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
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  purchasedButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  priceText: {
    color: '#000',
    fontSize: 14,
    fontFamily: FONTS.display,
  },
  purchasedText: {
    color: COLORS.green,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
});
