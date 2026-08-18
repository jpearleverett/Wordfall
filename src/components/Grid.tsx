import React, { useMemo, useRef, useCallback, useEffect, useLayoutEffect, useState, useImperativeHandle, forwardRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
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
import { useReduceMotion } from '../hooks/useReduceMotion';

// Extracted constants to avoid creating new objects on every render
const NEON_FRAME_COLORS = ['rgba(255,45,149,0.35)', 'rgba(200,77,255,0.25)', 'rgba(0,229,255,0.20)'] as [string, string, ...string[]];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
const EMPTY_FLEX = { flex: 1 } as const;
const IS_ANDROID = Platform.OS === 'android';

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
  /**
   * Fired on finger lift / gesture cancel. `didTraceMultiple` is true only
   * when THIS gesture selected 2+ cells (a real drag-trace) — single taps
   * report false so tap-by-tap selection is never auto-released.
   */
  onDragEnd?: (didTraceMultiple: boolean) => void;
  wildcardCells?: CellPosition[];
  spotlightDimmedCells?: Set<string>;
  gravityDirection?: GravityDirection;
  /** When true, cells render at their grid row position instead of stacking to bottom */
  noGravityLayout?: boolean;
  validWord?: boolean;
  maxHeight?: number;
  /**
   * Fired once when every tile from a gravity fall has landed and settled.
   * GameScreen uses it for the landing haptic. Not fired for interrupted
   * runs (a second word found mid-fall) — the successor run fires instead.
   */
  onGravitySettled?: () => void;
  /** When true, all grid positions become tappable (for wildcard placement on empty cells) */
  wildcardMode?: boolean;
  /**
   * Cell carrying the bonus coin marker (variable-reward tile). Keyed by
   * cell ID so the marker travels with the tile through gravity falls.
   */
  bonusCellId?: string | null;
}

// ── Cleared-word ghost tiles ────────────────────────────────────────────────
// When a word resolves, its tiles are removed from the grid data and would
// unmount instantly — a harsh pop. The ghost layer re-renders each cleared
// tile at its old position for ~350ms as a glowing green tile that swells,
// lifts, and dissolves, giving the clear a physical "burst" beat before the
// gravity cascade lands in the vacated space. Everything is native-driven.

interface GhostSpec {
  id: string;
  letter: string;
  x: number;
  y: number;
  col: number;
}

interface GhostLayerHandle {
  spawn(specs: GhostSpec[]): void;
}

interface GhostEntry extends GhostSpec {
  key: string;
  order: number;
}

// Matches LetterCell's valid-word (green) tile ramp so the ghost reads as a
// direct continuation of the valid-word flash the tiles showed at submit.
const GHOST_BODY_COLORS = ['#33ffaa', '#00d96e', '#008844'] as [string, string, string];
const GHOST_STAGGER_MS = 24;
const GHOST_DURATION_MS = 340;

const GhostTile = React.memo(function GhostTile({ ghost, cellSize }: { ghost: GhostEntry; cellSize: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(ghost.order * GHOST_STAGGER_MS),
      Animated.timing(anim, {
        toValue: 1,
        duration: GHOST_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const borderRadius = cellSize * 0.2;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: ghost.x + CELL_GAP / 2,
        top: ghost.y + CELL_GAP / 2,
        width: cellSize,
        height: cellSize,
        borderRadius,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0.95, 0] }),
        transform: [
          { scale: anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.14, 1.22] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -cellSize * 0.18] }) },
        ],
      }}
    >
      <LinearGradient
        colors={GHOST_BODY_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={StyleSheet.absoluteFillObject}
      />
      <Text
        style={{
          color: '#ffffff',
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: cellSize * 0.46,
          textShadowColor: 'rgba(0,40,15,1)',
          textShadowRadius: 8,
        }}
      >
        {ghost.letter}
      </Text>
    </Animated.View>
  );
});

