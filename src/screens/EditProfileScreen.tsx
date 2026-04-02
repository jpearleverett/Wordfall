import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { AmbientBackdrop } from '../components/common/AmbientBackdrop';
import { usePlayer } from '../contexts/PlayerContext';
import { PROFILE_FRAMES, PROFILE_TITLES, COSMETIC_THEMES } from '../data/cosmetics';
import { ProfileFrame, ProfileTitle, CosmeticTheme } from '../types';

const { width } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: COLORS.rarityCommon,
  rare: COLORS.rarityRare,
  epic: COLORS.rarityEpic,
  legendary: COLORS.rarityLegendary,
};

interface EditProfileScreenProps {
  navigation?: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const player = usePlayer();

  const isOwned = useCallback(
    (id: string) =>
      id === 'default' ||
      id === 'title_newcomer' ||
      player.unlockedCosmetics.includes(id),
    [player.unlockedCosmetics],
  );

  const sortedFrames = useMemo(() => {
    const equipped: ProfileFrame[] = [];
    const owned: ProfileFrame[] = [];
    const locked: ProfileFrame[] = [];
    for (const f of PROFILE_FRAMES) {
      if (f.id === player.equippedFrame) equipped.push(f);
      else if (isOwned(f.id)) owned.push(f);
      else locked.push(f);
    }
    return [...equipped, ...owned, ...locked];
  }, [player.equippedFrame, isOwned]);

  const sortedTitles = useMemo(() => {
    const equipped: ProfileTitle[] = [];
    const owned: ProfileTitle[] = [];
    const locked: ProfileTitle[] = [];
    for (const t of PROFILE_TITLES) {
      if (t.title === player.equippedTitle) equipped.push(t);
      else if (isOwned(t.id)) owned.push(t);
      else locked.push(t);
    }
    return [...equipped, ...owned, ...locked];
  }, [player.equippedTitle, isOwned]);

  const sortedThemes = useMemo(() => {
    const equipped: CosmeticTheme[] = [];
    const owned: CosmeticTheme[] = [];
    const locked: CosmeticTheme[] = [];
    for (const t of COSMETIC_THEMES) {
      if (t.id === player.equippedTheme) equipped.push(t);
      else if (isOwned(t.id)) owned.push(t);
      else locked.push(t);
    }
    return [...equipped, ...owned, ...locked];
  }, [player.equippedTheme, isOwned]);

  const equippedFrameData = useMemo(
    () => PROFILE_FRAMES.find((f) => f.id === player.equippedFrame) ?? PROFILE_FRAMES[0],
    [player.equippedFrame],
  );

  const frameRarityColor = RARITY_COLORS[equippedFrameData.rarity] ?? COLORS.rarityCommon;
  const initial = 'P'; // Player initial

  const handleEquipFrame = useCallback(
    (frame: ProfileFrame) => {
      if (isOwned(frame.id)) player.equipCosmetic('frame', frame.id);
    },
    [isOwned, player],
  );

  const handleEquipTitle = useCallback(
    (title: ProfileTitle) => {
      if (isOwned(title.id)) player.equipCosmetic('title', title.title);
    },
    [isOwned, player],
  );

  const handleEquipTheme = useCallback(
    (theme: CosmeticTheme) => {
      if (isOwned(theme.id)) player.equipCosmetic('theme', theme.id);
    },
    [isOwned, player],
  );

  const renderFrameItem = useCallback(
    ({ item: frame }: { item: ProfileFrame }) => {
      const owned = isOwned(frame.id);
      const equipped = frame.id === player.equippedFrame;
      const rarityColor = RARITY_COLORS[frame.rarity] ?? COLORS.rarityCommon;

      return (
        <Pressable
          onPress={() => handleEquipFrame(frame)}
          style={({ pressed }) => [
            styles.frameCard,
            equipped && { borderColor: COLORS.accent + '80' },
            !owned && styles.lockedItem,
            pressed && owned && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Mini avatar with frame rarity ring */}
          <View
            style={[
              styles.framePreviewRing,
              { borderColor: owned ? rarityColor : 'rgba(255,255,255,0.15)' },
            ]}
          >
            <View style={styles.framePreviewCircle}>
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              {owned ? (
                <Text style={styles.framePreviewLetter}>{initial}</Text>
              ) : (
                <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.frameName, !owned && styles.lockedText]} numberOfLines={1}>
            {frame.name}
          </Text>
          <Text style={[styles.frameRarity, { color: rarityColor }]}>
            {frame.rarity.charAt(0).toUpperCase() + frame.rarity.slice(1)}
          </Text>
          {equipped && (
            <View style={styles.equippedBadge}>
              <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
            </View>
          )}
          {!owned && (
            <Text style={styles.sourceText} numberOfLines={2}>
              {frame.source}
            </Text>
          )}
        </Pressable>
      );
    },
    [isOwned, player.equippedFrame, handleEquipFrame],
  );

  const renderThemeItem = useCallback(
    ({ item: theme }: { item: CosmeticTheme }) => {
      const owned = isOwned(theme.id);
      const equipped = theme.id === player.equippedTheme;

      return (
        <Pressable
          onPress={() => handleEquipTheme(theme)}
          style={({ pressed }) => [
            styles.themeCard,
            equipped && { borderColor: COLORS.accent + '80' },
            !owned && styles.lockedItem,
            pressed && owned && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
        >
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Color swatches */}
          <View style={styles.swatchRow}>
            {[theme.colors.bg, theme.colors.surface, theme.colors.accent, theme.colors.cellSelected].map(
              (color, i) => (
                <View
                  key={i}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    !owned && { opacity: 0.4 },
                  ]}
                />
              ),
            )}
          </View>
          {!owned && <Text style={styles.themeLockIcon}>{'\u{1F512}'}</Text>}
          <Text style={[styles.themeName, !owned && styles.lockedText]} numberOfLines={1}>
            {theme.name}
          </Text>
          {equipped && (
            <View style={styles.equippedBadge}>
              <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
            </View>
          )}
          {!owned && theme.cost && (
            <Text style={styles.costText}>
              {theme.cost.currency === 'gems' ? '\u{1F48E}' : '\u{1FA99}'} {theme.cost.amount}
            </Text>
          )}
        </Pressable>
      );
    },
    [isOwned, player.equippedTheme, handleEquipTheme],
  );

