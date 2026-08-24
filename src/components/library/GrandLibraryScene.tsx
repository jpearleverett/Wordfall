/**
 * GrandLibraryScene — the Library meta-game's illustrated hero.
 *
 * A cross-section of the Grand Library hall drawn in SVG: a central dome
 * where Folio the archivist perches, and eight arched wing alcoves in two
 * rows. Each alcove renders its wing's live state:
 *   restored — lit from within in the wing's color, a hero-scale themed
 *              interior (fern, flask, pedestal, ship-in-bottle, easel,
 *              telescope, scroll rack, forge) with at most one book shelf,
 *              light rays spilling from the arch;
 *   current  — work in progress: scaffolding, a half-filled shelf, warm
 *              lamplight, and a progress ring on its emblem;
 *   ruined   — dusk-lit: the same themed interior ghosted in the wing
 *              accent, one board across the arch, cracked stone, cobwebs.
 *
 * Architecture is one static <Svg>; wing emblems, state badges and touch
 * targets are absolutely-positioned overlays sharing the same geometry, so
 * the icon set and press feedback reuse the app's existing components.
 * A few drifting dust motes (focus + reduce-motion gated) keep the hall
 * alive.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
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
const H = 530;
const ALCOVE_W = 92;
const ALCOVE_H = 127;
const GAP = 4;
const MARGIN = (W - (4 * ALCOVE_W + 3 * GAP)) / 2;
const ROW_Y = [98, 239];
const FLOOR_Y = 374;
/**
 * WingThemeArt silhouettes are authored in the original 82×102 alcove
 * space; this transform maps them onto the larger alcove geometry.
 */
const ART_SX = ALCOVE_W / 82;
const ART_SY = ALCOVE_H / 102;

function alcoveRect(i: number) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return { x: MARGIN + col * (ALCOVE_W + GAP), y: ROW_Y[row] };
}

function archPath(x: number, y: number): string {
  return `M ${x} ${y + ALCOVE_H} L ${x} ${y + 30} Q ${x + ALCOVE_W / 2} ${y - 18} ${x + ALCOVE_W} ${y + 30} L ${x + ALCOVE_W} ${y + ALCOVE_H} Z`;
}

const STONE = '#2b1d3e';
const STONE_DARK = '#1c1129';
const STONE_EDGE = '#4a3566';
const WOOD = '#6b4a2a';
const WOOD_DARK = '#452e18';

/**
 * Book blocks for a restored shelf row — deterministic per wing/row.
 * Every ~5th spine is a "lit" pale book so rows read as lamplit dioramas
 * instead of flat colored bars.
 */
function shelfBooks(x: number, shelfY: number, accent: string, seed: number) {
  const books: React.ReactElement[] = [];
  let bx = x + 8;
  let k = 0;
  while (bx < x + ALCOVE_W - 12) {
    const h = 11 + ((seed * 7 + k * 5) % 7);
    const w = 4.5 + ((seed * 3 + k * 11) % 4);
    const lit = (seed * 5 + k) % 5 === 1;
    const hues = [accent, '#e8c07a', '#c9d2e8', accent];
    books.push(
      <Rect
        key={`bk-${seed}-${k}`}
        x={bx}
        y={shelfY - h}
        width={w}
        height={h}
        rx={1}
        fill={lit ? '#f6e7bb' : hues[(seed + k) % hues.length]}
        opacity={lit ? 0.98 : 0.85}
      />,
    );
    bx += w + 1.6;
    k += 1;
  }
  return books;
}

/**
 * Ghosted spine row for a locked wing — varied-height silhouettes in the
 * wing accent at 30–38% opacity, so a ruined alcove still reads as a
 * library waiting to be relit rather than construction debris.
 */
function ghostSpines(x: number, shelfY: number, accent: string, seed: number) {
  const spines: React.ReactElement[] = [];
  let bx = x + 9;
  let k = 0;
  while (bx < x + ALCOVE_W - 13) {
    const h = 10 + ((seed * 5 + k * 7) % 8);
    const w = 5 + ((seed * 3 + k * 5) % 4);
    spines.push(
      <Rect
        key={`gsp-${seed}-${k}`}
        x={bx}
        y={shelfY - h}
        width={w}
        height={h}
        rx={1.2}
        fill={accent}
        opacity={0.3 + ((seed + k * 3) % 5) * 0.02}
      />,
    );
    bx += w + 2.2;
    k += 1;
  }
  return spines;
}

