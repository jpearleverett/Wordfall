/**
 * GrandLibraryScene — the Library meta-game's illustrated hero.
 *
 * A cross-section of the Grand Library hall drawn in SVG: a central dome
 * where Folio the archivist perches, and eight arched wing alcoves in two
 * rows. Each alcove renders its wing's live state:
 *   restored — lit from within in the wing's color, shelves full of books,
 *              light rays spilling from the arch;
 *   current  — work in progress: scaffolding, a half-filled shelf, warm
 *              lamplight, and a progress ring on its emblem;
 *   ruined   — dark, boarded over, cracked stone and cobwebs.
 *
 * Architecture is one static <Svg>; wing emblems, state badges and touch
 * targets are absolutely-positioned overlays sharing the same geometry, so
 * the icon set and press feedback reuse the app's existing components.
 * A few drifting dust motes (reduce-motion gated) keep the hall alive.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import GameIcon from '../icons/GameIcon';
import { OwlIcon } from '../icons/iconsMisc';
import { LockIcon, CheckIcon } from '../icons/iconsCore';
import { COLORS, FONTS } from '../../constants';
import { WingDef } from '../../data/library';
import { useReduceMotion } from '../../hooks/useReduceMotion';

export type WingSceneState = 'restored' | 'current' | 'ruined';

export interface SceneWing {
  def: WingDef;
  state: WingSceneState;
  /** 0..1 — used for the current wing's progress ring. */
  progress: number;
}

interface GrandLibrarySceneProps {
  wings: SceneWing[];
  selectedWingId?: string | null;
  onWingPress?: (wingId: string) => void;
  /** Rendered width; height scales at H/W. */
  width?: number;
}

const W = 390;
const H = 432;
const ALCOVE_W = 82;
const ALCOVE_H = 102;
const GAP = 8;
const MARGIN = (W - (4 * ALCOVE_W + 3 * GAP)) / 2;
const ROW_Y = [98, 220];

function alcoveRect(i: number) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return { x: MARGIN + col * (ALCOVE_W + GAP), y: ROW_Y[row] };
}

function archPath(x: number, y: number): string {
  return `M ${x} ${y + ALCOVE_H} L ${x} ${y + 26} Q ${x + ALCOVE_W / 2} ${y - 16} ${x + ALCOVE_W} ${y + 26} L ${x + ALCOVE_W} ${y + ALCOVE_H} Z`;
}

const STONE = '#2b1d3e';
const STONE_DARK = '#1c1129';
const STONE_EDGE = '#4a3566';
const WOOD = '#6b4a2a';
const WOOD_DARK = '#452e18';

/** Book blocks for a restored shelf row — deterministic per wing/row. */
function shelfBooks(x: number, shelfY: number, accent: string, seed: number) {
  const books: React.ReactElement[] = [];
  let bx = x + 8;
  let k = 0;
  while (bx < x + ALCOVE_W - 12) {
    const h = 10 + ((seed * 7 + k * 5) % 6);
    const w = 4 + ((seed * 3 + k * 11) % 4);
    const hues = [accent, '#e8c07a', '#c9d2e8', accent];
    books.push(
      <Rect
        key={`bk-${seed}-${k}`}
        x={bx}
        y={shelfY - h}
        width={w}
        height={h}
        rx={1}
        fill={hues[(seed + k) % hues.length]}
        opacity={0.85}
      />,
    );
    bx += w + 1.6;
    k += 1;
  }
  return books;
}

