import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';

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
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Continuous subtle shimmer on all tiles
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3000 + Math.random() * 2000, useNativeDriver: true }),
        Animated.delay(500),
      ]),
    ).start();
  }, [shimmerAnim]);

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.86,
          duration: 60,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 3.5,
          tension: 260,
          useNativeDriver: false,
        }),
      ]).start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }).start();

      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }).start();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [isSelected, pulseAnim]);

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

  // Rich gradient colors based on state - more stops for gem-like depth
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
    if (isFrozen) return 'rgba(0, 212, 255, 0.5)';
    return 'rgba(255,255,255,0.10)';
  };

  const movedBorderColor = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', 'rgba(0, 212, 255, 0.8)'],
  });

  const movedShadowOpacity = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const topGlowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  const borderRadius = size * 0.22;

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return COLORS.accent;
    if (isMoved) return COLORS.accent;
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
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
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
            borderColor: isMoved && !isSelected ? movedBorderColor : getBorderColor(),
            borderWidth: isSelected || isValidWord ? 2 : isFrozen ? 1.5 : 1,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: isMoved ? movedShadowOpacity : (isSelected || isValidWord) ? 0.7 : 0.5,
            shadowRadius: (isSelected || isValidWord || isMoved) ? 14 : 8,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 6 : 4 },
            elevation: (isSelected || isValidWord) ? 12 : 6,
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

        {/* Inner luminosity layer - gives depth to the tile */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.innerGlow,
            {
              borderRadius,
              opacity: isSelected ? topGlowOpacity : 0.15,
              backgroundColor: isValidWord
                ? COLORS.greenGlow
                : isHinted
                ? COLORS.goldGlow
                : isSelected
                ? COLORS.accentGlow
                : 'rgba(255,255,255,0.05)',
            },
          ]}
        />

        {/* Top specular highlight — glass-like reflection */}
        <LinearGradient
          colors={
            isSelected || isValidWord
              ? ['rgba(255,255,255,0.40)', 'rgba(255,255,255,0.08)', 'transparent'] as [string, string, string]
              : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'transparent'] as [string, string, string]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.3, 0.6]}
          style={[styles.specularHighlight, { borderTopLeftRadius: borderRadius * 0.85, borderTopRightRadius: borderRadius * 0.85 }]}
        />

        {/* Side edge highlight — left edge catch light */}
        <View
          pointerEvents="none"
          style={[
            styles.leftEdgeHighlight,
            {
              borderTopLeftRadius: borderRadius,
              borderBottomLeftRadius: borderRadius,
              opacity: isSelected || isValidWord ? 0.2 : 0.08,
            },
          ]}
        />

        {/* Bottom edge shadow for 3D depth */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomShadow, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
        />

        {/* Shimmer sweep animation */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerSweep,
            {
              borderRadius,
              opacity: isSelected ? 0.18 : 0.06,
              transform: [
                {
                  translateX: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-size * 0.5, size * 1.5],
                  }),
                },
                { skewX: '-20deg' },
              ],
            },
          ]}
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
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: '40%',
  },
  leftEdgeHighlight: {
    position: 'absolute',
    top: '10%',
    left: 0,
    width: '8%',
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  letter: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
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
    backgroundColor: 'rgba(0, 212, 255, 0.95)',
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
    fontWeight: '900',
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
    fontWeight: '900',
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
