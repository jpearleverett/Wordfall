import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, FONTS, GRADIENTS, LIBRARY, SHADOWS, STAR_MILESTONES, ANIM } from '../constants';
import { LOCAL_IMAGES, LOCAL_VIDEOS } from '../utils/localAssets';
import { GameMode, VictorySummaryItem } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { SparkleField, CelebrationBurst } from './effects/ParticleSystem';
import { VideoBackground } from './common/VideoBackground';
import ChromeText from './common/ChromeText';
import ScanLineOverlay from './common/ScanLineOverlay';
import NeonStarBurst from './victory/NeonStarBurst';

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
  eventMultiplierLabel?: string | null;
  onNextLevel: () => void;
  onHome: () => void;
  onRetry: () => void;
  onShare?: () => void;
  onDoubleReward?: () => void;
  rewardDoubled?: boolean;
  showAdOption?: boolean;
  onChallengeFriend?: () => void;
  showTomorrowPreview?: boolean;
  summaryItems?: VictorySummaryItem[];
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
  totalCoinsAwarded?: number;
  totalGemsAwarded?: number;
  nextUnlockPreview?: { icon: string; name: string; unlockLevel: number } | null;
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
  eventMultiplierLabel = null,
  onNextLevel,
  onHome,
  onRetry,
  onShare,
  onDoubleReward,
  rewardDoubled = false,
  showAdOption = false,
  onChallengeFriend,
  showTomorrowPreview = false,
  summaryItems = [],
  onNavigate,
  totalCoinsAwarded = 0,
  totalGemsAwarded = 0,
  nextUnlockPreview = null,
}: PuzzleCompleteProps) {
  const { height: screenHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(30)).current;
  const ribbonAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const [starsRevealed, setStarsRevealed] = useState(false);

  useEffect(() => {
    // VHS glitch entrance on title
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
      // VHS glitch on title entrance
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: -0.5, duration: 40, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: ANIM.neonFlickerDuration, useNativeDriver: true }),
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

    // Trigger star burst effects after star reveal delay
    const timer = setTimeout(() => setStarsRevealed(true), 800);
    return () => clearTimeout(timer);
  }, [actionsAnim, cardAnim, fadeAnim, glitchAnim, ribbonAnim, statsAnim]);

  const title = useMemo(() => {
    if (isDaily) return 'Daily Triumph';
    if (perfectRun) return 'Perfect Clear';
    if (mode === 'gravityFlip') return 'Gravity Master';
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
    : [COLORS.accent, 'rgba(255,45,149,0.5)', COLORS.accent];

  // Constrain max height to fit screen
  const maxCardHeight = screenHeight * 0.85;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Image
        source={LOCAL_IMAGES.bg3}
        style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
        resizeMode="cover"
      />
      <VideoBackground
        source={LOCAL_VIDEOS.victoryCelebration}
        opacity={0.45}
        overlayColor="rgba(4,6,18,0.45)"
      />
      <LinearGradient
        colors={['rgba(4,6,18,0.15)', 'rgba(4,6,18,0.75)'] as [string, string]}
        style={StyleSheet.absoluteFill}
      />
      {/* Trophy crown decorative element */}
      <Image
        source={LOCAL_IMAGES.trophyCrown}
        style={styles.trophyCrownDecor}
        resizeMode="contain"
      />
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

              {/* Chrome title with VHS glitch entrance */}
              <Animated.View style={{
                transform: [{
                  translateX: glitchAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-4, 0, 4],
                  }),
                }],
              }}>
                <ChromeText
                  fontSize={perfectRun ? 30 : 26}
                  letterSpacing={3}
                  glowColor={perfectRun ? COLORS.goldGlow : COLORS.accentGlow}
                >
                  {title.toUpperCase()}
                </ChromeText>
              </Animated.View>
              <Text style={styles.subtitle}>{subtitle}</Text>

              {/* Stars with neon burst effects */}
              <View style={styles.starsRow} accessibilityLabel={`${stars} out of 3 stars earned`}>
                <View style={styles.starContainer}>
                  <Star filled={stars >= 1} delay={140} size={44} />
                  <NeonStarBurst active={starsRevealed && stars >= 1} color={COLORS.gold} size={50} />
                </View>
                <View style={styles.starContainer}>
                  <Star filled={stars >= 2} delay={340} size={56} />
                  <NeonStarBurst active={starsRevealed && stars >= 2} color={COLORS.gold} size={64} />
                </View>
                <View style={styles.starContainer}>
                  <Star filled={stars >= 3} delay={560} size={44} />
                  <NeonStarBurst active={starsRevealed && stars >= 3} color={COLORS.gold} size={50} />
                </View>
              </View>

              {/* Chrome score panel with CRT scan lines */}
              <LinearGradient
                colors={GRADIENTS.scorePanel as unknown as [string, string, ...string[]]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.scorePanel}
              >
                <ScanLineOverlay opacity={0.02} height={80} />
                <Text style={styles.scoreLabel}>FINAL SCORE</Text>
                <View accessibilityLabel={`Final score: ${score}`}>
                  <AnimatedScore targetScore={score} />
                </View>
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
                    <Image source={LOCAL_IMAGES.iconCoinGold} style={styles.rewardIconImage} resizeMode="contain" />
                    <Text style={styles.rewardText}>+{totalCoinsAwarded > 0 ? totalCoinsAwarded : coinReward} coins</Text>
                  </LinearGradient>
                  {(perfectRun || totalGemsAwarded > 0) && (
                    <LinearGradient
                      colors={['rgba(255,215,0,0.18)', 'rgba(255,159,0,0.12)'] as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rewardChipGold}
                    >
                      <Image source={LOCAL_IMAGES.iconGemDiamond} style={styles.rewardIconImage} resizeMode="contain" />
                      <Text style={styles.rewardTextGold}>+{totalGemsAwarded > 0 ? totalGemsAwarded : ECONOMY.perfectClearGems} gems</Text>
                    </LinearGradient>
                  )}
                </View>
                {/* Double rewards ad button */}
                {showAdOption && !rewardDoubled && onDoubleReward && (
                  <Pressable
                    style={({ pressed }) => [{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 255, 135, 0.12)',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(0, 255, 135, 0.35)',
                      marginTop: 8,
                    }, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
                    onPress={onDoubleReward}
                    accessibilityRole="button"
                    accessibilityLabel="Watch ad to double rewards"
                  >
                    <Text style={{ color: COLORS.green, fontSize: 13, fontFamily: FONTS.display, letterSpacing: 0.5 }}>
                      {'\uD83C\uDFAC'} Watch Ad to DOUBLE Rewards
                    </Text>
                  </Pressable>
                )}
                {rewardDoubled && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 184, 0, 0.12)',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 184, 0, 0.35)',
                    marginTop: 8,
                  }}>
                    <Text style={{ color: COLORS.gold, fontSize: 13, fontFamily: FONTS.display, letterSpacing: 0.5 }}>
                      {'\u2728'} Rewards DOUBLED!
                    </Text>
                  </View>
                )}
              </Animated.View>

              {/* First Win badge */}
              {isFirstWin && (
                <Animated.View style={[styles.levelUpBadge, { backgroundColor: COLORS.gold + '20', borderColor: COLORS.gold + '40', opacity: statsAnim }]}>
                  <Text style={styles.levelUpEmoji}>{'\uD83C\uDF89'}</Text>
                  <View>
                    <Text style={[styles.levelUpText, { color: COLORS.gold }]}>WELCOME TO WORDFALL!</Text>
                    <Text style={styles.levelUpSubtext}>Your adventure begins</Text>
                  </View>
                </Animated.View>
              )}

              {/* Inline summary items — limited to 2 most important to keep victory screen clean.
                  Priority: level_up > early_bonus > difficulty_transition > mode_unlock > everything else */}
              {summaryItems.length > 0 && (() => {
                const priorityOrder = ['level_up', 'early_bonus', 'difficulty_transition', 'mode_unlock'];
                const sorted = [...summaryItems].sort((a, b) => {
                  const aIdx = priorityOrder.indexOf(a.type);
                  const bIdx = priorityOrder.indexOf(b.type);
                  return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                });
                const limited = sorted.slice(0, 2);
                return (
                <Animated.View style={[styles.summarySection, { opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
                  {limited.map((item, index) => {
                    const content = (
                      <View
                        key={index}
                        style={[styles.summaryItem, { backgroundColor: item.accentColor + '15', borderColor: item.accentColor + '30' }]}
                      >
                        <Text style={styles.summaryItemIcon}>{item.icon}</Text>
                        <View style={styles.summaryItemText}>
                          <Text style={[styles.summaryItemLabel, { color: item.accentColor }]}>{item.label}</Text>
                          {item.sublabel && <Text style={styles.summaryItemSublabel}>{item.sublabel}</Text>}
                        </View>
                        {item.action && (
                          <View style={[styles.summaryItemCta, { borderColor: item.accentColor + '50' }]}>
                            <Text style={[styles.summaryItemCtaText, { color: item.accentColor }]}>Claim</Text>
                          </View>
                        )}
                      </View>
                    );
                    if (item.action && onNavigate) {
                      return (
                        <Pressable key={index} onPress={() => onNavigate(item.action!.screen, item.action!.params)}>
                          {content}
                        </Pressable>
                      );
                    }
                    return content;
                  })}
                </Animated.View>
                );
              })()}

              {/* Event Multiplier Label */}
              {eventMultiplierLabel && (
                <Animated.View style={[styles.friendCompare, { opacity: statsAnim, backgroundColor: 'rgba(255, 159, 67, 0.15)' }]}>
                  <Text style={styles.friendCompareIcon}>{'\u{1F525}'}</Text>
                  <Text style={[styles.friendCompareText, { color: COLORS.orange }]}>
                    {eventMultiplierLabel}
                  </Text>
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

              {/* Next Unlock Preview — retention hook showing what's coming soon.
                  Only show when there aren't already many summary items to avoid visual overload. */}
              {nextUnlockPreview && summaryItems.length < 3 && (
                <Animated.View style={[styles.nextUnlockCard, { opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
                  <LinearGradient
                    colors={[
                      nextUnlockPreview.unlockLevel - level <= 1
                        ? 'rgba(255,215,0,0.20)'
                        : 'rgba(168,85,247,0.15)',
                      nextUnlockPreview.unlockLevel - level <= 1
                        ? 'rgba(255,159,0,0.10)'
                        : 'rgba(168,85,247,0.05)',
                    ] as [string, string]}
                    style={styles.nextUnlockGradient}
                  >
                    <Text style={styles.nextUnlockIcon}>{nextUnlockPreview.icon}</Text>
                    <View style={styles.nextUnlockInfo}>
                      <Text style={[
                        styles.nextUnlockLabel,
                        nextUnlockPreview.unlockLevel - level <= 1 && { color: COLORS.gold },
                      ]}>
                        {nextUnlockPreview.name}
                      </Text>
                      <Text style={styles.nextUnlockSublabel}>
                        {nextUnlockPreview.unlockLevel - level <= 1
                          ? 'Unlocks NEXT LEVEL!'
                          : `${nextUnlockPreview.unlockLevel - level} levels away`}
                      </Text>
                    </View>
                    {/* Mini progress bar */}
                    <View style={styles.nextUnlockBarTrack}>
                      <View style={[
                        styles.nextUnlockBarFill,
                        {
                          width: `${Math.min(100, (level / nextUnlockPreview.unlockLevel) * 100)}%`,
                          backgroundColor: nextUnlockPreview.unlockLevel - level <= 1 ? COLORS.gold : COLORS.purple,
                        },
                      ]} />
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
                  accessibilityRole="button"
                  accessibilityLabel={isDaily ? 'Play another mode' : 'Next level'}
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
                {showTomorrowPreview && (
                  <LinearGradient
                    colors={['rgba(100,180,255,0.12)', 'rgba(100,180,255,0.04)'] as [string, string]}
                    style={styles.tomorrowPreview}
                  >
                    <Text style={styles.tomorrowPreviewTitle}>Come back tomorrow!</Text>
                    <Text style={styles.tomorrowPreviewText}>Daily Bonus + Free Mystery Spin await you</Text>
                  </LinearGradient>
                )}
                <View style={styles.secondaryRow}>
                  <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onHome} accessibilityRole="button" accessibilityLabel="Go to home screen">
                    <Text style={styles.secondaryButtonText}>Home</Text>
                  </Pressable>
                  {shareText ? (
                    <Pressable
                      style={({ pressed }) => [styles.secondaryButton, styles.shareButton, pressed && styles.buttonPressed]}
                      onPress={() => {
                        Share.share({ message: shareText }).catch(() => {});
                        onShare?.();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Share results"
                    >
                      <Text style={styles.shareButtonText}>Share</Text>
                    </Pressable>
                  ) : null}
                  {onChallengeFriend && (
                    <Pressable
                      style={({ pressed }) => [styles.challengeButton, pressed && styles.buttonPressed]}
                      onPress={onChallengeFriend}
                      accessibilityRole="button"
                      accessibilityLabel="Challenge a friend"
                    >
                      <Text style={styles.challengeButtonText}>{'\u2694\uFE0F'} Challenge</Text>
                    </Pressable>
                  )}
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
    shadowOpacity: 0.35,
    shadowRadius: 40,
  },
  gradientBorder: {
    borderRadius: 34,
    padding: 2.5,
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
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.accentGlow,
    top: -110,
    right: -70,
    opacity: 0.8,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.purpleGlow,
    bottom: -100,
    left: -50,
    opacity: 0.7,
  },
  ribbon: {
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.20)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ribbonText: {
    color: COLORS.gold,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 1.8,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1,
    textShadowColor: 'rgba(200,77,255,0.3)',
    textShadowRadius: 16,
  },
  titlePerfect: {
    color: COLORS.gold,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 22,
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
  starContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(255,215,0,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.30)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  star: {
    color: COLORS.star,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 34,
  },
  scorePanel: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.15)',
    ...SHADOWS.medium,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.2,
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: FONTS.bodySemiBold,
  },
  scoreValue: {
    color: COLORS.gold,
    fontSize: 38,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 20,
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
  trophyCrownDecor: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    width: 80,
    height: 80,
    opacity: 0.35,
    left: '50%',
    marginLeft: -40,
  },
  rewardIcon: {
    fontSize: 16,
  },
  rewardIconImage: {
    width: 20,
    height: 20,
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
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  primaryButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 2,
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
  summarySection: {
    gap: 6,
    marginBottom: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  summaryItemIcon: {
    fontSize: 20,
  },
  summaryItemText: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  summaryItemSublabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 1,
  },
  summaryItemCta: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  summaryItemCtaText: {
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  nextUnlockCard: {
    marginBottom: 10,
  },
  nextUnlockGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  nextUnlockIcon: {
    fontSize: 22,
  },
  nextUnlockInfo: {
    flex: 1,
  },
  nextUnlockLabel: {
    color: COLORS.purple,
    fontSize: 12,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  nextUnlockSublabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 1,
  },
  nextUnlockBarTrack: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  nextUnlockBarFill: {
    height: '100%' as unknown as number,
    borderRadius: 2,
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
  shareButton: {
    borderColor: COLORS.accent + '30',
    backgroundColor: COLORS.accent + '10',
  },
  shareButtonText: {
    color: COLORS.accent,
    fontFamily: FONTS.display,
  },
  challengeButton: {
    flex: 1,
    backgroundColor: COLORS.purple + '15',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.purple + '40',
    ...SHADOWS.soft,
  },
  challengeButtonText: {
    color: COLORS.purple,
    fontFamily: FONTS.display,
  },
  tomorrowPreview: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.15)',
  },
  tomorrowPreviewTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 2,
  },
  tomorrowPreviewText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.body,
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
