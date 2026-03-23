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
      <View style={styles.chipBackground}>
        {wordPlacement.found ? (
          <LinearGradient
            colors={['rgba(75, 249, 255, 0.22)', 'rgba(219, 96, 255, 0.16)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <LinearGradient
            colors={['rgba(151,171,255,0.18)', 'rgba(67,35,108,0.32)'] as [string, string]}
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
      <View style={styles.currentWordContainer}>
        <View style={styles.currentWordHalo} />
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
                  colors={['#5af2ff', '#c756ff'] as [string, string]}
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
        <View style={styles.underline}>
          {currentWord.length > 0 && (
            <LinearGradient
              colors={
                isValidWord
                  ? ['rgba(90,242,255,0.95)', 'rgba(199,86,255,0.42)', 'rgba(255,255,255,0)'] as [string, string, string]
                  : ['rgba(90,242,255,0.76)', 'rgba(90,242,255,0.2)', 'rgba(0,212,255,0)'] as [string, string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineFill}
            />
          )}
        </View>
      </View>

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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 94,
    justifyContent: 'center',
  },
  currentWordHalo: {
    position: 'absolute',
    top: -6,
    width: 240,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(104, 236, 255, 0.10)',
    shadowColor: '#62efff',
    shadowOpacity: 0.6,
    shadowRadius: 28,
  },
  currentWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentWord: {
    fontSize: 56,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(115, 240, 255, 0.55)',
    textShadowRadius: 18,
  },
  currentWordValid: {
    color: '#f7fbff',
    textShadowColor: 'rgba(115, 240, 255, 0.85)',
    textShadowRadius: 24,
  },
  validIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#5af2ff',
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
    fontSize: 18,
    color: 'rgba(91, 146, 220, 0.72)',
    fontFamily: 'Inter_600SemiBold',
  },
  underline: {
    width: '82%',
    height: 6,
    marginTop: 10,
    borderRadius: 1,
    backgroundColor: 'rgba(118, 149, 218, 0.16)',
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(189, 215, 255, 0.22)',
    overflow: 'visible',
    gap: 8,
  },
  chipBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
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
    borderColor: 'rgba(101, 241, 255, 0.64)',
    shadowColor: '#62efff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.48,
    shadowRadius: 16,
    elevation: 6,
  },
  wordChipActive: {
    borderColor: 'rgba(100, 244, 255, 0.65)',
    shadowColor: '#62efff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 6,
  },
  wordChipValid: {
    borderColor: '#62efff',
    borderWidth: 2,
    shadowColor: '#62efff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 8,
  },
  wordText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#7edbff',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: '#f7fbff',
    textShadowColor: 'rgba(108, 241, 255, 0.8)',
    textShadowRadius: 10,
  },
  wordTextActive: {
    color: '#9df7ff',
    textShadowColor: 'rgba(98, 239, 255, 0.82)',
    textShadowRadius: 12,
  },
  wordTextValid: {
    color: '#f8fbff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: 'rgba(98, 239, 255, 0.92)',
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
    minWidth: 28,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(119, 151, 220, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(197, 224, 255, 0.10)',
  },
  letterCountText: {
    color: '#65f1ff',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
