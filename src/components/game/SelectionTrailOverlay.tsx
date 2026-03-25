import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, SHADOWS } from '../../constants';

interface SelectionTrailOverlayProps {
  /** Array of selected cell positions in order */
  selectedCells: Array<{ row: number; col: number }>;
  /** Size of each cell in pixels */
  cellSize: number;
  /** Gap between cells */
  cellGap: number;
  /** Grid padding */
  gridPadding: number;
  /** Number of columns in the grid */
  cols: number;
}

const LINE_HEIGHT = 2;
const DOT_SIZE = 6;

const getCellCenter = (
  row: number,
  col: number,
  cellSize: number,
  cellGap: number,
  gridPadding: number,
): { x: number; y: number } => ({
  x: gridPadding + col * (cellSize + cellGap) + cellSize / 2,
  y: gridPadding + row * (cellSize + cellGap) + cellSize / 2,
});

const SelectionTrailOverlay: React.FC<SelectionTrailOverlayProps> = ({
  selectedCells,
  cellSize,
  cellGap,
  gridPadding,
  cols,
}) => {
  const elements = useMemo(() => {
    if (selectedCells.length === 0) return { lines: [], dots: [] };

    const dots = selectedCells.map((cell, index) => {
      const center = getCellCenter(cell.row, cell.col, cellSize, cellGap, gridPadding);
      return {
        key: `dot-${index}`,
        x: center.x - DOT_SIZE / 2,
        y: center.y - DOT_SIZE / 2,
      };
    });

    const lines = [];
    for (let i = 0; i < selectedCells.length - 1; i++) {
      const from = getCellCenter(selectedCells[i].row, selectedCells[i].col, cellSize, cellGap, gridPadding);
      const to = getCellCenter(selectedCells[i + 1].row, selectedCells[i + 1].col, cellSize, cellGap, gridPadding);

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
  }, [selectedCells, cellSize, cellGap, gridPadding]);

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
