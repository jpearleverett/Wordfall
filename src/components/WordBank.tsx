import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WordPlacement } from '../types';
import { COLORS, GRADIENTS, FONTS } from '../constants';
import { getRemoteBoolean } from '../services/remoteConfig';

interface WordChipProps {
  wordPlacement: WordPlacement;
  // isActive is now computed by the parent and passed as a stable boolean.
  // Previously WordChip received `currentWord` directly and computed isActive
  // internally — which meant React.memo's shallow compare fired on every
  // currentWord change, forcing ALL 4-6 chips to re-render on every tap
  // even when their isActive bool didn't actually change. That was the
  // single biggest contributor to WordBank's 10-20ms per-tap cost.
  isActive: boolean;
  isValidWord: boolean;
  /**
   * Last-remaining-word pulse. True when this is the only unfound chip in the
   * puzzle — drives a looping scale pulse so the final word telegraphs the
   * "one away from winning" moment.
   */
  isLastRemaining: boolean;
  /**
   * Tier 6 B7 — rising edge of this prop fires a one-shot overshoot + glow so
   * the visual coordinates with the BGM swap + haptic tension moment. This is
   * distinct from `isLastRemaining`: that stays true for the whole final-word
   * phase (driving the gentle loop), while `tensionActive` transitions false →
   * true exactly once when the player enters the tension state.
   */
  tensionActive: boolean;
  index: number;
}