/**
 * Wings whose interiors keep a single bottom book-shelf row as garnish.
 * Every other wing is furnished entirely by its theme composition, so no
 * two alcoves share the "row of spines" silhouette that made them read as
 * identical bar charts.
 */
const SHELF_WINGS = new Set(['nature', 'science', 'mythology']);

/**
 * Per-wing themed set-dressing drawn inside an alcove — the HERO of the
 * composition, not garnish. Each wing gets a distinct hand-crafted interior
 * (ivy + fern, giant flask + tube rack, columns + pedestal, ship-in-bottle
 * + wave band, easel gallery, telescope observatory, scroll pigeonholes,
 * forge + tool wall) so every room reads as its own place at a glance.
 * Restored alcoves draw it at full accent strength in front of the shelf;
 * ruined alcoves ghost it (~45%) behind the boards so a locked wing teases
 * its theme instead of repeating a generic bookshelf.
 */
function WingThemeArt({ x, y, accent, wingId, ghost = false }: { x: number; y: number; accent: string; wingId: string; ghost?: boolean }) {
  // Authored in the legacy 82-wide art space; the outer <G> transform below
  // stretches it to the live alcove size.
  const AW = 82;
  const cx = x + AW / 2;
  let art: React.ReactElement | null = null;
  switch (wingId) {
    case 'nature':
      art = (
        <G>
          {/* ivy arch — garlands tracing both arch shoulders, meeting on high */}
          <Path d={`M ${x + 10} ${y + 20} q -4 16 2 30 q 5 12 1 22`} stroke={accent} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.9} />
          <Path d={`M ${x + AW - 10} ${y + 20} q 4 17 -2 31 q -4 11 0 21`} stroke={accent} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.9} />
          <Path d={`M ${x + 20} ${y + 12} q 21 13 42 0`} stroke={accent} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.8} />
          {[[8, 30], [14, 44], [9, 58], [15, 68], [74, 32], [68, 46], [73, 60], [67, 70], [27, 16], [41, 20], [55, 16]].map(([dx, dy], k) => (
            <Ellipse key={`nl-${k}`} cx={x + dx} cy={y + dy} rx={4.4} ry={2.6} fill={accent} opacity={0.92} transform={`rotate(${k % 2 ? 40 : -40} ${x + dx} ${y + dy})`} />
          ))}
          {/* large potted fern — the room's hero prop */}
          <Path d={`M ${x + 27} ${y + 85} h 28 l -4.5 15 h -19 Z`} fill="#a45f33" stroke="#5f371c" strokeWidth={1} />
          <Rect x={x + 25} y={y + 82.5} width={32} height={4.5} rx={2} fill="#8a4d28" stroke="#5f371c" strokeWidth={0.8} />
          <Path d={`M ${x + 41} ${y + 83} q -16 -12 -25 -8 q 9 14 25 8`} fill={accent} opacity={0.95} />
          <Path d={`M ${x + 41} ${y + 83} q 16 -12 25 -8 q -9 14 -25 8`} fill={accent} opacity={0.95} />
          <Path d={`M ${x + 40} ${y + 83} q -9 -20 -17 -22 q 0 17 17 22`} fill={accent} opacity={0.85} />
          <Path d={`M ${x + 42} ${y + 83} q 9 -20 17 -22 q 0 17 -17 22`} fill={accent} opacity={0.85} />
          <Path d={`M ${x + 40} ${y + 83} q -2 -25 1 -31 q 4 9 2 31`} fill={accent} opacity={0.9} />
        </G>
      );
      break;
    case 'science':
      art = (
        <G>
          {/* orbit ring sweeping the lunette */}
          <Ellipse cx={cx} cy={y + 24} rx={30} ry={9} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.85} transform={`rotate(-13 ${cx} ${y + 24})`} />
          <Circle cx={cx} cy={y + 24} r={3.6} fill={accent} />
          <Circle cx={cx + 26} cy={y + 17} r={2.2} fill="#e8c07a" />
          {/* wall rack of filled test tubes */}
          <Rect x={x + 55} y={y + 50} width={22} height={3} rx={1.5} fill={WOOD} />
          {[0, 1, 2].map(k => (
            <G key={`tt-${k}`}>
              <Rect x={x + 58 + k * 6.6} y={y + 53} width={3.8} height={14} rx={1.9} fill={accent} fillOpacity={0.28} stroke={accent} strokeWidth={0.9} />
              <Rect x={x + 58 + k * 6.6} y={y + 61 - k * 1.6} width={3.8} height={6 + k * 1.6} rx={1.8} fill={accent} opacity={0.65} />
            </G>
          ))}
          {/* giant Erlenmeyer flask — the lab's hero */}
          <Path d={`M ${x + 17} ${y + 81} h 24 l 8 16 h -40 Z`} fill={accent} opacity={0.5} />
          <Path d={`M ${x + 22} ${y + 59} h 14 v 12 l 13 26 h -40 l 13 -26 Z`} fill={accent} fillOpacity={0.26} stroke={accent} strokeWidth={1.7} />
          <Path d={`M ${x + 20} ${y + 57} h 18`} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          {/* rising bubbles */}
          <Circle cx={x + 31} cy={y + 51} r={2.4} fill={accent} opacity={0.8} />
          <Circle cx={x + 37} cy={y + 41} r={1.8} fill={accent} opacity={0.6} />
          <Circle cx={x + 28} cy={y + 33} r={1.3} fill={accent} opacity={0.45} />
        </G>
      );
      break;
    case 'mythology':
      art = (
        <G>
          {/* grand marble column pair framing the room */}
          {[x + 6, x + AW - 20].map((px, k) => (
            <G key={`mc-${k}`}>
              <Rect x={px - 2} y={y + 28} width={18} height={5} rx={2} fill="#d8cdf0" opacity={0.9} />
              <Rect x={px} y={y + 33} width={14} height={60} fill="#b9abd8" opacity={0.8} />
              <Path d={`M ${px + 3.5} ${y + 35} v 56 M ${px + 7} ${y + 35} v 56 M ${px + 10.5} ${y + 35} v 56`} stroke="#8f7db8" strokeWidth={0.9} opacity={0.7} />
              <Rect x={px - 2} y={y + 93} width={18} height={5} rx={2} fill="#d8cdf0" opacity={0.9} />
            </G>
          ))}
          {/* central pedestal bearing a golden amphora */}
          <Rect x={cx - 13} y={y + 92} width={26} height={6} rx={1.5} fill="#d8cdf0" opacity={0.9} />
          <Rect x={cx - 9} y={y + 74} width={18} height={18} fill="#b9abd8" opacity={0.85} />
          <Path d={`M ${cx - 6} ${y + 76} v 14 M ${cx} ${y + 76} v 14 M ${cx + 6} ${y + 76} v 14`} stroke="#8f7db8" strokeWidth={0.9} opacity={0.6} />
          <Rect x={cx - 12} y={y + 70} width={24} height={4} rx={1.5} fill="#d8cdf0" opacity={0.9} />
          <Path d={`M ${cx - 8} ${y + 54} q -3 13 8 17 q 11 -4 8 -17 Z`} fill="#ffd24d" opacity={0.92} />
          <Rect x={cx - 4} y={y + 48} width={8} height={6} fill="#ffd24d" opacity={0.92} />
          <Rect x={cx - 6.5} y={y + 45.5} width={13} height={3} rx={1.5} fill="#e8c07a" />
          <Path d={`M ${cx - 9} ${y + 51} q -6 4 -3 9 M ${cx + 9} ${y + 51} q 6 4 3 9`} stroke="#e8c07a" strokeWidth={1.4} fill="none" />
          {/* constellation in the lunette */}
          <Path d={`M ${cx - 14} ${y + 20} L ${cx - 4} ${y + 13} L ${cx + 8} ${y + 18} L ${cx + 16} ${y + 11}`} stroke={accent} strokeWidth={0.9} fill="none" opacity={0.7} />
          {[[-14, 20], [-4, 13], [8, 18], [16, 11]].map(([dx, dy], k) => (
            <Circle key={`ms-${k}`} cx={cx + dx} cy={y + dy} r={1.6} fill="#ffe9a8" />
          ))}
        </G>
      );
      break;
    case 'ocean':
      art = (
        <G>
          {/* grand ship in a bottle on its wall bracket — the room's hero */}
          <Rect x={cx - 24} y={y + 40} width={41} height={17} rx={8.5} fill={accent} fillOpacity={0.22} stroke="#bfe6ff" strokeWidth={1.3} />
          <Rect x={cx + 17} y={y + 45} width={7} height={7} fill="#bfe6ff" opacity={0.85} />
          <Rect x={cx + 24} y={y + 43.5} width={3.5} height={10} rx={1.5} fill="#e8c07a" />
          <Path d={`M ${cx - 18} ${y + 52} h 15 l -2.6 4 h -10 Z`} fill={accent} />
          <Path d={`M ${cx - 12} ${y + 51} v -8 l 7 8 Z`} fill="#ffe9a8" opacity={0.95} />
          <Path d={`M ${cx - 13} ${y + 51} v -6 l -5 6 Z`} fill="#ffe9a8" opacity={0.8} />
          <Path d={`M ${cx - 21} ${y + 53} q 5 -2.5 10 0 t 10 0 t 10 0`} stroke="#bfe6ff" strokeWidth={0.9} fill="none" opacity={0.7} />
          <Rect x={cx - 26} y={y + 58} width={46} height={3} rx={1.5} fill={WOOD} />
          <Path d={`M ${cx - 20} ${y + 61} l 5 6 M ${cx + 14} ${y + 61} l -5 6`} stroke={WOOD_DARK} strokeWidth={2} strokeLinecap="round" />
          {/* layered rolling-wave band across the floor */}
          <Path d={`M ${x + 4} ${y + 80} q 9 -11 19 0 t 19 0 t 19 0 t 19 0`} stroke={accent} strokeWidth={2.2} fill="none" opacity={0.95} />
          <Path d={`M ${x + 6} ${y + 89} q 8 -9 17 0 t 17 0 t 17 0 t 17 0`} stroke={accent} strokeWidth={1.7} fill="none" opacity={0.65} />
          <Path d={`M ${x + 9} ${y + 97} q 7 -7 15 0 t 15 0 t 15 0 t 15 0`} stroke={accent} strokeWidth={1.3} fill="none" opacity={0.4} />
          {/* bubbles */}
          <Circle cx={x + 15} cy={y + 66} r={2.4} fill={accent} opacity={0.55} />
          <Circle cx={x + 68} cy={y + 63} r={1.8} fill={accent} opacity={0.45} />
          <Circle cx={x + 63} cy={y + 73} r={1.3} fill={accent} opacity={0.4} />
        </G>
      );
      break;
    case 'arts':
      art = (
        <G>
          {/* gallery wall — hung frames of different shapes */}
          <Rect x={x + 52} y={y + 24} width={24} height={18} rx={2} fill={accent} fillOpacity={0.32} stroke="#e8c07a" strokeWidth={1.5} />
          <Path d={`M ${x + 55} ${y + 37} l 6 -6 l 4.5 4.5 l 5.5 -7.5`} stroke={accent} strokeWidth={1.4} fill="none" />
          <Rect x={x + 55} y={y + 48} width={17} height={13} rx={2} fill="none" stroke={accent} strokeWidth={1.3} opacity={0.9} />
          <Circle cx={x + 63.5} cy={y + 54.5} r={3.4} fill={accent} opacity={0.6} />
          <Rect x={x + 8} y={y + 30} width={14} height={11} rx={1.5} fill="none" stroke="#e8c07a" strokeWidth={1.2} opacity={0.8} />
          {/* grand easel with a work in progress — the room's hero */}
          <Path d={`M ${x + 10} ${y + 99} L ${x + 27} ${y + 38} L ${x + 44} ${y + 99} M ${x + 27} ${y + 52} v 46`} stroke={WOOD} strokeWidth={2.8} strokeLinecap="round" fill="none" />
          <Rect x={x + 13} y={y + 44} width={28} height={23} rx={1.5} fill="#f2ead8" stroke={WOOD_DARK} strokeWidth={1.2} />
          <Path d={`M ${x + 17} ${y + 59} q 6 -9 12 -1.5 q 4.5 4.5 8 -3`} stroke={accent} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Circle cx={x + 20} cy={y + 50} r={2} fill="#e8c07a" opacity={0.8} />
          {/* palette resting on the easel tray */}
          <Ellipse cx={x + 36} cy={y + 70} rx={7} ry={4.5} fill={WOOD} opacity={0.95} />
          <Circle cx={x + 34} cy={y + 69} r={1.2} fill={accent} />
          <Circle cx={x + 38} cy={y + 71} r={1.2} fill="#ffd24d" />
        </G>
      );
      break;
    case 'space':
      art = (
        <G>
          {/* ringed planet the telescope is trained on */}
          <Circle cx={x + 62} cy={y + 30} r={8.5} fill={accent} fillOpacity={0.6} stroke={accent} strokeWidth={1.2} />
          <Ellipse cx={x + 62} cy={y + 30} rx={15.5} ry={4.4} fill="none" stroke="#e8c07a" strokeWidth={1.3} transform={`rotate(-18 ${x + 62} ${y + 30})`} />
          {/* starfield */}
          <Path d={`M ${x + 13} ${y + 22} l 2.4 4 l -2.4 4 l -2.4 -4 Z`} fill="#ffe9a8" opacity={0.95} />
          <Path d={`M ${x + 30} ${y + 12} l 1.8 3 l -1.8 3 l -1.8 -3 Z`} fill="#ffe9a8" opacity={0.8} />
          <Circle cx={x + 24} cy={y + 36} r={1.5} fill="#ffe9a8" opacity={0.75} />
          <Circle cx={x + 44} cy={y + 24} r={1.2} fill="#ffe9a8" opacity={0.6} />
          <Circle cx={x + 70} cy={y + 48} r={1.3} fill="#ffe9a8" opacity={0.6} />
          <Circle cx={x + 36} cy={y + 44} r={1} fill="#ffe9a8" opacity={0.5} />
          <Path d={`M ${x + 50} ${y + 12} l 11 5.5`} stroke="#ffe9a8" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
          {/* grand telescope on its tripod — the room's hero */}
          <Path d={`M ${x + 16} ${y + 88} L ${x + 48} ${y + 50}`} stroke={accent} strokeWidth={8} strokeLinecap="round" />
          <Path d={`M ${x + 48} ${y + 50} L ${x + 58} ${y + 39}`} stroke={accent} strokeWidth={3.6} strokeLinecap="round" />
          <Circle cx={x + 27} cy={y + 75} r={3.4} fill="#e8c07a" opacity={0.9} />
          <Path d={`M ${x + 27} ${y + 80} L ${x + 13} ${y + 100} M ${x + 27} ${y + 80} L ${x + 41} ${y + 100} M ${x + 27} ${y + 84} L ${x + 27} ${y + 100}`} stroke={WOOD} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </G>
      );
      break;
    case 'history':
      art = (
        <G>
          {/* tall scroll pigeonhole rack — a wall of rolled scroll ends */}
          <Rect x={x + 13} y={y + 34} width={56} height={64} rx={2} fill={WOOD_DARK} stroke={WOOD} strokeWidth={1.6} />
          {[0, 1].map(k => (
            <Rect key={`hv-${k}`} x={x + 30.7 + k * 18.7} y={y + 36} width={2} height={60} fill={WOOD} opacity={0.9} />
          ))}
          {[0, 1].map(k => (
            <Rect key={`hh-${k}`} x={x + 15} y={y + 54.3 + k * 21.3} width={52} height={2} fill={WOOD} opacity={0.9} />
          ))}
          {Array.from({ length: 9 }).map((_, k) => {
            const col = k % 3;
            const row = Math.floor(k / 3);
            // one hole left empty — a scroll is out being read
            if (col === 2 && row === 0) return null;
            const scx = x + 22.3 + col * 18.7;
            const scy = y + 44.7 + row * 21.3;
            return (
              <G key={`hsc-${k}`}>
                <Circle cx={scx} cy={scy} r={6.2} fill="#d9c08c" stroke="#8a6b3a" strokeWidth={1} />
                <Circle cx={scx} cy={scy} r={2.4} fill="none" stroke="#8a6b3a" strokeWidth={0.9} opacity={0.8} />
                <Circle cx={scx} cy={scy} r={0.9} fill="#8a6b3a" opacity={0.7} />
              </G>
            );
          })}
          {/* the missing scroll, unrolled across the rack top */}
          <Rect x={x + 24} y={y + 26} width={34} height={6} rx={3} fill="#d9c08c" stroke="#8a6b3a" strokeWidth={0.9} />
          <Circle cx={x + 24} cy={y + 29} r={3.4} fill="#b8935c" stroke="#8a6b3a" strokeWidth={0.8} />
          <Circle cx={x + 58} cy={y + 29} r={3.4} fill="#b8935c" stroke="#8a6b3a" strokeWidth={0.8} />
        </G>
      );
      break;
    case 'elements':
      art = (
        <G>
          {/* tool wall — hammer and tongs hung on a peg rail */}
          <Rect x={x + 9} y={y + 30} width={28} height={2.6} rx={1.3} fill={WOOD} />
          <Path d={`M ${x + 15} ${y + 33} v 17`} stroke="#8a93a8" strokeWidth={2.2} strokeLinecap="round" />
          <Rect x={x + 10.5} y={y + 33} width={9.5} height={5.5} rx={1.5} fill="#8a93a8" />
          <Path d={`M ${x + 29} ${y + 33} q -4.5 9 0 18 M ${x + 29} ${y + 33} q 4.5 9 0 18`} stroke="#8a93a8" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {/* forge glow pooled on the floor */}
          <Ellipse cx={cx} cy={y + 92} rx={32} ry={11} fill={accent} opacity={0.34} />
          <Ellipse cx={cx} cy={y + 93} rx={19} ry={7} fill="#ffb800" opacity={0.34} />
          {/* massive anvil on its stump — the forge's hero */}
          <Rect x={cx - 12} y={y + 86} width={24} height={13} rx={1.5} fill={WOOD_DARK} stroke="#2c1f12" strokeWidth={0.8} />
          <Path d={`M ${cx - 23} ${y + 62} h 33 q 14 0 14 7 l -14 5.5 h -10 l 4 12 h -23 l 4 -12 h -8 Z`} fill="#1a0f28" stroke={accent} strokeWidth={1.3} />
          {/* embers drifting up */}
          <Circle cx={cx - 16} cy={y + 52} r={2} fill="#ffb800" opacity={0.9} />
          <Circle cx={cx + 8} cy={y + 44} r={1.5} fill={accent} opacity={0.75} />
          <Circle cx={cx + 20} cy={y + 54} r={1.2} fill="#ffb800" opacity={0.6} />
          <Circle cx={cx - 5} cy={y + 36} r={1.1} fill={accent} opacity={0.55} />
          <Circle cx={cx + 2} cy={y + 26} r={0.9} fill="#ffb800" opacity={0.45} />
        </G>
      );
      break;
    default:
      art = null;
  }
  if (!art) return null;
  return (
    <G
      transform={`translate(${x * (1 - ART_SX)} ${y * (1 - ART_SY)}) scale(${ART_SX} ${ART_SY})`}
      opacity={ghost ? 0.62 : 1}
    >
      {art}
    </G>
  );
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
      {/* warm top-light spilling down from the arch */}
      <Path d={archPath(x, y)} fill="url(#alcove-toplight)" />
      {/* single bottom shelf — garnish behind the theme prop, and only for
          wings whose interior calls for books at all */}
      {SHELF_WINGS.has(wingId) && (
        <G>
          {shelfBooks(x, y + 110, accent, index * 3 + 2)}
          <Rect x={x + 6} y={y + 110} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD} />
          <Rect x={x + 7} y={y + 113} width={ALCOVE_W - 14} height={3.5} rx={1.5} fill="#050110" opacity={0.32} />
        </G>
      )}
      {/* themed set-dressing — the alcove's dominant read, in front of the shelf */}
      <WingThemeArt x={x} y={y} accent={accent} wingId={wingId} />
      {/* light rays from the arch */}
      <Polygon
        points={`${x + ALCOVE_W / 2 - 9},${y + 6} ${x + ALCOVE_W / 2 + 9},${y + 6} ${x + ALCOVE_W / 2 + 25},${y + ALCOVE_H} ${x + ALCOVE_W / 2 - 25},${y + ALCOVE_H}`}
        fill={accent}
        opacity={0.1}
      />
      {/* base glow */}
      <Ellipse cx={x + ALCOVE_W / 2} cy={y + ALCOVE_H - 2} rx={34} ry={7} fill={accent} opacity={0.22} />
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
      <G>{shelfBooks(x, y + 112, accent, index * 3 + 1)}</G>
      <Rect x={x + 6} y={y + 112} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD} />
      <Rect x={x + 6} y={y + 82} width={ALCOVE_W - 12} height={3} rx={1.5} fill={WOOD_DARK} />
      {/* scaffold */}
      <Rect x={x + 12} y={y + 30} width={3.4} height={ALCOVE_H - 32} fill={WOOD} rx={1.5} />
      <Rect x={x + ALCOVE_W - 16} y={y + 30} width={3.4} height={ALCOVE_H - 32} fill={WOOD} rx={1.5} />
      <Rect x={x + 8} y={y + 46} width={ALCOVE_W - 16} height={3} fill={WOOD_DARK} rx={1.5} />
      <Path
        d={`M ${x + 14} ${y + ALCOVE_H - 4} L ${x + ALCOVE_W - 14} ${y + 50}`}
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
      <Path d={archPath(x, y)} fill="#362754" stroke="#6a5296" strokeWidth={2} />
      {/* low-saturation wash of this wing's own accent — a ghosted color preview */}
      <Path d={archPath(x, y)} fill={`url(#${tid})`} />
      {/* faint warm rim light on the arch frame */}
      <Path d={archPath(x, y)} fill="none" stroke="#e8c07a" strokeWidth={1.1} opacity={0.34} />
      {/* ghosted library-to-be: at most ONE spine row, and only for wings
          whose restored interior keeps a shelf — the theme art carries the
          rest so locked wings stay distinguishable too */}
      {SHELF_WINGS.has(wingId) && (
        <G>
          {ghostSpines(x, y + 100, accent, index * 2 + 1)}
          <Rect x={x + 8} y={y + 100} width={ALCOVE_W - 16} height={2.6} rx={1.3} fill={accent} opacity={0.25} />
        </G>
      )}
      {/* ghosted theme silhouette — teases what this room becomes */}
      <WingThemeArt x={x} y={y} accent={accent} wingId={wingId} ghost />
      {/* single board — enough to say "closed", not enough to bury the room */}
      <Rect x={x + 5} y={y + 50} width={ALCOVE_W - 10} height={9} rx={2} fill="#54402a" stroke="#2c1f12" strokeWidth={0.8} transform={`rotate(-8 ${cx} ${y + 54})`} />
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

