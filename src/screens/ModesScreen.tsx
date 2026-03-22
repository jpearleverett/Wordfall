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
import { COLORS, GRADIENTS, FONTS, SHADOWS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';
import { Tooltip } from '../components/common/Tooltip';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MODES = [
  { id: 'classic', name: 'Classic', icon: '📖', desc: 'Solve all listed words', unlockLevel: 1, accent: '#ff6eb4' },
  { id: 'limitedMoves', name: 'Limited Moves', icon: '🎯', desc: 'Complete in exactly N moves', unlockLevel: 5, accent: '#ffd700' },
  { id: 'timePressure', name: 'Time Pressure', icon: '⏱️', desc: 'Beat the clock', unlockLevel: 8, accent: '#ff9100' },
  { id: 'perfectSolve', name: 'Perfect Solve', icon: '💎', desc: 'Zero mistakes, no assists', unlockLevel: 12, accent: '#00fff5' },
  { id: 'cascade', name: 'Cascade', icon: '🔥', desc: 'Build combo multipliers', unlockLevel: 6, accent: '#ff6b2b' },
  { id: 'daily', name: 'Daily Challenge', icon: '☀️', desc: 'Same puzzle for everyone', unlockLevel: 1, accent: '#ffe066' },
  { id: 'weekly', name: 'Weekly Special', icon: '🏆', desc: 'Curated hard puzzle', unlockLevel: 10, accent: '#c77dff' },
  { id: 'endless', name: 'Endless', icon: '♾️', desc: 'Never-ending puzzles', unlockLevel: 15, accent: '#00ffaa' },
  { id: 'expert', name: 'Expert', icon: '🧠', desc: 'Minimal hints, harder boards', unlockLevel: 20, accent: '#8ef9ff' },
  { id: 'relax', name: 'Relax', icon: '🌿', desc: 'No pressure, unlimited undos', unlockLevel: 3, accent: '#66ffcc' },
];

interface ModesScreenProps {
  onSelectMode?: (mode: string) => void;
  unlockedModes?: string[];
  playerLevel?: number;
}

const ModesScreen: React.FC<ModesScreenProps> = ({
  onSelectMode: onSelectModeProp,
  unlockedModes: unlockedModesProp,
  playerLevel: playerLevelProp,
}) => {
  const player = usePlayer();
  const onSelectMode = onSelectModeProp ?? ((_mode: string) => {});
  const unlockedModes = unlockedModesProp ?? player.unlockedModes;
  const playerLevel = playerLevelProp ?? player.currentLevel;
  const [showTooltip, setShowTooltip] = useState(!player.tooltipsShown.includes('modes_screen'));

  const isUnlocked = (mode: typeof MODES[number]): boolean => {
    return unlockedModes.includes(mode.id) || playerLevel >= mode.unlockLevel;
  };

  const renderModeCard = (mode: typeof MODES[number]) => {
    const unlocked = isUnlocked(mode);

    return (
      <TouchableOpacity
        key={mode.id}
        style={[styles.card, unlocked ? styles.cardUnlocked : styles.cardLocked]}
        onPress={() => unlocked && onSelectMode(mode.id)}
        activeOpacity={unlocked ? 0.82 : 1}
      >
        <LinearGradient
          colors={unlocked ? ['rgba(24, 0, 48, 0.96)', 'rgba(8, 10, 28, 0.96)'] : ['rgba(12, 14, 32, 0.92)', 'rgba(8, 10, 26, 0.96)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.cardAura, { backgroundColor: unlocked ? `${mode.accent}26` : 'rgba(255,255,255,0.04)' }]} />
        <View style={[styles.cardRail, { backgroundColor: unlocked ? mode.accent : 'rgba(255,255,255,0.14)' }]} />

        <View style={styles.cardContent}>
          <LinearGradient
            colors={unlocked ? [`${mode.accent}30`, 'rgba(255,255,255,0.05)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
            style={[styles.iconHalo, unlocked && { borderColor: `${mode.accent}66` }]}
          >
            <Text style={styles.cardIcon}>{unlocked ? mode.icon : '🔒'}</Text>
          </LinearGradient>
          <Text style={[styles.cardName, !unlocked && styles.textLocked, unlocked && { color: mode.accent }]}>{mode.name}</Text>
          {unlocked ? <Text style={styles.cardDesc}>{mode.desc}</Text> : <Text style={styles.lockText}>Unlocks at Level {mode.unlockLevel}</Text>}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>{unlocked ? 'ENTER MODE' : 'LOCKED'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="game" />
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>SELECT YOUR FREQUENCY</Text>
        <Text style={styles.headerTitle}>GAME MODES</Text>
        <Text style={styles.headerSubtitle}>{unlockedModes.length} of {MODES.length} modes unlocked</Text>
      </View>
      <Tooltip
        message="Each mode remixes the board rules. Unlock more frequencies by climbing levels."
        visible={showTooltip}
        onDismiss={() => {
          setShowTooltip(false);
          player.markTooltipShown('modes_screen');
        }}
        position="top"
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
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
    paddingBottom: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.display,
    color: COLORS.teal,
    letterSpacing: 2.8,
    marginBottom: 8,
    textShadowColor: COLORS.tealGlow,
    textShadowRadius: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    letterSpacing: 4,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 188,
    borderWidth: 1,
  },
  cardUnlocked: {
    borderColor: 'rgba(255,255,255,0.14)',
    ...SHADOWS.strong,
  },
  cardLocked: {
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.72,
  },
  cardAura: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    height: 74,
    borderRadius: 20,
  },
  cardRail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardContent: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconHalo: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardIcon: {
    fontSize: 34,
  },
  cardName: {
    fontSize: 16,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardFooterText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.display,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  bottomSpacer: {
    height: 120,
    width: '100%',
  },
});

export default ModesScreen;