const WordChip = React.memo(function WordChip({ wordPlacement, isActive, isValidWord, isLastRemaining, tensionActive, index }: WordChipProps) {
  const foundAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const lastRemainingAnim = useRef(new Animated.Value(1)).current;
  // Tier 6 B7 — tension pulse is scale-only (native-driver safe). The
  // earlier glow-on-shadowOpacity channel was dropped because mixing a
  // JS-driven shadowOpacity and a native-driven transform on the same
  // Animated.View triggers "Attempting to run JS driven animation on
  // animated node that has been moved to native earlier" once an
  // animation completes. The scale overshoot + the gold
  // wordChipLastRemaining border already communicate the tension
  // moment; the glow layer was low ROI and the crash risk.
  const tensionScaleAnim = useRef(new Animated.Value(0)).current;
  const wasFound = useRef(false);
  const lastRemainingLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const tensionFiredRef = useRef(false);

  useEffect(() => {
    if (wordPlacement.found && !wasFound.current) {
      wasFound.current = true;
      Animated.sequence([
        // Initial pop up to 1.25x
        Animated.spring(scaleAnim, {
          toValue: 1.25,
          friction: 3,
          tension: 280,
          useNativeDriver: true,
        }),
        // Bounce down past 1.0 to 0.9
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        // Settle back to 1.0 with checkmark fade-in
        Animated.parallel([
          Animated.timing(foundAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 160,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [wordPlacement.found]);

  // Tier 6 B7 — fire a one-shot overshoot + glow when `tensionActive` rises,
  // coordinating the visual with the BGM swap + haptic moment in GameScreen.
  // Only fires on the chip that is currently `isLastRemaining` (so found
  // chips and earlier-resolved words stay calm) and only once per puzzle
  // (tensionFiredRef).
  useEffect(() => {
    if (!tensionActive) {
      tensionFiredRef.current = false;
      // Reset back to 0 via a zero-duration native animation rather than
      // setValue() — setValue on a node that's already been moved to
      // native can trigger the same "JS driven animation on native
      // node" crash we hit before.
      Animated.timing(tensionScaleAnim, { toValue: 0, duration: 0, useNativeDriver: true }).start();
      return;
    }
    if (!isLastRemaining || wordPlacement.found) return;
    if (tensionFiredRef.current) return;
    if (!getRemoteBoolean('lastWordTensionPulseEnabled')) return;
    tensionFiredRef.current = true;
    Animated.sequence([
      Animated.timing(tensionScaleAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(tensionScaleAnim, { toValue: 0.35, friction: 5, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [tensionActive, isLastRemaining, wordPlacement.found]);

  useEffect(() => {
    // Last-remaining-word pulse: loop scale 1.0 → 1.08 → 1.0 while this is the
    // only unfound chip. Stop + reset when the condition is no longer true.
    if (lastRemainingLoopRef.current) {
      lastRemainingLoopRef.current.stop();
      lastRemainingLoopRef.current = null;
    }
    if (isLastRemaining && !wordPlacement.found) {
      lastRemainingAnim.setValue(1);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(lastRemainingAnim, {
            toValue: 1.08,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(lastRemainingAnim, {
            toValue: 1.0,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      );
      lastRemainingLoopRef.current = loop;
      loop.start();
    } else {
      lastRemainingAnim.setValue(1);
    }
    return () => {
      if (lastRemainingLoopRef.current) {
        lastRemainingLoopRef.current.stop();
        lastRemainingLoopRef.current = null;
      }
    };
  }, [isLastRemaining, wordPlacement.found]);

  useEffect(() => {
    // Stop any running animation before starting a new one
    glowAnim.stopAnimation();

    if (isActive && isValidWord) {
      // Finite pulse (3 cycles) instead of infinite Animated.loop
      // to avoid continuous animation overhead on the native thread
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      ]).start();
    } else if (isActive) {
      Animated.timing(glowAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }).start();
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
    }
  }, [isActive, isValidWord]);

  const getChipStyle = () => {
    if (wordPlacement.found) return styles.wordChipFound;
    if (isActive && isValidWord) return styles.wordChipValid;
    if (isActive) return styles.wordChipActive;
    return null;
  };

  // Tier 6 B7 — tension pulse maps tensionScaleAnim to a scale overshoot.
  // Glow layer removed; scale + gold border in wordChipLastRemaining
  // carry the tension visual.
  const tensionScale = tensionScaleAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 1.06, 1.17],
  });

  return (
    <Animated.View
      style={[
        styles.wordChip,
        getChipStyle(),
        isLastRemaining && !wordPlacement.found && styles.wordChipLastRemaining,
        {
          transform: [
            { scale: Animated.multiply(Animated.multiply(scaleAnim, lastRemainingAnim), tensionScale) },
          ],
        },
      ]}
      accessibilityLabel={`${wordPlacement.word}, ${wordPlacement.found ? 'found' : 'not found'}${isLastRemaining && !wordPlacement.found ? ', last remaining' : ''}`}
    >
      {/* Background gradient + glass edge clipped to chip shape */}
      <View style={styles.chipBackground}>
        {wordPlacement.found ? (
          <LinearGradient
            colors={['rgba(0, 230, 118, 0.22)', 'rgba(0, 200, 83, 0.10)'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string]}
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

    </Animated.View>
  );
});

interface WordBankProps {
  words: WordPlacement[];
  currentWord: string;
  isValidWord: boolean;
  /**
   * Tier 6 B7 — mirrors GameScreen's last-word tension trigger. Set to true
   * when exactly one word remains so the final chip can fire a one-shot
   * overshoot + gold-glow coordinated with the BGM swap + haptic. Defaults
   * to false when the prop isn't passed (no behavior change for older
   * callers).
   */
  tensionActive?: boolean;
}

/**
 * Wordscapes-style fill-in dash row. Renders one slot per letter of the
 * target word; slots fill from the player's current trace as they match
 * the word's prefix, then strike through on match. Found words stay
 * visible with the letters + strikethrough + ✓.
 *
 * Used when `crosswordDashRevealEnabled` RC flag is on. Defaults OFF so
 * the visual change is opt-in and A/B-able.
 */
interface DashRowProps {
  word: string;
  found: boolean;
  prefixLen: number;
  isValidWord: boolean;
}
const DashRow = React.memo(function DashRow({ word, found, prefixLen, isValidWord }: DashRowProps) {
  const letters = word.toUpperCase().split('');
  const active = !found && prefixLen > 0;
  return (
    <View style={[dashStyles.row, active && dashStyles.rowActive, found && dashStyles.rowFound]}>
      {letters.map((ch, i) => {
        const revealed = found || i < prefixLen;
        return (
          <View
            key={i}
            style={[
              dashStyles.slot,
              revealed && dashStyles.slotRevealed,
              found && dashStyles.slotFound,
              active && isValidWord && i === prefixLen - 1 && dashStyles.slotValid,
            ]}
          >
            <Text
              style={[
                dashStyles.slotText,
                revealed && dashStyles.slotTextRevealed,
                found && dashStyles.slotTextFound,
              ]}
            >
              {revealed ? ch : ''}
            </Text>
          </View>
        );
      })}
      {found && <Text style={dashStyles.checkmark}>✓</Text>}
    </View>
  );
});

export const WordBank = React.memo(function WordBank({ words, currentWord, isValidWord, tensionActive }: WordBankProps) {
  const wordAnim = useRef(new Animated.Value(0)).current;
  const prevWord = useRef('');
  const { height: windowHeight } = useWindowDimensions();
  const foundCount = useMemo(() => words.filter(w => w.found).length, [words]);
  // Wrap chips into a multi-row panel by default. The earlier guard
  // (`windowHeight >= 700 && words.length <= 10`) was too strict — even on
  // a notched iPhone the wrap never triggered, so users still saw a
  // horizontally-truncated list. We now drop the height guard (the grid
  // auto-shrinks to absorb the extra wrapped row) and only fall back to
  // horizontal scroll when the list is genuinely large (>14 words).
  const useExpandedPanel =
    getRemoteBoolean('wordBankExpandedPanelEnabled') && words.length <= 14;
  // Wordscapes-style fill-in dashes are heavier vertically — only render when
  // we both have the wrap layout AND a tall enough device, so iPhone SE
  // doesn't get pushed.
  const useDashReveal =
    getRemoteBoolean('crosswordDashRevealEnabled') &&
    useExpandedPanel &&
    windowHeight >= 700;

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
    <View style={styles.container} accessibilityRole="list">
      {/* Current forming word */}
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
                  colors={[COLORS.green, COLORS.teal] as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                />
                <Text style={styles.validIndicatorText}>✓</Text>
              </View>
            )}
          </View>
        ) : foundCount === 0 ? (
          <Text style={styles.currentWordPlaceholder}>
            Trace a word from the list
          </Text>
        ) : null}
        {/* Elegant underline with gradient */}
        <View style={styles.underline}>
          {currentWord.length > 0 && (
            <LinearGradient
              colors={
                isValidWord
                  ? ['rgba(0,230,118,0.7)', 'rgba(0,230,118,0.2)', 'rgba(0,230,118,0)'] as [string, string, string]
                  : ['rgba(255,45,149,0.5)', 'rgba(255,45,149,0.15)', 'rgba(255,45,149,0)'] as [string, string, string]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineFill}
            />
          )}
        </View>
      </View>

      {/* Target words - dash-reveal (opt-in), wrapped chips, or horizontal scroll fallback */}
      {useDashReveal ? (
        <View style={dashStyles.panel}>
          {words.map((wordPlacement, index) => {
            const wordUpper = wordPlacement.word.toUpperCase();
            const currentUpper = currentWord.toUpperCase();
            const prefixLen =
              !wordPlacement.found && currentUpper.length > 0 && wordUpper.startsWith(currentUpper)
                ? currentUpper.length
                : 0;
            const chipIsValid =
              !wordPlacement.found && currentUpper === wordUpper && isValidWord;
            return (
              <DashRow
                key={`${wordPlacement.word}-${index}`}
                word={wordPlacement.word}
                found={wordPlacement.found}
                prefixLen={prefixLen}
                isValidWord={chipIsValid}
              />
            );
          })}
        </View>
      ) : (() => {
        const unfoundCount = words.filter(w => !w.found).length;
        const chips = words.map((wordPlacement, index) => {
          // Compute isActive here so we pass a stable boolean to WordChip.
          // When currentWord changes from "AB" → "ABC", only chips whose
          // boolean flipped re-render; the rest are skipped by React.memo.
          const isActive = !wordPlacement.found && currentWord === wordPlacement.word;
          // isValidWord only affects a chip's rendering when it's also the
          // active one. Passing `false` to all other chips keeps their props
          // stable when the *global* isValidWord flips, avoiding a cascade
          // of re-renders across all 4-6 chips on every valid-word moment.
          const chipIsValid = isActive && isValidWord;
          const isLastRemaining = unfoundCount === 1 && !wordPlacement.found;
          return (
            <WordChip
              key={`${wordPlacement.word}-${index}`}
              wordPlacement={wordPlacement}
              isActive={isActive}
              isValidWord={chipIsValid}
              isLastRemaining={isLastRemaining}
              tensionActive={!!tensionActive}
              index={index}
            />
          );
        });
        return useExpandedPanel ? (
          <View style={styles.wordListWrap}>{chips}</View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.wordList}
            style={styles.wordListScroll}
          >
            {chips}
          </ScrollView>
        );
      })()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    // Air added above so the chip band doesn't crowd the GameHeader's
    // bottom edge — the header already has its own glass chrome that
    // visually competes with the chips when they hug it.
    marginTop: 10,
    // 20px clears Grid.tsx's +22px decorative overflow (outerGlow +
    // neonFrameWrap + shadowRadius extend past the grid's measured top
    // edge). Earlier 14px let the neon frame poke up into the last chip
    // row. This is the minimum that prevents that overlap while still
    // leaving the grid noticeably higher than the original 26px.
    marginBottom: 20,
    // zIndex + elevation keep the chip band painted on top of the
    // grid's shadow if it ever extends this far up.
    zIndex: 2,
    elevation: 2,
  },
  currentWordContainer: {
    alignItems: 'center',
    // Bumped from 1 → 10 — the underline + traced-letter readout
    // previously crowded the chip row directly beneath. With proper
    // breathing room, the readout reads as a separate "what you've
    // traced" element rather than a header on top of the chips.
    marginBottom: 10,
    height: 19,
    justifyContent: 'center',
  },
  currentWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentWord: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(200,77,255,0.4)',
    textShadowRadius: 6,
  },
  currentWordValid: {
    color: COLORS.green,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 28,
  },
  validIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    width: '45%',
    height: 1.5,
    marginTop: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  wordListWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    // Bumped from 0.22 to 0.55 — the earlier dim-backdrop shipped made
    // the previous ~22% border almost invisible against the darker
    // gradient, so the wrap panel rendered but the chips looked like
    // empty whitespace.
    borderColor: 'rgba(200,77,255,0.55)',
    backgroundColor: 'rgba(26, 10, 46, 0.55)',
    overflow: 'visible',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  chipBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
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
    borderColor: 'rgba(0, 230, 118, 0.5)',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  wordChipActive: {
    borderColor: 'rgba(255, 45, 149, 0.55)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  wordChipValid: {
    borderColor: COLORS.green,
    borderWidth: 2,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  wordChipLastRemaining: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  wordText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.wordPending,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  wordTextFound: {
    color: COLORS.wordFound,
    textDecorationLine: 'line-through',
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 10,
  },
  wordTextActive: {
    color: COLORS.wordActive,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 12,
  },
  wordTextValid: {
    color: COLORS.green,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.greenGlow,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(200,77,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200,77,255,0.15)',
  },
  letterCountText: {
    color: COLORS.purpleLight,
    fontSize: 9,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});

const dashStyles = StyleSheet.create({
  panel: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 77, 255, 0.15)',
    backgroundColor: 'rgba(10, 0, 21, 0.35)',
  },
  rowActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(255, 45, 149, 0.10)',
  },
  rowFound: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    opacity: 0.85,
  },
  slot: {
    width: 18,
    height: 22,
    borderRadius: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRevealed: {
    borderBottomColor: 'rgba(255,255,255,0.6)',
  },
  slotValid: {
    borderBottomColor: COLORS.green,
  },
  slotFound: {
    borderBottomColor: COLORS.green,
  },
  slotText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: COLORS.textPrimary,
    letterSpacing: 0.4,
  },
  slotTextRevealed: {
    color: COLORS.textPrimary,
  },
  slotTextFound: {
    color: COLORS.green,
    textDecorationLine: 'line-through',
  },
  checkmark: {
    marginLeft: 4,
    color: COLORS.green,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
