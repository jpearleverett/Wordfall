import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';

const { width } = Dimensions.get('window');

interface EventData {
  name: string;
  description: string;
  bannerColor?: string;
  bannerIcon?: string;
  endTime: number;
  totalSteps: number;
  rewards: Array<{ milestone: number; reward: string; icon: string }>;
  puzzles: Array<{ id: string; name: string; difficulty: string; completed: boolean }>;
  leaderboard: Array<{ name: string; score: number }>;
}

interface EventScreenProps {
  event?: any;
  progress?: number;
  onPlayEventPuzzle?: () => void;
  onOpenEventShop?: () => void;
}

const EventScreen: React.FC<EventScreenProps> = ({
  event,
  progress: progressProp,
  onPlayEventPuzzle: onPlayEventPuzzleProp,
  onOpenEventShop: onOpenEventShopProp,
}) => {
  const progress = progressProp ?? 0;
  const onPlayEventPuzzle = onPlayEventPuzzleProp ?? (() => {});
  const onOpenEventShop = onOpenEventShopProp ?? (() => {});
  const [timeRemaining, setTimeRemaining] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const data: EventData = {
    name: event?.name ?? 'Spring Festival',
    description:
      event?.description ??
      'Celebrate the season with special puzzles and exclusive rewards! Complete event puzzles to earn Spring Tokens.',
    bannerColor: event?.bannerColor ?? COLORS.accent,
    bannerIcon: event?.bannerIcon ?? '🌸',
    endTime: event?.endTime ?? Date.now() + 5 * 24 * 60 * 60 * 1000,
    totalSteps: event?.totalSteps ?? 100,
    rewards: event?.rewards ?? [
      { milestone: 25, reward: '500 Coins', icon: '🪙' },
      { milestone: 50, reward: 'Rare Frame', icon: '🖼️' },
      { milestone: 75, reward: '100 Gems', icon: '💎' },
      { milestone: 100, reward: 'Exclusive Title', icon: '👑' },
    ],
    puzzles: event?.puzzles ?? [
      { id: 'e1', name: 'Spring Bloom', difficulty: 'Easy', completed: false },
      { id: 'e2', name: 'April Showers', difficulty: 'Medium', completed: false },
      { id: 'e3', name: 'Garden Path', difficulty: 'Medium', completed: false },
      { id: 'e4', name: 'Butterfly Effect', difficulty: 'Hard', completed: false },
      { id: 'e5', name: 'Rainbow Bridge', difficulty: 'Expert', completed: false },
    ],
    leaderboard: event?.leaderboard ?? [
      { name: 'StarPlayer', score: 9500 },
      { name: 'WordMaster', score: 8200 },
      { name: 'PuzzleKing', score: 7800 },
      { name: 'LexiconPro', score: 6400 },
      { name: 'BrainWave', score: 5900 },
    ],
  };

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, data.endTime - Date.now());
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        );
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data.endTime]);

  const progressPercent = data.totalSteps > 0 ? (progress / data.totalSteps) * 100 : 0;

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return COLORS.green;
      case 'medium':
        return COLORS.gold;
      case 'hard':
        return COLORS.coral;
      case 'expert':
        return COLORS.purple;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Banner */}
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          style={[styles.banner, { borderColor: data.bannerColor }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={[data.bannerColor + '25', 'transparent'] as [string, string]}
            style={styles.bannerGlow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <Text style={styles.bannerIcon}>{data.bannerIcon}</Text>
          <Text style={[styles.bannerName, { color: data.bannerColor, textShadowColor: data.bannerColor + '60' }]}>
            {data.name}
          </Text>
          <LinearGradient
            colors={[data.bannerColor + '30', data.bannerColor + '10'] as [string, string]}
            style={styles.timerBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.timerText, { color: data.bannerColor }]}>
              {timeRemaining} remaining
            </Text>
          </LinearGradient>
        </LinearGradient>

        {/* Description */}
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          style={styles.descCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.descText}>{data.description}</Text>
        </LinearGradient>

        {/* Progress Bar */}
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          style={styles.progressSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Event Progress</Text>
            <Text style={styles.progressValue}>
              {progress} / {data.totalSteps}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={[data.bannerColor ?? COLORS.accent, (data.bannerColor ?? COLORS.accent) + 'CC'] as [string, string]}
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {/* Milestone markers */}
            {data.rewards.map((reward) => {
              const markerPos = (reward.milestone / data.totalSteps) * 100;
              const isReached = progress >= reward.milestone;
              return (
                <View
                  key={reward.milestone}
                  style={[
                    styles.milestoneMarker,
                    { left: `${markerPos}%` },
                    isReached && { backgroundColor: data.bannerColor },
                  ]}
                />
              );
            })}
          </View>

          {/* Rewards */}
          <View style={styles.rewardsRow}>
            {data.rewards.map((reward) => {
              const isReached = progress >= reward.milestone;
              return (
                <View key={reward.milestone} style={styles.rewardItem}>
                  <View
                    style={[
                      styles.rewardCircle,
                      isReached && styles.rewardCircleReached,
                      isReached && {
                        shadowColor: COLORS.gold,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        elevation: 8,
                      },
                    ]}
                  >
                    <Text style={styles.rewardIcon}>
                      {isReached ? reward.icon : '🔒'}
                    </Text>
                  </View>
                  <Text style={styles.rewardMilestone}>{reward.milestone}</Text>
                  <Text
                    style={[styles.rewardName, isReached && styles.rewardNameReached]}
                    numberOfLines={2}
                  >
                    {reward.reward}
                  </Text>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        {/* Event Puzzles */}
        <View style={styles.puzzlesSection}>
          <View style={styles.puzzlesHeader}>
            <Text style={styles.sectionTitle}>Event Puzzles</Text>
            <TouchableOpacity onPress={onPlayEventPuzzle} activeOpacity={0.8}>
              <LinearGradient
                colors={[...GRADIENTS.button.primary] as [string, string, ...string[]]}
                style={styles.playAllBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.playAllText}>Play Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {data.puzzles.map((puzzle) => (
            <TouchableOpacity
              key={puzzle.id}
              onPress={onPlayEventPuzzle}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  puzzle.completed
                    ? ([COLORS.cellFound, '#122e1e'] as [string, string])
                    : ([...GRADIENTS.surfaceCard] as [string, string])
                }
                style={[
                  styles.puzzleRow,
                  puzzle.completed && styles.puzzleRowComplete,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View
                  style={[
                    styles.puzzleDot,
                    puzzle.completed
                      ? { backgroundColor: COLORS.green }
                      : { backgroundColor: COLORS.cellDefault },
                  ]}
                >
                  {puzzle.completed && (
                    <Text style={styles.puzzleCheck}>✓</Text>
                  )}
                </View>
                <View style={styles.puzzleInfo}>
                  <Text
                    style={[
                      styles.puzzleName,
                      puzzle.completed && styles.puzzleNameComplete,
                    ]}
                  >
                    {puzzle.name}
                  </Text>
                  <Text
                    style={[
                      styles.puzzleDifficulty,
                      { color: getDifficultyColor(puzzle.difficulty) },
                    ]}
                  >
                    {puzzle.difficulty}
                  </Text>
                </View>
                <Text style={styles.puzzleChevron}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Shop Button */}
        <TouchableOpacity onPress={onOpenEventShop} activeOpacity={0.8}>
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.gold + '08'] as [string, string]}
            style={styles.shopButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.shopButtonIcon}>🛍️</Text>
            <View style={styles.shopButtonInfo}>
              <Text style={styles.shopButtonTitle}>Event Shop</Text>
              <Text style={styles.shopButtonDesc}>
                Spend tokens on exclusive items
              </Text>
            </View>
            <Text style={styles.shopChevron}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Leaderboard Preview */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Event Leaderboard</Text>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={styles.leaderboardCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {data.leaderboard.slice(0, 5).map((entry, index) => (
              <View key={index}>
                {index > 0 && <View style={styles.leaderboardDivider} />}
                <View style={styles.leaderboardRow}>
                  <Text
                    style={[
                      styles.leaderboardRank,
                      index < 3 && { color: ['#FFD700', '#C0C0C0', '#CD7F32'][index] },
                    ]}
                  >
                    {index < 3
                      ? ['🥇', '🥈', '🥉'][index]
                      : `${index + 1}`}
                  </Text>
                  <View
                    style={[
                      styles.leaderboardAvatar,
                      index < 3 && {
                        borderWidth: 2,
                        borderColor: ['#FFD700', '#C0C0C0', '#CD7F32'][index],
                        shadowColor: ['#FFD700', '#C0C0C0', '#CD7F32'][index],
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4,
                        shadowRadius: 6,
                        elevation: 4,
                      },
                    ]}
                  >
                    <Text style={styles.leaderboardAvatarText}>
                      {entry.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.leaderboardName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={[
                    styles.leaderboardScore,
                    index < 3 && { color: ['#FFD700', '#C0C0C0', '#CD7F32'][index] },
                  ]}>
                    {entry.score.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

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
  },
  banner: {
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    ...SHADOWS.strong,
  },
  bannerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bannerIcon: {
    fontSize: 60,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  bannerName: {
    fontSize: 28,
    fontFamily: FONTS.display,
    marginBottom: 10,
    letterSpacing: 1.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  timerBadge: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timerText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  descCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  descText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  progressSection: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  progressValue: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  progressBarBg: {
    height: 16,
    backgroundColor: 'rgba(42, 48, 96, 0.6)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  milestoneMarker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 16,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    marginLeft: -2,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rewardItem: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  rewardCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...SHADOWS.soft,
  },
  rewardCircleReached: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '18',
    borderWidth: 2,
    ...SHADOWS.glow(COLORS.gold),
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardMilestone: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  rewardName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  rewardNameReached: {
    color: COLORS.gold,
    fontFamily: FONTS.bodySemiBold,
  },
  puzzlesSection: {
    marginBottom: 14,
  },
  puzzlesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  playAllBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    ...SHADOWS.glow(COLORS.accent),
  },
  playAllText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  puzzleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  puzzleRowComplete: {
    borderColor: COLORS.green + '40',
  },
  puzzleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  puzzleCheck: {
    fontSize: 13,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
  },
  puzzleInfo: {
    flex: 1,
  },
  puzzleName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  puzzleNameComplete: {
    color: COLORS.green,
  },
  puzzleDifficulty: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  puzzleChevron: {
    fontSize: 22,
    color: COLORS.textMuted,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    ...SHADOWS.glow(COLORS.gold),
  },
  shopButtonIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  shopButtonInfo: {
    flex: 1,
  },
  shopButtonTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
    marginBottom: 2,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  shopButtonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shopChevron: {
    fontSize: 24,
    color: COLORS.gold,
  },
  leaderboardSection: {
    marginBottom: 14,
  },
  leaderboardCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
    ...SHADOWS.medium,
  },
  leaderboardDivider: {
    height: 1,
    backgroundColor: COLORS.bgLight,
    marginHorizontal: 14,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  leaderboardRank: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
    width: 32,
    textAlign: 'center',
    marginRight: 8,
  },
  leaderboardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(37, 43, 94, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  leaderboardAvatarText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  leaderboardScore: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default EventScreen;
