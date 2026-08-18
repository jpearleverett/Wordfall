import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, RADIUS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import SectionHeader from '../components/common/SectionHeader';
import IconMedallion from '../components/common/IconMedallion';
import PrimaryButton from '../components/common/PrimaryButton';
import NeonProgressBar from '../components/common/NeonProgressBar';
import EventLeaderboardCard from '../components/events/EventLeaderboardCard';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentEvent } from '../data/events';
import { EventExclusiveReward } from '../types';
import { eventManager, ActiveEvent, EventRewardTierDisplay } from '../services/eventManager';
import { useEconomyActions } from '../stores/economyStore';
import {
  usePlayerStore,
  usePlayerActions,
  selectOwnedDecorations,
  selectUnlockedCosmetics,
} from '../stores/playerStore';

/**
 * Self-contained 1Hz countdown leaf (same pattern as ShopScreen's
 * LiveCountdownText). Owning the interval here means the tick re-renders one
 * Text node instead of re-running the entire ~950-line EventScreen body every
 * second for the lifetime of the screen.
 */
const EventCountdownText = React.memo(function EventCountdownText({
  endTime,
  style,
}: {
  endTime: number;
  style: object;
}) {
  const format = useCallback(() => {
    const remaining = Math.max(0, endTime - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [endTime]);

  const [text, setText] = useState(() => format());

  useEffect(() => {
    setText(format());
    const interval = setInterval(() => setText(format()), 1000);
    return () => clearInterval(interval);
  }, [format]);

  return <Text style={style}>Ends in {text}</Text>;
});

/**
 * Event progress bar with milestone markers. Wraps the shared NeonProgressBar
 * and overlays one marker dot per reward tier at its threshold position so
 * the player can see exactly where the next payoff sits on the track.
 */
const MilestoneProgress = React.memo(function MilestoneProgress({
  progress,
  max,
  color,
  rewards,
}: {
  progress: number;
  max: number;
  color: string;
  rewards: EventRewardTierDisplay[];
}) {
  const frac = max > 0 ? Math.min(progress / max, 1) : 0;
  return (
    <View style={styles.milestoneWrap}>
      <NeonProgressBar progress={frac} color={color} height={12} />
      <View style={styles.milestoneOverlay} pointerEvents="none">
        {rewards.map((reward) => {
          const at = max > 0 ? Math.min(reward.threshold / max, 1) : 0;
          const reached = reward.reached;
          return (
            <View
              key={reward.tier}
              style={[
                styles.milestoneMarker,
                { left: `${at * 100}%` },
                reached
                  ? {
                      backgroundColor: color,
                      borderColor: '#fff',
                      ...SHADOWS.neonGlow(color),
                    }
                  : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
});

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
  const { addCoins, addGems, addHintTokens } = useEconomyActions();
  const { user } = useAuth();
  const ownedDecorations = usePlayerStore(selectOwnedDecorations);
  const unlockedCosmetics = usePlayerStore(selectUnlockedCosmetics);
  const { unlockCosmetic, unlockDecoration, updateProgress } = usePlayerActions();
  const onPlayEventPuzzle = onPlayEventPuzzleProp ?? (() => {});
  const onOpenEventShop = onOpenEventShopProp ?? (() => {});
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

  // Claim a reward tier
  const handleClaimReward = useCallback((eventId: string, tier: string) => {
    const reward = eventManager.claimEventReward(eventId, tier);
    if (reward) {
      if (reward.coins) addCoins(reward.coins);
      if (reward.gems) addGems(reward.gems);
      if (reward.hintTokens) addHintTokens(reward.hintTokens);

      // Animate claim
      Animated.sequence([
        Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();

      // Refresh events and persist claimed state to PlayerContext/AsyncStorage
      setActiveEvents(eventManager.getActiveEvents());
      updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
    }
  }, [addCoins, addGems, addHintTokens, claimAnim, updateProgress]);

  // Get the current event's exclusive reward (must be declared before the claim callback
  // that closes over it, otherwise TS flags a "used before declaration" error).
  const currentEvent = getCurrentEvent();
  const exclusiveReward: EventExclusiveReward | undefined =
    event?.exclusiveReward ?? currentEvent?.exclusiveReward;
  const isTimeLimited: boolean = event?.isTimeLimited ?? currentEvent?.isTimeLimited ?? false;

  // Claim the exclusive cosmetic reward (frame/title/decoration) at Gold tier
  const handleClaimExclusiveReward = useCallback(() => {
    if (!exclusiveReward || !primaryEvent) return;

    if (exclusiveReward.type === 'decoration') {
      unlockDecoration(exclusiveReward.id);
    } else {
      unlockCosmetic(exclusiveReward.id);
    }
    eventManager.claimExclusiveReward(primaryEvent.id);

    Animated.sequence([
      Animated.timing(claimAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(claimAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    setActiveEvents(eventManager.getActiveEvents());
    updateProgress({ eventProgress: eventManager.getProgressSnapshot() });
  }, [exclusiveReward, primaryEvent, unlockCosmetic, unlockDecoration, updateProgress, claimAnim]);

  // Exclusive reward claim state
  const goldTierReached = primaryEvent?.rewards?.find(r => r.tier === 'gold')?.reached ?? false;
  const exclusiveAlreadyClaimed = exclusiveReward
    ? exclusiveReward.type === 'decoration'
      ? ownedDecorations.includes(exclusiveReward.id)
      : unlockedCosmetics.includes(exclusiveReward.id)
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

  const headerAccent = primaryEvent ? getEventTypeColor(primaryEvent.type) : COLORS.accent;

  return (
    <ScreenScaffold
      title="EVENTS"
      eyebrow={
        primaryEvent
          ? `ENDS IN ${formatCountdown(endTime).toUpperCase()}`
          : 'LIVE CHALLENGES'
      }
      accent={headerAccent}
      backdrop="event"
    >
      <>
        {/* Active Event Multipliers Banner */}
        {hasActiveMultipliers && (
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.orange + '10'] as [string, string]}
            style={styles.multiplierBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <IconMedallion glyph={'\u{26A1}'} size={44} accent={COLORS.gold} style={styles.multiplierMedallion} />
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
        {activeEvents.length > 0 && (
          <SectionHeader
            label="LIVE NOW"
            accent={headerAccent}
            meta={`${activeEvents.length} ACTIVE`}
          />
        )}
        {activeEvents.map((activeEvent) => {
          const color = getEventTypeColor(activeEvent.type);
          const progress = activeEvent.progress;
          const maxThreshold = activeEvent.rewards.length > 0
            ? activeEvent.rewards[activeEvent.rewards.length - 1].threshold
            : 100;

          return (
            <View
              key={activeEvent.id}
              style={[styles.eventCard, { borderColor: color + '40', ...SHADOWS.glow(color) }]}
            >
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard] as [string, string]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {/* Accent top edge */}
              <LinearGradient
                colors={['transparent', color + 'AA', 'transparent'] as [string, string, string]}
                style={styles.eventTopEdge}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
              {/* Event Type Label */}
              <View style={[styles.eventTypeBadge, { backgroundColor: color + '20', borderColor: color + '55' }]}>
                <Text style={[styles.eventTypeText, { color }]}>
                  {getEventTypeLabel(activeEvent.type)}
                </Text>
              </View>

              {/* Event Header */}
              <View style={styles.eventHeader}>
                <IconMedallion
                  glyph={activeEvent.icon}
                  size={54}
                  accent={color}
                  style={styles.eventMedallion}
                />
                <View style={styles.eventTitleArea}>
                  <Text style={[styles.eventName, { color, textShadowColor: color + '66' }]}>
                    {activeEvent.name}
                  </Text>
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

              {/* Progress Bar with milestone markers */}
              <View style={styles.eventProgressHeader}>
                <Text style={styles.eventProgressLabel}>Progress</Text>
                <Text style={styles.eventProgressValue}>
                  {progress} / {maxThreshold}
                </Text>
              </View>
              <MilestoneProgress
                progress={progress}
                max={maxThreshold}
                color={color}
                rewards={activeEvent.rewards}
              />

              {/* Reward Tiers — medallion cards; claimable ones glow gold */}
              <Animated.View style={[styles.rewardTiersRow, { transform: [{ scale: claimAnim }] }]}>
                {activeEvent.rewards.map((reward) => {
                  const canClaim = reward.reached && !reward.claimed;
                  const tierAccent = reward.claimed
                    ? COLORS.green
                    : canClaim
                      ? COLORS.gold
                      : color;
                  return (
                    <Pressable
                      key={reward.tier}
                      onPress={() => canClaim && handleClaimReward(activeEvent.id, reward.tier)}
                      disabled={!canClaim}
                      accessibilityRole="button"
                      accessibilityLabel={`${reward.tier} tier reward${reward.claimed ? ', claimed' : reward.reached ? ', tap to claim' : ', locked'}`}
                      style={({ pressed }) => [
                        styles.rewardTierCard,
                        canClaim && styles.rewardTierCardClaimable,
                        reward.claimed && styles.rewardTierCardClaimed,
                        pressed && canClaim && styles.pressedScale,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          canClaim
                            ? ([COLORS.gold + '26', 'rgba(26,10,46,0.92)'] as [string, string])
                            : ([...GRADIENTS.surfaceCard] as [string, string])
                        }
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                      />
                      <IconMedallion
                        glyph={reward.claimed ? '\u{2705}' : reward.reached ? '\u{1F381}' : '\u{1F512}'}
                        size={38}
                        accent={tierAccent}
                        muted={!reward.reached}
                        style={styles.rewardTierMedallion}
                      />
                      <Text style={styles.rewardTierThreshold}>{reward.threshold}</Text>
                      <Text style={[
                        styles.rewardTierLabel,
                        reward.reached && { color: COLORS.textPrimary },
                        reward.claimed && { color: COLORS.green },
                      ]}>
                        {reward.tier.charAt(0).toUpperCase() + reward.tier.slice(1)}
                      </Text>
                      {canClaim && (
                        <View style={styles.claimPill}>
                          <LinearGradient
                            colors={[...GRADIENTS.button.gold] as [string, string, string]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                          <Text style={styles.claimPillText}>CLAIM</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </Animated.View>
              {/* MG2: per-event leaderboard — degrades to null offline. */}
              <View style={styles.leaderboardGlass}>
                <LinearGradient
                  colors={[...GRADIENTS.glassOverlay] as [string, string]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                <EventLeaderboardCard
                  eventId={activeEvent.id}
                  currentUserId={user?.uid}
                  previewSize={5}
                />
              </View>
            </View>
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
            <IconMedallion glyph={'\u{1F3AE}'} size={64} accent={COLORS.purple} style={styles.emptyMedallion} />
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
              <IconMedallion
                glyph={getRewardTypeIcon(exclusiveReward.type)}
                size={60}
                accent={getRarityColor(exclusiveReward.rarity)}
                style={styles.exclusiveMedallion}
              />
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
                <PrimaryButton
                  label="CLAIM REWARD"
                  onPress={handleClaimExclusiveReward}
                  variant="gold"
                  size="medium"
                  accessibilityLabel={`Claim exclusive reward: ${exclusiveReward?.name}`}
                  style={styles.exclusiveClaimBtn}
                />
              </>
            ) : (
              <>
                <View style={styles.exclusiveTimerRow}>
                  <Text style={styles.exclusiveTimerIcon}>{'\u{1F525}'}</Text>
                  <EventCountdownText endTime={endTime} style={styles.exclusiveTimerText} />
                </View>
                <Text style={styles.exclusiveHint}>
                  Reach the Gold tier to unlock this exclusive reward!
                </Text>
              </>
            )}
          </LinearGradient>
        )}

        {/* Event Puzzles */}
        <SectionHeader label="EVENT PUZZLES" accent={COLORS.pink} />
        <PrimaryButton
          label="PLAY NEXT PUZZLE"
          onPress={onPlayEventPuzzle}
          variant="primary"
          size="large"
          fullWidth
          accessibilityLabel="Play next event puzzle"
          style={styles.playNextButton}
        />

        {/* Event Shop Button */}
        <SectionHeader label="EVENT SHOP" accent={COLORS.gold} />
        <Pressable
          onPress={onOpenEventShop}
          accessibilityRole="button"
          accessibilityLabel="Open event shop"
          style={({ pressed }) => [styles.shopButton, pressed && styles.pressedScale]}
        >
          <LinearGradient
            colors={[COLORS.gold + '20', COLORS.gold + '08'] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <IconMedallion glyph={'\u{1F6CD}\u{FE0F}'} size={46} accent={COLORS.gold} style={styles.shopMedallion} />
          <View style={styles.shopButtonInfo}>
            <Text style={styles.shopButtonTitle}>Event Shop</Text>
            <Text style={styles.shopButtonDesc}>
              Spend tokens on exclusive items
            </Text>
          </View>
          <Text style={styles.shopChevron}>{'\u{203A}'}</Text>
        </Pressable>

        {/* Upcoming Events */}
        <SectionHeader label="COMING UP" accent={COLORS.teal} />
        <View style={styles.upcomingCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard] as [string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.upcomingHint}>
            {eventManager.isWeekendBlitz()
              ? 'Weekend Blitz is active! Enjoy double XP and boosted rare tile drops.'
              : 'Weekend Blitz returns every Saturday & Sunday with 2x XP!'}
          </Text>
        </View>
      </>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  pressedScale: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  // Multiplier Banner
  multiplierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    ...SHADOWS.glow(COLORS.gold),
  },
  multiplierMedallion: {
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
  },
  eventTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  eventTypeText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventMedallion: {
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
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
  // Milestone progress bar
  milestoneWrap: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  milestoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  milestoneMarker: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(10,0,21,0.9)',
  },

  // Reward Tiers
  rewardTiersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardTierCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 4,
    overflow: 'hidden',
    opacity: 0.65,
  },
  rewardTierCardClaimable: {
    opacity: 1,
    borderColor: COLORS.gold + '77',
    ...SHADOWS.glow(COLORS.gold),
  },
  rewardTierCardClaimed: {
    opacity: 0.85,
    borderColor: COLORS.green + '44',
  },
  rewardTierMedallion: {
    marginBottom: 6,
  },
  rewardTierThreshold: {
    fontSize: 11,
    fontFamily: FONTS.display,
    color: COLORS.textMuted,
  },
  rewardTierLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  claimPill: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  claimPillText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    color: COLORS.bg,
  },

  // Leaderboard glass wrap
  leaderboardGlass: {
    marginTop: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceGlass,
    overflow: 'hidden',
    padding: 4,
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
  emptyMedallion: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    letterSpacing: 1,
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
  exclusiveMedallion: {
    marginRight: 14,
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
    alignSelf: 'center',
    marginTop: 12,
    minWidth: 200,
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
  playNextButton: {
    marginBottom: 6,
  },

  // Shop Button
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.gold),
  },
  shopMedallion: {
    marginRight: 14,
  },
  shopButtonInfo: {
    flex: 1,
  },
  shopButtonTitle: {
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 1,
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
  upcomingCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  upcomingHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default EventScreen;
