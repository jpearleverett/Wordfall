import React from 'react';
import { useTranslation } from 'react-i18next';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField, CelebrationBurst } from './effects/ParticleSystem';
import { useDeferredMount } from '../utils/perfInstrument';
import GameIcon from './icons/GameIcon';
import { useCeremonyTransition, CEREMONY_LAYER } from '../hooks/useCeremonyTransition';

interface CollectionCompleteCeremonyProps {
  collectionName: string;
  collectionIcon: string;
  reward: { coins: number; gems: number };
  onDismiss: () => void;
}

export function CollectionCompleteCeremony({
  collectionName,
  collectionIcon,
  reward,
  onDismiss,
}: CollectionCompleteCeremonyProps) {
  // Shared ceremony transition: one entrance, one faster exit, instant
  // settle + instant dismiss under reduced motion, stop-on-unmount.
  const { animateDecorations, overlayStyle, cardStyle, requestDismiss } =
    useCeremonyTransition(onDismiss);
  const { t } = useTranslation();
  // Burst origin follows the real window (the old hardcoded 180/200 was
  // tuned for one device width and drifted off-center everywhere else).
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const decorationsMounted = useDeferredMount(280);

  return (
    <RNAnimated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={`${t('ceremony.collectionComplete')}. ${collectionName}. ${t('ceremony.foundEveryItem')}`}
    >
      {decorationsMounted && animateDecorations && (
        <SparkleField count={26} intensity="intense" colors={[COLORS.gold, COLORS.accent, COLORS.purple, '#fff']} />
      )}
      {decorationsMounted && animateDecorations && (
        <CelebrationBurst centerX={windowWidth / 2} centerY={windowHeight * 0.25} particleCount={20} />
      )}
      <RNAnimated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.cardInner}>
          <Text style={styles.ribbon}>{t('ceremony.collectionComplete')}</Text>
          <Text style={styles.icon}>{collectionIcon}</Text>
          <Text style={styles.name}>{collectionName}</Text>
          <Text style={styles.subtitle}>{t('ceremony.foundEveryItem')}</Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <GameIcon name="coin" size={18} />
              <Text style={styles.rewardAmount}>+{reward.coins}</Text>
            </View>
            {reward.gems > 0 && (
              <View style={styles.rewardChip}>
                <GameIcon name="gem" size={18} />
                <Text style={[styles.rewardAmount, { color: COLORS.accent }]}>+{reward.gems}</Text>
              </View>
            )}
          </View>

          <Pressable style={({ pressed }) => [pressed && styles.buttonPressed]} onPress={requestDismiss}>
            <LinearGradient colors={GRADIENTS.button.gold} style={styles.button}>
              <Text style={styles.buttonText}>{t('ceremony.wonderful')}</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </RNAnimated.View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 2, 14, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: CEREMONY_LAYER,
  },
  card: { width: '100%', maxWidth: 320, ...SHADOWS.strong },
  cardInner: {
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  ribbon: {
    color: COLORS.gold,
    fontSize: 11,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginBottom: 16,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 8,
  },
  icon: { fontSize: 48, marginBottom: 12 },
  name: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.display,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 20,
  },
  rewardRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardEmoji: { fontSize: 16 },
  rewardIconImg: { width: 18, height: 18 },
  rewardAmount: { color: COLORS.gold, fontFamily: FONTS.display, fontSize: 14 },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    ...SHADOWS.glow(COLORS.gold),
  },
  buttonText: {
    color: COLORS.bg,
    fontSize: 14,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
  },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
});
