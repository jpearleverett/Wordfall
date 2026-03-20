import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WordPlacement } from '../types';
import { COLORS } from '../constants';

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

export function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
  return (
    <View style={styles.container}>
      {/* Current forming word */}
      <View style={styles.currentWordContainer}>
        {currentWord.length > 0 ? (
          <Text
            style={[
              styles.currentWord,
              isValidWord && styles.currentWordValid,
            ]}
          >
            {currentWord}
          </Text>
        ) : (
          <Text style={styles.currentWordPlaceholder}>
            Tap letters to spell a word
          </Text>
        )}
      </View>

      {/* Target words */}
      <View style={styles.wordList}>
        {words.map((wordPlacement, index) => (
          <View
            key={`${wordPlacement.word}-${index}`}
            style={[
              styles.wordChip,
              wordPlacement.found && styles.wordChipFound,
              !wordPlacement.found &&
                currentWord === wordPlacement.word &&
                styles.wordChipActive,
            ]}
          >
            <Text
              style={[
                styles.wordText,
                wordPlacement.found && styles.wordTextFound,
                !wordPlacement.found &&
                  currentWord === wordPlacement.word &&
                  styles.wordTextActive,
              ]}
            >
              {wordPlacement.word}
            </Text>
            {wordPlacement.found && (
              <Text style={styles.checkMark}> ✓</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentWordContainer: {
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  currentWord: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 12,
  },
  currentWordPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  wordChipFound: {
    backgroundColor: COLORS.cellFound,
    borderColor: COLORS.green,
  },
  wordChipActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: COLORS.accent,
  },
  wordText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.wordPending,
    letterSpacing: 2,
  },
  wordTextFound: {
    color: COLORS.wordFound,
    textDecorationLine: 'line-through',
  },
  wordTextActive: {
    color: COLORS.wordActive,
  },
  checkMark: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '700',
  },
});
