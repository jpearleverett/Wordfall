import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { FONTS } from '../constants';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
}

const WordChip = React.memo(function WordChip({ wordPlacement, currentWord, isValidWord }: WordChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const foundAnim = useRef(new Animated.Value(wordPlacement.found ? 1 : 0)).current;
  const isActive = !wordPlacement.found && currentWord === wordPlacement.word;

  useEffect(() => {
    if (wordPlacement.found) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.92, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(foundAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (isActive) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.05, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    }
  }, [wordPlacement.found, isActive, foundAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.wordChip,
        wordPlacement.found && styles.wordChipFound,
        isActive && styles.wordChipActive,
        { transform: [{ scale: scaleAnim }], opacity: wordPlacement.found ? 0.72 : 1 },
      ]}
    >
      <LinearGradient
        colors={
          wordPlacement.found
            ? ['rgba(90,120,170,0.2)', 'rgba(52,57,110,0.28)'] as [string, string]
            : ['rgba(103, 74, 155, 0.52)', 'rgba(55, 35, 101, 0.64)'] as [string, string]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.wordChipInnerBorder} />
      <Text style={[styles.wordText, wordPlacement.found && styles.wordTextFound]}>{wordPlacement.word}</Text>
      <View style={[styles.countBadge, wordPlacement.found && styles.countBadgeFound]}>
        <Text style={[styles.countText, wordPlacement.found && styles.wordTextFound]}>{wordPlacement.word.length}</Text>
      </View>
      {isActive && !wordPlacement.found && (
        <View style={styles.activeGlow}>
          <LinearGradient
            colors={
              isValidWord
                ? ['rgba(90,255,210,0.0)', 'rgba(90,255,210,0.45)', 'rgba(90,255,210,0.0)'] as [string, string, string]
                : ['rgba(86,245,255,0.0)', 'rgba(86,245,255,0.45)', 'rgba(86,245,255,0.0)'] as [string, string, string]
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
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
  return (
    <View style={styles.container}>
      <View style={styles.currentWordWrap}>
        {currentWord.length > 0 ? (
          <Text style={[styles.currentWord, isValidWord && styles.currentWordValid]}>{currentWord}</Text>
        ) : (
          <Text style={styles.currentWordPlaceholder}> </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.wordRow}
        style={styles.wordScroll}
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
    paddingTop: 2,
    paddingBottom: 4,
  },
  currentWordWrap: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentWord: {
    fontSize: 60,
    lineHeight: 68,
    fontFamily: FONTS.display,
    color: '#eef6ff',
    letterSpacing: 3,
    textShadowColor: 'rgba(255,255,255,0.38)',
    textShadowRadius: 18,
  },
  currentWordValid: {
    color: '#72ffe4',
    textShadowColor: 'rgba(114,255,228,0.9)',
  },
  currentWordPlaceholder: {
    height: 0,
  },
  wordScroll: {
    overflow: 'visible',
  },
  wordRow: {
    gap: 12,
    paddingHorizontal: 56,
  },
  wordChip: {
    minWidth: 120,
    height: 52,
    borderRadius: 22,
    borderWidth: 1.25,
    borderColor: 'rgba(160, 194, 255, 0.34)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(48, 28, 86, 0.72)',
    shadowColor: '#6a45e8',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  wordChipFound: {
    borderColor: 'rgba(145, 158, 198, 0.18)',
    shadowOpacity: 0,
  },
  wordChipActive: {
    borderColor: 'rgba(86, 245, 255, 0.62)',
    shadowColor: '#56f5ff',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  wordChipInnerBorder: {
    position: 'absolute',
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  wordText: {
    color: '#8ef7ff',
    fontSize: 21,
    fontFamily: FONTS.display,
    letterSpacing: 1.3,
  },
  wordTextFound: {
    color: 'rgba(215, 223, 250, 0.55)',
  },
  countBadge: {
    position: 'absolute',
    right: -8,
    top: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(86,245,255,0.88)',
    borderWidth: 2,
    borderColor: 'rgba(23,16,54,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeFound: {
    backgroundColor: 'rgba(122, 133, 172, 0.42)',
  },
  countText: {
    color: '#11314a',
    fontFamily: FONTS.display,
    fontSize: 15,
  },
  activeGlow: {
    position: 'absolute',
    left: -30,
    right: -30,
    top: 20,
    height: 12,
  },
});
