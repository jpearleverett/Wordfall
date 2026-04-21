import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants';
import { bentoPanel } from '../styles/bentoPanel';
import {
  useEconomyStore,
  selectPiggyBankGems,
  selectPiggyBankCapacity,
  selectPiggyBankReady,
} from '../stores/economyStore';
import { getRemoteNumber, getRemoteBoolean } from '../services/remoteConfig';
import { analytics } from '../services/analytics';

interface PiggyBankCardProps {
  /** Compact home-screen variant (mini-card). Defaults to false (full shop card). */
  compact?: boolean;
  /** Called when the player taps "Break". Pass `handlePurchase('piggy_bank_break')`. */
  onBreak: () => void;
  /** True while the break purchase is in flight. */
  purchasing?: boolean;
}

/**
 * Slow-fill gem jar. Fills on puzzle complete (capped at RC capacity).
 * Shows a "Break for $X" CTA when ≥ 80% full; full variant always visible
 * in the shop, compact variant only mounts on home when the jar is ready.
 */
const PiggyBankCard: React.FC<PiggyBankCardProps> = ({
  compact = false,
  onBreak,
  purchasing = false,
}) => {
  const gems = useEconomyStore(selectPiggyBankGems);
  const capacity = useEconomyStore(selectPiggyBankCapacity);
  const ready = useEconomyStore(selectPiggyBankReady);

  const priceUSD = getRemoteNumber('piggyBankPriceUSD');
  const priceLabel = useMemo(
    () => `$${priceUSD.toFixed(2)}`,
    [priceUSD],
  );
  const fillPct = capacity > 0 ? Math.min(1, gems / capacity) : 0;

  useEffect(() => {
    if (ready) {
      void analytics.logEvent('piggy_bank_offer_shown', { gems, capacity });
    }
  }, [ready, gems, capacity]);

  if (!getRemoteBoolean('piggyBankEnabled')) return null;
  if (compact && !ready) return null;

  const title = compact ? 'Piggy Bank Ready!' : 'Piggy Bank';
  const subtitle = compact
    ? `${gems} gems waiting inside`
    : ready
      ? `Break it open for ${gems} gems!`
      : `${gems}/${capacity} gems — fills as you play`;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <LinearGradient
        colors={[COLORS.pink + '30', COLORS.coral + '15', COLORS.surface]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.header}>
        <Text style={styles.icon}>{'\u{1FAD9}'}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${fillPct * 100}%` }]} />
        <Text style={styles.barLabel}>
          {Math.round(fillPct * 100)}%
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          !ready && styles.buttonDisabled,
          pressed && ready && styles.buttonPressed,
        ]}
        onPress={ready && !purchasing ? onBreak : undefined}
        disabled={!ready || purchasing}
        accessibilityRole="button"
        accessibilityLabel={
          ready
            ? `Break piggy bank for ${priceLabel} to claim ${gems} gems`
            : 'Piggy bank not ready yet'
        }
      >
        <LinearGradient
          colors={ready ? [COLORS.gold, COLORS.orange] : [COLORS.textMuted, COLORS.textMuted]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        {purchasing ? (
          <ActivityIndicator size="small" color={COLORS.bg} />
        ) : (
          <Text style={styles.buttonText}>
            {ready ? `BREAK FOR ${priceLabel}` : 'Keep playing to fill'}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...bentoPanel('gold'),
    padding: 16,
    overflow: 'hidden',
  },
  cardCompact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  barTrack: {
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.pink,
  },
  barLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  button: {
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default PiggyBankCard;
