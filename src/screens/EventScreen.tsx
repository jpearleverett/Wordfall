import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';

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
        <View style={[styles.banner, { borderColor: data.bannerColor }]}>
          <View
            style={[styles.bannerGlow, { backgroundColor: data.bannerColor + '15' }]}
          />
          <Text style={styles.bannerIcon}>{data.bannerIcon}</Text>
          <Text style={[styles.bannerName, { color: data.bannerColor }]}>
            {data.name}
          </Text>
          <View style={[styles.timerBadge, { backgroundColor: data.bannerColor + '20' }]}>
            <Text style={[styles.timerText, { color: data.bannerColor }]}>
              {timeRemaining} remaining
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>{data.description}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Event Progress</Text>
            <Text style={styles.progressValue}>
              {progress} / {data.totalSteps}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progressPercent, 100)}%`,
                  backgroundColor: data.bannerColor,
                },
              ]}
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
        </View>

        {/* Event Puzzles */}
        <View style={styles.puzzlesSection}>
          <View style={styles.puzzlesHeader}>
            <Text style={styles.sectionTitle}>Event Puzzles</Text>
            <TouchableOpacity style={styles.playAllBtn} onPress={onPlayEventPuzzle}>
              <Text style={styles.playAllText}>Play Next</Text>
            </TouchableOpacity>
          </View>
          {data.puzzles.map((puzzle) => (
            <TouchableOpacity
              key={puzzle.id}
              style={[
                styles.puzzleRow,
                puzzle.completed && styles.puzzleRowComplete,
              ]}
              onPress={onPlayEventPuzzle}
              activeOpacity={0.7}
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Event Shop Button */}
        <TouchableOpacity style={styles.shopButton} onPress={onOpenEventShop}>
          <Text style={styles.shopButtonIcon}>🛍️</Text>
          <View style={styles.shopButtonInfo}>
            <Text style={styles.shopButtonTitle}>Event Shop</Text>
            <Text style={styles.shopButtonDesc}>
              Spend tokens on exclusive items
            </Text>
          </View>
          <Text style={styles.shopChevron}>›</Text>
        </TouchableOpacity>

        {/* Leaderboard Preview */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Event Leaderboard</Text>
          <View style={styles.leaderboardCard}>
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
                  <View style={styles.leaderboardAvatar}>
                    <Text style={styles.leaderboardAvatarText}>
                      {entry.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.leaderboardName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.leaderboardScore}>
                    {entry.score.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  bannerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bannerIcon: {
    fontSize: 52,
    marginBottom: 10,
  },
  bannerName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1,
  },
  timerBadge: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  descCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  descText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  progressSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: COLORS.cellDefault,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rewardCircleReached: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '15',
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardMilestone: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  playAllBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.bg,
  },
  puzzleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  puzzleRowComplete: {
    backgroundColor: COLORS.cellFound,
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
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  puzzleInfo: {
    flex: 1,
  },
  puzzleName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  puzzleNameComplete: {
    color: COLORS.green,
  },
  puzzleDifficulty: {
    fontSize: 12,
    fontWeight: '600',
  },
  puzzleChevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold + '15',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
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
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: 2,
  },
  shopButtonDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  shopChevron: {
    fontSize: 24,
    color: COLORS.gold,
    fontWeight: '300',
  },
  leaderboardSection: {
    marginBottom: 14,
  },
  leaderboardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    marginTop: 10,
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
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 32,
    textAlign: 'center',
    marginRight: 8,
  },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  leaderboardAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default EventScreen;
