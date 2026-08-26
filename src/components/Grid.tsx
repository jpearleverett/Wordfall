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
import {
  computeGridGeometry,
  computeGridMetrics,
  GRID_FRAME_ALLOWANCE,
  hitTestGridGeometry,
} from './game/gridGeometry';
import {
  type CascadeFall,
  type CascadeFrame,
  type CascadeGhost,
  planCascade,
} from './game/cascadePlan';
import {
  type FallRun,
  buildFallEasing,
  cascadeTouchdownAt,
  bandDelayMs,
  cascadeIsVertical,
  fallBandOf,
  fallDurationMs,
  fallRunDuration,
  FALL_HOLD_MS,
  FALL_START_LATENCY_MS,
  FALL_REBOUND_IN_MS,
  FALL_REBOUND_OUT_MS,
  nowMs,
  reboundMagnitude,
  reboundVector,
} from './game/fallMotion';
import { delayedTiming } from '../utils/motionTiming';
import {
  perfCascadeSettled,
  perfCascadeStart,
  perfDragStart,
  perfDragDispatch,
  perfDragEnd,
} from '../utils/perfInstrument';
import { useReduceMotion } from '../hooks/useReduceMotion';
import {
  clearFallResources,
  clearTimeoutHandles,
  releaseOwnedFall,
  startAnimationWithCleanup,
} from '../utils/animationLifecycle';

// Extracted constants to avoid creating new objects on every render
const NEON_FRAME_COLORS = ['rgba(255,45,149,0.35)', 'rgba(200,77,255,0.25)', 'rgba(0,229,255,0.20)'] as [string, string, ...string[]];

/** #rrggbb → rgba() string; passes anything else through at full alpha. */
function hexToRgba(color: string, alpha: number): string {
  const m = color.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
}
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
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
  validWord?: boolean;
  maxHeight?: number;
  /**
   * Fired once when every tile from a gravity fall has landed and settled.
   * GameScreen uses it for the landing haptic. Not fired for interrupted
   * runs (a second word found mid-fall) — the successor run fires instead.
   */
  onGravitySettled?: () => void;
  /**
   * Whether the ambient idle glint may run. The layer self-schedules an
   * infinite timeout chain, so callers must switch this off whenever the
   * board is not actually visible gameplay (result overlay up, screen
   * blurred under a pushed route) — freezeOnBlur does not stop timers.
   */
  glintActive?: boolean;
  /**
   * Chapter accent color (#rrggbb). Tints the neon frame + outer glow so
   * the board chrome harmonizes with the chapter's tile ramp instead of
   * always being pink — the blind design review flagged green nature tiles
   * clashing inside the fixed magenta frame.
   */
  frameAccent?: string;
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

type GhostSpec = CascadeGhost;

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
// Cells the BOARD removed rather than the player: shrinkingBoard's outer ring.
// Same dissolve, cold palette — it reads as the board taking something away.
const GHOST_BODY_COLORS_BOARD = ['#8ea4c8', '#5b6f93', '#2c3752'] as [string, string, string];
// The ghost pop is the beat the fall waits on, so its length is part of the
// gravity budget, not a free decoration. 40/430 came out of the same
// screenshot-sampling review that inflated the fall itself: at 430ms plus a
// 40ms per-tile stagger a six-letter word was still dissolving 630ms after the
// clear, well past the point the tiles had landed on top of it. Tightened to
// finish with the cascade instead of trailing it.
const GHOST_STAGGER_MS = 26;
const GHOST_DURATION_MS = 300;
/**
 * Ghosts past this share the last one's delay. A word clear is 3-7 tiles, but
 * shrinkingBoard removes an entire outer ring in the same commit — 26+ cells,
 * which at a flat per-tile stagger meant the last one sat opaque for most of a
 * second and the burst outlived several subsequent moves.
 */
const GHOST_MAX_STAGGERED = 6;

