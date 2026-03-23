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

const DEFAULT_TILE_GRADIENT = ['#050914', '#11182f', '#182343', '#0a1020'] as const;
const DEFAULT_CENTER_GLOW = 'rgba(92, 118, 255, 0.12)';

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

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 4,
          tension: 260,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }).start();

      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, scaleAnim, glowAnim]);

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

  const innerBorderColor = isValidWord
    ? 'rgba(206,255,227,0.32)'
    : isSelected
    ? 'rgba(164, 247, 255, 0.45)'
    : isFrozen
    ? 'rgba(152, 214, 255, 0.22)'
    : 'rgba(255,255,255,0.1)';

  const getShadowColor = () => {
    if (isValidWord) return cellTheme.borderColors.valid;
    if (isSelected) return cellTheme.borderColors.selected;
    return cellTheme.shadow.defaultColor;
  };

  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? cellTheme.glow.valid : isSelected ? cellTheme.glow.selected : 'transparent';

  return (
    <View pointerEvents="none" style={{ width: size + 4, height: size + 4 }}>
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
            borderRadius: outerRadius,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: (isSelected || isValidWord) ? cellTheme.shadow.selectedOpacity : cellTheme.shadow.defaultOpacity,
            shadowRadius: (isSelected || isValidWord) ? cellTheme.shadow.selectedRadius : cellTheme.shadow.defaultRadius,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? cellTheme.shadow.selectedOffsetY : cellTheme.shadow.defaultOffsetY },
            elevation: (isSelected || isValidWord) ? cellTheme.shadow.selectedElevation : cellTheme.shadow.defaultElevation,
          },
        ]}
      >
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

          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.sideHighlight,
              {
                borderTopLeftRadius: borderRadius,
                borderBottomLeftRadius: borderRadius,
                opacity: isSelected || isValidWord ? 0.22 : 0.1,
              },
            ]}
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.22)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.bottomShadow,
              {
                borderBottomLeftRadius: borderRadius,
                borderBottomRightRadius: borderRadius,
              },
            ]}
          />

          <Text
            accessible={false}
            testID={`letter-cell-${cellId}`}
            style={[
              styles.letter,
              {
                fontSize: size * 0.5,
                lineHeight: Math.round(size * 0.54),
                marginTop: size * 0.01,
              },
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
                {
                  width: centerBadgeSize,
                  height: centerBadgeSize,
                  borderRadius: badgeRadius,
                  top: -size * 0.08,
                  right: -size * 0.08,
                },
              ]}
            >
              <LinearGradient
                colors={['#c6faff', '#56e9ff', '#00b7eb']}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: badgeRadius }]}
              />
              <View style={[styles.indexBadgeInner, { borderRadius: badgeRadius - 2 }]} />
              <Text style={[styles.indexText, { fontSize: size * 0.165, lineHeight: Math.round(size * 0.18) }]}>
                {selectionIndex + 1}
              </Text>
            </View>
          )}

          {isValidWord && (
            <View
              style={[
                styles.checkBadge,
                {
                  borderRadius: badgeRadius,
                  width: centerBadgeSize,
                  height: centerBadgeSize,
                  top: -size * 0.08,
                  right: -size * 0.08,
                },
              ]}
            >
              <Text style={[styles.checkText, { fontSize: size * 0.17 }]}>✓</Text>
            </View>
          )}

          {isFrozen && !isSelected && (
            <View style={styles.frozenIndicator}>
              <Text style={styles.frozenIcon}>❄</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    overflow: 'visible',
  },
  selectionBloom: {
    position: 'absolute',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 18,
  },
  outerMetalFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  innerTileShell: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#09101d',
  },
  centerGlow: {
    position: 'absolute',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  innerInsetBorder: {
    position: 'absolute',
    borderWidth: 1,
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: '42%',
  },
  sideHighlight: {
    position: 'absolute',
    top: '8%',
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
    fontFamily: FONTS.display,
    textAlign: 'center',
    textAlignVertical: 'center',
    letterSpacing: 0.25,
    includeFontPadding: false,
    fontWeight: '700',
    zIndex: 2,
  },
  letterDefault: {
    color: '#f7f8ff',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 2 },
  },
  letterSelected: {
    color: '#ffffff',
    textShadowColor: 'rgba(110, 244, 255, 0.95)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 1 },
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
    fontFamily: FONTS.display,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
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
    zIndex: 3,
  },
  checkText: {
    color: '#fff',
    fontFamily: FONTS.display,
  },
  frozenIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    zIndex: 3,
  },
  frozenIcon: {
    fontSize: 10,
    opacity: 0.8,
  },
});
