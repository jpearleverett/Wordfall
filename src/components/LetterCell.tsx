import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS } from '../constants';

interface LetterCellProps {
  letter: string;
  cellId: string;
  size: number;
  isSelected: boolean;
  isHinted: boolean;
  selectionIndex: number;
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
  isFrozen = false,
  isValidWord = false,
  isMoved = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const movedAnim = useRef(new Animated.Value(0)).current;

  // Selection animation — scale bounce + glow
  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.86,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 3.5,
          tension: 260,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
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
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, scaleAnim, glowAnim]);

  // Moved cell flash — simple opacity pulse
  useEffect(() => {
    if (isMoved) {
      movedAnim.setValue(1);
      Animated.timing(movedAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isMoved, movedAnim]);

  // Rich gradient colors based on state
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (isValidWord) return GRADIENTS.tile.valid;
    if (isSelected && isHinted) return GRADIENTS.tile.hint;
    if (isSelected) return GRADIENTS.tile.selected;
    if (isFrozen) return GRADIENTS.tile.frozen;
    return GRADIENTS.tile.default;
  };

  const getBorderColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.gold;
    if (isSelected) return COLORS.accent;
    if (isFrozen) return 'rgba(0, 229, 255, 0.5)';
    return 'rgba(200, 77, 255, 0.30)';
  };

  const borderRadius = size * 0.22;

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return COLORS.accent;
    return '#000';
  };

  // Outer glow ring for selected/valid states
  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? COLORS.greenGlow : isSelected ? COLORS.accentGlow : 'transparent';

  return (
    <View pointerEvents="none">
      {/* Outer ambient glow ring */}
      {showOuterGlow && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: borderRadius + 4,
            backgroundColor: outerGlowColor,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.45],
            }),
          }}
        />
      )}

      {/* Moved cell flash overlay */}
      {isMoved && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: borderRadius + 2,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 45, 149, 0.8)',
            opacity: movedAnim,
          }}
        />
      )}

      <Animated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: getBorderColor(),
            borderWidth: isSelected || isValidWord ? 2.5 : isFrozen ? 2 : 1.5,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: (isSelected || isValidWord) ? 0.7 : 0.4,
            shadowRadius: (isSelected || isValidWord) ? 14 : 6,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 6 : 3 },
            elevation: (isSelected || isValidWord) ? 12 : 5,
          },
        ]}
      >
        {/* Base gradient - the gem body */}
        <LinearGradient
          colors={getGradientColors() as [string, string, ...string[]]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />

        {/* Bottom edge shadow for 3D depth */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomShadow, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
        />

        {/* Letter with premium text rendering */}
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.48 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
            !isSelected && !isValidWord && styles.letterDefault,
          ]}
        >
          {letter}
        </Text>

        {/* Selection index badge */}
        {isSelected && selectionIndex >= 0 && !isValidWord && (
          <View
            style={[
              styles.indexBadge,
              {
                width: size * 0.30,
                height: size * 0.30,
                borderRadius: size * 0.15,
              },
            ]}
          >
            <Text style={[styles.indexText, { fontSize: size * 0.16 }]}>
              {selectionIndex + 1}
            </Text>
          </View>
        )}

        {/* Valid word checkmark */}
        {isValidWord && (
          <View
            style={[
              styles.checkBadge,
              {
                borderRadius: size * 0.15,
                width: size * 0.28,
                height: size * 0.28,
              },
            ]}
          >
            <Text style={[styles.checkText, { fontSize: size * 0.15 }]}>✓</Text>
          </View>
        )}

        {/* Frozen snowflake indicator */}
        {isFrozen && !isSelected && (
          <View style={styles.frozenIndicator}>
            <Text style={styles.frozenIcon}>❄</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    overflow: 'hidden',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  letter: {
    color: COLORS.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  letterDefault: {
    textShadowColor: 'rgba(200,77,255,0.4)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#fff',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 45, 149, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  indexText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  checkText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  frozenIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  frozenIcon: {
    fontSize: 10,
    opacity: 0.8,
  },
});
