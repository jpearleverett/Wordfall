import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, MODE_CONFIGS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { ModeConfig } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { Tooltip } from '../components/common/Tooltip';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MODES = Object.values(MODE_CONFIGS)
  .map((mode) => ({
    id: mode.id,
    name: mode.name,
    icon: mode.icon,
    desc: mode.description,
    unlockLevel: mode.unlockLevel,
  }))
  .sort((a, b) => a.unlockLevel - b.unlockLevel);

interface ModesScreenProps {
  onSelectMode?: (mode: string) => void;
  unlockedModes?: string[];
  playerLevel?: number;
  onOpenLeaderboard?: () => void;
}

const ModesScreen: React.FC<ModesScreenProps> = ({
  onSelectMode: onSelectModeProp,
  unlockedModes: unlockedModesProp,
  playerLevel: playerLevelProp,
  onOpenLeaderboard,
}) => {
  const player = usePlayer();
  const onSelectMode = onSelectModeProp ?? ((_mode: string) => {});
  const unlockedModes = unlockedModesProp ?? player.unlockedModes;
  const playerLevel = playerLevelProp ?? player.currentLevel;
  const isModeAccessible = (modeId: string): { accessible: boolean; reason: string } => {
    const modeConfig = MODE_CONFIGS[modeId as keyof typeof MODE_CONFIGS] as ModeConfig | undefined;
    if (!modeConfig) return { accessible: false, reason: 'Unknown mode' };

    if (playerLevel < modeConfig.unlockLevel && !unlockedModes.includes(modeId)) {
      return { accessible: false, reason: `Reach level ${modeConfig.unlockLevel}` };
    }

    const gate = modeConfig.rules.skillGate;
    if (gate) {
      if (gate.perfectSolves && player.perfectSolves < gate.perfectSolves) {
        return { accessible: false, reason: `Need ${gate.perfectSolves} perfect solves (${player.perfectSolves}/${gate.perfectSolves})` };
      }
      if (gate.minStars && player.totalStars < gate.minStars) {
        return { accessible: false, reason: `Need ${gate.minStars} stars (${player.totalStars}/${gate.minStars})` };
      }
      if (gate.puzzlesSolved && player.puzzlesSolved < gate.puzzlesSolved) {
        return { accessible: false, reason: `Need ${gate.puzzlesSolved} puzzles solved (${player.puzzlesSolved}/${gate.puzzlesSolved})` };
      }
    }

    return { accessible: true, reason: '' };
  };

  const renderModeCard = (mode: typeof MODES[number]) => {
    const { accessible, reason } = isModeAccessible(mode.id);

    return (
      <TouchableOpacity
        key={mode.id}
        style={[
          styles.card,
          accessible ? styles.cardUnlocked : styles.cardLocked,
        ]}
        onPress={() => accessible && onSelectMode(mode.id)}
        activeOpacity={accessible ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`${mode.name} mode${accessible ? '' : ', locked'}: ${accessible ? mode.desc : reason}`}
        accessibilityState={{ disabled: !accessible }}
      >
        {accessible ? (
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ) : (
          <LinearGradient
            colors={['#121636', '#0e1230']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}
        {accessible && <View style={styles.cardGlow} />}
        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{accessible ? mode.icon : '\u{1F512}'}</Text>
          <Text style={[styles.cardName, !accessible && styles.textLocked]}>
            {mode.name}
          </Text>
          {accessible ? (
            <Text style={styles.cardDesc}>{mode.desc}</Text>
          ) : (
            <Text style={styles.lockText}>
              {reason}
            </Text>
          )}
        </View>
        {accessible && (
          <View style={styles.cardAccent} />
        )}
      </TouchableOpacity>
    );
  };

  const [showTooltip, setShowTooltip] = useState(
    !player.tooltipsShown.includes('modes_screen')
  );

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="modes" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>GAME MODES</Text>
          {onOpenLeaderboard && (
            <TouchableOpacity style={styles.leaderboardBtn} onPress={onOpenLeaderboard} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Open leaderboard">
              <Text style={styles.leaderboardBtnText}>{'\u{1F3C6}'} Leaderboard</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {unlockedModes.length} of {MODES.length} unlocked
        </Text>
      </View>
      <Tooltip
        message="Each mode has unique rules! Unlock more modes by advancing through levels."
        visible={showTooltip}
        onDismiss={() => {
          setShowTooltip(false);
          player.markTooltipShown('modes_screen');
        }}
        position="top"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {MODES.map(renderModeCard)}
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  leaderboardBtn: {
    backgroundColor: COLORS.gold + '20',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  leaderboardBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 165,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  cardUnlocked: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardLocked: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    opacity: 0.55,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardName: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  lockText: {
    fontSize: 11,
    color: COLORS.gold,
    textAlign: 'center',
    fontFamily: FONTS.bodySemiBold,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  cardAccent: {
    height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSpacer: {
    height: 40,
    width: '100%',
  },
});

export default ModesScreen;
