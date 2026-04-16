import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { FriendChallenge } from '../types';

interface ChallengeCardProps {
  challenge: FriendChallenge;
  onAccept: (challenge: FriendChallenge) => void;
  onDismiss?: (challengeId: string) => void;
  /** If set, shows a result comparison instead of accept button */
  result?: {
    playerScore: number;
    playerStars: number;
  };
}

function StarDisplay({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size }}>
      {'\u2605'.repeat(count)}
      {'\u2606'.repeat(3 - count)}
    </Text>
  );
}

export function ChallengeCard({ challenge, onAccept, onDismiss, result }: ChallengeCardProps) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const isExpired = useMemo(() => {
    return new Date(challenge.expiresAt) < new Date();
  }, [challenge.expiresAt]);

  const timeLeft = useMemo(() => {
    const now = new Date();
    const expires = new Date(challenge.expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }, [challenge.expiresAt]);

  const isWin = result ? result.playerScore > challenge.challengerScore : false;
  const isTie = result ? result.playerScore === challenge.challengerScore : false;

  const borderColor = result
    ? isWin
      ? COLORS.gold
      : isTie
        ? COLORS.accent
        : COLORS.coral
    : COLORS.purple;

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <LinearGradient
        colors={[borderColor + '25', borderColor + '08'] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: borderColor + '50' }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.challengeIcon}>{'\u2694\uFE0F'}</Text>
            <View>
              <Text style={styles.challengerName}>{challenge.challengerName}</Text>
              <Text style={styles.challengeLabel}>
                {result ? 'Challenge Result' : 'challenges you!'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.timeLeft, isExpired && styles.expired]}>{timeLeft}</Text>
          </View>
        </View>

        {/* Challenge details */}
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Level</Text>
            <Text style={styles.detailValue}>{challenge.level}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Score to Beat</Text>
            <Text style={[styles.detailValue, { color: COLORS.gold }]}>
              {challenge.challengerScore.toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stars</Text>
            <StarDisplay count={challenge.challengerStars} />
          </View>
        </View>

        {/* Result comparison (shown after completing challenge) */}
        {result && (
          <View style={styles.resultSection}>
            <LinearGradient
              colors={[
                isWin ? 'rgba(76,175,80,0.15)' : isTie ? 'rgba(0,212,255,0.12)' : 'rgba(255,107,107,0.12)',
                'rgba(0,0,0,0)',
              ] as [string, string]}
              style={styles.resultCard}
            >
              <Text style={[
                styles.resultTitle,
                { color: isWin ? COLORS.green : isTie ? COLORS.accent : COLORS.coral },
              ]}>
                {isWin ? 'YOU WIN!' : isTie ? 'TIE!' : 'THEY WIN'}
              </Text>
              <View style={styles.resultComparison}>
                <View style={styles.resultSide}>
                  <Text style={styles.resultSideLabel}>You</Text>
                  <Text style={[styles.resultScore, isWin && { color: COLORS.gold }]}>
                    {result.playerScore.toLocaleString()}
                  </Text>
                  <StarDisplay count={result.playerStars} size={12} />
                </View>
                <Text style={styles.resultVs}>vs</Text>
                <View style={styles.resultSide}>
                  <Text style={styles.resultSideLabel}>{challenge.challengerName}</Text>
                  <Text style={[styles.resultScore, !isWin && !isTie && { color: COLORS.gold }]}>
                    {challenge.challengerScore.toLocaleString()}
                  </Text>
                  <StarDisplay count={challenge.challengerStars} size={12} />
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Action button */}
        {!result && !isExpired && challenge.status === 'pending' && (
          <Pressable
            style={({ pressed }) => [pressed && styles.buttonPressed]}
            onPress={() => onAccept(challenge)}
            accessibilityRole="button"
            accessibilityLabel="Accept challenge"
            accessibilityHint="Start playing the challenged puzzle"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={[COLORS.purple, '#7c3aed'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.acceptButton}
            >
              <Text style={styles.acceptButtonText}>Beat This!</Text>
            </LinearGradient>
          </Pressable>
        )}

        {isExpired && !result && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredText}>Challenge Expired</Text>
          </View>
        )}

        {/* Dismiss */}
        {onDismiss && !result && (
          <Pressable
            style={({ pressed }) => [styles.dismissButton, pressed && styles.buttonPressed]}
            onPress={() => onDismiss(challenge.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss challenge"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  challengeIcon: {
    fontSize: 24,
  },
  challengerName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontFamily: FONTS.display,
  },
  challengeLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 1,
  },
  headerRight: {},
  timeLeft: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
  },
  expired: {
    color: COLORS.coral,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.display,
  },
  resultSection: {
    marginBottom: 8,
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
  },
  resultComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  resultSide: {
    alignItems: 'center',
    flex: 1,
  },
  resultSideLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 4,
  },
  resultScore: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.display,
    marginBottom: 2,
  },
  resultVs: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.display,
  },
  acceptButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.medium,
    shadowColor: COLORS.purple,
    shadowOpacity: 0.4,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  expiredBadge: {
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  expiredText: {
    color: COLORS.coral,
    fontSize: 13,
    fontFamily: FONTS.display,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
});

export default ChallengeCard;
