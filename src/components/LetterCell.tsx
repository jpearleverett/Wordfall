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

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.88,
          duration: 70,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.06,
          friction: 4,
          tension: 220,
          useNativeDriver: false,
        }),
      ]).start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 550,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 550,
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

  // Choose gradient colors based on state
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
    if (isFrozen) return 'rgba(0, 212, 255, 0.4)';
    return 'rgba(255,255,255,0.08)';
  };

  const movedBorderColor = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', 'rgba(0, 212, 255, 0.7)'],
  });

  const movedShadowOpacity = movedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const topGlowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.45],
  });

  const borderRadius = size * 0.22;

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return COLORS.accent;
    if (isMoved) return COLORS.accent;
    return '#000';
  };

  return (
    <View pointerEvents="none">
      <Animated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: isMoved && !isSelected ? movedBorderColor : getBorderColor(),
            borderWidth: isSelected || isValidWord ? 2.5 : isFrozen ? 1.5 : 1,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: isMoved ? movedShadowOpacity : (isSelected || isValidWord) ? 0.6 : 0.4,
            shadowRadius: (isSelected || isValidWord || isMoved) ? 10 : 6,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 4 : 3 },
            elevation: (isSelected || isValidWord) ? 8 : 5,
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors() as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />
        {/* Inner glow overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.innerGlow,
            {
              borderRadius,
              opacity: isSelected ? topGlowOpacity : 0.12,
              backgroundColor: isValidWord
                ? COLORS.greenGlow
                : isHinted
                ? COLORS.goldGlow
                : isSelected
                ? COLORS.accentGlow
                : 'rgba(255,255,255,0.06)',
            },
          ]}
        />
        {/* Specular shine band - top highlight for 3D glass look */}
        <View
          pointerEvents="none"
          style={[
            styles.specularHighlight,
            {
              borderRadius: borderRadius * 0.8,
              backgroundColor: isSelected || isValidWord
                ? 'rgba(255,255,255,0.28)'
                : 'rgba(255,255,255,0.15)',
            },
          ]}
        />
        {/* Bottom edge shadow for depth */}
        <View
          pointerEvents="none"
          style={[
            styles.bottomShadow,
            { borderRadius },
          ]}
        />
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.50 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
            !isSelected && !isValidWord && styles.letterDefault,
          ]}
        >
          {letter}
        </Text>
        {isSelected && selectionIndex >= 0 && !isValidWord && (
          <View
            style={[
              styles.indexBadge,
              { width: size * 0.32, height: size * 0.32, borderRadius: size * 0.16 },
            ]}
          >
            <Text style={[styles.indexText, { fontSize: size * 0.18 }]}>
              {selectionIndex + 1}
            </Text>
          </View>
        )}
        {isValidWord && (
          <View style={[styles.checkBadge, { borderRadius: size * 0.16, width: size * 0.3, height: size * 0.3 }]}>
            <Text style={[styles.checkText, { fontSize: size * 0.16 }]}>✓</Text>
          </View>
        )}
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
    top: '6%',
    left: '10%',
    right: '10%',
    height: '32%',
    opacity: 1,
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  letter: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  letterValid: {
    color: '#fff',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 16,
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
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
    opacity: 0.7,
  },
});
