import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
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
  /**
   * Accent of the current chapter's Grand Library wing (see
   * src/data/library.ts getWing). Tints the bubble border/glow so Folio
   * visibly belongs to the hall being restored. Falls back to the default
   * accent when absent (daily / specialty modes).
   */
  wingAccent?: string;
}

/**
 * FOLIO, the owl archivist and Keeper of the Grand Library (canon lives in
 * src/data/library.ts) — a tiny absolute-positioned mascot that reacts to
 * gameplay events. Renders the bespoke OwlIcon SVG (gold-tinted under
 * last-word tension) so it can ship and be tuned before dedicated art
 * arrives. Swap the icon for <Image source={sprite} /> when a real Folio
 * sprite is available.
 *
 * Mounted absolutely (pointerEvents none) so it never displaces the grid
 * layout or intercepts taps. RC-gated via `gameplayMascotEnabled` (default
 * ON). Reduce-motion-aware: animations collapse to a static render.
 */
const GameplayMascot: React.FC<GameplayMascotProps> = ({
  foundCount,
  tensionActive,
  flawlessStreak,
  wingAccent,
}) => {
  const enabled = getRemoteBoolean('gameplayMascotEnabled');
  const reduceMotion = useReduceMotion();

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const idleBreath = useSharedValue(1);
  const idleBob = useSharedValue(0);
  const idleRock = useSharedValue(0);
  const blink = useSharedValue(0);

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

  // Idle life (round-3 blind review: gameplay frames "lifeless while idle").
  // Three composed loops, all transform/opacity only and all collapsed to
  // the static rest pose under reduce-motion:
  //  - bob: translateY ±5px, ~1.7s period (registers at 250ms sampling)
  //  - rock: rotate ±2.5°, ~2.4s period, added onto the word-found wiggle
  //  - blink: eyelid discs over OwlIcon's drawn eyes close for ~180ms
  //    every ~3.5s (opacity + scaleY 0 → 1 → 0)
  useEffect(() => {
    if (reduceMotion || !enabled) {
      idleBob.value = 0;
      idleRock.value = 0;
      blink.value = 0;
      return;
    }
    idleBob.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    idleRock.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(2.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    blink.value = withRepeat(
      withSequence(
        withDelay(3320, withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 90, easing: Easing.in(Easing.quad) }),
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
      { translateY: idleBob.value },
      { scale: scale.value * idleBreath.value },
      { rotate: `${rotation.value + idleRock.value}deg` },
    ],
  }));

  const eyelidStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
    transform: [{ scaleY: blink.value }],
  }));

  if (!enabled) return null;

  // Expression logic — tension retints the owl gold; flame overlay when
  // streak > 0. Wing accent (static style, no per-frame cost) tints the
  // bubble border + glow to the current Library wing.
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble,
          wingAccent ? { borderColor: wingAccent, shadowColor: wingAccent } : null,
          animStyle,
        ]}
      >
        <OwlIcon size={34} accent={tensionActive ? COLORS.gold : undefined} />
        {/* Blink eyelids — feather-toned discs positioned over OwlIcon's
            drawn eye circles (viewBox 24, icon 34px centered in the 54px
            bubble → eye centers ≈ (21.8, 25.2) / (32.2, 25.2)). Invisible
            at rest (opacity 0); the blink loop flashes them closed. */}
        <Animated.View
          style={[
            styles.eyelid,
            styles.eyelidLeft,
            tensionActive && styles.eyelidTension,
            eyelidStyle,
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.eyelid,
            styles.eyelidRight,
            tensionActive && styles.eyelidTension,
            eyelidStyle,
          ]}
          pointerEvents="none"
        />
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
  // Anchored in the quiet strip below the booster tray, clear of the board
  // and the tray. Two blind-review rounds read every position that touched
  // the board as "a stray sprite floating over tiles" — down here Folio
  // reads as a companion sitting at the table edge. Tune once a real sprite
  // arrives.
  container: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    zIndex: 20,
  },
  bubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
  // Blink eyelids — sized to cover the cream eye discs (r≈5px at 34px
  // icon scale) plus a sliver of outline. Default matches the owl's
  // feather accent (#c98b3f); tension retints gold with the icon.
  eyelid: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#c98b3f',
  },
  eyelidLeft: {
    left: 16.3,
    top: 19.7,
  },
  eyelidRight: {
    left: 26.7,
    top: 19.7,
  },
  eyelidTension: {
    backgroundColor: COLORS.gold,
  },
});

export default React.memo(GameplayMascot);
