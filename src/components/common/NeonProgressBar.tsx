import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants';

interface NeonProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  showGlowDot?: boolean;
}

/**
 * Attempt to lighten a hex color by mixing toward white.
 * Falls back to the original color for non-hex inputs.
 */
function lighten(color: string, amount: number = 0.3): string {
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match) return color;
  const num = parseInt(match[1], 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  const hexStr = ((r << 16) | (g << 8) | b).toString(16);
  return `#${'000000'.substring(hexStr.length) + hexStr}`;
}

const NeonProgressBar: React.FC<NeonProgressBarProps> = ({
  progress,
  color = COLORS.accent,
  height = 10,
  showGlowDot = true,
}) => {
  const clamped = Math.min(1, Math.max(0, progress));
  const scaleXAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleXAnim, {
      toValue: clamped,
      useNativeDriver: true,
      damping: 14,
      stiffness: 120,
      overshootClamping: false,
    }).start();
  }, [clamped, scaleXAnim]);

  const lighterColor = lighten(color, 0.3);
  const borderRadius = height / 2;
  const dotSize = Math.max(8, height + 2);

  return (
    <View style={styles.container}>
      {/* Track background with neon tube border */}
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius,
            borderColor: color,
            borderWidth: 1,
          },
          SHADOWS.neonEdge(color),
        ]}
      >
        {/* Fill bar — uses scaleX transform for useNativeDriver */}
        <Animated.View
          style={[
            styles.fillWrapper,
            {
              height,
              borderRadius,
              transform: [{ scaleX: scaleXAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[color, lighterColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius }]}
          />
          {/* Fill glow */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius,
                ...SHADOWS.neonGlow(color),
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Plasma glow dot at the tip of the fill */}
      {showGlowDot && clamped > 0 && (
        <Animated.View
          style={[
            styles.glowDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: lighterColor,
              // Position the dot: translate based on scaleX proportion of track width
              // We use left: 0 and translateX via the same animated value mapped via layout
              transform: [
                {
                  // We cannot directly know width, so we use a percentage-based approach:
                  // Place dot in a container that is positioned via the animated scaleX
                  // Instead, we overlay the dot and use the same animated value for its translateX
                  // by wrapping differently. Use a simpler approach: absolute position driven by
                  // an interpolated percentage via a width-tracking wrapper.
                  scale: 1,
                },
              ],
              ...SHADOWS.neonGlow(lighterColor),
            },
          ]}
        />
      )}

      {/* Dot positioning layer — overlays the track, dot follows fill */}
      {showGlowDot && clamped > 0 && (
        <View style={[styles.dotTrack, { height }]} pointerEvents="none">
          <Animated.View
            style={[
              styles.dotPositioner,
              {
                transform: [{ scaleX: scaleXAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.dotAnchor,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: lighterColor,
                  top: -(dotSize - height) / 2,
                  ...SHADOWS.neonGlow(lighterColor),
                },
              ]}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  track: {
    backgroundColor: 'rgba(10,0,21,0.8)',
    overflow: 'hidden',
  },
  fillWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    // scaleX origin is center by default — we need left origin
    // React Native transforms from center, so we shift:
    // transformOrigin is not directly supported in RN, but we can use
    // a wrapper technique where the fill is full-width and we scale from left
    transformOrigin: 'left center',
    overflow: 'hidden',
  },
  // Hidden placeholder dot (the real one is in the overlay layer)
  glowDot: {
    position: 'absolute',
    opacity: 0, // Hidden; real dot is in dotTrack
  },
  dotTrack: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  dotPositioner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    transformOrigin: 'left center',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dotAnchor: {
    position: 'relative',
  },
});

export default React.memo(NeonProgressBar);
