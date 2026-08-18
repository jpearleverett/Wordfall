import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { getRemoteBoolean } from '../services/remoteConfig';
import { OwlIcon } from './icons/iconsMisc';
import { FlameIcon } from './icons/iconsCore';

interface GameplayMascotProps {
  /** Monotonic counter — bumps every time a word is found. Drives the bounce. */
  foundCount: number;
  /** Mirrors GameScreen's last-word tension. Drives the wide-eyed state. */
  tensionActive: boolean;
  /** Player's current flawless streak. Shows the flame overlay when > 0. */
  flawlessStreak: number;
}

/**
 * Tiny absolute-positioned mascot that reacts to gameplay events. Renders
 * the bespoke OwlIcon SVG (gold-tinted under last-word tension) so it can
 * ship and be tuned before dedicated art arrives. Swap the icon for
 * <Image source={sprite} /> when a real sprite is available.
 *
 * Mounted absolutely so it never displaces the grid layout. RC-gated via
 * `gameplayMascotEnabled` (default OFF). Reduce-motion-aware: animations
 * collapse to a static render.
 */
const GameplayMascot: React.FC<GameplayMascotProps> = ({
  foundCount,
  tensionActive,
  flawlessStreak,
}) => {
  const enabled = getRemoteBoolean('gameplayMascotEnabled');
  const reduceMotion = useReduceMotion();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const idleBreath = useSharedValue(1);

  // Idle breathing loop — slow scale 1.0 ↔ 1.04, disabled under reduce-motion.
  useEffect(() => {
    if (reduceMotion || !enabled) {
      idleBreath.value = 1;
      return;
    }
    idleBreath.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, enabled]);

  // Word-found bounce — fires on every `foundCount` change (monotonic so
  // increases cleanly; no extra dep needed).
  useEffect(() => {
    if (foundCount === 0 || reduceMotion || !enabled) return;
    scale.value = withSequence(
      withSpring(1.25, { damping: 5, stiffness: 260 }),
      withSpring(1, { damping: 8, stiffness: 180 }),
    );
    rotation.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 120 }),
      withTiming(0, { duration: 120 }),
    );
  }, [foundCount, reduceMotion, enabled]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * idleBreath.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (!enabled) return null;

  // Expression logic — tension retints the owl gold; flame overlay when
  // streak > 0.
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.bubble, animStyle]}>
        <OwlIcon size={25} accent={tensionActive ? COLORS.gold : undefined} />
        {flawlessStreak > 0 && (
          <View style={styles.streakOverlay}>
            <FlameIcon size={16} />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Absolute-positioned above the booster shelf on the right side so the
  // mascot doesn't displace any existing layout and doesn't overlap the
  // HUD action buttons at the top. Tune once a real sprite arrives.
  container: {
    position: 'absolute',
    bottom: 180,
    right: 10,
    zIndex: 20,
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 10, 46, 0.85)',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  streakOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
  },
});

export default React.memo(GameplayMascot);
