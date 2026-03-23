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
    if (isValidWord) return GRADIENTS.tile.valid;
    if (isSelected && isHinted) return ['#74ecff', '#14d4ff', '#0486ba', '#035b81'] as const;
    if (isSelected) return ['#8bf4ff', '#1ce2ff', '#059fca', '#03506b'] as const;
    if (isFrozen) return GRADIENTS.tile.frozen;
    return DEFAULT_TILE_GRADIENT;
  };

  const outerBorderColors = isValidWord
    ? ['rgba(206,255,227,0.88)', 'rgba(28,196,107,0.82)', 'rgba(4,90,46,0.92)']
    : isSelected
    ? ['rgba(224, 252, 255, 0.95)', 'rgba(88, 237, 255, 0.92)', 'rgba(9, 103, 135, 0.98)']
    : isFrozen
    ? ['rgba(176, 232, 255, 0.72)', 'rgba(81, 161, 214, 0.66)', 'rgba(19, 52, 93, 0.88)']
    : ['rgba(202, 210, 224, 0.72)', 'rgba(86, 98, 118, 0.76)', 'rgba(22, 28, 40, 0.9)'];

  const innerBorderColor = isValidWord
    ? 'rgba(206,255,227,0.32)'
    : isSelected
    ? 'rgba(164, 247, 255, 0.45)'
    : isFrozen
    ? 'rgba(152, 214, 255, 0.22)'
    : 'rgba(255,255,255,0.1)';

  const coreGlowColor = isValidWord
    ? 'rgba(51, 255, 153, 0.24)'
    : isSelected
    ? 'rgba(72, 237, 255, 0.42)'
    : isHinted
    ? COLORS.goldGlow
    : DEFAULT_CENTER_GLOW;

  const borderRadius = Math.round(size * 0.24);
  const outerRadius = borderRadius + 2;
  const centerBadgeSize = size * 0.32;
  const badgeRadius = centerBadgeSize / 2;

  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? COLORS.greenGlow : 'rgba(0, 228, 255, 0.85)';

  return (
    <View pointerEvents="none" style={{ width: size + 4, height: size + 4 }}>
      {showOuterGlow && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionBloom,
              {
                top: -11,
                left: -11,
                width: size + 26,
                height: size + 26,
                borderRadius: outerRadius + 13,
                backgroundColor: outerGlowColor,
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, isValidWord ? 0.3 : 0.48],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1.08],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionBloom,
              {
                top: -6,
                left: -6,
                width: size + 16,
                height: size + 16,
                borderRadius: outerRadius + 8,
                backgroundColor: isValidWord ? 'rgba(92,255,184,0.42)' : 'rgba(119, 246, 255, 0.7)',
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, isValidWord ? 0.24 : 0.32],
                }),
              },
            ]}
          />
        </>
      )}

      {isMoved && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: outerRadius + 2,
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
            borderRadius: outerRadius,
            transform: [{ scale: scaleAnim }],
            shadowColor: isSelected || isValidWord ? COLORS.accent : '#000',
            shadowOpacity: isSelected || isValidWord ? 0.5 : 0.3,
            shadowRadius: isSelected || isValidWord ? 18 : 8,
            shadowOffset: { width: 0, height: isSelected || isValidWord ? 8 : 3 },
            elevation: isSelected || isValidWord ? 14 : 6,
          },
        ]}
      >
        <LinearGradient
          colors={outerBorderColors as [string, string, string]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={[styles.outerMetalFrame, { borderRadius: outerRadius }]}
        />

        <View style={[styles.innerTileShell, { top: 2, left: 2, right: 2, bottom: 2, borderRadius, borderColor: innerBorderColor }]}>
          <LinearGradient
            colors={getGradientColors() as [string, string, ...string[]]}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 0.92, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.centerGlow,
              {
                top: '22%',
                left: '19%',
                right: '19%',
                bottom: '18%',
                borderRadius: borderRadius,
                backgroundColor: coreGlowColor,
                opacity: isSelected ? 0.95 : isValidWord ? 0.8 : 0.52,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.innerInsetBorder,
              {
                top: 4,
                left: 4,
                right: 4,
                bottom: 4,
                borderRadius: Math.max(8, borderRadius - 3),
                borderColor: isSelected || isValidWord ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
              },
            ]}
          />

          <LinearGradient
            colors={
              isSelected || isValidWord
                ? ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.12)', 'transparent']
                : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)', 'transparent']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.38, 0.82]}
            style={[
              styles.specularHighlight,
              {
                borderTopLeftRadius: borderRadius,
                borderTopRightRadius: borderRadius,
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
    width: '12%',
    height: '76%',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '34%',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 252, 255, 0.85)',
    overflow: 'hidden',
    zIndex: 3,
  },
  indexBadgeInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
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
