import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, FONTS, GRADIENTS, LIBRARY, SHADOWS, STAR_MILESTONES } from '../constants';
import { GameMode } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { SparkleField, CelebrationBurst } from './effects/ParticleSystem';

interface PuzzleCompleteProps {
  score: number;
  moves: number;
  stars: number;
  combo: number;
  level: number;
  isDaily: boolean;
  mode?: GameMode;
  perfectRun?: boolean;
  isFirstWin?: boolean;
  leveledUp?: boolean;
  newLevel?: number;
  difficultyTransition?: { from: string; to: string } | null;
  nextLevelPreview?: { level: number; difficulty: string } | null;
  shareText?: string;
  friendComparison?: { beaten: number; total: number } | null;
  onNextLevel: () => void;
  onHome: () => void;
  onRetry: () => void;
  onShare?: () => void;
}

const CONFETTI_SHAPES = ['square', 'rect', 'circle'] as const;

function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  const shape = useMemo(() => CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)], []);
  const baseSize = useMemo(() => 7 + Math.random() * 14, []);
  const rotEnd = useMemo(() => `${320 + Math.random() * 260}deg`, []);
  const swayDur = useMemo(() => 380 + Math.random() * 260, []);
  const fallDur = useMemo(() => 2200 + Math.random() * 900, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: fallDur,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, {
              toValue: 1,
              duration: swayDur,
              useNativeDriver: true,
            }),
            Animated.timing(swayAnim, {
              toValue: -1,
              duration: swayDur,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    ]).start();
  }, [anim, delay, swayAnim, fallDur, swayDur]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 560] });
  const translateX = swayAnim.interpolate({ inputRange: [-1, 1], outputRange: [-22, 22] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', rotEnd] });
  const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] });

  const width = shape === 'rect' ? baseSize * 0.5 : baseSize;
  const height = shape === 'rect' ? baseSize * 1.4 : baseSize;
  const borderRadius = shape === 'circle' ? baseSize / 2 : shape === 'rect' ? 2 : 3;

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          left: startX,
          backgroundColor: color,
          width,
          height,
          borderRadius,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

function AnimatedScore({ targetScore }: { targetScore: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const progress = step / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(targetScore * easedProgress));
      if (step >= steps) {
        setDisplayScore(targetScore);
        clearInterval(interval);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [targetScore]);

  return <Text style={styles.scoreValue}>{displayScore.toLocaleString()}</Text>;
}

function Star({ filled, delay, size }: { filled: boolean; delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!filled) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [anim, delay, filled]);

  const glowSize = size + 24;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size + 28, height: size + 28 }}>
      {filled && (
        <View
          style={[
            styles.starGlowRing,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
            },
          ]}
        />
      )}
      <Animated.Text
        style={[
          styles.star,
          {
            fontSize: size,
            lineHeight: size,
            width: size + 28,
            height: size,
            textAlign: 'center',
            opacity: filled ? 1 : 0.25,
            position: 'absolute',
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.28, 1] }) },
              { rotate: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-12deg', '0deg'] }) },
            ],
          },
        ]}
      >
        ★
      </Animated.Text>
    </View>
  );
}

const CONFETTI_COLORS = [
  COLORS.accent,
  COLORS.gold,
  COLORS.green,
  COLORS.coral,
  COLORS.purple,
  COLORS.orange,
  COLORS.teal,
  '#ffffff',
  '#ff69b4', // hot pink
  '#7df9ff', // electric blue
  '#adff2f', // green-yellow
  '#ff4500', // orange-red
];

