import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, FONTS } from '../constants';
import { puzzleReferenceTheme } from '../theme/puzzleReferenceTheme';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
  index: number;
}

const wordBankTheme = puzzleReferenceTheme.wordBank;

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
  }, [wordPlacement.found, foundAnim, scaleAnim]);

  useEffect(() => {
    if (isActive && isValidWord) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    if (isActive) {
      Animated.timing(glowAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }).start();
      return;
    }

    glowAnim.stopAnimation();
    Animated.timing(glowAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
  }, [glowAnim, isActive, isValidWord]);

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
        { transform: [{ scale: scaleAnim }], opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) },
      ]}
    >
      <View style={styles.chipBackground}>
        <LinearGradient
          colors={
            (wordPlacement.found
              ? wordBankTheme.chip.foundGradient
              : wordBankTheme.chip.defaultGradient) as [string, string]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
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
            colors={wordBankTheme.check.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: wordBankTheme.check.radius }]}
          />
          <Text style={styles.checkMark}>✓</Text>
        </Animated.View>
      )}

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
  }, [currentWord, wordAnim]);

  return (
    <View style={styles.container}>
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
                  colors={wordBankTheme.validIndicator.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: wordBankTheme.validIndicator.radius }]}
                />
                <Text style={styles.validIndicatorText}>✓</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.currentWordPlaceholder}>Tap letters to spell a word</Text>
        )}
        <View style={styles.underline}>
          {currentWord.length > 0 && (
            <LinearGradient
              colors={
                (isValidWord
                  ? wordBankTheme.underline.validGradient
                  : wordBankTheme.underline.activeGradient) as [string, string, string]
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
    paddingHorizontal: wordBankTheme.containerPaddingHorizontal,
    paddingVertical: wordBankTheme.containerPaddingVertical,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: wordBankTheme.currentWordMarginBottom,
    height: wordBankTheme.currentWordHeight,
    justifyContent: 'center',
  },
  currentWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wordBankTheme.currentWordGap,
  },
  currentWord: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: wordBankTheme.currentWordLetterSpacing,
    textTransform: 'uppercase',
    textShadowColor: wordBankTheme.currentWordGlowColor,
    textShadowRadius: wordBankTheme.currentWordGlowRadius,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: wordBankTheme.validWordGlowRadius,
  },
  validIndicator: {
    width: wordBankTheme.validIndicator.size,
    height: wordBankTheme.validIndicator.size,
    borderRadius: wordBankTheme.validIndicator.radius,
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
    width: wordBankTheme.underline.width,
    height: wordBankTheme.underline.height,
    marginTop: wordBankTheme.underline.marginTop,
    borderRadius: wordBankTheme.underline.radius,
    backgroundColor: wordBankTheme.underline.trackColor,
    overflow: 'hidden',
  },
  underlineFill: {
    flex: 1,
    borderRadius: wordBankTheme.underline.radius,
  },
  wordListScroll: {
    flexGrow: 0,
  },
  wordList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wordBankTheme.wordList.gap,
    paddingHorizontal: wordBankTheme.wordList.paddingHorizontal,
    paddingVertical: wordBankTheme.wordList.paddingVertical,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wordBankTheme.chip.paddingHorizontal,
    paddingVertical: wordBankTheme.chip.paddingVertical,
    borderRadius: wordBankTheme.chip.borderRadius,
    borderWidth: wordBankTheme.chip.borderWidth,
    borderColor: wordBankTheme.chip.borderColor,
    overflow: 'visible',
    gap: wordBankTheme.chip.gap,
  },
  chipBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: wordBankTheme.chip.borderRadius,
    overflow: 'hidden',
  },
  chipGlassEdge: {
    position: 'absolute',
    top: 0,
    left: wordBankTheme.chip.glassEdgeInset as unknown as number,
    right: wordBankTheme.chip.glassEdgeInset as unknown as number,
    height: wordBankTheme.chip.glassEdgeHeight,
    backgroundColor: wordBankTheme.chip.glassEdgeColor,
    borderRadius: 999,
  },
  wordChipFound: {
    borderColor: wordBankTheme.chip.foundBorderColor,
    shadowColor: COLORS.green,
    shadowOffset: wordBankTheme.chipShadow.offset,
    shadowOpacity: wordBankTheme.chipShadow.foundOpacity,
    shadowRadius: wordBankTheme.chipShadow.foundRadius,
    elevation: 6,
  },
  wordChipActive: {
    borderColor: wordBankTheme.chip.activeBorderColor,
    shadowColor: COLORS.accent,
    shadowOffset: wordBankTheme.chipShadow.offset,
    shadowOpacity: wordBankTheme.chipShadow.activeOpacity,
    shadowRadius: wordBankTheme.chipShadow.activeRadius,
    elevation: 6,
  },
  wordChipValid: {
    borderColor: wordBankTheme.chip.validBorderColor,
    borderWidth: 2,
    shadowColor: COLORS.green,
    shadowOffset: wordBankTheme.chipShadow.offset,
    shadowOpacity: wordBankTheme.chipShadow.validOpacity,
    shadowRadius: wordBankTheme.chipShadow.validRadius,
    elevation: 8,
  },
  wordText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: wordBankTheme.text.pendingColor,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: wordBankTheme.text.foundColor,
    textDecorationLine: 'line-through',
    textShadowColor: wordBankTheme.text.foundGlowColor,
    textShadowRadius: 6,
  },
  wordTextActive: {
    color: wordBankTheme.text.activeColor,
    textShadowColor: wordBankTheme.text.activeGlowColor,
    textShadowRadius: 8,
  },
  wordTextValid: {
    color: wordBankTheme.text.validColor,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: wordBankTheme.text.validGlowColor,
    textShadowRadius: 12,
  },
  checkContainer: {
    width: wordBankTheme.check.size,
    height: wordBankTheme.check.size,
    borderRadius: wordBankTheme.check.radius,
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
    paddingHorizontal: wordBankTheme.letterCount.paddingHorizontal,
    paddingVertical: wordBankTheme.letterCount.paddingVertical,
    borderRadius: wordBankTheme.letterCount.radius,
    backgroundColor: wordBankTheme.letterCount.backgroundColor,
    borderWidth: wordBankTheme.letterCount.borderWidth,
    borderColor: wordBankTheme.letterCount.borderColor,
  },
  letterCountText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },
});
