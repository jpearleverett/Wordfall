import React from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../../constants';

/**
 * GameFlashes — the valid/invalid word full-screen flashes, extracted so
 * that GameScreen's body re-run on SELECT_CELL doesn't have to rebuild
 * the overlay JSX.
 *
 * All overlays now use Reanimated shared values (UI-thread) rather than
 * legacy `Animated.Value`. Chain celebration / score popup / big-word
 * label / neon-pulse / VHS-glitch overlays live in SubmitFeedbackLayer.
 */
interface GameFlashesProps {
  showValidFlash: boolean;
  showInvalidFlash: boolean;
  validFlashAnim: SharedValue<number>;
  invalidFlashAnim: SharedValue<number>;
}

function GameFlashesImpl({
  showValidFlash,
  showInvalidFlash,
  validFlashAnim,
  invalidFlashAnim,
}: GameFlashesProps) {
  const validFlashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(validFlashAnim.value, [0, 1], [0, 0.3]),
  }));

  const invalidFlashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(invalidFlashAnim.value, [0, 1], [0, 0.25]),
  }));

  return (
    <>
      {showValidFlash && (
        <Reanimated.View
          style={[styles.validFlashOverlay, validFlashStyle]}
          pointerEvents="none"
        />
      )}

      {showInvalidFlash && (
        <Reanimated.View
          style={[styles.invalidFlashOverlay, invalidFlashStyle]}
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
