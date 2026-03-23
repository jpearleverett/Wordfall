import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';

interface WordChipProps {
  wordPlacement: WordPlacement;
  currentWord: string;
  isValidWord: boolean;
}

const WordChip = React.memo(function WordChip({ wordPlacement, currentWord, isValidWord }: WordChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const active = !wordPlacement.found && currentWord === wordPlacement.word;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: wordPlacement.found ? 0.98 : active ? 1.04 : 1,
      friction: 6,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [active, wordPlacement.found, scaleAnim]);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: active ? (isValidWord ? 1 : 0.65) : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [active, isValidWord, glowAnim]);

  return (
    <Animated.View style={[styles.chipWrap, { transform: [{ scale: scaleAnim }] }]}> 
      <Animated.View style={[styles.chipGlow, { opacity: glowAnim }]} />
      <LinearGradient
        colors={wordPlacement.found
          ? ['rgba(94,255,182,0.24)', 'rgba(70,229,160,0.14)', 'rgba(28,35,82,0.64)']
          : ['rgba(132,94,255,0.28)', 'rgba(87,62,187,0.18)', 'rgba(47,38,112,0.54)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chip}
      >
        <View style={styles.chipInnerStroke} />
        <Text style={[styles.wordText, wordPlacement.found && styles.wordTextFound]}>{wordPlacement.word}</Text>
        <View style={styles.lengthBubble}>
          <Text style={styles.lengthText}>{wordPlacement.word.length}</Text>
        </View>
      </LinearGradient>
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

  useEffect(() => {
    Animated.timing(wordAnim, {
      toValue: currentWord.length > 0 ? 1 : 0,
      duration: 180,
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
                opacity: wordAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                transform: [{ scale: wordAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
              },
            ]}
          >
            {currentWord}
          </Animated.Text>
        ) : (
          <Text style={styles.placeholder}>Tap letters to spell a word</Text>
        )}
        <View style={styles.currentWordUnderline}>
          <LinearGradient
            colors={currentWord.length > 0
              ? isValidWord
                ? ['rgba(95,255,198,0)', 'rgba(95,255,198,0.8)', 'rgba(95,255,198,0)']
                : ['rgba(91,244,255,0)', 'rgba(91,244,255,0.88)', 'rgba(91,244,255,0)']
              : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {words.map((wordPlacement, index) => (
          <WordChip key={`${wordPlacement.word}-${index}`} wordPlacement={wordPlacement} currentWord={currentWord} isValidWord={isValidWord} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  currentWordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    marginBottom: 12,
  },
  currentWord: {
    color: '#f0f3ff',
    fontSize: 66,
    lineHeight: 72,
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.24)',
    textShadowRadius: 16,
  },
  currentWordValid: {
    color: '#7afce3',
    textShadowColor: 'rgba(122,252,227,0.55)',
  },
  placeholder: {
    color: 'rgba(114,197,222,0.72)',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  currentWordUnderline: {
    width: '72%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipRow: {
    gap: 12,
    paddingRight: 24,
  },
  chipWrap: {
    position: 'relative',
  },
  chipGlow: {
    position: 'absolute',
    inset: -6,
    borderRadius: 24,
    backgroundColor: 'rgba(92,244,255,0.26)',
  },
  chip: {
    minWidth: 116,
    height: 52,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderColor: 'rgba(166,214,255,0.26)',
    overflow: 'hidden',
  },
  chipInnerStroke: {
    position: 'absolute',
    inset: 3,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  wordText: {
    color: '#78ecff',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 0.8,
  },
  wordTextFound: {
    color: '#b8ffe2',
  },
  lengthBubble: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92,244,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(104,242,255,0.24)',
  },
  lengthText: {
    color: '#5ff2ff',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
