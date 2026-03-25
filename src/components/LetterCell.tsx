import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
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

  const borderRadius = size * 0.20;
  const insetBR = Math.max(borderRadius - 2, 2);

  const getBodyColors = (): [string, string, ...string[]] => {
    if (isValidWord) return ['#00ff87', '#00e676', '#00b85c', '#009e42'];
    if (isSelected && isHinted) return ['#ffe580', '#ffd24d', '#ffb800', '#e6a200'];
    if (isSelected) return ['#ff6eb8', '#ff2d95', '#e91e8c', '#c84dff'];
    if (isFrozen) return ['rgba(40,180,220,0.50)', 'rgba(0,180,216,0.40)', 'rgba(0,140,180,0.35)', 'rgba(0,100,140,0.40)'];
    return ['#3d1e6d', '#2d1452', '#221040', '#1a0a30'];
  };

  const getTopHighlightColors = (): [string, string] => {
    if (isValidWord) return ['rgba(180,255,220,0.55)', 'rgba(0,255,135,0.0)'];
    if (isSelected && isHinted) return ['rgba(255,240,180,0.55)', 'rgba(255,184,0,0.0)'];
    if (isSelected) return ['rgba(255,200,230,0.50)', 'rgba(255,45,149,0.0)'];
    if (isFrozen) return ['rgba(180,240,255,0.40)', 'rgba(0,229,255,0.0)'];
    return ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.0)'];
  };

  const getBorderColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected && isHinted) return COLORS.gold;
    if (isSelected) return COLORS.accent;
    if (isFrozen) return 'rgba(0, 229, 255, 0.5)';
    return 'rgba(200, 77, 255, 0.30)';
  };

  const getShadowColor = () => {
    if (isValidWord) return COLORS.green;
    if (isSelected) return COLORS.accent;
    return '#1a0a2e';
  };

  const showOuterGlow = isSelected || isValidWord;
  const outerGlowColor = isValidWord ? COLORS.greenGlow : isSelected ? COLORS.accentGlow : 'transparent';

  return (
    <View pointerEvents="none">
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
            borderWidth: isSelected || isValidWord ? 2 : isFrozen ? 1.5 : 1,
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
            top: size * 0.08,
            left: size * 0.15,
            right: size * 0.15,
            height: size * 0.06,
            borderRadius: size * 0.03,
            backgroundColor: isSelected || isValidWord
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(255,255,255,0.12)',
          }}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.40)'] as [string, string]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
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
            height: size * 0.08,
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderBottomLeftRadius: insetBR,
            borderBottomRightRadius: insetBR,
          }}
        />

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
          {letter}
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
  letter: {
    color: COLORS.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  letterDefault: {
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  letterSelected: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  letterValid: {
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowRadius: 14,
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
