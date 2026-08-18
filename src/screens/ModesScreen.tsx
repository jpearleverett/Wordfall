import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, FONTS, RADIUS, SHADOWS, MODE_CONFIGS } from '../constants';
import ScreenScaffold from '../components/common/ScreenScaffold';
import IconMedallion from '../components/common/IconMedallion';
import NeonProgressBar from '../components/common/NeonProgressBar';
import { ModeConfig } from '../types';
import {
  usePlayerStore,
  usePlayerActions,
  selectUnlockedModes,
  selectCurrentLevel,
  selectPerfectSolves,
  selectTotalStars,
  selectPuzzlesSolved,
  selectTooltipsShown,
  selectModeStats,
} from '../stores/playerStore';
import { Tooltip } from '../components/common/Tooltip';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MODES = Object.values(MODE_CONFIGS)
  .map((mode) => ({
    id: mode.id,
    name: mode.name,
    icon: mode.icon,
    desc: mode.description,
    color: mode.color,
    unlockLevel: mode.unlockLevel,
  }))
  .sort((a, b) => a.unlockLevel - b.unlockLevel);

/** Compact progress readout rendered on a locked card instead of the old
 *  floating gold string: a chip label + a meter toward the requirement. */
interface LockMeter {
  current: number;
  total: number;
  label: string;
}

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
  // Narrow zustand subscriptions
  const playerUnlockedModes = usePlayerStore(selectUnlockedModes);
  const playerCurrentLevel = usePlayerStore(selectCurrentLevel);
  const perfectSolves = usePlayerStore(selectPerfectSolves);
  const totalStars = usePlayerStore(selectTotalStars);
  const puzzlesSolved = usePlayerStore(selectPuzzlesSolved);
  const tooltipsShown = usePlayerStore(selectTooltipsShown);
  const modeStats = usePlayerStore(selectModeStats);
  const { markTooltipShown } = usePlayerActions();
  const onSelectMode = onSelectModeProp ?? ((_mode: string) => {});
  const unlockedModes = unlockedModesProp ?? playerUnlockedModes;
  const playerLevel = playerLevelProp ?? playerCurrentLevel;
  const isModeAccessible = (
    modeId: string,
  ): { accessible: boolean; reason: string; meter: LockMeter } => {
    const modeConfig = MODE_CONFIGS[modeId as keyof typeof MODE_CONFIGS] as ModeConfig | undefined;
    if (!modeConfig) {
      return { accessible: false, reason: 'Unknown mode', meter: { current: 0, total: 1, label: 'LOCKED' } };
    }

    if (playerLevel < modeConfig.unlockLevel && !unlockedModes.includes(modeId)) {
      return {
        accessible: false,
        reason: `Reach level ${modeConfig.unlockLevel}`,
        meter: { current: playerLevel, total: modeConfig.unlockLevel, label: `LV ${modeConfig.unlockLevel}` },
      };
    }

    const gate = modeConfig.rules.skillGate;
    if (gate) {
      if (gate.perfectSolves && perfectSolves < gate.perfectSolves) {
        return {
          accessible: false,
          reason: `Need ${gate.perfectSolves} perfect solves (${perfectSolves}/${gate.perfectSolves})`,
          meter: { current: perfectSolves, total: gate.perfectSolves, label: `${perfectSolves}/${gate.perfectSolves} PERFECT` },
        };
      }
      if (gate.minStars && totalStars < gate.minStars) {
        return {
          accessible: false,
          reason: `Need ${gate.minStars} stars (${totalStars}/${gate.minStars})`,
          meter: { current: totalStars, total: gate.minStars, label: `${totalStars}/${gate.minStars} ★` },
        };
      }
      if (gate.puzzlesSolved && puzzlesSolved < gate.puzzlesSolved) {
        return {
          accessible: false,
          reason: `Need ${gate.puzzlesSolved} puzzles solved (${puzzlesSolved}/${gate.puzzlesSolved})`,
          meter: { current: puzzlesSolved, total: gate.puzzlesSolved, label: `${puzzlesSolved}/${gate.puzzlesSolved} SOLVED` },
        };
      }
    }

    return { accessible: true, reason: '', meter: { current: 1, total: 1, label: '' } };
  };

  const renderModeCard = (mode: typeof MODES[number]) => {
    const { accessible, reason, meter } = isModeAccessible(mode.id);
    const accent = mode.color;
    const special = mode.id === 'daily' || mode.id === 'weekly';

    return (
      <Pressable
        key={mode.id}
        style={({ pressed }) => [
          styles.card,
          accessible
            ? [{ borderColor: accent + '59' }, SHADOWS.glow(accent)]
            : styles.cardLocked,
          pressed && accessible && styles.cardPressed,
        ]}
        onPress={() => accessible && onSelectMode(mode.id)}
        accessibilityRole="button"
        accessibilityLabel={`${mode.name} mode${accessible ? '' : ', locked'}: ${accessible ? mode.desc : reason}`}
        accessibilityState={{ disabled: !accessible }}
      >
        <LinearGradient
          colors={
            accessible
              ? [...GRADIENTS.surfaceCard]
              : (['rgba(18,6,32,0.94)', 'rgba(10,0,21,0.96)'] as const)
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {accessible && (
          <LinearGradient
            colors={[accent + '2E', 'transparent']}
            style={styles.accentWash}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        )}
        {accessible && (
          <View
            style={[
              styles.topTick,
              { backgroundColor: special ? COLORS.gold : accent },
              SHADOWS.neonEdge(special ? COLORS.gold : accent),
            ]}
          />
        )}
        <View style={styles.cardContent}>
          {special && accessible && (
            <Text style={styles.specialEyebrow}>
              {mode.id === 'daily' ? 'DAILY EVENT' : 'WEEKLY EVENT'}
            </Text>
          )}
          <IconMedallion
            glyph={accessible ? mode.icon : '\u{1F512}'}
            accent={accessible ? accent : COLORS.gold}
            size={48}
            shape="squircle"
            muted={!accessible}
            style={styles.medallion}
          />
          <Text style={[styles.cardName, !accessible && styles.textLocked]}>
            {mode.name}
          </Text>
          {accessible ? (
            <>
              <Text style={styles.cardDesc}>{mode.desc}</Text>
              {/* R8: the player's own history on the card. modeStats was
                  tracked from day one and rendered nowhere, so every mode
                  looked untouched forever — nothing invited a return visit. */}
              {(() => {
                const stats = modeStats[mode.id];
                if (!stats || stats.played <= 0) return null;
                return (
                  <Text style={styles.cardStats}>
                    {stats.played} played · best{' '}
                    {stats.bestScore.toLocaleString()}
                    {stats.wins > 0 ? ` · ${stats.wins} won` : ''}
                  </Text>
                );
              })()}
            </>
          ) : (
            <View style={styles.lockBlock}>
              <View style={styles.lockChip}>
                <Text style={styles.lockChipText}>{meter.label}</Text>
              </View>
              <View style={styles.lockMeter}>
                <NeonProgressBar
                  progress={meter.total > 0 ? meter.current / meter.total : 0}
                  color={COLORS.gold}
                  height={5}
                  showGlowDot={false}
                />
              </View>
            </View>
          )}
        </View>
        {accessible && (
          <View
            style={[
              styles.cardAccent,
              { backgroundColor: accent, shadowColor: accent },
            ]}
          />
        )}
      </Pressable>
    );
  };

  const [showTooltip, setShowTooltip] = useState(
    !tooltipsShown.includes('modes_screen')
  );

  return (
    <ScreenScaffold
      title="GAME MODES"
      subtitle={`${unlockedModes.length} of ${MODES.length} unlocked`}
      backdrop="modes"
      scroll={false}
      headerRight={
        onOpenLeaderboard ? (
          <Pressable
            onPress={onOpenLeaderboard}
            accessibilityRole="button"
            accessibilityLabel="Open leaderboard"
            hitSlop={8}
            style={({ pressed }) => [pressed && styles.headerBtnPressed]}
          >
            <IconMedallion glyph={'\u{1F3C6}'} accent={COLORS.gold} size={40} />
          </Pressable>
        ) : undefined
      }
    >
      {/* Zero-height anchor: the Tooltip positions itself 100px below its
          parent, so anchoring it here (below the scaffold header) keeps it
          floating over the grid without ever occluding the header. */}
      <View style={styles.tooltipAnchor} pointerEvents="box-none">
        <Tooltip
          message="Each mode has unique rules! Unlock more modes by advancing through levels."
          visible={showTooltip}
          onDismiss={() => {
            setShowTooltip(false);
            markTooltipShown('modes_screen');
          }}
          position="top"
        />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {MODES.map(renderModeCard)}
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  tooltipAnchor: {
    height: 0,
    zIndex: 50,
  },
  headerBtnPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.85,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    minHeight: 184,
    borderWidth: 1.5,
  },
  cardLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.soft,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  accentWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  topTick: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 40,
    height: 3,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
  },
  cardContent: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  specialEyebrow: {
    fontSize: 9,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 6,
    textShadowColor: COLORS.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  medallion: {
    marginBottom: 10,
  },
  cardName: {
    fontSize: 15,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 6,
    textShadowColor: 'rgba(255,255,255,0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardStats: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  lockBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 2,
  },
  lockChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gold + '66',
    backgroundColor: 'rgba(255,184,0,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  lockChipText: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  lockMeter: {
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  cardAccent: {
    height: 3,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ModesScreen;
