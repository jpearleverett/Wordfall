import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  selectionIndex,
  isFrozen = false,
  isValidWord = false,
  isMoved = false,
}: LetterCellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.03 : 1,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isSelected || isValidWord ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, isValidWord, scaleAnim, glowAnim]);

  useEffect(() => {
    if (!isMoved) return;
    sparkAnim.setValue(1);
    Animated.timing(sparkAnim, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [isMoved, sparkAnim]);

  const borderRadius = size * 0.18;

  const tileColors: [string, string, string] = isValidWord
    ? ['rgba(104,255,196,0.95)', 'rgba(38,206,154,0.78)', 'rgba(15,76,76,0.75)']
    : isSelected
    ? ['rgba(89,248,255,0.95)', 'rgba(66,208,255,0.64)', 'rgba(42,79,125,0.72)']
    : ['rgba(57,63,108,0.92)', 'rgba(35,40,81,0.88)', 'rgba(18,23,51,0.95)'];

  return (
    <View pointerEvents="none" style={{ width: size, height: size, margin: 5 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerGlow,
          {
            borderRadius: borderRadius + 12,
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            backgroundColor: isValidWord ? 'rgba(104,255,196,0.34)' : 'rgba(91,244,255,0.34)',
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.moveFlash,
          {
            opacity: sparkAnim,
            borderRadius: borderRadius + 8,
          },
        ]}
      />
      <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
        <LinearGradient colors={tileColors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.tile, { borderRadius }]}> 
          <View style={[styles.outerStroke, { borderRadius: borderRadius - 2 }]} />
          <View style={[styles.innerStroke, { borderRadius: borderRadius - 6 }]} />
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.topSheen, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          />
          <View style={styles.sideGlow} />
          <Text style={[styles.letter, { fontSize: size * 0.46 }]}>{letter}</Text>
          {(isSelected || isValidWord) && (
            <View style={[styles.indexBubble, { borderRadius: size * 0.14 }]}> 
              <Text style={[styles.indexText, { fontSize: size * 0.16 }]}>{isValidWord ? '✓' : selectionIndex + 1}</Text>
            </View>
          )}
          {isFrozen && !isSelected && <Text style={styles.frozen}>❄</Text>}
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerGlow: {
    position: 'absolute',
    inset: -5,
    shadowColor: '#5df1ff',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  moveFlash: {
    position: 'absolute',
    inset: -3,
    borderWidth: 2,
    borderColor: 'rgba(91,244,255,0.92)',
  },
  tile: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(232,240,255,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#040714',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  outerStroke: {
    position: 'absolute',
    inset: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  innerStroke: {
    position: 'absolute',
    inset: 7,
    borderWidth: 1,
    borderColor: 'rgba(173,198,255,0.08)',
  },
  topSheen: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    height: '38%',
  },
  sideGlow: {
    position: 'absolute',
    left: 6,
    top: 10,
    bottom: 10,
    width: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  letter: {
    color: '#f8edff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.16)',
    textShadowRadius: 10,
  },
  indexBubble: {
    position: 'absolute',
    right: 5,
    top: 5,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#50ebff',
    borderWidth: 1,
    borderColor: 'rgba(19,74,102,0.35)',
  },
  indexText: {
    color: '#163247',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  frozen: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    color: '#89f7ff',
    fontSize: 12,
  },
});
