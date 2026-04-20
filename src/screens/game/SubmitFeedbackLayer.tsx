/**
 * SubmitFeedbackLayer — the chain-popup + score-popup + big-word label
 * + neon-pulse + VHS-glitch overlays, extracted out of GameScreen so that
 * submit-moment state changes (score popup shown / hidden, chain visible,
 * big-word label) no longer force the 2700-line GameScreen to re-render.
 *
 * This subscribes directly to the game zustand store for `score` and
 * `combo`, mirroring the price of two cheap selector comparisons for the
 * privilege of never involving GameScreen in popup state transitions.
 *
 * All animations use Reanimated shared values (UI thread) rather than
 * legacy `Animated.Value` so the sequences never cross the JS→native
 * bridge mid-animation. Visual output is a pixel-identical port of what
 * GameFlashes used to render for these specific overlays.
 *
 * GameScreen still owns shake, validFlash, invalidFlash, score-change
 * haptics, particle spawning, and the chain-count analytics emit — those
 * concerns aren't popup-state, they're game-wide reactions. This layer
 * only owns the popups themselves.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { GameState } from '../../types';
import { GameStore } from '../../stores/gameStore';
import { COLORS, FONTS } from '../../constants';

// Labels shuffled at submit time for 7+ letter words.
const BIG_WORD_LABELS = ['AMAZING!', 'INCREDIBLE!', 'PHENOMENAL!', 'SPECTACULAR!'];

export interface SubmitFeedbackLayerHandle {
  /**
   * Called from GameScreen's score-change effect when a new word lands.
   * `points` is the score delta, `combo` the current combo count,
   * `wordLen` the length of the submitted word. The layer handles popup
   * visibility + animation internally from here.
   */
  onWordScored(points: number, combo: number, wordLen: number): void;
}

interface SubmitFeedbackLayerProps {
  /** The zustand store instance — we subscribe directly to it for `combo`. */
  store: GameStore;
  /** User's reduce-motion preference; identical to GameScreen's read. */
  reduceMotion: boolean;
}

