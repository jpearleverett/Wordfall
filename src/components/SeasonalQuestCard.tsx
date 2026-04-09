import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../constants';
import { SeasonalQuest, SeasonalQuestState, getQuestProgress } from '../data/seasonalQuests';

interface SeasonalQuestCardProps {
  quest: SeasonalQuest;
  state: SeasonalQuestState;
  onClaimStep: () => void;
}

const SeasonalQuestCard: React.FC<SeasonalQuestCardProps> = ({
  quest,
  state,
  onClaimStep,
}) => {
  const pulse = useSharedValue(1);
  const { currentStep, progress, isComplete } = getQuestProgress(state, quest);

  const fillPct = Math.min(100, (progress / currentStep.target) * 100);
  const stepReady = progress >= currentStep.target && !isComplete;

  useEffect(() => {
    if (stepReady) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
      );
      return () => cancelAnimation(pulse);
    } else {
      pulse.value = 1;
    }
  }, [stepReady]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (isComplete) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, cardStyle]}>
      <LinearGradient
        colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.questIcon}>{quest.icon}</Text>
          <View style={styles.headerText}>
            <Text style={styles.questName}>{quest.name}</Text>
            <Text style={styles.questDesc} numberOfLines={1}>
              {quest.description}
            </Text>
          </View>
        </View>

        {/* Current step */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{currentStep.icon}</Text>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepDescription} numberOfLines={2}>
                {currentStep.description}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg} accessibilityRole="progressbar" accessibilityLabel={`Quest step progress: ${progress} of ${currentStep.target}`} accessibilityValue={{ min: 0, max: currentStep.target, now: progress }}>
            <LinearGradient
              colors={stepReady ? [COLORS.green, COLORS.teal] : [COLORS.accent, COLORS.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${Math.max(fillPct, 2)}%` as any }]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {stepReady ? 'COMPLETE!' : `${progress}/${currentStep.target}`}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(fillPct)}%</Text>
          </View>
        </View>

        {/* Step indicator dots (1-5) */}
        <View style={styles.dotsRow}>
          {quest.steps.map((step, idx) => {
            const completed = idx < state.currentStepIndex;
            const current = idx === state.currentStepIndex;
            return (
              <View key={step.id} style={styles.dotWrapper}>
                <View
                  style={[
                    styles.dot,
                    completed && styles.dotCompleted,
                    current && styles.dotCurrent,
                    current && stepReady && styles.dotReady,
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`Step ${idx + 1}: ${completed ? 'completed' : current ? (stepReady ? 'ready to claim' : 'in progress') : 'upcoming'}`}
                >
                  <Text style={styles.dotText}>
                    {completed ? '\u2713' : idx + 1}
                  </Text>
                </View>
                {idx < quest.steps.length - 1 && (
                  <View style={[styles.dotLine, completed && styles.dotLineCompleted]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Reward preview / Claim button */}
        {stepReady ? (
          <Pressable
            onPress={onClaimStep}
            style={({ pressed }) => [
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Claim quest step reward: ${currentStep.rewardCoins > 0 ? `${currentStep.rewardCoins} coins` : ''}${currentStep.rewardGems > 0 ? ` ${currentStep.rewardGems} gems` : ''}`}
          >
            <LinearGradient
              colors={GRADIENTS.button.green as unknown as readonly [string, string, ...string[]]}
              style={styles.claimButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.claimButtonText}>CLAIM REWARD</Text>
              <Text style={styles.claimRewardPreview}>
                {currentStep.rewardCoins > 0 ? `${currentStep.rewardCoins}c` : ''}
                {currentStep.rewardGems > 0 ? ` + ${currentStep.rewardGems}g` : ''}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.rewardPreview}>
            <Text style={styles.rewardLabel}>Step reward:</Text>
            <View style={styles.rewardIcons}>
              {currentStep.rewardCoins > 0 && (
                <Text style={styles.rewardText}>{currentStep.rewardCoins}c</Text>
              )}
              {currentStep.rewardGems > 0 && (
                <Text style={styles.rewardText}>{currentStep.rewardGems}g</Text>
              )}
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

export default SeasonalQuestCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  questIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  questName: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  questDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Current step
  stepSection: {
    marginBottom: 14,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  stepDescription: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  // Progress bar
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressPercent: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.accent,
  },

  // Step dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green + '20',
  },
  dotCurrent: {
    borderColor: COLORS.accent,
    ...SHADOWS.glow(COLORS.accent),
  },
  dotReady: {
    borderColor: COLORS.green,
    ...SHADOWS.glow(COLORS.green),
  },
  dotText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  dotLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.borderSubtle,
    marginHorizontal: 2,
  },
  dotLineCompleted: {
    backgroundColor: COLORS.green + '60',
  },

  // Reward preview
  rewardPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  rewardLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  rewardIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  rewardText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.gold,
  },

  // Claim button
  claimButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow(COLORS.green),
  },
  claimButtonText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 2,
  },
  claimRewardPreview: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
