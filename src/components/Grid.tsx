import React, { useMemo, useRef, useCallback } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Grid as GridType, CellPosition, GravityDirection } from '../types';
import { LetterCell } from './LetterCell';
import { CELL_GAP, COLORS, MAX_GRID_WIDTH } from '../constants';
import { LOCAL_IMAGES } from '../utils/localAssets';
import ScanLineOverlay from './common/ScanLineOverlay';
import SelectionTrailOverlay from './game/SelectionTrailOverlay';

// Extracted constants to avoid creating new objects on every render
const NEON_FRAME_COLORS = ['rgba(255,45,149,0.35)', 'rgba(200,77,255,0.25)', 'rgba(0,229,255,0.20)'] as [string, string, ...string[]];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
const EMPTY_FLEX = { flex: 1 } as const;

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
  wildcardCells?: CellPosition[];
  spotlightDimmedCells?: Set<string>;
  gravityDirection?: GravityDirection;
  /** When true, cells render at their grid row position instead of stacking to bottom */
  noGravityLayout?: boolean;
  validWord?: boolean;
  movedCells?: CellPosition[];
  maxHeight?: number;
  isDragging?: boolean;
  /** Per-tile gravity fall Animated.Values keyed by cell ID */
  fallAnimMap?: Map<string, Animated.Value>;
  /** Whether fall animation is currently active */
  fallActive?: boolean;
}

