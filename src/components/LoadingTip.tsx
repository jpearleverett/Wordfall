import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants';
import { getRandomTip } from '../data/loadingTips';

interface LoadingTipProps {
  playerLevel: number;
}

export function LoadingTip({ playerLevel }: LoadingTipProps) {
  const tip = useMemo(() => getRandomTip(playerLevel), [playerLevel]);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 600 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const categoryLabel =
    tip.category === 'gameplay' ? 'TIP' :
    tip.category === 'strategy' ? 'STRATEGY' :
    tip.category === 'lore' ? 'LORE' :
    'DID YOU KNOW?';

  return (
    <Animated.View style={[styles.container, containerStyle]}>
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
    fontFamily: FONTS.bodyBold,
    color: COLORS.cyan,
    letterSpacing: 2,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
