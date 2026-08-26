/**
 * PreLevelBoosterSheet — the pre-level booster-commit moment on spike
 * ("⚡ CHALLENGE") levels.
 *
 * The genre's single highest-converting placement is the screen that asks
 * "hard level ahead — bring a booster?" BEFORE the board loads. Wordfall had
 * no pre-level surface at all: boosters were only tappable mid-puzzle from
 * BoosterBar, after the player is already committed. This sheet fires once
 * per spike-level entry (RC-gated), shows what the player owns, and bridges
 * to the two existing purchase paths (gem booster pack, booster mini-pack).
 * It never equips anything by itself — boosters stay tap-to-use in the run,
 * so the offer is honest: stock up now, spend when you choose.
 *
 * Suppressed for daily/weekly/relax (same rule as the CHALLENGE banner) and
 * below the first spike level. Pure eligibility logic is exported for tests.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS } from '../constants';
import type { BoosterCounts } from './preLevelBoosterLogic';

export type { BoosterCounts } from './preLevelBoosterLogic';
export { shouldShowPreLevelBoosterSheet } from './preLevelBoosterLogic';

interface PreLevelBoosterSheetProps {
  visible: boolean;
  level: number;
  boosterCounts: BoosterCounts;
  /** Gem price of the 1-of-each booster pack (getOfferPrice('booster_pack')). */
  gemPackPrice: number;
  playerGems: number;
  /** Buy the 1-of-each pack for gems (caller charges + grants). */
  onBuyGemPack: () => void;
  /** Open MiniPackSheet('boosters') for coin/IAP paths. */
  onOpenBoosterStore: () => void;
  /** Dismiss into the level. */
  onPlay: () => void;
}

const ROWS: Array<{ key: keyof BoosterCounts; icon: string; label: string }> = [
  { key: 'wildcardTile', icon: '⭐', label: 'Wildcard' },
  { key: 'spotlight', icon: '\u{1F441}️', label: 'Spotlight' },
  { key: 'smartShuffle', icon: '\u{1F500}', label: 'Shuffle' },
];

export const PreLevelBoosterSheet: React.FC<PreLevelBoosterSheetProps> = ({
  visible,
  level,
  boosterCounts,
  gemPackPrice,
  playerGems,
  onBuyGemPack,
  onOpenBoosterStore,
  onPlay,
}) => {
  const ownsAny =
    boosterCounts.wildcardTile > 0 ||
    boosterCounts.spotlight > 0 ||
    boosterCounts.smartShuffle > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPlay}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(10,14,39,0.97)', 'rgba(26,31,69,0.97)'] as [string, string]}
          style={styles.card}
        >
          <Text style={styles.badge}>{'⚡'} CHALLENGE LEVEL {level}</Text>
          <Text style={styles.title}>Tough board ahead</Text>
          <Text style={styles.subtitle}>
            {ownsAny
              ? 'Your boosters are ready — use them from the bar whenever you need an edge.'
              : 'Boosters give you an edge when the clearing order gets tricky. Stock up before you dive in?'}
          </Text>

          <View style={styles.boosterRow}>
            {ROWS.map(({ key, icon, label }) => (
              <View key={key} style={styles.boosterCell}>
                <Text style={styles.boosterIcon}>{icon}</Text>
                <Text style={styles.boosterLabel}>{label}</Text>
                <Text style={styles.boosterCount}>×{boosterCounts[key]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onBuyGemPack}
            accessibilityRole="button"
            accessibilityLabel={`Buy one of each booster for ${gemPackPrice} gems`}
          >
            <Text style={styles.primaryBtnText}>
              {'\u{1F48E}'} {gemPackPrice} GEMS — 1 OF EACH
            </Text>
            <Text style={styles.primaryBtnSub}>You have {playerGems} gems</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onOpenBoosterStore}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>More options…</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={onPlay}
            accessibilityRole="button"
            accessibilityLabel="Play the challenge level"
          >
            <Text style={styles.playBtnText}>PLAY {'▶'}</Text>
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
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    ...SHADOWS.strong,
  },
  badge: {
    color: COLORS.gold,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.2,
    marginBottom: 8,
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
    marginBottom: 18,
  },
  boosterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  boosterCell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 84,
  },
  boosterIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  boosterLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    marginBottom: 2,
  },
  boosterCount: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.medium,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.8,
  },
  primaryBtnSub: {
    color: 'rgba(10,14,39,0.7)',
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
  },
  playBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(173,216,230,0.35)',
  },
  playBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
});

export default PreLevelBoosterSheet;