function SubmitFeedbackLayerImpl(
  { store, reduceMotion }: SubmitFeedbackLayerProps,
  ref: React.Ref<SubmitFeedbackLayerHandle>,
) {
  // Drive the chain-celebration "visible" state from store so we don't
  // need GameScreen to push us anything. The popup hides itself via a
  // timeout set inside the animation sequence.
  const combo = useStore(store, (s: GameState) => s.combo);
  const status = useStore(store, (s: GameState) => s.status);

  const [scorePopup, setScorePopup] = useState<{
    label: string;
    popupScale: number;
    comboActive: boolean;
    wordLen: number;
  } | null>(null);
  const [bigWordLabel, setBigWordLabel] = useState<string | null>(null);
  const [chainVisible, setChainVisible] = useState(false);

  // ── Reanimated shared values (UI-thread animations) ────────────────
  const scoreAnim = useSharedValue(0);
  const bigWordAnim = useSharedValue(0);
  const chainAnim = useSharedValue(0);

  // Latest combo for the chain popup text (captured at the moment of
  // celebration, not the live value — a fresh submit while the popup is
  // fading would otherwise flash the wrong combo).
  const [chainCombo, setChainCombo] = useState(0);

  // ── Chain celebration on combo > 1 ─────────────────────────────────
  const prevComboRef = useRef(combo);
  useEffect(() => {
    if (combo > 1 && combo > prevComboRef.current && status === 'playing') {
      setChainCombo(combo);
      setChainVisible(true);
      chainAnim.value = 0;
      if (reduceMotion) {
        // Simpler show/hide path without the spring.
        chainAnim.value = 1;
        const t = setTimeout(() => {
          chainAnim.value = 0;
          setChainVisible(false);
        }, 800);
        prevComboRef.current = combo;
        return () => clearTimeout(t);
      }
      // spring up -> hold -> fade
      chainAnim.value = withSequence(
        withSpring(1, { damping: 8, stiffness: 180 }),
        withDelay(550, withTiming(0, { duration: 450 }, (finished) => {
          if (finished) runOnJS(setChainVisible)(false);
        })),
      );
    }
    prevComboRef.current = combo;
  }, [combo, status, reduceMotion, chainAnim]);

  // ── Imperative API exposed to GameScreen for score popups ──────────
  useImperativeHandle(ref, () => ({
    onWordScored(points, scoredCombo, wordLen) {
      if (points <= 0) return;
      const label = scoredCombo > 1 ? `+${points} (${scoredCombo}x!)` : `+${points}`;
      const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.0;
      setScorePopup({ label, popupScale, comboActive: scoredCombo > 1, wordLen });

      scoreAnim.value = 0;
      if (reduceMotion) {
        scoreAnim.value = 1;
        const t = setTimeout(() => {
          scoreAnim.value = 0;
          setScorePopup(null);
        }, 800);
        // Big word celebration (reduceMotion — no spring/shake).
        if (wordLen >= 7) {
          const bigLabel = BIG_WORD_LABELS[Math.floor(Math.random() * BIG_WORD_LABELS.length)];
          setBigWordLabel(bigLabel);
          bigWordAnim.value = 1;
          const bt = setTimeout(() => {
            bigWordAnim.value = 0;
            setBigWordLabel(null);
          }, 1000);
          return () => { clearTimeout(t); clearTimeout(bt); };
        }
        return () => clearTimeout(t);
      }

      scoreAnim.value = withSequence(
        withSpring(1, { damping: 10, stiffness: 180 }),
        withDelay(600, withTiming(2, { duration: 300, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished) runOnJS(setScorePopup)(null);
        })),
      );

      if (wordLen >= 7) {
        const bigLabel = BIG_WORD_LABELS[Math.floor(Math.random() * BIG_WORD_LABELS.length)];
        setBigWordLabel(bigLabel);
        bigWordAnim.value = 0;
        bigWordAnim.value = withSequence(
          withSpring(1, { damping: 8, stiffness: 200 }),
          withDelay(800, withTiming(0, { duration: 300 }, (finished) => {
            if (finished) runOnJS(setBigWordLabel)(null);
          })),
        );
      }
    },
  }), [scoreAnim, bigWordAnim, reduceMotion]);

  // ── Derived palette for chain popup ────────────────────────────────
  const { chainBgColor, chainShadowColor, chainBorderColor, chainTargetScale } = useMemo(() => {
    const c = chainCombo;
    return {
      chainTargetScale: c >= 6 ? 1.5 : c >= 4 ? 1.2 : 1,
      chainBgColor:
        c >= 6 ? 'rgba(168, 85, 247, 0.95)' :
        c >= 4 ? 'rgba(255, 215, 0, 0.95)' :
        'rgba(255, 45, 149, 0.95)',
      chainShadowColor: c >= 6 ? COLORS.purple : c >= 4 ? COLORS.gold : COLORS.accent,
      chainBorderColor:
        c >= 6 ? 'rgba(200, 140, 255, 0.5)' :
        c >= 4 ? 'rgba(255, 230, 100, 0.5)' :
        'rgba(255,255,255,0.3)',
    };
  }, [chainCombo]);

  const chainStyle = useAnimatedStyle(() => ({
    opacity: chainAnim.value,
    transform: [{ scale: interpolate(chainAnim.value, [0, 1], [0.5, chainTargetScale]) }],
  }), [chainTargetScale]);

  const neonPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(chainAnim.value, [0, 0.5, 1], [0, 0.6, 0]),
  }));

  const vhsGlitchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(chainAnim.value, [0, 0.3, 0.5, 0.7, 1], [0, 0.12, 0, 0.08, 0]),
    transform: [{
      translateX: interpolate(
        chainAnim.value,
        [0, 0.2, 0.25, 0.45, 0.5, 1],
        [0, 4, -3, 2, -1, 0],
      ),
    }],
  }));

  const scorePopupStyle = useAnimatedStyle(() => {
    const popupScale = scorePopup?.popupScale ?? 1;
    return {
      opacity: interpolate(scoreAnim.value, [0, 0.5, 1, 1.8, 2], [0, 1, 1, 1, 0]),
      transform: [
        { translateY: interpolate(scoreAnim.value, [0, 1, 2], [20, 0, -40]) },
        {
          scale: interpolate(
            scoreAnim.value,
            [0, 0.3, 1, 2],
            [0.5 * popupScale, 1.2 * popupScale, popupScale, 0.8 * popupScale],
          ),
        },
      ],
    };
  }, [scorePopup?.popupScale]);

  const bigWordStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bigWordAnim.value, [0, 0.3, 0.8, 1], [0, 1, 1, 0]),
    transform: [{
      scale: interpolate(bigWordAnim.value, [0, 0.2, 0.5, 1], [0.3, 1.3, 1.0, 0.8]),
    }],
  }));

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      {chainVisible && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            styles.chainPopup,
            {
              backgroundColor: chainBgColor,
              shadowColor: chainShadowColor,
              borderColor: chainBorderColor,
            },
            chainStyle,
          ]}
        >
          <Text
            style={[
              styles.chainText,
              chainCombo >= 6 && { fontSize: 40, letterSpacing: 6 },
              chainCombo >= 4 && chainCombo < 6 && { fontSize: 36, letterSpacing: 5.5 },
            ]}
          >
            {chainCombo}x CHAIN!
          </Text>
        </Reanimated.View>
      )}

      {chainVisible && chainCombo >= 3 && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            styles.neonPulseOverlay,
            { borderColor: chainCombo >= 4 ? COLORS.cyan : COLORS.accent },
            neonPulseStyle,
          ]}
        />
      )}

      {chainVisible && chainCombo >= 4 && (
        <Reanimated.View
          pointerEvents="none"
          style={[styles.vhsGlitchOverlay, vhsGlitchStyle]}
        />
      )}

      {scorePopup && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            styles.scorePopup,
            scorePopup.wordLen >= 7 && styles.scorePopupBig,
            scorePopup.wordLen >= 5 && scorePopup.wordLen < 7 && styles.scorePopupMedium,
            scorePopupStyle,
          ]}
        >
          <Text
            style={[
              styles.scorePopupText,
              scorePopup.comboActive && styles.scorePopupCombo,
              scorePopup.wordLen >= 7 && styles.scorePopupTextBig,
            ]}
          >
            {scorePopup.label}
          </Text>
        </Reanimated.View>
      )}

      {bigWordLabel && (
        <Reanimated.View
          pointerEvents="none"
          style={[styles.bigWordOverlay, bigWordStyle]}
        >
          <Text style={styles.bigWordText}>{bigWordLabel}</Text>
        </Reanimated.View>
      )}
    </>
  );
}

