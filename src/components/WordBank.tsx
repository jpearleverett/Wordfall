import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, GRADIENTS, FONTS } from '../constants';

interface WordChipProps {
  wordPlacement: WordPlacement;
  // isActive is now computed by the parent and passed as a stable boolean.
  // Previously WordChip received `currentWord` directly and computed isActive
  // internally — which meant React.memo's shallow compare fired on every
  // currentWord change, forcing ALL 4-6 chips to re-render on every tap
  // even when their isActive bool didn't actually change. That was the
  // single biggest contributor to WordBank's 10-20ms per-tap cost.
  isActive: boolean;
  isValidWord: boolean;
  /**
   * Last-remaining-word pulse. True when this is the only unfound chip in the
   * puzzle — drives a looping scale pulse so the final word telegraphs the
   * "one away from winning" moment.
   */
  isLastRemaining: boolean;
  index: number;
}

const WordChip = React.memo(function WordChip({ wordPlacement, isActive, isValidWord, isLastRemaining, index }: WordChipProps) {
  const foundAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const lastRemainingAnim = useRef(new Animated.Value(1)).current;
  const wasFound = useRef(false);
  const lastRemainingLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (wordPlacement.found && !wasFound.current) {
      wasFound.current = true;
      Animated.sequence([
        // Initial pop up to 1.25x
        Animated.spring(scaleAnim, {
          toValue: 1.25,
          friction: 3,
          tension: 280,
          useNativeDriver: true,
        }),
        // Bounce down past 1.0 to 0.9
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        // Settle back to 1.0 with checkmark fade-in
        Animated.parallel([
          Animated.timing(foundAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 160,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [wordPlacement.found]);

  useEffect(() => {
    // Last-remaining-word pulse: loop scale 1.0 → 1.08 → 1.0 while this is the
    // only unfound chip. Stop + reset when the condition is no longer true.
    if (lastRemainingLoopRef.current) {
      lastRemainingLoopRef.current.stop();
      lastRemainingLoopRef.current = null;
    }
    if (isLastRemaining && !wordPlacement.found) {
      lastRemainingAnim.setValue(1);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(lastRemainingAnim, {
            toValue: 1.08,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(lastRemainingAnim, {
            toValue: 1.0,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      );
      lastRemainingLoopRef.current = loop;
      loop.start();
    } else {
      lastRemainingAnim.setValue(1);
    }
    return () => {
      if (lastRemainingLoopRef.current) {
        lastRemainingLoopRef.current.stop();
        lastRemainingLoopRef.current = null;
      }
    };
  }, [isLastRemaining, wordPlacement.found]);

  useEffect(() => {
    // Stop any running animation before starting a new one
    glowAnim.stopAnimation();

    if (isActive && isValidWord) {
      // Finite pulse (3 cycles) instead of infinite Animated.loop
      // to avoid continuous animation overhead on the native thread
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      ]).start();
    } else if (isActive) {
      Animated.timing(glowAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }).start();
    } else {
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
        isLastRemaining && !wordPlacement.found && styles.wordChipLastRemaining,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, lastRemainingAnim) },
          ],
        },
      ]}
      accessibilityLabel={`${wordPlacement.word}, ${wordPlacement.found ? 'found' : 'not found'}${isLastRemaining && !wordPlacement.found ? ', last remaining' : ''}`}
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

export const WordBank = React.memo(function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
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
    <View style={styles.container} accessibilityRole="list">
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
                  : ['rgba(255,45,149,0.5)', 'rgba(255,45,149,0.15)', 'rgba(255,45,149,0)'] as [string, string, string]
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
        {(() => {
          const unfoundCount = words.filter(w => !w.found).length;
          return words.map((wordPlacement, index) => {
            // Compute isActive here so we pass a stable boolean to WordChip.
            // When currentWord changes from "AB" → "ABC", only chips whose
            // boolean flipped re-render; the rest are skipped by React.memo.
            const isActive = !wordPlacement.found && currentWord === wordPlacement.word;
            // isValidWord only affects a chip's rendering when it's also the
            // active one. Passing `false` to all other chips keeps their props
            // stable when the *global* isValidWord flips, avoiding a cascade
            // of re-renders across all 4-6 chips on every valid-word moment.
            const chipIsValid = isActive && isValidWord;
            const isLastRemaining = unfoundCount === 1 && !wordPlacement.found;
            return (
              <WordChip
                key={`${wordPlacement.word}-${index}`}
                wordPlacement={wordPlacement}
                isActive={isActive}
                isValidWord={chipIsValid}
                isLastRemaining={isLastRemaining}
                index={index}
              />
            );
          });
        })()}
      </ScrollView>
    </View>
  );
});

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
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(200,77,255,0.4)',
    textShadowRadius: 12,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 28,
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
    width: '65%',
    height: 2.5,
    marginTop: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(200,77,255,0.22)',
    overflow: 'visible',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
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
    borderColor: 'rgba(255, 45, 149, 0.55)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
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
  wordChipLastRemaining: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  wordText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.wordPending,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: COLORS.wordFound,
    textDecorationLine: 'line-through',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 10,
  },
  wordTextActive: {
    color: COLORS.wordActive,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  wordTextValid: {
    color: COLORS.green,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 16,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(200,77,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200,77,255,0.15)',
  },
  letterCountText: {
    color: COLORS.purpleLight,
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
