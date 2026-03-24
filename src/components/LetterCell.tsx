import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';

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
  isFrozen = false,
  isValidWord = false,
  isMoved = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const movedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.04 : 1,
      friction: 7,
      tension: 240,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  useEffect(() => {
    if (isMoved) {
      movedAnim.setValue(1);
      Animated.timing(movedAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isMoved, movedAnim]);

  const borderRadius = size * 0.2;
  const borderColor = isSelected || isValidWord ? '#ff59f6' : 'rgba(110, 230, 255, 0.75)';

  const gradientColors = isSelected || isValidWord
    ? (['rgba(87, 27, 120, 0.97)', 'rgba(46, 18, 84, 0.98)'] as [string, string])
    : isFrozen
      ? (GRADIENTS.tile.frozen as [string, string])
      : (['rgba(58, 23, 104, 0.92)', 'rgba(32, 14, 70, 0.96)'] as [string, string]);

  return (
    <View pointerEvents="none" style={{ margin: 2 }}>
      <Animated.View
        style={[
          styles.cell,
          {
            width: size,
            height: size,
            borderRadius,
            borderWidth: 2,
            borderColor,
            transform: [{ scale: scaleAnim }],
            shadowColor: isSelected ? '#ff5bf7' : '#63e7ff',
            shadowOpacity: 0.58,
            shadowRadius: isSelected ? 12 : 7,
            shadowOffset: { width: 0, height: 0 },
            elevation: 10,
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />

        <View style={[styles.topGloss, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]} />

        {isMoved && (
          <Animated.View
            style={[
              styles.moveFlash,
              {
                borderRadius,
                opacity: movedAnim,
              },
            ]}
          />
        )}

        <Text style={[styles.letter, { fontSize: size * 0.52 }]}>{letter}</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topGloss: {
    position: 'absolute',
    top: 2,
    left: 6,
    right: 6,
    height: '24%',
    backgroundColor: 'rgba(206, 248, 255, 0.22)',
  },
  moveFlash: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(114, 237, 255, 0.95)',
    backgroundColor: 'rgba(126, 238, 255, 0.2)',
  },
  letter: {
    color: '#f7f4ff',
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(255,255,255,0.32)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
});