const ClearGhostLayer = React.memo(forwardRef<GhostLayerHandle, { cellSize: number }>(
  function ClearGhostLayer({ cellSize }, ref) {
    const [ghosts, setGhosts] = useState<GhostEntry[]>([]);
    const batchRef = useRef(0);
    const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useImperativeHandle(ref, () => ({
      spawn(specs: GhostSpec[]) {
        if (specs.length === 0) return;
        const batch = ++batchRef.current;
        const entries: GhostEntry[] = specs.map((s, i) => ({
          ...s,
          key: `${batch}-${s.id}`,
          order: i,
        }));
        setGhosts(prev => [...prev, ...entries]);
        const ttl = GHOST_DURATION_MS + specs.length * GHOST_STAGGER_MS + 60;
        const t = setTimeout(() => {
          timersRef.current.delete(t);
          const keys = new Set(entries.map(e => e.key));
          setGhosts(prev => prev.filter(g => !keys.has(g.key)));
        }, ttl);
        timersRef.current.add(t);
      },
    }), []);

    useEffect(() => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    }, []);

    if (ghosts.length === 0) return null;
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {ghosts.map(g => (
          <GhostTile key={g.key} ghost={g} cellSize={cellSize} />
        ))}
      </View>
    );
  },
));

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
  maxHeight,
  noGravityLayout = false,
  onGravitySettled,
  wildcardMode = false,
  bonusCellId = null,
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

  // ── Gravity animation engine ─────────────────────────────────────────────
  // Grid owns the whole fall animation. The critical property: translate
  // offsets are computed and applied DURING RENDER, in the same pass that
  // moves each tile to its new layout slot. The first frame the new tree
  // paints, every moved tile already carries the transform that puts it back
  // at its old position — there is no window where a tile can flash at its
  // destination before the animation starts (the root cause of the old
  // "flicker then awkward settle"). A diff of the previous grid against the
  // current one also yields the cleared cells, which become dissolving
  // ghost tiles, and works for ALL gravity directions (the old fallRows
  // pipeline only animated vertical falls — gravityFlip left/right
  // teleported).
  const reduceMotion = useReduceMotion();

  // Map cell ID → pixel bound for the current grid.
  const boundsById = useMemo(() => {
    const byPos = new Map<string, { x: number; y: number }>();
    for (const b of cellBounds) byPos.set(`${b.row},${b.col}`, { x: b.x, y: b.y });
    const map = new Map<string, { x: number; y: number; col: number; letter: string }>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const b = byPos.get(`${r},${c}`);
        if (b) map.set(cell.id, { x: b.x, y: b.y, col: c, letter: cell.letter });
      }
    }
    return map;
  }, [grid, cellBounds, rows, cols]);

  const fallAnimMapRef = useRef(new Map<string, Animated.ValueXY>());
  // Live offsets reported by native-driver listeners while a fall is in
  // flight — lets an interrupting clear start the next fall from the tile's
  // CURRENT visual position instead of teleporting it to its settled slot.
  const liveOffsetRef = useRef(new Map<string, { x: number; y: number }>());
  const listenerHandleRef = useRef(new Map<string, string>());
  const prevGridRef = useRef<GridType | null>(null);
  const prevBoundsRef = useRef<Map<string, { x: number; y: number; col: number; letter: string }> | null>(null);
  const prevCellSizeRef = useRef(cellSize);
  const prevDimsRef = useRef({ rows, cols });
  const pendingFallsRef = useRef<{ id: string; dx: number; dy: number; col: number }[]>([]);
  const pendingGhostsRef = useRef<GhostSpec[]>([]);
  const fallRunIdRef = useRef(0);
  const ghostLayerRef = useRef<GhostLayerHandle | null>(null);
  const onGravitySettledRef = useRef(onGravitySettled);
  onGravitySettledRef.current = onGravitySettled;

  // Render-phase diff. Runs exactly once per grid-data change; geometry
  // changes (cell size / board dims from layout settle or board shrink)
  // reset the baseline without animating.
  if (prevGridRef.current !== grid) {
    const prevBounds = prevBoundsRef.current;
    const sameGeometry =
      prevCellSizeRef.current === cellSize &&
      prevDimsRef.current.rows === rows &&
      prevDimsRef.current.cols === cols &&
      prevBounds !== null;
    const falls: { id: string; dx: number; dy: number; col: number }[] = [];
    const ghosts: GhostSpec[] = [];
    if (prevGridRef.current !== null && prevBounds && sameGeometry && !reduceMotion) {
      for (const [id, bound] of boundsById) {
        const prev = prevBounds.get(id);
        if (!prev) continue;
        const live = liveOffsetRef.current.get(id);
        const dx = prev.x + (live?.x ?? 0) - bound.x;
        const dy = prev.y + (live?.y ?? 0) - bound.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          const existing = fallAnimMapRef.current.get(id);
          if (existing) {
            existing.setValue({ x: dx, y: dy });
          } else {
            fallAnimMapRef.current.set(id, new Animated.ValueXY({ x: dx, y: dy }));
          }
          falls.push({ id, dx, dy, col: bound.col });
        }
      }
      for (const [id, prev] of prevBounds) {
        if (!boundsById.has(id)) {
          ghosts.push({ id, letter: prev.letter, x: prev.x, y: prev.y, col: prev.col });
        }
      }
    } else if (!sameGeometry) {
      // Layout settle / board-shrink: the pixel space changed, so any
      // in-flight offsets are meaningless — snap everything to rest.
      for (const av of fallAnimMapRef.current.values()) {
        av.setValue({ x: 0, y: 0 });
      }
      liveOffsetRef.current.clear();
    }
    pendingFallsRef.current = falls;
    pendingGhostsRef.current = ghosts;
    prevGridRef.current = grid;
    prevBoundsRef.current = boundsById;
    prevCellSizeRef.current = cellSize;
    prevDimsRef.current = { rows, cols };
  }

  // Start the fall + ghost animations for the diff computed this render.
  // useLayoutEffect so it fires in the same frame as the commit; the
  // offsets were already applied during render, so even if a frame slips
  // in first, tiles paint at their OLD positions (never the destination).
  useLayoutEffect(() => {
    const ghosts = pendingGhostsRef.current;
    if (ghosts.length > 0) {
      pendingGhostsRef.current = [];
      ghostLayerRef.current?.spawn(ghosts);
    }
    const falls = pendingFallsRef.current;
    if (falls.length === 0) return;
    pendingFallsRef.current = [];
    const runId = ++fallRunIdRef.current;

    // Hold just long enough for the cleared word's ghost pop to register,
    // then cascade columns outward from the cleared word's centroid.
    const FALL_HOLD = 70;
    const COL_STAGGER = 26;
    const centroidCol =
      ghosts.length > 0
        ? ghosts.reduce((s, g) => s + g.col, 0) / ghosts.length
        : null;
    const movedColsArr = Array.from(new Set(falls.map(f => f.col))).sort((a, b) =>
      centroidCol === null
        ? a - b
        : Math.abs(a - centroidCol) - Math.abs(b - centroidCol) || a - b,
    );
    const colDelay = new Map<number, number>();
    movedColsArr.forEach((c, i) => colDelay.set(c, i * COL_STAGGER));

    const stride = cellSize + CELL_GAP;
    let remaining = falls.length;
    for (const f of falls) {
      const av = fallAnimMapRef.current.get(f.id);
      if (!av) { remaining -= 1; continue; }
      // Track the live offset (native events → JS) so an interrupting
      // clear can pick the tile up mid-air instead of snapping it.
      if (!listenerHandleRef.current.has(f.id)) {
        const cellId = f.id;
        const handle = av.addListener(({ x, y }) => {
          liveOffsetRef.current.set(cellId, { x, y });
        });
        listenerHandleRef.current.set(f.id, handle);
      }
      const dist = Math.hypot(f.dx, f.dy);
      const rowsFallen = Math.max(1, dist / stride);
      // Distance-scaled fall time (√d, like real gravity) with an
      // accelerating ease-in, then a small directional rebound whose
      // size scales with impact distance. Reads as: drop, thud, settle.
      const fallDur = Math.min(520, 150 + 130 * Math.sqrt(rowsFallen));
      const bounceMag = Math.min(9, dist * 0.055);
      const bx = f.dx === 0 ? 0 : Math.sign(f.dx) * bounceMag;
      const by = f.dy === 0 ? 0 : Math.sign(f.dy) * bounceMag;
      Animated.sequence([
        Animated.delay(FALL_HOLD + (colDelay.get(f.col) ?? 0)),
        Animated.timing(av, {
          toValue: { x: 0, y: 0 },
          duration: fallDur,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(av, {
          toValue: { x: bx, y: by },
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(av, {
          toValue: { x: 0, y: 0 },
          duration: 100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // Interrupted tiles belong to the successor run — it re-computed
        // their offsets from the live listener values and owns cleanup.
        if (!finished) return;
        const h = listenerHandleRef.current.get(f.id);
        if (h) {
          av.removeListener(h);
          listenerHandleRef.current.delete(f.id);
        }
        liveOffsetRef.current.delete(f.id);
        remaining -= 1;
        if (remaining === 0 && runId === fallRunIdRef.current) {
          onGravitySettledRef.current?.();
          // Prune anims for tiles no longer on the board.
          const active = prevBoundsRef.current;
          if (active) {
            for (const id of fallAnimMapRef.current.keys()) {
              if (!active.has(id)) fallAnimMapRef.current.delete(id);
            }
          }
        }
      });
    }
  });

  const gridRef = useRef<View>(null);
  const gridLayoutRef = useRef({ x: 0, y: 0 });
  const lastDragCellRef = useRef<string | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  // Cells selected during the CURRENT gesture (not the store's selection
  // length) — distinguishes a real drag-trace from tap-by-tap selection.
  const dragCellCountRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragGlowAnim = useRef(new Animated.Value(0)).current;

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
  const wildcardModeRef = useRef(wildcardMode);
  wildcardModeRef.current = wildcardMode;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

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

    // In wildcard placement mode, any grid position is tappable — even empty
    // cells — so the reducer can create a placeholder wildcard cell there.
    if (wildcardModeRef.current) {
      const colIdx = Math.floor((absX - padding) / stride);
      const rowIdx = Math.floor(absY / stride);
      if (colIdx >= 0 && colIdx < cellsByColumnRef.current.length && rowIdx >= 0 && rowIdx < rowsRef.current) {
        return { row: rowIdx, col: colIdx };
      }
      return null;
    }

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
        Animated.timing(dragGlowAnim, { toValue: 1, duration: 90, useNativeDriver: true }).start();
        lastDragCellRef.current = null;
        lastDragPosRef.current = { x: e.x, y: e.y };
        dragCellCountRef.current = 0;
        perfDragStart();
        onDragStartRef.current?.();
        const cell = hitTestCell(e.x, e.y);
        if (cell) {
          const key = `${cell.row},${cell.col}`;
          lastDragCellRef.current = key;
          dragCellCountRef.current = 1;
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
          dragCellCountRef.current += 1;
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
        Animated.timing(dragGlowAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        lastDragCellRef.current = null;
        lastDragPosRef.current = null;
        perfDragEnd();
        onDragEndRef.current?.(dragCellCountRef.current > 1);
      })
      .onFinalize(() => {
        isDraggingRef.current = false;
        Animated.timing(dragGlowAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        lastDragCellRef.current = null;
        lastDragPosRef.current = null;
        // Cancelled gestures (e.g. finger strayed off-grid) skip onEnd, so a
        // dead trace would stay lit forever without this. onEnd + onFinalize
        // both firing is fine — the release timer just gets replaced.
        onDragEndRef.current?.(dragCellCountRef.current > 1);
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
  const outerGlowOpacity = useMemo(() => dragGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  }), [dragGlowAnim]);

  const outerGlowStyle = useMemo(() => [
    styles.outerGlow,
    { width: outerWidth + 12, height: outerHeight + 12, borderRadius: 28, opacity: outerGlowOpacity },
  ], [outerWidth, outerHeight, outerGlowOpacity]);

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
      <Animated.View style={outerGlowStyle} />

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

          {/* Cleared-word ghost tiles — a brief celebratory dissolve at the
              positions the found word just vacated. Mounted BEFORE the tile
              grid so falling tiles paint over the fading ghosts. */}
          <ClearGhostLayer ref={ghostLayerRef} cellSize={cellSize} />

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
                    // The fall value is created lazily so the translate
                    // transform is attached from a tile's very first frame.
                    // The render-phase diff above already seeded moved
                    // tiles' values with their old-position offsets, so the
                    // first painted frame of the new tree can never show a
                    // tile at its destination.
                    let cellFallAnim = fallAnimMapRef.current.get(cell.id);
                    if (!cellFallAnim) {
                      cellFallAnim = new Animated.ValueXY({ x: 0, y: 0 });
                      fallAnimMapRef.current.set(cell.id, cellFallAnim);
                    }

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
                        isWildcard={wildcardSet.has(`${row},${col}`)}
                        isSpotlightDimmed={spotlightDimmedCells?.has(`${row},${col}`) || false}
                        isBonusTile={bonusCellId != null && cell.id === bonusCellId}
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
    shadowOpacity: IS_ANDROID ? 0 : 0.5,
    shadowRadius: IS_ANDROID ? 0 : 12,
    elevation: IS_ANDROID ? 0 : 8,
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
