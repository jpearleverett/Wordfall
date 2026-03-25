import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Modal as RNModal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, ANIM } from '../../constants';
import ChromeText from './ChromeText';
import ScanLineOverlay from './ScanLineOverlay';

interface CRTModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  title?: string;
}

const CRTModal: React.FC<CRTModalProps> = ({
  visible,
  onDismiss,
  children,
  title,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const scaleYAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const glitchX = useRef(new Animated.Value(0)).current;

  const runOpenAnimation = useCallback(() => {
    // Reset values
    scaleAnim.setValue(0.9);
    scaleYAnim.setValue(1);
    overlayOpacity.setValue(0);
    glitchX.setValue(0);

    Animated.parallel([
      // Overlay fade in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Spring scale in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
    ]).start(() => {
      // VHS glitch: 2 frames of horizontal offset over 80ms
      Animated.sequence([
        Animated.timing(glitchX, {
          toValue: 6,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glitchX, {
          toValue: -4,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(glitchX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [scaleAnim, scaleYAnim, overlayOpacity, glitchX]);

  const runCloseAnimation = useCallback(() => {
    Animated.parallel([
      // CRT shutdown: scaleY collapses to 0
      Animated.timing(scaleYAnim, {
        toValue: 0,
        duration: ANIM.crtShutdownDuration,
        useNativeDriver: true,
      }),
      // Overlay fades
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: ANIM.crtShutdownDuration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [scaleYAnim, overlayOpacity, onDismiss]);

  useEffect(() => {
    if (visible) {
      runOpenAnimation();
    }
  }, [visible, runOpenAnimation]);

  const handleDismiss = useCallback(() => {
    runCloseAnimation();
  }, [runCloseAnimation]);

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.wrapper}>
        {/* Overlay backdrop */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleDismiss}
          />
        </Animated.View>

        {/* Modal card */}
        <Animated.View
          style={[
            styles.cardOuter,
            {
              transform: [
                { scale: scaleAnim },
                { scaleY: scaleYAnim },
                { translateX: glitchX },
              ],
              opacity: overlayOpacity,
            },
          ]}
        >
          {/* Inner glow border */}
          <LinearGradient
            colors={[
              'rgba(255,45,149,0.35)',
              'rgba(200,77,255,0.25)',
              'rgba(0,229,255,0.20)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.borderGradient}
          >
            {/* Card interior */}
            <LinearGradient
              colors={GRADIENTS.victoryCard}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.card}
            >
              {/* Title */}
              {title && (
                <View style={styles.titleWrap}>
                  <ChromeText fontSize={24} letterSpacing={3}>
                    {title}
                  </ChromeText>
                </View>
              )}

              {/* Content */}
              <View style={styles.body}>{children}</View>

              {/* CRT scan lines */}
              <ScanLineOverlay opacity={0.02} />
            </LinearGradient>
          </LinearGradient>
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,6,18,0.88)',
  },
  cardOuter: {
    width: '88%',
    maxHeight: '80%',
    ...SHADOWS.strong,
  },
  borderGradient: {
    borderRadius: 22,
    padding: 4,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  titleWrap: {
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
});

export default CRTModal;
