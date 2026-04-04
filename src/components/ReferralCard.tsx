import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  Animated,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { getNextMilestone, REFERRAL_MILESTONES } from '../data/referralSystem';
import { buildReferralLink } from '../utils/deepLinking';

interface ReferralCardProps {
  /** The player's 6-char referral code */
  referralCode: string;
  /** How many successful referrals the player has */
  referralCount: number;
  /** Which milestone counts have already been claimed */
  milestonesClaimed: number[];
  /** Called when the player taps a claimable milestone */
  onClaimMilestone?: (count: number) => void;
}

const ReferralCard: React.FC<ReferralCardProps> = ({
  referralCode,
  referralCount,
  milestonesClaimed,
  onClaimMilestone,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const copyFlashAnim = useRef(new Animated.Value(0)).current;

  const nextMilestone = getNextMilestone(referralCount);
  const progress = nextMilestone
    ? Math.min(referralCount / nextMilestone.count, 1)
    : 1;

  // ── Press animation ───────────────────────────────────────────────────

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // ── Copy to clipboard ─────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      // Flash feedback
      copyFlashAnim.setValue(1);
      Animated.timing(copyFlashAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch {
      // Clipboard may not be available
    }
  }, [referralCode, copyFlashAnim]);

  // ── Share ─────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    try {
      const link = buildReferralLink(referralCode);
      await Share.share({
        message: `Join me on Wordfall! Use my code for free rewards: ${link}`,
      });
    } catch {
      // Share cancelled or unavailable
    }
  }, [referralCode]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🎁</Text>
          <View style={styles.headerText}>
            <Text style={styles.title}>Invite Friends</Text>
            <Text style={styles.subtitle}>
              {referralCount} friend{referralCount !== 1 ? 's' : ''} referred
            </Text>
          </View>
        </View>

        {/* Code + Copy */}
        <View style={styles.codeRow}>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>YOUR CODE</Text>
            <Text style={styles.codeText}>{referralCode || '------'}</Text>
          </View>

          <Pressable
            onPress={handleCopy}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.copyButton}
          >
            <LinearGradient
              colors={[COLORS.surface2, COLORS.surface]}
              style={styles.copyButtonInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.copyButtonText}>COPY</Text>
            </LinearGradient>
          </Pressable>

          <Animated.View
            style={[
              styles.copiedBadge,
              { opacity: copyFlashAnim },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.copiedText}>Copied!</Text>
          </Animated.View>
        </View>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <LinearGradient
            colors={GRADIENTS.button.primary as unknown as readonly [string, string, ...string[]]}
            style={styles.shareButtonInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.shareButtonText}>SHARE INVITE</Text>
          </LinearGradient>
        </Pressable>

        {/* Milestone progress */}
        {nextMilestone && (
          <View style={styles.milestoneSection}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneLabel}>
                Next: {nextMilestone.icon} {nextMilestone.label}
              </Text>
              <Text style={styles.milestoneCount}>
                {referralCount}/{nextMilestone.count}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Milestone dots */}
        <View style={styles.milestoneDots}>
          {REFERRAL_MILESTONES.map((m) => {
            const reached = referralCount >= m.count;
            const claimed = milestonesClaimed.includes(m.count);
            const claimable = reached && !claimed;

            return (
              <Pressable
                key={m.count}
                onPress={() => claimable && onClaimMilestone?.(m.count)}
                style={({ pressed }) => [
                  styles.milestoneDot,
                  reached && styles.milestoneDotReached,
                  claimed && styles.milestoneDotClaimed,
                  claimable && styles.milestoneDotClaimable,
                  pressed && claimable && { transform: [{ scale: 0.92 }] },
                ]}
              >
                <Text
                  style={[
                    styles.milestoneDotText,
                    reached && styles.milestoneDotTextReached,
                  ]}
                >
                  {claimed ? '✓' : m.icon}
                </Text>
                <Text style={styles.milestoneDotCount}>{m.count}</Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default ReferralCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Code row
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  codeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  codeLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  codeText: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.accent,
    letterSpacing: 4,
  },
  copyButton: {
    marginLeft: 10,
    borderRadius: 10,
  },
  copyButtonInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  copyButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  copiedBadge: {
    position: 'absolute',
    right: 0,
    top: -8,
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  copiedText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },

  // Share button
  shareButton: {
    borderRadius: 14,
    marginBottom: 16,
    ...SHADOWS.glow(COLORS.accent),
  },
  shareButtonInner: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 2,
  },

  // Milestone progress
  milestoneSection: {
    marginBottom: 14,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  milestoneCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.accent,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },

  // Milestone dots
  milestoneDots: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  milestoneDot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.borderSubtle,
  },
  milestoneDotReached: {
    borderColor: COLORS.accent,
  },
  milestoneDotClaimed: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(0, 255, 135, 0.10)',
  },
  milestoneDotClaimable: {
    borderColor: COLORS.gold,
    ...SHADOWS.glow(COLORS.gold),
  },
  milestoneDotText: {
    fontSize: 18,
  },
  milestoneDotTextReached: {
    // intentionally empty — reached dots keep their icon style
  },
  milestoneDotCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
