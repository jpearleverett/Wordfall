import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';
import { COLORS } from '../../constants';
import { CelebrationBurst } from './ParticleSystem';

interface ComboFlashProps {
  /** Current combo. Flash fires on increments when >=3; confetti at >=5. */
  combo: number;
  /** Honor reduced-motion: still brief tint flash, no confetti. */
  reduceMotion?: boolean;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Full-screen tint pulse keyed on combo milestones.
 * - combo >= 3: subtle accent-tint flash (~320 ms)
 * - combo >= 5: stronger gold tint + one-shot confetti burst
 *
 * Non-blocking overlay: pointerEvents="none", absolutely-positioned above grid
 * but below UI chrome (consumer chooses z-order).
 */
export function ComboFlash({ combo, reduceMotion = false }: ComboFlashProps) {
  const tint = useRef(new Animated.Value(0)).current;
  const lastComboRef = useRef(0);
  const [showBurst, setShowBurst] = React.useState(false);

  useEffect(() => {
    const prev = lastComboRef.current;
    lastComboRef.current = combo;
    // Only fire on upward transitions crossing thresholds.
    if (combo < 3) return;
    if (combo <= prev) return;

    const isBig = combo >= 5;
    const peak = isBig ? 0.45 : 0.22;
    const up = reduceMotion ? 60 : 120;
    const hold = reduceMotion ? 80 : 80;
    const down = reduceMotion ? 80 : 240;

    Animated.sequence([
      Animated.timing(tint, { toValue: peak, duration: up, useNativeDriver: true }),
      Animated.delay(hold),
      Animated.timing(tint, { toValue: 0, duration: down, useNativeDriver: true }),
    ]).start();

    if (isBig && !reduceMotion) {
      setShowBurst(true);
      // Match CelebrationBurst's internal lifetime (~1600ms) then unmount.
      const t = setTimeout(() => setShowBurst(false), 1700);
      return () => clearTimeout(t);
    }
  }, [combo, reduceMotion, tint]);

  const tintColor = combo >= 5 ? COLORS.gold : COLORS.accent;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tint,
          { backgroundColor: tintColor, opacity: tint },
        ]}
      />
      {showBurst && (
        <CelebrationBurst
          centerX={SCREEN_W / 2}
          centerY={SCREEN_H / 2}
          particleCount={18}
          colors={[COLORS.gold, COLORS.accent, '#fff']}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
});
