import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS, SCREEN_WIDTH } from '../constants';
import { ModeTutorialStep } from '../data/modeTutorials';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface ModeTutorialOverlayProps {
  steps: ModeTutorialStep[];
  onComplete: () => void;
  visible: boolean;
}

export function ModeTutorialOverlay({ steps, onComplete, visible }: ModeTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.5)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!visible) return undefined;
    if (reduceMotion) {
      // Reduce motion: mount settled — no backdrop fade, no card slide
      // spring, no icon scale pop. All tutorial content stays readable.
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      iconScaleAnim.setValue(1);
      return undefined;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    iconScaleAnim.setValue(0.5);
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [visible, reduceMotion, fadeAnim, slideAnim, iconScaleAnim]);

  const animateStepTransition = useCallback((nextStep: number) => {
    if (reduceMotion) {
      // Reduce motion: swap the step content in place, already settled.
      slideAnim.setValue(0);
      iconScaleAnim.setValue(1);
      setCurrentStep(nextStep);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: -20,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setCurrentStep(nextStep);
      slideAnim.setValue(20);
      iconScaleAnim.setValue(0.5);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [reduceMotion, slideAnim, iconScaleAnim]);

  const dismissWithFade = useCallback(() => {
    if (reduceMotion) {
      // Reduce motion: instant dismiss, mirroring the ceremony policy.
      onComplete();
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onComplete();
      }
    });
  }, [reduceMotion, fadeAnim, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      animateStepTransition(currentStep + 1);
    } else {
      dismissWithFade();
    }
  }, [currentStep, steps.length, animateStepTransition, dismissWithFade]);

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.cardContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={GRADIENTS.surfaceCard as unknown as readonly [string, string, ...string[]]}
          style={styles.card}
        >
          {/* Step counter */}
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {steps.length}
          </Text>

          {/* Icon */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScaleAnim }] }]}>
            <Text style={styles.icon}>{step.icon}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{step.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{step.description}</Text>

          {/* Highlight badge */}
          {step.highlight && (
            <View style={styles.highlightBadge}>
              <Text style={styles.highlightText}>
                {step.highlight === 'grid' ? 'Watch the grid' :
                 step.highlight === 'gravity' ? 'Watch gravity arrows' :
                 'Check the word bank'}
              </Text>
            </View>
          )}

          {/* Step dots */}
          <View style={styles.dotsContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Next / Got it button */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? 'Got it, close tutorial' : `Next step, ${currentStep + 1} of ${steps.length}`}
          >
            <LinearGradient
              colors={GRADIENTS.button.primary as unknown as readonly [string, string, ...string[]]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {isLastStep ? 'Got it!' : 'Next'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Skip option */}
          {!isLastStep && (
            <Pressable
              onPress={dismissWithFade}
              accessibilityRole="button"
              accessibilityLabel="Skip mode tutorial"
            >
              <Text style={styles.skipText}>Skip tutorial</Text>
            </Pressable>
          )}
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  cardContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.medium,
  },
  stepCounter: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  highlightBadge: {
    backgroundColor: 'rgba(255,45,149,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,45,149,0.25)',
  },
  highlightText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.accentLight,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.glow(COLORS.accent),
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.glow(COLORS.accent),
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 1,
  },
  skipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 16,
  },
});
