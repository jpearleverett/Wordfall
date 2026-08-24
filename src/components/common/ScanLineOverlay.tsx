import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MATERIALS } from '../../constants';

interface ScanLineOverlayProps {
  /** Overall opacity of the scan line pattern (default: 0.03) */
  opacity?: number;
  /** Height of the container — determines how many lines are drawn */
  height?: number;
}

/**
 * CRT scan line overlay — renders horizontal lines spaced 3px apart.
 * Purely static Views with zero animation cost.
 *
 * The old `animated` scrolling-scan-line path was deleted in the Aug 2026
 * perf sweep: no call site ever passed it, yet it carried an ungated
 * infinite Reanimated loop waiting to be mounted by accident.
 */
const ScanLineOverlay: React.FC<ScanLineOverlayProps> = ({
  opacity = MATERIALS.crtGlass.scanLineOpacity,
  height = 400,
}) => {
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
});

export default React.memo(ScanLineOverlay);
