import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, FONTS } from '../constants';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
}

const WordChip = React.memo(function WordChip({ wordPlacement, currentWord, isValidWord }: WordChipProps) {
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
  }, [foundAnim, scaleAnim, wordPlacement.found]);

  useEffect(() => {
    activePulseRef.current?.stop();

    if (isActive && isValidWord) {
      activePulseRef.current = Animated.loop(
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
      activePulseRef.current.start();
    } else {
      Animated.timing(glowAnim, {
        toValue: isActive ? 0.65 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }

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
        chipStateStyle,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.chipOuterFrame}>
        <LinearGradient
          colors={
            wordPlacement.found
              ? ['rgba(0, 230, 118, 0.55)', 'rgba(29, 233, 182, 0.18)', 'rgba(255,255,255,0.10)']
              : isActive
                ? ['rgba(0, 212, 255, 0.65)', 'rgba(179, 102, 255, 0.25)', 'rgba(255,255,255,0.12)']
                : ['rgba(255,255,255,0.24)', 'rgba(0, 212, 255, 0.12)', 'rgba(255,255,255,0.08)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.chipInnerShell}>
        <LinearGradient
          colors={
            wordPlacement.found
              ? ['rgba(0, 230, 118, 0.22)', 'rgba(10, 28, 36, 0.94)']
              : isActive && isValidWord
                ? ['rgba(0, 230, 118, 0.20)', 'rgba(9, 20, 34, 0.94)']
                : isActive
                  ? ['rgba(0, 212, 255, 0.20)', 'rgba(10, 18, 34, 0.96)']
                  : ['rgba(255,255,255,0.10)', 'rgba(9, 14, 28, 0.94)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.chipTopHighlight}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.chipGlow,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.75],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={
              isValidWord
                ? ['rgba(0, 230, 118, 0.40)', 'rgba(29, 233, 182, 0.04)']
                : ['rgba(0, 212, 255, 0.34)', 'rgba(179, 102, 255, 0.04)']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

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

        {wordPlacement.found ? (
          <Animated.View style={[styles.checkContainer, { opacity: foundAnim }]}>
            <LinearGradient
              colors={[COLORS.green, COLORS.teal] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]}
            />
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
        ) : (
          <View style={styles.letterCount}>
            <Text style={styles.letterCountText}>{wordPlacement.word.length}</Text>
          </View>
        )}
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
            colors={['transparent', 'rgba(0, 212, 255, 0.18)', 'rgba(179, 102, 255, 0.30)', 'rgba(0, 212, 255, 0.18)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scanlineGlow}
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scanlineCore}
          />
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
      <CurrentWordDisplay currentWord={currentWord} isValidWord={isValidWord} wordAnim={wordAnim} />
      <ChipRail words={words} currentWord={currentWord} isValidWord={isValidWord} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 14,
  },
  selectionBlock: {
    alignItems: 'center',
    gap: 8,
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
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },
  selectionCardValid: {
    borderColor: 'rgba(0, 230, 118, 0.55)',
    shadowColor: COLORS.green,
    shadowOpacity: 0.25,
  },
  selectionHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  currentWord: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowRadius: 10,
  },
  currentWordPlaceholder: {
    color: COLORS.textSecondary,
    letterSpacing: 8,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 22,
  },
  selectionMeta: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 2.2,
    color: COLORS.textMuted,
    fontFamily: 'Inter_500Medium',
  },
  validIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
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
  railFrame: {
    position: 'relative',
    minHeight: 74,
    justifyContent: 'center',
  },
  scanlineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -10,
    height: 20,
    justifyContent: 'center',
  },
  scanlineGlow: {
    height: 14,
    borderRadius: 999,
  },
  scanlineCore: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 9,
    height: 2,
    borderRadius: 999,
  },
  wordListScroll: {
    flexGrow: 0,
  },
  wordList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  wordChip: {
    borderRadius: 18,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  chipOuterFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    opacity: 0.95,
  },
  chipInnerShell: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16.5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  chipGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  wordChipFound: {
    shadowColor: COLORS.green,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  wordChipActive: {
    shadowColor: COLORS.accent,
    shadowOpacity: 0.36,
    shadowRadius: 14,
    elevation: 8,
  },
  wordChipValid: {
    shadowColor: COLORS.green,
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 10,
  },
  wordText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.wordPending,
    letterSpacing: 2.3,
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
    textShadowRadius: 9,
  },
  wordTextValid: {
    color: COLORS.green,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 14,
  },
  checkContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },
  letterCountText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
});