function RestoredAlcove({ x, y, accent, index }: { x: number; y: number; accent: string; index: number }) {
  const gid = `wing-glow-${index}`;
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="0.5" cy="0.35" r="0.75">
          <Stop offset="0" stopColor={accent} stopOpacity="0.5" />
          <Stop offset="0.65" stopColor={accent} stopOpacity="0.16" />
          <Stop offset="1" stopColor={accent} stopOpacity="0.03" />
        </RadialGradient>
      </Defs>
      <Path d={archPath(x, y)} fill="#160b26" stroke={STONE_EDGE} strokeWidth={2} />
      <Path d={archPath(x, y)} fill={`url(#${gid})`} />
      {/* shelves */}
      {[46, 68, 90].map((dy, r) => (
        <G key={`sh-${index}-${r}`}>
          {shelfBooks(x, y + dy, accent, index * 3 + r)}
          <Rect x={x + 6} y={y + dy} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD} />
        </G>
      ))}
      {/* light rays from the arch */}
      <Polygon
        points={`${x + ALCOVE_W / 2 - 8},${y + 6} ${x + ALCOVE_W / 2 + 8},${y + 6} ${x + ALCOVE_W / 2 + 22},${y + ALCOVE_H} ${x + ALCOVE_W / 2 - 22},${y + ALCOVE_H}`}
        fill={accent}
        opacity={0.1}
      />
      {/* base glow */}
      <Ellipse cx={x + ALCOVE_W / 2} cy={y + ALCOVE_H - 2} rx={30} ry={6} fill={accent} opacity={0.22} />
    </G>
  );
}

function CurrentAlcove({ x, y, accent, index }: { x: number; y: number; accent: string; index: number }) {
  return (
    <G>
      <Path d={archPath(x, y)} fill="#120a20" stroke={STONE_EDGE} strokeWidth={2} />
      {/* warm work-lamp glow, low */}
      <Ellipse cx={x + ALCOVE_W / 2} cy={y + ALCOVE_H - 14} rx={26} ry={14} fill="#ffb800" opacity={0.12} />
      <Circle cx={x + ALCOVE_W / 2 + 20} cy={y + ALCOVE_H - 24} r={3.4} fill="#ffd24d" opacity={0.9} />
      {/* one finished shelf, one bare */}
      <G>{shelfBooks(x, y + 90, accent, index * 3 + 1)}</G>
      <Rect x={x + 6} y={y + 90} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD} />
      <Rect x={x + 6} y={y + 64} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD_DARK} />
      {/* scaffold */}
      <Rect x={x + 12} y={y + 26} width={3.4} height={ALCOVE_H - 28} fill={WOOD} rx={1.5} />
      <Rect x={x + ALCOVE_W - 16} y={y + 26} width={3.4} height={ALCOVE_H - 28} fill={WOOD} rx={1.5} />
      <Rect x={x + 8} y={y + 40} width={ALCOVE_W - 16} height={3} fill={WOOD_DARK} rx={1.5} />
      <Path
        d={`M ${x + 14} ${y + ALCOVE_H - 4} L ${x + ALCOVE_W - 14} ${y + 44}`}
        stroke={WOOD}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </G>
  );
}

function RuinedAlcove({ x, y, index }: { x: number; y: number; index: number }) {
  const cx = x + ALCOVE_W / 2;
  return (
    <G opacity={0.92}>
      <Path d={archPath(x, y)} fill="#0b0614" stroke="#33244d" strokeWidth={2} />
      {/* fallen shelf remnant */}
      <Rect x={x + 10} y={y + 84} width={ALCOVE_W - 30} height={3} rx={1.5} fill="#33241a" transform={`rotate(-7 ${cx} ${y + 84})`} />
      {/* boards nailed across */}
      <Rect x={x + 4} y={y + 44} width={ALCOVE_W - 8} height={9} rx={2} fill="#3a2a18" transform={`rotate(-9 ${cx} ${y + 48})`} />
      <Rect x={x + 4} y={y + 66} width={ALCOVE_W - 8} height={9} rx={2} fill="#33241a" transform={`rotate(6 ${cx} ${y + 70})`} />
      {/* cracks */}
      <Path
        d={`M ${x + 14} ${y + 20} l 7 9 l -4 8 M ${x + ALCOVE_W - 18} ${y + 28} l -6 10 l 5 7`}
        stroke="#33244d"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      {/* cobweb, top-left of the arch */}
      <Path
        d={`M ${x + 6} ${y + 24} q 10 2 14 12 M ${x + 6} ${y + 30} q 7 1 10 8 M ${x + 8} ${y + 22} l 10 14`}
        stroke="rgba(200,210,232,0.28)"
        strokeWidth={1}
        fill="none"
      />
    </G>
  );
}

