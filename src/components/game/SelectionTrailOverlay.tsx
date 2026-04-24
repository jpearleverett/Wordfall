import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants';

interface CellBound {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SelectionTrailOverlayProps {
  /** Array of selected cell positions in order */
  selectedCells: Array<{ row: number; col: number }>;
  /** Precomputed cell bounds from the grid (accounts for gravity alignment) */
  cellBounds: CellBound[];
}

// Trail now renders UNDER the tile grid (see Grid.tsx), so the line only
// shows in the gaps between cells. The big dots at cell centers are
// fully hidden by tiles, so they're trimmed back to a subtle glow
// accent that just barely peeks past tile edges.
const LINE_HEIGHT = 3;
const DOT_SIZE = 5;

const SelectionTrailOverlay: React.FC<SelectionTrailOverlayProps> = ({
  selectedCells,
  cellBounds,
}) => {
  // Build O(1) lookup map from cellBounds, rebuilt only when bounds change
  const boundsMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const b of cellBounds) {
      map.set(`${b.row},${b.col}`, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
    return map;
  }, [cellBounds]);

  const elements = useMemo(() => {
    if (selectedCells.length === 0) return { lines: [], dots: [] };

    const dots: { key: string; x: number; y: number }[] = [];
    const centers: ({ x: number; y: number } | null)[] = [];
    for (let index = 0; index < selectedCells.length; index++) {
      const c = selectedCells[index];
      const center = boundsMap.get(`${c.row},${c.col}`) ?? null;
      centers.push(center);
      if (!center) continue;
      dots.push({
        key: `dot-${index}`,
        x: center.x - DOT_SIZE / 2,
        y: center.y - DOT_SIZE / 2,
      });
    }

    const lines: { key: string; width: number; midX: number; midY: number; angle: number }[] = [];
    for (let i = 0; i < selectedCells.length - 1; i++) {
      const from = centers[i];
      const to = centers[i + 1];
      if (!from || !to) continue;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      lines.push({
        key: `line-${i}`,
        width: distance,
        midX,
        midY,
        angle,
      });
    }

    return { lines, dots };
  }, [selectedCells, boundsMap]);

  if (selectedCells.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {elements.lines.map((line) => (
        <View
          key={line.key}
          style={[
            styles.line,
            {
              width: line.width,
              left: line.midX - line.width / 2,
              top: line.midY - LINE_HEIGHT / 2,
              transform: [{ rotate: `${line.angle}deg` }],
            },
          ]}
        />
      ))}
      {elements.dots.map((dot) => (
        <View
          key={dot.key}
          style={[
            styles.dot,
            {
              left: dot.x,
              top: dot.y,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  // Trail was rendering but at 2px line / 6px dot with 45% shadow it was
  // nearly invisible over the tile highlights. Bumped up so players
  // actually see the connection between traced tiles.
  line: {
    position: 'absolute',
    height: LINE_HEIGHT,
    borderRadius: LINE_HEIGHT / 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
    elevation: 5,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#ffffff',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.9,
    elevation: 5,
  },
});

export default React.memo(SelectionTrailOverlay);
