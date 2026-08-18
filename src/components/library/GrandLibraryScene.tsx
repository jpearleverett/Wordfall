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
import { FONTS } from '../../constants';
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
  /**
   * When true, a glowing gift preview floats above the lectern — the
   * decoration awaiting placement at the hub's focal point.
   */
  pendingDecoration?: boolean;
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

/**
 * Per-wing themed set-dressing drawn inside an alcove. Each wing gets a
 * distinct hand-crafted silhouette (ivy, flask, marble columns, waves,
 * easel, telescope, scrolls, forge) so every room reads as its own place.
 * Restored alcoves draw it at full accent strength in front of the
 * shelves — furniture in the room; ruined alcoves ghost it (~45%) behind
 * the boards so a locked wing teases its theme instead of repeating a
 * generic bookshelf.
 */
function WingThemeArt({ x, y, accent, wingId, ghost = false }: { x: number; y: number; accent: string; wingId: string; ghost?: boolean }) {
  const cx = x + ALCOVE_W / 2;
  let art: React.ReactElement | null = null;
  switch (wingId) {
    case 'nature':
      art = (
        <G>
          {/* hanging ivy strands from the arch */}
          <Path d={`M ${x + 13} ${y + 14} q -3 14 2 26 q 4 10 1 18`} stroke={accent} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d={`M ${x + ALCOVE_W - 13} ${y + 14} q 3 16 -2 28 q -3 9 0 16`} stroke={accent} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.85} />
          {[[11, 24], [16, 36], [12, 48], [69, 26], [66, 40], [70, 52]].map(([dx, dy], k) => (
            <Ellipse key={`nl-${k}`} cx={x + dx} cy={y + dy} rx={3} ry={1.8} fill={accent} opacity={0.9} transform={`rotate(${k % 2 ? 38 : -38} ${x + dx} ${y + dy})`} />
          ))}
          {/* potted plant on the floor */}
          <Path d={`M ${x + 54} ${y + 92} h 15 l -2.5 9 h -10 Z`} fill="#a45f33" stroke="#5f371c" strokeWidth={0.8} />
          <Path d={`M ${x + 61} ${y + 92} q -6 -7 -10 -6 q 4 8 10 6 M ${x + 62} ${y + 92} q 1 -9 6 -11 q 2 8 -6 11`} fill={accent} opacity={0.95} />
        </G>
      );
      break;
    case 'science':
      art = (
        <G>
          {/* orbit ring under the arch */}
          <Ellipse cx={cx} cy={y + 22} rx={21} ry={6.5} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.8} transform={`rotate(-14 ${cx} ${y + 22})`} />
          <Circle cx={cx} cy={y + 22} r={2.6} fill={accent} />
          <Circle cx={cx + 18} cy={y + 17} r={1.6} fill="#e8c07a" />
          {/* Erlenmeyer flask on the floor */}
          <Path d={`M ${x + 15} ${y + 80} h 9 v 7 l 7 12 h -23 l 7 -12 Z`} fill={accent} fillOpacity={0.28} stroke={accent} strokeWidth={1.2} />
          <Path d={`M ${x + 13} ${y + 93} h 14`} stroke={accent} strokeWidth={2} opacity={0.7} />
          {/* rising bubbles */}
          <Circle cx={x + 21} cy={y + 72} r={1.6} fill={accent} opacity={0.8} />
          <Circle cx={x + 25} cy={y + 64} r={1.2} fill={accent} opacity={0.6} />
          <Circle cx={x + 19} cy={y + 57} r={1} fill={accent} opacity={0.45} />
        </G>
      );
      break;
    case 'mythology':
      art = (
        <G>
          {/* marble column pair */}
          {[x + 9, x + ALCOVE_W - 17].map((px, k) => (
            <G key={`mc-${k}`}>
              <Rect x={px - 1.5} y={y + 30} width={11} height={4} rx={1.5} fill="#d8cdf0" opacity={0.85} />
              <Rect x={px} y={y + 34} width={8} height={58} fill="#b9abd8" opacity={0.75} />
              <Path d={`M ${px + 2.5} ${y + 36} v 54 M ${px + 5.5} ${y + 36} v 54`} stroke="#8f7db8" strokeWidth={0.8} opacity={0.7} />
              <Rect x={px - 1.5} y={y + 92} width={11} height={4} rx={1.5} fill="#d8cdf0" opacity={0.85} />
            </G>
          ))}
          {/* constellation in the lunette */}
          <Path d={`M ${cx - 12} ${y + 22} L ${cx - 3} ${y + 15} L ${cx + 7} ${y + 20} L ${cx + 14} ${y + 13}`} stroke={accent} strokeWidth={0.9} fill="none" opacity={0.75} />
          {[[-12, 22], [-3, 15], [7, 20], [14, 13]].map(([dx, dy], k) => (
            <Circle key={`ms-${k}`} cx={cx + dx} cy={y + dy} r={1.5} fill="#ffe9a8" />
          ))}
        </G>
      );
      break;
    case 'ocean':
      art = (
        <G>
          {/* ship in a bottle, lunette */}
          <Rect x={cx - 16} y={y + 15} width={27} height={11} rx={5.5} fill={accent} fillOpacity={0.2} stroke="#bfe6ff" strokeWidth={1} />
          <Rect x={cx + 11} y={y + 18.5} width={5} height={4} fill="#bfe6ff" opacity={0.8} />
          <Rect x={cx + 16} y={y + 17.5} width={2.5} height={6} rx={1} fill="#e8c07a" />
          <Path d={`M ${cx - 11} ${y + 23} h 9 l -1.6 2.6 h -6 Z`} fill={accent} />
          <Path d={`M ${cx - 7} ${y + 22.6} v -5 l 4.5 5 Z`} fill="#ffe9a8" opacity={0.95} />
          {/* wave arcs */}
          <Path d={`M ${x + 8} ${y + 86} q 8 -9 17 0 t 17 0 t 17 0`} stroke={accent} strokeWidth={1.6} fill="none" opacity={0.9} />
          <Path d={`M ${x + 12} ${y + 95} q 7 -7 14 0 t 14 0 t 14 0`} stroke={accent} strokeWidth={1.2} fill="none" opacity={0.55} />
          {/* bubbles */}
          <Circle cx={x + 18} cy={y + 62} r={2} fill={accent} opacity={0.55} />
          <Circle cx={x + 62} cy={y + 54} r={1.5} fill={accent} opacity={0.45} />
          <Circle cx={x + 58} cy={y + 70} r={1.1} fill={accent} opacity={0.4} />
        </G>
      );
      break;
    case 'arts':
      art = (
        <G>
          {/* wall frames */}
          <Rect x={x + 50} y={y + 18} width={16} height={12} rx={1.5} fill={accent} fillOpacity={0.3} stroke="#e8c07a" strokeWidth={1.2} />
          <Path d={`M ${x + 52} ${y + 27} l 4 -4 l 3 3 l 3.5 -5`} stroke={accent} strokeWidth={1.1} fill="none" />
          <Rect x={x + 16} y={y + 20} width={11} height={9} rx={1.5} fill="none" stroke={accent} strokeWidth={1.1} opacity={0.85} />
          {/* easel with canvas */}
          <Path d={`M ${x + 22} ${y + 97} L ${x + 33} ${y + 56} L ${x + 44} ${y + 97} M ${x + 33} ${y + 66} v 30`} stroke={WOOD} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Rect x={x + 24} y={y + 60} width={18} height={15} rx={1} fill="#f2ead8" stroke={WOOD_DARK} strokeWidth={1} />
          <Path d={`M ${x + 27} ${y + 70} q 4 -6 8 -1 q 3 3 5 -2`} stroke={accent} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </G>
      );
      break;
    case 'space':
      art = (
        <G>
          {/* ringed planet */}
          <Circle cx={cx + 17} cy={y + 20} r={5.5} fill={accent} fillOpacity={0.55} stroke={accent} strokeWidth={1} />
          <Ellipse cx={cx + 17} cy={y + 20} rx={10} ry={2.8} fill="none" stroke="#e8c07a" strokeWidth={1} transform={`rotate(-18 ${cx + 17} ${y + 20})`} />
          {/* stars */}
          <Path d={`M ${x + 14} ${y + 18} l 1.8 3 l -1.8 3 l -1.8 -3 Z`} fill="#ffe9a8" opacity={0.9} />
          <Circle cx={x + 24} cy={y + 30} r={1.2} fill="#ffe9a8" opacity={0.7} />
          <Circle cx={x + 60} cy={y + 38} r={1.1} fill="#ffe9a8" opacity={0.6} />
          {/* telescope on tripod */}
          <Path d={`M ${x + 16} ${y + 84} L ${x + 38} ${y + 60}`} stroke={accent} strokeWidth={5} strokeLinecap="round" />
          <Path d={`M ${x + 38} ${y + 60} L ${x + 45} ${y + 53}`} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          <Path d={`M ${x + 24} ${y + 78} L ${x + 15} ${y + 98} M ${x + 24} ${y + 78} L ${x + 33} ${y + 98} M ${x + 24} ${y + 82} L ${x + 24} ${y + 98}`} stroke={WOOD} strokeWidth={2} strokeLinecap="round" fill="none" />
        </G>
      );
      break;
    case 'history':
      art = (
        <G>
          {/* hourglass in the lunette */}
          <Rect x={cx - 7} y={y + 13} width={14} height={2.5} rx={1} fill="#e8c07a" />
          <Rect x={cx - 7} y={y + 32.5} width={14} height={2.5} rx={1} fill="#e8c07a" />
          <Path d={`M ${cx - 5.5} ${y + 15.5} h 11 l -5.5 8.5 Z`} fill={accent} fillOpacity={0.55} stroke={accent} strokeWidth={0.9} />
          <Path d={`M ${cx - 5.5} ${y + 32.5} h 11 l -5.5 -8.5 Z`} fill={accent} fillOpacity={0.3} stroke={accent} strokeWidth={0.9} />
          {/* scroll stack on the floor */}
          {[[12, 92, 24], [38, 92, 22], [24, 85, 24]].map(([dx, dy, wd], k) => (
            <G key={`hsc-${k}`}>
              <Rect x={x + dx} y={y + dy} width={wd} height={6.5} rx={3.2} fill="#d9c08c" stroke="#8a6b3a" strokeWidth={0.8} />
              <Circle cx={x + dx + wd} cy={y + dy + 3.2} r={3} fill="#b8935c" stroke="#8a6b3a" strokeWidth={0.7} />
            </G>
          ))}
        </G>
      );
      break;
    case 'elements':
      art = (
        <G>
          {/* forge glow pooled on the floor */}
          <Ellipse cx={cx} cy={y + 94} rx={24} ry={9} fill={accent} opacity={0.3} />
          <Ellipse cx={cx} cy={y + 95} rx={14} ry={5.5} fill="#ffb800" opacity={0.3} />
          {/* anvil silhouette against the glow */}
          <Path d={`M ${cx - 15} ${y + 76} h 22 q 9 0 9 4.5 l -9 3.5 h -7 l 2.5 8 h -15 l 2.5 -8 h -5 Z`} fill="#1a0f28" stroke={accent} strokeWidth={1.1} />
          {/* embers */}
          <Circle cx={cx - 12} cy={y + 66} r={1.6} fill="#ffb800" opacity={0.85} />
          <Circle cx={cx + 6} cy={y + 58} r={1.2} fill={accent} opacity={0.7} />
          <Circle cx={cx + 15} cy={y + 68} r={1} fill="#ffb800" opacity={0.55} />
          <Circle cx={cx - 4} cy={y + 50} r={0.9} fill={accent} opacity={0.5} />
        </G>
      );
      break;
    default:
      art = null;
  }
  if (!art) return null;
  return <G opacity={ghost ? 0.45 : 1}>{art}</G>;
}

