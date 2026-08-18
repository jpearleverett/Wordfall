/**
 * WingCeremonyEmblem — bespoke illustrated reward emblem for the
 * wing-restoration ceremony (the Grand Library's emotional peak).
 *
 * Layered react-native-svg composition, back to front:
 *   1. soft radial glow in the wing accent (fills the whole canvas)
 *   2. burst of golden rays (alternating long/short, brightest at the tips)
 *   3. gilded double ring — gold gradient stroke with 12 bead details
 *   4. inner disc with a rich vertical gradient of the wing accent
 *   5. rim light: top inner arc + sheen ellipse, bottom inner shadow arc
 *   6. floating gold/white sparkles at varied positions and opacities
 * The wing's GameIcon emblem is overlaid RN-centered (GameIcon renders its
 * own <Svg>, so it cannot nest inside this one).
 *
 * Pass either a `wingId` (resolved via getWing — never undefined, annex
 * fallback) or an explicit `accent` + `iconName` pair; explicit props win.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient, Path, Polygon, RadialGradient, Stop,
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

export default function WingCeremonyEmblem({
  wingId,
  accent,
  iconName,
  size = 170,
}: WingCeremonyEmblemProps) {
  const wing = getWing(wingId);
  const tint = accent ?? wing.accent;
  const icon = iconName ?? wing.icon;

  const ids = useMemo(
    () => ({
      glow: gradId('wingGlow'),
      ray: gradId('wingRay'),
      ring: gradId('wingRing'),
      disc: gradId('wingDisc'),
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
          <LinearGradient id={ids.disc} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade(tint, 74)} />
            <Stop offset="0.5" stopColor={tint} />
            <Stop offset="1" stopColor={shade(tint, -72)} />
          </LinearGradient>
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

        {/* 4 — inner disc, lit top to deep base */}
        <Circle cx="100" cy="100" r="52" fill={`url(#${ids.disc})`} stroke={rim(tint)} strokeWidth="1.2" />

        {/* 5 — rim light + inner shadow for depth */}
        <Path
          d="M 62.3 73.6 A 46 46 0 0 1 137.7 73.6"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <Ellipse cx="100" cy="76" rx="34" ry="14" fill="#ffffff" opacity="0.12" />
        <Path
          d="M 64.8 129.6 A 46 46 0 0 0 135.2 129.6"
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 6 — floating sparkles */}
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

      {/* Wing emblem — GameIcon renders its own Svg, so overlay it centered */}
      <View style={styles.iconOverlay} pointerEvents="none">
        <GameIcon name={icon} size={Math.round(size * 0.4)} />
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
