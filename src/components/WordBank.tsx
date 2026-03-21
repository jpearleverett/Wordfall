import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, GRADIENTS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '../constants';

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
}

export function WordBank({ words, currentWord, isValidWord }: WordBankProps) {
  const foundCount = words.filter(word => word.found).length;

  return (
    <LinearGradient colors={GRADIENTS.panelSoft} style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker}>Wordbank</Text>
          <Text style={styles.caption}>Plan drops. Clear in the right order.</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressValue}>{foundCount}/{words.length}</Text>
        </View>
      </View>

      <View style={[styles.currentWordContainer, isValidWord && styles.currentWordContainerValid]}>
        {currentWord.length > 0 ? (
          <Text style={[styles.currentWord, isValidWord && styles.currentWordValid]} numberOfLines={1}>
            {currentWord}
          </Text>
        ) : (
          <Text style={styles.currentWordPlaceholder}>Trace a path to reveal a word</Text>
        )}
      </View>

      <View style={styles.wordList}>
        {words.map((wordPlacement, index) => {
          const isActive = !wordPlacement.found && currentWord === wordPlacement.word;
          return (
            <View
              key={`${wordPlacement.word}-${index}`}
              style={[
                styles.wordChip,
                wordPlacement.found && styles.wordChipFound,
                isActive && styles.wordChipActive,
              ]}
            >
              <Text
                style={[
                  styles.wordText,
                  wordPlacement.found && styles.wordTextFound,
                  isActive && styles.wordTextActive,
                ]}
              >
                {wordPlacement.word}
              </Text>
              {wordPlacement.found && <Text style={styles.checkMark}>✦</Text>}
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  kicker: {
    color: COLORS.textPrimary,
    fontSize: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.display,
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.ui,
  },
  progressBadge: {
    minWidth: 54,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  progressValue: {
    color: COLORS.gold,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.display,
  },
  currentWordContainer: {
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 11, 29, 0.42)',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  currentWordContainerValid: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(82,214,123,0.12)',
  },
  currentWord: {
    fontSize: 28,
    color: COLORS.textPrimary,
    letterSpacing: 5,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.display,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 14,
  },
  currentWordPlaceholder: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.ui,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  wordChipFound: {
    backgroundColor: 'rgba(82,214,123,0.14)',
    borderColor: 'rgba(82,214,123,0.5)',
  },
  wordChipActive: {
    backgroundColor: 'rgba(32,216,255,0.14)',
    borderColor: COLORS.accent,
  },
  wordText: {
    fontSize: 14,
    color: COLORS.wordPending,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.ui,
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
    fontSize: 12,
  },
});
