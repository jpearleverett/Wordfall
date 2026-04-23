/**
 * FailBreatherOffer — mid-struggle relief (Tier 6 B1 in launch_blockers.md).
 *
 * Surfaced after a loss when the player has failed the same level twice in
 * a row (or most recently cleared with only 1 star). Offers a one-time
 * free hint + an eased next board. The idea: catch the L15–L25 softlock
 * zone before it turns into churn, the way Duolingo's "Take a break" pop
 * catches fail-streaks on lesson 7.
 *
 * Gated by the `failBreatherEnabled` Remote Config flag and a 1-hour
 * cooldown recorded on `PlayerProgressData.lastBreatherOfferedAt` so the
 * offer doesn't re-fire back-to-back on the same stuck level.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';

/** Minimum interval between two consecutive breather offers. */
export const BREATHER_COOLDOWN_MS = 60 * 60 * 1000;

interface FailBreatherOfferProps {
  visible: boolean;
  consecutiveFailures: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export const FailBreatherOffer: React.FC<FailBreatherOfferProps> = ({
  visible,
  consecutiveFailures,
  onAccept,
  onDismiss,
}) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) setBusy(false);
  }, [visible]);

  const handleAccept = () => {
    if (busy) return;
    setBusy(true);
    onAccept();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(10,14,39,0.96)', 'rgba(26,31,69,0.96)'] as [string, string]}
          style={styles.card}
        >
          <Text style={styles.icon}>{'\u{1F9D8}'}</Text>
          <Text style={styles.title}>Take a breather?</Text>
          <Text style={styles.subtitle}>
            {consecutiveFailures >= 2
              ? 'Stuck on this one? Here — a free hint and a slightly easier board next time. No cost.'
              : 'Close call. Want a free hint and an easier next board on the house?'}
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAccept}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Accept free hint and easier next board"
          >
            <Text style={styles.primaryBtnText}>
              YES, PLEASE {'\u{1F4A1}'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onDismiss}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>I've got this</Text>
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
    borderColor: 'rgba(173,216,230,0.25)',
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

export default FailBreatherOffer;
