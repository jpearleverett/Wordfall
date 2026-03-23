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
}

const wordBankTheme = puzzleReferenceTheme.wordBank;

const WordChip = React.memo(function WordChip({ wordPlacement, currentWord, isValidWord, index }: WordChipProps) {
  const foundAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const activePulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const wasFound = useRef(false);

  const isActive = !wordPlacement.found && currentWord === wordPlacement.word;

  useEffect(() => {
    if (wordPlacement.found && !wasFound.current) {
      wasFound.current = true;
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 4,
          tension: 220,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(foundAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [wordPlacement.found, foundAnim, scaleAnim]);

  useEffect(() => {
    activePulseRef.current?.stop();

    if (isActive && isValidWord) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.45,
            duration: 420,
            useNativeDriver: true,
          }),
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

    return () => {
      activePulseRef.current?.stop();
    };
  }, [glowAnim, isActive, isValidWord]);

  const chipStateStyle = wordPlacement.found
    ? styles.wordChipFound
    : isActive && isValidWord
      ? styles.wordChipValid
      : isActive
        ? styles.wordChipActive
        : null;

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
    </Animated.View>
  );
});

interface CurrentWordDisplayProps {
  currentWord: string;
  isValidWord: boolean;
  wordAnim: Animated.Value;
}

function CurrentWordDisplay({ currentWord, isValidWord, wordAnim }: CurrentWordDisplayProps) {
  const displayWord = currentWord.length > 0 ? currentWord : '—';

  return (
    <View style={styles.selectionBlock}>
      <Text style={styles.selectionLabel}>CURRENT SELECTION</Text>
      <Animated.View
        style={[
          styles.selectionCard,
          isValidWord && styles.selectionCardValid,
          {
            transform: [
              {
                scale: wordAnim.interpolate({
                  inputRange: [0, 0.55, 1],
                  outputRange: [0.96, 1.04, 1],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={
            isValidWord
              ? ['rgba(0, 230, 118, 0.18)', 'rgba(13, 26, 30, 0.96)']
              : ['rgba(0, 212, 255, 0.16)', 'rgba(12, 16, 32, 0.96)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.selectionHighlight}
        />

        <Animated.Text
          style={[
            styles.currentWord,
            currentWord.length === 0 && styles.currentWordPlaceholder,
            isValidWord && styles.currentWordValid,
            {
              opacity: wordAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            },
          ]}
        >
          {displayWord}
        </Animated.Text>

        {currentWord.length > 0 && (
          <Text style={styles.selectionMeta}>
            {currentWord.length} LETTER{currentWord.length === 1 ? '' : 'S'}
          </Text>
        )}

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
      </Animated.View>
    </View>
  );
}

interface ChipRailProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

function ChipRail({ words, currentWord, isValidWord }: ChipRailProps) {
  return (
    <View style={styles.railSection}>
      <View style={styles.railFrame}>
        <View pointerEvents="none" style={styles.scanlineTrack}>
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
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

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
      wordAnim.setValue(currentWord.length > 0 ? 0 : 0.35);
      Animated.spring(wordAnim, {
        toValue: 1,
        friction: 6,
        tension: 190,
        useNativeDriver: true,
      }).start();
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
  selectionBlock: {
    alignItems: 'center',
    marginBottom: wordBankTheme.currentWordMarginBottom,
    height: wordBankTheme.currentWordHeight,
    justifyContent: 'center',
  },
  selectionLabel: {
    fontSize: 11,
    letterSpacing: 2.8,
    color: COLORS.textMuted,
    fontFamily: 'Inter_600SemiBold',
  },
  selectionCard: {
    minWidth: 220,
    maxWidth: '100%',
    minHeight: 76,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 26,
    paddingVertical: 16,
    alignItems: 'center',
    gap: wordBankTheme.currentWordGap,
  },
  currentWord: {
    fontSize: 28,
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
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 8,
  },
  validIndicatorText: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 16,
  },
  railSection: {
    marginTop: 2,
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
  chipOuterFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: wordBankTheme.chip.borderRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipTopHighlight: {
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
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
});
