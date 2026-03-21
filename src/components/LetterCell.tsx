import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, TYPOGRAPHY } from '../constants';

interface LetterCellProps {
  letter: string;
  cellId: string;
  size: number;
  isSelected: boolean;
  isHinted: boolean;
  selectionIndex: number;
  onPress: () => void;
}

export const LetterCell = React.memo(function LetterCell({
  letter,
  cellId,
  size,
  isSelected,
  isHinted,
  selectionIndex,
  onPress,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const settleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(settleAnim, {
        toValue: 0.96,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.spring(settleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cellId, settleAnim]);

  useEffect(() => {
    if (isSelected || isHinted) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.94,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: isSelected ? 1.06 : 1.03,
            friction: 4,
            tension: 190,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 130,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [glowAnim, isHinted, isSelected, scaleAnim]);

  const backgroundColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.cellDefault, isHinted && !isSelected ? COLORS.cellHint : COLORS.cellSelected],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, isHinted && !isSelected ? COLORS.gold : COLORS.accentStrong],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.4],
  });

  const gradientColors = isSelected
    ? GRADIENTS.tileSelected
    : isHinted
      ? GRADIENTS.tileHint
      : GRADIENTS.tile;

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <Animated.View
        style={[
          styles.cellShell,
          {
            width: size,
            height: size,
            transform: [{ scale: Animated.multiply(scaleAnim, settleAnim) }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.cellGlow,
            {
              borderRadius: size * 0.26,
              opacity: glowOpacity,
              shadowColor: isHinted && !isSelected ? COLORS.gold : COLORS.accent,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.cell,
            {
              borderRadius: size * 0.24,
              backgroundColor,
              borderColor,
            },
          ]}
        >
          <LinearGradient colors={gradientColors} style={styles.gradientFill}>
            <View style={styles.cellInnerGlow} />
            <Text
              style={[
                styles.letter,
                {
                  fontSize: size * 0.44,
                  textShadowColor: isSelected ? COLORS.accentGlowStrong : 'rgba(0,0,0,0.3)',
                },
              ]}
            >
              {letter}
            </Text>
            {isSelected && selectionIndex >= 0 && (
              <View
                style={[
                  styles.indexBadge,
                  {
                    width: size * 0.28,
                    height: size * 0.28,
                    borderRadius: size * 0.14,
                  },
                ]}
              >
                <Text style={[styles.indexText, { fontSize: size * 0.16 }]}>{selectionIndex + 1}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cellShell: {
    margin: 2,
  },
  cellGlow: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: COLORS.cellShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInnerGlow: {
    position: 'absolute',
    top: 4,
    left: '20%',
    right: '20%',
    height: '24%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  letter: {
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.display,
    textAlign: 'center',
    textShadowRadius: 12,
  },
  indexBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(6, 11, 29, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  indexText: {
    color: COLORS.accentStrong,
    fontFamily: TYPOGRAPHY.ui,
  },
});
