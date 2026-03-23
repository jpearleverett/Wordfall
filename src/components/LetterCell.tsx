import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
  size,
  isSelected,
  isHinted,
  selectionIndex,
  isFrozen = false,
  isValidWord = false,
  isMoved = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const movedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.06 : 1,
        friction: 5,
        tension: 220,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isSelected || isValidWord ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowAnim, isSelected, isValidWord, scaleAnim]);

  useEffect(() => {
    if (isMoved) {
      movedAnim.setValue(1);
      Animated.timing(movedAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }
  }, [isMoved, movedAnim]);

  const borderRadius = size * 0.2;
  const glowColor = isValidWord ? 'rgba(120,255,236,0.58)' : isSelected ? 'rgba(92, 239, 255, 0.74)' : 'transparent';
  const edgeColor = isValidWord
    ? 'rgba(120,255,236,0.9)'
    : isSelected
    ? 'rgba(92, 239, 255, 0.95)'
    : isHinted
    ? 'rgba(255, 214, 102, 0.72)'
    : isFrozen
    ? 'rgba(120, 220, 255, 0.58)'
    : 'rgba(203, 224, 255, 0.34)';

  const badgeColor = isValidWord ? '#78ffec' : '#53efff';

  return (
    <View pointerEvents="none" style={{ margin: 3 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerGlow,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: borderRadius + 7,
            left: -5,
            top: -5,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            backgroundColor: glowColor,
          },
        ]}
      />

      {isMoved && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.moveFlash,
            {
              width: size + 6,
              height: size + 6,
              left: -3,
              top: -3,
              borderRadius: borderRadius + 4,
              opacity: movedAnim,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: edgeColor,
            transform: [{ scale: scaleAnim }],
            shadowColor: isSelected ? '#53efff' : '#000',
            shadowOpacity: isSelected ? 0.48 : 0.26,
            shadowRadius: isSelected ? 14 : 5,
            elevation: isSelected ? 12 : 4,
          },
        ]}
      >
        <LinearGradient
          colors={
            isValidWord
              ? ['rgba(25, 76, 98, 0.94)', 'rgba(21, 57, 82, 0.98)', 'rgba(12, 31, 54, 0.98)']
              : isSelected
              ? ['#53efff', '#3bc9ff', '#1776d4']
              : ['rgba(33, 23, 74, 0.92)', 'rgba(27, 20, 62, 0.96)', 'rgba(18, 13, 47, 0.98)']
          }
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />
        <View style={[styles.innerFrame, { borderRadius: borderRadius - 2 }]} />
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.03)', 'transparent'] as [string, string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.3, 0.6]}
          style={[styles.topHighlight, { borderTopLeftRadius: borderRadius - 2, borderTopRightRadius: borderRadius - 2 }]}
        />
        <View style={[styles.leftHighlight, { borderTopLeftRadius: borderRadius, borderBottomLeftRadius: borderRadius }]} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)'] as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomShadow, { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }]}
        />

        <Text
          style={[
            styles.letter,
            {
              fontSize: size * 0.46,
              color: isSelected ? '#ffffff' : '#f4eaff',
              textShadowColor: isSelected ? 'rgba(83,239,255,0.55)' : 'rgba(185, 125, 255, 0.22)',
            },
          ]}
        >
          {letter}
        </Text>

        {isSelected && selectionIndex >= 0 && !isValidWord && (
          <View
            style={[
              styles.indexBadge,
              {
                width: size * 0.32,
                height: size * 0.32,
                borderRadius: size * 0.16,
                backgroundColor: badgeColor,
              },
            ]}
          >
            <Text style={[styles.indexText, { fontSize: size * 0.18 }]}>{selectionIndex + 1}</Text>
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
  outerGlow: {
    position: 'absolute',
    shadowColor: '#57efff',
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  moveFlash: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 242, 255, 0.85)',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  innerFrame: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(232, 243, 255, 0.26)',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    height: '34%',
  },
  leftHighlight: {
    position: 'absolute',
    top: '10%',
    left: 0,
    width: '8%',
    height: '76%',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottomShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28%',
  },
  letter: {
    fontFamily: FONTS.display,
    textAlign: 'center',
    letterSpacing: 0.6,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 1 },
  },
  indexBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(15, 7, 44, 0.85)',
    shadowColor: '#53efff',
    shadowOpacity: 0.75,
    shadowRadius: 8,
  },
  indexText: {
    color: '#183149',
    fontFamily: FONTS.display,
  },
  frozenIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 4,
  },
  frozenIcon: {
    fontSize: 11,
    color: '#96e8ff',
  },
});
