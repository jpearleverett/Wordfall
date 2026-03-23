import React, { useMemo, useRef, useCallback } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { Grid as GridType, CellPosition } from '../types';
import { LetterCell } from './LetterCell';
import { CELL_GAP, COLORS, MAX_GRID_WIDTH } from '../constants';

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

const BOARD_FRAME = 14;
const PLAYFIELD_INSET = 10;
const OUTER_RADIUS = 30;
const PLAYFIELD_RADIUS = 22;

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
    const availableWidth = MAX_GRID_WIDTH - BOARD_FRAME * 2 - PLAYFIELD_INSET * 2 - CELL_GAP * (cols + 1);
    const widthBased = Math.floor(availableWidth / cols);
    if (maxHeight && maxHeight > 0) {
      const heightAvail = maxHeight - BOARD_FRAME * 2 - PLAYFIELD_INSET * 2 - CELL_GAP;
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
    const colsArr: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[][] = [];
    for (let c = 0; c < cols; c++) {
      const column: { cell: NonNullable<GridType[0][0]>; row: number; col: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const cell = grid[r][c];
        if (cell) {
          column.push({ cell, row: r, col: c });
        }
      }
      colsArr.push(column);
    }
    return colsArr;
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

  const outerWidth = gridWidth + BOARD_FRAME * 2 + PLAYFIELD_INSET * 2;
  const outerHeight = gridHeight + BOARD_FRAME * 2 + PLAYFIELD_INSET * 2;

  return (
    <View style={[styles.boardShell, { width: outerWidth, height: outerHeight }]}>
      <LinearGradient
        colors={['#7f8aa0', '#465267', '#1a2232', '#5f6b82']}
        start={{ x: 0.02, y: 0 }}
        end={{ x: 0.98, y: 1 }}
        style={[styles.boardFrame, { borderRadius: OUTER_RADIUS }]}
      >
        <View style={[styles.boardFrameEdge, { borderRadius: OUTER_RADIUS - 2 }]} />
        <LinearGradient
          colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.18)']}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.88, y: 1 }}
          style={[styles.boardFrameGloss, { borderRadius: OUTER_RADIUS - 4 }]}
        />
        <View style={styles.boardGlowTop} />
        <View style={styles.boardGlowBottom} />

        <LinearGradient
          colors={['rgba(10, 14, 32, 0.96)', 'rgba(17, 23, 48, 0.96)', 'rgba(9, 13, 30, 0.98)']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.playfieldWell, { top: BOARD_FRAME, left: BOARD_FRAME, right: BOARD_FRAME, bottom: BOARD_FRAME, borderRadius: OUTER_RADIUS - 8 }]}
        >
          <View style={styles.playfieldInsetShadow} />
          <LinearGradient
            colors={['rgba(0, 212, 255, 0.12)', 'rgba(179, 102, 255, 0.05)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.playfieldAura}
          />

          <GestureDetector gesture={composedGesture}>
            <View
              style={[
                styles.gridContainer,
                {
                  width: gridWidth,
                  height: gridHeight,
                  margin: PLAYFIELD_INSET,
                  borderRadius: PLAYFIELD_RADIUS,
                },
              ]}
            >
              <View style={[styles.playfieldBackplate, { borderRadius: PLAYFIELD_RADIUS }]} />
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.14)']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={[styles.playfieldBevel, { borderRadius: PLAYFIELD_RADIUS }]}
              />
              <View style={[styles.gridSlotMatrix, { borderRadius: PLAYFIELD_RADIUS - 1 }]} />

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
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  boardShell: {
    alignSelf: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 18,
  },
  boardFrame: {
    flex: 1,
    overflow: 'hidden',
    padding: BOARD_FRAME,
  },
  boardFrameEdge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  boardFrameGloss: {
    ...StyleSheet.absoluteFillObject,
    margin: 3,
  },
  boardGlowTop: {
    position: 'absolute',
    top: -16,
    left: '12%',
    width: '76%',
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    opacity: 0.4,
  },
  boardGlowBottom: {
    position: 'absolute',
    bottom: -14,
    left: '18%',
    width: '64%',
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.26)',
    opacity: 0.7,
  },
  playfieldWell: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playfieldInsetShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.32)',
    borderRadius: OUTER_RADIUS - 8,
  },
  playfieldAura: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  gridContainer: {
    flexDirection: 'row',
    padding: CELL_GAP / 2 + 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 12, 28, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(181, 195, 220, 0.16)',
  },
  playfieldBackplate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 20, 0.76)',
  },
  playfieldBevel: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gridSlotMatrix: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 16, 34, 0.52)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  frozenColumn: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(117, 232, 255, 0.16)',
  },
});
