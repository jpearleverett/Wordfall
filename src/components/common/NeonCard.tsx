import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, MATERIALS } from '../../constants';
import ScanLineOverlay from './ScanLineOverlay';

interface NeonCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'chrome' | 'holographic' | 'crt';
  accentColor?: string;
  style?: ViewStyle;
}

const NeonCard: React.FC<NeonCardProps> = ({
  children,
  variant = 'default',
  accentColor = COLORS.accent,
  style,
}) => {
  const variantShadow =
    variant === 'chrome'
      ? SHADOWS.chromeDepth
      : SHADOWS.neonEdge(accentColor);

  const borderColor =
    variant === 'chrome'
      ? COLORS.chrome
      : variant === 'holographic'
      ? COLORS.purple
      : accentColor;

  return (
    <View style={[styles.container, variantShadow, style]}>
      {/* Neon tube top-edge highlight */}
      {(variant === 'default' || variant === 'crt') && (
        <View
          style={[
            styles.neonTubeEdge,
            {
              backgroundColor: accentColor,
              ...SHADOWS.neonGlow(accentColor),
            },
          ]}
        />
      )}

      {/* Chrome gradient top-edge */}
      {variant === 'chrome' && (
        <LinearGradient
          colors={GRADIENTS.synthwave.chrome}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.neonTubeEdge, { backgroundColor: undefined }]}
        />
      )}

      {/* Holographic gradient top-edge */}
      {variant === 'holographic' && (
        <LinearGradient
          colors={GRADIENTS.synthwave.holographic}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.neonTubeEdge, { backgroundColor: undefined }]}
        />
      )}

      {/* Card body */}
      <LinearGradient
        colors={[GRADIENTS.surfaceCard[0], GRADIENTS.surfaceCard[1]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.cardBody,
          {
            borderColor,
            borderWidth: MATERIALS.neonTube.borderWidth,
          },
        ]}
      >
        {children}

        {/* CRT scan lines inside the card */}
        {variant === 'crt' && <ScanLineOverlay opacity={0.02} />}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'visible',
  },
  neonTubeEdge: {
    height: 2,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginHorizontal: 1.5,
  },
  cardBody: {
    borderRadius: 22,
    padding: 16,
    overflow: 'hidden',
  },
});

export default React.memo(NeonCard);
