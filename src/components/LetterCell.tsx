import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';

interface LetterCellProps {
  letter: string;
  cellId: string;
  size: number;
  isSelected: boolean;
  isHinted: boolean;
  selectionIndex: number;
  isValidWord?: boolean;
  isMoved?: boolean;
  isWildcard?: boolean;
  isSpotlightDimmed?: boolean;
}

export const LetterCell = React.memo(function LetterCell({
  letter,
  cellId,
  size,
  isSelected,
  isHinted,
  selectionIndex,
  isValidWord = false,
  isMoved = false,
  isWildcard = false,
  isSpotlightDimmed = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const movedAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const overchargeAnim = useRef(new Animated.Value(0)).current;

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

      // Selection neon ripple — expanding glow ring
      rippleAnim.setValue(0);
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 300,
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
  }, [isSelected, scaleAnim, glowAnim, rippleAnim]);

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

  // Valid word "overcharge" — brief glow surge
  useEffect(() => {
    if (isValidWord) {
      overchargeAnim.setValue(1);
      Animated.timing(overchargeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isValidWord, overchargeAnim]);

  const borderRadius = size * 0.20;
  const insetBR = Math.max(borderRadius - 2, 2);

  const getBodyColors = (): [string, string, ...string[]] => {
    if (isValidWord) return ['#33ffaa', '#00ff87', '#00d96e', '#00b85c', '#008844'];
    if (isSelected && isHinted) return ['#fff0b3', '#ffe580', '#ffd24d', '#ffb800', '#cc9200'];
    if (isSelected) return ['#ff8fd0', '#ff6eb8', '#ff2d95', '#e91e8c', '#b8147a'];
    if (isWildcard) return [...GRADIENTS.tile.wildcard] as [string, string, ...string[]];
    return ['#4a2580', '#3d1e6d', '#2d1452', '#221040', '#160a2e'];
  };

  const getTopHighlightColors = (): [string, string] => {
    if (isValidWord) return ['rgba(200,255,230,0.65)', 'rgba(0,255,135,0.0)'];
    if (isSelected && isHinted) return ['rgba(255,245,200,0.65)', 'rgba(255,184,0,0.0)'];
    if (isSelected) return ['rgba(255,210,240,0.60)', 'rgba(255,45,149,0.0)'];
    return ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.0)'];
  };

  const getBorderColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.gold;
    if (isSelected) return COLORS.accent;
    if (isWildcard) return COLORS.gold;
    return 'rgba(200, 77, 255, 0.40)';
  };

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return COLORS.accent;
    if (isWildcard) return COLORS.gold;
    return COLORS.purple;
  };

  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? COLORS.greenGlow : isSelected ? COLORS.accentGlow : 'transparent';

  return (
    <View pointerEvents="none" style={isSpotlightDimmed ? { opacity: 0.3 } : undefined}>
      {/* Selection neon ripple ring — expanding glow that fades */}
      {isSelected && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            borderRadius: borderRadius + 8,
            borderWidth: 2,
            borderColor: COLORS.accent,
            opacity: rippleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 0],
            }),
            transform: [
              { scale: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) },
            ],
          }}
        />
      )}

      {/* Valid word overcharge — brief glow surge */}
      {isValidWord && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: borderRadius + 10,
            backgroundColor: COLORS.greenGlow,
            opacity: overchargeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
            transform: [
              { scale: overchargeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
            ],
          }}
        />
      )}

      {showOuterGlow && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            borderRadius: borderRadius + 6,
            backgroundColor: outerGlowColor,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          }}
        />
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
            borderRadius: borderRadius + 2,
            borderWidth: 1.5,
            borderColor: COLORS.accent,
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
            borderWidth: isSelected || isValidWord ? 2 : isWildcard ? 1.5 : 1,
            transform: [{ scale: scaleAnim }],
            shadowColor: getShadowColor(),
            shadowOpacity: (isSelected || isValidWord) ? 0.8 : 0.5,
            shadowRadius: (isSelected || isValidWord) ? 16 : 8,
            shadowOffset: { width: 0, height: (isSelected || isValidWord) ? 8 : 4 },
            elevation: (isSelected || isValidWord) ? 14 : 6,
          },
        ]}
      >
        <LinearGradient
          colors={getBodyColors()}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: insetBR }]}
        />

        <LinearGradient
          colors={getTopHighlightColors()}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '55%',
            borderTopLeftRadius: insetBR,
            borderTopRightRadius: insetBR,
          }}
        />

        <View
          style={{
            position: 'absolute',
            top: size * 0.06,
            left: size * 0.12,
            right: size * 0.12,
            height: size * 0.05,
            borderRadius: size * 0.025,
            backgroundColor: isSelected || isValidWord
              ? 'rgba(255,255,255,0.45)'
              : 'rgba(255,255,255,0.16)',
          }}
        />

        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.50)'] as [string, string, ...string[]]}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '55%',
            borderBottomLeftRadius: insetBR,
            borderBottomRightRadius: insetBR,
          }}
        />

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: size * 0.10,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderBottomLeftRadius: insetBR,
            borderBottomRightRadius: insetBR,
          }}
        />

        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'transparent', 'transparent', 'rgba(255,255,255,0.03)'] as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: insetBR,
          }}
        />

        {!isSelected && !isValidWord && (
          <Image
            source={LOCAL_IMAGES.tileGemTexture}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: insetBR,
              opacity: 0.18,
            }}
            resizeMode="cover"
          />
        )}

        {(isSelected || isValidWord) && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: insetBR,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
        )}

        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.46 },
            isSelected && styles.letterSelected,
            isValidWord && styles.letterValid,
            !isSelected && !isValidWord && styles.letterDefault,
          ]}
        >
          {isWildcard ? '★' : letter}
        </Text>

        {isSelected && selectionIndex >= 0 && !isValidWord && (
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
            <Text style={[styles.indexText, { fontSize: size * 0.14 }]}>
              {selectionIndex + 1}
            </Text>
          </View>
        )}

        {isValidWord && (
          <View
            style={[
              styles.checkBadge,
              {
                borderRadius: size * 0.14,
                width: size * 0.26,
                height: size * 0.26,
              },
            ]}
          >
            <Text style={[styles.checkText, { fontSize: size * 0.14 }]}>✓</Text>
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
  letter: {
    color: COLORS.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#fff',
    textShadowColor: 'rgba(200,255,220,0.8)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  indexText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
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
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  checkText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
