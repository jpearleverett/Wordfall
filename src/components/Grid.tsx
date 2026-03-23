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
  maxHeight?: number;
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
  maxHeight,
}: GridProps) {
  const rows = grid.length;
  const cols = grid[0].length;

  const cellSize = useMemo(() => {
    const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
    const widthBased = Math.floor(availableWidth / cols);
    if (maxHeight && maxHeight > 0) {
      const borderAllowance = 6;
      const heightAvail = maxHeight - borderAllowance - CELL_GAP;
      const heightBased = Math.floor(heightAvail / rows - CELL_GAP);
      return Math.min(widthBased, heightBased);
    }
    return widthBased;
  }, [cols, rows, maxHeight]);

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

  // Memoize gesture objects to avoid reattaching on every render
  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .minDistance(0)
      .onBegin((e) => {
        isDraggingRef.current = true;
        lastDragCellRef.current = null;
        onDragStartRef.current?.();
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          const key = `${cell.row},${cell.col}`;
          lastDragCellRef.current = key;
          onCellPressRef.current(cell);
        }
      })
      .onUpdate((e) => {
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          const key = `${cell.row},${cell.col}`;
          if (key !== lastDragCellRef.current) {
            lastDragCellRef.current = key;
            onCellPressRef.current(cell);
          }
        }
      })
      .onEnd(() => {
        isDraggingRef.current = false;
        lastDragCellRef.current = null;
        onDragEndRef.current?.();
      })
      .onFinalize(() => {
        isDraggingRef.current = false;
        lastDragCellRef.current = null;
      });

    const tapGesture = Gesture.Tap()
      .onEnd((e) => {
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          onCellPressRef.current(cell);
        }
      });

    return Gesture.Race(panGesture, tapGesture);
  }, [hitTestCell]);

  // Outer wrapper dimensions include the gradient border padding
  const borderWidth = 2;
  const outerWidth = gridWidth + borderWidth * 2;
  const outerHeight = gridHeight + borderWidth * 2;

  return (
    <View style={[styles.outerWrapper, { width: outerWidth, height: outerHeight, borderRadius: 24 }]}>
      {/* Multi-layered gradient border for premium glass edge */}
      <LinearGradient
        colors={GRADIENTS.gridBorder as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
      />
      <GestureDetector gesture={composedGesture}>
        <View
          ref={gridRef}
          style={[styles.gridContainer, { width: gridWidth, height: gridHeight, borderRadius: 22 }]}
        >
          {/* Deep rich board background */}
          <LinearGradient
            colors={GRADIENTS.grid as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
          />
          {/* Top edge glass reflection */}
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)', 'transparent'] as [string, string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.15, 0.4]}
            style={[styles.vignetteTop, { borderTopLeftRadius: 22, borderTopRightRadius: 22 }]}
          />
          {/* Bottom depth shadow */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.10)'] as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.vignetteBottom, { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }]}
          />
          {/* Top center highlight shine — premium glass feel */}
          <View pointerEvents="none" style={styles.boardHighlight} />
          {/* Subtle inner border highlight */}
          <View pointerEvents="none" style={[styles.innerBorderHighlight, { borderRadius: 21 }]} />
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 18,
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
    height: 50,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
  },
  boardHighlight: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 6,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  innerBorderHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  frozenColumn: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.08)',
  },
});