function GameGridImpl({
  grid,
  selectedCells,
  hintedCells = [],
  onCellPress,
  onDragStart,
  onDragEnd,
  wildcardCells = [],
  spotlightDimmedCells,
  gravityDirection,
  validWord = false,
  movedCells = [],
  maxHeight,
  isDragging = false,
  noGravityLayout = false,
  fallAnimMap,
  fallActive = false,
}: GridProps) {
  const rows = grid.length;
  const cols = grid[0].length;

  const cellSize = useMemo(() => {
    const availableWidth = MAX_GRID_WIDTH - CELL_GAP * (cols + 1);
    const widthBased = Math.floor(availableWidth / cols);
    if (maxHeight && maxHeight > 0) {
      // Account for neon frame (framePad*2=6), gradient border (3*2=6), outer glow padding (12)
      const frameAllowance = 58;
      const heightAvail = maxHeight - frameAllowance;
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

  const wildcardSet = useMemo(() => {
    const set = new Set<string>();
    wildcardCells.forEach(c => set.add(`${c.row},${c.col}`));
    return set;
  }, [wildcardCells]);

  const movedSet = useMemo(() => {
    const set = new Set<string>();
    movedCells.forEach(c => set.add(`${c.row},${c.col}`));
    return set;
  }, [movedCells]);

  const columns = useMemo(() => {
    const cols_arr: { cell: NonNullable<GridType[0][0]> | null; row: number; col: number }[][] = [];
    for (let c = 0; c < cols; c++) {
      const column: { cell: NonNullable<GridType[0][0]> | null; row: number; col: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const cell = grid[r][c];
        if (cell) {
          column.push({ cell, row: r, col: c });
        } else if (noGravityLayout) {
          // Preserve empty slots so cells stay at their grid position
          column.push({ cell: null, row: r, col: c });
        }
      }
      cols_arr.push(column);
    }
    return cols_arr;
  }, [grid, rows, cols, noGravityLayout]);

  const gridWidth = useMemo(() => cols * (cellSize + CELL_GAP) + CELL_GAP, [cols, cellSize]);
  const gridHeight = useMemo(() => rows * (cellSize + CELL_GAP), [rows, cellSize]);

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

      if (noGravityLayout) {
        // Cells at their actual row positions (no bottom-stacking)
        colCells.forEach((cell) => {
          bounds.push({
            row: cell.row,
            col: c,
            x: colX,
            y: cell.row * cellStride,
            w: cellSize + CELL_GAP,
            h: cellSize + CELL_GAP,
          });
        });
      } else {
        // Gravity layout: stack cells at bottom of column
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
    }
    return bounds;
  }, [grid, rows, cols, cellSize, gridHeight, noGravityLayout]);

  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef({ x: 0, y: 0 });
  const lastDragCellRef = useRef<string | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Hit test using exact cell size (not cell + gap) for precise boundary detection.
  // Uses nearest-center tiebreaking for taps in gap space.
  const hitTestCell = useCallback((absX: number, absY: number): CellPosition | null => {
    let bestDist = Infinity;
    let bestCell: CellPosition | null = null;
    for (const b of cellBounds) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      // Check if within the full cell+gap area first (coarse filter)
      if (absX >= b.x && absX < b.x + b.w && absY >= b.y && absY < b.y + b.h) {
        const dist = Math.abs(absX - cx) + Math.abs(absY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = { row: b.row, col: b.col };
        }
      }
    }
    return bestCell;
  }, [cellBounds]);

  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        isDraggingRef.current = true;
        lastDragCellRef.current = null;
        lastDragPosRef.current = { x: e.x, y: e.y };
        onDragStartRef.current?.();
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          const key = `${cell.row},${cell.col}`;
          lastDragCellRef.current = key;
          onCellPressRef.current(cell);
        }
      })
      .onUpdate((e) => {
        // Interpolate between last position and current to catch cells skipped by fast diagonal drags
        const prev = lastDragPosRef.current;
        if (prev) {
          const dx = e.x - prev.x;
          const dy = e.y - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const halfCell = (cellSize + CELL_GAP) / 2;
          if (dist > halfCell) {
            const steps = Math.ceil(dist / halfCell);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              const mx = prev.x + dx * t;
              const my = prev.y + dy * t;
              const midCell = hitTestCell(mx, my);
              if (midCell) {
                const midKey = `${midCell.row},${midCell.col}`;
                if (midKey !== lastDragCellRef.current) {
                  lastDragCellRef.current = midKey;
                  onCellPressRef.current(midCell);
                }
              }
            }
          }
        }
        lastDragPosRef.current = { x: e.x, y: e.y };

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
        lastDragPosRef.current = null;
        onDragEndRef.current?.();
      })
      .onFinalize(() => {
        isDraggingRef.current = false;
        lastDragCellRef.current = null;
        lastDragPosRef.current = null;
      });

    const tapGesture = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => {
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          onCellPressRef.current(cell);
        }
      });

    return Gesture.Race(panGesture, tapGesture);
  }, [hitTestCell]);

  const framePad = 3;
  const outerWidth = gridWidth + framePad * 2;
  const outerHeight = gridHeight + framePad * 2;

  // Memoize computed style objects to avoid creating new objects on every render
  const outerGlowStyle = useMemo(() => [
    styles.outerGlow,
    { width: outerWidth + 12, height: outerHeight + 12, borderRadius: 28 },
    isDragging && styles.outerGlowDragging,
  ], [outerWidth, outerHeight, isDragging]);

  const neonFrameWrapStyle = useMemo(() => [
    styles.neonFrameWrap, { width: outerWidth + 16, height: outerHeight + 16, borderRadius: 28 }
  ], [outerWidth, outerHeight]);

  const neonFrameStyle = useMemo(() => [
    styles.neonFrame, { width: outerWidth, height: outerHeight, borderRadius: 24 }
  ], [outerWidth, outerHeight]);

  const frameInnerStyle = useMemo(() => [
    styles.frameInner, { width: gridWidth + 2, height: gridHeight + 2, borderRadius: 22 }
  ], [gridWidth, gridHeight]);

  const gridContainerStyle = useMemo(() => [
    styles.gridContainer, { width: gridWidth, height: gridHeight, borderRadius: 21 }
  ], [gridWidth, gridHeight]);

  // Build a single stable column style per gravity config to avoid per-column allocations inside the map loop.
  const columnStyle = useMemo(() => {
    const base = [
      styles.column,
      { width: cellSize + CELL_GAP, height: gridHeight },
    ] as any[];
    if (noGravityLayout) base.push(styles.columnNoGravity);
    else if (gravityDirection === 'up') base.push(styles.columnGravityUp);
    return base;
  }, [cellSize, gridHeight, noGravityLayout, gravityDirection]);

  // Empty-slot placeholder style (only used by noGravityLayout), memoized to share reference.
  const emptySlotStyle = useMemo(
    () => ({ width: cellSize, height: cellSize, margin: CELL_GAP / 2 }),
    [cellSize],
  );

  return (
    <View style={styles.shadowWrap}>
      <View style={outerGlowStyle} />

      <View style={neonFrameWrapStyle}>
        <Image
          source={LOCAL_IMAGES.neonFrame}
          style={styles.neonFrameImage}
          resizeMode="stretch"
        />
      </View>

      <LinearGradient
        colors={NEON_FRAME_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={neonFrameStyle}
      >
        <View style={frameInnerStyle}>
          {/* CRT scan line overlay inside the grid frame */}
          <ScanLineOverlay opacity={0.03} height={gridHeight} animated scrollDuration={4000} />

          <GestureDetector gesture={composedGesture}>
            <View
              ref={gridRef}
              style={gridContainerStyle}
              accessibilityRole="none"
              accessibilityLabel={`Letter grid, ${rows} rows by ${cols} columns`}
            >
              {columns.map((column, colIndex) => (
                <View key={colIndex} style={columnStyle}>
                  {!noGravityLayout && gravityDirection !== 'up' && <View style={EMPTY_FLEX} />}
                  {column.map(({ cell, row, col }) => {
                    if (!cell) {
                      // Empty slot placeholder for noGravity layout
                      return (
                        <View
                          key={`empty-${row}-${col}`}
                          style={emptySlotStyle}
                        />
                      );
                    }
                    const key = `${row},${col}`;
                    const selIndex = selectedSet.get(key) ?? -1;
                    const isSelected = selIndex >= 0;
                    const isHinted = hintedSet.has(key);
                    const cellFallAnim = fallActive && fallAnimMap ? fallAnimMap.get(cell.id) : undefined;

                    return (
                      <LetterCell
                        key={cell.id}
                        letter={cell.letter}
                        cellId={cell.id}
                        size={cellSize}
                        isSelected={isSelected}
                        isHinted={isHinted}
                        selectionIndex={selIndex}
                        isValidWord={validWord && isSelected}
                        isMoved={movedSet.has(key)}
                        isWildcard={wildcardSet.has(`${row},${col}`)}
                        isSpotlightDimmed={spotlightDimmedCells?.has(`${row},${col}`) || false}
                        fallAnim={cellFallAnim}
                      />
                    );
                  })}
                  {!noGravityLayout && gravityDirection === 'up' && <View style={EMPTY_FLEX} />}
                </View>
              ))}
            </View>
          </GestureDetector>

          {/* Gravity direction arrow indicator */}
          {gravityDirection && gravityDirection !== 'down' && (
            <View style={[
              styles.gravityArrowContainer,
              gravityDirection === 'right' && styles.gravityArrowRight,
              gravityDirection === 'up' && styles.gravityArrowUp,
              gravityDirection === 'left' && styles.gravityArrowLeft,
            ]}>
              <View style={styles.gravityArrowBadge}>
                <Text style={styles.gravityArrowText}>
                  {gravityDirection === 'right' ? '→' : gravityDirection === 'up' ? '↑' : '←'}
                </Text>
              </View>
            </View>
          )}

          {/* Neon selection trail lines between selected cells */}
          {selectedCells.length > 1 && (
            <SelectionTrailOverlay
              selectedCells={selectedCells}
              cellBounds={cellBounds}
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

export const GameGrid = React.memo(GameGridImpl);

const styles = StyleSheet.create({
  shadowWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    // shadowRadius >20 is GPU-expensive because iOS renders shadows via an
    // offscreen Gaussian blur pass every frame. The grid is redrawn on every
    // selection/fall animation, so a 40px blur here is a heavy per-frame cost.
    // Capped to 16px — visually nearly identical, far cheaper.
    position: 'absolute',
    backgroundColor: 'rgba(255,45,149,0.08)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 0,
    alignSelf: 'center',
  },
  outerGlowDragging: {
    backgroundColor: 'rgba(255,45,149,0.16)',
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  neonFrameWrap: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  neonFrameImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    opacity: 0.45,
  },
  neonFrame: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  frameInner: {
    backgroundColor: 'rgba(8, 0, 18, 0.88)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    padding: CELL_GAP / 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  columnNoGravity: {
    justifyContent: 'flex-start',
  },
  columnGravityUp: {
    justifyContent: 'flex-start',
  },
  gravityArrowContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  gravityArrowRight: {
    right: -28,
    top: '50%' as unknown as number,
    marginTop: -14,
  },
  gravityArrowUp: {
    top: -28,
    left: '50%' as unknown as number,
    marginLeft: -14,
  },
  gravityArrowLeft: {
    left: -28,
    top: '50%' as unknown as number,
    marginTop: -14,
  },
  gravityArrowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gravityArrowText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '700',
    lineHeight: 18,
  },
});
