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
import { LinearGradient } from 'expo-linear-gradient';
import { Grid as GridType, CellPosition } from '../types';
import { LetterCell } from './LetterCell';
import { CELL_GAP, COLORS, GRADIENTS, MAX_GRID_WIDTH } from '../constants';

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

  const cellBounds = useMemo(() => {
    const bounds: { row: number; col: number; x: number; y: number; w: number; h: number }[] = [];
    const cellStride = cellSize + CELL_GAP;
    const padding = CELL_GAP / 2;

    for (let c = 0; c < cols; c++) {
      const colCells: { row: number }[] = [];
      for (let r = 0; r < rows; r++) {
        if (grid[r][c]) {
          colCells.push({ row: r });
        }
      }
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

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const cell = hitTestCell(e.x, e.y);
      if (cell) {
        onCellPress(cell);
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Outer wrapper dimensions include the gradient border padding
  const borderWidth = 2;
  const outerWidth = gridWidth + borderWidth * 2;
  const outerHeight = gridHeight + borderWidth * 2;

  return (
    <View style={[styles.outerWrapper, { width: outerWidth, height: outerHeight, borderRadius: 22 }]}>
      {/* Gradient border effect */}
      <LinearGradient
        colors={GRADIENTS.gridBorder as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
      />
      {/* Ambient glow behind grid */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      <GestureDetector gesture={composedGesture}>
        <View
          ref={gridRef}
          style={[styles.gridContainer, { width: gridWidth, height: gridHeight, borderRadius: 20 }]}
        >
          {/* Grid background gradient */}
          <LinearGradient
            colors={GRADIENTS.grid as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          />
          {/* Inner vignette corners */}
          <View pointerEvents="none" style={styles.vignetteTop} />
          <View pointerEvents="none" style={styles.vignetteBottom} />
          {/* Board highlight shine */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  ambientGlow1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.35,
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.purpleGlow,
    opacity: 0.3,
  },
  gridContainer: {
    flexDirection: 'row',
    padding: CELL_GAP / 2,
    overflow: 'hidden',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  boardHighlight: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 8,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  frozenColumn: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 10,
  },
});
