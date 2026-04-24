import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, interpolate, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, MODE_CONFIGS } from '../constants';
import { GameMode } from '../types';
import { LOCAL_IMAGES } from '../utils/localAssets';
import { getChapterForLevel } from '../data/chapters';
import { getRemoteBoolean } from '../services/remoteConfig';
import { useRoundedFontReady } from '../services/fontReady';

/**
 * Floating "+N" callout that rises from the score on every word-found.
 * Mounted with a fresh `key` per delta so each pop is its own animation
 * instance. The parent schedules the unmount after the animation duration;
 * no Reanimated-to-JS worklet callback needed.
 */
const SCORE_POP_DURATION_MS = 660;
const ScorePop: React.FC<{ amount: number; color: string }> = ({ amount, color }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 360 }),
      withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
    );
    translateY.value = withTiming(-36, { duration: SCORE_POP_DURATION_MS, easing: Easing.out(Easing.quad) });
    // fire-once on mount — new amounts arrive with a fresh key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.Text style={[scorePopStyles.text, style, { color, textShadowColor: color }]}>
      +{amount}
    </Animated.Text>
  );
};

interface GameHeaderProps {
  level: number;
  score: number;
  moves: number;
  hintsLeft: number;
  /** Live count of hints used this run; feeds the 3-pip star projection. */
  hintsUsed?: number;
  /** Current flawless streak count (cross-session). Renders a `🔥 N` chip when > 0. */
  flawlessStreak?: number;
  undosLeft: number;
  foundWords: number;
  totalWords: number;
  isDaily?: boolean;
  mode?: GameMode;
  maxMoves?: number;
  timeRemaining?: number;
  themeColors?: {
    bg: string;
    surface: string;
    accent: string;
    cellSelected: string;
  };
  onHint: () => void;
  onUndo: () => void;
  onBack: () => void;
}