function RestoredAlcove({ x, y, accent, index, wingId }: { x: number; y: number; accent: string; index: number; wingId: string }) {
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
      {/* themed set-dressing — this wing's own room, in front of the shelves */}
      <WingThemeArt x={x} y={y} accent={accent} wingId={wingId} />
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

function RuinedAlcove({ x, y, accent, index, wingId }: { x: number; y: number; accent: string; index: number; wingId: string }) {
  const cx = x + ALCOVE_W / 2;
  const tid = `ruin-tint-${index}`;
  return (
    <G>
      <Defs>
        <RadialGradient id={tid} cx="0.5" cy="0.4" r="0.8">
          <Stop offset="0" stopColor={accent} stopOpacity="0.3" />
          <Stop offset="0.6" stopColor={accent} stopOpacity="0.15" />
          <Stop offset="1" stopColor={accent} stopOpacity="0.04" />
        </RadialGradient>
      </Defs>
      {/* lifted base stone so the silhouette separates from the hall */}
      <Path d={archPath(x, y)} fill="#2e2048" stroke="#5c4584" strokeWidth={2} />
      {/* low-saturation wash of this wing's own accent — a ghosted color preview */}
      <Path d={archPath(x, y)} fill={`url(#${tid})`} />
      {/* faint warm rim light on the arch frame */}
      <Path d={archPath(x, y)} fill="none" stroke="#e8c07a" strokeWidth={1.1} opacity={0.34} />
      {/* ghost of the shelving to come, tinted in the wing accent */}
      {[52, 96].map((dy, r) => (
        <Rect key={`gs-${index}-${r}`} x={x + 8} y={y + dy} width={ALCOVE_W - 16} height={2.6} rx={1.3} fill={accent} opacity={0.22} />
      ))}
      {/* ghosted theme silhouette — teases what this room becomes */}
      <WingThemeArt x={x} y={y} accent={accent} wingId={wingId} ghost />
      {/* fallen shelf remnant */}
      <Rect x={x + 10} y={y + 84} width={ALCOVE_W - 30} height={3} rx={1.5} fill="#4a3626" transform={`rotate(-7 ${cx} ${y + 84})`} />
      {/* boards nailed across */}
      <Rect x={x + 4} y={y + 44} width={ALCOVE_W - 8} height={9} rx={2} fill="#54402a" stroke="#2c1f12" strokeWidth={0.8} transform={`rotate(-9 ${cx} ${y + 48})`} />
      <Rect x={x + 4} y={y + 66} width={ALCOVE_W - 8} height={9} rx={2} fill="#4a3626" stroke="#2c1f12" strokeWidth={0.8} transform={`rotate(6 ${cx} ${y + 70})`} />
      {/* cracks */}
      <Path
        d={`M ${x + 14} ${y + 20} l 7 9 l -4 8 M ${x + ALCOVE_W - 18} ${y + 28} l -6 10 l 5 7`}
        stroke="#6c559a"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      {/* cobweb, top-left of the arch */}
      <Path
        d={`M ${x + 6} ${y + 24} q 10 2 14 12 M ${x + 6} ${y + 30} q 7 1 10 8 M ${x + 8} ${y + 22} l 10 14`}
        stroke="rgba(200,210,232,0.35)"
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

export default function GrandLibraryScene({ wings, selectedWingId, onWingPress, width = W, pendingDecoration = false }: GrandLibrarySceneProps) {
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
            <RadialGradient id="gift-aura" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#ffd24d" stopOpacity="0.55" />
              <Stop offset="0.55" stopColor="#ffd24d" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#ffd24d" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="gift-pool" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#ffd24d" stopOpacity="0.32" />
              <Stop offset="0.6" stopColor="#ffd24d" stopOpacity="0.12" />
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
            if (w.state === 'restored') return <RestoredAlcove key={w.def.id} x={x} y={y} accent={w.def.accent} index={i} wingId={w.def.id} />;
            if (w.state === 'current') return <CurrentAlcove key={w.def.id} x={x} y={y} accent={w.def.accent} index={i} />;
            return <RuinedAlcove key={w.def.id} x={x} y={y} accent={w.def.accent} index={i} wingId={w.def.id} />;
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
          {/* warm light pool spilling onto the floor under the reward */}
          {pendingDecoration && <Ellipse cx={195} cy={380} rx={64} ry={16} fill="url(#gift-pool)" />}
          {/* grounded contact shadow so the lectern sits on the rug */}
          <Ellipse cx={195} cy={379} rx={27} ry={5.5} fill="#04010a" opacity={0.5} />
          {/* welcome lectern on the rug */}
          <Rect x={188} y={358} width={14} height={20} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1} />
          <Rect x={182} y={352} width={26} height={8} rx={2} fill={WOOD_DARK} />
          <Rect x={185} y={348} width={20} height={5} rx={1.5} fill="#e8c07a" />

          {/* awaiting decoration — glowing gift preview floating above the lectern */}
          {pendingDecoration && (
            <G>
              <Circle cx={195} cy={337} r={44} fill="url(#gift-aura)" />
              {/* light kissing the lectern top — the prop is lit, not floating */}
              <Ellipse cx={195} cy={358} rx={19} ry={4} fill="#ffd24d" opacity={0.25} />
              {/* small rays */}
              {[-90, -40, 25, 90, 155, 220].map(deg => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 195 + Math.cos(rad) * 25;
                const y1 = 337 + Math.sin(rad) * 25;
                const x2 = 195 + Math.cos(rad) * 35;
                const y2 = 337 + Math.sin(rad) * 35;
                return (
                  <Path
                    key={`gr-${deg}`}
                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                    stroke="#ffd24d"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                );
              })}
              {/* tiny sparkles */}
              <Path d="M 166 320 l 2.8 4.5 l -2.8 4.5 l -2.8 -4.5 Z" fill="#ffe9a8" opacity={0.9} />
              <Circle cx={226} cy={326} r={2} fill="#ffe9a8" opacity={0.8} />
              <Circle cx={216} cy={356} r={1.4} fill="#ffe9a8" opacity={0.65} />
              <Circle cx={170} cy={350} r={1.2} fill="#ffe9a8" opacity={0.55} />
            </G>
          )}
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

        {/* gift preview icon over the lectern aura */}
        {pendingDecoration && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 195 - 20, top: 337 - 20 }}>
            <GameIcon name="gift" size={40} />
          </View>
        )}

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
                    borderColor: w.state === 'ruined' ? `${w.def.accent}59` : w.def.accent,
                    shadowColor: w.state === 'ruined' ? w.def.accent : w.def.accent,
                    shadowOpacity: w.state === 'ruined' ? 0.3 : 0.7,
                  },
                  selected && styles.emblemSelected,
                ]}
              >
                {w.state === 'ruined' ? (
                  // ghosted in the wing's own accent — teases what the wing becomes
                  <View style={{ opacity: 0.42 }}>
                    <GameIcon name={w.def.icon} size={19} accent={w.def.accent} />
                  </View>
                ) : (
                  <GameIcon name={w.def.icon} size={19} />
                )}
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
                  <View style={[styles.stateBadge, { borderColor: 'rgba(255,210,77,0.65)', backgroundColor: 'rgba(12,5,24,0.95)' }]}>
                    <LockIcon size={11} accent="#ffd24d" />
                  </View>
                )}
              </View>
              <View style={styles.wingLabelPlate}>
                <Text
                  style={[
                    styles.wingLabel,
                    // Long names (MYTHOLOGY, ELEMENTS) shrink instead of
                    // ellipsizing — a truncated label reads as a layout bug.
                    w.def.name.length > 7 && styles.wingLabelLong,
                    w.state === 'ruined' && styles.wingLabelRuined,
                  ]}
                  numberOfLines={1}
                >
                  {w.def.name.toUpperCase()}
                </Text>
              </View>
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
  wingLabelPlate: {
    position: 'absolute',
    bottom: -8,
    maxWidth: ALCOVE_W - 2,
    backgroundColor: 'rgba(6, 2, 14, 0.72)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  wingLabel: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: FONTS.display,
    color: '#f6f0ff',
    textShadowColor: 'rgba(4, 1, 12, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  wingLabelLong: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  wingLabelRuined: {
    color: '#cabfe4',
  },
});
