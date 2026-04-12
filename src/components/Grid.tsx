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
import SelectionTrailOverlay from './game/SelectionTrailOverlay';
import { perfDragStart, perfDragDispatch, perfDragEnd } from '../utils/perfInstrument';

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
  /** Single-cell dispatch (e.g. gesture begin, tap). */
  onCellPress: (position: CellPosition) => void;
  /**
   * Optional batched dispatch. When provided, the pan handler coalesces all
   * cell crossings during a single animation frame into one call to this
   * callback instead of calling onCellPress N times. Backed by the
   * SELECT_CELLS reducer action. Consumers that don't pass this prop fall
   * back to per-cell onCellPress calls for backwards compatibility.
   */
  onCellsPress?: (positions: CellPosition[]) => void;
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
  onCellsPress,
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

  // ── Column-indexed hit-test lookup (stride-based O(1)) ───────────────────
  // The old implementation iterated every cellBounds entry (up to 49) on
  // every pointer move, then again per interpolated step during fast drags.
  // Now we precompute per-column ordered arrays and compute (col, rowSlot)
  // with arithmetic, reducing each hit test to at most one bounds check.
  const cellBoundsRef = useRef(cellBounds);
  cellBoundsRef.current = cellBounds;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;

  // Per-column sorted bounds list. Each column entry holds the cells in
  // layout order (top to bottom) so a y-coordinate maps to an index via
  // `Math.floor((y - firstY) / stride)`.
  const cellsByColumnRef = useRef<Array<Array<{ row: number; col: number; y: number; h: number }>>>([]);
  cellsByColumnRef.current = useMemo(() => {
    const byCol: Array<Array<{ row: number; col: number; y: number; h: number }>> = [];
    for (let c = 0; c < cols; c++) byCol.push([]);
    for (const b of cellBounds) {
      if (b.col >= 0 && b.col < cols) {
        byCol[b.col].push({ row: b.row, col: b.col, y: b.y, h: b.h });
      }
    }
    // Sort each column by y so we can binary-search or stride-index.
    for (const col of byCol) col.sort((a, b) => a.y - b.y);
    return byCol;
  }, [cellBounds, cols]);

  const strideRef = useRef(cellSize + CELL_GAP);
  strideRef.current = cellSize + CELL_GAP;
  const gridWidthRef = useRef(gridWidth);
  gridWidthRef.current = gridWidth;
  const gridHeightRef = useRef(gridHeight);
  gridHeightRef.current = gridHeight;
  const noGravityLayoutRef = useRef(noGravityLayout);
  noGravityLayoutRef.current = noGravityLayout;

  // Stable hit test. Column is computed by x/stride (constant time).
  // For gravity-down grids, cells are contiguous so we use stride-based O(1)
  // slot indexing. For noGravityLayout grids (noGravity / shrinkingBoard),
  // cleared cells leave gaps, so we derive the target row directly from
  // the y-coordinate and scan the (small) column array.
  const hitTestCell = useCallback((absX: number, absY: number): CellPosition | null => {
    // Fast out-of-bounds rejection.
    if (absX < 0 || absY < 0 || absX >= gridWidthRef.current || absY >= gridHeightRef.current) {
      return null;
    }
    const stride = strideRef.current;
    if (stride <= 0) return null;
    // CELL_GAP / 2 is the inner padding added in cellBounds computation.
    const padding = CELL_GAP / 2;
    const colIdx = Math.floor((absX - padding) / stride);
    const byCol = cellsByColumnRef.current;
    if (colIdx < 0 || colIdx >= byCol.length) return null;
    const column = byCol[colIdx];
    if (column.length === 0) return null;

    if (noGravityLayoutRef.current) {
      // In noGravityLayout, cells sit at y = row * stride. Cleared cells
      // leave gaps so the column array is NOT contiguous. Derive the target
      // row directly from the y-coordinate and scan for a match.
      const targetRow = Math.floor(absY / stride);
      for (let i = 0; i < column.length; i++) {
        const c = column[i];
        if (c.row === targetRow) {
          if (absY >= c.y && absY < c.y + c.h) {
            return { row: c.row, col: c.col };
          }
          return null;
        }
        if (c.row > targetRow) return null; // Past it (sorted), no match
      }
      return null;
    }

    // Gravity-down: cells are contiguous, stride-based O(1) slot indexing.
    const firstY = column[0].y;
    const slotIdx = Math.floor((absY - firstY) / stride);
    if (slotIdx < 0 || slotIdx >= column.length) return null;
    const candidate = column[slotIdx];
    // Cheap sanity check: ensure absY is actually within [candidate.y, candidate.y + candidate.h).
    if (absY >= candidate.y && absY < candidate.y + candidate.h) {
      return { row: candidate.row, col: candidate.col };
    }
    return null;
  }, []);

  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;
  const onCellsPressRef = useRef(onCellsPress);
  onCellsPressRef.current = onCellsPress;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // Built once on mount. The empty dep array is intentional — the callbacks
  // read from refs, so the gesture handler never needs to be rebuilt.
  //
  // NOTE on rAF batching: an earlier version deferred pan onUpdate dispatches
  // to requestAnimationFrame, intending to cap commits at the display refresh
  // rate. In practice this ADDED ~16ms of latency per cell because React
  // renders still take 50-100ms (way above one frame), so the rAF wait was
  // pure overhead with no batching benefit. Reverted to synchronous dispatch
  // which matches the pre-optimization behavior. The SELECT_CELLS action and
  // onCellsPress plumbing still exist in useGame.ts and Grid's props so they
  // can be re-enabled once per-commit render time drops below 16ms (via a
  // full PlayArea extraction — Phase 2D in the optimization plan).
  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      // Cancel pointer updates when the finger leaves the grid. This stops
      // the native handler from pumping events we'd just reject anyway,
      // saving a few hundred microseconds per off-grid frame during drags
      // that stray over the word bank or booster bar.
      .shouldCancelWhenOutside(true)
      .onBegin((e) => {
        isDraggingRef.current = true;
        lastDragCellRef.current = null;
        lastDragPosRef.current = { x: e.x, y: e.y };
        perfDragStart();
        onDragStartRef.current?.();
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          const key = `${cell.row},${cell.col}`;
          lastDragCellRef.current = key;
          perfDragDispatch();
          onCellPressRef.current(cell);
        }
      })
      .onUpdate((e) => {
        // Interpolate between last position and current to catch cells
        // skipped by fast diagonal drags. Hit-test is O(1) thanks to the
        // column-indexed lookup, so this stays cheap.
        const crossedCells: CellPosition[] = [];
        const prev = lastDragPosRef.current;
        const enqueueCell = (cell: CellPosition) => {
          const key = `${cell.row},${cell.col}`;
          if (key === lastDragCellRef.current) return;
          lastDragCellRef.current = key;
          crossedCells.push(cell);
        };
        if (prev) {
          const dx = e.x - prev.x;
          const dy = e.y - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const halfCell = (cellSizeRef.current + CELL_GAP) / 2;
          if (dist > halfCell) {
            const steps = Math.ceil(dist / halfCell);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              const mx = prev.x + dx * t;
              const my = prev.y + dy * t;
              const midCell = hitTestCell(mx, my);
              if (midCell) {
                enqueueCell(midCell);
              }
            }
          }
        }
        lastDragPosRef.current = { x: e.x, y: e.y };

        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          enqueueCell(cell);
        }

        if (crossedCells.length > 0) {
          perfDragDispatch();
          if (onCellsPressRef.current) {
            onCellsPressRef.current(crossedCells);
          } else {
            crossedCells.forEach((crossedCell) => onCellPressRef.current(crossedCell));
          }
        }
      })
      .onEnd(() => {
        isDraggingRef.current = false;
        lastDragCellRef.current = null;
        lastDragPosRef.current = null;
        perfDragEnd();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* ScanLineOverlay removed from the grid. It rendered ~130 static
              View elements (one per scan line) plus a withRepeat scroll loop
              inside the grid frame — and the grid re-reconciles all of those
              on every selection change. At opacity 0.03 the effect is barely
              visible anyway, and the cost on every grid render is significant. */}

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
