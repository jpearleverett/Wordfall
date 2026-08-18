/**
 * WingCeremonyEmblem — bespoke illustrated reward emblem for the
 * wing-restoration ceremony (the Grand Library's emotional peak).
 *
 * Layered react-native-svg composition, back to front:
 *   1. soft radial glow in the wing accent (fills the whole canvas)
 *   2. burst of golden rays (alternating long/short, brightest at the tips)
 *   3. gilded double ring — gold gradient stroke with 12 bead details
 *   4. inner disc with a deep vertical gradient of the wing accent
 *   5. per-wing vignette scene clipped inside the disc (marble columns for
 *      Mythology, leafy arch for Nature, orbit rings for Science, waves for
 *      Ocean, stage curtains for Arts, starfield+ring for Space, stone arch
 *      for History, flame crest for Elements; radial beams as fallback) plus
 *      a bottom vignette and a soft contact shadow the icon sits on
 *   6. rim light: top inner arc + sheen ellipse, bottom inner shadow arc
 *   7. floating gold/white sparkles at varied positions and opacities
 * The wing's GameIcon emblem is overlaid RN-centered (GameIcon renders its
 * own <Svg>, so it cannot nest inside this one) — it lands on the contact
 * shadow so it reads as part of the scene, not pasted on top.
 *
 * Pass either a `wingId` (resolved via getWing — never undefined, annex
 * fallback) or an explicit `accent` + `iconName` pair; explicit props win.
 * The vignette keys off wingId when it is a canonical wing, else off the
 * icon name, else falls back to radial beams.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon,
  RadialGradient, Rect, Stop,
} from 'react-native-svg';
import GameIcon, { GameIconName } from '../icons/GameIcon';
import { gradId, rim, shade } from '../icons/IconBase';
import { getWing } from '../../data/library';
import { COLORS } from '../../constants';

interface WingCeremonyEmblemProps {
  /** Wing to theme after — resolved via getWing (safe for any id). */
  wingId?: string;
  /** Explicit accent override (#rrggbb). Wins over wingId's accent. */
  accent?: string;
  /** Explicit emblem icon override. Wins over wingId's icon. */
  iconName?: GameIconName;
  /** Rendered square size in px. */
  size?: number;
}

const GOLD = COLORS.gold;
const GOLD_LIGHT = COLORS.goldLight;
const GOLD_DEEP = shade(GOLD, -84);

/** Classic 4-point sparkle path (concave diamond) around cx,cy. */
function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.22;
  return (
    `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy}` +
    ` Q ${cx + k} ${cy + k} ${cx} ${cy + r}` +
    ` Q ${cx - k} ${cy + k} ${cx - r} ${cy}` +
    ` Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`
  );
}

const SPARKLES: Array<{ cx: number; cy: number; r: number; fill: 'gold' | 'white'; opacity: number }> = [
  { cx: 34, cy: 56, r: 5, fill: 'gold', opacity: 0.9 },
  { cx: 168, cy: 48, r: 3.5, fill: 'white', opacity: 0.75 },
  { cx: 178, cy: 124, r: 4.5, fill: 'gold', opacity: 0.7 },
  { cx: 24, cy: 130, r: 3, fill: 'white', opacity: 0.6 },
  { cx: 56, cy: 178, r: 4, fill: 'gold', opacity: 0.82 },
  { cx: 148, cy: 172, r: 3, fill: 'white', opacity: 0.55 },
];

/** 12 ray angles; even indices draw the long ray, odd the short one. */
const RAY_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);
const RAY_LONG = '100,7 95,54 105,54';
const RAY_SHORT = '100,22 96,54 104,54';

/** 12 bead positions on the outer gilded ring (r=63). */
const BEADS = RAY_ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { cx: 100 + 63 * Math.sin(rad), cy: 100 - 63 * Math.cos(rad) };
});

type SceneKey =
  | 'mythology' | 'nature' | 'science' | 'ocean'
  | 'arts' | 'space' | 'history' | 'elements' | 'beams';

const CANONICAL_SCENES: ReadonlySet<string> = new Set([
  'mythology', 'nature', 'science', 'ocean', 'arts', 'space', 'history', 'elements',
]);

