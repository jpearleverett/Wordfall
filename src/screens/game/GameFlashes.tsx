import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

/**
 * GameFlashes — the valid/invalid word full-screen flashes, extracted so
 * that GameScreen's body re-run on SELECT_CELL doesn't have to rebuild
 * the overlay JSX.
 *
 * As of the April 2026 perf pass, chain celebration / score popup /
 * big-word label / neon-pulse / VHS-glitch overlays were moved to their
 * own sibling (`SubmitFeedbackLayer`) which subscribes to the store
 * directly and uses Reanimated on the UI thread. Only the valid/invalid
 * flashes remain here; they still use legacy `Animated.Value` because
 * they're driven off setState changes (`showValidFlash`/`showInvalidFlash`)
 * in GameScreen rather than store state.
 */
interface GameFlashesProps {
  /** Whether the green "valid word" full-screen flash is active. */
  showValidFlash: boolean;
  /** Whether the red "invalid word" full-screen flash is active. */
  showInvalidFlash: boolean;
  // ── Animated.Value drivers (ref-backed, stable references) ──
  validFlashAnim: Animated.Value;
  invalidFlashAnim: Animated.Value;
}

function GameFlashesImpl({
  showValidFlash,
  showInvalidFlash,
  validFlashAnim,
  invalidFlashAnim,
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
      {showValidFlash && (
        <Animated.View
          style={[styles.validFlashOverlay, { opacity: validFlashOpacity }]}
          pointerEvents="none"
        />
      )}

      {showInvalidFlash && (
        <Animated.View
          style={[styles.invalidFlashOverlay, { opacity: invalidFlashOpacity }]}
          pointerEvents="none"
        />
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
});
