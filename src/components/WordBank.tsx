import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

function WordPill({ word }: { word: string }) {
  return (
    <View style={styles.wordChip}>
      <LinearGradient
        colors={['rgba(24, 36, 74, 0.78)', 'rgba(12, 24, 54, 0.9)'] as [string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
      />
      <View style={styles.wordChipGloss} />
      <Text style={styles.wordText}>{word}</Text>
    </View>
  );
}

export function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
  const visibleWords = words.filter((w) => w.found || (currentWord.length > 0 && currentWord === w.word));

  return (
    <View style={styles.container}>
      <View style={styles.wordList}>
        {visibleWords.slice(0, 4).map((wordPlacement, index) => (
          <WordPill key={`${wordPlacement.word}-${index}`} word={wordPlacement.word} />
        ))}
      </View>
      {currentWord.length > 0 && !isValidWord && (
        <Text style={styles.ghostWord}>{currentWord}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    minHeight: 96,
    alignItems: 'center',
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    minHeight: 86,
  },
  wordChip: {
    minWidth: 158,
    height: 42,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(97, 238, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#66ebff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 10,
  },
  wordChipGloss: {
    position: 'absolute',
    top: 2,
    left: 16,
    right: 16,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(195, 246, 255, 0.28)',
  },
  wordText: {
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#a7f5ff',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(77, 235, 255, 0.75)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  ghostWord: {
    marginTop: 2,
    color: 'rgba(206, 170, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 3,
  },
});
