import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, GRADIENTS, FONTS } from '../constants';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
  index: number;
}

const WordChip = React.memo(function WordChip({ wordPlacement, currentWord, isValidWord, index }: WordChipProps) {
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
          toValue: 1.22,
          friction: 3,
          tension: 220,
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
          Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
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
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Background gradient + glass edge clipped to chip shape */}
      <View style={styles.chipBackground}>
        {wordPlacement.found ? (
          <LinearGradient
            colors={['rgba(0, 230, 118, 0.22)', 'rgba(0, 200, 83, 0.10)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.chipGlassEdge} />
      </View>

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
          <LinearGradient
            colors={[COLORS.green, COLORS.teal] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]}
          />
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>
      )}

      {/* Letter count indicator with glass treatment */}
      {!wordPlacement.found && (
        <View style={styles.letterCount}>
          <Text style={styles.letterCountText}>{wordPlacement.word.length}</Text>
        </View>
      )}
    </Animated.View>
  );
});

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

export function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
  const wordAnim = useRef(new Animated.Value(0)).current;
  const prevWord = useRef('');

  // Animate current word text on change
  useEffect(() => {
    if (currentWord !== prevWord.current) {
      prevWord.current = currentWord;
      if (currentWord.length > 0) {
        wordAnim.setValue(0);
        Animated.spring(wordAnim, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [currentWord]);

  return (
    <View style={styles.container}>
      {/* Current forming word */}
      <View style={styles.currentWordContainer}>
        {currentWord.length > 0 ? (
          <View style={styles.currentWordRow}>
            <Animated.Text
              style={[
                styles.currentWord,
                isValidWord && styles.currentWordValid,
                {
                  transform: [
                    { scale: wordAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.05, 1] }) },
                  ],
                  opacity: wordAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                },
              ]}
            >
              {currentWord}
            </Animated.Text>
            {isValidWord && (
              <View style={styles.validIndicator}>
                <LinearGradient
                  colors={[COLORS.green, COLORS.teal] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                />
                <Text style={styles.validIndicatorText}>✓</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.currentWordPlaceholder}>
            Tap letters to spell a word
          </Text>
        )}
        {/* Elegant underline with gradient */}
        <View style={styles.underline}>
          {currentWord.length > 0 && (
            <LinearGradient
              colors={
                isValidWord
                  ? ['rgba(0,230,118,0.7)', 'rgba(0,230,118,0.2)', 'rgba(0,230,118,0)'] as [string, string, string]
                  : ['rgba(0,212,255,0.5)', 'rgba(0,212,255,0.15)', 'rgba(0,212,255,0)'] as [string, string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineFill}
            />
          )}
        </View>
      </View>

      {/* Target words - horizontally scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.wordList}
        style={styles.wordListScroll}
      >
        {words.map((wordPlacement, index) => (
          <WordChip
            key={`${wordPlacement.word}-${index}`}
            wordPlacement={wordPlacement}
            currentWord={currentWord}
            isValidWord={isValidWord}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: 6,
    height: 40,
    justifyContent: 'center',
  },
  currentWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentWord: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 24,
  },
  validIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  validIndicatorText: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 17,
  },
  currentWordPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: 'Inter_500Medium',
  },
  underline: {
    width: '60%',
    height: 2,
    marginTop: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  underlineFill: {
    flex: 1,
    borderRadius: 1,
  },
  wordListScroll: {
    flexGrow: 0,
  },
  wordList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'visible',
    gap: 4,
  },
  chipBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chipGlassEdge: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
  },
  wordChipFound: {
    borderColor: 'rgba(0, 230, 118, 0.5)',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  wordChipActive: {
    borderColor: 'rgba(0, 212, 255, 0.55)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  wordChipValid: {
    borderColor: COLORS.green,
    borderWidth: 2,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  wordText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.wordPending,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: COLORS.wordFound,
    textDecorationLine: 'line-through',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 6,
  },
  wordTextActive: {
    color: COLORS.wordActive,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 8,
  },
  wordTextValid: {
    color: COLORS.green,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 12,
  },
  checkContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  checkMark: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  letterCount: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  letterCountText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },
});
