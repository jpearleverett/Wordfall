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
  isFrozen?: boolean;
  isValidWord?: boolean;
  isMoved?: boolean;
}

export const LetterCell = React.memo(function LetterCell({
  letter,
  cellId,
  size,
  isSelected,
  isHinted,
  selectionIndex,
  onPress,
  isFrozen = false,
  isValidWord = false,
  isMoved = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const movedAnim = useRef(new Animated.Value(0)).current;

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

  // Moved cell highlight animation (post-gravity)
  useEffect(() => {
    if (isMoved) {
      movedAnim.setValue(1);
      Animated.timing(movedAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [isMoved]);

  // Determine cell color based on state
  const getBackgroundColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.cellHint;
    if (isSelected) return COLORS.cellSelected;
    if (isFrozen) return 'rgba(0, 212, 255, 0.2)';
    return COLORS.cellDefault;
  };

  const getBorderColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.gold;
    if (isSelected) return COLORS.accent;
    if (isFrozen) return COLORS.accent;
    return 'transparent';
  };

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isFrozen ? 'rgba(0, 212, 255, 0.2)' : COLORS.cellDefault,
      isValidWord ? COLORS.green : (isHinted ? COLORS.cellHint : COLORS.cellSelected),
    ],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isFrozen ? COLORS.accent : 'transparent',
      isValidWord ? COLORS.green : (isHinted ? COLORS.gold : COLORS.accent),
    ],
  });

  const movedBorderColor = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(0, 212, 255, 0.6)'],
  });

  const movedShadowOpacity = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
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
            borderColor: isMoved && !isSelected ? movedBorderColor : borderColor,
            borderWidth: 2,
            transform: [{ scale: scaleAnim }],
            shadowColor: isMoved ? COLORS.accent : '#000',
            shadowOpacity: isMoved ? movedShadowOpacity : 0.3,
            shadowRadius: isMoved ? 6 : 3,
          },
        ]}
      >
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.48 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
          ]}
        >
          {letter}
        </Text>
        {isSelected && selectionIndex >= 0 && !isValidWord && (
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
        {isValidWord && (
          <View style={[styles.checkBadge, { borderRadius: size * 0.15 }]}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
        {isFrozen && !isSelected && (
          <View style={styles.frozenIndicator}>
            <Text style={styles.frozenIcon}>❄</Text>
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
  letterValid: {
    color: '#fff',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 12,
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
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.green,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  frozenIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
  },
  frozenIcon: {
    fontSize: 8,
    opacity: 0.6,
  },
});
