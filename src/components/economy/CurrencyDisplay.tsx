import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

const COLORS = {
  bg: '#0a0e27',
  surface: '#1a1f45',
  surfaceLight: '#252b5e',
  textPrimary: '#ffffff',
  textSecondary: '#8890b5',
  gold: '#ffd700',
  purple: '#a855f7',
  accent: '#00d4ff',
};

const GLOW_COLORS: Record<string, string> = {
  [COLORS.gold]: 'rgba(255, 215, 0, 0.5)',
  [COLORS.purple]: 'rgba(168, 85, 247, 0.5)',
  [COLORS.accent]: 'rgba(0, 212, 255, 0.5)',
};

interface CurrencyDisplayProps {
  coins?: number;
  gems?: number;
  hintTokens?: number;
  compact?: boolean;
  onPressCurrency?: (type: string) => void;
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------

function useAnimatedValue(target: number) {
  const displayAnim = useRef(new Animated.Value(target)).current;
  const prevValue = useRef(target);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (target !== prevValue.current) {
      prevValue.current = target;
      displayAnim.setValue(target);
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 12,
        }),
      ]).start();
    }
  }, [target, displayAnim, scaleAnim]);

  return { scaleAnim, value: target };
}

// ---------------------------------------------------------------------------
// Single currency item
// ---------------------------------------------------------------------------

interface ItemProps {
  icon: string;
  amount: number;
  label?: string;
  color: string;
  compact: boolean;
  onPress?: () => void;
}

function CurrencyItem({ icon, amount, label, color, compact, onPress }: ItemProps) {
  const { scaleAnim, value } = useAnimatedValue(amount);

  const formatted =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);

  const glowColor = GLOW_COLORS[color] || 'rgba(255,255,255,0.3)';

  const content = (
    <Animated.View
      style={[
        styles.item,
        compact && styles.itemCompact,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        style={[
          styles.amount,
          {
            color,
            textShadowColor: glowColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          },
        ]}
      >
        {formatted}
      </Text>
      {!compact && label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Main display
// ---------------------------------------------------------------------------

export default function CurrencyDisplay({
  coins = 0,
  gems = 0,
  hintTokens = 0,
  compact = false,
  onPressCurrency,
}: CurrencyDisplayProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Inner subtle glow */}
      <View style={styles.innerGlow} />
      {coins > 0 || !compact ? (
        <CurrencyItem
          icon={'\uD83E\uDE99'}
          amount={coins}
          label="Coins"
          color={COLORS.gold}
          compact={compact}
          onPress={onPressCurrency ? () => onPressCurrency('coins') : undefined}
        />
      ) : null}
      {gems > 0 || !compact ? (
        <CurrencyItem
          icon={'\uD83D\uDC8E'}
          amount={gems}
          label="Gems"
          color={COLORS.purple}
          compact={compact}
          onPress={onPressCurrency ? () => onPressCurrency('gems') : undefined}
        />
      ) : null}
      {hintTokens > 0 || !compact ? (
        <CurrencyItem
          icon={'\uD83D\uDCA1'}
          amount={hintTokens}
          label="Hints"
          color={COLORS.accent}
          compact={compact}
          onPress={
            onPressCurrency ? () => onPressCurrency('hints') : undefined
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: 'rgba(0, 212, 255, 0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  containerCompact: {
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  innerGlow: {
    position: 'absolute',
    top: -20,
    left: '20%',
    width: '60%',
    height: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
    borderRadius: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCompact: {
    gap: 4,
  },
  icon: {
    fontSize: 16,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: -2,
  },
});