function OneMoreLevelHooks({ level, stars, statsAnim }: { level: number; stars: number; statsAnim: Animated.Value }) {
  const player = usePlayer();
  const totalStars = Object.values(player.starsByLevel).reduce((sum, v) => sum + v, 0) + stars;
  const puzzlesSolved = player.puzzlesSolved;
  const currentStreak = player.streaks.currentStreak;

  // Milestone proximity: library wing
  const wingMilestoneMsg = useMemo(() => {
    const wingChapterThresholds = LIBRARY.wingChapters.map(([start]) => start);
    const currentChapter = player.currentChapter;
    for (const threshold of wingChapterThresholds) {
      if (currentChapter < threshold) {
        const chaptersAway = threshold - currentChapter;
        if (chaptersAway <= 3) {
          const wingIdx = wingChapterThresholds.indexOf(threshold);
          const wingName = LIBRARY.wingNames[wingIdx] ?? 'new';
          return `${chaptersAway} chapter${chaptersAway === 1 ? '' : 's'} away from the ${wingName} library wing!`;
        }
        break;
      }
    }
    return null;
  }, [player.currentChapter]);

  // Star milestone proximity
  const starMilestoneMsg = useMemo(() => {
    for (const milestone of STAR_MILESTONES) {
      if (totalStars < milestone.stars) {
        const starsAway = milestone.stars - totalStars;
        if (starsAway <= 15) {
          return `${starsAway} star${starsAway === 1 ? '' : 's'} until ${milestone.name}!`;
        }
        break;
      }
    }
    return null;
  }, [totalStars]);

  const milestoneMsg = wingMilestoneMsg || starMilestoneMsg;

  const hasStreak = currentStreak > 0;

  return (
    <Animated.View style={[hookStyles.container, { opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {/* Milestone Proximity */}
      {milestoneMsg && (
        <LinearGradient
          colors={['rgba(255,215,0,0.10)', 'rgba(255,159,0,0.05)'] as [string, string]}
          style={hookStyles.milestoneCard}
        >
          <Text style={hookStyles.milestoneIcon}>{'🎯'}</Text>
          <Text style={hookStyles.milestoneText}>{milestoneMsg}</Text>
        </LinearGradient>
      )}

      {/* Streak Reinforcement */}
      {hasStreak && (
        <LinearGradient
          colors={['rgba(255,145,0,0.10)', 'rgba(255,107,0,0.05)'] as [string, string]}
          style={hookStyles.streakCard}
        >
          <View style={hookStyles.streakLeft}>
            <Text style={hookStyles.streakFireIcon}>{'🔥'}</Text>
            <Text style={hookStyles.streakNumber}>{currentStreak}</Text>
          </View>
          <View style={hookStyles.streakRight}>
            <Text style={hookStyles.streakLabel}>Day Streak</Text>
            <Text style={hookStyles.streakCta}>Keep it going!</Text>
          </View>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

export function PuzzleComplete({
  score,
  moves,
  stars,
  combo,
  level,
  isDaily,
  mode = 'classic',
  perfectRun = false,
  isFirstWin = false,
  leveledUp = false,
  newLevel = 0,
  difficultyTransition = null,
  nextLevelPreview = null,
  shareText = '',
  friendComparison = null,
  onNextLevel,
  onHome,
  onRetry,
  onShare,
}: PuzzleCompleteProps) {
  const { height: screenHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(30)).current;
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(cardAnim, {
          toValue: 0,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(ribbonAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }),
      Animated.spring(actionsAnim, {
        toValue: 1,
        friction: 6,
        tension: 85,
        useNativeDriver: true,
      }),
    ]).start();
  }, [actionsAnim, cardAnim, fadeAnim, ribbonAnim, statsAnim]);

  const title = useMemo(() => {
    if (isDaily) return 'Daily Triumph';
    if (perfectRun) return 'Perfect Clear';
    if (mode === 'cascade') return 'Combo Mastery';
    if (mode === 'expert') return 'Expert Conquered';
    if (mode === 'timePressure') return 'Clock Defeated';
    if (mode === 'perfectSolve') return 'Flawless Solve';
    return 'Puzzle Cleared';
  }, [isDaily, mode, perfectRun]);

  const subtitle = perfectRun
    ? 'You solved it without mistakes and kept the board perfectly under control.'
    : combo > 1
    ? `Your best chain reached ${combo}x and kept the board flowing beautifully.`
    : 'A clean clear with strong sequencing and smart gravity reads.';

  const difficulty = level <= 5 ? 'easy' : level <= 15 ? 'medium' : level <= 30 ? 'hard' : 'expert';
  const coinReward = ECONOMY.puzzleCompleteCoins[difficulty] + stars * ECONOMY.starBonus;

  const confetti = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: index,
        delay: Math.random() * 500,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        startX: Math.random() * 360,
      })),
    [],
  );

  const borderColors = perfectRun
    ? [COLORS.gold, 'rgba(255,215,0,0.6)', COLORS.gold]
    : [COLORS.accent, 'rgba(0,212,255,0.5)', COLORS.accent];

  // Constrain max height to fit screen
  const maxCardHeight = screenHeight * 0.85;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Reduced sparkle field and celebration burst */}
      <SparkleField count={12} intensity="medium" />
      <CelebrationBurst centerX={190} centerY={200} particleCount={10} />
      {confetti.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
          color={particle.color}
          startX={particle.startX}
        />
      ))}

      <Animated.View style={[styles.cardOuter, { transform: [{ translateY: cardAnim }], maxHeight: maxCardHeight }]}>
        {/* Gradient border wrapper */}
        <LinearGradient
          colors={borderColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <LinearGradient
            colors={GRADIENTS.victoryCard as unknown as [string, string, ...string[]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.card}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.cardContent}
            >
              <View style={styles.heroGlow} />
              <View style={styles.heroGlowSecondary} />

              <Animated.View
                style={[
                  styles.ribbon,
                  {
                    opacity: ribbonAnim,
                    transform: [
                      { scale: ribbonAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
                      { translateY: ribbonAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                    ],
                  },
                ]}
              >
                <Text style={styles.ribbonText}>{perfectRun ? '✨ PERFECT RUN' : isDaily ? '☀ DAILY WIN' : '🏆 STAGE COMPLETE'}</Text>
              </Animated.View>

              <Text style={[styles.title, perfectRun && styles.titlePerfect]}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              <View style={styles.starsRow}>
                <Star filled={stars >= 1} delay={140} size={44} />
                <Star filled={stars >= 2} delay={340} size={56} />
                <Star filled={stars >= 3} delay={560} size={44} />
              </View>

              <LinearGradient
                colors={GRADIENTS.scorePanel as unknown as [string, string, ...string[]]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.scorePanel}
              >
                <Text style={styles.scoreLabel}>Final Score</Text>
                <AnimatedScore targetScore={score} />
              </LinearGradient>

              <Animated.View
                style={[
                  styles.statsGrid,
                  {
                    opacity: statsAnim,
                    transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
                  },
                ]}
              >
                <LinearGradient
                  colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                  style={styles.statCard}
                >
                  <Text style={styles.statCardLabel}>Moves</Text>
                  <Text style={styles.statCardValue}>{moves}</Text>
                </LinearGradient>
                <LinearGradient
                  colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                  style={styles.statCard}
                >
                  <Text style={styles.statCardLabel}>Best Combo</Text>
                  <Text style={styles.statCardValue}>{combo > 1 ? `${combo}x` : '—'}</Text>
                </LinearGradient>
                <LinearGradient
                  colors={GRADIENTS.surface as unknown as [string, string, ...string[]]}
                  style={styles.statCard}
                >
                  <Text style={styles.statCardLabel}>Stars</Text>
                  <Text style={styles.statCardValue}>{stars}/3</Text>
                </LinearGradient>
              </Animated.View>

              <Animated.View
                style={[
                  styles.rewardsCard,
                  {
                    opacity: statsAnim,
                    transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                  },
                ]}
              >
                <Text style={styles.rewardsTitle}>Rewards</Text>
                <View style={styles.rewardRow}>
                  <LinearGradient
                    colors={['#1a2050', '#222860'] as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rewardChip}
                  >
                    <Text style={styles.rewardIcon}>🪙</Text>
                    <Text style={styles.rewardText}>+{coinReward} coins</Text>
                  </LinearGradient>
                  {perfectRun && (
                    <LinearGradient
                      colors={['rgba(255,215,0,0.18)', 'rgba(255,159,0,0.12)'] as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rewardChipGold}
                    >
                      <Text style={styles.rewardIcon}>💎</Text>
                      <Text style={styles.rewardTextGold}>+{ECONOMY.perfectClearGems} gems</Text>
                    </LinearGradient>
                  )}
                </View>
              </Animated.View>

              {/* First Win / Level Up / Difficulty Transition */}
              {isFirstWin && (
                <Animated.View style={[styles.levelUpBadge, { backgroundColor: COLORS.gold + '20', borderColor: COLORS.gold + '40', opacity: statsAnim }]}>
                  <Text style={styles.levelUpEmoji}>🎉</Text>
                  <View>
                    <Text style={[styles.levelUpText, { color: COLORS.gold }]}>WELCOME TO WORDFALL!</Text>
                    <Text style={styles.levelUpSubtext}>Your adventure begins</Text>
                  </View>
                </Animated.View>
              )}
              {!isFirstWin && leveledUp && newLevel > 0 && (
                <Animated.View style={[styles.levelUpBadge, { opacity: statsAnim }]}>
                  <Text style={styles.levelUpEmoji}>⬆️</Text>
                  <View>
                    <Text style={styles.levelUpText}>LEVEL UP!</Text>
                    <Text style={styles.levelUpSubtext}>You reached Level {newLevel}</Text>
                  </View>
                </Animated.View>
              )}
              {difficultyTransition && (
                <Animated.View style={[styles.levelUpBadge, { backgroundColor: COLORS.purple + '20', borderColor: COLORS.purple + '40', opacity: statsAnim }]}>
                  <Text style={styles.levelUpEmoji}>🏆</Text>
                  <View>
                    <Text style={[styles.levelUpText, { color: COLORS.purple }]}>NEW CHALLENGE TIER!</Text>
                    <Text style={styles.levelUpSubtext}>{difficultyTransition.from} → {difficultyTransition.to}</Text>
                  </View>
                </Animated.View>
              )}

              {/* Friend Score Comparison */}
              {friendComparison && friendComparison.total > 0 && (
                <Animated.View style={[styles.friendCompare, { opacity: statsAnim }]}>
                  <Text style={styles.friendCompareIcon}>👥</Text>
                  <Text style={styles.friendCompareText}>
                    You beat {friendComparison.beaten} of {friendComparison.total} friends!
                  </Text>
                </Animated.View>
              )}

              {/* Next Level Preview Card */}
              {nextLevelPreview && !isDaily && (
                <Animated.View style={[styles.nextPreviewCard, { opacity: statsAnim }]}>
                  <LinearGradient
                    colors={GRADIENTS.surfaceCard as unknown as [string, string, ...string[]]}
                    style={styles.nextPreviewCardInner}
                  >
                    <Text style={styles.nextPreviewLabel}>COMING UP</Text>
                    <View style={styles.nextPreviewRow}>
                      <View style={[styles.nextPreviewDiffDot, { backgroundColor: nextLevelPreview.difficulty === 'easy' ? COLORS.green : nextLevelPreview.difficulty === 'medium' ? COLORS.accent : nextLevelPreview.difficulty === 'hard' ? COLORS.orange : COLORS.purple }]} />
                      <View>
                        <Text style={styles.nextPreviewLevelText}>Level {nextLevelPreview.level}</Text>
                        <Text style={styles.nextPreviewDiffText}>{nextLevelPreview.difficulty.charAt(0).toUpperCase() + nextLevelPreview.difficulty.slice(1)}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              )}

              {/* One More Level Hooks */}
              <OneMoreLevelHooks level={level} stars={stars} statsAnim={statsAnim} />

              <Animated.View
                style={[
                  styles.actionsColumn,
                  {
                    opacity: actionsAnim,
                    transform: [{ translateY: actionsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [pressed && styles.buttonPressed]}
                  onPress={onNextLevel}
                >
                  <LinearGradient
                    colors={GRADIENTS.button.primary as unknown as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>{isDaily ? 'PLAY ANOTHER MODE' : 'NEXT LEVEL'}</Text>
                  </LinearGradient>
                </Pressable>
                <View style={styles.secondaryRow}>
                  <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onRetry}>
                    <Text style={styles.secondaryButtonText}>Retry</Text>
                  </Pressable>
                  {shareText ? (
                    <Pressable
                      style={({ pressed }) => [styles.secondaryButton, styles.shareButton, pressed && styles.buttonPressed]}
                      onPress={() => {
                        Share.share({ message: shareText }).catch(() => {});
                        onShare?.();
                      }}
                    >
                      <Text style={styles.shareButtonText}>Share</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onHome}>
                    <Text style={styles.secondaryButtonText}>Home</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </ScrollView>
          </LinearGradient>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 6, 18, 0.94)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 20,
  },
  confettiParticle: {
    position: 'absolute',
    top: -30,
  },
  cardOuter: {
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.strong,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.2,
    shadowRadius: 30,
  },
  gradientBorder: {
    borderRadius: 34,
    padding: 2,
  },
  card: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 18,
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.accentGlow,
    top: -100,
    right: -60,
    opacity: 0.7,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.purpleGlow,
    bottom: -90,
    left: -40,
    opacity: 0.6,
  },
  ribbon: {
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ribbonText: {
    color: COLORS.gold,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 1.4,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowRadius: 12,
  },
  titlePerfect: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 16,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  starGlowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 28,
  },
  scorePanel: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.15,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 36,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...SHADOWS.soft,
  },
  statCardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  statCardValue: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.display,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowRadius: 6,
  },
  rewardsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  rewardsTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
    marginBottom: 10,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowRadius: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.15,
  },
  rewardChipGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    ...SHADOWS.soft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.25,
  },
  rewardIcon: {
    fontSize: 16,
  },
  rewardText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  rewardTextGold: {
    color: COLORS.gold,
    fontFamily: FONTS.display,
    fontSize: 13,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 6,
  },
  actionsColumn: {
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...SHADOWS.soft,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
  levelUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent + '18',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  levelUpEmoji: {
    fontSize: 22,
  },
  levelUpText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  levelUpSubtext: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 1,
  },
  friendCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  friendCompareIcon: {
    fontSize: 14,
  },
  friendCompareText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  nextPreviewCard: {
    marginBottom: 10,
  },
  nextPreviewCardInner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  nextPreviewLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  nextPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextPreviewDiffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nextPreviewLevelText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
  },
  nextPreviewDiffText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  shareButton: {
    borderColor: COLORS.accent + '30',
    backgroundColor: COLORS.accent + '10',
  },
  shareButtonText: {
    color: COLORS.accent,
    fontFamily: FONTS.display,
  },
});

const hookStyles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 10,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  milestoneIcon: {
    fontSize: 18,
  },
  milestoneText: {
    flex: 1,
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,145,0,0.15)',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakFireIcon: {
    fontSize: 20,
  },
  streakNumber: {
    color: COLORS.orange,
    fontSize: 22,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.orangeGlow,
    textShadowRadius: 8,
  },
  streakRight: {
    flex: 1,
  },
  streakLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  streakCta: {
    color: COLORS.orange,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
  },
});