export const GameHeader = React.memo(function GameHeader({
  level,
  score,
  moves,
  hintsLeft,
  hintsUsed = 0,
  flawlessStreak = 0,
  undosLeft,
  foundWords,
  totalWords,
  isDaily,
  mode = 'classic',
  maxMoves = 0,
  timeRemaining = 0,
  themeColors,
  onHint,
  onUndo,
  onBack,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const modeConfig = MODE_CONFIGS[mode];
  const accentColor = themeColors?.accent ?? COLORS.accent;
  const surfaceColor = themeColors?.surface ?? '#1a0a2e';
  const bgColor = themeColors?.bg ?? '#0a0015';
  const selectedColor = themeColors?.cellSelected ?? accentColor;
  // Classic mode: fold the chapter name into the level pill when RC permits,
  // so players see "NEON NIGHTS · L33" instead of a bare level number. Daily
  // and specialty modes keep their own labels — they don't map to chapters.
  const classicLabel = (() => {
    if (!getRemoteBoolean('gameScreenChapterInlineEnabled')) return `Lv ${level}`;
    const chapter = getChapterForLevel(level);
    if (!chapter) return `Lv ${level}`;
    const short = chapter.name.length > 12 ? chapter.name.slice(0, 11) + '…' : chapter.name;
    return `${short.toUpperCase()} · L${level}`;
  })();
  const modeLabel = isDaily ? 'Daily' : mode !== 'classic' ? modeConfig.name : classicLabel;
  const progress = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;
  const scoreScale = useSharedValue(1);
  const progressValue = useSharedValue(0);

  // Live star projection — mirrors the post-win rules in useGame.ts so the
  // pips the player sees during play match the stars they'll actually earn
  // if they win right now. 3 ⇒ flawless (no hints, no wasted moves); 2 ⇒
  // near-flawless (≤1 hint, ≤1 wasted move); 1 ⇒ a win counts for something.
  const projectedStars =
    hintsUsed === 0 && moves <= totalWords
      ? 3
      : hintsUsed <= 1 && moves <= totalWords + 1
        ? 2
        : 1;
  const showStarsPips = getRemoteBoolean('liveStarsPipsEnabled');
  const showFlawlessChip = getRemoteBoolean('flawlessStreakHudChipEnabled') && flawlessStreak > 0;
  const roundedReady = useRoundedFontReady();
  const useRoundedFont = getRemoteBoolean('roundedDisplayFontEnabled') && roundedReady;
  const labelFontOverride = useRoundedFont ? { fontFamily: FONTS.displayRounded } : null;
  const flawlessScale = useSharedValue(1);
  useEffect(() => {
    if (flawlessStreak > 0) {
      flawlessScale.value = withSequence(
        withTiming(1.15, { duration: 120 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [flawlessStreak]);
  const flawlessStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flawlessScale.value }],
  }));

  // Hero score: track previous to compute the +delta callout, and pop the
  // score itself on every change. One callout slot — rapid finds replace.
  const prevScoreRef = useRef(score);
  const popKeyRef = useRef(0);
  const [pop, setPop] = useState<{ amount: number; key: number } | null>(null);
  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta <= 0) return;
    scoreScale.value = withSequence(
      withTiming(1.18, { duration: 90 }),
      withSpring(1, { damping: 7, stiffness: 220 }),
    );
    popKeyRef.current += 1;
    const key = popKeyRef.current;
    setPop({ amount: delta, key });
    const timeout = setTimeout(() => {
      // only clear if this pop is still the latest
      setPop((p) => (p && p.key === key ? null : p));
    }, SCORE_POP_DURATION_MS + 80);
    return () => clearTimeout(timeout);
  }, [score]);

  // Animate progress bar smoothly — Reanimated handles layout props on UI thread
  useEffect(() => {
    progressValue.value = withSpring(progress, { damping: 16, stiffness: 60 });
  }, [progress]);

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressValue.value, [0, 100], [0, 100])}%`,
  }));

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, 6) + 4 }]}>
      <View style={styles.chromeCard}>
        <LinearGradient
          colors={[surfaceColor, bgColor] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
        />
        {/* Glass top edge highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent'] as [string, string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassEdge}
        />
        {/* Mode-colored ambient glow */}
        <View style={[styles.chromeGlow, { backgroundColor: `${modeConfig.color}20` }]} />

        <View style={styles.topRow}>
          {/* Back button with glass effect */}
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityHint="Return to the home screen"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as [string, string]}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
            />
            <Image source={LOCAL_IMAGES.iconBack} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </Pressable>

          {/* Center: chapter title only. Stars + flawless chip moved into
              the score hero so they're centered on the same axis as the
              big score number (not biased to the left between back and
              action buttons). */}
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
              <Text style={[styles.titleText, labelFontOverride]} numberOfLines={1}>
                {modeLabel}
              </Text>
              {showFlawlessChip && (
                <Animated.View style={[styles.flawlessChip, flawlessStyle]}>
                  <Text style={styles.flawlessChipText}>🔥 {flawlessStreak}</Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            {modeConfig.rules.allowUndo && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  undosLeft <= 0 && styles.actionDisabled,
                  pressed && styles.btnPressed,
                ]}
                onPress={onUndo}
                disabled={undosLeft <= 0}
                accessibilityLabel="Undo last move"
                accessibilityHint={undosLeft > 0 ? `${undosLeft} undos remaining` : 'No undos remaining'}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                <Image source={LOCAL_IMAGES.iconUndo} style={{ width: 18, height: 18 }} resizeMode="contain" />
                {undosLeft > 0 && !modeConfig.rules.unlimitedUndo && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{undosLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}

            {modeConfig.rules.allowHints && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.hintButton,
                  hintsLeft <= 0 && styles.actionDisabled,
                  pressed && styles.btnPressed,
                  { borderColor: `${selectedColor}45` },
                ]}
                onPress={onHint}
                disabled={hintsLeft <= 0}
                accessibilityLabel="Use hint"
                accessibilityHint="Reveals the next word to find"
              >
                <LinearGradient
                  colors={[`${selectedColor}33`, `${selectedColor}14`] as [string, string]}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 13 }]}
                />
                {/* Glow beam from bulb */}
                {hintsLeft > 0 && (
                  <View style={[styles.hintGlow, { backgroundColor: `${selectedColor}44` }]} />
                )}
                <Image source={LOCAL_IMAGES.iconHint} style={{ width: 22, height: 22 }} resizeMode="contain" />
                {hintsLeft > 0 && (
                  <View style={[styles.countBadge, styles.hintCountBadge]}>
                    <Text style={styles.countBadgeText}>{hintsLeft}</Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Hero score row — big, centered, with +N float-up callout. Stars
            pips now live up here so they share the score's horizontal
            center, not the title block's. */}
        <View style={styles.scoreHero} accessibilityLabel={`Current score: ${score}`}>
          {showStarsPips && (
            <View style={styles.pipsRow} accessibilityLabel={`Projected ${projectedStars} of 3 stars`}>
              {[0, 1, 2].map(i => (
                <Text key={i} style={[styles.pip, i < projectedStars ? styles.pipOn : styles.pipOff]}>★</Text>
              ))}
            </View>
          )}
          <Animated.Text
            style={[
              styles.scoreHeroValue,
              scoreStyle,
              { color: accentColor, textShadowColor: `${accentColor}AA` },
            ]}
          >
            {score.toLocaleString()}
          </Animated.Text>
          <View pointerEvents="none" style={styles.scorePopSlot}>
            {pop && (
              <ScorePop key={pop.key} amount={pop.amount} color={accentColor} />
            )}
          </View>
          <Text style={styles.scoreHeroLabel}>
            {foundWords}/{totalWords} WORDS
          </Text>
        </View>

        {/* Animated progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle, { backgroundColor: selectedColor }]}>
            {/* Shimmer on progress fill */}
            <View style={styles.progressShimmer} />
          </Animated.View>
          {/* Glow dot at progress tip — hidden when no progress */}
          {progress > 0 && (
            <Animated.View
              style={[
                styles.progressGlowDot,
                {
                  left: `${progress}%` as any,
                  backgroundColor: selectedColor,
                  shadowColor: selectedColor,
                },
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 2,
  },
  chromeCard: {
    borderRadius: 20,
    // Border removed entirely — the gradient fill + glass top edge carry
    // the frame without a third "window outline" fighting the grid's
    // neon frame and the chip band's implicit boundary. Screen now reads
    // as one vertical flow instead of three stacked panels.
    borderWidth: 0,
    paddingHorizontal: 12,
    // Tighter vertical padding so the HUD is slimmer and the grid
    // reclaims the saved height via its flex:1 gridArea.
    paddingTop: 6,
    paddingBottom: 2,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  chromeGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -55,
    top: -70,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  titleText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  pipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 1,
  },
  pip: {
    fontSize: 15,
    lineHeight: 16,
  },
  pipOn: {
    color: COLORS.gold,
    textShadowColor: COLORS.gold,
    textShadowRadius: 8,
  },
  // Solid dim-gold instead of barely-visible white @ 20% — gives players a
  // clear "here's the ceiling, you've lost 2 of it" read rather than a
  // blank gap next to the one filled star.
  pipOff: {
    color: 'rgba(255, 184, 0, 0.30)',
  },
  flawlessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,120,30,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,160,60,0.4)',
  },
  flawlessChipText: {
    fontSize: 10,
    color: '#ffd59a',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  modeIcon: {
    fontSize: 14,
  },
  scoreHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
    position: 'relative',
  },
  scoreHeroValue: {
    color: COLORS.accent,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
    letterSpacing: 1,
  },
  scoreHeroLabel: {
    marginTop: 0,
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.6,
  },
  scorePopSlot: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 77, 255, 0.30)',
    overflow: 'visible',
    backgroundColor: 'rgba(26, 10, 46, 0.7)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  hintButton: {
    borderColor: 'rgba(255, 184, 0, 0.40)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  hintGlow: {
    position: 'absolute',
    top: -8,
    left: '20%' as unknown as number,
    right: '20%' as unknown as number,
    height: 16,
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderRadius: 8,
  },
  actionDisabled: {
    opacity: 0.3,
  },
  actionIcon: {
    fontSize: 16,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },
  hintCountBadge: {
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
  },
  countBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'visible',
    marginTop: 6,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
  },
  progressGlowDot: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
});

const scorePopStyles = StyleSheet.create({
  text: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
    letterSpacing: 0.5,
  },
});
