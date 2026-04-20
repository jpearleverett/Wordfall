import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS } from '../../constants';

/**
 * GameFlashes — collects every full-screen overlay that flashes in response
 * to gameplay events (valid/invalid word flash, score popup, big-word label).
 *
 * All Animated.Value instances are owned by GameScreen (stored in stable
 * refs via useRef) and passed in as props. Because `Animated.Value` is a
 * mutable object held by reference, the memo comparison succeeds on
 * subsequent renders — the parent never recreates the value.
 *
 * WHY THIS IS EXTRACTED: GameScreen's body re-runs on every SELECT_CELL
 * dispatch (state ref changes). Before this extraction, React still had to
 * build and diff this overlay JSX subtree on every re-run, even though none
 * of these overlays depend on the selection. Now the memo comparison hits
 * with stable props and React bails out instantly.
 */
interface GameFlashesProps {
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
  validFlashAnim: Animated.Value;
  invalidFlashAnim: Animated.Value;
  scorePopupAnim: Animated.Value;
  bigWordAnim: Animated.Value;
}

function GameFlashesImpl({
  showValidFlash,
  showInvalidFlash,
  scorePopup,
  lastSubmittedWordLen,
  bigWordLabel,
  validFlashAnim,
  invalidFlashAnim,
  scorePopupAnim,
  bigWordAnim,
}: GameFlashesProps) {
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
        const popupScale = wordLen >= 7 ? 1.6 : wordLen >= 5 ? 1.3 : 1.15;
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
