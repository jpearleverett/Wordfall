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
  const foundAnim = useRef(new Animated.Value(wordPlacement.found ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isActive = !wordPlacement.found && currentWord === wordPlacement.word;

  useEffect(() => {
    if (wordPlacement.found) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.03,
          friction: 5,
          tension: 160,
          useNativeDriver: true,
        }),
        Animated.timing(foundAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.05 : 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [foundAnim, isActive, scaleAnim, wordPlacement.found]);

  return (
    <Animated.View
      style={[
        styles.wordChip,
        wordPlacement.found && styles.wordChipFound,
        isActive && !wordPlacement.found && (isValidWord ? styles.wordChipValid : styles.wordChipActive),
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={
          wordPlacement.found
            ? ['rgba(59, 230, 255, 0.18)', 'rgba(255, 96, 224, 0.18)']
            : ['rgba(90, 60, 150, 0.22)', 'rgba(45, 18, 88, 0.26)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.chipGlassEdge} />
      <Text
        style={[
          styles.wordText,
          wordPlacement.found && styles.wordTextFound,
          isActive && !wordPlacement.found && styles.wordTextActive,
          isActive && isValidWord && styles.wordTextValid,
        ]}
      >
        {wordPlacement.word}
      </Text>
      {!wordPlacement.found && (
        <View style={styles.letterCount}>
          <Text style={styles.letterCountText}>{wordPlacement.word.length}</Text>
        </View>
      )}
      {wordPlacement.found && (
        <Animated.View style={[styles.foundGlow, { opacity: foundAnim }]} />
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
  const wordAnim = useRef(new Animated.Value(currentWord.length > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(wordAnim, {
      toValue: currentWord.length > 0 ? 1 : 0,
      friction: 6,
      tension: 170,
      useNativeDriver: true,
    }).start();
  }, [currentWord, wordAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.currentWordContainer}>
        {currentWord.length > 0 ? (
          <Animated.Text
            style={[
              styles.currentWord,
              isValidWord && styles.currentWordValid,
              {
                opacity: wordAnim,
                transform: [
                  {
                    scale: wordAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                  },
                ],
              },
            ]}
          >
            {currentWord}
          </Animated.Text>
        ) : (
          <Text style={styles.currentWordPlaceholder}>Tap letters to spell a word</Text>
        )}
      </View>

      <View style={styles.underlineWrap}>
        <LinearGradient
          colors={['rgba(0, 241, 255, 0)', 'rgba(0, 241, 255, 0.8)', 'rgba(255, 115, 225, 0.25)', 'rgba(255, 115, 225, 0)'] as [string, string, string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.underline}
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 2,
  },
  currentWordContainer: {
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentWord: {
    fontSize: 62,
    lineHeight: 68,
    fontFamily: FONTS.display,
    color: '#edf1ff',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(154, 226, 255, 0.36)',
    textShadowRadius: 18,
  },
  currentWordValid: {
    color: '#78ffec',
    textShadowColor: 'rgba(120,255,236,0.5)',
    textShadowRadius: 24,
  },
  currentWordPlaceholder: {
    fontSize: 18,
    color: 'rgba(79, 164, 214, 0.68)',
    fontFamily: FONTS.bodyMedium,
  },
  underlineWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  underline: {
    width: '66%',
    height: 3,
    borderRadius: 999,
  },
  wordListScroll: {
    flexGrow: 0,
  },
  wordList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  wordChip: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(155, 194, 255, 0.22)',
    overflow: 'hidden',
    backgroundColor: 'rgba(35, 18, 74, 0.34)',
    shadowColor: '#5beeff',
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  chipGlassEdge: {
    position: 'absolute',
    top: 3,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  wordChipFound: {
    borderColor: 'rgba(94, 242, 255, 0.52)',
  },
  wordChipActive: {
    borderColor: 'rgba(95, 236, 255, 0.72)',
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  wordChipValid: {
    borderColor: 'rgba(121, 255, 236, 0.95)',
    shadowColor: '#78ffec',
    shadowOpacity: 0.36,
    shadowRadius: 16,
  },
  wordText: {
    fontSize: 22,
    fontFamily: FONTS.display,
    color: '#89d8ff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: '#d3b0ff',
  },
  wordTextActive: {
    color: '#a2f6ff',
    textShadowColor: 'rgba(91,238,255,0.48)',
    textShadowRadius: 10,
  },
  wordTextValid: {
    color: '#78ffec',
  },
  letterCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(85, 53, 160, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(114, 219, 255, 0.26)',
  },
  letterCountText: {
    color: '#66ddff',
    fontSize: 16,
    fontFamily: FONTS.display,
  },
  foundGlow: {
    position: 'absolute',
    left: -18,
    right: -18,
    top: -8,
    bottom: -8,
    borderRadius: 30,
    backgroundColor: 'rgba(95, 236, 255, 0.08)',
  },
});
