import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { getCurrentEvent } from '../data/events';
import { EventExclusiveReward } from '../types';
import { eventManager, ActiveEvent, EventRewardTierDisplay } from '../services/eventManager';
import { useEconomy } from '../contexts/EconomyContext';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');

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
  const economy = useEconomy();
  const player = usePlayer();
  const onPlayEventPuzzle = onPlayEventPuzzleProp ?? (() => {});
  const onOpenEventShop = onOpenEventShopProp ?? (() => {});
  const [timeRemaining, setTimeRemaining] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [claimAnim] = useState(new Animated.Value(1));

  // Fetch active events from the event manager
  useEffect(() => {
    const events = eventManager.getActiveEvents();
    setActiveEvents(events);
  }, []);

  // Get the primary event (main or first active)
  const primaryEvent = activeEvents.find(e => e.type === 'main') || activeEvents[0];
  const endTime = primaryEvent?.endTime ?? (event?.endTime ?? Date.now() + 5 * 24 * 60 * 60 * 1000);

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
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
  }, [endTime]);

  // Claim a reward tier
  const handleClaimReward = useCallback((eventId: string, tier: string) => {
    const reward = eventManager.claimEventReward(eventId, tier);
    if (reward) {
      if (reward.coins) economy.addCoins(reward.coins);
      if (reward.gems) economy.addGems(reward.gems);
      if (reward.hintTokens) economy.addHintTokens(reward.hintTokens);

      // Animate claim
      Animated.sequence([
        Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();

      // Refresh events and persist claimed state to PlayerContext/AsyncStorage
      setActiveEvents(eventManager.getActiveEvents());
      player.updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
    }
  }, [economy, claimAnim, player]);

  // Claim the exclusive cosmetic reward (frame/title/decoration) at Gold tier
  const handleClaimExclusiveReward = useCallback(() => {
    if (!exclusiveReward || !primaryEvent) return;

    player.unlockCosmetic(exclusiveReward.id);
    eventManager.claimExclusiveReward(primaryEvent.id);

    Animated.sequence([
      Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    setActiveEvents(eventManager.getActiveEvents());
    player.updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
  }, [exclusiveReward, primaryEvent, player, claimAnim]);

  // Get the current event's exclusive reward
  const currentEvent = getCurrentEvent();
  const exclusiveReward: EventExclusiveReward | undefined =
    event?.exclusiveReward ?? currentEvent?.exclusiveReward;
  const isTimeLimited: boolean = event?.isTimeLimited ?? currentEvent?.isTimeLimited ?? false;

  // Exclusive reward claim state
  const goldTierReached = primaryEvent?.rewards?.find(r => r.tier === 'gold')?.reached ?? false;
  const exclusiveAlreadyClaimed = exclusiveReward
    ? player.unlockedCosmetics.includes(exclusiveReward.id)
    : false;
  const canClaimExclusive = goldTierReached && !exclusiveAlreadyClaimed && !!exclusiveReward;

  // Multiplier display
  const multipliers = eventManager.getEventMultipliers();
  const hasActiveMultipliers = multipliers.coins > 1 || multipliers.xp > 1 || multipliers.rareTileChance > 1;

  const getRewardTypeIcon = (type: string): string => {
    switch (type) {
      case 'frame': return '\u{1F5BC}\u{FE0F}';
      case 'title': return '\u{1F3F7}\u{FE0F}';
      case 'decoration': return '\u{1F3A8}';
      default: return '\u{1F381}';
    }
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return COLORS.rarityLegendary;
      case 'epic': return COLORS.rarityEpic;
      case 'rare': return COLORS.rarityRare;
      default: return COLORS.rarityCommon;
    }
  };

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

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'main': return COLORS.accent;
      case 'mini': return COLORS.teal;
      case 'weekend_blitz': return COLORS.orange;
      case 'win_streak': return COLORS.gold;
      default: return COLORS.accent;
    }
  };

  const getEventTypeLabel = (type: string): string => {
    switch (type) {
      case 'main': return 'WEEKLY EVENT';
      case 'mini': return 'MINI EVENT';
      case 'weekend_blitz': return 'WEEKEND BLITZ';
      case 'win_streak': return 'WIN STREAK';
      default: return 'EVENT';
    }
  };

  const formatCountdown = (endMs: number): string => {
    const remaining = Math.max(0, endMs - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="event" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Event Multipliers Banner */}
        {hasActiveMultipliers && (
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.orange + '10'] as [string, string]}
            style={styles.multiplierBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.multiplierIcon}>{'\u{26A1}'}</Text>
            <View style={styles.multiplierInfo}>
              <Text style={styles.multiplierTitle}>ACTIVE BONUSES</Text>
              <View style={styles.multiplierRow}>
                {multipliers.coins > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.coins}x Coins</Text>
                  </View>
                )}
                {multipliers.xp > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.xp}x XP</Text>
                  </View>
                )}
                {multipliers.rareTileChance > 1 && (
                  <View style={styles.multiplierChip}>
                    <Text style={styles.multiplierChipText}>{multipliers.rareTileChance}x Rare Tiles</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Active Events List */}
        {activeEvents.map((activeEvent) => {
          const color = getEventTypeColor(activeEvent.type);
          const progress = activeEvent.progress;
          const maxThreshold = activeEvent.rewards.length > 0
            ? activeEvent.rewards[activeEvent.rewards.length - 1].threshold
            : 100;
          const progressPercent = maxThreshold > 0 ? Math.min((progress / maxThreshold) * 100, 100) : 0;

          return (
            <LinearGradient
              key={activeEvent.id}
              colors={[...GRADIENTS.surfaceCard] as [string, string]}
              style={[styles.eventCard, { borderColor: color + '40' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Event Type Label */}
              <View style={[styles.eventTypeBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.eventTypeText, { color }]}>
                  {getEventTypeLabel(activeEvent.type)}
                </Text>
              </View>

              {/* Event Header */}
              <View style={styles.eventHeader}>
                <Text style={styles.eventIcon}>{activeEvent.icon}</Text>
                <View style={styles.eventTitleArea}>
                  <Text style={[styles.eventName, { color }]}>{activeEvent.name}</Text>
                  <Text style={styles.eventDesc}>{activeEvent.description}</Text>
                </View>
              </View>

              {/* Countdown */}
              <LinearGradient
                colors={[color + '15', color + '05'] as [string, string]}
                style={styles.countdownBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.countdownText, { color }]}>
                  {formatCountdown(activeEvent.endTime)} remaining
                </Text>
              </LinearGradient>

              {/* Progress Bar */}
              <View style={styles.eventProgressHeader}>
                <Text style={styles.eventProgressLabel}>Progress</Text>
                <Text style={styles.eventProgressValue}>
                  {progress} / {maxThreshold}
                </Text>
              </View>
              <View style={styles.eventProgressBarBg}>
                <LinearGradient
                  colors={[color, color + 'CC'] as [string, string]}
                  style={[styles.eventProgressBarFill, { width: `${progressPercent}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>

              {/* Reward Tiers */}
              <View style={styles.rewardTiersRow}>
                {activeEvent.rewards.map((reward) => {
                  const canClaim = reward.reached && !reward.claimed;
                  return (
                    <TouchableOpacity
                      key={reward.tier}
                      onPress={() => canClaim && handleClaimReward(activeEvent.id, reward.tier)}
                      disabled={!canClaim}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${reward.tier} tier reward${reward.claimed ? ', claimed' : reward.reached ? ', tap to claim' : ', locked'}`}
                    >
                      <View style={[
                        styles.rewardTierItem,
                        reward.reached && !reward.claimed && styles.rewardTierClaimable,
                        reward.claimed && styles.rewardTierClaimed,
                      ]}>
                        <View style={[
                          styles.rewardTierCircle,
                          reward.reached && { borderColor: color, backgroundColor: color + '18' },
                          reward.claimed && { borderColor: COLORS.green, backgroundColor: COLORS.green + '18' },
                        ]}>
                          <Text style={styles.rewardTierIcon}>
                            {reward.claimed ? '\u{2705}' : reward.reached ? '\u{1F381}' : '\u{1F512}'}
                          </Text>
                        </View>
                        <Text style={styles.rewardTierThreshold}>{reward.threshold}</Text>
                        <Text style={[
                          styles.rewardTierLabel,
                          reward.reached && { color: COLORS.textPrimary },
                          reward.claimed && { color: COLORS.green },
                        ]}>
                          {reward.tier.charAt(0).toUpperCase() + reward.tier.slice(1)}
                        </Text>
                        {canClaim && (
                          <View style={[styles.claimButton, { backgroundColor: color }]}>
                            <Text style={styles.claimButtonText}>Claim</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          );
        })}

        {/* No Active Events Fallback */}
        {activeEvents.length === 0 && (
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={styles.emptyCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.emptyIcon}>{'\u{1F3AE}'}</Text>
            <Text style={styles.emptyTitle}>No Active Events</Text>
            <Text style={styles.emptyDesc}>Check back soon for new events and challenges!</Text>
          </LinearGradient>
        )}

        {/* Limited Time Exclusive Reward */}
        {isTimeLimited && exclusiveReward && (
          <LinearGradient
            colors={[COLORS.gold + '18', COLORS.rarityLegendary + '08'] as [string, string]}
            style={styles.exclusiveCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={[COLORS.gold + '20', 'transparent'] as [string, string]}
              style={styles.exclusiveGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <View style={styles.exclusiveLabelRow}>
              <Text style={styles.exclusiveLabelIcon}>{'\u{231B}'}</Text>
              <Text style={styles.exclusiveLabel}>LIMITED TIME EXCLUSIVE</Text>
            </View>
            <View style={styles.exclusiveContent}>
              <View style={[
                styles.exclusiveIconCircle,
                { borderColor: getRarityColor(exclusiveReward.rarity), ...SHADOWS.glow(getRarityColor(exclusiveReward.rarity)) },
              ]}>
                <Text style={styles.exclusiveIconText}>
                  {getRewardTypeIcon(exclusiveReward.type)}
                </Text>
              </View>
              <View style={styles.exclusiveInfo}>
                <Text style={styles.exclusiveRewardName}>
                  {exclusiveReward.name}
                </Text>
                <View style={styles.exclusiveMetaRow}>
                  <View style={[
                    styles.exclusiveRarityBadge,
                    { backgroundColor: getRarityColor(exclusiveReward.rarity) + '25', borderColor: getRarityColor(exclusiveReward.rarity) + '60' },
                  ]}>
                    <Text style={[styles.exclusiveRarityText, { color: getRarityColor(exclusiveReward.rarity) }]}>
                      {exclusiveReward.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.exclusiveTypeText}>
                    {exclusiveReward.type.charAt(0).toUpperCase() + exclusiveReward.type.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            {exclusiveAlreadyClaimed ? (
              <View style={styles.exclusiveClaimedRow}>
                <Text style={styles.exclusiveClaimedIcon}>{'\u{2705}'}</Text>
                <Text style={styles.exclusiveClaimedText}>Claimed! Check your cosmetics.</Text>
              </View>
            ) : canClaimExclusive ? (
              <>
                <Text style={[styles.exclusiveHint, { color: COLORS.gold }]}>
                  Gold tier reached! Claim your exclusive reward below.
                </Text>
                <TouchableOpacity onPress={handleClaimExclusiveReward} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Claim exclusive reward: ${exclusiveReward?.name}`}>
                  <LinearGradient
                    colors={[COLORS.gold, COLORS.rarityEpic] as [string, string]}
                    style={styles.exclusiveClaimBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.exclusiveClaimBtnText}>Claim Reward</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.exclusiveTimerRow}>
                  <Text style={styles.exclusiveTimerIcon}>{'\u{1F525}'}</Text>
                  <Text style={styles.exclusiveTimerText}>
                    Ends in {timeRemaining}
                  </Text>
                </View>
                <Text style={styles.exclusiveHint}>
                  Reach the Gold tier to unlock this exclusive reward!
                </Text>
              </>
            )}
          </LinearGradient>
        )}

        {/* Event Puzzles */}
        <View style={styles.puzzlesSection}>
          <View style={styles.puzzlesHeader}>
            <Text style={styles.sectionTitle}>Event Puzzles</Text>
            <TouchableOpacity onPress={onPlayEventPuzzle} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Play next event puzzle">
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
        </View>

        {/* Event Shop Button */}
        <TouchableOpacity onPress={onOpenEventShop} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Open event shop">
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.gold + '08'] as [string, string]}
            style={styles.shopButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.shopButtonIcon}>{'\u{1F6CD}\u{FE0F}'}</Text>
            <View style={styles.shopButtonInfo}>
              <Text style={styles.shopButtonTitle}>Event Shop</Text>
              <Text style={styles.shopButtonDesc}>
                Spend tokens on exclusive items
              </Text>
            </View>
            <Text style={styles.shopChevron}>{'\u{203A}'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Upcoming Events */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>Coming Up</Text>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={styles.upcomingCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.upcomingHint}>
              {eventManager.isWeekendBlitz()
                ? 'Weekend Blitz is active! Enjoy double XP and boosted rare tile drops.'
                : 'Weekend Blitz returns every Saturday & Sunday with 2x XP!'}
            </Text>
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

  // Multiplier Banner
  multiplierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    ...SHADOWS.glow(COLORS.gold),
  },
  multiplierIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  multiplierInfo: {
    flex: 1,
  },
  multiplierTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  multiplierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  multiplierChip: {
    backgroundColor: COLORS.gold + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  multiplierChipText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
  },

  // Event Card
  eventCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  eventTypeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.5,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIcon: {
    fontSize: 40,
    marginRight: 14,
  },
  eventTitleArea: {
    flex: 1,
  },
  eventName: {
    fontSize: 20,
    fontFamily: FONTS.display,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  eventDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  countdownBadge: {
    alignSelf: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  countdownText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    fontVariant: ['tabular-nums'],
  },

  // Event Progress
  eventProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventProgressLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  eventProgressValue: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  eventProgressBarBg: {
    height: 12,
    backgroundColor: 'rgba(42, 48, 96, 0.6)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  eventProgressBarFill: {
    height: '100%',
    borderRadius: 6,
  },

  // Reward Tiers
  rewardTiersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardTierItem: {
    alignItems: 'center',
    width: (width - 80) / 4,
    opacity: 0.6,
  },
  rewardTierClaimable: {
    opacity: 1,
  },
  rewardTierClaimed: {
    opacity: 0.8,
  },
  rewardTierCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rewardTierIcon: {
    fontSize: 18,
  },
  rewardTierThreshold: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textMuted,
  },
  rewardTierLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  claimButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  claimButtonText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },

  // Empty State
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    ...SHADOWS.medium,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Exclusive Reward
  exclusiveCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '50',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.gold),
  },
  exclusiveGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  exclusiveLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  exclusiveLabelIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  exclusiveLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.gold,
    letterSpacing: 2,
    textShadowColor: COLORS.gold + '60',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  exclusiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  exclusiveIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 22, 56, 0.8)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  exclusiveIconText: {
    fontSize: 26,
  },
  exclusiveInfo: {
    flex: 1,
  },
  exclusiveRewardName: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  exclusiveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exclusiveRarityBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginRight: 10,
  },
  exclusiveRarityText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
  exclusiveTypeText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textSecondary,
  },
  exclusiveTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exclusiveTimerIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  exclusiveTimerText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
    textShadowColor: COLORS.gold + '40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  exclusiveHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exclusiveClaimBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  exclusiveClaimBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
  },
  exclusiveClaimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  exclusiveClaimedIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  exclusiveClaimedText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.green,
  },

  // Puzzles
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

  // Shop Button
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

  // Upcoming
  upcomingSection: {
    marginBottom: 14,
  },
  upcomingCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.medium,
  },
  upcomingHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default EventScreen;
