import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants';

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
    if (isValidWord) return ['#8bffff', '#3be9ff', '#1d98ff'];
    if (isSelected && isHinted) return ['#96ffff', '#45f2ff', '#1ea7ff'];
    if (isSelected) return ['#8dffff', '#48eaff', '#1c89ff'];
    if (isFrozen) return ['rgba(32,55,112,0.94)', 'rgba(23,39,87,0.96)', 'rgba(14,26,62,0.98)'];
    return ['rgba(47,40,93,0.92)', 'rgba(27,27,68,0.96)', 'rgba(13,18,50,0.98)'];
  };

  const getBorderColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.gold;
    if (isSelected) return '#80f6ff';
    if (isFrozen) return 'rgba(0, 212, 255, 0.5)';
    return 'rgba(255,255,255,0.18)';
  };

  const borderRadius = size * 0.22;

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return '#69f2ff';
    return '#000';
  };

  // Outer glow ring for selected/valid states
  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? 'rgba(108, 255, 255, 0.72)' : isSelected ? 'rgba(99, 244, 255, 0.72)' : 'transparent';

  return (
    <View pointerEvents="none">
      {/* Outer ambient glow ring */}
      {showOuterGlow && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            borderRadius: borderRadius + 4,
            backgroundColor: outerGlowColor,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.55],
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
            borderColor: 'rgba(0, 212, 255, 0.8)',
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
            borderWidth: isSelected || isValidWord ? 2.2 : isFrozen ? 1.5 : 1.2,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: (isSelected || isValidWord) ? 0.88 : 0.42,
            shadowRadius: (isSelected || isValidWord) ? 18 : 8,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 6 : 2 },
            elevation: (isSelected || isValidWord) ? 12 : 3,
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors() as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.innerFrame,
            { borderRadius: Math.max(6, borderRadius - 4) },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.innerGlow,
            {
              borderRadius,
              opacity: isSelected ? 0.36 : 0.08,
              backgroundColor: isValidWord
                ? 'rgba(112, 255, 255, 0.52)'
                : isHinted
                ? 'rgba(112, 255, 255, 0.3)'
                : isSelected
                ? 'rgba(112, 255, 255, 0.56)'
                : 'rgba(255,255,255,0.05)',
            },
          ]}
        />

        <LinearGradient
          colors={
            isSelected || isValidWord
              ? ['rgba(255,255,255,0.38)', 'rgba(150,255,255,0.14)', 'transparent'] as [string, string, string]
              : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)', 'transparent'] as [string, string, string]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.3, 0.6]}
          style={[styles.specularHighlight, { borderTopLeftRadius: borderRadius * 0.85, borderTopRightRadius: borderRadius * 0.85 }]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.leftEdgeHighlight,
            {
              borderTopLeftRadius: borderRadius,
              borderBottomLeftRadius: borderRadius,
              opacity: isSelected || isValidWord ? 0.22 : 0.07,
            },
          ]}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.28)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomShadow, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.shimmerSweep,
            {
              borderRadius,
              opacity: isSelected ? 0.16 : 0.04,
            },
          ]}
        />

        {/* Letter with premium text rendering */}
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.5 },
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
  innerFrame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(210, 225, 255, 0.26)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    left: '35%',
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  letter: {
    color: '#f7ebff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 3 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: 'rgba(130, 249, 255, 0.95)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#fff',
    textShadowColor: 'rgba(130, 249, 255, 0.95)',
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
