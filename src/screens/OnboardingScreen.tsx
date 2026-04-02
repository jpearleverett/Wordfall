import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, FONTS } from '../constants';
import { LOCAL_IMAGES, LOCAL_VIDEOS } from '../utils/localAssets';
import { VideoBackground } from '../components/common/VideoBackground';
import { generateTutorialBoardA, generateTutorialBoardB, generateTutorialBoardC, TUTORIAL_STEPS } from '../data/tutorialBoards';
import { GameGrid } from '../components/Grid';
import { CellPosition } from '../types';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { funnelTracker } from '../services/funnelTracker';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete?: () => void;
}

type Phase = 'welcome' | 'tutorial' | 'celebrate' | 'ready';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete = () => {} }) => {
  const [phase, setPhase] = useState<Phase>('welcome');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(0);
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  const [tutorialBoard, setTutorialBoard] = useState(generateTutorialBoardA);
  const [wordsFound, setWordsFound] = useState(0);

  // Switch tutorial board when the step requires a different board
  useEffect(() => {
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step?.board) return;

    const prevStep = tutorialStep > 0 ? TUTORIAL_STEPS[tutorialStep - 1] : null;
    if (prevStep && prevStep.board === step.board) return;

    const generators = { A: generateTutorialBoardA, B: generateTutorialBoardB, C: generateTutorialBoardC };
    setTutorialBoard(generators[step.board]());
    setSelectedCells([]);
  }, [tutorialStep]);

  // Track onboarding phase changes
  useEffect(() => {
    if (phase === 'welcome') {
      void funnelTracker.trackOnboarding('start');
    } else if (phase === 'tutorial') {
      void funnelTracker.trackOnboarding('board_a');
    } else if (phase === 'celebrate') {
      void funnelTracker.trackOnboarding('complete');
    }
  }, [phase]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim, fadeAnim, pulseAnim]);

  const transitionTo = useCallback((nextPhase: Phase) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPhase(nextPhase);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  // Tutorial: handle cell press
  const handleTutorialCellPress = useCallback((position: CellPosition) => {
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step || step.waitForAction !== 'word_submitted') return;

    // Check if this position is in the highlight
    const isHighlighted = step.highlightPositions?.some(
      p => p.row === position.row && p.col === position.col
    );
    if (!isHighlighted) return;

    const alreadySelected = selectedCells.some(
      c => c.row === position.row && c.col === position.col
    );
    if (alreadySelected) return;

    const newSelected = [...selectedCells, position];
    setSelectedCells(newSelected);

    // Check if all highlighted cells are selected
    if (step.highlightPositions && newSelected.length >= step.highlightPositions.length) {
      // Word "found" - advance step
      setTimeout(() => {
        setSelectedCells([]);
        setWordsFound(prev => prev + 1);
        if (tutorialStep < TUTORIAL_STEPS.length - 1) {
          setTutorialStep(prev => prev + 1);
        } else {
          // Tutorial complete - go to celebration
          transitionTo('celebrate');
        }
      }, 500);
    }
  }, [tutorialStep, selectedCells, transitionTo]);

  const advanceTutorialStep = useCallback(() => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    }
  }, [tutorialStep]);

  // Render phases
  if (phase === 'welcome') {
    return (
      <View style={styles.container}>
        <Image
          source={LOCAL_IMAGES.bgOnboarding}
          style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
          resizeMode="cover"
        />
        <VideoBackground
          source={LOCAL_VIDEOS.neonAuroraAmbient}
          opacity={0.3}
          overlayColor="rgba(10,0,21,0.25)"
        />
        <LinearGradient
          colors={['rgba(10,0,21,0.35)', 'rgba(10,0,21,0.55)', 'rgba(10,0,21,0.75)'] as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[styles.glowCircle, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.glowRingOuter} />
          <View style={styles.glowRingInner} />
          <Text style={styles.welcomeEmoji}>🎮</Text>
          <Text style={styles.welcomeTitle}>Welcome to</Text>
          <Text style={styles.welcomeTitleAccent}>WORDFALL</Text>
          <Text style={styles.welcomeSubtext}>A gravity-based word puzzle where every word changes the board</Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={() => transitionTo('tutorial')}
          >
            <LinearGradient
              colors={[...GRADIENTS.button.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.startButton, SHADOWS.glow(COLORS.accent)]}
            >
              <Text style={styles.startButtonText}>LEARN TO PLAY</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.skipLink} onPress={onComplete}>
            <Text style={styles.skipText}>Skip tutorial</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (phase === 'tutorial') {
    const currentStep = TUTORIAL_STEPS[tutorialStep];
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.tutorialContainer, { opacity: fadeAnim }]}>
          <Text style={styles.tutorialTitle}>Find the hidden words!</Text>
          <Text style={styles.tutorialProgress}>
            Words found: {wordsFound}/{TUTORIAL_STEPS.filter(s => s.waitForAction === 'word_submitted').length}
          </Text>

          <View style={styles.gridContainer}>
            <GameGrid
              grid={tutorialBoard.grid}
              selectedCells={selectedCells}
              hintedCells={currentStep?.highlightPositions || []}
              onCellPress={handleTutorialCellPress}
            />
          </View>

          {currentStep && (
            <TutorialOverlay
              step={currentStep}
              visible={true}
            />
          )}
          {currentStep?.waitForAction === 'dismiss' && (
            <TouchableOpacity style={styles.dismissOverlay} onPress={advanceTutorialStep}>
              <Text style={styles.dismissText}>Tap to continue</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  }

  if (phase === 'celebrate') {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.glowCircleGreen, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.celebrateEmoji}>🎉</Text>
          <Text style={styles.celebrateTitle}>AMAZING!</Text>
          <Text style={styles.celebrateSubtext}>
            You've learned the basics of Wordfall!{'\n'}
            Now let's play for real.
          </Text>

          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={() => transitionTo('ready')}
          >
            <LinearGradient
              colors={[COLORS.green, COLORS.teal] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.startButton, SHADOWS.glow(COLORS.green)]}
            >
              <Text style={styles.startButtonText}>CONTINUE</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // phase === 'ready'
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.glowCircleGold, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.readyEmoji}>🚀</Text>
        <Text style={styles.readyTitle}>READY!</Text>
        <Text style={styles.readySubtext}>
          Earn stars, unlock new modes, collect rare tiles, and restore the Grand Library.
        </Text>

        <View style={styles.tipCards}>
          {[
            { icon: '⬇️', tip: 'Letters fall when you clear words' },
            { icon: '🧩', tip: 'Word order changes the board' },
            { icon: '💡', tip: 'Use hints when you get stuck' },
          ].map((item, i) => (
            <LinearGradient
              key={i}
              colors={GRADIENTS.surfaceCard as [string, string]}
              style={styles.tipCard}
            >
              <Text style={styles.tipIcon}>{item.icon}</Text>
              <Text style={styles.tipText}>{item.tip}</Text>
            </LinearGradient>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [pressed && styles.pressed]}
          onPress={onComplete}
        >
          <LinearGradient
            colors={[...GRADIENTS.button.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.startButton, SHADOWS.glow(COLORS.gold)]}
          >
            <Text style={styles.startButtonText}>LET'S GO!</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  glowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.accentGlow,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 60,
  },
  glowRingOuter: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(255,45,149,0.15)',
    backgroundColor: 'transparent',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  glowRingInner: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 0.5,
    borderColor: 'rgba(200,77,255,0.10)',
    backgroundColor: 'transparent',
  },
  glowCircleGreen: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 255, 135, 0.30)',
    shadowColor: '#00ff87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 35,
  },
  glowCircleGold: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 184, 0, 0.30)',
    shadowColor: '#ffb800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 35,
  },
  welcomeEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  welcomeTitle: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  welcomeTitleAccent: {
    color: COLORS.accent,
    fontSize: 52,
    fontFamily: FONTS.display,
    letterSpacing: 6,
    marginBottom: 16,
    textShadowColor: COLORS.accentGlow,
    textShadowRadius: 30,
  },
  welcomeSubtext: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 280,
  },
  startButton: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontFamily: FONTS.display,
    letterSpacing: 3,
  },
  skipLink: {
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  // Tutorial phase
  tutorialContainer: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tutorialTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tutorialProgress: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    marginBottom: 24,
  },
  gridContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dismissOverlay: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: COLORS.borderAccent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  dismissText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  // Celebrate phase
  celebrateEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  celebrateTitle: {
    color: COLORS.green,
    fontSize: 42,
    fontFamily: FONTS.display,
    letterSpacing: 4,
    marginBottom: 12,
    textShadowColor: COLORS.greenGlow,
    textShadowRadius: 16,
  },
  celebrateSubtext: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  // Ready phase
  readyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  readyTitle: {
    color: COLORS.gold,
    fontSize: 42,
    fontFamily: FONTS.display,
    letterSpacing: 4,
    marginBottom: 12,
    textShadowColor: COLORS.goldGlow,
    textShadowRadius: 16,
  },
  readySubtext: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  tipCards: {
    width: '100%',
    gap: 10,
    marginBottom: 32,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tipIcon: {
    fontSize: 22,
  },
  tipText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
});

export default OnboardingScreen;
