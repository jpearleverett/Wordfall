import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../constants';

/**
 * GameFlashes — collects every full-screen overlay that flashes in response
 * to gameplay events (chain celebration, neon pulse, VHS glitch, valid/invalid
 * word flash, score popup, big-word label).
 *
 * All Animated.Value instances are owned by GameScreen (stored in stable
 * refs via useRef) and passed in as props. Because `Animated.Value` is a
 * mutable object held by reference, the memo comparison succeeds on
 * subsequent renders — the parent never recreates the value.
 *
 * WHY THIS IS EXTRACTED: GameScreen's body re-runs on every SELECT_CELL
 * dispatch (state ref changes). Before this extraction, React still had to
 * build and diff this entire 7-overlay JSX subtree on every re-run, even
 * though none of these overlays depend on the selection. Now the memo
 * comparison hits with stable props and React bails out instantly.
 */
interface GameFlashesProps {
  /** Whether the chain celebration popup is currently visible. */
  chainVisible: boolean;
  /** Current combo count (drives text size/color escalation). */
  combo: number;
  /** Whether the green "valid word" full-screen flash is active. */
  showValidFlash: boolean;
  /** Whether the red "invalid word" full-screen flash is active. */
  showInvalidFlash: boolean;
  /** Current score popup content, or null if no popup is visible. */
  scorePopup: { points: number; label: string } | null;
  /**
   * Length of the last submitted word. Drives popup scale — 7+ letter
   * words use a dramatically bigger popup than a 3-letter word.
   */
  lastSubmittedWordLen: number;
  /** Big-word celebration label text (7+ letter words), or null. */
  bigWordLabel: string | null;

  // ── Animated.Value drivers (ref-backed, stable references) ──
  chainAnim: Animated.Value;
  validFlashAnim: Animated.Value;
  invalidFlashAnim: Animated.Value;
  scorePopupAnim: Animated.Value;
  bigWordAnim: Animated.Value;
}

function GameFlashesImpl({
  chainVisible,
  combo,
  showValidFlash,
  showInvalidFlash,
  scorePopup,
  lastSubmittedWordLen,
  bigWordLabel,
  chainAnim,
  validFlashAnim,
  invalidFlashAnim,
  scorePopupAnim,
  bigWordAnim,
}: GameFlashesProps) {
  // Escalating chain target scale. Derived from combo so it recomputes only
  // when combo actually changes (which ties into memoization hits).
  const chainTargetScale = combo >= 6 ? 1.5 : combo >= 4 ? 1.2 : 1;
  const chainScale = chainAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, chainTargetScale],
  });

  const chainBgColor =
    combo >= 6
      ? 'rgba(168, 85, 247, 0.95)'
      : combo >= 4
      ? 'rgba(255, 215, 0, 0.95)'
      : 'rgba(255, 45, 149, 0.95)';

  const chainShadowColor =
    combo >= 6 ? COLORS.purple : combo >= 4 ? COLORS.gold : COLORS.accent;

  const chainBorderColor =
    combo >= 6
      ? 'rgba(200, 140, 255, 0.5)'
      : combo >= 4
      ? 'rgba(255, 230, 100, 0.5)'
      : 'rgba(255,255,255,0.3)';

  const validFlashOpacity = validFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const invalidFlashOpacity = invalidFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.25],
  });

  return (
    <>
      {/* Chain celebration popup */}
      {chainVisible && (
        <Animated.View
          style={[
            styles.chainPopup,
            {
              backgroundColor: chainBgColor,
              shadowColor: chainShadowColor,
              borderColor: chainBorderColor,
              opacity: chainAnim,
              transform: [{ scale: chainScale }],
            },
          ]}
        >
          <Text
            style={[
              styles.chainText,
              combo >= 6 && { fontSize: 40, letterSpacing: 6 },
              combo >= 4 && combo < 6 && { fontSize: 36, letterSpacing: 5.5 },
            ]}
          >
            {combo}x CHAIN!
          </Text>
        </Animated.View>
      )}

      {/* Chain combo neon pulse overlay — escalates with combo count */}
      {chainVisible && combo >= 3 && (
        <Animated.View
          style={[
            styles.neonPulseOverlay,
            {
              borderColor: combo >= 4 ? COLORS.cyan : COLORS.accent,
              opacity: chainAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.6, 0],
              }),
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* VHS glitch overlay for 4x+ chains */}
      {chainVisible && combo >= 4 && (
        <Animated.View
          style={[
            styles.vhsGlitchOverlay,
            {
              opacity: chainAnim.interpolate({
                inputRange: [0, 0.3, 0.5, 0.7, 1],
                outputRange: [0, 0.12, 0, 0.08, 0],
              }),
              transform: [
                {
                  translateX: chainAnim.interpolate({
                    inputRange: [0, 0.2, 0.25, 0.45, 0.5, 1],
                    outputRange: [0, 4, -3, 2, -1, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Valid word green flash overlay */}
      {showValidFlash && (
        <Animated.View
          style={[styles.validFlashOverlay, { opacity: validFlashOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Invalid word red flash overlay */}
      {showInvalidFlash && (
        <Animated.View
          style={[styles.invalidFlashOverlay, { opacity: invalidFlashOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Score popup with word-length scaling */}
      {scorePopup && (() => {
        const wordLen = lastSubmittedWordLen;
        const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.0;
        return (
          <Animated.View
            style={[
              styles.scorePopup,
              wordLen >= 7 && styles.scorePopupBig,
              wordLen >= 5 && wordLen < 7 && styles.scorePopupMedium,
              {
                opacity: scorePopupAnim.interpolate({
                  inputRange: [0, 0.5, 1, 1.8, 2],
                  outputRange: [0, 1, 1, 1, 0],
                }),
                transform: [
                  {
                    translateY: scorePopupAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [20, 0, -40],
                    }),
                  },
                  {
                    scale: scorePopupAnim.interpolate({
                      inputRange: [0, 0.3, 1, 2],
                      outputRange: [
                        0.5 * popupScale,
                        1.2 * popupScale,
                        popupScale,
                        0.8 * popupScale,
                      ],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.scorePopupText,
                combo > 1 && styles.scorePopupCombo,
                wordLen >= 7 && styles.scorePopupTextBig,
              ]}
            >
              {scorePopup.label}
            </Text>
          </Animated.View>
        );
      })()}

      {/* Big word celebration label overlay */}
      {bigWordLabel && (
        <Animated.View
          style={[
            styles.bigWordOverlay,
            {
              opacity: bigWordAnim.interpolate({
                inputRange: [0, 0.3, 0.8, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  scale: bigWordAnim.interpolate({
                    inputRange: [0, 0.2, 0.5, 1],
                    outputRange: [0.3, 1.3, 1.0, 0.8],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.bigWordText}>{bigWordLabel}</Text>
        </Animated.View>
      )}
    </>
  );
}

export const GameFlashes = React.memo(GameFlashesImpl);

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
    backgroundColor: 'rgba(255, 45, 149, 0.95)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 30,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
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
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 0,
    zIndex: 190,
  },
  vhsGlitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,45,149,0.12)',
    zIndex: 185,
  },
  validFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.green,
    zIndex: 50,
  },
  invalidFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.coral,
    zIndex: 50,
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