export const SubmitFeedbackLayer = React.memo(
  forwardRef<SubmitFeedbackLayerHandle, SubmitFeedbackLayerProps>(SubmitFeedbackLayerImpl),
);

const styles = StyleSheet.create({
  chainPopup: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 32,
    zIndex: 200,
    elevation: 30,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 30,
    borderWidth: 2.5,
  },
  chainText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 34,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowRadius: 14,
  },
  neonPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowColor: COLORS.accent,
    zIndex: 190,
  },
  vhsGlitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,45,149,0.12)',
    zIndex: 185,
  },
  scorePopup: {
    position: 'absolute',
    top: '33%',
    alignSelf: 'center',
    zIndex: 250,
    paddingHorizontal: 34,
    paddingVertical: 16,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 45, 149, 0.95)',
    elevation: 30,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  scorePopupText: {
    fontFamily: FONTS.display,
    color: '#fff',
    fontSize: 28,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowRadius: 12,
  },
  scorePopupCombo: {
    fontSize: 32,
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowRadius: 20,
  },
  scorePopupMedium: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    shadowRadius: 34,
  },
  scorePopupBig: {
    paddingHorizontal: 46,
    paddingVertical: 24,
    borderRadius: 34,
    shadowRadius: 42,
    shadowOpacity: 1,
    borderWidth: 3,
  },
  scorePopupTextBig: {
    fontSize: 40,
    letterSpacing: 5,
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowRadius: 24,
  },
  bigWordOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 260,
    paddingHorizontal: 50,
    paddingVertical: 22,
    borderRadius: 36,
    backgroundColor: 'rgba(20, 6, 42, 0.92)',
    borderWidth: 3,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 36,
  },
  bigWordText: {
    fontFamily: FONTS.display,
    color: COLORS.gold,
    fontSize: 44,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.9)',
    textShadowRadius: 22,
  },
});
