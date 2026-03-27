import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ECONOMY, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { Difficulty, PlayerProgress, WeeklyGoalsState } from '../types';
import { soundManager } from '../services/sound';
import { VideoBackground } from '../components/common/VideoBackground';
import { getDailyDeal, DailyDeal } from '../data/dailyDeals';
import { LOCAL_IMAGES, LOCAL_VIDEOS } from '../utils/localAssets';
import NeonHighwayProgress from '../components/home/NeonHighwayProgress';
import NeonStreakFlame from '../components/home/NeonStreakFlame';

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
  onBuyDeal?: (deal: DailyDeal) => void;
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
  onBuyDeal,
  currencies,
  currentChapter = 1,
  loginCycleDay = 1,
  playerStage = 'new',
  weeklyGoals = null,
  dailyMissions = [],
  recommendation = null,
}: HomeScreenProps) {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

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

  const today = new Date().toISOString().split('T')[0];
  const dailyDone = progress.dailyCompleted.includes(today);
  const totalStars = Object.values(progress.starsByLevel).reduce((a, b) => a + b, 0);
  const dailyDeal = getDailyDeal(today);
  const dealHoursLeft = dailyDeal.availableHours;
  const nextMilestone = [7, 14, 30, 60, 100].find((milestone) => milestone > progress.currentStreak) || 100;
  const streakProgress = Math.min(100, (progress.currentStreak / nextMilestone) * 100);
  const currentRewardDay = ((loginCycleDay - 1) % 7) + 1;

  // Progressive disclosure flags
  const showStreak = playerStage !== 'new';
  const showDailyRewards = playerStage !== 'new';
  const showQuickPlay = playerStage !== 'new' && playerStage !== 'early';
  const showWeeklyGoals = (playerStage === 'established' || playerStage === 'veteran') && weeklyGoals;
  const showMissions = (playerStage === 'established' || playerStage === 'veteran') && dailyMissions.length > 0;

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

        {/* 7-day rewards - hidden for day 1 new players */}
        {showDailyRewards && (
          <LinearGradient
            colors={GRADIENTS.surfaceCard}
            style={[styles.rewardsPanel, SHADOWS.medium]}
          >
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>7-day rewards</Text>
              <Text style={styles.panelMeta}>Day {currentRewardDay}</Text>
            </View>
            <View style={styles.loginRewardsRow}>
              {ECONOMY.loginRewards.map((reward) => {
                const isPast = reward.day < currentRewardDay;
                const isToday = reward.day === currentRewardDay;
                return (
                  <LinearGradient
                    key={reward.day}
                    colors={
                      isToday
                        ? ['rgba(255,215,0,0.22)', 'rgba(255,159,0,0.10)']
                        : isPast
                          ? ['rgba(76,175,80,0.18)', 'rgba(76,175,80,0.06)']
                          : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
                    }
                    style={[
                      styles.loginDay,
                      isPast && styles.loginDayClaimed,
                      isToday && styles.loginDayToday,
                    ]}
                  >
                    <Text style={[styles.loginDayNum, isToday && styles.loginDayNumToday]}>{reward.day}</Text>
                    <Text style={styles.loginDayReward}>{isPast ? '✓' : `🪙${reward.coins}`}</Text>
                    {'gems' in reward && reward.gems ? <Text style={styles.loginDayBonus}>💎{reward.gems}</Text> : null}
                    {'rareTile' in reward && reward.rareTile ? <Text style={styles.loginDayBonus}>✨</Text> : null}
                  </LinearGradient>
                );
              })}
            </View>
          </LinearGradient>
        )}

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
    height: 90,
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
  loginRewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  loginDay: {
    width: 70,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  loginDayClaimed: {
    borderColor: 'rgba(76,175,80,0.3)',
  },
  loginDayToday: {
    borderColor: 'rgba(255,215,0,0.35)',
    ...SHADOWS.glow(COLORS.gold),
  },
  loginDayNum: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
    fontSize: 12,
    marginBottom: 4,
  },
  loginDayNumToday: {
    color: COLORS.gold,
  },
  loginDayReward: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  loginDayBonus: {
    color: COLORS.textSecondary,
    fontSize: 10,
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
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
});