const GhostTile = React.memo(function GhostTile({ ghost, cellSize }: { ghost: GhostEntry; cellSize: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // The per-tile stagger is baked into the easing rather than scheduled with
    // Animated.delay, which is a JS-thread setTimeout — see delayedTiming. The
    // ghosts fire on the same frame as the cascade, so their timers would be
    // queued behind exactly the work that frame is full of.
    const animation = delayedTiming(anim, {
      toValue: 1,
      delay: Math.min(ghost.order, GHOST_MAX_STAGGERED) * GHOST_STAGGER_MS,
      duration: GHOST_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
    return startAnimationWithCleanup(animation);
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
        colors={ghost.fromWord ? GHOST_BODY_COLORS : GHOST_BODY_COLORS_BOARD}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={StyleSheet.absoluteFillObject}
      />
      <Text
        style={{
          color: '#ffffff',
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: cellSize * 0.46,
          textShadowColor: ghost.fromWord ? 'rgba(0,40,15,1)' : 'rgba(6,10,22,1)',
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
        const ttl =
          GHOST_DURATION_MS +
          Math.min(specs.length, GHOST_MAX_STAGGERED + 1) * GHOST_STAGGER_MS +
          60;
        const t = setTimeout(() => {
          timersRef.current.delete(t);
          const keys = new Set(entries.map(e => e.key));
          setGhosts(prev => prev.filter(g => !keys.has(g.key)));
        }, ttl);
        timersRef.current.add(t);
      },
    }), []);

    useEffect(() => () => {
      clearTimeoutHandles(timersRef.current);
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

// ── Idle tile glint ─────────────────────────────────────────────────────────
// Ambient sparkle: every 1.5–2.4s (randomized) a random occupied cell gets
// a 650ms four-point glint that scales 0 → 1 → 0 while fading, and a second
// glint on another random cell follows ~500ms later — so any 3s idle window
// at 250ms frame sampling reliably shows sparkle activity (round-3 blind
// review: "nine near-identical static frames... lifeless while idle"). Pure
// decoration — pointerEvents none, never mounted under reduce motion (the
// parent gates it), native-driven transform/opacity only. Cell coordinates
// come from the same cellBounds array the hit-test and ghost layer use, with
// the same + CELL_GAP / 2 inset GhostTile applies.

interface GlintSpec {
  key: number;
  x: number;
  y: number;
}

const GLINT_DURATION_MS = 650;
const GLINT_MIN_GAP_MS = 1500;
const GLINT_GAP_JITTER_MS = 900;
const GLINT_STAGGER_MS = 500;

const GlintStar = React.memo(function GlintStar({ glint, cellSize }: { glint: GlintSpec; cellSize: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: GLINT_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    return startAnimationWithCleanup(animation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glint.key]);

  const starSize = Math.max(14, cellSize * 0.55);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: glint.x + CELL_GAP / 2 + (cellSize - starSize) / 2,
        top: glint.y + CELL_GAP / 2 + (cellSize - starSize) / 2,
        width: starSize,
        height: starSize,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: anim.interpolate({ inputRange: [0, 0.35, 0.65, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }) }],
      }}
    >
      {/* Vertical + horizontal rays plus a rotated square core = 4-point star. */}
      <View style={{ position: 'absolute', width: 2, height: starSize, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.95)' }} />
      <View style={{ position: 'absolute', width: starSize, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.95)' }} />
      <View style={{
        position: 'absolute',
        width: starSize * 0.28,
        height: starSize * 0.28,
        backgroundColor: '#ffffff',
        transform: [{ rotate: '45deg' }],
      }} />
    </Animated.View>
  );
});

const IdleGlintLayer = React.memo(function IdleGlintLayer({
  cellBounds,
  cellSize,
}: {
  cellBounds: { x: number; y: number }[];
  cellSize: number;
}) {
  const [glints, setGlints] = useState<GlintSpec[]>([]);
  // Bounds live in a ref so the rescheduling timer chain never restarts on
  // grid changes — it just reads the freshest occupied-cell list at fire time.
  const boundsRef = useRef(cellBounds);
  boundsRef.current = cellBounds;
  const counterRef = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let cancelled = false;
    const spawn = () => {
      const bounds = boundsRef.current;
      if (bounds.length === 0) return;
      const b = bounds[Math.floor(Math.random() * bounds.length)];
      counterRef.current += 1;
      const spec: GlintSpec = { key: counterRef.current, x: b.x, y: b.y };
      // Keep at most 2 concurrent (primary + staggered) — the gap floor
      // (1500ms) exceeds the glint duration, so only the staggered pair
      // ever overlaps.
      setGlints(prev => [...prev.slice(-1), spec]);
      const cleanup = setTimeout(() => {
        timers.delete(cleanup);
        setGlints(prev => prev.filter(g => g.key !== spec.key));
      }, GLINT_DURATION_MS + 60);
      timers.add(cleanup);
    };
    const schedule = () => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (cancelled) return;
        spawn();
        // Second glint on another random cell, ~500ms behind the first.
        const stagger = setTimeout(() => {
          timers.delete(stagger);
          if (!cancelled) spawn();
        }, GLINT_STAGGER_MS);
        timers.add(stagger);
        schedule();
      }, GLINT_MIN_GAP_MS + Math.random() * GLINT_GAP_JITTER_MS);
      timers.add(timer);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeoutHandles(timers);
    };
  }, []);

  if (glints.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {glints.map(g => (
        <GlintStar key={g.key} glint={g} cellSize={cellSize} />
      ))}
    </View>
  );
});

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
  onGravitySettled,
  glintActive = true,
  frameAccent,
  wildcardMode = false,
  bonusCellId = null,
}: GridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const metrics = useMemo(
    () => computeGridMetrics(
      rows,
      cols,
      MAX_GRID_WIDTH,
      maxHeight && maxHeight > 0 ? maxHeight : Number.MAX_SAFE_INTEGER,
      CELL_GAP,
      GRID_FRAME_ALLOWANCE,
    ),
    [cols, rows, maxHeight],
  );
  const { cellSize, gridWidth, gridHeight } = metrics;
  const geometry = useMemo(
    () => computeGridGeometry(grid, cellSize, CELL_GAP),
    [grid, cellSize],
  );

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

  // Flat, absolutely-positioned tile list in reading order.
  //
  // Tiles used to be flex children of a per-column View. Two problems with
  // that: (1) a tile that changes COLUMN — every clear in gravityFlip, where
  // gravity runs left/right — is a different parent's child, so React unmounts
  // its whole subtree (~10 native views incl. two LinearGradients) and mounts a
  // fresh one at the destination, which is exactly the "teleport" the fall is
  // supposed to hide; (2) every clear churned the `empty-row-col` placeholder
  // keys and re-ran Yoga over the entire grid. Positioning from the canonical
  // geometry keyed by cell id makes a tile's identity independent of where it
  // sits, so gravity in any direction is a pure transform on a stable view, and
  // holes cost nothing because they are simply not rendered.
  const tiles = useMemo(
    () =>
      geometry.bounds.map(bound => ({
        cell: grid[bound.row]?.[bound.col] ?? null,
        bound,
      })),
    [geometry, grid],
  );

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

  // Canonical map cell ID → rendered pixel bound for the current grid.
  const boundsById = geometry.byCellId;

  // Cell id -> position in the last non-empty trace. SUBMIT_WORD clears the
  // selection in the same update that clears the tiles, so by the time the
  // diff runs, this is the only record of the stroke that produced it.
  const lastSelectionOrderRef = useRef(new Map<string, number>());
  if (selectedCells.length > 0) {
    const order = new Map<string, number>();
    selectedCells.forEach((c, i) => {
      const id = grid[c.row]?.[c.col]?.id;
      if (id) order.set(id, i);
    });
    lastSelectionOrderRef.current = order;
  }

  const fallAnimMapRef = useRef(new Map<string, Animated.ValueXY>());
  // In-flight fall descriptors, keyed by cell id. An interrupting clear reads
  // a tile's CURRENT visual offset from this (see sampleFallOffset) instead of
  // teleporting it to its settled slot.
  //
  // This used to be fed by av.addListener() on the native-driven value. That
  // is a trap: AnimatedValue.addListener on a native value calls
  // startListeningToAnimatedNodeValue, so the UI thread emits an
  // onAnimatedValueUpdate for that node EVERY FRAME — and every listening
  // value subscribes to the same global 'onAnimatedValueUpdate' emitter and
  // filters by tag. With N falling tiles (ValueXY = 2 nodes each) that is 2N
  // events per frame each dispatched to 2N subscribers: 4N^2 JS callbacks per
  // frame, ~15k/s for an 8-tile fall and ~54k/s for a 15-tile one, each
  // allocating via __getValue(). It also LAGGED the true position by several
  // frames, so picking a tile up mid-air visibly jumped it.
  //
  // The fall is a pure function of (start time, delay, duration, easing,
  // start offset) and the native driver runs exactly that function, so we
  // evaluate it analytically instead. Zero per-frame JS, and the sample is
  // frame-accurate rather than frames-stale.
  const fallRunsRef = useRef(new Map<string, FallRun>());
  // Where the render phase last froze a tile, keyed by cell id.
  //
  // Seeding a value stops the animation running on it, so the moment render
  // computes a mid-air pickup the tile is parked at that offset — but the run
  // descriptor still describes a curve that is no longer playing. If React
  // re-renders before committing (a concurrent interruption, an error-boundary
  // retry), re-sampling that curve at the later clock would seed a position
  // the tile never reached. Remembering the freeze makes the whole render
  // phase replayable: repeat it as often as React likes and it lands on the
  // same offset. The layout effect drops the entry when the tile starts moving
  // again.
  const frozenOffsetsRef = useRef(new Map<string, { x: number; y: number }>());
  /** Fall-phase progress at the same freeze, so the replay is complete. */
  const frozenPhasesRef = useRef(new Map<string, number>());
  const activeFallsRef = useRef(new Map<string, Animated.CompositeAnimation>());
  const prevFrameRef = useRef<CascadeFrame | null>(null);
  const pendingFallsRef = useRef<CascadeFall[]>([]);
  const pendingGhostsRef = useRef<CascadeGhost[]>([]);
  // Committed alongside the pending falls: advancing the baseline during
  // render would let a render React DISCARDS (a concurrent interruption, an
  // error-boundary retry) swallow a fall forever — the next real render would
  // diff the new grid against itself, decide 'none', and the tiles would just
  // be at their destination. planCascade is replayable, so the diff is
  // recomputed on every render and only becomes the new baseline once the tree
  // actually commits.
  const pendingBaselineRef = useRef<CascadeFrame | null>(null);
  /** Dev-only: how long the diff for the pending cascade took to compute. */
  const pendingPlanMsRef = useRef(0);
  const ghostLayerRef = useRef<GhostLayerHandle | null>(null);
  // Fires onGravitySettled at the cascade's TOUCHDOWN rather than at the end
  // of the run. The haptic describes the board hitting bottom, and the rebound
  // that follows touchdown is the consequence, not the event — reporting it
  // 120ms late made the buzz feel disconnected from what was on screen.
  const touchdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGravitySettledRef = useRef(onGravitySettled);
  onGravitySettledRef.current = onGravitySettled;

  const clearFrozenOffsets = () => {
    frozenOffsetsRef.current.clear();
    frozenPhasesRef.current.clear();
  };

  const cancelTouchdown = () => {
    if (touchdownTimerRef.current !== null) {
      clearTimeout(touchdownTimerRef.current);
      touchdownTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    cancelTouchdown();
    clearFrozenOffsets();
    clearFallResources(
      activeFallsRef.current,
      fallRunsRef.current,
      fallAnimMapRef.current,
    );
    pendingFallsRef.current = [];
    pendingGhostsRef.current = [];
    pendingBaselineRef.current = null;
  }, []);

  const frame: CascadeFrame = {
    grid,
    bounds: boundsById,
    cellSize,
    rows,
    cols,
    stride: geometry.stride,
    padding: geometry.padding,
  };

  // Render-phase diff. All of the decision-making lives in planCascade, which
  // is pure and replayable; the only thing done here is the one side effect
  // that has to happen during render.
  const planStartedAt = nowMs();
  const { decision, plan } = planCascade(
    prevFrameRef.current,
    frame,
    {
      runs: fallRunsRef.current,
      frozenOffsets: frozenOffsetsRef.current,
      frozenPhases: frozenPhasesRef.current,
      traceOrder: lastSelectionOrderRef.current,
    },
    planStartedAt,
    reduceMotion,
  );
  const planMs = nowMs() - planStartedAt;

  if (decision !== 'none') {
    if (plan.kind === 'snap') {
      // Nothing lands, so nothing reports landing.
      cancelTouchdown();
      clearFrozenOffsets();
      clearFallResources(
        activeFallsRef.current,
        fallRunsRef.current,
        fallAnimMapRef.current,
      );
      pendingFallsRef.current = [];
      pendingGhostsRef.current = [];
    } else if (plan.kind === 'animate') {
      for (const reposition of plan.repositions) {
        fallAnimMapRef.current
          .get(reposition.id)
          ?.setValue({ x: reposition.x, y: reposition.y });
      }
      for (const fall of plan.falls) {
        // Seed the value to where the tile ALREADY IS, then animate it to the
        // new slot. Because a tile's position lives entirely in this value —
        // its layout box never moves (see LetterCell) — the seed is a visual
        // no-op no matter when it takes effect, and the FLIP is airtight by
        // construction rather than by timing.
        //
        // That matters more than it looks. setValue on a value that is not yet
        // native flushes synchronously through AnimatedProps.update() ->
        // instance.setNativeProps() (createAnimatedPropsHook.js, guarded by
        // shouldUseSetNativePropsInFabric, which defaults to true), writing the
        // new transform into the shadow tree from inside this render. When the
        // value carried an OFFSET and layout carried the position, that write
        // landed on a view still at its old slot and displaced the tile by a
        // whole fall distance, the wrong way, until React committed — a real
        // one-frame flash on each tile's first fall, i.e. on the opening
        // clears of every board. Holding the absolute position makes the same
        // write a no-op.
        //
        // setValue also stops whatever animation is running on the value, so a
        // superseded fall does not need stopping separately; its completion
        // callback fires with finished:false and releaseOwnedFall cleans up.
        const existing = fallAnimMapRef.current.get(fall.id);
        if (existing) {
          existing.setValue(fall.current);
          // Record where the tile is now parked, so replaying this render
          // reproduces the same seed rather than re-sampling a dead curve.
          // The freeze is stored relative to the tile's PREVIOUS slot, the
          // same space planCascade reads live offsets in, so a replayed render
          // reproduces the identical seed instead of re-sampling a curve that
          // is no longer playing.
          if (fall.liveOffset) {
            frozenOffsetsRef.current.set(fall.id, fall.liveOffset);
            frozenPhasesRef.current.set(fall.id, fall.entryProgress);
          }
        } else {
          fallAnimMapRef.current.set(
            fall.id,
            new Animated.ValueXY(fall.current),
          );
        }
      }
      pendingFallsRef.current = plan.falls;
      pendingGhostsRef.current = plan.ghosts;
      pendingPlanMsRef.current = planMs;
    }
    pendingBaselineRef.current = frame;
  }

  // Start the fall + ghost animations for the diff computed this render, and
  // only NOW promote that render's grid to the baseline the next diff is taken
  // against. Doing the promotion during render meant a render React discarded
  // (concurrent interruption, error-boundary retry) advanced the baseline
  // without ever committing, so the next real render diffed the new grid
  // against itself, saw no change, and the tiles simply appeared at their
  // destination.
  //
  // useLayoutEffect so it fires in the same frame as the commit; the offsets
  // were already applied during render, so even if a frame slips in first,
  // tiles paint at their OLD positions (never the destination).
  useLayoutEffect(() => {
    const baseline = pendingBaselineRef.current;
    if (baseline) {
      pendingBaselineRef.current = null;
      prevFrameRef.current = baseline;
    }
    const ghosts = pendingGhostsRef.current;
    if (ghosts.length > 0) {
      pendingGhostsRef.current = [];
      // A cleared tile hands its motion over to its ghost, so retire whatever
      // it still had in the air. Done on commit rather than during render:
      // stopping an animation for a tree React then throws away would leave a
      // tile frozen mid-fall.
      for (const ghost of ghosts) {
        activeFallsRef.current.get(ghost.id)?.stop();
        activeFallsRef.current.delete(ghost.id);
        fallRunsRef.current.delete(ghost.id);
        frozenOffsetsRef.current.delete(ghost.id);
        frozenPhasesRef.current.delete(ghost.id);
        // A tile cleared mid-fall leaves a non-zero offset on its shared
        // value. Undo restores that cell id, and the JSX would hand it back
        // the same value — rendering the restored tile permanently displaced.
        fallAnimMapRef.current.delete(ghost.id);
      }
      ghostLayerRef.current?.spawn(ghosts);
    }
    const falls = pendingFallsRef.current;
    if (falls.length === 0) return;
    pendingFallsRef.current = [];
    const plannedBudget = pendingPlanMsRef.current;
    pendingPlanMsRef.current = 0;

    // Hold just long enough for the cleared word's ghost pop to register, then
    // cascade outward from where the word was, one band at a time. A band is a
    // line of tiles that travels together — a column under vertical gravity, a
    // row under horizontal (gravityFlip) gravity — so tiles that have to stay
    // shoulder to shoulder start together. The stagger is capped
    // (FALL_MAX_STAGGERED_BANDS) so a word spanning the whole board does not
    // leave its outermost band sitting still for a third of a second before it
    // moves; that lead-in was most of what read as lag.
    const verticalCascade = cascadeIsVertical(falls);
    const bandOfGhost = (g: GhostSpec) => (verticalCascade ? g.col : g.row);
    const centroid =
      ghosts.length > 0
        ? ghosts.reduce((sum, g) => sum + bandOfGhost(g), 0) / ghosts.length
        : null;
    const bands = Array.from(
      new Set(falls.map(f => fallBandOf(f, verticalCascade))),
    ).sort((a, b) =>
      centroid === null
        ? a - b
        : Math.abs(a - centroid) - Math.abs(b - centroid) || a - b,
    );
    const bandDelay = new Map<number, number>();
    bands.forEach((band, i) => bandDelay.set(band, bandDelayMs(i)));

    const stride = geometry.stride;
    const startedAt = nowMs() + FALL_START_LATENCY_MS;
    for (const f of falls) {
      const av = fallAnimMapRef.current.get(f.id);
      if (!av) continue;
      const dist = Math.hypot(f.dx, f.dy);
      const slotsFallen = stride > 0 ? dist / stride : 1;
      // Distance-scaled fall time (√d, like real gravity) with an accelerating
      // ease-in, then a small rebound BACK along the travel direction. Reads
      // as: drop, thud, settle. The rebound deliberately does not overshoot
      // past the slot — gridContainer clips its children, so a bottom-row tile
      // overshooting downward would shear against the frame.
      const from = { x: f.dx, y: f.dy };
      const run: FallRun = {
        from,
        startedAt,
        // A tile only skips the lead-in if it is genuinely in flight.
        // entryProgress is zero during a hold and after touchdown, so a resize
        // landing mid-hold no longer cancels the whole cascade's stagger.
        delayMs:
          f.entryProgress > 0
            ? 0
            : FALL_HOLD_MS + (bandDelay.get(fallBandOf(f, verticalCascade)) ?? 0),
        fallMs: fallDurationMs(slotsFallen),
        entryProgress: f.entryProgress,
        rebound: reboundVector(from, reboundMagnitude(dist)),
        reboundOutMs: FALL_REBOUND_OUT_MS,
        reboundInMs: FALL_REBOUND_IN_MS,
      };
      // ONE native animation for the whole run. The hold, the band stagger,
      // the fall, the rebound and the settle are all baked into the easing
      // curve, so nothing about this tile's motion touches the JS thread once
      // it has started — see buildFallEasing for why that matters.
      const sequence = Animated.timing(av, {
        toValue: f.target,
        duration: fallRunDuration(run),
        easing: buildFallEasing(run),
        useNativeDriver: true,
      });
      // The run descriptor IS the curve, so an interrupting clear samples this
      // tile's live offset exactly, with the UI thread never streaming it back.
      fallRunsRef.current.set(f.id, run);
      frozenOffsetsRef.current.delete(f.id);
      frozenPhasesRef.current.delete(f.id);
      activeFallsRef.current.set(f.id, sequence);
      sequence.start(({ finished }) => {
        // Interrupted tiles belong to the successor run — it re-sampled their
        // offsets and owns every shared cleanup decision, including a late
        // `finished: true` predecessor.
        const owned = releaseOwnedFall(
          activeFallsRef.current,
          fallRunsRef.current,
          f.id,
          sequence,
          finished,
        );
        if (!owned) return;
        // Nothing left in the air: prune anims for tiles no longer on the
        // board. Checked against the whole map rather than one run's tally,
        // because clearing a second word mid-cascade leaves the first run's
        // tiles falling alongside the second's.
        if (activeFallsRef.current.size > 0) return;
        const active = prevFrameRef.current?.bounds;
        if (active) {
          for (const id of fallAnimMapRef.current.keys()) {
            if (!active.has(id)) fallAnimMapRef.current.delete(id);
          }
        }
      });
    }

    // One timer per cascade, re-armed to the latest touchdown across
    // everything currently in the air (an interrupting clear extends it).
    if (touchdownTimerRef.current !== null) {
      clearTimeout(touchdownTimerRef.current);
    }
    const touchdownIn = Math.max(
      0,
      cascadeTouchdownAt(fallRunsRef.current.values()) - nowMs(),
    );
    perfCascadeStart(plannedBudget, falls.length, ghosts.length, touchdownIn);
    touchdownTimerRef.current = setTimeout(() => {
      touchdownTimerRef.current = null;
      perfCascadeSettled();
      onGravitySettledRef.current?.();
    }, touchdownIn);
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

  // Hit-testing consumes the same canonical engine-slot geometry used by
  // rendering, trails, ghosts, glints, and fall diffs — but it must describe
  // the tree that is actually ON SCREEN, so it is advanced on commit rather
  // than during render. A render React discards would otherwise leave the
  // gesture handler resolving taps against a board that was never shown.
  const geometryRef = useRef(geometry);
  const cellSizeRef = useRef(cellSize);
  useLayoutEffect(() => {
    geometryRef.current = geometry;
    cellSizeRef.current = cellSize;
  }, [geometry, cellSize]);
  const wildcardModeRef = useRef(wildcardMode);
  wildcardModeRef.current = wildcardMode;

  const hitTestCell = useCallback((absX: number, absY: number): CellPosition | null => {
    return hitTestGridGeometry(
      geometryRef.current,
      absX,
      absY,
      wildcardModeRef.current,
    );
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
        // Cancelled gestures (e.g. finger strayed off-grid) skip onEnd, so
        // this is the only lift signal they produce. Firing after onEnd too
        // is fine: the callback is optional and idempotent for consumers.
        // PlayField deliberately passes none — a lifted trace stays lit
        // until the player retraces over it (see its "lifted trace STAYS
        // lit" note).
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
    frameAccent
      ? { backgroundColor: hexToRgba(frameAccent, 0.08), shadowColor: frameAccent }
      : null,
  ], [outerWidth, outerHeight, outerGlowOpacity, frameAccent]);

  const frameColors = useMemo<[string, string, ...string[]]>(
    () =>
      frameAccent
        ? [hexToRgba(frameAccent, 0.38), hexToRgba(frameAccent, 0.22), 'rgba(0,229,255,0.16)']
        : NEON_FRAME_COLORS,
    [frameAccent],
  );

  const neonFrameWrapStyle = useMemo(() => [
    styles.neonFrameWrap, { width: outerWidth + 16, height: outerHeight + 16, borderRadius: 28 }
  ], [outerWidth, outerHeight]);

  const neonFrameStyle = useMemo(() => [
    styles.neonFrame, { width: outerWidth, height: outerHeight, borderRadius: 24 }
  ], [outerWidth, outerHeight]);

  const frameInnerStyle = useMemo(() => [
    styles.frameInner, { width: gridWidth, height: gridHeight, borderRadius: 22 }
  ], [gridWidth, gridHeight]);

  const gridContainerStyle = useMemo(() => [
    styles.gridContainer, { width: gridWidth, height: gridHeight, borderRadius: 21 }
  ], [gridWidth, gridHeight]);

  return (
    <View style={styles.shadowWrap}>
      <Animated.View style={outerGlowStyle} />

      <View style={neonFrameWrapStyle}>
        <Image
          source={LOCAL_IMAGES.neonFrame}
          style={[
            styles.neonFrameImage,
            // The baked frame art is magenta; when a chapter accent tints
            // the chrome, fade it back so the accent gradient dominates.
            frameAccent ? { opacity: 0.18 } : null,
          ]}
          resizeMode="stretch"
        />
      </View>

      <LinearGradient
        colors={frameColors}
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
              cellBounds={geometry.bounds}
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
              {tiles.map(({ cell, bound }) => {
                if (!cell) return null;
                const { row, col } = bound;
                const key = `${row},${col}`;
                const selIndex = selectedSet.get(key) ?? -1;
                const isSelected = selIndex >= 0;
                const isHinted = hintedSet.has(key);
                // A tile's position IS this value — its layout box sits at
                // the origin and never moves. Created lazily at the tile's
                // slot so its very first painted frame is already correct;
                // the render-phase diff above has already re-seeded any tile
                // that is mid-move.
                let cellFallAnim = fallAnimMapRef.current.get(cell.id);
                if (!cellFallAnim) {
                  cellFallAnim = new Animated.ValueXY({ x: bound.x, y: bound.y });
                  fallAnimMapRef.current.set(cell.id, cellFallAnim);
                }

                return (
                  <LetterCell
                    key={cell.id}
                    letter={cell.letter}
                    cellId={cell.id}
                    size={cellSize}
                    slotSize={geometry.stride}
                    reduceMotion={reduceMotion}
                    isSelected={isSelected}
                    isHinted={isHinted}
                    selectionIndex={selIndex}
                    isValidWord={validWord && isSelected}
                    isWildcard={wildcardSet.has(key)}
                    isSpotlightDimmed={spotlightDimmedCells?.has(key) || false}
                    isBonusTile={bonusCellId != null && cell.id === bonusCellId}
                    fallAnim={cellFallAnim}
                    row={row}
                    col={col}
                    currentWord={isSelected && validWord ? currentWord : undefined}
                  />
                );
              })}
            </View>
          </GestureDetector>

          {/* Ambient idle glint — a periodic one-shot sparkle on a random
              occupied tile so an untouched board still shimmers. Unmounted
              entirely under reduce motion (no timer, no loop), and whenever
              the board is not visible gameplay (glintActive false: result
              overlay covering the grid, or the screen blurred in the stack)
              so its self-rescheduling timer chain stops. */}
          {!reduceMotion && glintActive && (
            <IdleGlintLayer cellBounds={geometry.bounds} cellSize={cellSize} />
          )}

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
    // Tiles are absolutely positioned from the canonical geometry, whose x
    // already carries the half-gap inset (geometry.padding) and whose y starts
    // at 0 — so tiles, ghosts, the trail overlay, glints, hit-testing, and
    // particles all share one local coordinate space with no style padding to
    // reconcile against.
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
