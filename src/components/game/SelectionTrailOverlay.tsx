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

const LINE_HEIGHT = 2;
const DOT_SIZE = 6;

const SelectionTrailOverlay: React.FC<SelectionTrailOverlayProps> = ({
  selectedCells,
  cellBounds,
}) => {
  const elements = useMemo(() => {
    if (selectedCells.length === 0) return { lines: [], dots: [] };

    // Look up the actual visual center of a cell from cellBounds
    const getCellCenter = (row: number, col: number): { x: number; y: number } | null => {
      const bound = cellBounds.find(b => b.row === row && b.col === col);
      if (!bound) return null;
      return { x: bound.x + bound.w / 2, y: bound.y + bound.h / 2 };
    };

    const dots = [];
    for (let index = 0; index < selectedCells.length; index++) {
      const center = getCellCenter(selectedCells[index].row, selectedCells[index].col);
      if (!center) continue;
      dots.push({
        key: `dot-${index}`,
        x: center.x - DOT_SIZE / 2,
        y: center.y - DOT_SIZE / 2,
      });
    }

    const lines = [];
    for (let i = 0; i < selectedCells.length - 1; i++) {
      const from = getCellCenter(selectedCells[i].row, selectedCells[i].col);
      const to = getCellCenter(selectedCells[i + 1].row, selectedCells[i + 1].col);
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
  }, [selectedCells, cellBounds]);

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
  line: {
    position: 'absolute',
    height: LINE_HEIGHT,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.8,
    elevation: 8,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.8,
    elevation: 8,
  },
});

export default React.memo(SelectionTrailOverlay);
