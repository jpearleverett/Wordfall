import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, GRADIENTS, SHADOWS } from '../constants';
import { SparkleField } from './effects/ParticleSystem';
import {
  MysteryWheelState,
  WHEEL_SEGMENTS,
  WheelSegment,
  spinWheel,
  openMysteryBox,
  SPIN_COST_GEMS,
  SPIN_BUNDLE_COST_GEMS,
  SPIN_BUNDLE_COUNT,
} from '../data/mysteryWheel';

interface MysteryWheelProps {
  wheelState: MysteryWheelState;
  gems: number;
  onSpin: (result: { segment: WheelSegment; updatedState: MysteryWheelState }) => void;
  onBuySpin: (cost: number, count: number) => void;
  onDismiss: () => void;
}

const SEGMENT_COUNT = WHEEL_SEGMENTS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

export function MysteryWheel({
  wheelState,
  gems,
  onSpin,
  onBuySpin,
  onDismiss,
}: MysteryWheelProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [mysteryBoxResult, setMysteryBoxResult] = useState<{ label: string; icon: string } | null>(null);
  const currentRotation = useRef(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleSpin = useCallback(() => {
    if (spinning || wheelState.spinsAvailable <= 0) return;

    setSpinning(true);
    setResult(null);
    setMysteryBoxResult(null);

    const { segment, segmentIndex, updatedState } = spinWheel(wheelState);

    // Calculate rotation: multiple full rotations + land on target segment
    const targetAngle = 360 - (segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const fullRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const totalRotation = currentRotation.current + fullRotations * 360 + targetAngle - (currentRotation.current % 360);

    Animated.timing(rotateAnim, {
      toValue: totalRotation,
      duration: 3500 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current = totalRotation;
      setResult(segment);
      setSpinning(false);

      // Show result animation
      Animated.spring(resultAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }).start();

      // If mystery box, auto-open after delay
      if (segment.reward.mysteryBox) {
        setTimeout(() => {
          const boxResult = openMysteryBox();
          setMysteryBoxResult(boxResult);
        }, 1000);
      }

      onSpin({ segment, updatedState });
    });
  }, [spinning, wheelState, rotateAnim, resultAnim, onSpin]);

  const handleBuySpin = useCallback((count: number) => {
    const cost = count === 1 ? SPIN_COST_GEMS : SPIN_BUNDLE_COST_GEMS;
    if (gems >= cost) {
      onBuySpin(cost, count);
    }
  }, [gems, onBuySpin]);

  const spinRotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const canSpin = wheelState.spinsAvailable > 0 && !spinning;
  const canBuy1 = gems >= SPIN_COST_GEMS;
  const canBuy5 = gems >= SPIN_BUNDLE_COST_GEMS;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <SparkleField count={12} intensity="medium" />

      <View style={styles.header}>
        <Text style={styles.title}>Mystery Wheel</Text>
        <Text style={styles.spinsLeft}>{wheelState.spinsAvailable} spin{wheelState.spinsAvailable !== 1 ? 's' : ''} available</Text>
      </View>

      {/* Wheel */}
      <View style={styles.wheelContainer}>
        {/* Pointer at top */}
        <View style={styles.pointer}>
          <Text style={styles.pointerArrow}>{'\u{25BC}'}</Text>
        </View>

        <Animated.View style={[styles.wheel, { transform: [{ rotate: spinRotation }] }]}>
          {WHEEL_SEGMENTS.map((seg, i) => {
            const angle = i * SEGMENT_ANGLE;
            return (
              <View
                key={seg.id}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -65 },
                    ],
                  },
                ]}
              >
                <Text style={[styles.segmentIcon, { textShadowColor: seg.color }]}>{seg.icon}</Text>
              </View>
            );
          })}

          {/* Colored ring sections */}
          {WHEEL_SEGMENTS.map((seg, i) => {
            const angle = i * SEGMENT_ANGLE;
            return (
              <View
                key={`ring_${seg.id}`}
                style={[
                  styles.ringSection,
                  {
                    backgroundColor: seg.color + '40',
                    borderColor: seg.color + '60',
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -85 },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Center hub */}
        <View style={styles.hub}>
          <Text style={styles.hubText}>{spinning ? '...' : '?'}</Text>
        </View>
      </View>

      {/* Result display */}
      {result && !spinning && (
        <Animated.View style={[styles.resultCard, { transform: [{ scale: resultAnim }] }]}>
          <LinearGradient colors={GRADIENTS.surfaceCard} style={styles.resultInner}>
            <Text style={styles.resultIcon}>{result.icon}</Text>
            <Text style={[styles.resultLabel, { color: result.color }]}>{result.label}</Text>
            {result.rarity !== 'common' && (
              <Text style={[styles.resultRarity, { color: result.color }]}>{result.rarity.toUpperCase()}</Text>
            )}
            {mysteryBoxResult && (
              <View style={styles.mysteryBoxReveal}>
                <Text style={styles.mysteryBoxLabel}>Contains:</Text>
                <Text style={styles.mysteryBoxIcon}>{mysteryBoxResult.icon}</Text>
                <Text style={styles.mysteryBoxReward}>{mysteryBoxResult.label}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [!canSpin && styles.buttonDisabled, pressed && styles.buttonPressed]}
          onPress={handleSpin}
          disabled={!canSpin}
        >
          <LinearGradient
            colors={canSpin ? GRADIENTS.button.primary : ['#333', '#222']}
            style={styles.spinButton}
          >
            <Text style={styles.spinButtonText}>
              {spinning ? 'SPINNING...' : `SPIN${wheelState.spinsAvailable > 0 ? ` (${wheelState.spinsAvailable})` : ''}`}
            </Text>
          </LinearGradient>
        </Pressable>

        {wheelState.spinsAvailable === 0 && !spinning && (
          <View style={styles.buyRow}>
            <Pressable
              style={({ pressed }) => [!canBuy1 && styles.buttonDisabled, pressed && styles.buttonPressed]}
              onPress={() => handleBuySpin(1)}
              disabled={!canBuy1}
            >
              <View style={styles.buyButton}>
                <Text style={styles.buyText}>1 Spin</Text>
                <Text style={styles.buyPrice}>{'\u{1F48E}'} {SPIN_COST_GEMS}</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [!canBuy5 && styles.buttonDisabled, pressed && styles.buttonPressed]}
              onPress={() => handleBuySpin(SPIN_BUNDLE_COUNT)}
              disabled={!canBuy5}
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

      <Pressable style={styles.closeButton} onPress={onDismiss}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 20, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 200,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: COLORS.gold,
    fontSize: 28,
    fontFamily: FONTS.display,
    letterSpacing: 2,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 12,
  },
  spinsLeft: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  wheelContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pointer: {
    position: 'absolute',
    top: -4,
    zIndex: 10,
  },
  pointerArrow: {
    color: COLORS.coral,
    fontSize: 28,
    textShadowColor: COLORS.coral,
    textShadowRadius: 8,
  },
  wheel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.surface + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.strong,
  },
  segment: {
    position: 'absolute',
    alignItems: 'center',
  },
  segmentIcon: {
    fontSize: 22,
    textShadowRadius: 6,
  },
  ringSection: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  hub: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  hubText: {
    color: COLORS.gold,
    fontSize: 20,
    fontFamily: FONTS.display,
  },
  resultCard: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 16,
  },
  resultInner: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 18,
    fontFamily: FONTS.display,
    letterSpacing: 1,
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
    alignItems: 'center',
    gap: 12,
  },
  spinButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    ...SHADOWS.medium,
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
  },
  buyButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
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
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
