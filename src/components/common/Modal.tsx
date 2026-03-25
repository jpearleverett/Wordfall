import React, { ReactNode, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Modal({ visible, onClose, title, children }: ModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, overlayOpacity]);

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[styles.cardOuter, { transform: [{ translateY }] }]}
        >
          {/* Gradient border wrapper */}
          <LinearGradient
            colors={['rgba(255,45,149,0.25)', 'rgba(168,85,247,0.15)', 'rgba(255,45,149,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.borderGradient}
          >
            {/* Card interior with gradient background */}
            <LinearGradient
              colors={['#1e2352', '#181d42']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.card}
            >
              <View style={styles.header}>
                {title ? <Text style={styles.title}>{title}</Text> : <View />}
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeButtonOuter}
                >
                  <LinearGradient
                    colors={['#2a3068', '#222755']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>{'\u2715'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.body}>{children}</View>
            </LinearGradient>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 6, 18, 0.88)',
  },
  cardOuter: {
    width: '88%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  borderGradient: {
    borderRadius: 22,
    padding: 1.5,
  },
  card: {
    borderRadius: 20.5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.bodyBold,
    flex: 1,
    marginRight: 12,
  },
  closeButtonOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
});
