import React, { useMemo } from 'react';
import { Platform, StyleSheet, UIManager, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Grid as GridType, CellPosition } from '../types';
import { LetterCell } from './LetterCell';
import { CELL_GAP, COLORS, GRADIENTS, MAX_GRID_WIDTH, RADII, SHADOWS } from '../constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GridProps {
  grid: GridType;
  selectedCells: CellPosition[];
  hintedCells?: CellPosition[];
  onCellPress: (position: CellPosition) => void;
}

export function GameGrid({
  grid,
  selectedCells,
  hintedCells = [],
  onCellPress,
}: GridProps) {
  const rows = grid.length;
  const cols = grid[0].length;

  const cellSize = useMemo(() => {
    const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1) - 12;
    return Math.floor(availableWidth / cols);
  }, [cols]);

  const selectedSet = useMemo(() => {
    const set = new Map<string, number>();
    selectedCells.forEach((c, i) => set.set(`${c.row},${c.col}`, i));
    return set;
  }, [selectedCells]);

  const hintedSet = useMemo(() => {
    const set = new Set<string>();
    hintedCells.forEach(c => set.add(`${c.row},${c.col}`));
    return set;
  }, [hintedCells]);

  const columns = useMemo(() => {
    const colsArr: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[][] = [];
    for (let c = 0; c < cols; c++) {
      const column: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const cell = grid[r][c];
        if (cell) column.push({ cell, row: r, col: c });
      }
      colsArr.push(column);
    }
    return colsArr;
  }, [grid, rows, cols]);

  const gridWidth = cols * (cellSize + CELL_GAP) + CELL_GAP;
  const gridHeight = rows * (cellSize + CELL_GAP) + CELL_GAP;

  return (
    <LinearGradient colors={GRADIENTS.panelSoft} style={[styles.boardFrame, { width: gridWidth + 20 }]}>
      <View style={styles.boardAura} />
      <View style={styles.gravityTrack} />
      <View style={[styles.gridContainer, { width: gridWidth, height: gridHeight }]}>
        {columns.map((column, colIndex) => (
          <View
            key={colIndex}
            style={[
              styles.column,
              {
                width: cellSize + CELL_GAP,
                height: gridHeight,
              },
            ]}
          >
            <View style={styles.columnSpace} />
            {column.map(({ cell, row, col }) => {
              const key = `${row},${col}`;
              const selectionIndex = selectedSet.get(key) ?? -1;
              const isSelected = selectionIndex >= 0;
              const isHinted = hintedSet.has(key);

              return (
                <LetterCell
                  key={cell.id}
                  letter={cell.letter}
                  cellId={cell.id}
                  size={cellSize}
                  isSelected={isSelected}
                  isHinted={isHinted}
                  selectionIndex={selectionIndex}
                  onPress={() => onCellPress({ row, col })}
                />
              );
            })}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderRadius: RADII.xl,
    padding: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  boardAura: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: '70%',
    height: 120,
    borderRadius: 999,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.55,
  },
  gravityTrack: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    top: 16,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  gridContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 10, 27, 0.34)',
    borderRadius: RADII.lg,
    padding: CELL_GAP / 2,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  columnSpace: {
    flex: 1,
  },
});
