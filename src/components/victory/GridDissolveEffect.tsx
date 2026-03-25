import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, ANIM } from '../../constants';

interface GridDissolveEffectProps {
  /** Grid dimensions */
  cols: number;
  rows: number;
  /** Size of each cell */
  cellSize: number;
  /** Whether the dissolve animation should play */
  active: boolean;
  /** Color theme for particles */
  particleColor?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  translateY: number;
  rotation: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  translate: Animated.Value;
  rotate: Animated.Value;
  delay: number;
}

const PARTICLE_SIZE = 8;
const MAX_PARTICLES = 30;
const ANIMATION_DURATION = 800;

const GridDissolveEffect: React.FC<GridDissolveEffectProps> = ({
  cols,
  rows,
  cellSize,
  active,
  particleColor = COLORS.accent,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animatingRef = useRef(false);

  const buildParticles = useCallback((): Particle[] => {
    const totalCells = cols * rows;
    const cellIndices: number[] = [];

    for (let i = 0; i < totalCells; i++) {
      cellIndices.push(i);
    }

    // Sample if grid is larger than MAX_PARTICLES
    if (cellIndices.length > MAX_PARTICLES) {
      // Fisher-Yates shuffle and take first MAX_PARTICLES
      for (let i = cellIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
      }
      cellIndices.length = MAX_PARTICLES;
    }

    return cellIndices.map((cellIndex, i) => {
      const col = cellIndex % cols;
      const row = Math.floor(cellIndex / cols);
      const x = col * cellSize + cellSize / 2 - PARTICLE_SIZE / 2;
      const y = row * cellSize + cellSize / 2 - PARTICLE_SIZE / 2;
      const targetTranslateY = -(200 + Math.random() * 200);
      const targetRotation = 180 + Math.random() * 180;

      return {
        id: i,
        x,
        y,
        translateY: targetTranslateY,
        rotation: targetRotation,
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
        translate: new Animated.Value(0),
        rotate: new Animated.Value(0),
        delay: i * ANIM.gridDissolveDelay,
      };
    });
  }, [cols, rows, cellSize]);

  useEffect(() => {
    if (active && !animatingRef.current) {
      animatingRef.current = true;
      const newParticles = buildParticles();
      setParticles(newParticles);

      const animations = newParticles.map((particle) =>
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.parallel([
            Animated.timing(particle.translate, {
              toValue: 1,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0.3,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotate, {
              toValue: 1,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

      Animated.parallel(animations).start(() => {
        setParticles([]);
        animatingRef.current = false;
      });
    }

    if (!active) {
      animatingRef.current = false;
      setParticles([]);
    }
  }, [active, buildParticles]);

  if (particles.length === 0) {
    return null;
  }

  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width: gridWidth, height: gridHeight }]}
    >
      {particles.map((particle) => {
        const translateY = particle.translate.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.translateY],
        });

        const rotate = particle.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${particle.rotation}deg`],
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                backgroundColor: particleColor,
                shadowColor: particleColor,
                opacity: particle.opacity,
                transform: [
                  { translateY },
                  { scale: particle.scale },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: 2,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default React.memo(GridDissolveEffect);
