import React, { useMemo, useRef, useCallback } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
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
  onDragStart?: () => void;
  onDragEnd?: () => void;
  frozenColumns?: number[];
  validWord?: boolean;
  movedCells?: CellPosition[];
}

export function GameGrid({
  grid,
  selectedCells,
  hintedCells = [],
  onCellPress,
  onDragStart,
  onDragEnd,
  frozenColumns = [],
  validWord = false,
  movedCells = [],
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

  const movedSet = useMemo(() => {
    const set = new Set<string>();
    movedCells.forEach(c => set.add(`${c.row},${c.col}`));
    return set;
  }, [movedCells]);

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

  // Build a map of cell positions to their pixel bounds within the grid
  // The grid uses column-based flex-end layout, so we compute positions accordingly
  const cellBounds = useMemo(() => {
    const bounds: { row: number; col: number; x: number; y: number; w: number; h: number }[] = [];
    const cellStride = cellSize + CELL_GAP;
    const padding = CELL_GAP / 2;

    for (let c = 0; c < cols; c++) {
      // Column cells are flex-end aligned, so count non-null cells
      const colCells: { row: number }[] = [];
      for (let r = 0; r < rows; r++) {
        if (grid[r][c]) {
          colCells.push({ row: r });
        }
      }
      // Cells are stacked from bottom, with flex spacer on top
      const colX = padding + c * cellStride;
      const totalCellHeight = colCells.length * cellStride;
      const startY = gridHeight - totalCellHeight;

      colCells.forEach((cell, i) => {
        bounds.push({
          row: cell.row,
          col: c,
          x: colX,
          y: startY + i * cellStride,
          w: cellSize + CELL_GAP,
          h: cellSize + CELL_GAP,
        });
      });
    }
    return bounds;
  }, [grid, rows, cols, cellSize, gridHeight]);

  // Track the grid container position for coordinate conversion
  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef({ x: 0, y: 0 });
  const lastDragCellRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const hitTestCell = useCallback((absX: number, absY: number): CellPosition | null => {
    for (const b of cellBounds) {
      if (absX >= b.x && absX < b.x + b.w && absY >= b.y && absY < b.y + b.h) {
        return { row: b.row, col: b.col };
      }
    }
    return null;
  }, [cellBounds]);

  // Use react-native-gesture-handler for drag selection
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      isDraggingRef.current = true;
      lastDragCellRef.current = null;
      onDragStart?.();
      const cell = hitTestCell(e.x, e.y);
      if (cell) {
        const key = `${cell.row},${cell.col}`;
        lastDragCellRef.current = key;
        onCellPress(cell);
      }
    })
    .onUpdate((e) => {
      const cell = hitTestCell(e.x, e.y);
      if (cell) {
        const key = `${cell.row},${cell.col}`;
        if (key !== lastDragCellRef.current) {
          lastDragCellRef.current = key;
          onCellPress(cell);
        }
      }
    })
    .onEnd(() => {
      isDraggingRef.current = false;
      lastDragCellRef.current = null;
      onDragEnd?.();
    })
    .onFinalize(() => {
      isDraggingRef.current = false;
      lastDragCellRef.current = null;
    });

  // Tap gesture for single taps (fallback)
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const cell = hitTestCell(e.x, e.y);
      if (cell) {
        onCellPress(cell);
      }
    });

  // Compose: pan takes priority, tap is fallback
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        ref={gridRef}
        style={[styles.gridContainer, { width: gridWidth, height: gridHeight }]}
      >
        <View pointerEvents="none" style={styles.boardAura} />
        <View pointerEvents="none" style={styles.boardHighlight} />
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
                  isMoved={movedSet.has(key)}
                />
              );
            })}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: CELL_GAP / 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  boardAura: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.45,
  },
  boardHighlight: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 10,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