/** Drifting dust mote — slow rise + fade loop (runs only while `active`). */
function DustMote({ x, delay, active }: { x: number; delay: number; active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      anim.setValue(0);
    };
  }, [anim, delay, active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: 430,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ffe9a8',
        opacity: anim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.7, 0.35, 0] }),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -230] }) },
          { translateX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, -4] }) },
        ],
      }}
    />
  );
}

export default function GrandLibraryScene({ wings, selectedWingId, onWingPress, width = W, pendingDecoration = false }: GrandLibrarySceneProps) {
  const reduceMotion = useReduceMotion();
  // Focus gate for the decorative loops below. The Library tab sets
  // freezeOnBlur, which suspends React rendering but does NOT stop
  // already-running native-driver Animated loops — without this gate the
  // Folio bob + dust-mote loops keep burning UI-thread frames behind every
  // other screen for the rest of the session (HomeScreen's ambientActive
  // gate exists for the same reason).
  const isFocused = useIsFocused();
  const active = isFocused && !reduceMotion;
  const scale = width / W;
  const height = H * scale;

  // Folio breathing bob on his dome perch.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      bob.setValue(0);
    };
  }, [bob, active]);

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
            <LinearGradient id="alcove-toplight" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffdf9e" stopOpacity="0.3" />
              <Stop offset="0.45" stopColor="#ffdf9e" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#ffdf9e" stopOpacity="0" />
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

          {/* pilasters — slimmed to the narrower gutters */}
          {[0, 1, 2, 3, 4].map(i => {
            const px = MARGIN - GAP + i * (ALCOVE_W + GAP);
            return (
              <G key={`pl-${i}`}>
                <Rect x={px} y={96} width={GAP} height={320} fill={STONE} stroke={STONE_EDGE} strokeWidth={0.8} />
                <Rect x={px - 2} y={227} width={GAP + 4} height={8} rx={2} fill={STONE_EDGE} opacity={0.8} />
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
          <Rect x={0} y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill="url(#hall-floor)" rx={24} />
          <Rect x={0} y={FLOOR_Y} width={W} height={3} fill={STONE_EDGE} opacity={0.6} />
          {[1, 2, 3].map(i => (
            <Path key={`fb-${i}`} d={`M ${20 * i} ${H - 4} L ${60 + 34 * i} ${FLOOR_Y + 6}`} stroke="#3a2757" strokeWidth={1} opacity={0.5} />
          ))}
          {[1, 2, 3].map(i => (
            <Path key={`fb2-${i}`} d={`M ${W - 20 * i} ${H - 4} L ${W - 60 - 34 * i} ${FLOOR_Y + 6}`} stroke="#3a2757" strokeWidth={1} opacity={0.5} />
          ))}
          {/* rug */}
          <Ellipse cx={195} cy={452} rx={118} ry={30} fill="#4a1b62" stroke="#c84dff" strokeWidth={1.6} opacity={0.85} />
          <Ellipse cx={195} cy={452} rx={88} ry={21} fill="none" stroke="#ffd24d" strokeWidth={1.1} opacity={0.5} />
          {/* warm light pool spilling onto the floor under the reward */}
          {pendingDecoration && <Ellipse cx={195} cy={450} rx={74} ry={19} fill="url(#gift-pool)" />}
          {/* grounded contact shadow so the lectern sits on the rug */}
          <Ellipse cx={195} cy={449} rx={32} ry={6.5} fill="#04010a" opacity={0.5} />
          {/* welcome lectern on the rug */}
          <Rect x={187} y={426} width={16} height={24} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1} />
          <Rect x={181} y={419} width={28} height={9} rx={2} fill={WOOD_DARK} />
          <Rect x={184} y={414} width={22} height={6} rx={1.5} fill="#e8c07a" />

          {/* awaiting decoration — glowing gift preview floating above the lectern */}
          {pendingDecoration && (
            <G>
              <Circle cx={195} cy={402} r={52} fill="url(#gift-aura)" />
              {/* light kissing the lectern top — the prop is lit, not floating */}
              <Ellipse cx={195} cy={426} rx={22} ry={4.5} fill="#ffd24d" opacity={0.25} />
              {/* small rays */}
              {[-90, -40, 25, 90, 155, 220].map(deg => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 195 + Math.cos(rad) * 30;
                const y1 = 402 + Math.sin(rad) * 30;
                const x2 = 195 + Math.cos(rad) * 42;
                const y2 = 402 + Math.sin(rad) * 42;
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
              <Path d="M 162 380 l 3.2 5 l -3.2 5 l -3.2 -5 Z" fill="#ffe9a8" opacity={0.9} />
              <Circle cx={232} cy={388} r={2.4} fill="#ffe9a8" opacity={0.8} />
              <Circle cx={220} cy={424} r={1.7} fill="#ffe9a8" opacity={0.65} />
              <Circle cx={168} cy={418} r={1.4} fill="#ffe9a8" opacity={0.55} />
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
          <View pointerEvents="none" style={{ position: 'absolute', left: 195 - 24, top: 402 - 24 }}>
            <GameIcon name="gift" size={48} />
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
                    <GameIcon name={w.def.icon} size={23} accent={w.def.accent} />
                  </View>
                ) : (
                  <GameIcon name={w.def.icon} size={23} />
                )}
              </View>
              <View style={styles.badgeSlot}>
                {w.state === 'restored' ? (
                  <View style={[styles.stateBadge, { borderColor: 'rgba(0,230,118,0.6)' }]}>
                    <CheckIcon size={12} />
                  </View>
                ) : w.state === 'current' ? (
                  <View style={[styles.stateBadge, { borderColor: w.def.accent }]}>
                    <Text style={[styles.pctText, { color: w.def.accent }]}>{Math.round(w.progress * 100)}%</Text>
                  </View>
                ) : (
                  <View style={[styles.stateBadge, { borderColor: 'rgba(255,210,77,0.65)', backgroundColor: 'rgba(12,5,24,0.95)' }]}>
                    <LockIcon size={12} accent="#ffd24d" />
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
        <DustMote x={92} delay={0} active={active} />
        <DustMote x={205} delay={1700} active={active} />
        <DustMote x={296} delay={3400} active={active} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(10, 4, 22, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 9,
    elevation: 5,
  },
  emblemSelected: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2,
  },
  badgeSlot: {
    position: 'absolute',
    top: 34,
    right: ALCOVE_W / 2 - 42,
  },
  stateBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 3.5,
    borderWidth: 1.2,
    backgroundColor: 'rgba(8, 3, 18, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 9,
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
  },
  wingLabelPlate: {
    position: 'absolute',
    bottom: -8,
    maxWidth: ALCOVE_W - 2,
    backgroundColor: 'rgba(6, 2, 14, 0.72)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  wingLabel: {
    fontSize: 13,
    letterSpacing: 1,
    fontFamily: FONTS.display,
    color: '#f6f0ff',
    textShadowColor: 'rgba(4, 1, 12, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  wingLabelLong: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  wingLabelRuined: {
    color: '#cabfe4',
  },
});
