import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { MATERIALS } from '../../constants';

interface ScanLineOverlayProps {
  /** Overall opacity of the scan line pattern (default: 0.03) */
  opacity?: number;
  /** Whether to include the animated scrolling scan line (default: false) */
  animated?: boolean;
  /** Height of the container — needed for animated scan line travel distance */
  height?: number;
  /** Duration of one full scan line scroll cycle in ms (default: 4000) */
  scrollDuration?: number;
}

/**
 * CRT scan line overlay — renders horizontal lines spaced 3px apart.
 * Purely static Views with zero animation cost (unless `animated` is true,
 * which adds a single scrolling highlight line).
 */
const ScanLineOverlay: React.FC<ScanLineOverlayProps> = ({
  opacity = MATERIALS.crtGlass.scanLineOpacity,
  animated = false,
  height = 400,
  scrollDuration = 4000,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const animation = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: scrollDuration,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [animated, scanLineAnim, scrollDuration]);

  // Generate static scan lines — spaced 3px apart
  const lines = useMemo(() => {
    const spacing = MATERIALS.crtGlass.scanLineSpacing;
    const count = Math.ceil(height / (1 + spacing));
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(
        <View
          key={i}
          style={[
            styles.line,
            { top: i * (1 + spacing), opacity },
          ]}
        />,
      );
    }
    return result;
  }, [height, opacity]);

  return (
    <View style={styles.container} pointerEvents="none">
      {lines}
      {animated && (
        <Animated.View
          style={[
            styles.scrollingLine,
            {
              transform: [
                {
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, height],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,1)',
  },
  scrollingLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

export default React.memo(ScanLineOverlay);
