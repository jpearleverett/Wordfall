import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { ContextualOffer } from '../components/ContextualOffer';
import { Ionicons } from '@expo/vector-icons';
import { Difficulty, PlayerProgress, WeeklyGoalsState } from '../types';
import { soundManager } from '../services/sound';
import { VideoBackground } from '../components/common/VideoBackground';
import { getDailyDeal, DailyDeal } from '../data/dailyDeals';
import { getFlashSale } from '../data/dynamicPricing';
import { LOCAL_IMAGES, LOCAL_VIDEOS } from '../utils/localAssets';
import NeonHighwayProgress from '../components/home/NeonHighwayProgress';
import NeonStreakFlame from '../components/home/NeonStreakFlame';
import ReferralCard from '../components/ReferralCard';
import { usePlayer } from '../contexts/PlayerContext';

interface DailyMissionDisplay {
  id: string;
  progress: number;
  completed: boolean;
}

interface Recommendation {
  icon: string;
  title: string;
  subtitle: string;
  action: () => void;
}

interface HomeScreenProps {
  progress: PlayerProgress;
  onPlay: (difficulty?: Difficulty) => void;
  onDaily: () => void;
  onResetProgress: () => void;
  onOpenShop?: () => void;
  onOpenSettings?: () => void;
  onOpenWheel?: () => void;
  onBuyDeal?: (deal: DailyDeal) => void;
  mysteryWheelSpins?: number;
  dailyFreeSpinAvailable?: boolean;
  freeSpinToast?: boolean;
  currencies?: {
    coins: number;
    gems: number;
    hintTokens: number;
    libraryPoints: number;
  };
  currentChapter?: number;
  loginCycleDay?: number;
  playerStage?: 'new' | 'early' | 'established' | 'veteran';
  weeklyGoals?: WeeklyGoalsState | null;
  dailyMissions?: DailyMissionDisplay[];
  recommendation?: Recommendation | null;
  /** Streak grace days already used (0 or 1) */
  streakGraceDaysUsed?: number;
  /** Whether streak shield is currently active */
  streakShieldActive?: boolean;
  /** Segment-driven list of home content sections to show */
  segmentHomeContent?: string[];
  /** Segment-driven welcome back message for at-risk/lapsed/returned players */
  segmentWelcomeMessage?: { title: string; subtitle: string } | null;
  /** Active event banners to display */
  activeEventBanners?: Array<{ id: string; name: string; icon: string; label: string; color: string }>;
  /** Navigate to event screen */
  onOpenEvents?: () => void;
  onClaimLoginReward?: () => void;
}

const difficultyMeta: Record<Difficulty, { label: string; accent: string; icon: string }> = {
  easy: { label: 'Easy', accent: COLORS.green, icon: '🌱' },
  medium: { label: 'Medium', accent: COLORS.accent, icon: '⚡' },
  hard: { label: 'Hard', accent: COLORS.orange, icon: '🔥' },
  expert: { label: 'Expert', accent: COLORS.purple, icon: '💎' },
};

const MISSION_LABELS: Record<string, { label: string; target: number }> = {
  solve_3_puzzles: { label: 'Solve 3 puzzles', target: 3 },
  earn_500_score: { label: 'Earn 500 score', target: 500 },
  get_perfect_solve: { label: 'Get a perfect solve', target: 1 },
  collect_rare_tile: { label: 'Collect a rare tile', target: 1 },
  complete_daily: { label: 'Complete daily puzzle', target: 1 },
  solve_without_hints: { label: 'Solve without hints', target: 1 },
  earn_3_stars: { label: 'Earn 3 stars', target: 3 },
  play_5_minutes: { label: 'Play for 5 minutes', target: 1 },
};

