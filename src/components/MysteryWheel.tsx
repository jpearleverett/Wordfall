import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Easing as RNEasing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { bentoDividerColor } from '../styles/bentoPanel';
import { SparkleField } from './effects/ParticleSystem';
import {
  MysteryWheelState,
  WHEEL_SEGMENTS,
  WheelSegment,
  spinWheel,
  openMysteryBox,
  checkDailyFreeSpin,
  SPIN_COST_GEMS,
  SPIN_BUNDLE_COST_GEMS,
  SPIN_BUNDLE_COUNT,
  MYSTERY_BOX_REWARDS,
} from '../data/mysteryWheel';

interface MysteryWheelProps {
  wheelState: MysteryWheelState;
  gems: number;
  onSpin: (result: { segment: WheelSegment; updatedState: MysteryWheelState; mysteryBoxReward?: { label: string; icon: string; reward: any } }) => void;
  onBuySpin: (cost: number, count: number) => void;
  onDismiss: () => void;
}

const SEGMENT_COUNT = WHEEL_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const WHEEL_RADIUS = 130; // Must match styles.wheel width/height/2.
const SLICE_BASE_HALF = WHEEL_RADIUS * Math.tan((SEGMENT_ANGLE / 2) * (Math.PI / 180));

export function MysteryWheel({
  wheelState,
  gems,
  onSpin,
  onBuySpin,
  onDismiss,
}: MysteryWheelProps) {
  const { t } = useTranslation();
  const rotate = useSharedValue(0);
  const fade = useSharedValue(0);
  const resultProgress = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [mysteryBoxResult, setMysteryBoxResult] = useState<{ label: string; icon: string } | null>(null);
  const [oddsVisible, setOddsVisible] = useState(false);
  const currentRotation = useRef(0);

  // Pre-compute each segment's probability from its weight for public disclosure.
  const wheelOdds = useMemo(() => {
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    return WHEEL_SEGMENTS.map((s) => ({
      segment: s,
      percent: (s.weight / totalWeight) * 100,
    }));
  }, []);

  const mysteryBoxOdds = useMemo(() => {
    const totalWeight = MYSTERY_BOX_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    return MYSTERY_BOX_REWARDS.map((r) => ({
      reward: r,
      percent: (r.weight / totalWeight) * 100,
    }));
  }, []);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 300 });
  }, []);

  const hasDailyFreeSpin = checkDailyFreeSpin(wheelState.lastDailySpinDate);
  const isDailyFreeSpinOnly = wheelState.spinsAvailable <= 0 && hasDailyFreeSpin;

  const handleSpin = useCallback(() => {
    const canSpinNow = wheelState.spinsAvailable > 0 || checkDailyFreeSpin(wheelState.lastDailySpinDate);
    if (spinning || !canSpinNow) return;

    setSpinning(true);
    setResult(null);
    setMysteryBoxResult(null);

    // If using daily free spin (no puzzle-earned spins), temporarily add 1 so spinWheel works
    const stateForSpin = wheelState.spinsAvailable <= 0
      ? { ...wheelState, spinsAvailable: 1 }
      : wheelState;
    const { segment, segmentIndex, updatedState: rawUpdatedState } = spinWheel(stateForSpin);

    // If this was a daily free spin, mark the date consumed
    const updatedState = wheelState.spinsAvailable <= 0
      ? { ...rawUpdatedState, lastDailySpinDate: new Date().toISOString().split('T')[0] }
      : rawUpdatedState;

    // Calculate rotation: multiple full rotations + land on target segment
    const targetAngle = 360 - (segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const fullRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const totalRotation = currentRotation.current + fullRotations * 360 + targetAngle - (currentRotation.current % 360);

    const spinDuration = 3500 + Math.random() * 1000;
    rotate.value = withTiming(totalRotation, {
      duration: spinDuration,
      easing: Easing.out(Easing.cubic),
    }, () => {
      runOnJS(onSpinComplete)(segment, updatedState, null);
    });

    // Callback for spin completion
    function onSpinComplete(_seg: WheelSegment, _state: MysteryWheelState, _mystery: any) {
      currentRotation.current = totalRotation;
      setResult(segment);
      setSpinning(false);

      // Show result animation
      resultProgress.value = withSpring(1, { damping: 8, stiffness: 120 });

      // If mystery box, open immediately for reward granting, show visually after delay
      let mysteryBoxReward: { label: string; icon: string; reward: any } | undefined;
      if (segment.reward.mysteryBox) {
        const boxResult = openMysteryBox();
        mysteryBoxReward = boxResult;
        setTimeout(() => {
          setMysteryBoxResult(boxResult);
        }, 1000);
      }

      onSpin({ segment, updatedState, mysteryBoxReward });
    }
  }, [spinning, wheelState, onSpin]);

  const handleBuySpin = useCallback((count: number) => {
    const cost = count === 1 ? SPIN_COST_GEMS : SPIN_BUNDLE_COST_GEMS;
    if (gems >= cost) {
      onBuySpin(cost, count);
    }
  }, [gems, onBuySpin]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  const overlayFadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const resultCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultProgress.value }],
  }));

  const canSpin = (wheelState.spinsAvailable > 0 || hasDailyFreeSpin) && !spinning;
  const canBuy1 = gems >= SPIN_COST_GEMS;
  const canBuy5 = gems >= SPIN_BUNDLE_COST_GEMS;

  return (
    <Animated.View style={[styles.overlay, overlayFadeStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss mystery wheel" />
      <View style={styles.sheet} pointerEvents="box-none">
        <LinearGradient
          colors={['#1a0a3a', '#0a0215']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SparkleField count={12} intensity="medium" />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>MYSTERY WHEEL</Text>
          <Pressable
            style={styles.closeX}
            onPress={onDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close mystery wheel"
          >
            <Text style={styles.closeXText}>{'✕'}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.sheetBody}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.spinsLeft}>
            {t('common.spinsAvailable', { count: wheelState.spinsAvailable })}
          </Text>

          {/* Wheel */}
          <View style={styles.wheelContainer}>
            {/* Pointer at top (gold triangle) */}
            <View style={styles.pointer} pointerEvents="none">
              <View style={styles.pointerTriangle} />
            </View>

            <Animated.View style={[styles.wheel, wheelStyle]}>
              {/* 11 colored pie slices (border-triangle trick). Each slice owns
                  its segment's color so the pointer landing is unambiguous. */}
              {WHEEL_SEGMENTS.map((seg, i) => (
                <View
                  key={`slice_${seg.id}`}
                  pointerEvents="none"
                  style={[
                    styles.slice,
                    {
                      borderTopColor: seg.color,
                      transform: [{ rotate: `${(i + 0.5) * SEGMENT_ANGLE}deg` }],
                    },
                  ]}
                />
              ))}

              {/* Subtle inner-to-outer vignette for depth without hiding colors */}
              <LinearGradient
                colors={[`${COLORS.bg}00`, `${COLORS.bg}55`]}
                start={{ x: 0.5, y: 0.35 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              {/* Dark spoke dividers — one per boundary, from rim to center */}
              {WHEEL_SEGMENTS.map((seg, i) => (
                <View
                  key={`div_${seg.id}`}
                  style={[
                    styles.sliceDivider,
                    {
                      transform: [{ rotate: `${i * SEGMENT_ANGLE}deg` }],
                    },
                  ]}
                  pointerEvents="none"
                />
              ))}

              {/* Per-segment color chip + icon */}
              {WHEEL_SEGMENTS.map((seg, i) => {
                const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                return (
                  <View
                    key={seg.id}
                    style={[
                      styles.segment,
                      {
                        transform: [
                          { rotate: `${angle}deg` },
                          { translateY: -82 },
                        ],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <View
                      style={[
                        styles.segmentChip,
                        {
                          backgroundColor: seg.color + 'EE',
                          borderColor: seg.color,
                          shadowColor: seg.color,
                        },
                      ]}
                    >
                      <Text style={styles.segmentIcon}>{seg.icon}</Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            {/* Center hub — radial-gradient approximation (white → purple) */}
            <View style={styles.hub} pointerEvents="none">
              <LinearGradient
                colors={['#ffffff', '#a85bff']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.3, y: 0.3 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.hubText}>{spinning ? '⚡' : '⚡'}</Text>
            </View>
          </View>

          {/* Result display */}
          {result && !spinning && (
            <Animated.View style={[styles.resultChipWrap, resultCardStyle]}>
              <View
                style={[
                  styles.resultChip,
                  {
                    backgroundColor: result.color + '33',
                    borderColor: result.color,
                    shadowColor: result.color,
                  },
                ]}
              >
                <Text style={styles.resultChipText}>
                  + {result.label} {result.icon}
                </Text>
                {result.rarity !== 'common' && (
                  <Text style={[styles.resultRarity, { color: result.color }]}>
                    {result.rarity.toUpperCase()}
                  </Text>
                )}
                {mysteryBoxResult && (
                  <View style={styles.mysteryBoxReveal}>
                    <Text style={styles.mysteryBoxLabel}>Contains:</Text>
                    <Text style={styles.mysteryBoxIcon}>{mysteryBoxResult.icon}</Text>
                    <Text style={styles.mysteryBoxReward}>{mysteryBoxResult.label}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [!canSpin && styles.buttonDisabled, pressed && styles.buttonPressed]}
              onPress={handleSpin}
              disabled={!canSpin}
              accessibilityRole="button"
              accessibilityLabel={spinning ? 'Wheel is spinning' : isDailyFreeSpinOnly ? 'Use daily free spin' : `Spin the wheel${wheelState.spinsAvailable > 0 ? `, ${wheelState.spinsAvailable} spins available` : ''}`}
            >
              <LinearGradient
                colors={canSpin ? GRADIENTS.button.primary : ['#333', '#222']}
                style={styles.spinButton}
              >
                <Text style={styles.spinButtonText}>
                  {spinning ? 'SPINNING…' : isDailyFreeSpinOnly ? 'DAILY FREE SPIN' : `SPIN${wheelState.spinsAvailable > 0 ? ` (${wheelState.spinsAvailable})` : ''}`}
                </Text>
              </LinearGradient>
            </Pressable>

            {wheelState.spinsAvailable === 0 && !hasDailyFreeSpin && !spinning && (
              <View style={styles.buyRow}>
                <Pressable
                  style={({ pressed }) => [styles.buyPressable, !canBuy1 && styles.buttonDisabled, pressed && styles.buttonPressed]}
                  onPress={() => handleBuySpin(1)}
                  disabled={!canBuy1}
                  accessibilityRole="button"
                  accessibilityLabel={`Buy 1 spin for ${SPIN_COST_GEMS} gems`}
                >
                  <View style={styles.buyButton}>
                    <Text style={styles.buyText}>1 Spin</Text>
                    <Text style={styles.buyPrice}>{'\u{1F48E}'} {SPIN_COST_GEMS}</Text>
                    <Text style={styles.buyDiscountPlaceholder}> </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.buyPressable, !canBuy5 && styles.buttonDisabled, pressed && styles.buttonPressed]}
                  onPress={() => handleBuySpin(SPIN_BUNDLE_COUNT)}
                  disabled={!canBuy5}
                  accessibilityRole="button"
                  accessibilityLabel={`Buy ${SPIN_BUNDLE_COUNT} spins for ${SPIN_BUNDLE_COST_GEMS} gems, 20 percent off`}
                >
                  <View style={[styles.buyButton, styles.buyButtonBundle]}>
                    <Text style={styles.buyText}>{SPIN_BUNDLE_COUNT} Spins</Text>
                    <Text style={styles.buyPrice}>{'\u{1F48E}'} {SPIN_BUNDLE_COST_GEMS}</Text>
                    <Text style={styles.buyDiscount}>20% OFF</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>

          {hasDailyFreeSpin && !spinning && (
            <Text style={styles.footerHint}>{'▸ 1 free spin per day'}</Text>
          )}

          {/* Publicly-visible odds disclosure (required for paid loot boxes) */}
          <Pressable
            style={styles.oddsLinkButton}
            onPress={() => setOddsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="View wheel odds and probabilities"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.oddsLinkText}>View odds</Text>
          </Pressable>
        </ScrollView>
      </View>

      <Modal
        visible={oddsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOddsVisible(false)}
      >
        <View style={styles.oddsBackdrop}>
          <View style={styles.oddsCard}>
            <Text style={styles.oddsTitle}>Mystery Wheel Odds</Text>
            <Text style={styles.oddsSubtitle}>
              Each spin picks one segment below using these probabilities.
            </Text>
            <ScrollView style={styles.oddsScroll} showsVerticalScrollIndicator={false}>
              {wheelOdds.map(({ segment, percent }) => (
                <View key={segment.id} style={styles.oddsRow}>
                  <Text style={[styles.oddsIcon, { textShadowColor: segment.color }]}>
                    {segment.icon}
                  </Text>
                  <View style={styles.oddsRowText}>
                    <Text style={styles.oddsLabel}>{segment.label}</Text>
                    <Text style={[styles.oddsRarity, { color: segment.color }]}>
                      {segment.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.oddsPercent}>{percent.toFixed(2)}%</Text>
                </View>
              ))}

              <View style={styles.oddsDivider} />
              <Text style={styles.oddsSectionTitle}>Mystery Box secondary rewards</Text>
              <Text style={styles.oddsSubtitle}>
                When the wheel lands on "Mystery Box", one of these is rolled.
              </Text>
              {mysteryBoxOdds.map(({ reward, percent }) => (
                <View key={reward.label} style={styles.oddsRow}>
                  <Text style={styles.oddsIcon}>{reward.icon}</Text>
                  <View style={styles.oddsRowText}>
                    <Text style={styles.oddsLabel}>{reward.label}</Text>
                  </View>
                  <Text style={styles.oddsPercent}>{percent.toFixed(2)}%</Text>
                </View>
              ))}
              <Text style={styles.oddsFootnote}>
                A "pity" rule also guarantees at least one rare+ reward every
                25 spins.
              </Text>
            </ScrollView>
            <Pressable
              style={styles.oddsClose}
              onPress={() => setOddsVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close odds disclosure"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.oddsCloseText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 1, 15, 0.75)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.purple + '66',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: bentoDividerColor('purple'),
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 1.5,
    textShadowColor: COLORS.purple,
    textShadowRadius: 8,
  },
  closeX: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.purple + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeXText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  spinsLeft: {
    color: COLORS.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 12,
  },
  wheelContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  wheel: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
  },
  slice: {
    position: 'absolute',
    top: 0,
    left: WHEEL_RADIUS - SLICE_BASE_HALF,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: SLICE_BASE_HALF,
    borderRightWidth: SLICE_BASE_HALF,
    borderTopWidth: WHEEL_RADIUS,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transformOrigin: 'center bottom',
  },
  sliceDivider: {
    position: 'absolute',
    top: 0,
    left: WHEEL_RADIUS - 1.5,
    width: 3,
    height: WHEEL_RADIUS,
    backgroundColor: 'rgba(10,2,21,0.95)',
    transformOrigin: 'center bottom',
  },
  segment: {
    position: 'absolute',
    alignItems: 'center',
  },
  segmentChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
  segmentIcon: {
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 2,
  },
  hub: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  hubText: {
    color: '#0a0215',
    fontSize: 22,
    fontFamily: FONTS.display,
  },
  resultChipWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  resultChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
  },
  resultChipText: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1.5,
    fontFamily: FONTS.display,
  },
  resultRarity: {
    fontSize: 10,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    marginTop: 4,
  },
  mysteryBoxReveal: {
    marginTop: 12,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  mysteryBoxLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  mysteryBoxIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  mysteryBoxReward: {
    color: COLORS.gold,
    fontFamily: FONTS.display,
    fontSize: 14,
  },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  spinButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  footerHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 12,
    fontFamily: FONTS.bodyMedium,
  },
  spinButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 2,
  },
  buyRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  buyPressable: {
    flex: 1,
  },
  buyButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    minHeight: 74,
    justifyContent: 'center',
  },
  buyButtonBundle: {
    borderColor: COLORS.gold + '40',
  },
  buyText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.display,
    fontSize: 13,
  },
  buyPrice: {
    color: COLORS.accent,
    fontSize: 12,
    marginTop: 2,
  },
  buyDiscount: {
    color: COLORS.green,
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    marginTop: 2,
  },
  buyDiscountPlaceholder: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 2,
    opacity: 0,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  oddsLinkButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  oddsLinkText: {
    color: COLORS.accent,
    fontSize: 13,
    textDecorationLine: 'underline',
    fontFamily: FONTS.bodySemiBold,
  },
  oddsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  oddsCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#110028',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 18,
  },
  oddsTitle: {
    color: COLORS.gold,
    fontSize: 20,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  oddsSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  oddsScroll: {
    flexGrow: 0,
  },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  oddsIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  oddsRowText: {
    flex: 1,
    marginLeft: 10,
  },
  oddsLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
  oddsRarity: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    marginTop: 2,
  },
  oddsPercent: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    minWidth: 64,
    textAlign: 'right',
  },
  oddsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  oddsSectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  oddsFootnote: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 14,
  },
  oddsClose: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  oddsCloseText: {
    color: '#0a0015',
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1,
  },
});
