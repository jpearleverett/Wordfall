/**
 * OutOfEnergyModal — the designed replacement for the bare native Alert at
 * the soft-energy wall (the game's only true hard block outside RC-gated
 * hard energy). An un-styled OS dialog at the highest-intent conversion
 * moment was un-brandable, un-instrumented, and un-A/B-able; this modal is
 * all three, on the same visual pattern as NoLivesModal/FailBreatherOffer.
 *
 * The modal only presents; charging/refilling stays at the call site so the
 * three wrappers (Home classic start, Modes, Events) keep their own
 * navigation and economy wiring.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';
import { analytics } from '../services/analytics';

interface OutOfEnergyModalProps {
  visible: boolean;
  /** Minutes until the next energy point regenerates (display only). */
  minutesUntilNext: number;
  /** Gem price of the full refill (ENERGY.GEM_REFILL_COST). */
  gemCost: number;
  playerGems: number;
  /** 'home' | 'modes' | 'event' — analytics source tag. */
  source: string;
  onWatchAd: () => void;
  onGemRefill: () => void;
  onClose: () => void;
}

export const OutOfEnergyModal: React.FC<OutOfEnergyModalProps> = ({
  visible,
  minutesUntilNext,
  gemCost,
  playerGems,
  source,
  onWatchAd,
  onGemRefill,
  onClose,
}) => {
  useEffect(() => {
    if (visible) {
      void analytics.logEvent('energy_wall_shown', { source, gems_held: playerGems });
    }
    // Log once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const choose = (choice: string, fn: () => void) => () => {
    void analytics.logEvent('energy_wall_choice', { source, choice });
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(10,14,39,0.97)', 'rgba(26,31,69,0.97)'] as [string, string]}
          style={styles.card}
        >
          <Text style={styles.icon}>{'⚡'}</Text>
          <Text style={styles.title}>Out of energy</Text>
          <Text style={styles.subtitle}>
            Next point recharges in {minutesUntilNext} minute{minutesUntilNext === 1 ? '' : 's'} —
            or jump straight back in:
          </Text>

          <TouchableOpacity
            style={styles.adBtn}
            onPress={choose('ad', onWatchAd)}
            accessibilityRole="button"
            accessibilityLabel="Watch an ad for 5 energy"
          >
            <Text style={styles.adBtnText}>{'▶️'} WATCH AD — +5 ENERGY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gemBtn}
            onPress={choose('gems', onGemRefill)}
            accessibilityRole="button"
            accessibilityLabel={`Refill all energy for ${gemCost} gems`}
          >
            <Text style={styles.gemBtnText}>
              {'\u{1F48E}'} {gemCost} GEMS — FULL REFILL
            </Text>
            <Text style={styles.gemBtnSub}>You have {playerGems} gems</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.waitBtn}
            onPress={choose('wait', onClose)}
            accessibilityRole="button"
          >
            <Text style={styles.waitBtnText}>I'll take a break</Text>
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
    fontSize: 52,
    marginBottom: 10,
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
    fontSize: 14,
    fontFamily: FONTS.bodyRegular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  adBtn: {
    width: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  adBtnText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.8,
  },
  gemBtn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  gemBtnText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.8,
  },
  gemBtnSub: {
    color: 'rgba(10,14,39,0.7)',
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  waitBtn: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
  },
  waitBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
});

export default OutOfEnergyModal;
