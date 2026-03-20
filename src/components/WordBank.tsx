import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { WordPlacement } from '../types';
import { COLORS } from '../constants';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
  index: number;
}

function WordChip({ wordPlacement, currentWord, isValidWord, index }: WordChipProps) {
  const foundAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const wasFound = useRef(false);

  const isActive = !wordPlacement.found && currentWord === wordPlacement.word;

  useEffect(() => {
    if (wordPlacement.found && !wasFound.current) {
      wasFound.current = true;
      // Celebration sequence: scale up -> glow -> settle
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(foundAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [wordPlacement.found]);

  // Pulse when word is being actively formed
  useEffect(() => {
    if (isActive && isValidWord) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else if (isActive) {
      Animated.timing(glowAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }).start();
    } else {
      glowAnim.stopAnimation();
      Animated.timing(glowAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
  }, [isActive, isValidWord]);

  const chipOpacity = foundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  return (
    <Animated.View
      style={[
        styles.wordChip,
        wordPlacement.found && styles.wordChipFound,
        isActive && !isValidWord && styles.wordChipActive,
        isActive && isValidWord && styles.wordChipValid,
        {
          transform: [{ scale: scaleAnim }],
          opacity: chipOpacity,
        },
      ]}
    >
      <Text
        style={[
          styles.wordText,
          wordPlacement.found && styles.wordTextFound,
          isActive && !isValidWord && styles.wordTextActive,
          isActive && isValidWord && styles.wordTextValid,
        ]}
      >
        {wordPlacement.word}
      </Text>
      {wordPlacement.found && (
        <Animated.Text
          style={[
            styles.checkMark,
            { opacity: foundAnim },
          ]}
        >
          {' '}✓
        </Animated.Text>
      )}
    </Animated.View>
  );
}

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

export function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
  return (
    <View style={styles.container}>
      {/* Current forming word */}
      <View style={styles.currentWordContainer}>
        {currentWord.length > 0 ? (
          <Text
            style={[
              styles.currentWord,
              isValidWord && styles.currentWordValid,
            ]}
          >
            {currentWord}
          </Text>
        ) : (
          <Text style={styles.currentWordPlaceholder}>
            Tap letters to spell a word
          </Text>
        )}
      </View>

      {/* Target words */}
      <View style={styles.wordList}>
        {words.map((wordPlacement, index) => (
          <WordChip
            key={`${wordPlacement.word}-${index}`}
            wordPlacement={wordPlacement}
            currentWord={currentWord}
            isValidWord={isValidWord}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  currentWord: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 16,
  },
  currentWordPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  wordChipFound: {
    backgroundColor: COLORS.cellFound,
    borderColor: COLORS.green,
  },
  wordChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: COLORS.accent,
  },
  wordChipValid: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: COLORS.green,
    borderWidth: 2,
  },
  wordText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.wordPending,
    letterSpacing: 2,
  },
  wordTextFound: {
    color: COLORS.wordFound,
    textDecorationLine: 'line-through',
  },
  wordTextActive: {
    color: COLORS.wordActive,
  },
  wordTextValid: {
    color: COLORS.green,
    fontWeight: '800',
  },
  checkMark: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '700',
  },
});