export function HomeScreen({
  progress,
  onPlay,
  onDaily,
  onResetProgress,
  onOpenShop,
  onOpenSettings,
  onOpenWheel,
  onBuyDeal,
  currencies,
  mysteryWheelSpins = 0,
  dailyFreeSpinAvailable = false,
  freeSpinToast = false,
  currentChapter = 1,
  loginCycleDay = 1,
  playerStage = 'new',
  weeklyGoals = null,
  dailyMissions = [],
  recommendation = null,
  streakGraceDaysUsed = 0,
  streakShieldActive = false,
  segmentHomeContent = [],
  segmentWelcomeMessage = null,
  activeEventBanners = [],
  onOpenEvents,
  onClaimLoginReward,
}: HomeScreenProps) {
  const player = usePlayer();
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const wheelPulse = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Pre-compute daily completion for streak offer check
  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);

  // --- Streak shield contextual offer ---
  const [showStreakOffer, setShowStreakOffer] = useState(false);
  const streakOfferDismissed = useRef(false);

  useEffect(() => {
    if (streakOfferDismissed.current || streakShieldActive) return;
    const streak = progress.currentStreak;
    if (streak <= 0) return;

    const now = new Date();
    const currentHour = now.getHours();
    const isPastEvening = currentHour >= 18;

    // Streak is at risk if:
    // 1. Grace day was already used (next miss resets), OR
    // 2. Streak > 7 AND daily not yet completed AND it's past 6 PM
    const graceDayUsed = streakGraceDaysUsed >= 1;

    const atRisk = graceDayUsed || (streak > 7 && !dailyDone && isPastEvening);
    if (atRisk) {
      const timer = setTimeout(() => setShowStreakOffer(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [progress.currentStreak, streakGraceDaysUsed, streakShieldActive, dailyDone]);

  const handleStreakOfferAccept = useCallback(() => {
    // Navigate to shop for streak shield purchase
    setShowStreakOffer(false);
    streakOfferDismissed.current = true;
    onOpenShop?.();
  }, [onOpenShop]);

  const handleStreakOfferDismiss = useCallback(() => {
    setShowStreakOffer(false);
    streakOfferDismissed.current = true;
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentAnim, titleAnim]);

  // Pulse animation for wheel button when spins available
  useEffect(() => {
    if (mysteryWheelSpins > 0 || dailyFreeSpinAvailable) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(wheelPulse, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(wheelPulse, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [mysteryWheelSpins, dailyFreeSpinAvailable, wheelPulse]);

  // Free spin toast animation
  useEffect(() => {
    if (freeSpinToast) {
      Animated.sequence([
        Animated.spring(toastAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [freeSpinToast, toastAnim]);

  useEffect(() => {
    void soundManager.playMusic('menu');
  }, []);

  const heroTranslate = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  const contentTranslate = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });

  const totalStars = Object.values(progress.starsByLevel).reduce((a, b) => a + b, 0);
  const dailyDeal = getDailyDeal(today);
  const dealHoursLeft = dailyDeal.availableHours;
  const flashSale = getFlashSale(new Date());
  const nextMilestone = [7, 14, 30, 60, 100].find((milestone) => milestone > progress.currentStreak) || 100;
  const streakProgress = Math.min(100, (progress.currentStreak / nextMilestone) * 100);
  const currentRewardDay = ((loginCycleDay - 1) % 7) + 1;

  // Progressive disclosure flags
  // Progressive disclosure: segment-aware when available, falls back to playerStage
  const hasSegmentContent = segmentHomeContent.length > 0;
  const showStreak = hasSegmentContent
    ? segmentHomeContent.includes('streak')
    : playerStage !== 'new';
  const showDailyRewards = hasSegmentContent
    ? segmentHomeContent.includes('daily_rewards')
    : playerStage !== 'new';
  const showQuickPlay = hasSegmentContent
    ? segmentHomeContent.includes('daily_challenge')
    : playerStage !== 'new' && playerStage !== 'early';
  const showWeeklyGoals = hasSegmentContent
    ? segmentHomeContent.includes('weekly_goals') && weeklyGoals
    : (playerStage === 'established' || playerStage === 'veteran') && weeklyGoals;
  const showMissions = hasSegmentContent
    ? segmentHomeContent.includes('missions') && dailyMissions.length > 0
    : (playerStage === 'established' || playerStage === 'veteran') && dailyMissions.length > 0;
  const showMysteryWheel = hasSegmentContent
    ? segmentHomeContent.includes('mystery_wheel') && onOpenWheel
    : playerStage !== 'new' && onOpenWheel;

  return (
    <View style={styles.container}>
      <VideoBackground source={LOCAL_VIDEOS.bgHomescreen} opacity={0.6} overlayColor="rgba(10,14,39,0.4)" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        {onOpenSettings && (
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
        )}
        <View style={styles.topBarRight}>
          {currencies && (
            <>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Image source={LOCAL_IMAGES.iconCoinGold} style={styles.currencyIcon} resizeMode="contain" />
                <Text style={styles.currencyLabel}>{currencies.coins}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Image source={LOCAL_IMAGES.iconGemDiamond} style={styles.currencyIcon} resizeMode="contain" />
                <Text style={styles.currencyLabel}>{currencies.gems}</Text>
              </LinearGradient>
              <LinearGradient
                colors={GRADIENTS.surfaceCard}
                style={styles.currencyChip}
              >
                <Text style={styles.currencyLabel}>💡 {currencies.hintTokens}</Text>
              </LinearGradient>
            </>
          )}
          {onOpenShop && (
            <Pressable onPress={onOpenShop} style={({ pressed }) => [pressed && styles.buttonPressed]}>
              <View style={styles.shopButtonWrapper}>
                <Image source={LOCAL_IMAGES.shopButton} style={styles.shopButtonImage} resizeMode="contain" />
                <View style={styles.shopButtonOverlay}>
                  <Text style={styles.shopButtonText}>Shop</Text>
                </View>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          {
            opacity: titleAnim,
            transform: [{ translateY: heroTranslate }, { scale: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
          },
        ]}
      >
        <View
          style={styles.heroCard}
        >
          <Image
            source={LOCAL_IMAGES.wordfallLogo}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <View style={styles.statsRow}>
            {[
              { value: `★ ${totalStars}`, label: 'Stars' },
              { value: `${progress.puzzlesSolved}`, label: 'Solved' },
              { value: `🔥 ${progress.currentStreak}`, label: 'Streak' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCardWrapper}>
                <Image source={LOCAL_IMAGES.statsCard} style={styles.statCardImage} resizeMode="stretch" />
                <View style={styles.statCardOverlay}>
                  <Text style={styles.heroStatValue}>{stat.value}</Text>
                  <Text style={styles.heroStatLabel}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={() => onPlay()}
          >
            <View style={styles.playButtonWrapper}>
              <Image source={LOCAL_IMAGES.playButton} style={styles.playButtonImage} resizeMode="stretch" />
              <View style={styles.playButtonOverlay}>
                <View>
                  <Text style={styles.playButtonLabel}>{playerStage === 'new' ? 'Start playing' : 'Continue journey'}</Text>
                  <Text style={styles.playButtonLevel}>Play Level {progress.currentLevel}</Text>
                </View>
                <Text style={styles.playButtonArrow}>→</Text>
              </View>
            </View>
          </Pressable>

          {/* Daily challenge - show for all except brand new players */}
          {playerStage !== 'new' && (
            <Pressable
              style={({ pressed }) => [pressed && styles.buttonPressed]}
              onPress={onDaily}
            >
              <LinearGradient
                colors={dailyDone ? ['rgba(76,175,80,0.2)', 'rgba(76,175,80,0.08)'] : ['rgba(255,215,0,0.12)', 'rgba(255,159,67,0.06)']}
                style={[styles.dailyCard, dailyDone && styles.dailyDone]}
              >
                <View style={styles.dailyContent}>
                  <Text style={styles.dailyTitle}>{dailyDone ? 'Daily completed' : "Today's challenge"}</Text>
                  <Text style={styles.dailySubtitle}>
                    {dailyDone ? 'Come back tomorrow!' : `+${ECONOMY.dailyCompleteCoins} coins`}
                  </Text>
                </View>
                <Text style={styles.dailyBadge}>{dailyDone ? '✓' : '☀'}</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Active Event Banners */}
      {activeEventBanners.length > 0 && (
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            marginBottom: 14,
          }}
        >
          {activeEventBanners.map((eb) => (
            <Pressable
              key={eb.id}
              style={({ pressed }) => [pressed && styles.buttonPressed]}
              onPress={onOpenEvents}
            >
              <LinearGradient
                colors={[eb.color + '20', eb.color + '08'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.eventBanner, { borderColor: eb.color + '40' }]}
              >
                <Text style={styles.eventBannerIcon}>{eb.icon}</Text>
                <View style={styles.eventBannerInfo}>
                  <Text style={[styles.eventBannerLabel, { color: eb.color }]}>{eb.label}</Text>
                  <Text style={styles.eventBannerName}>{eb.name}</Text>
                </View>
                <Text style={[styles.eventBannerArrow, { color: eb.color }]}>{'\u{203A}'}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </Animated.View>
      )}

      {/* Mystery Wheel Button */}
      {showMysteryWheel && (
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            marginBottom: 14,
          }}
        >
          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={onOpenWheel}
          >
            <Animated.View style={{ transform: [{ scale: wheelPulse }] }}>
              <LinearGradient
                colors={['rgba(168,85,247,0.18)', 'rgba(255,215,0,0.10)', 'rgba(168,85,247,0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.mysteryWheelButton,
                  (mysteryWheelSpins > 0 || dailyFreeSpinAvailable) && styles.mysteryWheelButtonGlow,
                  SHADOWS.medium,
                ]}
              >
                <View style={styles.mysteryWheelIconContainer}>
                  <Text style={styles.mysteryWheelIcon}>{'\u{1F3B0}'}</Text>
                </View>
                <View style={styles.mysteryWheelContent}>
                  <Text style={styles.mysteryWheelTitle}>Mystery Wheel</Text>
                  <Text style={styles.mysteryWheelSubtitle}>
                    {dailyFreeSpinAvailable
                      ? 'Daily free spin ready!'
                      : mysteryWheelSpins > 0
                        ? `${mysteryWheelSpins} free spin${mysteryWheelSpins !== 1 ? 's' : ''} available!`
                        : 'Spin for prizes!'}
                  </Text>
                </View>
                {dailyFreeSpinAvailable && (
                  <View style={styles.dailySpinBadge}>
                    <Text style={styles.dailySpinBadgeText}>DAILY FREE!</Text>
                  </View>
                )}
                {mysteryWheelSpins > 0 && (
                  <View style={styles.mysteryWheelBadge}>
                    <Text style={styles.mysteryWheelBadgeText}>{mysteryWheelSpins}</Text>
                  </View>
                )}
                <Text style={styles.mysteryWheelArrow}>{'\u{25B6}'}</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </Animated.View>
      )}

      {/* Free Spin Toast */}
      {freeSpinToast && (
        <Animated.View
          style={[
            styles.freeSpinToast,
            {
              opacity: toastAnim,
              transform: [
                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                { scale: toastAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.02, 1] }) },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(168,85,247,0.92)', 'rgba(128,55,207,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.freeSpinToastInner}
          >
            <Text style={styles.freeSpinToastIcon}>{'\u{1F3B0}'}</Text>
            <Text style={styles.freeSpinToastText}>Free Mystery Wheel Spin Available!</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Neon Highway Level Progress */}
      <Animated.View
        style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }], marginBottom: 14 }}
      >
        <NeonHighwayProgress
          currentLevel={progress.currentLevel}
          highestLevel={progress.highestLevel}
          starsPerLevel={progress.starsByLevel}
          onLevelPress={() => onPlay()}
        />
      </Animated.View>

      <Animated.View
        style={{ opacity: contentAnim, transform: [{ translateY: contentTranslate }] }}
      >
        {/* Mission Progress - established+ */}
        {showMissions && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.missionPanel, SHADOWS.medium]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Daily Missions</Text>
              <Text style={styles.panelMeta}>{dailyMissions.filter(m => m.completed).length}/{dailyMissions.length}</Text>
            </View>
            {dailyMissions.map((mission) => {
              const meta = MISSION_LABELS[mission.id] || { label: mission.id, target: 1 };
              const fillPct = Math.min(100, (mission.progress / meta.target) * 100);
              return (
                <View key={mission.id} style={styles.missionRow}>
                  <View style={styles.missionInfo}>
                    <Text style={[styles.missionLabel, mission.completed && styles.missionLabelDone]}>
                      {mission.completed ? '✓ ' : ''}{meta.label}
                    </Text>
                  </View>
                  <View style={styles.missionBarTrack}>
                    <View style={[styles.missionBarFill, { width: `${Math.max(fillPct, 2)}%` }, mission.completed && styles.missionBarDone]} />
                  </View>
                </View>
              );
            })}
          </LinearGradient>
        )}

        {/* Weekly Goals - established+ */}
        {showWeeklyGoals && weeklyGoals && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.weeklyGoalsPanel, SHADOWS.medium]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Weekly Goals</Text>
              <Text style={styles.panelMeta}>{weeklyGoals.goals.filter(g => g.completed).length}/{weeklyGoals.goals.length}</Text>
            </View>
            {weeklyGoals.goals.map((goal, idx) => {
              const fillPct = Math.min(100, (goal.progress / goal.target) * 100);
              return (
                <View key={idx} style={styles.weeklyGoalRow}>
                  <View style={styles.weeklyGoalInfo}>
                    <Text style={[styles.weeklyGoalLabel, goal.completed && styles.weeklyGoalLabelDone]}>
                      {goal.completed ? '✓ ' : ''}{goal.description}
                    </Text>
                    <Text style={styles.weeklyGoalProgress}>
                      {goal.completed ? 'Complete!' : `${goal.progress}/${goal.target}`}
                    </Text>
                  </View>
                  <View style={styles.weeklyGoalBarTrack}>
                    <LinearGradient
                      colors={goal.completed ? [COLORS.green, COLORS.teal] : [COLORS.accent, '#0099cc']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.weeklyGoalBarFill, { width: `${Math.max(fillPct, 2)}%` }]}
                    />
                  </View>
                  {!goal.completed && (
                    <Text style={styles.weeklyGoalReward}>🪙{goal.reward.coins}</Text>
                  )}
                </View>
              );
            })}
            {weeklyGoals.goals.every(g => g.completed) && (
              <LinearGradient
                colors={['rgba(255,215,0,0.12)', 'rgba(255,159,0,0.06)']}
                style={styles.weeklyBonusBanner}
              >
                <Text style={styles.weeklyBonusText}>All complete! 🪙{weeklyGoals.allCompleteBonus.coins} 💎{weeklyGoals.allCompleteBonus.gems}</Text>
              </LinearGradient>
            )}
          </LinearGradient>
        )}

        {/* Referral Card - established+ players */}
        {(playerStage === 'established' || playerStage === 'veteran') && player.referralCode ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <ReferralCard
              referralCode={player.referralCode}
              referralCount={player.referralCount}
              milestonesClaimed={player.referralMilestonesClaimed}
              onClaimMilestone={(count) => player.claimReferralMilestone(count)}
            />
          </View>
        ) : null}

        {/* Streak panel - hidden for brand new players */}
        {showStreak && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.streakPanel, SHADOWS.medium]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>🔥 Streak</Text>
              <Text style={styles.panelMeta}>Next: {nextMilestone} days</Text>
            </View>
            <View style={styles.streakBarRow}>
              <NeonStreakFlame streakDays={progress.currentStreak} size="small" />
              <View style={styles.streakTrack}>
                <LinearGradient
                  colors={[COLORS.orange, '#ff6b35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.streakFill, { width: `${Math.max(streakProgress, 2)}%` }]}
                />
              </View>
              <Text style={styles.streakTarget}>{nextMilestone}</Text>
            </View>
          </LinearGradient>
        )}

        {/* Today's Deal - visible for non-new players */}
        {playerStage !== 'new' && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.dealPanel, SHADOWS.medium]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>{dailyDeal.icon} Today's Deal</Text>
              <Text style={styles.panelMeta}>Ends in {dealHoursLeft}h</Text>
            </View>
            <View style={styles.dealContent}>
              <View style={styles.dealInfo}>
                <Text style={styles.dealName}>{dailyDeal.name}</Text>
                <Text style={styles.dealDesc}>{dailyDeal.description}</Text>
                <View style={styles.dealPriceRow}>
                  <Text style={styles.dealOriginalPrice}>
                    {dailyDeal.currency === 'coins' ? '\u{1FA99}' : '\u{1F48E}'}{dailyDeal.originalPrice}
                  </Text>
                  <Text style={styles.dealSalePrice}>
                    {dailyDeal.currency === 'coins' ? '\u{1FA99}' : '\u{1F48E}'}{dailyDeal.salePrice}
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [pressed && styles.buttonPressed]}
                onPress={() => onBuyDeal?.(dailyDeal)}
              >
                <LinearGradient
                  colors={GRADIENTS.button.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.dealBuyButton}
                >
                  <Text style={styles.dealBuyText}>BUY</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* Flash Sale teaser - visible for established+ players when a sale is active */}
        {flashSale && playerStage !== 'new' && playerStage !== 'early' && (
          <Pressable
            onPress={() => onOpenShop?.()}
            style={({ pressed }) => [pressed && styles.buttonPressed]}
          >
            <LinearGradient
              colors={[COLORS.coral + '25', COLORS.orange + '15', ...GRADIENTS.surfaceCard.slice(1)]}
              style={[styles.flashSaleTeaser, SHADOWS.medium]}
            >
              <View style={styles.flashSaleTeaserRow}>
                <Text style={styles.flashSaleTeaserIcon}>{'\u26A1'}</Text>
                <View style={styles.flashSaleTeaserInfo}>
                  <Text style={styles.flashSaleTeaserTitle}>
                    Today's Deal: {flashSale.name} - {flashSale.discountPercent}% OFF!
                  </Text>
                  <Text style={styles.flashSaleTeaserSubtitle}>
                    {flashSale.salePrice} (was {flashSale.originalPrice}) — Tap to view in Shop
                  </Text>
                </View>
                <View style={styles.flashSaleTeaserBadge}>
                  <Text style={styles.flashSaleTeaserBadgeText}>SALE</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* 30-day login calendar - hidden for day 1 new players */}
        {showDailyRewards && (() => {
          const calendarDay = Math.min(Math.max(loginCycleDay, 1), 30);
          return (
            <LinearGradient
              colors={GRADIENTS.surfaceCard}
              style={[styles.rewardsPanel, SHADOWS.medium]}
            >
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Login Calendar</Text>
                <Text style={styles.panelMeta}>Day {calendarDay} of 30</Text>
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: 30 }, (_, i) => {
                  const dayNum = i + 1;
                  const reward = ECONOMY.loginRewards[i] || ECONOMY.loginRewards[(i) % 7];
                  const isClaimed = dayNum < calendarDay;
                  const isToday = dayNum === calendarDay;
                  const isUpcoming = dayNum > calendarDay;
                  const isSpecial = dayNum % 7 === 0;
                  const isGrand = dayNum === 30;

                  const rewardIcon = reward.rareTile
                    ? '✨'
                    : (reward.gems && reward.gems >= 10)
                      ? '💎'
                      : reward.hints
                        ? '💡'
                        : '🪙';

                  return (
                    <View
                      key={dayNum}
                      style={[
                        styles.calendarDayOuter,
                        (isSpecial || isGrand) && styles.calendarDaySpecialOuter,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isGrand && isClaimed
                            ? ['rgba(168,85,247,0.35)', 'rgba(168,85,247,0.12)']
                            : isGrand && isToday
                              ? ['rgba(168,85,247,0.45)', 'rgba(255,215,0,0.25)']
                              : isGrand
                                ? ['rgba(168,85,247,0.18)', 'rgba(168,85,247,0.06)']
                                : isClaimed
                                  ? ['rgba(76,175,80,0.28)', 'rgba(76,175,80,0.08)']
                                  : isToday
                                    ? ['rgba(255,215,0,0.28)', 'rgba(255,159,0,0.12)']
                                    : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
                        }
                        style={[
                          styles.calendarDay,
                          (isSpecial || isGrand) && styles.calendarDaySpecial,
                          isClaimed && styles.calendarDayClaimed,
                          isToday && styles.calendarDayToday,
                          isGrand && isToday && styles.calendarDayGrandToday,
                          isUpcoming && styles.calendarDayUpcoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayNum,
                            isClaimed && styles.calendarDayNumClaimed,
                            isToday && styles.calendarDayNumToday,
                            isGrand && styles.calendarDayNumGrand,
                            isUpcoming && styles.calendarDayNumUpcoming,
                          ]}
                        >
                          {dayNum}
                        </Text>
                        {isClaimed ? (
                          <Text style={styles.calendarCheckmark}>✓</Text>
                        ) : isGrand ? (
                          <Text style={styles.calendarGrandIcon}>🏆</Text>
                        ) : (
                          <Text style={[styles.calendarRewardIcon, isUpcoming && styles.calendarRewardIconDimmed]}>
                            {rewardIcon}
                          </Text>
                        )}
                        {isSpecial && !isGrand && (
                          <View style={styles.calendarSpecialBadge}>
                            <Text style={styles.calendarSpecialBadgeText}>x{Math.floor(dayNum / 7)}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>
              {/* Grand prize label for day 30 */}
              <View style={styles.calendarGrandRow}>
                <Text style={styles.calendarGrandLabel}>Day 30: GRAND PRIZE</Text>
                <Text style={styles.calendarGrandReward}>🪙1000  💎100  ✨Rare Tile  🎨Exclusive</Text>
              </View>
              {/* Claim button for today */}
              <Pressable
                style={({ pressed }) => [pressed && styles.buttonPressed]}
                onPress={() => onClaimLoginReward ? onClaimLoginReward() : onPlay()}
              >
                <LinearGradient
                  colors={GRADIENTS.button.gold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.calendarClaimButton}
                >
                  <Text style={styles.calendarClaimText}>
                    CLAIM DAY {Math.min(Math.max(loginCycleDay, 1), 30)} REWARD
                  </Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          );
        })()}

        {/* Recommended for You */}
        {recommendation && playerStage !== 'new' && (
          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={recommendation.action}
          >
            <LinearGradient
              colors={GRADIENTS.surfaceCard}
              style={[styles.recommendCard, SHADOWS.medium]}
            >
              <Text style={styles.recommendIcon}>{recommendation.icon}</Text>
              <View style={styles.recommendContent}>
                <Text style={styles.recommendLabel}>RECOMMENDED FOR YOU</Text>
                <Text style={styles.recommendTitle}>{recommendation.title}</Text>
                <Text style={styles.recommendSubtitle}>{recommendation.subtitle}</Text>
              </View>
              <Text style={styles.recommendArrow}>→</Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Quick play - hidden for new and early players */}
        {showQuickPlay && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.quickPlayPanel, SHADOWS.medium]}
          >
            <Text style={styles.panelTitle}>Quick play</Text>
            <View style={styles.quickPlayGrid}>
              {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((difficulty) => (
                <Pressable
                  key={difficulty}
                  style={({ pressed }) => [pressed && styles.buttonPressed]}
                  onPress={() => onPlay(difficulty)}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
                    style={[styles.quickPlayCard, SHADOWS.soft]}
                  >
                    <View style={[styles.quickPlayIconBg, { backgroundColor: difficultyMeta[difficulty].accent + '22' }]}>
                      <Text style={styles.quickPlayIcon}>{difficultyMeta[difficulty].icon}</Text>
                    </View>
                    <Text style={[styles.quickPlayTitle, { color: difficultyMeta[difficulty].accent }]}>
                      {difficultyMeta[difficulty].label}
                    </Text>
                    <View style={[styles.quickPlayAccentBar, { backgroundColor: difficultyMeta[difficulty].accent }]} />
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </LinearGradient>
        )}
      </Animated.View>
    </ScrollView>
      {/* Streak shield contextual offer */}
      {showStreakOffer && (
        <ContextualOffer
          type="streak_shield"
          context={{ streakDays: progress.currentStreak }}
          onAccept={handleStreakOfferAccept}
          onDismiss={handleStreakOfferDismiss}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.soft,
  },
  iconButtonText: {
    fontSize: 20,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  currencyIcon: {
    width: 16,
    height: 16,
  },
  currencyLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  shopButtonWrapper: {
    position: 'relative',
    width: 60,
    height: 36,
  },
  shopButtonImage: {
    width: '100%',
    height: '100%',
  },
  shopButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopButtonText: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 13,
  },
  heroCard: {
    padding: 24,
    marginBottom: 18,
  },
  heroLogo: {
    width: '100%',
    height: 180,
    marginBottom: 8,
    alignSelf: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 20,
    maxWidth: '90%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCardWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    aspectRatio: 1,
  },
  statCardImage: {
    width: '100%',
    height: '100%',
  },
  statCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.display,
    marginBottom: 3,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowRadius: 4,
  },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: FONTS.bodyBold,
  },
  playButtonWrapper: {
    position: 'relative',
    width: '100%',
    height: 120,
    marginBottom: 12,
  },
  playButtonImage: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  playButtonLabel: {
    color: '#fff',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  playButtonLevel: {
    color: '#fff',
    fontSize: 22,
    fontFamily: FONTS.display,
  },
  playButtonArrow: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONTS.display,
  },
  dailyCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDone: {
    borderColor: 'rgba(76,175,80,0.3)',
  },
  dailyContent: {
    flex: 1,
  },
  dailyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  dailySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  dailyBadge: {
    color: COLORS.gold,
    fontSize: 24,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  // Mission panel
  missionPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  missionRow: {
    marginBottom: 10,
  },
  missionInfo: {
    marginBottom: 4,
  },
  missionLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
  },
  missionLabelDone: {
    color: COLORS.green,
  },
  missionBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  missionBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  missionBarDone: {
    backgroundColor: COLORS.green,
  },
  // Weekly Goals
  weeklyGoalsPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  weeklyGoalRow: {
    marginBottom: 12,
  },
  weeklyGoalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weeklyGoalLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
  weeklyGoalLabelDone: {
    color: COLORS.green,
  },
  weeklyGoalProgress: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  weeklyGoalBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 2,
  },
  weeklyGoalBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  weeklyGoalReward: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    textAlign: 'right',
  },
  weeklyBonusBanner: {
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  weeklyBonusText: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.display,
  },
  // Streak
  streakPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.bodyBold,
  },
  panelMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakCount: {
    color: COLORS.orange,
    fontSize: 22,
    fontFamily: FONTS.display,
    minWidth: 28,
    textAlign: 'center',
    textShadowColor: COLORS.orangeGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 999,
  },
  streakTarget: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    minWidth: 28,
    textAlign: 'center',
  },
  rewardsPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  calendarDayOuter: {
    width: '15.5%',
    aspectRatio: 1,
  },
  calendarDaySpecialOuter: {
    width: '15.5%',
  },
  calendarDay: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calendarDaySpecial: {
    borderColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1.5,
  },
  calendarDayClaimed: {
    borderColor: 'rgba(76,175,80,0.35)',
  },
  calendarDayToday: {
    borderColor: 'rgba(255,215,0,0.5)',
    borderWidth: 2,
    ...SHADOWS.glow(COLORS.gold),
  },
  calendarDayGrandToday: {
    borderColor: 'rgba(168,85,247,0.6)',
    ...SHADOWS.glow(COLORS.purple),
  },
  calendarDayUpcoming: {
    opacity: 0.45,
  },
  calendarDayNum: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
    fontSize: 10,
    lineHeight: 14,
  },
  calendarDayNumClaimed: {
    color: COLORS.green,
  },
  calendarDayNumToday: {
    color: COLORS.gold,
    fontSize: 11,
  },
  calendarDayNumGrand: {
    color: COLORS.purple,
    fontSize: 11,
  },
  calendarDayNumUpcoming: {
    color: COLORS.textSecondary,
  },
  calendarCheckmark: {
    color: COLORS.green,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONTS.bodyBold,
  },
  calendarRewardIcon: {
    fontSize: 12,
    lineHeight: 16,
  },
  calendarRewardIconDimmed: {
    opacity: 0.6,
  },
  calendarGrandIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  calendarSpecialBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  calendarSpecialBadgeText: {
    color: '#0a0e27',
    fontSize: 7,
    fontFamily: FONTS.bodyBold,
    lineHeight: 10,
  },
  calendarGrandRow: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168,85,247,0.15)',
  },
  calendarGrandLabel: {
    color: COLORS.purple,
    fontFamily: FONTS.display,
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 4,
  },
  calendarGrandReward: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  calendarClaimButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  calendarClaimText: {
    color: '#0a0e27',
    fontFamily: FONTS.display,
    fontSize: 14,
    letterSpacing: 1,
  },
  recommendCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  recommendIcon: {
    fontSize: 32,
  },
  recommendContent: {
    flex: 1,
  },
  recommendLabel: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  recommendTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  recommendSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendArrow: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    color: COLORS.accent,
  },
  quickPlayPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  quickPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  quickPlayCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 150,
    flex: 1,
  },
  quickPlayIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickPlayIcon: {
    fontSize: 20,
  },
  quickPlayTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickPlayAccentBar: {
    width: 24,
    height: 3,
    borderRadius: 999,
    opacity: 0.6,
  },
  // Daily Deal
  dealPanel: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    marginBottom: 14,
  },
  dealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealInfo: {
    flex: 1,
    marginRight: 12,
  },
  dealName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  dealDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealOriginalPrice: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    textDecorationLine: 'line-through' as const,
  },
  dealSalePrice: {
    color: COLORS.gold,
    fontSize: 16,
    fontFamily: FONTS.display,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  dealBuyButton: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dealBuyText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 2,
  },
  // Flash Sale Teaser
  flashSaleTeaser: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.coral + '40',
  },
  flashSaleTeaserRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
  },
  flashSaleTeaserIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  flashSaleTeaserInfo: {
    flex: 1,
  },
  flashSaleTeaserTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.coral,
    marginBottom: 2,
  },
  flashSaleTeaserSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  flashSaleTeaserBadge: {
    backgroundColor: COLORS.coral,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  flashSaleTeaserBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },

  // Mystery Wheel Button
  mysteryWheelButton: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    gap: 12,
  },
  mysteryWheelButtonGlow: {
    borderColor: COLORS.purple + '50',
    ...SHADOWS.glow(COLORS.purple),
  },
  mysteryWheelIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(168,85,247,0.18)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mysteryWheelIcon: {
    fontSize: 24,
  },
  mysteryWheelContent: {
    flex: 1,
  },
  mysteryWheelTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  mysteryWheelSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  mysteryWheelBadge: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  mysteryWheelBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: FONTS.display,
  },
  dailySpinBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dailySpinBadgeText: {
    color: COLORS.bg,
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
  },
  mysteryWheelArrow: {
    color: COLORS.purple,
    fontSize: 12,
    opacity: 0.6,
  },
  // Free Spin Toast
  freeSpinToast: {
    position: 'absolute' as const,
    top: 110,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  freeSpinToastInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOWS.medium,
  },
  freeSpinToastIcon: {
    fontSize: 18,
  },
  freeSpinToastText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },

  // Event Banners
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    ...SHADOWS.soft,
  },
  eventBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  eventBannerInfo: {
    flex: 1,
  },
  eventBannerLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  eventBannerName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  eventBannerArrow: {
    fontSize: 24,
  },
});
