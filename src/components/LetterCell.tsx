import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import { puzzleReferenceTheme } from '../theme/puzzleReferenceTheme';

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
  const cellTheme = puzzleReferenceTheme.letterCell;
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
    if (isValidWord) return cellTheme.gradientByState.valid;
    if (isSelected && isHinted) return cellTheme.gradientByState.hint;
    if (isSelected) return cellTheme.gradientByState.selected;
    if (isFrozen) return cellTheme.gradientByState.frozen;
    return cellTheme.gradientByState.default;
  };

  const getBorderColor = () => {
    if (isValidWord) return cellTheme.borderColors.valid;
    if (isSelected && isHinted) return cellTheme.borderColors.selectedHint;
    if (isSelected) return cellTheme.borderColors.selected;
    if (isFrozen) return cellTheme.borderColors.frozen;
    return cellTheme.borderColors.default;
  };

  const borderRadius = size * 0.22;

  const getShadowColor = () => {
    if (isValidWord) return cellTheme.borderColors.valid;
    if (isSelected) return cellTheme.borderColors.selected;
    return cellTheme.shadow.defaultColor;
  };

  // Outer glow ring for selected/valid states
  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? cellTheme.glow.valid : isSelected ? cellTheme.glow.selected : 'transparent';

  return (
    <View pointerEvents="none">
      {/* Outer ambient glow ring */}
      {showOuterGlow && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -cellTheme.glow.outerInset,
            left: -cellTheme.glow.outerInset,
            right: -cellTheme.glow.outerInset,
            bottom: -cellTheme.glow.outerInset,
            borderRadius: borderRadius + cellTheme.glow.outerInset,
            backgroundColor: outerGlowColor,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, cellTheme.glow.outerOpacity],
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
            top: -cellTheme.glow.movedInset,
            left: -cellTheme.glow.movedInset,
            right: -cellTheme.glow.movedInset,
            bottom: -cellTheme.glow.movedInset,
            borderRadius: borderRadius + cellTheme.glow.movedInset,
            borderWidth: cellTheme.glow.movedBorderWidth,
            borderColor: cellTheme.borderColors.moved,
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
            borderWidth: isSelected || isValidWord ? 2 : isFrozen ? 1.5 : 1,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: (isSelected || isValidWord) ? cellTheme.shadow.selectedOpacity : cellTheme.shadow.defaultOpacity,
            shadowRadius: (isSelected || isValidWord) ? cellTheme.shadow.selectedRadius : cellTheme.shadow.defaultRadius,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? cellTheme.shadow.selectedOffsetY : cellTheme.shadow.defaultOffsetY },
            elevation: (isSelected || isValidWord) ? cellTheme.shadow.selectedElevation : cellTheme.shadow.defaultElevation,
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
        <View
          pointerEvents="none"
          style={[
            styles.innerGlow,
            {
              borderRadius,
              opacity: isSelected ? cellTheme.glow.opacitySelected : cellTheme.glow.opacityDefault,
              backgroundColor: isValidWord
                ? cellTheme.glow.valid
                : isHinted
                ? cellTheme.glow.hinted
                : isSelected
                ? cellTheme.glow.selected
                : cellTheme.glow.default,
            },
          ]}
        />

        {/* Top specular highlight — glass-like reflection */}
        <LinearGradient
          colors={
            isSelected || isValidWord
              ? cellTheme.highlight.selectedSpecular as [string, string, string]
              : cellTheme.highlight.defaultSpecular as [string, string, string]
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
              opacity: isSelected || isValidWord ? cellTheme.highlight.leftEdgeSelectedOpacity : cellTheme.highlight.leftEdgeDefaultOpacity,
            },
          ]}
        />

        {/* Bottom edge shadow for 3D depth */}
        <LinearGradient
          colors={cellTheme.highlight.bottomShadow as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomShadow, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
        />

        {/* Static shimmer highlight — no animation */}
        <View
          pointerEvents="none"
          style={[
            styles.shimmerSweep,
            {
              borderRadius,
              opacity: isSelected ? cellTheme.highlight.shimmerSelectedOpacity : cellTheme.highlight.shimmerDefaultOpacity,
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
    backgroundColor: puzzleReferenceTheme.letterCell.highlight.leftEdgeColor,
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
    backgroundColor: puzzleReferenceTheme.letterCell.highlight.shimmerColor,
  },
  letter: {
    color: COLORS.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    backgroundColor: puzzleReferenceTheme.letterCell.badge.selectedBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: puzzleReferenceTheme.letterCell.badge.selectedShadowColor,
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
    backgroundColor: puzzleReferenceTheme.letterCell.badge.validBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: puzzleReferenceTheme.letterCell.badge.validShadowColor,
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
