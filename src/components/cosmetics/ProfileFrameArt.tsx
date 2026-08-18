/**
 * ProfileFrameArt — renders the avatar (children) inside a bespoke SVG frame
 * ring. Twelve illustration-grade ring designs (gradient metals, energy,
 * top-light shading — same material language as the icon set) are assigned
 * per frame id by `frameArtCatalog`; unknown ids fall back by rarity.
 *
 * Layout: children are centered in a size×size box; the frame SVG overlays
 * on top (pointerEvents none) so the band overlaps the avatar's edge the way
 * a physical frame would. Callers keep the avatar disc at ~88% of `size` so
 * the band (r 38–46 of the 100-unit viewBox) seats on its rim.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { FVB, FrameRenderProps } from './frameArtParts';
import { FrameDesign, resolveFrameArt } from './frameArtCatalog';
import {
  SimpleRing,
  LaurelFrame,
  GildedFrame,
  NeonCircuitFrame,
  CrystalFrame,
  FlameFrame,
} from './frameArtRenders1';
import {
  WaveFrame,
  StarOrbitFrame,
  VineFrame,
  RoyalFrame,
  CosmicFrame,
  ChromeFrame,
  HoloFrame,
} from './frameArtRenders2';

const RENDERERS: Record<FrameDesign, React.ComponentType<FrameRenderProps>> = {
  simple: SimpleRing,
  laurel: LaurelFrame,
  gilded: GildedFrame,
  neonCircuit: NeonCircuitFrame,
  crystal: CrystalFrame,
  flame: FlameFrame,
  wave: WaveFrame,
  starOrbit: StarOrbitFrame,
  vine: VineFrame,
  royal: RoyalFrame,
  cosmic: CosmicFrame,
  chrome: ChromeFrame,
  holo: HoloFrame,
};

export interface ProfileFrameArtProps {
  frameId: string;
  size: number;
  children?: React.ReactNode;
}

export function ProfileFrameArt({ frameId, size, children }: ProfileFrameArtProps) {
  const art = useMemo(() => resolveFrameArt(frameId), [frameId]);
  const Renderer = RENDERERS[art.design] ?? SimpleRing;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={size} height={size} viewBox={FVB}>
          <Renderer accent={art.accent} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
