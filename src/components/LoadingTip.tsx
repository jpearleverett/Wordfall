import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../constants';
import { getRandomTip } from '../data/loadingTips';

interface LoadingTipProps {
  playerLevel: number;
}

export function LoadingTip({ playerLevel }: LoadingTipProps) {
  const tip = useMemo(() => getRandomTip(playerLevel), [playerLevel]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const categoryLabel =
    tip.category === 'gameplay' ? 'TIP' :
    tip.category === 'strategy' ? 'STRATEGY' :
    tip.category === 'lore' ? 'LORE' :
    'DID YOU KNOW?';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.category}>{categoryLabel}</Text>
      <Text style={styles.text}>{tip.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  category: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.cyan,
    letterSpacing: 2,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
