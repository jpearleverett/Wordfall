import React, { useMemo } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { Grid as GridType, CellPosition } from '../types';
import { LetterCell } from './LetterCell';
import { CELL_GAP, COLORS, MAX_GRID_WIDTH } from '../constants';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GridProps {
  grid: GridType;
  selectedCells: CellPosition[];
  hintedCells?: CellPosition[];
  onCellPress: (position: CellPosition) => void;
  frozenColumns?: number[];
  validWord?: boolean;
}

export function GameGrid({
  grid,
  selectedCells,
  hintedCells = [],
  onCellPress,
  frozenColumns = [],
  validWord = false,
}: GridProps) {
  const rows = grid.length;
  const cols = grid[0].length;

  const cellSize = useMemo(() => {
    const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
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

  const frozenSet = useMemo(() => new Set(frozenColumns), [frozenColumns]);

  // Render columns for gravity-friendly layout
  const columns = useMemo(() => {
    const cols_arr: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[][] = [];
    for (let c = 0; c < cols; c++) {
      const column: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const cell = grid[r][c];
        if (cell) {
          column.push({ cell, row: r, col: c });
        }
      }
      cols_arr.push(column);
    }
    return cols_arr;
  }, [grid, rows, cols]);

  const gridWidth = cols * (cellSize + CELL_GAP) + CELL_GAP;
  const gridHeight = rows * (cellSize + CELL_GAP) + CELL_GAP;

  return (
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
            frozenSet.has(colIndex) && styles.frozenColumn,
          ]}
        >
          <View style={{ flex: 1 }} />
          {column.map(({ cell, row, col }) => {
            const key = `${row},${col}`;
            const selIndex = selectedSet.get(key) ?? -1;
            const isSelected = selIndex >= 0;
            const isHinted = hintedSet.has(key);

            return (
              <LetterCell
                key={cell.id}
                letter={cell.letter}
                cellId={cell.id}
                size={cellSize}
                isSelected={isSelected}
                isHinted={isHinted}
                selectionIndex={selIndex}
                onPress={() => onCellPress({ row, col })}
                isFrozen={frozenSet.has(col)}
                isValidWord={validWord && isSelected}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: CELL_GAP / 2,
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  frozenColumn: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 8,
  },
});