/** Fallback keying when only accent+iconName are passed (no wingId). */
const ICON_SCENE: Partial<Record<GameIconName, SceneKey>> = {
  sword: 'mythology',
  leaf: 'nature',
  flask: 'science',
  wave: 'ocean',
  palette: 'arts',
  planet: 'space',
  scroll: 'history',
  flame: 'elements',
};

const BEAM_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Per-wing mini-scene rendered INSIDE the disc (clipped to r≈50). Simple
 * layered silhouettes in shades of the wing accent so every wing's ceremony
 * disc depicts the place being restored rather than a flat colored puck.
 */
function renderScene(key: SceneKey, tint: string): React.ReactNode {
  const light = shade(tint, 92);
  const lite = shade(tint, 48);
  const dark = shade(tint, -48);
  const deep = shade(tint, -84);

  switch (key) {
    case 'mythology': // marble columns + arched pediment under tiny stars
      return (
        <>
          <Circle cx="70" cy="66" r="1.6" fill="#ffffff" opacity="0.8" />
          <Circle cx="100" cy="56" r="2" fill="#ffffff" opacity="0.9" />
          <Circle cx="130" cy="66" r="1.6" fill="#ffffff" opacity="0.75" />
          <Polygon points="100,62 55,88 145,88" fill={light} opacity="0.5" />
          <Rect x="57" y="86" width="86" height="4.5" rx="2" fill={light} opacity="0.7" />
          <Rect x="60.5" y="92" width="15" height="4" rx="1.5" fill={light} opacity="0.75" />
          <Rect x="124.5" y="92" width="15" height="4" rx="1.5" fill={light} opacity="0.75" />
          <Rect x="63" y="96" width="10" height="42" rx="2" fill={light} opacity="0.55" />
          <Rect x="127" y="96" width="10" height="42" rx="2" fill={light} opacity="0.55" />
          <Rect x="60.5" y="138" width="15" height="4" rx="1.5" fill={light} opacity="0.7" />
          <Rect x="124.5" y="138" width="15" height="4" rx="1.5" fill={light} opacity="0.7" />
          <Rect x="52" y="142" width="96" height="6" rx="2.5" fill={light} opacity="0.4" />
          <Ellipse cx="100" cy="150" rx="54" ry="14" fill={deep} opacity="0.5" />
        </>
      );
    case 'nature': // leafy arch with a bud at its crown
      return (
        <>
          <Path d="M 62 142 Q 60 76 100 66 Q 140 76 138 142" fill="none" stroke={dark} strokeWidth="5" opacity="0.65" />
          <Ellipse cx="63" cy="118" rx="8" ry="3.6" fill={lite} opacity="0.85" transform="rotate(-64 63 118)" />
          <Ellipse cx="68" cy="94" rx="8" ry="3.6" fill={light} opacity="0.8" transform="rotate(-46 68 94)" />
          <Ellipse cx="82" cy="74" rx="8" ry="3.6" fill={lite} opacity="0.85" transform="rotate(-24 82 74)" />
          <Ellipse cx="118" cy="74" rx="8" ry="3.6" fill={lite} opacity="0.85" transform="rotate(24 118 74)" />
          <Ellipse cx="132" cy="94" rx="8" ry="3.6" fill={light} opacity="0.8" transform="rotate(46 132 94)" />
          <Ellipse cx="137" cy="118" rx="8" ry="3.6" fill={lite} opacity="0.85" transform="rotate(64 137 118)" />
          <Circle cx="100" cy="64" r="2.4" fill={light} opacity="0.9" />
          <Ellipse cx="100" cy="148" rx="54" ry="16" fill={deep} opacity="0.55" />
        </>
      );
    case 'science': // orbit rings with electrons around a soft nucleus glow
      return (
        <>
          <Circle cx="100" cy="100" r="26" fill="#ffffff" opacity="0.08" />
          <Ellipse cx="100" cy="100" rx="43" ry="15" fill="none" stroke={light} strokeWidth="2" opacity="0.5" transform="rotate(-20 100 100)" />
          <Ellipse cx="100" cy="100" rx="43" ry="15" fill="none" stroke={light} strokeWidth="2" opacity="0.32" transform="rotate(52 100 100)" />
          <Ellipse cx="100" cy="100" rx="47" ry="10" fill="none" stroke={lite} strokeWidth="1.4" opacity="0.3" transform="rotate(-72 100 100)" />
          <Circle cx="61" cy="88" r="3" fill={light} opacity="0.95" />
          <Circle cx="138" cy="114" r="2.6" fill={light} opacity="0.85" />
          <Circle cx="116" cy="66" r="2.2" fill="#ffffff" opacity="0.8" />
          <Ellipse cx="100" cy="148" rx="52" ry="15" fill={deep} opacity="0.5" />
        </>
      );
    case 'ocean': // three layered wave bands under a horizon glow
      return (
        <>
          <Ellipse cx="100" cy="88" rx="44" ry="17" fill={light} opacity="0.16" />
          <Path d="M 46 112 Q 60 103 74 112 T 102 112 T 130 112 T 158 112 L 158 154 L 46 154 Z" fill={lite} opacity="0.4" />
          <Path d="M 46 124 Q 60 115 74 124 T 102 124 T 130 124 T 158 124 L 158 154 L 46 154 Z" fill={dark} opacity="0.6" />
          <Path d="M 46 136 Q 60 128 74 136 T 102 136 T 130 136 T 158 136 L 158 154 L 46 154 Z" fill={deep} opacity="0.8" />
          <Circle cx="74" cy="108" r="1.8" fill="#ffffff" opacity="0.7" />
          <Circle cx="58" cy="121" r="1.4" fill="#ffffff" opacity="0.55" />
          <Circle cx="102" cy="120" r="1.6" fill="#ffffff" opacity="0.6" />
          <Circle cx="130" cy="132" r="1.8" fill="#ffffff" opacity="0.65" />
        </>
      );
    case 'arts': // curtain sweep + valance with a spotlight beam
      return (
        <>
          <Polygon points="90,54 110,54 136,150 64,150" fill="#ffffff" opacity="0.09" />
          <Path d="M 48 50 Q 80 88 62 152 L 46 152 Z" fill={dark} opacity="0.6" />
          <Path d="M 152 50 Q 120 88 138 152 L 154 152 Z" fill={dark} opacity="0.6" />
          <Path d="M 52 56 Q 76 90 64 140" fill="none" stroke={lite} strokeWidth="2" opacity="0.35" />
          <Path d="M 148 56 Q 124 90 136 140" fill="none" stroke={lite} strokeWidth="2" opacity="0.35" />
          <Path d="M 46 58 Q 100 80 154 58 L 154 46 L 46 46 Z" fill={deep} opacity="0.75" />
          <Path d="M 46 58 Q 100 80 154 58" fill="none" stroke={lite} strokeWidth="2.4" opacity="0.5" />
          <Ellipse cx="100" cy="150" rx="56" ry="14" fill={deep} opacity="0.55" />
        </>
      );
    case 'space': // starfield, a nebula wash, and a tilted planetary ring
      return (
        <>
          <Circle cx="86" cy="84" r="30" fill={lite} opacity="0.14" />
          <Ellipse cx="100" cy="104" rx="41" ry="12" fill="none" stroke={light} strokeWidth="3" opacity="0.42" transform="rotate(-14 100 104)" />
          <Circle cx="64" cy="70" r="1.7" fill="#ffffff" opacity="0.9" />
          <Circle cx="132" cy="62" r="1.3" fill="#ffffff" opacity="0.7" />
          <Circle cx="146" cy="96" r="1.9" fill="#ffffff" opacity="0.8" />
          <Circle cx="58" cy="118" r="1.2" fill="#ffffff" opacity="0.6" />
          <Circle cx="122" cy="140" r="1.5" fill="#ffffff" opacity="0.65" />
          <Circle cx="84" cy="56" r="1.1" fill="#ffffff" opacity="0.6" />
          <Path d={sparklePath(136, 76, 4)} fill="#ffffff" opacity="0.85" />
          <Ellipse cx="100" cy="150" rx="52" ry="14" fill={deep} opacity="0.45" />
        </>
      );
    case 'history': // stone archway with keystone, scroll curls, dust motes
      return (
        <>
          <Path d="M 62 150 L 62 102 A 38 38 0 0 1 138 102 L 138 150" fill="none" stroke={light} strokeWidth="9" opacity="0.45" />
          <Path d="M 70 150 L 70 104 A 30 30 0 0 1 130 104 L 130 150" fill="none" stroke={dark} strokeWidth="2" opacity="0.5" />
          <Polygon points="92,58 108,58 105,72 95,72" fill={light} opacity="0.7" />
          <Circle cx="58" cy="100" r="5" fill="none" stroke={light} strokeWidth="2.2" opacity="0.55" />
          <Circle cx="142" cy="100" r="5" fill="none" stroke={light} strokeWidth="2.2" opacity="0.55" />
          <Circle cx="78" cy="78" r="1.3" fill={GOLD_LIGHT} opacity="0.55" />
          <Circle cx="124" cy="70" r="1.1" fill={GOLD_LIGHT} opacity="0.5" />
          <Circle cx="66" cy="126" r="1.2" fill={GOLD_LIGHT} opacity="0.45" />
          <Ellipse cx="100" cy="150" rx="54" ry="14" fill={deep} opacity="0.5" />
        </>
      );
    case 'elements': // rising flame crest with drifting embers
      return (
        <>
          <Ellipse cx="100" cy="142" rx="40" ry="16" fill={lite} opacity="0.28" />
          <Path d="M 74 144 Q 62 118 74 98 Q 86 118 74 144 Z" fill={dark} opacity="0.6" />
          <Path d="M 126 144 Q 114 118 126 98 Q 138 118 126 144 Z" fill={dark} opacity="0.6" />
          <Path d="M 100 146 Q 84 110 100 78 Q 116 110 100 146 Z" fill={dark} opacity="0.55" />
          <Path d="M 100 142 Q 91 116 100 96 Q 109 116 100 142 Z" fill={lite} opacity="0.6" />
          <Circle cx="82" cy="88" r="1.6" fill={GOLD_LIGHT} opacity="0.7" />
          <Circle cx="118" cy="82" r="1.4" fill={GOLD_LIGHT} opacity="0.6" />
          <Circle cx="100" cy="66" r="1.8" fill={GOLD_LIGHT} opacity="0.75" />
          <Ellipse cx="100" cy="150" rx="52" ry="12" fill={deep} opacity="0.55" />
        </>
      );
    default: // beams — radial light spokes for annex / seasonal wings
      return (
        <>
          {BEAM_ANGLES.map((deg) => (
            <Polygon
              key={`beam-${deg}`}
              points="100,54 95.5,100 104.5,100"
              fill={light}
              opacity="0.16"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          <Circle cx="100" cy="100" r="24" fill="#ffffff" opacity="0.07" />
          <Ellipse cx="100" cy="146" rx="52" ry="18" fill={deep} opacity="0.5" />
        </>
      );
  }
}

export default function WingCeremonyEmblem({
  wingId,
  accent,
  iconName,
  size = 170,
}: WingCeremonyEmblemProps) {
  const wing = getWing(wingId);
  const tint = accent ?? wing.accent;
  const icon = iconName ?? wing.icon;
  const sceneKey: SceneKey = CANONICAL_SCENES.has(wing.id)
    ? (wing.id as SceneKey)
    : ICON_SCENE[icon] ?? 'beams';

  const ids = useMemo(
    () => ({
      glow: gradId('wingGlow'),
      ray: gradId('wingRay'),
      ring: gradId('wingRing'),
      disc: gradId('wingDisc'),
      clip: gradId('wingClip'),
      discShade: gradId('wingDiscShade'),
      iconShadow: gradId('wingIconShadow'),
    }),
    [],
  );

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={ids.glow} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={tint} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={tint} stopOpacity="0.26" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={ids.ray} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffe9a8" />
            <Stop offset="1" stopColor={GOLD} />
          </LinearGradient>
          <LinearGradient id={ids.ring} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff3c4" />
            <Stop offset="0.45" stopColor={GOLD_LIGHT} />
            <Stop offset="1" stopColor={GOLD_DEEP} />
          </LinearGradient>
          {/* Deepened disc: hot top light rolling into a near-black base */}
          <LinearGradient id={ids.disc} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade(tint, 96)} />
            <Stop offset="0.3" stopColor={shade(tint, 22)} />
            <Stop offset="0.62" stopColor={shade(tint, -20)} />
            <Stop offset="1" stopColor={shade(tint, -98)} />
          </LinearGradient>
          <RadialGradient id={ids.discShade} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={ids.iconShadow} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.5" />
            <Stop offset="0.7" stopColor="#000000" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <ClipPath id={ids.clip}>
            <Circle cx="100" cy="100" r="50.5" />
          </ClipPath>
        </Defs>

        {/* 1 — soft accent aura */}
        <Circle cx="100" cy="100" r="100" fill={`url(#${ids.glow})`} />

        {/* 2 — golden ray burst */}
        {RAY_ANGLES.map((deg, i) => (
          <Polygon
            key={`ray-${deg}`}
            points={i % 2 === 0 ? RAY_LONG : RAY_SHORT}
            fill={`url(#${ids.ray})`}
            opacity={i % 2 === 0 ? 0.5 : 0.3}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}

        {/* 3 — gilded double ring with bead details */}
        <Circle cx="100" cy="100" r="63" fill="none" stroke={`url(#${ids.ring})`} strokeWidth="5" />
        <Circle cx="100" cy="100" r="56.5" fill="none" stroke={GOLD_LIGHT} strokeWidth="1.8" opacity="0.85" />
        {BEADS.map((b) => (
          <Circle
            key={`bead-${b.cx.toFixed(1)}-${b.cy.toFixed(1)}`}
            cx={b.cx}
            cy={b.cy}
            r="2.3"
            fill={GOLD_LIGHT}
            stroke={GOLD_DEEP}
            strokeWidth="0.6"
          />
        ))}

        {/* 4 — inner disc, hot top light to near-black base */}
        <Circle cx="100" cy="100" r="52" fill={`url(#${ids.disc})`} stroke={rim(tint)} strokeWidth="1.2" />

        {/* 5 — per-wing vignette scene + grounding shadows, clipped to disc */}
        <G clipPath={`url(#${ids.clip})`}>
          {renderScene(sceneKey, tint)}
          <Ellipse cx="100" cy="152" rx="62" ry="30" fill={`url(#${ids.discShade})`} />
          {/* contact shadow the overlaid GameIcon sits on */}
          <Ellipse cx="100" cy="113" rx="28" ry="11" fill={`url(#${ids.iconShadow})`} />
        </G>

        {/* 6 — rim light + inner shadow for depth */}
        <Path
          d="M 62.3 73.6 A 46 46 0 0 1 137.7 73.6"
          fill="none"
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Ellipse cx="100" cy="76" rx="34" ry="14" fill="#ffffff" opacity="0.16" />
        <Path
          d="M 64.8 129.6 A 46 46 0 0 0 135.2 129.6"
          fill="none"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* 7 — floating sparkles */}
        {SPARKLES.map((s) => (
          <Path
            key={`sp-${s.cx}-${s.cy}`}
            d={sparklePath(s.cx, s.cy, s.r)}
            fill={s.fill === 'gold' ? GOLD_LIGHT : '#ffffff'}
            opacity={s.opacity}
          />
        ))}
        <Circle cx="46" cy="38" r="1.4" fill="#ffffff" opacity="0.5" />
        <Circle cx="162" cy="152" r="1.4" fill="#ffffff" opacity="0.45" />
      </Svg>

      {/* Wing emblem — GameIcon renders its own Svg, so overlay it centered.
          Sized to sit IN the vignette scene, on the contact shadow. */}
      <View style={styles.iconOverlay} pointerEvents="none">
        <GameIcon name={icon} size={Math.round(size * 0.34)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
