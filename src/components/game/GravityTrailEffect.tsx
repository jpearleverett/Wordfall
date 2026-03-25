import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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

interface Ghost {
  id: string;
  letter: string;
  x: number;
  y: number;
  startOpacity: number;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

const GHOST_OFFSETS = [
  { rowOffset: 1, startOpacity: 0.2 },
  { rowOffset: 2, startOpacity: 0.1 },
  { rowOffset: 3, startOpacity: 0.05 },
];

const TRAIL_DURATION = 500;

const GravityTrailEffect: React.FC<GravityTrailEffectProps> = ({
  movedCells,
  cellSize,
  cellGap,
  gridPadding,
  triggerKey,
}) => {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTriggerKeyRef = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey === prevTriggerKeyRef.current) return;
    prevTriggerKeyRef.current = triggerKey;

    if (movedCells.length === 0) return;

    const newGhosts: Ghost[] = [];

    for (const cell of movedCells) {
      for (const { rowOffset, startOpacity } of GHOST_OFFSETS) {
        const ghostRow = cell.toRow - rowOffset;
        if (ghostRow < 0) continue;

        const x =
          gridPadding + cell.col * (cellSize + cellGap) + cellSize / 2;
        const y =
          gridPadding + ghostRow * (cellSize + cellGap) + cellSize / 2;

        const opacity = new Animated.Value(startOpacity);
        const translateY = new Animated.Value(0);

        newGhosts.push({
          id: `${triggerKey}-${cell.col}-${cell.toRow}-${rowOffset}`,
          letter: cell.letter,
          x,
          y,
          startOpacity,
          opacity,
          translateY,
        });
      }
    }

    setGhosts(newGhosts);

    // Animate all ghosts
    const animations: Animated.CompositeAnimation[] = [];
    newGhosts.forEach((ghost) => {
      animations.push(
        Animated.timing(ghost.opacity, {
          toValue: 0,
          duration: TRAIL_DURATION,
          useNativeDriver: true,
        }),
      );
      animations.push(
        Animated.timing(ghost.translateY, {
          toValue: cellSize * 0.3,
          duration: TRAIL_DURATION,
          useNativeDriver: true,
        }),
      );
    });

    Animated.parallel(animations).start();

    // Clean up after animation completes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setGhosts([]);
      timeoutRef.current = null;
    }, TRAIL_DURATION);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [triggerKey, movedCells, cellSize, cellGap, gridPadding]);

  if (ghosts.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ghosts.map((ghost) => (
        <Animated.View
          key={ghost.id}
          style={[
            styles.ghost,
            {
              width: cellSize,
              height: cellSize,
              left: ghost.x - cellSize / 2,
              top: ghost.y - cellSize / 2,
              borderRadius: cellSize * 0.15,
              opacity: ghost.opacity,
              transform: [{ translateY: ghost.translateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.ghostLetter,
              {
                fontSize: cellSize * 0.45,
              },
            ]}
          >
            {ghost.letter}
          </Text>
        </Animated.View>
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
