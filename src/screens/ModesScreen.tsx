import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants';
import { usePlayer } from '../contexts/PlayerContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MODES = [
  { id: 'classic', name: 'Classic', icon: '📖', desc: 'Solve all listed words', unlockLevel: 1 },
  { id: 'limited', name: 'Limited Moves', icon: '🎯', desc: 'Complete in exactly N moves', unlockLevel: 5 },
  { id: 'timed', name: 'Time Pressure', icon: '⏱️', desc: 'Beat the clock', unlockLevel: 8 },
  { id: 'perfect', name: 'Perfect Solve', icon: '💎', desc: 'Zero mistakes, no assists', unlockLevel: 12 },
  { id: 'cascade', name: 'Cascade', icon: '🔥', desc: 'Build combo multipliers', unlockLevel: 6 },
  { id: 'daily', name: 'Daily Challenge', icon: '☀️', desc: 'Same puzzle for everyone', unlockLevel: 1 },
  { id: 'weekly', name: 'Weekly Special', icon: '🏆', desc: 'Curated hard puzzle', unlockLevel: 10 },
  { id: 'endless', name: 'Endless', icon: '♾️', desc: 'Never-ending puzzles', unlockLevel: 15 },
  { id: 'expert', name: 'Expert', icon: '🧠', desc: 'Minimal hints, harder boards', unlockLevel: 20 },
  { id: 'relax', name: 'Relax', icon: '🌿', desc: 'No pressure, unlimited undos', unlockLevel: 3 },
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
  const isUnlocked = (mode: typeof MODES[number]): boolean => {
    return unlockedModes.includes(mode.id) || playerLevel >= mode.unlockLevel;
  };

  const renderModeCard = (mode: typeof MODES[number]) => {
    const unlocked = isUnlocked(mode);

    return (
      <TouchableOpacity
        key={mode.id}
        style={[
          styles.card,
          unlocked ? styles.cardUnlocked : styles.cardLocked,
        ]}
        onPress={() => unlocked && onSelectMode(mode.id)}
        activeOpacity={unlocked ? 0.7 : 1}
      >
        {unlocked && <View style={styles.cardGlow} />}
        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{unlocked ? mode.icon : '🔒'}</Text>
          <Text style={[styles.cardName, !unlocked && styles.textLocked]}>
            {mode.name}
          </Text>
          {unlocked ? (
            <Text style={styles.cardDesc}>{mode.desc}</Text>
          ) : (
            <Text style={styles.lockText}>
              Unlocks at Level {mode.unlockLevel}
            </Text>
          )}
        </View>
        {unlocked && (
          <View style={styles.cardAccent} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GAME MODES</Text>
        <Text style={styles.headerSubtitle}>
          {unlockedModes.length} of {MODES.length} unlocked
        </Text>
      </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 4,
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
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 160,
  },
  cardUnlocked: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  cardLocked: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.cellDefault,
    opacity: 0.6,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
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
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
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
    fontWeight: '600',
  },
  cardAccent: {
    height: 3,
    backgroundColor: COLORS.surfaceLight,
  },
  bottomSpacer: {
    height: 40,
    width: '100%',
  },
});

export default ModesScreen;