/** Drifting dust mote — slow rise + fade loop. */
function DustMote({ x, delay, reduceMotion }: { x: number; delay: number; reduceMotion: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, reduceMotion]);
  if (reduceMotion) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: 300,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ffe9a8',
        opacity: anim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.7, 0.35, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -190] }) },
          { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, -4] }) },
        ],
      }}
    />
  );
}

export default function GrandLibraryScene({ wings, selectedWingId, onWingPress, width = W }: GrandLibrarySceneProps) {
  const reduceMotion = useReduceMotion();
  const scale = width / W;
  const height = H * scale;

  // Folio breathing bob on his dome perch.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduceMotion]);

  const restoredCount = useMemo(() => wings.filter(w => w.state === 'restored').length, [wings]);

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <View style={{ width: W, height: H, transform: [{ scale }], transformOrigin: 'top left' as never }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="hall-sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#241239" />
              <Stop offset="0.5" stopColor="#180b2c" />
              <Stop offset="1" stopColor="#0e0619" />
            </LinearGradient>
            <LinearGradient id="hall-floor" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2e1c44" />
              <Stop offset="1" stopColor="#160b26" />
            </LinearGradient>
            <RadialGradient id="dome-glow" cx="0.5" cy="0.4" r="0.6">
              <Stop offset="0" stopColor="#ffd24d" stopOpacity={restoredCount > 0 ? 0.5 : 0.18} />
              <Stop offset="1" stopColor="#ffd24d" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* hall */}
          <Rect x={0} y={0} width={W} height={H} fill="url(#hall-sky)" rx={24} />

          {/* dome */}
          <Path d={`M 135 92 Q 195 6 255 92 Z`} fill={STONE} stroke={STONE_EDGE} strokeWidth={2} />
          <Circle cx={195} cy={64} r={17} fill="#0e0619" stroke={STONE_EDGE} strokeWidth={2} />
          <Circle cx={195} cy={64} r={26} fill="url(#dome-glow)" />
          {/* dome finial + side roofs */}
          <Rect x={192} y={12} width={6} height={12} rx={3} fill="#ffd24d" opacity={0.9} />
          <Path d={`M 10 92 L 90 92 L 135 70 L 135 92 Z`} fill={STONE_DARK} stroke={STONE_EDGE} strokeWidth={1.5} />
          <Path d={`M 380 92 L 300 92 L 255 70 L 255 92 Z`} fill={STONE_DARK} stroke={STONE_EDGE} strokeWidth={1.5} />
          {/* cornice under dome band */}
          <Rect x={10} y={90} width={370} height={5} rx={2.5} fill={STONE_EDGE} opacity={0.7} />

          {/* pilasters */}
          {[0, 1, 2, 3, 4].map(i => {
            const px = MARGIN - 8 + i * (ALCOVE_W + GAP);
            return (
              <G key={`pl-${i}`}>
                <Rect x={px} y={96} width={6} height={H - 150} fill={STONE} stroke={STONE_EDGE} strokeWidth={0.8} />
                <Rect x={px - 2} y={204} width={10} height={7} rx={2} fill={STONE_EDGE} opacity={0.8} />
              </G>
            );
          })}

          {/* alcoves */}
          {wings.slice(0, 8).map((w, i) => {
            const { x, y } = alcoveRect(i);
            if (w.state === 'restored') return <RestoredAlcove key={w.def.id} x={x} y={y} accent={w.def.accent} index={i} />;
            if (w.state === 'current') return <CurrentAlcove key={w.def.id} x={x} y={y} accent={w.def.accent} index={i} />;
            return <RuinedAlcove key={w.def.id} x={x} y={y} index={i} />;
          })}

          {/* floor */}
          <Rect x={0} y={330} width={W} height={H - 330} fill="url(#hall-floor)" rx={24} />
          <Rect x={0} y={330} width={W} height={3} fill={STONE_EDGE} opacity={0.6} />
          {[1, 2, 3].map(i => (
            <Path key={`fb-${i}`} d={`M ${20 * i} ${H - 4} L ${60 + 34 * i} 336`} stroke="#3a2757" strokeWidth={1} opacity={0.5} />
          ))}
          {[1, 2, 3].map(i => (
            <Path key={`fb2-${i}`} d={`M ${W - 20 * i} ${H - 4} L ${W - 60 - 34 * i} 336`} stroke="#3a2757" strokeWidth={1} opacity={0.5} />
          ))}
          {/* rug */}
          <Ellipse cx={195} cy={382} rx={104} ry={26} fill="#4a1b62" stroke="#c84dff" strokeWidth={1.6} opacity={0.85} />
          <Ellipse cx={195} cy={382} rx={78} ry={18} fill="none" stroke="#ffd24d" strokeWidth={1.1} opacity={0.5} />
          {/* welcome lectern on the rug */}
          <Rect x={188} y={358} width={14} height={20} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1} />
          <Rect x={182} y={352} width={26} height={8} rx={2} fill={WOOD_DARK} />
          <Rect x={185} y={348} width={20} height={5} rx={1.5} fill="#e8c07a" />
        </Svg>

        {/* Folio on the dome */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 195 - 14,
            top: 64 - 15,
            transform: [{ translateY: reduceMotion ? 0 : bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        >
          <OwlIcon size={28} />
        </Animated.View>

        {/* wing emblems + touch targets */}
        {wings.slice(0, 8).map((w, i) => {
          const { x, y } = alcoveRect(i);
          const selected = selectedWingId === w.def.id;
          return (
            <Pressable
              key={`ov-${w.def.id}`}
              onPress={() => onWingPress?.(w.def.id)}
              accessibilityRole="button"
              accessibilityLabel={`${w.def.name} Wing, ${w.state === 'restored' ? 'restored' : w.state === 'current' ? `${Math.round(w.progress * 100)} percent restored` : 'locked'}`}
              style={({ pressed }) => [
                { position: 'absolute', left: x, top: y - 6, width: ALCOVE_W, height: ALCOVE_H + 6, alignItems: 'center' },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <View
                style={[
                  styles.emblem,
                  {
                    borderColor: w.state === 'ruined' ? 'rgba(200,210,232,0.25)' : w.def.accent,
                    shadowColor: w.state === 'ruined' ? '#000' : w.def.accent,
                    shadowOpacity: w.state === 'ruined' ? 0.2 : 0.7,
                  },
                  selected && styles.emblemSelected,
                ]}
              >
                <GameIcon name={w.def.icon} size={19} accent={w.state === 'ruined' ? '#5a4a74' : undefined} />
              </View>
              <View style={styles.badgeSlot}>
                {w.state === 'restored' ? (
                  <View style={[styles.stateBadge, { borderColor: 'rgba(0,230,118,0.6)' }]}>
                    <CheckIcon size={11} />
                  </View>
                ) : w.state === 'current' ? (
                  <View style={[styles.stateBadge, { borderColor: w.def.accent }]}>
                    <Text style={[styles.pctText, { color: w.def.accent }]}>{Math.round(w.progress * 100)}%</Text>
                  </View>
                ) : (
                  <View style={[styles.stateBadge, { borderColor: 'rgba(200,210,232,0.3)' }]}>
                    <LockIcon size={11} accent="#8a7ba8" />
                  </View>
                )}
              </View>
              <Text style={[styles.wingLabel, w.state === 'ruined' && styles.wingLabelRuined]} numberOfLines={1}>
                {w.def.name.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}

        {/* dust motes */}
        <DustMote x={92} delay={0} reduceMotion={reduceMotion} />
        <DustMote x={205} delay={1700} reduceMotion={reduceMotion} />
        <DustMote x={296} delay={3400} reduceMotion={reduceMotion} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10, 4, 22, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 5,
  },
  emblemSelected: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2,
  },
  badgeSlot: {
    position: 'absolute',
    top: 20,
    right: ALCOVE_W / 2 - 30,
  },
  stateBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    borderWidth: 1.2,
    backgroundColor: 'rgba(8, 3, 18, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 8,
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
  },
  wingLabel: {
    position: 'absolute',
    bottom: -2,
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
  },
  wingLabelRuined: {
    color: '#8a7ba8',
  },
});
