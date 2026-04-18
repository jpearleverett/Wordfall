/**
 * NoLivesModal — Phase 4B flip-on UI.
 *
 * Shown when `useHardEnergy().canPlay === false`. Offers three paths:
 *   1. Rewarded ad → +1 life (daily cap handled by ads service)
 *   2. Gem refill (full → `LIVES.gemRefillCost`)
 *   3. Wait (countdown to `nextLifeAtMs`)
 *
 * The modal is inert while `hardEnergyEnabled=false` — it simply never
 * opens because `canPlay` stays true. This component is intentionally
 * self-contained so it can be mounted from any screen that triggers play.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, LIVES } from '../constants';

interface NoLivesModalProps {
  visible: boolean;
  livesRemaining: number;
  gemsAvailable: number;
  gemRefillCost: number;
  nextLifeAtMs: number | null;
  onClose: () => void;
  onWatchAd: () => Promise<void> | void;
  onSpendGems: () => void;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSec = Math.floor(msRemaining / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const NoLivesModal: React.FC<NoLivesModalProps> = ({
  visible,
  livesRemaining,
  gemsAvailable,
  gemRefillCost,
  nextLifeAtMs,
  onClose,
  onWatchAd,
  onSpendGems,
}) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState<string>('--:--');
  const [watchingAd, setWatchingAd] = useState(false);

  useEffect(() => {
    if (!visible || !nextLifeAtMs) {
      setCountdown('--:--');
      return;
    }
    const tick = () => {
      const remaining = nextLifeAtMs - Date.now();
      setCountdown(formatCountdown(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, nextLifeAtMs]);

  const handleAd = async () => {
    if (watchingAd) return;
    setWatchingAd(true);
    try {
      await onWatchAd();
    } finally {
      setWatchingAd(false);
    }
  };

  const canAffordGems = gemsAvailable >= gemRefillCost;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={[...GRADIENTS.surfaceCard] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.heart}>💔</Text>
          <Text style={styles.title}>{t('lives.outOfLives')}</Text>
          <Text style={styles.subtitle}>
            {t('lives.youHaveOf', { current: livesRemaining, max: LIVES.max })}
          </Text>

          <TouchableOpacity
            onPress={handleAd}
            disabled={watchingAd}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('lives.watchAdA11y')}
            accessibilityState={{ busy: watchingAd }}
          >
            <LinearGradient
              colors={[...GRADIENTS.button.primary] as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaPrimary}
            >
              {watchingAd ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaPrimaryText}>{t('lives.watchAdForLife')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSpendGems}
            disabled={!canAffordGems}
            activeOpacity={canAffordGems ? 0.85 : 1}
            style={[styles.ctaSecondary, !canAffordGems && styles.ctaDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('lives.refillA11y', { count: gemRefillCost })}
            accessibilityState={{ disabled: !canAffordGems }}
          >
            <Text style={styles.ctaSecondaryText}>
              {t('lives.fullRefillGems', { count: gemRefillCost })}
            </Text>
            <Text style={styles.ctaSecondarySubtext}>
              {t('lives.youHaveGems', { count: gemsAvailable })}
            </Text>
          </TouchableOpacity>

          <View style={styles.countdownBlock}>
            <Text style={styles.countdownLabel}>{t('lives.nextLifeIn')}</Text>
            <Text style={styles.countdownValue}>{countdown}</Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('lives.closeA11y')}
          >
            <Text style={styles.closeBtnText}>{t('lives.illWait')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  heart: { fontSize: 48, marginBottom: 4 },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    minWidth: 260,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaPrimaryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.4,
  },
  ctaSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minWidth: 260,
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaSecondaryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  ctaSecondarySubtext: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  countdownBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  countdownLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: 2,
    letterSpacing: 1,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 24,
  },
  closeBtnText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});

export default NoLivesModal;