  return (
    <View style={styles.container}>
      <AmbientBackdrop variant="profile" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backIcon}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Live Preview */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={[styles.avatarRing, { borderColor: frameRarityColor, shadowColor: frameRarityColor }]}>
            <View style={styles.avatarCircle}>
              <LinearGradient
                colors={[...GRADIENTS.surfaceCard]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={[...GRADIENTS.button.primary]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.levelText}>Lv.{player.currentLevel}</Text>
          </View>
          <Text style={styles.playerName}>Player</Text>
          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>{player.equippedTitle}</Text>
          </View>
          <Text style={styles.frameLabelText}>
            {equippedFrameData.name} Frame
          </Text>
        </View>

        {/* Profile Frames */}
        <Text style={styles.sectionTitle}>Profile Frames</Text>
        <FlatList
          data={sortedFrames}
          renderItem={renderFrameItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled
        />

        {/* Profile Titles */}
        <Text style={styles.sectionTitle}>Profile Titles</Text>
        <View style={styles.titlesContainer}>
          <LinearGradient
            colors={[...GRADIENTS.surfaceCard]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {sortedTitles.map((title, index) => {
            const owned = isOwned(title.id);
            const equipped = title.title === player.equippedTitle;

            return (
              <React.Fragment key={title.id}>
                {index > 0 && <View style={styles.titleDivider} />}
                <Pressable
                  onPress={() => handleEquipTitle(title)}
                  style={({ pressed }) => [
                    styles.titleRow,
                    !owned && styles.lockedItem,
                    pressed && owned && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.titleRowLeft}>
                    {!owned && (
                      <Text style={styles.titleLockIcon}>{'\u{1F512}'}</Text>
                    )}
                    <Text
                      style={[
                        styles.titleName,
                        equipped && { color: COLORS.gold },
                        !owned && styles.lockedText,
                      ]}
                    >
                      {title.title}
                    </Text>
                  </View>
                  <View style={styles.titleRowRight}>
                    {equipped ? (
                      <View style={styles.equippedPill}>
                        <Text style={styles.equippedPillText}>EQUIPPED</Text>
                      </View>
                    ) : owned ? (
                      <Text style={styles.tapToEquipText}>Tap to equip</Text>
                    ) : (
                      <Text style={styles.titleSourceText} numberOfLines={1}>
                        {title.source}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Color Themes */}
        <Text style={styles.sectionTitle}>Color Themes</Text>
        <FlatList
          data={sortedThemes}
          renderItem={renderThemeItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const FRAME_CARD_SIZE = 100;
const THEME_CARD_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
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
  headerSpacer: {
    width: 40,
  },

  // Preview card
  previewCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.medium,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLetter: {
    fontSize: 40,
    fontFamily: FONTS.display,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  levelBadge: {
    marginTop: -12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    zIndex: 1,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  levelText: {
    fontSize: 12,
    fontFamily: FONTS.display,
    color: COLORS.bg,
  },
  playerName: {
    fontSize: 24,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    marginTop: 12,
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  titleBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  titleText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.gold,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  frameLabelText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  horizontalList: {
    paddingRight: 16,
    gap: 12,
  },

  // Frame cards
  frameCard: {
    width: FRAME_CARD_SIZE,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  framePreviewRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  framePreviewCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  framePreviewLetter: {
    fontSize: 20,
    fontFamily: FONTS.display,
    color: COLORS.accent,
  },
  lockIcon: {
    fontSize: 16,
  },
  frameName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  frameRarity: {
    fontSize: 9,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 9,
    fontFamily: FONTS.bodyRegular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Title rows
  titlesContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  titleDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  titleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleRowRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  titleLockIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  titleName: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
  },
  tapToEquipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
  },
  titleSourceText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    maxWidth: 140,
  },

  // Theme cards
  themeCard: {
    width: THEME_CARD_SIZE,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeLockIcon: {
    fontSize: 14,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  themeName: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  costText: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Shared
  equippedBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  equippedBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  equippedPill: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  equippedPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
  lockedItem: {
    opacity: 0.5,
  },
  lockedText: {
    color: COLORS.textMuted,
  },

  bottomSpacer: {
    height: 100,
  },
});

export default EditProfileScreen;
