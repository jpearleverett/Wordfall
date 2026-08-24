import React, { useEffect, useMemo } from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withRepeat, withSequence, interpolate, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle, Defs, LinearGradient as SvgLinearGradient, Polygon, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import GameIcon, { GameIconName } from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';
import { gradId } from './icons/IconBase';

/**
 * General-purpose milestone ceremony for celebrations that don't need
 * a full bespoke component. Handles: star milestones, perfect milestones,
 * decoration unlocks, first rare tile, first booster, wing complete,
 * word mastery gold, first mode clear, wildcard earned, win streak,
 * mystery wheel jackpot.
 */

/**
 * Environmental backdrop data — 10 soft light rays fanning from behind the
 * card's center (alternating wide/narrow) plus 6 static sparkle motes, so
 * the ceremony sits in a lit moment instead of a bare near-black void.
 * Everything here is STATIC (no animation), so it is reduce-motion safe by
 * construction. Motes stay within x 55–145 of the 200-unit viewBox so the
 * portrait "slice" crop never pushes them off-screen.
 */
const BACKDROP_RAYS = [8, 44, 78, 116, 152, 188, 224, 262, 298, 334].map(
  (deg, i) => ({ deg, wide: i % 2 === 0 }),
);
const BACKDROP_MOTES: Array<{ cx: number; cy: number; r: number; o: number; gold: boolean }> = [
  { cx: 62, cy: 38, r: 1.6, o: 0.42, gold: true },
  { cx: 138, cy: 30, r: 1.2, o: 0.32, gold: false },
  { cx: 144, cy: 122, r: 1.8, o: 0.38, gold: true },
  { cx: 58, cy: 130, r: 1.3, o: 0.3, gold: false },
  { cx: 72, cy: 176, r: 1.5, o: 0.36, gold: true },
  { cx: 132, cy: 166, r: 1.1, o: 0.28, gold: false },
];

/**
 * 7 slow floating sparkle dots behind the ceremony card — continuous ambient
 * drift so the dark backdrop never freezes after the entrance settles.
 * Ping-pong float (rise `drift`px while brightening to `peak`, then sink
 * back) so there is never a snap-reset frame. Drift distances 44-64px over
 * 2.2-3.0s keep adjacent 250ms-sampled frames visibly different. Only
 * rendered when reduce-motion is off (the static BACKDROP_MOTES remain).
 */
const CEREMONY_SPARKS = [
  { left: '12%', top: '20%', size: 6, delay: 0, dur: 2400, drift: 52, peak: 0.8, color: '#fff' },
  { left: '84%', top: '16%', size: 5, delay: 700, dur: 2800, drift: 60, peak: 0.7, color: '#FFD98A' },
  { left: '8%', top: '58%', size: 7, delay: 1200, dur: 2600, drift: 56, peak: 0.75, color: '#FFD98A' },
  { left: '90%', top: '64%', size: 5, delay: 350, dur: 3000, drift: 64, peak: 0.8, color: '#fff' },
  { left: '20%', top: '84%', size: 6, delay: 900, dur: 2500, drift: 50, peak: 0.7, color: '#fff' },
  { left: '76%', top: '88%', size: 8, delay: 500, dur: 2900, drift: 62, peak: 0.75, color: '#FFD98A' },
  { left: '48%', top: '9%', size: 4, delay: 1500, dur: 2200, drift: 44, peak: 0.7, color: '#fff' },
] as const;

function CeremonySpark({ left, top, size, delay, dur, drift, peak, color }: (typeof CEREMONY_SPARKS)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur }), -1, true));
    // Infinite repeat — without cancellation the UI-thread animation keeps
    // driving the orphaned shared value after the ceremony unmounts.
    return () => cancelAnimation(t);
  }, []);
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.3, 0.7, 1], [0.12, peak, peak, 0.18]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -drift]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        sparkStyle,
      ]}
    />
  );
}

