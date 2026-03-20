import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  color: string;
}

interface OnboardingScreenProps {
  onComplete?: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Wordfall',
    subtitle: 'Where words fall into place',
    icon: '🌟',
    description:
      'A unique word puzzle where gravity changes everything. Find words, clear the board, and master the cascade!',
    color: COLORS.accent,
  },
  {
    title: 'Tap Letters to Spell',
    subtitle: 'Select letters on the grid',
    icon: '👆',
    description:
      'Tap on adjacent letters to form words. Selected letters glow blue. Submit when you have a valid word!',
    color: COLORS.green,
  },
  {
    title: 'Letters Fall Down',
    subtitle: 'Gravity is your friend',
    icon: '⬇️',
    description:
      'When you clear a word, the remaining letters fall down to fill the gaps. Plan your moves wisely!',
    color: COLORS.coral,
  },
  {
    title: 'Plan Ahead!',
    subtitle: 'Order matters',
    icon: '🧩',
    description:
      'The order you solve words changes the board. Think about which words to solve first to reveal new opportunities.',
    color: COLORS.purple,
  },
  {
    title: 'Ready to Play!',
    subtitle: 'Your adventure begins',
    icon: '🚀',
    description:
      'Earn stars, unlock new modes, collect rare tiles, and restore the Grand Library. The words are waiting!',
    color: COLORS.gold,
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete = () => {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const handAnim = useRef(new Animated.Value(0)).current;
  const fallAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Looping animations based on current step
  useEffect(() => {
    // Reset
    handAnim.setValue(0);
    fallAnim.setValue(0);

    let animRef: Animated.CompositeAnimation | null = null;

    if (currentStep === 1) {
      animRef = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.start();
    } else if (currentStep === 2) {
      animRef = Animated.loop(
        Animated.sequence([
          Animated.timing(fallAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.delay(500),
          Animated.timing(fallAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.start();
    }

    // Pulse animation for icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    return () => {
      if (animRef) animRef.stop();
      pulseLoop.stop();
    };
  }, [currentStep, handAnim, fallAnim, pulseAnim]);

  const animateTransition = useCallback(
    (nextStep: number) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -40,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(nextStep);
        slideAnim.setValue(40);
        iconScaleAnim.setValue(0.5);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(iconScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim, iconScaleAnim],
  );

  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      onComplete();
    } else {
      animateTransition(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handTranslateY = handAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const letterFallY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  const letterFallOpacity = fallAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 0.5, 1],
  });

  const renderIllustration = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.illustrationCenter}>
            <Animated.View
              style={[styles.glowCircle, { backgroundColor: step.color + '20', transform: [{ scale: pulseAnim }] }]}
            />
            <Animated.Text style={[styles.heroEmoji, { transform: [{ scale: iconScaleAnim }] }]}>
              🎮
            </Animated.Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.illustrationCenter}>
            <View style={styles.miniGrid}>
              {['W', 'O', 'R', 'D', 'F', 'A', 'L', 'L', '!'].map((letter, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.miniCell,
                    idx < 4 && styles.miniCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.miniCellText,
                      idx < 4 && styles.miniCellTextSelected,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              ))}
            </View>
            <Animated.View
              style={[styles.handPointer, { transform: [{ translateY: handTranslateY }] }]}
            >
              <Text style={styles.handEmoji}>👆</Text>
            </Animated.View>
          </View>
        );

      case 2:
        return (
          <View style={styles.illustrationCenter}>
            <View style={styles.gravityDemo}>
              <View style={styles.gravityRow}>
                <View style={[styles.miniCell, styles.miniCellSelected]}>
                  <Text style={styles.miniCellTextSelected}>C</Text>
                </View>
                <Animated.View
                  style={[
                    styles.miniCell,
                    styles.miniCellFalling,
                    {
                      transform: [{ translateY: letterFallY }],
                      opacity: letterFallOpacity,
                    },
                  ]}
                >
                  <Text style={styles.miniCellTextSelected}>A</Text>
                </Animated.View>
                <View style={[styles.miniCell, styles.miniCellSelected]}>
                  <Text style={styles.miniCellTextSelected}>T</Text>
                </View>
              </View>
              <Text style={styles.gravityArrow}>↓</Text>
              <View style={styles.gravityRow}>
                <View style={styles.miniCell}>
                  <Text style={styles.miniCellText}>_</Text>
                </View>
                <View style={styles.miniCell}>
                  <Text style={styles.miniCellText}>_</Text>
                </View>
                <View style={styles.miniCell}>
                  <Text style={styles.miniCellText}>_</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.illustrationCenter}>
            <View style={styles.strategyRow}>
              <View style={styles.strategyBubble}>
                <Text style={[styles.strategyNum, { color: COLORS.accent }]}>1</Text>
                <Text style={styles.strategyWord}>CAT</Text>
              </View>
              <Text style={styles.strategyArrowText}>then</Text>
              <View style={styles.strategyBubble}>
                <Text style={[styles.strategyNum, { color: COLORS.gold }]}>2</Text>
                <Text style={styles.strategyWord}>DOG</Text>
              </View>
              <Text style={styles.strategyArrowText}>then</Text>
              <View style={styles.strategyBubble}>
                <Text style={[styles.strategyNum, { color: COLORS.green }]}>3</Text>
                <Text style={styles.strategyWord}>STAR</Text>
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.illustrationCenter}>
            <Animated.View
              style={[styles.glowCircle, { backgroundColor: COLORS.greenGlow, transform: [{ scale: pulseAnim }] }]}
            />
            <Animated.Text style={[styles.heroEmoji, { transform: [{ scale: iconScaleAnim }] }]}>
              🚀
            </Animated.Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastStep && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Illustration */}
        <View style={styles.illustrationArea}>
          {renderIllustration()}
        </View>

        {/* Text Content */}
        <View style={styles.textArea}>
          <Animated.View
            style={[
              styles.iconBadge,
              { borderColor: step.color, transform: [{ scale: iconScaleAnim }] },
            ]}
          >
            <Text style={styles.iconText}>{step.icon}</Text>
          </Animated.View>
          <Text style={[styles.stepTitle, { color: step.color }]}>{step.title}</Text>
          <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </View>
      </Animated.View>

      {/* Bottom area */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {STEPS.map((s, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentStep && [styles.dotActive, { backgroundColor: step.color }],
                index < currentStep && [styles.dotComplete, { backgroundColor: step.color + '60' }],
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.buttonsRow}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: step.color },
              currentStep === 0 && { flex: 1 },
              isLastStep && styles.startBtnShadow,
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {isLastStep ? "LET'S GO!" : 'NEXT'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  illustrationArea: {
    height: height * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  illustrationCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroEmoji: {
    fontSize: 80,
    zIndex: 1,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 156,
    gap: 6,
  },
  miniCell: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.cellDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCellSelected: {
    backgroundColor: COLORS.cellSelected,
  },
  miniCellFalling: {
    backgroundColor: COLORS.accent,
  },
  miniCellText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  miniCellTextSelected: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.bg,
  },
  handPointer: {
    marginTop: -8,
  },
  handEmoji: {
    fontSize: 36,
  },
  gravityDemo: {
    alignItems: 'center',
    gap: 8,
  },
  gravityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gravityArrow: {
    fontSize: 28,
    color: COLORS.accent,
    fontWeight: '700',
  },
  strategyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strategyBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    minWidth: 60,
  },
  strategyNum: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  strategyWord: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  strategyArrowText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  textArea: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconText: {
    fontSize: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stepDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  bottomArea: {
    paddingBottom: 44,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
  },
  dotActive: {
    width: 24,
  },
  dotComplete: {},
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
  },
  nextBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  startBtnShadow: {
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default OnboardingScreen;
