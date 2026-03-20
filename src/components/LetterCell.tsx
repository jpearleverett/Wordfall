import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../constants';

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

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [isSelected]);

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.cellDefault, isHinted ? COLORS.cellHint : COLORS.cellSelected],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', isHinted ? COLORS.gold : COLORS.accent],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius: size * 0.18,
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: 2,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.48 },
            isSelected && styles.letterSelected,
          ]}
        >
          {letter}
        </Text>
        {isSelected && selectionIndex >= 0 && (
          <View
            style={[
              styles.indexBadge,
              { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 },
            ]}
          >
            <Text style={[styles.indexText, { fontSize: size * 0.18 }]}>
              {selectionIndex + 1}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  letter: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 8,
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: COLORS.bg,
    fontWeight: '800',
  },
});
