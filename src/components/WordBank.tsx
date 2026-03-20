import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, GRADIENTS } from '../constants';

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
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.18,
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

  const getChipStyle = () => {
    if (wordPlacement.found) return styles.wordChipFound;
    if (isActive && isValidWord) return styles.wordChipValid;
    if (isActive) return styles.wordChipActive;
    return null;
  };

  return (
    <Animated.View
      style={[
        styles.wordChip,
        getChipStyle(),
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {wordPlacement.found && (
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.2)', 'rgba(39, 174, 96, 0.12)'] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
      )}
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
        <Animated.View style={[styles.checkContainer, { opacity: foundAnim }]}>
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>
      )}
      {/* Letter count indicator */}
      {!wordPlacement.found && (
        <View style={styles.letterCount}>
          <Text style={styles.letterCountText}>{wordPlacement.word.length}</Text>
        </View>
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
          <View style={styles.currentWordRow}>
            <Text
              style={[
                styles.currentWord,
                isValidWord && styles.currentWordValid,
              ]}
            >
              {currentWord}
            </Text>
            {isValidWord && (
              <View style={styles.validIndicator}>
                <Text style={styles.validIndicatorText}>✓</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.currentWordPlaceholder}>
            Tap letters to spell a word
          </Text>
        )}
        {/* Subtle underline */}
        <View style={styles.underline}>
          {currentWord.length > 0 && (
            <LinearGradient
              colors={isValidWord ? ['rgba(76,175,80,0.6)', 'rgba(76,175,80,0)'] as [string, string] : ['rgba(0,212,255,0.4)', 'rgba(0,212,255,0)'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineFill}
            />
          )}
        </View>
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
    paddingVertical: 10,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  currentWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentWord: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 4,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 20,
  },
  validIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  validIndicatorText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  currentWordPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  underline: {
    width: '60%',
    height: 2,
    marginTop: 6,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  underlineFill: {
    flex: 1,
    borderRadius: 1,
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    gap: 6,
  },
  wordChipFound: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  wordChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: 'rgba(0, 212, 255, 0.5)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  wordChipValid: {
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderColor: COLORS.green,
    borderWidth: 2,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  wordText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.wordPending,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    fontWeight: '900',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 8,
  },
  checkContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  letterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  letterCountText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
});
