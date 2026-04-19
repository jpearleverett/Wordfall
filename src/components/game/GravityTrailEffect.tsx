import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../../constants';

interface GravityTrailEffectProps {
  /** Cells that moved during gravity, with their letter and new position */
  movedCells: Array<{
    letter: string;
    col: number;
    fromRow: number;
    toRow: number;
  }>;
  /** Size of each cell in pixels */
  cellSize: number;
  /** Gap between cells */
  cellGap: number;
  /** Grid padding */
  gridPadding: number;
  /** Trigger key — increment to spawn new trails (e.g., a counter or timestamp) */
  triggerKey: number;
}

const GHOST_OFFSETS = [
  { rowOffset: 1, startOpacity: 0.2 },
  { rowOffset: 2, startOpacity: 0.1 },
  { rowOffset: 3, startOpacity: 0.05 },
];

// Fixed-size ghost pool. Large enough for worst-case chain clears
// (8 moved cells × 3 GHOST_OFFSETS = 24) without per-clear allocations.
// Previous implementation allocated new Animated.Value instances per ghost
// on every word found, which created JS→native bridge traffic at the exact
// moment the gravity animation was trying to run smoothly.
const MAX_GHOSTS = 24;

const TRAIL_DURATION = 500;

interface SlotData {
  active: boolean;
  letter: string;
  x: number;
  y: number;
  startOpacity: number;
  // Bumped per activation so GhostSlot effects know when to restart. Using a
  // counter rather than triggerKey keeps each slot independent — a later
  // trigger won't retrigger slots that weren't reassigned.
  runId: number;
}

const EMPTY_SLOT: SlotData = {
  active: false,
  letter: '',
  x: 0,
  y: 0,
  startOpacity: 0,
  runId: 0,
};

function makeEmptySlots(): SlotData[] {
  return Array.from({ length: MAX_GHOSTS }, () => EMPTY_SLOT);
}

/**
 * Single ghost slot. Owns its own Reanimated shared values so animation
 * updates stay on the UI thread and do not re-render the parent. The slot
 * is persistent (always mounted) — only its `active` flag toggles visibility
 * so we don't pay remount cost every word clear.
 */
interface GhostSlotProps {
  slot: SlotData;
  cellSize: number;
}

function GhostSlotImpl({ slot, cellSize }: GhostSlotProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!slot.active) {
      opacity.value = 0;
      translateY.value = 0;
      return;
    }
    opacity.value = slot.startOpacity;
    translateY.value = 0;
    // Worklet-driven fades + drifts. withTiming runs entirely on the UI
    // thread so the JS thread can service taps / reducer dispatches during
    // the trail animation.
    opacity.value = withTiming(0, { duration: TRAIL_DURATION });
    translateY.value = withTiming(cellSize * 0.3, { duration: TRAIL_DURATION });
  }, [slot.active, slot.runId, slot.startOpacity, cellSize, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!slot.active) return null;

  return (
    <Reanimated.View
      style={[
        styles.ghost,
        {
          width: cellSize,
          height: cellSize,
          left: slot.x - cellSize / 2,
          top: slot.y - cellSize / 2,
          borderRadius: cellSize * 0.15,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.ghostLetter, { fontSize: cellSize * 0.45 }]}>
        {slot.letter}
      </Text>
    </Reanimated.View>
  );
}

const GhostSlot = React.memo(GhostSlotImpl);

const GravityTrailEffect: React.FC<GravityTrailEffectProps> = ({
  movedCells,
  cellSize,
  cellGap,
  gridPadding,
  triggerKey,
}) => {
  const [slots, setSlots] = useState<SlotData[]>(makeEmptySlots);
  const prevTriggerKeyRef = useRef(triggerKey);
  const runIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (triggerKey === prevTriggerKeyRef.current) return;
    prevTriggerKeyRef.current = triggerKey;
    if (movedCells.length === 0) return;

    runIdRef.current += 1;
    const runId = runIdRef.current;

    const next: SlotData[] = makeEmptySlots();
    let idx = 0;
    outer: for (const cell of movedCells) {
      for (const { rowOffset, startOpacity } of GHOST_OFFSETS) {
        if (idx >= MAX_GHOSTS) break outer;
        const ghostRow = cell.toRow - rowOffset;
        if (ghostRow < 0) continue;
        const x =
          gridPadding + cell.col * (cellSize + cellGap) + cellSize / 2;
        const y =
          gridPadding + ghostRow * (cellSize + cellGap) + cellSize / 2;
        next[idx] = {
          active: true,
          letter: cell.letter,
          x,
          y,
          startOpacity,
          runId,
        };
        idx++;
      }
    }

    setSlots(next);

    // Clear slots after the trail finishes so stale letters aren't held in
    // state. Shared-value cleanup happens automatically when each slot's
    // `active` flag flips back to false.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSlots(makeEmptySlots());
      timeoutRef.current = null;
    }, TRAIL_DURATION);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [triggerKey, movedCells, cellSize, cellGap, gridPadding]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {slots.map((slot, i) => (
        <GhostSlot key={i} slot={slot} cellSize={cellSize} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLetter: {
    color: COLORS.accent,
    opacity: 0.5,
    fontFamily: FONTS.display,
    textAlign: 'center',
  },
});

export default React.memo(GravityTrailEffect);