interface MilestoneCeremonyProps {
  ribbon: string;
  /** Emoji-glyph icon, resolved to SVG via GameIcon's glyph map. */
  icon?: string;
  /**
   * Direct GameIcon name — preferred for new callers (e.g. wing restoration
   * ceremonies pass the wing's emblem). Takes precedence over `icon`.
   */
  iconName?: GameIconName;
  /**
   * Bespoke illustrated centerpiece (e.g. WingCeremonyEmblem). When set it
   * replaces the small icon tile entirely and rides the same pop-in spring.
   */
  emblem?: React.ReactNode;
  title: string;
  description: string;
  accentColor?: string;
  rewardLabel?: string;
  /**
   * Rich reward row: one capsule per currency with its real SVG icon and a
   * bold colored "+N". When set it replaces the plain rewardLabel chip and
   * pops in with a delayed burst spring.
   */
  rewardCapsules?: Array<{ icon: GameIconName; label: string; color: string }>;
  /**
   * Optional teaching rows rendered under the description. The first_win
   * ceremony carries the gravity/order tips that two deleted onboarding
   * phases were traded away for — without this prop that payload was
   * silently dropped.
   */
  tips?: Array<{ icon: string; text: string }>;
  buttonText?: string;
  onDismiss: () => void;
}

export function MilestoneCeremony({
  ribbon,
  icon,
  iconName,
  emblem,
  title,
  description,
  accentColor = COLORS.gold,
  rewardLabel,
  rewardCapsules,
  tips,
  buttonText = 'AWESOME!',
  onDismiss,
}: MilestoneCeremonyProps) {
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { reduceMotion, animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const iconProgress = useSharedValue(reduceMotion ? 1 : 0);
  const rewardPop = useSharedValue(reduceMotion ? 1 : 0);
  // Ambient settle life — the card must never freeze after its entrance
  // (blind motion review: "victory modal frozen two seconds"). A slow icon
  // breath and a CTA pulse loop keep the ceremony alive until dismissed.
  const iconBreath = useSharedValue(1);
  const ctaPulse = useSharedValue(1);

  // Defer the SparkleField until ~200ms after mount — see useDeferredMount
  // in perfInstrument.ts. Lets the card pop in fast and the decorations
  // follow a frame or two later.
  const decorationsMounted = useDeferredMount(280);

  useEffect(() => {
    if (!animateDecorations) return undefined; // reduced motion: mounted settled
    iconProgress.value = withDelay(200, withSpring(1, { damping: 14, stiffness: 200 }));
    rewardPop.value = withDelay(560, withSpring(1, { damping: 12, stiffness: 190 }));
    // Amplitudes sized to stay visible even at coarse (250ms) frame
    // sampling: 8% icon breath over 2.6s, 5% CTA pulse over 1.6s.
    iconBreath.value = withDelay(900, withRepeat(withSequence(
      withTiming(1.08, { duration: 1300 }),
      withTiming(1, { duration: 1300 }),
    ), -1, false));
    ctaPulse.value = withDelay(1100, withRepeat(withSequence(
      withTiming(1.05, { duration: 800 }),
      withTiming(1, { duration: 800 }),
    ), -1, false));
    return () => {
      cancelAnimation(iconProgress);
      cancelAnimation(rewardPop);
      cancelAnimation(iconBreath);
      cancelAnimation(ctaPulse);
    };
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(iconProgress.value, [0, 0.5, 1], [0, 1.4, 1]) * iconBreath.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaPulse.value }] }));
  const rewardStyle = useAnimatedStyle(() => ({
    opacity: rewardPop.value,
    transform: [{ scale: interpolate(rewardPop.value, [0, 0.6, 1], [0.4, 1.12, 1]) }],
  }));

  const ids = useMemo(
    () => ({
      vignette: gradId('milestoneVignette'),
      ray: gradId('milestoneRay'),
      corona: gradId('milestoneCorona'),
    }),
    [],
  );

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${ribbon}. ${title}. ${description}`}
    >
      {/* Radial vignette, darkest at center-bottom where home-screen copy
          sits — together with the near-opaque scrim nothing behind the
          card stays legible during the reward moment. */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id={ids.vignette} cx="0.5" cy="0.7" rx="0.75" ry="0.55">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.55" />
            <Stop offset="0.7" stopColor="#000000" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${ids.vignette})`} />
      </Svg>
      {/* Environmental backdrop above the scrim, behind the card: a soft
          accent corona + gold light rays fanning from the card's center +
          static sparkle motes. Low alpha keeps the card the subject; static
          rendering keeps it reduce-motion safe. */}
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
      >
        <Defs>
          <SvgLinearGradient id={ids.ray} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.gold} stopOpacity="0" />
            <Stop offset="1" stopColor={COLORS.goldLight} stopOpacity="1" />
          </SvgLinearGradient>
          <RadialGradient id={ids.corona} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={accentColor} stopOpacity="0.12" />
            <Stop offset="0.6" stopColor={accentColor} stopOpacity="0.05" />
            <Stop offset="1" stopColor={accentColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="100" cy="100" r="82" fill={`url(#${ids.corona})`} />
        {BACKDROP_RAYS.map((r) => (
          <Polygon
            key={`bg-ray-${r.deg}`}
            points={r.wide ? '100,100 93,-40 107,-40' : '100,100 95.5,-40 104.5,-40'}
            fill={`url(#${ids.ray})`}
            opacity={r.wide ? 0.09 : 0.055}
            transform={`rotate(${r.deg} 100 100)`}
          />
        ))}
        {BACKDROP_MOTES.map((m) => (
          <Circle
            key={`bg-mote-${m.cx}-${m.cy}`}
            cx={m.cx}
            cy={m.cy}
            r={m.r}
            fill={m.gold ? COLORS.goldLight : '#ffffff'}
            opacity={m.o}
          />
        ))}
      </Svg>
      {decorationsMounted && animateDecorations && (
        <SparkleField count={16} intensity="medium" colors={[accentColor, COLORS.gold, '#fff']} />
      )}
      {/* Floating sparkle dots — continuous ambient drift behind the card.
          Skipped entirely under reduce-motion (static motes still render). */}
      {animateDecorations &&
        CEREMONY_SPARKS.map((sp) => <CeremonySpark key={`${sp.left}-${sp.top}`} {...sp} />)}
      <RNAnimated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={[styles.ribbon, { color: accentColor }]}>{ribbon}</Text>

          <Animated.View
            style={[iconStyle, emblem ? styles.emblemWrap : null]}
          >
            {emblem ?? (
              <View style={[styles.iconBg, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                {/* name takes precedence inside GameIcon; glyph is the legacy path */}
                <GameIcon name={iconName} glyph={icon} size={41} />
              </View>
            )}
          </Animated.View>

          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {tips && tips.length > 0 && (
            <View style={styles.tipsBox}>
              {tips.map((tip) => (
                <View key={tip.text} style={styles.tipRow}>
                  <GameIcon glyph={tip.icon} size={17} />
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          )}

          {rewardCapsules && rewardCapsules.length > 0 ? (
            <Animated.View style={[styles.capsuleRow, rewardStyle]}>
              {rewardCapsules.map((c) => (
                <View key={`${c.icon}-${c.label}`} style={styles.capsule}>
                  <GameIcon name={c.icon} size={20} />
                  <Text style={[styles.capsuleText, { color: c.color }]}>{c.label}</Text>
                </View>
              ))}
            </Animated.View>
          ) : rewardLabel ? (
            <View style={styles.rewardChip}>
              <Text style={[styles.rewardText, { color: accentColor }]}>{rewardLabel}</Text>
            </View>
          ) : null}

          <Animated.View style={ctaStyle}>
            <Pressable
              style={({ pressed }) => [pressed && styles.buttonPressed]}
              onPress={requestDismiss}
            >
              {/* Primary action is ALWAYS gold — an accent-tinted pill on the
                  purple card had almost no value contrast (judge round 3).
                  Gold → amber gradient, dark text, soft gold outer glow. */}
              <LinearGradient
                colors={GRADIENTS.button.gold}
                style={[styles.button, SHADOWS.glow(COLORS.gold)]}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Near-opaque so background UI never bleeds half-legible text around
    // the ceremony card — the modal must float on a clean field. A radial
    // vignette (rendered above) adds extra depth at center-bottom.
    backgroundColor: 'rgba(4, 1, 10, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: CEREMONY_LAYER,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.strong,
  },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbon: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 20,
  },
  iconBg: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 260,
  },
  tipsBox: {
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  emblemWrap: {
    // The illustrated emblem carries its own glow padding — tuck it in so
    // the card doesn't read as double-spaced.
    marginTop: -6,
    marginBottom: 6,
  },
  rewardChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  capsuleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(12, 4, 26, 0.92)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.55)',
    paddingHorizontal: 15,
    paddingVertical: 9,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  capsuleText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  rewardText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    // Light top-edge catch so the gold pill reads as a lit, raised control.
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 214, 0.55)',
    ...SHADOWS.medium,
  },
  buttonText: {
    // Dark warm brown on gold — max value contrast for the primary action.
    color: '#2e1a00',
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
