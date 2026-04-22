/**
 * PostStreakBreakOffer — restorative streak save (R5 in launch_blockers.md).
 *
 * Surfaced once, on app open, when the player's daily streak just broke
 * in the last 24h AND the broken streak was worth regretting (>=3 days).
 * Mirrors the Candy Crush "save your streak" mechanic.
 *
 * Offers the player two choices:
 *   1. Spend RESTORE_GEM_COST gems → streak restored, marker cleared.
 *   2. Dismiss → marker cleared, offer won't re-appear for this break.
 *
 * The preventive `streak_freeze` / `streak_shield` path is untouched —
 * this is the *after-the-fact* complement for players who didn't buy a
 * shield before the miss.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';

export const RESTORE_GEM_COST = 50;
/** Offer expires 24h after the break (client-side gate; also persisted). */
export const RESTORE_WINDOW_MS = 24 * 60 * 60 * 1000;

interface PostStreakBreakOfferProps {
  visible: boolean;
  brokenStreakCount: number;
  gemsAvailable: number;
  onRestore: () => void;
  onDismiss: () => void;
}

export const PostStreakBreakOffer: React.FC<PostStreakBreakOfferProps> = ({
  visible,
  brokenStreakCount,
  gemsAvailable,
  onRestore,
  onDismiss,
}) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) setBusy(false);
  }, [visible]);

  const canAfford = gemsAvailable >= RESTORE_GEM_COST;

  const handleRestore = () => {
    if (busy) return;
    if (!canAfford) {
      Alert.alert(
        'Not enough gems',
        `You need ${RESTORE_GEM_COST} gems to restore your streak. Visit the Shop to top up.`,
      );
      return;
    }
    setBusy(true);
    onRestore();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(10,14,39,0.96)', 'rgba(26,31,69,0.96)'] as [string, string]}
          style={styles.card}
        >
          <Text style={styles.icon}>{'\u{1F525}'}</Text>
          <Text style={styles.title}>Save your streak?</Text>
          <Text style={styles.subtitle}>
            Your {brokenStreakCount}-day streak just broke. Restore it now and keep going.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, !canAfford && styles.primaryBtnDisabled]}
            onPress={handleRestore}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Restore streak for ${RESTORE_GEM_COST} gems`}
          >
            <Text style={styles.primaryBtnText}>
              RESTORE ({RESTORE_GEM_COST} {'\u{1F48E}'})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onDismiss}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Start over</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    ...SHADOWS.strong,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.bodyRegular,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
});

export default PostStreakBreakOffer;
