import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
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

/**
 * Immutable layout snapshot read by the UI-thread hit-test worklet. Pushed
 * from JS into a shared value whenever the board layout changes (never per
 * frame), so the worklet can resolve a touch to a cell without hopping to JS.
 */
type GridHitLayout = {
  byCol: Array<Array<{ row: number; col: number; y: number; h: number }>>;
  stride: number;
  gridWidth: number;
  gridHeight: number;
  padding: number;
  rows: number;
  wildcardMode: boolean;
  noGravityLayout: boolean;
};

const EMPTY_HIT_LAYOUT: GridHitLayout = {
  byCol: [],
  stride: 0,
  gridWidth: 0,
  gridHeight: 0,
  padding: CELL_GAP / 2,
  rows: 0,
  wildcardMode: false,
  noGravityLayout: false,
};

/**
 * UI-thread hit test. Mirrors the former JS `hitTestCell` exactly but runs
 * inside the Reanimated worklet runtime, so finger tracking is never starved
 * by JS-thread React commits. Column is computed by x/stride (constant time);
 * gravity-down grids use stride-based slot indexing, noGravityLayout grids
 * scan the (small) column array because cleared cells leave gaps.
 */
function hitTestWorklet(
  absX: number,
  absY: number,
  layout: GridHitLayout,
): CellPosition | null {
  'worklet';
  const { byCol, stride, gridWidth, gridHeight, padding, rows, wildcardMode, noGravityLayout } = layout;
  if (stride <= 0) return null;
  if (absX < 0 || absY < 0 || absX >= gridWidth || absY >= gridHeight) return null;

  if (wildcardMode) {
    const colIdx = Math.floor((absX - padding) / stride);
    const rowIdx = Math.floor(absY / stride);
    if (colIdx >= 0 && colIdx < byCol.length && rowIdx >= 0 && rowIdx < rows) {
      return { row: rowIdx, col: colIdx };
    }
    return null;
  }

  const colIdx = Math.floor((absX - padding) / stride);
  if (colIdx < 0 || colIdx >= byCol.length) return null;
  const column = byCol[colIdx];
  if (!column || column.length === 0) return null;

  if (noGravityLayout) {
    const targetRow = Math.floor(absY / stride);
    for (let i = 0; i < column.length; i++) {
      const c = column[i];
      if (c.row === targetRow) {
        if (absY >= c.y && absY < c.y + c.h) return { row: c.row, col: c.col };
        return null;
      }
      if (c.row > targetRow) return null; // Past it (sorted), no match
    }
    return null;
  }

  const firstY = column[0].y;
  const slotIdx = Math.floor((absY - firstY) / stride);
  if (slotIdx < 0 || slotIdx >= column.length) return null;
  const candidate = column[slotIdx];
  if (absY >= candidate.y && absY < candidate.y + candidate.h) {
    return { row: candidate.row, col: candidate.col };
  }
  return null;
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
  /** When true, all grid positions become tappable (for wildcard placement on empty cells) */
  wildcardMode?: boolean;
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
  wildcardMode = false,
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

  // Current word under construction, only materialized when the valid-word
  // flash is on (auto-submit window). This prop was previously threaded to
  // every selected LetterCell on every tap so screen readers could announce
  // the full in-progress word — but since the string grows per tap, every
  // selected cell re-rendered every tap even though nothing else changed.
  // Announcing the full word only at the valid-flash moment preserves the
  // useful TalkBack cue ("part of valid word CATS") without breaking
  // LetterCell memoization during active selection. Individual cells still
  // announce their letter + selection index in all cases.
  const currentWord = useMemo(() => {
    if (!validWord) return '';
    if (selectedCells.length === 0) return '';
    let word = '';
    for (const c of selectedCells) {
      const cell = grid[c.row]?.[c.col];
      if (cell) word += cell.letter;
    }
    return word;
  }, [selectedCells, grid, validWord]);

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

  // ── Column-indexed hit-test lookup (stride-based O(1)) ───────────────────
  // The old implementation iterated every cellBounds entry (up to 49) on
  // every pointer move, then again per interpolated step during fast drags.
  // Now we precompute per-column ordered arrays and compute (col, rowSlot)
  // with arithmetic, reducing each hit test to at most one bounds check.
  // Per-column sorted bounds list. Each column entry holds the cells in
  // layout order (top to bottom) so a y-coordinate maps to an index via
  // `Math.floor((y - firstY) / stride)`.
  const cellsByColumn = useMemo(() => {
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

  // ── UI-thread gesture state (shared values) ───────────────────────────────
  // The pan gesture runs as a worklet on the UI thread, so finger tracking is
  // never blocked by JS-thread React commits. `layoutSV` carries an immutable
  // layout snapshot the hit-test worklet reads; it's refreshed only when the
  // board layout changes (not per frame). Per-drag scratch state lives in
  // shared values the worklet owns.
  const layoutSV = useSharedValue<GridHitLayout>(EMPTY_HIT_LAYOUT);
  const lastDragCellSV = useSharedValue<string | null>(null);
  const lastDragPosSV = useSharedValue<{ x: number; y: number } | null>(null);

  useEffect(() => {
    layoutSV.value = {
      byCol: cellsByColumn,
      stride: cellSize + CELL_GAP,
      gridWidth,
      gridHeight,
      padding: CELL_GAP / 2,
      rows,
      wildcardMode,
      noGravityLayout,
    };
  }, [cellsByColumn, cellSize, gridWidth, gridHeight, rows, wildcardMode, noGravityLayout, layoutSV]);

  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;
  const onCellsPressRef = useRef(onCellsPress);
  onCellsPressRef.current = onCellsPress;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // JS-thread commit callbacks. The gesture worklet hops here via runOnJS
  // ONLY to push selection into the store — finger sampling keeps running on
  // the UI thread meanwhile, so a busy JS thread can no longer stall the drag.
  // Stable (useCallback []) so the worklet gesture captures them once.
  const commitCellsJS = useCallback((cells: CellPosition[]) => {
    if (cells.length === 0) return;
    perfDragDispatch();
    if (onCellsPressRef.current) onCellsPressRef.current(cells);
    else cells.forEach((c) => onCellPressRef.current(c));
  }, []);
  const pressCellJS = useCallback((cell: CellPosition) => {
    perfDragDispatch();
    onCellPressRef.current(cell);
  }, []);
  const dragStartJS = useCallback(() => {
    perfDragStart();
    onDragStartRef.current?.();
  }, []);
  const dragEndJS = useCallback(() => {
    perfDragEnd();
    onDragEndRef.current?.();
  }, []);

  // Built once on mount. Pan + tap callbacks are worklets (note the absence of
  // runOnJS(true)), so they execute on the UI thread; hit-testing reads the
  // immutable layout snapshot from layoutSV. Only the store commit hops to JS
  // via runOnJS, and crossed cells are coalesced per frame into one commit.
  const composedGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .minDistance(0)
      // Cancel pointer updates when the finger leaves the grid. This stops
      // the native handler from pumping events we'd just reject anyway.
      .shouldCancelWhenOutside(true)
      .onBegin((e) => {
        'worklet';
        lastDragCellSV.value = null;
        lastDragPosSV.value = { x: e.x, y: e.y };
        runOnJS(dragStartJS)();
        const cell = hitTestWorklet(e.x, e.y, layoutSV.value);
        if (cell) {
          lastDragCellSV.value = `${cell.row},${cell.col}`;
          runOnJS(pressCellJS)(cell);
        }
      })
      .onUpdate((e) => {
        'worklet';
        // Interpolate between last position and current to catch cells skipped
        // by fast diagonal drags. Hit-test is O(1) via the column index.
        const layout = layoutSV.value;
        const crossed: CellPosition[] = [];
        const enqueue = (cell: CellPosition) => {
          const key = `${cell.row},${cell.col}`;
          if (key === lastDragCellSV.value) return;
          lastDragCellSV.value = key;
          crossed.push(cell);
        };
        const prev = lastDragPosSV.value;
        if (prev) {
          const dx = e.x - prev.x;
          const dy = e.y - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const halfCell = layout.stride / 2;
          if (halfCell > 0 && dist > halfCell) {
            const steps = Math.ceil(dist / halfCell);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              const mid = hitTestWorklet(prev.x + dx * t, prev.y + dy * t, layout);
              if (mid) enqueue(mid);
            }
          }
        }
        lastDragPosSV.value = { x: e.x, y: e.y };
        const cell = hitTestWorklet(e.x, e.y, layout);
        if (cell) enqueue(cell);
        if (crossed.length > 0) runOnJS(commitCellsJS)(crossed);
      })
      .onEnd(() => {
        'worklet';
        lastDragCellSV.value = null;
        lastDragPosSV.value = null;
      })
      .onFinalize(() => {
        // Always fires (including on cancel), so drag-end cleanup is guaranteed.
        'worklet';
        lastDragCellSV.value = null;
        lastDragPosSV.value = null;
        runOnJS(dragEndJS)();
      });

    const tapGesture = Gesture.Tap()
      .onEnd((e) => {
        'worklet';
        const cell = hitTestWorklet(e.x, e.y, layoutSV.value);
        if (cell) runOnJS(pressCellJS)(cell);
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

          {/* Neon selection trail — mounted BEFORE the tile grid so the
              trail's dots + line segments paint BEHIND the tiles. The line
              only shows in the cell-gap regions (letters stay fully
              readable); tile selection color still marks which cells are
              chosen. Prior order had the overlay on top which meant the
              9px dots sat right over the letters on every selected tile. */}
          {selectedCells.length > 1 && (
            <SelectionTrailOverlay
              selectedCells={selectedCells}
              cellBounds={cellBounds}
            />
          )}

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
                        row={row}
                        col={col}
                        currentWord={isSelected && validWord ? currentWord : undefined}
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
